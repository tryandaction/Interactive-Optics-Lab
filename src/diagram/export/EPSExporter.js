/**
 * EPSExporter.js - EPS (Encapsulated PostScript) 导出器
 * Exports diagrams to EPS format for LaTeX and scientific publishing
 * 
 * Requirements: 6.4
 */

/**
 * EPS导出器类
 */
export class EPSExporter {
    constructor(options = {}) {
        this.options = {
            level: options.level || 2,  // PostScript Level 2 or 3
            cmyk: options.cmyk !== false,  // Use CMYK color space
            embedFonts: options.embedFonts !== false,
            dpi: options.dpi || 300,
            ...options
        };
    }

    /**
     * 导出场景为EPS
     */
    export(scene, width, height) {
        const eps = [];
        
        // EPS Header
        eps.push('%!PS-Adobe-3.0 EPSF-3.0');
        eps.push(`%%BoundingBox: 0 0 ${Math.round(width)} ${Math.round(height)}`);
        eps.push(`%%HiResBoundingBox: 0 0 ${width} ${height}`);
        eps.push(`%%Creator: Professional Optics Diagram System`);
        eps.push(`%%Title: ${scene.name || 'Optical Diagram'}`);
        eps.push(`%%CreationDate: ${new Date().toISOString()}`);
        eps.push(`%%DocumentData: Clean7Bit`);
        eps.push(`%%Origin: 0 0`);
        eps.push(`%%LanguageLevel: ${this.options.level}`);
        eps.push(`%%Pages: 1`);
        eps.push(`%%Page: 1 1`);
        eps.push('%%EndComments');
        eps.push('');
        
        // Prolog - Define helper functions
        eps.push('%%BeginProlog');
        eps.push(this._generateProlog());
        eps.push('%%EndProlog');
        eps.push('');
        
        // Setup
        eps.push('%%BeginSetup');
        eps.push('save');
        eps.push(`${width} ${height} scale`);
        eps.push('%%EndSetup');
        eps.push('');
        
        // Page content
        eps.push('%%Page: 1 1');
        eps.push('');
        
        // Render components
        if (scene.components) {
            scene.components.forEach(comp => {
                eps.push(this._renderComponent(comp, width, height));
            });
        }
        
        // Render rays
        if (scene.rays) {
            scene.rays.forEach(ray => {
                eps.push(this._renderRay(ray, width, height));
            });
        }
        
        // Render annotations
        if (scene.annotations) {
            scene.annotations.forEach(annotation => {
                eps.push(this._renderAnnotation(annotation, width, height));
            });
        }
        
        // Trailer
        eps.push('');
        eps.push('showpage');
        eps.push('restore');
        eps.push('%%Trailer');
        eps.push('%%EOF');
        
        return eps.join('\n');
    }

    /**
     * 生成PostScript序言
     */
    _generateProlog() {
        const prolog = [];
        
        // Color conversion functions
        if (this.options.cmyk) {
            prolog.push('% RGB to CMYK conversion');
            prolog.push('/setrgbcolor {');
            prolog.push('  /b exch def /g exch def /r exch def');
            prolog.push('  /k 1 r g b max max sub def');
            prolog.push('  k 1 eq {');
            prolog.push('    0 0 0 1 setcmykcolor');
            prolog.push('  } {');
            prolog.push('    /c 1 r sub k sub 1 k sub div def');
            prolog.push('    /m 1 g sub k sub 1 k sub div def');
            prolog.push('    /y 1 b sub k sub 1 k sub div def');
            prolog.push('    c m y k setcmykcolor');
            prolog.push('  } ifelse');
            prolog.push('} def');
            prolog.push('');
        }
        
        // Line cap and join
        prolog.push('% Set line properties');
        prolog.push('/setlinecap { 1 setlinecap } def');
        prolog.push('/setlinejoin { 1 setlinejoin } def');
        prolog.push('');
        
        // Arrow drawing function
        prolog.push('% Draw arrow');
        prolog.push('/arrow {');
        prolog.push('  /arrowsize exch def');
        prolog.push('  /y2 exch def /x2 exch def');
        prolog.push('  /y1 exch def /x1 exch def');
        prolog.push('  newpath');
        prolog.push('  x1 y1 moveto');
        prolog.push('  x2 y2 lineto');
        prolog.push('  stroke');
        prolog.push('  gsave');
        prolog.push('  x2 y2 translate');
        prolog.push('  y2 y1 sub x2 x1 sub atan rotate');
        prolog.push('  newpath');
        prolog.push('  0 0 moveto');
        prolog.push('  arrowsize neg arrowsize 2 div lineto');
        prolog.push('  arrowsize neg arrowsize 2 div neg lineto');
        prolog.push('  closepath fill');
        prolog.push('  grestore');
        prolog.push('} def');
        prolog.push('');
        
        return prolog.join('\n');
    }

