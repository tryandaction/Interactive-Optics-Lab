/**
 * SelectionManager.js - 选择管理器
 * 管理图表元素的选择、多选和框选
 * 
 * Requirements: 4.1, 4.3, 4.4, 4.7
 * 
 * Features:
 * - Single and multiple selection
 * - Box selection (drag to select)
 * - Hit testing with z-index support
 * - Selection rendering
 * - Keyboard modifiers (Ctrl/Shift)
 */

import { getEventBus } from './EventBus.js';

/**
 * 选择管理器类
 */
export class SelectionManager {
    constructor(config = {}) {
        this.canvas = config.canvas || null;
        this.ctx = config.ctx || null;
        this.eventBus = config.eventBus || getEventBus();
        
        // 选中的元素
        this.selectedItems = new Set();
        
        // 框选状态
        this.isBoxSelecting = false;
        this.boxStart = null;
        this.boxEnd = null;
        
        // 配置
        this.selectionColor = config.selectionColor || '#4488ff';
        this.selectionLineWidth = config.selectionLineWidth || 2;
        this.boxSelectionColor = config.boxSelectionColor || 'rgba(68, 136, 255, 0.2)';
        this.boxSelectionBorderColor = config.boxSelectionBorderColor || '#4488ff';
        this.hitTestTolerance = config.hitTestTolerance || 5;
        
        // 回调
        this.onSelectionChange = null;
        
        // 统计
        this.stats = {
            totalSelections: 0,
            boxSelections: 0,
            multiSelections: 0
        };
    }

    /**
     * 处理点击选择
     * @param {number} x - 点击X坐标
     * @param {number} y - 点击Y坐标
     * @param {Array} items - 可选择的元素列表
     * @param {boolean} ctrlKey - 是否按下Ctrl键
     * @param {boolean} shiftKey - 是否按下Shift键
     * @returns {Object|null} 选中的元素
     */
    handleClick(x, y, items, ctrlKey = false, shiftKey = false) {
        // 命中测试
        const hitItem = this._hitTest(x, y, items);
        
        if (hitItem) {
            if (ctrlKey) {
                // Ctrl+点击：切换选择
                this.toggleSelection(hitItem);
            } else if (shiftKey) {
                // Shift+点击：添加到选择
                this.addToSelection(hitItem);
            } else {
                // 普通点击：单选
                this.select(hitItem);
            }
            
            this.stats.totalSelections++;
            return hitItem;
        } else {
            // 点击空白区域：取消选择
            if (!ctrlKey && !shiftKey) {
                this.clearSelection();
            }
            return null;
        }
    }

    /**
     * 选中元素
     * @param {Object|Array} items - 要选中的元素
     */
    select(items) {
        // 清除现有选择
        this.selectedItems.clear();
        
        // 添加新选择
        const itemArray = Array.isArray(items) ? items : [items];
        itemArray.forEach(item => {
            if (item) {
                this.selectedItems.add(item);
            }
        });
        
        if (itemArray.length > 1) {
            this.stats.multiSelections++;
        }
        
        this._notifySelectionChange();
    }

    /**
     * 添加到选择
     * @param {Object|Array} items - 要添加的元素
     */
    addToSelection(items) {
        const itemArray = Array.isArray(items) ? items : [items];
        const sizeBefore = this.selectedItems.size;
        
        itemArray.forEach(item => {
            if (item) {
                this.selectedItems.add(item);
            }
        });
        
        if (this.selectedItems.size > sizeBefore) {
            this._notifySelectionChange();
        }
    }

    /**
     * 从选择中移除
     * @param {Object|Array} items - 要移除的元素
     */
    removeFromSelection(items) {
        const itemArray = Array.isArray(items) ? items : [items];
        const sizeBefore = this.selectedItems.size;
        
        itemArray.forEach(item => {
            if (item) {
                this.selectedItems.delete(item);
            }
        });
        
        if (this.selectedItems.size < sizeBefore) {
            this._notifySelectionChange();
        }
    }

    /**
     * 切换选择
     * @param {Object} item - 要切换的元素
     */
    toggleSelection(item) {
        if (this.selectedItems.has(item)) {
            this.selectedItems.delete(item);
        } else {
            this.selectedItems.add(item);
        }
        
        this._notifySelectionChange();
    }

    /**
     * 取消选择
     */
    clearSelection() {
        if (this.selectedItems.size > 0) {
            this.selectedItems.clear();
            this._notifySelectionChange();
        }
    }

