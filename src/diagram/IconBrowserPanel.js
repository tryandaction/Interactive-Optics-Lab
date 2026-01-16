/**
 * IconBrowserPanel.js - 图标浏览器面板
 * 提供专业图标的浏览、搜索和选择功能
 * 
 * Requirements: 1.5, 6.3, 6.8
 */

import { getProfessionalIconManager, ICON_CATEGORIES } from './ProfessionalIconManager.js';

/**
 * 分类显示名称映射
 */
const CATEGORY_LABELS = {
    [ICON_CATEGORIES.SOURCES]: '光源',
    [ICON_CATEGORIES.MIRRORS]: '反射镜',
    [ICON_CATEGORIES.LENSES]: '透镜',
    [ICON_CATEGORIES.SPLITTERS]: '分束器',
    [ICON_CATEGORIES.MODULATORS]: '调制器',
    [ICON_CATEGORIES.WAVEPLATES]: '波片',
    [ICON_CATEGORIES.POLARIZERS]: '偏振器',
    [ICON_CATEGORIES.DETECTORS]: '探测器',
    [ICON_CATEGORIES.ATOMIC]: '原子/气室',
    [ICON_CATEGORIES.FIBERS]: '光纤',
    [ICON_CATEGORIES.MISC]: '其他'
};

/**
 * 图标浏览器面板类
 */
export class IconBrowserPanel {
    constructor(options = {}) {
        this.iconManager = getProfessionalIconManager();
        this.container = null;
        this.isOpen = false;
        this.selectedCategory = null;
        this.searchQuery = '';
        this.selectedIcon = null;
        
        // 回调
        this.onIconSelect = options.onIconSelect || null;
        this.onIconDragStart = options.onIconDragStart || null;
        
        // 预览画布
        this.previewCanvas = null;
        this.previewCtx = null;
    }

    /**
     * 创建面板
     */
    create() {
        if (this.container) return this.container;
        
        this.container = document.createElement('div');
        this.container.className = 'icon-browser-panel';
        this.container.innerHTML = `
            <div class="icon-browser-header">
                <h3>光学元件图标库</h3>
                <button class="icon-browser-close" title="关闭">&times;</button>
            </div>
            <div class="icon-browser-search">
                <input type="text" placeholder="搜索图标..." class="icon-search-input">
                <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" fill="none" stroke-width="1.5"/>
                    <line x1="10" y1="10" x2="14" y2="14" stroke="currentColor" stroke-width="1.5"/>
                </svg>
            </div>
            <div class="icon-browser-categories"></div>
            <div class="icon-browser-grid"></div>
            <div class="icon-browser-preview">
                <canvas class="icon-preview-canvas" width="120" height="120"></canvas>
                <div class="icon-preview-info">
                    <div class="icon-preview-name">选择一个图标</div>
                    <div class="icon-preview-details"></div>
                </div>
            </div>
            <div class="icon-browser-actions">
                <button class="icon-action-btn" id="btn-add-icon" disabled>添加到画布</button>
            </div>
        `;
        
        this._injectStyles();
        this._bindEvents();
        this._renderCategories();
        this._renderIcons();
        
        // 初始化预览画布
        this.previewCanvas = this.container.querySelector('.icon-preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        return this.container;
    }

    /**
     * 打开面板
     */
    open(anchorElement = null) {
        if (!this.container) {
            this.create();
        }
        
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        
        // 定位面板
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            this.container.style.top = `${rect.bottom + 8}px`;
            this.container.style.left = `${rect.left}px`;
        } else {
            this.container.style.top = '100px';
            this.container.style.right = '20px';
            this.container.style.left = 'auto';
        }
        
        this.container.classList.add('open');
        this.isOpen = true;
        
        // 聚焦搜索框
        setTimeout(() => {
            this.container.querySelector('.icon-search-input')?.focus();
        }, 100);
    }

