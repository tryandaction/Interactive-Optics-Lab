/**
 * LineSource.js - 线光源
 * 沿线段分布发射多束光线，用于面源近似
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM, MAX_RAYS_PER_SOURCE } from '../../core/constants.js';

export class LineSource extends GameObject {
    static functionDescription = "沿线段分布发射多束光线，用于面源近似。";

    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 10.0, 
                rayCount = 201, length = 50, enabled = true, polarizationType = 'unpolarized', 
                polarizationAngleDeg = 0, ignoreDecay = false, beamDiameter = 1.0) {
        super(pos, angleDeg, "线光源");
        
        this.wavelength = wavelength;
        this.intensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount);
        this.length = Math.max(1, length);
        this.enabled = enabled;
        this.polarizationType = polarizationType;
        this.polarizationAngleRad = polarizationAngleDeg * (Math.PI / 180);
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = beamDiameter;

        this.p1 = this.pos.clone();
        this.p2 = this.pos.clone();
        this._rayColor = this.calculateRayColor();
        
        try { 
            this._updateGeometry(); 
        } catch (e) { 
            console.error("Init LineSource Geom Err:", e); 
        }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            wavelength: this.wavelength,
            intensity: this.intensity,
            rayCount: this.rayCount,
            length: this.length,
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

    _updateGeometry() {
        if (!(this.pos instanceof Vector) || typeof this.angleRad !== 'number' || typeof this.length !== 'number') return;
        const lineDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = lineDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
    }

    onAngleChanged() { 
        try { this._updateGeometry(); } catch (e) { console.error("LineSource AngleChange Err:", e); } 
    }
    
    onPositionChanged() { 
        try { this._updateGeometry(); } catch (e) { console.error("LineSource PosChange Err:", e); } 
    }

    generateRays(RayClass) {
        const maxRays = (typeof window !== 'undefined' && window.maxRaysPerSource) 
            ? window.maxRaysPerSource : MAX_RAYS_PER_SOURCE;
        const actualRayCount = Math.min(this.rayCount, maxRays);
        
        if (!this.enabled || actualRayCount <= 0 || !this.p1 || !this.p2 || isNaN(this.p1.x)) {
            return [];
        }

        const rays = [];
        const intensityPerRay = this.intensity / actualRayCount;
        const emissionAngleRad = this.angleRad + Math.PI / 2;
        const emissionDirection = Vector.fromAngle(emissionAngleRad);
        const numSegments = actualRayCount > 1 ? actualRayCount - 1 : 1;

        for (let i = 0; i < actualRayCount; i++) {
            const t = actualRayCount === 1 ? 0.5 : i / numSegments;
            const origin = Vector.lerp(this.p1, this.p2, t);

            try {
                const newRay = new RayClass(
                    origin, emissionDirection.clone(), this.wavelength, intensityPerRay,
                    0.0, 0, N_AIR, this.id, null, this.ignoreDecay, null, this.beamDiameter
                );

                this._applyPolarization(newRay);
                rays.push(newRay);
            } catch (e) {
                console.error(`LineSource (${this.id}) Error creating Ray:`, e);
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
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        
        ctx.strokeStyle = this.enabled ? (this._rayColor || 'magenta') : 'dimgray';
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        ctx.fillStyle = this.selected ? 'yellow' : ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 3, 0, 2 * Math.PI);
        ctx.fill();
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
        
        return point.distanceSquaredTo(closestPoint) < 25;
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        
        return { 
            x: minX - buffer, 
            y: minY - buffer, 
            width: (maxX - minX) + 2 * buffer, 
            height: (maxY - minY) + 2 * buffer 
        };
    }

    getProperties() {
        const props = {
            ...super.getProperties(),
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: this.intensity.toFixed(2), label: '强度', type: 'number', min: 0, max: 50, step: 0.1 },
            rayCount: { value: this.rayCount, label: '#射线', type: 'number', min: 1, max: 1001, step: 10 },
            length: { value: this.length.toFixed(1), label: '长度', type: 'number', min: 1, max: 1000, step: 1 },
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
        let needsGeomUpdate = false;

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
            case 'length': this.length = Math.max(1, parseFloat(value)); needsGeomUpdate = true; break;
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

        if (needsGeomUpdate) {
            this._updateGeometry();
        }
        if (needsRetraceUpdate || needsGeomUpdate) {
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
    window.LineSource = LineSource;
}
