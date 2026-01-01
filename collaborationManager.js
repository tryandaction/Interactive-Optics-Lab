/**
 * 无服务器协作管理器
 * 通过本地文件实现项目协作功能，与现有云端协作互补
 */

class CollaborationManager {
    constructor() {
        this.currentProject = null;
        this.currentUser = this.loadCurrentUser();
        this.userFilter = 'all'; // 'all', 'self', 'others', or specific userId
        this.autoSaveTimer = null;
        this.init();
    }

    init() {
        // 如果没有当前用户，创建一个
        if (!this.currentUser) {
            this.createUser();
        }

        // 启动自动保存
        this.startAutoSave();
    }

    // ==================== 用户管理 ====================

    loadCurrentUser() {
        const userData = localStorage.getItem('optics_current_user');
        return userData ? JSON.parse(userData) : null;
    }

    saveCurrentUser(user) {
        localStorage.setItem('optics_current_user', JSON.stringify(user));
        this.currentUser = user;
    }

    createUser() {
        const username = prompt('请输入您的用户名（用于协作识别）：', 'User_' + Date.now().toString(36));
        if (!username) {
            alert('需要设置用户名才能使用协作功能');
            return;
        }

        const user = {
            id: this.generateUserId(),
            username: username.trim(),
            color: this.generateUserColor(),
            createdAt: Date.now()
        };

        this.saveCurrentUser(user);
        return user;
    }

    changeUser() {
        const newUsername = prompt('输入新的用户名：', this.currentUser?.username || '');
        if (!newUsername) return;

        const user = {
            ...this.currentUser,
            username: newUsername.trim(),
            color: this.currentUser?.color || this.generateUserColor()
        };

        this.saveCurrentUser(user);
        this.updateUI();
    }

