/**
 * ColorUtils.js - 颜色工具函数
 * 提供颜色转换和处理功能
 */

/**
 * 将十六进制颜色转换为RGBA格式
 * @param {string} hex - 十六进制颜色 (如 '#FF0000')
 * @param {number} alpha - 透明度 (0-1)
 * @returns {string} RGBA颜色字符串
 */
export function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(0, 0, 0, ${alpha})`;
    
    // 移除 # 前缀
    hex = hex.replace(/^#/, '');
    
    // 处理简写形式 (如 #F00)
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0, 0, 0, ${alpha})`;
    }
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 将RGB值转换为十六进制颜色
 * @param {number} r - 红色分量 (0-255)
 * @param {number} g - 绿色分量 (0-255)
 * @param {number} b - 蓝色分量 (0-255)
 * @returns {string} 十六进制颜色字符串
 */
export function rgbToHex(r, g, b) {
    const toHex = (c) => {
        const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 将波长转换为RGB颜色
 * @param {number} wavelengthNm - 波长（纳米）
 * @returns {Object} RGB颜色对象 {r, g, b}
 */
export function wavelengthToRgb(wavelengthNm) {
    let r = 0, g = 0, b = 0;
    
    if (wavelengthNm >= 380 && wavelengthNm < 440) {
        r = -(wavelengthNm - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
        r = 0;
        g = (wavelengthNm - 440) / (490 - 440);
        b = 1;
    } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
        r = 0;
        g = 1;
        b = -(wavelengthNm - 510) / (510 - 490);
    } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
        r = (wavelengthNm - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
        r = 1;
        g = -(wavelengthNm - 645) / (645 - 580);
        b = 0;
    } else if (wavelengthNm >= 645 && wavelengthNm <= 780) {
        r = 1;
        g = 0;
        b = 0;
    }
    
    // 边缘衰减
    let factor = 1.0;
    if (wavelengthNm >= 380 && wavelengthNm < 420) {
        factor = 0.3 + 0.7 * (wavelengthNm - 380) / (420 - 380);
    } else if (wavelengthNm >= 700 && wavelengthNm <= 780) {
        factor = 0.3 + 0.7 * (780 - wavelengthNm) / (780 - 700);
    }
    
    return {
        r: Math.round(255 * r * factor),
        g: Math.round(255 * g * factor),
        b: Math.round(255 * b * factor)
    };
}

/**
 * 将波长转换为十六进制颜色
 * @param {number} wavelengthNm - 波长（纳米）
 * @returns {string} 十六进制颜色字符串
 */
export function wavelengthToHex(wavelengthNm) {
    const { r, g, b } = wavelengthToRgb(wavelengthNm);
    return rgbToHex(r, g, b);
}

/**
 * 混合两种颜色
 * @param {string} color1 - 第一种颜色（十六进制）
 * @param {string} color2 - 第二种颜色（十六进制）
 * @param {number} ratio - 混合比例 (0-1, 0=全color1, 1=全color2)
 * @returns {string} 混合后的十六进制颜色
 */
export function blendColors(color1, color2, ratio = 0.5) {
    const parseHex = (hex) => {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    };
    
    const c1 = parseHex(color1);
    const c2 = parseHex(color2);
    
    const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
    const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
    const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
    
    return rgbToHex(r, g, b);
}

/**
 * 调整颜色亮度
 * @param {string} hex - 十六进制颜色
 * @param {number} factor - 亮度因子 (>1 变亮, <1 变暗)
 * @returns {string} 调整后的十六进制颜色
 */
export function adjustBrightness(hex, factor) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    
    r = Math.min(255, Math.max(0, Math.round(r * factor)));
    g = Math.min(255, Math.max(0, Math.round(g * factor)));
    b = Math.min(255, Math.max(0, Math.round(b * factor)));
    
    return rgbToHex(r, g, b);
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ColorUtils = {
        hexToRgba,
        rgbToHex,
        wavelengthToRgb,
        wavelengthToHex,
        blendColors,
        adjustBrightness
    };
    // 保持旧的全局函数兼容
    window.hexToRgba = hexToRgba;
}
