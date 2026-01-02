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
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error('UnifiedProjectPanel: Container not found:', containerSelector);
            return;
        }

        // 初始化管理器
        this.projectManager = new ProjectManager();
        this.activeSceneManager = new ActiveSceneManager(this.projectManager);
        this.syncService = new SyncService();

        // 初始化 UI 组件
        this.treeRenderer = null;
        
        this.init();
    }

    init() {
        this.renderPanel();
        this.bindEvents();
        this.activeSceneManager.init();

        // 初始化树渲染器
        const treeContainer = this.container.querySelector('.project-tree-container');
        if (treeContainer) {
            this.treeRenderer = new ProjectTreeRenderer(treeContainer, this.projectManager);
            this.treeRenderer.render();
        }
    }

    // ============ 渲染 ============

    renderPanel() {
        const isFileSystemSupported = this.projectManager.isFileSystemAPISupported();

        this.container.innerHTML = `
            <div class="unified-project-panel">
                <!-- 工具栏 -->
                <div class="project-panel-toolbar">
                    <button class="btn-icon" id="btn-new-project" title="新建项目">
                        <span>📁+</span>
                    </button>
                    <button class="btn-icon" id="btn-open-project" title="打开项目">
                        <span>📂</span>
                    </button>
                    <button class="btn-icon" id="btn-new-scene" title="新建场景" disabled>
                        <span>📄+</span>
                    </button>
                    <div class="toolbar-spacer"></div>
                    <button class="btn-icon" id="btn-sync" title="同步到 GitHub" style="display: none;">
                        <span>🔄</span>
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
        // 工具栏按钮
        this.container.querySelector('#btn-new-project')?.addEventListener('click', () => {
            this.showCreateProjectModal();
        });

        this.container.querySelector('#btn-open-project')?.addEventListener('click', () => {
            this.openProject();
        });

        this.container.querySelector('#btn-new-scene')?.addEventListener('click', () => {
            this.showCreateSceneModal();
        });

        this.container.querySelector('#btn-sync')?.addEventListener('click', () => {
            this.showSyncModal();
        });

        // 项目管理器事件
        this.projectManager.on('projectChanged', (project) => {
            this.updateToolbarState(project);
            this.renderRecentProjects();
        });

        this.projectManager.on('sceneLoaded', (scene) => {
            this.onSceneLoaded(scene);
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
        // 通知主应用加载场景数据
        if (scene && scene.data) {
            const event = new CustomEvent('sceneDataLoaded', { 
                detail: { 
                    scene,
                    components: scene.data.components,
                    settings: scene.data.settings
                }
            });
            document.dispatchEvent(event);
        }
    }

    // ============ 模态框 ============

    showCreateProjectModal() {
        const modal = this.createModal('create-project-modal', `
            <h3>创建新项目</h3>
            <form id="create-project-form">
                <div class="form-group">
                    <label for="project-name">项目名称</label>
                    <input type="text" id="project-name" required placeholder="输入项目名称">
                </div>
                <div class="form-group">
                    <label for="storage-mode">存储方式</label>
                    <select id="storage-mode">
                        ${this.projectManager.isFileSystemAPISupported() ? `
                            <option value="local">本地文件夹</option>
                            <option value="github">GitHub 仓库</option>
                        ` : ''}
                        <option value="localStorage">浏览器存储</option>
                    </select>
                </div>
                <div class="form-group github-options" style="display: none;">
                    <label for="github-url">GitHub 仓库 URL</label>
                    <input type="url" id="github-url" placeholder="https://github.com/user/repo">
                    <small>请先在本地克隆仓库</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">取消</button>
                    <button type="submit" class="btn-primary">创建</button>
                </div>
            </form>
        `);

        // 存储模式切换
        const storageModeSelect = modal.querySelector('#storage-mode');
        const githubOptions = modal.querySelector('.github-options');
        
        storageModeSelect?.addEventListener('change', () => {
            githubOptions.style.display = storageModeSelect.value === 'github' ? 'block' : 'none';
        });

        // 表单提交
        modal.querySelector('#create-project-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = modal.querySelector('#project-name').value.trim();
            const storageMode = modal.querySelector('#storage-mode').value;
            const githubUrl = modal.querySelector('#github-url')?.value.trim();

            try {
                await this.projectManager.createProject({
                    name,
                    storageMode,
                    githubUrl
                });

                this.closeModal(modal);
                this.showNotification('项目创建成功', 'success');

                // 展开新项目
                const project = this.projectManager.getCurrentProject();
                if (project && this.treeRenderer) {
                    this.treeRenderer.expandProject(project.id);
                }
            } catch (err) {
                this.showNotification(`创建项目失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
    }

    showCreateSceneModal() {
        const modal = this.createModal('create-scene-modal', `
            <h3>新建场景</h3>
            <form id="create-scene-form">
                <div class="form-group">
                    <label for="scene-name">场景名称</label>
                    <input type="text" id="scene-name" required placeholder="输入场景名称">
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

            try {
                await this.projectManager.createScene(name);
                this.closeModal(modal);
                this.showNotification('场景创建成功', 'success');
            } catch (err) {
                this.showNotification(`创建场景失败: ${err.message}`, 'error');
            }
        });

        modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
            this.closeModal(modal);
        });
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
        modal.style.display = 'flex';

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
            modal.style.display = 'none';
            modal.remove();
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
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.UnifiedProjectPanel = UnifiedProjectPanel;
}
