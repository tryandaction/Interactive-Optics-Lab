/**
 * RayRenderStyle.js - pure helpers for ray drawing styles.
 *
 * Keeps visual decisions testable and out of the Canvas drawing loop.
 */

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function parseRgbaColor(color) {
    if (typeof color !== 'string') {
        return { r: 255, g: 255, b: 255, a: 1 };
    }

    const normalizedColor = color.trim();
    const hexMatch = normalizedColor.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1].length === 3
            ? hexMatch[1].split('').map(char => char + char).join('')
            : hexMatch[1];

        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            a: 1
        };
    }

    const rgbaMatch = normalizedColor.match(/^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)(?:\s*,\s*([.\d]+))?\s*\)$/i);
    if (!rgbaMatch) {
        return { r: 255, g: 255, b: 255, a: 1 };
    }

    return {
        r: clamp(Number(rgbaMatch[1]) || 0, 0, 255),
        g: clamp(Number(rgbaMatch[2]) || 0, 0, 255),
        b: clamp(Number(rgbaMatch[3]) || 0, 0, 255),
        a: clamp(rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]) || 0, 0, 1)
    };
}

export function toRgbaString({ r, g, b, a }) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${clamp(a, 0, 1).toFixed(3)})`;
}

export function computeRayRenderStyle(ray, options = {}) {
    const dpr = Math.max(1, options.dpr || 1);
    const background = options.background === 'light' ? 'light' : 'dark';
    const rawColor = typeof ray?.getColor === 'function' ? ray.getColor() : ray?.color;
    const base = parseRgbaColor(rawColor);
    const rawLineWidth = typeof ray?.getLineWidth === 'function' ? ray.getLineWidth() : ray?.lineWidth;
    const lineWidth = Number.isFinite(rawLineWidth) ? rawLineWidth : 1;
    const intensity = clamp(Number.isFinite(ray?.intensity) ? ray.intensity : 1, 0, 2);

    const coreAlphaFloor = background === 'light' ? 0.22 : 0.18;
    const coreAlpha = clamp(base.a * (0.88 + Math.sqrt(intensity + 0.05) * 0.22), coreAlphaFloor, 0.96);
    const glowAlpha = background === 'light'
        ? clamp(base.a * 0.18, 0.03, 0.20)
        : clamp(base.a * 0.32 + 0.035, 0.06, 0.38);

    const coreWidth = Math.max(1.15 / dpr, lineWidth / dpr);
    const glowWidth = Math.max(coreWidth + 1.6 / dpr, coreWidth * (background === 'light' ? 2.1 : 3.0));

    return {
        coreColor: toRgbaString({ ...base, a: coreAlpha }),
        glowColor: toRgbaString({ ...base, a: glowAlpha }),
        coreWidth,
        glowWidth
    };
}
