/**
 * ProjectManager.js - 统一项目管理器
 * 支持本地文件夹和 GitHub 仓库两种存储模式
 */

import { FileSystemAdapter } from './FileSystemAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { Serializer } from './Serializer.js';

export class ProjectManager {
    static RECENT_PROJECTS_KEY = 'opticslab_recent_projects';
    static MAX_RECENT_PROJECTS = 5;
    static PROJECT_CONFIG_FILE = '.opticslab.json';
    static SCENE_EXTENSION = '.scene.json';

    constructor() {
        this.currentProject = null;
        this.currentScene = null;
        this.directoryHandle = null;  // File System API handle
        this.isFileSystemSupported = FileSystemAdapter.isSupported();
        this.recentProjects = [];
        this.listeners = new Map();
        
        this.loadRecentProjects();
    }

    // ============ 事件系统 ============

    /**
     * 注册事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
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

    // ============ 项目创建 ============

    /**
     * 创建新项目
     * @param {Object} config - 项目配置
     * @returns {Promise<Object>} 创建的项目
     */
    async createProject(config) {
        const { name, storageMode, githubUrl, syncCommandTemplate } = config;

        if (!name || !name.trim()) {
            throw new Error('项目名称不能为空');
        }

        const project = {
            id: this.generateId('proj'),
            name: name.trim(),
            storageMode: storageMode || 'local',
            githubUrl: storageMode === 'github' ? githubUrl : null,
            syncCommandTemplate: syncCommandTemplate || this.getDefaultSyncTemplate(),
            commitHistory: [],
            scenes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (storageMode === 'local' && this.isFileSystemSupported) {
            // 使用 File System Access API
            await this.createLocalProject(project);
        } else if (storageMode === 'github' && this.isFileSystemSupported) {
            // GitHub 项目需要选择本地克隆目录
            await this.createGitHubProject(project, config.localPath);
        } else {
            // 回退到 localStorage
            project.storageMode = 'localStorage';
            LocalStorageAdapter.saveProject(project);
        }

        this.currentProject = project;
        this.addToRecentProjects(project);
        this.emit('projectCreated', project);
        this.emit('projectChanged', project);

        return project;
    }

    /**
     * 创建本地文件夹项目
     */
    async createLocalProject(project) {
        try {
            // 让用户选择父目录
            const parentHandle = await FileSystemAdapter.selectDirectory({
                startIn: 'documents'
            });

            // 创建项目目录
            const projectHandle = await FileSystemAdapter.createDirectory(parentHandle, project.name);
            this.directoryHandle = projectHandle;

            // 创建项目配置文件
            await this.saveProjectConfig(project);

            project.path = project.name;
        } catch (e) {
            throw new Error(`创建项目失败: ${e.message}`);
        }
    }

    /**
     * 创建 GitHub 项目（关联已克隆的仓库）
     */
    async createGitHubProject(project, localPath) {
        try {
            // 让用户选择已克隆的仓库目录
            const dirHandle = await FileSystemAdapter.selectDirectory({
                startIn: 'documents'
            });

            // 验证是否是 Git 仓库
            const hasGit = await FileSystemAdapter.exists(dirHandle, '.git', 'directory');
            if (!hasGit) {
                throw new Error('所选目录不是 Git 仓库（缺少 .git 目录）');
            }

            this.directoryHandle = dirHandle;
            project.path = dirHandle.name;

            // 创建或更新项目配置文件
            await this.saveProjectConfig(project);
        } catch (e) {
            throw new Error(`关联 GitHub 仓库失败: ${e.message}`);
        }
    }

    // ============ 项目打开/加载 ============

    /**
     * 打开项目
     * @param {Object} projectInfo - 项目信息（来自最近项目列表或选择）
     */
    async openProject(projectInfo = null) {
        try {
            if (projectInfo && projectInfo.storageMode === 'localStorage') {
                // 从 localStorage 加载
                const project = LocalStorageAdapter.getProject(projectInfo.id);
                if (!project) {
                    throw new Error('项目不存在');
                }
                this.currentProject = project;
            } else {
                // 从文件系统加载
                const dirHandle = await FileSystemAdapter.selectDirectory({
                    startIn: 'documents'
                });

                // 请求权限
                const hasPermission = await FileSystemAdapter.requestPermission(dirHandle);
                if (!hasPermission) {
                    throw new Error('需要文件访问权限');
                }

                this.directoryHandle = dirHandle;

                // 读取项目配置
                const configHandle = await FileSystemAdapter.getFileHandle(
                    dirHandle, 
                    ProjectManager.PROJECT_CONFIG_FILE
                );

                if (configHandle) {
                    const configJson = await FileSystemAdapter.readFile(configHandle);
                    this.currentProject = JSON.parse(configJson);
                } else {
                    // 没有配置文件，创建新项目配置
                    this.currentProject = {
                        id: this.generateId('proj'),
                        name: dirHandle.name,
                        storageMode: 'local',
                        syncCommandTemplate: this.getDefaultSyncTemplate(),
                        commitHistory: [],
                        scenes: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    await this.saveProjectConfig(this.currentProject);
                }

                // 扫描场景文件
                await this.scanScenes();
            }

            this.addToRecentProjects(this.currentProject);
            this.emit('projectOpened', this.currentProject);
            this.emit('projectChanged', this.currentProject);

            return this.currentProject;
        } catch (e) {
            if (e.message.includes('用户取消')) {
                return null;
            }
            throw e;
        }
    }

    /**
     * 扫描项目目录中的场景文件
     */
    async scanScenes() {
        if (!this.directoryHandle) return;

        const scenes = [];
        const entries = await FileSystemAdapter.listDirectory(this.directoryHandle);

        for (const entry of entries) {
            if (entry.kind === 'file' && entry.name.endsWith(ProjectManager.SCENE_EXTENSION)) {
                const sceneName = entry.name.replace(ProjectManager.SCENE_EXTENSION, '');
                scenes.push({
                    id: this.generateId('scene'),
                    name: sceneName,
                    fileName: entry.name
                });
            }
        }

        this.currentProject.scenes = scenes;
    }

    // ============ 项目操作 ============

    /**
     * 重命名项目
     */
    async renameProject(newName) {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        if (!newName || !newName.trim()) {
            throw new Error('项目名称不能为空');
        }

        const oldName = this.currentProject.name;
        this.currentProject.name = newName.trim();
        this.currentProject.updatedAt = new Date().toISOString();

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.saveProject(this.currentProject);
        } else {
            await this.saveProjectConfig(this.currentProject);
        }

        this.updateRecentProject(this.currentProject);
        this.emit('projectRenamed', { oldName, newName: this.currentProject.name });
        this.emit('projectChanged', this.currentProject);
    }

    /**
     * 删除项目
     */
    async deleteProject() {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        const projectId = this.currentProject.id;

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.deleteProject(projectId);
        }
        // 注意：文件系统项目不会删除实际文件，只是关闭

        this.removeFromRecentProjects(projectId);
        
        const deletedProject = this.currentProject;
        this.currentProject = null;
        this.currentScene = null;
        this.directoryHandle = null;

        this.emit('projectDeleted', deletedProject);
        this.emit('projectChanged', null);
    }

