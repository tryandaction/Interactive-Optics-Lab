/**
 * ConnectionPointManager.js - 连接点管理器
 * 管理光学元件的连接点定义、渲染和交互
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.1, 5.7
 */

import { getProfessionalIconManager, CONNECTION_POINT_TYPES } from './ProfessionalIconManager.js';
import { getEventBus } from './EventBus.js';

/**
 * 生成唯一ID
 */
function generateConnectionId() {
    return 'conn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 连接点渲染样式
 */
export const CONNECTION_POINT_STYLES = {
    DEFAULT: {
        radius: 5,
        fillColor: '#ffffff',
        strokeColor: '#666666',
        strokeWidth: 1.5,
        labelFont: '10px Arial',
        labelColor: '#333333'
    },
    HOVER: {
        radius: 7,
        fillColor: '#4488ff',
        strokeColor: '#2266cc',
        strokeWidth: 2,
        labelFont: 'bold 10px Arial',
        labelColor: '#2266cc'
    },
    SELECTED: {
        radius: 7,
        fillColor: '#ff8844',
        strokeColor: '#cc6622',
        strokeWidth: 2,
        labelFont: 'bold 10px Arial',
        labelColor: '#cc6622'
    },
    CONNECTED: {
        radius: 5,
        fillColor: '#44cc44',
        strokeColor: '#228822',
        strokeWidth: 1.5,
        labelFont: '10px Arial',
        labelColor: '#228822'
    },
    INPUT: {
        radius: 5,
        fillColor: '#aaddff',
        strokeColor: '#4488cc',
        strokeWidth: 1.5
    },
    OUTPUT: {
        radius: 5,
        fillColor: '#ffddaa',
        strokeColor: '#cc8844',
        strokeWidth: 1.5
    }
};

/**
 * 连接点实例类
 * 表示一个具体组件上的连接点实例
 */
export class ConnectionPointInstance {
    constructor(config) {
        this.id = config.id || generateConnectionId();
        this.componentId = config.componentId;
        this.pointId = config.pointId;
        this.label = config.label || '';
        this.type = config.type || CONNECTION_POINT_TYPES.BIDIRECTIONAL;
        this.direction = config.direction || 0;
        
        // 相对位置 (0-1)
        this.relativePosition = config.relativePosition || { x: 0.5, y: 0.5 };
        
        // 世界坐标（计算得出）
        this.worldPosition = { x: 0, y: 0 };
        this.worldDirection = 0;
        
        // 连接状态
        this.connectedLinks = [];
        this.isCustom = config.isCustom || false;
    }

    /**
     * 更新世界坐标
     */
    updateWorldPosition(componentPos, componentAngle, componentScale, iconWidth, iconHeight) {
        const localX = (this.relativePosition.x - 0.5) * iconWidth * componentScale;
        const localY = (this.relativePosition.y - 0.5) * iconHeight * componentScale;
        
        const cos = Math.cos(componentAngle);
        const sin = Math.sin(componentAngle);
        
        this.worldPosition.x = componentPos.x + localX * cos - localY * sin;
        this.worldPosition.y = componentPos.y + localX * sin + localY * cos;
        this.worldDirection = (this.direction * Math.PI / 180) + componentAngle;
    }

    /**
     * 检查是否已连接
     */
    isConnected() {
        return this.connectedLinks.length > 0;
    }

    /**
     * 添加连接
     */
    addConnection(linkId) {
        if (!this.connectedLinks.includes(linkId)) {
            this.connectedLinks.push(linkId);
        }
    }

    /**
     * 移除连接
     */
    removeConnection(linkId) {
        const index = this.connectedLinks.indexOf(linkId);
        if (index !== -1) {
            this.connectedLinks.splice(index, 1);
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            componentId: this.componentId,
            pointId: this.pointId,
            label: this.label,
            type: this.type,
            direction: this.direction,
            relativePosition: { ...this.relativePosition },
            isCustom: this.isCustom
        };
    }
}

/**
 * 连接点管理器类
 */
export class ConnectionPointManager {
    /** @type {number} 淡入淡出动画时长 (ms) */
    static FADE_DURATION = 150;

    constructor(config = {}) {
        /** @type {Map<string, ConnectionPointInstance[]>} 组件ID -> 连接点实例数组 */
        this.componentPoints = new Map();

        /** @type {Map<string, ConnectionPointInstance>} 连接点ID -> 连接点实例 */
        this.pointsById = new Map();

        /** @type {ConnectionPointInstance|null} 当前悬停的连接点 */
        this.hoveredPoint = null;

        /** @type {ConnectionPointInstance|null} 当前选中的连接点 */
        this.selectedPoint = null;

        /** @type {boolean} 是否显示连接点（兼容旧代码） */
        this.visible = config.visible !== false;

        /** @type {'smart'|'always'|'hidden'} 可见性模式 */
        this.visibilityMode = config.visibilityMode || 'smart';

        /** @type {string|null} 当前悬停的组件ID */
        this.hoveredComponentId = null;

        /** @type {Set<string>} 当前选中的组件ID集合 */
        this.selectedComponentIds = new Set();

        /** @type {boolean} 是否处于链接创建模式 */
        this.isLinkModeActive = false;

        /** @type {Map<string, number>} 组件ID -> 当前连接点透明度 (0~1) */
        this.componentOpacity = new Map();

        /** @type {boolean} 是否有正在进行的淡入淡出动画 */
        this._isAnimating = false;

        /** @type {number} 上一帧时间戳 */
        this._lastFrameTime = 0;

        /** @type {boolean} 是否显示标签 */
        this.showLabels = config.showLabels !== false;

        /** @type {number} 吸附距离 */
        this.snapDistance = config.snapDistance || 20;

        /** @type {boolean} 是否启用吸附 */
        this.snapEnabled = config.snapEnabled !== false;

        /** @type {number} 命中测试容差 */
        this.hitTestTolerance = config.hitTestTolerance || 10;

        this.iconManager = getProfessionalIconManager();
        this.eventBus = config.eventBus || getEventBus();

        // 统计
        this.stats = {
            totalPoints: 0,
            customPoints: 0,
            connectedPoints: 0
        };
    }

    // ========== 智能可见性 API ==========

    /**
     * 设置可见性模式
     * @param {'smart'|'always'|'hidden'} mode
     */
    setVisibilityMode(mode) {
        if (!['smart', 'always', 'hidden'].includes(mode)) return;
        this.visibilityMode = mode;
        // 兼容旧 visible 属性
        this.visible = mode !== 'hidden';
        this.eventBus.emit('connectionpoint:visibility-changed', { mode });
    }

    /**
     * 设置当前悬停的组件
     * @param {string|null} componentId
     */
    setHoveredComponent(componentId) {
        if (this.hoveredComponentId === componentId) return;
        this.hoveredComponentId = componentId;
    }

    /**
     * 设置当前选中的组件ID集合
     * @param {Iterable<string>} ids
     */
    setSelectedComponents(ids) {
        this.selectedComponentIds = new Set(ids);
    }

    /**
     * 设置链接模式激活状态
     * @param {boolean} active
     */
    setLinkModeActive(active) {
        this.isLinkModeActive = !!active;
    }

    /**
     * 判断指定组件的连接点是否应该显示（smart 模式下）
     * @param {string} componentId
     * @returns {boolean}
     * @private
     */
    _shouldShowForComponent(componentId) {
        if (this.isLinkModeActive) return true;
        if (this.hoveredComponentId === componentId) return true;
        if (this.selectedComponentIds.has(componentId)) return true;
        return false;
    }

    /**
     * 获取指定组件连接点的目标透明度
     * @param {string} componentId
     * @returns {number} 0 或 1
     * @private
     */
    _getTargetOpacity(componentId) {
        if (this.visibilityMode === 'hidden') return 0;
        if (this.visibilityMode === 'always') return 1;
        // smart 模式
        return this._shouldShowForComponent(componentId) ? 1 : 0;
    }

    /**
     * 更新所有组件连接点的淡入淡出动画
     * @param {number} dt - 帧间隔 (ms)
     * @returns {boolean} 是否仍有动画在进行
     * @private
     */
    _updateFadeAnimations(dt) {
        let animating = false;
        const speed = dt / ConnectionPointManager.FADE_DURATION;

        this.componentPoints.forEach((_, componentId) => {
            const target = this._getTargetOpacity(componentId);
            const current = this.componentOpacity.get(componentId) ?? 0;

            if (Math.abs(current - target) < 0.01) {
                this.componentOpacity.set(componentId, target);
                return;
            }

            const next = current < target
                ? Math.min(current + speed, 1)
                : Math.max(current - speed, 0);
            this.componentOpacity.set(componentId, next);
            animating = true;
        });

        this._isAnimating = animating;
        return animating;
    }

    /**
     * 是否有正在进行的动画
     * @returns {boolean}
     */
    isAnimating() {
        return this._isAnimating;
    }

    /**
     * 为组件初始化连接点
     */
    initializeComponentPoints(component) {
        const componentId = component.id || component.uuid;
        const componentType = component.type || component.constructor?.name;
        
        // 获取图标定义的连接点
        const iconPoints = this.iconManager.getConnectionPoints(componentType);
        
        // 创建连接点实例
        const instances = iconPoints.map(pointDef => {
            const instance = new ConnectionPointInstance({
                componentId: componentId,
                pointId: pointDef.id,
                label: pointDef.label,
                type: pointDef.type,
                direction: pointDef.direction,
                relativePosition: pointDef.position,
                isCustom: false
            });
            this.pointsById.set(instance.id, instance);
            return instance;
        });
        
        this.componentPoints.set(componentId, instances);
        return instances;
    }

    /**
     * 获取组件的所有连接点
     */
    getComponentPoints(componentId) {
        return this.componentPoints.get(componentId) || [];
    }

    /**
     * 获取连接点实例
     */
    getPointById(pointInstanceId) {
        return this.pointsById.get(pointInstanceId) || null;
    }

    /**
     * 通过组件ID和点ID获取连接点
     */
    getPoint(componentId, pointId) {
        const points = this.componentPoints.get(componentId);
        if (!points) return null;
        return points.find(p => p.pointId === pointId) || null;
    }

    /**
     * 更新组件的连接点世界坐标
     */
    updateComponentPoints(component) {
        const componentId = component.id || component.uuid;
        const componentType = component.type || component.constructor?.name;
        const points = this.componentPoints.get(componentId);
        
        if (!points) return;
        
        const icon = this.iconManager.getIconDefinition(componentType);
        const iconWidth = icon?.width || 60;
        const iconHeight = icon?.height || 60;
        
        const pos = component.pos || { x: component.x || 0, y: component.y || 0 };
        const angle = component.angle ?? component.angleRad ?? 0;
        const scale = component.scale || 1;
        
        points.forEach(point => {
            point.updateWorldPosition(pos, angle, scale, iconWidth, iconHeight);
        });
    }

    /**
     * 添加自定义连接点
     */
    addCustomPoint(componentId, config) {
        const instance = new ConnectionPointInstance({
            componentId: componentId,
            pointId: config.pointId || 'custom_' + Date.now(),
            label: config.label || 'custom',
            type: config.type || CONNECTION_POINT_TYPES.BIDIRECTIONAL,
            direction: config.direction || 0,
            relativePosition: config.position || { x: 0.5, y: 0.5 },
            isCustom: true
        });
        
        this.pointsById.set(instance.id, instance);
        
        let points = this.componentPoints.get(componentId);
        if (!points) {
            points = [];
            this.componentPoints.set(componentId, points);
        }
        points.push(instance);
        
        return instance;
    }

    /**
     * 删除自定义连接点
     */
    removeCustomPoint(pointInstanceId) {
        const point = this.pointsById.get(pointInstanceId);
        if (!point || !point.isCustom) return false;
        
        this.pointsById.delete(pointInstanceId);
        
        const points = this.componentPoints.get(point.componentId);
        if (points) {
            const index = points.indexOf(point);
            if (index !== -1) {
                points.splice(index, 1);
            }
        }
        
        this.stats.customPoints--;
        this.stats.totalPoints--;
        
        // 发布事件
        this.eventBus.emit('connectionpoint:removed', {
            pointId: pointInstanceId,
            componentId: point.componentId
        });
        
        return true;
    }
    
    /**
     * 命中测试 - 查找指定位置的连接点
     * @param {Object} position - {x, y} 世界坐标
     * @returns {ConnectionPointInstance|null}
     */
    hitTest(position) {
        return this.findPointAtPosition(position);
    }
    
    /**
     * 获取统计信息
     * @returns {Object}
     */
    getStats() {
        // 更新统计
        this.stats.totalPoints = this.pointsById.size;
        this.stats.customPoints = Array.from(this.pointsById.values())
            .filter(p => p.isCustom).length;
        this.stats.connectedPoints = Array.from(this.pointsById.values())
            .filter(p => p.isConnected()).length;
        
        return { ...this.stats };
    }
    
    /**
     * 设置可见性（兼容旧代码）
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.visible = visible;
        if (!visible) {
            this.visibilityMode = 'hidden';
        } else if (this.visibilityMode === 'hidden') {
            this.visibilityMode = 'smart';
        }
        this.eventBus.emit('connectionpoint:visibility-changed', { visible });
    }

    /**
     * 设置吸附开关
     * @param {boolean} enabled
     */
    setSnapEnabled(enabled) {
        this.snapEnabled = enabled;
        this.eventBus.emit('connectionpoint:snap-changed', { enabled });
    }
    
    /**
     * 切换标签显示
     * @param {boolean} show
     */
    setShowLabels(show) {
        this.showLabels = show;
        this.eventBus.emit('connectionpoint:labels-changed', { show });
    }

    /**
     * 更新自定义连接点
     */
    updateCustomPoint(pointInstanceId, config) {
        const point = this.pointsById.get(pointInstanceId);
        if (!point || !point.isCustom) return false;
        
        if (config.label !== undefined) point.label = config.label;
        if (config.type !== undefined) point.type = config.type;
        if (config.direction !== undefined) point.direction = config.direction;
        if (config.position !== undefined) {
            point.relativePosition = { ...config.position };
        }
        
        return true;
    }

    /**
     * 删除组件的所有连接点
     */
    removeComponentPoints(componentId) {
        const points = this.componentPoints.get(componentId);
        if (points) {
            points.forEach(p => this.pointsById.delete(p.id));
            this.componentPoints.delete(componentId);
        }
    }

    /**
     * 查找最近的连接点
     */
    findNearestPoint(position, excludeComponentId = null, maxDistance = null, options = {}) {
        if (!this.snapEnabled && options.ignoreSnap !== true) return null;
        const scale = (typeof window !== 'undefined' && window.cameraScale) ? window.cameraScale : 1;
        const baseDistance = maxDistance || this.snapDistance;
        const searchDistance = baseDistance / Math.max(1e-6, scale);
        let nearest = null;
        let minDist = searchDistance;
        
        this.componentPoints.forEach((points, componentId) => {
            if (componentId === excludeComponentId) return;
            
            points.forEach(point => {
                const dist = Math.hypot(
                    position.x - point.worldPosition.x,
                    position.y - point.worldPosition.y
                );
                if (dist < minDist) {
                    minDist = dist;
                    nearest = point;
                }
            });
        });
        
        return nearest;
    }

    /**
     * 查找指定位置的连接点
     */
    findPointAtPosition(position, tolerance = 10) {
        const scale = (typeof window !== 'undefined' && window.cameraScale) ? window.cameraScale : 1;
        const effectiveTolerance = tolerance / Math.max(1e-6, scale);
        for (const [_, points] of this.componentPoints) {
            for (const point of points) {
                const dist = Math.hypot(
                    position.x - point.worldPosition.x,
                    position.y - point.worldPosition.y
                );
                if (dist <= effectiveTolerance) {
                    return point;
                }
            }
        }
        return null;
    }

    /**
     * 设置悬停状态
     */
    setHoveredPoint(point) {
        this.hoveredPoint = point;
    }

    /**
     * 设置选中状态
     */
    setSelectedPoint(point) {
        this.selectedPoint = point;
    }

    /**
     * 渲染所有连接点
     * @returns {boolean} 是否需要继续重绘（动画中）
     */
    render(ctx, components) {
        // hidden 模式或旧 visible=false 直接跳过
        if (this.visibilityMode === 'hidden' || !this.visible) return false;

        const now = performance.now();
        const dt = this._lastFrameTime ? (now - this._lastFrameTime) : 16;
        this._lastFrameTime = now;

        // 先更新所有连接点位置
        components.forEach(comp => {
            const componentId = comp.id || comp.uuid;
            if (!this.componentPoints.has(componentId)) {
                this.initializeComponentPoints(comp);
            }
            this.updateComponentPoints(comp);
        });

        // always 模式：全部渲染，无动画
        if (this.visibilityMode === 'always') {
            this.componentPoints.forEach((points) => {
                points.forEach(point => this._renderPoint(ctx, point, 1));
            });
            return false;
        }

        // smart 模式：按组件透明度渲染
        const stillAnimating = this._updateFadeAnimations(dt);

        this.componentPoints.forEach((points, componentId) => {
            const opacity = this.componentOpacity.get(componentId) ?? 0;
            if (opacity <= 0.01) return; // 完全透明，跳过
            points.forEach(point => this._renderPoint(ctx, point, opacity));
        });

        return stillAnimating;
    }

    /**
     * 渲染单个连接点
     * @param {CanvasRenderingContext2D} ctx
     * @param {ConnectionPointInstance} point
     * @param {number} opacity - 透明度 (0~1)
     * @private
     */
    _renderPoint(ctx, point, opacity = 1) {
        const { worldPosition } = point;

        // 确定样式
        let style = CONNECTION_POINT_STYLES.DEFAULT;
        if (point === this.selectedPoint) {
            style = CONNECTION_POINT_STYLES.SELECTED;
        } else if (point === this.hoveredPoint) {
            style = CONNECTION_POINT_STYLES.HOVER;
        } else if (point.isConnected()) {
            style = CONNECTION_POINT_STYLES.CONNECTED;
        } else if (point.type === CONNECTION_POINT_TYPES.INPUT) {
            style = { ...CONNECTION_POINT_STYLES.DEFAULT, ...CONNECTION_POINT_STYLES.INPUT };
        } else if (point.type === CONNECTION_POINT_TYPES.OUTPUT) {
            style = { ...CONNECTION_POINT_STYLES.DEFAULT, ...CONNECTION_POINT_STYLES.OUTPUT };
        }

        ctx.save();
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * opacity;
        
        // 绘制连接点圆圈
        ctx.beginPath();
        ctx.arc(worldPosition.x, worldPosition.y, style.radius, 0, Math.PI * 2);
        ctx.fillStyle = style.fillColor;
        ctx.fill();
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.stroke();
        
        // 绘制方向指示器
        if (point.type !== CONNECTION_POINT_TYPES.BIDIRECTIONAL) {
            const arrowLen = style.radius + 5;
            const arrowX = worldPosition.x + Math.cos(point.worldDirection) * arrowLen;
            const arrowY = worldPosition.y + Math.sin(point.worldDirection) * arrowLen;
            
            ctx.beginPath();
            ctx.moveTo(worldPosition.x + Math.cos(point.worldDirection) * style.radius,
                       worldPosition.y + Math.sin(point.worldDirection) * style.radius);
            ctx.lineTo(arrowX, arrowY);
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        // 绘制标签
        if (this.showLabels && point.label) {
            ctx.font = style.labelFont || '10px Arial';
            ctx.fillStyle = style.labelColor || '#333333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(point.label, worldPosition.x, worldPosition.y - style.radius - 3);
        }
        
        ctx.restore();
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(position) {
        const point = this.findPointAtPosition(position, this.hitTestTolerance);
        this.setHoveredPoint(point);
        return point;
    }

    /**
     * 处理鼠标点击
     */
    handleMouseClick(position) {
        const point = this.findPointAtPosition(position, this.hitTestTolerance);
        this.setSelectedPoint(point);
        return point;
    }

    /**
     * 序列化
     */
    serialize() {
        const data = {
            visible: this.visible,
            visibilityMode: this.visibilityMode,
            showLabels: this.showLabels,
            snapEnabled: this.snapEnabled,
            snapDistance: this.snapDistance,
            customPoints: []
        };
        
        // 只序列化自定义连接点
        this.pointsById.forEach(point => {
            if (point.isCustom) {
                data.customPoints.push(point.serialize());
            }
        });
        
        return data;
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.visible !== undefined) this.visible = data.visible;
        if (data.visibilityMode) this.visibilityMode = data.visibilityMode;
        if (data.showLabels !== undefined) this.showLabels = data.showLabels;
        if (data.snapEnabled !== undefined) this.snapEnabled = data.snapEnabled;
        if (data.snapDistance !== undefined) this.snapDistance = data.snapDistance;
        
        // 恢复自定义连接点
        if (data.customPoints) {
            data.customPoints.forEach(pointData => {
                const instance = new ConnectionPointInstance({
                    id: pointData.id,
                    componentId: pointData.componentId,
                    pointId: pointData.pointId,
                    label: pointData.label,
                    type: pointData.type,
                    direction: pointData.direction,
                    relativePosition: pointData.relativePosition,
                    isCustom: true
                });
                
                this.pointsById.set(instance.id, instance);
                
                let points = this.componentPoints.get(pointData.componentId);
                if (!points) {
                    points = [];
                    this.componentPoints.set(pointData.componentId, points);
                }
                points.push(instance);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.componentPoints.clear();
        this.pointsById.clear();
        this.hoveredPoint = null;
        this.selectedPoint = null;
        this.componentOpacity.clear();
        this.hoveredComponentId = null;
        this.selectedComponentIds.clear();
        this._isAnimating = false;
    }
}

// ========== 单例模式 ==========
let connectionPointManagerInstance = null;

export function getConnectionPointManager() {
    if (!connectionPointManagerInstance) {
        connectionPointManagerInstance = new ConnectionPointManager();
    }
    return connectionPointManagerInstance;
}

export function resetConnectionPointManager() {
    connectionPointManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ConnectionPointManager = ConnectionPointManager;
    window.ConnectionPointInstance = ConnectionPointInstance;
    window.getConnectionPointManager = getConnectionPointManager;
    window.CONNECTION_POINT_STYLES = CONNECTION_POINT_STYLES;
}
