/**
 * TemporarySceneManager.js - 临时场景管理器
 * 管理未保存到文件的临时场景的创建、追踪和保存
 */

import { EventEmitter } from './EventEmitter.js';
import { generateId, getCurrentTimestamp } from './types.js';
import { Serializer } from './Serializer.js';

/**
 * @typedef {import('./types.js').TemporaryScene} TemporaryScene
 * @typedef {import('./types.js').TempSceneOptions} TempSceneOptions
 * @typedef {import('./types.js').SaveTarget} SaveTarget
 * @typedef {import('./types.js').CloseResult} CloseResult
 * @typedef {import('./types.js').SceneData} SceneData
 */

/**
 * 临时场景管理器
 * 负责管理未关联到文件的临时场景
 */
export class TemporarySceneManager extends EventEmitter {
    /**
     * @param {Object} [options] - 配置选项
     * @param {Function} [options.getDefaultDirectory] - 获取默认目录的函数
     */
    constructor(options = {}) {
        super();
        
        /** @type {Map<string, TemporaryScene>} */
        this.temporaryScenes = new Map();
        
        /** @type {TemporaryScene|null} */
        this.activeTemporaryScene = null;
        
        /** @type {Function|null} */
        this._getDefaultDirectory = options.getDefaultDirectory || null;
        
        /** @type {string|null} */
        this._defaultProjectDirectory = null;
    }

    // ============ 创建 ============

    /**
     * 创建临时场景
     * @param {TempSceneOptions} [options] - 创建选项
     * @returns {TemporaryScene} 创建的临时场景
     */
    createTemporaryScene(options = {}) {
        const id = generateId('temp_scene');
        const now = new Date();
        const name = options.name || `未命名场景_${id.substring(0, 8)}`;
        
        /** @type {TemporaryScene} */
        const scene = {
            id,
            name,
            data: options.initialData || Serializer.createEmptyScene(name),
            isModified: false,
            createdAt: now,
            modifiedAt: now
        };
        
        this.temporaryScenes.set(id, scene);
        this.activeTemporaryScene = scene;
        
        this.emit('temporarySceneCreated', scene);
        
        return scene;
    }

    /**
     * 创建默认临时场景（应用启动时使用）
     * @returns {TemporaryScene} 创建的临时场景
     */
    createDefaultTemporaryScene() {
        return this.createTemporaryScene({
            name: '未命名场景'
        });
    }

    // ============ 修改追踪 ============

    /**
     * 标记临时场景已修改
     * @param {string} sceneId - 场景 ID
     */
    markAsModified(sceneId) {
        const scene = this.temporaryScenes.get(sceneId);
        if (scene && !scene.isModified) {
            scene.isModified = true;
            scene.modifiedAt = new Date();
            this.emit('temporarySceneModified', scene);
        }
    }

    /**
     * 更新临时场景数据
     * @param {string} sceneId - 场景 ID
     * @param {SceneData} data - 新的场景数据
     */
    updateSceneData(sceneId, data) {
        const scene = this.temporaryScenes.get(sceneId);
        if (scene) {
            scene.data = data;
            scene.isModified = true;
            scene.modifiedAt = new Date();
            this.emit('temporarySceneUpdated', scene);
        }
    }

    /**
     * 更新临时场景名称
     * @param {string} sceneId - 场景 ID
     * @param {string} newName - 新名称
     */
    renameTemporaryScene(sceneId, newName) {
        const scene = this.temporaryScenes.get(sceneId);
        if (scene) {
            scene.name = newName;
            if (scene.data && scene.data.metadata) {
                scene.data.metadata.name = newName;
            }
            scene.modifiedAt = new Date();
            this.emit('temporarySceneRenamed', { scene, newName });
        }
    }

    // ============ 查询 ============

    /**
     * 检查场景是否为临时场景
     * @param {string} sceneId - 场景 ID
     * @returns {boolean} 是否为临时场景
     */
    isTemporary(sceneId) {
        return this.temporaryScenes.has(sceneId);
    }

    /**
     * 获取临时场景
     * @param {string} sceneId - 场景 ID
     * @returns {TemporaryScene|undefined} 临时场景
     */
    getTemporaryScene(sceneId) {
        return this.temporaryScenes.get(sceneId);
    }

    /**
     * 获取所有临时场景
     * @returns {TemporaryScene[]} 临时场景数组
     */
    getAllTemporaryScenes() {
        return Array.from(this.temporaryScenes.values());
    }

    /**
     * 检查是否有未保存的临时场景
     * @returns {boolean} 是否有未保存的临时场景
     */
    hasUnsavedTemporaryScenes() {
        for (const scene of this.temporaryScenes.values()) {
            if (scene.isModified) {
                return true;
            }
        }
        return false;
    }

    /**
     * 获取所有未保存的临时场景
     * @returns {TemporaryScene[]} 未保存的临时场景数组
     */
    getUnsavedTemporaryScenes() {
        return Array.from(this.temporaryScenes.values()).filter(s => s.isModified);
    }

    /**
     * 获取临时场景数量
     * @returns {number} 临时场景数量
     */
    getTemporarySceneCount() {
        return this.temporaryScenes.size;
    }

    // ============ 保存 ============

    /**
     * 设置默认项目目录
     * @param {string} directory - 目录路径
     */
    setDefaultProjectDirectory(directory) {
        this._defaultProjectDirectory = directory;
    }

