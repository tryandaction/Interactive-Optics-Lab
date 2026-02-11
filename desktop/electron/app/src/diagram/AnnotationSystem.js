/**
 * AnnotationSystem.js - 标注系统
 * 管理专业绘图模式下的文本标注
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 4.9
 */

/**
 * 生成唯一ID
 */
function generateAnnotationId() {
    return 'ann_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Unicode上下标字符映射
 */
const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
    'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
    'v': 'ᵥ', 'x': 'ₓ', '+': '₊', '-': '₋', '=': '₌',
    '(': '₍', ')': '₎'
};

const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
    'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
    'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾'
};

/**
 * 标注样式配置
 * @typedef {Object} AnnotationStyle
 * @property {number} fontSize - 字体大小
 * @property {string} fontFamily - 字体族
 * @property {string} color - 文本颜色
 * @property {string} backgroundColor - 背景颜色
 * @property {number} padding - 内边距
 * @property {number} borderRadius - 圆角半径
 * @property {string} textAlign - 文本对齐
 * @property {boolean} bold - 是否粗体
 * @property {boolean} italic - 是否斜体
 */

/**
 * 标注类
 * 表示单个文本标注
 */
export class Annotation {
    /**
     * @param {Object} config - 标注配置
     */
    constructor(config = {}) {
        /** @type {string} 唯一标识 */
        this.id = config.id || generateAnnotationId();
        
        /** @type {string|null} 关联的元件ID */
        this.componentId = config.componentId || null;
        
        /** @type {string} 标注文本 */
        this.text = config.text || '';
        
        /** @type {{x: number, y: number}} 绝对位置 */
        this.position = config.position || { x: 0, y: 0 };
        
        /** @type {{x: number, y: number}} 相对元件的偏移 */
        this.offset = config.offset || { x: 20, y: -20 };
        
        /** @type {AnnotationStyle} 样式配置 */
        this.style = {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            backgroundColor: 'transparent',
            padding: 4,
            borderRadius: 2,
            textAlign: 'left',
            bold: false,
            italic: false,
            ...config.style
        };
        
        /** @type {boolean} 是否支持多行 */
        this.multiline = config.multiline || false;
        
        /** @type {boolean} 是否自动定位 */
        this.autoPosition = config.autoPosition !== false;
        
        /** @type {boolean} 是否可见 */
        this.visible = config.visible !== false;
        
        /** @type {boolean} 是否被选中 */
        this.selected = false;
        
        /** @type {number} 创建时间戳 */
        this.createdAt = config.createdAt || Date.now();
        
        /** @type {number} 更新时间戳 */
        this.updatedAt = config.updatedAt || Date.now();
    }

    /**
     * 更新标注文本
     * @param {string} text - 新文本
     */
    setText(text) {
        this.text = text;
        this.updatedAt = Date.now();
    }

    /**
     * 更新标注位置
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    setPosition(x, y) {
        this.position = { x, y };
        this.autoPosition = false;
        this.updatedAt = Date.now();
    }

    /**
     * 更新偏移量
     * @param {number} x - X偏移
     * @param {number} y - Y偏移
     */
    setOffset(x, y) {
        this.offset = { x, y };
        this.updatedAt = Date.now();
    }

    /**
     * 更新样式
     * @param {Partial<AnnotationStyle>} styleUpdate - 样式更新
     */
    updateStyle(styleUpdate) {
        this.style = { ...this.style, ...styleUpdate };
        this.updatedAt = Date.now();
    }

    /**
     * 计算实际渲染位置
     * @param {Object|null} component - 关联的元件
     * @returns {{x: number, y: number}}
     */
    calculatePosition(component) {
        if (!this.autoPosition || !component) {
            return this.position;
        }
        
        const compPos = component.pos || component.position || { x: 0, y: 0 };
        return {
            x: compPos.x + this.offset.x,
            y: compPos.y + this.offset.y
        };
    }

