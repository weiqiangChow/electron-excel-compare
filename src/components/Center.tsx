import React from 'react'
import 'antd/dist/antd.css'
import { Button } from 'antd'

interface DiffBtn {
	onDiffBtnClick(e: React.MouseEvent<HTMLElement, MouseEvent>): any
	onSampleBtnClick(e: React.MouseEvent<HTMLElement, MouseEvent>): any
	onResetBtnClick(e: React.MouseEvent<HTMLElement, MouseEvent>): any
}

const CenterHooks = (props: DiffBtn) => {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
			<Button type="dashed" size="small" style={{ marginTop: 150 }} onClick={(e) => props.onSampleBtnClick(e)}>
				{'Sample Demo'}
			</Button>
			<Button
				ref={React.createRef()}
				id="btn-diff"
				type="primary"
				style={{ marginTop: 10 }}
				size="large"
				onClick={(e) => props.onDiffBtnClick(e)}
			>
				{'Diff'}
			</Button>
			<Button
				ref={React.createRef()}
				id="btn-clean"
				type="default"
				style={{ marginTop: 10 }}
				onClick={(e) => props.onResetBtnClick(e)}
			>
				{'Reset'}
			</Button>
		</div>
	)
}

export default CenterHooks
