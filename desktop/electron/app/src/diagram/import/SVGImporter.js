/**
 * SVGImporter.js - SVG文件导入器
 * 
 * 支持导入SVG文件并转换为可编辑的图表组件
 * 
 * 功能：
 * - 解析SVG元素
 * - 识别光学组件
 * - 提取文本和标注
 * - 保留样式和布局
 * - 错误处理
 */

export class SVGImporter {
    constructor(options = {}) {
        this.diagnosticSystem = options.diagnosticSystem;
        this.iconManager = options.iconManager;
        
        // 配置
        this.config = {
            recognizeComponents: options.recognizeComponents !== false,
            preserveStyles: options.preserveStyles !== false,
            extractAnnotations: options.extractAnnotations !== false,
            scaleFactor: options.scaleFactor || 1.0
        };
        
        // 组件识别规则
        this.componentPatterns = this._initializeComponentPatterns();
    }

    /**
     * 导入SVG文件
     * @param {File|string} input - SVG文件或SVG字符串
     * @returns {Promise<Object>} 导入结果
     */
    async importSVG(input) {
        try {
            // 读取SVG内容
            const svgContent = await this._readInput(input);
            
            // 解析SVG
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            
            // 检查解析错误
            const parseError = svgDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('Invalid SVG file: ' + parseError.textContent);
            }
            
            const svgElement = svgDoc.querySelector('svg');
            if (!svgElement) {
                throw new Error('No SVG element found');
            }
            
            // 提取信息
            const result = {
                components: [],
                annotations: [],
                connections: [],
                metadata: this._extractMetadata(svgElement),
                styles: {},
                success: true
            };
            
            // 解析SVG元素
            this._parseSVGElements(svgElement, result);
            
            // 识别组件
            if (this.config.recognizeComponents) {
                this._recognizeComponents(result);
            }
            
            // 提取标注
            if (this.config.extractAnnotations) {
                this._extractAnnotations(result);
            }
            
            // 提取样式
            if (this.config.preserveStyles) {
                this._extractStyles(svgElement, result);
            }
            
            this.diagnosticSystem?.log('info', 
                `SVG imported: ${result.components.length} components, ${result.annotations.length} annotations`);
            
            return result;
            
        } catch (error) {
            this.diagnosticSystem?.log('error', `SVG import failed: ${error.message}`);
            
            return {
                components: [],
                annotations: [],
                connections: [],
                metadata: {},
                styles: {},
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 读取输入
     * @private
     */
    async _readInput(input) {
        if (typeof input === 'string') {
            return input;
        }
        
        if (input instanceof File) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Failed to read file'));
                reader.readAsText(input);
            });
        }
        
