import React from 'react'
import { ExcelHelper } from '../utils/ExcelHelper'
import { Button, Input, Select } from 'antd'
import 'antd/dist/antd.css'

interface Import {
	sheetname: string
	sheetlist: any
	fileRef: React.RefObject<any>
	onFileSelectChange(e: React.ChangeEvent<HTMLInputElement>): any
	onSheetSelectChange(e: string): any
}

const ImportHooks = ({ sheetname = 'Sheet1', sheetlist = null, ...props }: Import) => {
	return (
		<Input.Group style={{ display: 'flex', justifyContent: 'start', alignItems: 'center', margin: '0 0 10px -30px', gap: 30 }} compact>
			<input
				name={'file-upload'}
				style={{ display: 'none'}}
				type="file"
				accept={ExcelHelper.SheetJSFT()}
				aria-label="Select original file"
				onChange={(e) => props.onFileSelectChange(e)}
				ref={props.fileRef}
			></input>
			<Button onClick={() => props.fileRef.current.click()}>选择文件</Button>
			<span>{props.fileRef.current?.files[0]?.name || 'No file selected'}</span>
			<Select style={{ width: '40%' }} value={sheetname} onChange={(e) => props.onSheetSelectChange(e)}>
				{sheetlist}
			</Select>
		</Input.Group>
	)
}

export default ImportHooks
