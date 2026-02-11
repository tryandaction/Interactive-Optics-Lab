const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 640,
        backgroundColor: '#0f0f10',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    const packagedIndex = path.join(__dirname, 'app', 'index.html');
    const devIndex = path.join(__dirname, '..', '..', 'index.html');
    const indexPath = fs.existsSync(packagedIndex) ? packagedIndex : devIndex;
    mainWindow.loadFile(indexPath);
}

app.whenReady().then(() => {
    ipcMain.handle('desktop:selectDirectory', async (_event, options = {}) => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory', 'createDirectory'],
            title: options.title || '选择项目目录',
            defaultPath: options.startIn || undefined
        });
        if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
