/**
 * QuarterWavePlate.js - 四分之一波片
 * 将线偏振转换为圆/椭圆偏振或反之
 */

import { WavePlate } from './WavePlate.js';

export class QuarterWavePlate extends WavePlate {
    static functionDescription = "将线偏振转换为圆/椭圆偏振或反之。";

    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90) {
        super(pos, length, fastAxisAngleDeg, angleDeg, "四分之一波片 (λ/4)");
    }

    _getJonesMatrix() {
        // Jones matrix for a QWP with fast axis at 0 degrees: [[1, 0], [0, i]]
        return [
            [{ re: 1, im: 0 }, { re: 0, im: 0 }],
            [{ re: 0, im: 0 }, { re: 0, im: 1 }]
        ];
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.QuarterWavePlate = QuarterWavePlate;
}
