/**
 * OpticalSources.test.js - Laser/Fan/Line/WhiteLight source generation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { FanSource } from '../../src/components/sources/FanSource.js';
import { LineSource } from '../../src/components/sources/LineSource.js';
import { WhiteLightSource } from '../../src/components/sources/WhiteLightSource.js';

test('LaserSource 角度分布与强度拆分', () => {
    const src = new LaserSource(new Vector(0, 0), 0, 550, 3.0, 3, 20);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 3);
    rays.forEach(ray => assert.ok(Math.abs(ray.intensity - 1.0) < 1e-6));

    const half = 10 * Math.PI / 180;
    const angles = rays.map(r => Math.atan2(r.direction.y, r.direction.x));
    assert.ok(Math.abs(angles[0] + half) < 1e-3);
    assert.ok(Math.abs(angles[1]) < 1e-3);
    assert.ok(Math.abs(angles[2] - half) < 1e-3);
});

test('FanSource 扇形角覆盖', () => {
    const src = new FanSource(new Vector(0, 0), 0, 550, 5.0, 5, 40);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 5);

    const half = 20 * Math.PI / 180;
    const angles = rays.map(r => Math.atan2(r.direction.y, r.direction.x));
    assert.ok(Math.abs(angles[0] + half) < 1e-3);
    assert.ok(Math.abs(angles[angles.length - 1] - half) < 1e-3);
});

test('LineSource 线段均匀发射', () => {
    const src = new LineSource(new Vector(0, 0), 0, 550, 3.0, 3, 10);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 3);

    rays.forEach(ray => {
        assert.ok(Math.abs(ray.direction.x) < 1e-6);
        assert.ok(ray.direction.y > 0.99);
    });

    const xs = rays.map(r => r.origin.x).sort((a, b) => a - b);
    assert.ok(Math.abs(xs[0] + 5) < 1e-6);
    assert.ok(Math.abs(xs[1]) < 1e-6);
    assert.ok(Math.abs(xs[2] - 5) < 1e-6);
});

test('WhiteLightSource 快速模式单波长输出', () => {
    const savedWindow = global.window;
    const savedRandom = Math.random;
    global.window = { maxRaysPerSource: 1001, fastWhiteLightMode: true };
    Math.random = () => 0;

    try {
        const src = new WhiteLightSource(new Vector(0, 0), 0, 30.0, 3, 0);
        const rays = src.generateRays(Ray);
        assert.equal(rays.length, 3);
        rays.forEach(ray => assert.equal(ray.wavelengthNm, 380));
    } finally {
        Math.random = savedRandom;
        global.window = savedWindow;
    }
});
