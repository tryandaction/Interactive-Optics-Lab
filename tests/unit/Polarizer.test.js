/**
 * Polarizer.test.js - 单元测试偏振片透过/消光
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { Polarizer } from '../../src/components/polarizers/Polarizer.js';

const intersectPolarizer = (polarizer, ray) => {
    const hits = polarizer.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    return hits[0];
};

test('Polarizer 透过轴一致：强度保持', () => {
    const polarizer = new Polarizer(new Vector(0, 0), 100, 0, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    ray.setLinearPolarization(0);
    const hit = intersectPolarizer(polarizer, ray);
    const out = polarizer.interact(ray, hit, Ray);
    assert.equal(out.length, 1, '应有透过光线');
    assert.ok(Math.abs(out[0].intensity - 1.0) < 1e-6);
});

test('Polarizer 透过轴正交：强度接近 0', () => {
    const polarizer = new Polarizer(new Vector(0, 0), 100, 0, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    ray.setLinearPolarization(Math.PI / 2);
    const hit = intersectPolarizer(polarizer, ray);
    const out = polarizer.interact(ray, hit, Ray);
    if (out.length === 0) {
        assert.ok(true);
        return;
    }
    assert.ok(out[0].intensity < 1e-6);
});
