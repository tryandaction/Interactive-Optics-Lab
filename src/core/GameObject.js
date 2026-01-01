/**
 * GameObject.js - 游戏对象基类
 * 所有模拟中对象的基础类
 */

import { Vector } from './Vector.js';

export class GameObject {
    constructor(pos, angleDeg = 0, label = "Object", userId = null) {
        if (!(pos instanceof Vector)) {
            console.error("GameObject position must be a Vector! Defaulting position.", label);
            pos = new Vector(100, 100);
        }
        
        this.pos = pos;
        this.angleRad = angleDeg * (Math.PI / 180);
        this.label = label;
        this.notes = "";
        this.userId = userId;

        // 协作元数据
        this.lastEditedBy = userId;
        this.lastEditedAt = new Date().toISOString();
        this.version = 1;

        // 交互状态
        this.selected = false;
        this.dragging = false;
        this.dragOffset = new Vector(0, 0);
        this.isDraggingAngle = false;
        this.angleDragStartAngle = 0;
        this.angleDragStartMouseAngle = 0;

        // 角度手柄属性
        this.angleHandleOffset = 30;
        this.angleHandleRadius = 6;

        // 唯一ID
        this.id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // --- 角度手柄 ---
    getAngleHandlePos() {
        const handleVec = Vector.fromAngle(this.angleRad).multiply(this.angleHandleOffset);
        return this.pos.add(handleVec);
    }

    isPointOnAngleHandle(point) {
        const handlePos = this.getAngleHandlePos();
        return point.distanceSquaredTo(handlePos) < this.angleHandleRadius * this.angleHandleRadius;
    }

    // --- 交互 ---
    containsPoint(point) {
        if (!(point instanceof Vector)) return false;

        if (this.selected && this.isPointOnAngleHandle(point)) {
            return true;
        }
        
        try {
            return this._containsPointBody(point);
        } catch (e) {
            console.error(`Error in _containsPointBody for ${this.label}:`, e);
            return false;
        }
    }

    _containsPointBody(point) {
        console.warn(`_containsPointBody() not implemented for ${this.label}`);
        const bounds = this.getBoundingBox();
        if (!bounds) return false;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }

    getBoundingBox() {
        const size = 10;
        return { x: this.pos.x - size / 2, y: this.pos.y - size / 2, width: size, height: size };
    }

    startDrag(mousePos) {
        if (!(mousePos instanceof Vector)) return;

        if (this.selected && this.isPointOnAngleHandle(mousePos)) {
            this.isDraggingAngle = true;
            this.dragging = false;
            this.angleDragStartAngle = this.angleRad;
            const vectorToMouse = mousePos.subtract(this.pos);
            this.angleDragStartMouseAngle = vectorToMouse.angle();
        } else {
            this.isDraggingAngle = false;
            this.dragging = true;
            this.dragOffset = this.pos.subtract(mousePos);
        }
    }

    drag(mousePos) {
        if (!(mousePos instanceof Vector)) return;
        let needsGeomUpdate = false;

        if (this.dragging) {
            this.pos = mousePos.add(this.dragOffset);
            needsGeomUpdate = true;
        } else if (this.isDraggingAngle) {
            const vectorToMouse = mousePos.subtract(this.pos);
            const currentMouseAngle = vectorToMouse.angle();
            let angleDelta = currentMouseAngle - this.angleDragStartMouseAngle;

            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

            const newAngleRad = this.angleDragStartAngle + angleDelta;
            this.setProperty('angleDeg', newAngleRad * (180 / Math.PI));
        }

        if (needsGeomUpdate) {
            this._triggerGeometryUpdate();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
    }

    _triggerGeometryUpdate() {
        if (typeof this.onPositionChanged === 'function') {
            try { this.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged:", e); }
        }
        if (typeof this._updateGeometry === 'function') {
            try { this._updateGeometry(); } catch (e) { console.error("Error in _updateGeometry:", e); }
        }
    }

    endDrag() {
        this.dragging = false;
        this.isDraggingAngle = false;
    }

    // --- 属性编辑 ---
    getProperties() {
        return {
            posX: { value: this.pos.x.toFixed(1), label: '位置 X', type: 'number', step: 1 },
            posY: { value: this.pos.y.toFixed(1), label: '位置 Y', type: 'number', step: 1 },
            angleDeg: { value: (this.angleRad * (180 / Math.PI)).toFixed(1), label: '角度 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        let needsGeomUpdate = false;
        let handled = false;

        switch (propName) {
            case 'posX':
                const newX = parseFloat(value);
                if (!isNaN(newX) && Math.abs(this.pos.x - newX) > 1e-6) {
                    this.pos.x = newX;
                    needsGeomUpdate = true;
                    handled = true;
                }
                break;
            case 'posY':
                const newY = parseFloat(value);
                if (!isNaN(newY) && Math.abs(this.pos.y - newY) > 1e-6) {
                    this.pos.y = newY;
                    needsGeomUpdate = true;
                    handled = true;
                }
                break;
            case 'angleDeg':
                const newAngleDeg = parseFloat(value);
                if (!isNaN(newAngleDeg)) {
                    const newAngleRad = newAngleDeg * (Math.PI / 180);
                    if (Math.abs(this.angleRad - newAngleRad) > 1e-6) {
                        this.angleRad = newAngleRad;
                        if (typeof this.onAngleChanged === 'function') {
                            try { this.onAngleChanged(); } catch (e) { console.error("Error in onAngleChanged:", e); }
                        }
                        needsGeomUpdate = true;
                        handled = true;
                    }
                }
                break;
            case 'notes':
                if (typeof value === 'string' && this.notes !== value) {
                    this.notes = value;
                    if (typeof window !== 'undefined') window.sceneModified = true;
                    handled = true;
                }
                break;
        }

        if (handled && typeof window !== 'undefined' && window.collaborationManager?.currentUserId) {
            this.updateLastEdited(window.collaborationManager.currentUserId);
        }

        if (needsGeomUpdate) {
            if (handled && (propName === 'posX' || propName === 'posY')) {
                if (typeof this.onPositionChanged === 'function') {
                    try { this.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged:", e); }
                }
            }
            if (typeof this._updateGeometry === 'function') {
                try { this._updateGeometry(); } catch (e) { console.error("Error in _updateGeometry:", e); }
            }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }

        return handled;
    }

    // --- 绘制 ---
    draw(ctx) {
        ctx.fillStyle = this.selected ? 'yellow' : 'gray';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        const dir = Vector.fromAngle(this.angleRad);
        const endPoint = this.pos.add(dir.multiply(15));
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
    }

    drawSelection(ctx) {
        if (!this.selected) return;

        try {
            const handlePos = this.getAngleHandlePos();
            if (handlePos instanceof Vector) {
                ctx.fillStyle = 'yellow';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(handlePos.x, handlePos.y, this.angleHandleRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.lineTo(handlePos.x, handlePos.y);
                ctx.stroke();
            }
        } catch (e) {
            console.error(`Error drawing angle handle for ${this.label}:`, e);
        }
    }

    // --- 序列化 ---
    toJSON() {
        return {
            type: this.constructor.name,
            id: this.id,
            label: this.label,
            posX: this.pos.x,
            posY: this.pos.y,
            angleDeg: this.angleRad * (180 / Math.PI),
            notes: this.notes,
            userId: this.userId,
            lastEditedBy: this.lastEditedBy,
            lastEditedAt: this.lastEditedAt,
            version: this.version
        };
    }

    // --- 协作方法 ---
    updateLastEdited(userId) {
        this.lastEditedBy = userId;
        this.lastEditedAt = new Date().toISOString();
        this.version += 1;
    }

    // --- 重置 ---
    reset() {
        // 默认不做任何事
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GameObject = GameObject;
}
