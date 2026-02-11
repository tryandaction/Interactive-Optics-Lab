/**
 * DiagramToSimulation.js - 绘图模式到模拟模式转换器
 * Converts diagram components to simulation objects
 * 
 * Requirements: 16.2
 */

/**
 * 组件类型映射表
 * Maps diagram component types to simulation component types
 */
const COMPONENT_TYPE_MAP = {
    // Sources
    'LaserSource': 'LaserSource',
    'LEDSource': 'LEDSource',
    'PointSource': 'PointSource',
    'LineSource': 'LineSource',
    'FanSource': 'FanSource',
    
    // Mirrors
    'Mirror': 'Mirror',
    'MetallicMirror': 'MetallicMirror',
    'DichroicMirror': 'DichroicMirror',
    'SphericalMirror': 'SphericalMirror',
    'ParabolicMirror': 'ParabolicMirror',
    
    // Lenses
    'ThinLens': 'ThinLens',
    'CylindricalLens': 'CylindricalLens',
    'AsphericLens': 'AsphericLens',
    'GRINLens': 'GRINLens',
    
    // Polarizers
    'Polarizer': 'Polarizer',
    'BeamSplitter': 'BeamSplitter',
    'HalfWavePlate': 'HalfWavePlate',
    'QuarterWavePlate': 'QuarterWavePlate',
    'WollastonPrism': 'WollastonPrism',
    'FaradayRotator': 'FaradayRotator',
    'FaradayIsolator': 'FaradayIsolator',
    
    // Detectors
    'Screen': 'Screen',
    'Photodiode': 'Photodiode',
    'CCDCamera': 'CCDCamera',
    'PowerMeter': 'PowerMeter',
    'Spectrometer': 'Spectrometer',
    'PolarizationAnalyzer': 'PolarizationAnalyzer',
    
    // Special
    'AcoustoOpticModulator': 'AcoustoOpticModulator',
    'Aperture': 'Aperture',
    'Prism': 'Prism',
    'DiffractionGrating': 'DiffractionGrating',
    'OpticalFiber': 'OpticalFiber',
    'DielectricBlock': 'DielectricBlock',
    
    // Modulators
    'ElectroOpticModulator': 'ElectroOpticModulator',
    'OpticalChopper': 'OpticalChopper',
    'VariableAttenuator': 'VariableAttenuator',
    
    // Atomic
    'AtomicCell': 'AtomicCell',
    'MagneticCoil': 'MagneticCoil',
    
    // Interferometers
    'FabryPerotCavity': 'FabryPerotCavity'
};

/**
 * 绘图到模拟转换器类
 */
export class DiagramToSimulationConverter {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * 转换完整场景
     */
    convert(diagramScene) {
        this.errors = [];
        this.warnings = [];
        
        const simulationScene = {
            components: [],
            rays: [],
            metadata: {
                convertedFrom: 'diagram',
                timestamp: Date.now(),
                originalName: diagramScene.name || 'Untitled'
            }
        };
        
        // 转换组件
        if (diagramScene.components && Array.isArray(diagramScene.components)) {
            diagramScene.components.forEach(comp => {
                try {
                    const simComp = this.convertComponent(comp);
                    if (simComp) {
                        simulationScene.components.push(simComp);
                    }
                } catch (error) {
                    this.errors.push({
                        component: comp.id,
                        message: error.message
                    });
                }
            });
        }
        
        // 转换光线（如果有）
        if (diagramScene.rays && Array.isArray(diagramScene.rays)) {
            diagramScene.rays.forEach(ray => {
                try {
                    const simRay = this.convertRay(ray);
                    if (simRay) {
                        simulationScene.rays.push(simRay);
                    }
                } catch (error) {
                    this.warnings.push({
                        ray: ray.id,
                        message: error.message
                    });
                }
            });
        }
        
        return {
            scene: simulationScene,
            errors: this.errors,
            warnings: this.warnings,
            success: this.errors.length === 0
        };
    }

    /**
     * 转换单个组件
     */
    convertComponent(diagramComponent) {
        const simType = COMPONENT_TYPE_MAP[diagramComponent.type];
        
        if (!simType) {
            throw new Error(`Unknown component type: ${diagramComponent.type}`);
        }
        
        // 基础属性
        const simComponent = {
            id: diagramComponent.id,
            type: simType,
            pos: { ...diagramComponent.pos },
            angle: diagramComponent.angle ?? diagramComponent.angleRad ?? 0
        };
        
        // 转换特定属性
        this.convertComponentProperties(diagramComponent, simComponent);
        
        return simComponent;
    }

