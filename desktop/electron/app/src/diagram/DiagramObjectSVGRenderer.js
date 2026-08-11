/**
 * DiagramObjectSVGRenderer.js
 *
 * Renders OpticsLabDiagram object-model payloads into clean, layered SVG.
 * This renderer is intentionally independent from the simulation canvas so the
 * diagram layer can evolve toward publication-quality figure output.
 */

import { DIAGRAM_OBJECT_TYPES } from './SceneToDiagramAdapter.js';

const DEFAULT_OPTIONS = Object.freeze({
    includeXmlDeclaration: true,
    includeBackground: true,
    includePageFrame: true,
    showLabels: true,
    showReliabilityBadges: false,
    showOpticalAxis: true,
    showFocalMarkers: true,
    rayGlow: true,
    showRayArrows: true,
    autoFit: false,
    contentPadding: 48,
    stylePreset: 'color',
    classPrefix: 'ol-diagram',
    background: '#ffffff',
    symbolStroke: '#111827',
    annotationFill: '#111827',
    fontFamily: 'Arial, Helvetica, sans-serif'
});

const DEFAULT_PAGE = Object.freeze({
    width: 1920,
    height: 1080,
    margin: 48,
    background: '#ffffff'
});

export class DiagramObjectSVGRenderer {
    constructor(options = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    render(diagram, options = {}) {
        const config = this._resolveConfig(options);
        this._validateDiagram(diagram);

        const page = { ...DEFAULT_PAGE, ...(diagram.page || {}) };
        const pageWidth = this._number(page.width, DEFAULT_PAGE.width);
        const pageHeight = this._number(page.height, DEFAULT_PAGE.height);
        const background = config.background || page.background || DEFAULT_OPTIONS.background;
        const objects = Array.isArray(diagram.objects) ? diagram.objects : [];
        const bounds = config.autoFit ? this._computeContentBounds(objects, config) : null;
        const viewBox = bounds || { x: 0, y: 0, width: pageWidth, height: pageHeight };
        const width = Math.max(1, viewBox.width);
        const height = Math.max(1, viewBox.height);

        const parts = [];
        if (config.includeXmlDeclaration) {
            parts.push('<?xml version="1.0" encoding="UTF-8"?>');
        }
        parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}" role="img" aria-label="${this._escapeAttr(diagram.name || 'OpticsLab diagram')}">`);
        parts.push(this._renderDefs(config));

        if (config.includeBackground) {
            parts.push(`<rect class="${config.classPrefix}__background" x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="${this._escapeAttr(background)}"/>`);
        }

        parts.push(`<g class="${config.classPrefix}__content">`);
        if (config.includePageFrame) {
            parts.push(this._renderPageObjects(objects, page, config));
        }
        parts.push(this._renderRayPaths(objects, config));
        parts.push(this._renderConnectors(objects, config));
        parts.push(this._renderSymbols(objects, config));
        parts.push(this._renderAnnotations(objects, config));
        parts.push('</g>');
        parts.push('</svg>');

        return parts.filter(Boolean).join('\n');
    }

    renderFragment(diagram, options = {}) {
        const svg = this.render(diagram, { ...options, includeXmlDeclaration: false });
        const openEnd = svg.indexOf('>') + 1;
        const closeStart = svg.lastIndexOf('</svg>');
        return svg.slice(openEnd, closeStart).trim();
    }

    _renderDefs(config) {
        return `<defs>
    <style>
        .${config.classPrefix}__symbol { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
        .${config.classPrefix}__ray { fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .${config.classPrefix}__connector { fill: none; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
        .${config.classPrefix}__text { font-family: ${this._escapeCSSFont(config.fontFamily)}; dominant-baseline: alphabetic; }
        .${config.classPrefix}__badge { font-family: ${this._escapeCSSFont(config.fontFamily)}; font-size: 10px; }
    </style>
    <filter id="${config.classPrefix}-ray-glow" x="-20%" y="-80%" width="140%" height="260%">
        <feGaussianBlur stdDeviation="2.5" result="blur"/>
        <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    </filter>
    <marker id="${config.classPrefix}-ray-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/>
    </marker>
</defs>`;
    }

