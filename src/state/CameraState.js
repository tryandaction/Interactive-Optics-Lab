/**
 * CameraState.js - 相机状态管理
 * 管理视图缩放、平移和坐标转换
 */

import { Vector } from '../core/Vector.js';

// 相机状态
const cameraState = {
    scale: 1.0,           // 当前缩放级别 (1.0 = 100%)
    offset: new Vector(0, 0), // 当前平移偏移
    isPanning: false,     // 是否正在平移
    lastPanMousePos: null, // 平移开始时的鼠标位置
    
    // 缩放限制
    minScale: 0.1,
    maxScale: 10.0,
    
    // 画布尺寸（需要在初始化时设置）
    canvasWidth: 800,
    canvasHeight: 600
};

/**
 * 获取当前缩放级别
 * @returns {number} 缩放级别
 */
export function getScale() {
    return cameraState.scale;
}

/**
 * 设置缩放级别
 * @param {number} scale - 新的缩放级别
 */
export function setScale(scale) {
    cameraState.scale = Math.max(cameraState.minScale, Math.min(cameraState.maxScale, scale));
}

/**
 * 获取当前偏移
 * @returns {Vector} 偏移向量
 */
export function getOffset() {
    return cameraState.offset.clone();
}

/**
 * 设置偏移
 * @param {Vector} offset - 新的偏移向量
 */
export function setOffset(offset) {
    if (offset instanceof Vector) {
        cameraState.offset = offset.clone();
    }
}

/**
 * 屏幕坐标转世界坐标
 * @param {number} screenX - 屏幕X坐标
 * @param {number} screenY - 屏幕Y坐标
 * @returns {Vector} 世界坐标
 */
export function screenToWorld(screenX, screenY) {
    const worldX = (screenX - cameraState.offset.x) / cameraState.scale;
    const worldY = (screenY - cameraState.offset.y) / cameraState.scale;
    return new Vector(worldX, worldY);
}

/**
 * 世界坐标转屏幕坐标
 * @param {number} worldX - 世界X坐标
 * @param {number} worldY - 世界Y坐标
 * @returns {Vector} 屏幕坐标
 */
export function worldToScreen(worldX, worldY) {
    const screenX = worldX * cameraState.scale + cameraState.offset.x;
    const screenY = worldY * cameraState.scale + cameraState.offset.y;
    return new Vector(screenX, screenY);
}

/**
 * 缩放视图
 * @param {number} delta - 缩放增量（正值放大，负值缩小）
 * @param {number} centerX - 缩放中心X（屏幕坐标）
 * @param {number} centerY - 缩放中心Y（屏幕坐标）
 */
export function zoom(delta, centerX, centerY) {
    const oldScale = cameraState.scale;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newScale = Math.max(cameraState.minScale, Math.min(cameraState.maxScale, oldScale * zoomFactor));
    
    if (Math.abs(newScale - oldScale) > 1e-9) {
        // 保持缩放中心点不变
        const worldCenter = screenToWorld(centerX, centerY);
        cameraState.scale = newScale;
        cameraState.offset.x = centerX - worldCenter.x * newScale;
        cameraState.offset.y = centerY - worldCenter.y * newScale;
    }
}

/**
 * 平移视图
 * @param {number} dx - X方向平移量（屏幕坐标）
 * @param {number} dy - Y方向平移量（屏幕坐标）
 */
export function pan(dx, dy) {
    cameraState.offset.x += dx;
    cameraState.offset.y += dy;
}

/**
 * 开始平移
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} mouseY - 鼠标Y坐标
 */
export function startPan(mouseX, mouseY) {
    cameraState.isPanning = true;
    cameraState.lastPanMousePos = new Vector(mouseX, mouseY);
}

/**
 * 更新平移
 * @param {number} mouseX - 当前鼠标X坐标
 * @param {number} mouseY - 当前鼠标Y坐标
 */
export function updatePan(mouseX, mouseY) {
    if (cameraState.isPanning && cameraState.lastPanMousePos) {
        const dx = mouseX - cameraState.lastPanMousePos.x;
        const dy = mouseY - cameraState.lastPanMousePos.y;
        pan(dx, dy);
        cameraState.lastPanMousePos = new Vector(mouseX, mouseY);
    }
}

/**
 * 结束平移
 */
export function endPan() {
    cameraState.isPanning = false;
    cameraState.lastPanMousePos = null;
}

/**
 * 检查是否正在平移
 * @returns {boolean} 是否正在平移
 */
export function isPanning() {
    return cameraState.isPanning;
}

/**
 * 重置相机到默认状态
 */
export function resetCamera() {
    cameraState.scale = 1.0;
    cameraState.offset = new Vector(0, 0);
    cameraState.isPanning = false;
    cameraState.lastPanMousePos = null;
}

/**
 * 设置画布尺寸
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 */
export function setCanvasSize(width, height) {
    cameraState.canvasWidth = width;
    cameraState.canvasHeight = height;
}

/**
 * 居中视图到指定点
 * @param {number} worldX - 世界X坐标
 * @param {number} worldY - 世界Y坐标
 */
export function centerOn(worldX, worldY) {
    cameraState.offset.x = cameraState.canvasWidth / 2 - worldX * cameraState.scale;
    cameraState.offset.y = cameraState.canvasHeight / 2 - worldY * cameraState.scale;
}

/**
 * 获取完整相机状态
 * @returns {Object} 相机状态对象
 */
export function getCameraState() {
    return {
        scale: cameraState.scale,
        offset: cameraState.offset.clone(),
        isPanning: cameraState.isPanning,
        canvasWidth: cameraState.canvasWidth,
        canvasHeight: cameraState.canvasHeight
    };
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.CameraState = {
        getScale,
        setScale,
        getOffset,
        setOffset,
        screenToWorld,
        worldToScreen,
        zoom,
        pan,
        startPan,
        updatePan,
        endPan,
        isPanning,
        resetCamera,
        setCanvasSize,
        centerOn,
        getCameraState
    };
}
