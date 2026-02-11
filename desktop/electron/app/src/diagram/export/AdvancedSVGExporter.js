/**
 * AdvancedSVGExporter.js - 高级SVG导出器
 * 提供增强的SVG导出功能，包括嵌入字体、优化、压缩等
 * 
 * Requirements: 6.1
 */

/**
 * SVG优化选项
 */
export const SVGOptimizationLevel = {
    NONE: 'none',           // 无优化
    BASIC: 'basic',         // 基本优化（移除注释、空白）
    STANDARD: 'standard',   // 标准优化（基本 + 路径优化）
    AGGRESSIVE: 'aggressive' // 激进优化（标准 + 精度降低）
};

/**
 * 字体嵌入策略
 */
export const FontEmbedStrategy = {
    NONE: 'none',           // 不嵌入字体
    SUBSET: 'subset',       // 嵌入使用的字符子集
    FULL: 'full',           // 嵌入完整字体
    CONVERT_TO_PATH: 'path' // 转换文本为路径
};

/**
 * 高级SVG导出器类
 */
export class AdvancedSVGExporter {
    constructor(config = {}) {
        this.config = {
            optimization: SVGOptimizationLevel.STANDARD,
            fontEmbed: FontEmbedStrategy.SUBSET,
            precision: 3,                    // 数值精度（小数位数）
            prettyPrint: false,              // 格式化输出
            includeMetadata: true,           // 包含元数据
            includeViewBox: true,            // 包含viewBox
            responsive: false,               // 响应式SVG
            accessibility: true,             // 可访问性属性
            cssInline: true,                 // 内联CSS样式
            removeHiddenElements: true,      // 移除隐藏元素
            convertShapesToPath: false,      // 转换形状为路径
            ...config
        };
        
        this.usedFonts = new Set();
        this.usedColors = new Set();
        this.definitions = new Map();
    }

    /**
     * 导出SVG
     * @param {Object} scene - 场景数据
     * @param {Object} options - 导出选项
     * @returns {Promise<string>} SVG字符串
     */
    async export(scene, options = {}) {
        const config = { ...this.config, ...options };
        
        // 重置状态
        this.usedFonts.clear();
        this.usedColors.clear();
        this.definitions.clear();
        
        // 构建SVG
        const svg = this._buildSVG(scene, config);
        
        // 优化
        const optimized = this._optimize(svg, config);
        
        // 格式化
        return config.prettyPrint ? this._prettyPrint(optimized) : optimized;
    }

    /**
     * 构建SVG
     * @private
     */
    _buildSVG(scene, config) {
        const { width = 1920, height = 1080, backgroundColor = '#ffffff' } = config;
        
        const parts = [];
        
        // XML声明
        parts.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
        
        // SVG根元素
        const svgAttrs = [
            'xmlns="http://www.w3.org/2000/svg"',
            'xmlns:xlink="http://www.w3.org/1999/xlink"',
            `width="${width}"`,
            `height="${height}"`
        ];
        
        if (config.includeViewBox) {
            svgAttrs.push(`viewBox="0 0 ${width} ${height}"`);
        }
        
        if (config.responsive) {
            svgAttrs.push('preserveAspectRatio="xMidYMid meet"');
        }
        
        if (config.accessibility) {
            svgAttrs.push('role="img"');
            svgAttrs.push('aria-label="Optical Diagram"');
        }
        
        parts.push(`<svg ${svgAttrs.join(' ')}>`);
        
        // 元数据
        if (config.includeMetadata) {
            parts.push(this._buildMetadata(scene));
        }
        
        // 定义部分
        parts.push('<defs>');
        
        // 样式
        if (config.cssInline) {
            parts.push(this._buildStyles(scene, config));
        }
        
        // 渐变、滤镜等
        parts.push(this._buildDefinitions(scene, config));
        
        // 字体
        if (config.fontEmbed !== FontEmbedStrategy.NONE) {
            parts.push(this._buildFontDefinitions(config));
        }
        
        parts.push('</defs>');
        
        // 背景
        if (backgroundColor && backgroundColor !== 'transparent') {
            parts.push(`<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`);
        }
        
        // 主内容组
        parts.push('<g id="diagram">');
        
        // 渲染网格（如果需要）
        if (config.includeGrid && scene.grid) {
            parts.push(this._renderGrid(scene.grid, config));
        }
        
        // 渲染图层
        if (scene.layers) {
            parts.push(this._renderLayers(scene, config));
        } else {
            // 无图层时直接渲染
            parts.push(this._renderComponents(scene.components || [], config));
            parts.push(this._renderRays(scene.rays || [], config));
            parts.push(this._renderAnnotations(scene.annotations || [], config));
        }
        
        parts.push('</g>');
        
        // 技术说明
        if (config.includeNotes && scene.notes && scene.notes.length > 0) {
            parts.push(this._renderNotes(scene.notes, config, height));
        }
        
        parts.push('</svg>');
        
        return parts.join('\n');
    }

