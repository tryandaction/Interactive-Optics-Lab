/**
 * CustomComponent.js - 自定义元件/文本框
 * 无物理交互的辅助元件，用于在画布上添加标签或注释
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';

export class CustomComponent extends GameObject {
    static functionDescription = "无物理交互的辅助元件，用于在画布上添加标签或注释。";

    constructor(pos, width = 100, height = 40, angleDeg = 0, text = "自定义元件") {
        super(pos, angleDeg, "自定义元件");
        this.width = Math.max(20, width);
        this.height = Math.max(20, height);
        this.text = text;

        this.worldVertices = [];
        try { this._updateGeometry(); } catch (e) { console.error("Init CustomComponent geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            text: this.text
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.save();
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#CCCCCC';
        ctx.fillStyle = this.selected ? 'rgba(100, 100, 100, 0.3)' : 'rgba(80, 80, 80, 0.2)';
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) {
            ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);

        ctx.restore();
    }

    getBoundingBox() {
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        });
        const buffer = 2;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !this.worldVertices || this.worldVertices.length !== 4) return false;
        const p_local = point.subtract(this.pos).rotate(-this.angleRad);
        return Math.abs(p_local.x) <= this.width / 2 && Math.abs(p_local.y) <= this.height / 2;
    }

    interact(ray, intersectionInfo, RayClass) {
        return [];
    }

    intersect(rayOrigin, rayDirection) {
        return [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            text: { value: this.text, label: '文本内容', type: 'text' },
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'text':
                this.text = String(value);
                break;
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsGeomUpdate = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.CustomComponent = CustomComponent;
}
