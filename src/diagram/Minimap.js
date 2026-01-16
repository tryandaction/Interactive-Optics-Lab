/**
 * Minimap.js - 小地图导航组件
 * 提供图表的缩略视图和快速导航功能
 * 
 * Requirements: 8.9
 */

/**
 * 小地图类
 */
export class Minimap {
    constructor(options = {}) {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        
        // 配置
        this.width = options.width || 180;
        this.height = options.height || 120;
        this.position = options.position || 'bottom-right'; // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        this.margin = options.margin || 16;
        this.backgroundColor = options.backgroundColor || 'rgba(30, 30, 30, 0.9)';
        this.borderColor = options.borderColor || '#444';
        this.viewportColor = options.viewportColor || 'rgba(0, 120, 212, 0.3)';
        this.viewportBorderColor = options.viewportBorderColor || '#0078d4';
        this.componentColor = options.componentColor || '#888';
        this.linkColor = options.linkColor || '#ff6666';
        
        // 状态
        this.visible = true;
        this.isDragging = false;
        this.dragStartPos = null;
        
        // 场景边界
        this.sceneBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
        
        // 视口信息
        this.viewport = { x: 0, y: 0, width: 800, height: 600 };
        
        // 回调
        this.onViewportChange = options.onViewportChange || null;
    }

