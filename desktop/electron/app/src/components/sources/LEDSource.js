/**
 * LEDSource.js - LED光源
 * 发射具有高斯光谱分布的非相干光
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM } from '../../core/constants.js';

export class LEDSource extends GameObject {
    static functionDescription = "发射具有高斯光谱分布的非相干LED光源。";

    constructor(pos, angleDeg = 0, centerWavelength = DEFAULT_WAVELENGTH_NM, fwhm = 30, 
                intensity = 1.0, numRays = 10, spreadDeg = 30, enabled = true) {
        super(pos, angleDeg, "LED光源");
        
        this.centerWavelength = Math.max(380, Math.min(750, centerWavelength ?? DEFAULT_WAVELENGTH_NM));
        this.fwhm = Math.max(1, Math.min(200, fwhm ?? 30)); // Full Width at Half Maximum in nm
        this.intensity = Math.max(0, intensity ?? 1.0);
        this.numRays = Math.max(1, numRays ?? 10);
        this.spreadRad = (spreadDeg ?? 30) * (Math.PI / 180);
        this.enabled = enabled ?? true;
        
        this._rayColor = this.calculateRayColor();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            centerWavelength: this.centerWavelength,
            fwhm: this.fwhm,
            intensity: this.intensity,
            numRays: this.numRays,
            spreadDeg: this.spreadRad * (180 / Math.PI),
            enabled: this.enabled
        };
    }

    calculateRayColor() {
        const wl = this.centerWavelength;
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

    /**
     * Generate a wavelength from Gaussian distribution
     * FWHM = 2 * sqrt(2 * ln(2)) * sigma ≈ 2.355 * sigma
     */
    _sampleGaussianWavelength() {
        const sigma = this.fwhm / 2.355;
        // Box-Muller transform for Gaussian random
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const wavelength = this.centerWavelength + z * sigma;
        // Clamp to visible range
        return Math.max(380, Math.min(750, wavelength));
    }

    generateRays(RayClass) {
        if (!this.enabled || this.numRays <= 0) return [];

        const rays = [];
        const intensityPerRay = this.intensity / this.numRays;
        const halfSpreadRad = this.spreadRad / 2;
        const startAngle = this.angleRad - halfSpreadRad;
        const angleStep = (this.numRays > 1 && this.spreadRad > 1e-9) 
            ? this.spreadRad / (this.numRays - 1) : 0;

        for (let i = 0; i < this.numRays; i++) {
            const angle = (this.numRays === 1) ? this.angleRad : startAngle + i * angleStep;
            const direction = Vector.fromAngle(angle);
            const origin = this.pos.clone();
            
            // Sample wavelength from Gaussian distribution
            const wavelength = this._sampleGaussianWavelength();
            // Random phase for incoherent light
            const randomPhase = Math.random() * 2 * Math.PI;

            try {
                const newRay = new RayClass(
                    origin, direction, wavelength, intensityPerRay,
                    randomPhase, 0, N_AIR, this.id, null, false, null, 1.0, null, null
                );
                // LED light is unpolarized
                newRay.setUnpolarized();
                rays.push(newRay);
            } catch (e) {
                console.error(`LEDSource (${this.id}) Error creating Ray:`, e);
            }
        }
        return rays;
    }

    draw(ctx) {
        const size = 14;
        const halfWidth = size * 0.5;
        const halfHeight = size * 0.35;
        
        // LED body (rounded rectangle shape)
        ctx.fillStyle = this.enabled ? this._rayColor : 'dimgray';
        ctx.strokeStyle = this.selected ? 'yellow' : (this.enabled ? 'white' : '#555');
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);
        
        // Draw LED dome shape
        ctx.beginPath();
        ctx.moveTo(-halfWidth, -halfHeight);
        ctx.lineTo(-halfWidth, halfHeight);
        ctx.lineTo(halfWidth * 0.3, halfHeight);
        ctx.arc(halfWidth * 0.3, 0, halfHeight, Math.PI / 2, -Math.PI / 2, true);
        ctx.lineTo(-halfWidth, -halfHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw emission indicator lines
        if (this.enabled) {
            ctx.strokeStyle = this._rayColor;
            ctx.lineWidth = 1;
            const numLines = 3;
            for (let i = 0; i < numLines; i++) {
                const spreadAngle = ((i - 1) / 2) * (this.spreadRad * 0.5);
                const startX = halfWidth * 0.5;
                const endX = halfWidth * 0.5 + 8;
                const endY = Math.tan(spreadAngle) * 8;
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }

    _containsPointBody(point) {
        const bounds = this.getBoundingBox();
        if (!bounds) return false;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }

    getBoundingBox() {
        const size = 18;
        return {
            x: this.pos.x - size / 2,
            y: this.pos.y - size / 2,
            width: size,
            height: size
        };
    }

    getProperties() {
        const intensity = Number(this.intensity) || 1.0;
        const spreadDeg = Number(this.spreadRad) * 180 / Math.PI || 30;
        
        return {
            ...super.getProperties(),
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            centerWavelength: { value: this.centerWavelength || 550, label: '中心波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            fwhm: { value: this.fwhm || 30, label: '光谱半高宽 FWHM (nm)', type: 'number', min: 1, max: 200, step: 1 },
            intensity: { value: intensity.toFixed(2), label: '强度', type: 'number', min: 0, max: 30, step: 0.1 },
            numRays: { value: this.numRays || 10, label: '#射线', type: 'number', min: 1, max: 100, step: 1 },
            spreadDeg: { value: spreadDeg.toFixed(1), label: '发散角 (°)', type: 'number', min: 0, max: 180, step: 1 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetraceUpdate = false;

        switch (propName) {
            case 'enabled': this.enabled = !!value; needsRetraceUpdate = true; break;
            case 'centerWavelength': 
                this.centerWavelength = Math.max(380, Math.min(750, parseFloat(value))); 
                this._rayColor = this.calculateRayColor(); 
                needsRetraceUpdate = true; 
                break;
            case 'fwhm':
                this.fwhm = Math.max(1, Math.min(200, parseFloat(value)));
                needsRetraceUpdate = true;
                break;
            case 'intensity': 
                this.intensity = Math.max(0, parseFloat(value)); 
                this._rayColor = this.calculateRayColor(); 
                needsRetraceUpdate = true; 
                break;
            case 'numRays': this.numRays = Math.max(1, parseInt(value)); needsRetraceUpdate = true; break;
            case 'spreadDeg': this.spreadRad = Math.max(0, parseFloat(value)) * Math.PI / 180; needsRetraceUpdate = true; break;
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
    window.LEDSource = LEDSource;
}
