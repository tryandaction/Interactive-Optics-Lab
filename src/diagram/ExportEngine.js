/**
 * ExportEngine.js - 导出引擎
 * 提供SVG、PNG、PDF格式的高质量导出功能
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9
 */

import { getSymbolLibrary } from './SymbolLibrary.js';
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
    margin: 20,
    rayStyle: {
        color: '#FF0000',
        lineWidth: 2,
        lineStyle: 'solid' // 'solid', 'dashed', 'dotted'
    },
    symbolStyle: {
        color: '#000000',
        lineWidth: 2,
        size: 30
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

        // 使用SVG生成预览
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
        const { width, height, backgroundColor, margin } = config;
        
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
        svgParts.push(`<g id="diagram" transform="translate(${margin}, ${margin})">`);
        
        // 渲染光路
        if (scene.rays && scene.rays.length > 0) {
            svgParts.push(this._renderRaysToSVG(scene.rays, config));
        }
        
        // 渲染元件符号
        if (scene.components && scene.components.length > 0) {
            svgParts.push(this._renderComponentsToSVG(scene.components, config));
        }
        
        // 渲染标注
        if (config.includeAnnotations && scene.annotations && scene.annotations.length > 0) {
            svgParts.push(this._renderAnnotationsToSVG(scene.annotations, scene.components, config));
        }
        
        svgParts.push(`</g>`);
        
        // 技术说明区域
        if (config.includeNotes && scene.notes && scene.notes.length > 0) {
            svgParts.push(this._renderNotesToSVG(scene.notes, config, height));
        }
        
        svgParts.push(`</svg>`);
        
        return svgParts.join('\n');
    }

    /**
     * 生成SVG样式定义
     * @private
     */
    _generateSVGStyles(config) {
        return `
<defs>
    <style type="text/css">
        .ray { stroke-linecap: round; stroke-linejoin: round; }
        .ray-solid { stroke-dasharray: none; }
        .ray-dashed { stroke-dasharray: 10,5; }
        .ray-dotted { stroke-dasharray: 2,3; }
        .component { stroke-linecap: round; stroke-linejoin: round; }
        .annotation { font-family: Arial, sans-serif; }
        .note { font-family: Arial, sans-serif; font-size: 12px; }
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
        
        rays.forEach((ray, index) => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            const pathData = this._buildPathData(ray.pathPoints);
            const color = ray.color || config.rayStyle.color;
            const lineWidth = ray.lineWidth || config.rayStyle.lineWidth;
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
        parts.push(`<g id="components">`);
        
        components.forEach((comp, index) => {
            const x = comp.pos?.x || comp.x || 0;
            const y = comp.pos?.y || comp.y || 0;
            const angle = comp.angle || 0;
            const angleDeg = angle * 180 / Math.PI;
            const type = comp.type || comp.constructor?.name || 'Unknown';
            
            parts.push(`<g id="component-${comp.id || index}" `);
            parts.push(`transform="translate(${x}, ${y}) rotate(${angleDeg})">`);
            
            // 获取符号并渲染
            const symbolSVG = this._getSymbolSVG(type, config.symbolStyle);
            parts.push(symbolSVG);
            
            parts.push(`</g>`);
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
            
            const fontSize = ann.style?.fontSize || 14;
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
    _renderNotesToSVG(notes, config, height) {
        const parts = [];
        const notesY = height - 150;
        
        parts.push(`<g id="notes" transform="translate(20, ${notesY})">`);
        
        // 分隔线
        parts.push(`<line x1="0" y1="0" x2="${config.width - 40}" y2="0" stroke="#000000" stroke-width="1"/>`);
        
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
        const { width, height, dpi, backgroundColor } = config;
        
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
        ctx.translate(config.margin, config.margin);
        
        // 渲染光路
        if (scene.rays && scene.rays.length > 0) {
            this._renderRaysToCanvas(ctx, scene.rays, config);
        }
        
        // 渲染元件
        if (scene.components && scene.components.length > 0) {
            this._renderComponentsToCanvas(ctx, scene.components, config);
        }
        
        // 渲染标注
        if (config.includeAnnotations && scene.annotations && scene.annotations.length > 0) {
            this._renderAnnotationsToCanvas(ctx, scene.annotations, scene.components, config);
        }
        
        // 重置变换
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        
        // 渲染技术说明
        if (config.includeNotes && scene.notes && scene.notes.length > 0) {
            this._renderNotesToCanvas(ctx, scene.notes, config, height);
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
        rays.forEach(ray => {
            if (!ray.pathPoints || ray.pathPoints.length < 2) return;
            
            ctx.save();
            ctx.strokeStyle = ray.color || config.rayStyle.color;
            ctx.lineWidth = ray.lineWidth || config.rayStyle.lineWidth;
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
        components.forEach(comp => {
            const x = comp.pos?.x || comp.x || 0;
            const y = comp.pos?.y || comp.y || 0;
            const angle = comp.angle || 0;
            const type = comp.type || comp.constructor?.name || 'Unknown';
            
            // 使用符号库渲染
            this.symbolLibrary.renderSymbol(ctx, type, x, y, angle, config.symbolStyle.size, config.symbolStyle);
        });
    }

    /**
     * 渲染标注到Canvas
     * @private
     */
    _renderAnnotationsToCanvas(ctx, annotations, components, config) {
        const componentsMap = new Map();
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
                ctx.font = `${ann.style?.fontSize || 14}px ${ann.style?.fontFamily || 'Arial, sans-serif'}`;
                ctx.fillStyle = ann.style?.color || '#000000';
                ctx.textBaseline = 'top';
                ctx.fillText(ann.text, x, y);
                ctx.restore();
            }
        });
    }

    /**
     * 渲染技术说明到Canvas
     * @private
     */
    _renderNotesToCanvas(ctx, notes, config, height) {
        const notesY = height - 150;
        
        ctx.save();
        
        // 分隔线
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, notesY);
        ctx.lineTo(config.width - 20, notesY);
        ctx.stroke();
        
        // 说明文本
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'top';
        
        notes.forEach((note, index) => {
            ctx.fillText(note, 20, notesY + 10 + index * 20);
        });
        
        ctx.restore();
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

        const { width, height } = config;
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
                margin: 40
            },
            'presentation': {
                name: '演示文稿',
                format: ExportFormat.PNG,
                width: 1920,
                height: 1080,
                dpi: 150,
                backgroundColor: '#ffffff',
                includeNotes: false,
                margin: 20
            },
            'poster': {
                name: '海报',
                format: ExportFormat.PDF,
                width: 4000,
                height: 3000,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: true,
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
