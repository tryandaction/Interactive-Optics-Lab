/**
 * LayoutEngine.js - 布局引擎
 * 提供元件对齐、分布、网格吸附等布局功能
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

/**
 * 生成唯一ID
 */
function generateGroupId() {
    return 'group_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 对齐方向枚举
 */
export const AlignDirection = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    CENTER_HORIZONTAL: 'center-horizontal',
    CENTER_VERTICAL: 'center-vertical'
};

/**
 * 分布方向枚举
 */
export const DistributeDirection = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

/**
 * 元件分组类
 */
export class ComponentGroup {
    /**
     * @param {Object} config - 分组配置
     */
    constructor(config = {}) {
        /** @type {string} 分组ID */
        this.id = config.id || generateGroupId();
        
        /** @type {string} 分组名称 */
        this.name = config.name || '未命名分组';
        
        /** @type {string[]} 元件ID列表 */
        this.componentIds = config.componentIds || [];
        
        /** @type {boolean} 是否锁定 */
        this.locked = config.locked || false;
        
        /** @type {number} 创建时间 */
        this.createdAt = config.createdAt || Date.now();
    }

    /**
     * 添加元件到分组
     * @param {string} componentId - 元件ID
     */
    addComponent(componentId) {
        if (!this.componentIds.includes(componentId)) {
            this.componentIds.push(componentId);
        }
    }

    /**
     * 从分组移除元件
     * @param {string} componentId - 元件ID
     */
    removeComponent(componentId) {
        const index = this.componentIds.indexOf(componentId);
        if (index > -1) {
            this.componentIds.splice(index, 1);
        }
    }

    /**
     * 检查元件是否在分组中
     * @param {string} componentId - 元件ID
     * @returns {boolean}
     */
    hasComponent(componentId) {
        return this.componentIds.includes(componentId);
    }

    /**
     * 获取分组中的元件数量
     * @returns {number}
     */
    getSize() {
        return this.componentIds.length;
    }

    /**
     * 检查分组是否为空
     * @returns {boolean}
     */
    isEmpty() {
        return this.componentIds.length === 0;
    }

    /**
     * 序列化分组
     * @returns {Object}
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            componentIds: [...this.componentIds],
            locked: this.locked,
            createdAt: this.createdAt
        };
    }

    /**
     * 从序列化数据创建分组
     * @param {Object} data - 序列化数据
     * @returns {ComponentGroup}
     */
    static deserialize(data) {
        return new ComponentGroup(data);
    }
}


/**
 * 布局引擎类
 * 提供元件对齐、分布、网格吸附等布局功能
 */
export class LayoutEngine {
    constructor(options = {}) {
        /** @type {number} 网格大小（像素） */
        this.gridSize = options.gridSize || 20;
        
        /** @type {boolean} 是否启用网格吸附 */
        this.gridSnapEnabled = options.gridSnapEnabled !== false;
        
        /** @type {boolean} 是否启用角度吸附 */
        this.angleSnapEnabled = options.angleSnapEnabled !== false;
        
        /** @type {number} 角度吸附间隔（度） */
        this.angleSnapInterval = options.angleSnapInterval || 15;
        
        /** @type {number} 对齐容差（像素） */
        this.alignmentTolerance = options.alignmentTolerance || 5;
        
        /** @type {boolean} 是否显示网格 */
        this.showGrid = options.showGrid || false;
        
        /** @type {boolean} 是否显示对齐参考线 */
        this.showAlignmentGuides = options.showAlignmentGuides !== false;
        
        /** @type {Map<string, ComponentGroup>} 分组存储 */
        this.groups = new Map();
        
        /** @type {Map<string, string>} 元件ID到分组ID的映射 */
        this.componentGroupMap = new Map();
        
        /** @type {Object|null} 当前活动的对齐参考线 */
        this.activeGuides = null;
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
    }

    // ==================== 网格吸附功能 ====================

    /**
     * 将位置吸附到网格
     * @param {{x: number, y: number}} position - 原始位置
     * @returns {{x: number, y: number}} 吸附后的位置
     */
    snapToGrid(position) {
        if (!this.gridSnapEnabled) {
            return { ...position };
        }
        
        return {
            x: Math.round(position.x / this.gridSize) * this.gridSize,
            y: Math.round(position.y / this.gridSize) * this.gridSize
        };
    }

