/**
 * FileSystemAdapter.js - 文件系统访问适配器
 * 封装 File System Access API，提供文件和目录操作
 */

export class FileSystemAdapter {
    static _getDesktopBridge() {
        if (typeof window === 'undefined') return null;
        return window.opticsDesktop || window.electronAPI || window.desktopAPI || null;
    }

    static _isDesktopSupported() {
        const bridge = this._getDesktopBridge();
        return !!(bridge && bridge.fs && bridge.path);
    }

    static _resolvePath(handleOrPath) {
        if (!handleOrPath) return null;
        if (typeof handleOrPath === 'string') return handleOrPath;
        if (handleOrPath.path) return handleOrPath.path;
        return null;
    }

    static _basename(pathValue) {
        if (!pathValue) return '';
        const parts = String(pathValue).split(/[\\/]/);
        return parts[parts.length - 1] || '';
    }

    static _makeDirHandle(pathValue, bridge) {
        if (!pathValue) return null;
        const name = bridge?.path?.basename ? bridge.path.basename(pathValue) : this._basename(pathValue);
        return { kind: 'directory', name, path: pathValue };
    }

    static _makeFileHandle(pathValue, bridge) {
        if (!pathValue) return null;
        const name = bridge?.path?.basename ? bridge.path.basename(pathValue) : this._basename(pathValue);
        return { kind: 'file', name, path: pathValue };
    }

    /**
     * 检查浏览器是否支持 File System Access API
     * @returns {boolean}
     */
    static isSupported() {
        if (this._isDesktopSupported()) return true;
        if (typeof window === 'undefined') return false;
        return 'showDirectoryPicker' in window &&
               'showOpenFilePicker' in window &&
               'showSaveFilePicker' in window;
    }

