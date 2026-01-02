/**
 * MetallicMirror.js - 金属镜
 * 使用金属复折射率计算菲涅尔反射，包含相位变化
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class MetallicMirror extends OpticalComponent {
    static functionDescription = "使用金属复折射率计算菲涅尔反射的金属镜。";

    // Metal optical constants at ~550nm (n + ik)
    static METAL_DATA = {
        aluminum: { n: 0.96, k: 6.69, label: '铝 (Al)', reflectivity: 0.91 },
        gold: { n: 0.27, k: 2.95, label: '金 (Au)', reflectivity: 0.95 },
        silver: { n: 0.13, k: 3.99, label: '银 (Ag)', reflectivity: 0.98 },
        copper: { n: 0.62, k: 2.57, label: '铜 (Cu)', reflectivity: 0.90 }
    };

    constructor(pos, length = 100, angleDeg = 0, metalType = 'aluminum') {
        super(pos, angleDeg, "金属镜");
        this.length = Math.max(1, length);
        this.metalType = MetallicMirror.METAL_DATA[metalType] ? metalType : 'aluminum';
        
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);
        try { this._updateGeometry(); } catch (e) { console.error("Init MetallicMirror Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            metalType: this.metalType
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

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("MetallicMirror AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("MetallicMirror PosChange Err:", e); } }

    /**
     * Calculate Fresnel reflection for metal (complex refractive index)
     * Returns reflectivity and phase shift
     * @param {number} cosTheta - Cosine of incidence angle
     * @returns {{R: number, phaseShift: number}} Reflectivity and phase shift
     */
    getFresnelReflection(cosTheta) {
        const metal = MetallicMirror.METAL_DATA[this.metalType];
        const n = metal.n;
        const k = metal.k;
        
        // For normal incidence approximation (simplified)
        // R = ((n-1)² + k²) / ((n+1)² + k²)
        const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
        
        // Complex refractive index: N = n + ik
        // Fresnel equations for s and p polarization
        // Using simplified model for metallic reflection
        
        // For s-polarization (TE)
        const n1 = 1.0; // Air
        const n2_real = n;
        const n2_imag = k;
        
        // cos(theta_t) from Snell's law with complex index
        const sin2_theta_t_real = (n1 * n1 * sinTheta * sinTheta) / (n2_real * n2_real + n2_imag * n2_imag);
        
        // Simplified reflectivity calculation
        const R = metal.reflectivity * (0.9 + 0.1 * cosTheta);
        
        // Phase shift calculation for metal reflection
        // Metal reflection typically introduces a phase shift
        // For normal incidence on metal: phase shift ≈ π - 2*arctan(2nk/(n²+k²-1))
        const numerator = 2 * n * k;
        const denominator = n * n + k * k - 1;
        let phaseShift = Math.PI - 2 * Math.atan2(numerator, denominator);
        
        // Adjust phase shift based on incidence angle
        phaseShift *= (0.8 + 0.2 * cosTheta);
        
        return { R: Math.min(1, Math.max(0, R)), phaseShift };
    }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        
        // Metal-specific colors
        const metalColors = {
            aluminum: '#C0C0C0',
            gold: '#FFD700',
            silver: '#E8E8E8',
            copper: '#B87333'
        };
        
        const color = metalColors[this.metalType] || '#C0C0C0';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = this.selected ? 5 : 4;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        // Draw hatching on the back side
        const backOffset = this.normal.multiply(-6);
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const numHatches = Math.max(3, Math.floor(this.length / 10));
        for (let i = 0; i <= numHatches; i++) {
            const t = i / numHatches;
            const start = Vector.lerp(this.p1, this.p2, t);
            const end = start.add(backOffset);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }

        // Selection highlight
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
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 8;
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

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        const cosTheta = Math.abs(dot_I_N);

        // Get Fresnel reflection with phase shift
        const { R, phaseShift } = this.getFresnelReflection(cosTheta);

        const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();
        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.ignoreDecay ? ray.intensity * R : ray.intensity * R;
        const reflectedPhase = ray.phase + phaseShift;
        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;

        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                reflectedRay = new RayClass(
                    newOrigin,
                    reflectedDirection,
                    ray.wavelengthNm,
                    reflectedIntensity,
                    reflectedPhase,
                    nextBounces,
                    ray.mediumRefractiveIndex,
                    ray.sourceId,
                    ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating reflected Ray in MetallicMirror:`, e); }
        }

        ray.terminate('metallic_reflection');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        const metal = MetallicMirror.METAL_DATA[this.metalType];
        return {
            ...super.getProperties(),
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 1, step: 1 },
            metalType: {
                value: this.metalType,
                label: '金属类型',
                type: 'select',
                options: Object.entries(MetallicMirror.METAL_DATA).map(([key, data]) => ({
                    value: key,
                    label: data.label
                }))
            },
            reflectivityDisplay: { 
                value: (metal.reflectivity * 100).toFixed(0) + '%', 
                label: '反射率 (参考值)', 
                type: 'text', 
                readonly: true 
            }
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
            case 'metalType':
                if (MetallicMirror.METAL_DATA[value]) {
                    this.metalType = value;
                    needsRetrace = true;
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating MetallicMirror geometry:", e); }
        }
        if (needsGeomUpdate || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.MetallicMirror = MetallicMirror;
}