    _renderPageObjects(objects, page, config) {
        const pageFrames = this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.PAGE_FRAME);
        if (pageFrames.length === 0) {
            const margin = this._number(page.margin, DEFAULT_PAGE.margin);
            return `<rect class="${config.classPrefix}__page-frame" x="${margin}" y="${margin}" width="${this._number(page.width, DEFAULT_PAGE.width) - margin * 2}" height="${this._number(page.height, DEFAULT_PAGE.height) - margin * 2}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
        }

        return `<g class="${config.classPrefix}__page-frames">
${pageFrames.map(frame => this._renderPageFrame(frame, config)).join('\n')}
</g>`;
    }

    _renderPageFrame(frame, config) {
        const position = this._point(frame.position || frame.pos || frame);
        const size = frame.size || {};
        const style = frame.style || {};
        const width = this._number(size.width, DEFAULT_PAGE.width);
        const height = this._number(size.height, DEFAULT_PAGE.height);
        const margin = this._number(frame.margin, 0);
        return `<rect id="${this._escapeAttr(frame.id || 'page-frame')}" class="${config.classPrefix}__page-frame" x="${position.x + margin}" y="${position.y + margin}" width="${Math.max(0, width - margin * 2)}" height="${Math.max(0, height - margin * 2)}" fill="none" stroke="${this._escapeAttr(style.stroke || '#e5e7eb')}" stroke-width="${this._number(style.strokeWidth, 1)}"/>`;
    }

    _renderRayPaths(objects, config) {
        const rays = this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.RAY_PATH);
        if (rays.length === 0) return '';

        return `<g id="diagram-object-rays" class="${config.classPrefix}__rays">
${rays.map((ray, index) => this._renderRayPath(ray, index, config)).join('\n')}
</g>`;
    }

    _renderRayPath(ray, index, config) {
        const points = this._points(ray.points || ray.pathPoints);
        if (points.length < 2) return '';

        const style = ray.style || {};
        const stroke = style.stroke || ray.color || '#f43f5e';
        const strokeWidth = this._number(style.strokeWidth, 2);
        const opacity = this._number(style.opacity, 1);
        const pathData = this._pathData(points);
        const dash = this._dashAttribute(style.lineStyle);
        const filter = config.rayGlow ? ` filter="url(#${config.classPrefix}-ray-glow)"` : '';
        const marker = config.showRayArrows ? ` marker-end="url(#${config.classPrefix}-ray-arrow)"` : '';

        return `<path id="${this._escapeAttr(ray.id || `ray-${index + 1}`)}" class="${config.classPrefix}__ray" d="${pathData}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" opacity="${opacity}"${dash}${filter}${marker}/>`;
    }

    _renderConnectors(objects, config) {
        const connectors = this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.CONNECTOR);
        if (connectors.length === 0) return '';

        return `<g id="diagram-object-connectors" class="${config.classPrefix}__connectors">
${connectors.map((connector, index) => this._renderConnector(connector, index, config)).join('\n')}
</g>`;
    }

    _renderConnector(connector, index, config) {
        const points = this._points(connector.points);
        if (points.length < 2) return '';

        const style = connector.style || {};
        const stroke = style.stroke || style.color || '#64748b';
        const strokeWidth = this._number(style.strokeWidth || style.width, 1.5);
        return `<path id="${this._escapeAttr(connector.id || `connector-${index + 1}`)}" class="${config.classPrefix}__connector" d="${this._pathData(points)}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}"${this._dashAttribute(style.lineStyle)}/>`;
    }

    _renderSymbols(objects, config) {
        const symbols = this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.SYMBOL);
        if (symbols.length === 0) return '';

        return `<g id="diagram-object-symbols" class="${config.classPrefix}__symbols">
${symbols.map((symbol, index) => this._renderSymbol(symbol, index, config)).join('\n')}
</g>`;
    }

    _renderSymbol(symbol, index, config) {
        const position = this._point(symbol.position || symbol.pos || symbol);
        const angleDeg = this._number(symbol.angleRad ?? symbol.angle, 0) * 180 / Math.PI;
        const stroke = symbol.style?.stroke || symbol.style?.color || config.symbolStroke;
        const strokeWidth = this._number(symbol.style?.strokeWidth, 2);
        const size = symbol.size || {};
        const width = this._number(size.width, 40);
        const height = this._number(size.height, 40);
        const radius = this._number(size.radius, Math.max(width, height) / 2);

        const shape = this._symbolShape(symbol.type, { width, height, radius, stroke, strokeWidth, symbol }, config);
        const label = config.showLabels ? this._renderSymbolLabel(symbol, width, height, config) : '';
        const badge = config.showReliabilityBadges ? this._renderReliabilityBadge(symbol, width, height, config) : '';

        return `<g id="${this._escapeAttr(symbol.id || `symbol-${index + 1}`)}" class="${config.classPrefix}__symbol ${config.classPrefix}__symbol--${this._slug(symbol.type)}" data-component-type="${this._escapeAttr(symbol.type || 'Unknown')}" transform="translate(${position.x} ${position.y}) rotate(${angleDeg})">
${shape}
${label}
${badge}
</g>`;
    }

    _symbolShape(type, metrics, config) {
        switch (type) {
            case 'LaserSource':
            case 'PointSource':
            case 'LEDSource':
            case 'WhiteLightSource':
                return this._sourceSymbol(metrics, config);
            case 'Mirror':
            case 'MetallicMirror':
            case 'DichroicMirror':
                return this._mirrorSymbol(metrics);
            case 'ThinLens':
            case 'CylindricalLens':
            case 'AsphericLens':
            case 'GRINLens':
                return this._lensSymbol(metrics, config);
            case 'BeamSplitter':
            case 'PBS':
                return this._beamSplitterSymbol(metrics);
            case 'Polarizer':
            case 'PolarizationAnalyzer':
                return this._polarizerSymbol(metrics);
            case 'Screen':
            case 'CCDCamera':
                return this._screenSymbol(metrics);
            case 'Prism':
                return this._prismSymbol(metrics);
            default:
                return this._fallbackSymbol(metrics);
        }
    }

    _sourceSymbol({ width, height, stroke, strokeWidth }) {
        const r = Math.max(5, Math.min(width, height) * 0.18);
        const beam = Math.max(width, 36) * 0.55;
        return `<circle cx="0" cy="0" r="${r}" fill="${this._escapeAttr(stroke)}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}"/>
<path d="M ${r + 3} 0 L ${beam} 0 M ${r + 8} -7 L ${beam - 2} -7 M ${r + 8} 7 L ${beam - 2} 7" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" fill="none"/>`;
    }

