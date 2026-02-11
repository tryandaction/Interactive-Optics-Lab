/**
 * GuideRenderer.js - 对齐辅助线渲染器
 * 负责绘制拖拽时的对齐辅助线
 */

/**
 * 对齐辅助线配置
 */
export const GUIDE_CONFIG = {
    /** 吸附阈值（逻辑坐标像素距离） */
    SNAP_THRESHOLD: 5.0,
    /** 网格吸附阈值 */
    GRID_SNAP_THRESHOLD: 10.0,
    /** 辅助线颜色 */
    GUIDE_COLOR: 'rgba(0, 255, 255, 0.75)',
    /** 辅助线虚线模式 */
    GUIDE_DASH: [3, 3]
};

/**
 * 对齐辅助线渲染器类
 * 管理和绘制组件拖拽时的对齐辅助线
 */
export class GuideRenderer {
    constructor() {
        /** @type {Array} 当前活动的辅助线 */
        this.activeGuides = [];
        /** @type {string} 辅助线颜色 */
        this.guideColor = GUIDE_CONFIG.GUIDE_COLOR;
        /** @type {number[]} 虚线模式 */
        this.guideDash = GUIDE_CONFIG.GUIDE_DASH;
    }

    /**
     * 清除所有辅助线
     */
    clearGuides() {
        this.activeGuides = [];
    }

    /**
     * 添加垂直辅助线
     * @param {number} x - X 坐标
     * @param {number} y1 - 起始 Y 坐标
     * @param {number} y2 - 结束 Y 坐标
     */
    addVerticalGuide(x, y1, y2) {
        this.activeGuides.push({
            type: 'vertical',
            x: x,
            y1: y1,
            y2: y2
        });
    }

    /**
     * 添加水平辅助线
     * @param {number} y - Y 坐标
     * @param {number} x1 - 起始 X 坐标
     * @param {number} x2 - 结束 X 坐标
     */
    addHorizontalGuide(y, x1, x2) {
        this.activeGuides.push({
            type: 'horizontal',
            y: y,
            x1: x1,
            x2: x2
        });
    }

    /**
     * 设置辅助线数组（用于兼容旧代码）
     * @param {Array} guides - 辅助线数组
     */
    setGuides(guides) {
        this.activeGuides = guides || [];
    }

    /**
     * 获取当前辅助线数组
     * @returns {Array} 辅助线数组
     */
    getGuides() {
        return this.activeGuides;
    }

    /**
     * 绘制对齐辅助线
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
     * @param {Object} options - 配置选项
     * @param {boolean} options.isDragging - 是否正在拖拽
     * @param {number} options.cameraScale - 相机缩放比例
     */
    drawGuides(ctx, options = {}) {
        const { isDragging = false, cameraScale = 1 } = options;

        if (!isDragging || this.activeGuides.length === 0) return;

        ctx.save();
        ctx.strokeStyle = this.guideColor;
        ctx.lineWidth = 1 / cameraScale;
        ctx.setLineDash(this.guideDash.map(d => d / cameraScale));

        this.activeGuides.forEach(guide => {
            ctx.beginPath();
            if (guide.type === 'vertical') {
                ctx.moveTo(guide.x, guide.y1);
                ctx.lineTo(guide.x, guide.y2);
            } else if (guide.type === 'horizontal') {
                ctx.moveTo(guide.x1, guide.y);
                ctx.lineTo(guide.x2, guide.y);
            }
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * 计算与其他组件的对齐吸附
     * @param {Object} targetPos - 目标位置 (Vector)
     * @param {Array} otherComponents - 其他组件数组
     * @param {Object} options - 配置选项
     * @returns {Object} 吸附结果 { snappedPos, snappedX, snappedY }
     */
    calculateSnapAlignment(targetPos, otherComponents, options = {}) {
        const { 
            threshold = GUIDE_CONFIG.SNAP_THRESHOLD,
            excludeIds = []
        } = options;

        let snappedX = false;
        let snappedY = false;
        let finalX = targetPos.x;
        let finalY = targetPos.y;

        this.clearGuides();

        for (const comp of otherComponents) {
            if (excludeIds.includes(comp.id)) continue;
            if (!comp.pos) continue;

            // X 轴对齐检查
            if (!snappedX && Math.abs(comp.pos.x - targetPos.x) < threshold) {
                finalX = comp.pos.x;
                snappedX = true;
                // 添加垂直辅助线
                const minY = Math.min(comp.pos.y, targetPos.y) - 50;
                const maxY = Math.max(comp.pos.y, targetPos.y) + 50;
                this.addVerticalGuide(comp.pos.x, minY, maxY);
            }

            // Y 轴对齐检查
            if (!snappedY && Math.abs(comp.pos.y - targetPos.y) < threshold) {
                finalY = comp.pos.y;
                snappedY = true;
                // 添加水平辅助线
                const minX = Math.min(comp.pos.x, targetPos.x) - 50;
                const maxX = Math.max(comp.pos.x, targetPos.x) + 50;
                this.addHorizontalGuide(comp.pos.y, minX, maxX);
            }

            if (snappedX && snappedY) break;
        }

        return {
            snappedPos: { x: finalX, y: finalY },
            snappedX,
            snappedY
        };
    }

    /**
     * 计算网格吸附
     * @param {Object} pos - 位置 (Vector)
     * @param {number} gridSize - 网格大小
     * @param {Object} options - 配置选项
     * @returns {Object} 吸附后的位置
     */
    calculateGridSnap(pos, gridSize, options = {}) {
        const { 
            threshold = GUIDE_CONFIG.GRID_SNAP_THRESHOLD,
            enabled = true 
        } = options;

        if (!enabled || gridSize <= 0) {
            return { x: pos.x, y: pos.y };
        }

        const nearestGridX = Math.round(pos.x / gridSize) * gridSize;
        const nearestGridY = Math.round(pos.y / gridSize) * gridSize;

        let finalX = pos.x;
        let finalY = pos.y;

        if (Math.abs(pos.x - nearestGridX) < threshold) {
            finalX = nearestGridX;
        }
        if (Math.abs(pos.y - nearestGridY) < threshold) {
            finalY = nearestGridY;
        }

        return { x: finalX, y: finalY };
    }

    /**
     * 设置辅助线样式
     * @param {Object} style - 样式配置
     */
    setStyle(style = {}) {
        if (style.color) this.guideColor = style.color;
        if (style.dash) this.guideDash = style.dash;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GuideRenderer = GuideRenderer;
    window.GUIDE_CONFIG = GUIDE_CONFIG;
}
