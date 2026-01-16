/**
 * ProfessionalExport.js - 专业导出增强
 * 为导出引擎添加专业图标、光线链接和技术说明的支持
 * 
 * Requirements: 7.2, 7.3, 7.5, 7.6, 7.7, 7.8, 7.9
 */

import { getProfessionalIconManager } from './ProfessionalIconManager.js';
import { getConnectionPointManager } from './ConnectionPointManager.js';
import { getRayLinkManager } from './RayLinkManager.js';
import { getProfessionalLabelManager } from './ProfessionalLabelSystem.js';
import { getTechnicalNotesArea } from './TechnicalNotesArea.js';

/**
 * 导出预设
 */
export const EXPORT_PRESETS = {
    JOURNAL: {
        name: '学术期刊',
        description: '适用于学术论文发表',
        width: 1200,
        height: 800,
        dpi: 600,
        backgroundColor: '#ffffff',
        includeNotes: true,
        lineWidthScale: 1.5,
        fontScale: 1.2
    },
    POSTER: {
        name: '海报展示',
        description: '适用于学术海报',
        width: 2400,
        height: 1600,
        dpi: 300,
        backgroundColor: '#ffffff',
        includeNotes: true,
        lineWidthScale: 2.0,
        fontScale: 1.5
    },
    PRESENTATION: {
        name: '演示文稿',
        description: '适用于PPT/Keynote',
        width: 1920,
        height: 1080,
        dpi: 150,
        backgroundColor: 'transparent',
        includeNotes: false,
        lineWidthScale: 1.0,
        fontScale: 1.0
    },
    WEB: {
        name: '网页展示',
        description: '适用于网页和文档',
        width: 1200,
        height: 800,
        dpi: 96,
        backgroundColor: 'transparent',
        includeNotes: false,
        lineWidthScale: 1.0,
        fontScale: 1.0
    }
};

/**
 * 专业导出器类
 */
export class ProfessionalExporter {
    constructor(options = {}) {
        this.iconManager = getProfessionalIconManager();
        this.connectionPointManager = getConnectionPointManager();
        this.rayLinkManager = getRayLinkManager();
        this.labelManager = getProfessionalLabelManager();
        this.technicalNotesArea = getTechnicalNotesArea();
        
        this.config = {
            width: 1200,
            height: 800,
            dpi: 300,
            backgroundColor: '#ffffff',
            transparentBackground: false,
            includeNotes: true,
            includeLabels: true,
            includeConnectionPoints: false,
            lineWidthScale: 1.0,
            fontScale: 1.0,
            antiAlias: true,
            ...options
        };
    }

    /**
     * 应用预设
     */
    applyPreset(presetKey) {
        const preset = EXPORT_PRESETS[presetKey];
        if (preset) {
            this.config = { ...this.config, ...preset };
        }
    }

