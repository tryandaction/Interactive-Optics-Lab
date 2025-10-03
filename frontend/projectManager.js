// projectManager.js - 项目管理和协作功能

class ProjectManager {
    constructor() {
        this.currentProject = null;
        this.collaborationSession = null;
        this.userFilter = 'all';
        this.dimOtherContent = true;
        this.apiBaseUrl = 'http://localhost:3000/api'; // 后端API地址
        this.init();
    }

    init() {
        this.bindEvents();
        // Only load projects if user is logged in
        if (window.userManager?.isUserLoggedIn()) {
            this.loadProjects();
        }

        // Listen for user login events
        this.setupUserLoginListener();
    }

    bindEvents() {
        // 菜单事件
        document.getElementById('menu-new-project')?.addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('menu-manage-projects')?.addEventListener('click', () => this.showProjectsModal());

        // 项目标签页事件
        document.getElementById('project-create-btn')?.addEventListener('click', () => this.showCreateProjectModal());
        document.getElementById('project-search')?.addEventListener('input', (e) => this.filterProjects(e.target.value));
        document.getElementById('project-category-filter')?.addEventListener('change', (e) => this.filterProjectsByCategory(e.target.value));
        document.getElementById('project-sort')?.addEventListener('change', (e) => this.sortProjects(e.target.value));

        // 协作标签页事件
        document.getElementById('user-content-filter')?.addEventListener('change', (e) => this.setUserFilter(e.target.value));
        document.getElementById('dim-other-content')?.addEventListener('change', (e) => this.setDimOtherContent(e.target.checked));
        document.getElementById('invite-collaborator-btn')?.addEventListener('click', () => this.showInviteCollaboratorModal());

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
        document.getElementById('refresh-projects')?.addEventListener('click', () => this.loadProjects());

        // 邀请协作者模态框
        document.getElementById('invite-collaborator-modal-close-btn')?.addEventListener('click', () => this.hideInviteCollaboratorModal());
        document.getElementById('invite-collaborator-form')?.addEventListener('submit', (e) => this.handleInviteCollaborator(e));
    }

    setupUserLoginListener() {
        // Listen for user login/logout events
        if (window.userManager) {
            // Override the original updateUI method to also load projects
            const originalUpdateUI = window.userManager.updateUI;
            window.userManager.updateUI = () => {
                originalUpdateUI.call(window.userManager);
                // Load projects when user logs in
                if (window.userManager.isUserLoggedIn()) {
                    this.loadProjects();
                } else {
                    // Clear projects when user logs out
                    this.renderProjects([]);
                    this.renderProjectsModal([]);
                    this.currentProject = null;
                    this.updateCollaborationUI();
                }
            };
        }
    }

    // ============ 项目管理功能 ============

    async loadProjects() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('加载项目失败');

