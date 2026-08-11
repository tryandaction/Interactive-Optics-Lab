/**
 * ProfessionalLabelSystem.js - 专业标注系统
 * 支持颜色编码、数学符号、上下标和引线的专业标注
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

/**
 * 生成唯一ID
 */
function generateLabelId() {
    return 'label_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 标注颜色预设
 */
export const LABEL_COLOR_PRESETS = {
    AOM_PARAMETER: { color: '#cc0000', name: 'AOM参数', description: '红色 - 用于AOM频率、功率等参数' },
    COMPONENT_NAME: { color: '#000000', name: '元件名称', description: '黑色 - 用于元件标识' },
    NOTE: { color: '#0066cc', name: '注释', description: '蓝色 - 用于说明性注释' },
    WAVELENGTH: { color: '#009900', name: '波长', description: '绿色 - 用于波长标注' },
    FREQUENCY: { color: '#cc6600', name: '频率', description: '橙色 - 用于频率标注' },
    POWER: { color: '#990099', name: '功率', description: '紫色 - 用于功率标注' },
    WARNING: { color: '#ff6600', name: '警告', description: '橙红色 - 用于警告信息' },
    CUSTOM: { color: '#666666', name: '自定义', description: '灰色 - 自定义颜色' }
};

/**
 * 希腊字母映射
 */
export const GREEK_LETTERS = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
    '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ',
    '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
    '\\pm': '±', '\\times': '×', '\\div': '÷', '\\approx': '≈',
    '\\neq': '≠', '\\leq': '≤', '\\geq': '≥', '\\infty': '∞',
    '\\degree': '°', '\\micro': 'μ', '\\ohm': 'Ω'
};

/**
 * 上标字符映射
 */
const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ'
};

/**
 * 下标字符映射
 */
const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'h': 'ₕ',
    'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ',
    's': 'ₛ', 't': 'ₜ'
};

/**
 * 文本段落类型
 */
const SEGMENT_TYPES = {
    NORMAL: 'normal',
    SUPERSCRIPT: 'superscript',
    SUBSCRIPT: 'subscript',
    BOLD: 'bold',
    ITALIC: 'italic'
};

/**
 * 专业标注类
 */
export class ProfessionalLabel {
    constructor(config = {}) {
        this.id = config.id || generateLabelId();
        this.text = config.text || '';
        this.position = { x: config.x || 0, y: config.y || 0, ...config.position };
        
        // 关联目标
        this.targetId = config.targetId || null;
        this.targetType = config.targetType || 'free'; // 'component', 'raylink', 'free'
        
        // 样式
        this.style = {
            fontSize: config.fontSize || 14,
            fontFamily: config.fontFamily || 'Arial, sans-serif',
            color: config.color || '#000000',
            backgroundColor: config.backgroundColor || 'transparent',
            bold: config.bold || false,
            italic: config.italic || false,
            preset: config.preset || null,
            ...config.style
        };
        
        // 引线
        this.leaderLine = config.leaderLine !== false;
        this.leaderLineStyle = {
            color: config.leaderLineColor || '#666666',
            width: config.leaderLineWidth || 1,
            dashPattern: config.leaderLineDash || [],
            ...config.leaderLineStyle
        };
        
        // 状态
        this.selected = false;
        this.hovered = false;
        this.editing = false;
        
        // 缓存
        this._parsedSegments = null;
        this._boundingBox = null;
    }

