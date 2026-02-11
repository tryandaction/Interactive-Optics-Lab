/**
 * ImageImporter.js - 图像文件导入器
 * 
 * 支持导入图像文件作为背景或组件
 * 
 * 功能：
 * - 支持PNG, JPEG, GIF, WebP格式
 * - 图像预览和尺寸调整
 * - 作为背景或组件导入
 * - 可选图像追踪（简单边缘检测）
 */

export class ImageImporter {
    constructor(options = {}) {
        this.diagnosticSystem = options.diagnosticSystem;
        
        // 配置
        this.config = {
            maxWidth: options.maxWidth || 2000,
            maxHeight: options.maxHeight || 2000,
            quality: options.quality || 0.9,
            supportedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        };
    }

    /**
     * 导入图像文件
     * @param {File} file - 图像文件
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 导入结果
     */
    async importImage(file, options = {}) {
        try {
            // 验证文件类型
            if (!this._isValidFormat(file.type)) {
                throw new Error(`Unsupported format: ${file.type}`);
            }
            
            // 读取图像
            const imageData = await this._loadImage(file);
            
            // 调整尺寸
            const resized = await this._resizeImage(imageData, options);
            
            // 创建结果
            const result = {
                type: options.asBackground ? 'background' : 'image',
                data: resized.dataURL,
                width: resized.width,
                height: resized.height,
                originalWidth: imageData.width,
                originalHeight: imageData.height,
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type,
                success: true
            };
            
            // 可选：边缘检测
            if (options.detectEdges) {
                result.edges = await this._detectEdges(resized.canvas);
            }
            
            this.diagnosticSystem?.log('info', 
                `Image imported: ${file.name} (${resized.width}x${resized.height})`);
            
            return result;
            
        } catch (error) {
            this.diagnosticSystem?.log('error', `Image import failed: ${error.message}`);
            
            return {
                type: 'error',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 验证文件格式
     * @private
     */
    _isValidFormat(mimeType) {
        return this.config.supportedFormats.includes(mimeType);
    }

    /**
     * 加载图像
     * @private
     */
    async _loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    resolve({
                        image: img,
                        width: img.width,
                        height: img.height,
                        dataURL: e.target.result
                    });
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * 调整图像尺寸
     * @private
     */
    async _resizeImage(imageData, options) {
        const { image, width, height } = imageData;
        
        // 计算目标尺寸
        let targetWidth = options.width || width;
        let targetHeight = options.height || height;
        
        // 限制最大尺寸
        if (targetWidth > this.config.maxWidth || targetHeight > this.config.maxHeight) {
            const ratio = Math.min(
                this.config.maxWidth / targetWidth,
                this.config.maxHeight / targetHeight
            );
            targetWidth = Math.floor(targetWidth * ratio);
            targetHeight = Math.floor(targetHeight * ratio);
        }
        
        // 保持宽高比
        if (options.maintainAspectRatio !== false) {
            const ratio = Math.min(
                targetWidth / width,
                targetHeight / height
            );
            targetWidth = Math.floor(width * ratio);
            targetHeight = Math.floor(height * ratio);
        }
        
        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        
        // 绘制图像
        ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
        
        // 转换为DataURL
        const dataURL = canvas.toDataURL('image/png', this.config.quality);
        
        return {
            canvas,
            width: targetWidth,
            height: targetHeight,
            dataURL
        };
    }

    /**
     * 边缘检测（简单Sobel算子）
     * @private
     */
    async _detectEdges(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const edges = [];
        const threshold = 50;
        
        // 简化的边缘检测 - 只检测强边缘
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                
                // 计算梯度
                const gx = Math.abs(
                    data[idx - 4] - data[idx + 4]
                );
                const gy = Math.abs(
                    data[idx - canvas.width * 4] - data[idx + canvas.width * 4]
                );
                
                const gradient = Math.sqrt(gx * gx + gy * gy);
                
                if (gradient > threshold) {
                    edges.push({ x, y, strength: gradient });
                }
            }
        }
        
        return edges;
    }

    /**
     * 批量导入图像
     * @param {FileList} files - 图像文件列表
     * @param {Object} options - 导入选项
     * @returns {Promise<Array>} 导入结果数组
     */
    async importMultiple(files, options = {}) {
        const results = [];
        
        for (const file of files) {
            const result = await this.importImage(file, options);
            results.push(result);
        }
        
        return results;
    }

    /**
     * 从URL导入图像
     * @param {string} url - 图像URL
     * @param {Object} options - 导入选项
     * @returns {Promise<Object>} 导入结果
     */
    async importFromURL(url, options = {}) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], 'image.png', { type: blob.type });
            
            return await this.importImage(file, options);
            
        } catch (error) {
            this.diagnosticSystem?.log('error', `URL import failed: ${error.message}`);
            
            return {
                type: 'error',
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取支持的格式
     * @returns {Array}
     */
    getSupportedFormats() {
        return [...this.config.supportedFormats];
    }
}

// ========== 单例模式 ==========
let imageImporterInstance = null;

export function getImageImporter(options) {
    if (!imageImporterInstance) {
        imageImporterInstance = new ImageImporter(options);
    }
    return imageImporterInstance;
}

export function resetImageImporter() {
    imageImporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ImageImporter = ImageImporter;
    window.getImageImporter = getImageImporter;
}