    /**
     * 获取默认保存目录
     * @returns {string|null} 默认目录
     */
    getDefaultSaveDirectory() {
        if (this._getDefaultDirectory) {
            return this._getDefaultDirectory();
        }
        return this._defaultProjectDirectory;
    }

    /**
     * 保存临时场景到文件
     * @param {string} sceneId - 场景 ID
     * @param {SaveTarget} target - 保存目标
     * @param {Object} projectManager - 项目管理器实例
     * @returns {Promise<Object>} 保存后的场景
     */
    async saveTemporaryScene(sceneId, target, projectManager) {
        const tempScene = this.temporaryScenes.get(sceneId);
        if (!tempScene) {
            throw new Error('临时场景不存在');
        }

        // 更新场景名称为文件名
        const sceneName = target.fileName.replace(/\.scene\.json$/, '');
        tempScene.data.metadata.name = sceneName;
        tempScene.data.metadata.updatedAt = getCurrentTimestamp();

        // 通过项目管理器保存
        let savedScene;
        
        if (target.projectId && projectManager) {
            // 保存到现有项目
            savedScene = await projectManager.createSceneFromData(
                sceneName,
                tempScene.data
            );
        } else if (target.directory) {
            // 保存到指定目录
            const json = Serializer.serialize(
                tempScene.data.components,
                tempScene.data.settings,
                tempScene.data.metadata
            );
            
            const fileName = target.fileName.endsWith('.scene.json') 
                ? target.fileName 
                : `${target.fileName}.scene.json`;
            
            // 使用 FileSystemAdapter 保存
            const { FileSystemAdapter } = await import('./FileSystemAdapter.js');
            await FileSystemAdapter.createFile(target.directory, fileName, json);
            
            savedScene = {
                id: generateId('scene'),
                name: sceneName,
                fileName: fileName,
                isTemporary: false,
                isModified: false,
                data: tempScene.data,
                createdAt: tempScene.createdAt.toISOString(),
                updatedAt: getCurrentTimestamp()
            };
        } else {
            throw new Error('必须指定保存目标（项目或目录）');
        }

        // 从临时场景列表中移除
        this.temporaryScenes.delete(sceneId);
        
        // 如果是当前活动的临时场景，清除引用
        if (this.activeTemporaryScene && this.activeTemporaryScene.id === sceneId) {
            this.activeTemporaryScene = null;
        }

        this.emit('temporarySceneSaved', { 
            temporaryScene: tempScene, 
            savedScene 
        });

        return savedScene;
    }

    // ============ 关闭处理 ============

    /**
     * 处理临时场景关闭
     * @param {string} sceneId - 场景 ID
     * @param {Object} [options] - 选项
     * @param {boolean} [options.force] - 强制关闭，不提示
     * @returns {Promise<CloseResult>} 关闭结果
     */
    async handleClose(sceneId, options = {}) {
        const scene = this.temporaryScenes.get(sceneId);
        if (!scene) {
            return 'discarded';
        }

        // 如果没有修改或强制关闭，直接丢弃
        if (!scene.isModified || options.force) {
            this.discardTemporaryScene(sceneId);
            return 'discarded';
        }

        // 发出事件，让 UI 层处理对话框
        return new Promise((resolve) => {
            this.emit('closeConfirmationRequired', {
                scene,
                resolve: (result) => {
                    if (result === 'discarded') {
                        this.discardTemporaryScene(sceneId);
                    }
                    resolve(result);
                }
            });
        });
    }

    /**
     * 丢弃临时场景（不保存）
     * @param {string} sceneId - 场景 ID
     */
    discardTemporaryScene(sceneId) {
        const scene = this.temporaryScenes.get(sceneId);
        if (scene) {
            this.temporaryScenes.delete(sceneId);
            
            if (this.activeTemporaryScene && this.activeTemporaryScene.id === sceneId) {
                this.activeTemporaryScene = null;
            }
            
            this.emit('temporarySceneDiscarded', scene);
        }
    }

    /**
     * 丢弃所有临时场景
     */
    discardAllTemporaryScenes() {
        const scenes = Array.from(this.temporaryScenes.values());
        this.temporaryScenes.clear();
        this.activeTemporaryScene = null;
        
        for (const scene of scenes) {
            this.emit('temporarySceneDiscarded', scene);
        }
    }

    // ============ 活动场景管理 ============

    /**
     * 设置活动临时场景
     * @param {string} sceneId - 场景 ID
     */
    setActiveTemporaryScene(sceneId) {
        const scene = this.temporaryScenes.get(sceneId);
        if (scene) {
            this.activeTemporaryScene = scene;
            this.emit('activeTemporarySceneChanged', scene);
        }
    }

    /**
     * 获取活动临时场景
     * @returns {TemporaryScene|null} 活动临时场景
     */
    getActiveTemporaryScene() {
        return this.activeTemporaryScene;
    }

    /**
     * 清除活动临时场景
     */
    clearActiveTemporaryScene() {
        this.activeTemporaryScene = null;
        this.emit('activeTemporarySceneChanged', null);
    }

    // ============ 生命周期 ============

    /**
     * 销毁管理器
     */
    destroy() {
        this.temporaryScenes.clear();
        this.activeTemporaryScene = null;
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.TemporarySceneManager = TemporarySceneManager;
}
