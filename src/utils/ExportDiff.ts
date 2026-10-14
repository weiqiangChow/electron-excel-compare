import XLSX from 'xlsx-js-style'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { getDiffCell } from './RenderDiffTable'

/**
 * daff 分类 -> 导出单元格的底色，取值与 App.scss 里 `.diffhandsontable td.*` 的配色保持一致。
 * 鼠标选中时的标记行/列高亮（diff-hl-row / diff-hl-col）不属于对比结果本身，所以不导出。
 */
const CATEGORY_FILL: Record<string, string> = {
	add: '7FFF7F',
	remove: 'FF7F7F',
	modify: '7F7FFF',
	conflict: 'FF0000',
	spec: 'AAAAAA',
	move: 'FFFFAA',
	header: 'AAAAFF',
}

/** 界面上这两类只改文字颜色，没有底色。 */
const CATEGORY_FONT_COLOR: Record<string, string> = {
	null: '888888',
	gap: '888888',
}

/** 界面列宽(px)换算成 Excel 字符宽度的近似比例，并限制在合理区间内。 */
const PX_PER_CHAR = 7.5
const MIN_COL_WIDTH = 4
const MAX_COL_WIDTH = 60

export const DEFAULT_FILE_NAME = '对比结果.xlsx'

export type ExportResult = { status: 'saved'; path?: string } | { status: 'cancelled' } | { status: 'empty' }

/**
 * 把「对比结果」表格导出成带背景色的 .xlsx。
 *
 * 桌面端（Tauri）会先弹出系统保存对话框选路径，Rust 落盘后再在资源管理器里定位该文件；
 * 浏览器里保持原来的下载行为。真正的失败（写盘失败等）会抛出，由调用方提示用户。
 *
 * @param hotInstance 对比结果表的 Handsontable 实例
 */
export const exportDiffResult = async (hotInstance: any): Promise<ExportResult> => {
	const workbook = buildDiffWorkbook(hotInstance)

	if (!workbook) {
		return { status: 'empty' }
	}

	if (!isTauri()) {
		XLSX.writeFile(workbook, DEFAULT_FILE_NAME)

		return { status: 'saved' }
	}

	const path = await save({
		defaultPath: DEFAULT_FILE_NAME,
		filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }],
	})

	if (!path) {
		return { status: 'cancelled' }
	}

	await invoke('save_export', {
		path,
		contentsBase64: XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' }),
	})

	try {
		await revealItemInDir(path)
	} catch (err) {
		// 文件已经写好了，只是没能打开资源管理器，不值得让整个导出算失败
		console.error('打开文件所在位置失败', err)
	}

	return { status: 'saved', path }
}

/** 把对比结果整理成带样式的 xlsx 工作簿；没有对比结果时返回 null。 */
const buildDiffWorkbook = (hotInstance: any) => {
	const data: any[][] = hotInstance?.getData() ?? []

	// daff 的 hilite 输出固定以 '@:@'（行号:列号）这个角标开头，没有它说明还没有对比结果
	if (!data.length || !data[0] || data[0][0] !== '@:@') {
		return null
	}

	const rows: any[][] = []
	const categories: string[][] = []

	data.forEach((row, rowIndex) => {
		const texts: any[] = []
		const cellCategories: string[] = []

		row.forEach((value, colIndex) => {
			const diffCell = getDiffCell(value, hotInstance, rowIndex, colIndex)
			// 空单元格写成 null，交给 aoa_to_sheet 生成占位单元格，这样底色才能画在空单元格上
			texts.push(diffCell.text === '' ? null : diffCell.text)
			cellCategories.push(diffCell.category)
		})

		rows.push(texts)
		categories.push(cellCategories)
	})
	/**
	 * TODO: 是否需要根据表头字段过滤数据？？
	 * 如果需要的话，在这里对数据进行修改来实现这个功能
	 */
	const worksheet = XLSX.utils.aoa_to_sheet(rows, { sheetStubs: true })

	rows.forEach((row, rowIndex) => {
		row.forEach((_, colIndex) => {
			const category = categories[rowIndex][colIndex]
			const fill = CATEGORY_FILL[category]
			const fontColor = CATEGORY_FONT_COLOR[category]

			if (!fill && !fontColor && category !== 'header') {
				return
			}

			const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })]

			if (!cell) {
				return
			}

			const style: any = {}

			if (fill) {
				style.fill = { patternType: 'solid', fgColor: { rgb: fill } }
			}

			if (fontColor || category === 'header') {
				style.font = {}
				if (fontColor) {
					style.font.color = { rgb: fontColor }
				}
				if (category === 'header') {
					style.font.bold = true
				}
			}

			cell.s = style
		})
	})

	// 沿用界面上的列宽，避免导出的表格挤成一团（v18 起该 API 在 autoColumnSize 插件上）
	const columnWidths = rows[0]?.map((_, colIndex) =>
		hotInstance?.getPlugin?.('autoColumnSize')?.getColumnWidth?.(colIndex),
	)

	if (columnWidths?.every((width) => typeof width === 'number')) {
		worksheet['!cols'] = columnWidths.map((width: number) => ({
			wch: Math.min(MAX_COL_WIDTH, Math.max(MIN_COL_WIDTH, Math.round(width / PX_PER_CHAR))),
		}))
	}

	const workbook = XLSX.utils.book_new()

	XLSX.utils.book_append_sheet(workbook, worksheet, '对比结果')

	return workbook
}
