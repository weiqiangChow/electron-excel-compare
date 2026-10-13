console.log("-> -> start src-electron/main.js")

const { app, BrowserWindow } = require('electron')

const createWindow = () => {
    const win = new BrowserWindow({
        fullscreenable: true,
        width: 1366,
        height: 768
    })

    win.loadFile('index.html')
}
app.whenReady().then(() => {
    createWindow()
})
