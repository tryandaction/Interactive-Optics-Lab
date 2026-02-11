/**
 * WhiteLightSource.js - 白光光源
 * 发射包含可见光谱的宽带光线，可观察色散
 */

import { Vector } from '../../core/Vector.js';
import { GameObject } from '../../core/GameObject.js';
import { N_AIR, DEFAULT_WAVELENGTH_NM, MIN_RAY_INTENSITY } from '../../core/constants.js';

export class WhiteLightSource extends GameObject {
    static functionDescription = "发射包含可见光谱的宽带光线，可观察色散。";

    constructor(pos, angleDeg = 0, intensity = 75.0, rayCount = 41, spreadDeg = 0, 
                enabled = true, polarizationType = 'unpolarized', polarizationAngleDeg = 0, 
                ignoreDecay = false, beamDiameter = 10.0, initialBeamWaist = 5.0) {
        super(pos, angleDeg, "白光光源");

        this.baseIntensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount);
        this.spreadRad = spreadDeg * (Math.PI / 180);
        this.enabled = enabled;

        this.polarizationType = polarizationType;
        this.polarizationAngleRad = polarizationAngleDeg * (Math.PI / 180);
        
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = Math.max(0, beamDiameter);
        this.initialBeamWaist = initialBeamWaist;
        this.gaussianEnabled = true;

        this.label = this.gaussianEnabled ? "白光光源(高斯)" : "白光光源(几何)";

        this.componentWavelengths = [
            { wl: 380, factor: 0.05 }, { wl: 400, factor: 0.2 }, { wl: 420, factor: 0.5 },
            { wl: 440, factor: 0.9 }, { wl: 460, factor: 1.05 }, { wl: 480, factor: 1.1 },
            { wl: 500, factor: 1.2 }, { wl: 520, factor: 1.3 }, { wl: 540, factor: 1.4 },
            { wl: 555, factor: 1.4 },
            { wl: 570, factor: 1.3 }, { wl: 590, factor: 1.2 }, { wl: 610, factor: 1.1 },
            { wl: 630, factor: 0.95 }, { wl: 650, factor: 0.8 }, { wl: 670, factor: 0.6 },
            { wl: 690, factor: 0.4 }, { wl: 710, factor: 0.2 }, { wl: 730, factor: 0.1 },
            { wl: 750, factor: 0.05 }
        ];
        this.numWavelengths = this.componentWavelengths.length;
        this._updateCumulativeDistribution();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            baseIntensity: this.baseIntensity,
            rayCount: this.rayCount,
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

    _updateCumulativeDistribution() {
        this.totalIntensityFactorSum = this.componentWavelengths.reduce((sum, comp) => sum + comp.factor, 0);
        if (this.totalIntensityFactorSum <= 1e-9) {
            this.cumulativeDistribution = this.componentWavelengths.map((comp, index) => ({
                wl: comp.wl,
                cdf: (index + 1) / this.numWavelengths
            }));
        } else {
            this.cumulativeDistribution = [];
            let cumulative = 0;
            for (const comp of this.componentWavelengths) {
                cumulative += comp.factor / this.totalIntensityFactorSum;
                this.cumulativeDistribution.push({ wl: comp.wl, cdf: cumulative });
            }
            if (this.cumulativeDistribution.length > 0) {
                this.cumulativeDistribution[this.cumulativeDistribution.length - 1].cdf = 1.0;
            }
        }
    }

    _selectWavelength() {
        if (!this.cumulativeDistribution || this.cumulativeDistribution.length === 0) {
            return DEFAULT_WAVELENGTH_NM;
        }
        const randomSample = Math.random();
        for (const dist of this.cumulativeDistribution) {
            if (randomSample <= dist.cdf) {
                return dist.wl;
            }
        }
        return this.cumulativeDistribution[this.cumulativeDistribution.length - 1].wl;
    }

