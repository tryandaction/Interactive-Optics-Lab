/**
 * FileOperationManager.js - 文件操作管理器
 * 处理所有文件操作，包括移动、复制、删除、重命名
 */

import { EventEmitter } from './EventEmitter.js';
import { FileSystemAdapter } from './FileSystemAdapter.js';
import { 
    generateId, 
    generateUniqueFileName, 
    validateFileName,
    ProjectError,
    ProjectErrorCode 
} from './types.js';

/**
 * @typedef {import('./types.js').FileReference} FileReference
 * @typedef {import('./types.js').BatchResult} BatchResult
 * @typedef {import('./types.js').FileConflict} FileConflict
 * @typedef {import('./types.js').ConflictResolution} ConflictResolution
 */

/**
 * 文件操作管理器
 * 负责文件的移动、复制、删除、重命名等操作
 */
export class FileOperationManager extends EventEmitter {
    constructor() {
        super();
        
        /** @type {Function|null} */
        this._conflictResolver = null;
    }

    /**
     * 设置冲突解决器
     * @param {Function} resolver - 冲突解决函数
     */
    setConflictResolver(resolver) {
        this._conflictResolver = resolver;
    }

    // ============ 单文件操作 ============

    /**
     * 移动文件
     * @param {FileReference} source - 源文件引用
     * @param {FileSystemDirectoryHandle} targetDir - 目标目录
     * @returns {Promise<FileReference>} 移动后的文件引用
     */
    async moveFile(source, targetDir) {
        if (!source || !targetDir) {
            throw new ProjectError('源文件和目标目录不能为空', ProjectErrorCode.OPERATION_FAILED);
        }

        try {
            // 检查目标目录是否存在同名文件
            const existingNames = await this._getExistingFileNames(targetDir);
            
            if (existingNames.includes(source.name)) {
                // 处理冲突
                const resolution = await this._handleConflict({
                    type: 'name_exists',
                    source,
                    target: { name: source.name, path: targetDir.name }
                });
                
                if (resolution === 'cancel') {
                    throw new ProjectError('操作已取消', ProjectErrorCode.OPERATION_CANCELLED);
                }
                
                if (resolution === 'skip') {
                    return source;
                }
                
                if (resolution === 'rename') {
                    const newName = generateUniqueFileName(source.name, existingNames);
                    return await this._performMove(source, targetDir, newName);
                }
                
                // replace: 先删除目标文件
                await FileSystemAdapter.deleteFile(targetDir, source.name);
            }

            return await this._performMove(source, targetDir, source.name);
        } catch (e) {
            if (e instanceof ProjectError) throw e;
            throw new ProjectError(`移动文件失败: ${e.message}`, ProjectErrorCode.OPERATION_FAILED);
        }
    }

    /**
     * 执行移动操作
     * @private
     */
    async _performMove(source, targetDir, newName) {
        // 读取源文件内容
        let content;
        if (source.handle) {
            content = await FileSystemAdapter.readFile(source.handle);
        } else if (source.directoryHandle) {
            const fileHandle = await FileSystemAdapter.getFileHandle(source.directoryHandle, source.name);
            content = await FileSystemAdapter.readFile(fileHandle);
        } else {
            throw new ProjectError('无法读取源文件', ProjectErrorCode.FILE_NOT_FOUND);
        }

        // 在目标目录创建文件
        await FileSystemAdapter.createFile(targetDir, newName, content);

        // 删除源文件
        if (source.directoryHandle) {
            await FileSystemAdapter.deleteFile(source.directoryHandle, source.name);
        }

        const result = {
            name: newName,
            path: `${targetDir.name}/${newName}`,
            directoryHandle: targetDir
        };

        this.emit('fileMoved', { source, target: result });
        return result;
    }

