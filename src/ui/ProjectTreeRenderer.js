/**
 * ProjectTreeRenderer.js - 项目树渲染器
 * 负责渲染项目和场景的树形结构
 */

export class ProjectTreeRenderer {
    constructor(container, projectManager) {
        this.container = container;
        this.projectManager = projectManager;
        this.expandedNodes = new Set();
        this.selectedNodeId = null;
        this.contextMenu = null;
        
        this.bindEvents();
    }

    // ============ 渲染 ============

    /**
     * 渲染项目树
     */
    render() {
        const project = this.projectManager.getCurrentProject();
        
        if (!project) {
            this.renderEmptyState();
            return;
        }

        const html = this.renderProject(project);
        this.container.innerHTML = html;
        this.bindNodeEvents();
    }

    /**
     * 渲染空状态
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <div class="project-tree-empty">
                <div class="empty-icon">📁</div>
                <p>没有打开的项目</p>
                <div class="empty-actions">
                    <button class="btn-create-project">创建项目</button>
                    <button class="btn-open-project">打开项目</button>
                </div>
            </div>
        `;

        this.container.querySelector('.btn-create-project')?.addEventListener('click', () => {
            this.emit('createProjectRequested');
        });

        this.container.querySelector('.btn-open-project')?.addEventListener('click', () => {
            this.emit('openProjectRequested');
        });
    }

    /**
     * 渲染项目节点
     */
    renderProject(project) {
        const isExpanded = this.expandedNodes.has(project.id);
        const storageIcon = this.getStorageIcon(project.storageMode);
        const currentScene = this.projectManager.getCurrentScene();

        return `
            <div class="project-tree">
                <div class="tree-node project-node ${isExpanded ? 'expanded' : ''}" 
                     data-id="${project.id}" 
                     data-type="project">
                    <span class="node-toggle">${isExpanded ? '▼' : '▶'}</span>
                    <span class="node-icon">${storageIcon}</span>
                    <span class="node-name">${this.escapeHtml(project.name)}</span>
                    ${project.storageMode === 'github' ? '<span class="sync-indicator" title="GitHub 项目">🔗</span>' : ''}
                </div>
                ${isExpanded ? this.renderScenes(project.scenes, currentScene?.id) : ''}
            </div>
        `;
    }

    /**
     * 渲染场景列表
     */
    renderScenes(scenes, currentSceneId) {
        if (!scenes || scenes.length === 0) {
            return `
                <div class="tree-children">
                    <div class="tree-node empty-node">
                        <span class="node-icon">📄</span>
                        <span class="node-name placeholder">暂无场景</span>
                    </div>
                </div>
            `;
        }

        const sceneNodes = scenes.map(scene => {
            const isActive = scene.id === currentSceneId;
            const isModified = this.projectManager.getCurrentScene()?.isModified && isActive;
            
            return `
                <div class="tree-node scene-node ${isActive ? 'active' : ''}" 
                     data-id="${scene.id}" 
                     data-type="scene"
                     draggable="true">
                    <span class="node-icon">📄</span>
                    <span class="node-name">${isModified ? '• ' : ''}${this.escapeHtml(scene.name)}</span>
                </div>
            `;
        }).join('');

        return `<div class="tree-children">${sceneNodes}</div>`;
    }

    /**
     * 获取存储模式图标
     */
    getStorageIcon(storageMode) {
        switch (storageMode) {
            case 'github':
                return '🐙'; // GitHub
            case 'local':
                return '💾'; // 本地文件夹
            case 'localStorage':
            default:
                return '🗄️'; // 浏览器存储
        }
    }

    // ============ 事件处理 ============

    bindEvents() {
        // 监听项目管理器事件
        this.projectManager.on('projectChanged', () => this.render());
        this.projectManager.on('sceneLoaded', () => this.render());
        this.projectManager.on('sceneCreated', () => this.render());
        this.projectManager.on('sceneDeleted', () => this.render());
        this.projectManager.on('sceneModified', () => this.render());
    }

