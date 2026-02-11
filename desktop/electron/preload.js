const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const fsp = fs.promises;

async function selectDirectory(options = {}) {
    return ipcRenderer.invoke('desktop:selectDirectory', options);
}

async function readFile(filePath) {
    return await fsp.readFile(filePath, 'utf8');
}

async function writeFile(filePath, content) {
    await fsp.writeFile(filePath, content ?? '', 'utf8');
}

async function mkdir(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true });
}

async function rm(targetPath, options = {}) {
    await fsp.rm(targetPath, { recursive: !!options.recursive, force: true });
}

async function rename(oldPath, newPath) {
    await fsp.rename(oldPath, newPath);
}

async function readdir(dirPath) {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
        name: entry.name,
        kind: entry.isDirectory() ? 'directory' : 'file'
    }));
}

async function exists(targetPath, kind) {
    try {
        const stat = await fsp.stat(targetPath);
        if (!kind) return true;
        if (kind === 'directory') return stat.isDirectory();
        if (kind === 'file') return stat.isFile();
        return true;
    } catch (e) {
        return false;
    }
}

contextBridge.exposeInMainWorld('opticsDesktop', {
    fs: {
        selectDirectory,
        readFile,
        writeFile,
        mkdir,
        rm,
        rename,
        readdir,
        exists
    },
    path: {
        join: (...parts) => path.join(...parts),
        basename: (value) => path.basename(value)
    }
});
