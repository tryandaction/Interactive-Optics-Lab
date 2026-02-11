/**
 * ThemeManager.js - 主题管理器
 * 管理预设主题和自定义主题
 * 
 * Requirements: 10.2, 10.3, 10.4
 */

import { getStyleManager } from './StyleManager.js';

/**
 * 主题类
 */
export class Theme {
    constructor(config) {
        this.id = config.id || 'custom-theme';
        this.name = config.name || 'Custom Theme';
        this.description = config.description || '';
        this.author = config.author || 'Unknown';
        this.version = config.version || '1.0.0';
        
        // 全局样式
        this.globalStyle = config.globalStyle || {};
        
        // 样式类
        this.styleClasses = config.styleClasses || {};
        
        // 组件样式
        this.componentStyles = config.componentStyles || {};
        
        // 颜色方案
        this.colorScheme = config.colorScheme || {};
        
        // 预览图
        this.preview = config.preview || null;
    }

    /**
     * 应用主题
     */
    apply() {
        const styleManager = getStyleManager();
        styleManager.applyTheme(this);
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            author: this.author,
            version: this.version,
            globalStyle: { ...this.globalStyle },
            styleClasses: { ...this.styleClasses },
            componentStyles: { ...this.componentStyles },
            colorScheme: { ...this.colorScheme }
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        return new Theme(data);
    }
}

/**
 * 内置主题定义
 */
