/**
 * ElectroOpticModulator.js - 电光调制器 (EOM)
 * 通过电压控制光的相位或强度
 * 相位调制: Δφ = π * V / Vπ
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class ElectroOpticModulator extends OpticalComponent {
    static functionDescription = "通过电压控制光相位或强度的电光调制器。";

    constructor(pos, width = 60, height = 30, angleDeg = 0, modulationType = 'phase', 
                halfWaveVoltage = 100) {
        super(pos, angleDeg, "电光调制器");
        this.width = Math.max(20, width);
        this.height = Math.max(15, height);
        this.modulationType = modulationType; // 'phase' or 'amplitude'
        this.halfWaveVoltage = Math.max(1, halfWaveVoltage); // Vπ in volts
        this.appliedVoltage = 0; // Current applied voltage
        this.modulationFrequency = 0; // Modulation frequency in Hz (0 = DC)
        this.quality = 0.98;
        
        // Geometry cache
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            modulationType: this.modulationType,
            halfWaveVoltage: this.halfWaveVoltage,
            appliedVoltage: this.appliedVoltage,
            modulationFrequency: this.modulationFrequency,
            quality: this.quality
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { /* No geometry update needed */ }

    /**
     * Calculate phase shift based on applied voltage
     * Δφ = π * V / Vπ
     */
    getPhaseShift() {
        return Math.PI * this.appliedVoltage / this.halfWaveVoltage;
    }

    /**
     * Calculate intensity transmission for amplitude modulation
     * Uses Mach-Zehnder configuration: T = cos²(Δφ/2)
     */
    getIntensityTransmission() {
        const phaseShift = this.getPhaseShift();
        return Math.pow(Math.cos(phaseShift / 2), 2);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw EOM body
        const isPhaseMode = this.modulationType === 'phase';
        ctx.fillStyle = isPhaseMode ? 'rgba(100, 150, 255, 0.3)' : 'rgba(255, 150, 100, 0.3)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : (isPhaseMode ? '#6090FF' : '#FF9060');
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw crystal symbol inside
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Draw crystal lattice pattern
        const crystalSize = Math.min(halfWidth, halfHeight) * 0.6;
        ctx.beginPath();
        ctx.moveTo(-crystalSize, -crystalSize);
        ctx.lineTo(crystalSize, -crystalSize);
        ctx.lineTo(crystalSize, crystalSize);
        ctx.lineTo(-crystalSize, crystalSize);
        ctx.closePath();
        ctx.stroke();
        
        // Diagonal lines for crystal
        ctx.beginPath();
        ctx.moveTo(-crystalSize, -crystalSize);
        ctx.lineTo(crystalSize, crystalSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(crystalSize, -crystalSize);
        ctx.lineTo(-crystalSize, crystalSize);
        ctx.stroke();

        // Draw electrode indicators
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-halfWidth - 3, -halfHeight * 0.6, 3, halfHeight * 1.2);
        ctx.fillRect(halfWidth, -halfHeight * 0.6, 3, halfHeight * 1.2);

        // Draw voltage indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`V=${this.appliedVoltage.toFixed(0)}`, 0, halfHeight + 12);

        // Draw mode label
        ctx.font = '7px Arial';
        ctx.fillText(isPhaseMode ? 'φ-mod' : 'I-mod', 0, -halfHeight - 5);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 15;
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
        if (!point) return false;
        const local = point.subtract(this.pos);
        const x = local.dot(this.axisDirection);
        const y = local.dot(this.perpDirection);
        return Math.abs(x) <= this.width / 2 + 5 && Math.abs(y) <= this.height / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with entry face
        const entryCenter = this.pos.subtract(this.axisDirection.multiply(this.width / 2));
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
        
        // Ensure ray has Jones vector for polarization-dependent modulation
        ray.ensureJonesVector();
        
        let outputIntensity = ray.intensity * this.quality;
        let outputPhase = ray.phase;
        let outputJones = ray.jones ? { ...ray.jones } : null;
        
        if (this.modulationType === 'phase') {
            // Phase modulation: add phase shift
            const phaseShift = this.getPhaseShift();
            outputPhase = ray.phase + phaseShift;
            
            // Apply phase to Jones vector if present
            if (outputJones) {
                const cosP = Math.cos(phaseShift);
                const sinP = Math.sin(phaseShift);
                // Apply phase rotation to both components
                outputJones = {
                    Ex: {
                        re: outputJones.Ex.re * cosP - outputJones.Ex.im * sinP,
                        im: outputJones.Ex.re * sinP + outputJones.Ex.im * cosP
                    },
                    Ey: {
                        re: outputJones.Ey.re * cosP - outputJones.Ey.im * sinP,
                        im: outputJones.Ey.re * sinP + outputJones.Ey.im * cosP
                    }
                };
            }
        } else {
            // Amplitude modulation: modify intensity
            const transmission = this.getIntensityTransmission();
            outputIntensity = ray.intensity * transmission * this.quality;
        }
        
        // Exit point
        const exitPoint = this.pos.add(this.axisDirection.multiply(this.width / 2));
        const newOrigin = exitPoint.add(incidentDirection.multiply(1e-6));
        
        let transmittedRay = null;
        if (outputIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            try {
                transmittedRay = new RayClass(
                    newOrigin, incidentDirection, ray.wavelengthNm,
                    outputIntensity, outputPhase, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([hitPoint.clone(), newOrigin.clone()]),
                    ray.beamDiameter
                );
                
                // Set Jones vector if we modified it
                if (outputJones) {
                    transmittedRay.setJones(outputJones);
                }
            } catch (e) { console.error(`Error creating transmitted Ray in EOM:`, e); }
        }

        ray.terminate('modulated_eom');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        const phaseShift = this.getPhaseShift();
        const transmission = this.getIntensityTransmission();
        
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 15, step: 5 },
            modulationType: {
                value: this.modulationType,
                label: '调制类型',
                type: 'select',
                options: [
                    { value: 'phase', label: '相位调制' },
                    { value: 'amplitude', label: '强度调制' }
                ]
            },
            halfWaveVoltage: { 
                value: this.halfWaveVoltage.toFixed(1), 
                label: '半波电压 Vπ (V)', 
                type: 'number', 
                min: 1, 
                step: 10 
            },
            appliedVoltage: { 
                value: this.appliedVoltage.toFixed(1), 
                label: '施加电压 (V)', 
                type: 'number', 
                step: 1 
            },
            modulationFrequency: { 
                value: this.modulationFrequency.toExponential(2), 
                label: '调制频率 (Hz)', 
                type: 'number', 
                min: 0, 
                step: 1000 
            },
            phaseShiftDisplay: { 
                value: (phaseShift / Math.PI).toFixed(3) + 'π rad', 
                label: '相位偏移', 
                type: 'text', 
                readonly: true 
            },
            transmissionDisplay: { 
                value: (transmission * 100).toFixed(1) + '%', 
                label: '透过率 (强度调制)', 
                type: 'text', 
                readonly: true 
            },
            quality: { value: this.quality.toFixed(2), label: '光学透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsRetrace = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 15) { this.height = h; needsRetrace = true; }
                break;
            case 'modulationType':
                if (value === 'phase' || value === 'amplitude') {
                    this.modulationType = value;
                    needsRetrace = true;
                    needsInspectorRefresh = true;
                }
                break;
            case 'halfWaveVoltage':
                const vpi = parseFloat(value);
                if (!isNaN(vpi) && vpi >= 1) { 
                    this.halfWaveVoltage = vpi; 
                    needsRetrace = true; 
                    needsInspectorRefresh = true; 
                }
                break;
            case 'appliedVoltage':
                const v = parseFloat(value);
                if (!isNaN(v)) { 
                    this.appliedVoltage = v; 
                    needsRetrace = true; 
                    needsInspectorRefresh = true; 
                }
                break;
            case 'modulationFrequency':
                const f = parseFloat(value);
                if (!isNaN(f) && f >= 0) { this.modulationFrequency = f; }
                break;
            case 'quality':
                const q = parseFloat(value);
                if (!isNaN(q)) { this.quality = Math.max(0.1, Math.min(1.0, q)); needsRetrace = true; }
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
    window.ElectroOpticModulator = ElectroOpticModulator;
}
