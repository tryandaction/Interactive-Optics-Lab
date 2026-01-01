/**
 * MathUtils.js - 数学工具函数
 * 提供常用的数学计算功能
 */

/**
 * 将角度限制在 [0, 2π) 范围内
 * @param {number} angle - 角度（弧度）
 * @returns {number} 规范化后的角度
 */
export function normalizeAngle(angle) {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
}

/**
 * 将角度限制在 [-π, π) 范围内
 * @param {number} angle - 角度（弧度）
 * @returns {number} 规范化后的角度
 */
export function normalizeAngleSigned(angle) {
    while (angle < -Math.PI) angle += 2 * Math.PI;
    while (angle >= Math.PI) angle -= 2 * Math.PI;
    return angle;
}

/**
 * 角度转弧度
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * 弧度转角度
 * @param {number} radians - 弧度
 * @returns {number} 角度
 */
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * 限制值在指定范围内
 * @param {number} value - 要限制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} t - 插值参数 (0-1)
 * @returns {number} 插值结果
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * 反向线性插值（求t值）
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} value - 当前值
 * @returns {number} 插值参数t
 */
export function inverseLerp(a, b, value) {
    if (Math.abs(b - a) < 1e-9) return 0;
    return (value - a) / (b - a);
}

/**
 * 平滑步进函数
 * @param {number} edge0 - 下边界
 * @param {number} edge1 - 上边界
 * @param {number} x - 输入值
 * @returns {number} 平滑插值结果 (0-1)
 */
export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * 检查两个浮点数是否近似相等
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @param {number} epsilon - 容差
 * @returns {boolean} 是否近似相等
 */
export function approximately(a, b, epsilon = 1e-6) {
    return Math.abs(a - b) < epsilon;
}

/**
 * 将值映射到新的范围
 * @param {number} value - 输入值
 * @param {number} inMin - 输入范围最小值
 * @param {number} inMax - 输入范围最大值
 * @param {number} outMin - 输出范围最小值
 * @param {number} outMax - 输出范围最大值
 * @returns {number} 映射后的值
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

/**
 * 计算两点之间的距离
 * @param {number} x1 - 第一点X坐标
 * @param {number} y1 - 第一点Y坐标
 * @param {number} x2 - 第二点X坐标
 * @param {number} y2 - 第二点Y坐标
 * @returns {number} 距离
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算两点之间的距离平方（避免开方运算）
 * @param {number} x1 - 第一点X坐标
 * @param {number} y1 - 第一点Y坐标
 * @param {number} x2 - 第二点X坐标
 * @param {number} y2 - 第二点Y坐标
 * @returns {number} 距离平方
 */
export function distanceSquared(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
}

/**
 * 计算点到线段的最短距离
 * @param {number} px - 点X坐标
 * @param {number} py - 点Y坐标
 * @param {number} x1 - 线段起点X
 * @param {number} y1 - 线段起点Y
 * @param {number} x2 - 线段终点X
 * @param {number} y2 - 线段终点Y
 * @returns {number} 最短距离
 */
export function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    
    if (lenSq < 1e-9) {
        return distance(px, py, x1, y1);
    }
    
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = clamp(t, 0, 1);
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    return distance(px, py, closestX, closestY);
}

/**
 * 检查点是否在矩形内
 * @param {number} px - 点X坐标
 * @param {number} py - 点Y坐标
 * @param {number} rx - 矩形左上角X
 * @param {number} ry - 矩形左上角Y
 * @param {number} rw - 矩形宽度
 * @param {number} rh - 矩形高度
 * @returns {boolean} 是否在矩形内
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * 检查两个矩形是否相交
 * @param {Object} rect1 - 第一个矩形 {x, y, width, height}
 * @param {Object} rect2 - 第二个矩形 {x, y, width, height}
 * @returns {boolean} 是否相交
 */
export function rectsIntersect(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * 生成指定范围内的随机数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机数
 */
export function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * 生成指定范围内的随机整数
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @returns {number} 随机整数
 */
export function randomInt(min, max) {
    return Math.floor(randomRange(min, max + 1));
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.MathUtils = {
        normalizeAngle,
        normalizeAngleSigned,
        degToRad,
        radToDeg,
        clamp,
        lerp,
        inverseLerp,
        smoothstep,
        approximately,
        mapRange,
        distance,
        distanceSquared,
        pointToSegmentDistance,
        pointInRect,
        rectsIntersect,
        randomRange,
        randomInt
    };
}