export const BUILTIN_THEMES = {
    /**
     * 专业主题 - 黑白简洁，适合论文发表
     */
    PROFESSIONAL: new Theme({
        id: 'professional',
        name: 'Professional',
        description: 'Clean black and white theme for academic publications',
        author: 'System',
        globalStyle: {
            backgroundColor: '#ffffff',
            gridColor: 'rgba(200, 200, 200, 0.3)',
            color: '#000000',
            fillColor: '#333333',
            lineWidth: 1.5,
            rayColor: '#000000',
            rayWidth: 2,
            textColor: '#000000',
            fontSize: 12,
            fontFamily: 'Arial, Helvetica, sans-serif',
            selectionColor: '#666666',
            guideColor: 'rgba(100, 100, 100, 0.8)'
        },
        styleClasses: {
            source: { color: '#000000', fillColor: '#666666', lineWidth: 2 },
            mirror: { color: '#000000', fillColor: '#888888', lineWidth: 1.5 },
            lens: { color: '#000000', fillColor: 'rgba(150, 150, 150, 0.3)', lineWidth: 1.5 },
            detector: { color: '#000000', fillColor: '#555555', lineWidth: 2 },
            modulator: { color: '#000000', fillColor: '#777777', lineWidth: 1.5 }
        },
        colorScheme: {
            primary: '#000000',
            secondary: '#666666',
            accent: '#333333',
            background: '#ffffff',
            text: '#000000'
        }
    }),

    /**
     * 学术主题 - 传统科学出版物风格
     */
    ACADEMIC: new Theme({
        id: 'academic',
        name: 'Academic',
        description: 'Traditional scientific publication style',
        author: 'System',
        globalStyle: {
            backgroundColor: '#ffffff',
            gridColor: 'rgba(180, 180, 180, 0.3)',
            color: '#1a1a1a',
            fillColor: '#4a4a4a',
            lineWidth: 1.8,
            rayColor: '#cc0000',
            rayWidth: 2,
            textColor: '#1a1a1a',
            fontSize: 11,
            fontFamily: 'Times New Roman, serif',
            selectionColor: '#0066cc',
            guideColor: 'rgba(0, 102, 204, 0.6)'
        },
        styleClasses: {
            source: { color: '#cc0000', fillColor: '#dd4444', lineWidth: 2 },
            mirror: { color: '#0066cc', fillColor: '#4488dd', lineWidth: 1.8 },
            lens: { color: '#0066cc', fillColor: 'rgba(68, 136, 221, 0.2)', lineWidth: 1.5 },
            detector: { color: '#009900', fillColor: '#44aa44', lineWidth: 2 },
            modulator: { color: '#9933cc', fillColor: '#aa66dd', lineWidth: 1.8 }
        },
        colorScheme: {
            primary: '#0066cc',
            secondary: '#cc0000',
            accent: '#009900',
            background: '#ffffff',
            text: '#1a1a1a'
        }
    }),

    /**
     * 演示主题 - 高对比度，适合演示文稿
     */
    PRESENTATION: new Theme({
        id: 'presentation',
        name: 'Presentation',
        description: 'High contrast theme for presentations and slides',
        author: 'System',
        globalStyle: {
            backgroundColor: '#ffffff',
            gridColor: 'rgba(200, 200, 200, 0.4)',
            color: '#000000',
            fillColor: '#2196F3',
            lineWidth: 3,
            rayColor: '#FF5722',
            rayWidth: 3,
            textColor: '#000000',
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'bold',
            selectionColor: '#FFC107',
            guideColor: 'rgba(255, 193, 7, 0.8)'
        },
        styleClasses: {
            source: { color: '#FF5722', fillColor: '#FF7043', lineWidth: 3 },
            mirror: { color: '#2196F3', fillColor: '#42A5F5', lineWidth: 3 },
            lens: { color: '#2196F3', fillColor: 'rgba(66, 165, 245, 0.4)', lineWidth: 2.5 },
            detector: { color: '#4CAF50', fillColor: '#66BB6A', lineWidth: 3 },
            modulator: { color: '#9C27B0', fillColor: '#BA68C8', lineWidth: 3 }
        },
        colorScheme: {
            primary: '#2196F3',
            secondary: '#FF5722',
            accent: '#FFC107',
            background: '#ffffff',
            text: '#000000'
        }
    }),

    /**
     * 暗色主题 - 深色背景，适合夜间工作
     */
    DARK: new Theme({
        id: 'dark',
        name: 'Dark Mode',
        description: 'Dark background theme for comfortable night work',
        author: 'System',
        globalStyle: {
            backgroundColor: '#1e1e1e',
            gridColor: 'rgba(100, 100, 100, 0.3)',
            color: '#e0e0e0',
            fillColor: '#888888',
            lineWidth: 2,
            rayColor: '#ff6b6b',
            rayWidth: 2,
            textColor: '#e0e0e0',
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            selectionColor: '#64b5f6',
            guideColor: 'rgba(100, 181, 246, 0.8)'
        },
        styleClasses: {
            source: { color: '#ff6b6b', fillColor: '#ff8787', lineWidth: 2 },
            mirror: { color: '#64b5f6', fillColor: '#90caf9', lineWidth: 2 },
            lens: { color: '#64b5f6', fillColor: 'rgba(144, 202, 249, 0.3)', lineWidth: 1.5 },
            detector: { color: '#81c784', fillColor: '#a5d6a7', lineWidth: 2 },
            modulator: { color: '#ba68c8', fillColor: '#ce93d8', lineWidth: 2 }
        },
        colorScheme: {
            primary: '#64b5f6',
            secondary: '#ff6b6b',
            accent: '#81c784',
            background: '#1e1e1e',
            text: '#e0e0e0'
        }
    }),

    /**
     * 彩色主题 - 丰富色彩，便于区分
     */
    COLORFUL: new Theme({
        id: 'colorful',
        name: 'Colorful',
        description: 'Rich colors for easy component identification',
        author: 'System',
        globalStyle: {
            backgroundColor: '#fafafa',
            gridColor: 'rgba(200, 200, 200, 0.3)',
            color: '#333333',
            fillColor: '#666666',
            lineWidth: 2,
            rayColor: '#e91e63',
            rayWidth: 2,
            textColor: '#333333',
            fontSize: 13,
            fontFamily: 'Arial, sans-serif',
            selectionColor: '#ff9800',
            guideColor: 'rgba(255, 152, 0, 0.8)'
        },
        styleClasses: {
            source: { color: '#f44336', fillColor: '#ef5350', lineWidth: 2 },
            mirror: { color: '#2196f3', fillColor: '#42a5f5', lineWidth: 2 },
            lens: { color: '#00bcd4', fillColor: 'rgba(38, 198, 218, 0.3)', lineWidth: 1.8 },
            detector: { color: '#4caf50', fillColor: '#66bb6a', lineWidth: 2 },
            modulator: { color: '#9c27b0', fillColor: '#ab47bc', lineWidth: 2 }
        },
        colorScheme: {
            primary: '#2196f3',
            secondary: '#f44336',
            accent: '#ff9800',
            background: '#fafafa',
            text: '#333333'
        }
    }),

    /**
     * 蓝图主题 - 工程蓝图风格
     */
    BLUEPRINT: new Theme({
        id: 'blueprint',
        name: 'Blueprint',
        description: 'Engineering blueprint style',
        author: 'System',
        globalStyle: {
            backgroundColor: '#0d47a1',
            gridColor: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fillColor: '#bbdefb',
            lineWidth: 1.5,
            rayColor: '#ffeb3b',
            rayWidth: 2,
            textColor: '#ffffff',
            fontSize: 12,
            fontFamily: 'Courier New, monospace',
            selectionColor: '#ffeb3b',
            guideColor: 'rgba(255, 235, 59, 0.8)'
        },
        styleClasses: {
            source: { color: '#ffeb3b', fillColor: '#fff59d', lineWidth: 2 },
            mirror: { color: '#ffffff', fillColor: '#e3f2fd', lineWidth: 1.5 },
            lens: { color: '#ffffff', fillColor: 'rgba(227, 242, 253, 0.3)', lineWidth: 1.5 },
            detector: { color: '#4caf50', fillColor: '#81c784', lineWidth: 2 },
            modulator: { color: '#ff9800', fillColor: '#ffb74d', lineWidth: 1.5 }
        },
        colorScheme: {
            primary: '#ffffff',
            secondary: '#ffeb3b',
            accent: '#4caf50',
            background: '#0d47a1',
            text: '#ffffff'
        }
    })
};

