/**
 * OpticalComponent.js - 光学元件基类
 * 所有与光线交互的元件的基类
 */

import { GameObject } from './GameObject.js';

export class OpticalComponent extends GameObject {
    constructor(pos, angleDeg = 0, label = "Optical Component") {
        super(pos, angleDeg, label);
    }

    /**
     * 计算光线与此元件的交点
     * @param {Vector} rayOrigin - 光线起点
     * @param {Vector} rayDirection - 光线方向（归一化）
     * @returns {Array} 交点信息数组 [{ distance, point, normal, surfaceId }, ...]
     */
    intersect(rayOrigin, rayDirection) {
        console.warn(`intersect() method not implemented for ${this.label} (${this.constructor.name})`);
        return [];
    }

    /**
     * 处理光线在交点处的交互
     * @param {Ray} ray - 入射光线
     * @param {Object} intersectionInfo - 交点信息
     * @param {Function} RayClass - Ray构造函数
     * @returns {Array} 新产生的光线数组
     */
    interact(ray, intersectionInfo, RayClass) {
        console.warn(`interact() method not implemented for ${this.label} (${this.constructor.name})`);
        ray.terminate('no_interaction_logic');
        return [];
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.OpticalComponent = OpticalComponent;
}