    /**
     * 设置网格大小
     * @param {number} size - 网格大小
     */
    setGridSize(size) {
        if (size > 0) {
            this.gridSize = size;
            this._notifyChange('gridSize', size);
        }
    }

    /**
     * 启用/禁用网格吸附
     * @param {boolean} enabled
     */
    setGridSnapEnabled(enabled) {
        this.gridSnapEnabled = enabled;
        this._notifyChange('gridSnapEnabled', enabled);
    }

    // ==================== 角度吸附功能 ====================

    /**
     * 将角度吸附到指定间隔
     * @param {number} angle - 原始角度（弧度）
     * @param {number} [interval] - 吸附间隔（度），默认使用配置值
     * @returns {number} 吸附后的角度（弧度）
     */
    snapAngle(angle, interval = this.angleSnapInterval) {
        if (!this.angleSnapEnabled) {
            return angle;
        }
        
        // 转换为度
        const degrees = angle * 180 / Math.PI;
        
        // 吸附到最近的间隔
        const snapped = Math.round(degrees / interval) * interval;
        
        // 转换回弧度
        return snapped * Math.PI / 180;
    }

    /**
     * 设置角度吸附间隔
     * @param {number} interval - 间隔（度）
     */
    setAngleSnapInterval(interval) {
        if (interval > 0 && interval <= 90) {
            this.angleSnapInterval = interval;
            this._notifyChange('angleSnapInterval', interval);
        }
    }

    /**
     * 启用/禁用角度吸附
     * @param {boolean} enabled
     */
    setAngleSnapEnabled(enabled) {
        this.angleSnapEnabled = enabled;
        this._notifyChange('angleSnapEnabled', enabled);
    }

    // ==================== 对齐功能 ====================

    /**
     * 对齐选中的元件
     * @param {Array<Object>} components - 元件数组（需要有pos属性）
     * @param {string} direction - 对齐方向
     * @returns {Array<Object>} 对齐后的元件数组
     */
    alignComponents(components, direction) {
        if (!components || components.length < 2) {
            return components;
        }

        // 复制元件数组以避免直接修改
        const aligned = components.map(c => ({
            ...c,
            pos: { ...c.pos }
        }));

        switch (direction) {
            case AlignDirection.LEFT:
                this._alignLeft(aligned);
                break;
            case AlignDirection.RIGHT:
                this._alignRight(aligned);
                break;
            case AlignDirection.TOP:
                this._alignTop(aligned);
                break;
            case AlignDirection.BOTTOM:
                this._alignBottom(aligned);
                break;
            case AlignDirection.CENTER_HORIZONTAL:
                this._alignCenterHorizontal(aligned);
                break;
            case AlignDirection.CENTER_VERTICAL:
                this._alignCenterVertical(aligned);
                break;
            default:
                console.warn(`LayoutEngine: Unknown alignment direction "${direction}"`);
        }

        return aligned;
    }

    /**
     * 左对齐
     * @private
     */
    _alignLeft(components) {
        const minX = Math.min(...components.map(c => c.pos.x));
        components.forEach(c => {
            c.pos.x = minX;
        });
    }

    /**
     * 右对齐
     * @private
     */
    _alignRight(components) {
        const maxX = Math.max(...components.map(c => c.pos.x));
        components.forEach(c => {
            c.pos.x = maxX;
        });
    }

    /**
     * 顶部对齐
     * @private
     */
    _alignTop(components) {
        const minY = Math.min(...components.map(c => c.pos.y));
        components.forEach(c => {
            c.pos.y = minY;
        });
    }

    /**
     * 底部对齐
     * @private
     */
    _alignBottom(components) {
        const maxY = Math.max(...components.map(c => c.pos.y));
        components.forEach(c => {
            c.pos.y = maxY;
        });
    }