    /**
     * 解析格式化文本（支持上下标）
     * 格式：AOM_1 表示下标，f^2 表示上标
     * @param {string} text - 原始文本
     * @returns {{segments: Array, plain: string}}
     */
    parseFormattedText(text) {
        const segments = [];
        let currentText = '';
        let i = 0;
        
        while (i < text.length) {
            const char = text[i];
            
            // 处理下标语法 _x 或 _{xxx}
            if (char === '_' && i + 1 < text.length) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                
                if (text[i + 1] === '{') {
                    // 花括号包围的下标 _{xxx}
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        segments.push({ text: text.substring(i + 2, endBrace), type: 'subscript' });
                        i = endBrace + 1;
                    } else {
                        currentText += char;
                        i++;
                    }
                } else {
                    // 单字符下标 _x
                    segments.push({ text: text[i + 1], type: 'subscript' });
                    i += 2;
                }
            }
            // 处理上标语法 ^x 或 ^{xxx}
            else if (char === '^' && i + 1 < text.length) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                
                if (text[i + 1] === '{') {
                    // 花括号包围的上标 ^{xxx}
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        segments.push({ text: text.substring(i + 2, endBrace), type: 'superscript' });
                        i = endBrace + 1;
                    } else {
                        currentText += char;
                        i++;
                    }
                } else {
                    // 单字符上标 ^x
                    segments.push({ text: text[i + 1], type: 'superscript' });
                    i += 2;
                }
            }
            // 检查Unicode下标字符
            else if (this._isUnicodeSubscript(char)) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                segments.push({ text: char, type: 'subscript-unicode' });
                i++;
            }
            // 检查Unicode上标字符
            else if (this._isUnicodeSuperscript(char)) {
                if (currentText) {
                    segments.push({ text: currentText, type: 'normal' });
                    currentText = '';
                }
                segments.push({ text: char, type: 'superscript-unicode' });
                i++;
            }
            // 普通字符
            else {
                currentText += char;
                i++;
            }
        }
        
        if (currentText) {
            segments.push({ text: currentText, type: 'normal' });
        }
        
        // 生成纯文本版本
        const plain = segments.map(s => s.text).join('');
        
        return { segments, plain };
    }

    /**
     * 检查是否为Unicode下标字符
     * @private
     */
    _isUnicodeSubscript(char) {
        const code = char.charCodeAt(0);
        return (code >= 0x2080 && code <= 0x2089) || // ₀-₉
               (code >= 0x2090 && code <= 0x209C);   // ₐ-ₜ等
    }

    /**
     * 检查是否为Unicode上标字符
     * @private
     */
    _isUnicodeSuperscript(char) {
        const code = char.charCodeAt(0);
        return (code >= 0x2070 && code <= 0x207F) || // ⁰-⁹等
               code === 0x00B2 || code === 0x00B3 || // ² ³
               code === 0x00B9;                       // ¹
    }

    /**
     * 渲染标注到Canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object|null} component - 关联的元件
     */
    render(ctx, component = null) {
        if (!this.visible) return;
        
        const pos = this.calculatePosition(component);
        const formattedText = this.parseFormattedText(this.text);
        
        ctx.save();
        
        // 构建字体字符串
        let fontStyle = '';
        if (this.style.italic) fontStyle += 'italic ';
        if (this.style.bold) fontStyle += 'bold ';
        fontStyle += `${this.style.fontSize}px ${this.style.fontFamily}`;
        
        ctx.font = fontStyle;
        ctx.textBaseline = 'top';
        ctx.textAlign = this.style.textAlign;
        
        // 计算文本尺寸
        const metrics = this._measureFormattedText(ctx, formattedText);
        
        // 绘制背景
        if (this.style.backgroundColor !== 'transparent') {
            const bgX = pos.x - this.style.padding;
            const bgY = pos.y - this.style.padding;
            const bgWidth = metrics.width + this.style.padding * 2;
            const bgHeight = this.style.fontSize + this.style.padding * 2;
            
            ctx.fillStyle = this.style.backgroundColor;
            
            if (this.style.borderRadius > 0) {
                this._roundRect(ctx, bgX, bgY, bgWidth, bgHeight, this.style.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            }
        }
        
        // 绘制选中状态
        if (this.selected) {
            const selX = pos.x - this.style.padding - 2;
            const selY = pos.y - this.style.padding - 2;
            const selWidth = metrics.width + this.style.padding * 2 + 4;
            const selHeight = this.style.fontSize + this.style.padding * 2 + 4;
            
            ctx.strokeStyle = '#0078d4';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(selX, selY, selWidth, selHeight);
            ctx.setLineDash([]);
        }
        
        // 绘制文本
        ctx.fillStyle = this.style.color;
        this._renderFormattedText(ctx, formattedText, pos.x, pos.y);
        
        ctx.restore();
    }


    /**
     * 渲染格式化文本
     * @private
     */
    _renderFormattedText(ctx, formattedText, x, y) {
        let currentX = x;
        const baseSize = this.style.fontSize;
        const baseFontFamily = this.style.fontFamily;
        
        formattedText.segments.forEach(segment => {
            ctx.save();
            
            if (segment.type === 'subscript') {
                // 下标：缩小字体，下移位置
                ctx.font = `${baseSize * 0.7}px ${baseFontFamily}`;
                ctx.fillText(segment.text, currentX, y + baseSize * 0.4);
                currentX += ctx.measureText(segment.text).width;
            } else if (segment.type === 'superscript') {
                // 上标：缩小字体，上移位置
                ctx.font = `${baseSize * 0.7}px ${baseFontFamily}`;
                ctx.fillText(segment.text, currentX, y - baseSize * 0.2);
                currentX += ctx.measureText(segment.text).width;
            } else if (segment.type === 'subscript-unicode' || segment.type === 'superscript-unicode') {
                // Unicode上下标字符：直接渲染
                ctx.fillText(segment.text, currentX, y);
                currentX += ctx.measureText(segment.text).width;
            } else {
                // 普通文本
                ctx.fillText(segment.text, currentX, y);
                currentX += ctx.measureText(segment.text).width;
            }
            
            ctx.restore();
        });
    }

    /**
     * 测量格式化文本宽度
     * @private
     */
    _measureFormattedText(ctx, formattedText) {
        let totalWidth = 0;
        const baseSize = this.style.fontSize;
        const baseFontFamily = this.style.fontFamily;
        
        formattedText.segments.forEach(segment => {
            ctx.save();
            
            if (segment.type === 'subscript' || segment.type === 'superscript') {
                ctx.font = `${baseSize * 0.7}px ${baseFontFamily}`;
            }
            
            totalWidth += ctx.measureText(segment.text).width;
            ctx.restore();
        });
        
        return { width: totalWidth, height: baseSize };
    }

    /**
     * 绘制圆角矩形
     * @private
     */
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    /**
     * 检测点是否在标注区域内
     * @param {number} x - 点X坐标
     * @param {number} y - 点Y坐标
     * @param {Object|null} component - 关联的元件
     * @returns {boolean}
     */
    containsPoint(x, y, component = null) {
        const pos = this.calculatePosition(component);
        
        // 估算文本宽度（简化计算）
        const estimatedWidth = this.text.length * this.style.fontSize * 0.6;
        const height = this.style.fontSize;
        
        const left = pos.x - this.style.padding;
        const top = pos.y - this.style.padding;
        const right = left + estimatedWidth + this.style.padding * 2;
        const bottom = top + height + this.style.padding * 2;
        
        return x >= left && x <= right && y >= top && y <= bottom;
    }

    /**
     * 序列化标注
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            componentId: this.componentId,
            text: this.text,
            position: { ...this.position },
            offset: { ...this.offset },
            style: { ...this.style },
            multiline: this.multiline,
            autoPosition: this.autoPosition,
            visible: this.visible,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 从序列化数据创建标注
     * @param {Object} data - 序列化数据
     * @returns {Annotation}
     */
    static deserialize(data) {
        return new Annotation(data);
    }
}

