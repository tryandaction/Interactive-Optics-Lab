/**
 * FanSource.js - 扇形光源
 * 以扇形角度发出多束光线，覆盖一定角域
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM, MAX_RAYS_PER_SOURCE } from '../../core/constants.js';

export class FanSource extends GameObject {
    static functionDescription = "以扇形角度发出多束光线，覆盖一定角域。";

    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 10.0, 
                rayCount = 201, fanAngleDeg = 30, enabled = true, polarizationType = 'unpolarized', 
                polarizationAngleDeg = 0, ignoreDecay = false, beamDiameter = 1.0) {
        super(pos, angleDeg, "扇形光源");
        
        this.wavelength = wavelength;
        this.intensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount);
        this.fanAngleRad = fanAngleDeg * Math.PI / 180;
        this.enabled = enabled;
        this.polarizationType = polarizationType;
        this.polarizationAngleRad = polarizationAngleDeg * (Math.PI / 180);
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = beamDiameter;
        
        this._rayColor = this.calculateRayColor();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            wavelength: this.wavelength,
            intensity: this.intensity,
            rayCount: this.rayCount,
            fanAngleDeg: this.fanAngleRad * 180 / Math.PI,
            enabled: this.enabled,
            polarizationType: this.polarizationType,
            polarizationAngleDeg: this.polarizationAngleRad * 180 / Math.PI,
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter
        };
    }

    calculateRayColor() {
        const wl = this.wavelength;
        let r = 0, g = 0, b = 0;
        
        if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); b = 1.0; }
        else if (wl >= 440 && wl < 490) { g = (wl - 440) / (490 - 440); b = 1.0; }
        else if (wl >= 490 && wl < 510) { g = 1.0; b = -(wl - 510) / (510 - 490); }
        else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1.0; }
        else if (wl >= 580 && wl < 645) { r = 1.0; g = -(wl - 645) / (645 - 580); }
        else if (wl >= 645 && wl <= 750) { r = 1.0; }
        
        const f = 0.3 + 0.7 * Math.min(1, this.intensity);
        r = Math.min(255, Math.max(0, Math.round(r * 255 * f)));
        g = Math.min(255, Math.max(0, Math.round(g * 255 * f)));
        b = Math.min(255, Math.max(0, Math.round(b * 255 * f)));
        
        return `rgb(${r},${g},${b})`;
    }

    generateRays(RayClass) {
        const maxRays = (typeof window !== 'undefined' && window.maxRaysPerSource) 
            ? window.maxRaysPerSource : MAX_RAYS_PER_SOURCE;
        const actualRayCount = Math.min(this.rayCount, maxRays);
        
        if (!this.enabled || actualRayCount <= 0) return [];

        const rays = [];
        const intensityPerRay = this.intensity / actualRayCount;
        const halfFanAngleRad = this.fanAngleRad / 2;
        const startAngleRad = this.angleRad - halfFanAngleRad;
        const angleStep = actualRayCount > 1 ? this.fanAngleRad / (actualRayCount - 1) : 0;

        for (let i = 0; i < actualRayCount; i++) {
            const currentAngleRad = actualRayCount === 1 ? this.angleRad : startAngleRad + i * angleStep;
            const direction = Vector.fromAngle(currentAngleRad);
            const origin = this.pos.clone();

            try {
                const newRay = new RayClass(
                    origin, direction, this.wavelength, intensityPerRay,
                    0.0, 0, N_AIR, this.id, null, this.ignoreDecay, null, this.beamDiameter
                );

                this._applyPolarization(newRay);
                rays.push(newRay);
            } catch (e) {
                console.error(`FanSource (${this.id}) Error creating Ray:`, e);
            }
        }
        return rays;
    }

    _applyPolarization(ray) {
        switch (this.polarizationType) {
            case 'linear':
                ray.setLinearPolarization(this.polarizationAngleRad);
                break;
            case 'circular-right':
                ray.setCircularPolarization(true);
                break;
            case 'circular-left':
                ray.setCircularPolarization(false);
                break;
            case 'unpolarized':
            default:
                ray.setUnpolarized();
                break;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.enabled ? (this._rayColor || 'magenta') : 'dimgray';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        const radius = 20;
        const halfFanAngle = this.fanAngleRad / 2;
        const startAngle = this.angleRad - halfFanAngle;
        const endAngle = this.angleRad + halfFanAngle;
        
        ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(150, 150, 150, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.arc(this.pos.x, this.pos.y, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.stroke();
    }

    _containsPointBody(point) {
        if (!point || !(this.pos instanceof Vector)) return false;
        return point.distanceSquaredTo(this.pos) < 25;
    }

    getBoundingBox() {
        const radius = 25;
        return {
            x: this.pos.x - radius,
            y: this.pos.y - radius,
            width: radius * 2,
            height: radius * 2
        };
    }

    getProperties() {
        const props = {
            ...super.getProperties(),
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: this.intensity.toFixed(2), label: '强度', type: 'number', min: 0, max: 50, step: 0.1 },
            rayCount: { value: this.rayCount, label: '#射线', type: 'number', min: 1, max: 1001, step: 10 },
            fanAngleDeg: { value: (this.fanAngleRad * 180 / Math.PI).toFixed(1), label: '扇形角 (°)', type: 'number', min: 1, max: 360, step: 1 },
            polarizationType: {
                value: this.polarizationType || 'unpolarized',
                label: '偏振类型',
                type: 'select',
                options: [
                    { value: 'unpolarized', label: '非偏振光' },
                    { value: 'linear', label: '线偏振光' },
                    { value: 'circular-right', label: '右旋圆偏振' },
                    { value: 'circular-left', label: '左旋圆偏振' }
                ]
            },
            ignoreDecay: { value: !!this.ignoreDecay, label: '强度不衰减', type: 'checkbox' },
            beamDiameter: { value: this.beamDiameter.toFixed(1), label: '光束直径 (px)', type: 'number', min: 0, step: 0.5 },
        };

        if (this.polarizationType === 'linear') {
            props.polarizationAngleDeg = {
                value: (this.polarizationAngleRad * 180 / Math.PI).toFixed(1),
                label: '↳ 偏振角度 (°)',
                type: 'number',
                step: 1
            };
        }

        return props;
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetraceUpdate = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'enabled': this.enabled = !!value; needsRetraceUpdate = true; break;
            case 'wavelength': 
                this.wavelength = Math.max(380, Math.min(750, parseFloat(value))); 
                this._rayColor = this.calculateRayColor(); 
                needsRetraceUpdate = true; 
                break;
            case 'intensity': 
                this.intensity = Math.max(0, parseFloat(value)); 
                this._rayColor = this.calculateRayColor(); 
                needsRetraceUpdate = true; 
                break;
            case 'rayCount': this.rayCount = Math.max(1, parseInt(value)); needsRetraceUpdate = true; break;
            case 'fanAngleDeg': this.fanAngleRad = Math.max(1, parseFloat(value)) * Math.PI / 180; needsRetraceUpdate = true; break;
            case 'ignoreDecay': this.ignoreDecay = !!value; needsRetraceUpdate = true; break;
            case 'beamDiameter': this.beamDiameter = Math.max(0, parseFloat(value)); needsRetraceUpdate = true; break;
            case 'polarizationType':
                if (this.polarizationType !== value) {
                    this.polarizationType = value;
                    needsRetraceUpdate = true;
                    needsInspectorRefresh = true;
                }
                break;
            case 'polarizationAngleDeg':
                const newAngleDeg = parseFloat(value);
                if (!isNaN(newAngleDeg)) {
                    this.polarizationAngleRad = newAngleDeg * (Math.PI / 180);
                    needsRetraceUpdate = true;
                }
                break;
            default: return false;
        }

        if (needsRetraceUpdate && typeof window !== 'undefined') {
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
    window.FanSource = FanSource;
}
