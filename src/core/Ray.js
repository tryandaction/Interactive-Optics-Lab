/**
 * Ray.js - 光线类
 * 定义光线的属性和行为
 */

import { Vector } from './Vector.js';
import {
    N_AIR, DEFAULT_WAVELENGTH_NM, MAX_RAY_BOUNCES, MIN_RAY_INTENSITY,
    MIN_RAY_WIDTH, MAX_RAY_WIDTH, PIXELS_PER_NANOMETER
} from './constants.js';

export class Ray {
    constructor(
        origin, direction,
        wavelengthNm = DEFAULT_WAVELENGTH_NM,
        intensity = 1.0,
        phase = 0.0,
        bounces = 0,
        mediumRefractiveIndex = N_AIR,
        sourceId = null,
        polarizationAngle = null,
        ignoreDecay = false,
        initialHistory = null,
        beamDiameter = 1.0,
        beamWaist = null,
        z_R = null
    ) {
        this._validateInputs(origin, direction);
        
        this.origin = origin;
        this.direction = direction.normalize();
        this.wavelengthNm = wavelengthNm;
        this.intensity = Math.max(0, intensity);
        this.phase = phase;
        this.bouncesSoFar = bounces;
        this.mediumRefractiveIndex = mediumRefractiveIndex;
        this.sourceId = sourceId;
        this.polarizationAngle = this._validatePolarization(polarizationAngle);
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = Math.max(0, beamDiameter);
        this.beamWaist = beamWaist;
        this.z_R = z_R;

        // 初始化历史记录
        this.history = this._initHistory(initialHistory, origin);
        
        // 状态标志
        this.terminated = false;
        this.endReason = null;
        this.animateArrow = true;

        // 缓存计算属性
        this._color = this.calculateColor();
        this._lineWidth = this.calculateLineWidth();

        // 常量
        this.maxBounces = MAX_RAY_BOUNCES;
        this.minIntensityThreshold = MIN_RAY_INTENSITY;

        // Jones矢量初始化
        this.jones = this._initJonesVector();
        
        this._validateState();
    }

    // --- 私有初始化方法 ---
    _validateInputs(origin, direction) {
        if (!(origin instanceof Vector)) throw new Error("Ray origin must be a Vector.");
        if (!(direction instanceof Vector)) throw new Error("Ray direction must be a Vector.");
    }

    _validatePolarization(polarizationAngle) {
        if (polarizationAngle === null || typeof polarizationAngle === 'number' || typeof polarizationAngle === 'string') {
            return polarizationAngle;
        }
        return null;
    }

    _initHistory(initialHistory, origin) {
        if (initialHistory && Array.isArray(initialHistory) && initialHistory.length > 0) {
            return initialHistory;
        }
        return [origin.clone()];
    }

    _initJonesVector() {
        try {
            if (typeof this.polarizationAngle === 'number') {
                const c = Math.cos(this.polarizationAngle);
                const s = Math.sin(this.polarizationAngle);
                return { Ex: { re: c, im: 0 }, Ey: { re: s, im: 0 } };
            } else if (this.polarizationAngle === 'circular') {
                const invSqrt2 = 1 / Math.sqrt(2);
                return { Ex: { re: invSqrt2, im: 0 }, Ey: { re: 0, im: invSqrt2 } };
            }
        } catch (e) {
            console.warn('Failed to initialize Jones vector:', e);
        }
        return null;
    }

    _validateState() {
        if (this.direction.magnitudeSquared() < 0.5) {
            console.error("Ray CONSTRUCTOR ERROR: Direction vector is zero or near-zero.");
            this.terminate('zero_direction_on_creation');
        }
        
        if (isNaN(this.origin?.x) || isNaN(this.origin?.y) ||
            isNaN(this.direction?.x) || isNaN(this.direction?.y) ||
            isNaN(this.intensity) || isNaN(this.phase)) {
            console.error("Ray CONSTRUCTOR ERROR: Created with NaN or invalid values.");
            this.terminate('nan_on_creation');
        }
    }

    // --- 偏振相关方法 ---
    isPolarized() {
        return typeof this.polarizationAngle === 'number' || 
               this.polarizationAngle === 'circular' || 
               !!this.jones;
    }

    getPolarizationAngle() { return this.polarizationAngle; }

    setPolarization(angleRad) {
        if (typeof angleRad === 'number' && !isNaN(angleRad)) {
            this.polarizationAngle = Math.atan2(Math.sin(angleRad), Math.cos(angleRad));
        }
    }

    setSpecialPolarization(state) {
        if (state === 'circular') {
            this.polarizationAngle = state;
        }
    }

    setUnpolarized() { this.polarizationAngle = null; }

