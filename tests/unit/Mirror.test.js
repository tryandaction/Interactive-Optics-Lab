/**
 * Mirror.test.js - 单元测试 Mirror 反射逻辑
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { Mirror } from '../../src/components/mirrors/Mirror.js';

test('Mirror 反射定律 - 水平镜面', () => {
    const mirror = new Mirror(new Vector(0, 0), 100, 0);
    const ray = new Ray(new Vector(0, -10), new Vector(0, 1));
    const hits = mirror.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    const [hit] = hits;
    const out = mirror.interact(ray, hit, Ray);
    assert.equal(out.length, 1, '应产生一条反射光线');
    const reflected = out[0];
    assert.ok(Math.abs(reflected.direction.x - 0) < 1e-6);
    assert.ok(Math.abs(reflected.direction.y + 1) < 1e-6);
    assert.equal(ray.terminated, true);
});