    /**
     * 检查元素是否被选中
     * @param {Object} item - 元素
     * @returns {boolean} 是否被选中
     */
    isSelected(item) {
        return this.selectedItems.has(item);
    }

    /**
     * 获取选中的元素
     * @returns {Array} 选中的元素数组
     */
    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    /**
     * 获取选中元素数量
     * @returns {number} 数量
     */
    getSelectionCount() {
        return this.selectedItems.size;
    }

    /**
     * 开始框选
     * @param {number} x - 起始X坐标
     * @param {number} y - 起始Y坐标
     */
    startBoxSelection(x, y) {
        this.isBoxSelecting = true;
        this.boxStart = { x, y };
        this.boxEnd = { x, y };
        
        this.eventBus.emit('selection:box-start', {
            start: this.boxStart
        });
    }

    /**
     * 更新框选
     * @param {number} x - 当前X坐标
     * @param {number} y - 当前Y坐标
     */
    updateBoxSelection(x, y) {
        if (!this.isBoxSelecting) return;
        
        this.boxEnd = { x, y };
        
        this.eventBus.emit('selection:box-update', {
            start: this.boxStart,
            end: this.boxEnd
        });
    }

    /**
     * 结束框选
     * @param {number} x - 结束X坐标
     * @param {number} y - 结束Y坐标
     * @param {Array} items - 可选择的元素列表
     * @param {boolean} ctrlKey - 是否按下Ctrl键
     */
    endBoxSelection(x, y, items, ctrlKey = false) {
        if (!this.isBoxSelecting) return;
        
        this.boxEnd = { x, y };
        
        // 获取框选区域内的元素
        const selectedItems = this._getItemsInBox(items);
        
        if (ctrlKey) {
            // Ctrl+框选：添加到现有选择
            this.addToSelection(selectedItems);
        } else {
            // 普通框选：替换选择
            this.select(selectedItems);
        }
        
        this.stats.boxSelections++;
        
        this.eventBus.emit('selection:box-end', {
            start: this.boxStart,
            end: this.boxEnd,
            selectedItems
        });
        
        // 重置框选状态
        this.isBoxSelecting = false;
        this.boxStart = null;
        this.boxEnd = null;
    }

    /**
     * 取消框选
     */
    cancelBoxSelection() {
        if (!this.isBoxSelecting) return;
        
        this.isBoxSelecting = false;
        this.boxStart = null;
        this.boxEnd = null;
        
        this.eventBus.emit('selection:box-cancel', {});
    }

    /**
     * 渲染选择
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    renderSelection(ctx = null) {
        const context = ctx || this.ctx;
        if (!context) return;
        
        // 渲染选中元素的边框
        context.save();
        context.strokeStyle = this.selectionColor;
        context.lineWidth = this.selectionLineWidth;
        context.setLineDash([5, 5]);
        
        for (const item of this.selectedItems) {
            this._renderItemSelection(context, item);
        }
        
        context.restore();
        
        // 渲染框选区域
        if (this.isBoxSelecting && this.boxStart && this.boxEnd) {
            this._renderBoxSelection(context);
        }
    }

    /**
     * 设置画布
     * @param {HTMLCanvasElement} canvas - 画布元素
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    setCanvas(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            currentSelection: this.selectedItems.size
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 命中测试
     * @private
     */
    _hitTest(x, y, items) {
        if (!items || items.length === 0) return null;
        
        // 按z-index从高到低排序（选择最上层的元素）
        const sortedItems = [...items].sort((a, b) => {
            const zIndexA = a.zIndex || 0;
            const zIndexB = b.zIndex || 0;
            return zIndexB - zIndexA;
        });
        
        // 测试每个元素
        for (const item of sortedItems) {
            if (this._isPointInItem(x, y, item)) {
                return item;
            }
        }
        
        return null;
    }

    /**
     * 检查点是否在元素内
     * @private
     */
    _isPointInItem(x, y, item) {
        if (!item) return false;
        
        // 如果元素有自定义的命中测试方法
        if (typeof item.hitTest === 'function') {
            return item.hitTest(x, y, this.hitTestTolerance);
        }
        
        // 默认矩形命中测试
        if (item.x !== undefined && item.y !== undefined && 
            item.width !== undefined && item.height !== undefined) {
            const tolerance = this.hitTestTolerance;
            return x >= item.x - tolerance && 
                   x <= item.x + item.width + tolerance &&
                   y >= item.y - tolerance && 
                   y <= item.y + item.height + tolerance;
        }
        
        // 圆形命中测试
        if (item.x !== undefined && item.y !== undefined && item.radius !== undefined) {
            const dx = x - item.x;
            const dy = y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= item.radius + this.hitTestTolerance;
        }
        
        return false;
    }

