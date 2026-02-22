/**
 * WavePlate.test.js - 单元测试波片偏振变换
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { HalfWavePlate } from '../../src/components/polarizers/HalfWavePlate.js';
import { QuarterWavePlate } from '../../src/components/polarizers/QuarterWavePlate.js';

const intersectPlate = (plate, ray) => {
    const hits = plate.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    return hits[0];
};

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

test('HalfWavePlate 旋转线偏振方向 (45° -> -45°)', () => {
    const plate = new HalfWavePlate(new Vector(0, 0), 80, 0, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1));
    ray.setLinearPolarization(Math.PI / 4);
    const hit = intersectPlate(plate, ray);
    const out = plate.interact(ray, hit, Ray);
    assert.equal(out.length, 1);
    const outAngle = out[0].getPolarizationAngle();
    assert.ok(Math.abs(angleDiff(outAngle, -Math.PI / 4)) < 1e-4);
});

test('HalfWavePlate 快轴对齐不改变偏振方向', () => {
    const plate = new HalfWavePlate(new Vector(0, 0), 80, 0, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1));
    ray.setLinearPolarization(0);
    const hit = intersectPlate(plate, ray);
    const out = plate.interact(ray, hit, Ray);
    assert.equal(out.length, 1);
    const outAngle = out[0].getPolarizationAngle();
    assert.ok(Math.abs(angleDiff(outAngle, 0)) < 1e-4);
});

test('QuarterWavePlate 将 45° 线偏振转换为圆偏振', () => {
    const plate = new QuarterWavePlate(new Vector(0, 0), 80, 0, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1));
    ray.setLinearPolarization(Math.PI / 4);
    const hit = intersectPlate(plate, ray);
    const out = plate.interact(ray, hit, Ray);
    assert.equal(out.length, 1);
    assert.equal(out[0].getPolarizationAngle(), 'circular');
});