/**
 * 标注管理器类
 * 管理所有标注的创建、删除、查询和渲染
 */
export class AnnotationManager {
    constructor() {
        /** @type {Map<string, Annotation>} 标注存储 */
        this.annotations = new Map();
        
        /** @type {Map<string, string[]>} 元件ID到标注ID的索引 */
        this.componentIndex = new Map();
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
    }

    /**
     * 添加标注
     * @param {Annotation|Object} annotation - 标注实例或配置
     * @returns {Annotation}
     */
    addAnnotation(annotation) {
        const ann = annotation instanceof Annotation 
            ? annotation 
            : new Annotation(annotation);
        
        this.annotations.set(ann.id, ann);
        
        // 更新元件索引
        if (ann.componentId) {
            if (!this.componentIndex.has(ann.componentId)) {
                this.componentIndex.set(ann.componentId, []);
            }
            this.componentIndex.get(ann.componentId).push(ann.id);
        }
        
        this._notifyChange('add', ann);
        return ann;
    }

    /**
     * 删除标注
     * @param {string} annotationId - 标注ID
     * @returns {boolean}
     */
    removeAnnotation(annotationId) {
        const ann = this.annotations.get(annotationId);
        if (!ann) return false;
        
        // 从元件索引中移除
        if (ann.componentId && this.componentIndex.has(ann.componentId)) {
            const ids = this.componentIndex.get(ann.componentId);
            const index = ids.indexOf(annotationId);
            if (index > -1) {
                ids.splice(index, 1);
            }
        }
        
        this.annotations.delete(annotationId);
        this._notifyChange('remove', ann);
        return true;
    }

