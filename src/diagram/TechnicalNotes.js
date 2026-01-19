/**
 * TechnicalNotes.js - 技术说明区域管理器
 * 提供技术说明文本的编辑、格式化和渲染功能
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6
 */

/**
 * 生成唯一ID
 */
function generateNoteId() {
    return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 说明项类型枚举
 */
export const NoteType = {
    TEXT: 'text',
    BULLET: 'bullet',
    NUMBERED: 'numbered',
    HEADER: 'header'
};

/**
 * 说明项类
 */
export class NoteItem {
    /**
     * @param {Object} config - 配置
     */
    constructor(config = {}) {
        /** @type {string} 唯一ID */
        this.id = config.id || generateNoteId();
        
        /** @type {string} 类型 */
        this.type = config.type || NoteType.TEXT;
        
        /** @type {string} 文本内容 */
        this.text = config.text || '';
        
        /** @type {number} 缩进级别 */
        this.indent = config.indent || 0;
        
        /** @type {Object} 样式 */
        this.style = {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            fontSize: 12,
            color: '#000000',
            backgroundColor: 'transparent',
            ...config.style
        };
        
        /** @type {number} 序号（用于编号列表） */
        this.number = config.number || 1;
        
        /** @type {Array<string>} 链接的组件ID列表 */
        this.linkedComponents = config.linkedComponents || [];
        
        /** @type {Object} 元数据 */
        this.metadata = config.metadata || {};
        
        /** @type {Date} 创建时间 */
        this.createdAt = config.createdAt ? new Date(config.createdAt) : new Date();
        
        /** @type {Date} 修改时间 */
        this.updatedAt = config.updatedAt ? new Date(config.updatedAt) : new Date();
    }

    /**
     * 设置文本
     * @param {string} text
     */
    setText(text) {
        this.text = text;
        this.updatedAt = new Date();
    }

    /**
     * 设置类型
     * @param {string} type
     */
    setType(type) {
        if (Object.values(NoteType).includes(type)) {
            this.type = type;
            this.updatedAt = new Date();
        }
    }

    /**
     * 切换粗体
     */
    toggleBold() {
        this.style.bold = !this.style.bold;
        this.updatedAt = new Date();
    }

    /**
     * 切换斜体
     */
    toggleItalic() {
        this.style.italic = !this.style.italic;
        this.updatedAt = new Date();
    }

    /**
     * 切换下划线
     */
    toggleUnderline() {
        this.style.underline = !this.style.underline;
        this.updatedAt = new Date();
    }

    /**
     * 切换删除线
     */
    toggleStrikethrough() {
        this.style.strikethrough = !this.style.strikethrough;
        this.updatedAt = new Date();
    }

    /**
     * 增加缩进
     */
    increaseIndent() {
        if (this.indent < 5) {
            this.indent++;
            this.updatedAt = new Date();
        }
    }

    /**
     * 减少缩进
     */
    decreaseIndent() {
        if (this.indent > 0) {
            this.indent--;
            this.updatedAt = new Date();
        }
    }

    /**
     * 链接组件
     * @param {string} componentId
     */
    linkComponent(componentId) {
        if (!this.linkedComponents.includes(componentId)) {
            this.linkedComponents.push(componentId);
            this.updatedAt = new Date();
        }
    }

    /**
     * 取消链接组件
     * @param {string} componentId
     */
    unlinkComponent(componentId) {
        const index = this.linkedComponents.indexOf(componentId);
        if (index > -1) {
            this.linkedComponents.splice(index, 1);
            this.updatedAt = new Date();
        }
    }

    /**
     * 检查是否链接了组件
     * @param {string} componentId
     * @returns {boolean}
     */
    isLinkedTo(componentId) {
        return this.linkedComponents.includes(componentId);
    }

    /**
     * 获取所有链接的组件
     * @returns {Array<string>}
     */
    getLinkedComponents() {
        return [...this.linkedComponents];
    }

    /**
     * 获取渲染前缀
     * @returns {string}
     */
    getPrefix() {
        const indentStr = '    '.repeat(this.indent);
        
        switch (this.type) {
            case NoteType.BULLET:
                return indentStr + '• ';
            case NoteType.NUMBERED:
                return indentStr + `${this.number}. `;
            case NoteType.HEADER:
                return '';
            default:
                return indentStr;
        }
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            text: this.text,
            indent: this.indent,
            style: { ...this.style },
            number: this.number,
            linkedComponents: [...this.linkedComponents],
            metadata: { ...this.metadata },
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    /**
     * 反序列化
     * @param {Object} data
     * @returns {NoteItem}
     */
    static deserialize(data) {
        return new NoteItem(data);
    }

    /**
     * 克隆
     * @returns {NoteItem}
     */
    clone() {
        return NoteItem.deserialize(this.serialize());
    }

    /**
     * 导出为Markdown
     * @returns {string}
     */
    toMarkdown() {
        let md = '';
        
        // 缩进
        md += '  '.repeat(this.indent);
        
        // 类型前缀
        switch (this.type) {
            case NoteType.HEADER:
                md += '## ';
                break;
            case NoteType.BULLET:
                md += '- ';
                break;
            case NoteType.NUMBERED:
                md += `${this.number}. `;
                break;
        }
        
        // 文本格式
        let text = this.text;
        if (this.style.bold) text = `**${text}**`;
        if (this.style.italic) text = `*${text}*`;
        if (this.style.strikethrough) text = `~~${text}~~`;
        
        md += text;
        
        // 组件链接
        if (this.linkedComponents.length > 0) {
            md += ` [Components: ${this.linkedComponents.join(', ')}]`;
        }
        
        return md;
    }
}

/**
 * 技术说明管理器类
 */
export class TechnicalNotesManager {
    constructor(options = {}) {
        /** @type {NoteItem[]} 说明项列表 */
        this.notes = [];
        
        /** @type {Object} 区域配置 */
        this.areaConfig = {
            x: 20,
            y: 0, // 将在渲染时计算
            width: 0, // 将在渲染时计算
            height: 150,
            padding: 10,
            backgroundColor: 'transparent',
            borderColor: '#000000',
            showBorder: true,
            ...options.areaConfig
        };
        
        /** @type {Object} 默认样式 */
        this.defaultStyle = {
            fontSize: 12,
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            lineHeight: 1.5,
            ...options.defaultStyle
        };
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
    }

    /**
     * 添加说明项
     * @param {NoteItem|Object} note - 说明项
     * @param {number} [index] - 插入位置
     * @returns {NoteItem}
     */
    addNote(note, index) {
        const noteItem = note instanceof NoteItem ? note : new NoteItem(note);
        
        if (typeof index === 'number' && index >= 0 && index <= this.notes.length) {
            this.notes.splice(index, 0, noteItem);
        } else {
            this.notes.push(noteItem);
        }
        
        this._updateNumbering();
        this._notifyChange('noteAdded', noteItem);
        return noteItem;
    }

    /**
     * 删除说明项
     * @param {string} noteId - 说明项ID
     * @returns {boolean}
     */
    removeNote(noteId) {
        const index = this.notes.findIndex(n => n.id === noteId);
        if (index === -1) return false;
        
        const removed = this.notes.splice(index, 1)[0];
        this._updateNumbering();
        this._notifyChange('noteRemoved', removed);
        return true;
    }

    /**
     * 获取说明项
     * @param {string} noteId - 说明项ID
     * @returns {NoteItem|null}
     */
    getNote(noteId) {
        return this.notes.find(n => n.id === noteId) || null;
    }

    /**
     * 获取所有说明项
     * @returns {NoteItem[]}
     */
    getAllNotes() {
        return [...this.notes];
    }

    /**
     * 更新说明项
     * @param {string} noteId - 说明项ID
     * @param {Object} updates - 更新内容
     * @returns {NoteItem|null}
     */
    updateNote(noteId, updates) {
        const note = this.getNote(noteId);
        if (!note) return null;
        
        if (updates.text !== undefined) note.setText(updates.text);
        if (updates.type !== undefined) note.setType(updates.type);
        if (updates.indent !== undefined) note.indent = updates.indent;
        if (updates.style !== undefined) note.style = { ...note.style, ...updates.style };
        
        this._updateNumbering();
        this._notifyChange('noteUpdated', note);
        return note;
    }

    /**
     * 移动说明项
     * @param {string} noteId - 说明项ID
     * @param {number} newIndex - 新位置
     */
    moveNote(noteId, newIndex) {
        const currentIndex = this.notes.findIndex(n => n.id === noteId);
        if (currentIndex === -1) return;
        
        const [note] = this.notes.splice(currentIndex, 1);
        this.notes.splice(newIndex, 0, note);
        
        this._updateNumbering();
        this._notifyChange('noteMoved', { noteId, newIndex });
    }

    /**
     * 清空所有说明
     */
    clear() {
        this.notes = [];
        this._notifyChange('cleared', null);
    }

    /**
     * 更新编号
     * @private
     */
    _updateNumbering() {
        let number = 1;
        this.notes.forEach(note => {
            if (note.type === NoteType.NUMBERED) {
                note.number = number++;
            }
        });
    }

    /**
     * 渲染到Canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     */
    render(ctx, canvasWidth, canvasHeight) {
        if (this.notes.length === 0) return;
        
        const config = this.areaConfig;
        const areaY = canvasHeight - config.height - config.padding;
        const areaWidth = canvasWidth - config.x * 2;
        
        ctx.save();
        
        // 绘制背景
        if (config.backgroundColor !== 'transparent') {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(config.x, areaY, areaWidth, config.height);
        }
        
        // 绘制边框/分隔线
        if (config.showBorder) {
            ctx.strokeStyle = config.borderColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(config.x, areaY);
            ctx.lineTo(config.x + areaWidth, areaY);
            ctx.stroke();
        }
        
        // 渲染说明文本
        let currentY = areaY + config.padding + this.defaultStyle.fontSize;
        const lineHeight = this.defaultStyle.fontSize * this.defaultStyle.lineHeight;
        
        this.notes.forEach(note => {
            if (currentY > canvasHeight - config.padding) return;
            
            // 构建字体
            let fontStyle = '';
            if (note.style.italic) fontStyle += 'italic ';
            if (note.style.bold) fontStyle += 'bold ';
            
            const fontSize = note.type === NoteType.HEADER 
                ? note.style.fontSize * 1.2 
                : note.style.fontSize;
            
            ctx.font = `${fontStyle}${fontSize}px ${this.defaultStyle.fontFamily}`;
            ctx.fillStyle = note.style.color;
            ctx.textBaseline = 'top';
            
            // 渲染文本
            const prefix = note.getPrefix();
            const text = prefix + note.text;
            const x = config.x + config.padding;
            
            ctx.fillText(text, x, currentY - this.defaultStyle.fontSize);
            
            currentY += lineHeight;
        });
        
        ctx.restore();
    }

    /**
     * 渲染到SVG
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     * @returns {string} SVG字符串
     */
    renderToSVG(canvasWidth, canvasHeight) {
        if (this.notes.length === 0) return '';
        
        const config = this.areaConfig;
        const areaY = canvasHeight - config.height - config.padding;
        const areaWidth = canvasWidth - config.x * 2;
        
        const parts = [];
        parts.push(`<g id="technical-notes" transform="translate(${config.x}, ${areaY})">`);
        
        // 分隔线
        if (config.showBorder) {
            parts.push(`<line x1="0" y1="0" x2="${areaWidth}" y2="0" stroke="${config.borderColor}" stroke-width="1"/>`);
        }
        
        // 说明文本
        let currentY = config.padding + this.defaultStyle.fontSize;
        const lineHeight = this.defaultStyle.fontSize * this.defaultStyle.lineHeight;
        
        this.notes.forEach((note, index) => {
            const fontSize = note.type === NoteType.HEADER 
                ? note.style.fontSize * 1.2 
                : note.style.fontSize;
            
            let fontWeight = note.style.bold ? 'bold' : 'normal';
            let fontStyle = note.style.italic ? 'italic' : 'normal';
            
            const prefix = note.getPrefix();
            const text = this._escapeXML(prefix + note.text);
            
            parts.push(`<text x="${config.padding}" y="${currentY}" `);
            parts.push(`font-size="${fontSize}" font-family="${this.defaultStyle.fontFamily}" `);
            parts.push(`font-weight="${fontWeight}" font-style="${fontStyle}" `);
            parts.push(`fill="${note.style.color}">${text}</text>`);
            
            currentY += lineHeight;
        });
        
        parts.push(`</g>`);
        return parts.join('\n');
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
     * 从纯文本导入
     * @param {string} text - 纯文本
     */
    importFromText(text) {
        this.clear();
        
        const lines = text.split('\n');
        lines.forEach(line => {
            if (!line.trim()) return;
            
            let type = NoteType.TEXT;
            let processedLine = line;
            let indent = 0;
            
            // 检测缩进
            const indentMatch = line.match(/^(\s+)/);
            if (indentMatch) {
                indent = Math.floor(indentMatch[1].length / 4);
                processedLine = line.trimStart();
            }
            
            // 检测列表类型
            if (processedLine.startsWith('• ') || processedLine.startsWith('- ')) {
                type = NoteType.BULLET;
                processedLine = processedLine.substring(2);
            } else if (/^\d+\.\s/.test(processedLine)) {
                type = NoteType.NUMBERED;
                processedLine = processedLine.replace(/^\d+\.\s/, '');
            } else if (processedLine.startsWith('# ')) {
                type = NoteType.HEADER;
                processedLine = processedLine.substring(2);
            }
            
            this.addNote({
                type,
                text: processedLine,
                indent
            });
        });
    }

    /**
     * 导出为纯文本
     * @returns {string}
     */
    exportToText() {
        return this.notes.map(note => {
            const indent = '    '.repeat(note.indent);
            const prefix = note.getPrefix().trim();
            return indent + (prefix ? prefix + ' ' : '') + note.text;
        }).join('\n');
    }

    /**
     * 导出为Markdown
     * @returns {string}
     */
    exportToMarkdown() {
        const lines = ['# Technical Notes', ''];
        
        this.notes.forEach(note => {
            lines.push(note.toMarkdown());
        });
        
        return lines.join('\n');
    }

    /**
     * 导出为HTML
     * @returns {string}
     */
    exportToHTML() {
        const parts = [];
        parts.push('<!DOCTYPE html>');
        parts.push('<html>');
        parts.push('<head>');
        parts.push('<meta charset="UTF-8">');
        parts.push('<title>Technical Notes</title>');
        parts.push('<style>');
        parts.push('body { font-family: Arial, sans-serif; margin: 20px; }');
        parts.push('h2 { margin-top: 20px; }');
        parts.push('ul, ol { margin: 10px 0; }');
        parts.push('.indent-1 { margin-left: 20px; }');
        parts.push('.indent-2 { margin-left: 40px; }');
        parts.push('.indent-3 { margin-left: 60px; }');
        parts.push('.indent-4 { margin-left: 80px; }');
        parts.push('.indent-5 { margin-left: 100px; }');
        parts.push('.linked-component { color: #0066cc; font-style: italic; }');
        parts.push('</style>');
        parts.push('</head>');
        parts.push('<body>');
        parts.push('<h1>Technical Notes</h1>');
        
        this.notes.forEach(note => {
            const indentClass = note.indent > 0 ? ` class="indent-${note.indent}"` : '';
            let tag = 'p';
            let content = note.text;
            
            // 应用样式
            if (note.style.bold) content = `<strong>${content}</strong>`;
            if (note.style.italic) content = `<em>${content}</em>`;
            if (note.style.underline) content = `<u>${content}</u>`;
            if (note.style.strikethrough) content = `<s>${content}</s>`;
            
            // 添加组件链接
            if (note.linkedComponents.length > 0) {
                content += ` <span class="linked-component">[Components: ${note.linkedComponents.join(', ')}]</span>`;
            }
            
            switch (note.type) {
                case NoteType.HEADER:
                    parts.push(`<h2${indentClass}>${content}</h2>`);
                    break;
                case NoteType.BULLET:
                    parts.push(`<ul${indentClass}><li>${content}</li></ul>`);
                    break;
                case NoteType.NUMBERED:
                    parts.push(`<ol${indentClass} start="${note.number}"><li>${content}</li></ol>`);
                    break;
                default:
                    parts.push(`<p${indentClass}>${content}</p>`);
            }
        });
        
        parts.push('</body>');
        parts.push('</html>');
        
        return parts.join('\n');
    }

    /**
     * 导出为JSON
     * @returns {string}
     */
    exportToJSON() {
        return JSON.stringify(this.serialize(), null, 2);
    }

    /**
     * 搜索说明
     * @param {string} query - 搜索关键词
     * @returns {Array<NoteItem>}
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => 
            note.text.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 按组件ID搜索说明
     * @param {string} componentId
     * @returns {Array<NoteItem>}
     */
    searchByComponent(componentId) {
        return this.notes.filter(note => 
            note.isLinkedTo(componentId)
        );
    }

    /**
     * 获取统计信息
     * @returns {Object}
     */
    getStatistics() {
        const stats = {
            totalNotes: this.notes.length,
            byType: {},
            totalWords: 0,
            totalCharacters: 0,
            linkedComponents: new Set()
        };
        
        Object.values(NoteType).forEach(type => {
            stats.byType[type] = 0;
        });
        
        this.notes.forEach(note => {
            stats.byType[note.type]++;
            stats.totalWords += note.text.split(/\s+/).length;
            stats.totalCharacters += note.text.length;
            note.linkedComponents.forEach(id => stats.linkedComponents.add(id));
        });
        
        stats.linkedComponents = stats.linkedComponents.size;
        
        return stats;
    }

    /**
     * 批量链接组件
     * @param {Array<string>} noteIds - 说明项ID列表
     * @param {string} componentId - 组件ID
     */
    linkComponentToNotes(componentId, noteIds) {
        noteIds.forEach(noteId => {
            const note = this.getNote(noteId);
            if (note) {
                note.linkComponent(componentId);
            }
        });
        this._notifyChange('componentLinked', { componentId, noteIds });
    }

    /**
     * 批量取消链接组件
     * @param {Array<string>} noteIds - 说明项ID列表
     * @param {string} componentId - 组件ID
     */
    unlinkComponentFromNotes(componentId, noteIds) {
        noteIds.forEach(noteId => {
            const note = this.getNote(noteId);
            if (note) {
                note.unlinkComponent(componentId);
            }
        });
        this._notifyChange('componentUnlinked', { componentId, noteIds });
    }

    /**
     * 应用模板
     * @param {string} templateName - 模板名称
     */
    applyTemplate(templateName) {
        const templates = {
            'experiment-setup': [
                { type: NoteType.HEADER, text: 'Experimental Setup' },
                { type: NoteType.BULLET, text: 'Laser source: 780 nm' },
                { type: NoteType.BULLET, text: 'Beam diameter: 2 mm' },
                { type: NoteType.BULLET, text: 'Power: 10 mW' }
            ],
            'optical-parameters': [
                { type: NoteType.HEADER, text: 'Optical Parameters' },
                { type: NoteType.NUMBERED, text: 'Wavelength: λ = 780 nm' },
                { type: NoteType.NUMBERED, text: 'Focal length: f = 100 mm' },
                { type: NoteType.NUMBERED, text: 'Numerical aperture: NA = 0.25' }
            ],
            'safety-notes': [
                { type: NoteType.HEADER, text: 'Safety Considerations' },
                { type: NoteType.BULLET, text: 'Wear laser safety goggles' },
                { type: NoteType.BULLET, text: 'Avoid direct beam exposure' },
                { type: NoteType.BULLET, text: 'Use beam blocks when not in use' }
            ]
        };
        
        const template = templates[templateName];
        if (template) {
            template.forEach(noteConfig => {
                this.addNote(noteConfig);
            });
        }
    }

    /**
     * 注册变更监听器
     * @param {Function} callback
     * @returns {Function}
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
    _notifyChange(type, data) {
        this.changeListeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('TechnicalNotesManager: Error in change listener:', error);
            }
        });
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        return {
            notes: this.notes.map(n => n.serialize()),
            areaConfig: { ...this.areaConfig },
            defaultStyle: { ...this.defaultStyle }
        };
    }

    /**
     * 反序列化
     * @param {Object} data
     */
    deserialize(data) {
        this.notes = [];
        if (Array.isArray(data.notes)) {
            data.notes.forEach(noteData => {
                this.notes.push(NoteItem.deserialize(noteData));
            });
        }
        if (data.areaConfig) {
            this.areaConfig = { ...this.areaConfig, ...data.areaConfig };
        }
        if (data.defaultStyle) {
            this.defaultStyle = { ...this.defaultStyle, ...data.defaultStyle };
        }
    }
}

// 创建单例实例
let technicalNotesManagerInstance = null;

/**
 * 获取TechnicalNotesManager单例实例
 * @param {Object} options
 * @returns {TechnicalNotesManager}
 */
export function getTechnicalNotesManager(options = {}) {
    if (!technicalNotesManagerInstance) {
        technicalNotesManagerInstance = new TechnicalNotesManager(options);
    }
    return technicalNotesManagerInstance;
}

/**
 * 重置TechnicalNotesManager单例
 */
export function resetTechnicalNotesManager() {
    technicalNotesManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.TechnicalNotesManager = TechnicalNotesManager;
    window.NoteItem = NoteItem;
    window.NoteType = NoteType;
    window.getTechnicalNotesManager = getTechnicalNotesManager;
}
