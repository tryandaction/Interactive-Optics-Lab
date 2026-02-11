/**
 * ProjectSystemIntegration.js - 项目系统集成模块
 * 将所有管理器连接在一起，提供统一的接口
 */

import { EventEmitter } from './EventEmitter.js';
import { ProjectManager } from './ProjectManager.js';
import { TemporarySceneManager } from './TemporarySceneManager.js';
import { FileOperationManager } from './FileOperationManager.js';
import { SelectionManager } from './SelectionManager.js';
import { ClipboardManager } from './ClipboardManager.js';
import { DialogManager } from './DialogManager.js';
import { ContextMenuManager } from './ContextMenuManager.js';
import { AutoRecoveryManager } from './AutoRecoveryManager.js';
import { Serializer } from './Serializer.js';

/**
 * 项目系统集成类
 * 统一管理所有项目相关的管理器，处理它们之间的交互
 */
export class ProjectSystemIntegration extends EventEmitter {
    constructor() {
        super();
        
        // 初始化所有管理器
        this.projectManager = new ProjectManager();
        this.temporarySceneManager = new TemporarySceneManager();
        this.fileOperationManager = new FileOperationManager();
        this.selectionManager = new SelectionManager();
        this.clipboardManager = new ClipboardManager();
        this.dialogManager = new DialogManager();
        this.contextMenuManager = new ContextMenuManager();
        this.autoRecoveryManager = new AutoRecoveryManager();
        this._getSceneDataCallback = null;
        
        // 连接管理器
        this._wireManagers();
        
        // 注册上下文菜单动作
        this._registerContextMenuActions();
    }

    /**
     * 连接管理器之间的依赖
     * @private
     */
    _wireManagers() {
        // ClipboardManager 需要 FileOperationManager
        this.clipboardManager.setFileOperationManager(this.fileOperationManager);
        
        // ContextMenuManager 需要 ClipboardManager
        this.contextMenuManager.setClipboardManager(this.clipboardManager);
        
        // FileOperationManager 的冲突解决器使用 DialogManager
        this.fileOperationManager.setConflictResolver(async (conflict) => {
            return await this.dialogManager.showConflictResolutionDialog(conflict);
        });
        
        // 监听项目管理器事件
        this.projectManager.on('projectChanged', (project) => {
            this.emit('projectChanged', project);
            
            // 清除选择
            this.selectionManager.clearSelection();
            
            // 更新自动恢复管理器
            if (project) {
                this.autoRecoveryManager.startAutoSave();
            } else {
                this.autoRecoveryManager.stopAutoSave();
            }
        });
        
        this.projectManager.on('sceneLoaded', (scene) => {
            this.emit('sceneLoaded', scene);
            
            // 更新自动恢复管理器的当前场景
            if (scene) {
                this.autoRecoveryManager.setCurrentScene(
                    scene.id,
                    scene.name,
                    this.projectManager.currentProject?.id
                );
            }
        });
        
        this.projectManager.on('unsavedChangesDetected', async (data) => {
            const choice = await this.dialogManager.showUnsavedChangesDialog(data.scenes);
            if (data.callback) {
                data.callback(choice);
            }
        });
        
        // 监听临时场景管理器事件
        this.temporarySceneManager.on('saveRequested', async (scene) => {
            const result = await this.dialogManager.showSaveTemporarySceneDialog(scene.name);
            if (result) {
                await this.saveTemporaryScene(scene.id, result.fileName);
            }
        });
        
        // 监听文件操作事件
        this.fileOperationManager.on('fileMoved', (data) => {
            this.emit('fileMoved', data);
        });
        
        this.fileOperationManager.on('fileCopied', (data) => {
            this.emit('fileCopied', data);
        });
        
        this.fileOperationManager.on('fileDeleted', (data) => {
            this.emit('fileDeleted', data);
        });
        
        this.fileOperationManager.on('fileRenamed', (data) => {
            this.emit('fileRenamed', data);
        });
        
        // 监听选择变化
        this.selectionManager.on('selectionChanged', (data) => {
            this.emit('selectionChanged', data);
        });
        
        // 监听剪贴板事件
        this.clipboardManager.on('copied', (data) => {
            this.emit('clipboardCopied', data);
        });
        
        this.clipboardManager.on('cut', (data) => {
            this.emit('clipboardCut', data);
        });
        
        this.clipboardManager.on('pasted', (data) => {
            this.emit('clipboardPasted', data);
        });
        
        // 监听自动恢复事件
        this.autoRecoveryManager.on('autoSaved', (data) => {
            this.emit('autoSaved', data);
        });
        
        this.autoRecoveryManager.on('autoSaveError', (data) => {
            this.emit('autoSaveError', data);
        });
    }

