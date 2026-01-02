/**
 * AsphericLens.js - 非球面透镜
 * 支持圆锥常数和高阶非球面系数的透镜
 * 表面方程: z = (r²/R)/(1+√(1-(1+k)(r/R)²)) + A4*r⁴ + A6*r⁶ + A8*r⁸ + A10*r¹⁰
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class AsphericLens extends OpticalComponent {
    static functionDescription = "支持圆锥常数和高阶非球面系数的非球面透镜。";

    constructor(pos, diameter = 60, baseRadius = 100, conicConstant = 0, 
                asphericCoeffs = [0, 0, 0, 0], angleDeg = 90) {
        super(pos, angleDeg, "非球面透镜");
        this.diameter = Math.max(10, diameter);
        this.baseRadius = baseRadius; // R in the aspheric equation
        this.conicConstant = conicConstant; // k: 0=sphere, -1=parabola, <-1=hyperbola, >0=oblate ellipse
        this.asphericCoeffs = asphericCoeffs.slice(0, 4); // [A4, A6, A8, A10]
        while (this.asphericCoeffs.length < 4) this.asphericCoeffs.push(0);
        
        this.quality = 0.98;
        this.baseRefractiveIndex = 1.5;
        
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.lensDir = Vector.fromAngle(this.angleRad);
        this.axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
        
        try { this._updateGeometry(); } catch (e) { console.error("Init AsphericLens Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter,
            baseRadius: this.baseRadius,
            conicConstant: this.conicConstant,
            asphericCoeffs: this.asphericCoeffs,
            quality: this.quality,
            baseRefractiveIndex: this.baseRefractiveIndex
        };
    }

    /**
     * Calculate surface height (sag) at radial distance r
     * z = (r²/R)/(1+√(1-(1+k)(r/R)²)) + A4*r⁴ + A6*r⁶ + A8*r⁸ + A10*r¹⁰
     * @param {number} r - Radial distance from optical axis
     * @returns {number} Surface height (sag)
     */
    getSurfaceHeight(r) {
        const R = this.baseRadius;
        const k = this.conicConstant;
        const [A4, A6, A8, A10] = this.asphericCoeffs;
        
        if (Math.abs(R) < 1e-9) return 0; // Flat surface
        
        const r2 = r * r;
        const rOverR = r / R;
        const rOverR2 = rOverR * rOverR;
        
        // Check for valid square root argument
        const sqrtArg = 1 - (1 + k) * rOverR2;
        if (sqrtArg < 0) {
            // Outside valid range, use approximation
            return r2 / (2 * R);
        }
        
        // Conic section term
        const conicTerm = (r2 / R) / (1 + Math.sqrt(sqrtArg));
        
        // Higher order aspheric terms
        const r4 = r2 * r2;
        const r6 = r4 * r2;
        const r8 = r4 * r4;
        const r10 = r8 * r2;
        const asphericTerm = A4 * r4 + A6 * r6 + A8 * r8 + A10 * r10;
        
        return conicTerm + asphericTerm;
    }

    /**
     * Calculate surface normal at radial distance r
     * @param {number} r - Radial distance from optical axis
     * @returns {number} Slope dz/dr at position r
     */
    getSurfaceSlope(r) {
        const R = this.baseRadius;
        const k = this.conicConstant;
        const [A4, A6, A8, A10] = this.asphericCoeffs;
        
        if (Math.abs(R) < 1e-9) return 0;
        
        const r2 = r * r;
        const rOverR = r / R;
        const rOverR2 = rOverR * rOverR;
        
        const sqrtArg = 1 - (1 + k) * rOverR2;
        if (sqrtArg <= 0) {
            return r / R; // Approximation
        }
        
        // Derivative of conic term
        const sqrtVal = Math.sqrt(sqrtArg);
        const conicSlope = r / (R * sqrtVal);
        
        // Derivative of aspheric terms
        const r3 = r2 * r;
        const r5 = r3 * r2;
        const r7 = r5 * r2;
        const r9 = r7 * r2;
        const asphericSlope = 4 * A4 * r3 + 6 * A6 * r5 + 8 * A8 * r7 + 10 * A10 * r9;
        
        return conicSlope + asphericSlope;
    }

    /**
     * Get effective focal length based on paraxial approximation
     */
    getEffectiveFocalLength() {
        const n = this.baseRefractiveIndex;
        if (Math.abs(this.baseRadius) < 1e-9) return Infinity;
        // Paraxial focal length for single surface
        return this.baseRadius / (n - 1);
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.lensDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = this.lensDir.multiply(this.diameter / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.axisDirection = new Vector(-this.lensDir.y, this.lensDir.x);
        
        // Update label based on conic constant
        if (this.conicConstant === 0) {
            this.label = "非球面透镜 (球面)";
        } else if (this.conicConstant === -1) {
            this.label = "非球面透镜 (抛物面)";
        } else if (this.conicConstant < -1) {
            this.label = "非球面透镜 (双曲面)";
        } else {
            this.label = "非球面透镜 (椭球面)";
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("AsphericLens AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("AsphericLens PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;

        const center = this.pos;
        const isConvex = this.baseRadius > 0;

        ctx.strokeStyle = this.selected ? '#FFFF00' : (isConvex ? '#90c0ff' : '#FFB6C1');
        ctx.lineWidth = this.selected ? 2.5 : 1.8;
        ctx.fillStyle = isConvex ? 'rgba(144, 192, 255, 0.15)' : 'rgba(255, 160, 160, 0.15)';

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angleRad);

        // Draw aspheric surface profile
        const halfDiameter = this.diameter / 2;
        const numPoints = 30;
        
        ctx.beginPath();
        
        // Draw front surface (aspheric)
        for (let i = 0; i <= numPoints; i++) {
            const r = -halfDiameter + (i / numPoints) * this.diameter;
            const z = this.getSurfaceHeight(Math.abs(r)) * (isConvex ? 1 : -1);
            const scaledZ = z * 0.5; // Scale for visualization
            
            if (i === 0) {
                ctx.moveTo(r, scaledZ);
            } else {
                ctx.lineTo(r, scaledZ);
            }
        }
        
        // Draw back surface (flat for simplicity)
        const backOffset = isConvex ? -5 : 5;
        ctx.lineTo(halfDiameter, backOffset);
        ctx.lineTo(-halfDiameter, backOffset);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        // Draw optical axis indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(0, 20);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();

        // Draw focal point when selected
        if (this.selected) {
            const f = this.getEffectiveFocalLength();
            if (Math.abs(f) !== Infinity && Math.abs(f) < 1000) {
                const focalPoint = center.add(this.axisDirection.multiply(f));
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(focalPoint.x, focalPoint.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    getBoundingBox() {
        const buffer = 15;
        return {
            x: this.pos.x - this.diameter / 2 - buffer,
            y: this.pos.y - this.diameter / 2 - buffer,
            width: this.diameter + 2 * buffer,
            height: this.diameter + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        const dist = point.distanceTo(this.pos);
        return dist < this.diameter / 2 + 10;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        
        // Simplified: intersect with lens plane
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3);
        if (Math.abs(dot_v2_v3) < 1e-9) { return []; }
        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;
        
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.axisDirection.clone();
            if (rayDirection.dot(surfaceNormal) > 0) { surfaceNormal = surfaceNormal.multiply(-1); }
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'aspheric' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        
        // Calculate radial distance from optical axis
        const lensCenter = this.pos;
        const lensPlaneDir = this.lensDir;
        const vecCenterToHit = hitPoint.subtract(lensCenter);
        const r = vecCenterToHit.dot(lensPlaneDir);
        
        // Get surface slope at hit point
        const slope = this.getSurfaceSlope(Math.abs(r));
        
        // Calculate effective focal length with aspheric correction
        const f_base = this.getEffectiveFocalLength();
        
        // Apply aspheric correction to deviation
        // The aspheric terms reduce spherical aberration
        const h = r;
        let deviation;
        if (Math.abs(f_base) === Infinity || Math.abs(f_base) < 1e-9) {
            deviation = 0;
        } else {
            // Basic thin lens deviation with aspheric correction
            const slopeCorrection = slope * 0.1; // Small correction factor
            deviation = -h / f_base * (1 + slopeCorrection);
        }

        const axisDir = this.axisDirection;
        const axisAngle = axisDir.angle();
        const incidentWorldAngle = incidentDirection.angle();
        const incidentAngleRelAxis = Math.atan2(
            Math.sin(incidentWorldAngle - axisAngle), 
            Math.cos(incidentWorldAngle - axisAngle)
        );

        const outputAngleRelAxis = incidentAngleRelAxis + deviation;
        const outputWorldAngle = axisAngle + outputAngleRelAxis;
        const newDirection = Vector.fromAngle(outputWorldAngle);

        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            ray.terminate('aspheric_calc_error');
            return [];
        }

        const transmittedIntensity = ray.intensity * this.quality;
        let transmittedRay = null;

        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, ray.wavelengthNm, transmittedIntensity,
                    ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                    ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()]), ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in AsphericLens:`, e); }
        }

        ray.terminate('refracted_aspheric');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        const f = this.getEffectiveFocalLength();
        return {
            ...super.getProperties(),
            diameter: { value: this.diameter.toFixed(1), label: '直径', type: 'number', min: 10, step: 1 },
            baseRadius: { 
                value: this.baseRadius.toFixed(1), 
                label: '基础曲率半径 (R)', 
                type: 'number', 
                step: 10,
                title: 'R > 0: 凸面, R < 0: 凹面'
            },
            conicConstant: { 
                value: this.conicConstant.toFixed(3), 
                label: '圆锥常数 (k)', 
                type: 'number', 
                step: 0.1,
                title: 'k=0: 球面, k=-1: 抛物面, k<-1: 双曲面'
            },
            A4: { value: (this.asphericCoeffs[0] * 1e6).toFixed(3), label: 'A₄ (×10⁻⁶)', type: 'number', step: 0.001 },
            A6: { value: (this.asphericCoeffs[1] * 1e9).toFixed(3), label: 'A₆ (×10⁻⁹)', type: 'number', step: 0.001 },
            A8: { value: (this.asphericCoeffs[2] * 1e12).toFixed(3), label: 'A₈ (×10⁻¹²)', type: 'number', step: 0.001 },
            A10: { value: (this.asphericCoeffs[3] * 1e15).toFixed(3), label: 'A₁₀ (×10⁻¹⁵)', type: 'number', step: 0.001 },
            effectiveFocalLength: { 
                value: Math.abs(f) === Infinity ? '∞' : f.toFixed(1), 
                label: '有效焦距 (近轴)', 
                type: 'text', 
                readonly: true 
            },
            quality: { value: this.quality.toFixed(2), label: '透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetrace = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 10) { this.diameter = d; needsGeomUpdate = true; }
                break;
            case 'baseRadius':
                const r = parseFloat(value);
                if (!isNaN(r)) { this.baseRadius = r; needsGeomUpdate = true; needsRetrace = true; }
                break;
            case 'conicConstant':
                const k = parseFloat(value);
                if (!isNaN(k)) { this.conicConstant = k; needsGeomUpdate = true; needsRetrace = true; }
                break;
            case 'A4':
                const a4 = parseFloat(value);
                if (!isNaN(a4)) { this.asphericCoeffs[0] = a4 * 1e-6; needsRetrace = true; }
                break;
            case 'A6':
                const a6 = parseFloat(value);
                if (!isNaN(a6)) { this.asphericCoeffs[1] = a6 * 1e-9; needsRetrace = true; }
                break;
            case 'A8':
                const a8 = parseFloat(value);
                if (!isNaN(a8)) { this.asphericCoeffs[2] = a8 * 1e-12; needsRetrace = true; }
                break;
            case 'A10':
                const a10 = parseFloat(value);
                if (!isNaN(a10)) { this.asphericCoeffs[3] = a10 * 1e-15; needsRetrace = true; }
                break;
            case 'quality':
                const q = parseFloat(value);
                if (!isNaN(q)) { this.quality = Math.max(0.1, Math.min(1.0, q)); needsRetrace = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating AsphericLens geometry:", e); }
        }
        if (needsGeomUpdate || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.AsphericLens = AsphericLens;
}
