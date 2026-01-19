/**
 * OpticsCalculator.js - 光学计算器
 * 提供常用光学公式和计算功能
 * 
 * Requirements: 18.2
 */

/**
 * 物理常数
 */
export const PhysicalConstants = {
    SPEED_OF_LIGHT: 299792458, // m/s
    PLANCK_CONSTANT: 6.62607015e-34, // J·s
    ELECTRON_CHARGE: 1.602176634e-19, // C
    VACUUM_PERMITTIVITY: 8.8541878128e-12, // F/m
    VACUUM_PERMEABILITY: 1.25663706212e-6 // H/m
};

/**
 * 光学计算器类
 */
export class OpticsCalculator {
    constructor() {
        this.results = [];
    }

    /**
     * 薄透镜公式: 1/f = 1/s_o + 1/s_i
     */
    thinLensEquation(focalLength = null, objectDistance = null, imageDistance = null) {
        if (focalLength && objectDistance) {
            // 计算像距
            const si = 1 / (1/focalLength - 1/objectDistance);
            return {
                focalLength,
                objectDistance,
                imageDistance: si,
                magnification: -si / objectDistance,
                formula: '1/f = 1/s_o + 1/s_i'
            };
        } else if (focalLength && imageDistance) {
            // 计算物距
            const so = 1 / (1/focalLength - 1/imageDistance);
            return {
                focalLength,
                objectDistance: so,
                imageDistance,
                magnification: -imageDistance / so,
                formula: '1/f = 1/s_o + 1/s_i'
            };
        } else if (objectDistance && imageDistance) {
            // 计算焦距
            const f = 1 / (1/objectDistance + 1/imageDistance);
            return {
                focalLength: f,
                objectDistance,
                imageDistance,
                magnification: -imageDistance / objectDistance,
                formula: '1/f = 1/s_o + 1/s_i'
            };
        }
        return null;
    }

    /**
     * 放大率计算: M = -s_i / s_o = h_i / h_o
     */
    magnification(imageDistance, objectDistance) {
        return {
            magnification: -imageDistance / objectDistance,
            lateral: -imageDistance / objectDistance,
            angular: objectDistance / imageDistance,
            formula: 'M = -s_i / s_o'
        };
    }

    /**
     * 数值孔径: NA = n * sin(θ)
     */
    numericalAperture(refractiveIndex, halfAngle) {
        return {
            NA: refractiveIndex * Math.sin(halfAngle),
            refractiveIndex,
            halfAngle,
            halfAngleDeg: halfAngle * 180 / Math.PI,
            formula: 'NA = n * sin(θ)'
        };
    }

    /**
     * f数: f/# = f / D
     */
    fNumber(focalLength, apertureDiameter) {
        return {
            fNumber: focalLength / apertureDiameter,
            focalLength,
            apertureDiameter,
            NA: 1 / (2 * focalLength / apertureDiameter),
            formula: 'f/# = f / D'
        };
    }

    /**
     * 波长-频率转换
     */
    wavelengthFrequency(wavelength = null, frequency = null) {
        const c = PhysicalConstants.SPEED_OF_LIGHT;
        
        if (wavelength) {
            return {
                wavelength,
                frequency: c / wavelength,
                energy: PhysicalConstants.PLANCK_CONSTANT * c / wavelength,
                wavenumber: 1 / wavelength,
                formula: 'c = λ * f'
            };
        } else if (frequency) {
            return {
                wavelength: c / frequency,
                frequency,
                energy: PhysicalConstants.PLANCK_CONSTANT * frequency,
                wavenumber: frequency / c,
                formula: 'c = λ * f'
            };
        }
        return null;
    }

    /**
     * 光子能量: E = h * f = h * c / λ
     */
    photonEnergy(wavelength) {
        const h = PhysicalConstants.PLANCK_CONSTANT;
        const c = PhysicalConstants.SPEED_OF_LIGHT;
        
        return {
            energy: h * c / wavelength,
            energyEV: (h * c / wavelength) / PhysicalConstants.ELECTRON_CHARGE,
            wavelength,
            frequency: c / wavelength,
            formula: 'E = h * c / λ'
        };
    }

