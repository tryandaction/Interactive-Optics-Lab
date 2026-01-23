/**
 * CanvasEventHandler.js - Canvas事件处理器
 * 处理画布上的所有用户交互事件
 * 
 * Requirements: 4.2, 4.3, 4.5, 4.6
 * 
 * Features:
 * - Component dragging
 * - Double-click for properties
 * - Delete key handling
 * - Event priority management
 * - Context menu
 */

import { getEventBus } from './EventBus.js';
import { getSelectionManager } from './SelectionManager.js';

/**
 * Canvas事件处理器类
 */
export class CanvasEventHandler {
    constructor(config = {}) {
        this.canvas = config.canvas || null;
        this.eventBus = config.eventBus || getEventBus();
        this.selectionManager = config.selectionManager || getSelectionManager();
        
        // 状态
        this.isDragging = false;
        this.dragStartPos = null;
        this.draggedItems = [];
        this.lastClickTime = 0;
        this.doubleClickDelay = 300; // ms
        
        // 配置
        this.enableDrag = config.enableDrag !== false;
        this.enableDoubleClick = config.enableDoubleClick !== false;
        this.enableDelete = config.enableDelete !== false;
        this.enableContextMenu = config.enableContextMenu !== false;
        
        // 回调
        this.onComponentDrag = null;
        this.onComponentDoubleClick = null;
        this.onComponentDelete = null;
        this.onContextMenu = null;
        this.getComponents = null; // 获取所有组件的函数
        
        // 事件监听器引用
        this.boundHandlers = {};
        
        // 统计
        this.stats = {
            totalDrags: 0,
            totalDoubleClicks: 0,
            totalDeletes: 0,
            totalContextMenus: 0
        };
    }

    /**
     * 绑定到画布
     * @param {HTMLCanvasElement} canvas - 画布元素
     */
    bindToCanvas(canvas) {
        if (this.canvas) {
            this.unbindFromCanvas();
        }
        
        this.canvas = canvas;
        this._setupEventListeners();
        
        console.log('[CanvasEventHandler] Bound to canvas');
    }

    /**
     * 从画布解绑
     */
    unbindFromCanvas() {
        if (!this.canvas) return;
        
        this._removeEventListeners();
        this.canvas = null;
        
        console.log('[CanvasEventHandler] Unbound from canvas');
    }

    /**
     * 设置组件获取函数
     * @param {Function} getter - 返回组件数组的函数
     */
    setComponentGetter(getter) {
        this.getComponents = getter;
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    // ==================== 私有方法 ====================

    /**
     * 设置事件监听器
     * @private
     */
    _setupEventListeners() {
        if (!this.canvas) return;
        
        // 鼠标事件
        this.boundHandlers.mousedown = (e) => this._handleMouseDown(e);
        this.boundHandlers.mousemove = (e) => this._handleMouseMove(e);
        this.boundHandlers.mouseup = (e) => this._handleMouseUp(e);
        this.boundHandlers.dblclick = (e) => this._handleDoubleClick(e);
        this.boundHandlers.contextmenu = (e) => this._handleContextMenu(e);
        
        this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        // 键盘事件（全局）
        this.boundHandlers.keydown = (e) => this._handleKeyDown(e);
        document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    /**
     * 移除事件监听器
     * @private
     */
    _removeEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
        this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
        
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        
        this.boundHandlers = {};
    }

    /**
     * 处理鼠标按下
     * @private
     */
    _handleMouseDown(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 获取组件列表
        const components = this.getComponents ? this.getComponents() : [];
        
        // 处理选择
        const clickedItem = this.selectionManager.handleClick(
            x, y, components, e.ctrlKey, e.shiftKey
        );
        
        if (clickedItem && this.enableDrag) {
            // 开始拖动
            this.isDragging = true;
            this.dragStartPos = { x, y };
            this.draggedItems = this.selectionManager.getSelectedItems();
            
            // 记录初始位置
            this.draggedItems.forEach(item => {
                item._dragStartX = item.x;
                item._dragStartY = item.y;
            });
            
            this.canvas.style.cursor = 'grabbing';
            
            this.eventBus.emit('canvas:drag-start', {
                items: this.draggedItems,
                position: { x, y }
            });
        } else if (!clickedItem && !e.ctrlKey && !e.shiftKey) {
            // 开始框选
            this.selectionManager.startBoxSelection(x, y);
        }
    }

    /**
     * 处理鼠标移动
     * @private
     */
    _handleMouseMove(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging && this.dragStartPos) {
            // 拖动组件
            const dx = x - this.dragStartPos.x;
            const dy = y - this.dragStartPos.y;
            
            this.draggedItems.forEach(item => {
                item.x = item._dragStartX + dx;
                item.y = item._dragStartY + dy;
            });
            
            this.stats.totalDrags++;
            
            this.eventBus.emit('canvas:drag-move', {
                items: this.draggedItems,
                delta: { dx, dy },
                position: { x, y }
            });
            
            // 触发回调
            if (this.onComponentDrag) {
                this.onComponentDrag(this.draggedItems, dx, dy);
            }
        } else if (this.selectionManager.isBoxSelecting) {
            // 更新框选
            this.selectionManager.updateBoxSelection(x, y);
        }
    }

