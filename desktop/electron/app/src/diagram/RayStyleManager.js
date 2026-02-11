/**
 * RayStyleManager.js - 光路样式管理器
 * 提供光路线型、颜色、粗细等样式定制功能
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * 线型枚举
 */
export const LineStyle = {
    SOLID: 'solid',
    DASHED: 'dashed',
    DOTTED: 'dotted'
};

/**
 * 预设配色方案
 */
export const ColorSchemes = {
    DEFAULT: {
        name: '默认',
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00']
    },
    MONOCHROME: {
        name: '单色',
        colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC']
    },
    PUBLICATION: {
        name: '论文发表',
        colors: ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33']
    },
    COLORBLIND_SAFE: {
        name: '色盲友好',
        colors: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#F0E442', '#56B4E9']
    },
    GRAYSCALE: {
        name: '灰度',
        colors: ['#000000', '#404040', '#808080', '#A0A0A0', '#C0C0C0']
    }
};

/**
 * 光路样式配置
 * @typedef {Object} RayStyle
 * @property {string} color - 颜色
 * @property {number} lineWidth - 线宽
 * @property {string} lineStyle - 线型
 * @property {number} opacity - 透明度 (0-1)
 * @property {boolean} showArrow - 是否显示箭头
 * @property {number} arrowSize - 箭头大小
 */

/**
 * 光路样式管理器类
 */
export class RayStyleManager {
    constructor(options = {}) {
        /** @type {Map<string, RayStyle>} 光路ID到样式的映射 */
        this.rayStyles = new Map();
        
        /** @type {RayStyle} 默认样式 */
        this.defaultStyle = {
            color: '#FF0000',
            lineWidth: 2,
            lineStyle: LineStyle.SOLID,
            opacity: 1,
            showArrow: true,
            arrowSize: 8,
            ...options.defaultStyle
        };
        
        /** @type {string} 当前配色方案 */
        this.currentScheme = options.colorScheme || 'DEFAULT';
        
        /** @type {number} 颜色索引（用于自动分配颜色） */
        this.colorIndex = 0;
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
    }

    /**
     * 获取光路样式
     * @param {string} rayId - 光路ID
     * @returns {RayStyle}
     */
    getStyle(rayId) {
        return this.rayStyles.get(rayId) || { ...this.defaultStyle };
    }

    /**
     * 设置光路样式
     * @param {string} rayId - 光路ID
     * @param {Partial<RayStyle>} style - 样式配置
     */
    setStyle(rayId, style) {
        const currentStyle = this.getStyle(rayId);
        const newStyle = { ...currentStyle, ...style };
        this.rayStyles.set(rayId, newStyle);
        this._notifyChange('styleChanged', { rayId, style: newStyle });
    }

    /**
     * 设置光路颜色
     * @param {string} rayId - 光路ID
     * @param {string} color - 颜色值
     */
    setColor(rayId, color) {
        this.setStyle(rayId, { color });
    }

    /**
     * 设置光路线宽
     * @param {string} rayId - 光路ID
     * @param {number} lineWidth - 线宽
     */
    setLineWidth(rayId, lineWidth) {
        if (lineWidth > 0 && lineWidth <= 20) {
            this.setStyle(rayId, { lineWidth });
        }
    }

    /**
     * 设置光路线型
     * @param {string} rayId - 光路ID
     * @param {string} lineStyle - 线型
     */
    setLineStyle(rayId, lineStyle) {
        if (Object.values(LineStyle).includes(lineStyle)) {
            this.setStyle(rayId, { lineStyle });
        }
    }

    /**
     * 设置光路透明度
     * @param {string} rayId - 光路ID
     * @param {number} opacity - 透明度 (0-1)
     */
    setOpacity(rayId, opacity) {
        if (opacity >= 0 && opacity <= 1) {
            this.setStyle(rayId, { opacity });
        }
    }

    /**
     * 删除光路样式
     * @param {string} rayId - 光路ID
     */
    removeStyle(rayId) {
        this.rayStyles.delete(rayId);
        this._notifyChange('styleRemoved', { rayId });
    }

    /**
     * 清除所有自定义样式
     */
    clearAllStyles() {
        this.rayStyles.clear();
        this.colorIndex = 0;
        this._notifyChange('allStylesCleared', null);
    }