    /**
     * 复制文件
     * @param {FileReference} source - 源文件引用
     * @param {FileSystemDirectoryHandle} targetDir - 目标目录
     * @param {string} [newName] - 新文件名（可选）
     * @returns {Promise<FileReference>} 复制后的文件引用
     */
    async copyFile(source, targetDir, newName) {
        if (!source || !targetDir) {
            throw new ProjectError('源文件和目标目录不能为空', ProjectErrorCode.OPERATION_FAILED);
        }

        try {
            // 读取源文件内容
            let content;
            if (source.handle) {
                content = await FileSystemAdapter.readFile(source.handle);
            } else if (source.directoryHandle) {
                const fileHandle = await FileSystemAdapter.getFileHandle(source.directoryHandle, source.name);
                content = await FileSystemAdapter.readFile(fileHandle);
            } else {
                throw new ProjectError('无法读取源文件', ProjectErrorCode.FILE_NOT_FOUND);
            }

            // 确定目标文件名
            const existingNames = await this._getExistingFileNames(targetDir);
            let targetName = newName || source.name;
            
            // 如果存在同名文件，生成唯一名称
            if (existingNames.includes(targetName)) {
                targetName = generateUniqueFileName(targetName, existingNames);
            }

            // 更新场景数据中的 ID（确保唯一性）
            const updatedContent = this._updateSceneIdInContent(content);

            // 在目标目录创建文件
            await FileSystemAdapter.createFile(targetDir, targetName, updatedContent);

            const result = {
                name: targetName,
                path: `${targetDir.name}/${targetName}`,
                directoryHandle: targetDir
            };

            this.emit('fileCopied', { source, target: result });
            return result;
        } catch (e) {
            if (e instanceof ProjectError) throw e;
            throw new ProjectError(`复制文件失败: ${e.message}`, ProjectErrorCode.OPERATION_FAILED);
        }
    }

    /**
     * 复制文件（在同一目录，用于"复制"功能）
     * @param {FileReference} source - 源文件引用
     * @returns {Promise<FileReference>} 复制后的文件引用
     */
    async duplicateFile(source) {
        if (!source.directoryHandle) {
            throw new ProjectError('需要目录句柄才能复制文件', ProjectErrorCode.OPERATION_FAILED);
        }

        // 生成带 _copy 后缀的名称
        const baseName = source.name.replace(/\.scene\.json$/, '');
        const newName = `${baseName}_copy.scene.json`;

        return await this.copyFile(source, source.directoryHandle, newName);
    }

    /**
     * 删除文件
     * @param {FileReference} source - 文件引用
     * @returns {Promise<void>}
     */
    async deleteFile(source) {
        if (!source) {
            throw new ProjectError('文件引用不能为空', ProjectErrorCode.OPERATION_FAILED);
        }

        try {
            if (source.directoryHandle) {
                await FileSystemAdapter.deleteFile(source.directoryHandle, source.name);
            } else {
                throw new ProjectError('需要目录句柄才能删除文件', ProjectErrorCode.OPERATION_FAILED);
            }

            this.emit('fileDeleted', source);
        } catch (e) {
            if (e instanceof ProjectError) throw e;
            throw new ProjectError(`删除文件失败: ${e.message}`, ProjectErrorCode.OPERATION_FAILED);
        }
    }

    /**
     * 重命名文件
     * @param {FileReference} source - 文件引用
     * @param {string} newName - 新文件名
     * @returns {Promise<FileReference>} 重命名后的文件引用
     */
    async renameFile(source, newName) {
        if (!source || !newName) {
            throw new ProjectError('文件引用和新名称不能为空', ProjectErrorCode.OPERATION_FAILED);
        }

        // 验证新文件名
        const validation = validateFileName(newName);
        if (!validation.valid) {
            throw new ProjectError(validation.error, ProjectErrorCode.INVALID_FILE_NAME);
        }

        // 确保扩展名正确
        let targetName = newName;
        if (!targetName.endsWith('.scene.json')) {
            targetName = `${targetName}.scene.json`;
        }

        try {
            if (!source.directoryHandle) {
                throw new ProjectError('需要目录句柄才能重命名文件', ProjectErrorCode.OPERATION_FAILED);
            }

            // 检查是否存在同名文件
            const existingNames = await this._getExistingFileNames(source.directoryHandle);
            if (existingNames.includes(targetName) && targetName !== source.name) {
                throw new ProjectError('已存在同名文件', ProjectErrorCode.FILE_EXISTS);
            }

            // 读取文件内容
            const fileHandle = await FileSystemAdapter.getFileHandle(source.directoryHandle, source.name);
            let content = await FileSystemAdapter.readFile(fileHandle);

            // 更新文件内容中的场景名称
            content = this._updateSceneNameInContent(content, newName.replace(/\.scene\.json$/, ''));

            // 创建新文件
            await FileSystemAdapter.createFile(source.directoryHandle, targetName, content);

            // 删除旧文件
            if (targetName !== source.name) {
                await FileSystemAdapter.deleteFile(source.directoryHandle, source.name);
            }

            const result = {
                name: targetName,
                path: source.path ? source.path.replace(source.name, targetName) : targetName,
                directoryHandle: source.directoryHandle
            };

            this.emit('fileRenamed', { source, target: result, oldName: source.name, newName: targetName });
            return result;
        } catch (e) {
            if (e instanceof ProjectError) throw e;
            throw new ProjectError(`重命名文件失败: ${e.message}`, ProjectErrorCode.OPERATION_FAILED);
        }
    }

