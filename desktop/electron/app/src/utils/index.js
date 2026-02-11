/**
 * utils/index.js - 工具模块导出
 */

import * as ColorUtilsModule from './ColorUtils.js';
import * as MathUtilsModule from './MathUtils.js';
import * as SerializationModule from './Serialization.js';

// 导出所有函数
export * from './ColorUtils.js';
export * from './MathUtils.js';
export * from './Serialization.js';

// 导出命名空间对象（用于兼容旧代码）
export const ColorUtils = ColorUtilsModule;
export const MathUtils = MathUtilsModule;
export const Serialization = SerializationModule;
