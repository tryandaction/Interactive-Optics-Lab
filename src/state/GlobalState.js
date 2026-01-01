/**
 * GlobalState.js - 全局状态管理
 * 管理模拟器的核心状态变量
 */

import { Vector } from '../core/Vector.js';
import { MAX_RAY_BOUNCES, MIN_RAY_INTENSITY } from '../core/constants.js';

// 全局状态对象
const state = {
    // 组件状态
    components: [],
    selectedComponents: [],
    selectedComponent: null,
    
    // 拖动状态
    draggingComponents: [],
    dragStartOffsets: new Map(),
    dragStartMousePos: null,
    isDragging: false,
    
    // 光线追踪状态
    needsRetrace: true,
    currentRayPaths: [],
    nextFrameActiveRays: [],
    
    // 工具状态
    componentToAdd: null,
    currentMode: 'ray_trace',
    
    // 鼠标状态
    mousePos: new Vector(0, 0),
    mouseIsDown: false,
    
    // 模拟设置
    maxRaysPerSource: 1001,
    globalMaxBounces: MAX_RAY_BOUNCES,
    globalMinIntensity: MIN_RAY_INTENSITY,
    fastWhiteLightMode: false,
    
    // 网格设置
    showGrid: true,
    enableGridSnap: true,
    gridSize: 50,
    gridSnapThreshold: 10.0,
    
    // 对齐辅助线
    activeGuides: [],
    snapThreshold: 5.0,
    
    // 场景状态
    sceneModified: false,
    isImporting: false,
    
    // 动画状态
    arrowAnimationStartTime: 0,
    globalShowArrows: false,
    onlyShowSelectedSourceArrow: false,
    arrowAnimationSpeed: 100,
    showArrowTrail: true,
    arrowAnimationStates: new Map(),
    
    // 历史记录状态
    lastRecordedMoveState: null,
    lastRecordedRotateState: null,
    lastRecordedPropertyState: null,
    ongoingActionState: null,
    
    // 拖动阴影状态
    dragShadowEnabled: false,
    dragShadowDuration: 800,
    dragShadowStartTime: 0,
    dragShadowComponent: null,
    dragShadowPosition: null,
    dragShadowTrail: [],
    lastTrailUpdate: 0,
    
    // 时间状态
    lastTimestamp: 0,
    initialized: false,
    eventListenersSetup: false
};

/**
 * 获取状态值
 * @param {string} key - 状态键名
 * @returns {*} 状态值
 */
export function getState(key) {
    if (key in state) {
        return state[key];
    }
    console.warn(`GlobalState: Unknown state key "${key}"`);
    return undefined;
}

/**
 * 设置状态值
 * @param {string} key - 状态键名
 * @param {*} value - 新值
 */
export function setState(key, value) {
    if (key in state) {
        state[key] = value;
    } else {
        console.warn(`GlobalState: Unknown state key "${key}"`);
    }
}

/**
 * 批量更新状态
 * @param {Object} updates - 要更新的键值对
 */
export function updateState(updates) {
    for (const [key, value] of Object.entries(updates)) {
        if (key in state) {
            state[key] = value;
        } else {
            console.warn(`GlobalState: Unknown state key "${key}"`);
        }
    }
}

/**
 * 重置状态到初始值
 */
export function resetState() {
    state.components = [];
    state.selectedComponents = [];
    state.selectedComponent = null;
    state.draggingComponents = [];
    state.dragStartOffsets = new Map();
    state.dragStartMousePos = null;
    state.isDragging = false;
    state.needsRetrace = true;
    state.currentRayPaths = [];
    state.nextFrameActiveRays = [];
    state.componentToAdd = null;
    state.mousePos = new Vector(0, 0);
    state.mouseIsDown = false;
    state.activeGuides = [];
    state.sceneModified = false;
    state.arrowAnimationStates = new Map();
    state.dragShadowTrail = [];
}

/**
 * 获取完整状态对象（只读）
 * @returns {Object} 状态对象的浅拷贝
 */
export function getAllState() {
    return { ...state };
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GlobalState = {
        getState,
        setState,
        updateState,
        resetState,
        getAllState
    };
}
