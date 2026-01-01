/**
 * WavePlate.js - 波片基类
 * 改变光的偏振相位差，实现偏振态转换
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class WavePlate extends OpticalComponent {
    static functionDescription = "改变光的偏振相位差，实现偏振态转换。";

    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90, plateType = "波片") {
        super(pos, angleDeg, plateType);
        this.length = Math.max(10, length);
        this.fastAxisRad = fastAxisAngleDeg * (Math.PI / 180);

        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        try { this._updateGeometry(); } catch (e) { console.error(`Init ${plateType} geom error:`, e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            fastAxisAngleDeg: this.fastAxisRad * (180 / Math.PI)
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const plateDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = plateDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.normal = new Vector(-plateDir.y, plateDir.x);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#DDA0DD';
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        const axisVec = Vector.fromAngle(this.fastAxisRad);
        const indicatorLength = Math.min(this.length * 0.4, 20);
        const start = this.pos.subtract(axisVec.multiply(indicatorLength / 2));
        const end = this.pos.add(axisVec.multiply(indicatorLength / 2));

        ctx.strokeStyle = this.selected ? '#FFFFFF' : '#FFC0CB';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        const tickSize = 3;
        const tickPerp = axisVec.rotate(Math.PI / 2).multiply(tickSize);
        ctx.moveTo(start.x - tickPerp.x, start.y - tickPerp.y);
        ctx.lineTo(start.x + tickPerp.x, start.y + tickPerp.y);
        ctx.moveTo(end.x - tickPerp.x, end.y - tickPerp.y);
        ctx.lineTo(end.x + tickPerp.x, end.y + tickPerp.y);
        ctx.stroke();

        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textOffset = this.normal.multiply(10);
        const label = this.constructor.name === 'HalfWavePlate' ? 'λ/2' : 
                     (this.constructor.name === 'QuarterWavePlate' ? 'λ/4' : '?');
        ctx.fillText(label, this.pos.x + textOffset.x, this.pos.y + textOffset.y);
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x), maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y), maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1), p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq, cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT));
        return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3);
        if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone();
            if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1);
            if (isNaN(iP.x) || isNaN(sN.x)) { console.error(`WavePlate ${this.id} intersect NaN`); return []; }
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'waveplate_surface' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        ray.ensureJonesVector();

        if (!ray.hasJones()) {
            const newDirection = ray.direction;
            const newOrigin = intersectionInfo.point.add(newDirection.multiply(1e-6));
            const transmittedRay = new RayClass(
                newOrigin, newDirection, ray.wavelengthNm, ray.intensity, ray.phase,
                ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId,
                ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
            );
            ray.terminate('pass_unpolarized_waveplate');
            return [transmittedRay];
        }

        const retarderMatrix = this._getJonesMatrix();
        const fastAxis = this.fastAxisRad;

        const Rm = Ray._rot2(-fastAxis);
        const Rp = Ray._rot2(fastAxis);
        const v_in_local = Ray._apply2x2(Rm, ray.jones);
        const v_out_local = Ray._apply2x2(retarderMatrix, v_in_local);
        const v_out_world = Ray._apply2x2(Rp, v_out_local);
        
        const newDirection = ray.direction;
        const newOrigin = intersectionInfo.point.add(newDirection.multiply(1e-6));
        
        const outRay = new RayClass(
            newOrigin, newDirection, ray.wavelengthNm, ray.intensity,
            ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId,
            ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
        );

        outRay.setJones(v_out_world);
        
        ray.terminate('pass_waveplate');
        return [outRay];
    }
    
    _getJonesMatrix() {
        throw new Error("'_getJonesMatrix()' must be implemented by WavePlate subclass.");
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (px)', type: 'number', min: 10, step: 1 },
            fastAxisAngleDeg: { value: (this.fastAxisRad * (180 / Math.PI)).toFixed(1), label: '快轴角度 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }
        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l;
                    needsGeomUpdate = true;
                }
                break;
            case 'fastAxisAngleDeg':
                const fa = parseFloat(value);
                if (!isNaN(fa)) {
                    const r = fa * (Math.PI / 180);
                    const currentFastAxis = this.fastAxisRad;
                    const diff = Math.atan2(Math.sin(r - currentFastAxis), Math.cos(r - currentFastAxis));
                    if (Math.abs(diff) > 1e-6) {
                        this.fastAxisRad = Math.atan2(Math.sin(r), Math.cos(r));
                        needsRetraceUpdate = true;
                    }
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsRetraceUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.WavePlate = WavePlate;
}