    setLinearPolarization(angleRad) {
        this.polarizationAngle = Math.atan2(Math.sin(angleRad), Math.cos(angleRad));
        this.jones = Ray.jonesLinear(this.polarizationAngle);
    }

    setCircularPolarization(rightHanded = true) {
        this.polarizationAngle = 'circular';
        this.jones = Ray.jonesCircular(rightHanded);
    }

    // --- Jones矢量辅助方法 ---
    hasJones() { return !!(this.jones && this.jones.Ex && this.jones.Ey); }
    
    static _cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    static _cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    static _cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
    static _cScale(a, s) { return { re: a.re * s, im: a.im * s }; }
    static _cAbs2(a) { return a.re * a.re + a.im * a.im; }
    
    static _rot2(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [[{ re: c, im: 0 }, { re: -s, im: 0 }], [{ re: s, im: 0 }, { re: c, im: 0 }]];
    }
    
    static _apply2x2(J, v) {
        const Ex = Ray._cAdd(Ray._cMul(J[0][0], v.Ex), Ray._cMul(J[0][1], v.Ey));
        const Ey = Ray._cAdd(Ray._cMul(J[1][0], v.Ex), Ray._cMul(J[1][1], v.Ey));
        return { Ex, Ey };
    }
    
    static jonesLinear(angleRad) {
        const c = Math.cos(angleRad), s = Math.sin(angleRad);
        return { Ex: { re: c, im: 0 }, Ey: { re: s, im: 0 } };
    }
    
