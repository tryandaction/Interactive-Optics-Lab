/**
 * AutoRecoveryManager.js - 自动恢复管理器
 * 处理场景的自动保存和崩溃恢复
 */

import { EventEmitter } from './EventEmitter.js';
import { generateId } from './types.js';

/**
 * @typedef {import('./types.js').RecoveryData} RecoveryData
 * @typedef {import('./types.js').SceneData} SceneData
 */

/**
 * 自动恢复管理器
 * 提供自动保存和崩溃恢复功能
 */
export class AutoRecoveryManager extends EventEmitter {
    static RECOVERY_KEY = 'opticslab_recovery';
    static SETTINGS_KEY = 'opticslab_autosave_settings';
    static DEFAULT_INTERVAL = 60000; // 1分钟

    constructor() {
        super();
        
        /** @type {number} 自动保存间隔（毫秒） */
        this._interval = AutoRecoveryManager.DEFAULT_INTERVAL;
        
        /** @type {boolean} 是否启用自动保存 */
        this._enabled = true;
        
        /** @type {number|null} 定时器 ID */
        this._timerId = null;
        
        /** @type {Function|null} 获取当前场景数据的回调 */
        this._getSceneDataCallback = null;
        
        /** @type {string|null} 当前场景 ID */
        this._currentSceneId = null;
        
        /** @type {string|null} 当前场景名称 */
        this._currentSceneName = null;
        
        /** @type {string|null} 当前项目 ID */
        this._currentProjectId = null;
        
        this._loadSettings();
    }

    /**
     * 加载设置
     * @private
     */
    _loadSettings() {
        try {
            const data = localStorage.getItem(AutoRecoveryManager.SETTINGS_KEY);
            if (data) {
                const settings = JSON.parse(data);
                this._enabled = settings.enabled !== false;
                this._interval = settings.interval || AutoRecoveryManager.DEFAULT_INTERVAL;
            }
        } catch (e) {
            console.warn('Failed to load auto-save settings:', e);
        }
    }

