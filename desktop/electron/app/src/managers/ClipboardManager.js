/**
 * ClipboardManager.js - 剪贴板管理器
 * 处理文件/场景的复制、剪切、粘贴操作
 */

import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {import('./types.js').FileReference} FileReference
 */

/**
 * 剪贴板操作类型
 * @typedef {'copy'|'cut'} ClipboardOperation
 */

/**
 * 剪贴板内容
 * @typedef {Object} ClipboardContent
 * @property {ClipboardOperation} operation - 操作类型
 * @property {FileReference[]} items - 文件引用列表
 * @property {FileSystemDirectoryHandle|null} sourceDirectory - 源目录句柄
 * @property {number} timestamp - 时间戳
 */

/**
 * 剪贴板管理器
 * 支持复制、剪切、粘贴文件操作
 */
export class ClipboardManager extends EventEmitter {
    constructor() {
        super();
        
        /** @type {ClipboardContent|null} */
        this._content = null;
        
        /** @type {import('./FileOperationManager.js').FileOperationManager|null} */
        this._fileOperationManager = null;
    }

    /**
     * 设置文件操作管理器
     * @param {import('./FileOperationManager.js').FileOperationManager} manager
     */
    setFileOperationManager(manager) {
        this._fileOperationManager = manager;
    }

    /**
     * 复制文件到剪贴板
     * @param {FileReference[]} items - 要复制的文件列表
     * @param {FileSystemDirectoryHandle} [sourceDirectory] - 源目录
     */
    copy(items, sourceDirectory = null) {
        if (!items || items.length === 0) {
            return;
        }

        this._content = {
            operation: 'copy',
            items: [...items],
            sourceDirectory,
            timestamp: Date.now()
        };

        this.emit('copied', {
            items: this._content.items,
            count: this._content.items.length
        });
    }

    /**
     * 剪切文件到剪贴板
     * @param {FileReference[]} items - 要剪切的文件列表
     * @param {FileSystemDirectoryHandle} [sourceDirectory] - 源目录
     */
    cut(items, sourceDirectory = null) {
        if (!items || items.length === 0) {
            return;
        }

        this._content = {
            operation: 'cut',
            items: [...items],
            sourceDirectory,
            timestamp: Date.now()
        };

        this.emit('cut', {
            items: this._content.items,
            count: this._content.items.length
        });
    }

    /**
     * 粘贴文件到目标目录
     * @param {FileSystemDirectoryHandle} targetDirectory - 目标目录
     * @returns {Promise<import('./types.js').BatchResult>} 操作结果
     */
    async paste(targetDirectory) {
        if (!this._content || !this._content.items.length) {
            throw new Error('剪贴板为空');
        }

        if (!this._fileOperationManager) {
            throw new Error('未设置文件操作管理器');
        }

        const { operation, items } = this._content;
        let result;

        try {
            if (operation === 'copy') {
                result = await this._fileOperationManager.batchCopy(items, targetDirectory);
            } else if (operation === 'cut') {
                result = await this._fileOperationManager.batchMove(items, targetDirectory);
                
                // 剪切成功后清空剪贴板
                if (result.successful.length > 0) {
                    // 只清除成功移动的项
                    const failedNames = new Set(result.failed.map(f => f.file.name));
                    this._content.items = this._content.items.filter(
                        item => failedNames.has(item.name)
                    );
                    
                    if (this._content.items.length === 0) {
                        this.clear();
                    }
                }
            }

            this.emit('pasted', {
                operation,
                result,
                targetDirectory: targetDirectory.name
            });

            return result;
        } catch (e) {
            this.emit('pasteError', { error: e });
            throw e;
        }
    }

    /**
     * 清空剪贴板
     */
    clear() {
        const hadContent = this._content !== null;
        this._content = null;
        
        if (hadContent) {
            this.emit('cleared');
        }
    }

    /**
     * 检查剪贴板是否有内容
     * @returns {boolean}
     */
    hasContent() {
        return this._content !== null && this._content.items.length > 0;
    }

    /**
     * 获取剪贴板内容
     * @returns {ClipboardContent|null}
     */
    getContent() {
        if (!this._content) return null;
        
        return {
            ...this._content,
            items: [...this._content.items]
        };
    }

    /**
     * 获取剪贴板中的项目数量
     * @returns {number}
     */
    getItemCount() {
        return this._content?.items.length || 0;
    }

    /**
     * 获取当前操作类型
     * @returns {ClipboardOperation|null}
     */
    getOperation() {
        return this._content?.operation || null;
    }

    /**
     * 检查是否为剪切操作
     * @returns {boolean}
     */
    isCutOperation() {
        return this._content?.operation === 'cut';
    }

    /**
     * 检查是否为复制操作
     * @returns {boolean}
     */
    isCopyOperation() {
        return this._content?.operation === 'copy';
    }

    /**
     * 检查指定文件是否在剪贴板中（用于 UI 显示剪切状态）
     * @param {string|FileReference} item - 文件或文件名
     * @returns {boolean}
     */
    isInClipboard(item) {
        if (!this._content) return false;
        
        const name = typeof item === 'string' ? item : item.name;
        return this._content.items.some(i => i.name === name);
    }

    /**
     * 检查指定文件是否被剪切（用于 UI 显示半透明效果）
     * @param {string|FileReference} item - 文件或文件名
     * @returns {boolean}
     */
    isCut(item) {
        return this.isCutOperation() && this.isInClipboard(item);
    }

    /**
     * 检查是否可以粘贴到指定目录
     * @param {FileSystemDirectoryHandle} targetDirectory - 目标目录
     * @returns {boolean}
     */
    canPasteTo(targetDirectory) {
        if (!this.hasContent()) return false;
        
        // 如果是剪切操作，不能粘贴到源目录
        if (this.isCutOperation() && this._content.sourceDirectory) {
            // 简单比较：如果目录名相同，可能是同一目录
            // 注意：这不是完美的比较，但 File System API 没有提供直接比较句柄的方法
            const targetPath = targetDirectory?.path;
            const sourcePath = this._content.sourceDirectory?.path;
            if (targetPath && sourcePath) {
                if (targetPath === sourcePath) return false;
            }

            if (targetDirectory.name === this._content.sourceDirectory.name) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this._content = null;
        this._fileOperationManager = null;
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ClipboardManager = ClipboardManager;
}
