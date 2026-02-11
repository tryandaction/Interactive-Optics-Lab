/**
 * Minimap.js - 缩略图导航器
 * 提供全局视图和快速导航功能
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4
 */

/**
 * 缩略图导航器类
 */
export class Minimap {
    constructor(config = {}) {
        this.canvas = null;
        this.ctx = null;
        this.width = config.width || 200;
        this.height = config.height || 150;
        this.position = config.position || 'bottom-right';
        this.padding = config.padding || 10;
        this.visible = config.visible !== false;
        
        // 样式
        this.backgroundColor = config.backgroundColor || 'rgba(255, 255, 255, 0.9)';
        this.borderColor = config.borderColor || '#cccccc';
        this.borderWidth = config.borderWidth || 1;
        this.viewportColor = config.viewportColor || 'rgba(68, 136, 255, 0.3)';
        this.viewportBorderColor = config.viewportBorderColor || '#4488ff';
        this.viewportBorderWidth = config.viewportBorderWidth || 2;
        
        // 状态
        this.isDragging = false;
        this.dragStartPos = null;
        
        // 场景边界
        this.sceneBounds = { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
        
        // 视口
        this.viewport = { x: 0, y: 0, width: 1920, height: 1080 };
        
        // 缩放
        this.scale = 1;
        
        // 回调
        this.onViewportChange = null;
        
        this._createCanvas();
    }

    /**
     * 创建Canvas
     * @private
     */
    _createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        this.canvas.style.borderRadius = '4px';
        
        this._updatePosition();
        
        this.ctx = this.canvas.getContext('2d');
        
        // 绑定事件
        this.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this._handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this._handleMouseUp());
        this.canvas.addEventListener('click', (e) => this._handleClick(e));
    }

    /**
     * 更新位置
     * @private
     */
    _updatePosition() {
        const positions = {
            'top-left': { top: this.padding + 'px', left: this.padding + 'px' },
            'top-right': { top: this.padding + 'px', right: this.padding + 'px' },
            'bottom-left': { bottom: this.padding + 'px', left: this.padding + 'px' },
            'bottom-right': { bottom: this.padding + 'px', right: this.padding + 'px' }
        };
        
        const pos = positions[this.position] || positions['bottom-right'];
        Object.assign(this.canvas.style, pos);
    }

    /**
     * 挂载到容器
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container && this.canvas) {
            container.appendChild(this.canvas);
        }
    }

    /**
     * 卸载
     */
    unmount() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }

    /**
     * 更新场景边界
     */
    updateSceneBounds(components) {
        if (!components || components.length === 0) {
            this.sceneBounds = { minX: 0, minY: 0, maxX: 1920, maxY: 1080 };
            return;
        }
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        components.forEach(comp => {
            const pos = comp.pos || comp.position || { x: comp.x || 0, y: comp.y || 0 };
            const bounds = comp.getBounds ? comp.getBounds() : { width: 60, height: 60 };
            
            const left = pos.x - bounds.width / 2;
            const right = pos.x + bounds.width / 2;
            const top = pos.y - bounds.height / 2;
            const bottom = pos.y + bounds.height / 2;
            
            minX = Math.min(minX, left);
            maxX = Math.max(maxX, right);
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, bottom);
        });
        
        // 添加边距
        const margin = 100;
        this.sceneBounds = {
            minX: minX - margin,
            minY: minY - margin,
            maxX: maxX + margin,
            maxY: maxY + margin
        };
    }

    /**
     * 更新视口
     */
    updateViewport(viewport) {
        this.viewport = { ...viewport };
    }

    /**
     * 渲染缩略图
     */
    render(components, rays = []) {
        if (!this.visible || !this.ctx) return;
        
        const ctx = this.ctx;
        const { minX, minY, maxX, maxY } = this.sceneBounds;
        const sceneWidth = maxX - minX;
        const sceneHeight = maxY - minY;
        
        // 计算缩放比例
        const scaleX = (this.width - 20) / sceneWidth;
        const scaleY = (this.height - 20) / sceneHeight;
        this.scale = Math.min(scaleX, scaleY);
        
        // 清空
        ctx.clearRect(0, 0, this.width, this.height);
        
        // 背景
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 边框
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = this.borderWidth;
        ctx.strokeRect(0, 0, this.width, this.height);
        
        // 保存状态
        ctx.save();
        
        // 居中偏移
        const offsetX = (this.width - sceneWidth * this.scale) / 2;
        const offsetY = (this.height - sceneHeight * this.scale) / 2;
        
        ctx.translate(offsetX, offsetY);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-minX, -minY);
        
        // 渲染光线
        if (rays && rays.length > 0) {
            this._renderRays(ctx, rays);
        }
        
        // 渲染组件
        if (components && components.length > 0) {
            this._renderComponents(ctx, components);
        }
        
        ctx.restore();
        
        // 渲染视口指示器
        this._renderViewport(ctx, offsetX, offsetY);
    }

    /**
     * 渲染组件
     * @private
     */
    _renderComponents(ctx, components) {
        components.forEach(comp => {
            const pos = comp.pos || comp.position || { x: comp.x || 0, y: comp.y || 0 };
            const bounds = comp.getBounds ? comp.getBounds() : { width: 60, height: 60 };
            
            ctx.fillStyle = comp.color || '#4488ff';
            ctx.fillRect(
                pos.x - bounds.width / 2,
                pos.y - bounds.height / 2,
                bounds.width,
                bounds.height
            );
        });
    }

    /**
     * 渲染光线
     * @private
     */
    _renderRays(ctx, rays) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1 / this.scale;
        
        rays.forEach(ray => {
            if (ray.pathPoints && ray.pathPoints.length > 1) {
                ctx.beginPath();
                ctx.moveTo(ray.pathPoints[0].x, ray.pathPoints[0].y);
                for (let i = 1; i < ray.pathPoints.length; i++) {
                    ctx.lineTo(ray.pathPoints[i].x, ray.pathPoints[i].y);
                }
                ctx.stroke();
            }
        });
    }

    /**
     * 渲染视口指示器
     * @private
     */
    _renderViewport(ctx, offsetX, offsetY) {
        const { minX, minY } = this.sceneBounds;
        
        const vpX = (this.viewport.x - minX) * this.scale + offsetX;
        const vpY = (this.viewport.y - minY) * this.scale + offsetY;
        const vpW = this.viewport.width * this.scale;
        const vpH = this.viewport.height * this.scale;
        
        // 填充
        ctx.fillStyle = this.viewportColor;
        ctx.fillRect(vpX, vpY, vpW, vpH);
        
        // 边框
        ctx.strokeStyle = this.viewportBorderColor;
        ctx.lineWidth = this.viewportBorderWidth;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
    }

    /**
     * 处理鼠标按下
     * @private
     */
    _handleMouseDown(e) {
        this.isDragging = true;
        this.dragStartPos = { x: e.offsetX, y: e.offsetY };
        this.canvas.style.cursor = 'grabbing';
    }

    /**
     * 处理鼠标移动
     * @private
     */
    _handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const dx = e.offsetX - this.dragStartPos.x;
        const dy = e.offsetY - this.dragStartPos.y;
        
        this.dragStartPos = { x: e.offsetX, y: e.offsetY };
        
        // 转换为场景坐标
        const sceneDx = dx / this.scale;
        const sceneDy = dy / this.scale;
        
        // 更新视口
        this.viewport.x += sceneDx;
        this.viewport.y += sceneDy;
        
        // 触发回调
        if (this.onViewportChange) {
            this.onViewportChange(this.viewport);
        }
    }

    /**
     * 处理鼠标释放
     * @private
     */
    _handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'pointer';
    }

    /**
     * 处理点击
     * @private
     */
    _handleClick(e) {
        if (this.isDragging) return;
        
        const { minX, minY } = this.sceneBounds;
        const offsetX = (this.width - (this.sceneBounds.maxX - minX) * this.scale) / 2;
        const offsetY = (this.height - (this.sceneBounds.maxY - minY) * this.scale) / 2;
        
        // 转换为场景坐标
        const sceneX = (e.offsetX - offsetX) / this.scale + minX;
        const sceneY = (e.offsetY - offsetY) / this.scale + minY;
        
        // 居中视口到点击位置
        this.viewport.x = sceneX - this.viewport.width / 2;
        this.viewport.y = sceneY - this.viewport.height / 2;
        
        // 触发回调
        if (this.onViewportChange) {
            this.onViewportChange(this.viewport);
        }
    }

    /**
     * 设置位置
     */
    setPosition(position) {
        this.position = position;
        this._updatePosition();
    }

    /**
     * 显示
     */
    show() {
        this.visible = true;
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
    }

    /**
     * 隐藏
     */
    hide() {
        this.visible = false;
        if (this.canvas) {
            this.canvas.style.display = 'none';
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
     * 设置视口变化回调
     */
    setOnViewportChange(callback) {
        this.onViewportChange = callback;
    }

    /**
     * 销毁
     */
    destroy() {
        this.unmount();
        this.canvas = null;
        this.ctx = null;
    }
}

// ========== 单例模式 ==========
let minimapInstance = null;

export function getMinimap(config) {
    if (!minimapInstance) {
        minimapInstance = new Minimap(config);
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
