/**
 * PulsedLaserSource.js - 脉冲激光源
 * 发射具有脉冲特性的激光，支持脉冲宽度、重复频率和峰值功率参数
 */

import { Vector } from '../../core/Vector.js';
import { LaserSource } from './LaserSource.js';

export class PulsedLaserSource extends LaserSource {
    static functionDescription = "发射具有脉冲特性的激光，支持脉冲宽度、重复频率和峰值功率参数。";

    constructor(pos, angleDeg = 0, wavelength = 1064, peakPower = 1.0, 
                pulseWidthFs = 100, repetitionRateHz = 1e6, numRays = 1, 
                spreadDeg = 0, enabled = true) {
        // Call parent constructor with peak power as intensity
        super(pos, angleDeg, wavelength, peakPower, numRays, spreadDeg, enabled, 
              'unpolarized', 0, false, 10.0, 5.0);
        
        this.label = "脉冲激光";
        this.pulseWidthFs = Math.max(1, pulseWidthFs ?? 100); // Pulse width in femtoseconds
        this.repetitionRateHz = Math.max(1, repetitionRateHz ?? 1e6); // Repetition rate in Hz
        this.peakPower = Math.max(0, peakPower ?? 1.0);
        this.chirpParameter = 0; // Chirp parameter (dimensionless)
    }

    toJSON() {
        return {
            ...super.toJSON(),
            pulseWidthFs: this.pulseWidthFs,
            repetitionRateHz: this.repetitionRateHz,
            peakPower: this.peakPower,
            chirpParameter: this.chirpParameter
        };
    }

    /**
     * Calculate average power from pulse parameters
     * P_avg = P_peak * τ * f_rep
     */
    getAveragePower() {
        const pulseWidthS = this.pulseWidthFs * 1e-15;
        return this.peakPower * pulseWidthS * this.repetitionRateHz;
    }

    /**
     * Calculate pulse energy
     * E = P_peak * τ
     */
    getPulseEnergy() {
        const pulseWidthS = this.pulseWidthFs * 1e-15;
        return this.peakPower * pulseWidthS;
    }

    /**
     * Calculate spectral bandwidth from pulse width (transform-limited)
     * Δν * Δt ≈ 0.44 for Gaussian pulses
     */
    getSpectralBandwidth() {
        const pulseWidthS = this.pulseWidthFs * 1e-15;
        const deltaFreq = 0.44 / pulseWidthS; // Hz
        // Convert to wavelength bandwidth
        const c = 3e8; // m/s
        const lambdaM = this.wavelength * 1e-9;
        const deltaLambda = (lambdaM * lambdaM * deltaFreq) / c * 1e9; // nm
        return deltaLambda;
    }

    draw(ctx) {
        const size = 14;
        const halfHeight = size * 0.4;
        
        // Draw laser body similar to LaserSource but with pulse indicator
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
        
        // Draw pulse indicator (small wave pattern)
        if (this.enabled) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            const center = this.pos.add(Vector.fromAngle(this.angleRad + Math.PI).multiply(size * 0.2));
            const perpDir = Vector.fromAngle(this.angleRad + Math.PI / 2);
            
            ctx.beginPath();
            const waveWidth = 6;
            const waveHeight = 3;
            for (let i = 0; i <= 4; i++) {
                const t = i / 4;
                const x = center.x + (t - 0.5) * waveWidth * Math.cos(this.angleRad + Math.PI);
                const y = center.y + (t - 0.5) * waveWidth * Math.sin(this.angleRad + Math.PI);
                const offset = Math.sin(t * Math.PI * 2) * waveHeight;
                const px = x + perpDir.x * offset;
                const py = y + perpDir.y * offset;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }

    getProperties() {
        const baseProps = super.getProperties();
        const avgPower = this.getAveragePower();
        const pulseEnergy = this.getPulseEnergy();
        const bandwidth = this.getSpectralBandwidth();
        
        // Remove some base properties and add pulse-specific ones
        delete baseProps.intensity;
        
        return {
            ...baseProps,
            peakPower: { value: this.peakPower.toFixed(2), label: '峰值功率', type: 'number', min: 0, max: 1000, step: 0.1 },
            pulseWidthFs: { value: this.pulseWidthFs.toFixed(0), label: '脉冲宽度 (fs)', type: 'number', min: 1, max: 1e9, step: 1 },
            repetitionRateHz: { 
                value: this.repetitionRateHz.toExponential(2), 
                label: '重复频率 (Hz)', 
                type: 'number', 
                min: 1, 
                max: 1e12, 
                step: 1000 
            },
            chirpParameter: { value: this.chirpParameter.toFixed(2), label: '啁啾参数', type: 'number', min: -10, max: 10, step: 0.1 },
            // Read-only calculated values
            avgPowerDisplay: { value: avgPower.toExponential(2), label: '平均功率 (计算值)', type: 'text', readonly: true },
            pulseEnergyDisplay: { value: pulseEnergy.toExponential(2) + ' J', label: '脉冲能量 (计算值)', type: 'text', readonly: true },
            bandwidthDisplay: { value: bandwidth.toFixed(2) + ' nm', label: '光谱带宽 (计算值)', type: 'text', readonly: true }
        };
    }

    setProperty(propName, value) {
        // Handle pulse-specific properties first
        let needsRetraceUpdate = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'peakPower':
                this.peakPower = Math.max(0, parseFloat(value));
                this.intensity = this.peakPower; // Sync with parent intensity
                this._rayColor = this.calculateRayColor();
                needsRetraceUpdate = true;
                needsInspectorRefresh = true;
                break;
            case 'pulseWidthFs':
                this.pulseWidthFs = Math.max(1, parseFloat(value));
                needsInspectorRefresh = true;
                break;
            case 'repetitionRateHz':
                this.repetitionRateHz = Math.max(1, parseFloat(value));
                needsInspectorRefresh = true;
                break;
            case 'chirpParameter':
                this.chirpParameter = parseFloat(value);
                break;
            default:
                return super.setProperty(propName, value);
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
    window.PulsedLaserSource = PulsedLaserSource;
}
