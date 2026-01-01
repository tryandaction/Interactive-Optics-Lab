/**
 * state/index.js - 状态管理模块导出
 */

// 导出命名空间对象（用于兼容旧代码）
import * as GlobalStateModule from './GlobalState.js';
import * as CameraStateModule from './CameraState.js';
import * as SelectionStateModule from './SelectionState.js';

// 导出所有函数
export * from './GlobalState.js';
export * from './CameraState.js';
export * from './SelectionState.js';

// 导出命名空间对象
export const GlobalState = GlobalStateModule;
export const CameraState = CameraStateModule;
export const SelectionState = SelectionStateModule;
