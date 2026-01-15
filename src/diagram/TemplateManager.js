/**
 * TemplateManager.js - 导出模板管理器
 * 提供导出模板的保存、加载、编辑和导入导出功能
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { ExportFormat } from './ExportEngine.js';

/**
 * 生成唯一ID
 */
function generateTemplateId() {
    return 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 模板类型枚举
 */
export const TemplateType = {
    BUILTIN: 'builtin',
    CUSTOM: 'custom',
    IMPORTED: 'imported'
};

/**
 * 导出模板类
 */
export class ExportTemplate {
    /**
     * @param {Object} config - 模板配置
     */
    constructor(config = {}) {
        /** @type {string} 模板ID */
        this.id = config.id || generateTemplateId();
        
        /** @type {string} 模板名称 */
        this.name = config.name || '未命名模板';
        
        /** @type {string} 模板描述 */
        this.description = config.description || '';
        
        /** @type {string} 模板类型 */
        this.type = config.type || TemplateType.CUSTOM;
        
        /** @type {string} 导出格式 */
        this.format = config.format || ExportFormat.SVG;
        
        /** @type {number} 宽度 */
        this.width = config.width || 1920;
        
        /** @type {number} 高度 */
        this.height = config.height || 1080;
        
        /** @type {number} DPI */
        this.dpi = config.dpi || 300;
        
        /** @type {string} 背景颜色 */
        this.backgroundColor = config.backgroundColor || '#ffffff';
        
        /** @type {number} 边距 */
        this.margin = config.margin || 20;
        
        /** @type {boolean} 包含标注 */
        this.includeAnnotations = config.includeAnnotations !== false;
        
        /** @type {boolean} 包含技术说明 */
        this.includeNotes = config.includeNotes !== false;
        
        /** @type {boolean} 包含网格 */
        this.includeGrid = config.includeGrid || false;
        
        /** @type {boolean} 包含参数标签 */
        this.includeParameters = config.includeParameters || false;
        
        /** @type {Object} 光路样式 */
        this.rayStyle = {
            color: '#FF0000',
            lineWidth: 2,
            lineStyle: 'solid',
            ...config.rayStyle
        };
        
        /** @type {Object} 符号样式 */
        this.symbolStyle = {
            color: '#000000',
            lineWidth: 2,
            size: 30,
            ...config.symbolStyle
        };
        
        /** @type {number} 创建时间 */
        this.createdAt = config.createdAt || Date.now();
        
        /** @type {number} 更新时间 */
        this.updatedAt = config.updatedAt || Date.now();
    }

    /**
     * 更新模板
     * @param {Object} updates - 更新内容
     */
    update(updates) {
        Object.keys(updates).forEach(key => {
            if (key !== 'id' && key !== 'type' && key !== 'createdAt') {
                if (key === 'rayStyle' || key === 'symbolStyle') {
                    this[key] = { ...this[key], ...updates[key] };
                } else {
                    this[key] = updates[key];
                }
            }
        });
        this.updatedAt = Date.now();
    }

    /**
     * 转换为导出配置
     * @returns {Object}
     */
    toExportConfig() {
        return {
            format: this.format,
            width: this.width,
            height: this.height,
            dpi: this.dpi,
            backgroundColor: this.backgroundColor,
            margin: this.margin,
            includeAnnotations: this.includeAnnotations,
            includeNotes: this.includeNotes,
            includeGrid: this.includeGrid,
            includeParameters: this.includeParameters,
            rayStyle: { ...this.rayStyle },
            symbolStyle: { ...this.symbolStyle }
        };
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            type: this.type,
            format: this.format,
            width: this.width,
            height: this.height,
            dpi: this.dpi,
            backgroundColor: this.backgroundColor,
            margin: this.margin,
            includeAnnotations: this.includeAnnotations,
            includeNotes: this.includeNotes,
            includeGrid: this.includeGrid,
            includeParameters: this.includeParameters,
            rayStyle: { ...this.rayStyle },
            symbolStyle: { ...this.symbolStyle },
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * 反序列化
     * @param {Object} data
     * @returns {ExportTemplate}
     */
    static deserialize(data) {
        return new ExportTemplate(data);
    }
}

/**
 * 模板管理器类
 */
export class TemplateManager {
    constructor(options = {}) {
        /** @type {Map<string, ExportTemplate>} 模板存储 */
        this.templates = new Map();
        
        /** @type {string} 存储键名 */
        this.storageKey = options.storageKey || 'opticslab_export_templates';
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
        
        // 初始化内置模板
        this._initBuiltinTemplates();
        
        // 加载自定义模板
        this._loadFromStorage();
    }

    /**
     * 初始化内置模板
     * @private
     */
    _initBuiltinTemplates() {
        const builtinTemplates = [
            {
                id: 'journal',
                name: '期刊论文',
                description: '适用于学术期刊发表的高分辨率图像',
                type: TemplateType.BUILTIN,
                format: ExportFormat.PDF,
                width: 3000,
                height: 2000,
                dpi: 300,
                backgroundColor: '#ffffff',
                margin: 40,
                includeAnnotations: true,
                includeNotes: true,
                includeGrid: false,
                includeParameters: true
            },
            {
                id: 'presentation',
                name: '演示文稿',
                description: '适用于PPT/Keynote演示的16:9图像',
                type: TemplateType.BUILTIN,
                format: ExportFormat.PNG,
                width: 1920,
                height: 1080,
                dpi: 150,
                backgroundColor: '#ffffff',
                margin: 20,
                includeAnnotations: true,
                includeNotes: false,
                includeGrid: false,
                includeParameters: false
            },
            {
                id: 'poster',
                name: '海报',
                description: '适用于学术海报的大尺寸高分辨率图像',
                type: TemplateType.BUILTIN,
                format: ExportFormat.PDF,
                width: 4000,
                height: 3000,
                dpi: 300,
                backgroundColor: '#ffffff',
                margin: 60,
                includeAnnotations: true,
                includeNotes: true,
                includeGrid: false,
                includeParameters: true
            },
            {
                id: 'web',
                name: '网页',
                description: '适用于网页展示的矢量图',
                type: TemplateType.BUILTIN,
                format: ExportFormat.SVG,
                width: 1200,
                height: 800,
                dpi: 96,
                backgroundColor: 'transparent',
                margin: 10,
                includeAnnotations: true,
                includeNotes: false,
                includeGrid: false,
                includeParameters: false
            },
            {
                id: 'thesis',
                name: '学位论文',
                description: '适用于学位论文的标准图像',
                type: TemplateType.BUILTIN,
                format: ExportFormat.PDF,
                width: 2400,
                height: 1600,
                dpi: 300,
                backgroundColor: '#ffffff',
                margin: 30,
                includeAnnotations: true,
                includeNotes: true,
                includeGrid: false,
                includeParameters: true
            }
        ];

        builtinTemplates.forEach(config => {
            this.templates.set(config.id, new ExportTemplate(config));
        });
    }

    /**
     * 从存储加载模板
     * @private
     */
    _loadFromStorage() {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                if (Array.isArray(data)) {
                    data.forEach(templateData => {
                        const template = ExportTemplate.deserialize(templateData);
                        this.templates.set(template.id, template);
                    });
                }
            }
        } catch (error) {
            console.warn('TemplateManager: Error loading templates from storage:', error);
        }
    }

    /**
     * 保存到存储
     * @private
     */
    _saveToStorage() {
        if (typeof localStorage === 'undefined') return;

        try {
            const customTemplates = this.getCustomTemplates().map(t => t.serialize());
            localStorage.setItem(this.storageKey, JSON.stringify(customTemplates));
        } catch (error) {
            console.warn('TemplateManager: Error saving templates to storage:', error);
        }
    }

    /**
     * 获取模板
     * @param {string} templateId - 模板ID
     * @returns {ExportTemplate|null}
     */
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }

    /**
     * 获取所有模板
     * @returns {ExportTemplate[]}
     */
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * 获取内置模板
     * @returns {ExportTemplate[]}
     */
    getBuiltinTemplates() {
        return this.getAllTemplates().filter(t => t.type === TemplateType.BUILTIN);
    }

    /**
     * 获取自定义模板
     * @returns {ExportTemplate[]}
     */
    getCustomTemplates() {
        return this.getAllTemplates().filter(t => t.type !== TemplateType.BUILTIN);
    }

    /**
     * 创建模板
     * @param {Object} config - 模板配置
     * @returns {ExportTemplate}
     */
    createTemplate(config) {
        const template = new ExportTemplate({
            ...config,
            type: TemplateType.CUSTOM
        });
        
        this.templates.set(template.id, template);
        this._saveToStorage();
        this._notifyChange('templateCreated', template);
        
        return template;
    }

    /**
     * 更新模板
     * @param {string} templateId - 模板ID
     * @param {Object} updates - 更新内容
     * @returns {ExportTemplate|null}
     */
    updateTemplate(templateId, updates) {
        const template = this.templates.get(templateId);
        if (!template || template.type === TemplateType.BUILTIN) {
            return null;
        }
        
        template.update(updates);
        this._saveToStorage();
        this._notifyChange('templateUpdated', template);
        
        return template;
    }

    /**
     * 删除模板
     * @param {string} templateId - 模板ID
     * @returns {boolean}
     */
    deleteTemplate(templateId) {
        const template = this.templates.get(templateId);
        if (!template || template.type === TemplateType.BUILTIN) {
            return false;
        }
        
        this.templates.delete(templateId);
        this._saveToStorage();
        this._notifyChange('templateDeleted', templateId);
        
        return true;
    }

    /**
     * 复制模板
     * @param {string} templateId - 源模板ID
     * @param {string} [newName] - 新名称
     * @returns {ExportTemplate|null}
     */
    duplicateTemplate(templateId, newName) {
        const source = this.templates.get(templateId);
        if (!source) return null;
        
        const config = source.serialize();
        delete config.id;
        config.name = newName || `${source.name} (副本)`;
        config.type = TemplateType.CUSTOM;
        config.createdAt = Date.now();
        config.updatedAt = Date.now();
        
        return this.createTemplate(config);
    }

    /**
     * 导出模板为JSON
     * @param {string} templateId - 模板ID
     * @returns {string|null}
     */
    exportTemplateJSON(templateId) {
        const template = this.templates.get(templateId);
        if (!template) return null;
        
        return JSON.stringify(template.serialize(), null, 2);
    }

    /**
     * 导出所有自定义模板为JSON
     * @returns {string}
     */
    exportAllTemplatesJSON() {
        const templates = this.getCustomTemplates().map(t => t.serialize());
        return JSON.stringify(templates, null, 2);
    }

    /**
     * 从JSON导入模板
     * @param {string} jsonString - JSON字符串
     * @returns {ExportTemplate|ExportTemplate[]|null}
     */
    importTemplateJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (Array.isArray(data)) {
                // 批量导入
                const imported = [];
                data.forEach(templateData => {
                    delete templateData.id; // 生成新ID
                    templateData.type = TemplateType.IMPORTED;
                    const template = this.createTemplate(templateData);
                    imported.push(template);
                });
                return imported;
            } else {
                // 单个导入
                delete data.id;
                data.type = TemplateType.IMPORTED;
                return this.createTemplate(data);
            }
        } catch (error) {
            console.error('TemplateManager: Error importing template:', error);
            return null;
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
                console.error('TemplateManager: Error in change listener:', error);
            }
        });
    }
}

// 创建单例实例
let templateManagerInstance = null;

/**
 * 获取TemplateManager单例实例
 * @param {Object} options
 * @returns {TemplateManager}
 */
export function getTemplateManager(options = {}) {
    if (!templateManagerInstance) {
        templateManagerInstance = new TemplateManager(options);
    }
    return templateManagerInstance;
}

/**
 * 重置TemplateManager单例
 */
export function resetTemplateManager() {
    templateManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
    window.ExportTemplate = ExportTemplate;
    window.TemplateType = TemplateType;
    window.getTemplateManager = getTemplateManager;
}