    /**
     * 创建子项目（子文件夹）
     */
    async createSubProject(name) {
        if (!this.directoryHandle) {
            throw new Error('当前项目不支持子项目');
        }

        if (!name || !name.trim()) {
            throw new Error('子项目名称不能为空');
        }

        const subDirHandle = await FileSystemAdapter.createDirectory(
            this.directoryHandle, 
            name.trim()
        );

        this.emit('subProjectCreated', { name: name.trim(), handle: subDirHandle });
        return subDirHandle;
    }

    // ============ 场景操作 ============

    /**
     * 创建新场景
     */
    async createScene(name) {
        if (!this.currentProject) {
            throw new Error('请先打开或创建项目');
        }

        if (!name || !name.trim()) {
            throw new Error('场景名称不能为空');
        }

        const sceneName = name.trim();
        const fileName = `${sceneName}${ProjectManager.SCENE_EXTENSION}`;
        const sceneData = Serializer.createEmptyScene(sceneName);

        const scene = {
            id: this.generateId('scene'),
            name: sceneName,
            fileName: fileName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.saveScene(this.currentProject.id, scene.id, sceneData);
        } else if (this.directoryHandle) {
            const json = Serializer.serialize([], sceneData.settings, { name: sceneName });
            await FileSystemAdapter.createFile(this.directoryHandle, fileName, json);
        }

        this.currentProject.scenes.push(scene);
        this.currentProject.updatedAt = new Date().toISOString();

        if (this.currentProject.storageMode !== 'localStorage') {
            await this.saveProjectConfig(this.currentProject);
        } else {
            LocalStorageAdapter.saveProject(this.currentProject);
        }

        this.emit('sceneCreated', scene);
        
        // 自动打开新场景
        await this.loadScene(scene.id);

        return scene;
    }