    static jonesCircular(rightHanded = true) {
        const inv = 1 / Math.sqrt(2);
        return rightHanded 
            ? { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: inv } }
            : { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: -inv } };
    }
    
    jonesIntensity() {
        if (!this.hasJones()) return null;
        return Ray._cAbs2(this.jones.Ex) + Ray._cAbs2(this.jones.Ey);
    }

    ensureJonesVector() {
        if (this.hasJones()) return;
        if (typeof this.polarizationAngle === 'number') {
            this.setLinearPolarization(this.polarizationAngle);
        } else if (this.polarizationAngle === 'circular') {
            this.setCircularPolarization(true);
        }
    }

    setJones(newJones) {
        if (!newJones || !newJones.Ex || !newJones.Ey) {
            this.jones = null;
            this.polarizationAngle = null;
            return;
        }

        this.jones = newJones;
        this._updatePolarizationFromJones();
    }

    _updatePolarizationFromJones() {
        const Ex_mag2 = Ray._cAbs2(this.jones.Ex);
        const Ey_mag2 = Ray._cAbs2(this.jones.Ey);
        const totalIntensity = Ex_mag2 + Ey_mag2;

        if (totalIntensity < 1e-9) {
            this.polarizationAngle = null;
            return;
        }

        const phase_ex = Math.atan2(this.jones.Ex.im, this.jones.Ex.re);
        const phase_ey = Math.atan2(this.jones.Ey.im, this.jones.Ey.re);
        let phase_diff = Math.atan2(Math.sin(phase_ey - phase_ex), Math.cos(phase_ey - phase_ex));

        if (Math.abs(phase_diff) < 1e-4 || Math.abs(Math.abs(phase_diff) - Math.PI) < 1e-4) {
            this.polarizationAngle = Math.atan2(this.jones.Ey.re, this.jones.Ex.re);
        } else if (Math.abs(Ex_mag2 - Ey_mag2) < 1e-4 * totalIntensity && 
                   Math.abs(Math.abs(phase_diff) - Math.PI / 2) < 1e-4) {
            this.polarizationAngle = 'circular';
        } else {
            this.polarizationAngle = 'elliptical';
        }
    }


    // --- 颜色计算 ---
    calculateColor() {
        const wl = this.wavelengthNm;
        let R = 0, G = 0, B = 0;

        // 波长到RGB转换
        if (wl >= 380 && wl < 440) { R = -(wl - 440) / (440 - 380); B = 1.0; }
        else if (wl >= 440 && wl < 490) { G = (wl - 440) / (490 - 440); B = 1.0; }
        else if (wl >= 490 && wl < 510) { G = 1.0; B = -(wl - 510) / (510 - 490); }
        else if (wl >= 510 && wl < 580) { R = (wl - 510) / (580 - 510); G = 1.0; }
        else if (wl >= 580 && wl < 645) { R = 1.0; G = -(wl - 645) / (645 - 580); }
        else if (wl >= 645 && wl <= 750) { R = 1.0; }

        // 边缘波长强度调整
        let factor = 1.0;
        if (wl < 420) factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
        else if (wl > 680) factor = 0.3 + 0.7 * (750 - wl) / (750 - 680);

        // Gamma校正
        const gamma = 2.2;
        const intensityForColor = Math.min(this.intensity, 1.5);
        const brightness = 0.2 + 0.8 * Math.pow(intensityForColor, 0.5);

        R = Math.pow(R * factor, gamma) * brightness;
        G = Math.pow(G * factor, gamma) * brightness;
        B = Math.pow(B * factor, gamma) * brightness;

        // Alpha计算
        const MIN_ALPHA = 0.02;
        const MAX_ALPHA = 0.85;
        let alpha = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * Math.tanh(this.intensity * 2.0);
        alpha = Math.max(0, Math.min(1, alpha));

        const rInt = Math.min(255, Math.max(0, Math.round(R * 255)));
        const gInt = Math.min(255, Math.max(0, Math.round(G * 255)));
        const bInt = Math.min(255, Math.max(0, Math.round(B * 255)));

        if (wl < 380 || wl > 750) {
            alpha = alpha * 0.05;
        }

        return `rgba(${rInt},${gInt},${bInt},${alpha.toFixed(3)})`;
    }

    // --- 线宽计算 ---
    calculateLineWidth() {
        let baseWidth;

        if (this.beamWaist !== null && this.z_R !== null && this.beamWaist > 1e-6) {
            baseWidth = this.beamWaist * 2.0;
            baseWidth = Math.max(0.5, Math.min(baseWidth, 15.0));
        } else {
            baseWidth = this.beamDiameter > 0 ? this.beamDiameter : 1.0;
        }

        const intensityFactor = Math.pow(Math.max(0.01, this.intensity), 0.2);
        let finalWidth = baseWidth * intensityFactor;
        return Math.max(MIN_RAY_WIDTH, Math.min(MAX_RAY_WIDTH, finalWidth));
    }

    getColor() { return this._color; }
    getLineWidth() { return this._lineWidth; }

    // --- 历史记录 ---
    addHistoryPoint(point) {
        if (this.terminated || !(point instanceof Vector)) return;

        const lastPoint = this.history[this.history.length - 1];
        if (!(lastPoint instanceof Vector) || isNaN(lastPoint.x) || isNaN(point.x)) return;

        const distance = point.distanceTo(lastPoint);
        if (isNaN(distance) || distance < 1e-9) return;

        // 更新相位
        const lambda_px = this.wavelengthNm * PIXELS_PER_NANOMETER;
        if (lambda_px > 1e-9 && !isNaN(this.mediumRefractiveIndex)) {
            const phaseChange = (2 * Math.PI / lambda_px) * distance * this.mediumRefractiveIndex;
            this.phase += phaseChange;
            this.phase = Math.atan2(Math.sin(this.phase), Math.cos(this.phase));
        }

        this.history.push(point.clone());
    }

    getPathPoints() { return this.history; }

    // --- 干涉计算 ---
    getComplexAmplitude() {
        const amplitude = Math.sqrt(this.intensity);
        return { amplitude, phase: this.phase };
    }

    // --- 终止和检查 ---
    terminate(reason = 'unknown') {
        if (!this.terminated) {
            this.terminated = true;
            this.endReason = reason;
        }
    }

    shouldTerminate() {
        if (this.terminated) return true;

        // NaN检查
        if (isNaN(this.origin?.x) || isNaN(this.origin?.y) ||
            isNaN(this.direction?.x) || isNaN(this.direction?.y) ||
            isNaN(this.intensity) || isNaN(this.phase)) {
            this.terminate('nan_value');
            return true;
        }

        // 零方向检查
        if (this.direction.magnitudeSquared() < 1e-9) {
            this.terminate('zero_direction_runtime');
            return true;
        }

        // 最大反弹次数检查
        const globalMaxBounces = window.globalMaxBounces || MAX_RAY_BOUNCES;
        if (this.bouncesSoFar >= globalMaxBounces) {
            this.terminate('max_bounces');
            return true;
        }

        // 低强度检查
        const globalMinIntensity = window.globalMinIntensity || MIN_RAY_INTENSITY;
        if (!this.ignoreDecay && this.intensity < globalMinIntensity) {
            this.terminate('low_intensity');
            return true;
        }

        return false;
    }

    // --- 高斯光束宽度计算 ---
    getWidthAt(distanceFromWaist) {
        if (this.beamWaist === null || this.z_R === null || this.z_R <= 1e-9) {
            return this.beamDiameter > 0 ? this.beamDiameter / 2.0 : 1.0;
        }

        const w0 = this.beamWaist;
        const z = Math.abs(distanceFromWaist);
        const z_over_zR = z / this.z_R;
        return w0 * Math.sqrt(1.0 + z_over_zR * z_over_zR);
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Ray = Ray;
}
