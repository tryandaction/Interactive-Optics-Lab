/**
 * Vector.test.js - 单元测试 Vector 类
 * 使用 Node.js 内置 test runner (node:test)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';

test('Vector 构造函数', () => {
    const v = new Vector(3, 4);
    assert.equal(v.x, 3);
    assert.equal(v.y, 4);
});

test('Vector 加法', () => {
    const v1 = new Vector(1, 2);
    const v2 = new Vector(3, 4);
    const result = v1.add(v2);
    assert.equal(result.x, 4);
    assert.equal(result.y, 6);
});

test('Vector 减法', () => {
    const v1 = new Vector(5, 7);
    const v2 = new Vector(2, 3);
    const result = v1.subtract(v2);
    assert.equal(result.x, 3);
    assert.equal(result.y, 4);
});

test('Vector 乘法', () => {
    const v = new Vector(2, 3);
    const result = v.multiply(3);
    assert.equal(result.x, 6);
    assert.equal(result.y, 9);
});

test('Vector 除法 - 正常情况', () => {
    const v = new Vector(10, 20);
    const result = v.divide(2);
    assert.equal(result.x, 5);
    assert.equal(result.y, 10);
});

test('Vector 除法 - 零除防护', () => {
    const v = new Vector(10, 20);
    const result = v.divide(0);
    assert.equal(result.x, 0);
    assert.equal(result.y, 0);
});

test('Vector magnitude', () => {
    const v = new Vector(3, 4);
    assert.equal(v.magnitude(), 5);
});

test('Vector normalize', () => {
    const v = new Vector(3, 4);
    const normalized = v.normalize();
    assert.equal(normalized.x, 0.6);
    assert.equal(normalized.y, 0.8);
});

test('Vector normalize - 零向量', () => {
    const v = new Vector(0, 0);
    const normalized = v.normalize();
    assert.equal(normalized.x, 0);
    assert.equal(normalized.y, 0);
});

test('Vector rotate', () => {
    const v = new Vector(1, 0);
    const rotated = v.rotate(Math.PI / 2);
    assert.ok(Math.abs(rotated.x) < 1e-10);
    assert.ok(Math.abs(rotated.y - 1) < 1e-10);
});

test('Vector dot product', () => {
    const v1 = new Vector(2, 3);
    const v2 = new Vector(4, 5);
    assert.equal(v1.dot(v2), 23);
});

test('Vector cross product', () => {
    const v1 = new Vector(2, 3);
    const v2 = new Vector(4, 5);
    assert.equal(v1.cross(v2), -2);
});

test('Vector fromAngle', () => {
    const v = Vector.fromAngle(0);
    assert.ok(Math.abs(v.x - 1) < 1e-10);
    assert.ok(Math.abs(v.y) < 1e-10);
});
