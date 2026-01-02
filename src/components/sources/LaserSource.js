/**
 * LaserSource.js - 激光光源
 * 发射一束或多束具有特定波长和强度的相干光
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM } from '../../core/constants.js';

export class LaserSource extends GameObject {
    static functionDescription = "发射一束或多束具有特定波长和强度的相干光。";

    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 1.0, 
                numRays = 1, spreadDeg = 0, enabled = true, polarizationType = 'unpolarized', 
                polarizationAngleDeg = 0, ignoreDecay = false, beamDiameter = 10.0, 
                initialBeamWaist = 5.0) {
        super(pos, angleDeg, "激光");
        
        this.wavelength = wavelength ?? DEFAULT_WAVELENGTH_NM;
        this.intensity = Math.max(0, intensity ?? 1.0);
        this.numRays = Math.max(1, numRays ?? 1);
        this.spreadRad = (spreadDeg ?? 0) * (Math.PI / 180);
        this.enabled = enabled ?? true;
        this.polarizationType = polarizationType ?? 'unpolarized';
        this.polarizationAngleRad = (polarizationAngleDeg ?? 0) * (Math.PI / 180);
        this.ignoreDecay = ignoreDecay ?? false;
        this.gaussianEnabled = true;
        this.beamDiameter = beamDiameter ?? 10.0;
        this.initialBeamWaist = initialBeamWaist ?? 5.0;
        
        this._rayColor = this.calculateRayColor();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            wavelength: this.wavelength,
            intensity: this.intensity,
            numRays: this.numRays,
            spreadDeg: this.spreadRad * (180 / Math.PI),
            enabled: this.enabled,
            polarizationType: this.polarizationType,
            polarizationAngleDeg: this.polarizationAngleRad * (180 / Math.PI),
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter,
            initialBeamWaist: this.initialBeamWaist,
            gaussianEnabled: this.gaussianEnabled
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
        const halfSpreadRad = this.spreadRad / 2;
        const startAngle = this.angleRad - halfSpreadRad;
        const angleStep = (this.numRays > 1 && this.spreadRad > 1e-9) 
            ? this.spreadRad / (this.numRays - 1) : 0;

        for (let i = 0; i < this.numRays; i++) {
            const angle = (this.numRays === 1) ? this.angleRad : startAngle + i * angleStep;
            const direction = Vector.fromAngle(angle);
            const origin = this.pos.clone();
            
            let useGaussian = this.gaussianEnabled && this.initialBeamWaist > 1e-6;
            let rayBeamWaist = useGaussian ? this.initialBeamWaist : null;
            let rayZR = null;
            
            if (useGaussian) {
                const lambda_meters = this.wavelength * 1e-9;
                rayZR = (Math.PI * rayBeamWaist * rayBeamWaist) / lambda_meters;
                if (isNaN(rayZR)) useGaussian = false;
            }

            try {
                const newRay = new RayClass(
                    origin, direction, this.wavelength, intensityPerRay,
                    0.0, 0, N_AIR, this.id, null, this.ignoreDecay, null,
                    this.beamDiameter,
                    useGaussian ? rayBeamWaist : null,
                    useGaussian ? rayZR : null
                );

                this._applyPolarization(newRay);
                rays.push(newRay);
            } catch (e) {
                console.error(`LaserSource (${this.id}) Error creating Ray:`, e);
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
        const size = 12;
        const halfHeight = size * 0.4;
        const p1 = this.pos.add(Vector.fromAngle(this.angleRad + Math.PI).multiply(size * 0.6));
        const p2 = this.pos.add(Vector.fromAngle(this.angleRad + Math.PI / 2).multiply(halfHeight));
        const p3 = this.pos.add(Vector.fromAngle(this.angleRad - Math.PI / 2).multiply(halfHeight));
        const p4 = this.pos.add(Vector.fromAngle(this.angleRad).multiply(size * 0.8));

        ctx.fillStyle = this.enabled ? this._rayColor : 'dimgray';
        ctx.strokeStyle = this.selected ? 'yellow' : (this.enabled ? 'white' : '#555');
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    _containsPointBody(point) {
        const bounds = this.getBoundingBox();
        if (!bounds) return false;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }

    getBoundingBox() {
        const size = 15;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const width = size * cosA + size * 0.8 * sinA;
        const height = size * sinA + size * 0.8 * cosA;
        return {
            x: this.pos.x - width / 2,
            y: this.pos.y - height / 2,
            width, height
        };
    }

    getProperties() {
        // 强制转换为数字，防止 undefined/null/string 导致 toFixed 报错
        const intensity = Number(this.intensity) || 1.0;
        const spreadDeg = Number(this.spreadRad) * 180 / Math.PI || 0;
        const beamWaist = Number(this.initialBeamWaist) || 5.0;
        const diameter = Number(this.beamDiameter) || 10.0;
        const polAngle = Number(this.polarizationAngleRad) * 180 / Math.PI || 0;
        
        const props = {
            ...super.getProperties(),
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength || 550, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: intensity.toFixed(2), label: '强度', type: 'number', min: 0, max: 30, step: 0.1 },
            numRays: { value: this.numRays || 1, label: '#射线', type: 'number', min: 1, max: 501, step: 1 },
            spreadDeg: { value: spreadDeg.toFixed(1), label: '发散角 (°)', type: 'number', min: 0, max: 90, step: 1 },
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
            gaussianEnabled: { value: !!this.gaussianEnabled, label: '高斯光束模式', type: 'checkbox' },
        };

        if (this.polarizationType === 'linear') {
            props.polarizationAngleDeg = {
                value: polAngle.toFixed(1),
                label: '↳ 偏振角度 (°)',
                type: 'number',
                step: 1
            };
        }

        if (this.gaussianEnabled) {
            props.initialBeamWaist = {
                value: beamWaist.toFixed(2),
                label: '↳ 腰半径 w₀ (px)',
                type: 'number',
                min: 0.1,
                step: 0.1
            };
        } else {
            props.beamDiameter = {
                value: diameter.toFixed(1),
                label: '光束直径 (px)',
                type: 'number',
                min: 0,
                step: 0.5
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
            case 'numRays': this.numRays = Math.max(1, parseInt(value)); needsRetraceUpdate = true; break;
            case 'spreadDeg': this.spreadRad = Math.max(0, parseFloat(value)) * Math.PI / 180; needsRetraceUpdate = true; break;
            case 'ignoreDecay': this.ignoreDecay = !!value; needsRetraceUpdate = true; break;
            case 'gaussianEnabled': this.gaussianEnabled = !!value; needsInspectorRefresh = true; needsRetraceUpdate = true; break;
            case 'initialBeamWaist': this.initialBeamWaist = Math.max(0.1, parseFloat(value)); needsRetraceUpdate = true; break;
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
    window.LaserSource = LaserSource;
}
