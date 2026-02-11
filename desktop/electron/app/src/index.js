/**
 * index.js - 模块化光学模拟器入口
 * 导出所有核心模块和组件
 */

// --- 核心模块 ---
export * from './core/index.js';

// --- 组件 ---
export * from './components/index.js';

// --- 状态管理 ---
export * from './state/index.js';

// --- 工具函数 ---
export * from './utils/index.js';

// --- 渲染模块 ---
export * from './rendering/index.js';

// --- 模拟模块 ---
export * from './simulation/index.js';

// --- UI 模块 ---
export * from './ui/index.js';

// --- 管理器 ---
export * from './managers/index.js';

// --- 应用 ---
export * from './app/index.js';

// --- 专业绘图模式 ---
export * from './diagram/index.js';

console.log("光学模拟器模块化版本已加载");
