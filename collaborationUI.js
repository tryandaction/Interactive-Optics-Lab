/**
 * 协作功能UI界面
 * 为无服务器协作管理器提供用户界面，与现有项目管理器对接
 */

class CollaborationUI {
    constructor() {
        this.manager = window.collaborationManager;
        this.projectManager = window.projectManager;
        this.init();
    }

    init() {
        this.createCollaborationPanel();
        this.attachEventListeners();
        this.updateAllDisplays();
    }

    // ==================== UI创建 ====================

    createCollaborationPanel() {
        // 检查协作标签页是否已存在（HTML中已定义）
        const collabTab = document.querySelector('.tab-button[data-tab="collaboration-tab"]');
        const collabPanel = document.getElementById('collaboration-tab');

        if (!collabTab || !collabPanel) {
            console.warn('Collaboration tab not found in HTML, skipping panel creation');
            return;
        }

        // 协作标签页已存在，只需要更新内容
        console.log('Collaboration tab found, updating content');
        // 内容已在HTML中定义，无需额外创建
    }

    getCollaborationPanelHTML() {
        return `
            <div class="collaboration-panel">
                <!-- 项目信息区 -->
                <div class="section project-info-section">
                    <h3><i class="fas fa-folder-open"></i> 项目信息</h3>
                    <div class="project-info" id="project-info">
                        <div class="no-project" id="no-project-msg">
                            <p>当前没有打开的项目</p>
                            <button class="btn-primary" id="btn-create-project">
                                <i class="fas fa-plus"></i> 创建项目
                            </button>
                        </div>
                        <div class="project-details" id="project-details" style="display: none;">
                            <div class="info-row">
                                <label>项目名称：</label>
                                <span id="project-name"></span>
                            </div>
                            <div class="info-row">
                                <label>创建者：</label>
                                <span id="project-owner"></span>
                            </div>
                            <div class="info-row">
                                <label>协作者：</label>
                                <span id="project-collaborators"></span>
                            </div>
                            <div class="info-row">
                                <label>场景数：</label>
                                <span id="project-scenes"></span>
                            </div>
                            <div class="info-row">
                                <label>最后更新：</label>
                                <span id="project-updated"></span>
                            </div>
                            <div class="button-group">
                                <button class="btn-secondary" id="btn-export-project">
                                    <i class="fas fa-file-export"></i> 导出项目
                                </button>
                                <button class="btn-secondary" id="btn-import-project">
                                    <i class="fas fa-file-import"></i> 导入项目
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 用户管理区 -->
                <div class="section user-info-section">
                    <h3><i class="fas fa-user"></i> 用户管理</h3>
                    <div class="user-card" id="current-user-card">
                        <div class="user-avatar" id="user-avatar"></div>
                        <div class="user-details">
                            <div class="user-name" id="user-name">加载中...</div>
                            <div class="user-id" id="user-id"></div>
                        </div>
                        <button class="btn-small" id="btn-change-user">
                            <i class="fas fa-edit"></i> 更换用户
                        </button>
                    </div>
                </div>

                <!-- 协作者列表 -->
                <div class="section collaborators-section">
                    <h3><i class="fas fa-users"></i> 协作者列表</h3>
                    <div class="collaborators-list" id="collaborators-list">
                        <p class="empty-msg">没有协作者信息</p>
                    </div>
                </div>

                <!-- 用户内容过滤器 -->
                <div class="section filter-section">
                    <h3><i class="fas fa-filter"></i> 内容过滤器</h3>
                    <p class="filter-description">
                        选择要高亮显示的用户内容，其他用户的内容会变暗显示
                    </p>
                    <div class="filter-options" id="filter-options">
                        <label class="filter-option">
                            <input type="radio" name="user-filter" value="all" checked>
                            <span><i class="fas fa-eye"></i> 显示所有（无过滤）</span>
                        </label>
                        <label class="filter-option">
                            <input type="radio" name="user-filter" value="self">
                            <span><i class="fas fa-user"></i> 仅高亮我的内容</span>
                        </label>
                        <label class="filter-option">
                            <input type="radio" name="user-filter" value="others">
                            <span><i class="fas fa-users"></i> 仅高亮他人内容</span>
                        </label>
                        <div id="specific-user-filters"></div>
                    </div>
                </div>

                <!-- 场景管理 -->
                <div class="section scenes-section">
                    <h3><i class="fas fa-image"></i> 场景管理</h3>
                    <div class="scenes-list" id="scenes-list">
                        <p class="empty-msg">没有场景</p>
                    </div>
                    <div class="button-group">
                        <button class="btn-primary" id="btn-new-scene">
                            <i class="fas fa-plus"></i> 新建场景
                        </button>
                        <button class="btn-secondary" id="btn-save-scene">
                            <i class="fas fa-save"></i> 保存当前场景
                        </button>
                    </div>
                </div>

                <!-- 协作提示 -->
                <div class="section help-section">
                    <h3><i class="fas fa-info-circle"></i> 协作提示</h3>
                    <div class="help-content">
                        <p><strong>快捷键：</strong></p>
                        <p>• Ctrl+Shift+P: 新建项目</p>
                        <p>• Ctrl+Shift+S: 保存场景</p>
                        <p>• Ctrl+Shift+E: 导出项目</p>
                        <p>• 数字键1-3: 切换过滤器</p>
                    </div>
                </div>
            </div>

            <input type="file" id="project-file-input" accept=".opticsproject,.opticsscene" style="display: none;">
        `;
    }