    /**
     * 水平居中对齐
     * @private
     */
    _alignCenterHorizontal(components) {
        const avgY = components.reduce((sum, c) => sum + c.pos.y, 0) / components.length;
        components.forEach(c => {
            c.pos.y = avgY;
        });
    }

    /**
     * 垂直居中对齐
     * @private
     */
    _alignCenterVertical(components) {
        const avgX = components.reduce((sum, c) => sum + c.pos.x, 0) / components.length;
        components.forEach(c => {
            c.pos.x = avgX;
        });
    }


    // ==================== 分布功能 ====================

    /**
     * 均匀分布元件
     * @param {Array<Object>} components - 元件数组
     * @param {string} direction - 分布方向 ('horizontal' | 'vertical')
     * @returns {Array<Object>} 分布后的元件数组
     */
    distributeComponents(components, direction) {
        if (!components || components.length < 3) {
            return components;
        }

        // 复制元件数组
        const distributed = components.map(c => ({
            ...c,
            pos: { ...c.pos }
        }));

        if (direction === DistributeDirection.HORIZONTAL) {
            this._distributeHorizontal(distributed);
        } else if (direction === DistributeDirection.VERTICAL) {
            this._distributeVertical(distributed);
        }

        return distributed;
    }

    /**
     * 水平均匀分布
     * @private
     */
    _distributeHorizontal(components) {
        // 按X坐标排序
        const sorted = [...components].sort((a, b) => a.pos.x - b.pos.x);
        
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalDistance = last.pos.x - first.pos.x;
        const spacing = totalDistance / (sorted.length - 1);

        sorted.forEach((comp, index) => {
            if (index === 0 || index === sorted.length - 1) return;
            
            // 找到原始元件并更新位置
            const original = components.find(c => c.id === comp.id);
            if (original) {
                original.pos.x = first.pos.x + spacing * index;
            }
        });
    }

    /**
     * 垂直均匀分布
     * @private
     */
    _distributeVertical(components) {
        // 按Y坐标排序
        const sorted = [...components].sort((a, b) => a.pos.y - b.pos.y);
        
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalDistance = last.pos.y - first.pos.y;
        const spacing = totalDistance / (sorted.length - 1);

        sorted.forEach((comp, index) => {
            if (index === 0 || index === sorted.length - 1) return;
            
            // 找到原始元件并更新位置
            const original = components.find(c => c.id === comp.id);
            if (original) {
                original.pos.y = first.pos.y + spacing * index;
            }
        });
    }

    // ==================== 对齐参考线功能 ====================

    /**
     * 获取对齐参考线
     * 返回当前拖动元件附近的对齐参考线
     * @param {Object} draggedComponent - 正在拖动的元件
     * @param {Array<Object>} allComponents - 所有元件
     * @returns {{vertical: Array, horizontal: Array}} 参考线数据
     */
    getAlignmentGuides(draggedComponent, allComponents) {
        const guides = {
            vertical: [],
            horizontal: []
        };

        if (!draggedComponent || !allComponents) {
            return guides;
        }

        const dragX = draggedComponent.pos.x;
        const dragY = draggedComponent.pos.y;

        allComponents.forEach(comp => {
            // 跳过自身
            if (comp.id === draggedComponent.id) return;

            // 检查垂直对齐（X坐标相近）
            if (Math.abs(comp.pos.x - dragX) < this.alignmentTolerance) {
                guides.vertical.push({
                    x: comp.pos.x,
                    componentId: comp.id,
                    distance: Math.abs(comp.pos.x - dragX)
                });
            }

            // 检查水平对齐（Y坐标相近）
            if (Math.abs(comp.pos.y - dragY) < this.alignmentTolerance) {
                guides.horizontal.push({
                    y: comp.pos.y,
                    componentId: comp.id,
                    distance: Math.abs(comp.pos.y - dragY)
                });
            }
        });

        // 按距离排序，优先显示最近的
        guides.vertical.sort((a, b) => a.distance - b.distance);
        guides.horizontal.sort((a, b) => a.distance - b.distance);

        // 保存活动参考线
        this.activeGuides = guides;

        return guides;
    }

