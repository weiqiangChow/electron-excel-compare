import daff from 'daff/lib/core'
import type { RefObject } from 'react'

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

export const diff = (left: any[][], right: any[][], ref: RefObject<any>, headerRowNumber?:number) => {
	const instance = ref.current.hotInstance
	let result = []
	let newLeft, newRight
	if (headerRowNumber && headerRowNumber >= 1) {
		headerRowNumber -= 1
		// 把两个excel的表头字段中 alt + enter 插入的换行符号统一换成 \n
		left[headerRowNumber] = left[headerRowNumber].map((header) => header && header.replaceAll(/\r\n/g, '\n'))
		right[headerRowNumber] = right[headerRowNumber].map((header) => header && header.replaceAll(/\r\n/g, '\n'))
		// 让两个表的表头字段对齐
		newRight = sortRightByLeftHeader(left, right, headerRowNumber)
		newLeft = sortRightByLeftHeader(newRight, left, headerRowNumber)
	}

	const tableLeft = new daff.TableView(newLeft || left)
	const tableRight = new daff.TableView(newRight || right)

	tableLeft.trim()
	tableRight.trim()

	const ct = daff.compareTables(tableLeft, tableRight)

	const align = ct.align()
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
		result = output.data
		instance.loadData(result)
	}
}
