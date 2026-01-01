/**
 * Vector.js - 2D向量类
 * 用于位置和方向计算
 */

export class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // --- 基本运算 ---
    add(v) { return new Vector(this.x + v.x, this.y + v.y); }
    subtract(v) { return new Vector(this.x - v.x, this.y - v.y); }
    multiply(n) { return new Vector(this.x * n, this.y * n); }
    divide(n) {
        if (n === 0) {
            console.error("Vector division by zero!");
            return new Vector(
                this.x > 0 ? Infinity : (this.x < 0 ? -Infinity : 0),
                this.y > 0 ? Infinity : (this.y < 0 ? -Infinity : 0)
            );
        }
        return new Vector(this.x / n, this.y / n);
    }

    // --- 矢量属性 ---
    magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    magnitudeSquared() { return this.x * this.x + this.y * this.y; }
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector(0, 0);
        return this.divide(mag);
    }

    // --- 矢量运算 ---
    dot(v) { return this.x * v.x + this.y * v.y; }
    cross(v) { return this.x * v.y - this.y * v.x; }

    // --- 变换 ---
    rotate(angleRad) {
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);
        return new Vector(
            this.x * cosA - this.y * sinA,
            this.x * sinA + this.y * cosA
        );
    }

    // --- 距离和角度 ---
    vectorTo(v) { return v.subtract(this); }
    distanceTo(v) { return Math.sqrt(this.distanceSquaredTo(v)); }
    distanceSquaredTo(v) {
        const dx = v.x - this.x;
        const dy = v.y - this.y;
        return dx * dx + dy * dy;
    }
    angle() { return Math.atan2(this.y, this.x); }

    // --- 其他 ---
    clone() { return new Vector(this.x, this.y); }
    set(x, y) { this.x = x; this.y = y; return this; }
    equals(v, tolerance = 1e-6) {
        return Math.abs(this.x - v.x) < tolerance && Math.abs(this.y - v.y) < tolerance;
    }

    // --- 静态方法 ---
    static fromAngle(angleRad) { return new Vector(Math.cos(angleRad), Math.sin(angleRad)); }
    static lerp(v1, v2, t) {
        t = Math.max(0, Math.min(1, t));
        return v1.multiply(1 - t).add(v2.multiply(t));
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Vector = Vector;
}
