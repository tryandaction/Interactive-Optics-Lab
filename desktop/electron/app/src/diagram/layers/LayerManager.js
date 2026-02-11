/**
 * LayerManager.js - 图层管理器
 * 管理图层的创建、编辑、排序和可见性
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

/**
 * 生成唯一ID
 */
function generateLayerId() {
    return 'layer_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 图层类
 */
export class Layer {
    constructor(config) {
        this.id = config.id || generateLayerId();
        this.name = config.name || 'Layer';
        this.visible = config.visible !== false;
        this.locked = config.locked || false;
        this.opacity = config.opacity !== undefined ? config.opacity : 1.0;
        this.zIndex = config.zIndex || 0;
        this.color = config.color || '#4488ff'; // 图层标识颜色
        this.objects = []; // 该图层中的对象ID列表
        this.parent = config.parent || null; // 父图层ID（用于嵌套）
        this.children = []; // 子图层ID列表
        this.expanded = config.expanded !== false; // UI中是否展开
    }

    /**
     * 添加对象
     */
    addObject(objectId) {
        if (!this.objects.includes(objectId)) {
            this.objects.push(objectId);
        }
    }

    /**
     * 移除对象
     */
    removeObject(objectId) {
        const index = this.objects.indexOf(objectId);
        if (index !== -1) {
            this.objects.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 检查是否包含对象
     */
    hasObject(objectId) {
        return this.objects.includes(objectId);
    }

    /**
     * 添加子图层
     */
    addChild(layerId) {
        if (!this.children.includes(layerId)) {
            this.children.push(layerId);
        }
    }

    /**
     * 移除子图层
     */
    removeChild(layerId) {
        const index = this.children.indexOf(layerId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            visible: this.visible,
            locked: this.locked,
            opacity: this.opacity,
            zIndex: this.zIndex,
            color: this.color,
            objects: [...this.objects],
            parent: this.parent,
            children: [...this.children],
            expanded: this.expanded
        };
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        return new Layer(data);
    }
}

/**
 * 图层管理器类
 */
export class LayerManager {
    constructor() {
        /** @type {Map<string, Layer>} */
        this.layers = new Map();
        
        /** @type {string[]} 图层顺序（从底到顶） */
        this.layerOrder = [];
        
        /** @type {string|null} 当前活动图层 */
        this.activeLayerId = null;
        
        /** @type {Set<string>} 选中的图层 */
        this.selectedLayers = new Set();
        
        /** @type {Map<string, string>} 对象ID -> 图层ID映射 */
        this.objectToLayer = new Map();
        
        // 创建默认图层
        this._createDefaultLayer();
    }

    /**
     * 创建默认图层
     * @private
     */
    _createDefaultLayer() {
        const defaultLayer = new Layer({
            id: 'default',
            name: 'Default Layer',
            zIndex: 0
        });
        
        this.layers.set(defaultLayer.id, defaultLayer);
        this.layerOrder.push(defaultLayer.id);
        this.activeLayerId = defaultLayer.id;
    }

    /**
     * 创建图层
     */
    createLayer(config = {}) {
        const layer = new Layer({
            ...config,
            zIndex: config.zIndex !== undefined ? config.zIndex : this.layerOrder.length
        });
        
        this.layers.set(layer.id, layer);
        
        // 添加到顺序列表
        if (config.insertAfter) {
            const index = this.layerOrder.indexOf(config.insertAfter);
            if (index !== -1) {
                this.layerOrder.splice(index + 1, 0, layer.id);
            } else {
                this.layerOrder.push(layer.id);
            }
        } else {
            this.layerOrder.push(layer.id);
        }
        
        // 处理父子关系
        if (layer.parent) {
            const parentLayer = this.layers.get(layer.parent);
            if (parentLayer) {
                parentLayer.addChild(layer.id);
            }
        }
        
        // 更新z-index
        this._updateZIndices();
        
        return layer;
    }

    /**
     * 删除图层
     */
    deleteLayer(layerId, moveObjectsTo = null) {
        const layer = this.layers.get(layerId);
        if (!layer) return false;
        
        // 不能删除默认图层
        if (layerId === 'default') {
            console.warn('Cannot delete default layer');
            return false;
        }
        
        // 处理图层中的对象
        const targetLayerId = moveObjectsTo || 'default';
        const targetLayer = this.layers.get(targetLayerId);
        
        if (targetLayer) {
            layer.objects.forEach(objId => {
                targetLayer.addObject(objId);
                this.objectToLayer.set(objId, targetLayerId);
            });
        }
        
        // 处理子图层
        layer.children.forEach(childId => {
            const childLayer = this.layers.get(childId);
            if (childLayer) {
                childLayer.parent = layer.parent;
                if (layer.parent) {
                    const parentLayer = this.layers.get(layer.parent);
                    if (parentLayer) {
                        parentLayer.addChild(childId);
                    }
                }
            }
        });
        
        // 从父图层中移除
        if (layer.parent) {
            const parentLayer = this.layers.get(layer.parent);
            if (parentLayer) {
                parentLayer.removeChild(layerId);
            }
        }
        
        // 删除图层
        this.layers.delete(layerId);
        const index = this.layerOrder.indexOf(layerId);
        if (index !== -1) {
            this.layerOrder.splice(index, 1);
        }
        
        // 更新活动图层
        if (this.activeLayerId === layerId) {
            this.activeLayerId = 'default';
        }
        
        // 从选中列表中移除
        this.selectedLayers.delete(layerId);
        
        // 更新z-index
        this._updateZIndices();
        
        return true;
    }

    /**
     * 重命名图层
     */
    renameLayer(layerId, newName) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.name = newName;
            return true;
        }
        return false;
    }

    /**
     * 获取图层
     */
    getLayer(layerId) {
        return this.layers.get(layerId) || null;
    }

    /**
     * 获取所有图层
     */
    getAllLayers() {
        return Array.from(this.layers.values());
    }

    /**
     * 获取排序后的图层
     */
    getOrderedLayers() {
        return this.layerOrder.map(id => this.layers.get(id)).filter(l => l !== undefined);
    }

    /**
     * 获取活动图层
     */
    getActiveLayer() {
        return this.layers.get(this.activeLayerId) || null;
    }

    /**
     * 设置活动图层
     */
    setActiveLayer(layerId) {
        if (this.layers.has(layerId)) {
            this.activeLayerId = layerId;
            return true;
        }
        return false;
    }

    /**
     * 切换图层可见性
     */
    toggleLayerVisibility(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.visible = !layer.visible;
            return layer.visible;
        }
        return false;
    }

    /**
     * 切换图层锁定
     */
    toggleLayerLock(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.locked = !layer.locked;
            return layer.locked;
        }
        return false;
    }

    /**
     * 设置图层透明度
     */
    setLayerOpacity(layerId, opacity) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            return true;
        }
        return false;
    }

    /**
     * 移动图层顺序
     */
    moveLayer(layerId, newIndex) {
        const currentIndex = this.layerOrder.indexOf(layerId);
        if (currentIndex === -1) return false;
        
        // 移除并插入到新位置
        this.layerOrder.splice(currentIndex, 1);
        this.layerOrder.splice(newIndex, 0, layerId);
        
        // 更新z-index
        this._updateZIndices();
        
        return true;
    }

    /**
     * 上移图层
     */
    moveLayerUp(layerId) {
        const index = this.layerOrder.indexOf(layerId);
        if (index === -1 || index === this.layerOrder.length - 1) return false;
        
        return this.moveLayer(layerId, index + 1);
    }

    /**
     * 下移图层
     */
    moveLayerDown(layerId) {
        const index = this.layerOrder.indexOf(layerId);
        if (index <= 0) return false;
        
        return this.moveLayer(layerId, index - 1);
    }

    /**
     * 移到顶层
     */
    moveLayerToTop(layerId) {
        return this.moveLayer(layerId, this.layerOrder.length - 1);
    }

    /**
     * 移到底层
     */
    moveLayerToBottom(layerId) {
        return this.moveLayer(layerId, 0);
    }

    /**
     * 更新z-index
     * @private
     */
    _updateZIndices() {
        this.layerOrder.forEach((layerId, index) => {
            const layer = this.layers.get(layerId);
            if (layer) {
                layer.zIndex = index;
            }
        });
    }

    /**
     * 添加对象到图层
     */
    addObjectToLayer(objectId, layerId = null) {
        const targetLayerId = layerId || this.activeLayerId || 'default';
        const layer = this.layers.get(targetLayerId);
        
        if (!layer) return false;
        
        // 从旧图层中移除
        const oldLayerId = this.objectToLayer.get(objectId);
        if (oldLayerId) {
            const oldLayer = this.layers.get(oldLayerId);
            if (oldLayer) {
                oldLayer.removeObject(objectId);
            }
        }
        
        // 添加到新图层
        layer.addObject(objectId);
        this.objectToLayer.set(objectId, targetLayerId);
        
        return true;
    }

    /**
     * 从图层中移除对象
     */
    removeObjectFromLayer(objectId) {
        const layerId = this.objectToLayer.get(objectId);
        if (!layerId) return false;
        
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.removeObject(objectId);
        }
        
        this.objectToLayer.delete(objectId);
        return true;
    }

    /**
     * 获取对象所在图层
     */
    getObjectLayer(objectId) {
        const layerId = this.objectToLayer.get(objectId);
        return layerId ? this.layers.get(layerId) : null;
    }

    /**
     * 移动对象到图层
     */
    moveObjectToLayer(objectId, targetLayerId) {
        return this.addObjectToLayer(objectId, targetLayerId);
    }

    /**
     * 合并图层
     */
    mergeLayers(sourceLayerId, targetLayerId) {
        const sourceLayer = this.layers.get(sourceLayerId);
        const targetLayer = this.layers.get(targetLayerId);
        
        if (!sourceLayer || !targetLayer) return false;
        if (sourceLayerId === 'default') return false;
        
        // 移动所有对象
        sourceLayer.objects.forEach(objId => {
            targetLayer.addObject(objId);
            this.objectToLayer.set(objId, targetLayerId);
        });
        
        // 删除源图层
        this.deleteLayer(sourceLayerId);
        
        return true;
    }

    /**
     * 复制图层
     */
    duplicateLayer(layerId) {
        const layer = this.layers.get(layerId);
        if (!layer) return null;
        
        const newLayer = this.createLayer({
            name: layer.name + ' Copy',
            visible: layer.visible,
            locked: false,
            opacity: layer.opacity,
            color: layer.color,
            insertAfter: layerId
        });
        
        // 注意：这里不复制对象，只复制图层结构
        // 对象复制需要在更高层级处理
        
        return newLayer;
    }

    /**
     * 选择图层
     */
    selectLayer(layerId, addToSelection = false) {
        if (!addToSelection) {
            this.selectedLayers.clear();
        }
        
        if (this.layers.has(layerId)) {
            this.selectedLayers.add(layerId);
            return true;
        }
        return false;
    }

    /**
     * 取消选择图层
     */
    deselectLayer(layerId) {
        return this.selectedLayers.delete(layerId);
    }

    /**
     * 清除选择
     */
    clearSelection() {
        this.selectedLayers.clear();
    }

    /**
     * 获取选中的图层
     */
    getSelectedLayers() {
        return Array.from(this.selectedLayers)
            .map(id => this.layers.get(id))
            .filter(l => l !== undefined);
    }

    /**
     * 检查对象是否可见
     */
    isObjectVisible(objectId) {
        const layer = this.getObjectLayer(objectId);
        if (!layer) return true;
        
        // 检查图层及其所有父图层的可见性
        let currentLayer = layer;
        while (currentLayer) {
            if (!currentLayer.visible) return false;
            currentLayer = currentLayer.parent ? this.layers.get(currentLayer.parent) : null;
        }
        
        return true;
    }

    /**
     * 检查对象是否锁定
     */
    isObjectLocked(objectId) {
        const layer = this.getObjectLayer(objectId);
        if (!layer) return false;
        
        // 检查图层及其所有父图层的锁定状态
        let currentLayer = layer;
        while (currentLayer) {
            if (currentLayer.locked) return true;
            currentLayer = currentLayer.parent ? this.layers.get(currentLayer.parent) : null;
        }
        
        return false;
    }

    /**
     * 获取对象的有效透明度
     */
    getObjectOpacity(objectId) {
        const layer = this.getObjectLayer(objectId);
        if (!layer) return 1.0;
        
        // 累积所有父图层的透明度
        let opacity = layer.opacity;
        let currentLayer = layer.parent ? this.layers.get(layer.parent) : null;
        
        while (currentLayer) {
            opacity *= currentLayer.opacity;
            currentLayer = currentLayer.parent ? this.layers.get(currentLayer.parent) : null;
        }
        
        return opacity;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            layers: Array.from(this.layers.values()).map(l => l.serialize()),
            layerOrder: [...this.layerOrder],
            activeLayerId: this.activeLayerId,
            objectToLayer: Array.from(this.objectToLayer.entries())
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        this.layers.clear();
        this.layerOrder = [];
        this.objectToLayer.clear();
        this.selectedLayers.clear();
        
        // 恢复图层
        if (data.layers) {
            data.layers.forEach(layerData => {
                const layer = Layer.deserialize(layerData);
                this.layers.set(layer.id, layer);
            });
        }
        
        // 恢复顺序
        if (data.layerOrder) {
            this.layerOrder = [...data.layerOrder];
        }
        
        // 恢复活动图层
        if (data.activeLayerId) {
            this.activeLayerId = data.activeLayerId;
        }
        
        // 恢复对象映射
        if (data.objectToLayer) {
            data.objectToLayer.forEach(([objId, layerId]) => {
                this.objectToLayer.set(objId, layerId);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.layers.clear();
        this.layerOrder = [];
        this.objectToLayer.clear();
        this.selectedLayers.clear();
        this._createDefaultLayer();
    }
}

// ========== 单例模式 ==========
let layerManagerInstance = null;

export function getLayerManager() {
    if (!layerManagerInstance) {
        layerManagerInstance = new LayerManager();
    }
    return layerManagerInstance;
}

export function resetLayerManager() {
    layerManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.Layer = Layer;
    window.LayerManager = LayerManager;
    window.getLayerManager = getLayerManager;
}
