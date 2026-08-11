/**
 * GridRenderer.js - canvas grid renderer.
 */

import { computeGridRenderStyle, isMajorGridLine } from './GridRenderStyle.js';

export class GridRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    draw(gridSize, gridColor, showGrid = true, options = {}) {
        if (!showGrid) return;

        const ctx = this.ctx;
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const logicalWidth = ctx.canvas.width / dpr;
        const logicalHeight = ctx.canvas.height / dpr;
        const style = computeGridRenderStyle({
            dpr,
            gridSize,
            minorColor: gridColor,
            majorColor: options.majorGridColor,
            majorEvery: options.majorEvery
        });

        this._strokeGridLines(logicalWidth, logicalHeight, style, false);
        this._strokeGridLines(logicalWidth, logicalHeight, style, true);
    }

    _strokeGridLines(logicalWidth, logicalHeight, style, major) {
        const ctx = this.ctx;
        ctx.strokeStyle = major ? style.majorColor : style.minorColor;
        ctx.lineWidth = major ? style.majorWidth : style.minorWidth;
        ctx.beginPath();

        let xIndex = 1;
        for (let x = style.gridSize; x < logicalWidth; x += style.gridSize, xIndex++) {
            if (isMajorGridLine(xIndex, style.majorEvery) !== major) continue;
            ctx.moveTo(x + style.pixelOffset, 0);
            ctx.lineTo(x + style.pixelOffset, logicalHeight);
        }

        let yIndex = 1;
        for (let y = style.gridSize; y < logicalHeight; y += style.gridSize, yIndex++) {
            if (isMajorGridLine(yIndex, style.majorEvery) !== major) continue;
            ctx.moveTo(0, y + style.pixelOffset);
            ctx.lineTo(logicalWidth, y + style.pixelOffset);
        }

        ctx.stroke();
    }
}

if (typeof window !== 'undefined') {
    window.GridRenderer = GridRenderer;
}
