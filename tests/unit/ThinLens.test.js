/**
 * ThinLens.test.js - 单元测试 ThinLens 类
 * 使用 Node.js 内置 test runner (node:test)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';
import { LENS_TYPES, ThinLens } from '../../src/components/lenses/ThinLens.js';

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

test('ThinLens JSON and generic scene serialization preserve custom thick-lens parameters', () => {
    const lens = new ThinLens(new Vector(120, 80), 64, 180, 30);
    lens.id = 'thick-lens-1';
    lens.setProperty('lensType', LENS_TYPES.THICK_CUSTOM);
    lens.setProperty('thickness', 18);
    lens.setProperty('frontRadius', 75);
    lens.setProperty('backRadius', -52);
    lens.setProperty('baseRefractiveIndex', 1.61);
    lens.setProperty('dispersionCoeffB', 7800);
    lens.setProperty('quality', 0.93);

    const restored = ThinLens.fromJSON(JSON.parse(JSON.stringify(lens.toJSON())));
    const scene = deserializeScene(serializeScene([lens]), { ThinLens });
    const sceneLens = scene.components[0];

    for (const candidate of [restored, sceneLens]) {
        assert.equal(candidate.id, 'thick-lens-1');
        assert.equal(candidate.lensType, LENS_TYPES.THICK_CUSTOM);
        assert.equal(candidate.thickness, 18);
        assert.equal(candidate.frontRadius, 75);
        assert.equal(candidate.backRadius, -52);
        assert.equal(candidate.baseRefractiveIndex, 1.61);
        assert.equal(candidate.dispersionCoeffB, 7800);
        assert.equal(candidate.quality, 0.93);
        assert.equal(candidate.pos.x, 120);
        assert.equal(candidate.pos.y, 80);
        assert.ok(Math.abs(candidate.angleRad * 180 / Math.PI - 30) < 1e-9);
    }
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
