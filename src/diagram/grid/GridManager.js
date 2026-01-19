/**
 * GridManager.js - 网格管理器
 * 管理网格显示、吸附和对齐功能
 * 
 * Requirements: 11.1, 11.2
 */

/**
 * 网格类型
 */
export const GridType = {
    RECTANGULAR: 'rectangular',
    POLAR: 'polar',
    ISOMETRIC: 'isometric'
};

/**
 * 网格管理器类
 */
export class GridManager {
    constructor() {
        // 网格配置
        this.enabled = true;
        this.visible = true;
        this.type = GridType.RECTANGULAR;
        
        // 矩形网格
        this.spacing = 20;
        this.subdivisions = 4;
        this.majorLineColor = 'rgba(200, 200, 200, 0.5)';
        this.minorLineColor = 'rgba(220, 220, 220, 0.3)';
        this.majorLineWidth = 1;
        this.minorLineWidth = 0.5;
        
        // 极坐标网格
        this.polarCenter = { x: 0, y: 0 };
        this.polarRadialSpacing = 50;
        this.polarAngularDivisions = 12;
        
        // 吸附配置
        this.snapEnabled = true;
        this.snapThreshold = 10;
        this.snapToGrid = true;
        this.snapToObjects = true;
        this.snapToGuides = true;
        
        // 角度吸附
        this.angleSnapEnabled = true;
        this.angleSnapInterval = 15; // 度
        
        // 智能参考线
        this.guides = [];
        this.showGuides = true;
        this.guideColor = 'rgba(68, 136, 255, 0.8)';
        this.guideWidth = 1;
        this.guideDash = [5, 5];
    }

    /**
     * 渲染网格
     */
    render(ctx, viewport) {
        if (!this.visible) return;
        
        ctx.save();
        
        switch (this.type) {
            case GridType.RECTANGULAR:
                this._renderRectangularGrid(ctx, viewport);
                break;
            case GridType.POLAR:
                this._renderPolarGrid(ctx, viewport);
                break;
            case GridType.ISOMETRIC:
                this._renderIsometricGrid(ctx, viewport);
                break;
        }
        
        // 渲染参考线
        if (this.showGuides && this.guides.length > 0) {
            this._renderGuides(ctx, viewport);
        }
        
        ctx.restore();
    }

    /**
     * 渲染矩形网格
     * @private
     */
    _renderRectangularGrid(ctx, viewport) {
        const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = viewport;
        
        const minorSpacing = this.spacing / this.subdivisions;
        const startX = Math.floor(viewX / minorSpacing) * minorSpacing;
        const startY = Math.floor(viewY / minorSpacing) * minorSpacing;
        const endX = viewX + viewWidth;
        const endY = viewY + viewHeight;
        
        // 绘制次要网格线
        ctx.strokeStyle = this.minorLineColor;
        ctx.lineWidth = this.minorLineWidth;
        ctx.beginPath();
        
        for (let x = startX; x <= endX; x += minorSpacing) {
            if (Math.abs(x % this.spacing) < 0.01) continue; // 跳过主要网格线
            ctx.moveTo(x, viewY);
            ctx.lineTo(x, viewY + viewHeight);
        }
        
        for (let y = startY; y <= endY; y += minorSpacing) {
            if (Math.abs(y % this.spacing) < 0.01) continue;
            ctx.moveTo(viewX, y);
            ctx.lineTo(viewX + viewWidth, y);
        }
        
        ctx.stroke();
        
        // 绘制主要网格线
        ctx.strokeStyle = this.majorLineColor;
        ctx.lineWidth = this.majorLineWidth;
        ctx.beginPath();
        
        const majorStartX = Math.floor(viewX / this.spacing) * this.spacing;
        const majorStartY = Math.floor(viewY / this.spacing) * this.spacing;
        
        for (let x = majorStartX; x <= endX; x += this.spacing) {
            ctx.moveTo(x, viewY);
            ctx.lineTo(x, viewY + viewHeight);
        }
        
        for (let y = majorStartY; y <= endY; y += this.spacing) {
            ctx.moveTo(viewX, y);
            ctx.lineTo(viewX + viewWidth, y);
        }
        
        ctx.stroke();
        
        // 绘制原点标记
        if (viewX <= 0 && viewX + viewWidth >= 0 && viewY <= 0 && viewY + viewHeight >= 0) {
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.moveTo(0, -10);
            ctx.lineTo(0, 10);
            ctx.stroke();
        }
    }