    /**
     * 注册上下文菜单动作
     * @private
     */
    _registerContextMenuActions() {
        this.contextMenuManager.registerActions({
            // 项目操作
            newProject: () => this.showCreateProjectDialog(),
            openProject: () => this.openProject(),
            
            // 场景操作
            newScene: () => this.showCreateSceneDialog(),
            open: (ctx) => this.openScene(ctx.target?.id),
            
            // 文件操作
            copy: (ctx) => this.copySelected(),
            cut: (ctx) => this.cutSelected(),
            paste: (ctx) => this.paste(ctx.target?.directoryHandle),
            duplicate: (ctx) => this.duplicateSelected(),
            rename: (ctx) => this.showRenameDialog(ctx.target),
            delete: (ctx) => this.deleteSelected(),
            
            // 其他
            refresh: () => this.refresh(),
            export: (ctx) => this.exportScene(ctx.target?.id),
            import: () => this.importScene()
        });
    }

    // ============ 初始化 ============

    /**
     * 初始化系统
     * @param {Object} options - 初始化选项
     */
    async init(options = {}) {
        const { getSceneDataCallback } = options;
        
        // 设置自动恢复回调
        if (getSceneDataCallback) {
            this.autoRecoveryManager.setSceneDataCallback(getSceneDataCallback);
            this._getSceneDataCallback = getSceneDataCallback;
        }
        
        // 检查是否需要恢复
        if (this.autoRecoveryManager.shouldPromptRecovery()) {
            const summary = this.autoRecoveryManager.getRecoverySummary();
            if (summary) {
                this.emit('recoveryAvailable', summary);
            }
        }
        
        this.emit('initialized');
    }

    // ============ 项目操作 ============

    /**
     * 显示创建项目对话框
     */
    async showCreateProjectDialog() {
        const result = await this.dialogManager.showCreateProjectDialog();
        if (result) {
            try {
                const project = await this.projectManager.createProject(result);
                this.emit('projectCreated', project);
                return project;
            } catch (e) {
                await this.dialogManager.showMessageDialog('错误', e.message, 'error');
                throw e;
            }
        }
        return null;
    }

    /**
     * 打开项目
     */
    async openProject() {
        try {
            const project = await this.projectManager.openProject();
            if (project) {
                this.emit('projectOpened', project);
            }
            return project;
        } catch (e) {
            if (!e.message?.includes('取消')) {
                await this.dialogManager.showMessageDialog('错误', e.message, 'error');
            }
            throw e;
        }
    }

    /**
     * 关闭项目
     */
    async closeProject(options = {}) {
        return await this.projectManager.closeProject(options);
    }

    // ============ 场景操作 ============

    /**
     * 显示创建场景对话框
     */
    async showCreateSceneDialog() {
        if (!this.projectManager.currentProject) {
            // 没有项目，创建临时场景
            const scene = this.temporarySceneManager.createTemporaryScene();
            this.emit('temporarySceneCreated', scene);
            return scene;
        }
        
        const result = await this.dialogManager.showCreateSceneDialog();
        if (result) {
            try {
                const scene = await this.projectManager.createScene(result.name);
                this.emit('sceneCreated', scene);
                return scene;
            } catch (e) {
                await this.dialogManager.showMessageDialog('错误', e.message, 'error');
                throw e;
            }
        }
        return null;
    }

    /**
     * 打开场景
     */
    async openScene(sceneId) {
        if (!sceneId) return null;
        
        try {
            const scene = await this.projectManager.loadScene(sceneId);
            return scene;
        } catch (e) {
            await this.dialogManager.showMessageDialog('错误', e.message, 'error');
            throw e;
        }
    }

    /**
     * 保存临时场景
     */
    async saveTemporaryScene(sceneId, fileName) {
        const dirHandle = this.projectManager.directoryHandle || 
                          this.projectManager.getDefaultDirectory();
        
        if (!dirHandle) {
            await this.dialogManager.showMessageDialog(
                '错误', 
                '请先打开或创建一个项目', 
                'error'
            );
            return null;
        }
        
        try {
            const scene = await this.temporarySceneManager.saveTemporaryScene(sceneId, {
                directory: dirHandle,
                fileName
            });
            this.emit('temporarySceneSaved', scene);
            return scene;
        } catch (e) {
            await this.dialogManager.showMessageDialog('错误', e.message, 'error');
            throw e;
        }
    }

    // ============ 文件操作 ============

    /**
     * 复制选中的文件
     */
    copySelected() {
        const items = this.selectionManager.getSelectedItems();
        if (items.length > 0) {
            this.clipboardManager.copy(items);
        }
    }