    /**
     * 解析格式化文本
     * 支持: _下标, ^上标, \alpha希腊字母, *粗体*, _斜体_
     */
    parseFormattedText() {
        if (this._parsedSegments && this._lastParsedText === this.text) {
            return this._parsedSegments;
        }
        
        let text = this.text;
        const segments = [];
        
        // 替换希腊字母
        Object.entries(GREEK_LETTERS).forEach(([key, value]) => {
            text = text.replace(new RegExp(key.replace(/\\/g, '\\\\'), 'g'), value);
        });
        
        // 解析上下标和格式
        let i = 0;
        let currentSegment = { type: SEGMENT_TYPES.NORMAL, text: '' };
        
        while (i < text.length) {
            const char = text[i];
            const nextChar = text[i + 1];
            
            // 上标 ^{...} 或 ^x
            if (char === '^') {
                if (currentSegment.text) {
                    segments.push({ ...currentSegment });
                    currentSegment = { type: SEGMENT_TYPES.NORMAL, text: '' };
                }
                
                if (nextChar === '{') {
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        const superText = text.substring(i + 2, endBrace);
                        segments.push({ type: SEGMENT_TYPES.SUPERSCRIPT, text: superText });
                        i = endBrace + 1;
                        continue;
                    }
                } else if (nextChar) {
                    segments.push({ type: SEGMENT_TYPES.SUPERSCRIPT, text: nextChar });
                    i += 2;
                    continue;
                }
            }
            
            // 下标 _{...} 或 _x
            if (char === '_' && nextChar !== '_') {
                if (currentSegment.text) {
                    segments.push({ ...currentSegment });
                    currentSegment = { type: SEGMENT_TYPES.NORMAL, text: '' };
                }
                
                if (nextChar === '{') {
                    const endBrace = text.indexOf('}', i + 2);
                    if (endBrace !== -1) {
                        const subText = text.substring(i + 2, endBrace);
                        segments.push({ type: SEGMENT_TYPES.SUBSCRIPT, text: subText });
                        i = endBrace + 1;
                        continue;
                    }
                } else if (nextChar) {
                    segments.push({ type: SEGMENT_TYPES.SUBSCRIPT, text: nextChar });
                    i += 2;
                    continue;
                }
            }
            
            currentSegment.text += char;
            i++;
        }
        
        if (currentSegment.text) {
            segments.push(currentSegment);
        }
        
