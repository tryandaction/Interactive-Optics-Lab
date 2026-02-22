/**
 * BeamSplitter.test.js - 单元测试 BS 分束行为
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { BeamSplitter } from '../../src/components/polarizers/BeamSplitter.js';

test('BeamSplitter (BS) 分束比例守恒', () => {
    const splitter = new BeamSplitter(new Vector(0, 0), 80, 0, 'BS', 0.3);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0);
    const hits = splitter.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    const out = splitter.interact(ray, hits[0], Ray);
    assert.equal(out.length, 2, '应产生两条分束光线');
    const intensities = out.map(r => r.intensity).sort();
    assert.ok(Math.abs(intensities[0] - 0.3) < 1e-6 || Math.abs(intensities[0] - 0.7) < 1e-6);
    const sum = intensities[0] + intensities[1];
    assert.ok(Math.abs(sum - 1.0) < 1e-6);
    assert.equal(ray.terminated, true);
});
