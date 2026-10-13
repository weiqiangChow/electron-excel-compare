import React from 'react'
import type Handsontable from 'handsontable/base'
import { HotTable } from '@handsontable/react-wrapper'
import ImportHooks from '../components/Import'

interface Left {
	sheetname: string
	sheetlist: any
	fileRef: React.RefObject<any>

	sheetdata: any[][] | Handsontable.RowObject[]
	hotTableComponentLeft: React.RefObject<any>

	onFileSelectChange(e: React.ChangeEvent<HTMLInputElement>): any
	onSheetSelectChange(e: string): any
}

const LeftHooks = (props: Left) => {
	const hotLeftSettings = {
		colHeaders: true,
		rowHeaders: true,
		height: 305,
		minRows: 12,
		minCols: 8,
		// colWidth: 100,
		licenseKey: 'non-commercial-and-evaluation',
		themeName: 'ht-theme-main',
		id: 'table-left',
	}
	return (
		<>
			<div className="left" style={{ padding: 10, marginTop: -25 }}>
				<h1 style={{ marginLeft: 3 }}>{'<original>'}</h1>
				<ImportHooks
					sheetname={props.sheetname}
					sheetlist={props.sheetlist}
					onFileSelectChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onFileSelectChange(e)}
					onSheetSelectChange={(e: string) => props.onSheetSelectChange(e)}
					fileRef={props.fileRef}
				/>
				<HotTable
					ref={props.hotTableComponentLeft}
					data={props.sheetdata}
					style={{ width: '98%' }}
					{...hotLeftSettings}
					stretchH={'all'}
				/>
			</div>
		</>
	)
}

export default LeftHooks