    /**
     * 获取框选区域内的元素
     * @private
     */
    _getItemsInBox(items) {
        if (!items || items.length === 0) return [];
        if (!this.boxStart || !this.boxEnd) return [];
        
        const minX = Math.min(this.boxStart.x, this.boxEnd.x);
        const maxX = Math.max(this.boxStart.x, this.boxEnd.x);
        const minY = Math.min(this.boxStart.y, this.boxEnd.y);
        const maxY = Math.max(this.boxStart.y, this.boxEnd.y);
        
        return items.filter(item => {
            if (!item) return false;
            
            // 如果元素有自定义的框选测试方法
            if (typeof item.intersectsBox === 'function') {
                return item.intersectsBox(minX, minY, maxX, maxY);
            }
            
            // 默认矩形相交测试
            if (item.x !== undefined && item.y !== undefined) {
                const itemMinX = item.x;
                const itemMaxX = item.x + (item.width || 0);
                const itemMinY = item.y;
                const itemMaxY = item.y + (item.height || 0);
                
                return !(itemMaxX < minX || itemMinX > maxX || 
                        itemMaxY < minY || itemMinY > maxY);
            }
            
            return false;
        });
    }

    /**
     * 渲染元素选择边框
     * @private
     */
    _renderItemSelection(ctx, item) {
        if (!item) return;
        
        // 如果元素有自定义的选择渲染方法
        if (typeof item.renderSelection === 'function') {
            item.renderSelection(ctx, this.selectionColor, this.selectionLineWidth);
            return;
        }
        
        // 默认矩形边框
        if (item.x !== undefined && item.y !== undefined && 
            item.width !== undefined && item.height !== undefined) {
            ctx.strokeRect(item.x, item.y, item.width, item.height);
            
            // 绘制控制点
            this._renderControlPoints(ctx, item);
        }
        
        // 圆形边框
        if (item.x !== undefined && item.y !== undefined && item.radius !== undefined) {
            ctx.beginPath();
            ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * 渲染控制点
     * @private
     */
    _renderControlPoints(ctx, item) {
        const handleSize = 6;
        const handles = [
            { x: item.x, y: item.y }, // 左上
            { x: item.x + item.width, y: item.y }, // 右上
            { x: item.x + item.width, y: item.y + item.height }, // 右下
            { x: item.x, y: item.y + item.height } // 左下
        ];
        
        ctx.fillStyle = this.selectionColor;
        handles.forEach(handle => {
            ctx.fillRect(
                handle.x - handleSize / 2,
                handle.y - handleSize / 2,
                handleSize,
                handleSize
            );
        });
    }

    /**
     * 渲染框选区域
     * @private
     */
    _renderBoxSelection(ctx) {
        if (!this.boxStart || !this.boxEnd) return;
        
        const x = Math.min(this.boxStart.x, this.boxEnd.x);
        const y = Math.min(this.boxStart.y, this.boxEnd.y);
        const width = Math.abs(this.boxEnd.x - this.boxStart.x);
        const height = Math.abs(this.boxEnd.y - this.boxStart.y);
        
        ctx.save();
        
        // 填充
        ctx.fillStyle = this.boxSelectionColor;
        ctx.fillRect(x, y, width, height);
        
        // 边框
        ctx.strokeStyle = this.boxSelectionBorderColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        
        ctx.restore();
    }

    /**
     * 通知选择变化
     * @private
     */
    _notifySelectionChange() {
        const selectedItems = this.getSelectedItems();
        
        this.eventBus.emit('selection:change', {
            selectedItems,
            count: selectedItems.length
        });
        
        if (this.onSelectionChange) {
            this.onSelectionChange(selectedItems);
        }
    }

    /**
     * 销毁
     */
    destroy() {
        this.clearSelection();
        this.cancelBoxSelection();
        this.canvas = null;
        this.ctx = null;
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let selectionManagerInstance = null;

export function getSelectionManager(config) {
    if (!selectionManagerInstance) {
        selectionManagerInstance = new SelectionManager(config);
    }
    return selectionManagerInstance;
}

export function resetSelectionManager() {
    if (selectionManagerInstance) {
        selectionManagerInstance.destroy();
    }
    selectionManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.SelectionManager = SelectionManager;
    window.getSelectionManager = getSelectionManager;
}
