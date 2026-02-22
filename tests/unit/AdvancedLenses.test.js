/**
 * AdvancedLenses.test.js - Cylindrical/Aspheric/GRIN basics
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { CylindricalLens } from '../../src/components/lenses/CylindricalLens.js';
import { AsphericLens } from '../../src/components/lenses/AsphericLens.js';
import { GRINLens } from '../../src/components/lenses/GRINLens.js';

test('CylindricalLens 中心入射不偏折', () => {
    const lens = new CylindricalLens(new Vector(0, 0), 80, 40, 100, 0, 'horizontal');
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(Math.abs(transmitted.direction.x) < 1e-6);
    assert.ok(transmitted.direction.y > 0.99);
});

test('AsphericLens 中心入射不偏折', () => {
    const lens = new AsphericLens(new Vector(0, 0), 60, 100, 0, [0, 0, 0, 0], 0);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(Math.abs(transmitted.direction.x) < 1e-6);
    assert.ok(transmitted.direction.y > 0.99);
});

test('GRINLens 折射率与节距基础', () => {
    const lens = new GRINLens(new Vector(0, 0), 50, 30, 1.6, 0.01, 0);
    const n0 = lens.getRefractiveIndex(0);
    const n10 = lens.getRefractiveIndex(10);
    assert.ok(n0 >= n10);
    assert.ok(lens.getPitchLength() > 600);
    assert.ok(lens.getEffectiveFocalLength() !== Infinity);
});

test('GRINLens g=0 时透射不偏折', () => {
    const lens = new GRINLens(new Vector(0, 0), 50, 30, 1.6, 0.0, 0);
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(transmitted.direction.x > 0.99);
    assert.ok(Math.abs(transmitted.direction.y) < 1e-6);
});