    /**
     * 关闭面板
     */
    close() {
        if (this.container) {
            this.container.classList.remove('open');
        }
        this.isOpen = false;
    }

    /**
     * 切换面板
     */
    toggle(anchorElement = null) {
        if (this.isOpen) {
            this.close();
        } else {
            this.open(anchorElement);
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 关闭按钮
        this.container.querySelector('.icon-browser-close')?.addEventListener('click', () => {
            this.close();
        });
        
        // 搜索输入
        const searchInput = this.container.querySelector('.icon-search-input');
        searchInput?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this._renderIcons();
        });
        
        // 分类点击
        this.container.querySelector('.icon-browser-categories')?.addEventListener('click', (e) => {
            const categoryBtn = e.target.closest('.category-btn');
            if (categoryBtn) {
                const category = categoryBtn.dataset.category;
                this._selectCategory(category === this.selectedCategory ? null : category);
            }
        });
        
        // 图标点击
        this.container.querySelector('.icon-browser-grid')?.addEventListener('click', (e) => {
            const iconItem = e.target.closest('.icon-item');
            if (iconItem) {
                this._selectIcon(iconItem.dataset.type);
            }
        });
        
        // 图标双击 - 直接添加
        this.container.querySelector('.icon-browser-grid')?.addEventListener('dblclick', (e) => {
            const iconItem = e.target.closest('.icon-item');
            if (iconItem && this.onIconSelect) {
                this.onIconSelect(iconItem.dataset.type);
            }
        });
        