    /**
     * 获取标注
     * @param {string} annotationId - 标注ID
     * @returns {Annotation|null}
     */
    getAnnotation(annotationId) {
        return this.annotations.get(annotationId) || null;
    }

    /**
     * 获取所有标注
     * @returns {Annotation[]}
     */
    getAllAnnotations() {
        return Array.from(this.annotations.values());
    }

    /**
     * 获取元件的所有标注
     * @param {string} componentId - 元件ID
     * @returns {Annotation[]}
     */
    getAnnotationsForComponent(componentId) {
        const ids = this.componentIndex.get(componentId) || [];
        return ids.map(id => this.annotations.get(id)).filter(Boolean);
    }

    /**
     * 更新标注
     * @param {string} annotationId - 标注ID
     * @param {Object} updates - 更新内容
     * @returns {Annotation|null}
     */
    updateAnnotation(annotationId, updates) {
        const ann = this.annotations.get(annotationId);
        if (!ann) return null;
        
        // 处理元件关联变更
        if (updates.componentId !== undefined && updates.componentId !== ann.componentId) {
            // 从旧元件索引中移除
            if (ann.componentId && this.componentIndex.has(ann.componentId)) {
                const ids = this.componentIndex.get(ann.componentId);
                const index = ids.indexOf(annotationId);
                if (index > -1) {
                    ids.splice(index, 1);
                }
            }
            
            // 添加到新元件索引
            if (updates.componentId) {
                if (!this.componentIndex.has(updates.componentId)) {
                    this.componentIndex.set(updates.componentId, []);
                }
                this.componentIndex.get(updates.componentId).push(annotationId);
            }
        }
        
        // 应用更新
        if (updates.text !== undefined) ann.setText(updates.text);
        if (updates.position !== undefined) ann.setPosition(updates.position.x, updates.position.y);
        if (updates.offset !== undefined) ann.setOffset(updates.offset.x, updates.offset.y);
        if (updates.style !== undefined) ann.updateStyle(updates.style);
        if (updates.visible !== undefined) ann.visible = updates.visible;
        if (updates.componentId !== undefined) ann.componentId = updates.componentId;
        
        ann.updatedAt = Date.now();
        this._notifyChange('update', ann);
        return ann;
    }

    /**
     * 清空所有标注
     */
    clear() {
        this.annotations.clear();
        this.componentIndex.clear();
        this._notifyChange('clear', null);
    }

    /**
     * 渲染所有标注
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Map|Object} componentsMap - 元件映射（ID -> 元件）
     */
    renderAll(ctx, componentsMap) {
        const components = componentsMap instanceof Map 
            ? componentsMap 
            : new Map(Object.entries(componentsMap || {}));
        
        this.annotations.forEach(ann => {
            const component = ann.componentId ? components.get(ann.componentId) : null;
            ann.render(ctx, component);
        });
    }

