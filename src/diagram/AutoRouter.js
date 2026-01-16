/**
 * AutoRouter.js - 自动布线系统
 * 提供光线链接的自动路径生成和组件避让
 * 
 * Requirements: 10.1, 10.2, 10.4, 10.5
 */

/**
 * 布线样式
 */
export const ROUTING_STYLES = {
    ORTHOGONAL: 'orthogonal',   // 正交（直角转弯）
    DIAGONAL: 'diagonal',        // 对角线
    DIRECT: 'direct',           // 直线
    CURVED: 'curved'            // 曲线（贝塞尔）
};

/**
 * 布线样式名称
 */
export const ROUTING_STYLE_NAMES = {
    [ROUTING_STYLES.ORTHOGONAL]: '正交',
    [ROUTING_STYLES.DIAGONAL]: '对角线',
    [ROUTING_STYLES.DIRECT]: '直线',
    [ROUTING_STYLES.CURVED]: '曲线'
};

/**
 * 路径点类
 */
export class PathPoint {
    constructor(x, y, type = 'waypoint') {
        this.x = x;
        this.y = y;
        this.type = type; // 'start', 'end', 'waypoint', 'corner'
    }

    clone() {
        return new PathPoint(this.x, this.y, this.type);
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

/**
 * 边界框类
 */
class BoundingBox {
    constructor(x, y, width, height, padding = 10) {
        this.x = x - padding;
        this.y = y - padding;
        this.width = width + padding * 2;
        this.height = height + padding * 2;
        this.padding = padding;
    }

    get left() { return this.x; }
    get right() { return this.x + this.width; }
    get top() { return this.y; }
    get bottom() { return this.y + this.height; }
    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }

    contains(point) {
        return point.x >= this.left && point.x <= this.right &&
               point.y >= this.top && point.y <= this.bottom;
    }

    intersectsLine(p1, p2) {
        // 检查线段是否与边界框相交
        return this._lineIntersectsRect(p1.x, p1.y, p2.x, p2.y);
    }

    _lineIntersectsRect(x1, y1, x2, y2) {
        // Cohen-Sutherland算法简化版
        const left = this.left;
        const right = this.right;
        const top = this.top;
        const bottom = this.bottom;

        // 检查线段端点是否在矩形内
        if ((x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) ||
            (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom)) {
            return true;
        }

        // 检查线段是否与矩形边相交
        return this._lineIntersectsSegment(x1, y1, x2, y2, left, top, right, top) ||
               this._lineIntersectsSegment(x1, y1, x2, y2, right, top, right, bottom) ||
               this._lineIntersectsSegment(x1, y1, x2, y2, left, bottom, right, bottom) ||
               this._lineIntersectsSegment(x1, y1, x2, y2, left, top, left, bottom);
    }

    _lineIntersectsSegment(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (Math.abs(denom) < 0.0001) return false;

        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }
}

/**
 * 自动布线器类
 */
export class AutoRouter {
    constructor(options = {}) {
        this.style = options.style || ROUTING_STYLES.ORTHOGONAL;
        this.gridSize = options.gridSize || 20;
        this.cornerRadius = options.cornerRadius || 0;
        this.avoidComponents = options.avoidComponents !== false;
        this.componentPadding = options.componentPadding || 20;
        this.preferredDirections = options.preferredDirections || ['horizontal', 'vertical'];
    }

    /**
     * 生成路径
     * @param {Object} start - 起点 {x, y, direction?}
     * @param {Object} end - 终点 {x, y, direction?}
     * @param {Array} obstacles - 障碍物（组件）列表
     * @returns {Array<PathPoint>} 路径点数组
     */
    generatePath(start, end, obstacles = []) {
        switch (this.style) {
            case ROUTING_STYLES.DIRECT:
                return this._generateDirectPath(start, end);
            case ROUTING_STYLES.DIAGONAL:
                return this._generateDiagonalPath(start, end, obstacles);
            case ROUTING_STYLES.CURVED:
                return this._generateCurvedPath(start, end);
            case ROUTING_STYLES.ORTHOGONAL:
            default:
                return this._generateOrthogonalPath(start, end, obstacles);
        }
    }

