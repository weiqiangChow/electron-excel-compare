import XLSX from 'xlsx'
import type { WorkBook } from 'xlsx'

export interface ExcelDomain {
	items: [] | undefined
	sheets: string[]
	workbook: WorkBook
}

export interface SheetDomain {
	items: [] | undefined
}

export class ExcelHelper {
	public static SheetJSFT = () => {
		var jsft = ['xlsx', 'xls']
		return jsft
			.map(function (x) {
				return '.' + x
			})
			.join(',')
	}

	public static BlankData = (row: number, col: number) => {
		var data: string[][] = new Array(row).fill('').map(() => new Array(col).fill(''))

		return data
	}

	/**
	 * SheetJS 会丢掉每行末尾的空单元格，因此以合并标题行开头的表格（例如 "MainBoard_BOM"）的首行
	 * 会比下面的数据行窄。Handsontable 和 daff 都按首行长度确定列数，这会让首行之后的列全都不显示，
	 * 所以这里先把每行补齐到最宽的行。用 `null` 是为了与 SheetJS 表示无值单元格的方式保持一致。
	 */
	public static PadRows = (items: unknown[]): any[][] => {
		const width = items.reduce((max: number, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)

		return items.map((row: any) =>
			Array.isArray(row) && row.length < width ? row.concat(new Array(width - row.length).fill(null)) : row,
		)
	}

	public getSheet = (wb: WorkBook, sheetname: string, callback: any) => {
		return new Promise(function (resolve, reject) {
			var wsItem = wb.Sheets[sheetname]

			/* 转成二维数组 */
			var items = XLSX.utils.sheet_to_json(wsItem, { header: 1 })

			var data = {
				items: ExcelHelper.PadRows(items) as [] | undefined,
			} as SheetDomain

			resolve(data)
			return callback(null, data)
		})
	}

	public convertFileToExcel = (file: Blob, callback: any) => {
		return new Promise((resolve, reject) => {
			var reader = new FileReader()
			var rABS = !!reader.readAsBinaryString
			reader.onload = function (e) {
				/* 解析数据 */
				var bstr = e?.target?.result
				var wb = XLSX.read(bstr, { type: rABS ? 'binary' : 'array' })

				/* 取第一个工作表 */
				var wsnameItems = wb.SheetNames[0]
				var wsItem = wb.Sheets[wsnameItems]

				/* 转成二维数组 */
				var items = XLSX.utils.sheet_to_json(wsItem, { header: 1 })

				var data = {
					items: ExcelHelper.PadRows(items),
					// locations: locations,
					sheets: wb.SheetNames,
					workbook: wb,
				} as ExcelDomain

				resolve(data)
				return callback(null, data)
			}
			if (file && rABS) reader.readAsBinaryString(file)
			else reader.readAsArrayBuffer(file)
		})
	}

	public static SampleDataLeft = () => {
		var TestData = [
			['Date', 'High', 'Low', 'Close', 'Volume', 'ask', 'cash'],
			['2019-07-08 00:00:00', '11540.33', '11469.53', '11506.43', '10.77073088', '0', '100000000'],
			['2019-07-07 19:00:00', '11610.0', '11432.32', '11547.98', '67.915214697', '0', '100000000'],
			['2019-07-07 18:00:00', '11525.0', '11426.74', '11470.47', '31.1094771869', '0', '100000000'],
			['2019-07-07 16:00:00', '11254.97', '11135.01', '11201.6', '23.5194946648', '0', '100000000'],
			['2019-07-07 15:00:00', '11408.02', '11189.0', '11254.97', '64.0821938629', '0', '100000000'],
		]

		return TestData
	}

	public static SampleDataRight = () => {
		var TestData = [
			['Date', 'High', 'Low', 'Close', 'Volume', 'bid', 'ask', 'Buy'],
			['2019-07-07 23:00:00', '11482.72', '11423.0', '11475.07', '32.99655899', '6', '0', '3'],
			['2019-07-07 19:00:00', '11610.0', '11432.32', '11547.98', '67.915214697', '6', '0', '9'],
			['2019-07-07 18:10:00', '11525.0', '11426.74', '11470.47', '31.1094771869', '6', '0', '9'],
			['2019-07-07 17:20:00', '11566.23', '11211.56', '11503.4', '121.5246740453', '0', '9'],
			['2019-07-07 16:00:00', '11254.97', '11135.01', '11200.6', '23.5194946648', '6', '0', '9'],
			['2019-07-07 15:00:00', '11408.02', '11189.0', '11254.97', '64.0821938629', '6', '1', '9'],
		]

		return TestData
	}
}
