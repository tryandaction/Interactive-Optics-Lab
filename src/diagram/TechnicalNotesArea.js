/**
 * TechnicalNotesArea.js - 技术说明区域
 * 在图表底部显示分节的技术说明信息
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9
 */

/**
 * 生成唯一ID
 */
function generateNoteId() {
    return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 说明节颜色预设
 */
export const SECTION_COLOR_PRESETS = {
    AOM: { color: '#cc0000', name: 'AOM参数' },
    LASER: { color: '#0066cc', name: '激光参数' },
    OPTICS: { color: '#009900', name: '光学元件' },
    DETECTION: { color: '#990099', name: '探测系统' },
    GENERAL: { color: '#333333', name: '一般说明' },
    WARNING: { color: '#ff6600', name: '注意事项' }
};

/**
 * 技术说明节
 */
export class TechnicalNoteSection {
    constructor(config = {}) {
        this.id = config.id || generateNoteId();
        this.title = config.title || '说明';
        this.color = config.color || '#cc0000';
        this.items = config.items || [];
        this.collapsed = config.collapsed || false;
        this.order = config.order || 0;
    }

    /**
     * 添加项目
     */
    addItem(text) {
        this.items.push(text);
    }

    /**
     * 移除项目
     */
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            this.items.splice(index, 1);
        }
    }

    /**
     * 更新项目
     */
    updateItem(index, text) {
        if (index >= 0 && index < this.items.length) {
            this.items[index] = text;
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            title: this.title,
            color: this.color,
            items: [...this.items],
            collapsed: this.collapsed,
            order: this.order
        };
    }

    static deserialize(data) {
        return new TechnicalNoteSection(data);
    }
}

/**
 * 技术说明区域类
 */
export class TechnicalNotesArea {
    constructor(config = {}) {
        /** @type {Map<string, TechnicalNoteSection>} */
        this.sections = new Map();
        
        /** @type {string} 位置 */
        this.position = config.position || 'bottom'; // 'bottom', 'right'
        
        /** @type {number} 高度/宽度 */
        this.size = config.size || 150;
        
        /** @type {number} 边距 */
        this.margin = config.margin || 20;
        
        /** @type {boolean} 是否可见 */
        this.visible = config.visible !== false;
        
        /** @type {Object} 样式 */
        this.style = {
            backgroundColor: config.backgroundColor || 'rgba(255, 255, 255, 0.95)',
            borderColor: config.borderColor || '#333333',
            titleFont: config.titleFont || 'bold 12px Arial',
            itemFont: config.itemFont || '12px Arial',
            titleColor: config.titleColor || '#333333',
            itemColor: config.itemColor || '#333333',
            lineHeight: config.lineHeight || 18,
            sectionSpacing: config.sectionSpacing || 20,
            columnGap: config.columnGap || 40,
            ...config.style
        };
        
        /** @type {number} 列数 */
        this.columns = config.columns || 3;
    }

    /**
     * 添加说明节
     */
    addSection(config) {
        const section = new TechnicalNoteSection({
            ...config,
            order: this.sections.size
        });
        this.sections.set(section.id, section);
        return section;
    }

    /**
     * 获取说明节
     */
    getSection(sectionId) {
        return this.sections.get(sectionId) || null;
    }

    /**
     * 删除说明节
     */
    removeSection(sectionId) {
        return this.sections.delete(sectionId);
    }

    /**
     * 获取所有说明节（按顺序）
     */
    getAllSections() {
        return Array.from(this.sections.values())
            .sort((a, b) => a.order - b.order);
    }

    /**
     * 从预设创建说明节
     */
    addSectionFromPreset(presetKey, items = []) {
        const preset = SECTION_COLOR_PRESETS[presetKey];
        if (!preset) return null;
        
        return this.addSection({
            title: preset.name,
            color: preset.color,
            items
        });
    }

