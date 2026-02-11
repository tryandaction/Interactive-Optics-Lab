/**
 * SimulationToDiagram.js - 模拟模式到绘图模式转换器
 * Converts simulation objects to diagram components
 * 
 * Requirements: 16.3
 */

/**
 * 模拟到绘图转换器类
 */
export class SimulationToDiagramConverter {
    constructor(options = {}) {
        this.options = {
            simplify: options.simplify !== false,  // 简化光路
            beautify: options.beautify !== false,  // 美化布局
            snapToGrid: options.snapToGrid !== false,  // 吸附到网格
            gridSize: options.gridSize || 20,
            preserveRays: options.preserveRays !== false  // 保留光线路径
        };
        
        this.errors = [];
        this.warnings = [];
    }

    /**
     * 转换完整场景
     */
    convert(simulationScene) {
        this.errors = [];
        this.warnings = [];
        
        const diagramScene = {
            name: simulationScene.name || 'Converted Diagram',
            components: [],
            rays: [],
            annotations: [],
            metadata: {
                convertedFrom: 'simulation',
                timestamp: Date.now(),
                conversionOptions: { ...this.options }
            }
        };
        
        // 转换组件
        if (simulationScene.components && Array.isArray(simulationScene.components)) {
            simulationScene.components.forEach(comp => {
                try {
                    const diagramComp = this.convertComponent(comp);
                    if (diagramComp) {
                        diagramScene.components.push(diagramComp);
                    }
                } catch (error) {
                    this.errors.push({
                        component: comp.id,
                        message: error.message
                    });
                }
            });
        }
        
        // 转换光线
        if (this.options.preserveRays && simulationScene.rays) {
            simulationScene.rays.forEach(ray => {
                try {
                    const diagramRay = this.convertRay(ray);
                    if (diagramRay) {
                        diagramScene.rays.push(diagramRay);
                    }
                } catch (error) {
                    this.warnings.push({
                        ray: ray.id,
                        message: error.message
                    });
                }
            });
        }
        
        // 美化布局
        if (this.options.beautify) {
            this.beautifyLayout(diagramScene);
        }
        
        // 吸附到网格
        if (this.options.snapToGrid) {
            this.snapComponentsToGrid(diagramScene.components);
        }
        
        // 生成自动注释
        this.generateAnnotations(diagramScene);
        
        return {
            scene: diagramScene,
            errors: this.errors,
            warnings: this.warnings,
            success: this.errors.length === 0
        };
    }

    /**
     * 转换单个组件
     */
    convertComponent(simComponent) {
        const diagramComponent = {
            id: simComponent.id,
            type: simComponent.type,
            pos: { ...simComponent.pos },
            angle: simComponent.angle ?? simComponent.angleRad ?? 0
        };
        
        // 转换属性
        this.convertComponentProperties(simComponent, diagramComponent);
        
        return diagramComponent;
    }

    /**
     * 转换组件属性
     */
    convertComponentProperties(simComp, diagramComp) {
        const type = simComp.type;
        
        // 光源属性
        if (type.includes('Source')) {
            if (simComp.wavelength) diagramComp.wavelength = simComp.wavelength;
            if (simComp.power) diagramComp.power = simComp.power;
            if (simComp.beamWidth) diagramComp.beamWidth = simComp.beamWidth;
            if (simComp.divergence) diagramComp.divergence = simComp.divergence;
            if (simComp.rayCount) diagramComp.rayCount = simComp.rayCount;
            if (simComp.spreadAngle) diagramComp.spreadAngle = simComp.spreadAngle;
        }
        
        // 透镜属性
        if (type.includes('Lens')) {
            if (simComp.focalLength) diagramComp.focalLength = simComp.focalLength;
            if (simComp.diameter) diagramComp.diameter = simComp.diameter;
            if (simComp.refractiveIndex) diagramComp.refractiveIndex = simComp.refractiveIndex;
            if (simComp.axis !== undefined) diagramComp.axis = simComp.axis;
        }
        
        // 反射镜属性
        if (type.includes('Mirror')) {
            if (simComp.reflectivity) diagramComp.reflectivity = simComp.reflectivity;
            if (simComp.radius) diagramComp.radius = simComp.radius;
            if (simComp.cutoffWavelength) diagramComp.cutoffWavelength = simComp.cutoffWavelength;
        }
        
        // 偏振器属性
        if (type.includes('Polarizer') || type.includes('Plate')) {
            if (simComp.axis !== undefined) diagramComp.axis = simComp.axis;
            if (simComp.transmittance) diagramComp.transmittance = simComp.transmittance;
        }
        
        // 分束器属性
        if (type === 'BeamSplitter') {
            if (simComp.splitRatio) diagramComp.splitRatio = simComp.splitRatio;
        }
        
        // 探测器属性
        if (type.includes('Detector') || type === 'Screen' || type === 'Photodiode') {
            if (simComp.width) diagramComp.width = simComp.width;
            if (simComp.height) diagramComp.height = simComp.height;
            if (simComp.sensitivity) diagramComp.sensitivity = simComp.sensitivity;
        }
        
        // 其他属性
        if (simComp.diameter) diagramComp.diameter = simComp.diameter;
        if (simComp.shape) diagramComp.shape = simComp.shape;
        if (simComp.apexAngle) diagramComp.apexAngle = simComp.apexAngle;
        if (simComp.linesPerMM) diagramComp.linesPerMM = simComp.linesPerMM;
        if (simComp.length) diagramComp.length = simComp.length;
        if (simComp.frequency) diagramComp.frequency = simComp.frequency;
        if (simComp.efficiency) diagramComp.efficiency = simComp.efficiency;
        if (simComp.element) diagramComp.element = simComp.element;
        if (simComp.temperature) diagramComp.temperature = simComp.temperature;
        if (simComp.finesse) diagramComp.finesse = simComp.finesse;
        if (simComp.fsr) diagramComp.fsr = simComp.fsr;
    }

