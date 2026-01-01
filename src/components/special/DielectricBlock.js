/**
 * DielectricBlock.js - 介质块
 * 介质块内发生折射与反射，可模拟全反射与色散
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { DEFAULT_WAVELENGTH_NM, N_AIR } from '../../core/constants.js';

export class DielectricBlock extends OpticalComponent {
    static functionDescription = "介质块内发生折射与反射，可模拟全反射与色散。";

    constructor(pos, width = 100, height = 60, angleDeg = 0, baseRefractiveIndex = 1.5, dispersionCoeffB_nm2 = 5000, absorptionCoeff = 0.001, showEvanescentWave = false) {
        super(pos, angleDeg, "介质块");
        this.width = Math.max(10, width);
        this.height = Math.max(10, height);
        this.baseRefractiveIndex = Math.max(1.0, baseRefractiveIndex);
        this.dispersionCoeffB_nm2 = dispersionCoeffB_nm2;
        this.absorptionCoeff = Math.max(0.0, absorptionCoeff);
        this.showEvanescentWave = showEvanescentWave;

        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB_nm2 / (550 * 550);

        this.localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = [];
        this.worldNormals = [];
        try { this._updateGeometry(); } catch (e) { console.error("Init DielectricBlock geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            baseRefractiveIndex: this.baseRefractiveIndex,
            dispersionCoeffB_nm2: this.dispersionCoeffB_nm2,
            absorptionCoeff: this.absorptionCoeff,
            showEvanescentWave: this.showEvanescentWave
        };
    }

    _updateCauchyA() {
        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB_nm2 / (550 * 550);
    }

    getRefractiveIndex(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        if (this.dispersionCoeffB_nm2 <= 1e-9 || wavelengthNm <= 0) return this.baseRefractiveIndex;
        const n = this._cauchyA + this.dispersionCoeffB_nm2 / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n);
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.worldVertices = this.localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
        this.worldNormals = [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 4];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector)) { this.worldNormals.push(new Vector(1, 0)); continue; }
            const edgeVec = p2.subtract(p1);
            const normal = new Vector(edgeVec.y, -edgeVec.x).normalize();
            this.worldNormals.push(normal);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#aaddaa';
        ctx.lineWidth = this.selected ? 2 : 1;
        const avgDimension = (this.width + this.height) / 2.0;
        const transmissionFactor = Math.exp(-this.absorptionCoeff * avgDimension);
        const baseAlpha = 0.15;
        const absorbedAlpha = 0.4;
        const alpha = baseAlpha + (absorbedAlpha - baseAlpha) * (1.0 - transmissionFactor);
        ctx.fillStyle = `rgba(170, 221, 170, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        const v0 = this.worldVertices[0];
        if (v0 instanceof Vector) {
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i <= 4; i++) {
                const v = this.worldVertices[i % 4];
                if (v instanceof Vector) ctx.lineTo(v.x, v.y);
                else break;
            }
            ctx.fill();
            ctx.stroke();
        }
        if (this.selected) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`n(${DEFAULT_WAVELENGTH_NM}nm) ≈ ${this.getRefractiveIndex(DEFAULT_WAVELENGTH_NM).toFixed(3)}`, this.pos.x, this.pos.y - 5);
        }
    }

    getBoundingBox() {
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => {
            if (v instanceof Vector) {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            }
        });
        const buffer = 2;
        return (minX === Infinity || isNaN(minX)) ? super.getBoundingBox() : { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return false;
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i];
            const normal = this.worldNormals[i];
            if (!(p1 instanceof Vector) || !(normal instanceof Vector)) return false;
            const vecToPoint = point.subtract(p1);
            if (vecToPoint.dot(normal) > 1e-9) return false;
        }
        return true;
    }

    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 4];
            const edgeNormal = this.worldNormals[i];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector) || !(edgeNormal instanceof Vector) || isNaN(p1.x) || isNaN(edgeNormal.x)) continue;
            const v1 = rayOrigin.subtract(p1);
            const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3;
                const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    if (t1 < closestDist) {
                        closestDist = t1;
                        const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        let interactionNormal = edgeNormal.multiply(-1.0);
                        if (rayDirection.dot(interactionNormal) > 1e-9) {
                            interactionNormal = interactionNormal.multiply(-1.0);
                        }
                        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x) || interactionNormal.magnitudeSquared() < 0.5) continue;
                        closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: i };
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const N = intersectionInfo.normal;
        const I = ray.direction;
        const N_OUTSIDE = N_AIR || 1.0;

        if (!(hitPoint instanceof Vector) || !(N instanceof Vector) || !(I instanceof Vector) ||
            isNaN(hitPoint.x) || isNaN(N.x) || isNaN(I.x) || N.magnitudeSquared() < 0.5) {
            ray.terminate('invalid_geom_interact_block');
            return [];
        }

        let n_block = this.baseRefractiveIndex;
        try {
            n_block = this.getRefractiveIndex(ray.wavelengthNm);
            if (isNaN(n_block)) n_block = this.baseRefractiveIndex;
        } catch (e) { console.error(`DielectricBlock (${this.id}) Error getRefractiveIndex:`, e); }

        const geometricOutwardNormal = this.worldNormals[intersectionInfo.surfaceId];
        if (!geometricOutwardNormal || isNaN(geometricOutwardNormal.x)) {
            ray.terminate('internal_error_normal_block');
            return [];
        }
        const isEntering = I.dot(geometricOutwardNormal) < -1e-9;
        const n1 = isEntering ? N_OUTSIDE : n_block;
        const n2 = isEntering ? n_block : N_OUTSIDE;

        if (Math.abs(n1 - n2) < 1e-9) {
            const transmitOrigin = hitPoint.add(I.multiply(1e-6));
            try {
                const transmittedRay = new RayClass(transmitOrigin, I, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
                ray.terminate('pass_boundary_block');
                return transmittedRay.shouldTerminate() ? [] : [transmittedRay];
            } catch (e) {
                ray.terminate('error_passthrough_block');
                return [];
            }
        }

        let cosI = Math.max(0.0, Math.min(1.0, I.multiply(-1.0).dot(N)));
        if (cosI > 1.0) cosI = 1.0;
        const sinI2 = 1.0 - cosI * cosI;

        const nRatio = n1 / n2;
        const sinT2 = nRatio * nRatio * sinI2;
        const isTotalInternalReflection = (n1 > n2) && (sinT2 >= 1.0 - 1e-9);

        let R = 0.0;
        let cosT = 0.0;
        if (isTotalInternalReflection) {
            R = 1.0;
        } else if (sinT2 < 0) {
            R = 1.0;
        } else {
            cosT = Math.sqrt(1.0 - sinT2);
            const n1cosI = n1 * cosI;
            const n2cosT = n2 * cosT;
            const n1cosT = n1 * cosT;
            const n2cosI = n2 * cosI;
            const rs_den = n1cosI + n2cosT;
            const rp_den = n1cosT + n2cosI;
            const rs = (Math.abs(rs_den) < 1e-9) ? 1.0 : (n1cosI - n2cosT) / rs_den;
            const rp = (Math.abs(rp_den) < 1e-9) ? 1.0 : (n1cosT - n2cosI) / rp_den;
            R = 0.5 * (rs * rs + rp * rp);
            R = Math.max(0.0, Math.min(1.0, R));
        }

        let absorptionFactor = 1.0;
        if (!isEntering && this.absorptionCoeff > 1e-9 && ray.history.length >= 2) {
            const entryPoint = ray.history[ray.history.length - 2];
            if (entryPoint instanceof Vector) {
                const pathLengthInMedium = hitPoint.distanceTo(entryPoint);
                if (!isNaN(pathLengthInMedium) && pathLengthInMedium > 0) {
                    absorptionFactor = Math.exp(-this.absorptionCoeff * pathLengthInMedium);
                }
            }
        }
        const intensityBeforeSplit = isEntering ? ray.intensity : ray.intensity * absorptionFactor;

        const resultRays = [];
        const nextBounces = ray.bouncesSoFar + 1;

        const reflectedIntensity = intensityBeforeSplit * R;
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            const reflectedDir = I.subtract(N.multiply(2.0 * I.dot(N))).normalize();
            const reflectOrigin = hitPoint.add(reflectedDir.multiply(1e-6));
            try {
                if (isNaN(reflectOrigin.x) || isNaN(reflectedDir.x) || reflectedDir.magnitudeSquared() < 0.5) throw new Error("NaN/zero reflected dir");
                const reflectedRay = new RayClass(reflectOrigin, reflectedDir, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, nextBounces, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
                if (!reflectedRay.terminated) resultRays.push(reflectedRay);
            } catch (e) { console.error(`DielectricBlock (${this.id}) Error reflected ray:`, e); }
        }

        if (!isTotalInternalReflection) {
            const T = 1.0 - R;
            const transmittedIntensity = intensityBeforeSplit * T;
            if (transmittedIntensity >= ray.minIntensityThreshold) {
                const refractedDir = I.multiply(nRatio).add(N.multiply(nRatio * cosI - cosT)).normalize();
                const refractOrigin = hitPoint.add(refractedDir.multiply(1e-6));
                try {
                    if (isNaN(refractOrigin.x) || isNaN(refractedDir.x) || refractedDir.magnitudeSquared() < 0.5) throw new Error("NaN/zero refracted dir");
                    const refractedRay = new RayClass(refractOrigin, refractedDir, ray.wavelengthNm, transmittedIntensity, ray.phase, nextBounces, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([refractOrigin.clone()]));
                    if (!refractedRay.terminated) resultRays.push(refractedRay);
                } catch (e) { console.error(`DielectricBlock (${this.id}) Error refracted ray:`, e); }
            }
        }

        ray.terminate(isTotalInternalReflection ? 'tir_block' : 'split_block');
        return resultRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 10, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 10, step: 1 },
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '折射率 (n@550nm)', type: 'number', min: 1.0, step: 0.01 },
            dispersionCoeffB_nm2: { value: this.dispersionCoeffB_nm2.toFixed(0), label: '色散 B (nm²)', type: 'number', min: 0, step: 100 },
            absorptionCoeff: { value: this.absorptionCoeff.toFixed(4), label: '吸收系数 (/px)', type: 'number', min: 0.0, step: 0.0001 },
            showEvanescentWave: { value: this.showEvanescentWave, label: '显示倏逝波 (占位)', type: 'checkbox' }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;
        let needsGeomUpdate = false;
        let needsOpticalUpdate = false;
        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 10 && Math.abs(w - this.width) > 1e-6) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 10 && Math.abs(h - this.height) > 1e-6) { this.height = h; needsGeomUpdate = true; }
                break;
            case 'baseRefractiveIndex':
                const n = parseFloat(value);
                if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) { this.baseRefractiveIndex = n; this._updateCauchyA(); needsOpticalUpdate = true; }
                break;
            case 'dispersionCoeffB_nm2':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 0.0 && Math.abs(d - this.dispersionCoeffB_nm2) > 1e-9) { this.dispersionCoeffB_nm2 = d; this._updateCauchyA(); needsOpticalUpdate = true; }
                break;
            case 'absorptionCoeff':
                const abs = parseFloat(value);
                if (!isNaN(abs) && abs >= 0 && Math.abs(abs - this.absorptionCoeff) > 1e-9) { this.absorptionCoeff = abs; needsOpticalUpdate = true; }
                break;
            case 'showEvanescentWave':
                const show = !!value;
                if (this.showEvanescentWave !== show) { this.showEvanescentWave = show; needsOpticalUpdate = true; }
                break;
            default:
                return false;
        }
        if (needsGeomUpdate) {
            this.localVertices = [new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2), new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)];
            try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) setProperty geom update error:`, e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsOpticalUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.DielectricBlock = DielectricBlock;
}
