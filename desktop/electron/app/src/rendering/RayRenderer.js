/**
 * RayRenderer.js - 光线渲染器
 * 负责绘制光线路径和箭头动画
 */

import { Vector } from '../core/Vector.js';
import { ARROW_SIZE_PIXELS } from '../core/constants.js';

export class RayRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 绘制所有光线路径
     */
    drawRayPaths(completedPaths) {
        if (!completedPaths || completedPaths.length === 0) return;
        
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        completedPaths.forEach((ray, pathIndex) => {
            if (!ray || typeof ray.getPathPoints !== 'function') return;

            const pathPoints = ray.getPathPoints();
            if (!pathPoints || pathPoints.length < 2) return;

            try {
                ctx.strokeStyle = ray.getColor();
                const logicalWidth = ray.getLineWidth();
                ctx.lineWidth = Math.max(1.0 / dpr, logicalWidth / dpr);
                ctx.beginPath();

                let firstPoint = pathPoints[0];
                let movedToStart = false;

                if (this._isValidPoint(firstPoint)) {
                    ctx.moveTo(firstPoint.x, firstPoint.y);
                    movedToStart = true;
                } else {
                    return;
                }

                let lastValidPoint = firstPoint;
                for (let i = 1; i < pathPoints.length; i++) {
                    const currentPoint = pathPoints[i];
                    if (this._isValidPoint(currentPoint)) {
                        if (currentPoint.distanceSquaredTo(lastValidPoint) > 1e-8) {
                            ctx.lineTo(currentPoint.x, currentPoint.y);
                            lastValidPoint = currentPoint;
                        }
                    } else {
                        break;
                    }
                }

                if (movedToStart && pathPoints.length > 1) {
                    ctx.stroke();
                }
            } catch (e) {
                console.error(`Error drawing path ${pathIndex}:`, e);
            }
        });

        ctx.restore();
    }

    /**
     * 绘制箭头动画
     */
    drawArrowAnimations(arrowAnimationStates, options = {}) {
        const {
            globalShowArrows = true,
            onlyShowSelectedSourceArrow = false,
            selectedComponent = null,
            showArrowTrail = true
        } = options;

        if (!globalShowArrows || arrowAnimationStates.size === 0) return;

        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const arrowSize = ARROW_SIZE_PIXELS / dpr;
        const arrowColor = '#FFFF00';
        const EPSILON_DIST = 1e-6;

        ctx.fillStyle = arrowColor;

        arrowAnimationStates.forEach((state, key_index) => {
            if (!state || !state.pathPoints || state.pathPoints.length < 2 || 
                state.pathLength <= EPSILON_DIST || isNaN(state.distance)) {
                return;
            }

            let shouldDraw = true;
            if (onlyShowSelectedSourceArrow) {
                if (!selectedComponent || !state.sourceId || 
                    selectedComponent.id !== state.sourceId) {
                    shouldDraw = false;
                }
            }

            if (shouldDraw) {
                this._drawArrowOnPath(state, arrowSize, showArrowTrail);
            }
        });
    }

    _drawArrowOnPath(state, arrowSize, showArrowTrail) {
        const ctx = this.ctx;
        const pathPoints = state.pathPoints;
        const currentArrowDist = state.distance;
        let distanceTraveled = 0;
        const EPSILON_DIST = 1e-6;

        for (let i = 1; i < pathPoints.length; i++) {
            const p1 = pathPoints[i - 1];
            const p2 = pathPoints[i];

            if (!this._isValidPoint(p1) || !this._isValidPoint(p2)) continue;

            const segmentVector = p2.subtract(p1);
            let segmentLength = 0;
            try { segmentLength = segmentVector.magnitude(); } catch (e) { continue; }

            if (segmentLength > EPSILON_DIST) {
                const segmentStartDistance = distanceTraveled;
                const segmentEndDistance = distanceTraveled + segmentLength;

                if (currentArrowDist >= segmentStartDistance - EPSILON_DIST && 
                    currentArrowDist <= segmentEndDistance + EPSILON_DIST) {
                    
                    const t = Math.max(0, Math.min(1, (currentArrowDist - segmentStartDistance) / segmentLength));

                    try {
                        const arrowPos = Vector.lerp(p1, p2, t);
                        const arrowDir = segmentVector.normalize();

                        if (arrowPos && arrowDir && !isNaN(arrowPos.x) && arrowDir.magnitudeSquared() > 0.5) {
                            // 绘制拖影
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

                            // 绘制箭头
                            const angle = Math.PI / 6;
                            const v1 = arrowDir.rotate(Math.PI + angle).multiply(arrowSize);
                            const v2 = arrowDir.rotate(Math.PI - angle).multiply(arrowSize);
                            const arrowTail1 = arrowPos.add(v1);
                            const arrowTail2 = arrowPos.add(v2);

                            if (arrowTail1 && arrowTail2 && !isNaN(arrowTail1.x) && !isNaN(arrowTail2.x)) {
                                ctx.beginPath();
                                ctx.moveTo(arrowPos.x, arrowPos.y);
                                ctx.lineTo(arrowTail1.x, arrowTail1.y);
                                ctx.lineTo(arrowTail2.x, arrowTail2.y);
                                ctx.closePath();
                                ctx.fill();
                            }
                        }
                    } catch (e) {
                        console.error(`Error drawing arrow:`, e);
                    }
                    break;
                }
            }
            distanceTraveled += segmentLength;
        }
    }

    _isValidPoint(point) {
        return point instanceof Vector && !isNaN(point.x) && !isNaN(point.y);
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.RayRenderer = RayRenderer;
}