    /**
     * 加载场景
     */
    async loadScene(sceneId) {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) {
            throw new Error('场景不存在');
        }

        let sceneData;

        if (this.currentProject.storageMode === 'localStorage') {
            sceneData = LocalStorageAdapter.getScene(this.currentProject.id, sceneId);
        } else if (this.directoryHandle) {
            const fileHandle = await FileSystemAdapter.getFileHandle(
                this.directoryHandle, 
                scene.fileName
            );
            if (fileHandle) {
                const json = await FileSystemAdapter.readFile(fileHandle);
                sceneData = Serializer.deserialize(json);
            }
        }

        if (!sceneData) {
            throw new Error('无法加载场景数据');
        }

        this.currentScene = {
            ...scene,
            data: sceneData,
            isModified: false
        };

        this.emit('sceneLoaded', this.currentScene);
        return this.currentScene;
    }

    /**
     * 保存当前场景
     */
    async saveScene(components, settings) {
        if (!this.currentProject || !this.currentScene) {
            throw new Error('没有打开的场景');
        }

        const sceneData = {
            ...this.currentScene.data,
            components: components,
            settings: settings,
            metadata: {
                ...this.currentScene.data.metadata,
                updatedAt: new Date().toISOString()
            }
        };

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.saveScene(
                this.currentProject.id, 
                this.currentScene.id, 
                sceneData
            );
        } else if (this.directoryHandle) {
            const json = Serializer.serialize(
                components, 
                settings, 
                sceneData.metadata
            );
            const fileHandle = await FileSystemAdapter.getFileHandle(
                this.directoryHandle, 
                this.currentScene.fileName,
                true
            );
            await FileSystemAdapter.writeFile(fileHandle, json);
        }

        this.currentScene.data = sceneData;
        this.currentScene.isModified = false;
        this.currentScene.updatedAt = new Date().toISOString();

        // 更新项目中的场景信息
        const sceneIndex = this.currentProject.scenes.findIndex(
            s => s.id === this.currentScene.id
        );
        if (sceneIndex >= 0) {
            this.currentProject.scenes[sceneIndex].updatedAt = this.currentScene.updatedAt;
        }

        this.emit('sceneSaved', this.currentScene);
        return this.currentScene;
    }

    /**
     * 删除场景
     */
    async deleteScene(sceneId) {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) {
            throw new Error('场景不存在');
        }

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.deleteScene(this.currentProject.id, sceneId);
        } else if (this.directoryHandle) {
            await FileSystemAdapter.deleteFile(this.directoryHandle, scene.fileName);
        }

        this.currentProject.scenes = this.currentProject.scenes.filter(s => s.id !== sceneId);

        if (this.currentScene && this.currentScene.id === sceneId) {
            this.currentScene = null;
        }

        this.emit('sceneDeleted', scene);
    }

    /**
     * 重命名场景
     */
    async renameScene(sceneId, newName) {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) {
            throw new Error('场景不存在');
        }

        const oldFileName = scene.fileName;
        const newFileName = `${newName}${ProjectManager.SCENE_EXTENSION}`;

        if (this.directoryHandle) {
            await FileSystemAdapter.renameFile(this.directoryHandle, oldFileName, newFileName);
        }

        scene.name = newName;
        scene.fileName = newFileName;
        scene.updatedAt = new Date().toISOString();

        if (this.currentScene && this.currentScene.id === sceneId) {
            this.currentScene.name = newName;
            this.currentScene.fileName = newFileName;
        }

        this.emit('sceneRenamed', scene);
    }

    // ============ 项目配置 ============

    /**
     * 保存项目配置文件
     */
    async saveProjectConfig(project) {
        if (!this.directoryHandle) return;

        const config = {
            id: project.id,
            name: project.name,
            storageMode: project.storageMode,
            githubUrl: project.githubUrl,
            syncCommandTemplate: project.syncCommandTemplate,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        };

        const json = JSON.stringify(config, null, 2);
        await FileSystemAdapter.createFile(
            this.directoryHandle, 
            ProjectManager.PROJECT_CONFIG_FILE, 
            json
        );
    }

    /**
     * 更新同步命令模板
     */
    async updateSyncTemplate(template) {
        if (!this.currentProject) {
            throw new Error('没有打开的项目');
        }

        this.currentProject.syncCommandTemplate = template;
        this.currentProject.updatedAt = new Date().toISOString();

        if (this.currentProject.storageMode === 'localStorage') {
            LocalStorageAdapter.saveProject(this.currentProject);
        } else {
            await this.saveProjectConfig(this.currentProject);
        }

        this.emit('syncTemplateUpdated', template);
    }

    /**
     * 获取默认同步命令模板
     */
    getDefaultSyncTemplate() {
        return `git add .
git commit -m "{{message}}"
git push origin main`;
    }

    // ============ 最近项目 ============

    /**
     * 加载最近项目列表
     */
    loadRecentProjects() {
        try {
            const data = localStorage.getItem(ProjectManager.RECENT_PROJECTS_KEY);
            this.recentProjects = data ? JSON.parse(data) : [];
        } catch (e) {
            this.recentProjects = [];
        }
    }

    /**
     * 保存最近项目列表
     */
    saveRecentProjects() {
        localStorage.setItem(
            ProjectManager.RECENT_PROJECTS_KEY, 
            JSON.stringify(this.recentProjects)
        );
    }

    /**
     * 添加到最近项目
     */
    addToRecentProjects(project) {
        // 移除已存在的同一项目
        this.recentProjects = this.recentProjects.filter(p => p.id !== project.id);

        // 添加到开头
        this.recentProjects.unshift({
            id: project.id,
            name: project.name,
            storageMode: project.storageMode,
            path: project.path,
            updatedAt: project.updatedAt
        });

        // 限制数量
        if (this.recentProjects.length > ProjectManager.MAX_RECENT_PROJECTS) {
            this.recentProjects = this.recentProjects.slice(0, ProjectManager.MAX_RECENT_PROJECTS);
        }

        this.saveRecentProjects();
    }

    /**
     * 更新最近项目信息
     */
    updateRecentProject(project) {
        const index = this.recentProjects.findIndex(p => p.id === project.id);
        if (index >= 0) {
            this.recentProjects[index] = {
                id: project.id,
                name: project.name,
                storageMode: project.storageMode,
                path: project.path,
                updatedAt: project.updatedAt
            };
            this.saveRecentProjects();
        }
    }

    /**
     * 从最近项目中移除
     */
    removeFromRecentProjects(projectId) {
        this.recentProjects = this.recentProjects.filter(p => p.id !== projectId);
        this.saveRecentProjects();
    }

    /**
     * 获取最近项目列表
     */
    getRecentProjects() {
        return [...this.recentProjects];
    }

    // ============ 工具方法 ============

    /**
     * 生成唯一ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    }

    /**
     * 标记当前场景已修改
     */
    markSceneAsModified() {
        if (this.currentScene) {
            this.currentScene.isModified = true;
            this.emit('sceneModified', this.currentScene);
        }
    }

    /**
     * 检查当前场景是否已修改
     */
    isSceneModified() {
        return this.currentScene?.isModified || false;
    }

    /**
     * 获取当前项目
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * 获取当前场景
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * 检查是否支持文件系统API
     */
    isFileSystemAPISupported() {
        return this.isFileSystemSupported;
    }

    /**
     * 获取项目树结构
     */
    async getProjectTree() {
        if (!this.directoryHandle) {
            // localStorage 模式返回简单结构
            if (this.currentProject) {
                return {
                    name: this.currentProject.name,
                    kind: 'directory',
                    children: this.currentProject.scenes.map(s => ({
                        name: s.name,
                        kind: 'file',
                        id: s.id
                    }))
                };
            }
            return null;
        }

        return await FileSystemAdapter.getDirectoryTree(this.directoryHandle);
    }

    /**
     * 关闭当前项目
     */
    closeProject() {
        this.currentProject = null;
        this.currentScene = null;
        this.directoryHandle = null;
        this.emit('projectClosed');
        this.emit('projectChanged', null);
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ProjectManager = ProjectManager;
}