        this._parsedSegments = segments;
        this._lastParsedText = this.text;
        return segments;
    }

    /**
     * 渲染标注
     */
    render(ctx, targetPosition = null) {
        const segments = this.parseFormattedText();
        const scale = this._getCameraScale();
        const invScale = 1 / Math.max(1e-6, scale);
        
        ctx.save();
        
        // 绘制引线
        if (this.leaderLine && targetPosition && this.targetId) {
            this._renderLeaderLine(ctx, targetPosition);
        }
        
        // 计算边界框
        const bbox = this._calculateBoundingBox(ctx, segments);
        
        // 绘制背景
        if (this.style.backgroundColor && this.style.backgroundColor !== 'transparent') {
            ctx.fillStyle = this.style.backgroundColor;
            ctx.fillRect(
                this.position.x - 4,
                this.position.y - bbox.height - 4,
                bbox.width + 8,
                bbox.height + 8
            );
        }
        
        // 选中/悬停效果
        if (this.selected || this.hovered) {
            ctx.strokeStyle = this.selected ? '#0078d4' : '#666666';
            ctx.lineWidth = 1 * invScale;
            ctx.setLineDash(this.selected ? [] : [3 * invScale, 3 * invScale]);
            const pad = 4 * invScale;
            ctx.strokeRect(
                this.position.x - pad,
                this.position.y - bbox.height - pad,
                bbox.width + pad * 2,
                bbox.height + pad * 2
            );
            ctx.setLineDash([]);
        }
        
        // 渲染文本段落
        this._renderSegments(ctx, segments);
        
        this._boundingBox = bbox;
        ctx.restore();
    }

    /**
     * 渲染引线
     * @private
     */
    _renderLeaderLine(ctx, targetPosition) {
        ctx.strokeStyle = this.leaderLineStyle.color;
        ctx.lineWidth = this.leaderLineStyle.width;
        
        if (this.leaderLineStyle.dashPattern?.length) {
            ctx.setLineDash(this.leaderLineStyle.dashPattern);
        }
        
        // 计算引线起点（标注边缘最近点）
        const labelCenter = {
            x: this.position.x + (this._boundingBox?.width || 50) / 2,
            y: this.position.y - (this._boundingBox?.height || 14) / 2
        };
        
        ctx.beginPath();
        ctx.moveTo(labelCenter.x, labelCenter.y);
        ctx.lineTo(targetPosition.x, targetPosition.y);
        ctx.stroke();
        
        // 绘制小圆点
        ctx.fillStyle = this.leaderLineStyle.color;
        ctx.beginPath();
        ctx.arc(targetPosition.x, targetPosition.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.setLineDash([]);
    }

    /**
     * 渲染文本段落
     * @private
     */
    _renderSegments(ctx, segments) {
        let x = this.position.x;
        const baseY = this.position.y;
        const baseFontSize = this.style.fontSize;
        
        segments.forEach(segment => {
            let fontSize = baseFontSize;
            let yOffset = 0;
            let fontStyle = '';
            
            // 设置字体样式
            if (this.style.bold || segment.type === SEGMENT_TYPES.BOLD) {
                fontStyle += 'bold ';
            }
            if (this.style.italic || segment.type === SEGMENT_TYPES.ITALIC) {
                fontStyle += 'italic ';
            }
            
            // 上下标调整
            if (segment.type === SEGMENT_TYPES.SUPERSCRIPT) {
                fontSize = baseFontSize * 0.7;
                yOffset = -baseFontSize * 0.35;
            } else if (segment.type === SEGMENT_TYPES.SUBSCRIPT) {
                fontSize = baseFontSize * 0.7;
                yOffset = baseFontSize * 0.2;
            }
            
            ctx.font = `${fontStyle}${fontSize}px ${this.style.fontFamily}`;
            ctx.fillStyle = this.style.color;
            ctx.textBaseline = 'alphabetic';
            
            ctx.fillText(segment.text, x, baseY + yOffset);
            x += ctx.measureText(segment.text).width;
        });
    }

    /**
     * 计算边界框
     * @private
     */
    _calculateBoundingBox(ctx, segments) {
        let totalWidth = 0;
        let maxHeight = this.style.fontSize;
        const baseFontSize = this.style.fontSize;
        
        segments.forEach(segment => {
            let fontSize = baseFontSize;
            if (segment.type === SEGMENT_TYPES.SUPERSCRIPT || segment.type === SEGMENT_TYPES.SUBSCRIPT) {
                fontSize = baseFontSize * 0.7;
            }
            
            let fontStyle = '';
            if (this.style.bold) fontStyle += 'bold ';
            if (this.style.italic) fontStyle += 'italic ';
            
            ctx.font = `${fontStyle}${fontSize}px ${this.style.fontFamily}`;
            totalWidth += ctx.measureText(segment.text).width;
        });
        
        return { width: totalWidth, height: maxHeight };
    }

    /**
     * 碰撞检测
     */
    hitTest(position, tolerance = 5) {
        if (!this._boundingBox) return false;
        const scale = this._getCameraScale();
        const effectiveTolerance = tolerance / Math.max(1e-6, scale);
        
        const bbox = this._boundingBox;
        return position.x >= this.position.x - effectiveTolerance &&
               position.x <= this.position.x + bbox.width + effectiveTolerance &&
               position.y >= this.position.y - bbox.height - effectiveTolerance &&
               position.y <= this.position.y + effectiveTolerance;
    }

    _getCameraScale() {
        if (typeof window === 'undefined') return 1;
        const scale = window.cameraScale;
        if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) return 1;
        return scale;
    }

    /**
     * 应用颜色预设
     */
    applyPreset(presetKey) {
        const preset = LABEL_COLOR_PRESETS[presetKey];
        if (preset) {
            this.style.color = preset.color;
            this.style.preset = presetKey;
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            text: this.text,
            position: { ...this.position },
            targetId: this.targetId,
            targetType: this.targetType,
            style: { ...this.style },
            leaderLine: this.leaderLine,
            leaderLineStyle: { ...this.leaderLineStyle }
        };
    }

    /**
     * 从数据恢复
     */
    static deserialize(data) {
        return new ProfessionalLabel(data);
    }
}

/**
 * 专业标注管理器
 */
export class ProfessionalLabelManager {
    constructor() {
        /** @type {Map<string, ProfessionalLabel>} */
        this.labels = new Map();
        
        /** @type {ProfessionalLabel|null} */
        this.selectedLabel = null;
        
        /** @type {ProfessionalLabel|null} */
        this.hoveredLabel = null;
        
        /** @type {ProfessionalLabel|null} */
        this.editingLabel = null;
        
        /** @type {Object} 默认样式 */
        this.defaultStyle = {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            backgroundColor: 'transparent'
        };
        
        /** @type {Map<string, ProfessionalLabel[]>} 标注分组 */
        this.groups = new Map();
        
        /** @type {Object[]} 标注模板 */
        this.templates = this._initializeTemplates();
    }

