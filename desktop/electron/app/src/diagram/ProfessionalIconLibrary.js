/**
 * ProfessionalIconLibrary.js - 专业图标库
 * 包含高质量SVG光学元件图标
 * 图标来源: ComponentLibrary (gwoptics.de) - CC BY-NC 3.0
 * 
 * Requirements: 1.2, 6.1, 6.4
 */

import { getProfessionalIconManager, CONNECTION_POINT_TYPES, ICON_CATEGORIES } from './ProfessionalIconManager.js';

/**
 * 专业SVG图标定义
 * 这些SVG基于ComponentLibrary风格设计，提供3D效果的专业光学元件图标
 */
export const PROFESSIONAL_SVG_ICONS = {
    // ========== 激光光源 ==========
    LaserDiode: {
        name: '激光二极管',
        category: ICON_CATEGORIES.SOURCES,
        width: 60,
        height: 30,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="ldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#888"/>
                    <stop offset="50%" style="stop-color:#aaa"/>
                    <stop offset="100%" style="stop-color:#666"/>
                </linearGradient>
            </defs>
            <rect x="2" y="5" width="45" height="20" fill="url(#ldGrad)" stroke="#333" stroke-width="1"/>
            <rect x="47" y="10" width="3" height="10" fill="#4488ff"/>
            <line x1="50" y1="15" x2="58" y2="15" stroke="#ff0000" stroke-width="2"/>
        </svg>`
    },

    // ========== 高级反射镜 ==========
    CurvedMirror: {
        name: '曲面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 15,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.3, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.3, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 15 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="cmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#aaccff"/>
                    <stop offset="50%" style="stop-color:#ffffff"/>
                    <stop offset="100%" style="stop-color:#88aadd"/>
                </linearGradient>
            </defs>
            <path d="M 12 2 Q 3 30 12 58" fill="none" stroke="url(#cmGrad)" stroke-width="4"/>
            <path d="M 12 2 Q 3 30 12 58" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    PiezoMirror: {
        name: '压电反射镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 40,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.2, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.2, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#aaccff"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#88aadd"/>
                </linearGradient>
            </defs>
            <rect x="2" y="5" width="6" height="50" fill="url(#pmGrad)" stroke="#333" stroke-width="1"/>
            <rect x="10" y="15" width="25" height="30" fill="#cc9966" stroke="#333" stroke-width="1"/>
            <text x="22" y="33" font-size="8" text-anchor="middle" fill="#333">PZT</text>
        </svg>`
    },

    // ========== 高级分束器 ==========
    NonPolarizingBS: {
        name: '非偏振分束器',
        category: ICON_CATEGORIES.SPLITTERS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="npbsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#e8e8e8"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#d0d0d0"/>
                </linearGradient>
            </defs>
            <rect x="5" y="5" width="40" height="40" fill="url(#npbsGrad)" stroke="#333" stroke-width="1.5"/>
            <line x1="5" y1="45" x2="45" y2="5" stroke="#666" stroke-width="2"/>
            <text x="25" y="48" font-size="7" text-anchor="middle" fill="#333">50:50</text>
        </svg>`
    },

    // ========== 光学隔离器 ==========
    OpticalIsolator: {
        name: '光学隔离器',
        category: ICON_CATEGORIES.MISC,
        width: 50,
        height: 35,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 35" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="oiGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#666"/>
                    <stop offset="50%" style="stop-color:#888"/>
                    <stop offset="100%" style="stop-color:#555"/>
                </linearGradient>
            </defs>
            <rect x="3" y="5" width="44" height="25" fill="url(#oiGrad)" stroke="#333" stroke-width="1"/>
            <polygon points="20,10 30,17.5 20,25" fill="#4488ff" stroke="#336699" stroke-width="1"/>
            <text x="25" y="33" font-size="6" text-anchor="middle" fill="#333">Isolator</text>
        </svg>`
    },

    // ========== 频率相关元件 ==========
    FrequencyDoubler: {
        name: '倍频晶体',
        category: ICON_CATEGORIES.MODULATORS,
        width: 40,
        height: 30,
        connectionPoints: [
            { id: 'input', label: 'ω', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: '2ω', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 30" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="fdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#aaddaa"/>
                    <stop offset="50%" style="stop-color:#ccffcc"/>
                    <stop offset="100%" style="stop-color:#88bb88"/>
                </linearGradient>
            </defs>
            <polygon points="5,5 35,5 38,15 35,25 5,25 2,15" fill="url(#fdGrad)" stroke="#336633" stroke-width="1.5"/>
            <text x="20" y="18" font-size="8" text-anchor="middle" fill="#333">SHG</text>
        </svg>`
    },

    // ========== 探测器 ==========
    BalancedDetector: {
        name: '平衡探测器',
        category: ICON_CATEGORIES.DETECTORS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'input1', label: 'in1', position: { x: 0, y: 0.25 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'input2', label: 'in2', position: { x: 0, y: 0.75 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bdGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#444"/>
                    <stop offset="50%" style="stop-color:#666"/>
                    <stop offset="100%" style="stop-color:#333"/>
                </linearGradient>
            </defs>
            <circle cx="20" cy="12" r="8" fill="url(#bdGrad)" stroke="#222" stroke-width="1"/>
            <circle cx="20" cy="12" r="4" fill="#224488"/>
            <circle cx="20" cy="38" r="8" fill="url(#bdGrad)" stroke="#222" stroke-width="1"/>
            <circle cx="20" cy="38" r="4" fill="#224488"/>
            <line x1="28" y1="12" x2="35" y2="25" stroke="#333" stroke-width="2"/>
            <line x1="28" y1="38" x2="35" y2="25" stroke="#333" stroke-width="2"/>
            <rect x="35" y="20" width="12" height="10" fill="#555" stroke="#333" stroke-width="1"/>
            <text x="41" y="27" font-size="6" text-anchor="middle" fill="#fff">-</text>
        </svg>`
    },

    CCD: {
        name: 'CCD相机',
        category: ICON_CATEGORIES.DETECTORS,
        width: 50,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="ccdGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#555"/>
                    <stop offset="50%" style="stop-color:#777"/>
                    <stop offset="100%" style="stop-color:#444"/>
                </linearGradient>
            </defs>
            <rect x="5" y="5" width="40" height="30" fill="url(#ccdGrad)" stroke="#222" stroke-width="1.5"/>
            <rect x="10" y="10" width="20" height="20" fill="#112244" stroke="#334466" stroke-width="1"/>
            <rect x="32" y="12" width="10" height="16" fill="#333" stroke="#222" stroke-width="1"/>
            <text x="25" y="38" font-size="6" text-anchor="middle" fill="#333">CCD</text>
        </svg>`
    }
};


/**
 * 注册所有专业SVG图标到图标管理器
 */
export function registerProfessionalIcons() {
    const manager = getProfessionalIconManager();
    
    Object.entries(PROFESSIONAL_SVG_ICONS).forEach(([type, definition]) => {
        manager.registerIcon(type, definition);
    });
    
    console.log(`ProfessionalIconLibrary: Registered ${Object.keys(PROFESSIONAL_SVG_ICONS).length} professional SVG icons`);
}

/**
 * 获取所有可用的专业图标类型
 * @returns {string[]}
 */
export function getAvailableProfessionalIcons() {
    return Object.keys(PROFESSIONAL_SVG_ICONS);
}

/**
 * 按分类获取专业图标
 * @param {string} category - 分类名称
 * @returns {Object[]}
 */
export function getProfessionalIconsByCategory(category) {
    return Object.entries(PROFESSIONAL_SVG_ICONS)
        .filter(([_, def]) => def.category === category)
        .map(([type, def]) => ({ type, ...def }));
}

/**
 * 获取所有图标分类及其图标数量
 * @returns {Object}
 */
export function getProfessionalIconCategories() {
    const categories = {};
    Object.entries(PROFESSIONAL_SVG_ICONS).forEach(([type, def]) => {
        if (!categories[def.category]) {
            categories[def.category] = [];
        }
        categories[def.category].push(type);
    });
    return categories;
}

// 自动注册图标（如果在浏览器环境）
if (typeof window !== 'undefined') {
    // 延迟注册，确保ProfessionalIconManager已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerProfessionalIcons);
    } else {
        registerProfessionalIcons();
    }
    
    // 导出到全局
    window.PROFESSIONAL_SVG_ICONS = PROFESSIONAL_SVG_ICONS;
    window.registerProfessionalIcons = registerProfessionalIcons;
    window.getAvailableProfessionalIcons = getAvailableProfessionalIcons;
}