    /**
     * 计算区域边界
     */
    getBounds(canvasWidth, canvasHeight) {
        if (this.position === 'bottom') {
            return {
                x: this.margin,
                y: canvasHeight - this.size - this.margin,
                width: canvasWidth - this.margin * 2,
                height: this.size
            };
        } else if (this.position === 'right') {
            return {
                x: canvasWidth - this.size - this.margin,
                y: this.margin,
                width: this.size,
                height: canvasHeight - this.margin * 2
            };
        }
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    /**
     * 渲染技术说明区域
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (!this.visible) return;
        
        const sections = this.getAllSections();
        if (sections.length === 0) return;
        
        const bounds = this.getBounds(canvasWidth, canvasHeight);
        
        ctx.save();
        
        // 绘制背景
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // 绘制顶部分隔线
        ctx.strokeStyle = this.style.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bounds.x, bounds.y);
        ctx.lineTo(bounds.x + bounds.width, bounds.y);
        ctx.stroke();
        
        // 计算列布局
        const columnWidth = (bounds.width - this.style.columnGap * (this.columns - 1)) / this.columns;
        const contentStartY = bounds.y + 15;
        
        // 分配节到列
        const columnContents = this._distributeToColumns(sections, this.columns);
        
        // 渲染每列
        columnContents.forEach((columnSections, colIndex) => {
            const colX = bounds.x + colIndex * (columnWidth + this.style.columnGap);
            let currentY = contentStartY;
            
            columnSections.forEach(section => {
                currentY = this._renderSection(ctx, section, colX, currentY, columnWidth);
                currentY += this.style.sectionSpacing;
            });
        });
        
        ctx.restore();
    }

    /**
     * 分配节到列
     * @private
     */
    _distributeToColumns(sections, numColumns) {
        const columns = Array.from({ length: numColumns }, () => []);
        
        // 简单的轮询分配
        sections.forEach((section, index) => {
            columns[index % numColumns].push(section);
        });
        
        return columns;
    }

    /**
     * 渲染单个说明节
     * @private
     */
    _renderSection(ctx, section, x, y, maxWidth) {
        if (section.collapsed) {
            // 折叠状态只显示标题
            ctx.font = this.style.titleFont;
            ctx.fillStyle = section.color;
            ctx.fillText(`▶ ${section.title}`, x, y);
            return y + this.style.lineHeight;
        }
        
        // 渲染标题
        ctx.font = this.style.titleFont;
        ctx.fillStyle = section.color;
        ctx.fillText(section.title + ':', x, y);
        y += this.style.lineHeight;
        
        // 渲染项目
        ctx.font = this.style.itemFont;
        ctx.fillStyle = this.style.itemColor;
        
        section.items.forEach(item => {
            // 解析格式化文本
            const formattedText = this._parseFormattedText(item);
            
            // 自动换行
            const lines = this._wrapText(ctx, formattedText, maxWidth - 10);
            lines.forEach(line => {
                ctx.fillText('• ' + line, x + 8, y);
                y += this.style.lineHeight;
            });
        });
        
        return y;
    }

    /**
     * 解析格式化文本
     * @private
     */
    _parseFormattedText(text) {
        // 替换希腊字母
        const greekMap = {
            '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
            '\\lambda': 'λ', '\\mu': 'μ', '\\omega': 'ω', '\\pi': 'π',
            '\\sigma': 'σ', '\\theta': 'θ', '\\phi': 'φ', '\\psi': 'ψ',
            '\\Delta': 'Δ', '\\Omega': 'Ω', '\\degree': '°', '\\pm': '±',
            '\\times': '×', '\\approx': '≈'
        };
        
        let result = text;
        Object.entries(greekMap).forEach(([key, value]) => {
            result = result.replace(new RegExp(key.replace(/\\/g, '\\\\'), 'g'), value);
        });
        
        // 简单的上下标处理（转换为Unicode）
        result = result.replace(/\^(\d)/g, (_, d) => {
            const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
            return superscripts[parseInt(d)] || d;
        });
        
        result = result.replace(/_(\d)/g, (_, d) => {
            const subscripts = '₀₁₂₃₄₅₆₇₈₉';
            return subscripts[parseInt(d)] || d;
        });
        
        return result;
    }

    /**
     * 文本自动换行
     * @private
     */
    _wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [text];
    }