            const data = await response.json();
            this.renderProjects(data.projects);
            this.renderProjectsModal(data.projects);
        } catch (error) {
            console.error('加载项目错误:', error);
            this.showNotification('加载项目失败', 'error');
        }
    }

    renderProjects(projects) {
        const container = document.getElementById('projects-list');
        if (!container) return;

        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有项目，请先创建一个新项目。</p>';
            return;
        }

        // 按层级排序：顶级项目在前，子项目在后
        const sortedProjects = this.sortProjectsByHierarchy(projects);

        container.innerHTML = sortedProjects.map(project => this.createProjectItemHTML(project)).join('');
        this.bindProjectItemEvents();
    }

    sortProjectsByHierarchy(projects) {
        // 按层级和创建时间排序
        return projects.sort((a, b) => {
            // 首先按层级排序（顶级项目在前）
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            // 同层级按创建时间排序
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    }

    renderProjectsModal(projects) {
        const container = document.getElementById('projects-modal-list');
        if (!container) return;

        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有项目。</p>';
            return;
        }

        // 按层级排序：顶级项目在前，子项目在后
        const sortedProjects = this.sortProjectsByHierarchy(projects);

        container.innerHTML = sortedProjects.map(project => this.createProjectModalItemHTML(project)).join('');
        this.bindProjectModalItemEvents();
    }

    createProjectItemHTML(project) {
        const isOwner = project.ownerId._id === window.userManager?.currentUser?.id;
        const collaboratorsCount = project.collaborators?.length || 0;
        const level = project.level || 0;
        const levelAttr = level > 0 ? `data-level="${level}"` : '';

        return `
            <div class="project-item" data-project-id="${project._id}" ${levelAttr} style="--level: ${level}">
                <div class="project-info">
                    <div class="project-name">
                        ${level > 0 ? '└─ ' : ''}${project.name}
                        ${level > 0 ? `<span class="project-level">(${level}级子项目)</span>` : ''}
                    </div>
                    <div class="project-meta">
                        所有者: ${project.ownerId.username} |
                        协作者: ${collaboratorsCount} |
                        更新: ${new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                    <div class="project-description">${project.description || '暂无描述'}</div>
                    <div class="project-stats">
                        场景数: ${project.scenes?.length || 0} |
                        子项目: ${project.children?.length || 0} |
                        标签: ${project.tags?.join(', ') || '无'}
                    </div>
                </div>
                <div class="project-actions">
                    <button class="project-action-btn load-btn" data-action="load">加载</button>
                    <button class="project-action-btn create-scene-btn" data-action="create-scene">创建场景</button>
                    ${isOwner ? '<button class="project-action-btn edit-btn" data-action="edit">编辑</button>' : ''}
                    ${isOwner ? '<button class="project-action-btn delete-btn" data-action="delete">删除</button>' : ''}
                </div>
            </div>
        `;
    }

    createProjectModalItemHTML(project) {
        return this.createProjectItemHTML(project); // 复用相同的HTML结构
    }

    bindProjectItemEvents() {
        document.querySelectorAll('.project-item').forEach(item => {
            const projectId = item.dataset.projectId;

            // 加载项目
            item.querySelector('[data-action="load"]')?.addEventListener('click', () => {
                this.loadProject(projectId);
            });

            // 创建场景
            item.querySelector('[data-action="create-scene"]')?.addEventListener('click', () => {
                this.createSceneForProject(projectId);
            });

            // 编辑项目
            item.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
                this.editProject(projectId);
            });

            // 删除项目
            item.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteProject(projectId);
            });
        });
    }

    bindProjectModalItemEvents() {
        // 模态框中的项目项事件绑定（与上面类似）
        this.bindProjectItemEvents();
    }

    async loadProject(projectId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('加载项目失败');

            const data = await response.json();
            this.currentProject = data.project;

            // 加载项目的场景
            if (data.project.scenes && data.project.scenes.length > 0) {
                // 加载第一个场景的数据到画布
                await this.loadProjectScene(data.project.scenes[0]);
            } else {
                // 项目没有场景，创建一个新的场景
                await this.createNewSceneForProject();
            }

            this.updateCollaborationUI();
            this.showNotification('项目加载成功', 'success');
            this.hideProjectsModal();

        } catch (error) {
            console.error('加载项目错误:', error);
            this.showNotification('加载项目失败', 'error');
        }
    }

    async loadProjectScene(sceneRef) {
        try {
            // 获取完整的场景数据
            const response = await fetch(`${this.apiBaseUrl}/scenes/${sceneRef.sceneId}`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('加载场景失败');

            const data = await response.json();
            const scene = data.scene;

            // 将场景数据加载到画布
            if (window.loadSceneData) {
                window.loadSceneData(scene.data);
                this.showNotification(`已加载场景: ${scene.name}`, 'success');
            } else {
                console.warn('loadSceneData function not available');
            }

        } catch (error) {
            console.error('加载项目场景错误:', error);
            this.showNotification('加载场景失败', 'error');
        }
    }

    async createNewSceneForProject() {
        if (!this.currentProject) return;

        try {
            const sceneName = `${this.currentProject.name} - 场景1`;
            const sceneData = {
                name: sceneName,
                description: `在项目"${this.currentProject.name}"中创建的场景`,
                projectId: this.currentProject._id,
                data: {
                    components: [],
                    mode: 'ray_trace'
                },
                tags: ['auto-generated']
            };

            const response = await fetch(`${this.apiBaseUrl}/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify(sceneData)
            });

            if (!response.ok) throw new Error('创建场景失败');

            const data = await response.json();

            // 将新场景添加到项目中
            await this.addSceneToProject(data.scene.id, sceneName);

            this.showNotification(`已为项目创建新场景: ${sceneName}`, 'success');

        } catch (error) {
            console.error('创建项目场景错误:', error);
            this.showNotification('创建场景失败', 'error');
        }
    }

    async addSceneToProject(sceneId, sceneName) {
        if (!this.currentProject) return;

        try {
            const sceneRef = {
                sceneId: sceneId,
                name: sceneName,
                order: this.currentProject.scenes ? this.currentProject.scenes.length : 0
            };

            const response = await fetch(`${this.apiBaseUrl}/projects/${this.currentProject._id}/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify({ sceneRef })
            });

            if (!response.ok) throw new Error('添加场景到项目失败');

            // 重新加载项目数据
            await this.loadProjects();

        } catch (error) {
            console.error('添加场景到项目错误:', error);
        }
    }

    async createSceneForProject(projectId) {
        try {
            // 获取项目信息
            const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('获取项目信息失败');

            const data = await response.json();
            const project = data.project;

            // 生成场景名称
            const sceneCount = project.scenes ? project.scenes.length + 1 : 1;
            const sceneName = `${project.name} - 场景${sceneCount}`;

            // 创建新场景
            const sceneData = {
                name: sceneName,
                description: `在项目"${project.name}"中创建的场景`,
                projectId: projectId,
                data: {
                    components: [],
                    mode: 'ray_trace'
                },
                tags: ['project-scene']
            };

            const createResponse = await fetch(`${this.apiBaseUrl}/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify(sceneData)
            });

            if (!createResponse.ok) throw new Error('创建场景失败');

            const createData = await createResponse.json();

            // 将场景添加到项目
            await this.addSceneToProjectById(projectId, createData.scene.id, sceneName);

            // 自动加载新创建的场景
            await this.loadProject(projectId);

            this.showNotification(`场景"${sceneName}"已创建并添加到项目`, 'success');

        } catch (error) {
            console.error('创建项目场景错误:', error);
            this.showNotification('创建场景失败', 'error');
        }
    }

    async addSceneToProjectById(projectId, sceneId, sceneName) {
        try {
            // 获取项目信息以确定场景顺序
            const projectResponse = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!projectResponse.ok) throw new Error('获取项目信息失败');

            const projectData = await projectResponse.json();
            const sceneOrder = projectData.project.scenes ? projectData.project.scenes.length : 0;

            const sceneRef = {
                sceneId: sceneId,
                name: sceneName,
                order: sceneOrder
            };

            const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/scenes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify({ sceneRef })
            });

            if (!response.ok) throw new Error('添加场景到项目失败');

        } catch (error) {
            console.error('添加场景到项目错误:', error);
            throw error;
        }
    }

    async createProject(projectData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify(projectData)
            });

            if (!response.ok) throw new Error('创建项目失败');

            const data = await response.json();
            this.showNotification('项目创建成功', 'success');
            this.hideCreateProjectModal();
            this.loadProjects();

            // 自动加载新创建的项目
            this.loadProject(data.project._id);

        } catch (error) {
            console.error('创建项目错误:', error);
            this.showNotification('创建项目失败', 'error');
        }
    }

    async deleteProject(projectId) {
        if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('删除项目失败');

            this.showNotification('项目删除成功', 'success');
            this.loadProjects();

            if (this.currentProject && this.currentProject._id === projectId) {
                this.currentProject = null;
                this.updateCollaborationUI();
            }

        } catch (error) {
            console.error('删除项目错误:', error);
            this.showNotification('删除项目失败', 'error');
        }
    }

    // ============ 协作功能 ============

    updateCollaborationUI() {
        const projectInfo = document.getElementById('current-project-info');
        const userFilterSection = document.getElementById('user-filter-section');

        if (this.currentProject) {
            // 显示项目信息
            document.getElementById('current-project-name').textContent = this.currentProject.name;
            document.getElementById('current-project-owner').textContent = this.currentProject.ownerId.username;
            document.getElementById('current-project-collaborators').textContent =
                this.currentProject.collaborators?.map(c => c.userId.username).join(', ') || '无';

            // 显示项目层级信息
            const levelInfo = this.currentProject.level > 0 ?
                ` (第${this.currentProject.level}级${this.currentProject.parentId ? '子项目' : '项目'})` : '';
            document.getElementById('current-project-name').textContent += levelInfo;

            // 显示场景数量
            const sceneCount = this.currentProject.scenes ? this.currentProject.scenes.length : 0;
            const sceneInfo = document.createElement('div');
            sceneInfo.textContent = `场景数量: ${sceneCount}`;
            sceneInfo.style.fontSize = '12px';
            sceneInfo.style.color = 'var(--text-color-secondary)';
            sceneInfo.style.marginTop = '4px';

            // 移除之前的场景信息（如果存在）
            const existingSceneInfo = projectInfo.querySelector('.scene-count-info');
            if (existingSceneInfo) {
                existingSceneInfo.remove();
            }
            sceneInfo.className = 'scene-count-info';
            projectInfo.appendChild(sceneInfo);

            projectInfo.style.display = 'block';
            userFilterSection.style.display = 'block';

            // 更新用户过滤器选项
            this.updateUserFilterOptions();
        } else {
            projectInfo.style.display = 'none';
            userFilterSection.style.display = 'none';
        }
    }

    updateUserFilterOptions() {
        const filterSelect = document.getElementById('user-content-filter');
        if (!filterSelect || !this.currentProject) return;

        // 清空现有选项
        filterSelect.innerHTML = '<option value="all">显示全部</option><option value="mine">仅显示我的内容</option>';

        // 添加协作者选项
        if (this.currentProject.collaborators) {
            this.currentProject.collaborators.forEach(collaborator => {
                const option = document.createElement('option');
                option.value = collaborator.userId._id;
                option.textContent = `仅显示 ${collaborator.userId.username} 的内容`;
                filterSelect.appendChild(option);
            });
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
        // 实现用户内容过滤逻辑
        // 设置全局过滤状态，让draw函数使用
        window.userContentFilter = {
            filter: this.userFilter,
            dimOther: this.dimOtherContent,
            currentUserId: window.userManager?.currentUser?.id
        };
        console.log('应用用户过滤:', this.userFilter, '淡化其他:', this.dimOtherContent);

        // 触发重绘
        if (window.needsRetrace !== undefined) {
            window.needsRetrace = true;
        }
    }

    // ============ 模态框管理 ============

    showProjectsModal() {
        document.getElementById('projects-modal').style.display = 'flex';
    }

    hideProjectsModal() {
        document.getElementById('projects-modal').style.display = 'none';
    }

    showCreateProjectModal() {
        const modal = document.getElementById('create-project-modal');
        if (modal) {
            // 清空表单
            document.getElementById('project-name').value = '';
            document.getElementById('project-description').value = '';
            document.getElementById('project-tags').value = '';
            document.getElementById('project-is-public').checked = false;

            // 加载可用的父项目
            this.loadParentProjectsForModal();

            modal.style.display = 'flex';
            // 隐藏项目模态框（如果打开的话）
            this.hideProjectsModal();
        }
    }

    hideCreateProjectModal() {
        document.getElementById('create-project-modal').style.display = 'none';
        // 重新显示项目模态框
        this.showProjectsModal();
    }

    async loadParentProjectsForModal() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/projects`, {
                headers: {
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                }
            });

            if (!response.ok) throw new Error('加载项目失败');

            const data = await response.json();
            const parentSelect = document.getElementById('project-parent');

            if (parentSelect) {
                // 清空现有选项
                parentSelect.innerHTML = '<option value="">无父项目（顶级项目）</option>';

                // 添加项目选项，只显示顶级项目（没有父项目的项目）
                const topLevelProjects = data.projects.filter(project => !project.parentId);

                topLevelProjects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project._id;
                    option.textContent = project.name;
                    parentSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载父项目错误:', error);
        }
    }

    showInviteCollaboratorModal() {
        if (!this.currentProject) {
            this.showNotification('请先加载一个项目', 'error');
            return;
        }

        document.getElementById('current-project-display').textContent = `项目: ${this.currentProject.name}`;
        document.getElementById('invite-collaborator-modal').style.display = 'flex';
    }

    hideInviteCollaboratorModal() {
        document.getElementById('invite-collaborator-modal').style.display = 'none';
    }

    // ============ 事件处理 ============

    async handleCreateProject(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const projectData = {
            name: formData.get('project-name'),
            description: formData.get('project-description'),
            parentId: formData.get('project-parent') || undefined,
            tags: formData.get('project-tags')?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            settings: {
                isPublic: formData.has('project-is-public')
            }
        };

        await this.createProject(projectData);
    }

    async handleInviteCollaborator(e) {
        e.preventDefault();

        if (!this.currentProject) return;

        const formData = new FormData(e.target);
        const inviteData = {
            email: formData.get('collaborator-email'),
            permission: formData.get('collaborator-permission')
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/projects/${this.currentProject._id}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.userManager?.getAuthToken()}`
                },
                body: JSON.stringify(inviteData)
            });

            if (!response.ok) throw new Error('邀请发送失败');

            this.showNotification('邀请发送成功', 'success');
            this.hideInviteCollaboratorModal();

        } catch (error) {
            console.error('邀请协作者错误:', error);
            this.showNotification('邀请发送失败', 'error');
        }
    }

    // ============ 工具方法 ============

    filterProjects(searchTerm) {
        // TODO: 实现项目过滤
        console.log('过滤项目:', searchTerm);
    }

    filterProjectsByCategory(category) {
        // TODO: 实现分类过滤
        console.log('按分类过滤:', category);
    }

    sortProjects(sortBy) {
        // TODO: 实现项目排序
        console.log('排序项目:', sortBy);
    }

    filterProjectsModal(searchTerm) {
        // TODO: 实现模态框内项目过滤
        console.log('模态框过滤项目:', searchTerm);
    }

    showNotification(message, type = 'info') {
        // 使用全局通知系统
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    editProject(projectId) {
        // TODO: 实现项目编辑功能
        console.log('编辑项目:', projectId);
        this.showNotification('项目编辑功能开发中', 'info');
    }
}

// 初始化项目管理器
window.projectManager = new ProjectManager();