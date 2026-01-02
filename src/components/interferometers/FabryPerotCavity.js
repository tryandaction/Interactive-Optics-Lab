/**
 * FabryPerotCavity.js - 法布里-珀罗腔
 * 光学谐振腔，使用Airy函数计算透射
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class FabryPerotCavity extends OpticalComponent {
    static functionDescription = "法布里-珀罗光学谐振腔，具有波长选择性透射。";

    constructor(pos, length = 80, height = 40, angleDeg = 0, cavityLength = 10, 
                mirrorReflectivity = 0.9) {
        super(pos, angleDeg, "法布里-珀罗腔");
        this.length = Math.max(20, length); // Physical length for drawing
        this.height = Math.max(20, height);
        this.cavityLength = Math.max(0.1, cavityLength); // Optical cavity length in mm
        this.mirrorReflectivity = Math.max(0.1, Math.min(0.999, mirrorReflectivity));
        
        // Geometry cache
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            height: this.height,
            cavityLength: this.cavityLength,
            mirrorReflectivity: this.mirrorReflectivity
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { /* No geometry update needed */ }

    /**
     * Calculate finesse of the cavity
     * F = π√R / (1-R)
     */
    getFinesse() {
        const R = this.mirrorReflectivity;
        return (Math.PI * Math.sqrt(R)) / (1 - R);
    }

    /**
     * Calculate free spectral range (FSR) in nm
     * FSR = λ² / (2nL) where n=1 for air
     * For wavelength in nm and L in mm: FSR = λ² / (2 * L * 1e6)
     */
    getFSR(wavelengthNm = 550) {
        const L_nm = this.cavityLength * 1e6; // Convert mm to nm
        return (wavelengthNm * wavelengthNm) / (2 * L_nm);
    }

    /**
     * Calculate linewidth (FWHM) in nm
     * Δλ = FSR / F
     */
    getLinewidth(wavelengthNm = 550) {
        return this.getFSR(wavelengthNm) / this.getFinesse();
    }

    /**
     * Calculate transmission using Airy function
     * T = 1 / (1 + F * sin²(δ/2))
     * where δ = 4πnL/λ and F = 4R/(1-R)²
     * @param {number} wavelengthNm - Wavelength in nm
     * @returns {number} Transmission (0-1)
     */
    getTransmission(wavelengthNm) {
        const R = this.mirrorReflectivity;
        const L_nm = this.cavityLength * 1e6; // Convert mm to nm
        
        // Phase difference for round trip
        const delta = (4 * Math.PI * L_nm) / wavelengthNm;
        
        // Coefficient of finesse
        const F = (4 * R) / Math.pow(1 - R, 2);
        
        // Airy function
        const sinHalfDelta = Math.sin(delta / 2);
        const transmission = 1 / (1 + F * sinHalfDelta * sinHalfDelta);
        
        return transmission;
    }

    /**
     * Find resonance wavelengths near a given wavelength
     * Resonance when δ = 2πm, i.e., λ = 2nL/m
     */
    getResonanceWavelengths(centerWavelengthNm, numResonances = 3) {
        const L_nm = this.cavityLength * 1e6;
        const m_center = Math.round((2 * L_nm) / centerWavelengthNm);
        
        const resonances = [];
        for (let i = -numResonances; i <= numResonances; i++) {
            const m = m_center + i;
            if (m > 0) {
                resonances.push((2 * L_nm) / m);
            }
        }
        return resonances.filter(wl => wl > 300 && wl < 1000);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfLength = this.length / 2;
        const halfHeight = this.height / 2;

        // Draw cavity body
        ctx.fillStyle = 'rgba(100, 150, 200, 0.2)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#6090C0';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfLength, -halfHeight, this.length, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw mirrors (curved to indicate high reflectivity)
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 3;
        
        // Left mirror
        ctx.beginPath();
        ctx.moveTo(-halfLength, -halfHeight);
        ctx.quadraticCurveTo(-halfLength + 5, 0, -halfLength, halfHeight);
        ctx.stroke();
        
        // Right mirror
        ctx.beginPath();
        ctx.moveTo(halfLength, -halfHeight);
        ctx.quadraticCurveTo(halfLength - 5, 0, halfLength, halfHeight);
        ctx.stroke();

        // Draw internal reflections indication
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 1;
        const numBounces = 5;
        for (let i = 0; i < numBounces; i++) {
            const y = (i - (numBounces - 1) / 2) * (halfHeight * 0.3);
            ctx.beginPath();
            ctx.moveTo(-halfLength + 5, y);
            for (let j = 0; j < 4; j++) {
                const x = -halfLength + 5 + (j + 1) * (this.length - 10) / 4;
                const yOffset = (j % 2 === 0) ? y + 3 : y - 3;
                ctx.lineTo(x, yOffset);
            }
            ctx.stroke();
        }

        // Draw labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FP', 0, 4);
        
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
        ctx.fillText(`R=${(this.mirrorReflectivity * 100).toFixed(0)}%`, 0, halfHeight + 12);
        ctx.fillText(`L=${this.cavityLength.toFixed(1)}mm`, 0, -halfHeight - 5);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 15;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const w = this.length * cosA + this.height * sinA;
        const h = this.length * sinA + this.height * cosA;
        return {
            x: this.pos.x - w / 2 - buffer,
            y: this.pos.y - h / 2 - buffer,
            width: w + 2 * buffer,
            height: h + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        const local = point.subtract(this.pos);
        const x = local.dot(this.axisDirection);
        const y = local.dot(this.perpDirection);
        return Math.abs(x) <= this.length / 2 + 5 && Math.abs(y) <= this.height / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with entry face
        const entryCenter = this.pos.subtract(this.axisDirection.multiply(this.length / 2));
        const denom = rayDirection.dot(this.axisDirection);
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = entryCenter.subtract(rayOrigin).dot(this.axisDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const localHit = hitPoint.subtract(entryCenter);
        const perpDist = Math.abs(localHit.dot(this.perpDirection));
        
        if (perpDist > this.height / 2) return [];
        
        let normal = this.axisDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'entry'
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        
        // Calculate transmission using Airy function
        const transmission = this.getTransmission(ray.wavelengthNm);
        const outputIntensity = ray.intensity * transmission;
        
        // Calculate phase shift (resonant light has specific phase)
        const L_nm = this.cavityLength * 1e6;
        const delta = (4 * Math.PI * L_nm) / ray.wavelengthNm;
        const phaseShift = delta % (2 * Math.PI);
        
        // Exit point
        const exitPoint = this.pos.add(this.axisDirection.multiply(this.length / 2));
        const newOrigin = exitPoint.add(incidentDirection.multiply(1e-6));
        
        let transmittedRay = null;
        if (outputIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            try {
                transmittedRay = new RayClass(
                    newOrigin, incidentDirection, ray.wavelengthNm,
                    outputIntensity, ray.phase + phaseShift, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([hitPoint.clone(), newOrigin.clone()]),
                    ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in FabryPerotCavity:`, e); }
        }

        ray.terminate('fp_cavity');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        const finesse = this.getFinesse();
        const fsr = this.getFSR(550);
        const linewidth = this.getLinewidth(550);
        
        return {
            ...super.getProperties(),
            length: { value: this.length.toFixed(1), label: '物理长度', type: 'number', min: 20, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 5 },
            cavityLength: { 
                value: this.cavityLength.toFixed(3), 
                label: '腔长 (mm)', 
                type: 'number', 
                min: 0.1, 
                max: 1000, 
                step: 0.1 
            },
            mirrorReflectivity: { 
                value: this.mirrorReflectivity.toFixed(3), 
                label: '镜面反射率', 
                type: 'number', 
                min: 0.1, 
                max: 0.999, 
                step: 0.01 
            },
            finesse: { 
                value: finesse.toFixed(1), 
                label: '精细度 (F)', 
                type: 'text', 
                readonly: true 
            },
            fsr: { 
                value: fsr.toFixed(4) + ' nm', 
                label: '自由光谱范围 (FSR)', 
                type: 'text', 
                readonly: true,
                title: '在550nm处计算'
            },
            linewidth: { 
                value: (linewidth * 1000).toFixed(3) + ' pm', 
                label: '线宽 (FWHM)', 
                type: 'text', 
                readonly: true,
                title: '在550nm处计算'
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 20) { this.length = l; needsRetrace = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsRetrace = true; }
                break;
            case 'cavityLength':
                const cl = parseFloat(value);
                if (!isNaN(cl) && cl >= 0.1) { 
                    this.cavityLength = cl; 
                    needsRetrace = true; 
                    needsInspectorRefresh = true;
                }
                break;
            case 'mirrorReflectivity':
                const mr = parseFloat(value);
                if (!isNaN(mr)) { 
                    this.mirrorReflectivity = Math.max(0.1, Math.min(0.999, mr)); 
                    needsRetrace = true; 
                    needsInspectorRefresh = true;
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
    window.FabryPerotCavity = FabryPerotCavity;
}