        // 图标拖拽
        this.container.querySelector('.icon-browser-grid')?.addEventListener('dragstart', (e) => {
            const iconItem = e.target.closest('.icon-item');
            if (iconItem) {
                e.dataTransfer.setData('text/plain', iconItem.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
                if (this.onIconDragStart) {
                    this.onIconDragStart(iconItem.dataset.type, e);
                }
            }
        });
        
        // 添加按钮
        this.container.querySelector('#btn-add-icon')?.addEventListener('click', () => {
            if (this.selectedIcon && this.onIconSelect) {
                this.onIconSelect(this.selectedIcon);
            }
        });
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.container.contains(e.target)) {
                // 检查是否点击了触发按钮
                const triggerBtn = document.querySelector('#btn-icon-browser');
                if (!triggerBtn?.contains(e.target)) {
                    this.close();
                }
            }
        });
    }

    /**
     * 选择分类
     * @private
     */
    _selectCategory(category) {
        this.selectedCategory = category;
        
        // 更新分类按钮状态
        this.container.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
        
        this._renderIcons();
    }

    /**
     * 选择图标
     * @private
     */
    _selectIcon(iconType) {
        this.selectedIcon = iconType;
        
        // 更新图标项状态
        this.container.querySelectorAll('.icon-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.type === iconType);
        });
        
        // 更新预览
        this._updatePreview(iconType);
        
        // 启用添加按钮
        const addBtn = this.container.querySelector('#btn-add-icon');
        if (addBtn) addBtn.disabled = false;
    }

    /**
     * 渲染分类按钮
     * @private
     */
    _renderCategories() {
        const categoriesContainer = this.container.querySelector('.icon-browser-categories');
        if (!categoriesContainer) return;
        
        const categories = this.iconManager.getAllCategories();
        
        categoriesContainer.innerHTML = `
            <button class="category-btn ${!this.selectedCategory ? 'active' : ''}" data-category="">
                全部
            </button>
            ${categories.map(cat => `
                <button class="category-btn ${this.selectedCategory === cat ? 'active' : ''}" 
                        data-category="${cat}">
                    ${CATEGORY_LABELS[cat] || cat}
                </button>
            `).join('')}
        `;
    }

    /**
     * 渲染图标网格
     * @private
     */
    _renderIcons() {
        const gridContainer = this.container.querySelector('.icon-browser-grid');
        if (!gridContainer) return;
        
        let iconTypes = this.iconManager.getAllIconTypes();
        
        // 按分类筛选
        if (this.selectedCategory) {
            iconTypes = this.iconManager.getIconsByCategory(this.selectedCategory);
        }
        
        // 按搜索词筛选
        if (this.searchQuery) {
            iconTypes = iconTypes.filter(type => {
                const icon = this.iconManager.getIconDefinition(type);
                return type.toLowerCase().includes(this.searchQuery) ||
                       (icon?.name || '').toLowerCase().includes(this.searchQuery);
            });
        }
        
        if (iconTypes.length === 0) {
            gridContainer.innerHTML = `
                <div class="icon-grid-empty">
                    <p>没有找到匹配的图标</p>
                </div>
            `;
            return;
        }
        
        gridContainer.innerHTML = iconTypes.map(type => {
            const icon = this.iconManager.getIconDefinition(type);
            return `
                <div class="icon-item ${this.selectedIcon === type ? 'selected' : ''}" 
                     data-type="${type}" 
                     draggable="true"
                     title="${icon?.name || type}">
                    <canvas class="icon-thumb" width="48" height="48" data-type="${type}"></canvas>
                    <span class="icon-name">${icon?.name || type}</span>
                </div>
            `;
        }).join('');
        
        // 渲染缩略图
        this._renderThumbnails();
    }

    /**
     * 渲染缩略图
     * @private
     */
    _renderThumbnails() {
        const thumbnails = this.container.querySelectorAll('.icon-thumb');
        thumbnails.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            const type = canvas.dataset.type;
            
            ctx.clearRect(0, 0, 48, 48);
            ctx.save();
            
            // 居中渲染
            const icon = this.iconManager.getIconDefinition(type);
            const scale = Math.min(40 / (icon?.width || 60), 40 / (icon?.height || 60));
            
            this.iconManager.renderIcon(ctx, type, 24, 24, 0, scale);
            
            ctx.restore();
        });
    }

    /**
     * 更新预览
     * @private
     */
    _updatePreview(iconType) {
        if (!this.previewCtx) return;
        
        const icon = this.iconManager.getIconDefinition(iconType);
        
        // 清除画布
        this.previewCtx.clearRect(0, 0, 120, 120);
        
        // 渲染图标
        const scale = Math.min(100 / (icon?.width || 60), 100 / (icon?.height || 60));
        this.iconManager.renderIcon(this.previewCtx, iconType, 60, 60, 0, scale);
        
        // 更新信息
        const nameEl = this.container.querySelector('.icon-preview-name');
        const detailsEl = this.container.querySelector('.icon-preview-details');
        
        if (nameEl) nameEl.textContent = icon?.name || iconType;
        if (detailsEl) {
            const points = this.iconManager.getConnectionPoints(iconType);
            detailsEl.innerHTML = `
                <div>类型: ${iconType}</div>
                <div>分类: ${CATEGORY_LABELS[icon?.category] || icon?.category}</div>
                <div>连接点: ${points.length}个</div>
                <div class="connection-points-list">
                    ${points.map(p => `<span class="cp-tag cp-${p.type}">${p.label}</span>`).join('')}
                </div>
            `;
        }
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'icon-browser-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .icon-browser-panel {
                position: fixed;
                width: 360px;
                max-height: 600px;
                background: var(--panel-bg, #1e1e1e);
                border: 1px solid var(--border-color, #333);
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                z-index: 10002;
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            
            .icon-browser-panel.open {
                display: flex;
            }
            
            .icon-browser-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
                background: var(--header-bg, #252526);
            }
            
            .icon-browser-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary, #fff);
            }
            
            .icon-browser-close {
                background: none;
                border: none;
                font-size: 20px;
                color: var(--text-secondary, #888);
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            }
            
            .icon-browser-close:hover {
                color: var(--text-primary, #fff);
            }
            
            .icon-browser-search {
                position: relative;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .icon-search-input {
                width: 100%;
                padding: 8px 12px 8px 36px;
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--input-bg, #2d2d2d);
                color: var(--text-primary, #fff);
                font-size: 13px;
                outline: none;
            }
            
            .icon-search-input:focus {
                border-color: var(--accent-color, #0078d4);
            }
            
            .search-icon {
                position: absolute;
                left: 28px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-secondary, #888);
            }
            
            .icon-browser-categories {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .category-btn {
                padding: 4px 10px;
                border: 1px solid var(--border-color, #444);
                border-radius: 12px;
                background: transparent;
                color: var(--text-secondary, #888);
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .category-btn:hover {
                border-color: var(--accent-color, #0078d4);
                color: var(--text-primary, #fff);
            }
            
            .category-btn.active {
                background: var(--accent-color, #0078d4);
                border-color: var(--accent-color, #0078d4);
                color: #fff;
            }
            
            .icon-browser-grid {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                min-height: 200px;
                max-height: 280px;
            }
            
            .icon-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px 4px;
                border: 1px solid transparent;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .icon-item:hover {
                background: var(--hover-bg, rgba(255, 255, 255, 0.05));
                border-color: var(--border-color, #444);
            }
            
            .icon-item.selected {
                background: var(--selected-bg, rgba(0, 120, 212, 0.2));
                border-color: var(--accent-color, #0078d4);
            }
            
            .icon-thumb {
                width: 48px;
                height: 48px;
                margin-bottom: 4px;
            }
            
            .icon-name {
                font-size: 10px;
                color: var(--text-secondary, #888);
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
            
            .icon-item.selected .icon-name {
                color: var(--text-primary, #fff);
            }
            
            .icon-grid-empty {
                grid-column: 1 / -1;
                text-align: center;
                padding: 40px 20px;
                color: var(--text-secondary, #888);
            }
            
            .icon-browser-preview {
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                border-top: 1px solid var(--border-color, #333);
                background: var(--preview-bg, #252526);
            }
            
            .icon-preview-canvas {
                width: 80px;
                height: 80px;
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--canvas-bg, #1a1a1a);
            }
            
            .icon-preview-info {
                flex: 1;
                min-width: 0;
            }
            
            .icon-preview-name {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary, #fff);
                margin-bottom: 6px;
            }
            
            .icon-preview-details {
                font-size: 11px;
                color: var(--text-secondary, #888);
                line-height: 1.5;
            }
            
            .connection-points-list {
                margin-top: 6px;
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }
            
            .cp-tag {
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                background: var(--tag-bg, #333);
            }
            
            .cp-tag.cp-input { background: #2a4a6a; color: #8ac; }
            .cp-tag.cp-output { background: #6a4a2a; color: #ca8; }
            .cp-tag.cp-bidirectional { background: #4a4a4a; color: #aaa; }
            
            .icon-browser-actions {
                padding: 12px 16px;
                border-top: 1px solid var(--border-color, #333);
            }
            
            .icon-action-btn {
                width: 100%;
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                background: var(--accent-color, #0078d4);
                color: #fff;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .icon-action-btn:hover:not(:disabled) {
                background: var(--accent-hover, #1084d8);
            }
            
            .icon-action-btn:disabled {
                background: var(--disabled-bg, #444);
                color: var(--disabled-color, #888);
                cursor: not-allowed;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 销毁面板
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
    }
}

// 单例
let iconBrowserInstance = null;

export function getIconBrowserPanel(options = {}) {
    if (!iconBrowserInstance) {
        iconBrowserInstance = new IconBrowserPanel(options);
    }
    return iconBrowserInstance;
}

export function resetIconBrowserPanel() {
    if (iconBrowserInstance) {
        iconBrowserInstance.destroy();
    }
    iconBrowserInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.IconBrowserPanel = IconBrowserPanel;
    window.getIconBrowserPanel = getIconBrowserPanel;
}
