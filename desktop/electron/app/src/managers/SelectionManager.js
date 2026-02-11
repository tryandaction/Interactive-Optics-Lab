/**
 * SelectionManager.js - 选择管理器
 * 处理文件/场景的单选和多选操作
 */

import { EventEmitter } from './EventEmitter.js';

/**
 * @typedef {import('./types.js').FileReference} FileReference
 */

/**
 * 选择管理器
 * 支持单选、多选、范围选择、全选等操作
 */
export class SelectionManager extends EventEmitter {
    constructor() {
        super();
        
        /** @type {Set<string>} 选中项的 ID 集合 */
        this._selectedIds = new Set();
        
        /** @type {Map<string, FileReference>} ID 到文件引用的映射 */
        this._itemsMap = new Map();
        
        /** @type {string|null} 最后选中的项（用于范围选择） */
        this._lastSelectedId = null;
        
        /** @type {string|null} 锚点项（用于 Shift 范围选择） */
        this._anchorId = null;
        
        /** @type {string[]} 有序的项目列表（用于范围选择） */
        this._orderedItems = [];
    }

    /**
     * 设置可选项目列表
     * @param {FileReference[]} items - 项目列表
     */
    setItems(items) {
        this._itemsMap.clear();
        this._orderedItems = [];
        
        for (const item of items) {
            const id = this._getItemId(item);
            this._itemsMap.set(id, item);
            this._orderedItems.push(id);
        }
        
        // 清除不存在的选中项
        const validIds = new Set(this._orderedItems);
        for (const id of this._selectedIds) {
            if (!validIds.has(id)) {
                this._selectedIds.delete(id);
            }
        }
        
        this.emit('itemsChanged', { items: this._orderedItems });
    }