    /**
     * 构建元数据
     * @private
     */
    _buildMetadata(scene) {
        const parts = [];
        parts.push('<metadata>');
        parts.push('<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"');
        parts.push('         xmlns:dc="http://purl.org/dc/elements/1.1/">');
        parts.push('  <rdf:Description>');
        parts.push(`    <dc:title>${this._escapeXML(scene.title || 'Optical Diagram')}</dc:title>`);
        parts.push(`    <dc:creator>Professional Optics Diagram System</dc:creator>`);
        parts.push(`    <dc:date>${new Date().toISOString()}</dc:date>`);
        parts.push(`    <dc:format>image/svg+xml</dc:format>`);
        if (scene.description) {
            parts.push(`    <dc:description>${this._escapeXML(scene.description)}</dc:description>`);
        }
        parts.push('  </rdf:Description>');
        parts.push('</rdf:RDF>');
        parts.push('</metadata>');
        return parts.join('\n');
    }

    /**
     * 构建样式
     * @private
     */
    _buildStyles(scene, config) {
        const styles = [];
        
        styles.push('<style type="text/css"><![CDATA[');
        
        // 基础样式
        styles.push('.component { stroke-linecap: round; stroke-linejoin: round; }');
        styles.push('.ray { stroke-linecap: round; stroke-linejoin: round; fill: none; }');
        styles.push('.ray-solid { stroke-dasharray: none; }');
        styles.push('.ray-dashed { stroke-dasharray: 10,5; }');
        styles.push('.ray-dotted { stroke-dasharray: 2,3; }');
        styles.push('.annotation { font-family: Arial, sans-serif; }');
        styles.push('.label { font-size: 14px; }');
        styles.push('.dimension { stroke: #666; stroke-width: 1; }');
        
        // 主题样式
        if (scene.theme) {
            styles.push(this._buildThemeStyles(scene.theme));
        }
        
        styles.push(']]></style>');
        
        return styles.join('\n');
    }

    /**
     * 构建主题样式
     * @private
     */
    _buildThemeStyles(theme) {
        const styles = [];
        
        if (theme.componentColor) {
            styles.push(`.component { stroke: ${theme.componentColor}; }`);
        }
        if (theme.rayColor) {
            styles.push(`.ray { stroke: ${theme.rayColor}; }`);
        }
        if (theme.textColor) {
            styles.push(`.annotation { fill: ${theme.textColor}; }`);
        }
        
        return styles.join('\n');
    }

    /**
     * 构建定义（渐变、滤镜等）
     * @private
     */
    _buildDefinitions(scene, config) {
        const parts = [];
        
        // 箭头标记
        parts.push(this._buildArrowMarkers());
        
        // 渐变
        if (scene.gradients) {
            scene.gradients.forEach(gradient => {
                parts.push(this._buildGradient(gradient));
            });
        }
        
        // 滤镜
        if (config.includeFilters) {
            parts.push(this._buildFilters());
        }
        
        // 图案
        if (scene.patterns) {
            scene.patterns.forEach(pattern => {
                parts.push(this._buildPattern(pattern));
            });
        }
        
        return parts.join('\n');
    }

    /**
     * 构建箭头标记
     * @private
     */
    _buildArrowMarkers() {
        return `
<marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
  <path d="M0,0 L0,6 L9,3 z" fill="context-stroke"/>
</marker>
<marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
  <path d="M9,0 L9,6 L0,3 z" fill="context-stroke"/>
</marker>`;
    }

