import React, { useState, useRef } from 'react'
import type { WorkBook } from 'xlsx'
import { Row, Col, Select, Button, Input, message } from 'antd'

import { ExcelHelper, ExcelDomain, SheetDomain } from './utils/ExcelHelper'
import { exportDiffResult } from './utils/ExportDiff'
import { diff } from './utils/Diff'
import LeftHooks from './components/Left'
import RightHooks from './components/Right'
import DiffResultHooks from './components/DiffResult'

import './App.scss'
import 'normalize.css'

/** 「对比结果」表格的空状态；每次 Reset 都新建一份，保证 data 引用变化、表格确实被清掉。 */
const BlankDiffData = () => [['']]

function App() {
	const excelHelper = new ExcelHelper()
	const [leftsheetname, setLeftSheetname] = useState('Sheet1')
	const [leftsheetlist, setLeftSheetlist] = useState<any[] | null>(null)
	const [hotTableComponentLeft] = useState(React.createRef())
	const [leftsheetdata, setLeftSheetData] = useState(JSON.parse(JSON.stringify(ExcelHelper.BlankData(12, 8))))
	const [leftWorkbook, setLeftWorkbook] = useState<WorkBook>()
	const [rightsheetname, setRightSheetname] = useState('Sheet1')
	const [rightsheetlist, setRightSheetlist] = useState<any[] | null>(null)
	const [hotTableComponentRight] = useState(React.createRef())
	const [rightsheetdata, setRightSheetData] = useState(JSON.parse(JSON.stringify(ExcelHelper.BlankData(12, 8))))
	const [rightWorkbook, setRightWorkbook] = useState<WorkBook>()
	const [exporting, setExporting] = React.useState(false)
	const [headerRowNumber, setHeaderRowNumber] = useState<number>(-1)
	const [idsVal, setIdsVal] = useState<Array<string>>([])
	const [diffsheetdata, setDiffSheetData] = useState<any[][]>(BlankDiffData)
	const [hotTableComponentDiffResult] = useState<React.RefObject<any>>(React.createRef())
	const [idsSelectOptions, setIdsSelectOptions] = useState<Array<React.ReactNode>>([])

	const leftFileSelectRef = useRef<any>(null)
	const rightFileSelectRef = useRef<any>(null)

	const fileHandler = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
		event.persist()
		if (event.target.files) {
			let fileObj = event.target.files[0]

			if (fileObj) {
				excelHelper.convertFileToExcel(fileObj, (err: any, resp: ExcelDomain) => {
					if (err) {
						console.log(err)
					} else {
						let sheetnames = []
						for (let i = 0; i < resp.sheets.length; i++) {
							sheetnames.push(
								<Select.Option key={resp.sheets[i]} value={resp.sheets[i]}>
									{resp.sheets[i]}
								</Select.Option>,
							)
						}
						if (field === 'left') {
							setLeftSheetname(resp.sheets[0])
							setLeftSheetlist(sheetnames)
							setLeftSheetData(resp.items)
							setLeftWorkbook(resp.workbook)
						} else {
							setRightSheetname(resp.sheets[0])
							setRightSheetlist(sheetnames)
							setRightSheetData(resp.items)
							setRightWorkbook(resp.workbook)
						}
					}
				})
			}
		}
	}

	const onSheetFieldChange = (selectedSheetName: string, field: string) => {
		let wb = null
		if (field === 'left') wb = leftWorkbook
		else wb = rightWorkbook

		if (wb !== undefined && wb !== null && selectedSheetName !== undefined) {
			excelHelper.getSheet(wb, selectedSheetName, (err: any, resp: SheetDomain) => {
				if (err) {
					console.log(err)
				} else {
					if (field === 'left') {
						setLeftSheetname(selectedSheetName)
						setLeftSheetData(resp.items)
					} else {
						setRightSheetname(selectedSheetName)
						setRightSheetData(resp.items)
					}
				}
			})
		}
	}

	const tableHeadNumberChange = (val: number) => {
		setHeaderRowNumber(val)
		if (val < 1) return setIdsVal([])
		// 找出两个表格的头部字段，然后取交集，作为唯一字段的候选项
		const filterCb = (acc: string[], item: string) => {
			if (item) {
				if(typeof item.replaceAll === 'function') item = item.replaceAll(/\r\n/g, '\n')
				acc.push(item)
			}
			return acc
		}
		const leftHeaders = (leftsheetdata[val - 1] ?? []).reduce(filterCb, [])
		const rightHeaders = (rightsheetdata[val - 1] ?? []).reduce(filterCb, [])
		if (leftHeaders.length && rightHeaders.length) {
			const intersection = leftHeaders.filter((header: any) => rightHeaders.includes(header))
			setIdsSelectOptions(
				intersection.map((header: any) => (
					<Select.Option key={header} value={header}>
						{header}
					</Select.Option>
				)),
			)
		}
	}
	const onExportClick = async () => {
		const instance = hotTableComponentDiffResult.current?.hotInstance;
		(window as any)._ins = instance
		console.log('instance', instance)
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
	return (
		<div className="App">
			<Row>
				<Col span={12}>
					<LeftHooks
						sheetname={leftsheetname}
						sheetlist={leftsheetlist}
						onFileSelectChange={(e) => fileHandler(e, 'left')}
						onSheetSelectChange={(e) => onSheetFieldChange(e, 'left')}
						hotTableComponentLeft={hotTableComponentLeft}
						sheetdata={leftsheetdata}
						fileRef={leftFileSelectRef}
					/>
				</Col>
				<Col span={12}>
					<RightHooks
						sheetname={rightsheetname}
						sheetlist={rightsheetlist}
						onFileSelectChange={(e) => fileHandler(e, 'right')}
						onSheetSelectChange={(e) => onSheetFieldChange(e, 'right')}
						hotTableComponentRight={hotTableComponentRight}
						sheetdata={rightsheetdata}
						fileRef={rightFileSelectRef}
					/>
				</Col>
				<Col
					span={24}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: 10,
						paddingLeft: 10,
						marginBottom: 10,
					}}
				>
					<Button
						type="dashed"
						onClick={() => {
							setLeftSheetData(ExcelHelper.SampleDataLeft)
							setRightSheetData(ExcelHelper.SampleDataRight)
						}}
					>
						Sample Demo
					</Button>
					<Button
						id="btn-clean"
						type="default"
						onClick={() => {
							leftFileSelectRef.current.value = ''
							rightFileSelectRef.current.value = ''
							setLeftSheetlist(null)
							setRightSheetlist(null)
							setLeftSheetname('Sheet1')
							setRightSheetname('Sheet1')
							setLeftSheetData(JSON.parse(JSON.stringify(ExcelHelper.BlankData(12, 8))))
							setRightSheetData(JSON.parse(JSON.stringify(ExcelHelper.BlankData(12, 8))))
							setDiffSheetData(BlankDiffData())
						}}
					>
						Reset
					</Button>
				</Col>
				<Col
					span={24}
					className="result-header"
				>
					<div style={{position: 'absolute', left: 10, top: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',gap: 10}}>
						<div style={{ width: '100px' }}>
							<Input onChange={(e) => tableHeadNumberChange(+e.target.value)} placeholder="表头行号" />
						</div>
						<div style={{ width: '250px' }}>
							<Select
								style={{ width: '100%' }}
								mode="multiple"
								allowClear
								disabled={headerRowNumber < 1}
								placeholder="输入表头所在行号再选择唯一字段"
								value={idsVal}
								onChange={(e) => setIdsVal(e)}
							>
								{idsSelectOptions}
							</Select>
						</div>
						<Button
							id="btn-diff"
							type="primary"
							onClick={() => {
								const result = diff(leftsheetdata, rightsheetdata, {headerRowNumber, ids: idsVal})
								if (result) {
									setDiffSheetData(result)
								}
							}}
						>
							Diff
						</Button>
					</div>
					<span style={{ fontSize: 24 }}>{'对比结果'}</span>
					<div className="result-export">
						<Button type="primary" loading={exporting} onClick={onExportClick}>
							Export
						</Button>
					</div>
				</Col>
				<Col span={24} style={{ textAlign: 'center' }}>
					<DiffResultHooks sheetdata={diffsheetdata} hotTableComponentDiffResult={hotTableComponentDiffResult} />
				</Col>
			</Row>
		</div>
	)
}

export default App