    /**
     * 选择单个项目（清除其他选择）
     * @param {string|FileReference} item - 项目或项目 ID
     */
    select(item) {
        const id = this._resolveId(item);
        if (!id || !this._itemsMap.has(id)) return;
        
        const previousSelection = this.getSelectedIds();
        this._selectedIds.clear();
        this._selectedIds.add(id);
        this._lastSelectedId = id;
        this._anchorId = id;
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 添加到选择（不清除其他选择）
     * @param {string|FileReference} item - 项目或项目 ID
     */
    addToSelection(item) {
        const id = this._resolveId(item);
        if (!id || !this._itemsMap.has(id)) return;
        
        const previousSelection = this.getSelectedIds();
        this._selectedIds.add(id);
        this._lastSelectedId = id;
        
        // 如果没有锚点，设置当前为锚点
        if (!this._anchorId) {
            this._anchorId = id;
        }
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 取消选择
     * @param {string|FileReference} item - 项目或项目 ID
     */
    deselect(item) {
        const id = this._resolveId(item);
        if (!id) return;
        
        const previousSelection = this.getSelectedIds();
        this._selectedIds.delete(id);
        
        if (this._lastSelectedId === id) {
            this._lastSelectedId = this._selectedIds.size > 0 
                ? Array.from(this._selectedIds).pop() 
                : null;
        }
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 切换选择状态
     * @param {string|FileReference} item - 项目或项目 ID
     */
    toggle(item) {
        const id = this._resolveId(item);
        if (!id || !this._itemsMap.has(id)) return;
        
        if (this._selectedIds.has(id)) {
            this.deselect(id);
        } else {
            this.addToSelection(id);
        }
    }

    /**
     * 范围选择（Shift+Click）
     * 从锚点到目标项的所有项目
     * @param {string|FileReference} item - 目标项目
     */
    selectRange(item) {
        const targetId = this._resolveId(item);
        if (!targetId || !this._itemsMap.has(targetId)) return;
        
        const previousSelection = this.getSelectedIds();
        
        // 如果没有锚点，当作普通选择
        if (!this._anchorId || !this._itemsMap.has(this._anchorId)) {
            this.select(targetId);
            return;
        }
        
        const anchorIndex = this._orderedItems.indexOf(this._anchorId);
        const targetIndex = this._orderedItems.indexOf(targetId);
        
        if (anchorIndex === -1 || targetIndex === -1) {
            this.select(targetId);
            return;
        }
        
        // 清除当前选择，选择范围内的所有项
        this._selectedIds.clear();
        
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        
        for (let i = start; i <= end; i++) {
            this._selectedIds.add(this._orderedItems[i]);
        }
        
        this._lastSelectedId = targetId;
        // 保持锚点不变
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 全选
     */
    selectAll() {
        const previousSelection = this.getSelectedIds();
        
        this._selectedIds.clear();
        for (const id of this._orderedItems) {
            this._selectedIds.add(id);
        }
        
        if (this._orderedItems.length > 0) {
            this._lastSelectedId = this._orderedItems[this._orderedItems.length - 1];
            if (!this._anchorId) {
                this._anchorId = this._orderedItems[0];
            }
        }
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 清除所有选择
     */
    clearSelection() {
        const previousSelection = this.getSelectedIds();
        
        this._selectedIds.clear();
        this._lastSelectedId = null;
        this._anchorId = null;
        
        this._emitSelectionChange(previousSelection);
    }

    /**
     * 检查项目是否被选中
     * @param {string|FileReference} item - 项目或项目 ID
     * @returns {boolean}
     */
    isSelected(item) {
        const id = this._resolveId(item);
        return id ? this._selectedIds.has(id) : false;
    }

    /**
     * 获取选中项的 ID 列表
     * @returns {string[]}
     */
    getSelectedIds() {
        return Array.from(this._selectedIds);
    }

    /**
     * 获取选中的文件引用列表
     * @returns {FileReference[]}
     */
    getSelectedItems() {
        const items = [];
        for (const id of this._selectedIds) {
            const item = this._itemsMap.get(id);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }

    /**
     * 获取选中项数量
     * @returns {number}
     */
    getSelectionCount() {
        return this._selectedIds.size;
    }

    /**
     * 是否有选中项
     * @returns {boolean}
     */
    hasSelection() {
        return this._selectedIds.size > 0;
    }

    /**
     * 是否为多选状态
     * @returns {boolean}
     */
    isMultiSelection() {
        return this._selectedIds.size > 1;
    }

    /**
     * 获取最后选中的项
     * @returns {FileReference|null}
     */
    getLastSelectedItem() {
        if (!this._lastSelectedId) return null;
        return this._itemsMap.get(this._lastSelectedId) || null;
    }

    /**
     * 处理点击事件
     * @param {string|FileReference} item - 点击的项目
     * @param {Object} modifiers - 修饰键状态
     * @param {boolean} modifiers.ctrlKey - Ctrl 键是否按下
     * @param {boolean} modifiers.shiftKey - Shift 键是否按下
     * @param {boolean} modifiers.metaKey - Meta 键是否按下（Mac 的 Cmd）
     */
    handleClick(item, modifiers = {}) {
        const { ctrlKey = false, shiftKey = false, metaKey = false } = modifiers;
        const isMultiSelectKey = ctrlKey || metaKey;
        
        if (shiftKey) {
            // Shift+Click: 范围选择
            this.selectRange(item);
        } else if (isMultiSelectKey) {
            // Ctrl/Cmd+Click: 切换选择
            this.toggle(item);
        } else {
            // 普通点击: 单选
            this.select(item);
        }
    }

    /**
     * 移动选择（键盘导航）
     * @param {'up'|'down'|'home'|'end'} direction - 移动方向
     * @param {Object} modifiers - 修饰键状态
     */
    moveSelection(direction, modifiers = {}) {
        if (this._orderedItems.length === 0) return;
        
        const { shiftKey = false } = modifiers;
        let currentIndex = -1;
        
        if (this._lastSelectedId) {
            currentIndex = this._orderedItems.indexOf(this._lastSelectedId);
        }
        
        let newIndex;
        switch (direction) {
            case 'up':
                newIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                break;
            case 'down':
                newIndex = currentIndex < this._orderedItems.length - 1 
                    ? currentIndex + 1 
                    : this._orderedItems.length - 1;
                break;
            case 'home':
                newIndex = 0;
                break;
            case 'end':
                newIndex = this._orderedItems.length - 1;
                break;
            default:
                return;
        }
        
        const newId = this._orderedItems[newIndex];
        
        if (shiftKey) {
            this.selectRange(newId);
        } else {
            this.select(newId);
        }
    }

    // ============ 私有方法 ============

    /**
     * 获取项目的 ID
     * @private
     */
    _getItemId(item) {
        if (typeof item === 'string') return item;
        return item.id || item.name || item.path;
    }

    /**
     * 解析项目 ID
     * @private
     */
    _resolveId(item) {
        if (typeof item === 'string') return item;
        return this._getItemId(item);
    }

    /**
     * 发出选择变更事件
     * @private
     */
    _emitSelectionChange(previousSelection) {
        const currentSelection = this.getSelectedIds();
        
        // 检查是否真的有变化
        if (this._arraysEqual(previousSelection, currentSelection)) {
            return;
        }
        
        this.emit('selectionChanged', {
            selected: currentSelection,
            items: this.getSelectedItems(),
            count: currentSelection.length,
            isMultiple: currentSelection.length > 1
        });
    }

    /**
     * 比较两个数组是否相等
     * @private
     */
    _arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        const setA = new Set(a);
        return b.every(item => setA.has(item));
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this._selectedIds.clear();
        this._itemsMap.clear();
        this._orderedItems = [];
        this._lastSelectedId = null;
        this._anchorId = null;
        super.destroy();
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SelectionManager = SelectionManager;
}
