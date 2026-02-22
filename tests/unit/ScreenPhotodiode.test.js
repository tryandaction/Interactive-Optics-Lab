/**
 * ScreenPhotodiode.test.js - Screen/Photodiode basics
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { Screen } from '../../src/components/detectors/Screen.js';
import { Photodiode } from '../../src/components/detectors/Photodiode.js';

test('Screen 命中后计数与强度更新', () => {
    const screen = new Screen(new Vector(0, 0), 100, 0, 10);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1));
    const hits = screen.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    screen.interact(ray, hits[0], Ray);

    const binIndex = Math.floor(0.5 * screen.numBins);
    assert.equal(screen.binData[binIndex].hitCount, 1);
    assert.ok(screen.maxIntensity > 0);
});

test('Photodiode 累计入射功率并终止光线', () => {
    const detector = new Photodiode(new Vector(0, 0), 0, 20);
    const ray = new Ray(new Vector(0, 10), new Vector(0, -1), 550, 2.5);
    const hits = detector.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    detector.interact(ray, hits[0], Ray);
    assert.equal(detector.hitCount, 1);
    assert.ok(detector.incidentPower >= 2.5);
    assert.equal(ray.terminated, true);
});
