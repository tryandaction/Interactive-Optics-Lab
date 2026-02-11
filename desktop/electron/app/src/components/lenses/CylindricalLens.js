/**
 * CylindricalLens.js - 柱面透镜
 * 仅在一个方向聚焦的透镜，垂直于柱轴方向聚焦，平行方向不变
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class CylindricalLens extends OpticalComponent {
    static functionDescription = "仅在一个方向聚焦的柱面透镜。";

    constructor(pos, width = 80, height = 40, focalLength = 100, angleDeg = 90, cylinderAxis = 'horizontal') {
        super(pos, angleDeg, "柱面透镜");
        this.width = Math.max(10, width);
        this.height = Math.max(10, height);
        this.focalLength = focalLength === 0 ? Infinity : focalLength;
        this.cylinderAxis = cylinderAxis; // 'horizontal' or 'vertical'
        this.quality = 0.98;
        
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.lensDir = Vector.fromAngle(this.angleRad);
        this.axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
        
        try { this._updateGeometry(); } catch (e) { console.error("Init CylindricalLens Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            focalLength: this.focalLength,
            cylinderAxis: this.cylinderAxis,
            quality: this.quality
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.lensDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = this.lensDir.multiply(this.width / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.axisDirection = new Vector(-this.lensDir.y, this.lensDir.x);
        
        // Update label based on focal length
        if (Math.abs(this.focalLength) === Infinity) {
            this.label = "柱面平板";
        } else if (this.focalLength > 0) {
            this.label = "柱面凸透镜";
        } else {
            this.label = "柱面凹透镜";
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("CylindricalLens AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("CylindricalLens PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;

        const center = this.pos;
        const F = this.focalLength;
        const isFlat = Math.abs(F) === Infinity;
        const isConvex = F > 0;

        // Colors
        const convexColor = '#90c0ff';
        const concaveColor = '#FFB6C1';
        const flatColor = '#D3D3D3';
        const selectedColor = '#FFFF00';

        let baseStrokeColor = isFlat ? flatColor : (isConvex ? convexColor : concaveColor);
        ctx.strokeStyle = this.selected ? selectedColor : baseStrokeColor;
        ctx.lineWidth = this.selected ? 2.5 : 1.8;

        // Fill style
        let fillStyle = "rgba(0,0,0,0)";
        if (!isFlat) {
            let rgb = isConvex ? '144, 192, 255' : '255, 160, 160';
            fillStyle = this.selected ? `rgba(${rgb}, 0.25)` : `rgba(${rgb}, 0.15)`;
        }
        ctx.fillStyle = fillStyle;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angleRad);

        // Draw cylindrical lens shape
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        ctx.beginPath();
        if (isFlat) {
            // Simple rectangle for flat
            ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        } else {
            // Cylindrical shape with curved sides
            const curvature = Math.min(halfHeight * 0.3, Math.abs(150 / F) * 10);
            
            if (isConvex) {
                // Convex: curves outward
                ctx.moveTo(-halfWidth, -halfHeight);
                ctx.lineTo(halfWidth, -halfHeight);
                ctx.quadraticCurveTo(halfWidth + curvature, 0, halfWidth, halfHeight);
                ctx.lineTo(-halfWidth, halfHeight);
                ctx.quadraticCurveTo(-halfWidth - curvature, 0, -halfWidth, -halfHeight);
            } else {
                // Concave: curves inward
                ctx.moveTo(-halfWidth, -halfHeight);
                ctx.lineTo(halfWidth, -halfHeight);
                ctx.quadraticCurveTo(halfWidth - curvature, 0, halfWidth, halfHeight);
                ctx.lineTo(-halfWidth, halfHeight);
                ctx.quadraticCurveTo(-halfWidth + curvature, 0, -halfWidth, -halfHeight);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw cylinder axis indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        if (this.cylinderAxis === 'horizontal') {
            // Horizontal axis - draw horizontal line
            ctx.beginPath();
            ctx.moveTo(-halfWidth * 0.8, 0);
            ctx.lineTo(halfWidth * 0.8, 0);
            ctx.stroke();
        } else {
            // Vertical axis - draw vertical line
            ctx.beginPath();
            ctx.moveTo(0, -halfHeight * 0.8);
            ctx.lineTo(0, halfHeight * 0.8);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.restore();

        // Draw focal points when selected
        if (this.selected && !isFlat) {
            const focalPoint1 = center.add(this.axisDirection.multiply(F));
            const focalPoint2 = center.add(this.axisDirection.multiply(-F));
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(focalPoint1.x, focalPoint1.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(focalPoint2.x, focalPoint2.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getBoundingBox() {
        const buffer = 10;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const w = this.width * cosA + this.height * sinA;
        const h = this.width * sinA + this.height * cosA;
        return {
            x: this.pos.x - w / 2 - buffer,
            y: this.pos.y - h / 2 - buffer,
            width: w + 2 * buffer,
            height: h + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(this.p1);
        const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < (this.height / 2 + 5) * (this.height / 2 + 5);
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
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
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'lens_plane' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        const F = this.focalLength;

        // If flat lens, just pass through
        if (Math.abs(F) === Infinity) {
            const transmittedIntensity = ray.intensity * this.quality;
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(
                        transmitOrigin, incidentDirection, ray.wavelengthNm,
                        transmittedIntensity, ray.phase, ray.bouncesSoFar + 1,
                        ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                        ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]), ray.beamDiameter
                    );
                } catch (e) { console.error(`CylindricalLens pass-through error:`, e); }
            }
            ray.terminate('pass_flat_cylindrical');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        // Calculate deviation only in the focusing direction
        const lensCenter = this.pos;
        const axisDir = this.axisDirection;
        const lensPlaneDir = this.lensDir;
        const vecCenterToHit = hitPoint.subtract(lensCenter);
        
        // h is the distance from center along the lens plane
        const h = vecCenterToHit.dot(lensPlaneDir);
        
        // For cylindrical lens, only apply deviation in the direction perpendicular to cylinder axis
        // The cylinder axis determines which component of the ray direction is affected
        
        // Get incident angle relative to optical axis
        const axisAngle = axisDir.angle();
        const incidentWorldAngle = incidentDirection.angle();
        const incidentAngleRelAxis = Math.atan2(
            Math.sin(incidentWorldAngle - axisAngle), 
            Math.cos(incidentWorldAngle - axisAngle)
        );

        // Calculate deviation based on cylinder axis orientation
        let deviation;
        if (this.cylinderAxis === 'horizontal') {
            // Horizontal cylinder axis: focuses in vertical direction
            // Only the vertical component of h contributes to focusing
            deviation = -h / F;
        } else {
            // Vertical cylinder axis: focuses in horizontal direction
            deviation = -h / F;
        }

        const outputAngleRelAxis = incidentAngleRelAxis + deviation;
        const outputWorldAngle = axisAngle + outputAngleRelAxis;
        const newDirection = Vector.fromAngle(outputWorldAngle);

        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            ray.terminate('cylindrical_calc_error');
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
            } catch (e) { console.error(`Error creating transmitted Ray in CylindricalLens:`, e); }
        }

        ray.terminate('refracted_cylindrical');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 10, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 10, step: 1 },
            focalLength: {
                value: Math.abs(this.focalLength) === Infinity ? 'Infinity' : this.focalLength.toFixed(1),
                label: '焦距 (f)',
                type: 'number',
                step: 10,
                title: 'f > 0: 凸透镜, f < 0: 凹透镜'
            },
            cylinderAxis: {
                value: this.cylinderAxis,
                label: '柱轴方向',
                type: 'select',
                options: [
                    { value: 'horizontal', label: '水平 (垂直聚焦)' },
                    { value: 'vertical', label: '垂直 (水平聚焦)' }
                ]
            },
            quality: { value: this.quality.toFixed(2), label: '透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetrace = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 10) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 10) { this.height = h; needsGeomUpdate = true; }
                break;
            case 'focalLength':
                let f_val;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { f_val = Infinity; }
                else { f_val = parseFloat(value); }
                if (!isNaN(f_val)) {
                    this.focalLength = (f_val === 0) ? Infinity : f_val;
                    needsGeomUpdate = true;
                    needsRetrace = true;
                }
                break;
            case 'cylinderAxis':
                if (value === 'horizontal' || value === 'vertical') {
                    this.cylinderAxis = value;
                    needsRetrace = true;
                }
                break;
            case 'quality':
                const q = parseFloat(value);
                if (!isNaN(q)) { this.quality = Math.max(0.1, Math.min(1.0, q)); needsRetrace = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating CylindricalLens geometry:", e); }
        }
        if (needsGeomUpdate || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.CylindricalLens = CylindricalLens;
}