    /**
     * 初始化常用模板
     * @private
     */
    _initializeTemplates() {
        return [
            { name: 'AOM频率', text: 'f_{AOM} = 80 MHz', preset: 'AOM_PARAMETER' },
            { name: 'AOM功率', text: 'P = 100 mW', preset: 'AOM_PARAMETER' },
            { name: '波长', text: '\\lambda = 780 nm', preset: 'WAVELENGTH' },
            { name: '失谐', text: '\\Delta = -10 MHz', preset: 'FREQUENCY' },
            { name: '偏振', text: '\\sigma^+', preset: 'NOTE' },
            { name: '光功率', text: 'P_{out} = 50 mW', preset: 'POWER' },
            { name: '透射率', text: 'T = 50%', preset: 'NOTE' },
            { name: '反射率', text: 'R = 99%', preset: 'NOTE' },
            { name: '焦距', text: 'f = 100 mm', preset: 'NOTE' },
            { name: '温度', text: 'T = 25\\degree C', preset: 'NOTE' }
        ];
    }

    /**
     * 创建标注
     */
    createLabel(config) {
        const label = new ProfessionalLabel({
            ...this.defaultStyle,
            ...config
        });
        this.labels.set(label.id, label);
        return label;
    }

    /**
     * 从模板创建标注
     */
    createFromTemplate(templateIndex, position) {
        const template = this.templates[templateIndex];
        if (!template) return null;
        
        const label = this.createLabel({
            text: template.text,
            position,
            preset: template.preset
        });
        
        if (template.preset) {
            label.applyPreset(template.preset);
        }
        
        return label;
    }

    /**
     * 删除标注
     */
    deleteLabel(labelId) {
        const label = this.labels.get(labelId);
        if (!label) return false;
        
        this.labels.delete(labelId);
        
        if (this.selectedLabel?.id === labelId) this.selectedLabel = null;
        if (this.hoveredLabel?.id === labelId) this.hoveredLabel = null;
        if (this.editingLabel?.id === labelId) this.editingLabel = null;
        
        // 从分组中移除
        this.groups.forEach((labels, groupId) => {
            const index = labels.indexOf(label);
            if (index !== -1) labels.splice(index, 1);
        });
        
        return true;
    }

    /**
     * 获取标注
     */
    getLabel(labelId) {
        return this.labels.get(labelId) || null;
    }

    /**
     * 获取所有标注
     */
    getAllLabels() {
        return Array.from(this.labels.values());
    }

    /**
     * 获取目标关联的标注
     */
    getLabelsForTarget(targetId) {
        return this.getAllLabels().filter(label => label.targetId === targetId);
    }

    /**
     * 删除目标关联的所有标注
     */
    deleteLabelsForTarget(targetId) {
        const labels = this.getLabelsForTarget(targetId);
        labels.forEach(label => this.deleteLabel(label.id));
        return labels.length;
    }

    /**
     * 创建标注分组
     */
    createGroup(groupId, labelIds = []) {
        const labels = labelIds.map(id => this.labels.get(id)).filter(Boolean);
        this.groups.set(groupId, labels);
        return labels;
    }

    /**
     * 添加标注到分组
     */
    addToGroup(groupId, labelId) {
        const label = this.labels.get(labelId);
        if (!label) return false;
        
        if (!this.groups.has(groupId)) {
            this.groups.set(groupId, []);
        }
        
        const group = this.groups.get(groupId);
        if (!group.includes(label)) {
            group.push(label);
        }
        return true;
    }