    /**
     * 剪切选中的文件
     */
    cutSelected() {
        const items = this.selectionManager.getSelectedItems();
        if (items.length > 0) {
            this.clipboardManager.cut(items);
        }
    }

    /**
     * 粘贴到目标目录
     */
    async paste(targetDir) {
        const dir = targetDir || this.projectManager.directoryHandle;
        if (!dir) return null;
        
        try {
            const result = await this.clipboardManager.paste(dir);
            await this.refresh();
            return result;
        } catch (e) {
            await this.dialogManager.showMessageDialog('错误', e.message, 'error');
            throw e;
        }
    }

    /**
     * 复制选中文件的副本
     */
    async duplicateSelected() {
        const items = this.selectionManager.getSelectedItems();
        
        for (const item of items) {
            try {
                await this.fileOperationManager.duplicateFile(item);
            } catch (e) {
                console.error('Duplicate failed:', e);
            }
        }
        
        await this.refresh();
    }

    /**
     * 删除选中的文件
     */
    async deleteSelected() {
        const items = this.selectionManager.getSelectedItems();
        if (items.length === 0) return;
        
        const confirmed = await this.dialogManager.showDeleteConfirmDialog(items);
        if (!confirmed) return;
        
        try {
            const result = await this.fileOperationManager.batchDelete(items);
            this.selectionManager.clearSelection();
            await this.refresh();
            
            if (result.failed.length > 0) {
                await this.dialogManager.showMessageDialog(
                    '部分删除失败',
                    `成功删除 ${result.successful.length} 个，失败 ${result.failed.length} 个`,
                    'warning'
                );
            }
            
            return result;
        } catch (e) {
            await this.dialogManager.showMessageDialog('错误', e.message, 'error');
            throw e;
        }
    }

    /**
     * 显示重命名对话框
     */
    async showRenameDialog(target) {
        if (!target) return null;
        
        const newName = await this.dialogManager.showRenameDialog(target.name);
        if (newName && newName !== target.name.replace(/\.scene\.json$/, '')) {
            try {
                const result = await this.fileOperationManager.renameFile(target, newName);
                await this.refresh();
                return result;
            } catch (e) {
                await this.dialogManager.showMessageDialog('错误', e.message, 'error');
                throw e;
            }
        }
        return null;
    }

    // ============ 导入导出 ============

