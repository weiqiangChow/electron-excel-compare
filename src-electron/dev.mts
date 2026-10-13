import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import electron from 'electron'

// Run outside of Electron, the `electron` module resolves to the executable path,
// but its types describe the Electron API.
const electronPath = electron as unknown as string

// Declared in vite.config.mts, but the browser must not pop up next to the Electron window.
const server = await createServer({
	server: { open: false },
})

await server.listen()

const devServerUrl = server.resolvedUrls?.local[0]
if (!devServerUrl) {
	await server.close()
	throw new Error('Vite dev server did not report a local URL')
}

console.log(`-> -> starting Electron on ${devServerUrl}`)

const electronProcess = spawn(electronPath, ['.', ...process.argv.slice(2).filter((arg) => arg !== '--')], {
	stdio: 'inherit',
	env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl },
})

const shutdown = async (code: number) => {
	await server.close()
	process.exit(code)
}

electronProcess.on('close', (code) => void shutdown(code ?? 0))
process.on('SIGINT', () => {
	electronProcess.kill()
	void shutdown(0)
})
