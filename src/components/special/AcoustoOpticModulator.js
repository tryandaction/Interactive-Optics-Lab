/**
 * AcoustoOpticModulator.js - 声光调制器 (AOM)
 * 利用声光效应调制光的频率/方向/强度
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { DEFAULT_WAVELENGTH_NM } from '../../core/constants.js';

export class AcoustoOpticModulator extends OpticalComponent {
    static functionDescription = "利用声光效应调制光的频率/方向/强度。";

    constructor(pos, width = 50, height = 20, angleDeg = 0, rfFrequencyMHz = 80, rfPower = 0.5) {
        super(pos, angleDeg, "声光调制器");

        this.width = Math.max(10, width);
        this.height = Math.max(5, height);

        this.rfFrequencyMHz = Math.max(1, rfFrequencyMHz);
        this.rfPower = Math.max(0, Math.min(1, rfPower));
        this.acousticVelocity_mps = 4200;

        this.localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = [];
        this.worldNormals = [];

        this.diffractionAngleRad = 0;
        this.efficiencyOrder0 = 0;
        this.efficiencyOrder1 = 0;

        try {
            this._updateGeometry();
            this._updateOpticalProperties();
        } catch (e) {
            console.error("Init AOM error:", e);
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            rfFrequencyMHz: this.rfFrequencyMHz,
            rfPower: this.rfPower
        };
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

    _updateOpticalProperties(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        const lambda_light_meters = wavelengthNm * 1e-9;
        const freq_acoustic_hz = this.rfFrequencyMHz * 1e6;

        if (this.acousticVelocity_mps > 1e-6) {
            this.diffractionAngleRad = (lambda_light_meters * freq_acoustic_hz) / this.acousticVelocity_mps;
            this.diffractionAngleRad = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, this.diffractionAngleRad));
        } else {
            this.diffractionAngleRad = 0;
        }

        this.efficiencyOrder1 = this.rfPower;
        this.efficiencyOrder0 = 1.0 - this.rfPower;
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.fillStyle = this.selected ? 'rgba(100, 149, 237, 0.4)' : 'rgba(100, 149, 237, 0.2)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#87CEFA';
        ctx.lineWidth = this.selected ? 2 : 1;

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

            ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.5)' : 'rgba(135, 206, 250, 0.5)';
            ctx.lineWidth = 1;
            const numWaves = 5;
            const waveDir = this.worldVertices[1].subtract(this.worldVertices[0]).normalize();
            const perpDir = this.worldVertices[3].subtract(this.worldVertices[0]).normalize();
            for (let i = 1; i <= numWaves; i++) {
                const t = i / (numWaves + 1);
                const start = this.worldVertices[0].add(perpDir.multiply(this.height * t));
                const end = this.worldVertices[1].add(perpDir.multiply(this.height * t));
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
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
                    if (rayDirection.dot(edgeNormal) < -1e-9) {
                        if (t1 < closestDist) {
                            closestDist = t1;
                            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                            let interactionNormal = edgeNormal.multiply(-1.0);
                            if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) continue;
                            closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: 'aom_input_surface' };
                        }
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        const incidentIntensity = ray.intensity;
        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;

        this._updateOpticalProperties(ray.wavelengthNm);

        const intensityOrder0 = incidentIntensity * this.efficiencyOrder0;
        if (intensityOrder0 >= ray.minIntensityThreshold) {
            const directionOrder0 = incidentDirection.clone();
            const originOrder0 = hitPoint.add(directionOrder0.multiply(1e-6));
            try {
                const ray0 = new RayClass(
                    originOrder0, directionOrder0, ray.wavelengthNm, intensityOrder0, ray.phase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([originOrder0.clone()])
                );
                if (!ray0.terminated) newRays.push(ray0);
            } catch (e) { console.error(`AOM (${this.id}) Error creating 0th order ray:`, e); }
        }

        const intensityOrder1 = incidentIntensity * this.efficiencyOrder1;
        if (intensityOrder1 >= ray.minIntensityThreshold && Math.abs(this.diffractionAngleRad) > 1e-9) {
            const directionOrder1 = incidentDirection.rotate(this.diffractionAngleRad);
            const originOrder1 = hitPoint.add(directionOrder1.multiply(1e-6));
            try {
                const ray1 = new RayClass(
                    originOrder1, directionOrder1, ray.wavelengthNm, intensityOrder1, ray.phase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([originOrder1.clone()])
                );
                if (!ray1.terminated) newRays.push(ray1);
            } catch (e) { console.error(`AOM (${this.id}) Error creating +1st order ray:`, e); }
        }

        ray.terminate('diffracted_aom');
        return newRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 10, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 5, step: 1 },
            rfFrequencyMHz: { value: this.rfFrequencyMHz.toFixed(1), label: '频率 (MHz)', type: 'number', min: 1, max: 500, step: 1 },
            rfPower: { value: this.rfPower.toFixed(2), label: '功率 (0-1)', type: 'range', min: 0, max: 1, step: 0.01 },
            diffractionAngle: { value: (this.diffractionAngleRad * 180 / Math.PI).toFixed(3), label: '衍射角 (+1°)', type: 'text', readonly: true },
            efficiency0: { value: this.efficiencyOrder0.toFixed(2), label: '效率 (0级)', type: 'text', readonly: true },
            efficiency1: { value: this.efficiencyOrder1.toFixed(2), label: '效率 (+1级)', type: 'text', readonly: true },
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
                if (!isNaN(h) && h >= 5 && Math.abs(h - this.height) > 1e-6) { this.height = h; needsGeomUpdate = true; }
                break;
            case 'rfFrequencyMHz':
                const f = parseFloat(value);
                if (!isNaN(f) && f >= 1 && Math.abs(f - this.rfFrequencyMHz) > 1e-6) { this.rfFrequencyMHz = f; needsOpticalUpdate = true; }
                break;
            case 'rfPower':
                const p = parseFloat(value);
                if (!isNaN(p)) {
                    const c = Math.max(0, Math.min(1, p));
                    if (Math.abs(c - this.rfPower) > 1e-9) { this.rfPower = c; needsOpticalUpdate = true; }
                }
                break;
            case 'diffractionAngle':
            case 'efficiency0':
            case 'efficiency1':
                return true;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this.localVertices = [
                new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
                new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
            ];
            try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) setProperty geom update error:`, e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsOpticalUpdate) {
            try { this._updateOpticalProperties(); } catch (e) { console.error(`AOM (${this.id}) setProperty optical update error:`, e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }

        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.AcoustoOpticModulator = AcoustoOpticModulator;
}