    /**
     * 转换光线
     */
    convertRay(simRay) {
        if (!simRay.pathPoints || simRay.pathPoints.length < 2) {
            throw new Error('Ray must have at least 2 path points');
        }
        
        let pathPoints = simRay.pathPoints.map(p => ({ ...p }));
        
        // 简化路径
        if (this.options.simplify) {
            pathPoints = this.simplifyPath(pathPoints);
        }
        
        const diagramRay = {
            id: simRay.id || `ray_${Date.now()}`,
            pathPoints: pathPoints,
            wavelength: simRay.wavelength || 632.8,
            intensity: simRay.intensity || 1.0,
            color: this.wavelengthToColor(simRay.wavelength || 632.8),
            lineWidth: 2,
            lineStyle: 'solid'
        };
        
        return diagramRay;
    }

    /**
     * 简化路径（Douglas-Peucker算法）
     */
    simplifyPath(points, tolerance = 2.0) {
        if (points.length <= 2) return points;
        
        // 找到距离最远的点
        let maxDistance = 0;
        let maxIndex = 0;
        
        const first = points[0];
        const last = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], first, last);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        // 如果最大距离大于阈值，递归简化
        if (maxDistance > tolerance) {
            const left = this.simplifyPath(points.slice(0, maxIndex + 1), tolerance);
            const right = this.simplifyPath(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        } else {
            return [first, last];
        }
    }

    /**
     * 计算点到线段的垂直距离
     */
    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2)
            );
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        
        if (t < 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2)
            );
        } else if (t > 1) {
            return Math.sqrt(
                Math.pow(point.x - lineEnd.x, 2) +
                Math.pow(point.y - lineEnd.y, 2)
            );
        }
        
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        
        return Math.sqrt(
            Math.pow(point.x - projX, 2) +
            Math.pow(point.y - projY, 2)
        );
    }

    /**
     * 美化布局
     */
    beautifyLayout(diagramScene) {
        // 简单的布局优化：按光路方向排列
        const components = diagramScene.components;
        
        // 找到光源
        const sources = components.filter(c => c.type.includes('Source'));
        
        if (sources.length === 0) return;
        
        // 按x坐标排序（假设光路从左到右）
        components.sort((a, b) => a.pos.x - b.pos.x);
        
        // 调整间距
        const minSpacing = 100;
        let currentX = sources[0].pos.x;
        
        components.forEach(comp => {
            if (comp.pos.x < currentX) {
                comp.pos.x = currentX;
            }
            currentX = comp.pos.x + minSpacing;
        });
    }

    /**
     * 吸附到网格
     */
    snapComponentsToGrid(components) {
        const gridSize = this.options.gridSize;
        
        components.forEach(comp => {
            comp.pos.x = Math.round(comp.pos.x / gridSize) * gridSize;
            comp.pos.y = Math.round(comp.pos.y / gridSize) * gridSize;
        });
    }

    /**
     * 生成自动注释
     */
    generateAnnotations(diagramScene) {
        const components = diagramScene.components;
        
        components.forEach(comp => {
            // 为关键组件生成注释
            if (comp.type.includes('Source') && comp.wavelength) {
                diagramScene.annotations.push({
                    componentId: comp.id,
                    text: `λ = ${comp.wavelength} nm`,
                    type: 'label',
                    autoGenerated: true
                });
            }
            
            if (comp.type.includes('Lens') && comp.focalLength) {
                diagramScene.annotations.push({
                    componentId: comp.id,
                    text: `f = ${comp.focalLength} mm`,
                    type: 'label',
                    autoGenerated: true
                });
            }
            
            if (comp.type === 'AcoustoOpticModulator' && comp.frequency) {
                diagramScene.annotations.push({
                    componentId: comp.id,
                    text: `f = ${(comp.frequency / 1e6).toFixed(1)} MHz`,
                    type: 'label',
                    autoGenerated: true
                });
            }
        });
    }

    /**
     * 波长转颜色
     */
    wavelengthToColor(wavelength) {
        // 可见光范围 380-780 nm
        if (wavelength < 380 || wavelength > 780) {
            return '#888888';  // 灰色表示不可见光
        }
        
        let r, g, b;
        
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0;
            b = 1;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0;
            g = (wavelength - 440) / (490 - 440);
            b = 1;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0;
            g = 1;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510);
            g = 1;
            b = 0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1;
            g = -(wavelength - 645) / (645 - 580);
            b = 0;
        } else {
            r = 1;
            g = 0;
            b = 0;
        }
        
        // 转换为十六进制
        const toHex = (val) => {
            const hex = Math.round(val * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
}

// ========== 单例模式 ==========
let converterInstance = null;

export function getSimulationToDiagramConverter(options) {
    if (!converterInstance) {
        converterInstance = new SimulationToDiagramConverter(options);
    }
    return converterInstance;
}

export function resetSimulationToDiagramConverter() {
    converterInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.SimulationToDiagramConverter = SimulationToDiagramConverter;
    window.getSimulationToDiagramConverter = getSimulationToDiagramConverter;
}