    /**
     * 选择目录
     * @param {Object} options - 选项
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    static async selectDirectory(options = {}) {
        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const selectedPath = await bridge.fs.selectDirectory(options);
            if (!selectedPath) {
                throw new Error('用户取消了文件夹选择');
            }
            return this._makeDirHandle(selectedPath, bridge);
        }

        if (!this.isSupported()) {
            throw new Error('File System Access API is not supported in this browser');
        }

        try {
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite',
                startIn: options.startIn || 'documents',
                ...options
            });
            return handle;
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error('用户取消了文件夹选择');
            }
            throw e;
        }
    }

    /**
     * 在指定目录下创建子目录
     * @param {FileSystemDirectoryHandle} parentHandle - 父目录句柄
     * @param {string} name - 目录名称
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    static async createDirectory(parentHandle, name) {
        if (!parentHandle) {
            throw new Error('Parent directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const parentPath = this._resolvePath(parentHandle);
            if (!parentPath) {
                throw new Error('Parent directory handle is required');
            }
            const dirPath = bridge.path.join(parentPath, name);
            await bridge.fs.mkdir(dirPath);
            return this._makeDirHandle(dirPath, bridge);
        }
        
        try {
            const dirHandle = await parentHandle.getDirectoryHandle(name, { create: true });
            return dirHandle;
        } catch (e) {
            throw new Error(`Failed to create directory '${name}': ${e.message}`);
        }
    }

    /**
     * 删除目录（递归）
     * @param {FileSystemDirectoryHandle} parentHandle - 父目录句柄
     * @param {string} name - 要删除的目录名称
     */
    static async deleteDirectory(parentHandle, name) {
        if (!parentHandle) {
            throw new Error('Parent directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const parentPath = this._resolvePath(parentHandle);
            const targetPath = parentPath ? bridge.path.join(parentPath, name) : null;
            if (!targetPath) {
                throw new Error('Parent directory handle is required');
            }
            await bridge.fs.rm(targetPath, { recursive: true });
            return;
        }

        try {
            await parentHandle.removeEntry(name, { recursive: true });
        } catch (e) {
            throw new Error(`Failed to delete directory '${name}': ${e.message}`);
        }
    }

    /**
     * 重命名目录（通过复制+删除实现）
     * @param {FileSystemDirectoryHandle} parentHandle - 父目录句柄
     * @param {string} oldName - 旧名称
     * @param {string} newName - 新名称
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    static async renameDirectory(parentHandle, oldName, newName) {
        if (!parentHandle) {
            throw new Error('Parent directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const parentPath = this._resolvePath(parentHandle);
            if (!parentPath) {
                throw new Error('Parent directory handle is required');
            }
            const oldPath = bridge.path.join(parentPath, oldName);
            const newPath = bridge.path.join(parentPath, newName);
            await bridge.fs.rename(oldPath, newPath);
            return this._makeDirHandle(newPath, bridge);
        }

        try {
            // 获取旧目录
            const oldDirHandle = await parentHandle.getDirectoryHandle(oldName);
            
            // 创建新目录
            const newDirHandle = await parentHandle.getDirectoryHandle(newName, { create: true });
            
            // 复制所有内容
            await this.copyDirectoryContents(oldDirHandle, newDirHandle);
            
            // 删除旧目录
            await parentHandle.removeEntry(oldName, { recursive: true });
            
            return newDirHandle;
        } catch (e) {
            throw new Error(`Failed to rename directory from '${oldName}' to '${newName}': ${e.message}`);
        }
    }

    /**
     * 复制目录内容
     * @param {FileSystemDirectoryHandle} sourceHandle - 源目录
     * @param {FileSystemDirectoryHandle} destHandle - 目标目录
     */
    static async copyDirectoryContents(sourceHandle, destHandle) {
        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const sourcePath = this._resolvePath(sourceHandle);
            const destPath = this._resolvePath(destHandle);
            if (!sourcePath || !destPath) return;

            const entries = await bridge.fs.readdir(sourcePath);
            for (const entry of entries) {
                const sourceEntryPath = bridge.path.join(sourcePath, entry.name);
                const destEntryPath = bridge.path.join(destPath, entry.name);
                if (entry.kind === 'directory') {
                    await bridge.fs.mkdir(destEntryPath);
                    await this.copyDirectoryContents(
                        this._makeDirHandle(sourceEntryPath, bridge),
                        this._makeDirHandle(destEntryPath, bridge)
                    );
                } else {
                    const content = await bridge.fs.readFile(sourceEntryPath);
                    await bridge.fs.writeFile(destEntryPath, content);
                }
            }
            return;
        }

        for await (const [name, handle] of sourceHandle.entries()) {
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                const content = await file.text();
                await this.createFile(destHandle, name, content);
            } else if (handle.kind === 'directory') {
                const newSubDir = await destHandle.getDirectoryHandle(name, { create: true });
                await this.copyDirectoryContents(handle, newSubDir);
            }
        }
    }

    /**
     * 读取文件内容
     * @param {FileSystemFileHandle} fileHandle - 文件句柄
     * @returns {Promise<string>}
     */
    static async readFile(fileHandle) {
        if (!fileHandle) {
            throw new Error('File handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const filePath = this._resolvePath(fileHandle);
            if (!filePath) {
                throw new Error('File handle is required');
            }
            return await bridge.fs.readFile(filePath);
        }

        try {
            const file = await fileHandle.getFile();
            return await file.text();
        } catch (e) {
            throw new Error(`Failed to read file: ${e.message}`);
        }
    }

    /**
     * 写入文件内容
     * @param {FileSystemFileHandle} fileHandle - 文件句柄
     * @param {string} content - 文件内容
     */
    static async writeFile(fileHandle, content) {
        if (!fileHandle) {
            throw new Error('File handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const filePath = this._resolvePath(fileHandle);
            if (!filePath) {
                throw new Error('File handle is required');
            }
            await bridge.fs.writeFile(filePath, content ?? '');
            return;
        }

        try {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        } catch (e) {
            throw new Error(`Failed to write file: ${e.message}`);
        }
    }

    /**
     * 在目录中创建文件
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {string} name - 文件名
     * @param {string} content - 文件内容
     * @returns {Promise<FileSystemFileHandle>}
     */
    static async createFile(dirHandle, name, content = '') {
        if (!dirHandle) {
            throw new Error('Directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) {
                throw new Error('Directory handle is required');
            }
            const filePath = bridge.path.join(dirPath, name);
            await bridge.fs.writeFile(filePath, content ?? '');
            return this._makeFileHandle(filePath, bridge);
        }

        try {
            const fileHandle = await dirHandle.getFileHandle(name, { create: true });
            if (content) {
                await this.writeFile(fileHandle, content);
            }
            return fileHandle;
        } catch (e) {
            throw new Error(`Failed to create file '${name}': ${e.message}`);
        }
    }

    /**
     * 删除文件
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {string} name - 文件名
     */
    static async deleteFile(dirHandle, name) {
        if (!dirHandle) {
            throw new Error('Directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) {
                throw new Error('Directory handle is required');
            }
            const filePath = bridge.path.join(dirPath, name);
            await bridge.fs.rm(filePath, { recursive: false });
            return;
        }

        try {
            await dirHandle.removeEntry(name);
        } catch (e) {
            throw new Error(`Failed to delete file '${name}': ${e.message}`);
        }
    }

    /**
     * 重命名文件
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {string} oldName - 旧文件名
     * @param {string} newName - 新文件名
     * @returns {Promise<FileSystemFileHandle>}
     */
    static async renameFile(dirHandle, oldName, newName) {
        if (!dirHandle) {
            throw new Error('Directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) {
                throw new Error('Directory handle is required');
            }
            const oldPath = bridge.path.join(dirPath, oldName);
            const newPath = bridge.path.join(dirPath, newName);
            await bridge.fs.rename(oldPath, newPath);
            return this._makeFileHandle(newPath, bridge);
        }

        try {
            // 读取旧文件内容
            const oldFileHandle = await dirHandle.getFileHandle(oldName);
            const content = await this.readFile(oldFileHandle);
            
            // 创建新文件
            const newFileHandle = await this.createFile(dirHandle, newName, content);
            
            // 删除旧文件
            await dirHandle.removeEntry(oldName);
            
            return newFileHandle;
        } catch (e) {
            throw new Error(`Failed to rename file from '${oldName}' to '${newName}': ${e.message}`);
        }
    }

    /**
     * 列出目录内容
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @returns {Promise<Array<{name: string, kind: string, handle: FileSystemHandle}>>}
     */
    static async listDirectory(dirHandle) {
        if (!dirHandle) {
            throw new Error('Directory handle is required');
        }

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) {
                throw new Error('Directory handle is required');
            }
            const entries = await bridge.fs.readdir(dirPath);
            return entries.map(entry => {
                const entryPath = bridge.path.join(dirPath, entry.name);
                const handle = entry.kind === 'directory'
                    ? this._makeDirHandle(entryPath, bridge)
                    : this._makeFileHandle(entryPath, bridge);
                return { name: entry.name, kind: entry.kind, handle };
            }).sort((a, b) => {
                if (a.kind !== b.kind) {
                    return a.kind === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        }

        const entries = [];
        try {
            for await (const [name, handle] of dirHandle.entries()) {
                entries.push({
                    name,
                    kind: handle.kind,
                    handle
                });
            }
            return entries.sort((a, b) => {
                // 目录排在前面
                if (a.kind !== b.kind) {
                    return a.kind === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        } catch (e) {
            throw new Error(`Failed to list directory: ${e.message}`);
        }
    }

    /**
     * 检查文件或目录是否存在
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {string} name - 文件或目录名
     * @param {string} kind - 'file' 或 'directory'
     * @returns {Promise<boolean>}
     */
    static async exists(dirHandle, name, kind = 'file') {
        if (!dirHandle) return false;

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) return false;
            const targetPath = bridge.path.join(dirPath, name);
            return await bridge.fs.exists(targetPath, kind);
        }

        try {
            if (kind === 'directory') {
                await dirHandle.getDirectoryHandle(name);
            } else {
                await dirHandle.getFileHandle(name);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 获取文件句柄
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {string} name - 文件名
     * @param {boolean} create - 是否创建
     * @returns {Promise<FileSystemFileHandle|null>}
     */
    static async getFileHandle(dirHandle, name, create = false) {
        if (!dirHandle) return null;

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const dirPath = this._resolvePath(dirHandle);
            if (!dirPath) return null;
            const filePath = bridge.path.join(dirPath, name);
            const exists = await bridge.fs.exists(filePath, 'file');
            if (create && !exists) {
                await bridge.fs.writeFile(filePath, '');
            }
            if (!create && !exists) return null;
            return this._makeFileHandle(filePath, bridge);
        }

        try {
            return await dirHandle.getFileHandle(name, { create });
        } catch (e) {
            if (!create) return null;
            throw e;
        }
    }

    /**
     * 获取目录句柄
     * @param {FileSystemDirectoryHandle} dirHandle - 父目录句柄
     * @param {string} name - 目录名
     * @param {boolean} create - 是否创建
     * @returns {Promise<FileSystemDirectoryHandle|null>}
     */
    static async getDirectoryHandle(dirHandle, name, create = false) {
        if (!dirHandle) return null;

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const parentPath = this._resolvePath(dirHandle);
            if (!parentPath) return null;
            const dirPath = bridge.path.join(parentPath, name);
            const exists = await bridge.fs.exists(dirPath, 'directory');
            if (create && !exists) {
                await bridge.fs.mkdir(dirPath);
            }
            if (!create && !exists) return null;
            return this._makeDirHandle(dirPath, bridge);
        }

        try {
            return await dirHandle.getDirectoryHandle(name, { create });
        } catch (e) {
            if (!create) return null;
            throw e;
        }
    }

    /**
     * 递归获取目录树
     * @param {FileSystemDirectoryHandle} dirHandle - 目录句柄
     * @param {number} maxDepth - 最大深度
     * @returns {Promise<Object>}
     */
    static async getDirectoryTree(dirHandle, maxDepth = 10) {
        if (!dirHandle || maxDepth <= 0) return null;

        if (this._isDesktopSupported()) {
            const bridge = this._getDesktopBridge();
            const rootPath = this._resolvePath(dirHandle);
            if (!rootPath) return null;
            const walk = async (currentPath, depth) => {
                if (depth <= 0) return null;
                const node = {
                    name: bridge.path.basename(currentPath),
                    kind: 'directory',
                    children: []
                };
                const entries = await bridge.fs.readdir(currentPath);
                for (const entry of entries) {
                    const entryPath = bridge.path.join(currentPath, entry.name);
                    if (entry.kind === 'directory') {
                        const subTree = await walk(entryPath, depth - 1);
                        if (subTree) node.children.push(subTree);
                    } else {
                        node.children.push({ name: entry.name, kind: 'file' });
                    }
                }
                node.children.sort((a, b) => {
                    if (a.kind !== b.kind) {
                        return a.kind === 'directory' ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
                return node;
            };
            return await walk(rootPath, maxDepth);
        }

        const tree = {
            name: dirHandle.name,
            kind: 'directory',
            children: []
        };

        try {
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'directory') {
                    const subTree = await this.getDirectoryTree(handle, maxDepth - 1);
                    if (subTree) {
                        tree.children.push(subTree);
                    }
                } else {
                    tree.children.push({
                        name,
                        kind: 'file'
                    });
                }
            }
            
            // 排序：目录在前，然后按名称
            tree.children.sort((a, b) => {
                if (a.kind !== b.kind) {
                    return a.kind === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            return tree;
        } catch (e) {
            console.error(`Error getting directory tree: ${e.message}`);
            return tree;
        }
    }

    /**
     * 请求持久化权限
     * @param {FileSystemHandle} handle - 文件或目录句柄
     * @returns {Promise<boolean>}
     */
    static async requestPermission(handle) {
        if (!handle) return false;

        if (this._isDesktopSupported()) {
            return true;
        }

        try {
            const options = { mode: 'readwrite' };
            
            // 检查当前权限
            if ((await handle.queryPermission(options)) === 'granted') {
                return true;
            }
            
            // 请求权限
            if ((await handle.requestPermission(options)) === 'granted') {
                return true;
            }
            
            return false;
        } catch (e) {
            console.error('Error requesting permission:', e);
            return false;
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.FileSystemAdapter = FileSystemAdapter;
}
