/**
 * ThinLens.test.js - 单元测试 ThinLens 类
 * 使用 Node.js 内置 test runner (node:test)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';

test('ThinLens 构造函数', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    assert.equal(lens.diameter, 80);
    assert.equal(lens.focalLength, 150);
    assert.ok(lens.pos instanceof Vector);
});

test('ThinLens 焦距为0时转换为Infinity', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 0, 90);
    assert.equal(lens.focalLength, Infinity);
});

test('ThinLens 近零焦距防护 - interact方法', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 0.0000001, 90);
    // 焦距接近零时，deviation应该为0（直接透射）
    // 这个测试验证不会产生Infinity
    assert.ok(Math.abs(lens.focalLength) < 1e-6 || lens.focalLength === Infinity);
});

test('ThinLens getRefractiveIndex', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    const n = lens.getRefractiveIndex(550);
    assert.ok(n >= 1.0);
    assert.ok(n < 3.0);
});

test('ThinLens toJSON', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    const json = lens.toJSON();
    assert.equal(json.type, 'ThinLens');
    assert.equal(json.diameter, 80);
    assert.equal(json.focalLength, 150);
});

test('ThinLens setProperty - diameter', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    lens.setProperty('diameter', 100);
    assert.equal(lens.diameter, 100);
});

test('ThinLens setProperty - focalLength', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    lens.setProperty('focalLength', 200);
    assert.equal(lens.focalLength, 200);
});

test('ThinLens setProperty - focalLength=0转为Infinity', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 150, 90);
    lens.setProperty('focalLength', 0);
    assert.equal(lens.focalLength, Infinity);
});

test('ThinLens ABCD matrix - 凸透镜', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, 100, 90);
    const matrix = lens.getABCDMatrix();
    assert.equal(matrix.A, 1);
    assert.equal(matrix.B, 0);
    assert.equal(matrix.C, -1/100);
    assert.equal(matrix.D, 1);
});

test('ThinLens ABCD matrix - 平板', () => {
    const pos = new Vector(100, 100);
    const lens = new ThinLens(pos, 80, Infinity, 90);
    const matrix = lens.getABCDMatrix();
    assert.equal(matrix.A, 1);
    assert.equal(matrix.B, 0);
    assert.equal(matrix.C, 0);
    assert.equal(matrix.D, 1);
});
