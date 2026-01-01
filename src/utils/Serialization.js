/**
 * Serialization.js - 序列化工具
 * 提供场景和组件的序列化/反序列化功能
 */

import { Vector } from '../core/Vector.js';

/**
 * 序列化场景数据
 * @param {Array} components - 组件数组
 * @param {Object} options - 可选配置
 * @returns {string} JSON字符串
 */
export function serializeScene(components, options = {}) {
    const sceneData = {
        version: options.version || '1.0',
        timestamp: Date.now(),
        components: components.map(comp => serializeComponent(comp))
    };
    
    if (options.metadata) {
        sceneData.metadata = options.metadata;
    }
    
    return JSON.stringify(sceneData, null, options.pretty ? 2 : 0);
}

/**
 * 序列化单个组件
 * @param {Object} component - 组件对象
 * @returns {Object} 序列化后的数据
 */
export function serializeComponent(component) {
    if (!component) return null;
    
    // 使用组件自身的 toJSON 方法（如果存在）
    if (typeof component.toJSON === 'function') {
        return component.toJSON();
    }
    
    // 默认序列化
    const data = {
        type: component.constructor.name,
        id: component.id,
        posX: component.pos?.x,
        posY: component.pos?.y,
        angleDeg: component.angleRad ? component.angleRad * (180 / Math.PI) : 0
    };
    
    // 复制其他可序列化属性
    const excludeKeys = ['pos', 'angleRad', 'selected', 'dragging', 'id'];
    for (const key of Object.keys(component)) {
        if (excludeKeys.includes(key)) continue;
        if (typeof component[key] === 'function') continue;
        if (component[key] instanceof Vector) {
            data[key + 'X'] = component[key].x;
            data[key + 'Y'] = component[key].y;
        } else if (typeof component[key] !== 'object' || component[key] === null) {
            data[key] = component[key];
        }
    }
    
    return data;
}

/**
 * 反序列化场景数据
 * @param {string} jsonString - JSON字符串
 * @param {Object} componentClasses - 组件类映射 {className: ClassConstructor}
 * @returns {Object} 解析后的场景数据 {components, metadata, version}
 */
export function deserializeScene(jsonString, componentClasses) {
    let sceneData;
    try {
        sceneData = JSON.parse(jsonString);
    } catch (e) {
        console.error('Failed to parse scene JSON:', e);
        return { components: [], error: 'Invalid JSON' };
    }
    
    const components = [];
    const errors = [];
    
    if (Array.isArray(sceneData.components)) {
        for (const compData of sceneData.components) {
            try {
                const component = deserializeComponent(compData, componentClasses);
                if (component) {
                    components.push(component);
                }
            } catch (e) {
                errors.push({ data: compData, error: e.message });
                console.error('Failed to deserialize component:', compData, e);
            }
        }
    }
    
    return {
        components,
        metadata: sceneData.metadata,
        version: sceneData.version,
        timestamp: sceneData.timestamp,
        errors: errors.length > 0 ? errors : undefined
    };
}

/**
 * 反序列化单个组件
 * @param {Object} data - 组件数据
 * @param {Object} componentClasses - 组件类映射
 * @returns {Object|null} 组件实例或null
 */
export function deserializeComponent(data, componentClasses) {
    if (!data || !data.type) {
        console.warn('Invalid component data:', data);
        return null;
    }
    
    const ComponentClass = componentClasses[data.type];
    if (!ComponentClass) {
        console.warn(`Unknown component type: ${data.type}`);
        return null;
    }
    
    // 创建位置向量
    const pos = new Vector(data.posX || 0, data.posY || 0);
    
    // 根据组件类型创建实例
    // 这里需要根据具体组件类型传递正确的参数
    let component;
    
    try {
        // 尝试使用静态 fromJSON 方法（如果存在）
        if (typeof ComponentClass.fromJSON === 'function') {
            component = ComponentClass.fromJSON(data);
        } else {
            // 使用通用构造方式
            component = createComponentFromData(ComponentClass, data, pos);
        }
        
        // 恢复ID（如果需要保持一致性）
        if (data.id && component) {
            component.id = data.id;
        }
        
        return component;
    } catch (e) {
        console.error(`Failed to create ${data.type}:`, e);
        return null;
    }
}

