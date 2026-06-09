/**
 * PolarizationSpecials.test.js - Faraday and birefringent splitter regression tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { FaradayRotator } from '../../src/components/polarizers/FaradayRotator.js';
import { FaradayIsolator } from '../../src/components/polarizers/FaradayIsolator.js';
import { WollastonPrism } from '../../src/components/polarizers/WollastonPrism.js';

const EPS = 1e-6;

function approx(actual, expected, eps = EPS) {
    assert.ok(
        Math.abs(actual - expected) < eps,
        `expected ${actual} ≈ ${expected} (eps=${eps})`
    );
}

function angleDiff(a, b) {
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function propagateThroughTwoSurfaces(component, ray) {
    const [entryHit] = component.intersect(ray.origin, ray.direction);
    assert.ok(entryHit, 'entry surface should be hit');

    const [insideRay] = component.interact(ray, entryHit, Ray);
    assert.ok(insideRay, 'entry interaction should produce internal ray');

    const [exitHit] = component.intersect(insideRay.origin, insideRay.direction);
    assert.ok(exitHit, 'exit surface should be hit');

    const out = component.interact(insideRay, exitHit, Ray);
    assert.ok(out.length >= 1, 'exit interaction should produce output ray');
    return out[0];
}

test('FaradayRotator rotates linear polarization by configured angle on exit', () => {
    const rotator = new FaradayRotator(new Vector(0, 0), 40, 25, 0, 45);
    const ray = new Ray(new Vector(-50, 0), new Vector(1, 0), 550, 1.0);
    ray.setLinearPolarization(0);

    const out = propagateThroughTwoSurfaces(rotator, ray);

    approx(out.intensity, 1.0);
    approx(out.jonesIntensity(), 1.0);
    approx(angleDiff(out.getPolarizationAngle(), Math.PI / 4), 0, 1e-4);
});

test('FaradayIsolator passes forward horizontal polarization', () => {
    const isolator = new FaradayIsolator(new Vector(0, 0), 80, 30, 0);
    const ray = new Ray(new Vector(-70, 0), new Vector(1, 0), 550, 1.0);
    ray.setLinearPolarization(0);

    const out = propagateThroughTwoSurfaces(isolator, ray);

    approx(out.intensity, 1.0);
    approx(out.jonesIntensity(), 1.0);
    approx(angleDiff(out.getPolarizationAngle(), Math.PI / 4), 0, 1e-4);
});

test('FaradayIsolator blocks reverse horizontal polarization after two surfaces', () => {
    const isolator = new FaradayIsolator(new Vector(0, 0), 80, 30, 0);
    const ray = new Ray(new Vector(70, 0), new Vector(-1, 0), 550, 1.0);
    ray.setLinearPolarization(0);

    const [entryHit] = isolator.intersect(ray.origin, ray.direction);
    assert.ok(entryHit, 'reverse entry surface should be hit');
    const [insideRay] = isolator.interact(ray, entryHit, Ray);
    assert.ok(insideRay, 'reverse entry should produce internal ray');
    const [exitHit] = isolator.intersect(insideRay.origin, insideRay.direction);
    assert.ok(exitHit, 'reverse exit surface should be hit');

    const out = isolator.interact(insideRay, exitHit, Ray);
    assert.equal(out.length, 0);
});

test('WollastonPrism splits 45 degree linear polarization equally', () => {
    const prism = new WollastonPrism(new Vector(0, 0), 60, 40, 0, 12);
    const ray = new Ray(new Vector(-70, 0), new Vector(1, 0), 550, 1.0);
    ray.setLinearPolarization(Math.PI / 4);

    const [hit] = prism.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'Wollaston prism should be hit');
    const out = prism.interact(ray, hit, Ray);

    assert.equal(out.length, 2);
    approx(out.reduce((sum, r) => sum + r.intensity, 0), 1.0);
    const intensities = out.map(r => r.intensity).sort((a, b) => a - b);
    approx(intensities[0], 0.5);
    approx(intensities[1], 0.5);
});
