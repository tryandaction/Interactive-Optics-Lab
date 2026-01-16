/**
 * UnifiedProjectPanel.js - 统一项目面板
 * 整合项目管理、场景管理、同步功能的 UI 控制器
 */

import { ProjectManager } from '../managers/ProjectManager.js';
import { ActiveSceneManager } from '../managers/ActiveSceneManager.js';
import { SyncService } from '../managers/SyncService.js';
import { ProjectTreeRenderer } from './ProjectTreeRenderer.js';

export class UnifiedProjectPanel {
    constructor(containerSelector) {
        console.log('[UnifiedProjectPanel] Constructor called with selector:', containerSelector);
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error('UnifiedProjectPanel: Container not found:', containerSelector);
            return;
        }
        console.log('[UnifiedProjectPanel] Container found:', this.container);

        // 初始化管理器
        this.projectManager = new ProjectManager();
        this.activeSceneManager = new ActiveSceneManager(this.projectManager);
        this.syncService = new SyncService();
        console.log('[UnifiedProjectPanel] Managers initialized');

        // 初始化 UI 组件
        this.treeRenderer = null;
        
        this.init();
    }

    init() {
        console.log('[UnifiedProjectPanel] init() called');
        this.renderPanel();
        this.bindEvents();
        this.activeSceneManager.init();

        // 初始化树渲染器
        const treeContainer = this.container.querySelector('.project-tree-container');
        if (treeContainer) {
            this.treeRenderer = new ProjectTreeRenderer(treeContainer, this.projectManager);
            this.treeRenderer.render();
        }
        console.log('[UnifiedProjectPanel] Initialization complete');
    }

    // ============ 渲染 ============

    renderPanel() {
        const isFileSystemSupported = this.projectManager.isFileSystemAPISupported();

        this.container.innerHTML = `
            <div class="unified-project-panel">
                <!-- 工具栏 -->
                <div class="project-panel-toolbar">
                    <button class="btn-icon with-badge" id="btn-new-project" title="新建项目">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                        <span class="badge-plus">+</span>
                    </button>
                    <button class="btn-icon" id="btn-open-project" title="打开项目">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                        </svg>
                    </button>
                    <button class="btn-icon with-badge" id="btn-new-scene" title="新建场景" disabled>
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                        <span class="badge-plus">+</span>
                    </button>
                    <div class="toolbar-spacer"></div>
                    <button class="btn-icon" id="btn-sync" title="同步到 GitHub" style="display: none;">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                        </svg>
                    </button>
                </div>

                <!-- 项目树 -->
                <div class="project-tree-container">
                    <!-- 由 ProjectTreeRenderer 渲染 -->
                </div>

                <!-- 同步状态 -->
                <div class="sync-status-bar" style="display: none;">
                    <span class="sync-status-icon">⏳</span>
                    <span class="sync-status-text">准备同步...</span>
                </div>

                <!-- 最近项目 -->
                <div class="recent-projects-section">
                    <h5>最近项目</h5>
                    <div class="recent-projects-list">
                        <!-- 动态渲染 -->
                    </div>
                </div>

                ${!isFileSystemSupported ? `
                    <div class="fallback-notice">
                        <span>⚠️</span>
                        <span>浏览器不支持文件系统 API，使用本地存储模式</span>
                    </div>
                ` : ''}
            </div>
        `;

        this.renderRecentProjects();
    }

    renderRecentProjects() {
        const recentList = this.container.querySelector('.recent-projects-list');
        if (!recentList) return;

        const recentProjects = this.projectManager.getRecentProjects();

        if (recentProjects.length === 0) {
            recentList.innerHTML = '<p class="placeholder-text">暂无最近项目</p>';
            return;
        }

        recentList.innerHTML = recentProjects.map(project => `
            <div class="recent-project-item" data-id="${project.id}" data-mode="${project.storageMode}">
                <span class="recent-project-icon">${this.getStorageIcon(project.storageMode)}</span>
                <span class="recent-project-name">${this.escapeHtml(project.name)}</span>
            </div>
        `).join('');

        // 绑定点击事件
        recentList.querySelectorAll('.recent-project-item').forEach(item => {
            item.addEventListener('click', () => {
                this.openRecentProject(item.dataset.id, item.dataset.mode);
            });
        });
    }

    getStorageIcon(storageMode) {
        switch (storageMode) {
            case 'github': return '🐙';
            case 'local': return '💾';
            default: return '🗄️';
        }
    }

    // ============ 事件绑定 ============

    bindEvents() {
        console.log('[UnifiedProjectPanel] bindEvents() called');
        
        // 使用事件委托来处理工具栏按钮点击
        // 这样即使按钮在 DOM 中被重新创建，事件也能正常工作
        this.container.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const buttonId = target.id;
            console.log('[UnifiedProjectPanel] Button clicked:', buttonId, target);
            
            switch (buttonId) {
                case 'btn-new-project':
                    console.log('[UnifiedProjectPanel] New project button clicked via delegation');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showCreateProjectModal();
                    break;
                case 'btn-open-project':
                    console.log('[UnifiedProjectPanel] Open project button clicked via delegation');
                    e.preventDefault();
                    e.stopPropagation();
                    this.openProject();
                    break;
                case 'btn-new-scene':
                    console.log('[UnifiedProjectPanel] New scene button clicked via delegation');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showCreateSceneModal();
                    break;
                case 'btn-sync':
                    console.log('[UnifiedProjectPanel] Sync button clicked via delegation');
                    e.preventDefault();
                    e.stopPropagation();
                    this.showSyncModal();
                    break;
            }
        });
        
        console.log('[UnifiedProjectPanel] Event delegation set up on container');
        
        // 也直接绑定按钮事件作为备份
        const newProjectBtn = this.container.querySelector('#btn-new-project');
        const openProjectBtn = this.container.querySelector('#btn-open-project');
        const newSceneBtn = this.container.querySelector('#btn-new-scene');
        const syncBtn = this.container.querySelector('#btn-sync');
        
        console.log('[UnifiedProjectPanel] Direct button references:', {
            newProjectBtn: !!newProjectBtn,
            openProjectBtn: !!openProjectBtn,
            newSceneBtn: !!newSceneBtn,
            syncBtn: !!syncBtn
        });
        
        if (newProjectBtn) {
            newProjectBtn.onclick = (e) => {
                console.log('[UnifiedProjectPanel] New project button onclick fired');
                e.preventDefault();
                e.stopPropagation();
                this.showCreateProjectModal();
            };
        }

        if (openProjectBtn) {
            openProjectBtn.onclick = (e) => {
                console.log('[UnifiedProjectPanel] Open project button onclick fired');
                e.preventDefault();
                e.stopPropagation();
                this.openProject();
            };
        }

        if (newSceneBtn) {
            newSceneBtn.onclick = (e) => {
                console.log('[UnifiedProjectPanel] New scene button onclick fired');
                e.preventDefault();
                e.stopPropagation();
                this.showCreateSceneModal();
            };
        }

        if (syncBtn) {
            syncBtn.onclick = () => {
                this.showSyncModal();
            };
        }

        // 项目管理器事件
        this.projectManager.on('projectChanged', (project) => {
            this.updateToolbarState(project);
            this.renderRecentProjects();
        });

        this.projectManager.on('sceneLoaded', (scene) => {
            this.onSceneLoaded(scene);
        });

        // 处理未保存更改的确认
        this.projectManager.on('unsavedChangesDetected', async ({ scene, resolve }) => {
            const result = await this.showUnsavedChangesDialog(scene);
            resolve(result);
        });

        // 处理保存请求
        this.projectManager.on('saveRequested', async ({ scene, resolve, reject }) => {
            try {
                await this.saveCurrentSceneInternal();
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        // 同步服务事件
        this.syncService.on('statusChanged', ({ newStatus }) => {
            this.updateSyncStatus(newStatus);
        });

        // 树渲染器事件
        const treeContainer = this.container.querySelector('.project-tree-container');
        if (treeContainer) {
            treeContainer.addEventListener('projectTree:createProjectRequested', () => {
                this.showCreateProjectModal();
            });

            treeContainer.addEventListener('projectTree:openProjectRequested', () => {
                this.openProject();
            });

            treeContainer.addEventListener('projectTree:newSceneRequested', () => {
                this.showCreateSceneModal();
            });

            treeContainer.addEventListener('projectTree:syncRequested', () => {
                this.showSyncModal();
            });

            treeContainer.addEventListener('projectTree:renameRequested', (e) => {
                this.showRenameModal(e.detail.type, e.detail.id);
            });
        }

        // 活动场景管理器事件
        this.activeSceneManager.on('newSceneRequested', () => {
            this.showCreateSceneModal();
        });

        this.activeSceneManager.on('newProjectRequested', () => {
            this.showCreateProjectModal();
        });
    }

    updateToolbarState(project) {
        const newSceneBtn = this.container.querySelector('#btn-new-scene');
        const syncBtn = this.container.querySelector('#btn-sync');

        if (newSceneBtn) {
            newSceneBtn.disabled = !project;
        }

        if (syncBtn) {
            syncBtn.style.display = project?.storageMode === 'github' ? 'block' : 'none';
        }
    }

    updateSyncStatus(status) {
        const statusBar = this.container.querySelector('.sync-status-bar');
        if (!statusBar) return;

        const statusTexts = {
            idle: { icon: '✓', text: '已同步', show: false },
            pending: { icon: '⏳', text: '准备同步...', show: true },
            syncing: { icon: '🔄', text: '同步中...', show: true },
            success: { icon: '✓', text: '同步成功', show: true },
            error: { icon: '❌', text: '同步失败', show: true }
        };

        const statusInfo = statusTexts[status] || statusTexts.idle;
        
        statusBar.querySelector('.sync-status-icon').textContent = statusInfo.icon;
        statusBar.querySelector('.sync-status-text').textContent = statusInfo.text;
        statusBar.style.display = statusInfo.show ? 'flex' : 'none';

        // 成功后自动隐藏
        if (status === 'success') {
            setTimeout(() => {
                statusBar.style.display = 'none';
            }, 3000);
        }
    }

    // ============ 项目操作 ============

    async openProject() {
        try {
            await this.projectManager.openProject();
            
            // 展开项目节点
            const project = this.projectManager.getCurrentProject();
            if (project && this.treeRenderer) {
                this.treeRenderer.expandProject(project.id);
            }
        } catch (err) {
            if (!err.message.includes('取消')) {
                this.showNotification(`打开项目失败: ${err.message}`, 'error');
            }
        }
    }

    async openRecentProject(projectId, storageMode) {
        try {
            if (storageMode === 'localStorage') {
                await this.projectManager.openProject({ id: projectId, storageMode });
            } else {
                // 文件系统项目需要重新选择目录
                await this.projectManager.openProject();
            }

            const project = this.projectManager.getCurrentProject();
            if (project && this.treeRenderer) {
                this.treeRenderer.expandProject(project.id);
            }
        } catch (err) {
            if (!err.message.includes('取消')) {
                this.showNotification(`打开项目失败: ${err.message}`, 'error');
            }
        }
    }

    // ============ 场景操作 ============

    onSceneLoaded(scene) {
        console.log('[UnifiedProjectPanel] onSceneLoaded called with:', scene);
        // 通知主应用加载场景数据
        if (scene && scene.data) {
            const event = new CustomEvent('sceneDataLoaded', { 
                detail: { 
                    scene: scene
                }
            });
            console.log('[UnifiedProjectPanel] Dispatching sceneDataLoaded event');
            document.dispatchEvent(event);
        } else {
            console.error('[UnifiedProjectPanel] Invalid scene data in onSceneLoaded:', scene);
        }
    }

    // ============ 模态框 ============

    showCreateProjectModal() {
        console.log('[UnifiedProjectPanel] showCreateProjectModal called');
        
        try {
            const isFileSystemSupported = this.projectManager.isFileSystemAPISupported();
            console.log('[UnifiedProjectPanel] File System API supported:', isFileSystemSupported);
            
            const modalContent = `
                <h3>创建新项目</h3>
                <form id="create-project-form">
                    <div class="form-group">
                        <label for="project-name">项目名称</label>
                        <input type="text" id="project-name" required placeholder="输入项目名称">
                    </div>
                    <div class="form-group">
                        <label for="storage-mode">存储方式</label>
                        <select id="storage-mode">
                            ${isFileSystemSupported ? `
                                <option value="local">本地文件夹（选择保存位置）</option>
                                <option value="github">GitHub 仓库（关联已克隆的仓库）</option>
                            ` : ''}
                            <option value="localStorage">浏览器存储（无需选择位置）</option>
                        </select>
                    </div>
                    <div class="form-group storage-hint" id="storage-hint-local" ${isFileSystemSupported ? '' : 'style="display:none;"'}>
                        <small style="color: var(--text-color-light);">
                            点击"创建"后将弹出文件夹选择对话框，请选择一个位置来保存项目。
                        </small>
                    </div>
                    <div class="form-group storage-hint" id="storage-hint-github" style="display: none;">
                        <small style="color: var(--text-color-light);">
                            请先在本地克隆 GitHub 仓库，然后选择克隆的文件夹。
                        </small>
                    </div>
                    <div class="form-group storage-hint" id="storage-hint-localStorage" ${isFileSystemSupported ? 'style="display:none;"' : ''}>
                        <small style="color: var(--text-color-light);">
                            项目将保存在浏览器本地存储中，清除浏览器数据会丢失项目。
                        </small>
                    </div>
                    <div class="form-group github-options" style="display: none;">
                        <label for="github-url">GitHub 仓库 URL（可选）</label>
                        <input type="url" id="github-url" placeholder="https://github.com/user/repo">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel">取消</button>
                        <button type="submit" class="btn-primary">创建</button>
                    </div>
                </form>
            `;
            
            console.log('[UnifiedProjectPanel] Creating modal...');
            const modal = this.createModal('create-project-modal', modalContent);
            console.log('[UnifiedProjectPanel] Modal created:', modal);

            // 存储模式切换
            const storageModeSelect = modal.querySelector('#storage-mode');
            const githubOptions = modal.querySelector('.github-options');
            const hintLocal = modal.querySelector('#storage-hint-local');
            const hintGithub = modal.querySelector('#storage-hint-github');
            const hintLocalStorage = modal.querySelector('#storage-hint-localStorage');
            
            const updateHints = () => {
                const mode = storageModeSelect.value;
                githubOptions.style.display = mode === 'github' ? 'block' : 'none';
                if (hintLocal) hintLocal.style.display = mode === 'local' ? 'block' : 'none';
                if (hintGithub) hintGithub.style.display = mode === 'github' ? 'block' : 'none';
                if (hintLocalStorage) hintLocalStorage.style.display = mode === 'localStorage' ? 'block' : 'none';
            };
            
            storageModeSelect?.addEventListener('change', updateHints);

            // 表单提交
            modal.querySelector('#create-project-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = modal.querySelector('#project-name').value.trim();
                const storageMode = modal.querySelector('#storage-mode').value;
                const githubUrl = modal.querySelector('#github-url')?.value.trim();

                if (!name) {
                    this.showNotification('请输入项目名称', 'warning');
                    return;
                }

                try {
                    await this.projectManager.createProject({
                        name,
                        storageMode,
                        githubUrl
                    });

                    this.closeModal(modal);
                    this.showNotification('项目创建成功', 'success');

                    // 刷新最近项目列表
                    this.renderRecentProjects();

                    // 展开新项目
                    const project = this.projectManager.getCurrentProject();
                    if (project && this.treeRenderer) {
                        this.treeRenderer.expandProject(project.id);
                    }
                } catch (err) {
                    if (!err.message.includes('取消')) {
                        this.showNotification(`创建项目失败: ${err.message}`, 'error');
                    }
                }
            });

            modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
                this.closeModal(modal);
            });
            
            // 聚焦到输入框
            setTimeout(() => {
                modal.querySelector('#project-name')?.focus();
            }, 100);
            
        } catch (error) {
            console.error('[UnifiedProjectPanel] Error in showCreateProjectModal:', error);
            this.showNotification('创建项目对话框出错: ' + error.message, 'error');
        }
    }

    showCreateSceneModal() {
        console.log('[UnifiedProjectPanel] showCreateSceneModal called');
        const project = this.projectManager.getCurrentProject();
        console.log('[UnifiedProjectPanel] Current project:', project);
        
        // 如果没有打开的项目，提示用户先创建项目
        if (!project) {
            console.log('[UnifiedProjectPanel] No project open, showing confirm dialog');
            const confirmCreate = confirm('还没有打开的项目。是否先创建一个新项目？');
            if (confirmCreate) {
                this.showCreateProjectModal();
            }
            return;
        }
        
        const modal = this.createModal('create-scene-modal', `
            <h3>新建场景</h3>
            <p style="color: var(--text-color-light); font-size: 13px; margin-bottom: 15px;">
                项目: <strong>${this.escapeHtml(project.name)}</strong>
            </p>
            <form id="create-scene-form">
                <div class="form-group">
                    <label for="scene-name">场景名称</label>
                    <input type="text" id="scene-name" required placeholder="输入场景名称">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="use-current-canvas" checked>
                        使用当前画布内容
                    </label>
                    <small style="display: block; color: var(--text-color-light); margin-top: 5px;">
                        勾选后将保存当前画布上的所有元件到新场景
                    </small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">取消</button>
                    <button type="submit" class="btn-primary">创建</button>
                </div>
            </form>
        `);

        modal.querySelector('#create-scene-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = modal.querySelector('#scene-name').value.trim();
            const useCurrentCanvas = modal.querySelector('#use-current-canvas')?.checked;

            if (!name) {
                this.showNotification('请输入场景名称', 'warning');
                return;
            }

            try {
                // 创建场景
                const scene = await this.projectManager.createScene(name);
                
                // 如果选择使用当前画布内容，保存当前场景数据
                if (useCurrentCanvas && scene) {
                    // 获取当前画布数据
                    const components = window.components || [];
                    const settings = {
                        mode: window.currentMode || 'ray_trace',
                        showGrid: window.showGrid !== false,
                        maxRays: window.maxRaysPerSource || 100,
                        maxBounces: window.globalMaxBounces || 50,
                        minIntensity: window.globalMinIntensity || 0.001,
                        showArrows: window.globalShowArrows || false,
                        arrowSpeed: window.arrowAnimationSpeed || 100,
                        fastWhiteLightMode: window.fastWhiteLightMode || false
                    };
                    
                    console.log('[UnifiedProjectPanel] Saving scene with components:', components.length);
                    // 保存场景
                    await this.projectManager.saveScene(components, settings);
                }
                
                this.closeModal(modal);
                this.showNotification('场景创建成功', 'success');
                
                // 刷新树视图
                if (this.treeRenderer) {
                    this.treeRenderer.render();
                }
            } catch (err) {
                this.showNotification(`创建场景失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        // 聚焦到输入框
        setTimeout(() => {
            modal.querySelector('#scene-name')?.focus();
        }, 100);
    }

    showSyncModal() {
        const project = this.projectManager.getCurrentProject();
        if (!project || project.storageMode !== 'github') {
            this.showNotification('只有 GitHub 项目支持同步', 'warning');
            return;
        }

        const modal = this.createModal('sync-modal', `
            <h3>同步到 GitHub</h3>
            <form id="sync-form">
                <div class="form-group">
                    <label for="commit-message">提交信息</label>
                    <input type="text" id="commit-message" required placeholder="描述本次更改">
                </div>
                <div class="form-group">
                    <label>命令预览</label>
                    <pre id="command-preview" class="command-preview"></pre>
                </div>
                <div class="form-group">
                    <button type="button" id="btn-edit-template" class="btn-link">编辑命令模板</button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">取消</button>
                    <button type="button" id="btn-dry-run" class="btn-secondary">测试运行</button>
                    <button type="submit" class="btn-primary">执行同步</button>
                </div>
            </form>
        `);

        const messageInput = modal.querySelector('#commit-message');
        const previewEl = modal.querySelector('#command-preview');

        // 更新预览
        const updatePreview = () => {
            const result = this.syncService.dryRun(project, messageInput.value || 'Update');
            previewEl.textContent = result.commands;
        };

        messageInput?.addEventListener('input', updatePreview);
        updatePreview();

        // 测试运行
        modal.querySelector('#btn-dry-run')?.addEventListener('click', () => {
            const result = this.syncService.dryRun(project, messageInput.value || 'Update');
            alert(`命令预览:\n\n${result.commands}\n\n${result.validation.warnings.length > 0 ? '警告: ' + result.validation.warnings.join('\n') : ''}`);
        });

        // 编辑模板
        modal.querySelector('#btn-edit-template')?.addEventListener('click', () => {
            this.closeModal(modal);
            this.showSyncTemplateEditor();
        });

        // 执行同步
        modal.querySelector('#sync-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const message = messageInput.value.trim();
            if (!message) {
                this.showNotification('请输入提交信息', 'warning');
                return;
            }

            try {
                const result = await this.syncService.sync(project, message);
                this.closeModal(modal);
                
                // 显示命令供用户复制
                this.showCommandResult(result);
            } catch (err) {
                this.showNotification(`同步失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    showSyncTemplateEditor() {
        const project = this.projectManager.getCurrentProject();
        if (!project) return;

        const presets = this.syncService.getPresetTemplates();
        const variables = this.syncService.getAvailableVariables();

        const modal = this.createModal('template-editor-modal', `
            <h3>编辑同步命令模板</h3>
            <form id="template-form">
                <div class="form-group">
                    <label for="preset-select">预设模板</label>
                    <select id="preset-select">
                        <option value="">-- 选择预设 --</option>
                        ${presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="template-textarea">命令模板</label>
                    <textarea id="template-textarea" rows="6">${this.escapeHtml(project.syncCommandTemplate)}</textarea>
                </div>
                <div class="form-group">
                    <label>可用变量</label>
                    <div class="variables-list">
                        ${variables.map(v => `<code>${v.variable}</code> - ${v.description}`).join('<br>')}
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">取消</button>
                    <button type="submit" class="btn-primary">保存</button>
                </div>
            </form>
        `);

        const presetSelect = modal.querySelector('#preset-select');
        const textarea = modal.querySelector('#template-textarea');

        // 选择预设
        presetSelect?.addEventListener('change', () => {
            const preset = presets.find(p => p.id === presetSelect.value);
            if (preset) {
                textarea.value = preset.template;
            }
        });

        // 保存
        modal.querySelector('#template-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const template = textarea.value.trim();
            const validation = this.syncService.validateTemplate(template);

            if (!validation.valid) {
                this.showNotification(`模板无效: ${validation.errors.join(', ')}`, 'error');
                return;
            }

            if (validation.warnings.length > 0) {
                if (!confirm(`警告:\n${validation.warnings.join('\n')}\n\n是否继续保存?`)) {
                    return;
                }
            }

            try {
                await this.projectManager.updateSyncTemplate(template);
                this.closeModal(modal);
                this.showNotification('模板已保存', 'success');
            } catch (err) {
                this.showNotification(`保存失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    showCommandResult(result) {
        const modal = this.createModal('command-result-modal', `
            <h3>同步命令</h3>
            <p>${result.note}</p>
            <div class="form-group">
                <label>请在终端中执行以下命令:</label>
                <pre id="command-output" class="command-preview">${this.escapeHtml(result.commands)}</pre>
            </div>
            <div class="form-actions">
                <button type="button" id="btn-copy" class="btn-secondary">复制命令</button>
                <button type="button" class="btn-primary btn-close">关闭</button>
            </div>
        `);

        modal.querySelector('#btn-copy')?.addEventListener('click', () => {
            navigator.clipboard.writeText(result.commands).then(() => {
                this.showNotification('命令已复制到剪贴板', 'success');
            });
        });

        modal.querySelector('.btn-close')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    showRenameModal(type, id) {
        const project = this.projectManager.getCurrentProject();
        let currentName = '';

        if (type === 'project') {
            currentName = project?.name || '';
        } else if (type === 'scene') {
            const scene = project?.scenes.find(s => s.id === id);
            currentName = scene?.name || '';
        }

        const modal = this.createModal('rename-modal', `
            <h3>重命名</h3>
            <form id="rename-form">
                <div class="form-group">
                    <label for="new-name">新名称</label>
                    <input type="text" id="new-name" required value="${this.escapeHtml(currentName)}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">取消</button>
                    <button type="submit" class="btn-primary">确定</button>
                </div>
            </form>
        `);

        modal.querySelector('#rename-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newName = modal.querySelector('#new-name').value.trim();
            if (!newName) return;

            try {
                if (type === 'project') {
                    await this.projectManager.renameProject(newName);
                } else if (type === 'scene') {
                    await this.projectManager.renameScene(id, newName);
                }
                this.closeModal(modal);
                this.showNotification('重命名成功', 'success');
            } catch (err) {
                this.showNotification(`重命名失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    // ============ 模态框工具 ============

    createModal(id, content) {
        // 移除已存在的同ID模态框
        document.getElementById(id)?.remove();

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close-btn">×</span>
                ${content}
            </div>
        `;

        document.body.appendChild(modal);
        
        // 使用 display: flex 和 visible 类来显示模态框
        modal.style.display = 'flex';
        // 强制重排后添加 visible 类以触发过渡动画
        modal.offsetHeight; // 触发重排
        modal.classList.add('visible');

        // 关闭按钮
        modal.querySelector('.modal-close-btn')?.addEventListener('click', () => {
            this.closeModal(modal);
        });

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        return modal;
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.remove('visible');
            // 等待过渡动画完成后移除元素
            setTimeout(() => {
                modal.style.display = 'none';
                modal.remove();
            }, 200);
        }
    }

    // ============ 工具方法 ============

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        if (typeof window !== 'undefined' && window.showTemporaryMessage) {
            window.showTemporaryMessage(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // ============ 公共 API ============

    /**
     * 获取项目管理器
     */
    getProjectManager() {
        return this.projectManager;
    }

    /**
     * 获取活动场景管理器
     */
    getActiveSceneManager() {
        return this.activeSceneManager;
    }

    /**
     * 获取同步服务
     */
    getSyncService() {
        return this.syncService;
    }

    /**
     * 保存当前场景
     */
    async saveCurrentScene(components, settings) {
        return this.activeSceneManager.saveCurrentScene(components, settings);
    }

    /**
     * 标记场景已修改
     */
    markSceneAsModified() {
        this.activeSceneManager.markAsModified();
    }

    // ============ 未保存更改处理 ============

    /**
     * 显示未保存更改对话框
     * @param {Object} scene - 当前场景
     * @returns {Promise<string>} 'save' | 'discard' | 'cancel'
     */
    async showUnsavedChangesDialog(scene) {
        return new Promise((resolve) => {
            const sceneName = scene?.name || '当前场景';
            
            const modal = this.createModal('unsaved-changes-modal', `
                <div class="unsaved-changes-dialog">
                    <div class="dialog-icon">⚠️</div>
                    <h3>未保存的更改</h3>
                    <p>场景 "<strong>${this.escapeHtml(sceneName)}</strong>" 有未保存的更改。</p>
                    <p class="dialog-hint">是否要在切换前保存？</p>
                    <div class="form-actions dialog-buttons">
                        <button type="button" class="btn-cancel" data-action="cancel">取消</button>
                        <button type="button" class="btn-secondary btn-discard" data-action="discard">不保存</button>
                        <button type="button" class="btn-primary btn-save" data-action="save">保存</button>
                    </div>
                </div>
            `);

            const handleAction = (action) => {
                this.closeModal(modal);
                resolve(action);
            };

            modal.querySelector('.btn-cancel')?.addEventListener('click', () => handleAction('cancel'));
            modal.querySelector('.btn-discard')?.addEventListener('click', () => handleAction('discard'));
            modal.querySelector('.btn-save')?.addEventListener('click', async () => {
                try {
                    await this.saveCurrentSceneInternal();
                    handleAction('save');
                } catch (err) {
                    this.showNotification(`保存失败: ${err.message}`, 'error');
                    // 保存失败后不关闭对话框，让用户选择其他操作
                }
            });

            // ESC 键取消
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    handleAction('cancel');
                    document.removeEventListener('keydown', handleKeyDown);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
        });
    }

    /**
     * 内部保存当前场景方法
     * 从全局获取组件和设置并保存
     */
    async saveCurrentSceneInternal() {
        // 获取当前画布数据
        const components = window.components || [];
        const settings = {
            mode: window.currentMode || 'ray_trace',
            showGrid: window.showGrid !== false,
            maxRays: window.maxRaysPerSource || 100,
            maxBounces: window.globalMaxBounces || 50,
            minIntensity: window.globalMinIntensity || 0.001,
            showArrows: window.globalShowArrows || false,
            arrowSpeed: window.arrowAnimationSpeed || 100,
            fastWhiteLightMode: window.fastWhiteLightMode || false
        };

        console.log('[UnifiedProjectPanel] Saving scene with', components.length, 'components');
        
        // 保存场景
        await this.projectManager.saveScene(components, settings);
        
        // 触发全局保存事件
        document.dispatchEvent(new CustomEvent('sceneSaved'));
        
        this.showNotification('场景已保存', 'success');
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.UnifiedProjectPanel = UnifiedProjectPanel;
}