    _mirrorSymbol({ width, stroke, strokeWidth }) {
        const half = Math.max(width, 40) / 2;
        return `<path d="M ${-half} 0 L ${half} 0" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth + 0.5}"/>
<path d="M ${-half + 6} 4 L ${-half - 2} 12 M ${-half + 20} 4 L ${-half + 12} 12 M ${-half + 34} 4 L ${-half + 26} 12 M ${half - 8} 4 L ${half - 16} 12" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 0.5)}"/>`;
    }

    _lensSymbol({ height, stroke, strokeWidth, symbol }, config) {
        const h = Math.max(height, 50) / 2;
        const bow = Math.max(10, h * 0.35);
        const focalMarkers = config.showFocalMarkers ? this._lensFocalMarkers(symbol, h, stroke, strokeWidth, config) : '';
        const opticalAxis = config.showOpticalAxis ? `<path class="${config.classPrefix}__optical-axis" d="M ${-h * 1.25} 0 L ${h * 1.25} 0" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 1)}" opacity="0.32" stroke-dasharray="6 5"/>` : '';

        return `<path d="M ${-bow} ${-h} C ${bow} ${-h * 0.45}, ${bow} ${h * 0.45}, ${-bow} ${h}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" fill="none"/>
<path d="M ${bow} ${-h} C ${-bow} ${-h * 0.45}, ${-bow} ${h * 0.45}, ${bow} ${h}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" fill="none"/>
${opticalAxis}
${focalMarkers}`;
    }

    _lensFocalMarkers(symbol, halfHeight, stroke, strokeWidth, config) {
        const focalLength = Math.abs(this._number(symbol?.data?.properties?.focalLength, 0));
        if (!Number.isFinite(focalLength) || focalLength <= 0) return '';

        const markerDistance = Math.min(Math.max(focalLength * 0.28, halfHeight * 0.9), halfHeight * 2.6);
        const tick = Math.max(5, Math.min(10, halfHeight * 0.16));
        const labelOffset = tick + 11;
        const lineWidth = Math.max(1, strokeWidth - 0.5);
        const color = this._escapeAttr(stroke);

        return `<g class="${config.classPrefix}__focal-markers" opacity="0.72">
<path d="M ${-markerDistance} ${-tick} L ${-markerDistance} ${tick} M ${markerDistance} ${-tick} L ${markerDistance} ${tick}" stroke="${color}" stroke-width="${lineWidth}"/>
<text class="${config.classPrefix}__text" x="${-markerDistance}" y="${labelOffset}" text-anchor="middle" font-size="11" fill="${color}" transform="rotate(0)">F</text>
<text class="${config.classPrefix}__text" x="${markerDistance}" y="${labelOffset}" text-anchor="middle" font-size="11" fill="${color}" transform="rotate(0)">F'</text>
</g>`;
    }