    generateRays(RayClass) {
        const actualRayCount = Math.min(this.rayCount, window.maxRaysPerSource || 1001);
        if (!this.enabled || actualRayCount <= 0 || this.componentWavelengths.length === 0) {
            return [];
        }

        const useFastMode = window.fastWhiteLightMode === true;
        const rays = [];
        const halfSpreadRad = this.spreadRad / 2;
        const startAngle = this.angleRad - halfSpreadRad;
        const angleStep = (actualRayCount > 1 && this.spreadRad > 1e-9) ? this.spreadRad / (actualRayCount - 1) : 0;
        const intensityPerPoint = this.baseIntensity / actualRayCount;

        for (let i = 0; i < actualRayCount; i++) {
            const angle = (actualRayCount === 1) ? this.angleRad : startAngle + i * angleStep;
            const direction = Vector.fromAngle(angle);
            const origin = this.pos.clone();
            
            let useGaussian = this.gaussianEnabled && this.initialBeamWaist > 1e-6;
            let baseBeamWaist = useGaussian ? this.initialBeamWaist : null;

            const createRayWithPolarization = (wavelength, intensity) => {
                let rayZR = null;
                if (useGaussian) {
                    const lambda_meters = wavelength * 1e-9;
                    rayZR = (Math.PI * baseBeamWaist * baseBeamWaist) / lambda_meters;
                    if (isNaN(rayZR)) return null;
                }

                try {
                    const newRay = new RayClass(
                        origin.clone(), direction.clone(), wavelength,
                        Math.max(0, intensity), 0.0, 0, N_AIR, this.id, null,
                        this.ignoreDecay, null, this.beamDiameter, baseBeamWaist, rayZR
                    );

                    switch (this.polarizationType) {
                        case 'linear': newRay.setLinearPolarization(this.polarizationAngleRad); break;
                        case 'circular-right': newRay.setCircularPolarization(true); break;
                        case 'circular-left': newRay.setCircularPolarization(false); break;
                        default: newRay.setUnpolarized(); break;
                    }
                    return newRay;
                } catch (e) {
                    console.error(`WhiteLightSource (${this.id}) Error creating Ray:`, e);
                    return null;
                }
            };

            if (useFastMode) {
                const randomWavelength = this._selectWavelength();
                const newRay = createRayWithPolarization(randomWavelength, intensityPerPoint);
                if (newRay) rays.push(newRay);
            } else {
                this.componentWavelengths.forEach(compWl => {
                    const finalIntensity = intensityPerPoint * (compWl.factor / this.totalIntensityFactorSum);
                    if (finalIntensity >= MIN_RAY_INTENSITY || this.ignoreDecay) {
                        const newRay = createRayWithPolarization(compWl.wl, finalIntensity);
                        if (newRay) rays.push(newRay);
                    }
                });
            }
        }
        return rays;
    }

    draw(ctx) {
        const drawColor = this.enabled ? `rgb(220, 220, 220)` : 'dimgray';
        ctx.fillStyle = drawColor;
        ctx.strokeStyle = this.selected ? 'yellow' : '#CCCCCC';
        ctx.lineWidth = this.selected ? 2.5 : 1.5;

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (this.spreadRad > 1e-3) {
            const radius = 18;
            const o = this.angleRad;
            const hfa = this.spreadRad / 2;
            const sa = o - hfa;
            const ea = o + hfa;
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.arc(this.pos.x, this.pos.y, radius, sa, ea);
            ctx.closePath();
            ctx.stroke();
        } else {
            const dir = Vector.fromAngle(this.angleRad);
            const endPoint = this.pos.add(dir.multiply(18));
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
        }
    }

    _containsPointBody(point) {
        return point.distanceSquaredTo(this.pos) < 18 * 18;
    }

    getBoundingBox() {
        const size = 18;
        return { x: this.pos.x - size, y: this.pos.y - size, width: size * 2, height: size * 2 };
    }

    getProperties() {
        const baseProps = super.getProperties();
        const props = {
            ...baseProps,
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            intensity: { value: this.baseIntensity.toFixed(2), label: '总强度', type: 'number', min: 0, max: 200, step: 1 },
            rayCount: { value: this.rayCount, label: '#方向/点数', type: 'number', min: 1, max: 1001, step: 10, title: '每个方向的光谱分量数取决于精确/快速模式' },
            spreadDeg: { value: (this.spreadRad * 180 / Math.PI).toFixed(1), label: '发散角 (°)', type: 'number', min: 0, max: 180, step: 1 },
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
                value: (this.polarizationAngleRad * 180 / Math.PI).toFixed(1),
                label: '↳ 偏振角度 (°)',
                type: 'number',
                step: 1
            };
        }
        
        if (this.gaussianEnabled) {
            props.initialBeamWaist = { value: this.initialBeamWaist.toFixed(2), label: '↳ 腰半径 w₀ (px)', type: 'number', min: 0.1, step: 0.1 };
        } else {
            props.beamDiameter = { value: this.beamDiameter.toFixed(1), label: '光束直径 (px)', type: 'number', min: 0, step: 0.5 };
        }
        
        props.wavelengthInfo = { value: `${this.numWavelengths}波长(模拟光谱)`, label: '光谱模拟', type: 'text', readonly: true };

        return props;
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsRetraceUpdate = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'enabled': this.enabled = !!value; needsRetraceUpdate = true; break;
            case 'intensity': this.baseIntensity = Math.max(0, parseFloat(value)); needsRetraceUpdate = true; break;
            case 'rayCount': this.rayCount = Math.max(1, parseInt(value)); needsRetraceUpdate = true; break;
            case 'spreadDeg': this.spreadRad = Math.max(0, parseFloat(value)) * Math.PI / 180; needsRetraceUpdate = true; break;
            case 'ignoreDecay': this.ignoreDecay = !!value; needsRetraceUpdate = true; break;
            case 'gaussianEnabled':
                if (this.gaussianEnabled !== !!value) {
                    this.gaussianEnabled = !!value;
                    this.label = this.gaussianEnabled ? "白光光源(高斯)" : "白光光源(几何)";
                    needsInspectorRefresh = true;
                    needsRetraceUpdate = true;
                }
                break;
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
            case 'wavelengthInfo': return true;
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
    window.WhiteLightSource = WhiteLightSource;
}
