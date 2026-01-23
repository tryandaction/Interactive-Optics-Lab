/**
 * IconPalettePanel.js - 图标选择面板
 * 提供可视化的图标库浏览和选择界面
 * 
 * Requirements: 1.3, 1.7, 3.1, 3.2, 3.3, 3.7
 */

import { getProfessionalIconManager, ICON_CATEGORIES } from '../../diagram/ProfessionalIconManager.js';
import { getDragDropManager } from '../../diagram/DragDropManager.js';
import { getEventBus } from '../../diagram/EventBus.js';

/**
 * 图标选择面板类
 */
export class IconPalettePanel {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.iconManager = getProfessionalIconManager();
        this.dragDropManager = null; // 延迟初始化
        this.eventBus = getEventBus();
        
        // 状态
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.selectedIcon = null;
        this.hoveredIcon = null;
        this.visible = false;
        
        // 回调
        this.onIconSelect = null;
        this.onIconDragStart = null;
        this.onIconDrop = null;
        
        // 初始化
        this._initialize();
    }

    /**
     * 初始化面板
     * @private
     */
    _initialize() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`IconPalettePanel: Container "${this.containerId}" not found`);
            return;
        }
        
        this._buildUI();
        this._bindEvents();
        this._loadIcons();
    }

    /**
     * 构建UI结构
     * @private
     */
    _buildUI() {
        this.container.innerHTML = `
            <div class="icon-palette-panel">
                <div class="icon-palette-header">
                    <h3>Component Library</h3>
                    <button class="icon-palette-close" title="Close">×</button>
                </div>
                
                <div class="icon-palette-search">
                    <input type="text" 
                           class="icon-search-input" 
                           placeholder="Search components..."
                           autocomplete="off">
                    <span class="icon-search-icon">🔍</span>
                </div>
                
                <div class="icon-palette-categories">
                    <button class="category-btn active" data-category="all">All</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.SOURCES}">Sources</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.MIRRORS}">Mirrors</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.LENSES}">Lenses</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.SPLITTERS}">Splitters</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.MODULATORS}">Modulators</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.WAVEPLATES}">Waveplates</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.POLARIZERS}">Polarizers</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.DETECTORS}">Detectors</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.ATOMIC}">Atomic</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.FIBERS}">Fibers</button>
                    <button class="category-btn" data-category="${ICON_CATEGORIES.MISC}">Misc</button>
                </div>
                
                <div class="icon-palette-grid"></div>
                
                <div class="icon-palette-preview" style="display: none;">
                    <canvas class="icon-preview-canvas" width="200" height="200"></canvas>
                    <div class="icon-preview-info">
                        <div class="icon-preview-name"></div>
                        <div class="icon-preview-category"></div>
                        <div class="icon-preview-connections"></div>
                    </div>
                </div>
            </div>
        `;
        
        this._injectStyles();
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        if (document.getElementById('icon-palette-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'icon-palette-styles';
        style.textContent = `
            .icon-palette-panel {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--panel-bg, #f5f5f5);
                border-left: 1px solid var(--border-color, #ddd);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            }
            
            .icon-palette-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--header-bg, #fff);
                border-bottom: 1px solid var(--border-color, #ddd);
            }
            
            .icon-palette-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .icon-palette-close {
                background: none;
                border: none;
                font-size: 24px;
                color: var(--text-secondary, #666);
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                line-height: 1;
            }
            
            .icon-palette-close:hover {
                color: var(--text-color, #333);
            }
            
            .icon-palette-search {
                position: relative;
                padding: 12px 16px;
                background: var(--header-bg, #fff);
                border-bottom: 1px solid var(--border-color, #ddd);
            }
            
            .icon-search-input {
                width: 100%;
                padding: 8px 32px 8px 12px;
                border: 1px solid var(--border-color, #ddd);
                border-radius: 4px;
                font-size: 13px;
                outline: none;
            }
            
            .icon-search-input:focus {
                border-color: var(--primary-color, #4488ff);
            }
            
            .icon-search-icon {
                position: absolute;
                right: 24px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
                opacity: 0.5;
            }
            
            .icon-palette-categories {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 12px 16px;
                background: var(--header-bg, #fff);
                border-bottom: 1px solid var(--border-color, #ddd);
                max-height: 120px;
                overflow-y: auto;
            }
            
            .category-btn {
                padding: 6px 12px;
                border: 1px solid var(--border-color, #ddd);
                background: var(--button-bg, #fff);
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                white-space: nowrap;
            }
            
            .category-btn:hover {
                background: var(--button-hover-bg, #f0f0f0);
            }
            
            .category-btn.active {
                background: var(--primary-color, #4488ff);
                color: white;
                border-color: var(--primary-color, #4488ff);
            }
            
            .icon-palette-grid {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 12px;
                align-content: start;
            }
            
            .icon-palette-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                background: var(--item-bg, #fff);
                border: 2px solid transparent;
                border-radius: 6px;
                cursor: grab;
                transition: all 0.2s;
                user-select: none;
            }
            
            .icon-palette-item:hover {
                border-color: var(--primary-color, #4488ff);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }
            
            .icon-palette-item.selected {
                border-color: var(--primary-color, #4488ff);
                background: var(--primary-light, #e8f0ff);
            }
            
            .icon-palette-item:active {
                cursor: grabbing;
            }
            
            .icon-palette-item canvas {
                width: 60px;
                height: 60px;
                margin-bottom: 6px;
            }
            
            .icon-palette-item-name {
                font-size: 11px;
                color: var(--text-color, #333);
                text-align: center;
                word-break: break-word;
                line-height: 1.3;
            }
            
            .icon-palette-preview {
                padding: 16px;
                background: var(--header-bg, #fff);
                border-top: 1px solid var(--border-color, #ddd);
            }
            
            .icon-preview-canvas {
                display: block;
                margin: 0 auto 12px;
                border: 1px solid var(--border-color, #ddd);
                border-radius: 4px;
            }
            
            .icon-preview-info {
                font-size: 12px;
                color: var(--text-color, #333);
            }
            
            .icon-preview-name {
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .icon-preview-category {
                color: var(--text-secondary, #666);
                margin-bottom: 4px;
            }
            
            .icon-preview-connections {
                color: var(--text-secondary, #666);
                font-size: 11px;
            }
            
            .icon-palette-grid::-webkit-scrollbar,
            .icon-palette-categories::-webkit-scrollbar {
                width: 8px;
            }
            
            .icon-palette-grid::-webkit-scrollbar-track,
            .icon-palette-categories::-webkit-scrollbar-track {
                background: var(--scrollbar-track, #f0f0f0);
            }
            
            .icon-palette-grid::-webkit-scrollbar-thumb,
            .icon-palette-categories::-webkit-scrollbar-thumb {
                background: var(--scrollbar-thumb, #ccc);
                border-radius: 4px;
            }
            
            .icon-palette-grid::-webkit-scrollbar-thumb:hover,
            .icon-palette-categories::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-thumb-hover, #999);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 搜索
        const searchInput = this.container.querySelector('.icon-search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this._filterIcons();
        });
        
        // 分类切换
        const categoryBtns = this.container.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this._filterIcons();
            });
        });
        
        // 关闭按钮
        const closeBtn = this.container.querySelector('.icon-palette-close');
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
    }

    /**
     * 加载图标
     * @private
     */
    _loadIcons() {
        const grid = this.container.querySelector('.icon-palette-grid');
        grid.innerHTML = '';
        
        const allTypes = this.iconManager.getAllIconTypes();
        
        allTypes.forEach(type => {
            const icon = this.iconManager.getIconDefinition(type);
            if (!icon) return;
            
            const item = this._createIconItem(type, icon);
            grid.appendChild(item);
        });
    }

    /**
     * 创建图标项
     * @private
     */
    _createIconItem(type, icon) {
        const item = document.createElement('div');
        item.className = 'icon-palette-item';
        item.dataset.type = type;
        item.dataset.category = icon.category;
        item.dataset.name = icon.name.toLowerCase();
        
        // 创建预览canvas
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext('2d');
        
        // 渲染图标
        ctx.save();
        ctx.translate(60, 60);
        this.iconManager.renderIcon(ctx, type, 0, 0, 0, 1, {
            color: '#333333',
            fillColor: '#666666'
        });
        ctx.restore();
        
        // 名称
        const name = document.createElement('div');
        name.className = 'icon-palette-item-name';
        name.textContent = icon.name;
        
        item.appendChild(canvas);
        item.appendChild(name);
        
        // 事件
        item.addEventListener('click', () => {
            this._selectIcon(type);
        });
        
        item.addEventListener('mouseenter', () => {
            this._showPreview(type, icon);
        });
        
        item.addEventListener('mouseleave', () => {
            this._hidePreview();
        });
        
        // 拖拽 - 使用DragDropManager
        item.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只处理左键
            
            // 延迟初始化DragDropManager
            if (!this.dragDropManager) {
                this.dragDropManager = getDragDropManager();
            }
            
            // 准备拖动数据
            const dragData = {
                type: type,
                label: icon.name,
                category: icon.category,
                icon: '📦', // 可以根据类型设置不同图标
                connectionPoints: icon.connectionPoints || []
            };
            
            // 开始拖动
            this.dragDropManager.startDrag(dragData, e);
            
            // 触发回调
            if (this.onIconDragStart) {
                this.onIconDragStart(dragData);
            }
            
            // 发布事件
            this.eventBus.emit('icon:drag-start', { type, icon });
        });
        
        return item;
    }

    /**
     * 过滤图标
     * @private
     */
    _filterIcons() {
        const items = this.container.querySelectorAll('.icon-palette-item');
        
        items.forEach(item => {
            const category = item.dataset.category;
            const name = item.dataset.name;
            
            const categoryMatch = this.currentCategory === 'all' || category === this.currentCategory;
            const searchMatch = !this.searchQuery || name.includes(this.searchQuery);
            
            item.style.display = (categoryMatch && searchMatch) ? 'flex' : 'none';
        });
    }

    /**
     * 选择图标
     * @private
     */
    _selectIcon(type) {
        // 更新选中状态
        const items = this.container.querySelectorAll('.icon-palette-item');
        items.forEach(item => {
            item.classList.toggle('selected', item.dataset.type === type);
        });
        
        this.selectedIcon = type;
        
        if (this.onIconSelect) {
            const icon = this.iconManager.getIconDefinition(type);
            this.onIconSelect(type, icon);
        }
    }

    /**
     * 显示预览
     * @private
     */
    _showPreview(type, icon) {
        const preview = this.container.querySelector('.icon-palette-preview');
        const canvas = preview.querySelector('.icon-preview-canvas');
        const ctx = canvas.getContext('2d');
        
        // 清空
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 渲染大图标
        ctx.save();
        ctx.translate(100, 100);
        this.iconManager.renderIcon(ctx, type, 0, 0, 0, 2, {
            color: '#333333',
            fillColor: '#666666'
        });
        ctx.restore();
        
        // 更新信息
        preview.querySelector('.icon-preview-name').textContent = icon.name;
        preview.querySelector('.icon-preview-category').textContent = `Category: ${icon.category}`;
        
        const connections = icon.connectionPoints || [];
        preview.querySelector('.icon-preview-connections').textContent = 
            `Connection Points: ${connections.length} (${connections.map(p => p.label).join(', ')})`;
        
        preview.style.display = 'block';
    }

    /**
     * 隐藏预览
     * @private
     */
    _hidePreview() {
        const preview = this.container.querySelector('.icon-palette-preview');
        preview.style.display = 'none';
    }

    /**
     * 显示面板
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * 隐藏面板
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * 切换显示
     */
    toggle() {
        if (this.container) {
            const isVisible = this.container.style.display !== 'none';
            if (isVisible) {
                this.hide();
            } else {
                this.show();
            }
        }
    }

    /**
     * 设置选择回调
     */
    setOnIconSelect(callback) {
        this.onIconSelect = callback;
    }

    /**
     * 设置拖拽开始回调
     */
    setOnIconDragStart(callback) {
        this.onIconDragStart = callback;
    }

    /**
     * 获取选中的图标
     */
    getSelectedIcon() {
        return this.selectedIcon;
    }

    /**
     * 清除选择
     */
    clearSelection() {
        const items = this.container.querySelectorAll('.icon-palette-item');
        items.forEach(item => item.classList.remove('selected'));
        this.selectedIcon = null;
    }
    
    /**
     * 设置DragDropManager
     * @param {DragDropManager} manager - 拖放管理器实例
     */
    setDragDropManager(manager) {
        this.dragDropManager = manager;
    }
    
    /**
     * 挂载到容器
     * @param {HTMLElement|string} container - 容器元素或ID
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (!container) {
            console.error('IconPalettePanel: Invalid container');
            return;
        }
        
        // 创建面板容器
        if (!this.container) {
            this.containerId = container.id || 'icon-palette-container';
            const panelDiv = document.createElement('div');
            panelDiv.id = this.containerId;
            panelDiv.style.cssText = `
                position: fixed;
                left: 0;
                top: 60px;
                width: 280px;
                height: calc(100vh - 60px);
                background: white;
                border-right: 1px solid #ddd;
                box-shadow: 2px 0 8px rgba(0,0,0,0.1);
                z-index: 900;
                display: none;
            `;
            container.appendChild(panelDiv);
            
            this.container = panelDiv;
            this._buildUI();
            this._bindEvents();
            this._loadIcons();
        }
    }
    
    /**
     * 卸载
     */
    unmount() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
    }
    
    /**
     * 销毁
     */
    destroy() {
        this.unmount();
        this.dragDropManager = null;
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let iconPalettePanelInstance = null;

export function getIconPalettePanel(containerId = 'icon-palette-container') {
    if (!iconPalettePanelInstance) {
        iconPalettePanelInstance = new IconPalettePanel(containerId);
    }
    return iconPalettePanelInstance;
}

export function resetIconPalettePanel() {
    iconPalettePanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.IconPalettePanel = IconPalettePanel;
    window.getIconPalettePanel = getIconPalettePanel;
}