    /**
     * 导出场景
     */
    async exportScene(sceneId) {
        try {
            const { scene, data } = await this._resolveSceneData(sceneId);
            if (!data) {
                await this.dialogManager.showMessageDialog('错误', '无法获取场景数据', 'error');
                return;
            }

            const name = scene?.name || data.name || `场景_${new Date().toISOString().slice(0, 10)}`;
            const fileName = name.endsWith('.scene.json') ? name : `${name}.scene.json`;
            const jsonString = JSON.stringify(data, null, 2);

            if ('showSaveFilePicker' in window) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: '光学场景文件',
                        accept: { 'application/json': ['.scene.json', '.json'] }
                    }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                await this.dialogManager.showMessageDialog('完成', `已导出为 ${fileHandle.name}`, 'info');
                return;
            }

            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
            await this.dialogManager.showMessageDialog('完成', '场景已导出', 'info');
        } catch (e) {
            if (e?.name === 'AbortError') {
                return;
            }
            await this.dialogManager.showMessageDialog('错误', e.message || '导出失败', 'error');
            throw e;
        }
    }

    /**
     * 导入场景
     */
    async importScene() {
        if (!this.projectManager.currentProject) {
            await this.dialogManager.showMessageDialog('提示', '请先打开或创建一个项目', 'warning');
            return;
        }

        const canProceed = await this._handleUnsavedChangesIfNeeded();
        if (!canProceed) return;

        try {
            const file = await this._promptSceneFile();
            if (!file) return;

            const text = await file.text();
            let rawData;
            try {
                rawData = JSON.parse(text);
            } catch (err) {
                await this.dialogManager.showMessageDialog('错误', '文件格式无效（非JSON）', 'error');
                return;
            }

            let sceneData;
            try {
                sceneData = Serializer.deserialize(rawData);
            } catch (err) {
                await this.dialogManager.showMessageDialog('错误', `场景数据不合法: ${err.message}`, 'error');
                return;
            }

            const baseName = sceneData?.name || file.name.replace(/\.scene\.json$/i, '').replace(/\.json$/i, '');
            await this.projectManager.createSceneFromData(baseName || '导入场景', sceneData, { open: true });
            await this.dialogManager.showMessageDialog('完成', '场景已导入', 'info');
        } catch (e) {
            await this.dialogManager.showMessageDialog('错误', e.message || '导入失败', 'error');
            throw e;
        }
    }

    async _resolveSceneData(sceneId) {
        const currentScene = this.projectManager.getCurrentScene?.() || this.projectManager.currentScene;
        const targetId = sceneId || currentScene?.id;

        if (!targetId) {
            return { scene: null, data: null };
        }

        if (currentScene?.id === targetId && this._getSceneDataCallback) {
            const liveData = await this._getSceneDataCallback();
            return { scene: currentScene, data: liveData };
        }

        if (currentScene?.id === targetId && currentScene?.data) {
            return { scene: currentScene, data: currentScene.data };
        }

        const result = await this.projectManager.getSceneData(targetId);
        return result || { scene: null, data: null };
    }

    async _handleUnsavedChangesIfNeeded() {
        const currentScene = this.projectManager.getCurrentScene?.() || this.projectManager.currentScene;
        if (!currentScene?.isModified) {
            return true;
        }

        const choice = await this.dialogManager.showUnsavedChangesDialog([{ name: currentScene.name }]);
        if (choice === 'cancel') return false;

        if (choice === 'save') {
            const saveData = await this._resolveSceneData(currentScene.id);
            if (!saveData?.data) {
                await this.dialogManager.showMessageDialog('错误', '无法保存当前场景数据', 'error');
                return false;
            }
            await this.projectManager.saveScene(saveData.data.components || [], saveData.data.settings || {});
        }

        return true;
    }

    _promptSceneFile() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.scene.json,.json';
            input.style.display = 'none';
            input.addEventListener('change', () => {
                const file = input.files && input.files.length > 0 ? input.files[0] : null;
                input.remove();
                resolve(file);
            });
            document.body.appendChild(input);
            input.click();
        });
    }

    // ============ 恢复 ============

    /**
     * 恢复场景
     */
    async recoverScene() {
        const recovered = await this.autoRecoveryManager.recoverScene();
        if (recovered) {
            this.emit('sceneRecovered', recovered);
        }
        return recovered;
    }

    /**
     * 忽略恢复数据
     */
    dismissRecovery() {
        this.autoRecoveryManager.clearRecoveryData();
        this.emit('recoveryDismissed');
    }

    // ============ 刷新 ============

    /**
     * 刷新项目树
     */
    async refresh() {
        if (this.projectManager.currentProject) {
            await this.projectManager.scanScenes();
        }
        this.emit('refreshed');
    }

    // ============ 键盘快捷键 ============

    /**
     * 处理键盘事件
     */
    handleKeyDown(event) {
        const { key, ctrlKey, metaKey, shiftKey } = event;
        const isModKey = ctrlKey || metaKey;
        
        // Ctrl+C: 复制
        if (isModKey && key === 'c') {
            this.copySelected();
            event.preventDefault();
            return;
        }
        
        // Ctrl+X: 剪切
        if (isModKey && key === 'x') {
            this.cutSelected();
            event.preventDefault();
            return;
        }
        
        // Ctrl+V: 粘贴
        if (isModKey && key === 'v') {
            this.paste();
            event.preventDefault();
            return;
        }
        
        // Ctrl+D: 复制副本
        if (isModKey && key === 'd') {
            this.duplicateSelected();
            event.preventDefault();
            return;
        }
        
        // Ctrl+A: 全选
        if (isModKey && key === 'a') {
            this.selectionManager.selectAll();
            event.preventDefault();
            return;
        }
        
        // Delete: 删除
        if (key === 'Delete') {
            this.deleteSelected();
            event.preventDefault();
            return;
        }
        
        // F2: 重命名
        if (key === 'F2') {
            const lastSelected = this.selectionManager.getLastSelectedItem();
            if (lastSelected) {
                this.showRenameDialog(lastSelected);
            }
            event.preventDefault();
            return;
        }
        
        // 方向键导航
        if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
            const direction = {
                'ArrowUp': 'up',
                'ArrowDown': 'down',
                'Home': 'home',
                'End': 'end'
            }[key];
            
            this.selectionManager.moveSelection(direction, { shiftKey });
            event.preventDefault();
            return;
        }
    }

    // ============ 清理 ============

    /**
     * 销毁系统
     */
    destroy() {
        this.autoRecoveryManager.destroy();
        this.contextMenuManager.destroy();
        this.dialogManager.destroy();
        this.clipboardManager.destroy();
        this.selectionManager.destroy();
        this.fileOperationManager.destroy();
        this.temporarySceneManager.destroy();
        // ProjectManager 没有 destroy 方法
        
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ProjectSystemIntegration = ProjectSystemIntegration;
}
