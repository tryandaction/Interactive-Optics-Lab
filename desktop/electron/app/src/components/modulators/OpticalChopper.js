/**
 * OpticalChopper.js - 光学斩波器
 * 周期性阻断光束的机械调制元件
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class OpticalChopper extends OpticalComponent {
    static functionDescription = "周期性阻断光束的光学斩波器。";

    constructor(pos, diameter = 50, angleDeg = 0, frequency = 1000, dutyCycle = 0.5, 
                numSlots = 6, currentPhase = 0) {
        super(pos, angleDeg, "光学斩波器");
        this.diameter = Math.max(20, diameter);
        this.frequency = Math.max(1, frequency); // Hz
        this.dutyCycle = Math.max(0.1, Math.min(0.9, dutyCycle)); // Open fraction
        this.numSlots = Math.max(1, Math.min(20, Math.round(numSlots)));
        this.currentPhase = currentPhase; // Current rotation phase (0-1)
        this.isOpen = true; // Current state
        
        this._updateState();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter,
            frequency: this.frequency,
            dutyCycle: this.dutyCycle,
            numSlots: this.numSlots,
            currentPhase: this.currentPhase
        };
    }

    /**
     * Update open/closed state based on current phase
     */
    _updateState() {
        // Each slot covers 1/numSlots of the rotation
        const slotAngle = 1 / this.numSlots;
        const phaseInSlot = (this.currentPhase % slotAngle) / slotAngle;
        this.isOpen = phaseInSlot < this.dutyCycle;
    }

    /**
     * Get effective transmission (time-averaged)
     */
    getAverageTransmission() {
        return this.dutyCycle;
    }

    /**
     * Get modulation period
     */
    getPeriod() {
        return 1 / this.frequency;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const radius = this.diameter / 2;
        const innerRadius = radius * 0.3;
        const slotAngle = (2 * Math.PI) / this.numSlots;
        const openAngle = slotAngle * this.dutyCycle;
        const closedAngle = slotAngle * (1 - this.dutyCycle);

        // Draw chopper wheel
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#666666';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        // Draw outer circle
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner hub
        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw slots (alternating open/closed)
        const rotationOffset = this.currentPhase * 2 * Math.PI;
        
        for (let i = 0; i < this.numSlots; i++) {
            const startAngle = i * slotAngle + rotationOffset;
            
            // Draw closed (blade) section
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.moveTo(innerRadius * Math.cos(startAngle), innerRadius * Math.sin(startAngle));
            ctx.arc(0, 0, radius, startAngle, startAngle + closedAngle);
            ctx.arc(0, 0, innerRadius, startAngle + closedAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw open (slot) section - just outline
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, radius, startAngle + closedAngle, startAngle + slotAngle);
            ctx.stroke();
            ctx.strokeStyle = this.selected ? '#FFFF00' : '#666666';
            ctx.lineWidth = this.selected ? 2.5 : 2;
        }

        // Draw center axis
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw state indicator
        ctx.fillStyle = this.isOpen ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(0, -radius - 10, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw frequency label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.frequency} Hz`, 0, radius + 15);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 20;
        return {
            x: this.pos.x - this.diameter / 2 - buffer,
            y: this.pos.y - this.diameter / 2 - buffer,
            width: this.diameter + 2 * buffer,
            height: this.diameter + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        return point.distanceTo(this.pos) <= this.diameter / 2 + 10;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with chopper plane (perpendicular to angle)
        const planeNormal = Vector.fromAngle(this.angleRad + Math.PI / 2);
        const denom = rayDirection.dot(planeNormal);
        
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = this.pos.subtract(rayOrigin).dot(planeNormal) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const distFromCenter = hitPoint.distanceTo(this.pos);
        
        // Check if within chopper disk
        if (distFromCenter > this.diameter / 2) return [];
        if (distFromCenter < this.diameter * 0.15) return []; // Center hub - pass through
        
        let normal = planeNormal.clone();
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'chopper',
            distFromCenter: distFromCenter
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        const distFromCenter = intersectionInfo.distFromCenter || 0;
        
        // Determine if ray passes through slot or hits blade
        // Calculate angular position of hit point
        const localHit = hitPoint.subtract(this.pos);
        const hitAngle = Math.atan2(localHit.y, localHit.x);
        const rotationOffset = this.currentPhase * 2 * Math.PI;
        
        // Normalize angle to slot position
        const slotAngle = (2 * Math.PI) / this.numSlots;
        let relativeAngle = (hitAngle - rotationOffset) % slotAngle;
        if (relativeAngle < 0) relativeAngle += slotAngle;
        
        const closedAngle = slotAngle * (1 - this.dutyCycle);
        const isBlocked = relativeAngle < closedAngle;
        
        if (isBlocked) {
            // Ray hits blade - blocked
            ray.terminate('blocked_by_chopper');
            return [];
        }
        
        // Ray passes through slot
        const newOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
        
        let transmittedRay = null;
        try {
            transmittedRay = new RayClass(
                newOrigin, incidentDirection, ray.wavelengthNm,
                ray.intensity, ray.phase, ray.bouncesSoFar + 1,
                ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                ray.ignoreDecay, ray.history.concat([newOrigin.clone()]),
                ray.beamDiameter
            );
        } catch (e) { console.error(`Error creating transmitted Ray in OpticalChopper:`, e); }

        ray.terminate('passed_chopper');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            diameter: { value: this.diameter.toFixed(1), label: '直径', type: 'number', min: 20, step: 5 },
            frequency: { value: this.frequency.toFixed(0), label: '频率 (Hz)', type: 'number', min: 1, max: 100000, step: 100 },
            dutyCycle: { 
                value: this.dutyCycle.toFixed(2), 
                label: '占空比 (开放比例)', 
                type: 'number', 
                min: 0.1, 
                max: 0.9, 
                step: 0.05 
            },
            numSlots: { value: this.numSlots, label: '槽数', type: 'number', min: 1, max: 20, step: 1 },
            currentPhase: { 
                value: this.currentPhase.toFixed(3), 
                label: '当前相位 (0-1)', 
                type: 'number', 
                min: 0, 
                max: 1, 
                step: 0.01 
            },
            period: { 
                value: (this.getPeriod() * 1000).toFixed(3) + ' ms', 
                label: '周期', 
                type: 'text', 
                readonly: true 
            },
            avgTransmission: { 
                value: (this.getAverageTransmission() * 100).toFixed(0) + '%', 
                label: '平均透过率', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 20) { this.diameter = d; needsRetrace = true; }
                break;
            case 'frequency':
                const f = parseFloat(value);
                if (!isNaN(f) && f >= 1) { this.frequency = f; needsInspectorRefresh = true; }
                break;
            case 'dutyCycle':
                const dc = parseFloat(value);
                if (!isNaN(dc)) { 
                    this.dutyCycle = Math.max(0.1, Math.min(0.9, dc)); 
                    needsRetrace = true; 
                    needsInspectorRefresh = true;
                }
                break;
            case 'numSlots':
                const ns = parseInt(value);
                if (!isNaN(ns) && ns >= 1 && ns <= 20) { 
                    this.numSlots = ns; 
                    needsRetrace = true; 
                }
                break;
            case 'currentPhase':
                const cp = parseFloat(value);
                if (!isNaN(cp)) { 
                    this.currentPhase = cp % 1; 
                    if (this.currentPhase < 0) this.currentPhase += 1;
                    this._updateState();
                    needsRetrace = true; 
                }
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
    window.OpticalChopper = OpticalChopper;
}
