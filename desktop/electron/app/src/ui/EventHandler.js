/**
 * EventHandler.js - 事件处理器
 * 负责处理画布上的鼠标和键盘事件
 */

import { Vector } from '../core/Vector.js';

/**
 * 事件处理器类
 * 管理画布上的用户交互事件
 */
export class EventHandler {
    /**
     * @param {HTMLCanvasElement} canvas - 画布元素
     * @param {Object} options - 配置选项
     */
    constructor(canvas, options = {}) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        /** @type {Vector} 鼠标位置（世界坐标） */
        this.mousePos = new Vector(0, 0);
        /** @type {boolean} 鼠标是否按下 */
        this.mouseIsDown = false;
        /** @type {boolean} 是否正在拖拽 */
        this.isDragging = false;
        /** @type {boolean} 是否正在平移 */
        this.isPanning = false;
        /** @type {Vector} 上次平移鼠标位置 */
        this.lastPanMousePos = null;
        /** @type {Vector} 拖拽开始鼠标位置 */
        this.dragStartMousePos = null;
        /** @type {Map} 拖拽开始偏移量 */
        this.dragStartOffsets = new Map();
        /** @type {Array} 正在拖拽的组件 */
        this.draggingComponents = [];

        // 回调函数
        this.onMouseDown = options.onMouseDown || null;
        this.onMouseMove = options.onMouseMove || null;
        this.onMouseUp = options.onMouseUp || null;
        this.onMouseLeave = options.onMouseLeave || null;
        this.onWheel = options.onWheel || null;
        this.onKeyDown = options.onKeyDown || null;
        this.onKeyUp = options.onKeyUp || null;

        // 相机状态获取器
        this.getCameraState = options.getCameraState || (() => ({ offset: new Vector(0, 0), scale: 1 }));

