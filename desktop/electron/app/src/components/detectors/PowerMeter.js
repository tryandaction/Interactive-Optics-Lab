/**
 * PowerMeter.js - 功率计
 * 测量并显示入射光的总功率
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class PowerMeter extends OpticalComponent {
    static functionDescription = "测量并显示入射光总功率的功率计。";

    constructor(pos, diameter = 40, angleDeg = 0) {
        super(pos, angleDeg, "功率计");
        this.diameter = Math.max(20, diameter);
        
        // Measurement data
        this.totalPower = 0;
        this.hitCount = 0;
        this.peakPower = 0;
        
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    reset() {
        this.totalPower = 0;
        this.hitCount = 0;
        this.peakPower = 0;
    }

    onAngleChanged() { this._updateGeometry(); this.reset(); }
    onPositionChanged() { this.reset(); }

    /**
     * Get average power per ray
     */
    getAveragePower() {
        return this.hitCount > 0 ? this.totalPower / this.hitCount : 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const radius = this.diameter / 2;

        // Draw meter body
        ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#666666';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        // Main body (circular)
        ctx.beginPath();
        ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Sensor area
        ctx.fillStyle = 'rgba(20, 20, 30, 1)';
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw power indicator (ring that fills based on power)
        if (this.totalPower > 0) {
            const maxDisplayPower = 10; // Arbitrary max for display
            const fillRatio = Math.min(1, this.totalPower / maxDisplayPower);
            
            ctx.strokeStyle = `rgba(0, ${Math.round(255 * (1 - fillRatio))}, ${Math.round(255 * fillRatio)}, 0.8)`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, radius - 3, -Math.PI / 2, -Math.PI / 2 + fillRatio * Math.PI * 2);
            ctx.stroke();
        }

        // Draw power value
        ctx.fillStyle = 'rgba(0, 255, 100, 0.9)';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let displayValue;
        if (this.totalPower < 0.001) {
            displayValue = this.totalPower.toExponential(1);
        } else if (this.totalPower < 1) {
            displayValue = this.totalPower.toFixed(3);
        } else {
            displayValue = this.totalPower.toFixed(2);
        }
        ctx.fillText(displayValue, 0, 0);

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '8px Arial';
        ctx.fillText('功率计', 0, radius + 12);

        ctx.restore();
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
        return point.distanceTo(this.pos) <= this.diameter / 2 + 10;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with sensor plane
        const denom = rayDirection.dot(this.perpDirection);
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = this.pos.subtract(rayOrigin).dot(this.perpDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const distFromCenter = hitPoint.distanceTo(this.pos);
        
        if (distFromCenter > this.diameter / 2) return [];
        
        let normal = this.perpDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'sensor'
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        // Accumulate power
        this.totalPower += ray.intensity;
        this.hitCount += 1;
        
        // Track peak
        if (ray.intensity > this.peakPower) {
            this.peakPower = ray.intensity;
        }
        
        ray.terminate('absorbed_power_meter');
        return [];
    }

    getProperties() {
        return {
            ...super.getProperties(),
            diameter: { value: this.diameter.toFixed(1), label: '直径', type: 'number', min: 20, step: 5 },
            totalPower: { 
                value: this.totalPower.toExponential(4), 
                label: '总功率', 
                type: 'text', 
                readonly: true 
            },
            hitCount: { value: this.hitCount, label: '命中光线数', type: 'text', readonly: true },
            averagePower: { 
                value: this.getAveragePower().toExponential(4), 
                label: '平均功率/光线', 
                type: 'text', 
                readonly: true 
            },
            peakPower: { 
                value: this.peakPower.toExponential(4), 
                label: '峰值功率', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 20) { 
                    this.diameter = d; 
                    this._updateGeometry();
                    this.reset();
                    if (typeof window !== 'undefined') window.needsRetrace = true;
                }
                break;
            default:
                return false;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.PowerMeter = PowerMeter;
}
