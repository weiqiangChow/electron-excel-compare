import React from 'react'
import { HotTable } from '@handsontable/react-wrapper'
import { renderDiff } from '../utils/RenderDiffTable'

interface DiffResult {
	sheetdata: any[][]
	hotTableComponentDiffResult: React.RefObject<any>
}

const DiffResultHooks = (props: DiffResult) => {
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
			<HotTable
				ref={props.hotTableComponentDiffResult}
				data={props.sheetdata}
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

export default React.memo(DiffResultHooks)
