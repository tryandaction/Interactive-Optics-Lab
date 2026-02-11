/**
 * DialogManager.js - 对话框管理器
 * 统一管理所有对话框的显示和交互
 */

import { EventEmitter } from './EventEmitter.js';
import { validateFileName } from './types.js';

/**
 * 对话框管理器
 * 提供统一的对话框接口
 */
export class DialogManager extends EventEmitter {
    constructor() {
        super();
        
        /** @type {HTMLElement|null} */
        this._overlay = null;
        
        /** @type {HTMLElement|null} */
        this._currentDialog = null;
        
        /** @type {Function|null} */
        this._currentResolve = null;
        
        this._init();
    }

    /**
     * 初始化对话框容器
     * @private
     */
    _init() {
        // 创建遮罩层
        this._overlay = document.createElement('div');
        this._overlay.className = 'dialog-overlay';
        this._overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            justify-content: center;
            align-items: center;
        `;
        
        // 点击遮罩关闭对话框
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) {
                this._close(null);
            }
        });
        
        // ESC 键关闭对话框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._currentDialog) {
                this._close(null);
            }
        });
        
        document.body.appendChild(this._overlay);
    }

    /**
     * 显示对话框
     * @private
     */
    _show(dialogElement) {
        this._currentDialog = dialogElement;
        this._overlay.innerHTML = '';
        this._overlay.appendChild(dialogElement);
        this._overlay.style.display = 'flex';
        
        // 聚焦第一个输入框
        const firstInput = dialogElement.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 50);
        }
    }

    /**
     * 关闭对话框
     * @private
     */
    _close(result) {
        this._overlay.style.display = 'none';
        this._currentDialog = null;
        
        if (this._currentResolve) {
            this._currentResolve(result);
            this._currentResolve = null;
        }
    }

    /**
     * 创建基础对话框元素
     * @private
     */
    _createDialogBase(title, content, buttons) {
        const dialog = document.createElement('div');
        dialog.className = 'dialog-container';
        dialog.style.cssText = `
            background: var(--bg-primary, #1e1e1e);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            min-width: 320px;
            max-width: 500px;
            color: var(--text-primary, #fff);
        `;
        
        dialog.innerHTML = `
            <div class="dialog-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border-color, #333);">
                <h3 style="margin: 0; font-size: 16px; font-weight: 500;">${title}</h3>
            </div>
            <div class="dialog-content" style="padding: 20px;">
                ${content}
            </div>
            <div class="dialog-footer" style="padding: 12px 20px; border-top: 1px solid var(--border-color, #333); display: flex; justify-content: flex-end; gap: 8px;">
                ${buttons}
            </div>
        `;
        
        // 阻止点击事件冒泡到遮罩
        dialog.addEventListener('click', (e) => e.stopPropagation());
        
        return dialog;
    }

    // ============ 项目对话框 ============

    /**
     * 显示创建项目对话框
     * @returns {Promise<{name: string, storageMode: string}|null>}
     */
    showCreateProjectDialog() {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const content = `
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary, #aaa);">项目名称</label>
                    <input type="text" id="dialog-project-name" placeholder="输入项目名称" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--bg-secondary, #2d2d2d); color: var(--text-primary, #fff); font-size: 14px; box-sizing: border-box;">
                    <div id="dialog-name-error" style="color: #f44; font-size: 12px; margin-top: 4px; display: none;"></div>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary, #aaa);">存储模式</label>
                    <select id="dialog-storage-mode" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--bg-secondary, #2d2d2d); color: var(--text-primary, #fff); font-size: 14px;">
                        <option value="local">本地文件夹</option>
                        <option value="localStorage">浏览器存储</option>
                    </select>
                </div>
            `;
            
            const buttons = `
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent-color, #0078d4); color: #fff; cursor: pointer;">创建</button>
            `;
            
            const dialog = this._createDialogBase('创建新项目', content, buttons);
            
            // 绑定事件
            const nameInput = dialog.querySelector('#dialog-project-name');
            const errorDiv = dialog.querySelector('#dialog-name-error');
            const confirmBtn = dialog.querySelector('#dialog-confirm');
            const cancelBtn = dialog.querySelector('#dialog-cancel');
            
            const validateName = () => {
                const name = nameInput.value.trim();
                const validation = validateFileName(name);
                if (!name) {
                    errorDiv.textContent = '项目名称不能为空';
                    errorDiv.style.display = 'block';
                    return false;
                }
                if (!validation.valid) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                    return false;
                }
                errorDiv.style.display = 'none';
                return true;
            };
            
            nameInput.addEventListener('input', validateName);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && validateName()) {
                    confirmBtn.click();
                }
            });
            
            confirmBtn.addEventListener('click', () => {
                if (validateName()) {
                    this._close({
                        name: nameInput.value.trim(),
                        storageMode: dialog.querySelector('#dialog-storage-mode').value
                    });
                }
            });
            
            cancelBtn.addEventListener('click', () => this._close(null));
            
            this._show(dialog);
        });
    }

    // ============ 场景对话框 ============

    /**
     * 显示创建场景对话框
     * @returns {Promise<{name: string}|null>}
     */
    showCreateSceneDialog() {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const content = `
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary, #aaa);">场景名称</label>
                    <input type="text" id="dialog-scene-name" placeholder="输入场景名称" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--bg-secondary, #2d2d2d); color: var(--text-primary, #fff); font-size: 14px; box-sizing: border-box;">
                    <div id="dialog-name-error" style="color: #f44; font-size: 12px; margin-top: 4px; display: none;"></div>
                </div>
            `;
            
            const buttons = `
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent-color, #0078d4); color: #fff; cursor: pointer;">创建</button>
            `;
            
            const dialog = this._createDialogBase('创建新场景', content, buttons);
            
            const nameInput = dialog.querySelector('#dialog-scene-name');
            const errorDiv = dialog.querySelector('#dialog-name-error');
            const confirmBtn = dialog.querySelector('#dialog-confirm');
            const cancelBtn = dialog.querySelector('#dialog-cancel');
            
            const validateName = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    errorDiv.textContent = '场景名称不能为空';
                    errorDiv.style.display = 'block';
                    return false;
                }
                const validation = validateFileName(name);
                if (!validation.valid) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                    return false;
                }
                errorDiv.style.display = 'none';
                return true;
            };
            
            nameInput.addEventListener('input', validateName);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && validateName()) {
                    confirmBtn.click();
                }
            });
            
            confirmBtn.addEventListener('click', () => {
                if (validateName()) {
                    this._close({ name: nameInput.value.trim() });
                }
            });
            
            cancelBtn.addEventListener('click', () => this._close(null));
            
            this._show(dialog);
        });
    }

    /**
     * 显示保存临时场景对话框
     * @param {string} defaultName - 默认名称
     * @returns {Promise<{fileName: string}|null>}
     */
    showSaveTemporarySceneDialog(defaultName = '') {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const content = `
                <p style="margin: 0 0 16px; color: var(--text-secondary, #aaa); font-size: 13px;">
                    此场景尚未保存。请输入文件名以保存到项目中。
                </p>
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary, #aaa);">文件名</label>
                    <input type="text" id="dialog-file-name" value="${defaultName}" placeholder="输入文件名" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--bg-secondary, #2d2d2d); color: var(--text-primary, #fff); font-size: 14px; box-sizing: border-box;">
                    <div id="dialog-name-error" style="color: #f44; font-size: 12px; margin-top: 4px; display: none;"></div>
                </div>
            `;
            
            const buttons = `
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent-color, #0078d4); color: #fff; cursor: pointer;">保存</button>
            `;
            
            const dialog = this._createDialogBase('保存场景', content, buttons);
            
            const nameInput = dialog.querySelector('#dialog-file-name');
            const errorDiv = dialog.querySelector('#dialog-name-error');
            const confirmBtn = dialog.querySelector('#dialog-confirm');
            const cancelBtn = dialog.querySelector('#dialog-cancel');
            
            const validateName = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    errorDiv.textContent = '文件名不能为空';
                    errorDiv.style.display = 'block';
                    return false;
                }
                const validation = validateFileName(name);
                if (!validation.valid) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                    return false;
                }
                errorDiv.style.display = 'none';
                return true;
            };
            
            nameInput.addEventListener('input', validateName);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && validateName()) {
                    confirmBtn.click();
                }
            });
            
            confirmBtn.addEventListener('click', () => {
                if (validateName()) {
                    this._close({ fileName: nameInput.value.trim() });
                }
            });
            
            cancelBtn.addEventListener('click', () => this._close(null));
            
            this._show(dialog);
        });
    }

    // ============ 确认对话框 ============

    /**
     * 显示未保存更改对话框
     * @param {Array<{name: string}>} scenes - 未保存的场景列表
     * @returns {Promise<'save'|'discard'|'cancel'>}
     */
    showUnsavedChangesDialog(scenes = []) {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const sceneList = scenes.length > 0 
                ? `<ul style="margin: 8px 0; padding-left: 20px;">${scenes.map(s => `<li>${s.name}</li>`).join('')}</ul>`
                : '';
            
            const content = `
                <p style="margin: 0 0 8px; color: var(--text-primary, #fff);">
                    以下场景有未保存的更改：
                </p>
                ${sceneList}
                <p style="margin: 8px 0 0; color: var(--text-secondary, #aaa); font-size: 13px;">
                    是否要保存更改？
                </p>
            `;
            
            const buttons = `
                <button id="dialog-discard" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">不保存</button>
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-save" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent-color, #0078d4); color: #fff; cursor: pointer;">保存</button>
            `;
            
            const dialog = this._createDialogBase('未保存的更改', content, buttons);
            
            dialog.querySelector('#dialog-save').addEventListener('click', () => this._close('save'));
            dialog.querySelector('#dialog-discard').addEventListener('click', () => this._close('discard'));
            dialog.querySelector('#dialog-cancel').addEventListener('click', () => this._close('cancel'));
            
            this._show(dialog);
        });
    }

    /**
     * 显示删除确认对话框
     * @param {Array<{name: string}>} items - 要删除的项目列表
     * @returns {Promise<boolean>}
     */
    showDeleteConfirmDialog(items = []) {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const itemCount = items.length;
            const itemList = itemCount <= 5
                ? `<ul style="margin: 8px 0; padding-left: 20px;">${items.map(i => `<li>${i.name}</li>`).join('')}</ul>`
                : `<p style="margin: 8px 0; color: var(--text-secondary, #aaa);">共 ${itemCount} 个项目</p>`;
            
            const content = `
                <p style="margin: 0 0 8px; color: var(--text-primary, #fff);">
                    确定要删除以下项目吗？此操作无法撤销。
                </p>
                ${itemList}
            `;
            
            const buttons = `
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: #d32f2f; color: #fff; cursor: pointer;">删除</button>
            `;
            
            const dialog = this._createDialogBase('确认删除', content, buttons);
            
            dialog.querySelector('#dialog-confirm').addEventListener('click', () => this._close(true));
            dialog.querySelector('#dialog-cancel').addEventListener('click', () => this._close(false));
            
            this._show(dialog);
        });
    }

    /**
     * 显示冲突解决对话框
     * @param {{source: {name: string}, target: {name: string}}} conflict - 冲突信息
     * @returns {Promise<'rename'|'replace'|'skip'|'cancel'>}
     */
    showConflictResolutionDialog(conflict) {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const content = `
                <p style="margin: 0 0 16px; color: var(--text-primary, #fff);">
                    目标位置已存在名为 "<strong>${conflict.target?.name || conflict.source?.name}</strong>" 的文件。
                </p>
                <p style="margin: 0; color: var(--text-secondary, #aaa); font-size: 13px;">
                    请选择如何处理此冲突：
                </p>
            `;
            
            const buttons = `
                <button id="dialog-skip" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">跳过</button>
                <button id="dialog-rename" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">重命名</button>
                <button id="dialog-replace" style="padding: 8px 16px; border: none; border-radius: 4px; background: #d32f2f; color: #fff; cursor: pointer;">替换</button>
            `;
            
            const dialog = this._createDialogBase('文件冲突', content, buttons);
            
            dialog.querySelector('#dialog-rename').addEventListener('click', () => this._close('rename'));
            dialog.querySelector('#dialog-replace').addEventListener('click', () => this._close('replace'));
            dialog.querySelector('#dialog-skip').addEventListener('click', () => this._close('skip'));
            
            this._show(dialog);
        });
    }

    // ============ 输入对话框 ============

    /**
     * 显示重命名对话框
     * @param {string} currentName - 当前名称
     * @returns {Promise<string|null>}
     */
    showRenameDialog(currentName) {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            // 移除扩展名用于显示
            const displayName = currentName.replace(/\.scene\.json$/, '');
            
            const content = `
                <div>
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; color: var(--text-secondary, #aaa);">新名称</label>
                    <input type="text" id="dialog-new-name" value="${displayName}" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: var(--bg-secondary, #2d2d2d); color: var(--text-primary, #fff); font-size: 14px; box-sizing: border-box;">
                    <div id="dialog-name-error" style="color: #f44; font-size: 12px; margin-top: 4px; display: none;"></div>
                </div>
            `;
            
            const buttons = `
                <button id="dialog-cancel" style="padding: 8px 16px; border: 1px solid var(--border-color, #444); border-radius: 4px; background: transparent; color: var(--text-primary, #fff); cursor: pointer;">取消</button>
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: var(--accent-color, #0078d4); color: #fff; cursor: pointer;">重命名</button>
            `;
            
            const dialog = this._createDialogBase('重命名', content, buttons);
            
            const nameInput = dialog.querySelector('#dialog-new-name');
            const errorDiv = dialog.querySelector('#dialog-name-error');
            const confirmBtn = dialog.querySelector('#dialog-confirm');
            const cancelBtn = dialog.querySelector('#dialog-cancel');
            
            // 选中输入框内容
            setTimeout(() => nameInput.select(), 50);
            
            const validateName = () => {
                const name = nameInput.value.trim();
                if (!name) {
                    errorDiv.textContent = '名称不能为空';
                    errorDiv.style.display = 'block';
                    return false;
                }
                const validation = validateFileName(name);
                if (!validation.valid) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                    return false;
                }
                errorDiv.style.display = 'none';
                return true;
            };
            
            nameInput.addEventListener('input', validateName);
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && validateName()) {
                    confirmBtn.click();
                }
            });
            
            confirmBtn.addEventListener('click', () => {
                if (validateName()) {
                    this._close(nameInput.value.trim());
                }
            });
            
            cancelBtn.addEventListener('click', () => this._close(null));
            
            this._show(dialog);
        });
    }

    /**
     * 显示通用消息对话框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {'info'|'warning'|'error'} [type='info'] - 消息类型
     * @returns {Promise<void>}
     */
    showMessageDialog(title, message, type = 'info') {
        return new Promise((resolve) => {
            this._currentResolve = resolve;
            
            const iconColors = {
                info: '#0078d4',
                warning: '#f9a825',
                error: '#d32f2f'
            };
            
            const content = `
                <p style="margin: 0; color: var(--text-primary, #fff);">${message}</p>
            `;
            
            const buttons = `
                <button id="dialog-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background: ${iconColors[type]}; color: #fff; cursor: pointer;">确定</button>
            `;
            
            const dialog = this._createDialogBase(title, content, buttons);
            
            dialog.querySelector('#dialog-confirm').addEventListener('click', () => this._close());
            
            this._show(dialog);
        });
    }

    /**
     * 销毁对话框管理器
     */
    destroy() {
        if (this._overlay && this._overlay.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        this._overlay = null;
        this._currentDialog = null;
        this._currentResolve = null;
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.DialogManager = DialogManager;
}
