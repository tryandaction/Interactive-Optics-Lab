import { getComponentValidation } from './ComponentValidationMatrix.js';

export const RELIABILITY_LEVELS = Object.freeze({
    EXACT_GEOMETRIC: 'exact_geometric',
    PARAXIAL_APPROXIMATION: 'paraxial_approximation',
    EDUCATIONAL_VISUALIZATION: 'educational_visualization',
    EXPERIMENTAL: 'experimental',
    VISUAL_ONLY: 'visual_only',
    UNKNOWN: 'unknown'
});

export const RELIABILITY_LABELS = Object.freeze({
    [RELIABILITY_LEVELS.EXACT_GEOMETRIC]: '几何光学基线',
    [RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION]: '近轴近似',
    [RELIABILITY_LEVELS.EDUCATIONAL_VISUALIZATION]: '教学可视化',
    [RELIABILITY_LEVELS.EXPERIMENTAL]: '实验性模型',
    [RELIABILITY_LEVELS.VISUAL_ONLY]: '仅图示',
    [RELIABILITY_LEVELS.UNKNOWN]: '未评估'
});

export const COMPONENT_RELIABILITY = Object.freeze({
    LaserSource: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '按给定方向、波长和强度生成几何光线。',
        limitations: '不模拟真实激光模式、线宽、相干长度或噪声。'
    },
    FanSource: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '按角度范围生成离散几何光线。',
        limitations: '光线数量有限时只能表示采样效果。'
    },
    LineSource: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '沿线段均匀采样并发射几何光线。',
        limitations: '不代表真实扩展光源的辐射传输。'
    },
    Mirror: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '平面镜按反射定律处理单界面反射。',
        limitations: '固定损耗近似；不模拟镀膜、偏振相移或表面误差。'
    },
    ThinLens: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '薄透镜近轴偏折与 ABCD 矩阵基础计算。',
        limitations: '不是真实透镜表面追迹；大角度、厚透镜和像差结论需谨慎。'
    },
    Prism: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '三角棱镜界面折射、反射、全反射与基础色散。',
        limitations: '材料模型有限；不模拟偏振 Fresnel 相位、吸收和制造误差。'
    },
    DielectricBlock: {
        level: RELIABILITY_LEVELS.EXACT_GEOMETRIC,
        scope: '矩形介质边界折射、反射、全反射、吸收和基础色散。',
        limitations: '相干、薄膜和偏振相位仍需单独验证。'
    },
    BeamSplitter: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '按固定比例或简化 PBS Jones 投影拆分光线。',
        limitations: '不模拟真实镀膜、入射角依赖、偏振相移和相干干涉细节。'
    },
    Polarizer: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '基于 Jones/Malus 定律的线偏振强度投影。',
        limitations: '不模拟真实消光比、厚度、波长依赖和散射。'
    },
    HalfWavePlate: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '理想半波片 Jones 矩阵。',
        limitations: '不模拟色散、带宽、快轴误差或损耗。'
    },
    QuarterWavePlate: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '理想四分之一波片 Jones 矩阵。',
        limitations: '不模拟色散、带宽、快轴误差或损耗。'
    },
    WavePlate: {
        level: RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION,
        scope: '理想延迟片 Jones 矩阵。',
        limitations: '任意延迟量、带宽和材料参数仍需专项验证。'
    },
    DiffractionGrating: {
        level: RELIABILITY_LEVELS.EDUCATIONAL_VISUALIZATION,
        scope: '离散衍射级次可视化与基础能量限制。',
        limitations: '不替代严格标量或矢量衍射计算。'
    },
    Aperture: {
        level: RELIABILITY_LEVELS.EDUCATIONAL_VISUALIZATION,
        scope: '几何遮挡和简化光束直径限制。',
        limitations: '衍射图样属于简化可视化。'
    },
    OpticalFiber: {
        level: RELIABILITY_LEVELS.EXPERIMENTAL,
        scope: '输入耦合和输出光线的交互式近似。',
        limitations: '不模拟模式场、数值孔径分布、色散或耦合积分。'
    },
    AcoustoOpticModulator: {
        level: RELIABILITY_LEVELS.EXPERIMENTAL,
        scope: 'AOM 光路偏转和频移的草图级模拟。',
        limitations: '不模拟声光耦合效率、带宽和真实晶体参数。'
    },
    FabryPerotCavity: {
        level: RELIABILITY_LEVELS.EXPERIMENTAL,
        scope: '腔体光路草图与基础交互。',
        limitations: '不作为精细腔模、线宽、透射谱或锁频分析工具。'
    },
    AtomicCell: {
        level: RELIABILITY_LEVELS.VISUAL_ONLY,
        scope: 'AMO 光路中的原子气室图示。',
        limitations: '不模拟原子能级、吸收、色散或荧光。'
    },
    MagneticCoil: {
        level: RELIABILITY_LEVELS.VISUAL_ONLY,
        scope: 'AMO 光路中的磁场线圈图示。',
        limitations: '不计算磁场分布。'
    },
    CustomComponent: {
        level: RELIABILITY_LEVELS.VISUAL_ONLY,
        scope: '用户自定义图示或占位元件。',
        limitations: '默认不参与物理计算。'
    }
});

export function getComponentReliability(componentOrType) {
    const type = typeof componentOrType === 'string'
        ? componentOrType
        : componentOrType?.type || componentOrType?.constructor?.name;
    const validation = getComponentValidation(type);

    return COMPONENT_RELIABILITY[type] || (validation ? {
        level: validation.reliability || RELIABILITY_LEVELS.UNKNOWN,
        scope: `Validation status: ${validation.validation}. Category: ${validation.category}.`,
        limitations: validation.next || 'Validation matrix entry exists, but limitations should be expanded before product claims.'
    } : {
        level: RELIABILITY_LEVELS.UNKNOWN,
        scope: '该元件尚未纳入可信度基线。',
        limitations: '使用前应补充模型说明和测试。'
    });
}

export function getReliabilityLabel(level) {
    return RELIABILITY_LABELS[level] || RELIABILITY_LABELS[RELIABILITY_LEVELS.UNKNOWN];
}