    /**
     * 渲染极坐标网格
     * @private
     */
    _renderPolarGrid(ctx, viewport) {
        const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = viewport;
        const center = this.polarCenter;
        
        // 检查中心是否在视口内
        if (center.x < viewX - 500 || center.x > viewX + viewWidth + 500 ||
            center.y < viewY - 500 || center.y > viewY + viewHeight + 500) {
            return;
        }
        
        ctx.strokeStyle = this.minorLineColor;
        ctx.lineWidth = this.minorLineWidth;
        
        // 绘制径向圆
        const maxRadius = Math.max(viewWidth, viewHeight);
        for (let r = this.polarRadialSpacing; r <= maxRadius; r += this.polarRadialSpacing) {
            ctx.beginPath();
            ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // 绘制角度线
        const angleStep = (Math.PI * 2) / this.polarAngularDivisions;
        for (let i = 0; i < this.polarAngularDivisions; i++) {
            const angle = i * angleStep;
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(
                center.x + Math.cos(angle) * maxRadius,
                center.y + Math.sin(angle) * maxRadius
            );
            ctx.stroke();
        }
        
        // 绘制中心点
        ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 渲染等距网格
     * @private
     */
    _renderIsometricGrid(ctx, viewport) {
        const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = viewport;
        
        const angle1 = Math.PI / 6; // 30度
        const angle2 = -Math.PI / 6;
        const spacing = this.spacing;
        
        ctx.strokeStyle = this.minorLineColor;
        ctx.lineWidth = this.minorLineWidth;
        ctx.beginPath();
        
        // 绘制第一组平行线
        const dx1 = Math.cos(angle1) * spacing;
        const dy1 = Math.sin(angle1) * spacing;
        
        for (let i = -50; i < 50; i++) {
            const startX = viewX + i * dx1;
            const startY = viewY + i * dy1;
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + viewWidth, startY + viewWidth * Math.tan(angle1));
        }
        
        // 绘制第二组平行线
        const dx2 = Math.cos(angle2) * spacing;
        const dy2 = Math.sin(angle2) * spacing;
        
        for (let i = -50; i < 50; i++) {
            const startX = viewX + i * dx2;
            const startY = viewY + i * dy2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + viewWidth, startY + viewWidth * Math.tan(angle2));
        }
        
        // 绘制垂直线
        for (let x = viewX; x <= viewX + viewWidth; x += spacing) {
            ctx.moveTo(x, viewY);
            ctx.lineTo(x, viewY + viewHeight);
        }
        
        ctx.stroke();
    }

    /**
     * 渲染参考线
     * @private
     */
    _renderGuides(ctx, viewport) {
        ctx.strokeStyle = this.guideColor;
        ctx.lineWidth = this.guideWidth;
        ctx.setLineDash(this.guideDash);
        
        this.guides.forEach(guide => {
            ctx.beginPath();
            if (guide.type === 'vertical') {
                ctx.moveTo(guide.position, viewport.y);
                ctx.lineTo(guide.position, viewport.y + viewport.height);
            } else if (guide.type === 'horizontal') {
                ctx.moveTo(viewport.x, guide.position);
                ctx.lineTo(viewport.x + viewport.width, guide.position);
            }
            ctx.stroke();
        });
        
        ctx.setLineDash([]);
    }

    /**
     * 吸附到网格
     */
    snapToGridPoint(position) {
        if (!this.snapEnabled || !this.snapToGrid) {
            return { ...position };
        }
        
        switch (this.type) {
            case GridType.RECTANGULAR:
                return {
                    x: Math.round(position.x / this.spacing) * this.spacing,
                    y: Math.round(position.y / this.spacing) * this.spacing
                };
            
            case GridType.POLAR:
                const dx = position.x - this.polarCenter.x;
                const dy = position.y - this.polarCenter.y;
                const r = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                
                const snappedR = Math.round(r / this.polarRadialSpacing) * this.polarRadialSpacing;
                const angleStep = (Math.PI * 2) / this.polarAngularDivisions;
                const snappedAngle = Math.round(angle / angleStep) * angleStep;
                
                return {
                    x: this.polarCenter.x + Math.cos(snappedAngle) * snappedR,
                    y: this.polarCenter.y + Math.sin(snappedAngle) * snappedR
                };
            
            default:
                return { ...position };
        }
    }

    /**
     * 吸附角度
     */
    snapAngle(angle) {
        if (!this.angleSnapEnabled) {
            return angle;
        }
        
        const snapRad = (this.angleSnapInterval * Math.PI) / 180;
        return Math.round(angle / snapRad) * snapRad;
    }

