/**
 * PointSource.js - 点光源
 * 向所有方向均匀发射光线的全向光源
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM } from '../../core/constants.js';

export class PointSource extends GameObject {
    static functionDescription = "向所有方向均匀发射光线的全向点光源。";

    constructor(pos, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 1.0, 
                numRays = 36, angularRangeDeg = 360, enabled = true) {
        super(pos, 0, "点光源");
        
        this.wavelength = wavelength ?? DEFAULT_WAVELENGTH_NM;
        this.intensity = Math.max(0, intensity ?? 1.0);
        this.numRays = Math.max(1, numRays ?? 36);
        this.angularRangeDeg = Math.max(0, Math.min(360, angularRangeDeg ?? 360));
        this.enabled = enabled ?? true;
        
        this._rayColor = this.calculateRayColor();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            wavelength: this.wavelength,
            intensity: this.intensity,
            numRays: this.numRays,
            angularRangeDeg: this.angularRangeDeg,
            enabled: this.enabled
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
        if (!this.enabled || this.numRays <= 0) return [];

        const rays = [];
        const intensityPerRay = this.intensity / this.numRays;
        const angularRangeRad = this.angularRangeDeg * (Math.PI / 180);
        
        // Start angle is centered around the component's angle
        const startAngle = this.angleRad - angularRangeRad / 2;
        const angleStep = this.numRays > 1 ? angularRangeRad / this.numRays : 0;

        for (let i = 0; i < this.numRays; i++) {
            // Distribute rays uniformly within the angular range
            const angle = startAngle + (i + 0.5) * angleStep;
            const direction = Vector.fromAngle(angle);
            const origin = this.pos.clone();

            try {
                const newRay = new RayClass(
                    origin, direction, this.wavelength, intensityPerRay,
                    0.0, 0, N_AIR, this.id, null, false, null, 1.0, null, null
                );
                rays.push(newRay);
            } catch (e) {
                console.error(`PointSource (${this.id}) Error creating Ray:`, e);
            }
        }
        return rays;
    }

    draw(ctx) {
        const radius = 8;
        
        // Draw outer circle
        ctx.fillStyle = this.enabled ? this._rayColor : 'dimgray';
        ctx.strokeStyle = this.selected ? 'yellow' : (this.enabled ? 'white' : '#555');
        ctx.lineWidth = this.selected ? 2 : 1;
        
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw rays emanating from center (visual indicator)
        if (this.enabled) {
            ctx.strokeStyle = this._rayColor;
            ctx.lineWidth = 1;
            const numIndicatorRays = 8;
            for (let i = 0; i < numIndicatorRays; i++) {
                const angle = (i / numIndicatorRays) * Math.PI * 2;
                const innerRadius = radius + 2;
                const outerRadius = radius + 6;
                const start = this.pos.add(Vector.fromAngle(angle).multiply(innerRadius));
                const end = this.pos.add(Vector.fromAngle(angle).multiply(outerRadius));
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        }
    }

    _containsPointBody(point) {
        const radius = 10;
        return point.distanceSquaredTo(this.pos) < radius * radius;
    }

    getBoundingBox() {
        const size = 20;
        return {
            x: this.pos.x - size / 2,
            y: this.pos.y - size / 2,
            width: size,
            height: size
        };
    }

    getProperties() {
        const intensity = Number(this.intensity) || 1.0;
        
        return {
            ...super.getProperties(),
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength || 550, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: intensity.toFixed(2), label: '总强度', type: 'number', min: 0, max: 30, step: 0.1 },
            numRays: { value: this.numRays || 36, label: '#射线', type: 'number', min: 1, max: 360, step: 1 },
            angularRangeDeg: { value: this.angularRangeDeg || 360, label: '发射角度范围 (°)', type: 'number', min: 0, max: 360, step: 1 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetraceUpdate = false;

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
            case 'numRays': this.numRays = Math.max(1, parseInt(value)); needsRetraceUpdate = true; break;
            case 'angularRangeDeg': this.angularRangeDeg = Math.max(0, Math.min(360, parseFloat(value))); needsRetraceUpdate = true; break;
            default: return false;
        }

        if (needsRetraceUpdate && typeof window !== 'undefined') {
            window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.PointSource = PointSource;
}