        // 绑定方法
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
        this._handleMouseLeave = this._handleMouseLeave.bind(this);
        this._handleWheel = this._handleWheel.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
    }

    /**
     * 初始化事件监听器
     */
    init() {
        this.canvas.addEventListener('mousedown', this._handleMouseDown);
        this.canvas.addEventListener('mousemove', this._handleMouseMove);
        this.canvas.addEventListener('mouseup', this._handleMouseUp);
        this.canvas.addEventListener('mouseleave', this._handleMouseLeave);
        this.canvas.addEventListener('wheel', this._handleWheel, { passive: false });
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
    }

    /**
     * 移除事件监听器
     */
    destroy() {
        this.canvas.removeEventListener('mousedown', this._handleMouseDown);
        this.canvas.removeEventListener('mousemove', this._handleMouseMove);
        this.canvas.removeEventListener('mouseup', this._handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this._handleMouseLeave);
        this.canvas.removeEventListener('wheel', this._handleWheel);
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
    }

    /**
     * 获取鼠标在画布上的位置（世界坐标）
     * @param {MouseEvent} event - 鼠标事件
     * @returns {Vector} 世界坐标位置
     */
    getMousePos(event) {
        const rect = this.canvas.getBoundingClientRect();
        const camera = this.getCameraState();
        const cssX = event.clientX - rect.left;
        const cssY = event.clientY - rect.top;
        return new Vector(
            (cssX - camera.offset.x) / camera.scale,
            (cssY - camera.offset.y) / camera.scale
        );
    }

    /**
     * 获取鼠标在画布上的位置（屏幕坐标）
     * @param {MouseEvent} event - 鼠标事件
     * @returns {Vector} 屏幕坐标位置
     */
    getScreenPos(event) {
        const rect = this.canvas.getBoundingClientRect();
        return new Vector(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
    }

    /**
     * 处理鼠标按下事件
     * @private
     */
    _handleMouseDown(event) {
        this.mousePos = this.getMousePos(event);
        this.mouseIsDown = true;

        // 中键平移
        if (event.button === 1) {
            this.isPanning = true;
            this.lastPanMousePos = this.getScreenPos(event);
            this.canvas.style.cursor = 'grabbing';
            event.preventDefault();
            return;
        }

        if (this.onMouseDown) {
            this.onMouseDown({
                event,
                mousePos: this.mousePos,
                screenPos: this.getScreenPos(event),
                button: event.button,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey
            });
        }
    }

    /**
     * 处理鼠标移动事件
     * @private
     */
    _handleMouseMove(event) {
        const currentMousePos = this.getMousePos(event);
        const screenPos = this.getScreenPos(event);
        this.mousePos = currentMousePos;

        // 平移处理
        if (this.isPanning && this.lastPanMousePos) {
            const dx = screenPos.x - this.lastPanMousePos.x;
            const dy = screenPos.y - this.lastPanMousePos.y;
            this.lastPanMousePos = screenPos;

            if (this.onWheel) {
                this.onWheel({
                    type: 'pan',
                    deltaX: dx,
                    deltaY: dy
                });
            }
            return;
        }

        if (this.onMouseMove) {
            this.onMouseMove({
                event,
                mousePos: currentMousePos,
                screenPos,
                isDragging: this.isDragging,
                mouseIsDown: this.mouseIsDown
            });
        }
    }

    /**
     * 处理鼠标释放事件
     * @private
     */
    _handleMouseUp(event) {
        // 中键释放
        if (event.button === 1 && this.isPanning) {
            this.isPanning = false;
            this.lastPanMousePos = null;
            this.canvas.style.cursor = 'default';
            return;
        }

        if (this.onMouseUp) {
            this.onMouseUp({
                event,
                mousePos: this.getMousePos(event),
                screenPos: this.getScreenPos(event),
                button: event.button
            });
        }

        this.mouseIsDown = false;
        this.isDragging = false;
        this.draggingComponents = [];
        this.dragStartOffsets.clear();
    }

    /**
     * 处理鼠标离开事件
     * @private
     */
    _handleMouseLeave(event) {
        if (this.onMouseLeave) {
            this.onMouseLeave({
                event,
                isDragging: this.isDragging,
                draggingComponents: this.draggingComponents
            });
        }
    }

    /**
     * 处理滚轮事件
     * @private
     */
    _handleWheel(event) {
        event.preventDefault();

        if (this.onWheel) {
            this.onWheel({
                type: 'zoom',
                deltaY: event.deltaY,
                mousePos: this.getMousePos(event),
                screenPos: this.getScreenPos(event)
            });
        }
    }

    /**
     * 处理键盘按下事件
     * @private
     */
    _handleKeyDown(event) {
        if (this.onKeyDown) {
            this.onKeyDown({
                event,
                key: event.key,
                code: event.code,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                altKey: event.altKey
            });
        }
    }

    /**
     * 处理键盘释放事件
     * @private
     */
    _handleKeyUp(event) {
        if (this.onKeyUp) {
            this.onKeyUp({
                event,
                key: event.key,
                code: event.code
            });
        }
    }

    /**
     * 开始拖拽
     * @param {Array} components - 要拖拽的组件数组
     * @param {Vector} mousePos - 鼠标位置
     */
    startDrag(components, mousePos) {
        this.isDragging = true;
        this.draggingComponents = components;
        this.dragStartMousePos = mousePos.clone();
        this.dragStartOffsets.clear();

        components.forEach(comp => {
            if (comp.pos) {
                this.dragStartOffsets.set(comp.id, comp.pos.subtract(mousePos));
            }
        });

        this.canvas.style.cursor = 'move';
    }

    /**
     * 结束拖拽
     */
    endDrag() {
        this.isDragging = false;
        this.draggingComponents = [];
        this.dragStartOffsets.clear();
        this.dragStartMousePos = null;
        this.canvas.style.cursor = 'default';
    }

    /**
     * 设置光标样式
     * @param {string} cursor - 光标样式
     */
    setCursor(cursor) {
        this.canvas.style.cursor = cursor;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.EventHandler = EventHandler;
}