    _beamSplitterSymbol({ width, height, stroke, strokeWidth }) {
        const w = Math.max(width, 44) / 2;
        const h = Math.max(height, 44) / 2;
        return `<rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" fill="none" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}"/>
<path d="M ${-w} ${h} L ${w} ${-h}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" opacity="0.75"/>`;
    }

    _polarizerSymbol({ width, height, stroke, strokeWidth }) {
        const w = Math.max(width, 34) / 2;
        const h = Math.max(height, 46) / 2;
        return `<rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" rx="2" fill="none" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}"/>
<path d="M ${-w * 0.45} ${-h * 0.65} L ${w * 0.45} ${h * 0.65}" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 0.5)}"/>
<path d="M ${-w * 0.15} ${-h * 0.65} L ${w * 0.75} ${h * 0.65}" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 0.5)}" opacity="0.55"/>`;
    }

    _screenSymbol({ height, stroke, strokeWidth }) {
        const h = Math.max(height, 52) / 2;
        return `<path d="M 0 ${-h} L 0 ${h}" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth + 0.5}"/>
<path d="M 0 ${-h} L 9 ${-h + 8} M 0 ${-h + 14} L 9 ${-h + 22} M 0 ${h - 14} L 9 ${h - 6}" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 0.5)}"/>`;
    }

    _prismSymbol({ width, height, stroke, strokeWidth }) {
        const w = Math.max(width, 48) / 2;
        const h = Math.max(height, 44) / 2;
        return `<path d="M ${-w} ${h} L 0 ${-h} L ${w} ${h} Z" fill="none" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}"/>`;
    }

    _fallbackSymbol({ width, height, stroke, strokeWidth }) {
        const w = Math.max(width, 36) / 2;
        const h = Math.max(height, 36) / 2;
        return `<rect x="${-w}" y="${-h}" width="${w * 2}" height="${h * 2}" rx="2" fill="none" stroke="${this._escapeAttr(stroke)}" stroke-width="${strokeWidth}" stroke-dasharray="5 4"/>
<path d="M ${-w * 0.45} ${-h * 0.45} L ${w * 0.45} ${h * 0.45} M ${w * 0.45} ${-h * 0.45} L ${-w * 0.45} ${h * 0.45}" stroke="${this._escapeAttr(stroke)}" stroke-width="${Math.max(1, strokeWidth - 0.5)}" opacity="0.55"/>`;
    }

    _renderSymbolLabel(symbol, width, height, config) {
        const label = symbol.label || symbol.type;
        if (!label) return '';
        const y = Math.max(height / 2 + 18, 34);
        return `<text class="${config.classPrefix}__text ${config.classPrefix}__symbol-label" x="0" y="${y}" text-anchor="middle" font-size="13" fill="${this._escapeAttr(config.annotationFill)}" transform="rotate(${-this._number(symbol.angleRad ?? symbol.angle, 0) * 180 / Math.PI})">${this._escapeText(label)}</text>`;
    }

    _renderReliabilityBadge(symbol, width, height, config) {
        const level = symbol.reliability?.level;
        if (!level) return '';
        const x = Math.max(width / 2 + 8, 26);
        const y = -Math.max(height / 2 + 8, 26);
        return `<text class="${config.classPrefix}__badge" x="${x}" y="${y}" fill="#64748b">${this._escapeText(level)}</text>`;
    }

    _renderAnnotations(objects, config) {
        const annotations = [
            ...this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.ANNOTATION),
            ...this._objectsOfType(objects, DIAGRAM_OBJECT_TYPES.LABEL)
        ];
        if (annotations.length === 0) return '';

