/**
 * Polarizer.js - 偏振片
 * 选择并透过某一线偏振分量，衰减垂直分量
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class Polarizer extends OpticalComponent {
    static functionDescription = "选择并透过某一线偏振分量，衰减垂直分量。";

    constructor(pos, length = 100, transmissionAxisAngleDeg = 0, angleDeg = 90) {
        super(pos, angleDeg, "偏振片");
        this.length = Math.max(10, length);
        this.transmissionAxisRad = transmissionAxisAngleDeg * (Math.PI / 180);

        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        try { this._updateGeometry(); } catch (e) { console.error("Init Polarizer Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            transmissionAxisAngleDeg: this.transmissionAxisRad * (180 / Math.PI)
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        const edgeVec = this.p2.subtract(this.p1);
        this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize();
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Polarizer AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Polarizer PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        const axisVec = Vector.fromAngle(this.transmissionAxisRad);
        const indicatorLength = Math.min(this.length * 0.4, 20);
        const start = this.pos.subtract(axisVec.multiply(indicatorLength / 2));
        const end = this.pos.add(axisVec.multiply(indicatorLength / 2));

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
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
        if (!(this.p1 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3);
        if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone();
            if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1);
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'polarizer' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const axis = this.transmissionAxisRad;

        ray.ensureJonesVector();

        if (!ray.hasJones()) {
            const transmittedIntensity = ray.intensity * 0.5;
            let transmittedRay = null;

            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                const newDirection = ray.direction;
                const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
                try {
                    transmittedRay = new RayClass(
                        newOrigin, newDirection, ray.wavelengthNm,
                        transmittedIntensity, ray.phase,
                        ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                        ray.sourceId, axis, ray.ignoreDecay,
                        ray.history.concat([newOrigin.clone()])
                    );
                    transmittedRay.setLinearPolarization(axis);
                } catch (e) { console.error(`Polarizer (${this.id}) create ray error:`, e); }
            }
            ray.terminate('polarized');
            return transmittedRay ? [transmittedRay] : [];
        }

        const c = Math.cos(axis);
        const s = Math.sin(axis);
        const c2 = c * c;
        const s2 = s * s;
        const sc = s * c;
        const J = [
            [{ re: c2, im: 0 }, { re: sc, im: 0 }],
            [{ re: sc, im: 0 }, { re: s2, im: 0 }]
        ];

        const transmittedJones = Ray._apply2x2(J, ray.jones);
        const inIntensity = ray.jonesIntensity();
        const outIntensity = Ray._cAbs2(transmittedJones.Ex) + Ray._cAbs2(transmittedJones.Ey);
        const scale = inIntensity > 1e-12 ? (outIntensity / inIntensity) : 0;
        const transmittedIntensity = ray.intensity * scale;

        let transmittedRay = null;
        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newDirection = ray.direction;
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, ray.wavelengthNm,
                    transmittedIntensity, ray.phase,
                    ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                    ray.sourceId, axis, ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()])
                );
                transmittedRay.setJones(transmittedJones);
            } catch (e) { console.error(`Polarizer (${this.id}) create ray error:`, e); }
        }

        ray.terminate('polarized');
        return transmittedRay ? [transmittedRay] : [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度', type: 'number', min: 1, step: 1 },
            transmissionAxisAngleDeg: { value: (this.transmissionAxisRad * (180 / Math.PI)).toFixed(1), label: '透振轴 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        let needsAxisUpdate = false;
        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l;
                    needsGeomUpdate = true;
                }
                break;
            case 'transmissionAxisAngleDeg':
                const a = parseFloat(value);
                if (!isNaN(a)) {
                    const r = a * (Math.PI / 180);
                    if (Math.abs(r - this.transmissionAxisRad) > 1e-6) {
                        this.transmissionAxisRad = r;
                        needsAxisUpdate = true;
                    }
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Polarizer geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsAxisUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Polarizer = Polarizer;
}
