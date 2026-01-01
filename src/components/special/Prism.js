/**
 * Prism.js - 棱镜
 * 棱镜使光发生折射与色散，分解白光为彩色光谱
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { DEFAULT_WAVELENGTH_NM, N_AIR } from '../../core/constants.js';

export class Prism extends OpticalComponent {
    static functionDescription = "棱镜使光发生折射与色散，分解白光为彩色光谱。";

    constructor(pos, baseLength = 100, apexAngleDeg = 60, angleDeg = 0, refractiveIndex = 1.5, dispersionCoeffB = 5000) {
        super(pos, angleDeg, "棱镜");

        this.baseLength = Math.max(10, baseLength);
        this.apexAngleRad = Math.max(1 * Math.PI / 180, Math.min(178 * Math.PI / 180, apexAngleDeg * Math.PI / 180));
        this.baseRefractiveIndex = Math.max(1.0, refractiveIndex);
        this.dispersionCoeffB = dispersionCoeffB;

        this.worldVertices = [];
        this.worldNormals = [];

        try { this._updateGeometry(); } catch (e) { console.error("Init Prism geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            baseLength: this.baseLength,
            apexAngleDeg: this.apexAngleRad * (180 / Math.PI),
            baseRefractiveIndex: this.baseRefractiveIndex,
            dispersionCoeffB: this.dispersionCoeffB
        };
    }

    getRefractiveIndex(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        if (wavelengthNm <= 0) return this.baseRefractiveIndex;
        const n0_adjusted = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550);
        const n = n0_adjusted + this.dispersionCoeffB / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n);
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;

        const halfBase = this.baseLength / 2.0;
        const apexAngle = this.apexAngleRad;
        const baseAngle = (Math.PI - apexAngle) / 2.0;
        const height = halfBase * Math.tan(baseAngle);

        const local_v0 = new Vector(0, -height / 2);
        const local_v1 = new Vector(-halfBase, height / 2);
        const local_v2 = new Vector(halfBase, height / 2);

        const rotation = this.angleRad;
        this.worldVertices = [
            local_v0.rotate(rotation).add(this.pos),
            local_v1.rotate(rotation).add(this.pos),
            local_v2.rotate(rotation).add(this.pos)
        ];

        this.worldNormals = [];
        for (let i = 0; i < 3; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 3];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector)) {
                this.worldNormals.push(new Vector(1, 0));
                continue;
            }
            const edgeVec = p2.subtract(p1);
            const normal = new Vector(edgeVec.y, -edgeVec.x).normalize();
            this.worldNormals.push(normal);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 3) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#B0E0E6';
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.fillStyle = this.selected ? 'rgba(176, 224, 230, 0.3)' : 'rgba(176, 224, 230, 0.15)';

        ctx.beginPath();
        const v0 = this.worldVertices[0];
        if (v0 instanceof Vector) {
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i <= 3; i++) {
                const v = this.worldVertices[i % 3];
                if (v instanceof Vector) ctx.lineTo(v.x, v.y);
                else break;
            }
            ctx.fill();
            ctx.stroke();
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
        if (!point || !this.worldVertices || this.worldVertices.length !== 3) return false;
        const [p0, p1, p2] = this.worldVertices;
        if (!(p0 instanceof Vector) || !(p1 instanceof Vector) || !(p2 instanceof Vector)) return false;

        const d0 = (point.x - p0.x) * (p1.y - p0.y) - (point.y - p0.y) * (p1.x - p0.x);
        const d1 = (point.x - p1.x) * (p2.y - p1.y) - (point.y - p1.y) * (p2.x - p1.x);
        const d2 = (point.x - p2.x) * (p0.y - p2.y) - (point.y - p2.y) * (p0.x - p2.x);

        const has_neg = (d0 < 0) || (d1 < 0) || (d2 < 0);
        const has_pos = (d0 > 0) || (d1 > 0) || (d2 > 0);

        return !(has_neg && has_pos);
    }

    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 3 || this.worldNormals.length !== 3) return [];

        for (let i = 0; i < 3; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 3];
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
                        let interactionNormal = edgeNormal.clone();
                        if (rayDirection.dot(interactionNormal) > 0) interactionNormal = interactionNormal.multiply(-1);
                        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) continue;

                        closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: i };
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const surfaceNormal = intersectionInfo.normal;
        const incidentDirection = ray.direction;
        const N_OUTSIDE = N_AIR || 1.0;

        if (!(hitPoint instanceof Vector) || !(surfaceNormal instanceof Vector) || !(incidentDirection instanceof Vector) || isNaN(hitPoint.x) || isNaN(surfaceNormal.x) || isNaN(incidentDirection.x)) {
            ray.terminate('invalid_geom_interact_prism');
            return [];
        }

        let N_INSIDE = NaN;
        try {
            N_INSIDE = this.getRefractiveIndex(ray.wavelengthNm);
            if (isNaN(N_INSIDE)) throw new Error("NaN index");
        } catch (e) {
            console.error(`Prism (${this.id}) Error getRefractiveIndex:`, e);
            N_INSIDE = this.baseRefractiveIndex;
        }

        const outwardNormal = this.worldNormals[intersectionInfo.surfaceId];
        if (!outwardNormal || isNaN(outwardNormal.x)) {
            ray.terminate('internal_error_normal_prism');
            return [];
        }
        const dotDirOutward = incidentDirection.dot(outwardNormal);
        const isEntering = dotDirOutward < -1e-9;
        const isExiting = dotDirOutward > 1e-9;

        if (!isEntering && !isExiting) {
            const n1 = ray.mediumRefractiveIndex;
            const reflectedIntensity = ray.intensity;
            if (reflectedIntensity >= ray.minIntensityThreshold) {
                const reflectionNormalForCalc = surfaceNormal;
                const cosIForCalc = Math.max(0.0, Math.min(1.0, incidentDirection.dot(reflectionNormalForCalc.multiply(-1.0))));
                let reflectedDirection = incidentDirection.add(reflectionNormalForCalc.multiply(2 * cosIForCalc)).normalize();
                const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
                try {
                    if (isNaN(reflectOrigin.x) || isNaN(reflectedDirection.x)) throw new Error("NaN grazing");
                    const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, ray.bouncesSoFar + 1, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
                    ray.terminate('grazing_reflection_prism');
                    return reflectedRay.shouldTerminate() ? [] : [reflectedRay];
                } catch (e) { /* ignore */ }
            }
            ray.terminate('grazing_unhandled_prism');
            return [];
        }

        const n1 = isEntering ? ray.mediumRefractiveIndex : N_INSIDE;
        const n2 = isEntering ? N_INSIDE : N_OUTSIDE;

        if (Math.abs(n1 - n2) < 1e-9) {
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            try {
                if (isNaN(transmitOrigin.x)) throw new Error("NaN passthrough");
                const transmittedRay = new RayClass(transmitOrigin, incidentDirection, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
                ray.terminate('pass_boundary_prism');
                return transmittedRay.shouldTerminate() ? [] : [transmittedRay];
            } catch (e) {
                ray.terminate('error_passthrough_prism');
                return [];
            }
        }

        const nRatio = n1 / n2;
        const cosI = Math.max(0.0, Math.min(1.0, incidentDirection.dot(surfaceNormal.multiply(-1.0))));
        const sinI2 = Math.max(0.0, 1.0 - cosI * cosI);
        const sinT2 = nRatio * nRatio * sinI2;

        let reflectivity = 0.0;
        let isTotalInternalReflection = (n1 > n2 + 1e-9) && (sinT2 >= 1.0 - 1e-9);

        if (isTotalInternalReflection) {
            reflectivity = 1.0;
        } else if (sinT2 >= 1.0 || sinT2 < 0) {
            isTotalInternalReflection = true;
            reflectivity = 1.0;
        } else {
            const cosT = Math.sqrt(1.0 - sinT2);
            const n1_cosI = n1 * cosI;
            const n2_cosT = n2 * cosT;
            const n1_cosT = n1 * cosT;
            const n2_cosI = n2 * cosI;
            const Rs_den = n1_cosI + n2_cosT;
            const Rp_den = n1_cosT + n2_cosI;
            const Rs = (Rs_den < 1e-9) ? 1.0 : ((n1_cosI - n2_cosT) / Rs_den) ** 2;
            const Rp = (Rp_den < 1e-9) ? 1.0 : ((n1_cosT - n2_cosI) / Rp_den) ** 2;
            reflectivity = Math.max(0.0, Math.min(1.0, (Rs + Rp) / 2.0));
        }

        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        const incidentIntensity = ray.intensity;

        const reflectedIntensity = incidentIntensity * reflectivity;
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            const reflectionNormalForCalc = surfaceNormal;
            const cosIForCalc = Math.max(0.0, Math.min(1.0, incidentDirection.dot(reflectionNormalForCalc.multiply(-1.0))));
            let reflectedDirection = incidentDirection.add(reflectionNormalForCalc.multiply(2 * cosIForCalc)).normalize();
            const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            try {
                if (isNaN(reflectOrigin.x) || isNaN(reflectedDirection.x)) throw new Error("NaN reflected");
                const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, nextBounces, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
                if (!reflectedRay.terminated) newRays.push(reflectedRay);
            } catch (e) { console.error(`Prism (${this.id}) Error reflected ray:`, e); }
        }

        if (!isTotalInternalReflection && sinT2 < 1.0 && sinT2 >= 0) {
            const transmittedIntensity = incidentIntensity * (1.0 - reflectivity);
            if (transmittedIntensity >= ray.minIntensityThreshold) {
                const cosT = Math.sqrt(1.0 - sinT2);
                let refractedDirection = incidentDirection.multiply(nRatio).add(surfaceNormal.multiply(nRatio * cosI - cosT)).normalize();
                const refractOrigin = hitPoint.add(refractedDirection.multiply(1e-6));
                try {
                    if (isNaN(refractOrigin.x) || isNaN(refractedDirection.x)) throw new Error("NaN refracted");
                    const refractedRay = new RayClass(refractOrigin, refractedDirection, ray.wavelengthNm, transmittedIntensity, ray.phase, nextBounces, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([refractOrigin.clone()]));
                    if (!refractedRay.terminated) newRays.push(refractedRay);
                } catch (e) { console.error(`Prism (${this.id}) Error refracted ray:`, e); }
            }
        }

        ray.terminate(isTotalInternalReflection ? 'tir_prism' : 'split_prism');
        return newRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            baseLength: { value: this.baseLength.toFixed(1), label: '底边长度', type: 'number', min: 10, step: 1, title: '棱镜底边的长度' },
            apexAngleDeg: { value: (this.apexAngleRad * 180 / Math.PI).toFixed(1), label: '顶角 (α)', type: 'number', min: 1, max: 178, step: 1, title: '棱镜顶部的角度 (1°-178°)' },
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '基准折射率 (n₀@550nm)', type: 'number', min: 1.0, step: 0.01, title: '在 550nm 波长下的折射率' },
            dispersionCoeffB: { value: this.dispersionCoeffB.toFixed(0), label: '色散系数 (B)', type: 'number', min: 0, step: 100, title: '柯西色散公式 B 项 (nm²)，控制色散强度' }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;

        switch (propName) {
            case 'baseLength':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10 && Math.abs(l - this.baseLength) > 1e-6) { this.baseLength = l; needsGeomUpdate = true; }
                break;
            case 'apexAngleDeg':
                const a = parseFloat(value);
                if (!isNaN(a)) {
                    const r = Math.max(1 * Math.PI / 180, Math.min(178 * Math.PI / 180, a * Math.PI / 180));
                    if (Math.abs(r - this.apexAngleRad) > 1e-9) { this.apexAngleRad = r; needsGeomUpdate = true; }
                }
                break;
            case 'baseRefractiveIndex':
                const n = parseFloat(value);
                if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) { this.baseRefractiveIndex = n; needsRetraceUpdate = true; }
                break;
            case 'dispersionCoeffB':
                const b = parseFloat(value);
                if (!isNaN(b) && b >= 0 && Math.abs(b - this.dispersionCoeffB) > 1e-9) { this.dispersionCoeffB = b; needsRetraceUpdate = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) setProperty geom update error:`, e); }
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
    window.Prism = Prism;
}