    /**
     * 创建小地图
     */
    create() {
        if (this.container) return this.container;
        
        this.container = document.createElement('div');
        this.container.className = 'diagram-minimap';
        this.container.innerHTML = `
            <div class="minimap-header">
                <span class="minimap-title">导航</span>
                <button class="minimap-toggle" title="折叠">−</button>
            </div>
            <div class="minimap-content">
                <canvas class="minimap-canvas" width="${this.width}" height="${this.height}"></canvas>
            </div>
        `;
        
        this._injectStyles();
        this._positionContainer();
        
        this.canvas = this.container.querySelector('.minimap-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this._bindEvents();
        
        return this.container;
    }

    /**
     * 显示小地图
     */
    show() {
        if (!this.container) {
            this.create();
        }
        
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        
        this.container.style.display = 'block';
        this.visible = true;
    }

    /**
     * 隐藏小地图
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.visible = false;
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
     * 更新场景边界
     */
    updateSceneBounds(components) {
        if (!components || components.length === 0) {
            this.sceneBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
            return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        components.forEach(comp => {
            const pos = comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            const size = comp.size || 40;
            
            minX = Math.min(minX, pos.x - size);
            minY = Math.min(minY, pos.y - size);
            maxX = Math.max(maxX, pos.x + size);
            maxY = Math.max(maxY, pos.y + size);
        });
        
        // 添加边距
        const padding = 100;
        this.sceneBounds = {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding
        };
    }

    /**
     * 更新视口信息
     */
    updateViewport(x, y, width, height, scale = 1) {
        this.viewport = {
            x: x,
            y: y,
            width: width / scale,
            height: height / scale
        };
    }

    /**
     * 渲染小地图
     */
    render(components = [], links = []) {
        if (!this.ctx || !this.visible) return;
        
        const ctx = this.ctx;
        const { width, height } = this.canvas;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // 计算缩放比例
        const bounds = this.sceneBounds;
        const sceneWidth = bounds.maxX - bounds.minX;
        const sceneHeight = bounds.maxY - bounds.minY;
        const scale = Math.min(
            (width - 10) / sceneWidth,
            (height - 10) / sceneHeight
        );
        
        // 计算偏移使场景居中
        const offsetX = (width - sceneWidth * scale) / 2 - bounds.minX * scale;
        const offsetY = (height - sceneHeight * scale) / 2 - bounds.minY * scale;
        
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        // 绘制链接
        ctx.strokeStyle = this.linkColor;
        ctx.lineWidth = 2 / scale;
        links.forEach(link => {
            if (link._cachedPath && link._cachedPath.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(link._cachedPath[0].x, link._cachedPath[0].y);
                for (let i = 1; i < link._cachedPath.length; i++) {
                    ctx.lineTo(link._cachedPath[i].x, link._cachedPath[i].y);
                }
                ctx.stroke();
            }
        });
        
        // 绘制组件
        ctx.fillStyle = this.componentColor;
        components.forEach(comp => {
            const pos = comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            const size = Math.max(8 / scale, 4);
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
        
        // 绘制视口矩形
        this._renderViewport(ctx, scale, offsetX, offsetY);
    }

    /**
     * 渲染视口矩形
     * @private
     */
    _renderViewport(ctx, scale, offsetX, offsetY) {
        const vp = this.viewport;
        
        const vpX = vp.x * scale + offsetX;
        const vpY = vp.y * scale + offsetY;
        const vpW = vp.width * scale;
        const vpH = vp.height * scale;
        
        // 填充
        ctx.fillStyle = this.viewportColor;
        ctx.fillRect(vpX, vpY, vpW, vpH);
        
        // 边框
        ctx.strokeStyle = this.viewportBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
    }

    /**
     * 定位容器
     * @private
     */
    _positionContainer() {
        const style = this.container.style;
        style.position = 'fixed';
        style.zIndex = '9999';
        
        switch (this.position) {
            case 'bottom-right':
                style.bottom = `${this.margin}px`;
                style.right = `${this.margin}px`;
                break;
            case 'bottom-left':
                style.bottom = `${this.margin}px`;
                style.left = `${this.margin}px`;
                break;
            case 'top-right':
                style.top = `${this.margin + 60}px`; // 避开工具栏
                style.right = `${this.margin}px`;
                break;
            case 'top-left':
                style.top = `${this.margin + 60}px`;
                style.left = `${this.margin}px`;
                break;
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 折叠按钮
        const toggleBtn = this.container.querySelector('.minimap-toggle');
        const content = this.container.querySelector('.minimap-content');
        
        toggleBtn?.addEventListener('click', () => {
            const isCollapsed = content.style.display === 'none';
            content.style.display = isCollapsed ? 'block' : 'none';
            toggleBtn.textContent = isCollapsed ? '−' : '+';
        });
        
        // 画布点击和拖拽
        this.canvas?.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.canvas?.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas?.addEventListener('mouseup', (e) => this._handleMouseUp(e));
        this.canvas?.addEventListener('mouseleave', (e) => this._handleMouseUp(e));
    }

    /**
     * 处理鼠标按下
     * @private
     */
    _handleMouseDown(e) {
        this.isDragging = true;
        this._navigateToPosition(e);
    }

    /**
     * 处理鼠标移动
     * @private
     */
    _handleMouseMove(e) {
        if (!this.isDragging) return;
        this._navigateToPosition(e);
    }

    /**
     * 处理鼠标释放
     * @private
     */
    _handleMouseUp(e) {
        this.isDragging = false;
    }

    /**
     * 导航到指定位置
     * @private
     */
    _navigateToPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 计算场景坐标
        const bounds = this.sceneBounds;
        const sceneWidth = bounds.maxX - bounds.minX;
        const sceneHeight = bounds.maxY - bounds.minY;
        const scale = Math.min(
            (this.width - 10) / sceneWidth,
            (this.height - 10) / sceneHeight
        );
        
        const offsetX = (this.width - sceneWidth * scale) / 2 - bounds.minX * scale;
        const offsetY = (this.height - sceneHeight * scale) / 2 - bounds.minY * scale;
        
        const sceneX = (x - offsetX) / scale;
        const sceneY = (y - offsetY) / scale;
        
        // 触发回调
        if (this.onViewportChange) {
            this.onViewportChange({
                x: sceneX - this.viewport.width / 2,
                y: sceneY - this.viewport.height / 2
            });
        }
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'diagram-minimap-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .diagram-minimap {
                background: var(--panel-bg, #1e1e1e);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                user-select: none;
            }
            
            .minimap-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                background: var(--header-bg, #252526);
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .minimap-title {
                font-size: 11px;
                font-weight: 500;
                color: var(--text-secondary, #888);
            }
            
            .minimap-toggle {
                background: none;
                border: none;
                color: var(--text-secondary, #888);
                font-size: 14px;
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            }
            
            .minimap-toggle:hover {
                color: var(--text-primary, #fff);
            }
            
            .minimap-content {
                padding: 4px;
            }
            
            .minimap-canvas {
                display: block;
                border-radius: 4px;
                cursor: crosshair;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 销毁小地图
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.canvas = null;
            this.ctx = null;
        }
    }
}

// 单例
let minimapInstance = null;

export function getMinimap(options = {}) {
    if (!minimapInstance) {
        minimapInstance = new Minimap(options);
    }
    return minimapInstance;
}

export function resetMinimap() {
    if (minimapInstance) {
        minimapInstance.destroy();
    }
    minimapInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.Minimap = Minimap;
    window.getMinimap = getMinimap;
}