    // ============ 批量操作 ============

    /**
     * 批量移动文件
     * @param {FileReference[]} sources - 源文件列表
     * @param {FileSystemDirectoryHandle} targetDir - 目标目录
     * @returns {Promise<BatchResult>} 批量操作结果
     */
    async batchMove(sources, targetDir) {
        /** @type {BatchResult} */
        const result = {
            successful: [],
            failed: []
        };

        for (const source of sources) {
            try {
                const moved = await this.moveFile(source, targetDir);
                result.successful.push(moved);
            } catch (e) {
                if (e.code === ProjectErrorCode.OPERATION_CANCELLED) {
                    // 用户取消，停止整个批量操作
                    break;
                }
                result.failed.push({ file: source, error: e });
            }
        }

        this.emit('batchOperationComplete', { operation: 'move', result });
        return result;
    }

    /**
     * 批量删除文件
     * @param {FileReference[]} sources - 文件列表
     * @returns {Promise<BatchResult>} 批量操作结果
     */
    async batchDelete(sources) {
        /** @type {BatchResult} */
        const result = {
            successful: [],
            failed: []
        };

        for (const source of sources) {
            try {
                await this.deleteFile(source);
                result.successful.push(source);
            } catch (e) {
                result.failed.push({ file: source, error: e });
            }
        }

        this.emit('batchOperationComplete', { operation: 'delete', result });
        return result;
    }

    /**
     * 批量复制文件
     * @param {FileReference[]} sources - 源文件列表
     * @param {FileSystemDirectoryHandle} targetDir - 目标目录
     * @returns {Promise<BatchResult>} 批量操作结果
     */
    async batchCopy(sources, targetDir) {
        /** @type {BatchResult} */
        const result = {
            successful: [],
            failed: []
        };

        for (const source of sources) {
            try {
                const copied = await this.copyFile(source, targetDir);
                result.successful.push(copied);
            } catch (e) {
                result.failed.push({ file: source, error: e });
            }
        }

        this.emit('batchOperationComplete', { operation: 'copy', result });
        return result;
    }

    // ============ 辅助方法 ============

    /**
     * 获取目录中已存在的文件名列表
     * @private
     */
    async _getExistingFileNames(dirHandle) {
        const entries = await FileSystemAdapter.listDirectory(dirHandle);
        return entries.filter(e => e.kind === 'file').map(e => e.name);
    }

    /**
     * 处理文件冲突
     * @private
     */
    async _handleConflict(conflict) {
        if (this._conflictResolver) {
            return await this._conflictResolver(conflict);
        }
        // 默认行为：自动重命名
        return 'rename';
    }

    /**
     * 更新场景内容中的 ID
     * @private
     */
    _updateSceneIdInContent(content) {
        try {
            const data = JSON.parse(content);
            
            // 更新场景 ID
            if (data.metadata) {
                data.metadata.id = generateId('scene');
                data.metadata.updatedAt = new Date().toISOString();
            }
            
            // 更新组件 ID
            if (data.components && Array.isArray(data.components)) {
                data.components = data.components.map(comp => ({
                    ...comp,
                    id: comp.id ? generateId('comp') : comp.id
                }));
            }
            
            return JSON.stringify(data, null, 2);
        } catch (e) {
            // 如果解析失败，返回原内容
            return content;
        }
    }

    /**
     * 更新场景内容中的名称
     * @private
     */
    _updateSceneNameInContent(content, newName) {
        try {
            const data = JSON.parse(content);
            
            if (data.name) {
                data.name = newName;
            }
            
            if (data.metadata) {
                data.metadata.name = newName;
                data.metadata.updatedAt = new Date().toISOString();
            }
            
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return content;
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.FileOperationManager = FileOperationManager;
}