    /**
     * 检测重叠的标注
     * @param {Map|Object} componentsMap - 元件映射
     * @returns {Array<{ann1: Annotation, ann2: Annotation}>}
     */
    detectOverlaps(componentsMap) {
        const overlaps = [];
        const annotations = this.getAllAnnotations();
        const components = componentsMap instanceof Map 
            ? componentsMap 
            : new Map(Object.entries(componentsMap || {}));
        
        for (let i = 0; i < annotations.length; i++) {
            for (let j = i + 1; j < annotations.length; j++) {
                const ann1 = annotations[i];
                const ann2 = annotations[j];
                
                if (!ann1.visible || !ann2.visible) continue;
                
                const comp1 = ann1.componentId ? components.get(ann1.componentId) : null;
                const comp2 = ann2.componentId ? components.get(ann2.componentId) : null;
                
                if (this._checkOverlap(ann1, comp1, ann2, comp2)) {
                    overlaps.push({ ann1, ann2 });
                }
            }
        }
        
        return overlaps;
    }

    /**
     * 检查两个标注是否重叠
     * @private
     */
    _checkOverlap(ann1, comp1, ann2, comp2) {
        const pos1 = ann1.calculatePosition(comp1);
        const pos2 = ann2.calculatePosition(comp2);
        
        // 估算边界框
        const width1 = ann1.text.length * ann1.style.fontSize * 0.6 + ann1.style.padding * 2;
        const height1 = ann1.style.fontSize + ann1.style.padding * 2;
        const width2 = ann2.text.length * ann2.style.fontSize * 0.6 + ann2.style.padding * 2;
        const height2 = ann2.style.fontSize + ann2.style.padding * 2;
        
        // AABB碰撞检测
        return !(pos1.x + width1 < pos2.x ||
                 pos2.x + width2 < pos1.x ||
                 pos1.y + height1 < pos2.y ||
                 pos2.y + height2 < pos1.y);
    }

    /**
     * 在指定点查找标注
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Map|Object} componentsMap - 元件映射
     * @returns {Annotation|null}
     */
    findAnnotationAtPoint(x, y, componentsMap) {
        const components = componentsMap instanceof Map 
            ? componentsMap 
            : new Map(Object.entries(componentsMap || {}));
        
        // 反向遍历，优先选择后添加的（显示在上层的）
        const annotations = this.getAllAnnotations().reverse();
        
        for (const ann of annotations) {
            if (!ann.visible) continue;
            
            const component = ann.componentId ? components.get(ann.componentId) : null;
            if (ann.containsPoint(x, y, component)) {
                return ann;
            }
        }
        
        return null;
    }

    /**
     * 注册变更监听器
     * @param {Function} callback - 回调函数 (action, annotation) => void
     * @returns {Function} 取消注册函数
     */
    onChange(callback) {
        this.changeListeners.push(callback);
        return () => {
            const index = this.changeListeners.indexOf(callback);
            if (index > -1) {
                this.changeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知变更
     * @private
     */
    _notifyChange(action, annotation) {
        this.changeListeners.forEach(listener => {
            try {
                listener(action, annotation);
            } catch (error) {
                console.error('AnnotationManager: Error in change listener:', error);
            }
        });
    }

    /**
     * 序列化所有标注
     * @returns {Object[]}
     */
    serialize() {
        return this.getAllAnnotations().map(ann => ann.serialize());
    }

    /**
     * 从序列化数据恢复
     * @param {Object[]} data - 序列化数据数组
     */
    deserialize(data) {
        this.clear();
        
        if (Array.isArray(data)) {
            data.forEach(annData => {
                this.addAnnotation(Annotation.deserialize(annData));
            });
        }
    }
}

// 创建单例实例
let annotationManagerInstance = null;

/**
 * 获取AnnotationManager单例实例
 * @returns {AnnotationManager}
 */
export function getAnnotationManager() {
    if (!annotationManagerInstance) {
        annotationManagerInstance = new AnnotationManager();
    }
    return annotationManagerInstance;
}

/**
 * 重置AnnotationManager单例（主要用于测试）
 */
export function resetAnnotationManager() {
    annotationManagerInstance = null;
}

// 导出Unicode映射（供外部使用）
export { SUBSCRIPT_MAP, SUPERSCRIPT_MAP };

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Annotation = Annotation;
    window.AnnotationManager = AnnotationManager;
    window.getAnnotationManager = getAnnotationManager;
}
