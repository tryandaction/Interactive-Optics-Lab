/**
 * ExportEngine.js - 导出引擎
 * 提供SVG、PNG、PDF格式的高质量导出功能
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9
 */

import { getSymbolLibrary } from './SymbolLibrary.js';
import { getProfessionalIconManager } from './ProfessionalIconManager.js';
import { ProfessionalLabel } from './ProfessionalLabelSystem.js';
import { getAnnotationManager } from './AnnotationSystem.js';

/**
 * 导出格式枚举
 */
export const ExportFormat = {
    SVG: 'svg',
    PNG: 'png',
    PDF: 'pdf'
};

/**
 * 默认导出配置
 */
const DEFAULT_CONFIG = {
    format: ExportFormat.SVG,
    width: 1920,
    height: 1080,
    dpi: 300,
    backgroundColor: '#ffffff',
    includeNotes: true,
    includeGrid: false,
    includeAnnotations: true,
    includeDiagramLinks: true,
    includeProfessionalLabels: true,
    useProfessionalIcons: false,
    margin: 20,
    exportPurpose: 'research', // 'research' | 'paper'
    exportScope: 'canvas', // 'canvas' | 'content' | 'crop'
    contentPadding: 30,
    cropArea: null, // {x, y, width, height}
    fontScale: 1,
    strokeScale: 1,
    iconScale: 1,
    notesAreaHeight: 150,
    gridStyle: {
        spacing: 20,
        color: 'rgba(200, 200, 200, 0.3)',
        majorColor: 'rgba(150, 150, 150, 0.5)',
        majorInterval: 5,
        lineWidth: 0.5,
        majorLineWidth: 1,
        origin: { x: 0, y: 0 },
        opacity: 1
    },
    rayStyle: {
        color: '#FF0000',
        lineWidth: 2,
        lineStyle: 'solid' // 'solid', 'dashed', 'dotted'
    },
    symbolStyle: {
        color: '#000000',
        lineWidth: 2,
        size: 30
    },
    professionalIconStyle: {
        preserveSvgColors: true
    }
};

/**
 * 导出引擎类
 * 负责将场景导出为各种格式
 */
export class ExportEngine {
    constructor(options = {}) {
        /** @type {Object} 导出配置 */
        this.config = { ...DEFAULT_CONFIG, ...options };
        
        /** @type {SymbolLibrary} 符号库引用 */
        this.symbolLibrary = options.symbolLibrary || getSymbolLibrary();

        /** @type {ProfessionalIconManager} 专业图标管理器引用 */
        this.professionalIconManager = options.professionalIconManager || getProfessionalIconManager();
        
        /** @type {AnnotationManager} 标注管理器引用 */
        this.annotationManager = options.annotationManager || getAnnotationManager();
        
        /** @type {Object} 导出模板 */
        this.templates = this._loadTemplates();
    }

    /**
     * 设置导出配置
     * @param {Object} config - 配置对象
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 获取当前配置
     * @returns {Object}
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * 获取导出布局（用于预览/范围计算）
     * @param {Object} scene - 场景数据
     * @param {Object} [config] - 配置覆盖
     * @returns {{width:number,height:number,offsetX:number,offsetY:number,scope:string,contentBounds?:Object,notesAreaHeight?:number}}
     */
    getExportLayout(scene, config = {}) {
        const exportConfig = { ...this.config, ...config };
        return this._resolveExportLayout(scene, exportConfig);
    }

    /**
     * 验证导出配置
     * @param {Object} config - 配置对象
     * @returns {{valid: boolean, errors: string[]}}
     */
    validateConfig(config) {
        const errors = [];
        
        if (!Object.values(ExportFormat).includes(config.format)) {
            errors.push(`Invalid format: ${config.format}`);
        }
        
        if (config.width <= 0 || config.width > 10000) {
            errors.push(`Invalid width: ${config.width}. Must be between 1 and 10000.`);
        }
        
        if (config.height <= 0 || config.height > 10000) {
            errors.push(`Invalid height: ${config.height}. Must be between 1 and 10000.`);
        }
        
        if (config.dpi <= 0 || config.dpi > 1200) {
            errors.push(`Invalid DPI: ${config.dpi}. Must be between 1 and 1200.`);
        }

        const scope = config.exportScope || 'canvas';
        if (!['canvas', 'content', 'crop'].includes(scope)) {
            errors.push(`Invalid exportScope: ${scope}. Must be canvas/content/crop.`);
        }

        if (scope === 'crop') {
            const area = config.cropArea;
            if (!area || area.width <= 0 || area.height <= 0) {
                errors.push('Invalid cropArea: width/height must be > 0.');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }


    /**
     * 导出场景
     * @param {Object} scene - 场景数据
     * @param {Object} [config] - 导出配置
     * @returns {Promise<string|Blob>} 导出结果
     */
    async export(scene, config = {}) {
        const exportConfig = { ...this.config, ...config };
        
        // 验证配置
        const validation = this.validateConfig(exportConfig);
        if (!validation.valid) {
            throw new Error(`Invalid export config: ${validation.errors.join(', ')}`);
        }

        switch (exportConfig.format) {
            case ExportFormat.SVG:
                return this.exportSVG(scene, exportConfig);
            case ExportFormat.PNG:
                return this.exportPNG(scene, exportConfig);
            case ExportFormat.PDF:
                return this.exportPDF(scene, exportConfig);
            default:
                throw new Error(`Unsupported format: ${exportConfig.format}`);
        }
    }

    /**
     * 生成预览
     * @param {Object} scene - 场景数据
     * @param {Object} [config] - 配置
     * @returns {Promise<string>} 预览图像的Data URL
     */
    async generatePreview(scene, config = {}) {
        const previewConfig = {
            ...this.config,
            ...config,
            width: Math.min(config.width || 800, 800),
            height: Math.min(config.height || 600, 600)
        };

        // 使用SVG生成预览（如启用专业图标则使用PNG保持一致）
        if (previewConfig.useProfessionalIcons) {
            const pngBlob = await this.exportPNG(scene, previewConfig);
            return this._blobToDataURL(pngBlob);
        }
        const svgData = await this.exportSVG(scene, previewConfig);
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    }

    /**
     * 批量导出
     * @param {Array<Object>} scenes - 场景数组
     * @param {Object} [config] - 配置
     * @param {Function} [progressCallback] - 进度回调
     * @returns {Promise<Array<{scene: string, success: boolean, data?: any, error?: string}>>}
     */
    async batchExport(scenes, config = {}, progressCallback) {
        const results = [];
        
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            
            try {
                const data = await this.export(scene, config);
                results.push({
                    scene: scene.name || `Scene ${i + 1}`,
                    success: true,
                    data
                });
            } catch (error) {
                results.push({
                    scene: scene.name || `Scene ${i + 1}`,
                    success: false,
                    error: error.message
                });
            }
            
            if (progressCallback) {
                progressCallback(i + 1, scenes.length);
            }
        }
        
        return results;
    }

    // ==================== SVG导出 ====================

    /**
     * 导出为SVG
     * @param {Object} scene - 场景数据
     * @param {Object} config - 导出配置
     * @returns {Promise<string>} SVG字符串
     */
    async exportSVG(scene, config) {
        const layout = this._resolveExportLayout(scene, config);
        const { width, height, offsetX, offsetY, notesAreaHeight } = layout;
        const { backgroundColor } = config;
        
        // 创建SVG根元素
        const svgParts = [];
        
        // SVG头部
        svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
        svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" `);
        svgParts.push(`width="${width}" height="${height}" `);
        svgParts.push(`viewBox="0 0 ${width} ${height}">`);
        
        // 添加样式定义
        svgParts.push(this._generateSVGStyles(config));
        
        // 背景
        if (backgroundColor && backgroundColor !== 'transparent') {
            svgParts.push(`<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`);
        }
        
        // 主绘图区域
        svgParts.push(`<g id="diagram" transform="translate(${offsetX}, ${offsetY})">`);

        // 渲染网格
        if (config.includeGrid) {
            svgParts.push(this._renderGridToSVG(scene, config, layout));
        }
        
        // 渲染光路
        if (scene.rays && scene.rays.length > 0) {
            svgParts.push(this._renderRaysToSVG(scene.rays, config));
        }

        // 渲染图形连接光线（绘图模式）
        if (config.includeDiagramLinks && scene.diagramLinks && scene.diagramLinks.length > 0) {
            svgParts.push(this._renderDiagramLinksToSVG(scene.diagramLinks, config));
        }
        
        // 渲染元件符号
        if (scene.components && scene.components.length > 0) {
            svgParts.push(this._renderComponentsToSVG(scene.components, config));
        }
        
        // 渲染标注
        if (config.includeAnnotations && scene.annotations && scene.annotations.length > 0) {
            svgParts.push(this._renderAnnotationsToSVG(scene.annotations, scene.components, config));
        }

        // 渲染专业标注（绘图模式）
        if (config.includeProfessionalLabels && scene.professionalLabels && scene.professionalLabels.length > 0) {
            svgParts.push(this._renderProfessionalLabelsToSVG(scene.professionalLabels, scene.components, scene.diagramLinks, config));
        }
        
        svgParts.push(`</g>`);
        
        // 技术说明区域
        if (config.includeNotes && scene.notes && scene.notes.length > 0) {
            svgParts.push(this._renderNotesToSVG(scene.notes, config, height, width, notesAreaHeight));
        }
        
        svgParts.push(`</svg>`);
        
        return svgParts.join('\n');
    }

    /**
     * 生成SVG样式定义
     * @private
     */
    _generateSVGStyles(config) {
        const noteFontSize = Math.round(12 * (config.fontScale || 1));
        return `
<defs>
    <style type="text/css">
        .ray { stroke-linecap: round; stroke-linejoin: round; }
        .ray-solid { stroke-dasharray: none; }
        .ray-dashed { stroke-dasharray: 10,5; }
        .ray-dotted { stroke-dasharray: 2,3; }
        .component { stroke-linecap: round; stroke-linejoin: round; }
        .annotation { font-family: Arial, sans-serif; }
        .note { font-family: Arial, sans-serif; font-size: ${noteFontSize}px; }
    </style>
</defs>`;
    }

    /**
     * 渲染光路到SVG
     * @private
     */
    _renderRaysToSVG(rays, config) {
        const parts = [];
        parts.push(`<g id="rays">`);
        const strokeScale = config.strokeScale || 1;
        
        rays.forEach((ray, index) => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            const pathData = this._buildPathData(ray.pathPoints);
            const color = ray.color || config.rayStyle.color;
            const lineWidth = (ray.lineWidth || config.rayStyle.lineWidth) * strokeScale;
            const lineStyle = ray.lineStyle || config.rayStyle.lineStyle;
            
            let styleClass = 'ray ray-solid';
            if (lineStyle === 'dashed') styleClass = 'ray ray-dashed';
            else if (lineStyle === 'dotted') styleClass = 'ray ray-dotted';
            
            parts.push(`<path id="ray-${index}" class="${styleClass}" `);
            parts.push(`d="${pathData}" `);
            parts.push(`stroke="${color}" stroke-width="${lineWidth}" fill="none"/>`);
        });
        
        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 构建SVG路径数据
     * @private
     */
    _buildPathData(points) {
        if (!points || points.length === 0) return '';
        
        let pathData = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            pathData += ` L ${points[i].x} ${points[i].y}`;
        }
        
        return pathData;
    }