    // ==================== 事件监听 ====================

    attachEventListeners() {
        // 用户管理
        document.getElementById('btn-change-user')?.addEventListener('click', () => {
            this.manager.changeUser();
            this.updateUserDisplay();
        });

        // 项目管理
        document.getElementById('btn-create-project')?.addEventListener('click', () => {
            this.createNewProject();
        });

        document.getElementById('btn-import-project')?.addEventListener('click', () => {
            document.getElementById('project-file-input').click();
        });

        document.getElementById('project-file-input')?.addEventListener('change', (e) => {
            this.importProject(e.target.files[0]);
        });

        document.getElementById('btn-export-project')?.addEventListener('click', () => {
            this.manager.exportProject();
        });

        // 场景管理
        document.getElementById('btn-new-scene')?.addEventListener('click', () => {
            this.createNewScene();
        });

        document.getElementById('btn-save-scene')?.addEventListener('click', () => {
            this.saveCurrentScene();
        });

        // 用户过滤器
        document.querySelectorAll('input[name="user-filter"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.manager.setUserFilter(e.target.value);
                this.refreshCanvas();
            });
        });

        // 监听协作更新事件
        window.addEventListener('collaboration-update', () => {
            this.updateAllDisplays();
        });

        // 监听标签页切换
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    // ==================== 项目操作 ====================

    createNewProject() {
        const projectName = prompt('输入项目名称：', '我的光学项目');
        if (!projectName) return;

        const project = this.manager.createNewProject(projectName);
        if (project) {
            this.showNotification('项目创建成功！', 'success');
            this.updateAllDisplays();
        }
    }

    async importProject(file) {
        if (!file) return;

        try {
            const project = await this.manager.importProject(file);
            this.showNotification(`项目 "${project.name}" 导入成功！`, 'success');
            this.updateAllDisplays();

            // 如果项目有场景，加载第一个场景
            if (project.scenes && project.scenes.length > 0) {
                this.loadScene(project.scenes[0].id);
            }
        } catch (error) {
            this.showNotification('导入失败：' + error.message, 'error');
        }
    }

    // ==================== 场景操作 ====================

    createNewScene() {
        const sceneName = prompt('输入场景名称：', '未命名场景');
        if (!sceneName) return;

        // 获取当前画布上的所有元件
        const components = window.components || [];

        // 为所有元件标记所有权
        const markedComponents = components.map(comp =>
            this.manager.markComponentOwnership({...comp})
        );

        const sceneData = {
            components: markedComponents,
            settings: {
                gridSize: window.gridSize || 20,
                showGrid: window.showGrid !== false
            }
        };

        const scene = this.manager.createScene(sceneName, sceneData);
        if (scene) {
            this.showNotification('场景创建成功！', 'success');
            this.updateScenesDisplay();
        }
    }

    saveCurrentScene() {
        if (!this.manager.currentProject) {
            this.showNotification('请先创建或加载项目', 'warning');
            return;
        }

        const scenes = this.manager.getScenesList();
        if (scenes.length === 0) {
            this.showNotification('没有可保存的场景，请先创建场景', 'warning');
            return;
        }

        // 选择要保存到的场景
        const sceneOptions = scenes.map((s, i) => `${i + 1}. ${s.name}`).join('\n');
        const choice = prompt(`选择要保存到的场景（输入编号）：\n${sceneOptions}`);

        if (!choice) return;

        const index = parseInt(choice) - 1;
        if (index < 0 || index >= scenes.length) {
            this.showNotification('无效的选择', 'error');
            return;
        }

        const scene = scenes[index];
        const components = window.components || [];

        // 更新元件所有权信息
        const updatedComponents = components.map(comp =>
            this.manager.updateComponentOwnership({...comp})
        );

        const sceneData = {
            components: updatedComponents,
            settings: {
                gridSize: window.gridSize || 20,
                showGrid: window.showGrid !== false
            }
        };

        if (this.manager.updateScene(scene.id, sceneData)) {
            this.showNotification('场景保存成功！', 'success');
            this.updateScenesDisplay();
        }
    }

    loadScene(sceneId) {
        const scene = this.manager.currentProject.scenes.find(s => s.id === sceneId);
        if (!scene) return;

        // 清空当前画布
        if (window.components) {
            window.components.length = 0;
        }

        // 加载场景元件
        if (scene.components && scene.components.length > 0) {
            // 这里需要根据您的实际元件类定义来重建元件对象
            // 假设有一个全局函数来创建元件
            scene.components.forEach(compData => {
                if (window.createComponentFromData) {
                    const component = window.createComponentFromData(compData);
                    if (component) {
                        window.components.push(component);
                    }
                }
            });
        }

        // 应用场景设置
        if (scene.settings) {
            if (scene.settings.gridSize) window.gridSize = scene.settings.gridSize;
            if (scene.settings.showGrid !== undefined) window.showGrid = scene.settings.showGrid;
        }

        // 刷新画布
        this.refreshCanvas();

        this.showNotification(`场景 "${scene.name}" 加载成功！`, 'success');
    }

    deleteScene(sceneId) {
        if (!confirm('确定要删除这个场景吗？')) return;

        if (this.manager.deleteScene(sceneId)) {
            this.showNotification('场景已删除', 'success');
            this.updateScenesDisplay();
        }
    }

    // ==================== UI更新 ====================

    updateAllDisplays() {
        // 使用现有的HTML结构更新显示
        this.updateProjectDisplay();
        this.updateUserFilterOptions();
        console.log('updateAllDisplays called - using existing HTML structure');
    }

    updateUserDisplay() {
        // 使用现有的HTML结构，不需要额外创建元素
        // 协作信息已在HTML中定义，直接使用现有的元素
        console.log('updateUserDisplay called - using existing HTML structure');
    }

    updateProjectDisplay() {
        // 使用现有的HTML结构更新项目信息
        const project = this.projectManager?.currentProject;
        const hasProject = !!project;

        const projectInfo = document.getElementById('current-project-info');
        if (projectInfo) {
            projectInfo.style.display = hasProject ? 'block' : 'none';
        }

        if (project) {
            // 更新项目名称
            const nameEl = document.getElementById('current-project-name');
            if (nameEl) nameEl.textContent = project.name;

            // 更新项目所有者
            const ownerEl = document.getElementById('current-project-owner');
            if (ownerEl) ownerEl.textContent = project.ownerId?.username || '未知';

            // 更新协作者列表
            const collabEl = document.getElementById('current-project-collaborators');
            if (collabEl) {
                collabEl.textContent = project.collaborators?.map(c => c.userId.username).join(', ') || '无';
            }
        }
    }

    updateCollaboratorsDisplay() {
        const list = document.getElementById('collaborators-list');
        if (!list) return;

        const collaborators = this.manager.getCollaboratorsList();

        if (!collaborators || collaborators.length === 0) {
            list.innerHTML = '<p class="empty-msg">没有协作者信息</p>';
            return;
        }

        list.innerHTML = collaborators.map(collab => `
            <div class="collaborator-card ${collab.id === this.manager.currentUser.id ? 'current-user' : ''}">
                <div class="collaborator-avatar" style="background-color: ${collab.color}">
                    ${collab.username.charAt(0).toUpperCase()}
                </div>
                <div class="collaborator-info">
                    <div class="collaborator-name">
                        ${collab.username}
                        ${collab.id === this.manager.currentUser.id ? '<span class="badge">（你）</span>' : ''}
                    </div>
                    <div class="collaborator-role">${this.getRoleText(collab.role)}</div>
                    <div class="collaborator-meta">加入于 ${new Date(collab.joinedAt).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }

    updateScenesDisplay() {
        const list = document.getElementById('scenes-list');
        if (!list) return;

        const scenes = this.manager.getScenesList();

        if (!scenes || scenes.length === 0) {
            list.innerHTML = '<p class="empty-msg">没有场景</p>';
            return;
        }

        list.innerHTML = scenes.map(scene => `
            <div class="scene-card">
                <div class="scene-header">
                    <div class="scene-name">${scene.name}</div>
                    <div class="scene-actions">
                        <button class="btn-icon" onclick="collaborationUI.loadScene('${scene.id}')" title="加载场景">
                            <i class="fas fa-folder-open"></i>
                        </button>
                        <button class="btn-icon" onclick="collaborationUI.manager.exportScene('${scene.id}')" title="导出场景">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon btn-danger" onclick="collaborationUI.deleteScene('${scene.id}')" title="删除场景">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="scene-meta">
                    <div>创建者: ${scene.createdBy.username}</div>
                    <div>元件数: ${scene.components?.length || 0}</div>
                    <div>更新于: ${new Date(scene.updatedAt).toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    }

    updateUserFilterOptions() {
        // 使用现有的HTML结构更新用户过滤器选项
        const filterSelect = document.getElementById('user-content-filter');
        if (!filterSelect) return;

        const project = this.projectManager?.currentProject;
        if (!project) {
            // 清空选项
            filterSelect.innerHTML = '<option value="all">显示全部</option><option value="mine">仅显示我的内容</option>';
            return;
        }

        // 重置选项
        filterSelect.innerHTML = '<option value="all">显示全部</option><option value="mine">仅显示我的内容</option>';

        // 添加协作者选项
        if (project.collaborators && project.collaborators.length > 0) {
            project.collaborators.forEach(collaborator => {
                const option = document.createElement('option');
                option.value = collaborator.userId._id;
                option.textContent = `仅显示 ${collaborator.userId.username} 的内容`;
                filterSelect.appendChild(option);
            });
        }
    }

    // ==================== 辅助方法 ====================

    getRoleText(role) {
        const roleMap = {
            'owner': '所有者',
            'editor': '编辑者',
            'viewer': '查看者'
        };
        return roleMap[role] || role;
    }

    switchTab(tabName) {
        // 切换标签按钮状态
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 切换标签内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });
    }

    refreshCanvas() {
        // 触发画布重绘
        if (window.draw) {
            window.draw();
        }
    }

    showNotification(message, type = 'info') {
        // 使用全局通知系统
        if (window.showTemporaryMessage) {
            window.showTemporaryMessage(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
}

// 创建全局实例
window.collaborationUI = new CollaborationUI();