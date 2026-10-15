import daff from 'daff/lib/core'

/** daff 的输出：第 0 列是行号，第 1 列是动作标记（+++ / --- / ->），数据列从第 2 列开始。 */
const DIFF_DATA_COL_OFFSET = 2

/** daff 用 `@@` 标记表头行，用 `!` 标记表头结构行（有列增删时才会出现）。 */
const HEADER_MARKER = '@@'

/** 表头字段里 alt + enter 插入的换行符统一成 \n，方便左右两张表比对表头。 */
const normalizeHeader = (header: any) => (typeof header === 'string' ? header.replaceAll(/\r\n/g, '\n') : header)

function sortRightByLeftHeader(l: any[][], r: any[][], headLineIdx: number) {
	const left = JSON.parse(JSON.stringify(l)) as any[][]
	const right = JSON.parse(JSON.stringify(r)) as any[][]
	const leftHeaders = left[headLineIdx]
	const rightHeaders = right[headLineIdx]

	// 建立 left 表头的优先级映射
	const priority = new Map(leftHeaders.map((header, index) => [header, index]))

	// 生成 right 的列索引，并按优先级排序
	const columnIndexes = rightHeaders
		.map((header, index): { header: unknown; index: number; priority: number } => ({
			header,
			index,
			priority: priority.has(header) ? priority.get(header)! : Infinity,
		}))
		.sort((a, b) => a.priority - b.priority || a.index - b.index)
		.map((item) => item.index)

	// 按排序后的列索引重排所有行
	return right.map((row) => columnIndexes.map((index) => row[index])) as any[][]
}

/**
 * 行号列（第 0 列）里 daff 写的是 `左表行号:右表行号`，只出现在一边时另一边是 `-`。
 * 合并后的行左右两边都在，所以用 `---` 行的左行号 + `+++` 行的右行号拼出来，和 daff 原生 `->` 行的写法一致。
 */
function mergeRowIndex(removedIndex: any, addedIndex: any) {
	const removed = `${removedIndex ?? ''}`.split(':')
	const added = `${addedIndex ?? ''}`.split(':')
	if (removed.length !== 2 || added.length !== 2) return addedIndex

	return `${removed[0] === '-' ? added[0] : removed[0]}:${added[1] === '-' ? removed[1] : added[1]}`
}

/**
 * 找出对比结果里用户选定的唯一字段所在的列（daff 输出的列下标）。
 *
 * daff 的数据列和 `TableDiff.column_units` 一一对应：输出列下标 = unit 下标 + 2（前面是行号列和动作列）。
 * 会被缩写成 `...` 的列只在整张表都没有 `+++` 行时才会出现，那种情况本来也没有被拆开的行可合并，
 * 所以这里按顺序一一对应就够了。
 *
 * 字段名从用户指定的表头行取：对齐之后左右两张表的列顺序一致，公共列用 unit.l / unit.r
 * 拿到的是同一个字段名。
 */
function findIdColumns(td: any, left: any[][], right: any[][], headerRowIdx: number, ids: string[]): number[] {
	const units: any[] = td.column_units ?? []
	const headerOf = (table: any[][], index: number) =>
		index >= 0 && Array.isArray(table[headerRowIdx]) ? table[headerRowIdx][index] : undefined
	const isId = (value: any) => value !== undefined && value !== null && ids.includes(String(value))

	return units.reduce((columns: number[], unit: any, index: number) => {
		if (isId(headerOf(left, unit.l)) || isId(headerOf(right, unit.r))) {
			columns.push(index + DIFF_DATA_COL_OFFSET)
		}

		return columns
	}, [])
}

/**
 * daff 只用 `->` 标记改动很小的行（改动写成 `旧值->新值`），改动一大就把一行拆成 `---`（旧行）+ `+++`（新行）两行。
 *
 * 这里按用户选定的唯一字段把被拆开的同一个「行」合回去：`+++` 那行的动作标记改成 `->`、
 * 内容不同的单元格改成 `旧值->新值`、行号列拼成 `左:右`，然后删掉 `---` 那行。
 * 合并之后这一行和 daff 原生的 `->` 行完全一样，渲染时改动单元格是 modify 色、动作列显示 →。
 *
 * 动作标记必须正好是 `->`：渲染时 daff 是拿动作列的文本去匹配单元格内容的，标记里多一个字符
 * （比如被拼成 `---->`）就再也匹配不上，整行会丢掉 modify 配色。
 */
