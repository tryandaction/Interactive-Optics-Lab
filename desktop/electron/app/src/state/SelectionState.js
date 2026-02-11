/**
 * SelectionState.js - 选择状态管理
 * 管理组件的选择、多选和选择框
 */

import { Vector } from '../core/Vector.js';

// 选择状态
const selectionState = {
    selectedComponents: [],
    selectedComponent: null, // 最后选中的组件（用于属性面板）
    
    // 框选状态
    isBoxSelecting: false,
    boxSelectStart: null,
    boxSelectEnd: null,
    
    // 选择历史（用于撤销）
    selectionHistory: []
};

/**
 * 获取所有选中的组件
 * @returns {Array} 选中的组件数组
 */
export function getSelectedComponents() {
    return [...selectionState.selectedComponents];
}

/**
 * 获取当前选中的单个组件（用于属性面板）
 * @returns {Object|null} 选中的组件或null
 */
export function getSelectedComponent() {
    return selectionState.selectedComponent;
}

/**
 * 选择单个组件
 * @param {Object} component - 要选择的组件
 * @param {boolean} addToSelection - 是否添加到现有选择（多选）
 */
export function selectComponent(component, addToSelection = false) {
    if (!component) return;
    
    if (addToSelection) {
        // 多选模式
        if (!selectionState.selectedComponents.includes(component)) {
            selectionState.selectedComponents.push(component);
            component.selected = true;
        }
    } else {
        // 单选模式 - 先清除其他选择
        clearSelection();
        selectionState.selectedComponents = [component];
        component.selected = true;
    }
    
    selectionState.selectedComponent = component;
}

/**
 * 取消选择单个组件
 * @param {Object} component - 要取消选择的组件
 */
export function deselectComponent(component) {
    if (!component) return;
    
    const index = selectionState.selectedComponents.indexOf(component);
    if (index > -1) {
        selectionState.selectedComponents.splice(index, 1);
        component.selected = false;
        
        // 更新 selectedComponent
        if (selectionState.selectedComponent === component) {
            selectionState.selectedComponent = selectionState.selectedComponents.length > 0
                ? selectionState.selectedComponents[selectionState.selectedComponents.length - 1]
                : null;
        }
    }
}

/**
 * 切换组件的选择状态
 * @param {Object} component - 要切换的组件
 */
export function toggleSelection(component) {
    if (!component) return;
    
    if (selectionState.selectedComponents.includes(component)) {
        deselectComponent(component);
    } else {
        selectComponent(component, true);
    }
}

/**
 * 清除所有选择
 */
export function clearSelection() {
    selectionState.selectedComponents.forEach(comp => {
        if (comp) comp.selected = false;
    });
    selectionState.selectedComponents = [];
    selectionState.selectedComponent = null;
}

/**
 * 选择多个组件
 * @param {Array} components - 要选择的组件数组
 * @param {boolean} addToSelection - 是否添加到现有选择
 */
export function selectMultiple(components, addToSelection = false) {
    if (!Array.isArray(components)) return;
    
    if (!addToSelection) {
        clearSelection();
    }
    
    components.forEach(comp => {
        if (comp && !selectionState.selectedComponents.includes(comp)) {
            selectionState.selectedComponents.push(comp);
            comp.selected = true;
        }
    });
    
    if (components.length > 0) {
        selectionState.selectedComponent = components[components.length - 1];
    }
}

/**
 * 检查组件是否被选中
 * @param {Object} component - 要检查的组件
 * @returns {boolean} 是否被选中
 */
export function isSelected(component) {
    return selectionState.selectedComponents.includes(component);
}

/**
 * 获取选中组件的数量
 * @returns {number} 选中数量
 */
export function getSelectionCount() {
    return selectionState.selectedComponents.length;
}

/**
 * 检查是否有选中的组件
 * @returns {boolean} 是否有选中
 */
export function hasSelection() {
    return selectionState.selectedComponents.length > 0;
}

// --- 框选功能 ---

/**
 * 开始框选
 * @param {number} x - 起始X坐标
 * @param {number} y - 起始Y坐标
 */
export function startBoxSelect(x, y) {
    selectionState.isBoxSelecting = true;
    selectionState.boxSelectStart = new Vector(x, y);
    selectionState.boxSelectEnd = new Vector(x, y);
}

/**
 * 更新框选区域
 * @param {number} x - 当前X坐标
 * @param {number} y - 当前Y坐标
 */
export function updateBoxSelect(x, y) {
    if (selectionState.isBoxSelecting) {
        selectionState.boxSelectEnd = new Vector(x, y);
    }
}

/**
 * 结束框选
 * @returns {Object|null} 框选区域 {minX, minY, maxX, maxY} 或 null
 */
export function endBoxSelect() {
    if (!selectionState.isBoxSelecting) return null;
    
    selectionState.isBoxSelecting = false;
    
    if (!selectionState.boxSelectStart || !selectionState.boxSelectEnd) return null;
    
    const box = {
        minX: Math.min(selectionState.boxSelectStart.x, selectionState.boxSelectEnd.x),
        minY: Math.min(selectionState.boxSelectStart.y, selectionState.boxSelectEnd.y),
        maxX: Math.max(selectionState.boxSelectStart.x, selectionState.boxSelectEnd.x),
        maxY: Math.max(selectionState.boxSelectStart.y, selectionState.boxSelectEnd.y)
    };
    
    selectionState.boxSelectStart = null;
    selectionState.boxSelectEnd = null;
    
    return box;
}

/**
 * 检查是否正在框选
 * @returns {boolean} 是否正在框选
 */
export function isBoxSelecting() {
    return selectionState.isBoxSelecting;
}

/**
 * 获取当前框选区域
 * @returns {Object|null} 框选区域或null
 */
export function getBoxSelectRect() {
    if (!selectionState.isBoxSelecting || !selectionState.boxSelectStart || !selectionState.boxSelectEnd) {
        return null;
    }
    
    return {
        minX: Math.min(selectionState.boxSelectStart.x, selectionState.boxSelectEnd.x),
        minY: Math.min(selectionState.boxSelectStart.y, selectionState.boxSelectEnd.y),
        maxX: Math.max(selectionState.boxSelectStart.x, selectionState.boxSelectEnd.x),
        maxY: Math.max(selectionState.boxSelectStart.y, selectionState.boxSelectEnd.y)
    };
}

/**
 * 取消框选
 */
export function cancelBoxSelect() {
    selectionState.isBoxSelecting = false;
    selectionState.boxSelectStart = null;
    selectionState.boxSelectEnd = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SelectionState = {
        getSelectedComponents,
        getSelectedComponent,
        selectComponent,
        deselectComponent,
        toggleSelection,
        clearSelection,
        selectMultiple,
        isSelected,
        getSelectionCount,
        hasSelection,
        startBoxSelect,
        updateBoxSelect,
        endBoxSelect,
        isBoxSelecting,
        getBoxSelectRect,
        cancelBoxSelect
    };
}
