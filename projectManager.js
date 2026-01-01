// projectManager.js - 本地项目管理（纯前端版本，无需后端）

class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.currentSceneId = null;
        this.userFilter = 'all';
        this.dimOtherContent = true;
        this.projects = [];
        this.storageKey = 'opticsLab_projects';
        this.init();
    }

    init() {
        this.loadProjectsFromStorage();
        this.bindEvents();
    }

    /**
     * 从localStorage加载项目
     */
    loadProjectsFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            this.projects = data ? JSON.parse(data) : [];
            this.renderProjects(this.projects);
            this.renderProjectsModal(this.projects);
        } catch (error) {
            console.error('加载项目错误:', error);
            this.projects = [];
        }
    }

    /**
     * 保存项目到localStorage
     */
    saveProjectsToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.projects));
        } catch (error) {
            console.error('保存项目错误:', error);
            this.showNotification('保存失败：存储空间可能已满', 'error');
        }
    }

    bindEvents() {
        // 菜单事件
        document.getElementById('menu-new-project')?.addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('menu-manage-projects')?.addEventListener('click', () => this.showProjectsModal());

        // 项目标签页事件
        document.getElementById('project-create-btn')?.addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('project-search')?.addEventListener('input', (e) => this.filterProjects(e.target.value));

        // 协作标签页事件
        document.getElementById('user-content-filter')?.addEventListener('change', (e) => this.setUserFilter(e.target.value));
        document.getElementById('dim-other-content')?.addEventListener('change', (e) => this.setDimOtherContent(e.target.checked));

        // 模态框事件
        this.bindModalEvents();
    }

    bindModalEvents() {
        // 创建项目模态框
        document.getElementById('create-project-modal-close-btn')?.addEventListener('click', () => this.hideCreateProjectModal());
        document.getElementById('create-project-form')?.addEventListener('submit', (e) => this.handleCreateProject(e));

        // 项目管理模态框
        document.getElementById('projects-modal-close-btn')?.addEventListener('click', () => this.hideProjectsModal());
        document.getElementById('create-project-modal-btn')?.addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('projects-modal-search')?.addEventListener('input', (e) => this.filterProjectsModal(e.target.value));
        document.getElementById('refresh-projects')?.addEventListener('click', () => this.loadProjectsFromStorage());
    }

    // ============ 项目管理功能 ============

    renderProjects(projects) {
        const container = document.getElementById('projects-list');
        if (!container) return;

        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有项目，请先创建一个新项目。</p>';
            return;
        }

        container.innerHTML = projects.map(project => this.createProjectItemHTML(project)).join('');
        this.bindProjectItemEvents();
    }

    renderProjectsModal(projects) {
        const container = document.getElementById('projects-modal-list');
        if (!container) return;

        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有项目。</p>';
            return;
        }

        container.innerHTML = projects.map(project => this.createProjectItemHTML(project)).join('');
        this.bindProjectItemEvents();
    }

    createProjectItemHTML(project) {
        const isOwner = project.ownerId === window.userManager?.currentUser?.id;
        const scenesCount = project.scenes?.length || 0;

        return `
            <div class="project-item" data-project-id="${project.id}">
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">
                        创建者: ${project.ownerName || '本地用户'} |
                        场景数: ${scenesCount} |
                        更新: ${new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                    <div class="project-description">${project.description || '暂无描述'}</div>
                </div>
                <div class="project-actions">
                    <button class="project-action-btn load-btn" data-action="load">加载</button>
                    <button class="project-action-btn create-scene-btn" data-action="create-scene">新建场景</button>
                    <button class="project-action-btn export-btn" data-action="export">导出</button>
                    <button class="project-action-btn delete-btn" data-action="delete">删除</button>
                </div>
            </div>
        `;
    }

    bindProjectItemEvents() {
        document.querySelectorAll('.project-item').forEach(item => {
            const projectId = item.dataset.projectId;

            item.querySelector('[data-action="load"]')?.addEventListener('click', () => {
                this.loadProject(projectId);
            });

            item.querySelector('[data-action="create-scene"]')?.addEventListener('click', () => {
                this.createSceneForProject(projectId);
            });

            item.querySelector('[data-action="export"]')?.addEventListener('click', () => {
                this.exportProject(projectId);
            });

            item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(projectId);
            });
        });
    }

    loadProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            this.showNotification('项目不存在', 'error');
            return;
        }

        this.currentProject = project;

        // 加载第一个场景
        if (project.scenes && project.scenes.length > 0) {
            this.loadProjectScene(project.scenes[0]);
            this.currentSceneId = project.scenes[0].id;
        } else {
            // 清空画布
            if (window.clearAllComponents) {
                window.clearAllComponents();
            }
        }

        this.updateCollaborationUI();
        this.showNotification(`已加载项目: ${project.name}`, 'success');
        this.hideProjectsModal();
    }

    loadProjectScene(scene) {
        if (scene && scene.data && window.loadSceneData) {
            window.loadSceneData(scene.data);
        }
    }

    createProject(projectData) {
        const newProject = {
            id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: projectData.name,
            description: projectData.description || '',
            ownerId: window.userManager?.currentUser?.id,
            ownerName: window.userManager?.currentUser?.username || '本地用户',
            scenes: [],
            tags: projectData.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.projects.push(newProject);
        this.saveProjectsToStorage();
        this.renderProjects(this.projects);
        this.renderProjectsModal(this.projects);
        
        this.showNotification('项目创建成功', 'success');
        this.hideCreateProjectModal();

        // 自动加载新项目
        this.loadProject(newProject.id);
    }

    createSceneForProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const sceneCount = project.scenes ? project.scenes.length + 1 : 1;
        const sceneName = `${project.name} - 场景${sceneCount}`;

        // 获取当前画布数据
        const sceneData = window.getSceneData ? window.getSceneData() : { components: [], mode: 'ray_trace' };

        const newScene = {
            id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: sceneName,
            data: sceneData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        project.scenes = project.scenes || [];
        project.scenes.push(newScene);
        project.updatedAt = new Date().toISOString();

        this.saveProjectsToStorage();
        this.renderProjects(this.projects);
        this.renderProjectsModal(this.projects);

        // 如果当前项目就是这个项目，更新当前场景ID
        if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject = project;
            this.currentSceneId = newScene.id;
            this.updateCollaborationUI();
        }

        this.showNotification(`场景"${sceneName}"已创建`, 'success');
    }

    exportProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const exportData = JSON.stringify(project, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.opticsproject`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('项目已导出', 'success');
    }

    deleteProject(projectId) {
        if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return;

        this.projects = this.projects.filter(p => p.id !== projectId);
        this.saveProjectsToStorage();
        this.renderProjects(this.projects);
        this.renderProjectsModal(this.projects);

        if (this.currentProject && this.currentProject.id === projectId) {
            this.currentProject = null;
            this.currentSceneId = null;
            this.updateCollaborationUI();
        }

        this.showNotification('项目已删除', 'success');
    }

    // ============ 保存当前场景 ============

    saveCurrentScene() {
        if (!this.currentProject || !this.currentSceneId) {
            this.showNotification('请先加载一个项目', 'error');
            return;
        }

        const sceneData = window.getSceneData ? window.getSceneData() : null;
        if (!sceneData) {
            this.showNotification('无法获取场景数据', 'error');
            return;
        }

        const scene = this.currentProject.scenes?.find(s => s.id === this.currentSceneId);
        if (scene) {
            scene.data = sceneData;
            scene.updatedAt = new Date().toISOString();
            this.currentProject.updatedAt = new Date().toISOString();
            this.saveProjectsToStorage();
            this.showNotification('场景已保存', 'success');
        }
    }

    // ============ 用户内容过滤 ============

    updateCollaborationUI() {
        const projectInfo = document.getElementById('current-project-info');
        const userFilterSection = document.getElementById('user-filter-section');

        if (this.currentProject) {
            document.getElementById('current-project-name').textContent = this.currentProject.name;
            document.getElementById('current-project-owner').textContent = this.currentProject.ownerName || '本地用户';
            document.getElementById('current-project-collaborators').textContent = '本地模式';

            projectInfo.style.display = 'block';
            userFilterSection.style.display = 'block';
        } else {
            projectInfo.style.display = 'none';
            userFilterSection.style.display = 'none';
        }
    }

    setUserFilter(userId) {
        this.userFilter = userId;
        this.applyUserFilter();
    }

    setDimOtherContent(dim) {
        this.dimOtherContent = dim;
        this.applyUserFilter();
    }

    applyUserFilter() {
        window.userContentFilter = {
            filter: this.userFilter,
            dimOther: this.dimOtherContent,
            currentUserId: window.userManager?.currentUser?.id
        };

        if (window.needsRetrace !== undefined) {
            window.needsRetrace = true;
        }
    }

    // ============ 模态框管理 ============

    showProjectsModal() {
        const modal = document.getElementById('projects-modal');
        if (modal) modal.style.display = 'flex';
    }

    hideProjectsModal() {
        const modal = document.getElementById('projects-modal');
        if (modal) modal.style.display = 'none';
    }

    showCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        if (modal) {
            document.getElementById('project-name').value = '';
            document.getElementById('project-description').value = '';
            if (document.getElementById('project-tags')) {
                document.getElementById('project-tags').value = '';
            }
            modal.style.display = 'flex';
            this.hideProjectsModal();
        }
    }

    hideCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        if (modal) modal.style.display = 'none';
    }

    // ============ 事件处理 ============

    handleCreateProject(e) {
        e.preventDefault();

        const name = document.getElementById('project-name')?.value?.trim();
        const description = document.getElementById('project-description')?.value?.trim();
        const tagsInput = document.getElementById('project-tags')?.value?.trim();
        const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

        if (!name) {
            this.showNotification('请输入项目名称', 'error');
            return;
        }

        this.createProject({ name, description, tags });
    }

    // ============ 工具方法 ============

    filterProjects(searchTerm) {
        if (!searchTerm) {
            this.renderProjects(this.projects);
            return;
        }
        const filtered = this.projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderProjects(filtered);
    }

    filterProjectsModal(searchTerm) {
        if (!searchTerm) {
            this.renderProjectsModal(this.projects);
            return;
        }
        const filtered = this.projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderProjectsModal(filtered);
    }

    showNotification(message, type = 'info') {
        if (window.showTemporaryMessage) {
            window.showTemporaryMessage(message, type);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span class="notification-message">${message}</span>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 导入项目文件
     */
    importProject(fileContent) {
        try {
            const projectData = JSON.parse(fileContent);
            
            // 生成新ID避免冲突
            projectData.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            projectData.updatedAt = new Date().toISOString();
            
            this.projects.push(projectData);
            this.saveProjectsToStorage();
            this.renderProjects(this.projects);
            this.renderProjectsModal(this.projects);
            
            this.showNotification(`项目"${projectData.name}"已导入`, 'success');
        } catch (error) {
            console.error('导入项目错误:', error);
            this.showNotification('导入失败：文件格式错误', 'error');
        }
    }
}

// 初始化项目管理器
document.addEventListener('DOMContentLoaded', () => {
    window.projectManager = new ProjectManager();
});

console.log("projectManager.js: Local Project Manager loaded successfully!");
