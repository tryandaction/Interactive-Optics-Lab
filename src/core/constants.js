/**
 * constants.js - 全局常量定义
 * 光学和物理常数、渲染参数等
 */

// --- 物理常数 ---
export const SPEED_OF_LIGHT = 299792458; // m/s
export const N_AIR = 1.000293; // 空气折射率
export const DEFAULT_WAVELENGTH_NM = 550; // 默认波长 (nm, 绿色)

// --- 光线追踪参数 ---
export const MAX_RAY_BOUNCES = 500; // 最大反射/折射次数
export const MIN_RAY_INTENSITY = 0.0001; // 最小光强阈值
export const MIN_RAY_WIDTH = 1.0; // 最小光线宽度
export const MAX_RAY_WIDTH = 3.0; // 最大光线宽度
export const MAX_RAY_BOUNCES_FOR_PATH = 300; // 路径安全限制
export const MAX_RAYS_PER_SOURCE = 1001; // 每个光源最大光线数

// --- 单位转换 ---
export const PIXELS_PER_MICROMETER = 1.0; // 1像素 = 1微米
export const PIXELS_PER_NANOMETER = PIXELS_PER_MICROMETER / 1000.0;

// --- 网格和对齐 ---
export const GRID_SIZE = 50; // 网格间距
export const GRID_SNAP_THRESHOLD = 10.0; // 网格吸附阈值
export const SNAP_THRESHOLD = 5.0; // 对齐吸附阈值

// --- 视觉效果 ---
export const GUIDE_COLOR = 'rgba(0, 255, 255, 0.75)'; // 对齐辅助线颜色
export const GUIDE_DASH = [3, 3]; // 虚线模式

// --- 箭头动画 ---
export const ARROW_SIZE_PIXELS = 12; // 箭头大小
export const MIN_ARROW_INTENSITY_THRESHOLD = 0.05; // 最小箭头强度阈值
export const BS_SPLIT_ARROW_THRESHOLD = 0.20; // 分束器箭头阈值
export const DEFAULT_ARROW_SPEED = 100; // 默认箭头动画速度

// --- 拖拽阴影 ---
export const DRAG_SHADOW_DURATION = 800; // 拖拽阴影持续时间 (ms)

// --- 存储键 ---
export const LOCALSTORAGE_SETTINGS_KEY = 'opticsLabSettings';
export const LOCALSTORAGE_SCENE_KEY = 'opticsLabSceneData';

// --- 模拟模式 ---
export const SIMULATION_MODES = {
    RAY_TRACE: 'ray_trace',
    LENS_IMAGING: 'lens_imaging'
};

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SPEED_OF_LIGHT = SPEED_OF_LIGHT;
    window.N_AIR = N_AIR;
    window.DEFAULT_WAVELENGTH_NM = DEFAULT_WAVELENGTH_NM;
    window.MAX_RAY_BOUNCES = MAX_RAY_BOUNCES;
    window.MIN_RAY_INTENSITY = MIN_RAY_INTENSITY;
    window.MIN_RAY_WIDTH = MIN_RAY_WIDTH;
    window.MAX_RAY_WIDTH = MAX_RAY_WIDTH;
    window.PIXELS_PER_MICROMETER = PIXELS_PER_MICROMETER;
    window.PIXELS_PER_NANOMETER = PIXELS_PER_NANOMETER;
    window.MAX_RAYS_PER_SOURCE = MAX_RAYS_PER_SOURCE;
}
