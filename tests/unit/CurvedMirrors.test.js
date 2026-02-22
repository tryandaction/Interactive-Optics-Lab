/**
 * CurvedMirrors.test.js - Spherical/Parabolic mirror basics
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { SphericalMirror } from '../../src/components/mirrors/SphericalMirror.js';
import { ParabolicMirror } from '../../src/components/mirrors/ParabolicMirror.js';

test('SphericalMirror 顶点法线反射', () => {
    const mirror = new SphericalMirror(new Vector(0, 0), 100, 90, 0);
    const ray = new Ray(new Vector(0, -50), new Vector(0, 1));
    const hits = mirror.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    const out = mirror.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1, '应产生一条反射光线');
    const reflected = out[0];
    assert.ok(Math.abs(reflected.direction.x) < 1e-6);
    assert.ok(reflected.direction.y < -0.99);
});

test('ParabolicMirror 平行光聚焦至焦点', () => {
    const mirror = new ParabolicMirror(new Vector(0, 0), 100, 100, 0);
    const ray = new Ray(new Vector(-200, 20), new Vector(1, 0));
    const hits = mirror.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');
    assert.ok(mirror.focus, '应计算焦点');

    const out = mirror.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1, '应产生一条反射光线');

    const reflected = out[0];
    const toFocus = mirror.focus.subtract(hits[0].point).normalize();
    const dot = reflected.direction.dot(toFocus);
    assert.ok(dot > 0.9, '反射光应大致指向焦点');
});
