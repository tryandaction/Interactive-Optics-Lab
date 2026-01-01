// interactionEnhancer.js - 交互功能增强模块

console.log("interactionEnhancer.js: Loading Interaction Enhancement...");

/**
 * 简单的 2D 向量类（用于在 Vector 类加载前使用）
 * 如果全局 Vector 已存在则使用全局的
 */
class SimpleVector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(v) {
        return new SimpleVector(this.x + v.x, this.y + v.y);
    }
    
    sub(v) {
        return new SimpleVector(this.x - v.x, this.y - v.y);
    }
    
    clone() {
        return new SimpleVector(this.x, this.y);
    }
}

// 获取 Vector 类（优先使用全局的，每次调用时检查）
function getVectorClass() {
    return typeof Vector !== 'undefined' ? Vector : (window.Vector || SimpleVector);
}

// 创建向量的辅助函数
function createVector(x, y) {
    const VectorClass = getVectorClass();
    return new VectorClass(x, y);
}

/**
 * 交互功能增强类
 * 提供对齐辅助线、智能吸附、快捷键等功能
 */
class InteractionEnhancer {
    constructor() {
        this.isEnabled = true;
        this.snapEnabled = true;
        this.alignmentEnabled = true;
        this.gridSnapEnabled = true;
        
        // 吸附设置
        this.snapThreshold = 10; // 像素
        this.gridSize = 20; // 网格大小
        this.alignmentThreshold = 5; // 对齐阈值
        
        // 对齐辅助线
        this.alignmentLines = [];
        this.snapPoints = [];
        
        // 快捷键映射
        this.shortcuts = new Map();
        
        // 绑定事件监听器
        this.bindEventListeners();
        this.initializeShortcuts();
        
        console.log("InteractionEnhancer initialized");
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 监听设置变化
        const snapCheckbox = document.getElementById('setting-enable-snap');
        if (snapCheckbox) {
            snapCheckbox.addEventListener('change', (e) => {
                this.snapEnabled = e.target.checked;
            });
        }

        // 监听交互增强设置
        const alignmentLinesCheckbox = document.getElementById('setting-alignment-lines');
        if (alignmentLinesCheckbox) {
            alignmentLinesCheckbox.addEventListener('change', (e) => {
                this.setAlignmentEnabled(e.target.checked);
            });
        }

        const snapToGridCheckbox = document.getElementById('setting-snap-to-grid');
        if (snapToGridCheckbox) {
            snapToGridCheckbox.addEventListener('change', (e) => {
                this.setGridSnapEnabled(e.target.checked);
            });
        }

        const snapToObjectsCheckbox = document.getElementById('setting-snap-to-objects');
        if (snapToObjectsCheckbox) {
            snapToObjectsCheckbox.addEventListener('change', (e) => {
                this.setSnapEnabled(e.target.checked);
            });
        }

        const snapThresholdSlider = document.getElementById('setting-snap-threshold');
        if (snapThresholdSlider) {
            snapThresholdSlider.addEventListener('input', (e) => {
                this.snapThreshold = parseInt(e.target.value);
                this.updateSnapThresholdDisplay();
            });
        }

        // 监听画布事件
        const canvas = document.getElementById('opticsCanvas');
        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                this.handleMouseMove(e);
            });
            
            canvas.addEventListener('mousedown', (e) => {
                this.handleMouseDown(e);
            });
            
            canvas.addEventListener('mouseup', (e) => {
                this.handleMouseUp(e);
            });
        }

        // 监听键盘事件
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    /**
     * 初始化快捷键
     */
    initializeShortcuts() {
        // 基本操作快捷键
        this.shortcuts.set('ctrl+z', () => this.undo());
        this.shortcuts.set('ctrl+y', () => this.redo());
        this.shortcuts.set('ctrl+s', () => this.saveScene());
        this.shortcuts.set('ctrl+n', () => this.newScene());
        this.shortcuts.set('ctrl+e', () => this.exportScene());
        this.shortcuts.set('ctrl+o', () => this.openScene());
        this.shortcuts.set('delete', () => this.deleteSelected());
        this.shortcuts.set('escape', () => this.cancelOperation());
        
        // 视图操作快捷键
        this.shortcuts.set('ctrl+0', () => this.resetView());
        this.shortcuts.set('ctrl+plus', () => this.zoomIn());
        this.shortcuts.set('ctrl+minus', () => this.zoomOut());
        this.shortcuts.set('space', () => this.togglePanMode());
        
        // 选择操作快捷键
        this.shortcuts.set('ctrl+a', () => this.selectAll());
        this.shortcuts.set('ctrl+d', () => this.duplicateSelected());
        this.shortcuts.set('ctrl+g', () => this.groupSelected());
        this.shortcuts.set('ctrl+shift+g', () => this.ungroupSelected());
        
        // 对齐操作快捷键
        this.shortcuts.set('ctrl+shift+l', () => this.alignLeft());
        this.shortcuts.set('ctrl+shift+r', () => this.alignRight());
        this.shortcuts.set('ctrl+shift+t', () => this.alignTop());
        this.shortcuts.set('ctrl+shift+b', () => this.alignBottom());
        this.shortcuts.set('ctrl+shift+h', () => this.alignHorizontal());
        this.shortcuts.set('ctrl+shift+v', () => this.alignVertical());
    }

    /**
     * 处理鼠标移动事件
     */
    handleMouseMove(e) {
        if (!this.isEnabled) return;

        const mousePos = this.getMousePosition(e);
        
        // 更新对齐辅助线
        if (this.alignmentEnabled) {
            this.updateAlignmentLines(mousePos);
        }
        
        // 更新吸附点
        if (this.snapEnabled) {
            this.updateSnapPoints(mousePos);
        }
    }

    /**
     * 处理鼠标按下事件
     */
    handleMouseDown(e) {
        if (!this.isEnabled) return;

        // 记录拖拽开始位置
        this.dragStartPos = this.getMousePosition(e);
    }

    /**
     * 处理鼠标释放事件
     */
    handleMouseUp(e) {
        if (!this.isEnabled) return;

        // 清除对齐辅助线
        this.clearAlignmentLines();
    }

    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
        if (!this.isEnabled) return;

        const key = this.getKeyString(e);
        const handler = this.shortcuts.get(key);
        
        if (handler) {
            e.preventDefault();
            handler();
        }
    }

    /**
     * 获取鼠标位置
     */
    getMousePosition(e) {
        const canvas = document.getElementById('opticsCanvas');
        if (!canvas) {
            return createVector(0, 0);
        }
        const rect = canvas.getBoundingClientRect();
        return createVector(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
    }

    /**
     * 获取按键字符串
     */
    getKeyString(e) {
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('ctrl');
        if (e.shiftKey) modifiers.push('shift');
        if (e.altKey) modifiers.push('alt');
        if (e.metaKey) modifiers.push('meta');
        
        const key = e.key.toLowerCase();
        if (key === ' ') return 'space';
        if (key === '+') return 'plus';
        if (key === '-') return 'minus';
        
        return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
    }

    /**
     * 更新对齐辅助线
     */
    updateAlignmentLines(mousePos) {
        this.clearAlignmentLines();
        
        if (!window.components || !window.components.length) return;

        const selectedComponents = window.components.filter(comp => comp.selected);
        if (selectedComponents.length === 0) return;

        const lines = [];
        
        // 检查与其他元件的对齐
        window.components.forEach(comp => {
            if (comp.selected) return; // 跳过已选中的元件
            
            const bounds = comp.getBoundingBox();
            if (!bounds) return;

            // 水平对齐线
            const centerY = bounds.y + bounds.height / 2;
            if (Math.abs(mousePos.y - centerY) < this.alignmentThreshold) {
                lines.push({
                    type: 'horizontal',
                    y: centerY,
                    startX: Math.min(mousePos.x - 50, bounds.x),
                    endX: Math.max(mousePos.x + 50, bounds.x + bounds.width)
                });
            }

            // 垂直对齐线
            const centerX = bounds.x + bounds.width / 2;
            if (Math.abs(mousePos.x - centerX) < this.alignmentThreshold) {
                lines.push({
                    type: 'vertical',
                    x: centerX,
                    startY: Math.min(mousePos.y - 50, bounds.y),
                    endY: Math.max(mousePos.y + 50, bounds.y + bounds.height)
                });
            }

            // 边缘对齐线
            if (Math.abs(mousePos.x - bounds.x) < this.alignmentThreshold) {
                lines.push({
                    type: 'vertical',
                    x: bounds.x,
                    startY: Math.min(mousePos.y - 50, bounds.y),
                    endY: Math.max(mousePos.y + 50, bounds.y + bounds.height)
                });
            }

            if (Math.abs(mousePos.x - (bounds.x + bounds.width)) < this.alignmentThreshold) {
                lines.push({
                    type: 'vertical',
                    x: bounds.x + bounds.width,
                    startY: Math.min(mousePos.y - 50, bounds.y),
                    endY: Math.max(mousePos.y + 50, bounds.y + bounds.height)
                });
            }

            if (Math.abs(mousePos.y - bounds.y) < this.alignmentThreshold) {
                lines.push({
                    type: 'horizontal',
                    y: bounds.y,
                    startX: Math.min(mousePos.x - 50, bounds.x),
                    endX: Math.max(mousePos.x + 50, bounds.x + bounds.width)
                });
            }

            if (Math.abs(mousePos.y - (bounds.y + bounds.height)) < this.alignmentThreshold) {
                lines.push({
                    type: 'horizontal',
                    y: bounds.y + bounds.height,
                    startX: Math.min(mousePos.x - 50, bounds.x),
                    endX: Math.max(mousePos.x + 50, bounds.x + bounds.width)
                });
            }
        });

        this.alignmentLines = lines;
        this.drawAlignmentLines();
    }

    /**
     * 更新吸附点
     */
    updateSnapPoints(mousePos) {
        this.snapPoints = [];
        
        if (this.gridSnapEnabled) {
            // 网格吸附
            const snappedX = Math.round(mousePos.x / this.gridSize) * this.gridSize;
            const snappedY = Math.round(mousePos.y / this.gridSize) * this.gridSize;
            
            if (Math.abs(mousePos.x - snappedX) < this.snapThreshold) {
                this.snapPoints.push({ x: snappedX, y: mousePos.y, type: 'grid-x' });
            }
            
            if (Math.abs(mousePos.y - snappedY) < this.snapThreshold) {
                this.snapPoints.push({ x: mousePos.x, y: snappedY, type: 'grid-y' });
            }
        }

        // 元件吸附
        if (window.components) {
            window.components.forEach(comp => {
                if (comp.selected) return;
                
                const bounds = comp.getBoundingBox();
                if (!bounds) return;

                // 中心点吸附
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;
                
                if (Math.abs(mousePos.x - centerX) < this.snapThreshold) {
                    this.snapPoints.push({ x: centerX, y: mousePos.y, type: 'center-x' });
                }
                
                if (Math.abs(mousePos.y - centerY) < this.snapThreshold) {
                    this.snapPoints.push({ x: mousePos.x, y: centerY, type: 'center-y' });
                }

                // 边缘吸附
                const edges = [
                    { x: bounds.x, y: mousePos.y, type: 'edge-left' },
                    { x: bounds.x + bounds.width, y: mousePos.y, type: 'edge-right' },
                    { x: mousePos.x, y: bounds.y, type: 'edge-top' },
                    { x: mousePos.x, y: bounds.y + bounds.height, type: 'edge-bottom' }
                ];

                edges.forEach(edge => {
                    const distance = Math.sqrt(
                        Math.pow(mousePos.x - edge.x, 2) + Math.pow(mousePos.y - edge.y, 2)
                    );
                    
                    if (distance < this.snapThreshold) {
                        this.snapPoints.push(edge);
                    }
                });
            });
        }

        this.drawSnapPoints();
    }

    /**
     * 绘制对齐辅助线
     */
    drawAlignmentLines() {
        const canvas = document.getElementById('opticsCanvas');
        const ctx = canvas.getContext('2d');
        
        // 保存当前状态
        ctx.save();
        
        // 设置样式
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.8;
        
        // 绘制对齐线
        this.alignmentLines.forEach(line => {
            ctx.beginPath();
            if (line.type === 'horizontal') {
                ctx.moveTo(line.startX, line.y);
                ctx.lineTo(line.endX, line.y);
            } else {
                ctx.moveTo(line.x, line.startY);
                ctx.lineTo(line.x, line.endY);
            }
            ctx.stroke();
        });
        
        // 恢复状态
        ctx.restore();
    }

    /**
     * 绘制吸附点
     */
    drawSnapPoints() {
        const canvas = document.getElementById('opticsCanvas');
        const ctx = canvas.getContext('2d');
        
        // 保存当前状态
        ctx.save();
        
        // 绘制吸附点
        this.snapPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            
            // 根据类型设置颜色
            switch (point.type) {
                case 'grid-x':
                case 'grid-y':
                    ctx.fillStyle = '#6c757d';
                    break;
                case 'center-x':
                case 'center-y':
                    ctx.fillStyle = '#28a745';
                    break;
                default:
                    ctx.fillStyle = '#007bff';
            }
            
            ctx.fill();
        });
        
        // 恢复状态
        ctx.restore();
    }

    /**
     * 清除对齐辅助线
     */
    clearAlignmentLines() {
        this.alignmentLines = [];
        this.snapPoints = [];
        // 这里需要重绘画布来清除辅助线
        if (window.redrawCanvas) {
            window.redrawCanvas();
        }
    }

    /**
     * 快捷键处理函数
     */
    
    undo() {
        if (window.historyManager) {
            window.historyManager.undo();
        }
    }

    redo() {
        if (window.historyManager) {
            window.historyManager.redo();
        }
    }

    saveScene() {
        if (window.sceneManager) {
            // 触发保存场景事件
            const event = new CustomEvent('saveScene');
            document.dispatchEvent(event);
        }
    }

    newScene() {
        if (confirm('确定要创建新场景吗？当前场景的更改将丢失。')) {
            if (window.clearCanvas) {
                window.clearCanvas();
            }
        }
    }

    exportScene() {
        if (window.exportScene) {
            window.exportScene();
        }
    }

    openScene() {
        if (window.importScene) {
            window.importScene();
        }
    }

    deleteSelected() {
        if (window.components) {
            const selectedComponents = window.components.filter(comp => comp.selected);
            if (selectedComponents.length > 0) {
                selectedComponents.forEach(comp => {
                    const index = window.components.indexOf(comp);
                    if (index > -1) {
                        window.components.splice(index, 1);
                    }
                });
                if (window.redrawCanvas) {
                    window.redrawCanvas();
                }
            }
        }
    }

    cancelOperation() {
        // 取消当前操作
        this.clearAlignmentLines();
    }

    resetView() {
        if (window.resetView) {
            window.resetView();
        }
    }

    zoomIn() {
        if (window.zoomIn) {
            window.zoomIn();
        }
    }

    zoomOut() {
        if (window.zoomOut) {
            window.zoomOut();
        }
    }

    togglePanMode() {
        // 切换平移模式
        console.log('Toggle pan mode');
    }

    selectAll() {
        if (window.components) {
            window.components.forEach(comp => {
                comp.selected = true;
            });
            if (window.redrawCanvas) {
                window.redrawCanvas();
            }
        }
    }

    duplicateSelected() {
        if (window.components) {
            const selectedComponents = window.components.filter(comp => comp.selected);
            selectedComponents.forEach(comp => {
                const newComp = Object.assign(Object.create(Object.getPrototypeOf(comp)), comp);
                newComp.pos = newComp.pos.add(createVector(20, 20));
                newComp.selected = false;
                window.components.push(newComp);
            });
            if (window.redrawCanvas) {
                window.redrawCanvas();
            }
        }
    }

    groupSelected() {
        // 分组功能（待实现）
        console.log('Group selected components');
    }

    ungroupSelected() {
        // 取消分组功能（待实现）
        console.log('Ungroup selected components');
    }

    alignLeft() {
        this.alignComponents('left');
    }

    alignRight() {
        this.alignComponents('right');
    }

    alignTop() {
        this.alignComponents('top');
    }

    alignBottom() {
        this.alignComponents('bottom');
    }

    alignHorizontal() {
        this.alignComponents('horizontal');
    }

    alignVertical() {
        this.alignComponents('vertical');
    }

    /**
     * 对齐元件
     */
    alignComponents(alignment) {
        if (!window.components) return;

        const selectedComponents = window.components.filter(comp => comp.selected);
        if (selectedComponents.length < 2) return;

        const bounds = selectedComponents.map(comp => comp.getBoundingBox()).filter(b => b);
        if (bounds.length === 0) return;

        let targetValue;
        
        switch (alignment) {
            case 'left':
                targetValue = Math.min(...bounds.map(b => b.x));
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.x = targetValue - compBounds.x + comp.pos.x;
                    }
                });
                break;
            case 'right':
                targetValue = Math.max(...bounds.map(b => b.x + b.width));
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.x = targetValue - compBounds.x - compBounds.width + comp.pos.x;
                    }
                });
                break;
            case 'top':
                targetValue = Math.min(...bounds.map(b => b.y));
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.y = targetValue - compBounds.y + comp.pos.y;
                    }
                });
                break;
            case 'bottom':
                targetValue = Math.max(...bounds.map(b => b.y + b.height));
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.y = targetValue - compBounds.y - compBounds.height + comp.pos.y;
                    }
                });
                break;
            case 'horizontal':
                targetValue = bounds.reduce((sum, b) => sum + b.y + b.height / 2, 0) / bounds.length;
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.y = targetValue - compBounds.y - compBounds.height / 2 + comp.pos.y;
                    }
                });
                break;
            case 'vertical':
                targetValue = bounds.reduce((sum, b) => sum + b.x + b.width / 2, 0) / bounds.length;
                selectedComponents.forEach(comp => {
                    const compBounds = comp.getBoundingBox();
                    if (compBounds) {
                        comp.pos.x = targetValue - compBounds.x - compBounds.width / 2 + comp.pos.x;
                    }
                });
                break;
        }

        if (window.redrawCanvas) {
            window.redrawCanvas();
        }
    }

    /**
     * 启用/禁用功能
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.clearAlignmentLines();
        }
    }

    setSnapEnabled(enabled) {
        this.snapEnabled = enabled;
    }

    setAlignmentEnabled(enabled) {
        this.alignmentEnabled = enabled;
        if (!enabled) {
            this.clearAlignmentLines();
        }
    }

    setGridSnapEnabled(enabled) {
        this.gridSnapEnabled = enabled;
    }

    /**
     * 获取设置
     */
    getSettings() {
        return {
            snapEnabled: this.snapEnabled,
            alignmentEnabled: this.alignmentEnabled,
            gridSnapEnabled: this.gridSnapEnabled,
            snapThreshold: this.snapThreshold,
            gridSize: this.gridSize,
            alignmentThreshold: this.alignmentThreshold
        };
    }

    /**
     * 更新设置
     */
    updateSettings(settings) {
        Object.assign(this, settings);
    }

    /**
     * 更新吸附阈值显示
     */
    updateSnapThresholdDisplay() {
        const displayElement = document.getElementById('setting-snap-threshold-value');
        if (displayElement) {
            displayElement.textContent = `${this.snapThreshold}px`;
        }
    }
}

// 初始化交互增强器
document.addEventListener('DOMContentLoaded', () => {
    window.interactionEnhancer = new InteractionEnhancer();
});

console.log("interactionEnhancer.js: Interaction Enhancement loaded successfully!");
