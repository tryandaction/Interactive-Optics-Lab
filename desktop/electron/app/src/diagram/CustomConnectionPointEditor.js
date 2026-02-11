/**
 * CustomConnectionPointEditor.js - 自定义连接点编辑器
 * 提供添加、编辑和删除自定义连接点的UI
 * 
 * Requirements: 2.5
 */

import { getConnectionPointManager, CONNECTION_POINT_STYLES } from './ConnectionPointManager.js';
import { CONNECTION_POINT_TYPES } from './ProfessionalIconManager.js';

/**
 * 连接点类型显示名称
 */
const POINT_TYPE_LABELS = {
    [CONNECTION_POINT_TYPES.INPUT]: '输入',
    [CONNECTION_POINT_TYPES.OUTPUT]: '输出',
    [CONNECTION_POINT_TYPES.BIDIRECTIONAL]: '双向'
};

/**
 * 自定义连接点编辑器类
 */
export class CustomConnectionPointEditor {
    constructor(options = {}) {
        this.connectionPointManager = getConnectionPointManager();
        this.container = null;
        this.isOpen = false;
        
        // 当前编辑的组件
        this.targetComponent = null;
        
        // 编辑模式：'add' | 'edit' | 'list'
        this.mode = 'list';
        
        // 当前编辑的连接点
        this.editingPoint = null;
        
        // 添加模式下的临时位置
        this.tempPosition = { x: 0.5, y: 0.5 };
        
        // 回调
        this.onPointAdded = options.onPointAdded || null;
        this.onPointRemoved = options.onPointRemoved || null;
        this.onPointUpdated = options.onPointUpdated || null;
        this.onClose = options.onClose || null;
        
        // 预览画布
        this.previewCanvas = null;
        this.previewCtx = null;
        
        // 拖拽状态
        this.isDragging = false;
        this.dragStartPos = null;
    }

