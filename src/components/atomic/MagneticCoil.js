/**
 * MagneticCoil.js - 磁场线圈标注
 * 表示亥姆霍兹/反亥姆霍兹线圈的标注元件，纯视觉元件不与光线交互
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';

export class MagneticCoil extends GameObject {
    static functionDescription = "表示磁场线圈的标注元件（亥姆霍兹/反亥姆霍兹配置）。";

    constructor(pos, radius = 40, separation = 40, angleDeg = 0, coilType = 'helmholtz') {
        super(pos, angleDeg, "磁场线圈");
        this.radius = Math.max(10, radius);
        this.separation = Math.max(10, separation);
        this.coilType = coilType; // 'helmholtz' or 'anti-helmholtz'
        this.showFieldLines = true;
        this.coilColor = '#FF6B35';
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radius: this.radius,
            separation: this.separation,
            coilType: this.coilType,
            showFieldLines: this.showFieldLines,
            coilColor: this.coilColor
        };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const r = this.radius;
        const sep = this.separation / 2;

        // Draw coil symbols
        ctx.strokeStyle = this.selected ? '#FFFF00' : this.coilColor;
        ctx.lineWidth = this.selected ? 3 : 2;

        // Left coil
        this._drawCoilSymbol(ctx, -sep, r, this.coilType === 'helmholtz' ? 'cw' : 'ccw');
        
        // Right coil
        this._drawCoilSymbol(ctx, sep, r, 'cw');

        // Draw field lines if enabled
        if (this.showFieldLines) {
            this._drawFieldLines(ctx, r, sep);
        }

        // Draw axis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(-sep - r - 20, 0);
        ctx.lineTo(sep + r + 20, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        const label = this.coilType === 'helmholtz' ? 'Helmholtz' : 'Anti-Helmholtz';
        ctx.fillText(label, 0, r + 15);

        ctx.restore();
    }

    _drawCoilSymbol(ctx, x, radius, direction) {
        // Draw coil as a circle with current direction indicator
        ctx.beginPath();
        ctx.arc(x, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw current direction (dot or cross)
        const indicatorRadius = 5;
        ctx.fillStyle = this.selected ? '#FFFF00' : this.coilColor;
        
        if (direction === 'cw') {
            // Current coming out of page - dot
            ctx.beginPath();
            ctx.arc(x, 0, indicatorRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Current going into page - cross
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - indicatorRadius, -indicatorRadius);
            ctx.lineTo(x + indicatorRadius, indicatorRadius);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - indicatorRadius, indicatorRadius);
            ctx.lineTo(x + indicatorRadius, -indicatorRadius);
            ctx.stroke();
        }

        // Draw coil windings indication
        ctx.strokeStyle = this.selected ? '#FFFF00' : this.coilColor;
        ctx.lineWidth = 1;
        const numWindings = 3;
        for (let i = 0; i < numWindings; i++) {
            const offset = (i - 1) * 3;
            ctx.beginPath();
            ctx.arc(x + offset, 0, radius - 2, Math.PI * 0.3, Math.PI * 0.7);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x + offset, 0, radius - 2, -Math.PI * 0.7, -Math.PI * 0.3);
            ctx.stroke();
        }
    }

    _drawFieldLines(ctx, radius, separation) {
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
        ctx.lineWidth = 1;

        if (this.coilType === 'helmholtz') {
            // Uniform field in center - horizontal lines
            const numLines = 5;
            for (let i = 0; i < numLines; i++) {
                const y = (i - (numLines - 1) / 2) * (radius * 0.3);
                ctx.beginPath();
                ctx.moveTo(-separation * 0.8, y);
                ctx.lineTo(separation * 0.8, y);
                ctx.stroke();
                
                // Arrow in middle
                const arrowX = 0;
                ctx.beginPath();
                ctx.moveTo(arrowX + 5, y - 3);
                ctx.lineTo(arrowX + 10, y);
                ctx.lineTo(arrowX + 5, y + 3);
                ctx.stroke();
            }
        } else {
            // Quadrupole field - curved lines
            const numLines = 4;
            for (let i = 0; i < numLines; i++) {
                const startY = (i - (numLines - 1) / 2) * (radius * 0.4);
                ctx.beginPath();
                ctx.moveTo(-separation * 0.6, startY);
                // Curve toward center then away
                ctx.quadraticCurveTo(0, startY * 0.3, separation * 0.6, startY);
                ctx.stroke();
            }
            
            // Draw zero-field point indicator
            ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getBoundingBox() {
        const buffer = 20;
        const totalWidth = this.separation + this.radius * 2;
        const totalHeight = this.radius * 2;
        return {
            x: this.pos.x - totalWidth / 2 - buffer,
            y: this.pos.y - totalHeight / 2 - buffer,
            width: totalWidth + 2 * buffer,
            height: totalHeight + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        const local = point.subtract(this.pos);
        const dir = Vector.fromAngle(this.angleRad);
        const perp = Vector.fromAngle(this.angleRad + Math.PI / 2);
        const x = local.dot(dir);
        const y = local.dot(perp);
        
        const totalWidth = this.separation + this.radius * 2;
        const totalHeight = this.radius * 2;
        return Math.abs(x) <= totalWidth / 2 + 10 && Math.abs(y) <= totalHeight / 2 + 10;
    }

    // MagneticCoil does not interact with light rays
    intersect(rayOrigin, rayDirection) {
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        return [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            radius: { value: this.radius.toFixed(1), label: '线圈半径', type: 'number', min: 10, step: 5 },
            separation: { value: this.separation.toFixed(1), label: '线圈间距', type: 'number', min: 10, step: 5 },
            coilType: {
                value: this.coilType,
                label: '线圈类型',
                type: 'select',
                options: [
                    { value: 'helmholtz', label: '亥姆霍兹 (均匀场)' },
                    { value: 'anti-helmholtz', label: '反亥姆霍兹 (四极场)' }
                ]
            },
            showFieldLines: { value: this.showFieldLines, label: '显示场线', type: 'checkbox' },
            coilColor: { value: this.coilColor, label: '线圈颜色', type: 'color' }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRedraw = false;

        switch (propName) {
            case 'radius':
                const r = parseFloat(value);
                if (!isNaN(r) && r >= 10) { this.radius = r; needsRedraw = true; }
                break;
            case 'separation':
                const s = parseFloat(value);
                if (!isNaN(s) && s >= 10) { this.separation = s; needsRedraw = true; }
                break;
            case 'coilType':
                if (value === 'helmholtz' || value === 'anti-helmholtz') {
                    this.coilType = value;
                    needsRedraw = true;
                }
                break;
            case 'showFieldLines':
                this.showFieldLines = !!value;
                needsRedraw = true;
                break;
            case 'coilColor':
                this.coilColor = value;
                needsRedraw = true;
                break;
            default:
                return false;
        }

        if (needsRedraw && typeof window !== 'undefined') {
            window.needsRetrace = true; // Trigger redraw
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.MagneticCoil = MagneticCoil;
}
