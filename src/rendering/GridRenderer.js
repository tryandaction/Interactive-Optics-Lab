/**
 * GridRenderer.js - 网格渲染器
 * 负责绘制背景网格
 */

export class GridRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 绘制网格
     * @param {number} gridSize - 网格间距
     * @param {string} gridColor - 网格颜色
     * @param {boolean} showGrid - 是否显示网格
     */
    draw(gridSize, gridColor, showGrid = true) {
        if (!showGrid) return;

        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = ctx.canvas.width / dpr;
        const logicalHeight = ctx.canvas.height / dpr;

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1 / dpr;
        ctx.beginPath();

        // 垂直线
        for (let x = gridSize; x < logicalWidth; x += gridSize) {
            ctx.moveTo(x + 0.5 / dpr, 0);
            ctx.lineTo(x + 0.5 / dpr, logicalHeight);
        }

        // 水平线
        for (let y = gridSize; y < logicalHeight; y += gridSize) {
            ctx.moveTo(0, y + 0.5 / dpr);
            ctx.lineTo(logicalWidth, y + 0.5 / dpr);
        }

        ctx.stroke();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GridRenderer = GridRenderer;
}
