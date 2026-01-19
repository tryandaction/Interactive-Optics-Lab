/**
 * AlignmentManager.js - 对齐管理器
 * 提供对象对齐、分布和智能参考线功能
 * 
 * Requirements: 11.2, 11.3
 */

/**
 * 对齐方向
 */
export const AlignDirection = {
    LEFT: 'left',
    RIGHT: 'right',
    TOP: 'top',
    BOTTOM: 'bottom',
    CENTER_HORIZONTAL: 'center-horizontal',
    CENTER_VERTICAL: 'center-vertical',
    MIDDLE: 'middle'
};

/**
 * 分布方向
 */
export const DistributeDirection = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical'
};

/**
 * 对齐目标
 */
export const AlignTarget = {
    SELECTION: 'selection',
    CANVAS: 'canvas',
    GRID: 'grid',
    FIRST: 'first',
    LAST: 'last'
};

/**
 * 对齐管理器类
 */
export class AlignmentManager {
    constructor() {
        // 智能参考线
        this.smartGuides = [];
        this.showSmartGuides = true;
        this.smartGuideThreshold = 5;
        this.smartGuideColor = 'rgba(255, 100, 100, 0.8)';
        this.smartGuideWidth = 1;
        this.smartGuideDash = [5, 5];
        
        // 对齐配置
        this.alignTarget = AlignTarget.SELECTION;
        this.canvasSize = { width: 1920, height: 1080 };
    }

    /**
     * 对齐对象
     */
    alignObjects(objects, direction, target = null) {
        if (!objects || objects.length === 0) return [];
        
        const alignTarget = target || this.alignTarget;
        const bounds = this._getAlignmentBounds(objects, alignTarget);
        const modified = [];
        
        objects.forEach(obj => {
            const objBounds = this._getObjectBounds(obj);
            let newPos = { ...this._getObjectPosition(obj) };
            
            switch (direction) {
                case AlignDirection.LEFT:
                    newPos.x = bounds.left + (objBounds.width / 2);
                    break;
                
                case AlignDirection.RIGHT:
                    newPos.x = bounds.right - (objBounds.width / 2);
                    break;
                
                case AlignDirection.TOP:
                    newPos.y = bounds.top + (objBounds.height / 2);
                    break;
                
                case AlignDirection.BOTTOM:
                    newPos.y = bounds.bottom - (objBounds.height / 2);
                    break;
                
                case AlignDirection.CENTER_HORIZONTAL:
                    newPos.x = bounds.centerX;
                    break;
                
                case AlignDirection.CENTER_VERTICAL:
                case AlignDirection.MIDDLE:
                    newPos.y = bounds.centerY;
                    break;
            }
            
            this._setObjectPosition(obj, newPos);
            modified.push(obj);
        });
        
        return modified;
    }

    /**
     * 分布对象
     */
    distributeObjects(objects, direction, spacing = null) {
        if (!objects || objects.length < 3) return [];
        
        // 按位置排序
        const sorted = [...objects].sort((a, b) => {
            const posA = this._getObjectPosition(a);
            const posB = this._getObjectPosition(b);
            return direction === DistributeDirection.HORIZONTAL
                ? posA.x - posB.x
                : posA.y - posB.y;
        });
        
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstPos = this._getObjectPosition(first);
        const lastPos = this._getObjectPosition(last);
        
        if (spacing !== null) {
            // 固定间距分布
            this._distributeWithFixedSpacing(sorted, direction, spacing);
        } else {
            // 均匀分布
            this._distributeEvenly(sorted, direction, firstPos, lastPos);
        }
        
        return sorted;
    }

    /**
     * 均匀分布
     * @private
     */
    _distributeEvenly(objects, direction, firstPos, lastPos) {
        const count = objects.length;
        const totalDistance = direction === DistributeDirection.HORIZONTAL
            ? lastPos.x - firstPos.x
            : lastPos.y - firstPos.y;
        
        const step = totalDistance / (count - 1);
        
        objects.forEach((obj, index) => {
            if (index === 0 || index === count - 1) return; // 保持首尾不动
            
            const newPos = { ...this._getObjectPosition(obj) };
            
            if (direction === DistributeDirection.HORIZONTAL) {
                newPos.x = firstPos.x + step * index;
            } else {
                newPos.y = firstPos.y + step * index;
            }
            
            this._setObjectPosition(obj, newPos);
        });
    }

    /**
     * 固定间距分布
     * @private
     */
    _distributeWithFixedSpacing(objects, direction, spacing) {
        let currentPos = this._getObjectPosition(objects[0]);
        
        objects.forEach((obj, index) => {
            if (index === 0) return;
            
            const prevBounds = this._getObjectBounds(objects[index - 1]);
            const objBounds = this._getObjectBounds(obj);
            
            const newPos = { ...currentPos };
            
            if (direction === DistributeDirection.HORIZONTAL) {
                newPos.x = currentPos.x + prevBounds.width / 2 + spacing + objBounds.width / 2;
            } else {
                newPos.y = currentPos.y + prevBounds.height / 2 + spacing + objBounds.height / 2;
            }
            
            this._setObjectPosition(obj, newPos);
            currentPos = newPos;
        });
    }

