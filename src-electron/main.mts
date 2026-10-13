import { app, BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

console.log('-> -> start src-electron/main.mts')

// Set by src-electron/dev.mts, which serves src/ through the Vite dev server.
const devServerUrl = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(import.meta.dirname, '..', 'dist', 'index.html')

const createWindow = () => {
	const win = new BrowserWindow({
		fullscreenable: true,
		width: 1366,
		height: 768,
	})
	win.setMenu(null) // 不显示顶部的File、Edit、View、Window菜单

	// 如果是通过 src-electron/dev 文件本地开发服务启动，加载本地开发的url
	if (devServerUrl) {
		win.loadURL(devServerUrl)
	}
	// 否则默认使用dist构建产物的web作为electron的页面加载
	else {
		win.loadFile(indexHtml)
	}
}
app.whenReady().then(() => {
	if (!devServerUrl && !existsSync(indexHtml)) {
		console.error('dist/index.html not found, run "pnpm build" first (or "pnpm dev" to use the Vite dev server).')
		app.quit()
		return
	}
	createWindow()
})

app.on('window-all-closed', () => {
	app.quit()
})
