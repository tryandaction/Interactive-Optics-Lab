/**
 * RayLinkManager.js - 光线链接管理器
 * 管理光学元件之间的光线连接（手动链接模式）
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9, 5.3, 5.5, 5.6, 5.8
 */

import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getAutoRouter, ROUTING_STYLES } from './AutoRouter.js';
import { getEventBus } from './EventBus.js';

/**
 * 生成唯一ID
 */
function generateLinkId() {
    return 'link_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 光线样式预设
 */
export const RAY_LINK_STYLES = {
    DEFAULT: {
        color: '#ff0000',
        width: 2,
        lineStyle: 'solid',
        arrowStart: false,
        arrowEnd: true,
        arrowSize: 8
    },
    PUMP: {
        color: '#0066ff',
        width: 2.5,
        lineStyle: 'solid',
        arrowEnd: true
    },
    PROBE: {
        color: '#ff6600',
        width: 2,
        lineStyle: 'solid',
        arrowEnd: true
    },
    REFERENCE: {
        color: '#00cc00',
        width: 1.5,
        lineStyle: 'dashed',
        arrowEnd: true
    },
    SIGNAL: {
        color: '#cc00cc',
        width: 2,
        lineStyle: 'solid',
        arrowEnd: true
    },
    WEAK: {
        color: '#999999',
        width: 1,
        lineStyle: 'dotted',
        arrowEnd: false
    }
};

/**
 * 线型定义
 */
export const LINE_STYLES = {
    solid: [],
    dashed: [10, 5],
    dotted: [2, 4],
    dashDot: [10, 3, 2, 3]
};

/**
 * 光线链接类
 */
export class RayLink {
    constructor(config) {
        this.id = config.id || generateLinkId();
        
        // 源端点
        this.sourceComponentId = config.sourceComponentId;
        this.sourcePointId = config.sourcePointId;
        
        // 目标端点
        this.targetComponentId = config.targetComponentId;
        this.targetPointId = config.targetPointId;
        
        // 中间路径点
        this.waypoints = config.waypoints || [];
        
        // 样式
        this.style = {
            color: config.color || '#ff0000',
            width: config.width || 2,
            lineStyle: config.lineStyle || 'solid',
            arrowStart: config.arrowStart || false,
            arrowEnd: config.arrowEnd !== false,
            arrowSize: config.arrowSize || 8,
            ...config.style
        };
        
        // 标签
        this.label = config.label || null;
        this.labelPosition = config.labelPosition || 0.5; // 0-1 沿路径位置
        this.labelOffset = config.labelOffset || { x: 0, y: -15 };
        
        // 状态
        this.selected = false;
        this.hovered = false;
        
        // 缓存的路径点
        this._cachedPath = null;
    }

    /**
     * 获取完整路径点
     */
    getPathPoints(connectionPointManager) {
        const sourcePoint = connectionPointManager.getPoint(this.sourceComponentId, this.sourcePointId);
        const targetPoint = connectionPointManager.getPoint(this.targetComponentId, this.targetPointId);
        
        if (!sourcePoint || !targetPoint) {
            return null;
        }
        
        const path = [
            { ...sourcePoint.worldPosition },
            ...this.waypoints.map(wp => ({ ...wp })),
            { ...targetPoint.worldPosition }
        ];
        
        this._cachedPath = path;
        return path;
    }

    /**
     * 添加路径点
     */
    addWaypoint(position, index = -1) {
        if (index < 0 || index >= this.waypoints.length) {
            this.waypoints.push({ ...position });
        } else {
            this.waypoints.splice(index, 0, { ...position });
        }
        this._cachedPath = null;
    }

    /**
     * 移动路径点
     */
    moveWaypoint(index, position) {
        if (index >= 0 && index < this.waypoints.length) {
            this.waypoints[index] = { ...position };
            this._cachedPath = null;
        }
    }

    /**
     * 删除路径点
     */
    removeWaypoint(index) {
        if (index >= 0 && index < this.waypoints.length) {
            this.waypoints.splice(index, 1);
            this._cachedPath = null;
        }
    }

    /**
     * 渲染光线链接
     */
    render(ctx, connectionPointManager) {
        const path = this.getPathPoints(connectionPointManager);
        if (!path || path.length < 2) return;
        
        ctx.save();
        
        // 设置样式
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = this.style.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 设置线型
        const dashPattern = LINE_STYLES[this.style.lineStyle] || [];
        ctx.setLineDash(dashPattern);
        
        // 选中/悬停效果
        if (this.selected) {
            ctx.shadowColor = this.style.color;
            ctx.shadowBlur = 6;
        } else if (this.hovered) {
            ctx.lineWidth = this.style.width + 1;
        }
        
        // 绘制路径
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();
        
        // 绘制箭头
        ctx.setLineDash([]);
        if (this.style.arrowEnd) {
            this._drawArrow(ctx, path[path.length - 2], path[path.length - 1]);
        }
        if (this.style.arrowStart) {
            this._drawArrow(ctx, path[1], path[0]);
        }
        
        // 绘制路径点标记（选中时）
        if (this.selected) {
            this._renderWaypointMarkers(ctx, path);
        }
        
        // 绘制标签
        if (this.label) {
            this._renderLabel(ctx, path);
        }
        
        ctx.restore();
    }

    /**
     * 绘制箭头
     * @private
     */
    _drawArrow(ctx, from, to) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const size = this.style.arrowSize || 8;
        
        ctx.save();
        ctx.translate(to.x, to.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = this.style.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size * 0.4);
        ctx.lineTo(-size * 0.7, 0);
        ctx.lineTo(-size, size * 0.4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 渲染路径点标记
     * @private
     */
    _renderWaypointMarkers(ctx, path) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 2;
        
        // 跳过首尾（连接点）
        for (let i = 1; i < path.length - 1; i++) {
            ctx.beginPath();
            ctx.arc(path[i].x, path[i].y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * 渲染标签
     * @private
     */
    _renderLabel(ctx, path) {
        // 计算标签位置
        const pos = this._getPositionAlongPath(path, this.labelPosition);
        if (!pos) return;
        
        const labelX = pos.x + this.labelOffset.x;
        const labelY = pos.y + this.labelOffset.y;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 背景
        const metrics = ctx.measureText(this.label);
        const padding = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
            labelX - metrics.width / 2 - padding,
            labelY - 8 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
        );
        
        // 文字
        ctx.fillStyle = this.style.color;
        ctx.fillText(this.label, labelX, labelY);
    }

    /**
     * 获取路径上的位置
     * @private
     */
    _getPositionAlongPath(path, t) {
        if (path.length < 2) return null;
        
        // 计算总长度
        let totalLength = 0;
        const segments = [];
        for (let i = 1; i < path.length; i++) {
            const len = Math.hypot(path[i].x - path[i-1].x, path[i].y - path[i-1].y);
            segments.push({ start: path[i-1], end: path[i], length: len });
            totalLength += len;
        }
        
        // 找到目标位置
        const targetLength = totalLength * t;
        let currentLength = 0;
        
        for (const seg of segments) {
            if (currentLength + seg.length >= targetLength) {
                const segT = (targetLength - currentLength) / seg.length;
                return {
                    x: seg.start.x + (seg.end.x - seg.start.x) * segT,
                    y: seg.start.y + (seg.end.y - seg.start.y) * segT
                };
            }
            currentLength += seg.length;
        }
        
        return path[path.length - 1];
    }

    /**
     * 检测点是否在链接上
     */
    hitTest(position, tolerance = 5) {
        if (!this._cachedPath || this._cachedPath.length < 2) return false;
        
        for (let i = 1; i < this._cachedPath.length; i++) {
            const dist = this._pointToSegmentDistance(
                position,
                this._cachedPath[i - 1],
                this._cachedPath[i]
            );
            if (dist <= tolerance) return true;
        }
        return false;
    }

    /**
     * 点到线段的距离
     * @private
     */
    _pointToSegmentDistance(point, segStart, segEnd) {
        const dx = segEnd.x - segStart.x;
        const dy = segEnd.y - segStart.y;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) {
            return Math.hypot(point.x - segStart.x, point.y - segStart.y);
        }
        
        let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
        t = Math.max(0, Math.min(1, t));
        
        const projX = segStart.x + t * dx;
        const projY = segStart.y + t * dy;
        
        return Math.hypot(point.x - projX, point.y - projY);
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            sourceComponentId: this.sourceComponentId,
            sourcePointId: this.sourcePointId,
            targetComponentId: this.targetComponentId,
            targetPointId: this.targetPointId,
            waypoints: this.waypoints.map(wp => ({ ...wp })),
            style: { ...this.style },
            label: this.label,
            labelPosition: this.labelPosition,
            labelOffset: { ...this.labelOffset }
        };
    }
}

/**
 * 光线链接管理器类
 */
export class RayLinkManager {
    constructor(config = {}) {
        /** @type {Map<string, RayLink>} */
        this.links = new Map();
        
        /** @type {RayLink|null} 当前选中的链接 */
        this.selectedLink = null;
        
        /** @type {RayLink|null} 当前悬停的链接 */
        this.hoveredLink = null;
        
        /** @type {Object|null} 正在创建的链接 */
        this.creatingLink = null;
        
        this.connectionPointManager = config.connectionPointManager || getConnectionPointManager();
        this.autoRouter = config.autoRouter || getAutoRouter();
        this.eventBus = config.eventBus || getEventBus();
        
        // 配置
        this.enableAutoRouting = config.enableAutoRouting !== false;
        this.defaultStyle = config.defaultStyle || RAY_LINK_STYLES.DEFAULT;
        
        // 统计
        this.stats = {
            totalLinks: 0,
            createdLinks: 0,
            deletedLinks: 0
        };
    }
    
    /**
     * 开始创建链接
     * @param {string} sourceComponentId - 源组件ID
     * @param {string} sourcePointId - 源连接点ID
     */
    startLinkCreation(sourceComponentId, sourcePointId) {
        const sourcePoint = this.connectionPointManager.getPoint(sourceComponentId, sourcePointId);
        if (!sourcePoint) {
            console.error('RayLinkManager: Source point not found');
            return false;
        }
        
        this.creatingLink = {
            sourceComponentId,
            sourcePointId,
            currentPosition: { ...sourcePoint.worldPosition }
        };
        
        this.eventBus.emit('link:creation-start', {
            sourceComponentId,
            sourcePointId
        });
        
        return true;
    }
    
    /**
     * 更新正在创建的链接
     * @param {Object} position - 当前鼠标位置 {x, y}
     */
    updateLinkCreation(position) {
        if (!this.creatingLink) return;
        
        this.creatingLink.currentPosition = { ...position };
        
        // 检查是否靠近有效的目标连接点
        const nearbyPoint = this._findNearbyConnectionPoint(position);
        this.creatingLink.targetPoint = nearbyPoint;
        
        this.eventBus.emit('link:creation-update', {
            position,
            targetPoint: nearbyPoint
        });
    }
    
    /**
     * 完成链接创建
     * @param {string} targetComponentId - 目标组件ID
     * @param {string} targetPointId - 目标连接点ID
     * @returns {RayLink|null}
     */
    completeLinkCreation(targetComponentId, targetPointId) {
        if (!this.creatingLink) return null;
        
        const { sourceComponentId, sourcePointId } = this.creatingLink;
        
        // 验证连接
        if (!this._canConnect(sourceComponentId, sourcePointId, targetComponentId, targetPointId)) {
            this.cancelLinkCreation();
            return null;
        }
        
        // 创建链接
        const link = this.createLink({
            sourceComponentId,
            sourcePointId,
            targetComponentId,
            targetPointId
        });
        
        this.creatingLink = null;
        
        if (link) {
            this.stats.createdLinks++;
            this.eventBus.emit('link:created', { link });
        }
        
        return link;
    }
    
    /**
     * 取消链接创建
     */
    cancelLinkCreation() {
        if (!this.creatingLink) return;
        
        this.eventBus.emit('link:creation-cancel', {
            sourceComponentId: this.creatingLink.sourceComponentId,
            sourcePointId: this.creatingLink.sourcePointId
        });
        
        this.creatingLink = null;
    }
    
    /**
     * 检查是否正在创建链接
     * @returns {boolean}
     */
    isCreatingLink() {
        return this.creatingLink !== null;
    }
    
    /**
     * 查找附近的连接点
     * @private
     */
    _findNearbyConnectionPoint(position) {
        const snapDistance = this.connectionPointManager.snapDistance || 20;
        return this.connectionPointManager.findNearestPoint(position, null, snapDistance);
    }
    
    /**
     * 检查是否可以连接
     * @private
     */
    _canConnect(sourceCompId, sourcePointId, targetCompId, targetPointId) {
        // 不能连接到自己
        if (sourceCompId === targetCompId) {
            return false;
        }
        
        // 检查连接点类型兼容性
        const sourcePoint = this.connectionPointManager.getPoint(sourceCompId, sourcePointId);
        const targetPoint = this.connectionPointManager.getPoint(targetCompId, targetPointId);
        
        if (!sourcePoint || !targetPoint) {
            return false;
        }
        
        // 检查是否已存在连接
        const existingLink = this.getAllLinks().find(link =>
            (link.sourceComponentId === sourceCompId && link.sourcePointId === sourcePointId &&
             link.targetComponentId === targetCompId && link.targetPointId === targetPointId) ||
            (link.sourceComponentId === targetCompId && link.sourcePointId === targetPointId &&
             link.targetComponentId === sourceCompId && link.targetPointId === sourcePointId)
        );
        
        return !existingLink;
    }
    
    /**
     * 创建新链接
     */
    createLink(config) {
        const link = new RayLink({
            ...config,
            style: { ...this.defaultStyle, ...config.style }
        });
        
        this.links.set(link.id, link);
        this.stats.totalLinks++;
        
        // 更新连接点状态
        const sourcePoint = this.connectionPointManager.getPoint(
            config.sourceComponentId, config.sourcePointId
        );
        const targetPoint = this.connectionPointManager.getPoint(
            config.targetComponentId, config.targetPointId
        );
        
        if (sourcePoint) sourcePoint.addConnection(link.id);
        if (targetPoint) targetPoint.addConnection(link.id);
        
        this.eventBus.emit('link:created', { link });
        
        return link;
    }

    /**
     * 删除链接
     */
    deleteLink(linkId) {
        const link = this.links.get(linkId);
        if (!link) return false;
        
        // 更新连接点状态
        const sourcePoint = this.connectionPointManager.getPoint(
            link.sourceComponentId, link.sourcePointId
        );
        const targetPoint = this.connectionPointManager.getPoint(
            link.targetComponentId, link.targetPointId
        );
        
        if (sourcePoint) sourcePoint.removeConnection(linkId);
        if (targetPoint) targetPoint.removeConnection(linkId);
        
        this.links.delete(linkId);
        this.stats.deletedLinks++;
        
        if (this.selectedLink?.id === linkId) this.selectedLink = null;
        if (this.hoveredLink?.id === linkId) this.hoveredLink = null;
        
        this.eventBus.emit('link:deleted', { linkId });
        
        return true;
    }

    /**
     * 获取链接
     */
    getLink(linkId) {
        return this.links.get(linkId) || null;
    }

    /**
     * 获取所有链接
     */
    getAllLinks() {
        return Array.from(this.links.values());
    }

    /**
     * 获取组件相关的所有链接
     */
    getLinksForComponent(componentId) {
        return this.getAllLinks().filter(link =>
            link.sourceComponentId === componentId ||
            link.targetComponentId === componentId
        );
    }

    /**
     * 删除组件相关的所有链接
     */
    deleteLinksForComponent(componentId) {
        const linksToDelete = this.getLinksForComponent(componentId);
        linksToDelete.forEach(link => this.deleteLink(link.id));
        return linksToDelete.length;
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        this.stats.totalLinks = this.links.size;
        return { ...this.stats };
    }
    
    /**
     * 渲染所有链接
     */
    render(ctx) {
        // 渲染已有链接
        this.links.forEach(link => {
            link.hovered = link === this.hoveredLink;
            link.selected = link === this.selectedLink;
            link.render(ctx, this.connectionPointManager);
        });
        
        // 渲染正在创建的链接
        if (this.creatingLink && this.creatingLink.currentPosition) {
            this._renderCreatingLink(ctx);
        }
    }

    /**
     * 渲染正在创建的链接
     * @private
     */
    _renderCreatingLink(ctx) {
        const sourcePoint = this.connectionPointManager.getPoint(
            this.creatingLink.sourceComponentId,
            this.creatingLink.sourcePointId
        );
        
        if (!sourcePoint) return;
        
        const startPos = sourcePoint.worldPosition;
        let endPos = this.creatingLink.currentPosition;
        
        // 如果有吸附目标，使用目标位置
        if (this.creatingLink.targetPoint) {
            endPos = this.creatingLink.targetPoint.worldPosition;
        }
        
        ctx.save();
        ctx.strokeStyle = this.defaultStyle.color;
        ctx.lineWidth = this.defaultStyle.width;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
        
        // 吸附指示
        if (this.creatingLink.targetPoint) {
            ctx.setLineDash([]);
            ctx.fillStyle = '#44cc44';
            ctx.beginPath();
            ctx.arc(endPos.x, endPos.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(position) {
        // 如果正在创建链接
        if (this.creatingLink) {
            this.updateLinkCreation(position);
            return null;
        }
        
        // 检测悬停
        let hovered = null;
        for (const link of this.links.values()) {
            if (link.hitTest(position)) {
                hovered = link;
                break;
            }
        }
        
        this.hoveredLink = hovered;
        return hovered;
    }

    /**
     * 处理鼠标点击
     */
    handleMouseClick(position) {
        // 如果正在创建链接
        if (this.creatingLink) {
            if (this.creatingLink.targetPoint) {
                return this.completeLinkCreation(
                    this.creatingLink.targetPoint.componentId,
                    this.creatingLink.targetPoint.pointId
                );
            }
            return null;
        }
        
        // 选择链接
        for (const link of this.links.values()) {
            if (link.hitTest(position)) {
                this.selectedLink = link;
                this.eventBus.emit('link:selected', { link });
                return link;
            }
        }
        
        this.selectedLink = null;
        return null;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            defaultStyle: { ...this.defaultStyle },
            links: this.getAllLinks().map(link => link.serialize())
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.defaultStyle) {
            this.defaultStyle = { ...RAY_LINK_STYLES.DEFAULT, ...data.defaultStyle };
        }
        
        if (data.links) {
            data.links.forEach(linkData => {
                const link = new RayLink(linkData);
                this.links.set(link.id, link);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.links.clear();
        this.selectedLink = null;
        this.hoveredLink = null;
        this.creatingLink = null;
        this.stats = {
            totalLinks: 0,
            createdLinks: 0,
            deletedLinks: 0
        };
    }
    
    /**
     * 销毁
     */
    destroy() {
        this.clear();
        this.connectionPointManager = null;
        this.autoRouter = null;
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let rayLinkManagerInstance = null;

export function getRayLinkManager(config) {
    if (!rayLinkManagerInstance) {
        rayLinkManagerInstance = new RayLinkManager(config);
    }
    return rayLinkManagerInstance;
}

export function resetRayLinkManager() {
    if (rayLinkManagerInstance) {
        rayLinkManagerInstance.destroy();
    }
    rayLinkManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.RayLink = RayLink;
    window.RayLinkManager = RayLinkManager;
    window.getRayLinkManager = getRayLinkManager;
    window.RAY_LINK_STYLES = RAY_LINK_STYLES;
    window.LINE_STYLES = LINE_STYLES;
}
