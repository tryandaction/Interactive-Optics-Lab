/**
 * NavigationPanel.js - 导航控制面板
 * 提供缩放、平移、历史记录等导航功能
 * 
 * Requirements: 19.1, 19.3, 19.4
 */

/**
 * 导航面板类
 */
export class NavigationPanel {
    constructor(config = {}) {
        this.container = null;
        this.visible = config.visible !== false;
        this.position = config.position || 'top-right';
        
        // 导航状态
        this.zoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 10.0;
        this.zoomStep = 0.1;
        
        // 历史记录
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // 书签
        this.bookmarks = [];
        
        // 回调
        this.onZoomChange = null;
        this.onPan = null;
        this.onFitView = null;
        this.onHistoryNavigate = null;
        this.onBookmarkSelect = null;
        
        this._createPanel();
    }

    /**
     * 创建面板
     * @private
     */
    _createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'navigation-panel';
        this.container.style.cssText = `
            position: fixed;
            ${this._getPositionStyle()}
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            padding: 10px;
            display: ${this.visible ? 'flex' : 'none'};
            flex-direction: column;
            gap: 8px;
            z-index: 1000;
        `;
        
        this._createZoomControls();
        this._createPanControls();
        this._createViewControls();
        this._createHistoryControls();
        this._createBookmarkControls();
    }

    /**
     * 获取位置样式
     * @private
     */
    _getPositionStyle() {
        const positions = {
            'top-left': 'top: 80px; left: 20px;',
            'top-right': 'top: 80px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'bottom-right': 'bottom: 20px; right: 20px;'
        };
        return positions[this.position] || positions['top-right'];
    }

    /**
     * 创建缩放控制
     * @private
     */
    _createZoomControls() {
        const section = this._createSection('缩放');
        
        // 缩放按钮组
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = `
            display: flex;
            gap: 4px;
            align-items: center;
        `;
        
        // 放大按钮
        const zoomInBtn = this._createButton('+', '放大 (Ctrl +)', () => {
            this.zoomIn();
        });
        
        // 缩放显示
        this.zoomDisplay = document.createElement('div');
        this.zoomDisplay.textContent = '100%';
        this.zoomDisplay.style.cssText = `
            min-width: 50px;
            text-align: center;
            font-size: 13px;
            font-weight: 500;
            color: #333;
        `;
        
        // 缩小按钮
        const zoomOutBtn = this._createButton('-', '缩小 (Ctrl -)', () => {
            this.zoomOut();
        });
        
        btnGroup.appendChild(zoomOutBtn);
        btnGroup.appendChild(this.zoomDisplay);
        btnGroup.appendChild(zoomInBtn);
        
        section.appendChild(btnGroup);
        
        // 缩放滑块
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = this.minZoom * 100;
        slider.max = this.maxZoom * 100;
        slider.value = this.zoom * 100;
        slider.step = this.zoomStep * 100;
        slider.style.cssText = `
            width: 100%;
            margin-top: 4px;
        `;
        slider.oninput = (e) => {
            this.setZoom(parseFloat(e.target.value) / 100);
        };
        this.zoomSlider = slider;
        section.appendChild(slider);
        
        // 预设缩放
        const presets = document.createElement('div');
        presets.style.cssText = `
            display: flex;
            gap: 4px;
            margin-top: 4px;
        `;
        
        [25, 50, 100, 200].forEach(percent => {
            const btn = this._createSmallButton(`${percent}%`, () => {
                this.setZoom(percent / 100);
            });
            presets.appendChild(btn);
        });
        
        section.appendChild(presets);
        this.container.appendChild(section);
    }

    /**
     * 创建平移控制
     * @private
     */
    _createPanControls() {
        const section = this._createSection('平移');
        
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 32px);
            gap: 4px;
            justify-content: center;
        `;
        
        // 方向按钮
        const directions = [
            { row: 0, col: 1, icon: '↑', dir: 'up' },
            { row: 1, col: 0, icon: '←', dir: 'left' },
            { row: 1, col: 1, icon: '⊙', dir: 'center' },
            { row: 1, col: 2, icon: '→', dir: 'right' },
            { row: 2, col: 1, icon: '↓', dir: 'down' }
        ];
        
        directions.forEach(({ row, col, icon, dir }) => {
            const btn = this._createButton(icon, `平移${dir}`, () => {
                this.pan(dir);
            });
            btn.style.gridRow = row + 1;
            btn.style.gridColumn = col + 1;
            grid.appendChild(btn);
        });
        
        section.appendChild(grid);
        this.container.appendChild(section);
    }

    /**
     * 创建视图控制
     * @private
     */
    _createViewControls() {
        const section = this._createSection('视图');
        
        const buttons = [
            { label: '适应画布', icon: '⊡', action: () => this.fitView() },
            { label: '重置视图', icon: '⟲', action: () => this.resetView() },
            { label: '全屏', icon: '⛶', action: () => this.toggleFullscreen() }
        ];
        
        buttons.forEach(({ label, icon, action }) => {
            const btn = this._createWideButton(`${icon} ${label}`, action);
            section.appendChild(btn);
        });
        
        this.container.appendChild(section);
    }

    /**
     * 创建历史控制
     * @private
     */
    _createHistoryControls() {
        const section = this._createSection('历史');
        
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 4px;';
        
        this.backBtn = this._createButton('←', '后退', () => this.goBack());
        this.backBtn.disabled = true;
        
        this.forwardBtn = this._createButton('→', '前进', () => this.goForward());
        this.forwardBtn.disabled = true;
        
        btnGroup.appendChild(this.backBtn);
        btnGroup.appendChild(this.forwardBtn);
        
        section.appendChild(btnGroup);
        this.container.appendChild(section);
    }

    /**
     * 创建书签控制
     * @private
     */
    _createBookmarkControls() {
        const section = this._createSection('书签');
        
        const addBtn = this._createWideButton('+ 添加书签', () => {
            this.addBookmark();
        });
        section.appendChild(addBtn);
        
        this.bookmarkList = document.createElement('div');
        this.bookmarkList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 150px;
            overflow-y: auto;
        `;
        section.appendChild(this.bookmarkList);
        
        this.container.appendChild(section);
        this._updateBookmarkList();
    }

    /**
     * 创建区域
     * @private
     */
    _createSection(title) {
        const section = document.createElement('div');
        section.style.cssText = `
            padding: 8px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            background: #fafafa;
        `;
        
        const titleEl = document.createElement('div');
        titleEl.textContent = title;
        titleEl.style.cssText = `
            font-size: 11px;
            color: #666;
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
        `;
        section.appendChild(titleEl);
        
        return section;
    }

    /**
     * 创建按钮
     * @private
     */
    _createButton(text, title, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.title = title;
        btn.style.cssText = `
            width: 32px;
            height: 32px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;
        btn.onmouseenter = () => {
            if (!btn.disabled) {
                btn.style.background = '#f0f7ff';
                btn.style.borderColor = '#4488ff';
            }
        };
        btn.onmouseleave = () => {
            btn.style.background = 'white';
            btn.style.borderColor = '#ddd';
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * 创建小按钮
     * @private
     */
    _createSmallButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            flex: 1;
            padding: 4px 6px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s;
        `;
        btn.onmouseenter = () => {
            btn.style.background = '#f0f7ff';
            btn.style.borderColor = '#4488ff';
        };
        btn.onmouseleave = () => {
            btn.style.background = 'white';
            btn.style.borderColor = '#ddd';
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * 创建宽按钮
     * @private
     */
    _createWideButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
            transition: all 0.2s;
            margin-bottom: 4px;
        `;
        btn.onmouseenter = () => {
            btn.style.background = '#f0f7ff';
            btn.style.borderColor = '#4488ff';
        };
        btn.onmouseleave = () => {
            btn.style.background = 'white';
            btn.style.borderColor = '#ddd';
        };
        btn.onclick = onClick;
        return btn;
    }

    /**
     * 放大
     */
    zoomIn() {
        this.setZoom(Math.min(this.zoom + this.zoomStep, this.maxZoom));
    }

    /**
     * 缩小
     */
    zoomOut() {
        this.setZoom(Math.max(this.zoom - this.zoomStep, this.minZoom));
    }

    /**
     * 设置缩放
     */
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this._updateZoomDisplay();
        
        if (this.onZoomChange) {
            this.onZoomChange(this.zoom);
        }
    }

    /**
     * 更新缩放显示
     * @private
     */
    _updateZoomDisplay() {
        if (this.zoomDisplay) {
            this.zoomDisplay.textContent = `${Math.round(this.zoom * 100)}%`;
        }
        if (this.zoomSlider) {
            this.zoomSlider.value = this.zoom * 100;
        }
    }

    /**
     * 平移
     */
    pan(direction) {
        const panAmount = 100; // pixels
        
        const offsets = {
            up: { x: 0, y: -panAmount },
            down: { x: 0, y: panAmount },
            left: { x: -panAmount, y: 0 },
            right: { x: panAmount, y: 0 },
            center: { x: 0, y: 0 }
        };
        
        const offset = offsets[direction];
        if (offset && this.onPan) {
            this.onPan(offset.x, offset.y);
        }
    }

    /**
     * 适应视图
     */
    fitView() {
        if (this.onFitView) {
            this.onFitView();
        }
    }

    /**
     * 重置视图
     */
    resetView() {
        this.setZoom(1.0);
        this.pan('center');
    }

    /**
     * 切换全屏
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * 保存视图状态
     */
    saveViewState(state) {
        // 移除当前位置之后的历史
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 添加新状态
        this.history.push({
            ...state,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this._updateHistoryButtons();
    }

    /**
     * 后退
     */
    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            if (this.onHistoryNavigate) {
                this.onHistoryNavigate(state);
            }
            this._updateHistoryButtons();
        }
    }

    /**
     * 前进
     */
    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            if (this.onHistoryNavigate) {
                this.onHistoryNavigate(state);
            }
            this._updateHistoryButtons();
        }
    }

    /**
     * 更新历史按钮
     * @private
     */
    _updateHistoryButtons() {
        if (this.backBtn) {
            this.backBtn.disabled = this.historyIndex <= 0;
            this.backBtn.style.opacity = this.backBtn.disabled ? '0.5' : '1';
        }
        if (this.forwardBtn) {
            this.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
            this.forwardBtn.style.opacity = this.forwardBtn.disabled ? '0.5' : '1';
        }
    }

    /**
     * 添加书签
     */
    addBookmark(name = null, state = null) {
        const bookmarkName = name || `书签 ${this.bookmarks.length + 1}`;
        
        this.bookmarks.push({
            name: bookmarkName,
            state: state || { zoom: this.zoom },
            timestamp: Date.now()
        });
        
        this._updateBookmarkList();
    }

    /**
     * 删除书签
     */
    deleteBookmark(index) {
        if (index >= 0 && index < this.bookmarks.length) {
            this.bookmarks.splice(index, 1);
            this._updateBookmarkList();
        }
    }

    /**
     * 跳转到书签
     */
    gotoBookmark(index) {
        if (index >= 0 && index < this.bookmarks.length) {
            const bookmark = this.bookmarks[index];
            if (this.onBookmarkSelect) {
                this.onBookmarkSelect(bookmark.state);
            }
        }
    }

    /**
     * 更新书签列表
     * @private
     */
    _updateBookmarkList() {
        if (!this.bookmarkList) return;
        
        this.bookmarkList.innerHTML = '';
        
        if (this.bookmarks.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = '暂无书签';
            empty.style.cssText = `
                text-align: center;
                color: #999;
                font-size: 11px;
                padding: 8px;
            `;
            this.bookmarkList.appendChild(empty);
            return;
        }
        
        this.bookmarks.forEach((bookmark, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 6px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 3px;
                cursor: pointer;
            `;
            
            const name = document.createElement('span');
            name.textContent = bookmark.name;
            name.style.cssText = 'font-size: 11px; flex: 1;';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                color: #999;
                padding: 0;
                width: 20px;
                height: 20px;
            `;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deleteBookmark(index);
            };
            
            item.onclick = () => this.gotoBookmark(index);
            item.onmouseenter = () => {
                item.style.background = '#f0f7ff';
                item.style.borderColor = '#4488ff';
            };
            item.onmouseleave = () => {
                item.style.background = 'white';
                item.style.borderColor = '#e0e0e0';
            };
            
            item.appendChild(name);
            item.appendChild(deleteBtn);
            this.bookmarkList.appendChild(item);
        });
    }

    /**
     * 挂载到容器
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container && this.container) {
            container.appendChild(this.container);
        }
    }

    /**
     * 卸载
     */
    unmount() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    /**
     * 显示
     */
    show() {
        this.visible = true;
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    /**
     * 隐藏
     */
    hide() {
        this.visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * 切换显示
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 设置位置
     */
    setPosition(position) {
        this.position = position;
        if (this.container) {
            const style = this._getPositionStyle();
            this.container.style.cssText = this.container.style.cssText.replace(
                /top:.*?;|bottom:.*?;|left:.*?;|right:.*?;/g,
                ''
            ) + style;
        }
    }

    /**
     * 销毁
     */
    destroy() {
        this.unmount();
        this.container = null;
    }
}

// ========== 单例模式 ==========
let navigationPanelInstance = null;

export function getNavigationPanel(config) {
    if (!navigationPanelInstance) {
        navigationPanelInstance = new NavigationPanel(config);
    }
    return navigationPanelInstance;
}

export function resetNavigationPanel() {
    if (navigationPanelInstance) {
        navigationPanelInstance.destroy();
    }
    navigationPanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.NavigationPanel = NavigationPanel;
    window.getNavigationPanel = getNavigationPanel;
}