    /**
     * 自动定位标注（避免重叠）
     */
    autoPositionLabel(label, components = [], existingLabels = null) {
        const labels = existingLabels || this.getAllLabels().filter(l => l.id !== label.id);
        const padding = 10;
        
        // 尝试不同的偏移位置
        const offsets = [
            { x: 0, y: -30 },
            { x: 30, y: -30 },
            { x: -30, y: -30 },
            { x: 30, y: 0 },
            { x: -30, y: 0 },
            { x: 0, y: 30 },
            { x: 30, y: 30 },
            { x: -30, y: 30 }
        ];
        
        const basePos = { ...label.position };
        
        for (const offset of offsets) {
            label.position.x = basePos.x + offset.x;
            label.position.y = basePos.y + offset.y;
            
            let hasOverlap = false;
            
            // 检查与其他标注的重叠
            for (const other of labels) {
                if (this._checkOverlap(label, other, padding)) {
                    hasOverlap = true;
                    break;
                }
            }
            
            if (!hasOverlap) {
                return true;
            }
        }
        
        // 如果所有位置都有重叠，使用第一个偏移
        label.position.x = basePos.x + offsets[0].x;
        label.position.y = basePos.y + offsets[0].y;
        return false;
    }

    /**
     * 检查两个标注是否重叠
     * @private
     */
    _checkOverlap(label1, label2, padding = 0) {
        const bbox1 = label1._boundingBox || { width: 50, height: 14 };
        const bbox2 = label2._boundingBox || { width: 50, height: 14 };
        
        const rect1 = {
            left: label1.position.x - padding,
            right: label1.position.x + bbox1.width + padding,
            top: label1.position.y - bbox1.height - padding,
            bottom: label1.position.y + padding
        };
        
        const rect2 = {
            left: label2.position.x - padding,
            right: label2.position.x + bbox2.width + padding,
            top: label2.position.y - bbox2.height - padding,
            bottom: label2.position.y + padding
        };
        
        return !(rect1.right < rect2.left || rect1.left > rect2.right ||
                 rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    }

    /**
     * 渲染所有标注
     */
    render(ctx, getTargetPosition = null) {
        this.labels.forEach(label => {
            let targetPos = null;
            
            if (label.targetId && getTargetPosition) {
                targetPos = getTargetPosition(label.targetId, label.targetType);
            }
            
            label.hovered = label === this.hoveredLabel;
            label.selected = label === this.selectedLabel;
            label.render(ctx, targetPos);
        });
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(position) {
        let hovered = null;
        
        for (const label of this.labels.values()) {
            if (label.hitTest(position)) {
                hovered = label;
                break;
            }
        }
        
        this.hoveredLabel = hovered;
        return hovered;
    }

    /**
     * 处理鼠标点击
     */
    handleMouseClick(position) {
        for (const label of this.labels.values()) {
            if (label.hitTest(position)) {
                this.selectedLabel = label;
                return label;
            }
        }
        
        this.selectedLabel = null;
        return null;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            defaultStyle: { ...this.defaultStyle },
            labels: this.getAllLabels().map(label => label.serialize()),
            groups: Object.fromEntries(
                Array.from(this.groups.entries()).map(([id, labels]) => [
                    id,
                    labels.map(l => l.id)
                ])
            )
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.defaultStyle) {
            this.defaultStyle = { ...this.defaultStyle, ...data.defaultStyle };
        }
        
        if (data.labels) {
            data.labels.forEach(labelData => {
                const label = ProfessionalLabel.deserialize(labelData);
                this.labels.set(label.id, label);
            });
        }
        
        if (data.groups) {
            Object.entries(data.groups).forEach(([groupId, labelIds]) => {
                this.createGroup(groupId, labelIds);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.labels.clear();
        this.groups.clear();
        this.selectedLabel = null;
        this.hoveredLabel = null;
        this.editingLabel = null;
    }
}

// 单例
let professionalLabelManagerInstance = null;

export function getProfessionalLabelManager() {
    if (!professionalLabelManagerInstance) {
        professionalLabelManagerInstance = new ProfessionalLabelManager();
    }
    return professionalLabelManagerInstance;
}

export function resetProfessionalLabelManager() {
    professionalLabelManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ProfessionalLabel = ProfessionalLabel;
    window.ProfessionalLabelManager = ProfessionalLabelManager;
    window.getProfessionalLabelManager = getProfessionalLabelManager;
    window.LABEL_COLOR_PRESETS = LABEL_COLOR_PRESETS;
    window.GREEK_LETTERS = GREEK_LETTERS;
}
