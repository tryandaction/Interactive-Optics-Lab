/**
 * GRINLens.js - GRIN透镜 (梯度折射率透镜)
 * 具有梯度折射率分布的透镜，折射率随径向距离变化
 * n(r) = n0 * (1 - g²r²/2) 或 n(r) = n0 * sech(g*r)
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class GRINLens extends OpticalComponent {
    static functionDescription = "具有梯度折射率分布的GRIN透镜。";

    constructor(pos, diameter = 50, length = 30, n0 = 1.6, gradientCoeff = 0.01, angleDeg = 0) {
        super(pos, angleDeg, "GRIN透镜");
        this.diameter = Math.max(5, diameter);
        this.length = Math.max(5, length);
        this.n0 = Math.max(1.0, n0); // Center refractive index
        this.gradientCoeff = Math.max(0, gradientCoeff); // g: gradient coefficient (1/mm)
        this.quality = 0.98;
        
        // Geometry cache
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
        
        try { this._updateGeometry(); } catch (e) { console.error("Init GRINLens Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter,
            length: this.length,
            n0: this.n0,
            gradientCoeff: this.gradientCoeff,
            quality: this.quality
        };
    }

    /**
     * Calculate refractive index at radial distance r
     * n(r) = n0 * (1 - g²r²/2) for parabolic profile
     * @param {number} r - Radial distance from optical axis
     * @returns {number} Refractive index at position r
     */
    getRefractiveIndex(r) {
        const g = this.gradientCoeff;
        const g2r2 = g * g * r * r;
        // Parabolic profile: n(r) = n0 * (1 - g²r²/2)
        const n = this.n0 * (1 - g2r2 / 2);
        return Math.max(1.0, n); // Ensure n >= 1
    }

    /**
     * Calculate pitch length (one complete period of ray oscillation)
     * P = 2π/g
     */
    getPitchLength() {
        if (this.gradientCoeff <= 0) return Infinity;
        return (2 * Math.PI) / this.gradientCoeff;
    }

    /**
     * Calculate effective focal length for quarter-pitch GRIN lens
     * f = 1/(n0 * g * sin(g*L))
     */
    getEffectiveFocalLength() {
        const g = this.gradientCoeff;
        const L = this.length;
        if (g <= 0) return Infinity;
        const sinGL = Math.sin(g * L);
        if (Math.abs(sinGL) < 1e-9) return Infinity;
        return 1 / (this.n0 * g * sinGL);
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("GRINLens AngleChange Err:", e); } }
    onPositionChanged() { /* No geometry update needed */ }

    draw(ctx) {
        const center = this.pos;
        const halfLength = this.length / 2;
        const halfDiameter = this.diameter / 2;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angleRad);

        // Draw GRIN lens body with gradient fill
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, halfDiameter);
        gradient.addColorStop(0, 'rgba(100, 180, 255, 0.4)'); // Center (higher n)
        gradient.addColorStop(1, 'rgba(200, 230, 255, 0.2)'); // Edge (lower n)

        ctx.fillStyle = gradient;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#90c0ff';
        ctx.lineWidth = this.selected ? 2.5 : 1.8;

        // Draw cylindrical shape
        ctx.beginPath();
        ctx.rect(-halfLength, -halfDiameter, this.length, this.diameter);
        ctx.fill();
        ctx.stroke();

        // Draw gradient indicator lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        const numLines = 5;
        for (let i = 1; i < numLines; i++) {
            const r = (i / numLines) * halfDiameter;
            ctx.beginPath();
            ctx.moveTo(-halfLength, r);
            ctx.lineTo(halfLength, r);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-halfLength, -r);
            ctx.lineTo(halfLength, -r);
            ctx.stroke();
        }

        // Draw optical axis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(-halfLength - 10, 0);
        ctx.lineTo(halfLength + 10, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw "GRIN" label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GRIN', 0, 3);

        ctx.restore();

        // Draw focal point when selected
        if (this.selected) {
            const f = this.getEffectiveFocalLength();
            if (Math.abs(f) !== Infinity && Math.abs(f) < 500) {
                const exitPoint = center.add(this.axisDirection.multiply(this.length / 2));
                const focalPoint = exitPoint.add(this.axisDirection.multiply(f));
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(focalPoint.x, focalPoint.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    getBoundingBox() {
        const buffer = 10;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const w = this.length * cosA + this.diameter * sinA;
        const h = this.length * sinA + this.diameter * cosA;
        return {
            x: this.pos.x - w / 2 - buffer,
            y: this.pos.y - h / 2 - buffer,
            width: w + 2 * buffer,
            height: h + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        // Transform to local coordinates
        const local = point.subtract(this.pos);
        const alongAxis = local.dot(this.axisDirection);
        const perpAxis = local.dot(this.perpDirection);
        
        return Math.abs(alongAxis) <= this.length / 2 + 5 && 
               Math.abs(perpAxis) <= this.diameter / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        // Find intersection with entry face of GRIN lens
        const entryCenter = this.pos.subtract(this.axisDirection.multiply(this.length / 2));
        const exitCenter = this.pos.add(this.axisDirection.multiply(this.length / 2));
        
        // Check entry face (perpendicular to axis)
        const denom = rayDirection.dot(this.axisDirection);
        if (Math.abs(denom) < 1e-9) return []; // Ray parallel to face
        
        const t = entryCenter.subtract(rayOrigin).dot(this.axisDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const localHit = hitPoint.subtract(entryCenter);
        const radialDist = Math.abs(localHit.dot(this.perpDirection));
        
        if (radialDist > this.diameter / 2) return [];
        
        let normal = this.axisDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'entry',
            radialDist: radialDist
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const radialDist = intersectionInfo.radialDist || 0;
        const incidentDirection = ray.direction;
        
        // GRIN lens ray tracing using paraxial approximation
        // For a GRIN lens, the ray path follows: r(z) = r0*cos(gz) + (r0'/g)*sin(gz)
        // where r0 is initial radial position, r0' is initial radial slope
        
        const g = this.gradientCoeff;
        const L = this.length;
        
        if (g <= 0 || L <= 0) {
            // No gradient - pass through unchanged
            const transmittedOrigin = hitPoint.add(incidentDirection.multiply(this.length + 1e-6));
            const transmittedIntensity = ray.intensity * this.quality;
            
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    const transmittedRay = new RayClass(
                        transmittedOrigin, incidentDirection, ray.wavelengthNm,
                        transmittedIntensity, ray.phase, ray.bouncesSoFar + 1,
                        ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                        ray.ignoreDecay, ray.history.concat([transmittedOrigin.clone()]), ray.beamDiameter
                    );
                    ray.terminate('pass_grin_no_gradient');
                    return [transmittedRay];
                } catch (e) { console.error(`GRINLens pass-through error:`, e); }
            }
            ray.terminate('pass_grin_dim');
            return [];
        }

        // Calculate initial radial position and slope
        const r0 = radialDist;
        const axisComponent = incidentDirection.dot(this.axisDirection);
        const perpComponent = incidentDirection.dot(this.perpDirection);
        const r0_prime = perpComponent / Math.max(0.1, Math.abs(axisComponent)); // Initial radial slope
        
        // Calculate output position and slope using GRIN matrix
        const cosGL = Math.cos(g * L);
        const sinGL = Math.sin(g * L);
        
        // Output radial position: r_out = r0*cos(gL) + (r0'/g)*sin(gL)
        const r_out = r0 * cosGL + (r0_prime / g) * sinGL;
        
        // Output radial slope: r_out' = -r0*g*sin(gL) + r0'*cos(gL)
        const r_out_prime = -r0 * g * sinGL + r0_prime * cosGL;
        
        // Calculate exit point and direction
        const exitCenter = this.pos.add(this.axisDirection.multiply(this.length / 2));
        const exitPoint = exitCenter.add(this.perpDirection.multiply(r_out));
        
        // Calculate output direction
        const outputAngle = Math.atan(r_out_prime);
        const baseAngle = this.axisDirection.angle();
        const newDirection = Vector.fromAngle(baseAngle + outputAngle * Math.sign(axisComponent));
        
        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            ray.terminate('grin_calc_error');
            return [];
        }

        const transmittedIntensity = ray.intensity * this.quality;
        let transmittedRay = null;

        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newOrigin = exitPoint.add(newDirection.multiply(1e-6));
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, ray.wavelengthNm, transmittedIntensity,
                    ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                    ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                    ray.history.concat([hitPoint.clone(), newOrigin.clone()]), ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in GRINLens:`, e); }
        }

        ray.terminate('refracted_grin');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        const f = this.getEffectiveFocalLength();
        const pitch = this.getPitchLength();
        const pitchFraction = this.gradientCoeff > 0 ? (this.length / pitch) : 0;
        
        return {
            ...super.getProperties(),
            diameter: { value: this.diameter.toFixed(1), label: '直径', type: 'number', min: 5, step: 1 },
            length: { value: this.length.toFixed(1), label: '长度', type: 'number', min: 5, step: 1 },
            n0: { value: this.n0.toFixed(3), label: '中心折射率 (n₀)', type: 'number', min: 1.0, max: 2.5, step: 0.01 },
            gradientCoeff: { 
                value: this.gradientCoeff.toFixed(4), 
                label: '梯度系数 (g)', 
                type: 'number', 
                min: 0, 
                max: 0.5, 
                step: 0.001,
                title: 'n(r) = n₀(1 - g²r²/2)'
            },
            pitchLength: { 
                value: Math.abs(pitch) === Infinity ? '∞' : pitch.toFixed(1), 
                label: '节距 (P=2π/g)', 
                type: 'text', 
                readonly: true 
            },
            pitchFraction: { 
                value: pitchFraction.toFixed(3) + ' P', 
                label: '长度/节距', 
                type: 'text', 
                readonly: true,
                title: '0.25P = 准直, 0.5P = 成像'
            },
            effectiveFocalLength: { 
                value: Math.abs(f) === Infinity ? '∞' : f.toFixed(1), 
                label: '有效焦距', 
                type: 'text', 
                readonly: true 
            },
            quality: { value: this.quality.toFixed(2), label: '透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 5) { this.diameter = d; needsRetrace = true; }
                break;
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 5) { this.length = l; needsRetrace = true; needsInspectorRefresh = true; }
                break;
            case 'n0':
                const n = parseFloat(value);
                if (!isNaN(n) && n >= 1.0) { this.n0 = n; needsRetrace = true; needsInspectorRefresh = true; }
                break;
            case 'gradientCoeff':
                const g = parseFloat(value);
                if (!isNaN(g) && g >= 0) { this.gradientCoeff = g; needsRetrace = true; needsInspectorRefresh = true; }
                break;
            case 'quality':
                const q = parseFloat(value);
                if (!isNaN(q)) { this.quality = Math.max(0.1, Math.min(1.0, q)); needsRetrace = true; }
                break;
            default:
                return false;
        }

        if (needsRetrace && typeof window !== 'undefined') {
            window.needsRetrace = true;
        }
        if (needsInspectorRefresh && typeof window !== 'undefined' && 
            window.selectedComponent === this && window.updateInspector) {
            window.updateInspector();
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GRINLens = GRINLens;
}
