/**
 * ProfessionalIconLibraryExtended.js - 扩展专业图标库
 * 添加额外的光学元件图标以达到 100+ 目标
 * 
 * Requirements: 1.2
 */

import { getProfessionalIconManager, CONNECTION_POINT_TYPES, ICON_CATEGORIES } from './ProfessionalIconManager.js';

/**
 * 扩展的专业SVG图标定义
 */
export const EXTENDED_SVG_ICONS = {
    // ========== 光源扩展 (2个) ==========
    SuperluminescentDiode: {
        name: '超辐射发光二极管',
        category: ICON_CATEGORIES.SOURCES,
        width: 60,
        height: 35,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 35" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#555"/>
                    <stop offset="50%" style="stop-color:#777"/>
                    <stop offset="100%" style="stop-color:#444"/>
                </linearGradient>
            </defs>
            <rect x="3" y="5" width="44" height="25" fill="url(#sldGrad)" stroke="#333" stroke-width="1"/>
            <rect x="47" y="12" width="3" height="11" fill="#ff8844"/>
            <line x1="50" y1="17.5" x2="58" y2="17.5" stroke="#ff6600" stroke-width="2.5"/>
            <text x="25" y="32" font-size="6" text-anchor="middle" fill="#333">SLD</text>
        </svg>`
    },

    FiberLaser: {
        name: '光纤激光器',
        category: ICON_CATEGORIES.SOURCES,
        width: 70,
        height: 40,
        connectionPoints: [
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="55" height="30" fill="#666" stroke="#333" stroke-width="1.5"/>
            <path d="M 10 20 Q 20 10, 30 20 T 50 20" stroke="#ffcc00" stroke-width="2" fill="none"/>
            <line x1="58" y1="20" x2="68" y2="20" stroke="#ff0000" stroke-width="2.5"/>
            <text x="31" y="37" font-size="7" text-anchor="middle" fill="#333">Fiber Laser</text>
        </svg>`
    },

    // ========== 反射镜扩展 (4个) ==========
    CornerCubeMirror: {
        name: '角锥棱镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 45,
        height: 45,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="ccGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#cce5ff"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#aaccee"/>
                </linearGradient>
            </defs>
            <polygon points="22.5,5 40,35 5,35" fill="url(#ccGrad)" stroke="#336699" stroke-width="1.5"/>
            <line x1="22.5" y1="5" x2="22.5" y2="35" stroke="#336699" stroke-width="0.8"/>
            <line x1="5" y1="35" x2="40" y2="5" stroke="#336699" stroke-width="0.8"/>
        </svg>`
    },

    RoofMirror: {
        name: '屋脊镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 40,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.5, y: 1 }, direction: 90, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.5, y: 1 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="rmGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#aaccff"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#aaccff"/>
                </linearGradient>
            </defs>
            <polygon points="5,40 20,10 35,40" fill="url(#rmGrad)" stroke="#333" stroke-width="1.5"/>
            <line x1="20" y1="10" x2="20" y2="40" stroke="#666" stroke-width="1"/>
        </svg>`
    },

    ParabolicMirror: {
        name: '抛物面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 20,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.3, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.3, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 20 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pmirGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#aaccff"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#88aadd"/>
                </linearGradient>
            </defs>
            <path d="M 15 2 Q 2 30 15 58" fill="none" stroke="url(#pmirGrad)" stroke-width="5"/>
            <path d="M 15 2 Q 2 30 15 58" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    EllipticalMirror: {
        name: '椭球面镜',
        category: ICON_CATEGORIES.MIRRORS,
        width: 25,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0.3, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 0.3, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 25 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="emGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#aaccff"/>
                    <stop offset="50%" style="stop-color:#fff"/>
                    <stop offset="100%" style="stop-color:#88aadd"/>
                </linearGradient>
            </defs>
            <ellipse cx="5" cy="30" rx="8" ry="28" fill="none" stroke="url(#emGrad)" stroke-width="5"/>
            <ellipse cx="5" cy="30" rx="8" ry="28" fill="none" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    // ========== 透镜扩展 (4个) ==========
    AchromaticLens: {
        name: '消色差透镜',
        category: ICON_CATEGORIES.LENSES,
        width: 22,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 22 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="achGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:rgba(100,180,255,0.3)"/>
                    <stop offset="50%" style="stop-color:rgba(200,230,255,0.5)"/>
                    <stop offset="100%" style="stop-color:rgba(100,180,255,0.3)"/>
                </linearGradient>
            </defs>
            <path d="M 0 2 Q -8 30 0 58 Q 8 30 0 2" fill="url(#achGrad)" stroke="#3366aa" stroke-width="1.5"/>
            <line x1="0" y1="2" x2="0" y2="58" stroke="#6688cc" stroke-width="0.5" stroke-dasharray="2,2"/>
        </svg>`
    },

    FresnelLens: {
        name: '菲涅尔透镜',
        category: ICON_CATEGORIES.LENSES,
        width: 15,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 15 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="2" width="9" height="56" fill="rgba(100,180,255,0.3)" stroke="#3366aa" stroke-width="1.5"/>
            <line x1="3" y1="12" x2="12" y2="12" stroke="#3366aa" stroke-width="0.5"/>
            <line x1="3" y1="22" x2="12" y2="22" stroke="#3366aa" stroke-width="0.5"/>
            <line x1="3" y1="30" x2="12" y2="30" stroke="#3366aa" stroke-width="0.8"/>
            <line x1="3" y1="38" x2="12" y2="38" stroke="#3366aa" stroke-width="0.5"/>
            <line x1="3" y1="48" x2="12" y2="48" stroke="#3366aa" stroke-width="0.5"/>
        </svg>`
    },

    BallLens: {
        name: '球透镜',
        category: ICON_CATEGORIES.LENSES,
        width: 40,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="ballGrad">
                    <stop offset="0%" style="stop-color:rgba(200,230,255,0.6)"/>
                    <stop offset="70%" style="stop-color:rgba(100,180,255,0.4)"/>
                    <stop offset="100%" style="stop-color:rgba(100,180,255,0.2)"/>
                </radialGradient>
            </defs>
            <circle cx="20" cy="20" r="18" fill="url(#ballGrad)" stroke="#3366aa" stroke-width="1.5"/>
        </svg>`
    },

    MicrolensArray: {
        name: '微透镜阵列',
        category: ICON_CATEGORIES.LENSES,
        width: 30,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 30 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="2" width="10" height="46" fill="rgba(100,180,255,0.3)" stroke="#3366aa" stroke-width="1"/>
            <circle cx="15" cy="10" r="4" fill="none" stroke="#3366aa" stroke-width="0.8"/>
            <circle cx="15" cy="20" r="4" fill="none" stroke="#3366aa" stroke-width="0.8"/>
            <circle cx="15" cy="30" r="4" fill="none" stroke="#3366aa" stroke-width="0.8"/>
            <circle cx="15" cy="40" r="4" fill="none" stroke="#3366aa" stroke-width="0.8"/>
        </svg>`
    },

    // ========== 分束器扩展 (3个) ==========
    PlateBeamSplitter: {
        name: '平板分束器',
        category: ICON_CATEGORIES.SPLITTERS,
        width: 8,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 8 60" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2" width="6" height="56" fill="rgba(230,230,230,0.5)" stroke="#666" stroke-width="1.5"/>
            <line x1="1" y1="58" x2="7" y2="2" stroke="#888" stroke-width="1.5"/>
        </svg>`
    },

    PellicleBeamSplitter: {
        name: '薄膜分束器',
        category: ICON_CATEGORIES.SPLITTERS,
        width: 4,
        height: 60,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 4 60" xmlns="http://www.w3.org/2000/svg">
            <line x1="2" y1="2" x2="2" y2="58" stroke="#888" stroke-width="1"/>
            <line x1="2" y1="58" x2="2" y2="2" stroke="#aaa" stroke-width="0.5" stroke-dasharray="2,2"/>
        </svg>`
    },

    VariableBeamSplitter: {
        name: '可变分束器',
        category: ICON_CATEGORIES.SPLITTERS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="40" height="40" fill="rgba(230,230,230,0.4)" stroke="#333" stroke-width="1.5"/>
            <line x1="5" y1="45" x2="45" y2="5" stroke="#666" stroke-width="2"/>
            <circle cx="25" cy="48" r="3" fill="#888" stroke="#333" stroke-width="1"/>
        </svg>`
    },

    // ========== 调制器扩展 (4个) ==========
    PhaseModulator: {
        name: '相位调制器',
        category: ICON_CATEGORIES.MODULATORS,
        width: 50,
        height: 30,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="44" height="20" fill="#d8c8e8" stroke="#663399" stroke-width="1.5"/>
            <path d="M 10 15 Q 17 10, 24 15 T 38 15" stroke="#333" stroke-width="1.5" fill="none"/>
            <text x="25" y="28" font-size="7" text-anchor="middle" fill="#333">PM</text>
        </svg>`
    },

    IntensityModulator: {
        name: '强度调制器',
        category: ICON_CATEGORIES.MODULATORS,
        width: 50,
        height: 30,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="44" height="20" fill="#e8d8c8" stroke="#996633" stroke-width="1.5"/>
            <rect x="10" y="10" width="8" height="10" fill="#666"/>
            <rect x="22" y="10" width="8" height="10" fill="#aaa"/>
            <rect x="34" y="10" width="8" height="10" fill="#666"/>
            <text x="25" y="28" font-size="7" text-anchor="middle" fill="#333">IM</text>
        </svg>`
    },

    SpatialLightModulator: {
        name: '空间光调制器',
        category: ICON_CATEGORIES.MODULATORS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="40" height="40" fill="#333" stroke="#222" stroke-width="1.5"/>
            <rect x="10" y="10" width="30" height="30" fill="#224488" stroke="#336699" stroke-width="1"/>
            <g fill="#4488cc">
                <rect x="12" y="12" width="4" height="4"/><rect x="18" y="12" width="4" height="4"/>
                <rect x="24" y="12" width="4" height="4"/><rect x="30" y="12" width="4" height="4"/>
                <rect x="12" y="22" width="4" height="4"/><rect x="30" y="22" width="4" height="4"/>
                <rect x="12" y="32" width="4" height="4"/><rect x="18" y="32" width="4" height="4"/>
                <rect x="24" y="32" width="4" height="4"/><rect x="30" y="32" width="4" height="4"/>
            </g>
            <text x="25" y="48" font-size="6" text-anchor="middle" fill="#333">SLM</text>
        </svg>`
    },

    LiquidCrystalModulator: {
        name: '液晶调制器',
        category: ICON_CATEGORIES.MODULATORS,
        width: 45,
        height: 35,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 45 35" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="39" height="25" fill="#c8d8e8" stroke="#336699" stroke-width="1.5"/>
            <line x1="10" y1="10" x2="15" y2="25" stroke="#666" stroke-width="1"/>
            <line x1="17" y1="10" x2="22" y2="25" stroke="#666" stroke-width="1"/>
            <line x1="24" y1="10" x2="29" y2="25" stroke="#666" stroke-width="1"/>
            <line x1="31" y1="10" x2="36" y2="25" stroke="#666" stroke-width="1"/>
            <text x="22" y="33" font-size="6" text-anchor="middle" fill="#333">LC</text>
        </svg>`
    },

    // ========== 波片扩展 (4个) ==========
    AchromaticWavePlate: {
        name: '消色差波片',
        category: ICON_CATEGORIES.WAVEPLATES,
        width: 10,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 10 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2" width="8" height="46" fill="#aaddaa" stroke="#336633" stroke-width="1"/>
            <rect x="1" y="2" width="4" height="46" fill="#aaaadd" stroke="#333366" stroke-width="0.5"/>
            <text x="5" y="52" font-size="6" text-anchor="middle" fill="#333">Ach</text>
        </svg>`
    },

    VariableRetarder: {
        name: '可变延迟器',
        category: ICON_CATEGORIES.WAVEPLATES,
        width: 12,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 12 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="8" height="46" fill="#ccddcc" stroke="#336633" stroke-width="1"/>
            <circle cx="6" cy="50" r="3" fill="#888" stroke="#333" stroke-width="1"/>
            <text x="6" y="58" font-size="6" text-anchor="middle" fill="#333">Var</text>
        </svg>`
    },

    ZeroOrderWavePlate: {
        name: '零级波片',
        category: ICON_CATEGORIES.WAVEPLATES,
        width: 8,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 8 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2" width="6" height="46" fill="#aaddaa" stroke="#336633" stroke-width="1"/>
            <text x="4" y="52" font-size="6" text-anchor="middle" fill="#333">λ/2(0)</text>
        </svg>`
    },

    MultiOrderWavePlate: {
        name: '多级波片',
        category: ICON_CATEGORIES.WAVEPLATES,
        width: 8,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 8 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2" width="6" height="46" fill="#aaddaa" stroke="#336633" stroke-width="1"/>
            <line x1="1" y1="17" x2="7" y2="17" stroke="#336633" stroke-width="0.5"/>
            <line x1="1" y1="33" x2="7" y2="33" stroke="#336633" stroke-width="0.5"/>
            <text x="4" y="52" font-size="6" text-anchor="middle" fill="#333">λ/2(M)</text>
        </svg>`
    },

    // ========== 偏振器扩展 (3个) ==========
    GlanThompsonPolarizer: {
        name: 'Glan-Thompson偏振器',
        category: ICON_CATEGORIES.POLARIZERS,
        width: 50,
        height: 35,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 35" xmlns="http://www.w3.org/2000/svg">
            <polygon points="5,5 22,5 22,30 5,30" fill="rgba(200,220,255,0.4)" stroke="#6688aa" stroke-width="1.5"/>
            <polygon points="28,5 45,5 45,30 28,30" fill="rgba(200,220,255,0.4)" stroke="#6688aa" stroke-width="1.5"/>
            <line x1="25" y1="5" x2="25" y2="30" stroke="#333" stroke-width="1"/>
            <text x="25" y="34" font-size="6" text-anchor="middle" fill="#333">GT</text>
        </svg>`
    },

    GlanTaylorPolarizer: {
        name: 'Glan-Taylor偏振器',
        category: ICON_CATEGORIES.POLARIZERS,
        width: 45,
        height: 35,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 45 35" xmlns="http://www.w3.org/2000/svg">
            <polygon points="5,5 20,5 20,30 5,30" fill="rgba(200,220,255,0.4)" stroke="#6688aa" stroke-width="1.5"/>
            <polygon points="25,5 40,5 40,30 25,30" fill="rgba(200,220,255,0.4)" stroke="#6688aa" stroke-width="1.5"/>
            <rect x="20" y="12" width="5" height="11" fill="rgba(100,100,100,0.3)"/>
            <text x="22" y="34" font-size="6" text-anchor="middle" fill="#333">GTaylor</text>
        </svg>`
    },

    WirePolarizer: {
        name: '线栅偏振器',
        category: ICON_CATEGORIES.POLARIZERS,
        width: 40,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="rgba(200,200,200,0.2)" stroke="#333" stroke-width="1.5"/>
            <line x1="20" y1="4" x2="20" y2="36" stroke="#666" stroke-width="0.8"/>
            <line x1="16" y1="4" x2="16" y2="36" stroke="#666" stroke-width="0.8"/>
            <line x1="24" y1="4" x2="24" y2="36" stroke="#666" stroke-width="0.8"/>
            <line x1="12" y1="6" x2="12" y2="34" stroke="#666" stroke-width="0.8"/>
            <line x1="28" y1="6" x2="28" y2="34" stroke="#666" stroke-width="0.8"/>
        </svg>`
    },

    // ========== 探测器扩展 (4个) ==========
    PMT: {
        name: '光电倍增管',
        category: ICON_CATEGORIES.DETECTORS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="22" fill="#444" stroke="#222" stroke-width="1.5"/>
            <circle cx="25" cy="25" r="18" fill="#224488" stroke="#336699" stroke-width="1"/>
            <circle cx="25" cy="25" r="14" fill="#336699"/>
            <circle cx="25" cy="25" r="10" fill="#4488cc"/>
            <circle cx="25" cy="25" r="6" fill="#6699dd"/>
            <text x="25" y="48" font-size="7" text-anchor="middle" fill="#333">PMT</text>
        </svg>`
    },

    APD: {
        name: '雪崩光电二极管',
        category: ICON_CATEGORIES.DETECTORS,
        width: 40,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#444" stroke="#222" stroke-width="1.5"/>
            <circle cx="20" cy="20" r="12" fill="#224488"/>
            <polygon points="20,12 16,20 20,20 24,20" fill="#4488ff"/>
            <polygon points="20,20 16,28 20,28 24,28" fill="#6699ff"/>
            <text x="20" y="38" font-size="7" text-anchor="middle" fill="#333">APD</text>
        </svg>`
    },

    QuadrantDetector: {
        name: '四象限探测器',
        category: ICON_CATEGORIES.DETECTORS,
        width: 45,
        height: 45,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22.5" cy="22.5" r="20" fill="#444" stroke="#222" stroke-width="1.5"/>
            <rect x="5" y="5" width="17" height="17" fill="#224488" stroke="#336699" stroke-width="1"/>
            <rect x="23" y="5" width="17" height="17" fill="#224488" stroke="#336699" stroke-width="1"/>
            <rect x="5" y="23" width="17" height="17" fill="#224488" stroke="#336699" stroke-width="1"/>
            <rect x="23" y="23" width="17" height="17" fill="#224488" stroke="#336699" stroke-width="1"/>
            <text x="22.5" y="43" font-size="6" text-anchor="middle" fill="#333">Quad</text>
        </svg>`
    },

    PositionSensitiveDetector: {
        name: '位置敏感探测器',
        category: ICON_CATEGORIES.DETECTORS,
        width: 50,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="44" height="30" fill="#444" stroke="#222" stroke-width="1.5"/>
            <rect x="8" y="10" width="34" height="20" fill="#224488" stroke="#336699" stroke-width="1"/>
            <line x1="8" y1="20" x2="42" y2="20" stroke="#4488cc" stroke-width="1"/>
            <line x1="25" y1="10" x2="25" y2="30" stroke="#4488cc" stroke-width="1"/>
            <text x="25" y="38" font-size="6" text-anchor="middle" fill="#333">PSD</text>
        </svg>`
    },

    // ========== 原子组件扩展 (8个) ==========
    MOT: {
        name: '磁光阱',
        category: ICON_CATEGORIES.ATOMIC,
        width: 70,
        height: 70,
        connectionPoints: [
            { id: 'beam1', label: 'b1', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'beam2', label: 'b2', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'beam3', label: 'b3', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'beam4', label: 'b4', position: { x: 0.5, y: 1 }, direction: 90, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <circle cx="35" cy="35" r="30" fill="rgba(255,200,150,0.2)" stroke="#cc6600" stroke-width="2" stroke-dasharray="5,3"/>
            <circle cx="35" cy="35" r="8" fill="#ff6600" opacity="0.6"/>
            <line x1="5" y1="35" x2="25" y2="35" stroke="#ff0000" stroke-width="2.5"/>
            <line x1="65" y1="35" x2="45" y2="35" stroke="#ff0000" stroke-width="2.5"/>
            <line x1="35" y1="5" x2="35" y2="25" stroke="#ff0000" stroke-width="2.5"/>
            <line x1="35" y1="65" x2="35" y2="45" stroke="#ff0000" stroke-width="2.5"/>
            <text x="35" y="68" font-size="8" text-anchor="middle" fill="#333">MOT</text>
        </svg>`
    },

    ZeemanSlower: {
        name: '塞曼减速器',
        category: ICON_CATEGORIES.ATOMIC,
        width: 100,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="10" width="90" height="20" fill="rgba(204,102,0,0.2)" stroke="#cc6600" stroke-width="1.5"/>
            <path d="M 10 20 Q 30 10, 50 20 T 90 20" stroke="#cc6600" stroke-width="2" fill="none"/>
            <circle cx="20" cy="20" r="3" fill="#cc6600"/>
            <circle cx="40" cy="20" r="3" fill="#cc6600"/>
            <circle cx="60" cy="20" r="3" fill="#cc6600"/>
            <circle cx="80" cy="20" r="3" fill="#cc6600"/>
            <text x="50" y="38" font-size="7" text-anchor="middle" fill="#333">Zeeman Slower</text>
        </svg>`
    },

    IonTrap: {
        name: '离子阱',
        category: ICON_CATEGORIES.ATOMIC,
        width: 60,
        height: 60,
        connectionPoints: [
            { id: 'beam', label: 'beam', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="30" cy="30" rx="25" ry="20" fill="rgba(100,150,255,0.2)" stroke="#4488cc" stroke-width="2"/>
            <circle cx="30" cy="30" r="5" fill="#4488ff"/>
            <line x1="10" y1="15" x2="50" y2="15" stroke="#888" stroke-width="2"/>
            <line x1="10" y1="45" x2="50" y2="45" stroke="#888" stroke-width="2"/>
            <line x1="15" y1="10" x2="15" y2="50" stroke="#888" stroke-width="2"/>
            <line x1="45" y1="10" x2="45" y2="50" stroke="#888" stroke-width="2"/>
            <text x="30" y="58" font-size="7" text-anchor="middle" fill="#333">Ion Trap</text>
        </svg>`
    },

    OpticalLattice: {
        name: '光晶格',
        category: ICON_CATEGORIES.ATOMIC,
        width: 70,
        height: 50,
        connectionPoints: [
            { id: 'beam1', label: 'b1', position: { x: 0, y: 0.3 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'beam2', label: 'b2', position: { x: 0, y: 0.7 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="60" height="40" fill="rgba(200,220,255,0.2)" stroke="#6688aa" stroke-width="1.5"/>
            <g fill="#4488cc" opacity="0.6">
                <circle cx="15" cy="15" r="2"/><circle cx="25" cy="15" r="2"/><circle cx="35" cy="15" r="2"/>
                <circle cx="45" cy="15" r="2"/><circle cx="55" cy="15" r="2"/>
                <circle cx="15" cy="25" r="2"/><circle cx="25" cy="25" r="2"/><circle cx="35" cy="25" r="2"/>
                <circle cx="45" cy="25" r="2"/><circle cx="55" cy="25" r="2"/>
                <circle cx="15" cy="35" r="2"/><circle cx="25" cy="35" r="2"/><circle cx="35" cy="35" r="2"/>
                <circle cx="45" cy="35" r="2"/><circle cx="55" cy="35" r="2"/>
            </g>
            <text x="35" y="48" font-size="7" text-anchor="middle" fill="#333">Lattice</text>
        </svg>`
    },

    OpticalDipoleTrap: {
        name: '光学偶极阱',
        category: ICON_CATEGORIES.ATOMIC,
        width: 60,
        height: 50,
        connectionPoints: [
            { id: 'beam', label: 'beam', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="30" cy="25" rx="22" ry="15" fill="rgba(255,100,100,0.2)" stroke="#ff4444" stroke-width="2"/>
            <circle cx="30" cy="25" r="4" fill="#ff6600"/>
            <line x1="5" y1="25" x2="20" y2="25" stroke="#ff0000" stroke-width="2.5"/>
            <text x="30" y="48" font-size="7" text-anchor="middle" fill="#333">ODT</text>
        </svg>`
    },

    RydbergExcitation: {
        name: 'Rydberg激发',
        category: ICON_CATEGORIES.ATOMIC,
        width: 50,
        height: 60,
        connectionPoints: [
            { id: 'probe', label: 'probe', position: { x: 0, y: 0.3 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'coupling', label: 'coup', position: { x: 0, y: 0.7 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="30" r="20" fill="rgba(150,100,255,0.2)" stroke="#8844cc" stroke-width="2"/>
            <circle cx="25" cy="30" r="5" fill="#8844cc"/>
            <circle cx="25" cy="30" r="12" fill="none" stroke="#8844cc" stroke-width="1" stroke-dasharray="2,2"/>
            <line x1="5" y1="18" x2="18" y2="25" stroke="#ff0000" stroke-width="2"/>
            <line x1="5" y1="42" x2="18" y2="35" stroke="#0066ff" stroke-width="2"/>
            <text x="25" y="58" font-size="7" text-anchor="middle" fill="#333">Rydberg</text>
        </svg>`
    },

    HelmholtzCoils: {
        name: 'Helmholtz线圈',
        category: ICON_CATEGORIES.ATOMIC,
        width: 80,
        height: 60,
        connectionPoints: [],
        svgContent: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="20" cy="30" rx="8" ry="25" fill="none" stroke="#cc6600" stroke-width="3"/>
            <ellipse cx="60" cy="30" rx="8" ry="25" fill="none" stroke="#cc6600" stroke-width="3"/>
            <line x1="28" y1="30" x2="52" y2="30" stroke="#888" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="40" y="58" font-size="7" text-anchor="middle" fill="#333">Helmholtz</text>
        </svg>`
    },

    AntiHelmholtzCoils: {
        name: '反Helmholtz线圈',
        category: ICON_CATEGORIES.ATOMIC,
        width: 80,
        height: 60,
        connectionPoints: [],
        svgContent: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="20" cy="30" rx="8" ry="25" fill="none" stroke="#cc6600" stroke-width="3"/>
            <ellipse cx="60" cy="30" rx="8" ry="25" fill="none" stroke="#cc6600" stroke-width="3"/>
            <path d="M 28 20 L 52 40" stroke="#888" stroke-width="1" stroke-dasharray="3,3"/>
            <path d="M 28 40 L 52 20" stroke="#888" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="40" y="58" font-size="7" text-anchor="middle" fill="#333">Anti-Helmholtz</text>
        </svg>`
    },

    // ========== 光纤组件扩展 (3个) ==========
    FiberCirculator: {
        name: '光纤环行器',
        category: ICON_CATEGORIES.FIBERS,
        width: 50,
        height: 50,
        connectionPoints: [
            { id: 'port1', label: '1', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.BIDIRECTIONAL },
            { id: 'port2', label: '2', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.BIDIRECTIONAL },
            { id: 'port3', label: '3', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.BIDIRECTIONAL }
        ],
        svgContent: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="#666" stroke="#333" stroke-width="1.5"/>
            <path d="M 25 25 L 25 10 M 25 25 L 40 25 M 25 25 L 25 40" stroke="#ffcc00" stroke-width="2"/>
            <path d="M 25 12 L 22 17 L 28 17 Z" fill="#ffcc00"/>
            <path d="M 38 25 L 33 22 L 33 28 Z" fill="#ffcc00"/>
            <text x="25" y="48" font-size="7" text-anchor="middle" fill="#333">Circulator</text>
        </svg>`
    },

    FiberIsolator: {
        name: '光纤隔离器',
        category: ICON_CATEGORIES.FIBERS,
        width: 50,
        height: 30,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 50 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="44" height="20" fill="#666" stroke="#333" stroke-width="1"/>
            <polygon points="20,10 28,15 20,20" fill="#4488ff" stroke="#336699" stroke-width="1"/>
            <line x1="32" y1="10" x2="32" y2="20" stroke="#ff4444" stroke-width="2"/>
            <text x="25" y="28" font-size="6" text-anchor="middle" fill="#333">Isolator</text>
        </svg>`
    },

    FiberBraggGrating: {
        name: '光纤布拉格光栅',
        category: ICON_CATEGORIES.FIBERS,
        width: 60,
        height: 25,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
            { id: 'reflected', label: 'refl', position: { x: 0, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
            <line x1="5" y1="12.5" x2="55" y2="12.5" stroke="#ffcc00" stroke-width="3"/>
            <g stroke="#666" stroke-width="1">
                <line x1="20" y1="8" x2="20" y2="17"/><line x1="24" y1="8" x2="24" y2="17"/>
                <line x1="28" y1="8" x2="28" y2="17"/><line x1="32" y1="8" x2="32" y2="17"/>
                <line x1="36" y1="8" x2="36" y2="17"/><line x1="40" y1="8" x2="40" y2="17"/>
            </g>
            <text x="30" y="23" font-size="6" text-anchor="middle" fill="#333">FBG</text>
        </svg>`
    },

    // ========== 杂项组件扩展 (10个) ==========
    SpatialFilter: {
        name: '空间滤波器',
        category: ICON_CATEGORIES.MISC,
        width: 80,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 20 Q 15 10, 25 20 T 40 20" stroke="#3366aa" stroke-width="1.5" fill="none"/>
            <circle cx="40" cy="20" r="3" fill="#333"/>
            <path d="M 40 20 Q 50 10, 60 20 T 75 20" stroke="#3366aa" stroke-width="1.5" fill="none"/>
            <text x="40" y="38" font-size="7" text-anchor="middle" fill="#333">Spatial Filter</text>
        </svg>`
    },

    BeamExpander: {
        name: '扩束器',
        category: ICON_CATEGORIES.MISC,
        width: 70,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 20 Q 5 25, 10 30" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <path d="M 50 10 Q 55 25, 50 40" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <line x1="10" y1="20" x2="50" y2="10" stroke="#ff6600" stroke-width="1.5"/>
            <line x1="10" y1="30" x2="50" y2="40" stroke="#ff6600" stroke-width="1.5"/>
            <text x="35" y="48" font-size="7" text-anchor="middle" fill="#333">Expander</text>
        </svg>`
    },

    BeamReducer: {
        name: '缩束器',
        category: ICON_CATEGORIES.MISC,
        width: 70,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 70 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 10 Q 5 25, 10 40" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <path d="M 50 20 Q 55 25, 50 30" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <line x1="10" y1="10" x2="50" y2="20" stroke="#ff6600" stroke-width="1.5"/>
            <line x1="10" y1="40" x2="50" y2="30" stroke="#ff6600" stroke-width="1.5"/>
            <text x="35" y="48" font-size="7" text-anchor="middle" fill="#333">Reducer</text>
        </svg>`
    },

    Telescope: {
        name: '望远镜系统',
        category: ICON_CATEGORIES.MISC,
        width: 90,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 15 15 Q 10 25, 15 35" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <path d="M 45 20 Q 40 25, 45 30" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <path d="M 75 15 Q 80 25, 75 35" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <line x1="5" y1="25" x2="85" y2="25" stroke="#666" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="45" y="48" font-size="7" text-anchor="middle" fill="#333">Telescope</text>
        </svg>`
    },

    Collimator: {
        name: '准直器',
        category: ICON_CATEGORIES.MISC,
        width: 60,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 60 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 20 Q 5 25, 10 30" stroke="#3366aa" stroke-width="1.5" fill="rgba(100,180,255,0.3)"/>
            <line x1="10" y1="20" x2="55" y2="22" stroke="#ff6600" stroke-width="1.5"/>
            <line x1="10" y1="30" x2="55" y2="28" stroke="#ff6600" stroke-width="1.5"/>
            <text x="30" y="48" font-size="7" text-anchor="middle" fill="#333">Collimator</text>
        </svg>`
    },

    Attenuator: {
        name: '衰减器',
        category: ICON_CATEGORIES.MISC,
        width: 40,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="rgba(100,100,100,0.3)" stroke="#666" stroke-width="1.5"/>
            <path d="M 10 20 L 30 20" stroke="#333" stroke-width="2"/>
            <circle cx="20" cy="20" r="3" fill="#888" stroke="#333" stroke-width="1"/>
            <text x="20" y="38" font-size="7" text-anchor="middle" fill="#333">Atten</text>
        </svg>`
    },

    NDFilter: {
        name: '中性密度滤光片',
        category: ICON_CATEGORIES.MISC,
        width: 10,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 10 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="6" height="46" fill="rgba(100,100,100,0.5)" stroke="#666" stroke-width="1"/>
            <text x="5" y="52" font-size="6" text-anchor="middle" fill="#333">ND</text>
        </svg>`
    },

    ColorFilter: {
        name: '彩色滤光片',
        category: ICON_CATEGORIES.MISC,
        width: 10,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 10 50" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="colorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#ff0000;stop-opacity:0.5"/>
                    <stop offset="33%" style="stop-color:#00ff00;stop-opacity:0.5"/>
                    <stop offset="66%" style="stop-color:#0000ff;stop-opacity:0.5"/>
                    <stop offset="100%" style="stop-color:#ff00ff;stop-opacity:0.5"/>
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="6" height="46" fill="url(#colorGrad)" stroke="#666" stroke-width="1"/>
        </svg>`
    },

    BandpassFilter: {
        name: '带通滤光片',
        category: ICON_CATEGORIES.MISC,
        width: 10,
        height: 50,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 10 50" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="6" height="46" fill="rgba(100,200,100,0.4)" stroke="#66aa66" stroke-width="1"/>
            <text x="5" y="52" font-size="6" text-anchor="middle" fill="#333">BP</text>
        </svg>`
    },

    Shutter: {
        name: '快门',
        category: ICON_CATEGORIES.MISC,
        width: 40,
        height: 40,
        connectionPoints: [
            { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
            { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
        ],
        svgContent: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="30" height="30" fill="#666" stroke="#333" stroke-width="1.5"/>
            <rect x="10" y="15" width="20" height="10" fill="#333"/>
            <rect x="15" y="10" width="10" height="20" fill="#333"/>
            <text x="20" y="38" font-size="7" text-anchor="middle" fill="#333">Shutter</text>
        </svg>`
    }
};

/**
 * 注册所有扩展图标到图标管理器
 */
export function registerExtendedIcons() {
    const manager = getProfessionalIconManager();
    
    Object.entries(EXTENDED_SVG_ICONS).forEach(([type, definition]) => {
        manager.registerIcon(type, definition);
    });
    
    console.log(`ProfessionalIconLibraryExtended: Registered ${Object.keys(EXTENDED_SVG_ICONS).length} extended SVG icons`);
}

/**
 * 获取所有扩展图标类型
 * @returns {string[]}
 */
export function getExtendedIconTypes() {
    return Object.keys(EXTENDED_SVG_ICONS);
}

// 自动注册图标（如果在浏览器环境）
if (typeof window !== 'undefined') {
    // 延迟注册，确保ProfessionalIconManager已加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerExtendedIcons);
    } else {
        registerExtendedIcons();
    }
    
    // 导出到全局
    window.EXTENDED_SVG_ICONS = EXTENDED_SVG_ICONS;
    window.registerExtendedIcons = registerExtendedIcons;
}