    /**
     * 生成直线路径
     * @private
     */
    _generateDirectPath(start, end) {
        return [
            new PathPoint(start.x, start.y, 'start'),
            new PathPoint(end.x, end.y, 'end')
        ];
    }

    /**
     * 生成对角线路径
     * @private
     */
    _generateDiagonalPath(start, end, obstacles) {
        const path = [new PathPoint(start.x, start.y, 'start')];
        
        // 计算中点
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        // 检查直线是否有障碍
        const directBlocked = this._isPathBlocked(start, end, obstacles);
        
        if (directBlocked) {
            // 添加中间点绕过障碍
            const detour = this._findDetourPoint(start, end, obstacles);
            if (detour) {
                path.push(new PathPoint(detour.x, detour.y, 'waypoint'));
            }
        }
        
        path.push(new PathPoint(end.x, end.y, 'end'));
        return path;
    }

    /**
     * 生成正交路径（直角转弯）
     * @private
     */
    _generateOrthogonalPath(start, end, obstacles) {
        const path = [new PathPoint(start.x, start.y, 'start')];
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // 确定起点和终点的方向
        const startDir = start.direction || this._inferDirection(start, end);
        const endDir = end.direction || this._inferDirection(end, start);
        
        // 根据方向生成路径
        if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
            // 几乎是直线
            path.push(new PathPoint(end.x, end.y, 'end'));
        } else {
            // 需要转弯
            const waypoints = this._generateOrthogonalWaypoints(start, end, startDir, endDir, obstacles);
            waypoints.forEach(wp => path.push(wp));
            path.push(new PathPoint(end.x, end.y, 'end'));
        }
        
        return path;
    }

    /**
     * 生成正交路径的中间点
     * @private
     */
    _generateOrthogonalWaypoints(start, end, startDir, endDir, obstacles) {
        const waypoints = [];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // 策略1: 先水平后垂直
        const strategy1 = [
            new PathPoint(end.x, start.y, 'corner')
        ];
        
        // 策略2: 先垂直后水平
        const strategy2 = [
            new PathPoint(start.x, end.y, 'corner')
        ];
        
        // 策略3: 中间转弯（两个转角）
        const midX = start.x + dx / 2;
        const midY = start.y + dy / 2;
        const strategy3 = [
            new PathPoint(midX, start.y, 'corner'),
            new PathPoint(midX, end.y, 'corner')
        ];
        
        // 策略4: 中间转弯（垂直优先）
        const strategy4 = [
            new PathPoint(start.x, midY, 'corner'),
            new PathPoint(end.x, midY, 'corner')
        ];
        
        // 选择最佳策略（避开障碍物）
        const strategies = [strategy1, strategy2, strategy3, strategy4];
        
        for (const strategy of strategies) {
            if (!this._isStrategyBlocked(start, end, strategy, obstacles)) {
                return strategy;
            }
        }
        
        // 如果所有策略都被阻挡，使用复杂绕行
        return this._generateComplexDetour(start, end, obstacles);
    }