    /**
     * 高斯光束传播
     */
    gaussianBeam(wavelength, beamWaist, distance) {
        const lambda = wavelength;
        const w0 = beamWaist;
        const z = distance;
        
        // 瑞利长度
        const zR = Math.PI * w0 * w0 / lambda;
        
        // 光束半径
        const wz = w0 * Math.sqrt(1 + (z / zR) ** 2);
        
        // 曲率半径
        const Rz = z * (1 + (zR / z) ** 2);
        
        // 古伊相移
        const gouyPhase = Math.atan(z / zR);
        
        return {
            beamRadius: wz,
            radiusOfCurvature: Rz,
            rayleighRange: zR,
            gouyPhase,
            gouyPhaseDeg: gouyPhase * 180 / Math.PI,
            divergence: lambda / (Math.PI * w0),
            formula: 'w(z) = w_0 * sqrt(1 + (z/z_R)^2)'
        };
    }

    /**
     * 光束发散角
     */
    beamDivergence(wavelength, beamWaist) {
        return {
            divergence: wavelength / (Math.PI * beamWaist),
            divergenceDeg: (wavelength / (Math.PI * beamWaist)) * 180 / Math.PI,
            fullAngle: 2 * wavelength / (Math.PI * beamWaist),
            fullAngleDeg: 2 * (wavelength / (Math.PI * beamWaist)) * 180 / Math.PI,
            formula: 'θ = λ / (π * w_0)'
        };
    }

    /**
     * 瑞利判据（分辨率）
     */
    rayleighCriterion(wavelength, apertureDiameter) {
        return {
            angularResolution: 1.22 * wavelength / apertureDiameter,
            angularResolutionDeg: 1.22 * wavelength / apertureDiameter * 180 / Math.PI,
            wavelength,
            apertureDiameter,
            formula: 'θ = 1.22 * λ / D'
        };
    }

    /**
     * 布儒斯特角
     */
    brewsterAngle(n1, n2) {
        return {
            brewsterAngle: Math.atan(n2 / n1),
            brewsterAngleDeg: Math.atan(n2 / n1) * 180 / Math.PI,
            n1,
            n2,
            formula: 'θ_B = arctan(n_2 / n_1)'
        };
    }

    /**
     * 临界角（全反射）
     */
    criticalAngle(n1, n2) {
        if (n1 <= n2) {
            return { error: 'n1 must be greater than n2 for total internal reflection' };
        }
        
        return {
            criticalAngle: Math.asin(n2 / n1),
            criticalAngleDeg: Math.asin(n2 / n1) * 180 / Math.PI,
            n1,
            n2,
            formula: 'θ_c = arcsin(n_2 / n_1)'
        };
    }

    /**
     * 斯涅尔定律
     */
    snellsLaw(n1, theta1 = null, n2 = null, theta2 = null) {
        if (n1 && theta1 && n2) {
            // 计算折射角
            const sinTheta2 = (n1 / n2) * Math.sin(theta1);
            if (Math.abs(sinTheta2) > 1) {
                return { error: 'Total internal reflection occurs' };
            }
            return {
                n1, theta1, theta1Deg: theta1 * 180 / Math.PI,
                n2, theta2: Math.asin(sinTheta2), theta2Deg: Math.asin(sinTheta2) * 180 / Math.PI,
                formula: 'n_1 * sin(θ_1) = n_2 * sin(θ_2)'
            };
        } else if (n1 && theta1 && theta2) {
            // 计算折射率
            return {
                n1, theta1, theta1Deg: theta1 * 180 / Math.PI,
                n2: n1 * Math.sin(theta1) / Math.sin(theta2),
                theta2, theta2Deg: theta2 * 180 / Math.PI,
                formula: 'n_1 * sin(θ_1) = n_2 * sin(θ_2)'
            };
        }
        return null;
    }

