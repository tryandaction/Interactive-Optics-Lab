/**
 * ThemePanel.js - 主题选择面板
 * 提供主题浏览和切换的可视化界面
 * 
 * Requirements: 10.3
 */

import { getThemeManager, BUILTIN_THEMES } from '../../diagram/styling/ThemeManager.js';

/**
 * 主题面板类
 */
export class ThemePanel {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.themeManager = getThemeManager();
        
        // 回调
        this.onThemeChange = null;
        
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
            console.error(`ThemePanel: Container "${this.containerId}" not found`);
            return;
        }
        
        this._buildUI();
        this._bindEvents();
        this.refresh();
    }

    /**
     * 构建UI结构
     * @private
     */
    _buildUI() {
        this.container.innerHTML = `
            <div class="theme-panel">
                <div class="theme-panel-header">
                    <h3>Themes</h3>
                    <button class="theme-btn" data-action="create" title="Create Custom Theme">+</button>
                </div>
                
                <div class="theme-panel-section">
                    <h4>Built-in Themes</h4>
                    <div class="theme-grid builtin-themes"></div>
                </div>
                
                <div class="theme-panel-section">
                    <h4>Custom Themes</h4>
                    <div class="theme-grid custom-themes"></div>
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
        if (document.getElementById('theme-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'theme-panel-styles';
        style.textContent = `
            .theme-panel {
                padding: 16px;
                background: var(--panel-bg, #f5f5f5);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                height: 100%;
                overflow-y: auto;
            }
            
            .theme-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .theme-panel-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .theme-btn {
                width: 32px;
                height: 32px;
                border: 1px solid var(--border-color, #ddd);
                background: var(--button-bg, #fff);
                border-radius: 4px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .theme-btn:hover {
                background: var(--button-hover-bg, #f0f0f0);
                border-color: var(--primary-color, #4488ff);
            }
            
            .theme-panel-section {
                margin-bottom: 24px;
            }
            
            .theme-panel-section h4 {
                margin: 0 0 12px 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-secondary, #666);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .theme-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 12px;
            }
            
            .theme-card {
                background: var(--item-bg, #fff);
                border: 2px solid var(--border-color, #ddd);
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                position: relative;
            }
            
            .theme-card:hover {
                border-color: var(--primary-color, #4488ff);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }
            
            .theme-card.active {
                border-color: var(--primary-color, #4488ff);
                background: var(--primary-light, #e8f0ff);
            }
            
            .theme-card.active::after {
                content: '✓';
                position: absolute;
                top: 8px;
                right: 8px;
                width: 20px;
                height: 20px;
                background: var(--primary-color, #4488ff);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
            }
            
            .theme-preview {
                width: 100%;
                height: 80px;
                border-radius: 4px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            
            .theme-preview-content {
                width: 100%;
                height: 100%;
                display: flex;
                gap: 4px;
                padding: 8px;
            }
            
            .theme-preview-bar {
                flex: 1;
                border-radius: 2px;
            }
            
            .theme-name {
                font-size: 13px;
                font-weight: 600;
                color: var(--text-color, #333);
                margin-bottom: 4px;
            }
            
            .theme-description {
                font-size: 11px;
                color: var(--text-secondary, #666);
                line-height: 1.3;
            }
            
            .theme-actions {
                display: flex;
                gap: 4px;
                margin-top: 8px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            
            .theme-card:hover .theme-actions {
                opacity: 1;
            }
            
            .theme-action-btn {
                flex: 1;
                padding: 4px 8px;
                border: 1px solid var(--border-color, #ddd);
                background: var(--button-bg, #fff);
                border-radius: 3px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .theme-action-btn:hover {
                background: var(--button-hover-bg, #f0f0f0);
            }
            
            .theme-panel::-webkit-scrollbar {
                width: 8px;
            }
            
            .theme-panel::-webkit-scrollbar-track {
                background: var(--scrollbar-track, #f0f0f0);
            }
            
            .theme-panel::-webkit-scrollbar-thumb {
                background: var(--scrollbar-thumb, #ccc);
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 创建主题按钮
        const createBtn = this.container.querySelector('[data-action="create"]');
        createBtn.addEventListener('click', () => {
            this._createCustomTheme();
        });
        
        // 监听主题变化事件
        if (typeof window !== 'undefined') {
            window.addEventListener('theme-change', () => {
                this.refresh();
            });
        }
    }

    /**
     * 刷新主题列表
     */
    refresh() {
        const builtinGrid = this.container.querySelector('.builtin-themes');
        const customGrid = this.container.querySelector('.custom-themes');
        
        builtinGrid.innerHTML = '';
        customGrid.innerHTML = '';
        
        const currentTheme = this.themeManager.getCurrentTheme();
        
        // 内置主题
        Object.values(BUILTIN_THEMES).forEach(theme => {
            const card = this._createThemeCard(theme, theme === currentTheme, false);
            builtinGrid.appendChild(card);
        });
        
        // 自定义主题
        const customThemes = this.themeManager.getAllThemes()
            .filter(t => !Object.values(BUILTIN_THEMES).includes(t));
        
        if (customThemes.length === 0) {
            customGrid.innerHTML = '<p style="color: #999; font-size: 12px; padding: 8px;">No custom themes yet</p>';
        } else {
            customThemes.forEach(theme => {
                const card = this._createThemeCard(theme, theme === currentTheme, true);
                customGrid.appendChild(card);
            });
        }
    }

    /**
     * 创建主题卡片
     * @private
     */
    _createThemeCard(theme, isActive, isCustom) {
        const card = document.createElement('div');
        card.className = 'theme-card';
        if (isActive) card.classList.add('active');
        
        // 预览
        const preview = document.createElement('div');
        preview.className = 'theme-preview';
        preview.style.backgroundColor = theme.globalStyle.backgroundColor || '#ffffff';
        
        const previewContent = document.createElement('div');
        previewContent.className = 'theme-preview-content';
        
        // 创建颜色条
        const colors = [
            theme.styleClasses?.source?.color || theme.globalStyle.color,
            theme.styleClasses?.mirror?.color || theme.globalStyle.color,
            theme.styleClasses?.lens?.color || theme.globalStyle.color,
            theme.styleClasses?.detector?.color || theme.globalStyle.color,
            theme.globalStyle.rayColor || '#ff0000'
        ];
        
        colors.forEach(color => {
            const bar = document.createElement('div');
            bar.className = 'theme-preview-bar';
            bar.style.backgroundColor = color;
            previewContent.appendChild(bar);
        });
        
        preview.appendChild(previewContent);
        
        // 名称
        const name = document.createElement('div');
        name.className = 'theme-name';
        name.textContent = theme.name;
        
        // 描述
        const description = document.createElement('div');
        description.className = 'theme-description';
        description.textContent = theme.description;
        
        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(description);
        
        // 操作按钮（仅自定义主题）
        if (isCustom) {
            const actions = document.createElement('div');
            actions.className = 'theme-actions';
            
            const exportBtn = document.createElement('button');
            exportBtn.className = 'theme-action-btn';
            exportBtn.textContent = 'Export';
            exportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._exportTheme(theme.id);
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'theme-action-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._deleteTheme(theme.id);
            });
            
            actions.appendChild(exportBtn);
            actions.appendChild(deleteBtn);
            card.appendChild(actions);
        }
        
        // 点击应用主题
        card.addEventListener('click', () => {
            this._applyTheme(theme.id);
        });
        
        return card;
    }

    /**
     * 应用主题
     * @private
     */
    _applyTheme(themeId) {
        this.themeManager.applyTheme(themeId);
        this.refresh();
        
        if (this.onThemeChange) {
            this.onThemeChange(themeId);
        }
    }

    /**
     * 创建自定义主题
     * @private
     */
    _createCustomTheme() {
        const name = prompt('Enter theme name:');
        if (!name) return;
        
        const description = prompt('Enter theme description (optional):') || '';
        
        const theme = this.themeManager.createThemeFromCurrentStyle(name, description);
        this.refresh();
        
        alert(`Theme "${name}" created successfully!`);
    }

    /**
     * 导出主题
     * @private
     */
    _exportTheme(themeId) {
        const json = this.themeManager.exportTheme(themeId);
        if (!json) return;
        
        // 创建下载
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theme-${themeId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * 删除主题
     * @private
     */
    _deleteTheme(themeId) {
        if (confirm('Delete this theme?')) {
            this.themeManager.deleteTheme(themeId);
            this.refresh();
        }
    }

    /**
     * 设置主题变化回调
     */
    setOnThemeChange(callback) {
        this.onThemeChange = callback;
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
}

// ========== 单例模式 ==========
let themePanelInstance = null;

export function getThemePanel(containerId = 'theme-panel-container') {
    if (!themePanelInstance) {
        themePanelInstance = new ThemePanel(containerId);
    }
    return themePanelInstance;
}

export function resetThemePanel() {
    themePanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ThemePanel = ThemePanel;
    window.getThemePanel = getThemePanel;
}
