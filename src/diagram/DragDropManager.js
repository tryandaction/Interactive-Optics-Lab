/**
 * DragDropManager.js - 拖放管理器
 * 管理图标从面板拖放到画布的交互
 * 
 * Requirements: 3.3, 3.5, 3.6
 * 
 * Features:
 * - Drag preview rendering
 * - Drop zone validation
 * - Snap to grid
 * - Visual feedback
 * - Cancel handling
 */

import { getEventBus } from './EventBus.js';

/**
 * 拖放管理器类
 */
export class DragDropManager {
    constructor(config = {}) {
        this.canvas = config.canvas || null;
        this.eventBus = config.eventBus || getEventBus();
        
        // 拖放状态
        this.isDragging = false;
        this.dragData = null;
        this.dragPreview = null;
        this.dropTarget = null;
        
        // 配置
        this.snapToGrid = config.snapToGrid !== false;
        this.gridSize = config.gridSize || 20;
        this.showDropZones = config.showDropZones !== false;
        this.previewOpacity = config.previewOpacity || 0.7;
        
        // 验证器
        this.dropValidators = [];
        
        // 事件监听器
        this.boundHandlers = {
            mousemove: null,
            mouseup: null,
            keydown: null
        };
        
        // 统计
        this.stats = {
            totalDrags: 0,
            successfulDrops: 0,
            canceledDrags: 0
        };
    }

    /**
     * 开始拖动
     * @param {Object} data - 拖动数据
     * @param {MouseEvent} event - 鼠标事件
     */
    startDrag(data, event) {
        if (this.isDragging) {
            console.warn('DragDropManager: Already dragging');
            return false;
        }
        
        if (!data || !data.type) {
            console.error('DragDropManager: Invalid drag data');
            return false;
        }
        
        this.isDragging = true;
        this.dragData = {
            ...data,
            startX: event.clientX,
            startY: event.clientY,
            startTime: Date.now()
        };
        
        this.stats.totalDrags++;
        
        // 创建拖动预览
        this._createDragPreview(data, event);
        
        // 绑定事件监听器
        this._bindEventListeners();
        
        // 发布事件
        this.eventBus.emit('drag:start', {
            data: this.dragData,
            position: { x: event.clientX, y: event.clientY }
        });
        
        // 更新光标
        document.body.style.cursor = 'grabbing';
        
        return true;
    }

    /**
     * 更新拖动
     * @param {MouseEvent} event - 鼠标事件
     */
    updateDrag(event) {
        if (!this.isDragging) return;
        
        // 更新预览位置
        if (this.dragPreview) {
            this.dragPreview.style.left = `${event.clientX + 10}px`;
            this.dragPreview.style.top = `${event.clientY + 10}px`;
        }
        
        // 检查放置目标
        const dropTarget = this._getDropTarget(event);
        
        if (dropTarget !== this.dropTarget) {
            // 离开旧目标
            if (this.dropTarget) {
                this._highlightDropTarget(this.dropTarget, false);
                this.eventBus.emit('drag:leave', {
                    target: this.dropTarget,
                    data: this.dragData
                });
            }
            
            // 进入新目标
            this.dropTarget = dropTarget;
            if (this.dropTarget) {
                this._highlightDropTarget(this.dropTarget, true);
                this.eventBus.emit('drag:enter', {
                    target: this.dropTarget,
                    data: this.dragData
                });
            }
        }
        
        // 发布拖动事件
        this.eventBus.emit('drag:move', {
            data: this.dragData,
            position: { x: event.clientX, y: event.clientY },
            dropTarget: this.dropTarget
        });
    }

    /**
     * 结束拖动
     * @param {MouseEvent} event - 鼠标事件
     */
    endDrag(event) {
        if (!this.isDragging) return;
        
        const dropTarget = this._getDropTarget(event);
        const canDrop = this._validateDrop(dropTarget, this.dragData);
        
        if (canDrop && dropTarget) {
            // 计算放置位置
            const dropPosition = this._calculateDropPosition(event, dropTarget);
            
            // 执行放置
            this._performDrop(dropTarget, this.dragData, dropPosition);
            
            this.stats.successfulDrops++;
            
            // 发布成功事件
            this.eventBus.emit('drag:drop', {
                target: dropTarget,
                data: this.dragData,
                position: dropPosition
            });
        } else {
            // 取消拖动
            this._cancelDrag();
        }
        
        // 清理
        this._cleanup();
    }

    /**
     * 取消拖动
     */
    cancelDrag() {
        if (!this.isDragging) return;
        
        this._cancelDrag();
        this._cleanup();
    }

    /**
     * 添加放置验证器
     * @param {Function} validator - 验证函数 (target, data) => boolean
     */
    addDropValidator(validator) {
        if (typeof validator === 'function') {
            this.dropValidators.push(validator);
        }
    }

    /**
     * 移除放置验证器
     * @param {Function} validator - 验证函数
     */
    removeDropValidator(validator) {
        const index = this.dropValidators.indexOf(validator);
        if (index > -1) {
            this.dropValidators.splice(index, 1);
        }
    }

    /**
     * 设置画布
     * @param {HTMLCanvasElement} canvas - 画布元素
     */
    setCanvas(canvas) {
        this.canvas = canvas;
    }