    /**
     * 导出为PNG
     */
    async exportToPNG(components, rays = []) {
        const canvas = this._createCanvas();
        const ctx = canvas.getContext('2d');
        
        // 设置抗锯齿
        ctx.imageSmoothingEnabled = this.config.antiAlias;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制背景
        if (!this.config.transparentBackground && this.config.backgroundColor) {
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // 计算缩放以适应画布
        const scale = this._calculateScale(components);
        ctx.save();
        ctx.scale(scale, scale);
        
        // 渲染所有元素
        this._renderComponents(ctx, components);
        this._renderRayLinks(ctx);
        this._renderLabels(ctx, components);
        
        ctx.restore();
        
        // 渲染技术说明（不缩放）
        if (this.config.includeNotes) {
            this._renderTechnicalNotes(ctx, canvas.width, canvas.height);
        }
        
        // 转换为Blob
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve({
                    blob,
                    width: canvas.width,
                    height: canvas.height,
                    format: 'png'
                });
            }, 'image/png');
        });
    }

    /**
     * 导出为SVG
     */
    exportToSVG(components, rays = []) {
        const width = this.config.width;
        const height = this.config.height;
        
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" 
     viewBox="0 0 ${width} ${height}">
<defs>
    <style type="text/css">
        .component-label { font-family: Arial, sans-serif; }
        .technical-note { font-family: Arial, sans-serif; }
    </style>
</defs>
`;
        
        // 背景
        if (!this.config.transparentBackground && this.config.backgroundColor) {
            svgContent += `<rect width="100%" height="100%" fill="${this.config.backgroundColor}"/>
`;
        }
        
        // 组件
        svgContent += this._generateComponentsSVG(components);
        
        // 光线链接
        svgContent += this._generateRayLinksSVG();
        
        // 标注
        if (this.config.includeLabels) {
            svgContent += this._generateLabelsSVG();
        }
        
        // 技术说明
        if (this.config.includeNotes) {
            svgContent += this._generateTechnicalNotesSVG(width, height);
        }
        
        svgContent += '</svg>';
        
        return {
            content: svgContent,
            width,
            height,
            format: 'svg'
        };
    }

    /**
     * 创建高DPI画布
     * @private
     */
    _createCanvas() {
        const canvas = document.createElement('canvas');
        const dpiScale = this.config.dpi / 96;
        canvas.width = this.config.width * dpiScale;
        canvas.height = this.config.height * dpiScale;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpiScale, dpiScale);
        
        return canvas;
    }

    /**
     * 计算缩放比例
     * @private
     */
    _calculateScale(components) {
        if (!components || components.length === 0) return 1;
        
        // 计算组件边界
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        components.forEach(comp => {
            const pos = comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            const size = 60; // 默认组件大小
            
            minX = Math.min(minX, pos.x - size);
            minY = Math.min(minY, pos.y - size);
            maxX = Math.max(maxX, pos.x + size);
            maxY = Math.max(maxY, pos.y + size);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const margin = 40;
        
        const availableWidth = this.config.width - margin * 2;
        const availableHeight = this.config.height - margin * 2 - 
            (this.config.includeNotes ? 150 : 0);
        
        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        
        return Math.min(scaleX, scaleY, 2); // 最大2倍缩放
    }

    /**
     * 渲染组件
     * @private
     */
    _renderComponents(ctx, components) {
        components.forEach(comp => {
            const componentType = comp.type || comp.constructor?.name;
            const pos = comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            const angle = comp.angle || 0;
            const scale = (comp.scale || 1) * this.config.lineWidthScale;
            
            this.iconManager.renderIcon(ctx, componentType, pos.x, pos.y, angle, scale);
        });
    }

    /**
     * 渲染光线链接
     * @private
     */
    _renderRayLinks(ctx) {
        const links = this.rayLinkManager.getAllLinks();
        
        links.forEach(link => {
            // 临时调整线宽
            const originalWidth = link.style.width;
            link.style.width = originalWidth * this.config.lineWidthScale;
            
            link.render(ctx, this.connectionPointManager);
            
            link.style.width = originalWidth;
        });
    }

    /**
     * 渲染标注
     * @private
     */
    _renderLabels(ctx, components) {
        if (!this.config.includeLabels) return;
        
        this.labelManager.render(ctx, (targetId, targetType) => {
            if (targetType === 'component') {
                const comp = components.find(c => (c.id || c.uuid) === targetId);
                if (comp) {
                    return comp.pos || { x: comp.x || 0, y: comp.y || 0 };
                }
            }
            return null;
        });
    }

    /**
     * 渲染技术说明
     * @private
     */
    _renderTechnicalNotes(ctx, width, height) {
        if (!this.technicalNotesArea.visible) return;
        this.technicalNotesArea.render(ctx, width, height);
    }

    /**
     * 生成组件SVG
     * @private
     */
    _generateComponentsSVG(components) {
        let svg = '<g id="components">\n';
        
        components.forEach(comp => {
            const componentType = comp.type || comp.constructor?.name;
            const pos = comp.pos || { x: comp.x || 0, y: comp.y || 0 };
            const angle = (comp.angle || 0) * 180 / Math.PI;
            const scale = comp.scale || 1;
            
            const icon = this.iconManager.getIconDefinition(componentType);
            
            if (icon?.svgContent) {
                // 使用SVG内容
                svg += `  <g transform="translate(${pos.x}, ${pos.y}) rotate(${angle}) scale(${scale})">
    ${icon.svgContent}
  </g>\n`;
            } else {
                // 使用简单矩形占位
                const w = icon?.width || 60;
                const h = icon?.height || 60;
                svg += `  <rect x="${pos.x - w/2}" y="${pos.y - h/2}" 
        width="${w}" height="${h}" 
        fill="#cccccc" stroke="#333333" stroke-width="1"
        transform="rotate(${angle}, ${pos.x}, ${pos.y})"/>
  <text x="${pos.x}" y="${pos.y + h/2 + 15}" 
        text-anchor="middle" font-size="10" fill="#333333">${componentType}</text>\n`;
            }
        });
        
        svg += '</g>\n';
        return svg;
    }

    /**
     * 生成光线链接SVG
     * @private
     */
    _generateRayLinksSVG() {
        let svg = '<g id="ray-links">\n';
        
        const links = this.rayLinkManager.getAllLinks();
        
        links.forEach(link => {
            const path = link.getPathPoints(this.connectionPointManager);
            if (!path || path.length < 2) return;
            
            // 生成路径
            let pathD = `M ${path[0].x} ${path[0].y}`;
            for (let i = 1; i < path.length; i++) {
                pathD += ` L ${path[i].x} ${path[i].y}`;
            }
            
            // 线型
            let dashArray = '';
            if (link.style.lineStyle === 'dashed') {
                dashArray = 'stroke-dasharray="10,5"';
            } else if (link.style.lineStyle === 'dotted') {
                dashArray = 'stroke-dasharray="2,4"';
            }
            
            svg += `  <path d="${pathD}" 
        fill="none" 
        stroke="${link.style.color}" 
        stroke-width="${link.style.width * this.config.lineWidthScale}"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${dashArray}/>\n`;
            
            // 箭头
            if (link.style.arrowEnd) {
                const lastIdx = path.length - 1;
                const angle = Math.atan2(
                    path[lastIdx].y - path[lastIdx - 1].y,
                    path[lastIdx].x - path[lastIdx - 1].x
                ) * 180 / Math.PI;
                const size = link.style.arrowSize || 8;
                
                svg += `  <polygon 
        points="0,0 ${-size},${-size*0.4} ${-size*0.7},0 ${-size},${size*0.4}"
        fill="${link.style.color}"
        transform="translate(${path[lastIdx].x}, ${path[lastIdx].y}) rotate(${angle})"/>\n`;
            }
            
            // 标签
            if (link.label) {
                const midIdx = Math.floor(path.length / 2);
                const labelPos = path[midIdx];
                svg += `  <text x="${labelPos.x}" y="${labelPos.y - 10}" 
        text-anchor="middle" 
        font-size="12" 
        fill="${link.style.color}"
        class="component-label">${link.label}</text>\n`;
            }
        });
        
        svg += '</g>\n';
        return svg;
    }

    /**
     * 生成标注SVG
     * @private
     */
    _generateLabelsSVG() {
        let svg = '<g id="labels">\n';
        
        const labels = this.labelManager.getAllLabels();
        
        labels.forEach(label => {
            const fontSize = label.style.fontSize * this.config.fontScale;
            let fontStyle = '';
            if (label.style.bold) fontStyle += 'font-weight="bold" ';
            if (label.style.italic) fontStyle += 'font-style="italic" ';
            
            // 解析格式化文本（简化版）
            let text = label.text;
            // 替换希腊字母
            text = text.replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β')
                       .replace(/\\gamma/g, 'γ').replace(/\\delta/g, 'δ')
                       .replace(/\\lambda/g, 'λ').replace(/\\omega/g, 'ω')
                       .replace(/\\mu/g, 'μ').replace(/\\pi/g, 'π')
                       .replace(/\\degree/g, '°').replace(/\\pm/g, '±');
            
            svg += `  <text x="${label.position.x}" y="${label.position.y}" 
        font-size="${fontSize}" 
        fill="${label.style.color}"
        font-family="${label.style.fontFamily}"
        ${fontStyle}
        class="component-label">${this._escapeXML(text)}</text>\n`;
        });
        
        svg += '</g>\n';
        return svg;
    }

    /**
     * 生成技术说明SVG
     * @private
     */
    _generateTechnicalNotesSVG(width, height) {
        if (!this.technicalNotesArea.visible) return '';
        
        const bounds = this.technicalNotesArea.getBounds(width, height);
        const sections = this.technicalNotesArea.getAllSections();
        
        if (sections.length === 0) return '';
        
        let svg = '<g id="technical-notes">\n';
        
        // 背景
        svg += `  <rect x="${bounds.x}" y="${bounds.y}" 
        width="${bounds.width}" height="${bounds.height}"
        fill="${this.technicalNotesArea.style.backgroundColor}"/>\n`;
        
        // 分隔线
        svg += `  <line x1="${bounds.x}" y1="${bounds.y}" 
        x2="${bounds.x + bounds.width}" y2="${bounds.y}"
        stroke="${this.technicalNotesArea.style.borderColor}" stroke-width="1"/>\n`;
        
        // 渲染节
        let currentY = bounds.y + 20;
        const columnWidth = bounds.width / this.technicalNotesArea.columns;
        
        sections.forEach((section, idx) => {
            const colX = bounds.x + (idx % this.technicalNotesArea.columns) * columnWidth;
            
            // 标题
            svg += `  <text x="${colX + 10}" y="${currentY}" 
        font-size="12" font-weight="bold" fill="${section.color}"
        class="technical-note">${this._escapeXML(section.title)}:</text>\n`;
            
            currentY += 18;
            
            // 项目
            section.items.forEach(item => {
                svg += `  <text x="${colX + 18}" y="${currentY}" 
        font-size="12" fill="${this.technicalNotesArea.style.itemColor}"
        class="technical-note">• ${this._escapeXML(item)}</text>\n`;
                currentY += 16;
            });
            
            currentY += 10;
        });
        
        svg += '</g>\n';
        return svg;
    }

    /**
     * XML转义
     * @private
     */
    _escapeXML(str) {
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&apos;');
    }

    /**
     * 下载导出文件
     */
    downloadFile(result, filename) {
        let blob;
        let extension;
        
        if (result.format === 'svg') {
            blob = new Blob([result.content], { type: 'image/svg+xml' });
            extension = 'svg';
        } else if (result.format === 'png') {
            blob = result.blob;
            extension = 'png';
        } else {
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename || 'diagram'}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 单例
let professionalExporterInstance = null;

export function getProfessionalExporter(options = {}) {
    if (!professionalExporterInstance) {
        professionalExporterInstance = new ProfessionalExporter(options);
    }
    return professionalExporterInstance;
}

export function resetProfessionalExporter() {
    professionalExporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ProfessionalExporter = ProfessionalExporter;
    window.getProfessionalExporter = getProfessionalExporter;
    window.EXPORT_PRESETS = EXPORT_PRESETS;
}