/**
 * 根据数据创建组件实例
 * @param {Function} ComponentClass - 组件类
 * @param {Object} data - 组件数据
 * @param {Vector} pos - 位置向量
 * @returns {Object} 组件实例
 */
function createComponentFromData(ComponentClass, data, pos) {
    const angleDeg = data.angleDeg || 0;
    
    // 根据组件类型名称决定构造参数
    const typeName = data.type;
    
    switch (typeName) {
        case 'LaserSource':
            return new ComponentClass(pos, data.wavelengthNm, data.intensity, angleDeg, data.beamDiameter);
        case 'FanSource':
            return new ComponentClass(pos, data.wavelengthNm, data.intensity, angleDeg, data.fanAngleDeg, data.numRays);
        case 'LineSource':
            return new ComponentClass(pos, data.wavelengthNm, data.intensity, angleDeg, data.length, data.numRays);
        case 'WhiteLightSource':
            return new ComponentClass(pos, data.intensity, angleDeg, data.beamDiameter, data.numWavelengths);
        case 'Mirror':
            return new ComponentClass(pos, data.length, angleDeg);
        case 'SphericalMirror':
            return new ComponentClass(pos, data.length, data.radiusOfCurvature, angleDeg);
        case 'ParabolicMirror':
            return new ComponentClass(pos, data.length, data.focalLength, angleDeg);
        case 'ThinLens':
            return new ComponentClass(pos, data.focalLength, data.diameter, angleDeg, data.lensType);
        case 'Polarizer':
            return new ComponentClass(pos, data.length, data.transmissionAxisAngleDeg, angleDeg);
        case 'BeamSplitter':
            return new ComponentClass(pos, data.length, angleDeg, data.splitterType, data.splitRatio);
        case 'Screen':
            return new ComponentClass(pos, data.length, angleDeg);
        case 'Photodiode':
            return new ComponentClass(pos, angleDeg, data.diameter);
        case 'Prism':
            return new ComponentClass(pos, data.baseLength, data.apexAngleDeg, angleDeg, data.baseRefractiveIndex, data.dispersionCoeffB);
        case 'DiffractionGrating':
            return new ComponentClass(pos, data.length, data.gratingPeriodInMicrons, angleDeg, data.maxOrder);
        case 'DielectricBlock':
            return new ComponentClass(pos, data.width, data.height, angleDeg, data.baseRefractiveIndex, data.dispersionCoeffB_nm2, data.absorptionCoeff);
        case 'Aperture':
            return new ComponentClass(pos, data.length, data.numberOfSlits, data.slitWidth, data.slitSeparation, angleDeg);
        case 'CustomComponent':
            return new ComponentClass(pos, data.width, data.height, angleDeg, data.text);
        default:
            // 尝试通用构造
            return new ComponentClass(pos, angleDeg);
    }
}

/**
 * 导出场景为文件
 * @param {Array} components - 组件数组
 * @param {string} filename - 文件名
 * @param {Object} options - 可选配置
 */
export function exportSceneToFile(components, filename = 'scene.json', options = {}) {
    const jsonString = serializeScene(components, { ...options, pretty: true });
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 从文件导入场景
 * @param {File} file - 文件对象
 * @param {Object} componentClasses - 组件类映射
 * @returns {Promise<Object>} 解析后的场景数据
 */
export function importSceneFromFile(file, componentClasses) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const result = deserializeScene(e.target.result, componentClasses);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Serialization = {
        serializeScene,
        serializeComponent,
        deserializeScene,
        deserializeComponent,
        exportSceneToFile,
        importSceneFromFile
    };
}
