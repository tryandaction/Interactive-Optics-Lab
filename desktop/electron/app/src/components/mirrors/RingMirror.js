/**
 * RingMirror.js - 环形镜
 * 具有中心孔的反射镜，中心透过、外环反射
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class RingMirror extends OpticalComponent {
    static functionDescription = "具有中心孔的环形反射镜，中心透过、外环反射。";

    constructor(pos, outerRadius = 50, innerRadius = 20, angleDeg = 0) {
        super(pos, angleDeg, "环形镜");
        this.outerRadius = Math.max(10, outerRadius);
        this.innerRadius = Math.max(0, Math.min(innerRadius, this.outerRadius - 5));
        
        // Normal direction (perpendicular to mirror plane)
        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2);
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            outerRadius: this.outerRadius,
            innerRadius: this.innerRadius
        };
    }

    _updateGeometry() {
        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { /* No geometry update needed for position change */ }

    /**
     * Check if a point is within the ring (between inner and outer radius)
     * @param {Vector} point - Point to check
     * @returns {string} 'inner' if in center hole, 'ring' if in reflective ring, 'outside' if outside
     */
    getRegion(point) {
        // Transform point to local coordinates (relative to mirror center)
        const localPoint = point.subtract(this.pos);
        
        // Project onto mirror plane (perpendicular to normal)
        const mirrorDir = Vector.fromAngle(this.angleRad);
        const distAlongMirror = localPoint.dot(mirrorDir);
        const distFromPlane = Math.abs(localPoint.dot(this.normal));
        
        // Check if point is close to the mirror plane
        if (distFromPlane > 5) return 'outside';
        
        const radialDist = Math.abs(distAlongMirror);
        
        if (radialDist < this.innerRadius) return 'inner';
        if (radialDist <= this.outerRadius) return 'ring';
        return 'outside';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);
        
        // Draw outer ring (reflective part)
        ctx.strokeStyle = 'silver';
        ctx.lineWidth = this.selected ? 4 : 3;
        
        // Left part of ring
        ctx.beginPath();
        ctx.moveTo(-this.outerRadius, 0);
        ctx.lineTo(-this.innerRadius, 0);
        ctx.stroke();
        
        // Right part of ring
        ctx.beginPath();
        ctx.moveTo(this.innerRadius, 0);
        ctx.lineTo(this.outerRadius, 0);
        ctx.stroke();
        
        // Draw hatching on back side
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const hatchSpacing = 8;
        
        // Left side hatching
        for (let x = -this.outerRadius; x <= -this.innerRadius; x += hatchSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 4, -5);
            ctx.stroke();
        }
        
        // Right side hatching
        for (let x = this.innerRadius; x <= this.outerRadius; x += hatchSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 4, -5);
            ctx.stroke();
        }
        
        // Draw center hole indicator (dashed line)
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(-this.innerRadius, 0);
        ctx.lineTo(this.innerRadius, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw selection highlight
        if (this.selected) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(-this.outerRadius, 0);
            ctx.lineTo(this.outerRadius, 0);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }

    getBoundingBox() {
        const size = this.outerRadius * 2;
        const buffer = 10;
        return {
            x: this.pos.x - this.outerRadius - buffer,
            y: this.pos.y - buffer,
            width: size + 2 * buffer,
            height: 2 * buffer
        };
    }

    _containsPointBody(point) {
        const localPoint = point.subtract(this.pos);
        const mirrorDir = Vector.fromAngle(this.angleRad);
        const distAlongMirror = Math.abs(localPoint.dot(mirrorDir));
        const distFromPlane = Math.abs(localPoint.dot(this.normal));
        
        return distFromPlane < 10 && distAlongMirror <= this.outerRadius;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with the mirror plane
        const planeNormal = this.normal;
        const denom = rayDirection.dot(planeNormal);
        
        if (Math.abs(denom) < 1e-9) return []; // Ray parallel to plane
        
        const t = this.pos.subtract(rayOrigin).dot(planeNormal) / denom;
        
        if (t < 1e-6) return []; // Intersection behind ray origin
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        
        // Check if hit point is within the ring
        const localHit = hitPoint.subtract(this.pos);
        const mirrorDir = Vector.fromAngle(this.angleRad);
        const radialDist = Math.abs(localHit.dot(mirrorDir));
        
        if (radialDist > this.outerRadius) return []; // Outside outer radius
        
        // Determine surface normal direction
        let surfaceNormal = planeNormal.clone();
        if (rayDirection.dot(surfaceNormal) > 0) {
            surfaceNormal = surfaceNormal.multiply(-1);
        }
        
        // Mark whether hit is in inner hole or ring
        const isInHole = radialDist < this.innerRadius;
        
        return [{
            distance: t,
            point: hitPoint,
            normal: surfaceNormal,
            surfaceId: isInHole ? 'hole' : 'ring',
            radialDist: radialDist
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal;
        const surfaceId = intersectionInfo.surfaceId;

        // If ray hits the center hole, let it pass through
        if (surfaceId === 'hole') {
            const transmittedOrigin = hitPoint.add(ray.direction.multiply(1e-6));
            
            try {
                const transmittedRay = new RayClass(
                    transmittedOrigin,
                    ray.direction.clone(),
                    ray.wavelengthNm,
                    ray.intensity,
                    ray.phase,
                    ray.bouncesSoFar,
                    ray.mediumRefractiveIndex,
                    ray.sourceId,
                    ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([transmittedOrigin.clone()])
                );
                ray.terminate('passed_through_hole');
                return [transmittedRay];
            } catch (e) {
                console.error(`Error creating transmitted Ray in RingMirror:`, e);
                ray.terminate('error');
                return [];
            }
        }

        // Ray hits the reflective ring - reflect it
        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();

        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.ignoreDecay ? ray.intensity : ray.intensity * 0.99;
        const reflectedPhase = ray.phase + Math.PI;
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
            } catch (e) { console.error(`Error creating reflected Ray in RingMirror:`, e); }
        }

        ray.terminate('ring_reflected');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            outerRadius: { value: this.outerRadius.toFixed(1), label: '外径', type: 'number', min: 10, step: 1 },
            innerRadius: { value: this.innerRadius.toFixed(1), label: '内径 (孔径)', type: 'number', min: 0, step: 1 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;

        switch (propName) {
            case 'outerRadius':
                const or = parseFloat(value);
                if (!isNaN(or) && or >= 10) {
                    this.outerRadius = or;
                    // Ensure inner radius is smaller
                    if (this.innerRadius >= this.outerRadius - 5) {
                        this.innerRadius = this.outerRadius - 5;
                    }
                    needsRetrace = true;
                }
                break;
            case 'innerRadius':
                const ir = parseFloat(value);
                if (!isNaN(ir) && ir >= 0 && ir < this.outerRadius - 5) {
                    this.innerRadius = ir;
                    needsRetrace = true;
                }
                break;
            default:
                return false;
        }

        if (needsRetrace && typeof window !== 'undefined') {
            window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.RingMirror = RingMirror;
}