    /**
     * 应用对齐吸附
     * 根据参考线调整元件位置
     * @param {Object} component - 元件
     * @param {{vertical: Array, horizontal: Array}} guides - 参考线
     * @returns {{x: number, y: number}} 吸附后的位置
     */
    applyAlignmentSnap(component, guides) {
        const pos = { ...component.pos };

        // 应用垂直参考线吸附（调整X）
        if (guides.vertical.length > 0) {
            const nearest = guides.vertical[0];
            if (nearest.distance < this.alignmentTolerance) {
                pos.x = nearest.x;
            }
        }

        // 应用水平参考线吸附（调整Y）
        if (guides.horizontal.length > 0) {
            const nearest = guides.horizontal[0];
            if (nearest.distance < this.alignmentTolerance) {
                pos.y = nearest.y;
            }
        }

        return pos;
    }

    /**
     * 渲染对齐参考线
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {{vertical: Array, horizontal: Array}} guides - 参考线数据
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     */
    renderAlignmentGuides(ctx, guides, canvasWidth, canvasHeight) {
        if (!this.showAlignmentGuides || !guides) return;

        ctx.save();
        ctx.strokeStyle = '#00BFFF';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // 绘制垂直参考线
        guides.vertical.forEach(guide => {
            ctx.beginPath();
            ctx.moveTo(guide.x, 0);
            ctx.lineTo(guide.x, canvasHeight);
            ctx.stroke();
        });

        // 绘制水平参考线
        guides.horizontal.forEach(guide => {
            ctx.beginPath();
            ctx.moveTo(0, guide.y);
            ctx.lineTo(canvasWidth, guide.y);
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * 清除活动参考线
     */
    clearAlignmentGuides() {
        this.activeGuides = null;
    }


    // ==================== 网格渲染功能 ====================

    /**
     * 渲染网格
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} width - 画布宽度
     * @param {number} height - 画布高度
     * @param {Object} [options] - 渲染选项
     */
    renderGrid(ctx, width, height, options = {}) {
        if (!this.showGrid) return;

        const {
            color = 'rgba(200, 200, 200, 0.3)',
            majorColor = 'rgba(150, 150, 150, 0.5)',
            majorInterval = 5 // 每5个小格一个大格
        } = options;

        ctx.save();

        // 绘制小网格
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();

        for (let x = 0; x <= width; x += this.gridSize) {
            if (x % (this.gridSize * majorInterval) !== 0) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
        }

        for (let y = 0; y <= height; y += this.gridSize) {
            if (y % (this.gridSize * majorInterval) !== 0) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
        }

        ctx.stroke();

        // 绘制大网格
        ctx.strokeStyle = majorColor;
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = 0; x <= width; x += this.gridSize * majorInterval) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }

        for (let y = 0; y <= height; y += this.gridSize * majorInterval) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }

        ctx.stroke();
        ctx.restore();
    }

    /**
     * 设置是否显示网格
     * @param {boolean} show
     */
    setShowGrid(show) {
        this.showGrid = show;
        this._notifyChange('showGrid', show);
    }

    // ==================== 分组功能 ====================

    /**
     * 创建元件分组
     * @param {string[]} componentIds - 元件ID数组
     * @param {string} [name] - 分组名称
     * @returns {ComponentGroup}
     */
    createGroup(componentIds, name) {
        // 检查元件是否已在其他分组中
        const alreadyGrouped = componentIds.filter(id => this.componentGroupMap.has(id));
        if (alreadyGrouped.length > 0) {
            console.warn('LayoutEngine: Some components are already in groups:', alreadyGrouped);
            // 从旧分组中移除
            alreadyGrouped.forEach(id => this.removeFromGroup(id));
        }

        const group = new ComponentGroup({
            componentIds,
            name: name || `分组 ${this.groups.size + 1}`
        });

        this.groups.set(group.id, group);

        // 更新元件到分组的映射
        componentIds.forEach(id => {
            this.componentGroupMap.set(id, group.id);
        });

        this._notifyChange('groupCreated', group);
        return group;
    }

    /**
     * 删除分组
     * @param {string} groupId - 分组ID
     * @returns {boolean}
     */
    deleteGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return false;

