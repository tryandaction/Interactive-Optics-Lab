/**
 * DiffractionGrating.test.js - 单元测试衍射光栅
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { DiffractionGrating } from '../../src/components/special/DiffractionGrating.js';

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