    /**
     * 保存设置
     * @private
     */
    _saveSettings() {
        try {
            const settings = {
                enabled: this._enabled,
                interval: this._interval
            };
            localStorage.setItem(AutoRecoveryManager.SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to save auto-save settings:', e);
        }
    }

    /**
     * 设置获取场景数据的回调
     * @param {Function} callback - 返回当前场景数据的函数
     */
    setSceneDataCallback(callback) {
        this._getSceneDataCallback = callback;
    }

    /**
     * 设置当前场景信息
     * @param {string} sceneId - 场景 ID
     * @param {string} sceneName - 场景名称
     * @param {string} [projectId] - 项目 ID
     */
    setCurrentScene(sceneId, sceneName, projectId = null) {
        this._currentSceneId = sceneId;
        this._currentSceneName = sceneName;
        this._currentProjectId = projectId;
    }

    /**
     * 清除当前场景信息
     */
    clearCurrentScene() {
        this._currentSceneId = null;
        this._currentSceneName = null;
        this._currentProjectId = null;
    }

    /**
     * 启用自动保存
     */
    enable() {
        this._enabled = true;
        this._saveSettings();
        this.startAutoSave();
        this.emit('enabled');
    }

    /**
     * 禁用自动保存
     */
    disable() {
        this._enabled = false;
        this._saveSettings();
        this.stopAutoSave();
        this.emit('disabled');
    }

    /**
     * 检查是否启用
     * @returns {boolean}
     */
    isEnabled() {
        return this._enabled;
    }

    /**
     * 设置自动保存间隔
     * @param {number} interval - 间隔（毫秒）
     */
    setInterval(interval) {
        this._interval = Math.max(10000, interval); // 最小10秒
        this._saveSettings();
        
        // 如果正在运行，重启定时器
        if (this._timerId !== null) {
            this.stopAutoSave();
            this.startAutoSave();
        }
        
        this.emit('intervalChanged', this._interval);
    }

    /**
     * 获取自动保存间隔
     * @returns {number}
     */
    getInterval() {
        return this._interval;
    }

    /**
     * 启动自动保存
     */
    startAutoSave() {
        if (!this._enabled) return;
        
        this.stopAutoSave();
        
        this._timerId = setInterval(() => {
            this._performAutoSave();
        }, this._interval);
        
        this.emit('autoSaveStarted');
    }

    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this._timerId !== null) {
            clearInterval(this._timerId);
            this._timerId = null;
            this.emit('autoSaveStopped');
        }
    }

    /**
     * 执行自动保存
     * @private
     */
    async _performAutoSave() {
        if (!this._getSceneDataCallback || !this._currentSceneId) {
            return;
        }
        
        try {
            const sceneData = await this._getSceneDataCallback();
            
            if (sceneData) {
                await this.saveRecoveryPoint(sceneData);
                this.emit('autoSaved', {
                    sceneId: this._currentSceneId,
                    sceneName: this._currentSceneName,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error('Auto-save failed:', e);
            this.emit('autoSaveError', { error: e });
        }
    }

    /**
     * 手动保存恢复点
     * @param {SceneData} sceneData - 场景数据
     */
    async saveRecoveryPoint(sceneData) {
        if (!this._currentSceneId) {
            return;
        }
        
        /** @type {RecoveryData} */
        const recoveryData = {
            sceneId: this._currentSceneId,
            sceneName: this._currentSceneName || '未命名场景',
            data: sceneData,
            savedAt: new Date().toISOString(),
            projectId: this._currentProjectId
        };
        
        try {
            localStorage.setItem(
                AutoRecoveryManager.RECOVERY_KEY,
                JSON.stringify(recoveryData)
            );
            
            this.emit('recoveryPointSaved', recoveryData);
        } catch (e) {
            // 可能是存储配额超限
            if (e.name === 'QuotaExceededError') {
                this.emit('storageQuotaExceeded');
            }
            throw e;
        }
    }

    /**
     * 检查是否有恢复数据
     * @returns {boolean}
     */
    hasRecoveryData() {
        try {
            const data = localStorage.getItem(AutoRecoveryManager.RECOVERY_KEY);
            return data !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * 获取恢复数据
     * @returns {RecoveryData|null}
     */
    getRecoveryData() {
        try {
            const data = localStorage.getItem(AutoRecoveryManager.RECOVERY_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to read recovery data:', e);
        }
        return null;
    }

    /**
     * 恢复场景
     * @returns {Promise<{sceneData: SceneData, metadata: {sceneName: string, savedAt: string}}|null>}
     */
    async recoverScene() {
        const recoveryData = this.getRecoveryData();
        
        if (!recoveryData) {
            return null;
        }
        
        this.emit('sceneRecovered', recoveryData);
        
        return {
            sceneData: recoveryData.data,
            metadata: {
                sceneId: recoveryData.sceneId,
                sceneName: recoveryData.sceneName,
                savedAt: recoveryData.savedAt,
                projectId: recoveryData.projectId
            }
        };
    }

    /**
     * 清除恢复数据
     */
    clearRecoveryData() {
        try {
            localStorage.removeItem(AutoRecoveryManager.RECOVERY_KEY);
            this.emit('recoveryDataCleared');
        } catch (e) {
            console.error('Failed to clear recovery data:', e);
        }
    }

    /**
     * 获取恢复数据的摘要信息
     * @returns {{sceneName: string, savedAt: string, age: string}|null}
     */
    getRecoverySummary() {
        const data = this.getRecoveryData();
        
        if (!data) {
            return null;
        }
        
        const savedAt = new Date(data.savedAt);
        const now = new Date();
        const ageMs = now.getTime() - savedAt.getTime();
        
        let age;
        if (ageMs < 60000) {
            age = '刚刚';
        } else if (ageMs < 3600000) {
            age = `${Math.floor(ageMs / 60000)} 分钟前`;
        } else if (ageMs < 86400000) {
            age = `${Math.floor(ageMs / 3600000)} 小时前`;
        } else {
            age = `${Math.floor(ageMs / 86400000)} 天前`;
        }
        
        return {
            sceneName: data.sceneName,
            savedAt: data.savedAt,
            age
        };
    }

    /**
     * 检查启动时是否需要恢复
     * @returns {boolean}
     */
    shouldPromptRecovery() {
        if (!this.hasRecoveryData()) {
            return false;
        }
        
        const data = this.getRecoveryData();
        if (!data) {
            return false;
        }
        
        // 检查恢复数据是否过期（超过7天）
        const savedAt = new Date(data.savedAt);
        const now = new Date();
        const ageMs = now.getTime() - savedAt.getTime();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
        
        if (ageMs > maxAge) {
            // 数据过期，清除
            this.clearRecoveryData();
            return false;
        }
        
        return true;
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stopAutoSave();
        this._getSceneDataCallback = null;
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.AutoRecoveryManager = AutoRecoveryManager;
}