        throw new Error('Invalid input type');
    }

    /**
     * 提取元数据
     * @private
     */
    _extractMetadata(svgElement) {
        const viewBox = svgElement.getAttribute('viewBox');
        const width = svgElement.getAttribute('width');
        const height = svgElement.getAttribute('height');
        
        let bounds = { x: 0, y: 0, width: 800, height: 600 };
        
        if (viewBox) {
            const parts = viewBox.split(/\s+|,/).map(Number);
            if (parts.length === 4) {
                bounds = {
                    x: parts[0],
                    y: parts[1],
                    width: parts[2],
                    height: parts[3]
                };
            }
        } else if (width && height) {
            bounds.width = parseFloat(width);
            bounds.height = parseFloat(height);
        }
        
        return {
            bounds,
            title: svgElement.querySelector('title')?.textContent || 'Imported Diagram',
            description: svgElement.querySelector('desc')?.textContent || ''
        };
    }

    /**
     * 解析SVG元素
     * @private
     */
    _parseSVGElements(svgElement, result) {
        const elements = svgElement.querySelectorAll('*');
        
        for (const element of elements) {
            const tagName = element.tagName.toLowerCase();
            
            switch (tagName) {
                case 'rect':
                    this._parseRect(element, result);
                    break;
                case 'circle':
                    this._parseCircle(element, result);
                    break;
                case 'ellipse':
                    this._parseEllipse(element, result);
                    break;
                case 'line':
                    this._parseLine(element, result);
                    break;
                case 'polyline':
                case 'polygon':
                    this._parsePolyline(element, result);
                    break;
                case 'path':
                    this._parsePath(element, result);
                    break;
                case 'text':
                    this._parseText(element, result);
                    break;
                case 'g':
                    this._parseGroup(element, result);
                    break;
                case 'image':
                    this._parseImage(element, result);
                    break;
            }
        }
    }

    /**
     * 解析矩形
     * @private
     */
    _parseRect(element, result) {
        const x = parseFloat(element.getAttribute('x') || 0);
        const y = parseFloat(element.getAttribute('y') || 0);
        const width = parseFloat(element.getAttribute('width') || 0);
        const height = parseFloat(element.getAttribute('height') || 0);
        
        result.components.push({
            type: 'rectangle',
            x: x * this.config.scaleFactor,
            y: y * this.config.scaleFactor,
            width: width * this.config.scaleFactor,
            height: height * this.config.scaleFactor,
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析圆形
     * @private
     */
    _parseCircle(element, result) {
        const cx = parseFloat(element.getAttribute('cx') || 0);
        const cy = parseFloat(element.getAttribute('cy') || 0);
        const r = parseFloat(element.getAttribute('r') || 0);
        
        result.components.push({
            type: 'circle',
            x: (cx - r) * this.config.scaleFactor,
            y: (cy - r) * this.config.scaleFactor,
            width: r * 2 * this.config.scaleFactor,
            height: r * 2 * this.config.scaleFactor,
            radius: r * this.config.scaleFactor,
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析椭圆
     * @private
     */
    _parseEllipse(element, result) {
        const cx = parseFloat(element.getAttribute('cx') || 0);
        const cy = parseFloat(element.getAttribute('cy') || 0);
        const rx = parseFloat(element.getAttribute('rx') || 0);
        const ry = parseFloat(element.getAttribute('ry') || 0);
        
        result.components.push({
            type: 'ellipse',
            x: (cx - rx) * this.config.scaleFactor,
            y: (cy - ry) * this.config.scaleFactor,
            width: rx * 2 * this.config.scaleFactor,
            height: ry * 2 * this.config.scaleFactor,
            radiusX: rx * this.config.scaleFactor,
            radiusY: ry * this.config.scaleFactor,
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析线条
     * @private
     */
    _parseLine(element, result) {
        const x1 = parseFloat(element.getAttribute('x1') || 0);
        const y1 = parseFloat(element.getAttribute('y1') || 0);
        const x2 = parseFloat(element.getAttribute('x2') || 0);
        const y2 = parseFloat(element.getAttribute('y2') || 0);
        
        result.connections.push({
            type: 'line',
            start: { 
                x: x1 * this.config.scaleFactor, 
                y: y1 * this.config.scaleFactor 
            },
            end: { 
                x: x2 * this.config.scaleFactor, 
                y: y2 * this.config.scaleFactor 
            },
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析折线
     * @private
     */
    _parsePolyline(element, result) {
        const points = element.getAttribute('points');
        if (!points) return;
        
        const coords = points.trim().split(/\s+|,/).map(Number);
        const path = [];
        
        for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
                path.push({
                    x: coords[i] * this.config.scaleFactor,
                    y: coords[i + 1] * this.config.scaleFactor
                });
            }
        }
        
        result.connections.push({
            type: element.tagName.toLowerCase(),
            path,
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析路径
     * @private
     */
    _parsePath(element, result) {
        const d = element.getAttribute('d');
        if (!d) return;
        
        // 简化路径解析 - 只提取M和L命令
        const commands = d.match(/[MLHVCSQTAZmlhvcsqtaz][^MLHVCSQTAZmlhvcsqtaz]*/g) || [];
        const path = [];
        
        let currentX = 0, currentY = 0;
        
        for (const cmd of commands) {
            const type = cmd[0];
            const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
            
            if (type === 'M' || type === 'm') {
                currentX = type === 'M' ? coords[0] : currentX + coords[0];
                currentY = type === 'M' ? coords[1] : currentY + coords[1];
                path.push({
                    x: currentX * this.config.scaleFactor,
                    y: currentY * this.config.scaleFactor
                });
            } else if (type === 'L' || type === 'l') {
                currentX = type === 'L' ? coords[0] : currentX + coords[0];
                currentY = type === 'L' ? coords[1] : currentY + coords[1];
                path.push({
                    x: currentX * this.config.scaleFactor,
                    y: currentY * this.config.scaleFactor
                });
            }
        }
        
        if (path.length > 0) {
            result.connections.push({
                type: 'path',
                path,
                pathData: d,
                style: this._extractElementStyle(element),
                id: element.getAttribute('id') || this._generateId()
            });
        }
    }

    /**
     * 解析文本
     * @private
     */
    _parseText(element, result) {
        const x = parseFloat(element.getAttribute('x') || 0);
        const y = parseFloat(element.getAttribute('y') || 0);
        const text = element.textContent || '';
        
        result.annotations.push({
            type: 'text',
            text,
            position: {
                x: x * this.config.scaleFactor,
                y: y * this.config.scaleFactor
            },
            style: this._extractElementStyle(element),
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 解析组
     * @private
     */
    _parseGroup(element, result) {
        // 组可能代表一个复合组件
        const id = element.getAttribute('id') || this._generateId();
        const transform = element.getAttribute('transform');
        
        // 递归解析组内元素
        // 这里简化处理，实际应该创建组对象
    }

    /**
     * 解析图像
     * @private
     */
    _parseImage(element, result) {
        const x = parseFloat(element.getAttribute('x') || 0);
        const y = parseFloat(element.getAttribute('y') || 0);
        const width = parseFloat(element.getAttribute('width') || 0);
        const height = parseFloat(element.getAttribute('height') || 0);
        const href = element.getAttribute('href') || element.getAttribute('xlink:href');
        
        result.components.push({
            type: 'image',
            x: x * this.config.scaleFactor,
            y: y * this.config.scaleFactor,
            width: width * this.config.scaleFactor,
            height: height * this.config.scaleFactor,
            src: href,
            id: element.getAttribute('id') || this._generateId()
        });
    }

    /**
     * 提取元素样式
     * @private
     */
    _extractElementStyle(element) {
        const style = {};
        
        // 内联样式
        const styleAttr = element.getAttribute('style');
        if (styleAttr) {
            styleAttr.split(';').forEach(rule => {
                const [key, value] = rule.split(':').map(s => s.trim());
                if (key && value) {
                    style[key] = value;
                }
            });
        }
        
        // 属性样式
        const attrs = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity'];
        attrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value) {
                style[attr] = value;
            }
        });
        
        return style;
    }

    /**
     * 识别组件
     * @private
     */
    _recognizeComponents(result) {
        // 基于形状和样式识别光学组件
        for (const component of result.components) {
            const recognized = this._matchComponentPattern(component);
            if (recognized) {
                component.recognizedType = recognized.type;
                component.confidence = recognized.confidence;
            }
        }
    }

    /**
     * 匹配组件模式
     * @private
     */
    _matchComponentPattern(component) {
        for (const pattern of this.componentPatterns) {
            if (pattern.match(component)) {
                return {
                    type: pattern.type,
                    confidence: pattern.confidence
                };
            }
        }
        return null;
    }

    /**
     * 初始化组件识别模式
     * @private
     */
    _initializeComponentPatterns() {
        return [
            {
                type: 'lens',
                match: (comp) => {
                    return comp.type === 'ellipse' && 
                           Math.abs(comp.radiusX - comp.radiusY) < 5;
                },
                confidence: 0.7
            },
            {
                type: 'mirror',
                match: (comp) => {
                    return comp.type === 'line' && 
                           comp.style && 
                           comp.style['stroke-width'] > 2;
                },
                confidence: 0.6
            },
            {
                type: 'detector',
                match: (comp) => {
                    return comp.type === 'rectangle' && 
                           comp.width < 30 && 
                           comp.height < 30;
                },
                confidence: 0.5
            }
        ];
    }

    /**
     * 提取标注
     * @private
     */
    _extractAnnotations(result) {
        // 已在_parseText中处理
    }

    /**
     * 提取样式
     * @private
     */
    _extractStyles(svgElement, result) {
        const styleElements = svgElement.querySelectorAll('style');
        
        for (const styleEl of styleElements) {
            const css = styleEl.textContent;
            result.styles.css = (result.styles.css || '') + css;
        }
    }

    /**
     * 生成ID
     * @private
     */
    _generateId() {
        return 'imported_' + Math.random().toString(36).slice(2, 11);
    }

    /**
     * 导出为JSON
     * @param {Object} result - 导入结果
     * @returns {string}
     */
    exportToJSON(result) {
        return JSON.stringify(result, null, 2);
    }
}

// ========== 单例模式 ==========
let svgImporterInstance = null;

export function getSVGImporter(options) {
    if (!svgImporterInstance) {
        svgImporterInstance = new SVGImporter(options);
    }
    return svgImporterInstance;
}

export function resetSVGImporter() {
    svgImporterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.SVGImporter = SVGImporter;
    window.getSVGImporter = getSVGImporter;
}