    generateUserId() {
        return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUserColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 60%)`;
    }

    // ==================== 项目管理 ====================

    createNewProject(projectName) {
        const project = {
            id: this.generateProjectId(),
            name: projectName || '未命名项目',
            description: '',
            version: '1.0.0',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            owner: {
                id: this.currentUser.id,
                username: this.currentUser.username
            },
            collaborators: [
                {
                    id: this.currentUser.id,
                    username: this.currentUser.username,
                    color: this.currentUser.color,
                    role: 'owner',
                    joinedAt: Date.now()
                }
            ],
            scenes: [],
            settings: {
                allowEdit: ['owner'], // 'owner', 'all', or specific user ids
                autoSave: true
            }
        };

        this.currentProject = project;
        this.saveProjectToLocal();
        return project;
    }

    generateProjectId() {
        return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadProject(projectData) {
        try {
            if (typeof projectData === 'string') {
                projectData = JSON.parse(projectData);
            }

            // 验证项目格式
            if (!projectData.id || !projectData.version) {
                throw new Error('无效的项目文件格式');
            }

            this.currentProject = projectData;

            // 检查当前用户是否在协作者列表中
            const isCollaborator = projectData.collaborators.some(
                c => c.id === this.currentUser.id
            );

            if (!isCollaborator) {
                // 添加当前用户为新协作者
                this.addCollaborator(this.currentUser);
            }

            this.saveProjectToLocal();
            return true;
        } catch (error) {
            console.error('加载项目失败:', error);
            alert('加载项目失败：' + error.message);
            return false;
        }
    }

    saveProjectToLocal() {
        if (!this.currentProject) return;

        this.currentProject.updatedAt = Date.now();
        localStorage.setItem('optics_current_project', JSON.stringify(this.currentProject));
    }

    loadProjectFromLocal() {
        const projectData = localStorage.getItem('optics_current_project');
        if (projectData) {
            return this.loadProject(projectData);
        }
        return false;
    }

    addCollaborator(user) {
        if (!this.currentProject) return;

        const exists = this.currentProject.collaborators.some(c => c.id === user.id);
        if (exists) return;

        this.currentProject.collaborators.push({
            id: user.id,
            username: user.username,
            color: user.color,
            role: 'editor',
            joinedAt: Date.now()
        });

        this.saveProjectToLocal();
    }

    // ==================== 场景管理 ====================

    createScene(sceneName, sceneData) {
        if (!this.currentProject) {
            alert('请先创建或加载项目');
            return null;
        }

        const scene = {
            id: this.generateSceneId(),
            name: sceneName || '未命名场景',
            description: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: {
                id: this.currentUser.id,
                username: this.currentUser.username
            },
            components: sceneData?.components || [],
            settings: sceneData?.settings || {}
        };

        this.currentProject.scenes.push(scene);
        this.saveProjectToLocal();
        return scene;
    }

    generateSceneId() {
        return 'scene_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    updateScene(sceneId, sceneData) {
        if (!this.currentProject) return false;

        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) return false;

        scene.components = sceneData.components || scene.components;
        scene.settings = sceneData.settings || scene.settings;
        scene.updatedAt = Date.now();

        this.saveProjectToLocal();
        return true;
    }

    deleteScene(sceneId) {
        if (!this.currentProject) return false;

        const index = this.currentProject.scenes.findIndex(s => s.id === sceneId);
        if (index === -1) return false;

        this.currentProject.scenes.splice(index, 1);
        this.saveProjectToLocal();
        return true;
    }

    // ==================== 元件所有权管理 ====================

    markComponentOwnership(component) {
        if (!component.metadata) {
            component.metadata = {};
        }

        component.metadata.owner = {
            id: this.currentUser.id,
            username: this.currentUser.username,
            color: this.currentUser.color,
            createdAt: Date.now()
        };

        component.metadata.lastEditedBy = {
            id: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: Date.now()
        };

        return component;
    }

    updateComponentOwnership(component) {
        if (!component.metadata) {
            component.metadata = {};
        }

        component.metadata.lastEditedBy = {
            id: this.currentUser.id,
            username: this.currentUser.username,
            timestamp: Date.now()
        };

        return component;
    }

    getComponentOwner(component) {
        return component.metadata?.owner || null;
    }

    isOwnedByCurrentUser(component) {
        const owner = this.getComponentOwner(component);
        return owner && owner.id === this.currentUser.id;
    }

    // ==================== 用户过滤器 ====================

    setUserFilter(filter) {
        this.userFilter = filter;
        this.applyFilter();
    }

    applyFilter() {
        // 这个方法会被主应用调用来更新视图
        if (window.applyUserFilter) {
            window.applyUserFilter(this.userFilter);
        }
    }

    shouldDisplayComponent(component, filterMode = this.userFilter) {
        const owner = this.getComponentOwner(component);

        if (!owner) {
            // 没有所有者信息的元件（旧数据）
            return { display: true, dimmed: false };
        }

        switch (filterMode) {
            case 'all':
                return { display: true, dimmed: false };

            case 'self':
                // 只显示自己的，其他变暗
                if (owner.id === this.currentUser.id) {
                    return { display: true, dimmed: false };
                } else {
                    return { display: true, dimmed: true };
                }

            case 'others':
                // 只显示他人的，自己的变暗
                if (owner.id !== this.currentUser.id) {
                    return { display: true, dimmed: false };
                } else {
                    return { display: true, dimmed: true };
                }

            default:
                // 特定用户ID
                if (owner.id === filterMode) {
                    return { display: true, dimmed: false };
                } else {
                    return { display: true, dimmed: true };
                }
        }
    }

    // ==================== 自动保存 ====================

    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.currentProject && this.currentProject.settings.autoSave) {
                this.saveProjectToLocal();
            }
        }, 3000); // 3秒自动保存
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // ==================== 导出/导入功能 ====================

    exportProject() {
        if (!this.currentProject) {
            alert('没有可导出的项目');
            return;
        }

        const projectData = JSON.stringify(this.currentProject, null, 2);
        const blob = new Blob([projectData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentProject.name}_v${this.currentProject.version}_${new Date().toISOString().split('T')[0]}.opticsproject`;
        a.click();

        URL.revokeObjectURL(url);
    }

    importProject(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const success = this.loadProject(e.target.result);
                    if (success) {
                        resolve(this.currentProject);
                    } else {
                        reject(new Error('项目加载失败'));
                    }
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    exportScene(sceneId) {
        if (!this.currentProject) {
            alert('没有可导出的场景');
            return;
        }

        const scene = this.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) {
            alert('场景不存在');
            return;
        }

        const sceneData = JSON.stringify(scene, null, 2);
        const blob = new Blob([sceneData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.name}_${new Date().toISOString().split('T')[0]}.opticsscene`;
        a.click();

        URL.revokeObjectURL(url);
    }

    // ==================== UI辅助方法 ====================

    getCollaboratorsList() {
        if (!this.currentProject) return [];
        return this.currentProject.collaborators;
    }

    getScenesList() {
        if (!this.currentProject) return [];
        return this.currentProject.scenes;
    }

    getProjectInfo() {
        if (!this.currentProject) return null;

        return {
            name: this.currentProject.name,
            description: this.currentProject.description,
            version: this.currentProject.version,
            owner: this.currentProject.owner,
            collaborators: this.currentProject.collaborators.length,
            scenes: this.currentProject.scenes.length,
            createdAt: new Date(this.currentProject.createdAt).toLocaleString(),
            updatedAt: new Date(this.currentProject.updatedAt).toLocaleString()
        };
    }

    updateUI() {
        // 触发UI更新事件
        window.dispatchEvent(new CustomEvent('collaboration-update', {
            detail: {
                project: this.currentProject,
                user: this.currentUser,
                filter: this.userFilter
            }
        }));
    }
}

// 创建全局实例
window.collaborationManager = new CollaborationManager();