    /**
     * 构建渐变
     * @private
     */
    _buildGradient(gradient) {
        const { id, type, stops, x1, y1, x2, y2 } = gradient;
        
        if (type === 'linear') {
            const parts = [`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`];
            stops.forEach(stop => {
                parts.push(`  <stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity || 1}"/>`);
            });
            parts.push('</linearGradient>');
            return parts.join('\n');
        } else if (type === 'radial') {
            const parts = [`<radialGradient id="${id}" cx="${gradient.cx}" cy="${gradient.cy}" r="${gradient.r}">`];
            stops.forEach(stop => {
                parts.push(`  <stop offset="${stop.offset}" stop-color="${stop.color}" stop-opacity="${stop.opacity || 1}"/>`);
            });
            parts.push('</radialGradient>');
            return parts.join('\n');
        }
        
        return '';
    }

    /**
     * 构建滤镜
     * @private
     */
    _buildFilters() {
        return `
<filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
  <feOffset dx="2" dy="2" result="offsetblur"/>
  <feComponentTransfer>
    <feFuncA type="linear" slope="0.3"/>
  </feComponentTransfer>
  <feMerge>
    <feMergeNode/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
<filter id="glow">
  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
  <feMerge>
    <feMergeNode in="coloredBlur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>`;
    }

    /**
     * 构建图案
     * @private
     */
    _buildPattern(pattern) {
        const { id, width, height, content } = pattern;
        return `
<pattern id="${id}" x="0" y="0" width="${width}" height="${height}" patternUnits="userSpaceOnUse">
  ${content}
</pattern>`;
    }

    /**
     * 构建字体定义
     * @private
     */
    _buildFontDefinitions(config) {
        if (config.fontEmbed === FontEmbedStrategy.NONE) {
            return '';
        }
        
        // 这里应该实现字体嵌入逻辑
        // 实际应用中需要使用字体解析库
        return '<!-- Font embedding not implemented in this version -->';
    }

