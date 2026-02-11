/**
 * LayerPanel.js - 图层面板UI
 * 提供图层管理的可视化界面
 * 
 * Requirements: 12.8
 */

import { getLayerManager } from '../../diagram/layers/LayerManager.js';

/**
 * 图层面板类
 */
export class LayerPanel {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.layerManager = getLayerManager();
        
        // 状态
        this.draggedLayerId = null;
        this.dropTargetLayerId = null;
        
        // 回调
        this.onLayerChange = null;
        this.onLayerSelect = null;
        
        // 初始化
        this._initialize();
    }

    /**
     * 初始化面板
     * @private
     */
    _initialize() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`LayerPanel: Container "${this.containerId}" not found`);
            return;
        }
        
        this._buildUI();
        this._bindEvents();
        this.refresh();
    }

    /**
     * 构建UI结构
     * @private
     */
    _buildUI() {
        this.container.innerHTML = `
            <div class="layer-panel">
                <div class="layer-panel-header">
                    <h3>Layers</h3>
                    <div class="layer-panel-actions">
                        <button class="layer-btn" data-action="add" title="Add Layer">+</button>
                        <button class="layer-btn" data-action="delete" title="Delete Layer">🗑</button>
                        <button class="layer-btn" data-action="duplicate" title="Duplicate Layer">⎘</button>
                        <button class="layer-btn" data-action="merge" title="Merge Layers">⇅</button>
                    </div>
                </div>
                
                <div class="layer-panel-list"></div>
                
                <div class="layer-panel-footer">
                    <div class="layer-opacity-control">
                        <label>Opacity:</label>
                        <input type="range" class="layer-opacity-slider" min="0" max="100" value="100">
                        <span class="layer-opacity-value">100%</span>
                    </div>
                </div>
            </div>
        `;
        
        this._injectStyles();
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        if (document.getElementById('layer-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'layer-panel-styles';
        style.textContent = `
            .layer-panel {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--panel-bg, #f5f5f5);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            }
            
            .layer-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: var(--header-bg, #fff);
                border-bottom: 1px solid var(--border-color, #ddd);
            }
            
            .layer-panel-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                color: var(--text-color, #333);
            }
            
            .layer-panel-actions {
                display: flex;
                gap: 4px;
            }
            
            .layer-btn {
                width: 28px;
                height: 28px;
                border: 1px solid var(--border-color, #ddd);
                background: var(--button-bg, #fff);
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .layer-btn:hover {
                background: var(--button-hover-bg, #f0f0f0);
                border-color: var(--primary-color, #4488ff);
            }
            
            .layer-panel-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            
            .layer-item {
                display: flex;
                align-items: center;
                padding: 8px;
                margin-bottom: 4px;
                background: var(--item-bg, #fff);
                border: 2px solid transparent;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
                user-select: none;
            }
            
            .layer-item:hover {
                background: var(--item-hover-bg, #f8f8f8);
            }
            
            .layer-item.active {
                border-color: var(--primary-color, #4488ff);
                background: var(--primary-light, #e8f0ff);
            }
            
            .layer-item.selected {
                background: var(--primary-light, #e8f0ff);
            }
            
            .layer-item.dragging {
                opacity: 0.5;
            }
            
            .layer-item.drop-target {
                border-color: var(--success-color, #44cc44);
                border-style: dashed;
            }
            
            .layer-color {
                width: 16px;
                height: 16px;
                border-radius: 3px;
                margin-right: 8px;
                border: 1px solid rgba(0,0,0,0.2);
            }
            
            .layer-visibility {
                width: 20px;
                height: 20px;
                margin-right: 8px;
                cursor: pointer;
                font-size: 16px;
                text-align: center;
                user-select: none;
            }
            
            .layer-lock {
                width: 20px;
                height: 20px;
                margin-right: 8px;
                cursor: pointer;
                font-size: 14px;
                text-align: center;
                user-select: none;
            }
            
            .layer-name {
                flex: 1;
                font-size: 13px;
                color: var(--text-color, #333);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .layer-name.editable {
                background: var(--input-bg, #fff);
                border: 1px solid var(--primary-color, #4488ff);
                border-radius: 3px;
                padding: 2px 4px;
                outline: none;
            }
            
            .layer-count {
                font-size: 11px;
                color: var(--text-secondary, #999);
                margin-left: 8px;
            }
            
            .layer-panel-footer {
                padding: 12px 16px;
                background: var(--header-bg, #fff);
                border-top: 1px solid var(--border-color, #ddd);
            }
            
            .layer-opacity-control {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .layer-opacity-control label {
                font-size: 12px;
                color: var(--text-color, #333);
                min-width: 60px;
            }
            
            .layer-opacity-slider {
                flex: 1;
                height: 4px;
            }
            
            .layer-opacity-value {
                font-size: 12px;
                color: var(--text-secondary, #666);
                min-width: 40px;
                text-align: right;
            }
            
            .layer-panel-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .layer-panel-list::-webkit-scrollbar-track {
                background: var(--scrollbar-track, #f0f0f0);
            }
            
            .layer-panel-list::-webkit-scrollbar-thumb {
                background: var(--scrollbar-thumb, #ccc);
                border-radius: 4px;
            }
            
            .layer-panel-list::-webkit-scrollbar-thumb:hover {
                background: var(--scrollbar-thumb-hover, #999);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 工具栏按钮
        const actions = this.container.querySelectorAll('[data-action]');
        actions.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this._handleAction(action);
            });
        });
        
        // 透明度滑块
        const opacitySlider = this.container.querySelector('.layer-opacity-slider');
        const opacityValue = this.container.querySelector('.layer-opacity-value');
        
        opacitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            opacityValue.textContent = value + '%';
            
            const activeLayer = this.layerManager.getActiveLayer();
            if (activeLayer) {
                this.layerManager.setLayerOpacity(activeLayer.id, value / 100);
                this._notifyChange();
            }
        });
    }

    /**
     * 处理操作
     * @private
     */
    _handleAction(action) {
        switch (action) {
            case 'add':
                this._addLayer();
                break;
            case 'delete':
                this._deleteLayer();
                break;
            case 'duplicate':
                this._duplicateLayer();
                break;
            case 'merge':
                this._mergeLayers();
                break;
        }
    }

    /**
     * 添加图层
     * @private
     */
    _addLayer() {
        const count = this.layerManager.getAllLayers().length;
        const layer = this.layerManager.createLayer({
            name: `Layer ${count}`
        });
        
        this.layerManager.setActiveLayer(layer.id);
        this.refresh();
        this._notifyChange();
    }

    /**
     * 删除图层
     * @private
     */
    _deleteLayer() {
        const activeLayer = this.layerManager.getActiveLayer();
        if (!activeLayer || activeLayer.id === 'default') {
            alert('Cannot delete default layer');
            return;
        }
        
        if (confirm(`Delete layer "${activeLayer.name}"?`)) {
            this.layerManager.deleteLayer(activeLayer.id);
            this.refresh();
            this._notifyChange();
        }
    }

    /**
     * 复制图层
     * @private
     */
    _duplicateLayer() {
        const activeLayer = this.layerManager.getActiveLayer();
        if (!activeLayer) return;
        
        const newLayer = this.layerManager.duplicateLayer(activeLayer.id);
        if (newLayer) {
            this.layerManager.setActiveLayer(newLayer.id);
            this.refresh();
            this._notifyChange();
        }
    }

    /**
     * 合并图层
     * @private
     */
    _mergeLayers() {
        const selected = this.layerManager.getSelectedLayers();
        if (selected.length !== 2) {
            alert('Please select exactly 2 layers to merge');
            return;
        }
        
        if (confirm(`Merge "${selected[0].name}" into "${selected[1].name}"?`)) {
            this.layerManager.mergeLayers(selected[0].id, selected[1].id);
            this.refresh();
            this._notifyChange();
        }
    }

    /**
     * 刷新图层列表
     */
    refresh() {
        const list = this.container.querySelector('.layer-panel-list');
        list.innerHTML = '';
        
        const layers = this.layerManager.getOrderedLayers();
        const activeLayer = this.layerManager.getActiveLayer();
        
        // 反向显示（顶层在上）
        layers.reverse().forEach(layer => {
            const item = this._createLayerItem(layer, layer === activeLayer);
            list.appendChild(item);
        });
        
        // 更新透明度滑块
        if (activeLayer) {
            const opacitySlider = this.container.querySelector('.layer-opacity-slider');
            const opacityValue = this.container.querySelector('.layer-opacity-value');
            const opacity = Math.round(activeLayer.opacity * 100);
            opacitySlider.value = opacity;
            opacityValue.textContent = opacity + '%';
        }
    }

    /**
     * 创建图层项
     * @private
     */
    _createLayerItem(layer, isActive) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.dataset.layerId = layer.id;
        
        if (isActive) {
            item.classList.add('active');
        }
        
        if (this.layerManager.selectedLayers.has(layer.id)) {
            item.classList.add('selected');
        }
        
        // 颜色标识
        const color = document.createElement('div');
        color.className = 'layer-color';
        color.style.backgroundColor = layer.color;
        
        // 可见性图标
        const visibility = document.createElement('div');
        visibility.className = 'layer-visibility';
        visibility.textContent = layer.visible ? '👁' : '🚫';
        visibility.title = layer.visible ? 'Hide layer' : 'Show layer';
        
        // 锁定图标
        const lock = document.createElement('div');
        lock.className = 'layer-lock';
        lock.textContent = layer.locked ? '🔒' : '🔓';
        lock.title = layer.locked ? 'Unlock layer' : 'Lock layer';
        
        // 名称
        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = layer.name;
        
        // 对象数量
        const count = document.createElement('span');
        count.className = 'layer-count';
        count.textContent = `(${layer.objects.length})`;
        
        item.appendChild(color);
        item.appendChild(visibility);
        item.appendChild(lock);
        item.appendChild(name);
        item.appendChild(count);
        
        // 事件
        item.addEventListener('click', (e) => {
            if (e.target === visibility || e.target === lock) return;
            this._selectLayer(layer.id, e.ctrlKey || e.metaKey);
        });
        
        visibility.addEventListener('click', (e) => {
            e.stopPropagation();
            this.layerManager.toggleLayerVisibility(layer.id);
            this.refresh();
            this._notifyChange();
        });
        
        lock.addEventListener('click', (e) => {
            e.stopPropagation();
            this.layerManager.toggleLayerLock(layer.id);
            this.refresh();
            this._notifyChange();
        });
        
        name.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._editLayerName(layer.id, name);
        });
        
        // 拖拽
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            this.draggedLayerId = layer.id;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.draggedLayerId = null;
            this.dropTargetLayerId = null;
            this.refresh();
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.dropTargetLayerId = layer.id;
            item.classList.add('drop-target');
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drop-target');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drop-target');
            
            if (this.draggedLayerId && this.draggedLayerId !== layer.id) {
                const draggedIndex = this.layerManager.layerOrder.indexOf(this.draggedLayerId);
                const targetIndex = this.layerManager.layerOrder.indexOf(layer.id);
                
                // 反向索引（因为显示是反向的）
                const reversedTargetIndex = this.layerManager.layerOrder.length - 1 - targetIndex;
                
                this.layerManager.moveLayer(this.draggedLayerId, reversedTargetIndex);
                this.refresh();
                this._notifyChange();
            }
        });
        
        return item;
    }

    /**
     * 选择图层
     * @private
     */
    _selectLayer(layerId, addToSelection) {
        this.layerManager.selectLayer(layerId, addToSelection);
        this.layerManager.setActiveLayer(layerId);
        this.refresh();
        
        if (this.onLayerSelect) {
            this.onLayerSelect(layerId);
        }
    }

    /**
     * 编辑图层名称
     * @private
     */
    _editLayerName(layerId, nameElement) {
        const layer = this.layerManager.getLayer(layerId);
        if (!layer) return;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.className = 'layer-name editable';
        
        nameElement.replaceWith(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newName = input.value.trim() || layer.name;
            this.layerManager.renameLayer(layerId, newName);
            this.refresh();
            this._notifyChange();
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                this.refresh();
            }
        });
    }

    /**
     * 通知变化
     * @private
     */
    _notifyChange() {
        if (this.onLayerChange) {
            this.onLayerChange();
        }
    }

    /**
     * 设置变化回调
     */
    setOnLayerChange(callback) {
        this.onLayerChange = callback;
    }

    /**
     * 设置选择回调
     */
    setOnLayerSelect(callback) {
        this.onLayerSelect = callback;
    }
}

// ========== 单例模式 ==========
let layerPanelInstance = null;

export function getLayerPanel(containerId = 'layer-panel-container') {
    if (!layerPanelInstance) {
        layerPanelInstance = new LayerPanel(containerId);
    }
    return layerPanelInstance;
}

export function resetLayerPanel() {
    layerPanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.LayerPanel = LayerPanel;
    window.getLayerPanel = getLayerPanel;
}
