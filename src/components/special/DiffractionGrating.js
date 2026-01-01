/**
 * DiffractionGrating.js - 衍射光栅
 * 由多缝干涉形成清晰衍射级次，用于光谱分辨
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { PIXELS_PER_MICROMETER, PIXELS_PER_NANOMETER } from '../../core/constants.js';

export class DiffractionGrating extends OpticalComponent {
    static functionDescription = "由多缝干涉形成清晰衍射级次，用于光谱分辨。";

    constructor(pos, length = 100, gratingPeriodInMicrons = 1.0, angleDeg = 90, maxOrder = 2) {
        super(pos, angleDeg, "衍射光栅");

        this.length = Math.max(10, length);
        this.gratingPeriodInMicrons = Math.max(0.01, gratingPeriodInMicrons);
        this.maxOrder = Math.max(0, Math.floor(maxOrder));

        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.gratingDir = Vector.fromAngle(angleDeg);
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        this.gratingPeriodPixels = this.gratingPeriodInMicrons * PIXELS_PER_MICROMETER;

        this.diffractionEfficiencies = {
            0: 0.60,
            1: 0.15,
            2: 0.05,
        };

        try { this._updateGeometry(); } catch (e) { console.error("Init DiffractionGrating geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            gratingPeriodInMicrons: this.gratingPeriodInMicrons,
            maxOrder: this.maxOrder
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.gratingDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = this.gratingDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.normal = new Vector(-this.gratingDir.y, this.gratingDir.x);
        this.gratingPeriodPixels = this.gratingPeriodInMicrons * PIXELS_PER_MICROMETER;
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Grating AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Grating PosChange error:`, e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#CCCCCC';
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        const numLines = Math.min(50, Math.floor(this.length / 4));
        const lineLength = 6;
        ctx.strokeStyle = this.selected ? 'rgba(255,255,150,0.8)' : 'rgba(204, 204, 204, 0.6)';
        ctx.lineWidth = 1;
        const normalOffset = this.normal.multiply(lineLength / 2);
        for (let i = 0; i <= numLines; i++) {
            const t = i / numLines;
            const center = Vector.lerp(this.p1, this.p2, t);
            const start = center.subtract(normalOffset);
            const end = center.add(normalOffset);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1);
        const p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq;
        const cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT));
        return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3);
        if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3;
        const t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone();
            if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1);
            if (isNaN(iP.x) || isNaN(sN.x)) return [];
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'grating_surface' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const N = this.normal;
        const incidentDirection = ray.direction;
        const d_px = this.gratingPeriodPixels;

        if (d_px < 1e-6) {
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            try {
                if (isNaN(transmitOrigin.x)) throw new Error("NaN transmitOrigin");
                const transmittedRay = new RayClass(transmitOrigin, incidentDirection, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
                ray.terminate('pass_grating_small_d');
                return transmittedRay.shouldTerminate() ? [] : [transmittedRay];
            } catch (e) {
                ray.terminate('error_pass_grating');
                return [];
            }
        }

        const lambda_nm = ray.wavelengthNm;
        const lambda_px = lambda_nm * PIXELS_PER_NANOMETER;

        const normalForAngleCalc = ray.direction.dot(N) < 0 ? N : N.multiply(-1);
        const cosThetaI = Math.max(0.0, Math.min(1.0, incidentDirection.dot(normalForAngleCalc.multiply(-1.0))));
        const sinThetaI = Math.sqrt(Math.max(0.0, 1.0 - cosThetaI * cosThetaI));
        const crossSign = incidentDirection.cross(this.gratingDir);
        const signedSinThetaI = Math.sign(crossSign) * sinThetaI;

        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        const incidentIntensity = ray.intensity;

        for (let m = -this.maxOrder; m <= this.maxOrder; m++) {
            const sinThetaM_term = m * lambda_px / d_px;
            const sinThetaM = signedSinThetaI + sinThetaM_term;

            if (Math.abs(sinThetaM) <= 1.0 + 1e-9) {
                const clampedSinThetaM = Math.max(-1.0, Math.min(1.0, sinThetaM));
                const cosThetaM = Math.sqrt(1.0 - clampedSinThetaM * clampedSinThetaM);

                let diffractedDir = normalForAngleCalc.multiply(cosThetaM).add(this.gratingDir.multiply(clampedSinThetaM * Math.sign(crossSign)));
                diffractedDir = diffractedDir.normalize();

                if (isNaN(diffractedDir.x) || diffractedDir.magnitudeSquared() < 0.5) continue;

                const orderAbs = Math.abs(m);
                const efficiency = this.diffractionEfficiencies[orderAbs] || 0.0;
                const diffractedIntensity = incidentIntensity * efficiency;

                if (diffractedIntensity >= ray.minIntensityThreshold) {
                    const newOrigin = hitPoint.add(diffractedDir.multiply(1e-6));
                    try {
                        if (isNaN(newOrigin.x)) throw new Error("NaN origin");
                        const diffractedRay = new RayClass(
                            newOrigin, diffractedDir, ray.wavelengthNm, diffractedIntensity,
                            ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId,
                            ray.polarizationAngle, ray.ignoreDecay,
                            ray.history.concat([newOrigin.clone()])
                        );
                        if (!diffractedRay.terminated) newRays.push(diffractedRay);
                    } catch (e) {
                        console.error(`Grating (${this.id}) Error creating diffracted ray (m=${m}):`, e);
                    }
                }
            }
        }

        ray.terminate('diffracted');
        return newRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (px)', type: 'number', min: 10, step: 1 },
            gratingPeriodInMicrons: { value: this.gratingPeriodInMicrons.toFixed(3), label: '光栅周期 (μm)', type: 'number', min: 0.01, step: 0.1 },
            gratingPeriodPixels: { value: this.gratingPeriodPixels.toFixed(2), label: '周期 (px)', type: 'text', readonly: true },
            maxOrder: { value: this.maxOrder, label: '最大衍射级次 (m)', type: 'number', min: 0, max: 10, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; }
                break;
            case 'gratingPeriodInMicrons':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 0.01 && Math.abs(d - this.gratingPeriodInMicrons) > 1e-9) { this.gratingPeriodInMicrons = d; needsGeomUpdate = true; needsRetraceUpdate = true; }
                break;
            case 'maxOrder':
                const m = parseInt(value);
                if (!isNaN(m) && m >= 0 && m !== this.maxOrder) { this.maxOrder = m; needsRetraceUpdate = true; }
                break;
            case 'gratingPeriodPixels':
                return true;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Grating (${this.id}) setProperty geom update error:`, e); }
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
    window.DiffractionGrating = DiffractionGrating;
}