    /**
     * 生成智能参考线
     */
    generateSmartGuides(draggedObject, allObjects, dragPosition) {
        this.smartGuides = [];
        
        if (!this.showSmartGuides || !draggedObject) return [];
        
        const dragBounds = this._getObjectBounds(draggedObject);
        dragBounds.left = dragPosition.x - dragBounds.width / 2;
        dragBounds.right = dragPosition.x + dragBounds.width / 2;
        dragBounds.top = dragPosition.y - dragBounds.height / 2;
        dragBounds.bottom = dragPosition.y + dragBounds.height / 2;
        dragBounds.centerX = dragPosition.x;
        dragBounds.centerY = dragPosition.y;
        
        // 检查与其他对象的对齐
        allObjects.forEach(obj => {
            if (obj === draggedObject) return;
            
            const objBounds = this._getObjectBounds(obj);
            const objPos = this._getObjectPosition(obj);
            
            objBounds.left = objPos.x - objBounds.width / 2;
            objBounds.right = objPos.x + objBounds.width / 2;
            objBounds.top = objPos.y - objBounds.height / 2;
            objBounds.bottom = objPos.y + objBounds.height / 2;
            objBounds.centerX = objPos.x;
            objBounds.centerY = objPos.y;
            
            // 检查水平对齐
            this._checkHorizontalAlignment(dragBounds, objBounds);
            
            // 检查垂直对齐
            this._checkVerticalAlignment(dragBounds, objBounds);
            
            // 检查间距对齐
            this._checkSpacingAlignment(dragBounds, objBounds, allObjects);
        });
        
        return this.smartGuides;
    }

    /**
     * 检查水平对齐
     * @private
     */
    _checkHorizontalAlignment(dragBounds, objBounds) {
        const threshold = this.smartGuideThreshold;
        
        // 左对齐
        if (Math.abs(dragBounds.left - objBounds.left) < threshold) {
            this.smartGuides.push({
                type: 'vertical',
                position: objBounds.left,
                label: 'Left',
                y1: Math.min(dragBounds.top, objBounds.top),
                y2: Math.max(dragBounds.bottom, objBounds.bottom)
            });
        }
        
        // 右对齐
        if (Math.abs(dragBounds.right - objBounds.right) < threshold) {
            this.smartGuides.push({
                type: 'vertical',
                position: objBounds.right,
                label: 'Right',
                y1: Math.min(dragBounds.top, objBounds.top),
                y2: Math.max(dragBounds.bottom, objBounds.bottom)
            });
        }
        
        // 中心对齐
        if (Math.abs(dragBounds.centerX - objBounds.centerX) < threshold) {
            this.smartGuides.push({
                type: 'vertical',
                position: objBounds.centerX,
                label: 'Center',
                y1: Math.min(dragBounds.top, objBounds.top),
                y2: Math.max(dragBounds.bottom, objBounds.bottom)
            });
        }
    }

    /**
     * 检查垂直对齐
     * @private
     */
    _checkVerticalAlignment(dragBounds, objBounds) {
        const threshold = this.smartGuideThreshold;
        
        // 顶部对齐
        if (Math.abs(dragBounds.top - objBounds.top) < threshold) {
            this.smartGuides.push({
                type: 'horizontal',
                position: objBounds.top,
                label: 'Top',
                x1: Math.min(dragBounds.left, objBounds.left),
                x2: Math.max(dragBounds.right, objBounds.right)
            });
        }
        
        // 底部对齐
        if (Math.abs(dragBounds.bottom - objBounds.bottom) < threshold) {
            this.smartGuides.push({
                type: 'horizontal',
                position: objBounds.bottom,
                label: 'Bottom',
                x1: Math.min(dragBounds.left, objBounds.left),
                x2: Math.max(dragBounds.right, objBounds.right)
            });
        }
        
        // 中心对齐
        if (Math.abs(dragBounds.centerY - objBounds.centerY) < threshold) {
            this.smartGuides.push({
                type: 'horizontal',
                position: objBounds.centerY,
                label: 'Middle',
                x1: Math.min(dragBounds.left, objBounds.left),
                x2: Math.max(dragBounds.right, objBounds.right)
            });
        }
    }

    /**
     * 检查间距对齐
     * @private
     */
    _checkSpacingAlignment(dragBounds, objBounds, allObjects) {
        // 简化实现：检查是否与其他对象保持相同间距
        // 这里可以扩展为更复杂的间距检测逻辑
    }