        return `<g id="diagram-object-annotations" class="${config.classPrefix}__annotations">
${annotations.map((annotation, index) => this._renderAnnotation(annotation, index, config)).join('\n')}
</g>`;
    }

    _renderAnnotation(annotation, index, config) {
        const position = this._point(annotation.position || annotation.pos || annotation);
        const style = annotation.style || {};
        const fill = style.fill || style.color || config.annotationFill;
        const fontSize = this._number(style.fontSize, 14);
        const fontFamily = style.fontFamily || config.fontFamily;
        return `<text id="${this._escapeAttr(annotation.id || `annotation-${index + 1}`)}" class="${config.classPrefix}__text ${config.classPrefix}__annotation" x="${position.x}" y="${position.y}" font-size="${fontSize}" font-family="${this._escapeAttr(fontFamily)}" fill="${this._escapeAttr(fill)}">${this._escapeText(annotation.text || '')}</text>`;
    }

    _validateDiagram(diagram) {
        if (!diagram || diagram.kind !== 'OpticsLabDiagram' || !Array.isArray(diagram.objects)) {
            throw new TypeError('DiagramObjectSVGRenderer.render expects an OpticsLabDiagram with an objects array.');
        }
    }

    _resolveConfig(options) {
        const config = { ...this.options, ...options };
        if (config.stylePreset === 'paper') {
            return {
                ...config,
                background: config.background || '#ffffff',
                symbolStroke: '#111111',
                annotationFill: '#111111',
                rayGlow: options.rayGlow ?? false,
                showReliabilityBadges: options.showReliabilityBadges ?? false
            };
        }
        return config;
    }

    _computeContentBounds(objects, config) {
        const boxes = [];
        const padding = Math.max(0, this._number(config.contentPadding, DEFAULT_OPTIONS.contentPadding));

        objects.forEach(object => {
            if (!object || object.objectType === DIAGRAM_OBJECT_TYPES.PAGE_FRAME) return;

            if (object.objectType === DIAGRAM_OBJECT_TYPES.RAY_PATH || object.objectType === DIAGRAM_OBJECT_TYPES.CONNECTOR) {
                const points = this._points(object.points || object.pathPoints);
                points.forEach(point => boxes.push({ minX: point.x, minY: point.y, maxX: point.x, maxY: point.y }));
                return;
            }

            if (object.objectType === DIAGRAM_OBJECT_TYPES.SYMBOL) {
                const position = this._point(object.position || object.pos || object);
                const size = object.size || {};
                const halfWidth = this._number(size.width, 40) / 2 + 24;
                const halfHeight = this._number(size.height, 40) / 2 + (config.showLabels ? 44 : 24);
                boxes.push({
                    minX: position.x - halfWidth,
                    minY: position.y - halfHeight,
                    maxX: position.x + halfWidth,
                    maxY: position.y + halfHeight
                });
                return;
            }

            if (object.objectType === DIAGRAM_OBJECT_TYPES.ANNOTATION || object.objectType === DIAGRAM_OBJECT_TYPES.LABEL) {
                const position = this._point(object.position || object.pos || object);
                const textLength = String(object.text || '').length;
                const fontSize = this._number(object.style?.fontSize, 14);
                boxes.push({
                    minX: position.x,
                    minY: position.y - fontSize,
                    maxX: position.x + Math.max(20, textLength * fontSize * 0.62),
                    maxY: position.y + fontSize * 0.4
                });
            }
        });

        if (boxes.length === 0) {
            return { x: 0, y: 0, width: DEFAULT_PAGE.width, height: DEFAULT_PAGE.height };
        }

        const minX = Math.min(...boxes.map(box => box.minX)) - padding;
        const minY = Math.min(...boxes.map(box => box.minY)) - padding;
        const maxX = Math.max(...boxes.map(box => box.maxX)) + padding;
        const maxY = Math.max(...boxes.map(box => box.maxY)) + padding;

        return {
            x: Math.floor(minX),
            y: Math.floor(minY),
            width: Math.max(1, Math.ceil(maxX - minX)),
            height: Math.max(1, Math.ceil(maxY - minY))
        };
    }

    _objectsOfType(objects, type) {
        return objects.filter(object => object?.objectType === type);
    }

    _points(value) {
        return Array.isArray(value)
            ? value.map(point => this._point(point)).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))
            : [];
    }

    _point(value) {
        return {
            x: this._number(value?.x, 0),
            y: this._number(value?.y, 0)
        };
    }

    _pathData(points) {
        return points
            .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');
    }

    _dashAttribute(lineStyle) {
        if (lineStyle === 'dashed') return ' stroke-dasharray="10 6"';
        if (lineStyle === 'dotted') return ' stroke-dasharray="2 5"';
        if (lineStyle === 'dashDot') return ' stroke-dasharray="10 5 2 5"';
        return '';
    }

    _number(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _slug(value) {
        return String(value || 'unknown').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
    }

    _escapeText(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    _escapeAttr(value) {
        return this._escapeText(value).replace(/"/g, '&quot;');
    }

    _escapeCSSFont(value) {
        return String(value || DEFAULT_OPTIONS.fontFamily).replace(/[;{}]/g, '');
    }
}

export function createDiagramObjectSVGRenderer(options) {
    return new DiagramObjectSVGRenderer(options);
}
