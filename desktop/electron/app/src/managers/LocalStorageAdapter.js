/**
 * LocalStorageAdapter.js - localStorage 存储适配器
 * 作为 File System Access API 不可用时的回退方案
 * 支持项目和场景的 CRUD 操作，以及 ZIP 导入导出
 */

export class LocalStorageAdapter {
    static STORAGE_KEY = 'opticslab_projects_v2';
    static SCENES_KEY_PREFIX = 'opticslab_scene_';
    static MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB 警告阈值

    /**
     * 获取所有项目
     * @returns {Array<Object>}
     */
    static getProjects() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading projects from localStorage:', e);
            return [];
        }
    }

    /**
     * 保存所有项目
     * @param {Array<Object>} projects
     */
    static saveProjects(projects) {
        try {
            const json = JSON.stringify(projects);
            localStorage.setItem(this.STORAGE_KEY, json);
            this.checkStorageUsage();
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                throw new Error('存储空间已满，请删除一些旧项目或导出后删除');
            }
            throw e;
        }
    }

    /**
     * 获取单个项目
     * @param {string} projectId
     * @returns {Object|null}
     */
    static getProject(projectId) {
        const projects = this.getProjects();
        return projects.find(p => p.id === projectId) || null;
    }

    /**
     * 保存单个项目
     * @param {Object} project
     */
    static saveProject(project) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === project.id);
        
        if (index >= 0) {
            projects[index] = project;
        } else {
            projects.push(project);
        }
        
        this.saveProjects(projects);
    }

    /**
     * 删除项目
     * @param {string} projectId
     */
    static deleteProject(projectId) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        this.saveProjects(filtered);
        
        // 同时删除该项目的所有场景
        this.deleteProjectScenes(projectId);
    }

    /**
     * 获取场景数据
     * @param {string} projectId
     * @param {string} sceneId
     * @returns {Object|null}
     */
    static getScene(projectId, sceneId) {
        try {
            const key = `${this.SCENES_KEY_PREFIX}${projectId}_${sceneId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading scene from localStorage:', e);
            return null;
        }
    }

    /**
     * 保存场景数据
     * @param {string} projectId
     * @param {string} sceneId
     * @param {Object} sceneData
     */
    static saveScene(projectId, sceneId, sceneData) {
        try {
            const key = `${this.SCENES_KEY_PREFIX}${projectId}_${sceneId}`;
            localStorage.setItem(key, JSON.stringify(sceneData));
            this.checkStorageUsage();
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                throw new Error('存储空间已满，请删除一些旧场景');
            }
            throw e;
        }
    }

    /**
     * 删除场景
     * @param {string} projectId
     * @param {string} sceneId
     */
    static deleteScene(projectId, sceneId) {
        const key = `${this.SCENES_KEY_PREFIX}${projectId}_${sceneId}`;
        localStorage.removeItem(key);
    }

    /**
     * 删除项目的所有场景
     * @param {string} projectId
     */
    static deleteProjectScenes(projectId) {
        const prefix = `${this.SCENES_KEY_PREFIX}${projectId}_`;
        const keysToDelete = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => localStorage.removeItem(key));
    }

    /**
     * 获取项目的所有场景ID
     * @param {string} projectId
     * @returns {Array<string>}
     */
    static getProjectSceneIds(projectId) {
        const prefix = `${this.SCENES_KEY_PREFIX}${projectId}_`;
        const sceneIds = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                const sceneId = key.substring(prefix.length);
                sceneIds.push(sceneId);
            }
        }
        
        return sceneIds;
    }

    /**
     * 导出项目为 ZIP 文件
     * @param {string} projectId
     * @returns {Promise<Blob>}
     */
    static async exportProjectAsZip(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('项目不存在');
        }

        // 使用 JSZip 库（需要引入）
        if (typeof JSZip === 'undefined') {
            // 如果没有 JSZip，使用简单的 JSON 导出
            return this.exportProjectAsJson(projectId);
        }

        const zip = new JSZip();
        
        // 添加项目元数据
        const metadata = {
            ...project,
            exportedAt: new Date().toISOString(),
            exportVersion: '2.0.0'
        };
        zip.file('.opticslab.json', JSON.stringify(metadata, null, 2));

        // 添加所有场景
        const sceneIds = this.getProjectSceneIds(projectId);
        for (const sceneId of sceneIds) {
            const sceneData = this.getScene(projectId, sceneId);
            if (sceneData) {
                const sceneName = sceneData.name || sceneId;
                zip.file(`${sceneName}.scene.json`, JSON.stringify(sceneData, null, 2));
            }
        }

        return await zip.generateAsync({ type: 'blob' });
    }

    /**
     * 导出项目为 JSON 文件（无 JSZip 时的回退）
     * @param {string} projectId
     * @returns {Blob}
     */
    static exportProjectAsJson(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('项目不存在');
        }

        const exportData = {
            ...project,
            scenes: [],
            exportedAt: new Date().toISOString(),
            exportVersion: '2.0.0'
        };

        // 收集所有场景数据
        const sceneIds = this.getProjectSceneIds(projectId);
        for (const sceneId of sceneIds) {
            const sceneData = this.getScene(projectId, sceneId);
            if (sceneData) {
                exportData.scenes.push({
                    id: sceneId,
                    data: sceneData
                });
            }
        }

        return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    }

    /**
     * 从 ZIP 文件导入项目
     * @param {File} file
     * @returns {Promise<Object>} 导入的项目
     */
    static async importProjectFromZip(file) {
        // 检查文件类型
        if (file.name.endsWith('.json')) {
            return this.importProjectFromJson(file);
        }

        if (typeof JSZip === 'undefined') {
            throw new Error('不支持 ZIP 格式，请使用 JSON 文件');
        }

        const zip = await JSZip.loadAsync(file);
        
        // 读取项目元数据
        const metadataFile = zip.file('.opticslab.json');
        if (!metadataFile) {
            throw new Error('无效的项目文件：缺少元数据');
        }

        const metadataJson = await metadataFile.async('string');
        const metadata = JSON.parse(metadataJson);

        // 生成新的项目ID避免冲突
        const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const project = {
            ...metadata,
            id: newProjectId,
            importedAt: new Date().toISOString()
        };

        // 保存项目
        this.saveProject(project);

        // 导入所有场景
        const sceneFiles = Object.keys(zip.files).filter(name => name.endsWith('.scene.json'));
        for (const sceneName of sceneFiles) {
            const sceneFile = zip.file(sceneName);
            if (sceneFile) {
                const sceneJson = await sceneFile.async('string');
                const sceneData = JSON.parse(sceneJson);
                const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.saveScene(newProjectId, sceneId, sceneData);
            }
        }

        return project;
    }

    /**
     * 从 JSON 文件导入项目
     * @param {File} file
     * @returns {Promise<Object>}
     */
    static async importProjectFromJson(file) {
        const text = await file.text();
        const data = JSON.parse(text);

        // 生成新的项目ID
        const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const project = {
            id: newProjectId,
            name: data.name || '导入的项目',
            storageMode: 'local',
            syncCommandTemplate: data.syncCommandTemplate || '',
            commitHistory: [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            importedAt: new Date().toISOString()
        };

        // 保存项目
        this.saveProject(project);

        // 导入场景
        if (data.scenes && Array.isArray(data.scenes)) {
            for (const scene of data.scenes) {
                const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                this.saveScene(newProjectId, sceneId, scene.data || scene);
            }
        }

        return project;
    }

    /**
     * 检查存储使用情况
     */
    static checkStorageUsage() {
        let totalSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                if (value) {
                    totalSize += key.length + value.length;
                }
            }
        }

        const usedMB = (totalSize * 2) / (1024 * 1024); // UTF-16 编码，每字符2字节
        
        if (usedMB > this.MAX_STORAGE_SIZE / (1024 * 1024)) {
            console.warn(`localStorage usage is high: ${usedMB.toFixed(2)} MB`);
        }

        return {
            usedBytes: totalSize * 2,
            usedMB: usedMB,
            isHigh: usedMB > this.MAX_STORAGE_SIZE / (1024 * 1024)
        };
    }

    /**
     * 清理所有项目数据
     */
    static clearAll() {
        // 删除项目列表
        localStorage.removeItem(this.STORAGE_KEY);
        
        // 删除所有场景
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.SCENES_KEY_PREFIX)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
    }

    /**
     * 迁移旧版本数据
     */
    static migrateOldData() {
        // 检查是否有旧版本的项目数据
        const oldKey = 'opticsLab_projects';
        const oldData = localStorage.getItem(oldKey);
        
        if (oldData) {
            try {
                const oldProjects = JSON.parse(oldData);
                const newProjects = this.getProjects();
                
                // 合并旧项目（避免重复）
                const existingIds = new Set(newProjects.map(p => p.id));
                
                for (const oldProject of oldProjects) {
                    if (!existingIds.has(oldProject.id)) {
                        // 转换为新格式
                        const newProject = {
                            id: oldProject.id,
                            name: oldProject.name,
                            storageMode: 'local',
                            syncCommandTemplate: '',
                            commitHistory: [],
                            createdAt: oldProject.createdAt,
                            updatedAt: oldProject.updatedAt
                        };
                        newProjects.push(newProject);

                        // 迁移场景
                        if (oldProject.scenes && Array.isArray(oldProject.scenes)) {
                            for (const scene of oldProject.scenes) {
                                this.saveScene(newProject.id, scene.id, scene.data);
                            }
                        }
                    }
                }

                this.saveProjects(newProjects);
                console.log('Migrated old project data successfully');
            } catch (e) {
                console.error('Error migrating old data:', e);
            }
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.LocalStorageAdapter = LocalStorageAdapter;
}