    /**
     * 菲涅尔方程（反射率）
     */
    fresnelReflection(n1, n2, incidentAngle) {
        const theta1 = incidentAngle;
        const sinTheta2 = (n1 / n2) * Math.sin(theta1);
        
        if (Math.abs(sinTheta2) > 1) {
            return { error: 'Total internal reflection', reflectance: 1.0 };
        }
        
        const theta2 = Math.asin(sinTheta2);
        
        // s偏振
        const rs = (n1 * Math.cos(theta1) - n2 * Math.cos(theta2)) / 
                   (n1 * Math.cos(theta1) + n2 * Math.cos(theta2));
        const Rs = rs * rs;
        
        // p偏振
        const rp = (n2 * Math.cos(theta1) - n1 * Math.cos(theta2)) / 
                   (n2 * Math.cos(theta1) + n1 * Math.cos(theta2));
        const Rp = rp * rp;
        
        return {
            reflectanceS: Rs,
            reflectanceP: Rp,
            reflectanceAvg: (Rs + Rp) / 2,
            transmittanceS: 1 - Rs,
            transmittanceP: 1 - Rp,
            transmittanceAvg: 1 - (Rs + Rp) / 2,
            incidentAngle: theta1,
            incidentAngleDeg: theta1 * 180 / Math.PI,
            refractedAngle: theta2,
            refractedAngleDeg: theta2 * 180 / Math.PI,
            formula: 'Fresnel equations'
        };
    }

    /**
     * 光栅方程
     */
    gratingEquation(gratingPeriod, wavelength, order, incidentAngle = 0) {
        const d = gratingPeriod;
        const lambda = wavelength;
        const m = order;
        const thetaI = incidentAngle;
        
        const sinThetaD = m * lambda / d - Math.sin(thetaI);
        
        if (Math.abs(sinThetaD) > 1) {
            return { error: 'No diffraction at this order' };
        }
        
        return {
            diffractionAngle: Math.asin(sinThetaD),
            diffractionAngleDeg: Math.asin(sinThetaD) * 180 / Math.PI,
            order: m,
            wavelength: lambda,
            gratingPeriod: d,
            incidentAngle: thetaI,
            incidentAngleDeg: thetaI * 180 / Math.PI,
            formula: 'd * (sin(θ_d) - sin(θ_i)) = m * λ'
        };
    }

    /**
     * 干涉条纹间距
     */
    interferenceSpacing(wavelength, distance, slitSeparation) {
        return {
            fringeSpacing: wavelength * distance / slitSeparation,
            wavelength,
            distance,
            slitSeparation,
            formula: 'Δy = λ * L / d'
        };
    }

    /**
     * 光学功率（屈光度）
     */
    opticalPower(focalLength) {
        return {
            power: 1 / focalLength,
            focalLength,
            unit: 'diopters (D)',
            formula: 'P = 1 / f'
        };
    }

    /**
     * 保存计算结果
     */
    saveResult(result) {
        this.results.push({
            ...result,
            timestamp: Date.now()
        });
    }

    /**
     * 获取所有结果
     */
    getAllResults() {
        return [...this.results];
    }

    /**
     * 清除结果
     */
    clearResults() {
        this.results = [];
    }

    /**
     * 导出结果
     */
    exportResults() {
        return JSON.stringify(this.results, null, 2);
    }
}

// ========== 单例模式 ==========
let opticsCalculatorInstance = null;

export function getOpticsCalculator() {
    if (!opticsCalculatorInstance) {
        opticsCalculatorInstance = new OpticsCalculator();
    }
    return opticsCalculatorInstance;
}

export function resetOpticsCalculator() {
    opticsCalculatorInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.OpticsCalculator = OpticsCalculator;
    window.getOpticsCalculator = getOpticsCalculator;
    window.PhysicalConstants = PhysicalConstants;
}