    /**
     * 处理鼠标释放
     * @private
     */
    _handleMouseUp(e) {
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.isDragging) {
            // 结束拖动
            this.isDragging = false;
            this.canvas.style.cursor = '';
            
            // 清理临时属性
            this.draggedItems.forEach(item => {
                delete item._dragStartX;
                delete item._dragStartY;
            });
            
            this.eventBus.emit('canvas:drag-end', {
                items: this.draggedItems,
                position: { x, y }
            });
            
            this.dragStartPos = null;
            this.draggedItems = [];
        } else if (this.selectionManager.isBoxSelecting) {
            // 结束框选
            const components = this.getComponents ? this.getComponents() : [];
            this.selectionManager.endBoxSelection(x, y, components, e.ctrlKey);
        }
    }

    /**
     * 处理双击
     * @private
     */
    _handleDoubleClick(e) {
        if (!this.canvas || !this.enableDoubleClick) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const components = this.getComponents ? this.getComponents() : [];
        
        // 查找被双击的组件
        const clickedItem = this._findItemAt(x, y, components);
        
        if (clickedItem) {
            this.stats.totalDoubleClicks++;
            
            this.eventBus.emit('canvas:double-click', {
                item: clickedItem,
                position: { x, y }
            });
            
            // 触发回调
            if (this.onComponentDoubleClick) {
                this.onComponentDoubleClick(clickedItem);
            }
            
            // 默认行为：打开属性对话框
            this._openPropertiesDialog(clickedItem);
        }
    }

    /**
     * 处理右键菜单
     * @private
     */
    _handleContextMenu(e) {
        if (!this.canvas || !this.enableContextMenu) return;
        
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const components = this.getComponents ? this.getComponents() : [];
        const clickedItem = this._findItemAt(x, y, components);
        
        this.stats.totalContextMenus++;
        
        this.eventBus.emit('canvas:context-menu', {
            item: clickedItem,
            position: { x, y },
            clientPosition: { x: e.clientX, y: e.clientY }
        });
        
        // 触发回调
        if (this.onContextMenu) {
            this.onContextMenu(clickedItem, e.clientX, e.clientY);
        }
    }

    /**
     * 处理键盘按下
     * @private
     */
    _handleKeyDown(e) {
        // Delete键删除选中组件
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.enableDelete) {
            const selectedItems = this.selectionManager.getSelectedItems();
            
            if (selectedItems.length > 0) {
                e.preventDefault();
                
                this.stats.totalDeletes++;
                
                this.eventBus.emit('canvas:delete', {
                    items: selectedItems
                });
                
                // 触发回调
                if (this.onComponentDelete) {
                    this.onComponentDelete(selectedItems);
                }
                
                // 清除选择
                this.selectionManager.clearSelection();
            }
        }
        
        // Escape键取消操作
        if (e.key === 'Escape') {
            if (this.isDragging) {
                // 取消拖动，恢复位置
                this.draggedItems.forEach(item => {
                    item.x = item._dragStartX;
                    item.y = item._dragStartY;
                    delete item._dragStartX;
                    delete item._dragStartY;
                });
                
                this.isDragging = false;
                this.canvas.style.cursor = '';
                this.dragStartPos = null;
                this.draggedItems = [];
                
                this.eventBus.emit('canvas:drag-cancel', {});
            } else if (this.selectionManager.isBoxSelecting) {
                // 取消框选
                this.selectionManager.cancelBoxSelection();
            }
        }
        
        // Ctrl+A 全选
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            const components = this.getComponents ? this.getComponents() : [];
            this.selectionManager.select(components);
        }
        
        // Ctrl+D 取消选择
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            this.selectionManager.clearSelection();
        }
        
        // Ctrl+Z 撤销
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.eventBus.emit('keyboard:undo', {});
        }
        
        // Ctrl+Y 或 Ctrl+Shift+Z 重做
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.eventBus.emit('keyboard:redo', {});
        }
        
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.eventBus.emit('keyboard:save', {});
        }
    }

    /**
     * 查找指定位置的组件
     * @private
     */
    _findItemAt(x, y, components) {
        // 按z-index从高到低排序
        const sorted = [...components].sort((a, b) => {
            const zA = a.zIndex || 0;
            const zB = b.zIndex || 0;
            return zB - zA;
        });
        
        for (const item of sorted) {
            if (this._isPointInItem(x, y, item)) {
                return item;
            }
        }
        
        return null;
    }

    /**
     * 检查点是否在组件内
     * @private
     */
    _isPointInItem(x, y, item) {
        if (!item) return false;
        
        // 如果组件有自定义命中测试
        if (typeof item.hitTest === 'function') {
            return item.hitTest(x, y);
        }
        
        // 默认矩形命中测试
        if (item.x !== undefined && item.y !== undefined && 
            item.width !== undefined && item.height !== undefined) {
            return x >= item.x && x <= item.x + item.width &&
                   y >= item.y && y <= item.y + item.height;
        }
        
        // 圆形命中测试
        if (item.x !== undefined && item.y !== undefined && item.radius !== undefined) {
            const dx = x - item.x;
            const dy = y - item.y;
            return Math.sqrt(dx * dx + dy * dy) <= item.radius;
        }
        
        return false;
    }

    /**
     * 打开属性对话框
     * @private
     */
    _openPropertiesDialog(item) {
        // 发布事件让外部处理
        this.eventBus.emit('component:open-properties', { item });
        
        console.log('[CanvasEventHandler] Open properties for:', item);
    }

    /**
     * 销毁
     */
    destroy() {
        this.unbindFromCanvas();
        this.eventBus = null;
        this.selectionManager = null;
        this.getComponents = null;
    }
}

// ========== 单例模式 ==========
let canvasEventHandlerInstance = null;

export function getCanvasEventHandler(config) {
    if (!canvasEventHandlerInstance) {
        canvasEventHandlerInstance = new CanvasEventHandler(config);
    }
    return canvasEventHandlerInstance;
}

export function resetCanvasEventHandler() {
    if (canvasEventHandlerInstance) {
        canvasEventHandlerInstance.destroy();
    }
    canvasEventHandlerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.CanvasEventHandler = CanvasEventHandler;
    window.getCanvasEventHandler = getCanvasEventHandler;
}