function mergeSplitRows(td: any, output: any, left: any[][], right: any[][], headerRowIdx: number, ids: string[]) {
	const tb = output.data as any[][]
	const idColumns = findIdColumns(td, left, right, headerRowIdx, ids)
	if (!idColumns.length) return

	const headerRowIdxInOutput = tb.findIndex((row) => row[1] === HEADER_MARKER)
	const units: any[] = td.column_units ?? []
	const view = new daff.coopy.SimpleView()
	// 和 daff 自己写 `旧值->新值` 时一样处理空值（null 写成 NULL），保证合并出来的内容和原生 `->` 行一致
	const quote = (value: any) => daff.coopy.FlatCellBuilder.quoteForDiff(view, value ?? null)

	// 按唯一字段把 daff 拆出来的删除行(---)和新增行(+++)配成对
	const rowGroups = new Map<string, number[]>()
	tb.forEach((row, index) => {
		if (index <= headerRowIdxInOutput || (row[1] !== '---' && row[1] !== '+++')) return
		const key = idColumns.map((column) => `${row[column] ?? ''}`).join('\u0000')
		const group = rowGroups.get(key)
		if (group) group.push(index)
		else rowGroups.set(key, [index])
	})

	const pairs: Array<{ removed: number; added: number }> = []
	rowGroups.forEach((indexes) => {
		// 同一个「行」被拆开才会正好出现两次，其它情况（唯一字段重复、真的被删掉/新增）都不处理
		if (indexes.length !== 2) return
		const removed = tb[indexes[0]][1] === '---' ? indexes[0] : indexes[1]
		const added = removed === indexes[0] ? indexes[1] : indexes[0]
		if (tb[removed][1] === '---' && tb[added][1] === '+++') {
			pairs.push({ removed, added })
		}
	})

	// 从后往前删，才不会打乱还没处理到的下标
	pairs.sort((a, b) => b.removed - a.removed)
	pairs.forEach(({ removed, added }) => {
		const removedRow = tb[removed]
		const addedRow = tb[added]
		const width = Math.max(removedRow.length, addedRow.length)

		for (let column = DIFF_DATA_COL_OFFSET; column < width; column++) {
			if (idColumns.includes(column)) continue
			const unit = units[column - DIFF_DATA_COL_OFFSET]
			// 只在左表存在的列（表头结构行标了 ---）：取左表的值，和 daff 原生 `->` 行在删除列上的写法一致
			if (unit && unit.l >= 0 && unit.r < 0) {
				if (removedRow[column] != null) addedRow[column] = removedRow[column]
				continue
			}
			// 只在右表新增的列：本来就只有右表的值，不需要合并
			if (unit && unit.l < 0) continue
			if (!view.equals(removedRow[column], addedRow[column])) {
				addedRow[column] = `${quote(removedRow[column])}->${quote(addedRow[column])}`
			}
		}

		addedRow[1] = '->'
		addedRow[0] = mergeRowIndex(removedRow[0], addedRow[0])
		tb.splice(removed, 1)
	})
}

/**
 * 对比左右两张表。
 *
 * 只负责算出 daff 的结果数据，不做任何渲染——结果由 App 持有并作为 `data` 传给「对比结果」表格，
 * 这样 Reset 只要把状态置空就能清掉表格，不必再去动 Handsontable 实例。
 *
 * @returns 对比结果；没有任何差异时返回 null（保持上一次的结果不变）
 */
export const diff = (
	left: any[][],
	right: any[][],
	extraObj: { ids: string[]; headerRowNumber: number },
): any[][] | null => {
	const { ids } = extraObj
	// 用户输入的表头行号是从 1 开始的
	const headerRowIdx = extraObj.headerRowNumber >= 1 ? extraObj.headerRowNumber - 1 : -1
	let newLeft: any[][] | undefined
	let newRight: any[][] | undefined
	if (headerRowIdx >= 0 && Array.isArray(left[headerRowIdx]) && Array.isArray(right[headerRowIdx])) {
		// 把两个excel的表头字段中 alt + enter 插入的换行符号统一换成 \n
		left[headerRowIdx] = left[headerRowIdx].map(normalizeHeader)
		right[headerRowIdx] = right[headerRowIdx].map(normalizeHeader)
		// 让两个表的表头字段对齐
		newRight = sortRightByLeftHeader(left, right, headerRowIdx)
		newLeft = sortRightByLeftHeader(newRight, left, headerRowIdx)
	}

	const tableLeft = new daff.TableView(newLeft || left)
	const tableRight = new daff.TableView(newRight || right)

	tableLeft.trim()
	tableRight.trim()

	const align = daff.compareTables(tableLeft, tableRight).align()
	const output = new daff.TableView([])
	const flags = new daff.CompareFlags()
	flags.show_unchanged = false
	flags.always_show_header = true
	flags.always_show_order = true
	flags.never_show_order = false
	flags.unchanged_context = true

	const td = new daff.TableDiff(align, flags)
	td.hilite(output)
	if (output.height !== 0) {
		if (ids.length && headerRowIdx >= 0) {
			mergeSplitRows(td, output, newLeft || left, newRight || right, headerRowIdx, ids)
		}

		return output.data as any[][]
	}

	return null
}
