/**
 * DichroicMirror.js - 二向色镜
 * 根据波长选择性反射或透射光线
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class DichroicMirror extends OpticalComponent {
    static functionDescription = "根据波长选择性反射或透射光线的二向色镜。";

    constructor(pos, length = 80, angleDeg = 45, cutoffWavelength = 550, 
                transitionWidth = 20, reflectShortWave = true) {
        super(pos, angleDeg, "二向色镜");
        this.length = Math.max(1, length);
        this.cutoffWavelength = Math.max(380, Math.min(750, cutoffWavelength ?? 550));
        this.transitionWidth = Math.max(1, Math.min(100, transitionWidth ?? 20));
        this.reflectShortWave = reflectShortWave ?? true; // true: short wave reflects, long wave transmits
        
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);
        try { this._updateGeometry(); } catch (e) { console.error("Init DichroicMirror Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            cutoffWavelength: this.cutoffWavelength,
            transitionWidth: this.transitionWidth,
            reflectShortWave: this.reflectShortWave
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

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("DichroicMirror AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("DichroicMirror PosChange Err:", e); } }

    /**
     * Calculate reflectivity based on wavelength using sigmoid function
     * @param {number} wavelengthNm - Wavelength in nanometers
     * @returns {number} Reflectivity (0-1)
     */
    getReflectivity(wavelengthNm) {
        // Sigmoid function for smooth transition
        // k controls the steepness of the transition
        const k = 4 / this.transitionWidth; // Steepness factor
        const x = wavelengthNm - this.cutoffWavelength;
        const sigmoid = 1 / (1 + Math.exp(k * x));
        
        // If reflectShortWave is true, short wavelengths reflect (high R)
        // If false, long wavelengths reflect
        return this.reflectShortWave ? sigmoid : (1 - sigmoid);
    }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        
        // Draw dichroic mirror with gradient to indicate wavelength selectivity
        const gradient = ctx.createLinearGradient(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
        if (this.reflectShortWave) {
            gradient.addColorStop(0, 'rgba(100, 100, 255, 0.8)'); // Blue (short wave)
            gradient.addColorStop(1, 'rgba(255, 100, 100, 0.8)'); // Red (long wave)
        } else {
            gradient.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
            gradient.addColorStop(1, 'rgba(100, 100, 255, 0.8)');
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.selected ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        // Draw selection highlight
        if (this.selected) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(this.p1.x, this.p1.y);
            ctx.lineTo(this.p2.x, this.p2.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw cutoff wavelength indicator
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        const labelPos = this.pos.add(this.normal.multiply(15));
        ctx.fillText(`λc=${this.cutoffWavelength}nm`, labelPos.x, labelPos.y);
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 10;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 36;
        const p1_to_point = point.subtract(this.p1);
        const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 36;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);

        const dot_v2_v3 = v2.dot(v3);
        if (Math.abs(dot_v2_v3) < 1e-9) { return []; }

        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;

        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.normal.clone();
            if (rayDirection.dot(surfaceNormal) > 0) {
                surfaceNormal = surfaceNormal.multiply(-1);
            }
            return [{
                distance: t1,
                point: intersectionPoint,
                normal: surfaceNormal,
                surfaceId: 'front'
            }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal;
        const outputRays = [];

        // Get wavelength-dependent reflectivity
        const R = this.getReflectivity(ray.wavelengthNm);
        const T = 1 - R;

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);

        // Create reflected ray if reflectivity is significant
        if (R > 0.01 && ray.intensity * R >= ray.minIntensityThreshold) {
            const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();
            const reflectedOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            const reflectedIntensity = ray.ignoreDecay ? ray.intensity * R : ray.intensity * R * 0.99;
            const reflectedPhase = ray.phase + Math.PI;

            try {
                const reflectedRay = new RayClass(
                    reflectedOrigin,
                    reflectedDirection,
                    ray.wavelengthNm,
                    reflectedIntensity,
                    reflectedPhase,
                    ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex,
                    ray.sourceId,
                    ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([reflectedOrigin.clone()])
                );
                outputRays.push(reflectedRay);
            } catch (e) { console.error(`Error creating reflected Ray in DichroicMirror:`, e); }
        }

        // Create transmitted ray if transmittance is significant
        if (T > 0.01 && ray.intensity * T >= ray.minIntensityThreshold) {
            const transmittedOrigin = hitPoint.add(I.multiply(1e-6));
            const transmittedIntensity = ray.ignoreDecay ? ray.intensity * T : ray.intensity * T * 0.99;

            try {
                const transmittedRay = new RayClass(
                    transmittedOrigin,
                    I.clone(),
                    ray.wavelengthNm,
                    transmittedIntensity,
                    ray.phase,
                    ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex,
                    ray.sourceId,
                    ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([transmittedOrigin.clone()])
                );
                outputRays.push(transmittedRay);
            } catch (e) { console.error(`Error creating transmitted Ray in DichroicMirror:`, e); }
        }

        ray.terminate('dichroic_interaction');
        return outputRays;
    }

    getProperties() {
        return {
            ...super.getProperties(),
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 1, step: 1 },
            cutoffWavelength: { value: this.cutoffWavelength.toFixed(0), label: '截止波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            transitionWidth: { value: this.transitionWidth.toFixed(0), label: '过渡带宽 (nm)', type: 'number', min: 1, max: 100, step: 1 },
            reflectShortWave: { value: this.reflectShortWave, label: '短波反射', type: 'checkbox' }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetrace = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 1) { this.length = l; needsGeomUpdate = true; }
                break;
            case 'cutoffWavelength':
                const cw = parseFloat(value);
                if (!isNaN(cw)) { this.cutoffWavelength = Math.max(380, Math.min(750, cw)); needsRetrace = true; }
                break;
            case 'transitionWidth':
                const tw = parseFloat(value);
                if (!isNaN(tw)) { this.transitionWidth = Math.max(1, Math.min(100, tw)); needsRetrace = true; }
                break;
            case 'reflectShortWave':
                this.reflectShortWave = !!value;
                needsRetrace = true;
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating DichroicMirror geometry:", e); }
        }
        if (needsGeomUpdate || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.DichroicMirror = DichroicMirror;
}