    /**
     * 渲染智能参考线
     */
    renderSmartGuides(ctx) {
        if (!this.showSmartGuides || this.smartGuides.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = this.smartGuideColor;
        ctx.lineWidth = this.smartGuideWidth;
        ctx.setLineDash(this.smartGuideDash);
        
        this.smartGuides.forEach(guide => {
            ctx.beginPath();
            if (guide.type === 'vertical') {
                ctx.moveTo(guide.position, guide.y1);
                ctx.lineTo(guide.position, guide.y2);
            } else {
                ctx.moveTo(guide.x1, guide.position);
                ctx.lineTo(guide.x2, guide.position);
            }
            ctx.stroke();
            
            // 绘制标签
            if (guide.label) {
                ctx.fillStyle = this.smartGuideColor;
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                if (guide.type === 'vertical') {
                    ctx.fillText(guide.label, guide.position, guide.y1 - 10);
                } else {
                    ctx.fillText(guide.label, guide.x1 - 20, guide.position);
                }
            }
        });
        
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * 获取对齐边界
     * @private
     */
    _getAlignmentBounds(objects, target) {
        switch (target) {
            case AlignTarget.CANVAS:
                return {
                    left: 0,
                    right: this.canvasSize.width,
                    top: 0,
                    bottom: this.canvasSize.height,
                    centerX: this.canvasSize.width / 2,
                    centerY: this.canvasSize.height / 2
                };
            
            case AlignTarget.FIRST:
                const firstObj = objects[0];
                const firstPos = this._getObjectPosition(firstObj);
                const firstBounds = this._getObjectBounds(firstObj);
                return {
                    left: firstPos.x - firstBounds.width / 2,
                    right: firstPos.x + firstBounds.width / 2,
                    top: firstPos.y - firstBounds.height / 2,
                    bottom: firstPos.y + firstBounds.height / 2,
                    centerX: firstPos.x,
                    centerY: firstPos.y
                };
            
            case AlignTarget.LAST:
                const lastObj = objects[objects.length - 1];
                const lastPos = this._getObjectPosition(lastObj);
                const lastBounds = this._getObjectBounds(lastObj);
                return {
                    left: lastPos.x - lastBounds.width / 2,
                    right: lastPos.x + lastBounds.width / 2,
                    top: lastPos.y - lastBounds.height / 2,
                    bottom: lastPos.y + lastBounds.height / 2,
                    centerX: lastPos.x,
                    centerY: lastPos.y
                };
            
            case AlignTarget.SELECTION:
            default:
                return this._getSelectionBounds(objects);
        }
    }

    /**
     * 获取选择边界
     * @private
     */
    _getSelectionBounds(objects) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        objects.forEach(obj => {
            const pos = this._getObjectPosition(obj);
            const bounds = this._getObjectBounds(obj);
            
            const left = pos.x - bounds.width / 2;
            const right = pos.x + bounds.width / 2;
            const top = pos.y - bounds.height / 2;
            const bottom = pos.y + bounds.height / 2;
            
            minX = Math.min(minX, left);
            maxX = Math.max(maxX, right);
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, bottom);
        });
        
        return {
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    /**
     * 获取对象位置
     * @private
     */
    _getObjectPosition(obj) {
        return obj.pos || obj.position || { x: obj.x || 0, y: obj.y || 0 };
    }

    /**
     * 设置对象位置
     * @private
     */
    _setObjectPosition(obj, position) {
        if (obj.pos) {
            obj.pos.x = position.x;
            obj.pos.y = position.y;
        } else if (obj.position) {
            obj.position.x = position.x;
            obj.position.y = position.y;
        } else {
            obj.x = position.x;
            obj.y = position.y;
        }
        
        // 触发更新
        if (typeof obj._updateGeometry === 'function') {
            obj._updateGeometry();
        }
    }

    /**
     * 获取对象边界
     * @private
     */
    _getObjectBounds(obj) {
        if (obj.getBounds && typeof obj.getBounds === 'function') {
            return obj.getBounds();
        }
        
        // 默认大小
        return {
            width: obj.width || 60,
            height: obj.height || 60
        };
    }

    /**
     * 设置画布大小
     */
    setCanvasSize(width, height) {
        this.canvasSize = { width, height };
    }

    /**
     * 切换智能参考线
     */
    toggleSmartGuides() {
        this.showSmartGuides = !this.showSmartGuides;
    }

    /**
     * 清除智能参考线
     */
    clearSmartGuides() {
        this.smartGuides = [];
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            showSmartGuides: this.showSmartGuides,
            smartGuideThreshold: this.smartGuideThreshold,
            alignTarget: this.alignTarget,
            canvasSize: { ...this.canvasSize }
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        Object.assign(this, data);
    }
}

// ========== 单例模式 ==========
let alignmentManagerInstance = null;

export function getAlignmentManager() {
    if (!alignmentManagerInstance) {
        alignmentManagerInstance = new AlignmentManager();
    }
    return alignmentManagerInstance;
}

export function resetAlignmentManager() {
    alignmentManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.AlignmentManager = AlignmentManager;
    window.getAlignmentManager = getAlignmentManager;
    window.AlignDirection = AlignDirection;
    window.DistributeDirection = DistributeDirection;
    window.AlignTarget = AlignTarget;
}
