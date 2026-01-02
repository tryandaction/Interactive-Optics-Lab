/**
 * VariableAttenuator.js - 可调衰减器
 * 连续可调透过率的中性密度滤光片
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class VariableAttenuator extends OpticalComponent {
    static functionDescription = "连续可调透过率的可调衰减器/中性密度滤光片。";

    constructor(pos, diameter = 40, angleDeg = 90, transmission = 0.5) {
        super(pos, angleDeg, "可调衰减器");
        this.diameter = Math.max(10, diameter);
        this.transmission = Math.max(0.001, Math.min(1.0, transmission));
        
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter,
            transmission: this.transmission
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.diameter / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    /**
     * Get optical density (OD) from transmission
     * OD = -log10(T)
     */
    getOpticalDensity() {
        return -Math.log10(this.transmission);
    }

    /**
     * Get attenuation in dB
     * dB = -10 * log10(T)
     */
    getAttenuationDB() {
        return -10 * Math.log10(this.transmission);
    }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;

        // Draw attenuator as a gradient disk
        const center = this.pos;
        
        // Calculate gray level based on transmission
        const grayLevel = Math.round(50 + 150 * this.transmission);
        const fillColor = `rgba(${grayLevel}, ${grayLevel}, ${grayLevel}, 0.7)`;
        
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angleRad);

        // Draw circular attenuator
        const radius = this.diameter / 2;
        
        // Gradient to show variable density
        const gradient = ctx.createLinearGradient(-radius, 0, radius, 0);
        gradient.addColorStop(0, `rgba(30, 30, 30, 0.8)`);
        gradient.addColorStop(0.5, fillColor);
        gradient.addColorStop(1, `rgba(30, 30, 30, 0.8)`);
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#888888';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        // Draw as ellipse (disk viewed at angle)
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw transmission indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`T=${(this.transmission * 100).toFixed(0)}%`, 0, radius * 0.3 + 15);

        // Draw OD indicator
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.fillText(`OD=${this.getOpticalDensity().toFixed(2)}`, 0, -radius * 0.3 - 8);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 10;
        return {
            x: this.pos.x - this.diameter / 2 - buffer,
            y: this.pos.y - this.diameter / 2 - buffer,
            width: this.diameter + 2 * buffer,
            height: this.diameter + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        return point.distanceTo(this.pos) <= this.diameter / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        
        // Intersect with attenuator plane
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3);
        
        if (Math.abs(dot_v2_v3) < 1e-9) return [];
        
        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;
        
        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.axisDirection.clone();
            if (rayDirection.dot(surfaceNormal) > 0) {
                surfaceNormal = surfaceNormal.multiply(-1);
            }
            return [{
                distance: t1,
                point: intersectionPoint,
                normal: surfaceNormal,
                surfaceId: 'attenuator'
            }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        
        // Apply attenuation
        const outputIntensity = ray.intensity * this.transmission;
        
        const newOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
        
        let transmittedRay = null;
        if (outputIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            try {
                transmittedRay = new RayClass(
                    newOrigin, incidentDirection, ray.wavelengthNm,
                    outputIntensity, ray.phase, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()]),
                    ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in VariableAttenuator:`, e); }
        }

        ray.terminate('attenuated');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            diameter: { value: this.diameter.toFixed(1), label: '直径', type: 'number', min: 10, step: 5 },
            transmission: { 
                value: this.transmission.toFixed(3), 
                label: '透过率 (0-1)', 
                type: 'number', 
                min: 0.001, 
                max: 1.0, 
                step: 0.01 
            },
            transmissionPercent: { 
                value: (this.transmission * 100).toFixed(1) + '%', 
                label: '透过率 (%)', 
                type: 'text', 
                readonly: true 
            },
            opticalDensity: { 
                value: this.getOpticalDensity().toFixed(3), 
                label: '光学密度 (OD)', 
                type: 'text', 
                readonly: true 
            },
            attenuationDB: { 
                value: this.getAttenuationDB().toFixed(2) + ' dB', 
                label: '衰减量', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 10) { this.diameter = d; needsGeomUpdate = true; }
                break;
            case 'transmission':
                const t = parseFloat(value);
                if (!isNaN(t)) { 
                    this.transmission = Math.max(0.001, Math.min(1.0, t)); 
                    needsRetrace = true; 
                    needsInspectorRefresh = true;
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
        }
        if (needsGeomUpdate || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
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
    window.VariableAttenuator = VariableAttenuator;
}