    /**
     * 碰撞检测
     */
    hitTest(position, canvasWidth, canvasHeight) {
        if (!this.visible) return false;
        
        const bounds = this.getBounds(canvasWidth, canvasHeight);
        return position.x >= bounds.x &&
               position.x <= bounds.x + bounds.width &&
               position.y >= bounds.y &&
               position.y <= bounds.y + bounds.height;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            position: this.position,
            size: this.size,
            margin: this.margin,
            visible: this.visible,
            style: { ...this.style },
            columns: this.columns,
            sections: this.getAllSections().map(s => s.serialize())
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.position) this.position = data.position;
        if (data.size) this.size = data.size;
        if (data.margin) this.margin = data.margin;
        if (data.visible !== undefined) this.visible = data.visible;
        if (data.style) this.style = { ...this.style, ...data.style };
        if (data.columns) this.columns = data.columns;
        
        if (data.sections) {
            this.sections.clear();
            data.sections.forEach(sectionData => {
                const section = TechnicalNoteSection.deserialize(sectionData);
                this.sections.set(section.id, section);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.sections.clear();
    }

    /**
     * 创建常用模板
     */
    static createTemplate(templateName) {
        const area = new TechnicalNotesArea();
        
        switch (templateName) {
            case 'saturated-absorption':
                area.addSection({
                    title: 'AOM参数',
                    color: '#cc0000',
                    items: [
                        'AOM1: f = 80 MHz, P = 100 mW',
                        'AOM2: f = 110 MHz, P = 50 mW'
                    ]
                });
                area.addSection({
                    title: '激光参数',
                    color: '#0066cc',
                    items: [
                        '\\lambda = 780.24 nm (D2线)',
                        'P_{total} = 20 mW'
                    ]
                });
                area.addSection({
                    title: '气室参数',
                    color: '#009900',
                    items: [
                        'Rb气室温度: 25°C',
                        '长度: 75 mm'
                    ]
                });
                break;
                
            case 'mot':
                area.addSection({
                    title: '冷却光',
                    color: '#cc0000',
                    items: [
                        '\\Delta = -2\\Gamma',
                        'I/I_s \\approx 1'
                    ]
                });
                area.addSection({
                    title: '回泵光',
                    color: '#0066cc',
                    items: [
                        'F=1 → F\'=2 跃迁',
                        'P = 5 mW'
                    ]
                });
                area.addSection({
                    title: '磁场',
                    color: '#990099',
                    items: [
                        '梯度: 10 G/cm',
                        '线圈电流: 2 A'
                    ]
                });
                break;
                
            case 'mach-zehnder':
                area.addSection({
                    title: '光学参数',
                    color: '#333333',
                    items: [
                        '分束比: 50:50',
                        '臂长差: \\Delta L = 0'
                    ]
                });
                area.addSection({
                    title: '探测',
                    color: '#990099',
                    items: [
                        '平衡探测器',
                        '带宽: DC-10 MHz'
                    ]
                });
                break;
        }
        
        return area;
    }
}

// 单例
let technicalNotesAreaInstance = null;

export function getTechnicalNotesArea() {
    if (!technicalNotesAreaInstance) {
        technicalNotesAreaInstance = new TechnicalNotesArea();
    }
    return technicalNotesAreaInstance;
}

export function resetTechnicalNotesArea() {
    technicalNotesAreaInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.TechnicalNotesArea = TechnicalNotesArea;
    window.TechnicalNoteSection = TechnicalNoteSection;
    window.getTechnicalNotesArea = getTechnicalNotesArea;
    window.SECTION_COLOR_PRESETS = SECTION_COLOR_PRESETS;
}
