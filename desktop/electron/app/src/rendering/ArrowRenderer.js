/**
 * ArrowRenderer.js - 箭头动画渲染器
 * 负责更新和绘制光线路径上的箭头动画
 */

import { Vector } from '../core/Vector.js';
import { Ray } from '../core/Ray.js';
import { ARROW_SIZE_PIXELS } from '../core/constants.js';

/**
 * 箭头动画渲染器类
 * 管理光线路径上的箭头动画状态和绘制
 */
export class ArrowRenderer {
    constructor() {
        /** @type {Map<number, Object>} 箭头动画状态映射 */
        this.animationStates = new Map();
        /** @type {number} 动画开始时间 */
        this.startTime = 0;
    }

    /**
     * 重置动画开始时间
     */
    resetStartTime() {
        this.startTime = performance.now() / 1000.0;
    }

    /**
     * 清除所有动画状态
     */
    clearStates() {
        this.animationStates.clear();
    }

    /**
     * 更新箭头动画状态
     * @param {Array} currentRayPaths - 当前光线路径数组
     * @param {Object} options - 配置选项
     * @param {boolean} options.globalShowArrows - 是否全局显示箭头
     * @param {number} options.speed - 动画速度
     */
    updateAnimations(currentRayPaths, options = {}) {
        const { globalShowArrows = true, speed = 100 } = options;

        // 如果箭头全局关闭，清除状态并退出
        if (!globalShowArrows) {
            if (this.animationStates.size > 0) this.animationStates.clear();
            return;
        }

        // 如果没有路径，清除状态并退出
        if (!currentRayPaths || currentRayPaths.length === 0) {
            if (this.animationStates.size > 0) this.animationStates.clear();
            return;
        }

        const nowSeconds = performance.now() / 1000.0;
        const startTime = (this.startTime > 0) ? this.startTime : nowSeconds;
        const elapsedSeconds = nowSeconds - startTime;

        currentRayPaths.forEach((ray, index) => {
            // 检查此光线段是否应该动画
            if (ray instanceof Ray && ray.animateArrow) {
                const pathPoints = ray.getPathPoints();
                if (!pathPoints || pathPoints.length < 2) return;

                // 计算此光线段路径的总长度
                let pathLength = 0;
                let isValidSegmentPath = true;
                
                for (let i = 1; i < pathPoints.length; i++) {
                    const p1 = pathPoints[i - 1];
                    const p2 = pathPoints[i];
                    if (p1 instanceof Vector && p2 instanceof Vector &&
                        !isNaN(p1.x) && !isNaN(p2.x)) {
                        try {
                            const dist = p1.distanceTo(p2);
                            if (!isNaN(dist)) {
                                pathLength += dist;
                            } else {
                                isValidSegmentPath = false;
                                break;
                            }
                        } catch (e) {
                            isValidSegmentPath = false;
                            break;
                        }
                    } else {
                        isValidSegmentPath = false;
                        break;
                    }
                }

                const EPSILON_LENGTH = 1e-6;
                if (isValidSegmentPath && pathLength > EPSILON_LENGTH) {
                    // 计算基于经过时间的距离，对此段路径长度取模
                    let currentDistance = (speed * elapsedSeconds) % pathLength;
                    if (currentDistance < 0) currentDistance += pathLength;

                    // 存储绘制此段箭头所需的状态
                    this.animationStates.set(index, {
                        distance: currentDistance,
                        pathLength: pathLength,
                        pathPoints: pathPoints,
                        sourceId: ray.sourceId
                    });
                }
            }
        });

        // 清理无效的状态（防止内存泄漏）
        const validIndices = new Set(currentRayPaths.map((_, index) => index));
        for (const [index] of this.animationStates) {
            if (!validIndices.has(index)) {
                this.animationStates.delete(index);
            }
        }
    }

