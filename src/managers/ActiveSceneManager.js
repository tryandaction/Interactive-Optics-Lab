/**
 * ActiveSceneManager.js - 活动场景管理器
 * 负责当前打开场景的状态管理、修改追踪、自动保存
 */

export class ActiveSceneManager {
    static AUTO_SAVE_INTERVAL = 60000; // 60秒自动保存间隔

    constructor(projectManager) {
        this.projectManager = projectManager;
        this.isModified = false;
        this.autoSaveTimer = null;
        this.autoSaveEnabled = true;
        this.lastSaveTime = null;
        this.listeners = new Map();
        
        this.bindKeyboardShortcuts();
    }

    // ============ 事件系统 ============

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            });
        }
    }

    // ============ 修改追踪 ============

    /**
     * 标记场景已修改
     */
    markAsModified() {
        if (!this.isModified) {
            this.isModified = true;
            this.projectManager.markSceneAsModified();
            this.emit('modifiedStateChanged', true);
            this.updateWindowTitle();
        }
    }

    /**
     * 标记场景已保存
     */
    markAsSaved() {
        this.isModified = false;
        this.lastSaveTime = new Date();
        this.emit('modifiedStateChanged', false);
        this.updateWindowTitle();
    }

    /**
     * 检查是否有未保存的修改
     */
    hasUnsavedChanges() {
        return this.isModified;
    }

    /**
     * 更新窗口标题显示修改状态
     */
    updateWindowTitle() {
        const scene = this.projectManager.getCurrentScene();
        const project = this.projectManager.getCurrentProject();
        
        if (scene && project) {
            const modifiedIndicator = this.isModified ? '• ' : '';
            document.title = `${modifiedIndicator}${scene.name} - ${project.name} - OpticsLab`;
        } else if (project) {
            document.title = `${project.name} - OpticsLab`;
        } else {
            document.title = 'OpticsLab';
        }
    }

    // ============ 自动保存 ============

    /**
     * 启动自动保存
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            this.stopAutoSave();
        }

        this.autoSaveEnabled = true;
        this.autoSaveTimer = setInterval(() => {
            this.performAutoSave();
        }, ActiveSceneManager.AUTO_SAVE_INTERVAL);

        console.log('Auto-save started');
    }

    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        this.autoSaveEnabled = false;
        console.log('Auto-save stopped');
    }

    /**
     * 执行自动保存
     */
    async performAutoSave() {
        if (!this.autoSaveEnabled || !this.isModified) {
            return;
        }

        const scene = this.projectManager.getCurrentScene();
        if (!scene) {
            return;
        }

        try {
            await this.saveCurrentScene();
            this.emit('autoSaved', { time: new Date() });
            console.log('Auto-save completed');
        } catch (e) {
            console.error('Auto-save failed:', e);
            this.emit('autoSaveFailed', { error: e });
        }
    }

    /**
     * 设置自动保存间隔
     */
    setAutoSaveInterval(intervalMs) {
        ActiveSceneManager.AUTO_SAVE_INTERVAL = intervalMs;
        if (this.autoSaveEnabled) {
            this.startAutoSave();
        }
    }

    // ============ 保存操作 ============

    /**
     * 保存当前场景
     * @param {Array} components - 画布组件
     * @param {Object} settings - 模拟设置
     */
    async saveCurrentScene(components = null, settings = null) {
        const scene = this.projectManager.getCurrentScene();
        if (!scene) {
            throw new Error('没有打开的场景');
        }

        // 如果没有传入参数，尝试从全局获取
        if (components === null) {
            components = this.getComponentsFromCanvas();
        }
        if (settings === null) {
            settings = this.getSettingsFromApp();
        }

        await this.projectManager.saveScene(components, settings);
        this.markAsSaved();
        
        this.emit('sceneSaved', { scene, time: new Date() });
        this.showNotification('场景已保存', 'success');
    }

    /**
     * 从画布获取组件（需要与主应用集成）
     */
    getComponentsFromCanvas() {
        // 尝试从全局获取
        if (typeof window !== 'undefined') {
            if (window.gameObjects) {
                return window.gameObjects;
            }
            if (window.app && window.app.gameObjects) {
                return window.app.gameObjects;
            }
        }
        return [];
    }

    /**
     * 从应用获取设置
     */
    getSettingsFromApp() {
        if (typeof window !== 'undefined') {
            return {
                mode: window.currentMode || 'ray_trace',
                maxRays: window.maxRaysPerSource || 100,
                maxBounces: window.globalMaxBounces || 50,
                minIntensity: window.globalMinIntensity || 0.001,
                showGrid: window.showGrid !== false,
                showArrows: window.globalShowArrows || false,
                arrowSpeed: window.arrowAnimationSpeed || 100,
                fastWhiteLightMode: window.fastWhiteLightMode || false
            };
        }
        return {};
    }

    // ============ 键盘快捷键 ============

    /**
     * 绑定键盘快捷键
     */
    bindKeyboardShortcuts() {
        if (typeof document === 'undefined') return;

        document.addEventListener('keydown', (e) => {
            // Ctrl+S: 保存当前场景
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.handleSaveShortcut();
            }

            // Ctrl+N: 新建场景
            if (e.ctrlKey && !e.shiftKey && e.key === 'n') {
                e.preventDefault();
                this.handleNewSceneShortcut();
            }

            // Ctrl+Shift+N: 新建项目
            if (e.ctrlKey && e.shiftKey && e.key === 'N') {
                e.preventDefault();
                this.handleNewProjectShortcut();
            }
        });
    }

    /**
     * 处理保存快捷键
     */
    async handleSaveShortcut() {
        try {
            await this.saveCurrentScene();
        } catch (e) {
            console.error('Save failed:', e);
            this.showNotification(`保存失败: ${e.message}`, 'error');
        }
    }

    /**
     * 处理新建场景快捷键
     */
    handleNewSceneShortcut() {
        this.emit('newSceneRequested');
    }

    /**
     * 处理新建项目快捷键
     */
    handleNewProjectShortcut() {
        this.emit('newProjectRequested');
    }

    // ============ 离开页面警告 ============

    /**
     * 启用离开页面警告
     */
    enableBeforeUnloadWarning() {
        if (typeof window === 'undefined') return;

        window.addEventListener('beforeunload', (e) => {
            if (this.isModified) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return e.returnValue;
            }
        });
    }

    // ============ 通知 ============

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 尝试使用全局通知函数
        if (typeof window !== 'undefined' && window.showTemporaryMessage) {
            window.showTemporaryMessage(message, type);
            return;
        }

        // 回退：使用 console
        const logFn = type === 'error' ? console.error : console.log;
        logFn(`[${type.toUpperCase()}] ${message}`);
    }

    // ============ 生命周期 ============

    /**
     * 初始化
     */
    init() {
        this.enableBeforeUnloadWarning();
        this.startAutoSave();
        
        // 监听项目管理器事件
        this.projectManager.on('sceneLoaded', () => {
            this.isModified = false;
            this.updateWindowTitle();
        });

        this.projectManager.on('projectClosed', () => {
            this.stopAutoSave();
            this.isModified = false;
            this.updateWindowTitle();
        });
    }

    /**
     * 销毁
     */
    destroy() {
        this.stopAutoSave();
        this.listeners.clear();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ActiveSceneManager = ActiveSceneManager;
}