    /**
     * 渲染组件
     */
    _renderComponent(comp, width, height) {
        const ps = [];
        const x = comp.pos.x / width;
        const y = 1 - (comp.pos.y / height);  // Flip Y axis
        const angle = -(comp.angle || 0) * 180 / Math.PI;  // Convert to degrees
        
        ps.push('gsave');
        ps.push(`${x} ${y} translate`);
        ps.push(`${angle} rotate`);
        
        // Set color
        const color = this._parseColor(comp.color || '#4488ff');
        ps.push(`${color.r} ${color.g} ${color.b} setrgbcolor`);
        
        // Set line width
        const lineWidth = (comp.lineWidth || 2) / width;
        ps.push(`${lineWidth} setlinewidth`);
        
        // Draw component shape (simplified)
        const size = 0.03;  // Normalized size
        ps.push('newpath');
        ps.push(`${-size} ${-size} moveto`);
        ps.push(`${size} ${-size} lineto`);
        ps.push(`${size} ${size} lineto`);
        ps.push(`${-size} ${size} lineto`);
        ps.push('closepath');
        
        if (comp.filled) {
            ps.push('fill');
        } else {
            ps.push('stroke');
        }
        
        ps.push('grestore');
        ps.push('');
        
        return ps.join('\n');
    }

    /**
     * 渲染光线
     */
    _renderRay(ray, width, height) {
        if (!ray.pathPoints || ray.pathPoints.length < 2) return '';
        
        const ps = [];
        
        // Set color
        const color = this._parseColor(ray.color || '#ff0000');
        ps.push(`${color.r} ${color.g} ${color.b} setrgbcolor`);
        
        // Set line width
        const lineWidth = (ray.lineWidth || 2) / width;
        ps.push(`${lineWidth} setlinewidth`);
        
        // Set line style
        if (ray.lineStyle === 'dashed') {
            ps.push('[0.01 0.005] 0 setdash');
        } else if (ray.lineStyle === 'dotted') {
            ps.push('[0.002 0.003] 0 setdash');
        }
        
        // Draw path
        ps.push('newpath');
        const firstPoint = ray.pathPoints[0];
        ps.push(`${firstPoint.x / width} ${1 - firstPoint.y / height} moveto`);
        
        for (let i = 1; i < ray.pathPoints.length; i++) {
            const point = ray.pathPoints[i];
            ps.push(`${point.x / width} ${1 - point.y / height} lineto`);
        }
        
        ps.push('stroke');
        
        // Reset dash
        if (ray.lineStyle === 'dashed' || ray.lineStyle === 'dotted') {
            ps.push('[] 0 setdash');
        }
        
        ps.push('');
        
        return ps.join('\n');
    }

    /**
     * 渲染注释
     */
    _renderAnnotation(annotation, width, height) {
        const ps = [];
        
        if (!annotation.text) return '';
        
        const x = (annotation.pos?.x || annotation.position?.x || 0) / width;
        const y = 1 - ((annotation.pos?.y || annotation.position?.y || 0) / height);
        
        ps.push('gsave');
        
        // Set font
        const fontSize = (annotation.fontSize || 12) / height;
        ps.push(`/Helvetica findfont ${fontSize} scalefont setfont`);
        
        // Set color
        const color = this._parseColor(annotation.color || '#000000');
        ps.push(`${color.r} ${color.g} ${color.b} setrgbcolor`);
        
        // Draw text
        ps.push(`${x} ${y} moveto`);
        ps.push(`(${this._escapeString(annotation.text)}) show`);
        
        ps.push('grestore');
        ps.push('');
        
        return ps.join('\n');
    }

    /**
     * 解析颜色
     */
    _parseColor(colorStr) {
        // Parse hex color
        let hex = colorStr.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        
        return { r, g, b };
    }

    /**
     * 转换为CMYK
     */
    _rgbToCMYK(r, g, b) {
        const k = 1 - Math.max(r, g, b);
        
        if (k === 1) {
            return { c: 0, m: 0, y: 0, k: 1 };
        }
        
        const c = (1 - r - k) / (1 - k);
        const m = (1 - g - k) / (1 - k);
        const y = (1 - b - k) / (1 - k);
        
        return { c, m, y, k };
    }

    /**
     * 转义字符串
     */
    _escapeString(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * 计算边界框
     */
    calculateBoundingBox(scene) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        // Check components
        if (scene.components) {
            scene.components.forEach(comp => {
                const x = comp.pos.x;
                const y = comp.pos.y;
                const size = 30;  // Approximate component size
                
                minX = Math.min(minX, x - size);
                maxX = Math.max(maxX, x + size);
                minY = Math.min(minY, y - size);
                maxY = Math.max(maxY, y + size);
            });
        }
        
        // Check rays
        if (scene.rays) {
            scene.rays.forEach(ray => {
                if (ray.pathPoints) {
                    ray.pathPoints.forEach(point => {
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minY = Math.min(minY, point.y);
                        maxY = Math.max(maxY, point.y);
                    });
                }
            });
        }
        
        // Add margin
        const margin = 50;
        return {
            minX: minX - margin,
            minY: minY - margin,
            maxX: maxX + margin,
            maxY: maxY + margin,
            width: maxX - minX + 2 * margin,
            height: maxY - minY + 2 * margin
        };
    }

    /**
     * 导出为Blob
     */
    exportAsBlob(scene, width, height) {
        const epsContent = this.export(scene, width, height);
        return new Blob([epsContent], { type: 'application/postscript' });
    }

    /**
     * 下载EPS文件
     */
    download(scene, width, height, filename = 'diagram.eps') {
        const blob = this.exportAsBlob(scene, width, height);
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }
}

// ========== 单例模式 ==========
let exporterInstance = null;

export function getEPSExporter(options) {
    if (!exporterInstance) {
        exporterInstance = new EPSExporter(options);
    }
    return exporterInstance;
}

export function resetEPSExporter() {
    exporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.EPSExporter = EPSExporter;
    window.getEPSExporter = getEPSExporter;
}
