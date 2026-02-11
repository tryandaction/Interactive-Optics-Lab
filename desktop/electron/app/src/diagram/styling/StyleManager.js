/**
 * StyleManager.js - 样式管理器
 * 管理组件样式、主题和视觉外观
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

/**
 * 样式属性定义
 */
export const StyleProperties = {
    // 颜色
    COLOR: 'color',
    FILL_COLOR: 'fillColor',
    STROKE_COLOR: 'strokeColor',
    BACKGROUND_COLOR: 'backgroundColor',
    
    // 线条
    LINE_WIDTH: 'lineWidth',
    LINE_STYLE: 'lineStyle',
    LINE_CAP: 'lineCap',
    LINE_JOIN: 'lineJoin',
    
    // 字体
    FONT_SIZE: 'fontSize',
    FONT_FAMILY: 'fontFamily',
    FONT_WEIGHT: 'fontWeight',
    FONT_STYLE: 'fontStyle',
    
    // 间距
    PADDING: 'padding',
    MARGIN: 'margin',
    SPACING: 'spacing',
    
    // 效果
    OPACITY: 'opacity',
    SHADOW: 'shadow',
    GLOW: 'glow'
};

/**
 * 默认样式
 */
export const DEFAULT_STYLE = {
    // 组件样式
    color: '#333333',
    fillColor: '#666666',
    strokeColor: '#333333',
    lineWidth: 2,
    lineStyle: 'solid',
    opacity: 1.0,
    
    // 光线样式
    rayColor: '#ff0000',
    rayWidth: 2,
    rayOpacity: 0.8,
    
    // 文本样式
    fontSize: 14,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textColor: '#333333',
    
    // 背景
    backgroundColor: '#ffffff',
    gridColor: 'rgba(200, 200, 200, 0.3)',
    
    // 选择
    selectionColor: '#4488ff',
    selectionWidth: 2,
    
    // 参考线
    guideColor: 'rgba(255, 100, 100, 0.8)',
    guideWidth: 1
};

/**
 * 样式管理器类
 */
export class StyleManager {
    constructor() {
        /** @type {Map<string, Object>} 组件样式 */
        this.componentStyles = new Map();
        
        /** @type {Object} 全局样式 */
        this.globalStyle = { ...DEFAULT_STYLE };
        
        /** @type {Map<string, Object>} 样式类 */
        this.styleClasses = new Map();
        
        /** @type {Object} 当前主题 */
        this.currentTheme = null;
        
        /** @type {Map<string, Object>} 样式继承链 */
        this.styleInheritance = new Map();
        
        // 初始化默认样式类
        this._initializeDefaultClasses();
    }

    /**
     * 初始化默认样式类
     * @private
     */
    _initializeDefaultClasses() {
        // 光源样式
        this.registerStyleClass('source', {
            color: '#ff6600',
            fillColor: '#ff8833',
            lineWidth: 2
        });
        
        // 镜子样式
        this.registerStyleClass('mirror', {
            color: '#4488ff',
            fillColor: '#6699ff',
            lineWidth: 2
        });
        
        // 透镜样式
        this.registerStyleClass('lens', {
            color: '#3366aa',
            fillColor: 'rgba(100, 180, 255, 0.3)',
            lineWidth: 1.5
        });
        
        // 探测器样式
        this.registerStyleClass('detector', {
            color: '#44cc44',
            fillColor: '#66dd66',
            lineWidth: 2
        });
        
        // 调制器样式
        this.registerStyleClass('modulator', {
            color: '#9966cc',
            fillColor: '#aa88dd',
            lineWidth: 2
        });
    }

    /**
     * 注册样式类
     */
    registerStyleClass(className, style) {
        this.styleClasses.set(className, { ...style });
    }

    /**
     * 获取样式类
     */
    getStyleClass(className) {
        return this.styleClasses.get(className) || null;
    }

    /**
     * 设置组件样式
     */
    setComponentStyle(componentId, style, merge = true) {
        if (merge && this.componentStyles.has(componentId)) {
            const existing = this.componentStyles.get(componentId);
            this.componentStyles.set(componentId, { ...existing, ...style });
        } else {
            this.componentStyles.set(componentId, { ...style });
        }
    }

    /**
     * 获取组件样式
     */
    getComponentStyle(componentId) {
        return this.componentStyles.get(componentId) || null;
    }

    /**
     * 移除组件样式
     */
    removeComponentStyle(componentId) {
        return this.componentStyles.delete(componentId);
    }

    /**
     * 应用样式类到组件
     */
    applyStyleClass(componentId, className) {
        const styleClass = this.styleClasses.get(className);
        if (styleClass) {
            this.setComponentStyle(componentId, styleClass, true);
            return true;
        }
        return false;
    }

