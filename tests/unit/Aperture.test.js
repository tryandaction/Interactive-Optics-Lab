/**
 * Aperture.test.js - Aperture opening/blocking behavior
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { Aperture } from '../../src/components/special/Aperture.js';

test('Aperture 开口透过并限制光束直径', () => {
    const aperture = new Aperture(new Vector(0, 0), 100, 1, 20, 20, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1), 550, 1.0, 0, 0, 1.0, null, null, false, null, 50);
    const hits = aperture.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    assert.equal(hits[0].surfaceId, 'opening');

    const out = aperture.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1, '应产生透射光');
    assert.ok(out[0].beamDiameter <= 20 + 1e-6);
    assert.equal(ray.terminated, true);
});

test('Aperture 遮挡区域终止光线', () => {
    const aperture = new Aperture(new Vector(0, 0), 100, 1, 20, 20, 0);
    const ray = new Ray(new Vector(40, -10), new Vector(0, 1));
    const hits = aperture.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    assert.equal(hits[0].surfaceId, 'blocker');

    const out = aperture.interact(ray, hits[0], Ray);
    assert.equal(out.length, 0, '应无透射光');
    assert.equal(ray.terminated, true);
});