    /**
     * 检查策略是否被阻挡
     * @private
     */
    _isStrategyBlocked(start, end, waypoints, obstacles) {
        if (!this.avoidComponents || obstacles.length === 0) return false;
        
        const allPoints = [start, ...waypoints, end];
        
        for (let i = 0; i < allPoints.length - 1; i++) {
            if (this._isPathBlocked(allPoints[i], allPoints[i + 1], obstacles)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 检查路径是否被阻挡
     * @private
     */
    _isPathBlocked(p1, p2, obstacles) {
        if (!this.avoidComponents) return false;
        
        for (const obstacle of obstacles) {
            const bbox = this._getObstacleBBox(obstacle);
            if (bbox.intersectsLine(p1, p2)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 获取障碍物边界框
     * @private
     */
    _getObstacleBBox(obstacle) {
        const pos = obstacle.pos || { x: obstacle.x || 0, y: obstacle.y || 0 };
        const size = obstacle.size || 40;
        return new BoundingBox(
            pos.x - size / 2,
            pos.y - size / 2,
            size,
            size,
            this.componentPadding
        );
    }

    /**
     * 生成复杂绕行路径
     * @private
     */
    _generateComplexDetour(start, end, obstacles) {
        const waypoints = [];
        
        // 收集所有障碍物边界
        const bboxes = obstacles.map(o => this._getObstacleBBox(o));
        
        // 找到绕行点
        const detourPoints = this._findDetourPoints(start, end, bboxes);
        
        if (detourPoints.length > 0) {
            // 使用A*或简化的路径查找
            const path = this._findPathAroundObstacles(start, end, detourPoints, bboxes);
            waypoints.push(...path);
        } else {
            // 回退到简单的中间点
            const midX = (start.x + end.x) / 2;
            waypoints.push(new PathPoint(midX, start.y, 'corner'));
            waypoints.push(new PathPoint(midX, end.y, 'corner'));
        }
        
        return waypoints;
    }

    /**
     * 找到绕行点
     * @private
     */
    _findDetourPoints(start, end, bboxes) {
        const points = [];
        const margin = this.componentPadding + 10;
        
        for (const bbox of bboxes) {
            // 添加边界框的四个角作为候选绕行点
            points.push(
                new PathPoint(bbox.left - margin, bbox.top - margin, 'detour'),
                new PathPoint(bbox.right + margin, bbox.top - margin, 'detour'),
                new PathPoint(bbox.left - margin, bbox.bottom + margin, 'detour'),
                new PathPoint(bbox.right + margin, bbox.bottom + margin, 'detour')
            );
        }
        
        return points;
    }

    /**
     * 在障碍物周围找到路径
     * @private
     */
    _findPathAroundObstacles(start, end, detourPoints, bboxes) {
        // 简化的贪心算法
        const path = [];
        let current = start;
        const visited = new Set();
        
        while (current.distanceTo(end) > this.gridSize) {
            // 找到最佳下一个点
            let bestPoint = null;
            let bestScore = Infinity;
            
            for (const point of detourPoints) {
                const key = `${Math.round(point.x)},${Math.round(point.y)}`;
                if (visited.has(key)) continue;
                
                // 检查到该点的路径是否清晰
                if (this._isPathClear(current, point, bboxes)) {
                    const score = point.distanceTo(end) + current.distanceTo(point) * 0.5;
                    if (score < bestScore) {
                        bestScore = score;
                        bestPoint = point;
                    }
                }
            }
            
            if (!bestPoint) break;
            
            path.push(bestPoint.clone());
            visited.add(`${Math.round(bestPoint.x)},${Math.round(bestPoint.y)}`);
            current = bestPoint;
            
            // 防止无限循环
            if (path.length > 10) break;
        }
        
        return path;
    }

    /**
     * 检查路径是否清晰
     * @private
     */
    _isPathClear(p1, p2, bboxes) {
        for (const bbox of bboxes) {
            if (bbox.intersectsLine(p1, p2)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 找到绕行点
     * @private
     */
    _findDetourPoint(start, end, obstacles) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // 尝试在垂直方向绕行
        const offset = Math.max(Math.abs(dx), Math.abs(dy)) * 0.3 + this.componentPadding;
        
        const candidates = [
            { x: (start.x + end.x) / 2, y: start.y - offset },
            { x: (start.x + end.x) / 2, y: start.y + offset },
            { x: start.x - offset, y: (start.y + end.y) / 2 },
            { x: start.x + offset, y: (start.y + end.y) / 2 }
        ];
        
        for (const candidate of candidates) {
            const blocked1 = this._isPathBlocked(start, candidate, obstacles);
            const blocked2 = this._isPathBlocked(candidate, end, obstacles);
            if (!blocked1 && !blocked2) {
                return candidate;
            }
        }
        
        return candidates[0]; // 回退
    }

    /**
     * 生成曲线路径（贝塞尔控制点）
     * @private
     */
    _generateCurvedPath(start, end) {
        const path = [new PathPoint(start.x, start.y, 'start')];
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 计算控制点
        const curvature = 0.3;
        const startDir = start.direction || 'right';
        const endDir = end.direction || 'left';
        
        const cp1 = this._getControlPoint(start, startDir, dist * curvature);
        const cp2 = this._getControlPoint(end, endDir, dist * curvature);
        
        // 添加控制点作为路径点（用于渲染贝塞尔曲线）
        path.push(new PathPoint(cp1.x, cp1.y, 'control1'));
        path.push(new PathPoint(cp2.x, cp2.y, 'control2'));
        path.push(new PathPoint(end.x, end.y, 'end'));
        
        return path;
    }

    /**
     * 获取控制点
     * @private
     */
    _getControlPoint(point, direction, distance) {
        switch (direction) {
            case 'right':
                return { x: point.x + distance, y: point.y };
            case 'left':
                return { x: point.x - distance, y: point.y };
            case 'up':
                return { x: point.x, y: point.y - distance };
            case 'down':
                return { x: point.x, y: point.y + distance };
            default:
                return { x: point.x + distance, y: point.y };
        }
    }

    /**
     * 推断方向
     * @private
     */
    _inferDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * 优化路径（移除冗余点）
     */
    optimizePath(path) {
        if (path.length <= 2) return path;
        
        const optimized = [path[0]];
        
        for (let i = 1; i < path.length - 1; i++) {
            const prev = optimized[optimized.length - 1];
            const curr = path[i];
            const next = path[i + 1];
            
            // 检查是否共线
            if (!this._areCollinear(prev, curr, next)) {
                optimized.push(curr);
            }
        }
        
        optimized.push(path[path.length - 1]);
        return optimized;
    }

    /**
     * 检查三点是否共线
     * @private
     */
    _areCollinear(p1, p2, p3, tolerance = 1) {
        const area = Math.abs(
            (p2.x - p1.x) * (p3.y - p1.y) - 
            (p3.x - p1.x) * (p2.y - p1.y)
        );
        return area < tolerance;
    }

    /**
     * 将路径对齐到网格
     */
    snapToGrid(path) {
        return path.map(point => {
            if (point.type === 'start' || point.type === 'end') {
                return point; // 不修改起点和终点
            }
            return new PathPoint(
                Math.round(point.x / this.gridSize) * this.gridSize,
                Math.round(point.y / this.gridSize) * this.gridSize,
                point.type
            );
        });
    }

    /**
     * 渲染路径（用于预览）
     */
    renderPath(ctx, path, options = {}) {
        if (path.length < 2) return;
        
        const {
            color = '#ff0000',
            lineWidth = 2,
            showPoints = false,
            dashed = false
        } = options;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (dashed) {
            ctx.setLineDash([5, 5]);
        }
        
        // 检查是否是曲线路径
        const isCurved = path.some(p => p.type === 'control1' || p.type === 'control2');
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        if (isCurved && path.length === 4) {
            // 贝塞尔曲线
            const cp1 = path.find(p => p.type === 'control1');
            const cp2 = path.find(p => p.type === 'control2');
            const end = path.find(p => p.type === 'end');
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        } else {
            // 折线
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
        }
        
        ctx.stroke();
        
        // 绘制路径点
        if (showPoints) {
            path.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = point.type === 'start' || point.type === 'end' ? '#00ff00' : '#ffff00';
                ctx.fill();
            });
        }
        
        ctx.restore();
    }

    /**
     * 设置布线样式
     */
    setStyle(style) {
        if (ROUTING_STYLES[style] || Object.values(ROUTING_STYLES).includes(style)) {
            this.style = style;
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            style: this.style,
            gridSize: this.gridSize,
            cornerRadius: this.cornerRadius,
            avoidComponents: this.avoidComponents,
            componentPadding: this.componentPadding
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        return new AutoRouter(data);
    }
}

// 单例
let autoRouterInstance = null;

export function getAutoRouter(options) {
    if (!autoRouterInstance) {
        autoRouterInstance = new AutoRouter(options);
    }
    return autoRouterInstance;
}

export function resetAutoRouter() {
    autoRouterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.AutoRouter = AutoRouter;
    window.getAutoRouter = getAutoRouter;
    window.ROUTING_STYLES = ROUTING_STYLES;
}