    /**
     * 自动分配颜色
     * @param {string} rayId - 光路ID
     * @returns {string} 分配的颜色
     */
    autoAssignColor(rayId) {
        const scheme = ColorSchemes[this.currentScheme] || ColorSchemes.DEFAULT;
        const color = scheme.colors[this.colorIndex % scheme.colors.length];
        this.colorIndex++;
        this.setColor(rayId, color);
        return color;
    }

    /**
     * 设置配色方案
     * @param {string} schemeName - 方案名称
     */
    setColorScheme(schemeName) {
        if (ColorSchemes[schemeName]) {
            this.currentScheme = schemeName;
            this.colorIndex = 0;
            this._notifyChange('schemeChanged', { scheme: schemeName });
        }
    }

    /**
     * 获取当前配色方案
     * @returns {Object}
     */
    getCurrentScheme() {
        return ColorSchemes[this.currentScheme] || ColorSchemes.DEFAULT;
    }

    /**
     * 获取所有配色方案
     * @returns {Object}
     */
    getAllSchemes() {
        return { ...ColorSchemes };
    }

    /**
     * 设置默认样式
     * @param {Partial<RayStyle>} style - 样式配置
     */
    setDefaultStyle(style) {
        this.defaultStyle = { ...this.defaultStyle, ...style };
        this._notifyChange('defaultStyleChanged', { style: this.defaultStyle });
    }

    /**
     * 应用样式到Canvas上下文
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {string} rayId - 光路ID
     */
    applyToContext(ctx, rayId) {
        const style = this.getStyle(rayId);
        
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.lineWidth;
        ctx.globalAlpha = style.opacity;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 设置线型
        switch (style.lineStyle) {
            case LineStyle.DASHED:
                ctx.setLineDash([10, 5]);
                break;
            case LineStyle.DOTTED:
                ctx.setLineDash([2, 3]);
                break;
            default:
                ctx.setLineDash([]);
        }
    }

    /**
     * 重置Canvas上下文
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     */
    resetContext(ctx) {
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
    }

    /**
     * 渲染光路箭头
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} x - 箭头位置X
     * @param {number} y - 箭头位置Y
     * @param {number} angle - 箭头方向（弧度）
     * @param {string} rayId - 光路ID
     */
    renderArrow(ctx, x, y, angle, rayId) {
        const style = this.getStyle(rayId);
        if (!style.showArrow) return;
        
        const size = style.arrowSize;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.fillStyle = style.color;
        ctx.globalAlpha = style.opacity;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size * 0.5);
        ctx.lineTo(-size, size * 0.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * 注册变更监听器
     * @param {Function} callback - 回调函数
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
    _notifyChange(type, data) {
        this.changeListeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('RayStyleManager: Error in change listener:', error);
            }
        });
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        const styles = {};
        this.rayStyles.forEach((style, rayId) => {
            styles[rayId] = { ...style };
        });
        
        return {
            defaultStyle: { ...this.defaultStyle },
            currentScheme: this.currentScheme,
            rayStyles: styles
        };
    }

    /**
     * 反序列化
     * @param {Object} data - 序列化数据
     */
    deserialize(data) {
        if (data.defaultStyle) {
            this.defaultStyle = { ...this.defaultStyle, ...data.defaultStyle };
        }
        if (data.currentScheme) {
            this.currentScheme = data.currentScheme;
        }
        if (data.rayStyles) {
            this.rayStyles.clear();
            Object.entries(data.rayStyles).forEach(([rayId, style]) => {
                this.rayStyles.set(rayId, style);
            });
        }
    }
}

// 创建单例实例
let rayStyleManagerInstance = null;

/**
 * 获取RayStyleManager单例实例
 * @param {Object} options - 配置选项
 * @returns {RayStyleManager}
 */
export function getRayStyleManager(options = {}) {
    if (!rayStyleManagerInstance) {
        rayStyleManagerInstance = new RayStyleManager(options);
    }
    return rayStyleManagerInstance;
}

/**
 * 重置RayStyleManager单例
 */
export function resetRayStyleManager() {
    rayStyleManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.RayStyleManager = RayStyleManager;
    window.LineStyle = LineStyle;
    window.ColorSchemes = ColorSchemes;
    window.getRayStyleManager = getRayStyleManager;
}
