/**
 * DiffractionGrating.test.js - 单元测试衍射光栅
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { DiffractionGrating } from '../../src/components/special/DiffractionGrating.js';

const EPS = 1e-6;

test('DiffractionGrating 产生多级次且能量不增', () => {
    const grating = new DiffractionGrating(new Vector(0, 0), 100, 1.0, 0, 1);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    const hits = grating.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    const out = grating.interact(ray, hits[0], Ray);
    assert.ok(out.length >= 1, '应至少产生零级');
    const total = out.reduce((acc, r) => acc + r.intensity, 0);
    assert.ok(total <= 1.0 + 1e-6);
});

test('DiffractionGrating normal incidence separates +/- first orders symmetrically', () => {
    const grating = new DiffractionGrating(new Vector(0, 0), 100, 1.0, 0, 1);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    const [hit] = grating.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'normal incident ray should hit grating');

    const out = grating.interact(ray, hit, Ray);
    assert.equal(out.length, 3, 'orders -1, 0, +1 should be present for 550nm / 1um');

    const negative = out.find(r => r.direction.x < -0.1);
    const zero = out.find(r => Math.abs(r.direction.x) < EPS);
    const positive = out.find(r => r.direction.x > 0.1);

    assert.ok(negative, 'missing -1 order');
    assert.ok(zero, 'missing 0 order');
    assert.ok(positive, 'missing +1 order');
    assert.ok(negative.direction.y > 0);
    assert.ok(positive.direction.y > 0);
    assert.ok(Math.abs(negative.direction.x + positive.direction.x) < EPS);
    assert.ok(Math.abs(negative.direction.y - positive.direction.y) < EPS);
});