    /**
     * 渲染元件到SVG
     * @private
     */
    _renderComponentsToSVG(components, config) {
        const parts = [];
        const styleManager = config.styleManager || null;
        const strokeScale = config.strokeScale || 1;
        const iconScale = config.iconScale || 1;
        parts.push(`<g id="components">`);
        
        components.forEach((comp, index) => {
            const x = comp.pos?.x || comp.x || 0;
            const y = comp.pos?.y || comp.y || 0;
            const angle = comp.angle ?? comp.angleRad ?? 0;
            const angleDeg = angle * 180 / Math.PI;
            const type = comp.type || comp.constructor?.name || 'Unknown';
            const compId = comp.id || comp.uuid;
            const effectiveStyle = styleManager?.getEffectiveStyle
                ? styleManager.getEffectiveStyle(compId, type)
                : {};
            const componentStyle = { ...effectiveStyle, ...(comp.style || {}) };
            const symbolStyle = { ...config.symbolStyle, ...componentStyle };
            const scaledSymbolStyle = {
                ...symbolStyle,
                lineWidth: (symbolStyle.lineWidth || config.symbolStyle.lineWidth) * strokeScale,
                size: (symbolStyle.size || config.symbolStyle.size) * iconScale
            };
            
            const opacityAttr = componentStyle.opacity !== undefined ? ` opacity="${componentStyle.opacity}"` : '';
            parts.push(`<g id="component-${comp.id || index}"${opacityAttr} `);
            parts.push(`transform="translate(${x}, ${y}) rotate(${angleDeg})">`);
            
            let rendered = false;
            if (config.useProfessionalIcons && this.professionalIconManager?.hasIcon(type)) {
                const iconSVG = this._getProfessionalIconSVG(type, comp, config);
                if (iconSVG) {
                    parts.push(iconSVG);
                    rendered = true;
                }
            }
            
            if (!rendered) {
                // 获取符号并渲染
                const symbolSVG = this._getSymbolSVG(type, scaledSymbolStyle);
                parts.push(symbolSVG);
            }
            
            parts.push(`</g>`);
        });
        
        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 渲染图形连接光线到SVG
     * @private
     */
    _renderDiagramLinksToSVG(links, config) {
        const parts = [];
        parts.push(`<g id="diagram-links">`);
        const strokeScale = config.strokeScale || 1;
        const fontScale = config.fontScale || 1;

        links.forEach((link, index) => {
            if (!link.pathPoints || link.pathPoints.length < 2) return;

            const pathData = this._buildPathData(link.pathPoints);
            const style = link.style || {};
            const color = style.color || config.rayStyle.color;
            const width = (style.width || style.lineWidth || config.rayStyle.lineWidth) * strokeScale;
            const lineStyle = style.lineStyle || 'solid';

            let dashArray = '';
            if (lineStyle === 'dashed') dashArray = '10,5';
            else if (lineStyle === 'dotted') dashArray = '2,4';
            else if (lineStyle === 'dashDot') dashArray = '10,3,2,3';

            parts.push(`<path id="diagram-link-${link.id || index}" d="${pathData}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dashArray ? ` stroke-dasharray="${dashArray}"` : ''}/>`);

            // 箭头
            if (style.arrowEnd !== false) {
                const arrow = this._buildArrowPolygon(link.pathPoints[link.pathPoints.length - 2], link.pathPoints[link.pathPoints.length - 1], (style.arrowSize || 8) * strokeScale);
                if (arrow) {
                    parts.push(`<polygon points="${arrow}" fill="${color}"/>`);
                }
            }
            if (style.arrowStart) {
                const arrow = this._buildArrowPolygon(link.pathPoints[1], link.pathPoints[0], (style.arrowSize || 8) * strokeScale);
                if (arrow) {
                    parts.push(`<polygon points="${arrow}" fill="${color}"/>`);
                }
            }

            // 标签
            if (link.label) {
                const pos = this._getPositionAlongPath(link.pathPoints, link.labelPosition ?? 0.5);
                const offset = link.labelOffset || { x: 0, y: -15 };
                const labelX = pos.x + offset.x;
                const labelY = pos.y + offset.y;
                const labelFontSize = Math.round(12 * fontScale);
                parts.push(`<text x="${labelX}" y="${labelY}" font-size="${labelFontSize}" font-family="Arial, sans-serif" fill="${color}" text-anchor="middle" dominant-baseline="middle">${this._escapeXML(link.label)}</text>`);
            }
        });

        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 渲染专业标注到SVG
     * @private
     */
    _renderProfessionalLabelsToSVG(labels, components, diagramLinks, config) {
        const parts = [];
        parts.push(`<g id="professional-labels">`);
        const fontScale = config.fontScale || 1;
        const strokeScale = config.strokeScale || 1;

        const componentMap = new Map();
        if (components) {
            components.forEach(c => componentMap.set(c.id || c.uuid, c));
        }

        const linkMap = new Map();
        if (diagramLinks) {
            diagramLinks.forEach(l => linkMap.set(l.id, l));
        }

        labels.forEach((labelData, index) => {
            const label = ProfessionalLabel.deserialize(labelData);
            const x = label.position?.x || 0;
            const y = label.position?.y || 0;
            const fontSize = (label.style?.fontSize || 14) * fontScale;
            const fontFamily = label.style?.fontFamily || 'Arial, sans-serif';
            const color = label.style?.color || '#000000';
            const fontWeight = label.style?.bold ? 'bold' : 'normal';
            const fontStyle = label.style?.italic ? 'italic' : 'normal';

            const targetPos = this._getLabelTargetPosition(label, componentMap, linkMap);
            if (label.leaderLine && targetPos) {
                const lineStyle = label.leaderLineStyle || {};
                const dash = Array.isArray(lineStyle.dashPattern) && lineStyle.dashPattern.length
                    ? ` stroke-dasharray="${lineStyle.dashPattern.join(',')}"`
                    : '';
                const leaderWidth = (lineStyle.width || 1) * strokeScale;
                parts.push(`<line x1="${x}" y1="${y}" x2="${targetPos.x}" y2="${targetPos.y}" stroke="${lineStyle.color || '#666666'}" stroke-width="${leaderWidth}"${dash}/>`);
            }

            const segments = label.parseFormattedText();
            const textParts = [];
            textParts.push(`<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${color}" font-weight="${fontWeight}" font-style="${fontStyle}" dominant-baseline="alphabetic">`);
            segments.forEach(segment => {
                if (segment.type === 'superscript') {
                    textParts.push(`<tspan baseline-shift="super" font-size="${fontSize * 0.7}">${this._escapeXML(segment.text)}</tspan>`);
                } else if (segment.type === 'subscript') {
                    textParts.push(`<tspan baseline-shift="sub" font-size="${fontSize * 0.7}">${this._escapeXML(segment.text)}</tspan>`);
                } else {
                    textParts.push(`<tspan>${this._escapeXML(segment.text)}</tspan>`);
                }
            });
            textParts.push(`</text>`);
            parts.push(textParts.join(''));
        });

        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 获取元件符号的SVG表示
     * @private
     */
    _getSymbolSVG(componentType, style) {
        const size = style.size || 30;
        const color = style.color || '#000000';
        const lineWidth = style.lineWidth || 2;
        
        // 根据元件类型返回对应的SVG
        switch (componentType) {
            case 'LaserSource':
                return this._getLaserSourceSVG(size, color, lineWidth);
            case 'Mirror':
                return this._getMirrorSVG(size, color, lineWidth);
            case 'ThinLens':
                return this._getThinLensSVG(size, color, lineWidth);
            case 'BeamSplitter':
            case 'PBS':
                return this._getBeamSplitterSVG(size, color, lineWidth);
            case 'AcoustoOpticModulator':
            case 'AOM':
                return this._getAOMSVG(size, color, lineWidth);
            case 'Polarizer':
                return this._getPolarizerSVG(size, color, lineWidth);
            case 'Screen':
                return this._getScreenSVG(size, color, lineWidth);
            case 'Photodiode':
                return this._getPhotodiodeSVG(size, color, lineWidth);
            case 'AtomicCell':
            case 'VaporCell':
            case 'GasCell':
                return this._getAtomicCellSVG(size, color, lineWidth);
            default:
                return this._getDefaultSymbolSVG(size, color, lineWidth);
        }
    }

    /**
     * 获取专业图标SVG（内联）
     * @private
     */
    _getProfessionalIconSVG(componentType, component, config) {
        const icon = this.professionalIconManager?.getIconDefinition(componentType);
        if (!icon || !icon.svgContent) return null;

        const scale = (component?.scale || 1)
            * (config.iconScale || 1)
            * (config.professionalIconStyle?.scale || 1);
        const componentStyle = component?.style || {};
        const inlineStyle = this._getProfessionalIconStyle(config, componentStyle);
        const styledSvg = this._applyInlineSvgStyle(icon.svgContent, inlineStyle);
        const meta = this._extractSvgMeta(styledSvg, icon);
        const inner = this._stripOuterSvg(styledSvg);

        const viewBox = meta.viewBox || `0 0 ${meta.width} ${meta.height}`;
        const { vbWidth, vbHeight } = this._parseViewBox(viewBox, meta.width, meta.height);
        const sx = (meta.width / vbWidth) * scale;
        const sy = (meta.height / vbHeight) * scale;
        const opacityAttr = inlineStyle.opacity !== undefined ? ` opacity="${inlineStyle.opacity}"` : '';

        return `
<g class="professional-icon"${opacityAttr} transform="translate(${-meta.width / 2}, ${-meta.height / 2}) scale(${sx}, ${sy})">
    <g transform="translate(${-meta.minX}, ${-meta.minY})">
        ${inner}
    </g>
</g>`;
    }

    /**
     * 应用专业图标样式（SVG内联替换）
     * @private
     */
    _applyInlineSvgStyle(svgContent, style) {
        if (style.preserveSvgColors) {
            return svgContent;
        }
        let styled = svgContent;
        if (style.color) {
            styled = styled.replace(/stroke="[^"]*"/g, `stroke="${style.color}"`);
        }
        if (style.fillColor) {
            styled = styled.replace(/fill="[^"]*"/g, `fill="${style.fillColor}"`);
        }
        if (style.strokeWidth) {
            styled = styled.replace(/stroke-width="[^"]*"/g, `stroke-width="${style.strokeWidth}"`);
        }
        return styled;
    }

    /**
     * 提取SVG元数据
     * @private
     */
    _extractSvgMeta(svgContent, icon) {
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
        const widthMatch = svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height="([^"]+)"/);

        const width = widthMatch ? parseFloat(widthMatch[1]) : (icon?.width || 60);
        const height = heightMatch ? parseFloat(heightMatch[1]) : (icon?.height || 60);

        return {
            viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
            width: Number.isFinite(width) ? width : (icon?.width || 60),
            height: Number.isFinite(height) ? height : (icon?.height || 60)
        };
    }

    /**
     * 解析viewBox
     * @private
     */
    _parseViewBox(viewBox, fallbackWidth, fallbackHeight) {
        if (!viewBox) {
            return { minX: 0, minY: 0, vbWidth: fallbackWidth, vbHeight: fallbackHeight };
        }
        const parts = viewBox.split(/\s+/).map(v => parseFloat(v));
        if (parts.length !== 4 || parts.some(v => Number.isNaN(v))) {
            return { minX: 0, minY: 0, vbWidth: fallbackWidth, vbHeight: fallbackHeight };
        }
        return { minX: parts[0], minY: parts[1], vbWidth: parts[2], vbHeight: parts[3] };
    }

    /**
     * 去除SVG外层标签
     * @private
     */
    _stripOuterSvg(svgContent) {
        return svgContent
            .replace(/<svg[^>]*>/i, '')
            .replace(/<\/svg>/i, '')
            .trim();
    }

    /**
     * 激光光源SVG
     * @private
     */
    _getLaserSourceSVG(size, color, lineWidth) {
        const w = size;
        const h = size * 0.5;
        return `
<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<line x1="${w/2}" y1="0" x2="${w/2 + size * 0.3}" y2="0" 
    stroke="${color}" stroke-width="${lineWidth}"/>
<polygon points="${w/2 + size * 0.3},0 ${w/2 + size * 0.15},-${size * 0.09} ${w/2 + size * 0.15},${size * 0.09}" 
    fill="${color}"/>`;
    }

    /**
     * 反射镜SVG
     * @private
     */
    _getMirrorSVG(size, color, lineWidth) {
        const lines = [];
        lines.push(`<line x1="0" y1="${-size/2}" x2="0" y2="${size/2}" stroke="${color}" stroke-width="${lineWidth * 1.5}"/>`);
        
        // 背面阴影线
        const spacing = size / 8;
        for (let i = -size/2 + spacing; i < size/2; i += spacing) {
            lines.push(`<line x1="-2" y1="${i}" x2="${-size * 0.2}" y2="${i + spacing}" stroke="${color}" stroke-width="${lineWidth * 0.5}"/>`);
        }
        
        return lines.join('\n');
    }

    /**
     * 透镜SVG
     * @private
     */
    _getThinLensSVG(size, color, lineWidth) {
        const r = size * 0.6;
        return `
<path d="M 0 ${-size/2} 
    A ${r} ${r} 0 0 1 0 ${size/2} 
    A ${r} ${r} 0 0 1 0 ${-size/2}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<polygon points="0,${-size/2 - size * 0.15} ${-size * 0.09},${-size/2} ${size * 0.09},${-size/2}" fill="${color}"/>
<polygon points="0,${size/2 + size * 0.15} ${-size * 0.09},${size/2} ${size * 0.09},${size/2}" fill="${color}"/>`;
    }

    /**
     * 分束器SVG
     * @private
     */
    _getBeamSplitterSVG(size, color, lineWidth) {
        const s = size * 0.7;
        return `
<rect x="${-s/2}" y="${-s/2}" width="${s}" height="${s}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<line x1="${-s/2}" y1="${s/2}" x2="${s/2}" y2="${-s/2}" 
    stroke="${color}" stroke-width="${lineWidth}"/>`;
    }

    /**
     * AOM SVG
     * @private
     */
    _getAOMSVG(size, color, lineWidth) {
        const w = size;
        const h = size * 0.6;
        return `
<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<text x="0" y="${-h * 0.1}" text-anchor="middle" font-size="${size * 0.2}" fill="${color}">AOM</text>`;
    }

    /**
     * 偏振片SVG
     * @private
     */
    _getPolarizerSVG(size, color, lineWidth) {
        return `
<circle cx="0" cy="0" r="${size/2}" stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<line x1="0" y1="${-size * 0.35}" x2="0" y2="${size * 0.35}" stroke="${color}" stroke-width="${lineWidth}"/>
<polyline points="${-size * 0.1},${-size * 0.25} 0,${-size * 0.35} ${size * 0.1},${-size * 0.25}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<polyline points="${-size * 0.1},${size * 0.25} 0,${size * 0.35} ${size * 0.1},${size * 0.25}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>`;
    }

    /**
     * 屏幕SVG
     * @private
     */
    _getScreenSVG(size, color, lineWidth) {
        return `
<line x1="0" y1="${-size/2}" x2="0" y2="${size/2}" stroke="${color}" stroke-width="${lineWidth * 2}"/>
<line x1="${-size * 0.2}" y1="${size/2}" x2="${size * 0.2}" y2="${size/2}" stroke="${color}" stroke-width="${lineWidth}"/>`;
    }

    /**
     * 光电二极管SVG
     * @private
     */
    _getPhotodiodeSVG(size, color, lineWidth) {
        return `
<polygon points="${-size * 0.3},${-size * 0.3} ${-size * 0.3},${size * 0.3} ${size * 0.2},0" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<line x1="${size * 0.2}" y1="${-size * 0.3}" x2="${size * 0.2}" y2="${size * 0.3}" 
    stroke="${color}" stroke-width="${lineWidth}"/>`;
    }

    /**
     * 原子气室SVG
     * @private
     */
    _getAtomicCellSVG(size, color, lineWidth) {
        const w = size * 1.2;
        const h = size * 0.6;
        const r = h * 0.3;
        return `
<rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="${r}" ry="${r}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none"/>
<circle cx="${-w * 0.2}" cy="${-h * 0.1}" r="${size * 0.04}" fill="${color}"/>
<circle cx="${w * 0.1}" cy="${h * 0.1}" r="${size * 0.04}" fill="${color}"/>
<circle cx="0" cy="0" r="${size * 0.04}" fill="${color}"/>`;
    }

    /**
     * 默认符号SVG
     * @private
     */
    _getDefaultSymbolSVG(size, color, lineWidth) {
        return `
<rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" 
    stroke="${color}" stroke-width="${lineWidth}" fill="none" stroke-dasharray="3,3"/>
<text x="0" y="5" text-anchor="middle" font-size="${size * 0.4}" fill="${color}">?</text>`;
    }


    /**
     * 渲染标注到SVG
     * @private
     */
    _renderAnnotationsToSVG(annotations, components, config) {
        const parts = [];
        parts.push(`<g id="annotations" class="annotation">`);
        const fontScale = config.fontScale || 1;
        
        const componentsMap = new Map();
        if (components) {
            components.forEach(c => componentsMap.set(c.id, c));
        }
        
        annotations.forEach((ann, index) => {
            if (!ann.visible) return;
            
            // 计算位置
            let x = ann.position?.x || 0;
            let y = ann.position?.y || 0;
            
            if (ann.autoPosition && ann.componentId) {
                const comp = componentsMap.get(ann.componentId);
                if (comp) {
                    const compX = comp.pos?.x || comp.x || 0;
                    const compY = comp.pos?.y || comp.y || 0;
                    x = compX + (ann.offset?.x || 20);
                    y = compY + (ann.offset?.y || -20);
                }
            }
            
            const fontSize = (ann.style?.fontSize || 14) * fontScale;
            const fontFamily = ann.style?.fontFamily || 'Arial, sans-serif';
            const color = ann.style?.color || '#000000';
            
            // 渲染格式化文本
            const formattedSVG = this._renderFormattedTextToSVG(ann.text, x, y, fontSize, fontFamily, color);
            parts.push(`<g id="annotation-${ann.id || index}">${formattedSVG}</g>`);
        });
        
        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 渲染格式化文本到SVG（支持上下标）
     * @private
     */
    _renderFormattedTextToSVG(text, x, y, fontSize, fontFamily, color) {
        const parts = [];
        parts.push(`<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}" fill="${color}">`);
        
        // 解析文本中的上下标
        const segments = this._parseTextSegments(text);
        
        segments.forEach(segment => {
            if (segment.type === 'subscript') {
                parts.push(`<tspan baseline-shift="sub" font-size="${fontSize * 0.7}">${this._escapeXML(segment.text)}</tspan>`);
            } else if (segment.type === 'superscript') {
                parts.push(`<tspan baseline-shift="super" font-size="${fontSize * 0.7}">${this._escapeXML(segment.text)}</tspan>`);
            } else {
                parts.push(`<tspan>${this._escapeXML(segment.text)}</tspan>`);
            }
        });
        
        parts.push(`</text>`);
        return parts.join('');
    }

    /**
     * 解析文本段落
     * @private
     */
    _parseTextSegments(text) {
        const segments = [];
        let currentText = '';
        let i = 0;
        
        while (i < text.length) {
            const char = text[i];
            
            if (char === '_' && i + 1 < text.length) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                
                if (text[i + 1] === '{') {
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        segments.push({ text: text.substring(i + 2, endBrace), type: 'subscript' });
                        i = endBrace + 1;
                    } else {
                        currentText += char;
                        i++;
                    }
                } else {
                    segments.push({ text: text[i + 1], type: 'subscript' });
                    i += 2;
                }
            } else if (char === '^' && i + 1 < text.length) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                
                if (text[i + 1] === '{') {
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        segments.push({ text: text.substring(i + 2, endBrace), type: 'superscript' });
                        i = endBrace + 1;
                    } else {
                        currentText += char;
                        i++;
                    }
                } else {
                    segments.push({ text: text[i + 1], type: 'superscript' });
                    i += 2;
                }
            } else {
                currentText += char;
                i++;
            }
        }
        
        if (currentText) {
            segments.push({ text: currentText, type: 'normal' });
        }
        
        return segments;
    }

    /**
     * 转义XML特殊字符
     * @private
     */
    _escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * 渲染技术说明到SVG
     * @private
     */
    _renderNotesToSVG(notes, config, height, width, notesAreaHeight) {
        const parts = [];
        const areaHeight = notesAreaHeight || config.notesAreaHeight || 150;
        const canvasWidth = width || config.width;
        const notesY = height - areaHeight;
        
        parts.push(`<g id="notes" transform="translate(20, ${notesY})">`);
        
        // 分隔线
        parts.push(`<line x1="0" y1="0" x2="${canvasWidth - 40}" y2="0" stroke="#000000" stroke-width="1"/>`);
        
        // 说明文本
        notes.forEach((note, index) => {
            parts.push(`<text x="0" y="${20 + index * 20}" class="note">${this._escapeXML(note)}</text>`);
        });
        
        parts.push(`</g>`);
        return parts.join('\n');
    }


    // ==================== PNG导出 ====================

    /**
     * 导出为PNG
     * @param {Object} scene - 场景数据
     * @param {Object} config - 导出配置
     * @returns {Promise<Blob>} PNG Blob
     */
    async exportPNG(scene, config) {
        const layout = this._resolveExportLayout(scene, config);
        const { width, height, offsetX, offsetY, notesAreaHeight } = layout;
        const { dpi, backgroundColor } = config;
        
        // 计算实际像素尺寸（考虑DPI）
        const scale = dpi / 96; // 96是标准屏幕DPI
        const actualWidth = Math.round(width * scale);
        const actualHeight = Math.round(height * scale);
        
        // 创建离屏Canvas
        const canvas = document.createElement('canvas');
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        
        const ctx = canvas.getContext('2d');
        
        // 应用缩放
        ctx.scale(scale, scale);
        
        // 绘制背景
        if (backgroundColor && backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }
        
        // 应用边距
        ctx.translate(offsetX, offsetY);

        // 预加载专业图标，避免导出时占位符
        if (config.useProfessionalIcons && scene.components && scene.components.length > 0) {
            await this._preloadProfessionalIcons(scene.components, config);
        }

        // 渲染网格
        if (config.includeGrid) {
            this._renderGridToCanvas(ctx, scene, config, layout);
        }
        
        // 渲染光路
        if (scene.rays && scene.rays.length > 0) {
            this._renderRaysToCanvas(ctx, scene.rays, config);
        }

        // 渲染图形连接光线（绘图模式）
        if (config.includeDiagramLinks && scene.diagramLinks && scene.diagramLinks.length > 0) {
            this._renderDiagramLinksToCanvas(ctx, scene.diagramLinks, config);
        }
        
        // 渲染元件
        if (scene.components && scene.components.length > 0) {
            this._renderComponentsToCanvas(ctx, scene.components, config);
        }
        
        // 渲染标注
        if (config.includeAnnotations && scene.annotations && scene.annotations.length > 0) {
            this._renderAnnotationsToCanvas(ctx, scene.annotations, scene.components, config);
        }

        // 渲染专业标注（绘图模式）
        if (config.includeProfessionalLabels && scene.professionalLabels && scene.professionalLabels.length > 0) {
            this._renderProfessionalLabelsToCanvas(ctx, scene.professionalLabels, scene.components, scene.diagramLinks, config);
        }
        
        // 重置变换
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        
        // 渲染技术说明
        if (config.includeNotes && scene.notes && scene.notes.length > 0) {
            this._renderNotesToCanvas(ctx, scene.notes, config, height, width, notesAreaHeight);
        }
        
        // 转换为Blob
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create PNG blob'));
                }
            }, 'image/png');
        });
    }

    /**
     * 渲染光路到Canvas
     * @private
     */
    _renderRaysToCanvas(ctx, rays, config) {
        const strokeScale = config.strokeScale || 1;
        rays.forEach(ray => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            ctx.save();
            ctx.strokeStyle = ray.color || config.rayStyle.color;
            ctx.lineWidth = (ray.lineWidth || config.rayStyle.lineWidth) * strokeScale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 设置线型
            const lineStyle = ray.lineStyle || config.rayStyle.lineStyle;
            if (lineStyle === 'dashed') {
                ctx.setLineDash([10, 5]);
            } else if (lineStyle === 'dotted') {
                ctx.setLineDash([2, 3]);
            }
            
            ctx.beginPath();
            ctx.moveTo(ray.pathPoints[0].x, ray.pathPoints[0].y);
            for (let i = 1; i < ray.pathPoints.length; i++) {
                ctx.lineTo(ray.pathPoints[i].x, ray.pathPoints[i].y);
            }
            ctx.stroke();
            ctx.restore();
        });
    }

    /**
     * 渲染元件到Canvas
     * @private
     */
    _renderComponentsToCanvas(ctx, components, config) {
        const styleManager = config.styleManager || null;
        const strokeScale = config.strokeScale || 1;
        const iconScale = config.iconScale || 1;
        components.forEach(comp => {
            const x = comp.pos?.x || comp.x || 0;
            const y = comp.pos?.y || comp.y || 0;
            const angle = comp.angle ?? comp.angleRad ?? 0;
            const type = comp.type || comp.constructor?.name || 'Unknown';
            const compId = comp.id || comp.uuid;
            const effectiveStyle = styleManager?.getEffectiveStyle
                ? styleManager.getEffectiveStyle(compId, type)
                : {};
            const componentStyle = { ...effectiveStyle, ...(comp.style || {}) };

            if (config.useProfessionalIcons && this.professionalIconManager?.hasIcon(type)) {
                const scale = (comp.scale || 1) * iconScale;
                const style = this._getProfessionalIconStyle(config, componentStyle);
                this.professionalIconManager.renderIcon(ctx, type, x, y, angle, scale, style);
                return;
            }

            // 使用符号库渲染
            const symbolStyle = { ...config.symbolStyle, ...componentStyle };
            const scaledSymbolStyle = {
                ...symbolStyle,
                lineWidth: (symbolStyle.lineWidth || config.symbolStyle.lineWidth) * strokeScale,
                size: (symbolStyle.size || config.symbolStyle.size) * iconScale
            };
            this.symbolLibrary.renderSymbol(ctx, type, x, y, angle, scaledSymbolStyle.size || config.symbolStyle.size, scaledSymbolStyle);
        });
    }

    /**
     * 预加载专业图标
     * @private
     */
    async _preloadProfessionalIcons(components, config) {
        if (!this.professionalIconManager) return;
        const componentTypes = components
            .map(comp => comp.type || comp.constructor?.name || 'Unknown')
            .filter(type => this.professionalIconManager.hasIcon(type));
        if (componentTypes.length === 0) return;
        const style = this._getProfessionalIconStyle(config);
        await this.professionalIconManager.preloadIcons(componentTypes, style);
    }

    /**
     * 获取专业图标样式
     * @private
     */
    _getProfessionalIconStyle(config, componentStyle = {}) {
        const forceIconColor = componentStyle?.forceIconColor === true;
        const base = {
            preserveSvgColors: !forceIconColor,
            ...(config.professionalIconStyle || {})
        };
        const strokeScale = config.strokeScale || 1;
        if (forceIconColor) {
            base.color = componentStyle.color || base.color;
            base.fillColor = componentStyle.fillColor || base.fillColor;
            const resolvedStroke = componentStyle.lineWidth || base.strokeWidth;
            if (resolvedStroke !== undefined) {
                base.strokeWidth = resolvedStroke * strokeScale;
            }
        }
        if (!forceIconColor && base.strokeWidth !== undefined) {
            base.strokeWidth = base.strokeWidth * strokeScale;
        }
        if (componentStyle.opacity !== undefined) {
            base.opacity = componentStyle.opacity;
        }
        return base;
    }

    /**
     * 渲染标注到Canvas
     * @private
     */
    _renderAnnotationsToCanvas(ctx, annotations, components, config) {
        const componentsMap = new Map();
        const fontScale = config.fontScale || 1;
        if (components) {
            components.forEach(c => componentsMap.set(c.id, c));
        }
        
        annotations.forEach(ann => {
            if (!ann.visible) return;
            
            // 如果是Annotation实例，直接调用render方法
            if (typeof ann.render === 'function') {
                const comp = ann.componentId ? componentsMap.get(ann.componentId) : null;
                ann.render(ctx, comp);
            } else {
                // 否则手动渲染
                let x = ann.position?.x || 0;
                let y = ann.position?.y || 0;
                
                if (ann.autoPosition && ann.componentId) {
                    const comp = componentsMap.get(ann.componentId);
                    if (comp) {
                        const compX = comp.pos?.x || comp.x || 0;
                        const compY = comp.pos?.y || comp.y || 0;
                        x = compX + (ann.offset?.x || 20);
                        y = compY + (ann.offset?.y || -20);
                    }
                }
                
                ctx.save();
                const fontSize = (ann.style?.fontSize || 14) * fontScale;
                ctx.font = `${fontSize}px ${ann.style?.fontFamily || 'Arial, sans-serif'}`;
                ctx.fillStyle = ann.style?.color || '#000000';
                ctx.textBaseline = 'top';
                ctx.fillText(ann.text, x, y);
                ctx.restore();
            }
        });
    }

    /**
     * 渲染图形连接光线到Canvas
     * @private
     */
    _renderDiagramLinksToCanvas(ctx, links, config) {
        const strokeScale = config.strokeScale || 1;
        const fontScale = config.fontScale || 1;
        links.forEach(link => {
            if (!link.pathPoints || link.pathPoints.length < 2) return;

            const style = link.style || {};
            const color = style.color || config.rayStyle.color;
            const width = (style.width || style.lineWidth || config.rayStyle.lineWidth) * strokeScale;
            const lineStyle = style.lineStyle || 'solid';

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (lineStyle === 'dashed') {
                ctx.setLineDash([10, 5]);
            } else if (lineStyle === 'dotted') {
                ctx.setLineDash([2, 4]);
            } else if (lineStyle === 'dashDot') {
                ctx.setLineDash([10, 3, 2, 3]);
            }

            ctx.beginPath();
            ctx.moveTo(link.pathPoints[0].x, link.pathPoints[0].y);
            for (let i = 1; i < link.pathPoints.length; i++) {
                ctx.lineTo(link.pathPoints[i].x, link.pathPoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            if (style.arrowEnd !== false) {
                this._drawArrow(ctx, link.pathPoints[link.pathPoints.length - 2], link.pathPoints[link.pathPoints.length - 1], (style.arrowSize || 8) * strokeScale, color);
            }
            if (style.arrowStart) {
                this._drawArrow(ctx, link.pathPoints[1], link.pathPoints[0], (style.arrowSize || 8) * strokeScale, color);
            }

            if (link.label) {
                const pos = this._getPositionAlongPath(link.pathPoints, link.labelPosition ?? 0.5);
                const offset = link.labelOffset || { x: 0, y: -15 };
                const labelX = pos.x + offset.x;
                const labelY = pos.y + offset.y;

                const labelFontSize = Math.round(12 * fontScale);
                ctx.font = `${labelFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const metrics = ctx.measureText(link.label);
                const padding = 4;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                const labelHeight = labelFontSize * 1.2;
                ctx.fillRect(labelX - metrics.width / 2 - padding, labelY - labelHeight / 2 - padding, metrics.width + padding * 2, labelHeight + padding * 2);

                ctx.fillStyle = color;
                ctx.fillText(link.label, labelX, labelY);
            }

            ctx.restore();
        });
    }

    /**
     * 渲染专业标注到Canvas
     * @private
     */
    _renderProfessionalLabelsToCanvas(ctx, labels, components, diagramLinks, config) {
        const componentMap = new Map();
        const fontScale = config?.fontScale || 1;
        const strokeScale = config?.strokeScale || 1;
        if (components) {
            components.forEach(c => componentMap.set(c.id || c.uuid, c));
        }

        const linkMap = new Map();
        if (diagramLinks) {
            diagramLinks.forEach(l => linkMap.set(l.id, l));
        }

        labels.forEach(labelData => {
            const label = ProfessionalLabel.deserialize(labelData);
            if (label.style) {
                label.style.fontSize = (label.style.fontSize || 14) * fontScale;
            }
            if (label.leaderLineStyle) {
                label.leaderLineStyle.width = (label.leaderLineStyle.width || 1) * strokeScale;
            }
            const targetPos = this._getLabelTargetPosition(label, componentMap, linkMap);
            label.render(ctx, targetPos);
        });
    }

    /**
     * 获取标注关联目标位置
     * @private
     */
    _getLabelTargetPosition(label, componentMap, linkMap) {
        if (!label.targetId) return null;
        if (label.targetType === 'component') {
            const comp = componentMap.get(label.targetId);
            if (comp) {
                return comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            }
        }
        if (label.targetType === 'raylink') {
            const link = linkMap.get(label.targetId);
            if (link?.pathPoints && link.pathPoints.length > 1) {
                return this._getPositionAlongPath(link.pathPoints, 0.5);
            }
        }
        return null;
    }

    /**
     * 渲染技术说明到Canvas
     * @private
     */
    _renderNotesToCanvas(ctx, notes, config, height, width, notesAreaHeight) {
        const areaHeight = notesAreaHeight || config.notesAreaHeight || 150;
        const canvasWidth = width || config.width;
        const notesY = height - areaHeight;
        
        ctx.save();
        
        // 分隔线
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, notesY);
        ctx.lineTo(canvasWidth - 20, notesY);
        ctx.stroke();
        
        // 说明文本
        const noteFontSize = Math.round(12 * (config.fontScale || 1));
        ctx.font = `${noteFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        
        notes.forEach((note, index) => {
            ctx.fillText(note, 20, notesY + 10 + index * 20);
        });
        
        ctx.restore();
    }

    /**
     * 解析导出布局（范围/裁剪/内容自适应）
     * @private
     */
    _resolveExportLayout(scene, config) {
        const margin = Number.isFinite(config.margin) ? config.margin : 0;
        const scope = config.exportScope || 'canvas';
        const notesAreaHeight = this._getNotesAreaHeight(scene, config);

        if (scope === 'content') {
            const bounds = this._getContentBounds(scene, config);
            if (!bounds) {
                return {
                    width: config.width,
                    height: config.height,
                    offsetX: margin,
                    offsetY: margin,
                    scope: 'canvas',
                    notesAreaHeight
                };
            }
            const padding = Number.isFinite(config.contentPadding) ? config.contentPadding : margin;
            const width = Math.max(1, Math.round(bounds.width + padding * 2));
            const height = Math.max(1, Math.round(bounds.height + padding * 2 + (config.includeNotes ? notesAreaHeight : 0)));
            return {
                width,
                height,
                offsetX: Math.round(padding - bounds.minX),
                offsetY: Math.round(padding - bounds.minY),
                scope,
                contentBounds: bounds,
                notesAreaHeight
            };
        }

        if (scope === 'crop' && config.cropArea) {
            const crop = config.cropArea;
            const width = Math.max(1, Math.round(crop.width + margin * 2));
            const height = Math.max(1, Math.round(crop.height + margin * 2 + (config.includeNotes ? notesAreaHeight : 0)));
            return {
                width,
                height,
                offsetX: Math.round(margin - crop.x),
                offsetY: Math.round(margin - crop.y),
                scope,
                contentBounds: {
                    minX: crop.x,
                    minY: crop.y,
                    maxX: crop.x + crop.width,
                    maxY: crop.y + crop.height,
                    width: crop.width,
                    height: crop.height
                },
                notesAreaHeight
            };
        }

        return {
            width: config.width,
            height: config.height,
            offsetX: margin,
            offsetY: margin,
            scope,
            notesAreaHeight
        };
    }

    /**
     * 计算内容边界
     * @private
     */
    _getContentBounds(scene, config) {
        const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        const strokeScale = config.strokeScale || 1;
        const fontScale = config.fontScale || 1;
        const iconScale = config.iconScale || 1;

        const applyPoint = (x, y, padding = 0) => {
            bounds.minX = Math.min(bounds.minX, x - padding);
            bounds.minY = Math.min(bounds.minY, y - padding);
            bounds.maxX = Math.max(bounds.maxX, x + padding);
            bounds.maxY = Math.max(bounds.maxY, y + padding);
        };

        const applyBox = (minX, minY, maxX, maxY) => {
            bounds.minX = Math.min(bounds.minX, minX);
            bounds.minY = Math.min(bounds.minY, minY);
            bounds.maxX = Math.max(bounds.maxX, maxX);
            bounds.maxY = Math.max(bounds.maxY, maxY);
        };

        // 光路
        if (scene.rays && scene.rays.length > 0) {
            scene.rays.forEach(ray => {
                if (!ray.pathPoints || ray.pathPoints.length < 2) return;
                const lineWidth = (ray.lineWidth || config.rayStyle.lineWidth) * strokeScale;
                const pad = lineWidth / 2;
                ray.pathPoints.forEach(p => applyPoint(p.x, p.y, pad));
            });
        }

        // 连接光线
        if (config.includeDiagramLinks && scene.diagramLinks && scene.diagramLinks.length > 0) {
            scene.diagramLinks.forEach(link => {
                if (!link.pathPoints || link.pathPoints.length < 2) return;
                const style = link.style || {};
                const width = (style.width || style.lineWidth || config.rayStyle.lineWidth) * strokeScale;
                const pad = width / 2;
                link.pathPoints.forEach(p => applyPoint(p.x, p.y, pad));
                const arrowSize = (style.arrowSize || 8) * strokeScale;
                if (style.arrowEnd !== false) {
                    const end = link.pathPoints[link.pathPoints.length - 1];
                    applyPoint(end.x, end.y, Math.max(pad, arrowSize));
                }
                if (style.arrowStart) {
                    const start = link.pathPoints[0];
                    applyPoint(start.x, start.y, Math.max(pad, arrowSize));
                }
                if (link.label) {
                    const pos = this._getPositionAlongPath(link.pathPoints, link.labelPosition ?? 0.5);
                    const offset = link.labelOffset || { x: 0, y: -15 };
                    const labelX = pos.x + offset.x;
                    const labelY = pos.y + offset.y;
                    const labelSize = this._estimateTextBounds(link.label, Math.round(12 * fontScale));
                    applyBox(
                        labelX - labelSize.width / 2,
                        labelY - labelSize.height / 2,
                        labelX + labelSize.width / 2,
                        labelY + labelSize.height / 2
                    );
                }
            });
        }

        // 元件
        if (scene.components && scene.components.length > 0) {
            const styleManager = config.styleManager || null;
            scene.components.forEach(comp => {
                const x = comp.pos?.x || comp.x || 0;
                const y = comp.pos?.y || comp.y || 0;
                const angle = comp.angle ?? comp.angleRad ?? 0;
                const type = comp.type || comp.constructor?.name || 'Unknown';
                const compId = comp.id || comp.uuid;
                const effectiveStyle = styleManager?.getEffectiveStyle
                    ? styleManager.getEffectiveStyle(compId, type)
                    : {};
                const componentStyle = { ...effectiveStyle, ...(comp.style || {}) };

                let width = 0;
                let height = 0;
                if (config.useProfessionalIcons && this.professionalIconManager?.hasIcon(type)) {
                    const icon = this.professionalIconManager.getIconDefinition(type);
                    const scale = (comp.scale || 1) * iconScale * (config.professionalIconStyle?.scale || 1);
                    width = (icon?.width || 60) * scale;
                    height = (icon?.height || 60) * scale;
                } else {
                    const symbolStyle = { ...config.symbolStyle, ...componentStyle };
                    const size = (symbolStyle.size || config.symbolStyle.size) * iconScale;
                    const box = this.symbolLibrary.getBoundingBox(type, size);
                    width = box.width;
                    height = box.height;
                    const lineWidth = (symbolStyle.lineWidth || config.symbolStyle.lineWidth) * strokeScale;
                    width += lineWidth;
                    height += lineWidth;
                }

                const cos = Math.abs(Math.cos(angle));
                const sin = Math.abs(Math.sin(angle));
                const rotWidth = width * cos + height * sin;
                const rotHeight = width * sin + height * cos;
                applyBox(x - rotWidth / 2, y - rotHeight / 2, x + rotWidth / 2, y + rotHeight / 2);
            });
        }

        // 标注
        if (config.includeAnnotations && scene.annotations && scene.annotations.length > 0) {
            const componentsMap = new Map();
            if (scene.components) {
                scene.components.forEach(c => componentsMap.set(c.id, c));
            }
            scene.annotations.forEach(ann => {
                if (!ann.visible) return;
                let x = ann.position?.x || 0;
                let y = ann.position?.y || 0;
                if (ann.autoPosition && ann.componentId) {
                    const comp = componentsMap.get(ann.componentId);
                    if (comp) {
                        const compX = comp.pos?.x || comp.x || 0;
                        const compY = comp.pos?.y || comp.y || 0;
                        x = compX + (ann.offset?.x || 20);
                        y = compY + (ann.offset?.y || -20);
                    }
                }
                const fontSize = (ann.style?.fontSize || 14) * fontScale;
                const textBounds = this._estimateFormattedTextBounds(ann.text || '', fontSize);
                applyBox(x, y - textBounds.height, x + textBounds.width, y);
            });
        }

        // 专业标注
        if (config.includeProfessionalLabels && scene.professionalLabels && scene.professionalLabels.length > 0) {
            const componentMap = new Map();
            if (scene.components) {
                scene.components.forEach(c => componentMap.set(c.id || c.uuid, c));
            }
            const linkMap = new Map();
            if (scene.diagramLinks) {
                scene.diagramLinks.forEach(l => linkMap.set(l.id, l));
            }
            scene.professionalLabels.forEach(labelData => {
                const label = ProfessionalLabel.deserialize(labelData);
                const x = label.position?.x || 0;
                const y = label.position?.y || 0;
                const fontSize = (label.style?.fontSize || 14) * fontScale;
                const segments = label.parseFormattedText();
                const textBounds = this._estimateSegmentsBounds(segments, fontSize);
                applyBox(x, y - textBounds.height, x + textBounds.width, y);

                if (label.leaderLine) {
                    const target = this._getLabelTargetPosition(label, componentMap, linkMap);
                    if (target) {
                        applyPoint(target.x, target.y, (label.leaderLineStyle?.width || 1) * strokeScale);
                        applyPoint(x, y);
                    }
                }
            });
        }

        if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
            return null;
        }

        return {
            minX: bounds.minX,
            minY: bounds.minY,
            maxX: bounds.maxX,
            maxY: bounds.maxY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
        };
    }

    /**
     * 估算普通文本边界
     * @private
     */
    _estimateTextBounds(text, fontSize) {
        const safeText = text || '';
        const width = safeText.length * fontSize * 0.6;
        const height = fontSize * 1.2;
        return { width, height };
    }

    /**
     * 估算带上下标文本边界
     * @private
     */
    _estimateFormattedTextBounds(text, fontSize) {
        const segments = this._parseTextSegments(text || '');
        return this._estimateSegmentsBounds(segments, fontSize);
    }

    /**
     * 估算文本段落边界
     * @private
     */
    _estimateSegmentsBounds(segments, fontSize) {
        let width = 0;
        segments.forEach(seg => {
            const isScript = seg.type === 'subscript' || seg.type === 'superscript';
            const size = isScript ? fontSize * 0.7 : fontSize;
            width += (seg.text || '').length * size * 0.6;
        });
        const height = fontSize * 1.2;
        return { width, height };
    }

    /**
     * 计算说明区域高度
     * @private
     */
    _getNotesAreaHeight(scene, config) {
        if (!config.includeNotes || !scene?.notes || scene.notes.length === 0) {
            return 0;
        }
        const minHeight = config.notesAreaHeight || 150;
        const lineHeight = 20;
        const required = 40 + scene.notes.length * lineHeight;
        return Math.max(minHeight, required);
    }

    /**
     * 解析网格样式
     * @private
     */
    _resolveGridStyle(scene, config) {
        const base = config.gridStyle || {};
        const sceneGrid = scene?.grid || {};
        const spacing = Number(sceneGrid.spacing ?? base.spacing ?? 20);
        if (!Number.isFinite(spacing) || spacing <= 0) {
            return null;
        }
        return {
            spacing,
            color: sceneGrid.color ?? base.color ?? 'rgba(200, 200, 200, 0.3)',
            majorColor: sceneGrid.majorColor ?? base.majorColor ?? 'rgba(150, 150, 150, 0.5)',
            majorInterval: Number(sceneGrid.majorInterval ?? base.majorInterval ?? 5),
            lineWidth: Number(sceneGrid.lineWidth ?? base.lineWidth ?? 0.5),
            majorLineWidth: Number(sceneGrid.majorLineWidth ?? base.majorLineWidth ?? 1),
            origin: sceneGrid.origin ?? base.origin ?? { x: 0, y: 0 },
            opacity: Number(sceneGrid.opacity ?? base.opacity ?? 1)
        };
    }

    /**
     * 获取网格可视世界坐标范围
     * @private
     */
    _getGridWorldBounds(layout) {
        const notesHeight = layout?.notesAreaHeight || 0;
        const diagramHeight = Math.max(0, layout.height - notesHeight);
        const worldMinX = -layout.offsetX;
        const worldMinY = -layout.offsetY;
        const worldMaxX = worldMinX + layout.width;
        const worldMaxY = worldMinY + diagramHeight;
        return { worldMinX, worldMinY, worldMaxX, worldMaxY };
    }

    /**
     * 渲染网格到SVG
     * @private
     */
    _renderGridToSVG(scene, config, layout) {
        const grid = this._resolveGridStyle(scene, config);
        if (!grid) return '';
        const bounds = this._getGridWorldBounds(layout);
        if (bounds.worldMaxX <= bounds.worldMinX || bounds.worldMaxY <= bounds.worldMinY) {
            return '';
        }

        const strokeScale = config.strokeScale || 1;
        const spacing = grid.spacing;
        const origin = grid.origin || { x: 0, y: 0 };
        const startX = Math.floor((bounds.worldMinX - origin.x) / spacing) * spacing + origin.x;
        const startY = Math.floor((bounds.worldMinY - origin.y) / spacing) * spacing + origin.y;

        const parts = [];
        const opacityAttr = grid.opacity !== 1 ? ` opacity="${grid.opacity}"` : '';
        parts.push(`<g id="grid"${opacityAttr}>`);

        const minorLines = [];
        const majorLines = [];
        const majorInterval = Math.max(1, grid.majorInterval || 5);

        for (let x = startX; x <= bounds.worldMaxX; x += spacing) {
            const idx = Math.round((x - origin.x) / spacing);
            const isMajor = idx % majorInterval === 0;
            const line = `<line x1="${x}" y1="${bounds.worldMinY}" x2="${x}" y2="${bounds.worldMaxY}"/>`;
            (isMajor ? majorLines : minorLines).push(line);
        }

        for (let y = startY; y <= bounds.worldMaxY; y += spacing) {
            const idx = Math.round((y - origin.y) / spacing);
            const isMajor = idx % majorInterval === 0;
            const line = `<line x1="${bounds.worldMinX}" y1="${y}" x2="${bounds.worldMaxX}" y2="${y}"/>`;
            (isMajor ? majorLines : minorLines).push(line);
        }

        if (minorLines.length) {
            const width = (grid.lineWidth || 0.5) * strokeScale;
            parts.push(`<g class="grid-minor" stroke="${grid.color}" stroke-width="${width}">`);
            parts.push(minorLines.join(''));
            parts.push(`</g>`);
        }
        if (majorLines.length) {
            const width = (grid.majorLineWidth || 1) * strokeScale;
            parts.push(`<g class="grid-major" stroke="${grid.majorColor}" stroke-width="${width}">`);
            parts.push(majorLines.join(''));
            parts.push(`</g>`);
        }

        parts.push(`</g>`);
        return parts.join('\n');
    }

    /**
     * 渲染网格到Canvas
     * @private
     */
    _renderGridToCanvas(ctx, scene, config, layout) {
        const grid = this._resolveGridStyle(scene, config);
        if (!grid) return;
        const bounds = this._getGridWorldBounds(layout);
        if (bounds.worldMaxX <= bounds.worldMinX || bounds.worldMaxY <= bounds.worldMinY) {
            return;
        }

        const strokeScale = config.strokeScale || 1;
        const spacing = grid.spacing;
        const origin = grid.origin || { x: 0, y: 0 };
        const startX = Math.floor((bounds.worldMinX - origin.x) / spacing) * spacing + origin.x;
        const startY = Math.floor((bounds.worldMinY - origin.y) / spacing) * spacing + origin.y;
        const majorInterval = Math.max(1, grid.majorInterval || 5);

        ctx.save();
        ctx.globalAlpha = grid.opacity ?? 1;

        // 小网格
        ctx.strokeStyle = grid.color;
        ctx.lineWidth = (grid.lineWidth || 0.5) * strokeScale;
        ctx.beginPath();
        for (let x = startX; x <= bounds.worldMaxX; x += spacing) {
            const idx = Math.round((x - origin.x) / spacing);
            if (idx % majorInterval !== 0) {
                ctx.moveTo(x, bounds.worldMinY);
                ctx.lineTo(x, bounds.worldMaxY);
            }
        }
        for (let y = startY; y <= bounds.worldMaxY; y += spacing) {
            const idx = Math.round((y - origin.y) / spacing);
            if (idx % majorInterval !== 0) {
                ctx.moveTo(bounds.worldMinX, y);
                ctx.lineTo(bounds.worldMaxX, y);
            }
        }
        ctx.stroke();

        // 大网格
        ctx.strokeStyle = grid.majorColor;
        ctx.lineWidth = (grid.majorLineWidth || 1) * strokeScale;
        ctx.beginPath();
        for (let x = startX; x <= bounds.worldMaxX; x += spacing) {
            const idx = Math.round((x - origin.x) / spacing);
            if (idx % majorInterval === 0) {
                ctx.moveTo(x, bounds.worldMinY);
                ctx.lineTo(x, bounds.worldMaxY);
            }
        }
        for (let y = startY; y <= bounds.worldMaxY; y += spacing) {
            const idx = Math.round((y - origin.y) / spacing);
            if (idx % majorInterval === 0) {
                ctx.moveTo(bounds.worldMinX, y);
                ctx.lineTo(bounds.worldMaxX, y);
            }
        }
        ctx.stroke();
        ctx.restore();
    }

    /**
     * 获取路径上的位置
     * @private
     */
    _getPositionAlongPath(path, t) {
        if (!path || path.length < 2) return { x: 0, y: 0 };
        let totalLength = 0;
        const segments = [];
        for (let i = 1; i < path.length; i++) {
            const len = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
            segments.push({ start: path[i - 1], end: path[i], length: len });
            totalLength += len;
        }
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
     * 绘制箭头（Canvas）
     * @private
     */
    _drawArrow(ctx, from, to, size, color) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.save();
        ctx.translate(to.x, to.y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
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
     * 构建箭头多边形（SVG）
     * @private
     */
    _buildArrowPolygon(from, to, size) {
        if (!from || !to) return '';
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const tip = { x: to.x, y: to.y };
        const left = {
            x: to.x - size * cos + size * 0.4 * sin,
            y: to.y - size * sin - size * 0.4 * cos
        };
        const mid = {
            x: to.x - size * 0.7 * cos,
            y: to.y - size * 0.7 * sin
        };
        const right = {
            x: to.x - size * cos - size * 0.4 * sin,
            y: to.y - size * sin + size * 0.4 * cos
        };

        return `${tip.x},${tip.y} ${left.x},${left.y} ${mid.x},${mid.y} ${right.x},${right.y}`;
    }


    // ==================== PDF导出 ====================

    /**
     * 导出为PDF
     * 注意：需要引入jsPDF和svg2pdf.js库
     * @param {Object} scene - 场景数据
     * @param {Object} config - 导出配置
     * @returns {Promise<Blob>} PDF Blob
     */
    async exportPDF(scene, config) {
        // 检查jsPDF是否可用
        if (typeof window === 'undefined' || !window.jspdf) {
            // 尝试动态加载jsPDF
            try {
                await this._loadJsPDF();
            } catch (error) {
                throw new Error('PDF export requires jsPDF library. Please include jsPDF in your project.');
            }
        }

        const layout = this._resolveExportLayout(scene, config);
        const { width, height } = layout;
        const { jsPDF } = window.jspdf;
        
        // 确定页面方向
        const orientation = width > height ? 'landscape' : 'portrait';
        
        // 创建PDF文档
        const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [width, height],
            hotfixes: ['px_scaling']
        });
        
        // 首先生成SVG
        const svgData = await this.exportSVG(scene, config);
        
        // 检查svg2pdf是否可用
        if (typeof window.svg2pdf === 'function' || (pdf.svg && typeof pdf.svg === 'function')) {
            // 使用svg2pdf转换
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            
            // 临时添加到DOM以便渲染
            svgElement.style.position = 'absolute';
            svgElement.style.left = '-9999px';
            document.body.appendChild(svgElement);
            
            try {
                if (pdf.svg) {
                    await pdf.svg(svgElement, { x: 0, y: 0, width, height });
                } else {
                    await window.svg2pdf(svgElement, pdf, { x: 0, y: 0, width, height });
                }
            } finally {
                document.body.removeChild(svgElement);
            }
        } else {
            // 回退方案：使用Canvas渲染后添加到PDF
            const pngBlob = await this.exportPNG(scene, config);
            const pngDataUrl = await this._blobToDataURL(pngBlob);
            pdf.addImage(pngDataUrl, 'PNG', 0, 0, width, height);
        }
        
        // 返回PDF Blob
        return pdf.output('blob');
    }

    /**
     * 动态加载jsPDF库
     * @private
     */
    async _loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(script);
        });
    }

    /**
     * Blob转DataURL
     * @private
     */
    _blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ==================== 模板管理 ====================

    /**
     * 加载导出模板
     * @private
     */
    _loadTemplates() {
        const defaultTemplates = {
            'journal': {
                name: '期刊论文',
                format: ExportFormat.PDF,
                width: 3000,
                height: 2000,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: true,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 40,
                margin: 40
            },
            'paper-a4-single': {
                name: '论文 A4 单栏 (300DPI)',
                format: ExportFormat.PDF,
                width: 2480,
                height: 3508,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 60,
                margin: 40
            },
            'paper-a4-double': {
                name: '论文 A4 双栏 (300DPI)',
                format: ExportFormat.PDF,
                width: 2480,
                height: 3508,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 50,
                margin: 40
            },
            'paper-figure-1col': {
                name: '论文图 单栏 (85mm, 300DPI)',
                format: ExportFormat.PDF,
                width: 1005,
                height: 800,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 30,
                margin: 20
            },
            'paper-figure-2col': {
                name: '论文图 双栏 (170mm, 300DPI)',
                format: ExportFormat.PDF,
                width: 2007,
                height: 1200,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 40,
                margin: 30
            },
            'presentation': {
                name: '演示文稿',
                format: ExportFormat.PNG,
                width: 1920,
                height: 1080,
                dpi: 150,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: false,
                exportPurpose: 'research',
                exportScope: 'canvas',
                contentPadding: 20,
                margin: 20
            },
            'report-16x9': {
                name: '报告 16:9 (300DPI)',
                format: ExportFormat.PNG,
                width: 3840,
                height: 2160,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'research',
                exportScope: 'content',
                contentPadding: 40,
                margin: 30
            },
            'report-4x3': {
                name: '报告 4:3 (300DPI)',
                format: ExportFormat.PNG,
                width: 3600,
                height: 2700,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'research',
                exportScope: 'content',
                contentPadding: 40,
                margin: 30
            },
            'poster': {
                name: '海报',
                format: ExportFormat.PDF,
                width: 4000,
                height: 3000,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: true,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 80,
                margin: 60
            },
            'poster-a1': {
                name: '海报 A1 (300DPI)',
                format: ExportFormat.PDF,
                width: 7016,
                height: 9933,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: true,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 100,
                margin: 80
            },
            'poster-a2': {
                name: '海报 A2 (300DPI)',
                format: ExportFormat.PDF,
                width: 4961,
                height: 7016,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: true,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportPurpose: 'paper',
                exportScope: 'content',
                contentPadding: 80,
                margin: 60
            },
            'web': {
                name: '网页',
                format: ExportFormat.SVG,
                width: 1200,
                height: 800,
                dpi: 96,
                backgroundColor: 'transparent',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: false,
                exportPurpose: 'research',
                exportScope: 'canvas',
                contentPadding: 10,
                margin: 10
            }
        };

        // 尝试从localStorage加载自定义模板
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('exportTemplates');
                if (stored) {
                    const customTemplates = JSON.parse(stored);
                    return { ...defaultTemplates, ...customTemplates };
                }
            } catch (error) {
                console.warn('ExportEngine: Error loading custom templates:', error);
            }
        }

        return defaultTemplates;
    }

    /**
     * 获取所有模板
     * @returns {Object}
     */
    getTemplates() {
        return { ...this.templates };
    }

    /**
     * 获取指定模板
     * @param {string} templateName - 模板名称
     * @returns {Object|null}
     */
    getTemplate(templateName) {
        return this.templates[templateName] || null;
    }

    /**
     * 保存自定义模板
     * @param {string} name - 模板名称
     * @param {Object} config - 模板配置
     */
    saveTemplate(name, config) {
        this.templates[name] = {
            ...config,
            name: config.name || name,
            custom: true
        };

        // 保存到localStorage
        if (typeof localStorage !== 'undefined') {
            try {
                const customTemplates = {};
                Object.entries(this.templates).forEach(([key, value]) => {
                    if (value.custom) {
                        customTemplates[key] = value;
                    }
                });
                localStorage.setItem('exportTemplates', JSON.stringify(customTemplates));
            } catch (error) {
                console.warn('ExportEngine: Error saving template:', error);
            }
        }
    }

    /**
     * 删除自定义模板
     * @param {string} name - 模板名称
     * @returns {boolean}
     */
    deleteTemplate(name) {
        if (!this.templates[name] || !this.templates[name].custom) {
            return false;
        }

        delete this.templates[name];

        // 更新localStorage
        if (typeof localStorage !== 'undefined') {
            try {
                const customTemplates = {};
                Object.entries(this.templates).forEach(([key, value]) => {
                    if (value.custom) {
                        customTemplates[key] = value;
                    }
                });
                localStorage.setItem('exportTemplates', JSON.stringify(customTemplates));
            } catch (error) {
                console.warn('ExportEngine: Error deleting template:', error);
            }
        }

        return true;
    }

    /**
     * 应用模板
     * @param {string} templateName - 模板名称
     */
    applyTemplate(templateName) {
        const template = this.getTemplate(templateName);
        if (template) {
            this.setConfig(template);
        }
    }
}

// 创建单例实例
let exportEngineInstance = null;

/**
 * 获取ExportEngine单例实例
 * @param {Object} options - 配置选项
 * @returns {ExportEngine}
 */
export function getExportEngine(options = {}) {
    if (!exportEngineInstance) {
        exportEngineInstance = new ExportEngine(options);
    }
    return exportEngineInstance;
}

/**
 * 重置ExportEngine单例（主要用于测试）
 */
export function resetExportEngine() {
    exportEngineInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ExportEngine = ExportEngine;
    window.ExportFormat = ExportFormat;
    window.getExportEngine = getExportEngine;
}
