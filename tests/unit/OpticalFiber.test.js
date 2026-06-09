/**
 * OpticalFiber.test.js - Coupling and output behavior
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { OpticalFiber } from '../../src/components/special/OpticalFiber.js';

const EPS = 1e-6;

test('OpticalFiber 耦合并输出光线', () => {
    const fiber = new OpticalFiber(
        new Vector(0, 0),
        new Vector(100, 0),
        0,
        0,
        0.22,
        10,
        1.0,
        0.0,
        20
    );

    const ray = new Ray(new Vector(50, 0), new Vector(-1, 0), 550, 1.0);
    const hit = fiber.checkInputCoupling(ray.origin, ray.direction);
    assert.ok(hit, '应与输入端面相交');
    assert.ok(hit.couplingFactor > 0.9);

    fiber.handleInputInteraction(ray, hit, Ray);
    assert.equal(fiber.hitCount, 1);
    assert.equal(ray.terminated, true);

    const outputs = fiber.generateOutputRays(Ray);
    assert.equal(outputs.length, 1, '应产生一条输出光线');

    const outRay = outputs[0];
    assert.ok(outRay.direction.x > 0.99);
    assert.ok(Math.abs(outRay.intensity - 1.0) < 1e-6);
});

test('OpticalFiber 超过接收角时不耦合', () => {
    const fiber = new OpticalFiber(
        new Vector(0, 0),
        new Vector(100, 0),
        0,
        0,
        0.22,
        10,
        1.0,
        0.0,
        20
    );

    const tooSteepDirection = new Vector(-0.9, 0.435889894).normalize();
    const ray = new Ray(new Vector(50, -2), tooSteepDirection, 550, 1.0);
    const hit = fiber.checkInputCoupling(ray.origin, ray.direction);

    assert.equal(hit, null);
    assert.equal(fiber.lastCalculatedCouplingFactor, 0);
});

test('OpticalFiber 偏离纤芯中心时耦合因子下降', () => {
    const fiber = new OpticalFiber(
        new Vector(0, 0),
        new Vector(100, 0),
        0,
        0,
        0.22,
        10,
        1.0,
        0.0,
        20
    );

    const ray = new Ray(new Vector(50, 2.5), new Vector(-1, 0), 550, 1.0);
    const hit = fiber.checkInputCoupling(ray.origin, ray.direction);

    assert.ok(hit, 'offset ray should still hit the fiber core');
    assert.ok(hit.couplingFactor < 1.0);
    assert.ok(Math.abs(hit.couplingFactor - 0.5) < EPS);
});