    /**
     * 创建面板
     */
    create() {
        if (this.container) return this.container;
        
        this.container = document.createElement('div');
        this.container.className = 'custom-cp-editor-panel';
        this.container.innerHTML = `
            <div class="cp-editor-header">
                <h3>连接点编辑器</h3>
                <button class="cp-editor-close" title="关闭">&times;</button>
            </div>
            <div class="cp-editor-component-info">
                <span class="component-name">未选择组件</span>
            </div>
            <div class="cp-editor-tabs">
                <button class="cp-tab active" data-tab="list">连接点列表</button>
                <button class="cp-tab" data-tab="add">添加连接点</button>
            </div>
            <div class="cp-editor-content">
                <div class="cp-tab-content" data-content="list">
                    <div class="cp-list"></div>
                </div>
                <div class="cp-tab-content" data-content="add" style="display:none;">
                    <div class="cp-add-form">
                        <div class="cp-preview-section">
                            <canvas class="cp-preview-canvas" width="200" height="200"></canvas>
                            <div class="cp-preview-hint">点击或拖拽设置连接点位置</div>
                        </div>
                        <div class="cp-form-fields">
                            <div class="form-group">
                                <label>标签</label>
                                <input type="text" class="cp-input" id="cp-label" placeholder="例如: in1, out2">
                            </div>
                            <div class="form-group">
                                <label>类型</label>
                                <select class="cp-select" id="cp-type">
                                    <option value="${CONNECTION_POINT_TYPES.BIDIRECTIONAL}">双向</option>
                                    <option value="${CONNECTION_POINT_TYPES.INPUT}">输入</option>
                                    <option value="${CONNECTION_POINT_TYPES.OUTPUT}">输出</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>方向 (度)</label>
                                <input type="number" class="cp-input" id="cp-direction" value="0" min="-180" max="180">
                            </div>
                            <div class="form-group position-group">
                                <label>位置</label>
                                <div class="position-inputs">
                                    <div class="pos-input-wrapper">
                                        <span>X:</span>
                                        <input type="number" class="cp-input cp-pos-input" id="cp-pos-x" value="0.5" min="0" max="1" step="0.01">
                                    </div>
                                    <div class="pos-input-wrapper">
                                        <span>Y:</span>
                                        <input type="number" class="cp-input cp-pos-input" id="cp-pos-y" value="0.5" min="0" max="1" step="0.01">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="cp-form-actions">
                            <button class="cp-btn cp-btn-primary" id="btn-add-point">添加连接点</button>
                            <button class="cp-btn cp-btn-secondary" id="btn-reset-form">重置</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this._injectStyles();
        this._bindEvents();
        
        // 初始化预览画布
        this.previewCanvas = this.container.querySelector('.cp-preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        return this.container;
    }

    /**
     * 打开编辑器
     */
    open(component, anchorElement = null) {
        if (!this.container) {
            this.create();
        }
        
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        
        this.targetComponent = component;
        this._updateComponentInfo();
        this._renderPointsList();
        this._renderPreview();
        
        // 定位面板
        if (anchorElement) {
            const rect = anchorElement.getBoundingClientRect();
            this.container.style.top = `${rect.bottom + 8}px`;
            this.container.style.left = `${rect.left}px`;
        } else {
            this.container.style.top = '100px';
            this.container.style.right = '20px';
            this.container.style.left = 'auto';
        }
        
        this.container.classList.add('open');
        this.isOpen = true;
    }

    /**
     * 关闭编辑器
     */
    close() {
        if (this.container) {
            this.container.classList.remove('open');
        }
        this.isOpen = false;
        this.targetComponent = null;
        this.editingPoint = null;
        
        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * 切换编辑器
     */
    toggle(component, anchorElement = null) {
        if (this.isOpen && this.targetComponent === component) {
            this.close();
        } else {
            this.open(component, anchorElement);
        }
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 关闭按钮
        this.container.querySelector('.cp-editor-close')?.addEventListener('click', () => {
            this.close();
        });
        
        // 标签页切换
        this.container.querySelectorAll('.cp-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this._switchTab(tabName);
            });
        });
        
        // 预览画布交互
        const canvas = this.container.querySelector('.cp-preview-canvas');
        if (canvas) {
            canvas.addEventListener('mousedown', (e) => this._handleCanvasMouseDown(e));
            canvas.addEventListener('mousemove', (e) => this._handleCanvasMouseMove(e));
            canvas.addEventListener('mouseup', (e) => this._handleCanvasMouseUp(e));
            canvas.addEventListener('mouseleave', (e) => this._handleCanvasMouseUp(e));
        }
        
        // 位置输入变化
        this.container.querySelector('#cp-pos-x')?.addEventListener('input', (e) => {
            this.tempPosition.x = parseFloat(e.target.value) || 0.5;
            this._renderPreview();
        });
        
        this.container.querySelector('#cp-pos-y')?.addEventListener('input', (e) => {
            this.tempPosition.y = parseFloat(e.target.value) || 0.5;
            this._renderPreview();
        });
        
        // 方向输入变化
        this.container.querySelector('#cp-direction')?.addEventListener('input', () => {
            this._renderPreview();
        });
        
        // 类型选择变化
        this.container.querySelector('#cp-type')?.addEventListener('change', () => {
            this._renderPreview();
        });
        
        // 添加按钮
        this.container.querySelector('#btn-add-point')?.addEventListener('click', () => {
            this._addCustomPoint();
        });
        
        // 重置按钮
        this.container.querySelector('#btn-reset-form')?.addEventListener('click', () => {
            this._resetForm();
        });
        
        // 连接点列表事件委托
        this.container.querySelector('.cp-list')?.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.cp-delete-btn');
            const editBtn = e.target.closest('.cp-edit-btn');
            
            if (deleteBtn) {
                const pointId = deleteBtn.dataset.pointId;
                this._deletePoint(pointId);
            } else if (editBtn) {
                const pointId = editBtn.dataset.pointId;
                this._editPoint(pointId);
            }
        });
    }

    /**
     * 切换标签页
     * @private
     */
    _switchTab(tabName) {
        this.mode = tabName;
        
        // 更新标签按钮状态
        this.container.querySelectorAll('.cp-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // 更新内容显示
        this.container.querySelectorAll('.cp-tab-content').forEach(content => {
            content.style.display = content.dataset.content === tabName ? 'block' : 'none';
        });
        
        if (tabName === 'add') {
            this._renderPreview();
        }
    }

    /**
     * 更新组件信息
     * @private
     */
    _updateComponentInfo() {
        const nameEl = this.container.querySelector('.component-name');
        if (nameEl && this.targetComponent) {
            const type = this.targetComponent.type || this.targetComponent.constructor?.name || '未知';
            const id = this.targetComponent.id || this.targetComponent.uuid || '';
            nameEl.textContent = `${type} (${id.substring(0, 8)}...)`;
        } else if (nameEl) {
            nameEl.textContent = '未选择组件';
        }
    }

    /**
     * 渲染连接点列表
     * @private
     */
    _renderPointsList() {
        const listContainer = this.container.querySelector('.cp-list');
        if (!listContainer || !this.targetComponent) return;
        
        const componentId = this.targetComponent.id || this.targetComponent.uuid;
        const points = this.connectionPointManager.getComponentPoints(componentId);
        
        if (points.length === 0) {
            listContainer.innerHTML = `
                <div class="cp-list-empty">
                    <p>该组件没有连接点</p>
                    <p class="hint">切换到"添加连接点"标签页添加</p>
                </div>
            `;
            return;
        }
        
        listContainer.innerHTML = points.map(point => `
            <div class="cp-list-item ${point.isCustom ? 'custom' : 'builtin'}">
                <div class="cp-item-info">
                    <span class="cp-item-label">${point.label || point.pointId}</span>
                    <span class="cp-item-type cp-type-${point.type}">${POINT_TYPE_LABELS[point.type] || point.type}</span>
                    ${point.isCustom ? '<span class="cp-item-badge">自定义</span>' : ''}
                </div>
                <div class="cp-item-position">
                    位置: (${point.relativePosition.x.toFixed(2)}, ${point.relativePosition.y.toFixed(2)})
                </div>
                <div class="cp-item-actions">
                    ${point.isCustom ? `
                        <button class="cp-edit-btn" data-point-id="${point.id}" title="编辑">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                        <button class="cp-delete-btn" data-point-id="${point.id}" title="删除">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * 渲染预览画布
     * @private
     */
    _renderPreview() {
        if (!this.previewCtx || !this.targetComponent) return;
        
        const ctx = this.previewCtx;
        const width = 200;
        const height = 200;
        
        // 清除画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景网格
        ctx.save();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 10; i++) {
            const x = i * 20;
            const y = i * 20;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.restore();
        
        // 绘制组件边界框
        ctx.save();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(40, 40, 120, 120);
        ctx.restore();
        
        // 绘制组件中心
        ctx.save();
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(100, 100, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // 绘制现有连接点
        const componentId = this.targetComponent.id || this.targetComponent.uuid;
        const existingPoints = this.connectionPointManager.getComponentPoints(componentId);
        
        existingPoints.forEach(point => {
            const x = 40 + point.relativePosition.x * 120;
            const y = 40 + point.relativePosition.y * 120;
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = point.isCustom ? '#ff8844' : '#4488ff';
            ctx.fill();
            ctx.strokeStyle = point.isCustom ? '#cc6622' : '#2266cc';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        });
        
        // 绘制新连接点预览
        const newX = 40 + this.tempPosition.x * 120;
        const newY = 40 + this.tempPosition.y * 120;
        const direction = parseFloat(this.container.querySelector('#cp-direction')?.value || 0);
        const type = this.container.querySelector('#cp-type')?.value || CONNECTION_POINT_TYPES.BIDIRECTIONAL;
        
        ctx.save();
        
        // 绘制连接点
        ctx.beginPath();
        ctx.arc(newX, newY, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#44ff44';
        ctx.fill();
        ctx.strokeStyle = '#22cc22';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制方向指示器
        if (type !== CONNECTION_POINT_TYPES.BIDIRECTIONAL) {
            const arrowLen = 15;
            const rad = direction * Math.PI / 180;
            const arrowX = newX + Math.cos(rad) * arrowLen;
            const arrowY = newY + Math.sin(rad) * arrowLen;
            
            ctx.beginPath();
            ctx.moveTo(newX + Math.cos(rad) * 7, newY + Math.sin(rad) * 7);
            ctx.lineTo(arrowX, arrowY);
            ctx.strokeStyle = '#22cc22';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 箭头头部
            const headLen = 6;
            const headAngle = Math.PI / 6;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - headLen * Math.cos(rad - headAngle), arrowY - headLen * Math.sin(rad - headAngle));
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - headLen * Math.cos(rad + headAngle), arrowY - headLen * Math.sin(rad + headAngle));
            ctx.stroke();
        }
        
        ctx.restore();
        
        // 绘制坐标标签
        ctx.save();
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.fillText(`(${this.tempPosition.x.toFixed(2)}, ${this.tempPosition.y.toFixed(2)})`, newX + 10, newY - 10);
        ctx.restore();
    }


    /**
     * 处理画布鼠标按下
     * @private
     */
    _handleCanvasMouseDown(e) {
        this.isDragging = true;
        this._updatePositionFromMouse(e);
    }

    /**
     * 处理画布鼠标移动
     * @private
     */
    _handleCanvasMouseMove(e) {
        if (!this.isDragging) return;
        this._updatePositionFromMouse(e);
    }

    /**
     * 处理画布鼠标释放
     * @private
     */
    _handleCanvasMouseUp(e) {
        this.isDragging = false;
    }

    /**
     * 从鼠标位置更新连接点位置
     * @private
     */
    _updatePositionFromMouse(e) {
        const canvas = this.previewCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 转换为相对位置 (0-1)
        // 组件边界框在 (40, 40) 到 (160, 160)
        let relX = (x - 40) / 120;
        let relY = (y - 40) / 120;
        
        // 限制在 0-1 范围内
        relX = Math.max(0, Math.min(1, relX));
        relY = Math.max(0, Math.min(1, relY));
        
        // 吸附到网格 (0.1 步长)
        relX = Math.round(relX * 10) / 10;
        relY = Math.round(relY * 10) / 10;
        
        this.tempPosition.x = relX;
        this.tempPosition.y = relY;
        
        // 更新输入框
        const posXInput = this.container.querySelector('#cp-pos-x');
        const posYInput = this.container.querySelector('#cp-pos-y');
        if (posXInput) posXInput.value = relX.toFixed(2);
        if (posYInput) posYInput.value = relY.toFixed(2);
        
        this._renderPreview();
    }

    /**
     * 添加自定义连接点
     * @private
     */
    _addCustomPoint() {
        // 如果正在编辑，调用更新方法
        if (this.editingPoint) {
            this._updatePoint();
            return;
        }
        
        if (!this.targetComponent) {
            alert('请先选择一个组件');
            return;
        }
        
        const label = this.container.querySelector('#cp-label')?.value || '';
        const type = this.container.querySelector('#cp-type')?.value || CONNECTION_POINT_TYPES.BIDIRECTIONAL;
        const direction = parseFloat(this.container.querySelector('#cp-direction')?.value || 0);
        
        if (!label.trim()) {
            alert('请输入连接点标签');
            return;
        }
        
        const componentId = this.targetComponent.id || this.targetComponent.uuid;
        
        const config = {
            label: label.trim(),
            type: type,
            direction: direction,
            position: { ...this.tempPosition }
        };
        
        const point = this.connectionPointManager.addCustomPoint(componentId, config);
        
        if (point) {
            console.log('CustomConnectionPointEditor: Added custom point', point);
            
            // 更新连接点世界坐标
            this.connectionPointManager.updateComponentPoints(this.targetComponent);
            
            // 回调
            if (this.onPointAdded) {
                this.onPointAdded(point, this.targetComponent);
            }
            
            // 重置表单并切换到列表
            this._resetForm();
            this._switchTab('list');
            this._renderPointsList();
            
            // 触发重绘
            this._triggerRedraw();
        }
    }

    /**
     * 删除连接点
     * @private
     */
    _deletePoint(pointId) {
        const point = this.connectionPointManager.getPointById(pointId);
        if (!point) return;
        
        if (!point.isCustom) {
            alert('只能删除自定义连接点');
            return;
        }
        
        const confirmed = confirm(`确定要删除连接点 "${point.label}" 吗？`);
        if (!confirmed) return;
        
        const success = this.connectionPointManager.removeCustomPoint(pointId);
        
        if (success) {
            console.log('CustomConnectionPointEditor: Removed custom point', pointId);
            
            // 回调
            if (this.onPointRemoved) {
                this.onPointRemoved(point, this.targetComponent);
            }
            
            // 更新列表
            this._renderPointsList();
            
            // 触发重绘
            this._triggerRedraw();
        }
    }

    /**
     * 编辑连接点
     * @private
     */
    _editPoint(pointId) {
        const point = this.connectionPointManager.getPointById(pointId);
        if (!point || !point.isCustom) return;
        
        this.editingPoint = point;
        
        // 填充表单
        const labelInput = this.container.querySelector('#cp-label');
        const typeSelect = this.container.querySelector('#cp-type');
        const directionInput = this.container.querySelector('#cp-direction');
        const posXInput = this.container.querySelector('#cp-pos-x');
        const posYInput = this.container.querySelector('#cp-pos-y');
        
        if (labelInput) labelInput.value = point.label;
        if (typeSelect) typeSelect.value = point.type;
        if (directionInput) directionInput.value = point.direction;
        if (posXInput) posXInput.value = point.relativePosition.x.toFixed(2);
        if (posYInput) posYInput.value = point.relativePosition.y.toFixed(2);
        
        this.tempPosition = { ...point.relativePosition };
        
        // 更新按钮文本
        const addBtn = this.container.querySelector('#btn-add-point');
        if (addBtn) addBtn.textContent = '更新连接点';
        
        // 切换到添加标签页
        this._switchTab('add');
    }

    /**
     * 更新连接点
     * @private
     */
    _updatePoint() {
        if (!this.editingPoint) return;
        
        const label = this.container.querySelector('#cp-label')?.value || '';
        const type = this.container.querySelector('#cp-type')?.value || CONNECTION_POINT_TYPES.BIDIRECTIONAL;
        const direction = parseFloat(this.container.querySelector('#cp-direction')?.value || 0);
        
        if (!label.trim()) {
            alert('请输入连接点标签');
            return;
        }
        
        // 更新连接点属性
        this.editingPoint.label = label.trim();
        this.editingPoint.type = type;
        this.editingPoint.direction = direction;
        this.editingPoint.relativePosition = { ...this.tempPosition };
        
        // 更新世界坐标
        this.connectionPointManager.updateComponentPoints(this.targetComponent);
        
        console.log('CustomConnectionPointEditor: Updated custom point', this.editingPoint);
        
        // 回调
        if (this.onPointUpdated) {
            this.onPointUpdated(this.editingPoint, this.targetComponent);
        }
        
        // 重置并返回列表
        this._resetForm();
        this._switchTab('list');
        this._renderPointsList();
        
        // 触发重绘
        this._triggerRedraw();
    }

    /**
     * 重置表单
     * @private
     */
    _resetForm() {
        this.editingPoint = null;
        this.tempPosition = { x: 0.5, y: 0.5 };
        
        const labelInput = this.container.querySelector('#cp-label');
        const typeSelect = this.container.querySelector('#cp-type');
        const directionInput = this.container.querySelector('#cp-direction');
        const posXInput = this.container.querySelector('#cp-pos-x');
        const posYInput = this.container.querySelector('#cp-pos-y');
        const addBtn = this.container.querySelector('#btn-add-point');
        
        if (labelInput) labelInput.value = '';
        if (typeSelect) typeSelect.value = CONNECTION_POINT_TYPES.BIDIRECTIONAL;
        if (directionInput) directionInput.value = '0';
        if (posXInput) posXInput.value = '0.50';
        if (posYInput) posYInput.value = '0.50';
        if (addBtn) addBtn.textContent = '添加连接点';
        
        this._renderPreview();
    }

    /**
     * 触发重绘
     * @private
     */
    _triggerRedraw() {
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent('diagram-redraw'));
        }
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'custom-cp-editor-styles';
        if (document.getElementById(styleId)) return;
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .custom-cp-editor-panel {
                position: fixed;
                width: 320px;
                max-height: 600px;
                background: var(--panel-bg, #1e1e1e);
                border: 1px solid var(--border-color, #333);
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                z-index: 9000;
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            
            .custom-cp-editor-panel.open {
                display: flex;
            }
            
            .cp-editor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
                background: var(--header-bg, #252526);
            }
            
            .cp-editor-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary, #fff);
            }
            
            .cp-editor-close {
                background: none;
                border: none;
                font-size: 20px;
                color: var(--text-secondary, #888);
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            }
            
            .cp-editor-close:hover {
                color: var(--text-primary, #fff);
            }
            
            .cp-editor-component-info {
                padding: 8px 16px;
                background: var(--info-bg, #2a2a2a);
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .component-name {
                font-size: 12px;
                color: var(--text-secondary, #888);
            }
            
            .cp-editor-tabs {
                display: flex;
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .cp-tab {
                flex: 1;
                padding: 10px 16px;
                border: none;
                background: transparent;
                color: var(--text-secondary, #888);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
                border-bottom: 2px solid transparent;
            }
            
            .cp-tab:hover {
                color: var(--text-primary, #fff);
                background: var(--hover-bg, rgba(255, 255, 255, 0.05));
            }
            
            .cp-tab.active {
                color: var(--accent-color, #0078d4);
                border-bottom-color: var(--accent-color, #0078d4);
            }
            
            .cp-editor-content {
                flex: 1;
                overflow-y: auto;
            }
            
            .cp-tab-content {
                padding: 16px;
            }
            
            /* 连接点列表样式 */
            .cp-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .cp-list-empty {
                text-align: center;
                padding: 30px 20px;
                color: var(--text-secondary, #888);
            }
            
            .cp-list-empty .hint {
                font-size: 11px;
                margin-top: 8px;
                opacity: 0.7;
            }
            
            .cp-list-item {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 10px 12px;
                background: var(--item-bg, #2a2a2a);
                border: 1px solid var(--border-color, #333);
                border-radius: 6px;
            }
            
            .cp-list-item.custom {
                border-color: var(--custom-border, #664422);
            }
            
            .cp-item-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .cp-item-label {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary, #fff);
            }
            
            .cp-item-type {
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 3px;
                background: var(--type-bg, #333);
            }
            
            .cp-item-type.cp-type-input { background: #2a4a6a; color: #8ac; }
            .cp-item-type.cp-type-output { background: #6a4a2a; color: #ca8; }
            .cp-item-type.cp-type-bidirectional { background: #4a4a4a; color: #aaa; }
            
            .cp-item-badge {
                font-size: 9px;
                padding: 2px 5px;
                border-radius: 3px;
                background: #664422;
                color: #ffaa66;
            }
            
            .cp-item-position {
                font-size: 11px;
                color: var(--text-secondary, #888);
            }
            
            .cp-item-actions {
                display: flex;
                gap: 6px;
                margin-top: 4px;
            }
            
            .cp-edit-btn, .cp-delete-btn {
                padding: 4px 8px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: transparent;
                color: var(--text-secondary, #888);
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cp-edit-btn:hover {
                border-color: var(--accent-color, #0078d4);
                color: var(--accent-color, #0078d4);
            }
            
            .cp-delete-btn:hover {
                border-color: #cc4444;
                color: #cc4444;
            }
            
            /* 添加表单样式 */
            .cp-add-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .cp-preview-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .cp-preview-canvas {
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--canvas-bg, #1a1a1a);
                cursor: crosshair;
            }
            
            .cp-preview-hint {
                font-size: 11px;
                color: var(--text-secondary, #888);
            }
            
            .cp-form-fields {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .form-group label {
                font-size: 11px;
                color: var(--text-secondary, #888);
            }
            
            .cp-input, .cp-select {
                padding: 8px 10px;
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                background: var(--input-bg, #2d2d2d);
                color: var(--text-primary, #fff);
                font-size: 13px;
                outline: none;
            }
            
            .cp-input:focus, .cp-select:focus {
                border-color: var(--accent-color, #0078d4);
            }
            
            .position-group .position-inputs {
                display: flex;
                gap: 12px;
            }
            
            .pos-input-wrapper {
                display: flex;
                align-items: center;
                gap: 6px;
                flex: 1;
            }
            
            .pos-input-wrapper span {
                font-size: 12px;
                color: var(--text-secondary, #888);
            }
            
            .cp-pos-input {
                width: 100%;
            }
            
            .cp-form-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }
            
            .cp-btn {
                flex: 1;
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .cp-btn-primary {
                background: var(--accent-color, #0078d4);
                color: #fff;
            }
            
            .cp-btn-primary:hover {
                background: var(--accent-hover, #1084d8);
            }
            
            .cp-btn-secondary {
                background: var(--secondary-bg, #333);
                color: var(--text-primary, #fff);
            }
            
            .cp-btn-secondary:hover {
                background: var(--secondary-hover, #444);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 销毁编辑器
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
        this.targetComponent = null;
        this.editingPoint = null;
    }
}

// 单例
let customCPEditorInstance = null;

export function getCustomConnectionPointEditor(options = {}) {
    if (!customCPEditorInstance) {
        customCPEditorInstance = new CustomConnectionPointEditor(options);
    }
    return customCPEditorInstance;
}

export function resetCustomConnectionPointEditor() {
    if (customCPEditorInstance) {
        customCPEditorInstance.destroy();
    }
    customCPEditorInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.CustomConnectionPointEditor = CustomConnectionPointEditor;
    window.getCustomConnectionPointEditor = getCustomConnectionPointEditor;
}
