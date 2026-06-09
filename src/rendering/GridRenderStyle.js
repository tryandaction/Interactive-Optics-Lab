/**
 * GridRenderStyle.js - pure helpers for canvas grid rendering.
 */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function computeGridRenderStyle(options = {}) {
    const dpr = Math.max(1, options.dpr || 1);
    const gridSize = Math.max(5, options.gridSize || 50);
    const majorEvery = Math.max(2, Math.round(options.majorEvery || 5));

    return {
        minorColor: options.minorColor || 'rgba(255, 255, 255, 0.06)',
        majorColor: options.majorColor || 'rgba(255, 255, 255, 0.14)',
        minorWidth: clamp(1 / dpr, 0.35, 1),
        majorWidth: clamp(1.25 / dpr, 0.5, 1.25),
        pixelOffset: 0.5 / dpr,
        gridSize,
        majorEvery
    };
}

export function isMajorGridLine(index, majorEvery = 5) {
    return index > 0 && index % Math.max(2, Math.round(majorEvery)) === 0;
}
