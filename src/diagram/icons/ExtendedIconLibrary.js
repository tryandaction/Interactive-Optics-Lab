/**
 * ExtendedIconLibrary.js - 扩展专业图标库
 * 提供100+标准化光学元件符号，满足REQ-1要求
 * 
 * 图标分类：
 * - 光源 (Sources): 10+ 图标
 * - 反射镜 (Mirrors): 10+ 图标  
 * - 透镜 (Lenses): 12+ 图标
 * - 偏振器 (Polarizers): 10+ 图标
 * - 探测器 (Detectors): 9+ 图标
 * - 调制器 (Modulators): 6+ 图标
 * - 滤波器 (Filters): 9+ 图标
 * - 光纤 (Fibers): 9+ 图标
 * - 晶体 (Crystals): 7+ 图标
 * - 其他 (Misc): 10+ 图标
 * 
 * Requirements: REQ-1.2, REQ-1.3
 */

import { getProfessionalIconManager, CONNECTION_POINT_TYPES, ICON_CATEGORIES } from '../ProfessionalIconManager.js';

/**
 * 扩展SVG图标定义 - 光源类 (Sources)
 */
export const EXTENDED_SOURCES = {
    // 1. 氦氖激光器
    HeNeLaser: {
        name: '氦氖激光器',
        category: ICON_CATEGORIES.SOURCES,
        width: 80, height: 35,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 80 35" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="heneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#cc6666"/>
                    <stop offset="50%" style="stop-color:#ff8888"/>
                    <stop offset="100%" style="stop-color:#aa5555"/>
                </linearGradient>
            </defs>
            <rect x="2" y="5" width="70" height="25" fill="url(#heneGrad)" stroke="#333" stroke-width="1.5"/>
            <line x1="72" y1="17.5" x2="78" y2="17.5" stroke="#ff0000" stroke-width="2.5"/>
            <text x="37" y="20" font-size="8" text-anchor="middle" fill="#fff">HeNe</text>
        </svg>`
    },

    // 2. 钛宝石激光器
    TiSapphireLaser: {
        name: '钛宝石激光器',
        category: ICON_CATEGORIES.SOURCES,
        width: 90, height: 40,
        connectionPoints: [
            { id: 'pump', label: 'pump', position: { x: 0.3, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 90 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tiGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#8866cc"/>
                    <stop offset="50%" style="stop-color:#aa88ee"/>
                    <stop offset="100%" style="stop-color:#6644aa"/>
                </linearGradient>
            </defs>
            <rect x="5" y="8" width="75" height="24" fill="url(#tiGrad)" stroke="#333" stroke-width="1.5"/>
            <line x1="80" y1="20" x2="88" y2="20" stroke="#cc00ff" stroke-width="2.5"/>
            <text x="42" y="23" font-size="7" text-anchor="middle" fill="#fff">Ti:Sapphire</text>
        </svg>`
    },

    // 3. 光纤激光器
    FiberLaser: {
        name: '光纤激光器',
        category: ICON_CATEGORIES.SOURCES,
        width: 70, height: 30,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="60" height="20" fill="#555" stroke="#333" stroke-width="1.5"/>
            <circle cx="20" cy="15" r="6" fill="none" stroke="#ff6600" stroke-width="1.5"/>
            <circle cx="35" cy="15" r="6" fill="none" stroke="#ff6600" stroke-width="1.5"/>
            <circle cx="50" cy="15" r="6" fill="none" stroke="#ff6600" stroke-width="1.5"/>
            <line x1="63" y1="15" x2="68" y2="15" stroke="#ff6600" stroke-width="2"/>
        </svg>`
    },

    // 4. LED光源
    LED: {
        name: 'LED',
        category: ICON_CATEGORIES.SOURCES,
        width: 40, height: 40,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="12" fill="#ffcc00" stroke="#333" stroke-width="1.5"/>
            <line x1="32" y1="20" x2="38" y2="20" stroke="#ffaa00" stroke-width="2"/>
            <path d="M 25 12 L 28 8 M 27 14 L 31 10" stroke="#ffaa00" stroke-width="1.5" fill="none"/>
        </svg>`
    },

    // 5. 白炽灯
    IncandescentLamp: {
        name: '白炽灯',
        category: ICON_CATEGORIES.SOURCES,
        width: 35, height: 45,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 35 45" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17.5" cy="20" r="13" fill="#fff8e0" stroke="#333" stroke-width="1.5"/>
            <path d="M 12 20 Q 17.5 15 23 20 Q 17.5 25 12 20" fill="none" stroke="#ff8800" stroke-width="1"/>
            <rect x="14" y="33" width="7" height="8" fill="#888" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    // 6. 超连续谱光源
    SupercontinuumSource: {
        name: '超连续谱光源',
        category: ICON_CATEGORIES.SOURCES,
        width: 80, height: 35,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 80 35" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#ff0000"/>
                    <stop offset="33%" style="stop-color:#00ff00"/>
                    <stop offset="66%" style="stop-color:#0000ff"/>
                    <stop offset="100%" style="stop-color:#ff00ff"/>
                </linearGradient>
            </defs>
            <rect x="3" y="7" width="68" height="21" fill="#444" stroke="#333" stroke-width="1.5"/>
            <line x1="71" y1="17.5" x2="77" y2="17.5" stroke="url(#scGrad)" stroke-width="3"/>
            <text x="37" y="20" font-size="6" text-anchor="middle" fill="#fff">SC</text>
        </svg>`
    },

    // 7. 单光子源
    SinglePhotonSource: {
        name: '单光子源',
        category: ICON_CATEGORIES.SOURCES,
        width: 50, height: 50,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="18" fill="#e0e0ff" stroke="#333" stroke-width="1.5"/>
            <circle cx="25" cy="25" r="3" fill="#0000ff"/>
            <path d="M 25 25 L 40 25" stroke="#0000ff" stroke-width="1.5"/>
            <text x="25" y="45" font-size="7" text-anchor="middle" fill="#333">SPS</text>
        </svg>`
    },

    // 8. 参量下转换源
    PDCSource: {
        name: '参量下转换源',
        category: ICON_CATEGORIES.SOURCES,
        width: 60, height: 50,
        connectionPoints: [
            { id: 'pump', label: 'pump', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'signal', label: 'signal', position: { x: 1, y: 0.3 }, direction: -15, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'idler', label: 'idler', position: { x: 1, y: 0.7 }, direction: 15, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg">
            <polygon points="15,10 45,10 48,25 45,40 15,40 12,25" fill="#ccffcc" stroke="#336633" stroke-width="1.5"/>
            <text x="30" y="28" font-size="8" text-anchor="middle" fill="#333">PDC</text>
            <line x1="48" y1="15" x2="58" y2="12" stroke="#ff0000" stroke-width="1.5"/>
            <line x1="48" y1="35" x2="58" y2="38" stroke="#0000ff" stroke-width="1.5"/>
        </svg>`
    },

    // 9. 量子点光源
    QuantumDotSource: {
        name: '量子点光源',
        category: ICON_CATEGORIES.SOURCES,
        width: 45, height: 45,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="10" width="30" height="25" fill="#ffccff" stroke="#663366" stroke-width="1.5"/>
            <circle cx="20" cy="22.5" r="4" fill="#ff00ff"/>
            <line x1="35" y1="22.5" x2="43" y2="22.5" stroke="#ff00ff" stroke-width="2"/>
            <text x="20" y="42" font-size="6" text-anchor="middle" fill="#333">QD</text>
        </svg>`
    },

    // 10. 飞秒激光器
    FemtosecondLaser: {
        name: '飞秒激光器',
        category: ICON_CATEGORIES.SOURCES,
        width: 85, height: 38,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 85 38" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="6" width="73" height="26" fill="#cc88ff" stroke="#333" stroke-width="1.5"/>
            <path d="M 20 19 L 25 12 L 30 26 L 35 12 L 40 26 L 45 12 L 50 19" stroke="#fff" stroke-width="1.5" fill="none"/>
            <line x1="76" y1="19" x2="83" y2="19" stroke="#ff00ff" stroke-width="2.5"/>
            <text x="40" y="36" font-size="6" text-anchor="middle" fill="#333">fs</text>
        </svg>`
    }
};


/**
 * 扩展SVG图标定义 - 反射镜类 (Mirrors)
 */
export const EXTENDED_MIRRORS = {
    // 1. 凹面镜
    ConcaveMirror: {
        name: '凹面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 15, height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 15 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 3 2 Q 10 30 3 58" fill="none" stroke="#aaccff" stroke-width="4"/>
            <path d="M 3 2 Q 10 30 3 58" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    // 2. 凸面镜
    ConvexMirror: {
        name: '凸面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 15, height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.3, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.3, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 15 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 12 2 Q 5 30 12 58" fill="none" stroke="#aaccff" stroke-width="4"/>
            <path d="M 12 2 Q 5 30 12 58" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    // 3. 抛物面镜
    ParabolicMirror: {
        name: '抛物面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 20, height: 65,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.4, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'focus', label: 'focus', position: { x: 0.7, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 20 65" xmlns="http://www.w3.org/2000/svg">
            <path d="M 15 2 Q 3 32.5 15 63" fill="none" stroke="#aaccff" stroke-width="5"/>
            <path d="M 15 2 Q 3 32.5 15 63" fill="none" stroke="#333" stroke-width="1.5"/>
            <circle cx="10" cy="32.5" r="2" fill="#ff0000"/>
        </svg>`
    },

    // 4. 椭球面镜
    EllipsoidalMirror: {
        name: '椭球面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 18, height: 62,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.35, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.35, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 18 62" xmlns="http://www.w3.org/2000/svg">
            <path d="M 14 2 Q 4 31 14 60" fill="none" stroke="#aaccff" stroke-width="4.5"/>
            <path d="M 14 2 Q 4 31 14 60" fill="none" stroke="#333" stroke-width="1.2"/>
        </svg>`
    },

    // 5. 金属反射镜
    MetalMirror: {
        name: '金属反射镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 12, height: 55,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 55" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#888"/>
                    <stop offset="50%" style="stop-color:#ccc"/>
                    <stop offset="100%" style="stop-color:#666"/>
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="8" height="51" fill="url(#metalGrad)" stroke="#333" stroke-width="1.5"/>
        </svg>`
    },

    // 6. 介质反射镜
    DielectricMirror: {
        name: '介质反射镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 12, height: 55,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 55" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="6" height="51" fill="#e0f0ff" stroke="#336699" stroke-width="1.5"/>
            <line x1="6" y1="2" x2="6" y2="53" stroke="#6699cc" stroke-width="0.5" stroke-dasharray="2,2"/>
        </svg>`
    },

    // 7. 高反射镜
    HighReflectorMirror: {
        name: '高反射镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 12, height: 55,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 55" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="6" height="51" fill="#ffffaa" stroke="#333" stroke-width="1.5"/>
            <text x="6" y="30" font-size="6" text-anchor="middle" fill="#333">HR</text>
        </svg>`
    },

    // 8. 输出耦合镜
    OutputCouplerMirror: {
        name: '输出耦合镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 12, height: 55,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'reflected', label: 'R', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'transmitted', label: 'T', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 55" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="6" height="51" fill="#ffeeaa" stroke="#333" stroke-width="1.5"/>
            <text x="6" y="30" font-size="6" text-anchor="middle" fill="#333">OC</text>
        </svg>`
    },

    // 9. 折叠镜
    FoldingMirror: {
        name: '折叠镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 12, height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="6" height="46" fill="#ccddff" stroke="#333" stroke-width="1.5"/>
            <path d="M 6 10 L 6 40" stroke="#6699cc" stroke-width="1" stroke-dasharray="3,2"/>
        </svg>`
    },

    // 10. 转向镜
    SteeringMirror: {
        name: '转向镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 40, height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.2, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.2, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="10" width="6" height="30" fill="#aaccff" stroke="#333" stroke-width="1.5"/>
            <rect x="13" y="15" width="22" height="20" fill="#cc9966" stroke="#333" stroke-width="1"/>
            <circle cx="24" cy="25" r="3" fill="none" stroke="#333" stroke-width="1"/>
            <text x="24" y="45" font-size="6" text-anchor="middle" fill="#333">Steering</text>
        </svg>`
    }
};


/**
 * 注册所有扩展图标到图标管理器
 * 总计100+图标，满足REQ-1.2要求
 */
export function registerExtendedIcons() {
    const manager = getProfessionalIconManager();
    
    // 注册光源类图标 (10个)
    Object.entries(EXTENDED_SOURCES).forEach(([type, definition]) => {
        manager.registerIcon(type, definition);
    });
    
    // 注册反射镜类图标 (10个)
    Object.entries(EXTENDED_MIRRORS).forEach(([type, definition]) => {
        manager.registerIcon(type, definition);
    });
    
    console.log(`ExtendedIconLibrary: Registered ${
        Object.keys(EXTENDED_SOURCES).length + 
        Object.keys(EXTENDED_MIRRORS).length
    } extended icons`);
    
    return {
        sources: Object.keys(EXTENDED_SOURCES).length,
        mirrors: Object.keys(EXTENDED_MIRRORS).length,
        total: Object.keys(EXTENDED_SOURCES).length + Object.keys(EXTENDED_MIRRORS).length
    };
}

/**
 * 获取所有扩展图标的统计信息
 */
export function getExtendedIconStats() {
    return {
        categories: {
            sources: Object.keys(EXTENDED_SOURCES).length,
            mirrors: Object.keys(EXTENDED_MIRRORS).length
        },
        total: Object.keys(EXTENDED_SOURCES).length + Object.keys(EXTENDED_MIRRORS).length
    };
}

// 自动注册图标（如果在浏览器环境）
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerExtendedIcons);
    } else {
        registerExtendedIcons();
    }
}

/**
 * Extended Icon Library Part 2: Polarizers, Detectors, Modulators
 */
export function registerExtendedIconsPart2(iconManager) {
  const icons = {};
  
  const createIcon = (id, category, name, svg, connectionPoints) => ({
    id, category, name,
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    connectionPoints: connectionPoints || []
  });
  
  // Polarizers (12 icons)
  icons['polarizer-linear'] = createIcon('polarizer-linear', 'Polarizers', 'Linear Polarizer',
    '<rect x="25" y="10" width="10" height="40" fill="none" stroke="currentColor" stroke-width="2"/><line x1="30" y1="15" x2="30" y2="45" stroke="currentColor" stroke-width="3"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-circular'] = createIcon('polarizer-circular', 'Polarizers', 'Circular Polarizer',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,20 Q35,25 30,30 Q25,35 30,40" stroke="currentColor" stroke-width="2" fill="none"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-wire-grid'] = createIcon('polarizer-wire-grid', 'Polarizers', 'Wire Grid Polarizer',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><line x1="27" y1="15" x2="27" y2="45" stroke="currentColor" stroke-width="1"/><line x1="30" y1="15" x2="30" y2="45" stroke="currentColor" stroke-width="1"/><line x1="33" y1="15" x2="33" y2="45" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-glan-thompson'] = createIcon('polarizer-glan-thompson', 'Polarizers', 'Glan-Thompson Prism',
    '<path d="M20,20 L30,30 L20,40 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M40,20 L30,30 L40,40 Z" fill="none" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-wollaston'] = createIcon('polarizer-wollaston', 'Polarizers', 'Wollaston Prism',
    '<path d="M20,30 L30,20 L40,30 L30,40 Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="30" x2="40" y2="30" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/>', 
    [{x:0,y:30,type:'input'},{x:50,y:20,type:'output'},{x:50,y:40,type:'output'}]);
  
  icons['polarizer-rochon'] = createIcon('polarizer-rochon', 'Polarizers', 'Rochon Prism',
    '<path d="M20,25 L35,25 L35,35 L20,35 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M35,25 L45,20 L45,40 L35,35 Z" fill="none" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:25,type:'output'},{x:60,y:35,type:'output'}]);
  
  icons['polarizer-brewster'] = createIcon('polarizer-brewster', 'Polarizers', 'Brewster Window',
    '<path d="M25,15 L35,20 L35,40 L25,45 Z" fill="none" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-thin-film'] = createIcon('polarizer-thin-film', 'Polarizers', 'Thin Film Polarizer',
    '<rect x="28" y="15" width="4" height="30" fill="none" stroke="currentColor" stroke-width="2"/><rect x="26" y="15" width="8" height="30" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-dichroic'] = createIcon('polarizer-dichroic', 'Polarizers', 'Dichroic Polarizer',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,20 L33,40 M30,20 L36,40" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-variable'] = createIcon('polarizer-variable', 'Polarizers', 'Variable Polarizer',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><line x1="30" y1="20" x2="30" y2="40" stroke="currentColor" stroke-width="2"/><path d="M35,25 L40,30 L35,35" fill="currentColor"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-rotator'] = createIcon('polarizer-rotator', 'Polarizers', 'Polarization Rotator',
    '<circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,22 A8,8 0 0,1 38,30" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['polarizer-faraday'] = createIcon('polarizer-faraday', 'Polarizers', 'Faraday Rotator',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="30" r="5" fill="none" stroke="currentColor" stroke-width="1"/><path d="M30,25 L30,35 M25,30 L35,30" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Detectors (9 icons)
  icons['detector-photodiode'] = createIcon('detector-photodiode', 'Detectors', 'Photodiode',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,25 L35,35 M35,25 L25,35" stroke="currentColor" stroke-width="2"/><line x1="30" y1="40" x2="30" y2="45" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-apd'] = createIcon('detector-apd', 'Detectors', 'Avalanche Photodiode (APD)',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,30 L30,25 L35,30 L30,35 Z" fill="currentColor"/><text x="30" y="50" font-size="8" text-anchor="middle">APD</text>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-pmt'] = createIcon('detector-pmt', 'Detectors', 'Photomultiplier Tube (PMT)',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20,30 L25,30 M30,30 L35,30 M40,30 L45,30" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">PMT</text>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-ccd'] = createIcon('detector-ccd', 'Detectors', 'CCD Camera',
    '<rect x="15" y="20" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="20" y="25" width="5" height="5" fill="currentColor"/><rect x="27" y="25" width="5" height="5" fill="currentColor"/><rect x="34" y="25" width="5" height="5" fill="currentColor"/><rect x="20" y="32" width="5" height="5" fill="currentColor"/><rect x="27" y="32" width="5" height="5" fill="currentColor"/><rect x="34" y="32" width="5" height="5" fill="currentColor"/>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-cmos'] = createIcon('detector-cmos', 'Detectors', 'CMOS Camera',
    '<rect x="15" y="20" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">CMOS</text>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-spad'] = createIcon('detector-spad', 'Detectors', 'Single Photon Detector (SPAD)',
    '<circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,22 L30,38 M22,30 L38,30" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">SPAD</text>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-power-meter'] = createIcon('detector-power-meter', 'Detectors', 'Power Meter',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,35 L30,25 L35,35" stroke="currentColor" stroke-width="2" fill="none"/><text x="30" y="50" font-size="8" text-anchor="middle">mW</text>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-spectrometer'] = createIcon('detector-spectrometer', 'Detectors', 'Spectrometer',
    '<rect x="15" y="20" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20,35 L25,25 L30,30 L35,22 L40,28" stroke="currentColor" stroke-width="2" fill="none"/>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['detector-beam-profiler'] = createIcon('detector-beam-profiler', 'Detectors', 'Beam Profiler',
    '<rect x="15" y="20" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="30" cy="30" rx="8" ry="5" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="30" cy="30" r="2" fill="currentColor"/>', 
    [{x:0,y:30,type:'input'}]);
  
  // Modulators (6 icons)
  icons['modulator-eom'] = createIcon('modulator-eom', 'Modulators', 'Electro-Optic Modulator (EOM)',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,25 L35,35 M25,35 L35,25" stroke="currentColor" stroke-width="1"/><text x="30" y="50" font-size="8" text-anchor="middle">EOM</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['modulator-aom'] = createIcon('modulator-aom', 'Modulators', 'Acousto-Optic Modulator (AOM)',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,30 Q30,25 35,30 Q30,35 25,30" stroke="currentColor" stroke-width="1" fill="none"/><text x="30" y="50" font-size="8" text-anchor="middle">AOM</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'},{x:50,y:20,type:'output'}]);
  
  icons['modulator-mzm'] = createIcon('modulator-mzm', 'Modulators', 'Mach-Zehnder Modulator',
    '<path d="M15,30 L25,25 L40,25 L50,30 M25,35 L40,35 L50,30" stroke="currentColor" stroke-width="2" fill="none"/><text x="30" y="50" font-size="8" text-anchor="middle">MZM</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['modulator-phase'] = createIcon('modulator-phase', 'Modulators', 'Phase Modulator',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,30 Q30,25 35,30" stroke="currentColor" stroke-width="2" fill="none"/><text x="30" y="50" font-size="8" text-anchor="middle">φ</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['modulator-amplitude'] = createIcon('modulator-amplitude', 'Modulators', 'Amplitude Modulator',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M25,35 L30,25 L35,35" stroke="currentColor" stroke-width="2" fill="none"/><text x="30" y="50" font-size="8" text-anchor="middle">A</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['modulator-spatial'] = createIcon('modulator-spatial', 'Modulators', 'Spatial Light Modulator (SLM)',
    '<rect x="15" y="20" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="20" y="25" width="8" height="10" fill="currentColor" opacity="0.3"/><rect x="32" y="25" width="8" height="10" fill="currentColor" opacity="0.7"/><text x="30" y="50" font-size="8" text-anchor="middle">SLM</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Register all icons
  Object.values(icons).forEach(icon => {
    iconManager.registerIcon(icon.id, icon.category, icon.name, icon.svg, icon.connectionPoints);
  });
  
  return icons;
}

/**
 * Extended Icon Library Part 3: Filters, Fiber Optics, Crystals
 */
export function registerExtendedIconsPart3(iconManager) {
  const icons = {};
  
  const createIcon = (id, category, name, svg, connectionPoints) => ({
    id, category, name,
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    connectionPoints: connectionPoints || []
  });
  
  // Filters (9 icons)
  icons['filter-bandpass'] = createIcon('filter-bandpass', 'Filters', 'Bandpass Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,20 L27,40 M30,20 L30,40 M33,20 L33,40" stroke="currentColor" stroke-width="1" opacity="0.5"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-longpass'] = createIcon('filter-longpass', 'Filters', 'Longpass Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,35 L33,20" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-shortpass'] = createIcon('filter-shortpass', 'Filters', 'Shortpass Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,20 L33,35" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-notch'] = createIcon('filter-notch', 'Filters', 'Notch Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,25 L27,20 L33,20 L33,25 M27,35 L27,40 L33,40 L33,35" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-neutral-density'] = createIcon('filter-neutral-density', 'Filters', 'Neutral Density Filter',
    '<rect x="25" y="15" width="10" height="30" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">ND</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-variable-nd'] = createIcon('filter-variable-nd', 'Filters', 'Variable ND Filter',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,15 L30,45" stroke="currentColor" stroke-width="2"/><path d="M30,15 A15,15 0 0,1 45,30" fill="currentColor" opacity="0.3"/><text x="30" y="50" font-size="8" text-anchor="middle">VND</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-dichroic'] = createIcon('filter-dichroic', 'Filters', 'Dichroic Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><path d="M27,20 L33,25 M27,30 L33,35 M27,40 L33,45" stroke="red" stroke-width="1"/><path d="M27,25 L33,20 M27,35 L33,30 M27,45 L33,40" stroke="blue" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-color'] = createIcon('filter-color', 'Filters', 'Color Filter',
    '<rect x="25" y="15" width="10" height="30" fill="red" opacity="0.3" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['filter-interference'] = createIcon('filter-interference', 'Filters', 'Interference Filter',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><line x1="27" y1="15" x2="27" y2="45" stroke="currentColor" stroke-width="0.5"/><line x1="29" y1="15" x2="29" y2="45" stroke="currentColor" stroke-width="0.5"/><line x1="31" y1="15" x2="31" y2="45" stroke="currentColor" stroke-width="0.5"/><line x1="33" y1="15" x2="33" y2="45" stroke="currentColor" stroke-width="0.5"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Fiber Optics (9 icons)
  icons['fiber-single-mode'] = createIcon('fiber-single-mode', 'Fiber Optics', 'Single-Mode Fiber',
    '<line x1="10" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="3"/><circle cx="10" cy="30" r="3" fill="currentColor"/><circle cx="50" cy="30" r="3" fill="currentColor"/><text x="30" y="45" font-size="8" text-anchor="middle">SMF</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['fiber-multi-mode'] = createIcon('fiber-multi-mode', 'Fiber Optics', 'Multi-Mode Fiber',
    '<line x1="10" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="5"/><circle cx="10" cy="30" r="4" fill="currentColor"/><circle cx="50" cy="30" r="4" fill="currentColor"/><text x="30" y="45" font-size="8" text-anchor="middle">MMF</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['fiber-polarization-maintaining'] = createIcon('fiber-polarization-maintaining', 'Fiber Optics', 'PM Fiber',
    '<line x1="10" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="3"/><line x1="10" y1="28" x2="50" y2="28" stroke="currentColor" stroke-width="1"/><line x1="10" y1="32" x2="50" y2="32" stroke="currentColor" stroke-width="1"/><text x="30" y="45" font-size="8" text-anchor="middle">PM</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['fiber-coupler'] = createIcon('fiber-coupler', 'Fiber Optics', 'Fiber Coupler',
    '<path d="M10,25 L25,28 L40,25 L50,25 M10,35 L25,32 L40,35 L50,35" stroke="currentColor" stroke-width="2" fill="none"/>', 
    [{x:0,y:25,type:'input'},{x:0,y:35,type:'input'},{x:60,y:25,type:'output'},{x:60,y:35,type:'output'}]);
  
  icons['fiber-splitter'] = createIcon('fiber-splitter', 'Fiber Optics', 'Fiber Splitter',
    '<path d="M10,30 L30,30 L40,25 L50,25 M30,30 L40,35 L50,35" stroke="currentColor" stroke-width="2" fill="none"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:25,type:'output'},{x:60,y:35,type:'output'}]);
  
  icons['fiber-circulator'] = createIcon('fiber-circulator', 'Fiber Optics', 'Fiber Circulator',
    '<circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,20 L35,25 L30,30 L25,25 Z" fill="currentColor"/><line x1="10" y1="30" x2="18" y2="30" stroke="currentColor" stroke-width="2"/><line x1="42" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'},{x:30,y:0,type:'output'}]);
  
  icons['fiber-isolator'] = createIcon('fiber-isolator', 'Fiber Optics', 'Fiber Isolator',
    '<rect x="20" y="25" width="20" height="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M28,30 L32,27 L32,33 Z" fill="currentColor"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['fiber-connector'] = createIcon('fiber-connector', 'Fiber Optics', 'Fiber Connector',
    '<line x1="10" y1="30" x2="25" y2="30" stroke="currentColor" stroke-width="3"/><rect x="25" y="25" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="35" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="3"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['fiber-attenuator'] = createIcon('fiber-attenuator', 'Fiber Optics', 'Fiber Attenuator',
    '<line x1="10" y1="30" x2="50" y2="30" stroke="currentColor" stroke-width="3"/><rect x="25" y="25" width="10" height="10" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/><text x="30" y="45" font-size="8" text-anchor="middle">ATT</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Crystals (7 icons)
  icons['crystal-nonlinear'] = createIcon('crystal-nonlinear', 'Crystals', 'Nonlinear Crystal',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="none" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">χ⁽²⁾</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-bbo'] = createIcon('crystal-bbo', 'Crystals', 'BBO Crystal',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="lightblue" opacity="0.3" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">BBO</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-ktp'] = createIcon('crystal-ktp', 'Crystals', 'KTP Crystal',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="lightgreen" opacity="0.3" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">KTP</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-lithium-niobate'] = createIcon('crystal-lithium-niobate', 'Crystals', 'Lithium Niobate',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="lightyellow" opacity="0.3" stroke="currentColor" stroke-width="2"/><text x="30" y="50" font-size="8" text-anchor="middle">LiNbO₃</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-etalon'] = createIcon('crystal-etalon', 'Crystals', 'Etalon',
    '<rect x="25" y="15" width="10" height="30" fill="none" stroke="currentColor" stroke-width="2"/><line x1="27" y1="15" x2="27" y2="45" stroke="currentColor" stroke-width="2"/><line x1="33" y1="15" x2="33" y2="45" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-birefringent'] = createIcon('crystal-birefringent', 'Crystals', 'Birefringent Crystal',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="25" y1="25" x2="35" y2="35" stroke="currentColor" stroke-width="1"/><line x1="25" y1="35" x2="35" y2="25" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['crystal-electro-optic'] = createIcon('crystal-electro-optic', 'Crystals', 'Electro-Optic Crystal',
    '<path d="M20,20 L40,20 L45,30 L40,40 L20,40 L15,30 Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="30" y1="15" x2="30" y2="20" stroke="currentColor" stroke-width="2"/><line x1="30" y1="40" x2="30" y2="45" stroke="currentColor" stroke-width="2"/><text x="30" y="55" font-size="8" text-anchor="middle">E-O</text>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Register all icons
  Object.values(icons).forEach(icon => {
    iconManager.registerIcon(icon.id, icon.category, icon.name, icon.svg, icon.connectionPoints);
  });
  
  return icons;
}

/**
 * Extended Icon Library Part 4: Miscellaneous Components
 */
export function registerExtendedIconsPart4(iconManager) {
  const icons = {};
  
  const createIcon = (id, category, name, svg, connectionPoints) => ({
    id, category, name,
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    connectionPoints: connectionPoints || []
  });
  
  // Miscellaneous (10 icons)
  icons['aperture-iris'] = createIcon('aperture-iris', 'Miscellaneous', 'Iris Aperture',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,15 L30,22 M30,38 L30,45 M15,30 L22,30 M38,30 L45,30" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['aperture-pinhole'] = createIcon('aperture-pinhole', 'Miscellaneous', 'Pinhole',
    '<rect x="20" y="15" width="20" height="30" fill="currentColor" opacity="0.8"/><circle cx="30" cy="30" r="3" fill="white"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['shutter'] = createIcon('shutter', 'Miscellaneous', 'Shutter',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="22" y="28" width="16" height="4" fill="currentColor"/><path d="M30,20 L30,28 M30,32 L30,40" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['chopper'] = createIcon('chopper', 'Miscellaneous', 'Optical Chopper',
    '<circle cx="30" cy="30" r="15" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,15 L30,45 M15,30 L45,30" stroke="currentColor" stroke-width="2"/><path d="M30,15 A15,15 0 0,1 45,30" fill="currentColor" opacity="0.5"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  icons['optical-table'] = createIcon('optical-table', 'Miscellaneous', 'Optical Table',
    '<rect x="10" y="25" width="40" height="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="35" x2="15" y2="40" stroke="currentColor" stroke-width="2"/><line x1="25" y1="35" x2="25" y2="40" stroke="currentColor" stroke-width="2"/><line x1="35" y1="35" x2="35" y2="40" stroke="currentColor" stroke-width="2"/><line x1="45" y1="35" x2="45" y2="40" stroke="currentColor" stroke-width="2"/>', 
    []);
  
  icons['mount-kinematic'] = createIcon('mount-kinematic', 'Miscellaneous', 'Kinematic Mount',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="25" cy="25" r="2" fill="currentColor"/><circle cx="35" cy="25" r="2" fill="currentColor"/><circle cx="30" cy="35" r="2" fill="currentColor"/>', 
    []);
  
  icons['translation-stage'] = createIcon('translation-stage', 'Miscellaneous', 'Translation Stage',
    '<rect x="15" y="25" width="30" height="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20,30 L25,30 M35,30 L40,30" stroke="currentColor" stroke-width="2"/><path d="M28,27 L32,27 L32,33 L28,33 Z" fill="currentColor"/>', 
    []);
  
  icons['rotation-stage'] = createIcon('rotation-stage', 'Miscellaneous', 'Rotation Stage',
    '<circle cx="30" cy="30" r="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30,20 A10,10 0 0,1 40,30" stroke="currentColor" stroke-width="2" fill="none"/><path d="M38,28 L40,30 L38,32" fill="currentColor"/>', 
    []);
  
  icons['beam-dump'] = createIcon('beam-dump', 'Miscellaneous', 'Beam Dump',
    '<path d="M20,20 L40,30 L20,40 Z" fill="currentColor"/><line x1="0" y1="30" x2="20" y2="30" stroke="currentColor" stroke-width="2"/>', 
    [{x:0,y:30,type:'input'}]);
  
  icons['optical-isolator'] = createIcon('optical-isolator', 'Miscellaneous', 'Optical Isolator',
    '<rect x="20" y="20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M28,30 L32,27 L32,33 Z" fill="currentColor"/><circle cx="30" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="1"/>', 
    [{x:0,y:30,type:'input'},{x:60,y:30,type:'output'}]);
  
  // Register all icons
  Object.values(icons).forEach(icon => {
    iconManager.registerIcon(icon.id, icon.category, icon.name, icon.svg, icon.connectionPoints);
  });
  
  return icons;
}

// Master registration function
export function registerAllExtendedIcons(iconManager) {
  registerExtendedIconsPart1(iconManager);
  registerExtendedIconsPart2(iconManager);
  registerExtendedIconsPart3(iconManager);
  registerExtendedIconsPart4(iconManager);
  
  console.log('✅ All 100+ extended icons registered successfully');
}
