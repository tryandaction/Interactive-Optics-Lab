/**
 * Photodiode.js - 光度计
 * 将入射光功率转为读数，用于测量光强
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class Photodiode extends OpticalComponent {
    static functionDescription = "将入射光功率转为读数，用于测量光强。";

    constructor(pos, angleDeg = 0, diameter = 20) {
        super(pos, angleDeg, "光度计");
        this.diameter = Math.max(1, diameter);

        this.incidentPower = 0.0;
        this.hitCount = 0;
        this._displayValue = "0.000";

        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2);
        this.radius = this.diameter / 2.0;
        this.radiusSq = this.radius * this.radius;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter
        };
    }

    reset() {
        this.incidentPower = 0.0;
        this.hitCount = 0;
        this._displayValue = "0.000";
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2);
        this.radius = this.diameter / 2.0;
        this.radiusSq = this.radius * this.radius;
        this.reset();
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Photodiode (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { this.reset(); }

    draw(ctx) {
        const radius = this.radius;
        const pos = this.pos;

        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA';
        ctx.fillStyle = this.selected ? 'rgba(80,80,80,0.5)' : 'rgba(50,50,50,0.5)';
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const lineEnd = pos.add(this.normal.multiply(radius * 1.2));
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.stroke();

        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(this._displayValue, pos.x, pos.y + radius + 12);
    }

    getBoundingBox() {
        const buffer = 2;
        return {
            x: this.pos.x - this.radius - buffer,
            y: this.pos.y - this.radius - buffer,
            width: (this.radius + buffer) * 2,
            height: (this.radius + buffer) * 2
        };
    }

    _containsPointBody(point) {
        if (!point || !(this.pos instanceof Vector)) return false;
        return point.distanceSquaredTo(this.pos) <= this.radiusSq;
    }

    intersect(rayOrigin, rayDirection) {
        const N = this.normal;
        const P0 = this.pos;
        const O = rayOrigin;
        const D = rayDirection;

        const D_dot_N = D.dot(N);

        if (D_dot_N >= -1e-9) {
            return [];
        }

        const O_minus_P0 = O.subtract(P0);
        const O_minus_P0_dot_N = O_minus_P0.dot(N);

        if (Math.abs(D_dot_N) < 1e-9) {
            return [];
        }

        const t = -O_minus_P0_dot_N / D_dot_N;

        if (t < 1e-6) {
            return [];
        }

        const intersectionPoint = O.add(D.multiply(t));

        const distSqFromCenter = intersectionPoint.distanceSquaredTo(P0);
        if (distSqFromCenter > this.radiusSq + 1e-9) {
            return [];
        }

        const interactionNormal = N.multiply(-1.0);
        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) {
            console.error(`Photodiode (${this.id}): NaN in intersection result.`);
            return [];
        }

        return [{
            distance: t,
            point: intersectionPoint,
            normal: interactionNormal,
            surfaceId: 'detector_surface'
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        this.incidentPower += ray.intensity;
        this.hitCount++;

        try {
            if (this.incidentPower < 0.001 && this.incidentPower > 0) {
                this._displayValue = this.incidentPower.toExponential(2);
            } else if (this.incidentPower < 1000) {
                this._displayValue = this.incidentPower.toFixed(3);
            } else {
                this._displayValue = this.incidentPower.toExponential(3);
            }
        } catch (e) {
            console.error("Error formatting photodiode display value:", e, this.incidentPower);
            this._displayValue = "Error";
        }

        ray.terminate('absorbed_photodiode');
        return [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            diameter: { value: this.diameter.toFixed(1), label: '孔径 (直径)', type: 'number', min: 1, step: 1 },
            measuredPower: { value: this._displayValue, label: '测量光强', type: 'text', readonly: true }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
            return true;
        }

        let needsGeomUpdate = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 1 && Math.abs(d - this.diameter) > 1e-6) {
                    this.diameter = d;
                    needsGeomUpdate = true;
                }
                break;
            case 'measuredPower':
            case 'hitCount':
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Photodiode (${this.id}) setProperty geom update error:`, e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }

        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Photodiode = Photodiode;
}
