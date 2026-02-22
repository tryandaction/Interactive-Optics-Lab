/**
 * PBS.test.js - 单元测试偏振分束器（PBS）
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { BeamSplitter } from '../../src/components/polarizers/BeamSplitter.js';

test('PBS 非偏振入射按反射比拆分能量', () => {
    const splitter = new BeamSplitter(new Vector(0, 0), 80, 0, 'PBS', 0.5, 0.3);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    const hits = splitter.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    const out = splitter.interact(ray, hits[0], Ray);
    assert.equal(out.length, 2, '应产生两条光线');
    const intensities = out.map(r => r.intensity).sort();
    const sum = intensities[0] + intensities[1];
    assert.ok(Math.abs(sum - 1.0) < 1e-6);
    assert.ok(Math.abs(intensities[0] - 0.3) < 1e-6 || Math.abs(intensities[1] - 0.3) < 1e-6);
});