        // 清除元件到分组的映射
        group.componentIds.forEach(id => {
            this.componentGroupMap.delete(id);
        });

        this.groups.delete(groupId);
        this._notifyChange('groupDeleted', groupId);
        return true;
    }

    /**
     * 获取分组
     * @param {string} groupId - 分组ID
     * @returns {ComponentGroup|null}
     */
    getGroup(groupId) {
        return this.groups.get(groupId) || null;
    }

    /**
     * 获取元件所属的分组
     * @param {string} componentId - 元件ID
     * @returns {ComponentGroup|null}
     */
    getGroupForComponent(componentId) {
        const groupId = this.componentGroupMap.get(componentId);
        return groupId ? this.groups.get(groupId) : null;
    }

    /**
     * 获取所有分组
     * @returns {ComponentGroup[]}
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }

    /**
     * 添加元件到分组
     * @param {string} componentId - 元件ID
     * @param {string} groupId - 分组ID
     * @returns {boolean}
     */
    addToGroup(componentId, groupId) {
        const group = this.groups.get(groupId);
        if (!group) return false;

        // 如果元件已在其他分组，先移除
        if (this.componentGroupMap.has(componentId)) {
            this.removeFromGroup(componentId);
        }

        group.addComponent(componentId);
        this.componentGroupMap.set(componentId, groupId);
        this._notifyChange('componentAddedToGroup', { componentId, groupId });
        return true;
    }

    /**
     * 从分组中移除元件
     * @param {string} componentId - 元件ID
     * @returns {boolean}
     */
    removeFromGroup(componentId) {
        const groupId = this.componentGroupMap.get(componentId);
        if (!groupId) return false;

        const group = this.groups.get(groupId);
        if (group) {
            group.removeComponent(componentId);
            
            // 如果分组为空，删除分组
            if (group.isEmpty()) {
                this.groups.delete(groupId);
            }
        }

        this.componentGroupMap.delete(componentId);
        this._notifyChange('componentRemovedFromGroup', { componentId, groupId });
        return true;
    }

    /**
     * 移动分组中的所有元件
     * @param {string} groupId - 分组ID
     * @param {number} deltaX - X方向移动量
     * @param {number} deltaY - Y方向移动量
     * @param {Map|Object} componentsMap - 元件映射
     * @returns {boolean}
     */
    moveGroup(groupId, deltaX, deltaY, componentsMap) {
        const group = this.groups.get(groupId);
        if (!group || group.locked) return false;

        const components = componentsMap instanceof Map 
            ? componentsMap 
            : new Map(Object.entries(componentsMap));

        group.componentIds.forEach(id => {
            const comp = components.get(id);
            if (comp && comp.pos) {
                comp.pos.x += deltaX;
                comp.pos.y += deltaY;
            }
        });

        this._notifyChange('groupMoved', { groupId, deltaX, deltaY });
        return true;
    }

    /**
     * 锁定/解锁分组
     * @param {string} groupId - 分组ID
     * @param {boolean} locked - 是否锁定
     */
    setGroupLocked(groupId, locked) {
        const group = this.groups.get(groupId);
        if (group) {
            group.locked = locked;
            this._notifyChange('groupLockChanged', { groupId, locked });
        }
    }


    // ==================== 辅助功能 ====================

    /**
     * 计算元件边界框
     * @param {Array<Object>} components - 元件数组
     * @returns {{minX: number, minY: number, maxX: number, maxY: number, width: number, height: number}}
     */
    calculateBoundingBox(components) {
        if (!components || components.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        components.forEach(comp => {
            const x = comp.pos.x;
            const y = comp.pos.y;
            
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        });

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * 计算元件中心点
     * @param {Array<Object>} components - 元件数组
     * @returns {{x: number, y: number}}
     */
    calculateCenter(components) {
        if (!components || components.length === 0) {
            return { x: 0, y: 0 };
        }

        const sumX = components.reduce((sum, c) => sum + c.pos.x, 0);
        const sumY = components.reduce((sum, c) => sum + c.pos.y, 0);

        return {
            x: sumX / components.length,
            y: sumY / components.length
        };
    }

    /**
     * 将元件移动到指定中心点
     * @param {Array<Object>} components - 元件数组
     * @param {{x: number, y: number}} targetCenter - 目标中心点
     * @returns {Array<Object>} 移动后的元件数组
     */
    moveToCenter(components, targetCenter) {
        if (!components || components.length === 0) {
            return components;
        }

        const currentCenter = this.calculateCenter(components);
        const deltaX = targetCenter.x - currentCenter.x;
        const deltaY = targetCenter.y - currentCenter.y;

        return components.map(c => ({
            ...c,
            pos: {
                x: c.pos.x + deltaX,
                y: c.pos.y + deltaY
            }
        }));
    }

    // ==================== 事件和持久化 ====================

    /**
     * 注册变更监听器
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消注册函数
     */
    onChange(callback) {
        this.changeListeners.push(callback);
        return () => {
            const index = this.changeListeners.indexOf(callback);
            if (index > -1) {
                this.changeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知变更
     * @private
     */
    _notifyChange(type, data) {
        this.changeListeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('LayoutEngine: Error in change listener:', error);
            }
        });
    }

    /**
     * 序列化布局引擎状态
     * @returns {Object}
     */
    serialize() {
        return {
            gridSize: this.gridSize,
            gridSnapEnabled: this.gridSnapEnabled,
            angleSnapEnabled: this.angleSnapEnabled,
            angleSnapInterval: this.angleSnapInterval,
            alignmentTolerance: this.alignmentTolerance,
            showGrid: this.showGrid,
            showAlignmentGuides: this.showAlignmentGuides,
            groups: Array.from(this.groups.values()).map(g => g.serialize())
        };
    }

    /**
     * 从序列化数据恢复状态
     * @param {Object} data - 序列化数据
     */
    deserialize(data) {
        if (data.gridSize !== undefined) this.gridSize = data.gridSize;
        if (data.gridSnapEnabled !== undefined) this.gridSnapEnabled = data.gridSnapEnabled;
        if (data.angleSnapEnabled !== undefined) this.angleSnapEnabled = data.angleSnapEnabled;
        if (data.angleSnapInterval !== undefined) this.angleSnapInterval = data.angleSnapInterval;
        if (data.alignmentTolerance !== undefined) this.alignmentTolerance = data.alignmentTolerance;
        if (data.showGrid !== undefined) this.showGrid = data.showGrid;
        if (data.showAlignmentGuides !== undefined) this.showAlignmentGuides = data.showAlignmentGuides;

        // 恢复分组
        this.groups.clear();
        this.componentGroupMap.clear();

        if (Array.isArray(data.groups)) {
            data.groups.forEach(groupData => {
                const group = ComponentGroup.deserialize(groupData);
                this.groups.set(group.id, group);
                group.componentIds.forEach(id => {
                    this.componentGroupMap.set(id, group.id);
                });
            });
        }
    }

    /**
     * 重置布局引擎到默认状态
     */
    reset() {
        this.gridSize = 20;
        this.gridSnapEnabled = true;
        this.angleSnapEnabled = true;
        this.angleSnapInterval = 15;
        this.alignmentTolerance = 5;
        this.showGrid = false;
        this.showAlignmentGuides = true;
        this.groups.clear();
        this.componentGroupMap.clear();
        this.activeGuides = null;
        this._notifyChange('reset', null);
    }
}

// 创建单例实例
let layoutEngineInstance = null;

/**
 * 获取LayoutEngine单例实例
 * @param {Object} options - 配置选项（仅在首次调用时有效）
 * @returns {LayoutEngine}
 */
export function getLayoutEngine(options = {}) {
    if (!layoutEngineInstance) {
        layoutEngineInstance = new LayoutEngine(options);
    }
    return layoutEngineInstance;
}

/**
 * 重置LayoutEngine单例（主要用于测试）
 */
export function resetLayoutEngine() {
    layoutEngineInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.LayoutEngine = LayoutEngine;
    window.ComponentGroup = ComponentGroup;
    window.AlignDirection = AlignDirection;
    window.DistributeDirection = DistributeDirection;
    window.getLayoutEngine = getLayoutEngine;
}