    /**
     * 绘制箭头动画
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
     * @param {Object} options - 配置选项
     */
    drawAnimations(ctx, options = {}) {
        const {
            globalShowArrows = true,
            onlyShowSelectedSourceArrow = false,
            selectedComponent = null,
            showArrowTrail = true
        } = options;

        if (!globalShowArrows || this.animationStates.size === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const arrowSize = ARROW_SIZE_PIXELS / dpr;
        const arrowColor = '#FFFF00';
        const EPSILON_DIST = 1e-6;

        ctx.fillStyle = arrowColor;

        this.animationStates.forEach((state, key_index) => {
            if (!state || !state.pathPoints || state.pathPoints.length < 2 ||
                state.pathLength <= EPSILON_DIST || isNaN(state.distance)) {
                return;
            }

            // 过滤：仅显示选中的光源
            let shouldDraw = true;
            if (onlyShowSelectedSourceArrow) {
                if (!selectedComponent || !state.sourceId ||
                    selectedComponent.id !== state.sourceId) {
                    shouldDraw = false;
                }
            }

            if (shouldDraw) {
                this._drawArrowOnPath(ctx, state, arrowSize, showArrowTrail);
            }
        });
    }

    /**
     * 在路径上绘制箭头
     * @private
     */
    _drawArrowOnPath(ctx, state, arrowSize, showArrowTrail) {
        const pathPoints = state.pathPoints;
        const currentArrowDist = state.distance;
        let distanceTraveled = 0;
        const EPSILON_DIST = 1e-6;

        for (let i = 1; i < pathPoints.length; i++) {
            const p1 = pathPoints[i - 1];
            const p2 = pathPoints[i];

            if (!(p1 instanceof Vector) || !(p2 instanceof Vector) ||
                isNaN(p1.x) || isNaN(p2.x)) {
                continue;
            }

            const segmentVector = p2.subtract(p1);
            let segmentLength = 0;
            try {
                segmentLength = segmentVector.magnitude();
            } catch (e) {
                continue;
            }

            if (segmentLength > EPSILON_DIST) {
                const segmentStartDistance = distanceTraveled;
                const segmentEndDistance = distanceTraveled + segmentLength;

                if (currentArrowDist >= segmentStartDistance - EPSILON_DIST &&
                    currentArrowDist <= segmentEndDistance + EPSILON_DIST) {
                    
                    const t = Math.max(0, Math.min(1, 
                        (currentArrowDist - segmentStartDistance) / segmentLength));

                    try {
                        const arrowPos = Vector.lerp(p1, p2, t);
                        const arrowDir = segmentVector.normalize();

                        if (arrowPos && arrowDir && !isNaN(arrowPos.x) && 
                            arrowDir.magnitudeSquared() > 0.5) {
                            
                            // 绘制箭头拖影
                            if (showArrowTrail) {
                                ctx.save();
                                ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
                                ctx.lineWidth = arrowSize / 2;
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(p1.x, p1.y);
                                ctx.lineTo(arrowPos.x, arrowPos.y);
                                ctx.stroke();
                                ctx.restore();
                            }

                            // 计算箭头形状的点
                            const angle = Math.PI / 6;
                            const v1 = arrowDir.rotate(Math.PI + angle).multiply(arrowSize);
                            const v2 = arrowDir.rotate(Math.PI - angle).multiply(arrowSize);
                            const arrowTail1 = arrowPos.add(v1);
                            const arrowTail2 = arrowPos.add(v2);

                            // 绘制填充的三角形箭头
                            if (arrowTail1 && arrowTail2 && 
                                !isNaN(arrowTail1.x) && !isNaN(arrowTail2.x)) {
                                ctx.beginPath();
                                ctx.moveTo(arrowPos.x, arrowPos.y);
                                ctx.lineTo(arrowTail1.x, arrowTail1.y);
                                ctx.lineTo(arrowTail2.x, arrowTail2.y);
                                ctx.closePath();
                                ctx.fill();
                            }
                        }
                    } catch (e) {
                        console.error(`[ArrowRenderer] Error drawing arrow:`, e);
                    }
                    break;
                }
            }
            distanceTraveled += segmentLength;
        }
    }

    /**
     * 获取动画状态（用于兼容旧代码）
     * @returns {Map} 动画状态映射
     */
    getAnimationStates() {
        return this.animationStates;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ArrowRenderer = ArrowRenderer;
}
