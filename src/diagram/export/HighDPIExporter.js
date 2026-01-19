/**
 * HighDPIExporter.js - 高DPI导出优化器
 * Optimizes exports for high-resolution displays and print
 * 
 * Requirements: 6.2, 6.6
 */

/**
 * 高DPI导出器类
 */
export class HighDPIExporter {
    constructor(options = {}) {
        this.options = {
            targetDPI: options.targetDPI || 300,
            antialiasing: options.antialiasing !== false,
            smoothing: options.smoothing !== false,
            quality: options.quality || 0.95,
            ...options
        };
    }

    /**
     * 创建高DPI Canvas
     */
    createHighDPICanvas(width, height, dpi = this.options.targetDPI) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate scale factor
        const scaleFactor = dpi / 96;  // 96 DPI is standard screen resolution
        
        // Set canvas size
        canvas.width = width * scaleFactor;
        canvas.height = height * scaleFactor;
        
        // Set display size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        // Scale context
        ctx.scale(scaleFactor, scaleFactor);
        
        // Enable anti-aliasing
        if (this.options.antialiasing) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        }
        
        return { canvas, ctx, scaleFactor };
    }

    /**
     * 渲染场景到高DPI Canvas
     */
    renderScene(scene, width, height, renderCallback) {
        const { canvas, ctx, scaleFactor } = this.createHighDPICanvas(width, height);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set background
        if (scene.backgroundColor) {
            ctx.fillStyle = scene.backgroundColor;
            ctx.fillRect(0, 0, width, height);
        }
        
        // Call render callback
        if (renderCallback) {
            renderCallback(ctx, width, height, scaleFactor);
        } else {
            this._defaultRender(ctx, scene, width, height);
        }
        
        return canvas;
    }

    /**
     * 默认渲染
     */
    _defaultRender(ctx, scene, width, height) {
        // Render components
        if (scene.components) {
            scene.components.forEach(comp => {
                this._renderComponent(ctx, comp);
            });
        }
        
        // Render rays
        if (scene.rays) {
            scene.rays.forEach(ray => {
                this._renderRay(ctx, ray);
            });
        }
        
        // Render annotations
        if (scene.annotations) {
            scene.annotations.forEach(annotation => {
                this._renderAnnotation(ctx, annotation);
            });
        }
    }

    /**
     * 渲染组件
     */
    _renderComponent(ctx, comp) {
        ctx.save();
        
        ctx.translate(comp.pos.x, comp.pos.y);
        ctx.rotate(comp.angle || 0);
        
        // Set style
        ctx.strokeStyle = comp.color || '#4488ff';
        ctx.fillStyle = comp.fillColor || comp.color || '#4488ff';
        ctx.lineWidth = comp.lineWidth || 2;
        
        // Draw shape (simplified)
        const size = 30;
        ctx.beginPath();
        ctx.rect(-size/2, -size/2, size, size);
        
        if (comp.filled) {
            ctx.fill();
        }
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * 渲染光线
     */
    _renderRay(ctx, ray) {
        if (!ray.pathPoints || ray.pathPoints.length < 2) return;
        
        ctx.save();
        
        ctx.strokeStyle = ray.color || '#ff0000';
        ctx.lineWidth = ray.lineWidth || 2;
        
        // Set line style
        if (ray.lineStyle === 'dashed') {
            ctx.setLineDash([10, 5]);
        } else if (ray.lineStyle === 'dotted') {
            ctx.setLineDash([2, 3]);
        }
        
        ctx.beginPath();
        ctx.moveTo(ray.pathPoints[0].x, ray.pathPoints[0].y);
        
        for (let i = 1; i < ray.pathPoints.length; i++) {
            ctx.lineTo(ray.pathPoints[i].x, ray.pathPoints[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    /**
     * 渲染注释
     */
    _renderAnnotation(ctx, annotation) {
        if (!annotation.text) return;
        
        ctx.save();
        
        const x = annotation.pos?.x || annotation.position?.x || 0;
        const y = annotation.pos?.y || annotation.position?.y || 0;
        
        ctx.font = `${annotation.fontSize || 14}px ${annotation.fontFamily || 'Arial'}`;
        ctx.fillStyle = annotation.color || '#000000';
        ctx.textAlign = annotation.align || 'left';
        ctx.textBaseline = annotation.baseline || 'top';
        
        ctx.fillText(annotation.text, x, y);
        
        ctx.restore();
    }

    /**
     * 导出为PNG (高DPI)
     */
    exportToPNG(scene, width, height, renderCallback) {
        const canvas = this.renderScene(scene, width, height, renderCallback);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/png',
                this.options.quality
            );
        });
    }

    /**
     * 导出为JPEG (高DPI)
     */
    exportToJPEG(scene, width, height, renderCallback) {
        const canvas = this.renderScene(scene, width, height, renderCallback);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                'image/jpeg',
                this.options.quality
            );
        });
    }

    /**
     * 导出为Data URL
     */
    exportToDataURL(scene, width, height, format = 'png', renderCallback) {
        const canvas = this.renderScene(scene, width, height, renderCallback);
        
        if (format === 'jpeg' || format === 'jpg') {
            return canvas.toDataURL('image/jpeg', this.options.quality);
        } else {
            return canvas.toDataURL('image/png');
        }
    }

    /**
     * 下载图像
     */
    async download(scene, width, height, filename, format = 'png', renderCallback) {
        let blob;
        
        if (format === 'jpeg' || format === 'jpg') {
            blob = await this.exportToJPEG(scene, width, height, renderCallback);
            filename = filename.replace(/\.[^.]+$/, '.jpg');
        } else {
            blob = await this.exportToPNG(scene, width, height, renderCallback);
            filename = filename.replace(/\.[^.]+$/, '.png');
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * 批量导出多个分辨率
     */
    async exportMultipleResolutions(scene, baseWidth, baseHeight, resolutions, renderCallback) {
        const results = [];
        
        for (const res of resolutions) {
            const width = baseWidth * res.scale;
            const height = baseHeight * res.scale;
            const dpi = res.dpi || this.options.targetDPI;
            
            // Temporarily change DPI
            const originalDPI = this.options.targetDPI;
            this.options.targetDPI = dpi;
            
            const blob = await this.exportToPNG(scene, width, height, renderCallback);
            
            results.push({
                name: res.name,
                width: width,
                height: height,
                dpi: dpi,
                blob: blob
            });
            
            // Restore DPI
            this.options.targetDPI = originalDPI;
        }
        
        return results;
    }

    /**
     * 优化图像质量
     */
    optimizeQuality(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Apply sharpening filter (simple implementation)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sharpen kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        const tempData = new Uint8ClampedArray(data);
        const width = canvas.width;
        const height = canvas.height;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {  // RGB channels
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            sum += tempData[idx] * kernel[kernelIdx];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = Math.max(0, Math.min(255, sum));
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        return canvas;
    }

    /**
     * 获取导出信息
     */
    getExportInfo(width, height) {
        const scaleFactor = this.options.targetDPI / 96;
        const actualWidth = width * scaleFactor;
        const actualHeight = height * scaleFactor;
        
        return {
            displayWidth: width,
            displayHeight: height,
            actualWidth: actualWidth,
            actualHeight: actualHeight,
            dpi: this.options.targetDPI,
            scaleFactor: scaleFactor,
            megapixels: (actualWidth * actualHeight / 1000000).toFixed(2),
            fileSize: this._estimateFileSize(actualWidth, actualHeight)
        };
    }

    /**
     * 估算文件大小
     */
    _estimateFileSize(width, height) {
        // Rough estimate: PNG is about 3-4 bytes per pixel with compression
        const bytes = width * height * 3.5;
        
        if (bytes < 1024) {
            return bytes.toFixed(0) + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    }
}

// ========== 预设配置 ==========
export const DPI_PRESETS = {
    SCREEN: { dpi: 96, name: 'Screen (96 DPI)' },
    PRINT_DRAFT: { dpi: 150, name: 'Print Draft (150 DPI)' },
    PRINT_STANDARD: { dpi: 300, name: 'Print Standard (300 DPI)' },
    PRINT_HIGH: { dpi: 600, name: 'Print High Quality (600 DPI)' },
    PUBLICATION: { dpi: 300, name: 'Publication (300 DPI)' },
    POSTER: { dpi: 150, name: 'Poster (150 DPI)' }
};

// ========== 单例模式 ==========
let exporterInstance = null;

export function getHighDPIExporter(options) {
    if (!exporterInstance) {
        exporterInstance = new HighDPIExporter(options);
    }
    return exporterInstance;
}

export function resetHighDPIExporter() {
    exporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.HighDPIExporter = HighDPIExporter;
    window.getHighDPIExporter = getHighDPIExporter;
    window.DPI_PRESETS = DPI_PRESETS;
}