    /**
     * 渲染网格
     * @private
     */
    _renderGrid(grid, config) {
        const { type, spacing, color = '#e0e0e0', opacity = 0.5 } = grid;
        const parts = [];
        
        parts.push(`<g id="grid" opacity="${opacity}">`);
        
        if (type === 'rectangular') {
            const { width, height } = config;
            const [spacingX, spacingY] = Array.isArray(spacing) ? spacing : [spacing, spacing];
            
            // 垂直线
            for (let x = 0; x <= width; x += spacingX) {
                parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${color}" stroke-width="0.5"/>`);
            }
            
            // 水平线
            for (let y = 0; y <= height; y += spacingY) {
                parts.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${color}" stroke-width="0.5"/>`);
            }
        }
        
        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * 渲染图层
     * @private
     */
    _renderLayers(scene, config) {
        const parts = [];
        const layers = scene.layers || [];
        
        // 按z-index排序
        const sortedLayers = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        
        sortedLayers.forEach(layer => {
            if (!layer.visible && config.removeHiddenElements) {
                return;
            }
            
            const layerAttrs = [
                `id="layer-${layer.id || layer.name}"`,
                `class="layer"`
            ];
            
            if (!layer.visible) {
                layerAttrs.push('visibility="hidden"');
            }
            
            if (layer.opacity !== undefined && layer.opacity !== 1) {
                layerAttrs.push(`opacity="${layer.opacity}"`);
            }
            
            parts.push(`<g ${layerAttrs.join(' ')}>`);
            
            // 渲染图层内容
            const layerObjects = this._getLayerObjects(scene, layer);
            
            if (layerObjects.components) {
                parts.push(this._renderComponents(layerObjects.components, config));
            }
            if (layerObjects.rays) {
                parts.push(this._renderRays(layerObjects.rays, config));
            }
            if (layerObjects.annotations) {
                parts.push(this._renderAnnotations(layerObjects.annotations, config));
            }
            
            parts.push('</g>');
        });
        
        return parts.join('\n');
    }

    /**
     * 获取图层对象
     * @private
     */
    _getLayerObjects(scene, layer) {
        const result = {
            components: [],
            rays: [],
            annotations: []
        };
        
        const layerObjectIds = new Set(layer.objects || []);
        
        if (scene.components) {
            result.components = scene.components.filter(c => 
                layerObjectIds.has(c.id) || c.layer === layer.name
            );
        }
        
        if (scene.rays) {
            result.rays = scene.rays.filter(r => 
                layerObjectIds.has(r.id) || r.layer === layer.name
            );
        }
        
        if (scene.annotations) {
            result.annotations = scene.annotations.filter(a => 
                layerObjectIds.has(a.id) || a.layer === layer.name
            );
        }
        
        return result;
    }

    /**
     * 渲染组件
     * @private
     */
    _renderComponents(components, config) {
        const parts = [];
        parts.push('<g id="components" class="components">');
        
        components.forEach((comp, index) => {
            const x = this._round(comp.pos?.x || comp.x || 0, config.precision);
            const y = this._round(comp.pos?.y || comp.y || 0, config.precision);
            const angle = this._round((comp.angle ?? comp.angleRad ?? 0) * 180 / Math.PI, config.precision);
            
            const compAttrs = [
                `id="comp-${comp.id || index}"`,
                `class="component component-${comp.type}"`,
                `transform="translate(${x},${y}) rotate(${angle})"`
            ];
            
            if (config.accessibility) {
                compAttrs.push(`aria-label="${comp.type || 'Component'}"`);
            }
            
            parts.push(`<g ${compAttrs.join(' ')}>`);
            parts.push(this._renderComponentShape(comp, config));
            parts.push('</g>');
        });
        
        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * 渲染组件形状
     * @private
     */
    _renderComponentShape(comp, config) {
        // 简化版本 - 实际应该根据组件类型渲染
        const size = comp.size || 60;
        const color = comp.color || '#000000';
        const lineWidth = comp.lineWidth || 2;
        
        return `<rect x="${-size/2}" y="${-size/2}" width="${size}" height="${size}" 
                stroke="${color}" stroke-width="${lineWidth}" fill="none"/>`;
    }

    /**
     * 渲染光线
     * @private
     */
    _renderRays(rays, config) {
        const parts = [];
        parts.push('<g id="rays" class="rays">');
        
        rays.forEach((ray, index) => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            const pathData = this._buildPathData(ray.pathPoints, config.precision);
            const color = ray.color || '#ff0000';
            const lineWidth = ray.lineWidth || 2;
            const lineStyle = ray.lineStyle || 'solid';
            
            const rayAttrs = [
                `id="ray-${ray.id || index}"`,
                `class="ray ray-${lineStyle}"`,
                `d="${pathData}"`,
                `stroke="${color}"`,
                `stroke-width="${lineWidth}"`
            ];
            
            if (ray.opacity !== undefined) {
                rayAttrs.push(`opacity="${ray.opacity}"`);
            }
            
            if (ray.showArrow) {
                rayAttrs.push('marker-end="url(#arrow)"');
            }
            
            parts.push(`<path ${rayAttrs.join(' ')}/>`);
        });
        
        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * 构建路径数据
     * @private
     */
    _buildPathData(points, precision) {
        if (!points || points.length === 0) return '';
        
        const parts = [];
        parts.push(`M ${this._round(points[0].x, precision)} ${this._round(points[0].y, precision)}`);
        
        for (let i = 1; i < points.length; i++) {
            parts.push(`L ${this._round(points[i].x, precision)} ${this._round(points[i].y, precision)}`);
        }
        
        return parts.join(' ');
    }

    /**
     * 渲染标注
     * @private
     */
    _renderAnnotations(annotations, config) {
        const parts = [];
        parts.push('<g id="annotations" class="annotations">');
        
        annotations.forEach((ann, index) => {
            if (!ann.visible && config.removeHiddenElements) return;
            
            const x = this._round(ann.position?.x || 0, config.precision);
            const y = this._round(ann.position?.y || 0, config.precision);
            
            parts.push(`<g id="ann-${ann.id || index}" class="annotation">`);
            
            if (config.fontEmbed === FontEmbedStrategy.CONVERT_TO_PATH) {
                // 转换文本为路径
                parts.push(this._textToPath(ann.text, x, y, ann.style));
            } else {
                // 普通文本
                parts.push(this._renderText(ann.text, x, y, ann.style, config));
            }
            
            parts.push('</g>');
        });
        
        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * 渲染文本
     * @private
     */
    _renderText(text, x, y, style = {}, config) {
        const fontSize = style.fontSize || 14;
        const fontFamily = style.fontFamily || 'Arial, sans-serif';
        const color = style.color || '#000000';
        
        this.usedFonts.add(fontFamily);
        
        const textAttrs = [
            `x="${x}"`,
            `y="${y}"`,
            `font-size="${fontSize}"`,
            `font-family="${fontFamily}"`,
            `fill="${color}"`
        ];
        
        if (style.fontWeight) {
            textAttrs.push(`font-weight="${style.fontWeight}"`);
        }
        
        if (style.fontStyle) {
            textAttrs.push(`font-style="${style.fontStyle}"`);
        }
        
        return `<text ${textAttrs.join(' ')}>${this._escapeXML(text)}</text>`;
    }

    /**
     * 文本转路径（简化版）
     * @private
     */
    _textToPath(text, x, y, style = {}) {
        // 实际实现需要字体解析库
        return `<!-- Text to path conversion: ${this._escapeXML(text)} -->`;
    }

    /**
     * 渲染技术说明
     * @private
     */
    _renderNotes(notes, config, height) {
        const parts = [];
        const notesY = height - 150;
        
        parts.push(`<g id="notes" transform="translate(20, ${notesY})">`);
        parts.push(`<line x1="0" y1="0" x2="${config.width - 40}" y2="0" stroke="#000" stroke-width="1"/>`);
        
        notes.forEach((note, index) => {
            parts.push(`<text x="0" y="${20 + index * 20}" font-size="12" font-family="Arial">${this._escapeXML(note)}</text>`);
        });
        
        parts.push('</g>');
        return parts.join('\n');
    }

    /**
     * 优化SVG
     * @private
     */
    _optimize(svg, config) {
        let optimized = svg;
        
        if (config.optimization === SVGOptimizationLevel.NONE) {
            return optimized;
        }
        
        // 基本优化
        if (config.optimization !== SVGOptimizationLevel.NONE) {
            // 移除注释
            optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
            
            // 移除多余空白
            optimized = optimized.replace(/\s+/g, ' ');
            optimized = optimized.replace(/>\s+</g, '><');
        }
        
        // 标准优化
        if (config.optimization === SVGOptimizationLevel.STANDARD || 
            config.optimization === SVGOptimizationLevel.AGGRESSIVE) {
            // 合并相同属性
            optimized = this._mergeAttributes(optimized);
            
            // 优化路径
            optimized = this._optimizePaths(optimized);
        }
        
        // 激进优化
        if (config.optimization === SVGOptimizationLevel.AGGRESSIVE) {
            // 降低精度
            optimized = this._reducePrecision(optimized, 2);
        }
        
        return optimized;
    }

    /**
     * 合并属性
     * @private
     */
    _mergeAttributes(svg) {
        // 简化实现 - 实际应该使用SVG解析器
        return svg;
    }

    /**
     * 优化路径
     * @private
     */
    _optimizePaths(svg) {
        // 简化实现 - 实际应该使用路径优化算法
        return svg;
    }

    /**
     * 降低精度
     * @private
     */
    _reducePrecision(svg, precision) {
        return svg.replace(/(\d+\.\d{3,})/g, (match) => {
            return parseFloat(match).toFixed(precision);
        });
    }

    /**
     * 格式化输出
     * @private
     */
    _prettyPrint(svg) {
        let formatted = '';
        let indent = 0;
        const indentStr = '  ';
        
        const lines = svg.split(/<|>/);
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            if (line.startsWith('/')) {
                indent--;
            }
            
            formatted += indentStr.repeat(Math.max(0, indent));
            formatted += '<' + line + '>\n';
            
            if (!line.startsWith('/') && !line.endsWith('/') && !line.startsWith('?')) {
                indent++;
            }
        });
        
        return formatted;
    }

    /**
     * 四舍五入
     * @private
     */
    _round(value, precision) {
        const multiplier = Math.pow(10, precision);
        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * 转义XML
     * @private
     */
    _escapeXML(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * 获取使用的字体列表
     */
    getUsedFonts() {
        return Array.from(this.usedFonts);
    }

    /**
     * 获取使用的颜色列表
     */
    getUsedColors() {
        return Array.from(this.usedColors);
    }
}

// ========== 单例模式 ==========
let advancedSVGExporterInstance = null;

export function getAdvancedSVGExporter(config) {
    if (!advancedSVGExporterInstance) {
        advancedSVGExporterInstance = new AdvancedSVGExporter(config);
    }
    return advancedSVGExporterInstance;
}

export function resetAdvancedSVGExporter() {
    advancedSVGExporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.AdvancedSVGExporter = AdvancedSVGExporter;
    window.getAdvancedSVGExporter = getAdvancedSVGExporter;
    window.SVGOptimizationLevel = SVGOptimizationLevel;
    window.FontEmbedStrategy = FontEmbedStrategy;
}
