import React from 'react'
import { HotTable } from '@handsontable/react-wrapper'
import { renderDiff } from '../utils/RenderDiffTable'
import { exportDiffResult } from '../utils/ExportDiff'
import { Button, message } from 'antd'

interface DiffResult {
	hotTableComponentDiffResult: React.RefObject<any>
}

const DiffResultHooks = (props: DiffResult) => {
	const [exporting, setExporting] = React.useState(false)

	const onExportClick = async () => {
		const instance = props.hotTableComponentDiffResult.current?.hotInstance

		setExporting(true)

		try {
			const result = await exportDiffResult(instance)

			if (result.status === 'empty') {
				message.warning('还没有对比结果，请先点击 Diff')
			} else if (result.status === 'saved') {
				message.success(result.path ? `已导出到 ${result.path}` : '已导出', 5)
			}
		} catch (err) {
			message.error(`导出失败：${err instanceof Error ? err.message : String(err)}`)
		} finally {
			setExporting(false)
		}
	}

	const hotDiffResultSettings = {
		height: 400,
		minRows: 10,
		minCols: 10,
		minSpareCols: 0,
		minSpareRows: 0,
		colHeaders: false,
		contextMenu: false,
		rowHeaders: false,
		readOnly: true,
		// daff 输出固定的前 3 行是标记行（列号、结构、表头），前 2 列是行号和动作列，
		// 滚动时把它们吸附在顶部和左侧，避免看数据时失去参照。
		fixedRowsTop: 3,
		fixedColumnsStart: 2,
		// daff 输出里"表头/行头"其实是数据行、数据列（colHeaders/rowHeaders 都是 false），
		// 所以借 currentRowClassName/currentColClassName 拿到 class，再把样式限定在固定区
		// 的 overlay 克隆层内，做到只点亮标记行/标记列，数据区不受影响。
		currentRowClassName: 'diff-hl-row',
		currentColClassName: 'diff-hl-col',
		renderAllRows: true,
		licenseKey: 'non-commercial-and-evaluation',
		themeName: 'ht-theme-main',
	}

	return (
		<>
			<div className="result-header">
				<span style={{ fontSize: 24 }}>{'对比结果'}</span>
				<div className="result-export">
					<Button type="primary" loading={exporting} onClick={onExportClick}>
						Export
					</Button>
				</div>
			</div>

			<HotTable
				ref={props.hotTableComponentDiffResult}
				data={[['']]}
				style={{ width: '100%', padding: 15 }}
				id={'tableresult'}
				{...hotDiffResultSettings}
				hotRenderer={renderDiff}
				className="diffhandsontable"
				stretchH={'all'}
			/>
		</>
	)
}

export default DiffResultHooks
