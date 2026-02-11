/**
 * HalfWavePlate.js - 半波片
 * 将线偏振方向旋转两倍于快轴与入射夹角
 */

import { WavePlate } from './WavePlate.js';

export class HalfWavePlate extends WavePlate {
    static functionDescription = "将线偏振方向旋转两倍于快轴与入射夹角。";

    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90) {
        super(pos, length, fastAxisAngleDeg, angleDeg, "半波片 (λ/2)");
    }

    _getJonesMatrix() {
        // Jones matrix for a HWP with fast axis at 0 degrees is [[1, 0], [0, -1]]
        return [
            [{ re: 1, im: 0 }, { re: 0, im: 0 }],
            [{ re: 0, im: 0 }, { re: -1, im: 0 }]
        ];
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.HalfWavePlate = HalfWavePlate;
}
