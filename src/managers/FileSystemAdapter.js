/**
 * FileSystemAdapter.js - 文件系统访问适配器
 * 封装 File System Access API，提供文件和目录操作
 */

export class FileSystemAdapter {
    /**
     * 检查浏览器是否支持 File System Access API
     * @returns {boolean}
     */
    static isSupported() {
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