    /**
     * 获取有效样式（考虑继承和全局样式）
     */
    getEffectiveStyle(componentId, componentType = null) {
        let style = { ...this.globalStyle };
        
        // 应用类型默认样式
        if (componentType) {
            const typeClass = this.styleClasses.get(componentType.toLowerCase());
            if (typeClass) {
                style = { ...style, ...typeClass };
            }
        }
        
        // 应用组件特定样式
        const componentStyle = this.componentStyles.get(componentId);
        if (componentStyle) {
            style = { ...style, ...componentStyle };
        }
        
        return style;
    }

    /**
     * 设置全局样式
     */
    setGlobalStyle(style, merge = true) {
        if (merge) {
            this.globalStyle = { ...this.globalStyle, ...style };
        } else {
            this.globalStyle = { ...DEFAULT_STYLE, ...style };
        }
    }

    /**
     * 获取全局样式
     */
    getGlobalStyle() {
        return { ...this.globalStyle };
    }

    /**
     * 重置全局样式
     */
    resetGlobalStyle() {
        this.globalStyle = { ...DEFAULT_STYLE };
    }

    /**
     * 应用主题
     */
    applyTheme(theme) {
        this.currentTheme = theme;
        
        // 应用主题的全局样式
        if (theme.globalStyle) {
            this.setGlobalStyle(theme.globalStyle, false);
        }
        
        // 应用主题的样式类
        if (theme.styleClasses) {
            Object.entries(theme.styleClasses).forEach(([className, style]) => {
                this.registerStyleClass(className, style);
            });
        }
        
        // 应用主题的组件样式
        if (theme.componentStyles) {
            Object.entries(theme.componentStyles).forEach(([componentId, style]) => {
                this.setComponentStyle(componentId, style, false);
            });
        }
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 创建样式预设
     */
    createPreset(name, style) {
        this.registerStyleClass(`preset-${name}`, style);
    }

    /**
     * 应用样式预设
     */
    applyPreset(componentId, presetName) {
        return this.applyStyleClass(componentId, `preset-${presetName}`);
    }

    /**
     * 批量设置样式
     */
    setBatchStyle(componentIds, style) {
        componentIds.forEach(id => {
            this.setComponentStyle(id, style, true);
        });
    }

    /**
     * 复制样式
     */
    copyStyle(sourceId, targetId) {
        const sourceStyle = this.componentStyles.get(sourceId);
        if (sourceStyle) {
            this.componentStyles.set(targetId, { ...sourceStyle });
            return true;
        }
        return false;
    }

    /**
     * 应用样式到Canvas上下文
     */
    applyToContext(ctx, componentId, componentType = null) {
        const style = this.getEffectiveStyle(componentId, componentType);
        
        if (style.color) ctx.strokeStyle = style.color;
        if (style.fillColor) ctx.fillStyle = style.fillColor;
        if (style.lineWidth) ctx.lineWidth = style.lineWidth;
        if (style.opacity !== undefined) ctx.globalAlpha = style.opacity;
        
        if (style.lineStyle) {
            switch (style.lineStyle) {
                case 'dashed':
                    ctx.setLineDash([10, 5]);
                    break;
                case 'dotted':
                    ctx.setLineDash([2, 4]);
                    break;
                case 'solid':
                default:
                    ctx.setLineDash([]);
                    break;
            }
        }
        
        if (style.lineCap) ctx.lineCap = style.lineCap;
        if (style.lineJoin) ctx.lineJoin = style.lineJoin;
        
        if (style.fontSize && style.fontFamily) {
            ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize}px ${style.fontFamily}`;
        }
    }

    /**
     * 导出样式
     */
    exportStyles() {
        return {
            globalStyle: { ...this.globalStyle },
            componentStyles: Array.from(this.componentStyles.entries()),
            styleClasses: Array.from(this.styleClasses.entries()),
            currentTheme: this.currentTheme ? { ...this.currentTheme } : null
        };
    }

    /**
     * 导入样式
     */
    importStyles(data) {
        if (data.globalStyle) {
            this.globalStyle = { ...data.globalStyle };
        }
        
        if (data.componentStyles) {
            this.componentStyles.clear();
            data.componentStyles.forEach(([id, style]) => {
                this.componentStyles.set(id, style);
            });
        }
        
        if (data.styleClasses) {
            data.styleClasses.forEach(([className, style]) => {
                this.styleClasses.set(className, style);
            });
        }
        
        if (data.currentTheme) {
            this.currentTheme = data.currentTheme;
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return this.exportStyles();
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        this.importStyles(data);
    }

    /**
     * 清除所有样式
     */
    clear() {
        this.componentStyles.clear();
        this.globalStyle = { ...DEFAULT_STYLE };
        this.currentTheme = null;
        this._initializeDefaultClasses();
    }
}

// ========== 单例模式 ==========
let styleManagerInstance = null;

export function getStyleManager() {
    if (!styleManagerInstance) {
        styleManagerInstance = new StyleManager();
    }
    return styleManagerInstance;
}

export function resetStyleManager() {
    styleManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.StyleManager = StyleManager;
    window.getStyleManager = getStyleManager;
    window.StyleProperties = StyleProperties;
    window.DEFAULT_STYLE = DEFAULT_STYLE;
}