    /**
     * 查找吸附点
     */
    findSnapPoint(position, objects = []) {
        if (!this.snapEnabled) {
            return { position: { ...position }, snapped: false };
        }
        
        let bestSnap = { position: { ...position }, snapped: false, distance: Infinity };
        
        // 吸附到网格
        if (this.snapToGrid) {
            const gridSnap = this.snapToGridPoint(position);
            const dist = Math.hypot(gridSnap.x - position.x, gridSnap.y - position.y);
            if (dist < this.snapThreshold && dist < bestSnap.distance) {
                bestSnap = { position: gridSnap, snapped: true, distance: dist, type: 'grid' };
            }
        }
        
        // 吸附到对象
        if (this.snapToObjects && objects.length > 0) {
            const objectSnap = this._findObjectSnapPoint(position, objects);
            if (objectSnap.snapped && objectSnap.distance < bestSnap.distance) {
                bestSnap = objectSnap;
            }
        }
        
        // 吸附到参考线
        if (this.snapToGuides && this.guides.length > 0) {
            const guideSnap = this._findGuideSnapPoint(position);
            if (guideSnap.snapped && guideSnap.distance < bestSnap.distance) {
                bestSnap = guideSnap;
            }
        }
        
        return bestSnap;
    }

    /**
     * 查找对象吸附点
     * @private
     */
    _findObjectSnapPoint(position, objects) {
        let bestSnap = { position: { ...position }, snapped: false, distance: Infinity };
        
        objects.forEach(obj => {
            const objPos = obj.pos || obj.position || { x: obj.x || 0, y: obj.y || 0 };
            const dist = Math.hypot(objPos.x - position.x, objPos.y - position.y);
            
            if (dist < this.snapThreshold && dist < bestSnap.distance) {
                bestSnap = {
                    position: { ...objPos },
                    snapped: true,
                    distance: dist,
                    type: 'object',
                    object: obj
                };
            }
        });
        
        return bestSnap;
    }

    /**
     * 查找参考线吸附点
     * @private
     */
    _findGuideSnapPoint(position) {
        let bestSnap = { position: { ...position }, snapped: false, distance: Infinity };
        
        this.guides.forEach(guide => {
            let dist, snappedPos;
            
            if (guide.type === 'vertical') {
                dist = Math.abs(position.x - guide.position);
                snappedPos = { x: guide.position, y: position.y };
            } else {
                dist = Math.abs(position.y - guide.position);
                snappedPos = { x: position.x, y: guide.position };
            }
            
            if (dist < this.snapThreshold && dist < bestSnap.distance) {
                bestSnap = {
                    position: snappedPos,
                    snapped: true,
                    distance: dist,
                    type: 'guide',
                    guide
                };
            }
        });
        
        return bestSnap;
    }

    /**
     * 添加参考线
     */
    addGuide(type, position) {
        const guide = { type, position, id: Date.now() };
        this.guides.push(guide);
        return guide;
    }

    /**
     * 删除参考线
     */
    removeGuide(guideId) {
        const index = this.guides.findIndex(g => g.id === guideId);
        if (index !== -1) {
            this.guides.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 清除所有参考线
     */
    clearGuides() {
        this.guides = [];
    }

    /**
     * 设置网格间距
     */
    setSpacing(spacing) {
        this.spacing = Math.max(1, spacing);
    }

    /**
     * 设置网格类型
     */
    setType(type) {
        if (Object.values(GridType).includes(type)) {
            this.type = type;
        }
    }

    /**
     * 切换网格可见性
     */
    toggleVisible() {
        this.visible = !this.visible;
    }

    /**
     * 切换吸附
     */
    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            enabled: this.enabled,
            visible: this.visible,
            type: this.type,
            spacing: this.spacing,
            subdivisions: this.subdivisions,
            snapEnabled: this.snapEnabled,
            snapThreshold: this.snapThreshold,
            angleSnapEnabled: this.angleSnapEnabled,
            angleSnapInterval: this.angleSnapInterval,
            guides: this.guides.map(g => ({ ...g }))
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        Object.assign(this, data);
    }
}

// ========== 单例模式 ==========
let gridManagerInstance = null;

export function getGridManager() {
    if (!gridManagerInstance) {
        gridManagerInstance = new GridManager();
    }
    return gridManagerInstance;
}

export function resetGridManager() {
    gridManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.GridManager = GridManager;
    window.getGridManager = getGridManager;
    window.GridType = GridType;
}