/**
 * 主题管理器类
 */
export class ThemeManager {
    constructor() {
        /** @type {Map<string, Theme>} */
        this.themes = new Map();
        
        /** @type {Theme|null} */
        this.currentTheme = null;
        
        /** @type {Theme|null} */
        this.previousTheme = null;
        
        // 注册内置主题
        this._registerBuiltinThemes();
    }

    /**
     * 注册内置主题
     * @private
     */
    _registerBuiltinThemes() {
        Object.values(BUILTIN_THEMES).forEach(theme => {
            this.themes.set(theme.id, theme);
        });
    }

    /**
     * 注册主题
     */
    registerTheme(theme) {
        if (!(theme instanceof Theme)) {
            theme = new Theme(theme);
        }
        this.themes.set(theme.id, theme);
        return theme;
    }

    /**
     * 获取主题
     */
    getTheme(themeId) {
        return this.themes.get(themeId) || null;
    }

    /**
     * 获取所有主题
     */
    getAllThemes() {
        return Array.from(this.themes.values());
    }

    /**
     * 获取内置主题
     */
    getBuiltinThemes() {
        return Object.values(BUILTIN_THEMES);
    }

    /**
     * 应用主题
     */
    applyTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) {
            console.warn(`ThemeManager: Theme "${themeId}" not found`);
            return false;
        }
        
        this.previousTheme = this.currentTheme;
        this.currentTheme = theme;
        theme.apply();
        
        // 触发主题变化事件
        this._dispatchThemeChange(theme);
        
        return true;
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 恢复上一个主题
     */
    restorePreviousTheme() {
        if (this.previousTheme) {
            return this.applyTheme(this.previousTheme.id);
        }
        return false;
    }

    /**
     * 创建自定义主题
     */
    createCustomTheme(config) {
        const theme = new Theme({
            id: config.id || `custom-${Date.now()}`,
            name: config.name || 'Custom Theme',
            ...config
        });
        
        this.registerTheme(theme);
        return theme;
    }

    /**
     * 从当前样式创建主题
     */
    createThemeFromCurrentStyle(name, description) {
        const styleManager = getStyleManager();
        const styles = styleManager.exportStyles();
        
        return this.createCustomTheme({
            name,
            description,
            globalStyle: styles.globalStyle,
            styleClasses: Object.fromEntries(styles.styleClasses),
            componentStyles: Object.fromEntries(styles.componentStyles)
        });
    }

    /**
     * 删除主题
     */
    deleteTheme(themeId) {
        // 不能删除内置主题
        if (Object.values(BUILTIN_THEMES).some(t => t.id === themeId)) {
            console.warn('Cannot delete builtin theme');
            return false;
        }
        
        return this.themes.delete(themeId);
    }

    /**
     * 导出主题
     */
    exportTheme(themeId) {
        const theme = this.themes.get(themeId);
        if (!theme) return null;
        
        return JSON.stringify(theme.serialize(), null, 2);
    }

    /**
     * 导入主题
     */
    importTheme(themeJson) {
        try {
            const data = typeof themeJson === 'string' ? JSON.parse(themeJson) : themeJson;
            const theme = Theme.deserialize(data);
            this.registerTheme(theme);
            return theme;
        } catch (e) {
            console.error('Failed to import theme:', e);
            return null;
        }
    }

    /**
     * 触发主题变化事件
     * @private
     */
    _dispatchThemeChange(theme) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('theme-change', {
                detail: { theme }
            }));
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            currentThemeId: this.currentTheme?.id || null,
            customThemes: Array.from(this.themes.values())
                .filter(t => !Object.values(BUILTIN_THEMES).includes(t))
                .map(t => t.serialize())
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        // 恢复自定义主题
        if (data.customThemes) {
            data.customThemes.forEach(themeData => {
                const theme = Theme.deserialize(themeData);
                this.registerTheme(theme);
            });
        }
        
        // 恢复当前主题
        if (data.currentThemeId) {
            this.applyTheme(data.currentThemeId);
        }
    }

    /**
     * 清除自定义主题
     */
    clearCustomThemes() {
        const customThemes = Array.from(this.themes.keys())
            .filter(id => !Object.values(BUILTIN_THEMES).some(t => t.id === id));
        
        customThemes.forEach(id => this.themes.delete(id));
    }
}

// ========== 单例模式 ==========
let themeManagerInstance = null;

export function getThemeManager() {
    if (!themeManagerInstance) {
        themeManagerInstance = new ThemeManager();
    }
    return themeManagerInstance;
}

export function resetThemeManager() {
    themeManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.Theme = Theme;
    window.ThemeManager = ThemeManager;
    window.getThemeManager = getThemeManager;
    window.BUILTIN_THEMES = BUILTIN_THEMES;
}
