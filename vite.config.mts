import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: './',
	server: {
		port: 3210,
		open: true,
		watch: {
			// 别让前端的vite服务监听 tauri 的文件目录
			// 以防前端服务锁了该目录下的文件导致tauri编译报错
			// file watcher error: EBUSY: resource busy or locked
			ignored: ['**/src-tauri/**'],
		},
	},
	build: {
		outDir: 'dist-web',
	},
})