    /**
     * 设置网格对齐
     * @param {boolean} enabled - 是否启用
     * @param {number} gridSize - 网格大小
     */
    setSnapToGrid(enabled, gridSize = null) {
        this.snapToGrid = enabled;
        if (gridSize !== null) {
            this.gridSize = gridSize;
        }
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalDrags > 0 
                ? (this.stats.successfulDrops / this.stats.totalDrags * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 创建拖动预览
     * @private
     */
    _createDragPreview(data, event) {
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';
        this.dragPreview.style.cssText = `
            position: fixed;
            left: ${event.clientX + 10}px;
            top: ${event.clientY + 10}px;
            padding: 8px 12px;
            background: white;
            border: 2px solid #4488ff;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            pointer-events: none;
            z-index: 10000;
            opacity: ${this.previewOpacity};
            font-size: 13px;
            font-weight: 500;
            color: #333;
        `;
        
        // 添加图标或文本
        if (data.icon) {
            const icon = document.createElement('span');
            icon.innerHTML = data.icon;
            icon.style.marginRight = '6px';
            this.dragPreview.appendChild(icon);
        }
        
        const label = document.createElement('span');
        label.textContent = data.label || data.type;
        this.dragPreview.appendChild(label);
        
        document.body.appendChild(this.dragPreview);
    }

    /**
     * 绑定事件监听器
     * @private
     */
    _bindEventListeners() {
        this.boundHandlers.mousemove = (e) => this.updateDrag(e);
        this.boundHandlers.mouseup = (e) => this.endDrag(e);
        this.boundHandlers.keydown = (e) => {
            if (e.key === 'Escape') {
                this.cancelDrag();
            }
        };
        
        document.addEventListener('mousemove', this.boundHandlers.mousemove);
        document.addEventListener('mouseup', this.boundHandlers.mouseup);
        document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    /**
     * 解绑事件监听器
     * @private
     */
    _unbindEventListeners() {
        if (this.boundHandlers.mousemove) {
            document.removeEventListener('mousemove', this.boundHandlers.mousemove);
        }
        if (this.boundHandlers.mouseup) {
            document.removeEventListener('mouseup', this.boundHandlers.mouseup);
        }
        if (this.boundHandlers.keydown) {
            document.removeEventListener('keydown', this.boundHandlers.keydown);
        }
        
        this.boundHandlers = {
            mousemove: null,
            mouseup: null,
            keydown: null
        };
    }

    /**
     * 获取放置目标
     * @private
     */
    _getDropTarget(event) {
        // 检查是否在画布上
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            if (event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom) {
                return this.canvas;
            }
        }
        
        // 检查其他放置区域
        const dropZones = document.querySelectorAll('[data-drop-zone="true"]');
        for (const zone of dropZones) {
            const rect = zone.getBoundingClientRect();
            if (event.clientX >= rect.left && event.clientX <= rect.right &&
                event.clientY >= rect.top && event.clientY <= rect.bottom) {
                return zone;
            }
        }
        
        return null;
    }

    /**
     * 验证放置
     * @private
     */
    _validateDrop(target, data) {
        if (!target) return false;
        
        // 运行所有验证器
        for (const validator of this.dropValidators) {
            try {
                if (!validator(target, data)) {
                    return false;
                }
            } catch (error) {
                console.error('DragDropManager: Error in drop validator:', error);
                return false;
            }
        }
        
        return true;
    }

    /**
     * 计算放置位置
     * @private
     */
    _calculateDropPosition(event, target) {
        const rect = target.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        
        // 网格对齐
        if (this.snapToGrid) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }
        
        return { x, y };
    }

    /**
     * 执行放置
     * @private
     */
    _performDrop(target, data, position) {
        // 子类或外部处理器应该监听 drag:drop 事件来实际创建组件
        console.log('DragDropManager: Drop performed', {
            target,
            data,
            position
        });
    }

    /**
     * 高亮放置目标
     * @private
     */
    _highlightDropTarget(target, highlight) {
        if (!target) return;
        
        if (highlight) {
            target.style.outline = '2px solid #4488ff';
            target.style.outlineOffset = '2px';
        } else {
            target.style.outline = '';
            target.style.outlineOffset = '';
        }
    }

    /**
     * 取消拖动
     * @private
     */
    _cancelDrag() {
        this.stats.canceledDrags++;
        
        // 发布取消事件
        this.eventBus.emit('drag:cancel', {
            data: this.dragData
        });
        
        console.log('DragDropManager: Drag canceled');
    }

    /**
     * 清理
     * @private
     */
    _cleanup() {
        // 移除预览
        if (this.dragPreview && this.dragPreview.parentNode) {
            this.dragPreview.parentNode.removeChild(this.dragPreview);
        }
        
        // 清除高亮
        if (this.dropTarget) {
            this._highlightDropTarget(this.dropTarget, false);
        }
        
        // 解绑事件
        this._unbindEventListeners();
        
        // 重置状态
        this.isDragging = false;
        this.dragData = null;
        this.dragPreview = null;
        this.dropTarget = null;
        
        // 恢复光标
        document.body.style.cursor = '';
        
        // 发布结束事件
        this.eventBus.emit('drag:end', {});
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.isDragging) {
            this.cancelDrag();
        }
        
        this.dropValidators = [];
        this.canvas = null;
        this.eventBus = null;
    }
}

// ========== 单例模式 ==========
let dragDropManagerInstance = null;

export function getDragDropManager(config) {
    if (!dragDropManagerInstance) {
        dragDropManagerInstance = new DragDropManager(config);
    }
    return dragDropManagerInstance;
}

export function resetDragDropManager() {
    if (dragDropManagerInstance) {
        dragDropManagerInstance.destroy();
    }
    dragDropManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DragDropManager = DragDropManager;
    window.getDragDropManager = getDragDropManager;
}