    /**
     * 转换组件属性
     */
    convertComponentProperties(diagramComp, simComp) {
        const type = diagramComp.type;
        
        // 光源属性
        if (type.includes('Source')) {
            simComp.wavelength = diagramComp.wavelength || 632.8;
            simComp.power = diagramComp.power || 1.0;
            simComp.beamWidth = diagramComp.beamWidth || 1.0;
            
            if (type === 'LaserSource') {
                simComp.divergence = diagramComp.divergence || 0.001;
            }
            
            if (type === 'FanSource') {
                simComp.rayCount = diagramComp.rayCount || 11;
                simComp.spreadAngle = diagramComp.spreadAngle || Math.PI / 6;
            }
        }
        
        // 透镜属性
        if (type.includes('Lens')) {
            simComp.focalLength = diagramComp.focalLength || 100;
            simComp.diameter = diagramComp.diameter || 25.4;
            simComp.refractiveIndex = diagramComp.refractiveIndex || 1.5;
            
            if (type === 'CylindricalLens') {
                simComp.axis = diagramComp.axis || 0;
            }
        }
        
        // 反射镜属性
        if (type.includes('Mirror')) {
            simComp.reflectivity = diagramComp.reflectivity || 0.99;
            
            if (type === 'SphericalMirror' || type === 'ParabolicMirror') {
                simComp.radius = diagramComp.radius || 100;
            }
            
            if (type === 'DichroicMirror') {
                simComp.cutoffWavelength = diagramComp.cutoffWavelength || 550;
            }
        }
        
        // 偏振器属性
        if (type.includes('Polarizer') || type.includes('Plate')) {
            simComp.axis = diagramComp.axis || 0;
            simComp.transmittance = diagramComp.transmittance || 0.9;
        }
        
        // 分束器属性
        if (type === 'BeamSplitter') {
            simComp.splitRatio = diagramComp.splitRatio || 0.5;
        }
        
        // 探测器属性
        if (type.includes('Detector') || type === 'Screen' || type === 'Photodiode') {
            simComp.width = diagramComp.width || 50;
            simComp.height = diagramComp.height || 50;
            simComp.sensitivity = diagramComp.sensitivity || 1.0;
        }
        
        // 光阑属性
        if (type === 'Aperture') {
            simComp.diameter = diagramComp.diameter || 10;
            simComp.shape = diagramComp.shape || 'circular';
        }
        
        // 棱镜属性
        if (type === 'Prism') {
            simComp.apexAngle = diagramComp.apexAngle || Math.PI / 3;
            simComp.refractiveIndex = diagramComp.refractiveIndex || 1.5;
        }
        
        // 光栅属性
        if (type === 'DiffractionGrating') {
            simComp.linesPerMM = diagramComp.linesPerMM || 600;
        }
        
        // 光纤属性
        if (type === 'OpticalFiber') {
            simComp.length = diagramComp.length || 100;
            simComp.coreIndex = diagramComp.coreIndex || 1.46;
            simComp.claddingIndex = diagramComp.claddingIndex || 1.45;
        }
        
        // AOM属性
        if (type === 'AcoustoOpticModulator') {
            simComp.frequency = diagramComp.frequency || 80e6;
            simComp.efficiency = diagramComp.efficiency || 0.8;
        }
        
        // 原子气室属性
        if (type === 'AtomicCell') {
            simComp.element = diagramComp.element || 'Rb87';
            simComp.temperature = diagramComp.temperature || 293;
            simComp.length = diagramComp.length || 75;
        }
        
        // Fabry-Perot腔属性
        if (type === 'FabryPerotCavity') {
            simComp.length = diagramComp.length || 100;
            simComp.finesse = diagramComp.finesse || 100;
            simComp.fsr = diagramComp.fsr || 1.5e9;
        }
    }

    /**
     * 转换光线
     */
    convertRay(diagramRay) {
        if (!diagramRay.pathPoints || diagramRay.pathPoints.length < 2) {
            throw new Error('Ray must have at least 2 path points');
        }
        
        const simRay = {
            id: diagramRay.id || `ray_${Date.now()}`,
            pathPoints: diagramRay.pathPoints.map(p => ({ ...p })),
            wavelength: diagramRay.wavelength || 632.8,
            intensity: diagramRay.intensity || 1.0,
            polarization: diagramRay.polarization || { angle: 0, type: 'linear' }
        };
        
        return simRay;
    }

    /**
     * 获取转换报告
     */
    getReport() {
        return {
            errors: this.errors,
            warnings: this.warnings,
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            success: this.errors.length === 0
        };
    }

    /**
     * 验证转换结果
     */
    validate(simulationScene) {
        const issues = [];
        
        // 检查组件
        simulationScene.components.forEach(comp => {
            if (!comp.id) {
                issues.push({ type: 'error', message: 'Component missing ID' });
            }
            if (!comp.type) {
                issues.push({ type: 'error', message: `Component ${comp.id} missing type` });
            }
            if (!comp.pos || typeof comp.pos.x !== 'number' || typeof comp.pos.y !== 'number') {
                issues.push({ type: 'error', message: `Component ${comp.id} has invalid position` });
            }
        });
        
        return {
            valid: issues.filter(i => i.type === 'error').length === 0,
            issues: issues
        };
    }
}

// ========== 单例模式 ==========
let converterInstance = null;

export function getDiagramToSimulationConverter() {
    if (!converterInstance) {
        converterInstance = new DiagramToSimulationConverter();
    }
    return converterInstance;
}

export function resetDiagramToSimulationConverter() {
    converterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagramToSimulationConverter = DiagramToSimulationConverter;
    window.getDiagramToSimulationConverter = getDiagramToSimulationConverter;
}
