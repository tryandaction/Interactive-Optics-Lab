/**
 * Ray.test.js - Ray polarization compatibility tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';

const EPS = 1e-6;

function approx(actual, expected, eps = EPS) {
    assert.ok(
        Math.abs(actual - expected) < eps,
        `expected ${actual} ≈ ${expected} (eps=${eps})`
    );
}

test('Ray static Jones compatibility methods preserve legacy behavior', () => {
    const horizontal = Ray.jonesLinear(0);
    const rotated = Ray._apply2x2(Ray._rot2(Math.PI / 2), horizontal);

    approx(Ray._cAbs2(horizontal.Ex) + Ray._cAbs2(horizontal.Ey), 1.0);
    approx(rotated.Ex.re, 0.0);
    approx(rotated.Ey.re, 1.0);
});

test('Ray linear polarization initializes normalized Jones vector', () => {
    const ray = new Ray(new Vector(0, 0), new Vector(1, 0), 550, 1.0);

    ray.setLinearPolarization(Math.PI / 4);

    approx(ray.jonesIntensity(), 1.0);
    approx(ray.jones.Ex.re, 1 / Math.sqrt(2));
    approx(ray.jones.Ey.re, 1 / Math.sqrt(2));
    approx(ray.getPolarizationAngle(), Math.PI / 4);
});

test('Ray circular polarization remains classified from Jones phase', () => {
    const ray = new Ray(new Vector(0, 0), new Vector(1, 0), 550, 1.0);

    ray.setJones(Ray.jonesCircular(true));

    approx(ray.jonesIntensity(), 1.0);
    assert.equal(ray.getPolarizationAngle(), 'circular');
});