    bindNodeEvents() {
        // 点击节点
        this.container.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', (e) => this.handleNodeClick(e, node));
            node.addEventListener('dblclick', (e) => this.handleNodeDoubleClick(e, node));
            node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
        });

        // 拖拽
        this.container.querySelectorAll('.scene-node').forEach(node => {
            node.addEventListener('dragstart', (e) => this.handleDragStart(e, node));
            node.addEventListener('dragover', (e) => this.handleDragOver(e, node));
            node.addEventListener('drop', (e) => this.handleDrop(e, node));
        });
    }

    async handleNodeClick(e, node) {
        const type = node.dataset.type;
        const id = node.dataset.id;

        if (type === 'project') {
            // 切换展开/折叠
            if (this.expandedNodes.has(id)) {
                this.expandedNodes.delete(id);
            } else {
                this.expandedNodes.add(id);
            }
            this.render();
        } else if (type === 'scene') {
            // 单击场景即可加载（跳转）
            this.selectedNodeId = id;
            
            // 检查是否是当前场景
            const currentScene = this.projectManager.getCurrentScene();
            if (currentScene && currentScene.id === id) {
                console.log('[ProjectTreeRenderer] Scene already loaded:', id);
                this.render();
                return;
            }

            try {
                console.log('[ProjectTreeRenderer] Loading scene (single click):', id);
                const scene = await this.projectManager.loadScene(id);
                console.log('[ProjectTreeRenderer] Scene loaded successfully:', scene);
                // 注意：不自动切换到属性面板，保持在项目面板
            } catch (err) {
                // 用户取消操作不需要显示错误
                if (err.message === '用户取消了操作') {
                    console.log('[ProjectTreeRenderer] Scene load cancelled by user');
                    return;
                }
                console.error('[ProjectTreeRenderer] Failed to load scene:', err);
                this.showNotification(`加载场景失败: ${err.message}`, 'error');
            }
        }
    }

    handleNodeDoubleClick(e, node) {
        const type = node.dataset.type;
        const id = node.dataset.id;

        if (type === 'scene') {
            // 双击场景进入重命名模式
            e.preventDefault();
            e.stopPropagation();
            this.startInlineRename(node, id);
        } else if (type === 'project') {
            // 双击项目也可以重命名
            e.preventDefault();
            e.stopPropagation();
            this.startInlineRename(node, id, 'project');
        }
    }

    /**
     * 开始内联重命名
     */
    startInlineRename(node, id, type = 'scene') {
        const nameSpan = node.querySelector('.node-name');
        if (!nameSpan) return;

        const currentName = nameSpan.textContent.replace(/^• /, ''); // 移除修改标记
        const originalHtml = nameSpan.innerHTML;

        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'inline-rename-input';
        input.style.cssText = `
            width: 100%;
            padding: 2px 4px;
            font-size: inherit;
            font-family: inherit;
            border: 1px solid var(--primary-color, #0078d4);
            border-radius: 3px;
            outline: none;
            background: var(--input-bg, #fff);
            color: var(--input-text, #333);
            box-sizing: border-box;
        `;

        nameSpan.innerHTML = '';
        nameSpan.appendChild(input);
        input.focus();
        input.select();

        const finishRename = async (save) => {
            const newName = input.value.trim();
            
            if (save && newName && newName !== currentName) {
                try {
                    if (type === 'scene') {
                        await this.projectManager.renameScene(id, newName);
                        this.showNotification('场景已重命名', 'success');
                    } else if (type === 'project') {
                        await this.projectManager.renameProject(newName);
                        this.showNotification('项目已重命名', 'success');
                    }
                } catch (err) {
                    console.error('Rename failed:', err);
                    this.showNotification(`重命名失败: ${err.message}`, 'error');
                    nameSpan.innerHTML = originalHtml;
                    return;
                }
            } else {
                nameSpan.innerHTML = originalHtml;
            }
            
            this.render();
        };

        input.addEventListener('blur', () => finishRename(true));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishRename(false);
            }
        });

        // 阻止点击事件冒泡
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('dblclick', (e) => e.stopPropagation());
    }

    handleContextMenu(e, node) {
        e.preventDefault();
        const type = node.dataset.type;
        const id = node.dataset.id;

        this.showContextMenu(e.clientX, e.clientY, type, id);
    }

    // ============ 右键菜单 ============

    showContextMenu(x, y, type, id) {
        this.hideContextMenu();

        const isDarkTheme = document.body.getAttribute('data-ui-theme') === 'dark';
        
        const menu = document.createElement('div');
        menu.className = 'project-tree-context-menu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        // 动态设置主题相关样式
        if (isDarkTheme) {
            menu.style.background = 'var(--panel-bg, #343a40)';
            menu.style.borderColor = 'var(--border-color, #495057)';
            menu.style.color = 'var(--text-color, #dee2e6)';
            menu.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        }

        const items = this.getContextMenuItems(type, id);
        menu.innerHTML = items.map(item => {
            if (item.separator) {
                return `<hr style="border-top-color: var(--border-color, ${isDarkTheme ? '#495057' : '#eee'});">`;
            }
            const isDanger = item.action === 'delete';
            return `<div class="context-menu-item ${isDanger ? 'danger' : ''}" data-action="${item.action}">${item.label}</div>`;
        }).join('');

        document.body.appendChild(menu);
        this.contextMenu = menu;

        // 确保菜单在视口内
        const menuRect = menu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - menuRect.width - 8}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - menuRect.height - 8}px`;
        }

        // 绑定菜单项点击和悬停效果
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            const isDanger = item.classList.contains('danger');
            const normalColor = isDarkTheme ? 'var(--text-color, #dee2e6)' : 'var(--text-color, #333)';
            const dangerColor = '#dc3545';
            
            item.style.color = isDanger ? dangerColor : normalColor;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = isDanger ? dangerColor : 'var(--primary-color, #0078d4)';
                item.style.color = '#fff';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
                item.style.color = isDanger ? dangerColor : normalColor;
            });
            
            item.addEventListener('click', () => {
                this.handleContextMenuAction(item.dataset.action, type, id);
                this.hideContextMenu();
            });
        });

        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 0);
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    getContextMenuItems(type, id) {
        const project = this.projectManager.getCurrentProject();

        if (type === 'project') {
            const items = [
                { label: '新建场景', action: 'newScene' },
                { label: '新建子文件夹', action: 'newSubFolder' },
                { separator: true },
                { label: '重命名', action: 'rename' },
                { label: '关闭项目', action: 'close' }
            ];

            if (project?.storageMode === 'github') {
                items.splice(2, 0, { label: '同步到 GitHub', action: 'sync' });
            }

            return items;
        }

        if (type === 'scene') {
            return [
                { label: '打开', action: 'open' },
                { separator: true },
                { label: '重命名', action: 'rename' },
                { label: '复制', action: 'duplicate' },
                { separator: true },
                { label: '删除', action: 'delete' }
            ];
        }

        return [];
    }

    async handleContextMenuAction(action, type, id) {
        try {
            switch (action) {
                case 'newScene':
                    this.emit('newSceneRequested');
                    break;
                case 'newSubFolder':
                    this.emit('newSubFolderRequested');
                    break;
                case 'sync':
                    this.emit('syncRequested');
                    break;
                case 'rename':
                    this.emit('renameRequested', { type, id });
                    break;
                case 'close':
                    this.projectManager.closeProject();
                    break;
                case 'open':
                    await this.projectManager.loadScene(id);
                    break;
                case 'duplicate':
                    this.emit('duplicateSceneRequested', { id });
                    break;
                case 'delete':
                    if (confirm('确定要删除这个场景吗？')) {
                        await this.projectManager.deleteScene(id);
                    }
                    break;
            }
        } catch (err) {
            console.error(`Action ${action} failed:`, err);
            this.showNotification(`操作失败: ${err.message}`, 'error');
        }
    }

    // ============ 拖拽 ============

    handleDragStart(e, node) {
        e.dataTransfer.setData('text/plain', node.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        node.classList.add('dragging');
    }

    handleDragOver(e, node) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e, node) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = node.dataset.id;

        if (draggedId !== targetId) {
            this.emit('sceneMoved', { fromId: draggedId, toId: targetId });
        }

        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    }

    // ============ 事件发射 ============

    emit(event, data = {}) {
        const customEvent = new CustomEvent(`projectTree:${event}`, { detail: data });
        this.container.dispatchEvent(customEvent);
    }

    // ============ 工具方法 ============

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        if (typeof window !== 'undefined' && window.showTemporaryMessage) {
            window.showTemporaryMessage(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    /**
     * 展开项目节点
     */
    expandProject(projectId) {
        this.expandedNodes.add(projectId);
        this.render();
    }

    /**
     * 折叠项目节点
     */
    collapseProject(projectId) {
        this.expandedNodes.delete(projectId);
        this.render();
    }

    /**
     * 刷新视图
     */
    refresh() {
        this.render();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ProjectTreeRenderer = ProjectTreeRenderer;
}
