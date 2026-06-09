/**
 * AdvancedLenses.test.js - Cylindrical/Aspheric/GRIN basics
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { CylindricalLens } from '../../src/components/lenses/CylindricalLens.js';
import { AsphericLens } from '../../src/components/lenses/AsphericLens.js';
import { GRINLens } from '../../src/components/lenses/GRINLens.js';

const EPS = 1e-6;

function approx(actual, expected, eps = EPS) {
    assert.ok(
        Math.abs(actual - expected) < eps,
        `expected ${actual} approx ${expected} (eps=${eps})`
    );
}

test('CylindricalLens 中心入射不偏折', () => {
    const lens = new CylindricalLens(new Vector(0, 0), 80, 40, 100, 0, 'horizontal');
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(Math.abs(transmitted.direction.x) < 1e-6);
    assert.ok(transmitted.direction.y > 0.99);
});

test('AsphericLens 中心入射不偏折', () => {
    const lens = new AsphericLens(new Vector(0, 0), 60, 100, 0, [0, 0, 0, 0], 0);
    const ray = new Ray(new Vector(0, -20), new Vector(0, 1));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(Math.abs(transmitted.direction.x) < 1e-6);
    assert.ok(transmitted.direction.y > 0.99);
});

test('GRINLens 折射率与节距基础', () => {
    const lens = new GRINLens(new Vector(0, 0), 50, 30, 1.6, 0.01, 0);
    const n0 = lens.getRefractiveIndex(0);
    const n10 = lens.getRefractiveIndex(10);
    assert.ok(n0 >= n10);
    assert.ok(lens.getPitchLength() > 600);
    assert.ok(lens.getEffectiveFocalLength() !== Infinity);
});

test('GRINLens g=0 时透射不偏折', () => {
    const lens = new GRINLens(new Vector(0, 0), 50, 30, 1.6, 0.0, 0);
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0));
    const hits = lens.intersect(ray.origin, ray.direction);
    assert.equal(hits.length, 1, '应有一次交点');

    const out = lens.interact(ray, hits[0], Ray);
    assert.equal(out.length, 1);
    const transmitted = out[0];
    assert.ok(transmitted.direction.x > 0.99);
    assert.ok(Math.abs(transmitted.direction.y) < 1e-6);
});
test('CylindricalLens off-axis parallel ray focuses to focal plane', () => {
    const lens = new CylindricalLens(new Vector(0, 0), 80, 40, 100, 0, 'horizontal');
    const ray = new Ray(new Vector(10, -20), new Vector(0, 1), 550, 1.0);
    const [hit] = lens.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'off-axis ray should hit cylindrical lens');

    const [out] = lens.interact(ray, hit, Ray);
    assert.ok(out, 'cylindrical lens should transmit focused ray');

    const tToFocalPlane = (100 - out.origin.y) / out.direction.y;
    const xAtFocalPlane = out.origin.x + out.direction.x * tToFocalPlane;
    approx(xAtFocalPlane, 0, 0.15);
});

test('AsphericLens off-axis paraxial ray converges toward effective focal plane', () => {
    const lens = new AsphericLens(new Vector(0, 0), 60, 50, 0, [0, 0, 0, 0], 0);
    const ray = new Ray(new Vector(10, -20), new Vector(0, 1), 550, 1.0);
    const [hit] = lens.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'off-axis ray should hit aspheric lens');

    const [out] = lens.interact(ray, hit, Ray);
    assert.ok(out, 'aspheric lens should transmit focused ray');

    const focalLength = lens.getEffectiveFocalLength();
    const tToFocalPlane = (focalLength - out.origin.y) / out.direction.y;
    const xAtFocalPlane = out.origin.x + out.direction.x * tToFocalPlane;
    approx(xAtFocalPlane, 0, 0.5);
});

test('GRINLens preserves signed radial coordinate for symmetric off-axis rays', () => {
    const lens = new GRINLens(new Vector(0, 0), 50, 30, 1.6, 0.01, 0);
    const upperRay = new Ray(new Vector(-100, 10), new Vector(1, 0), 550, 1.0);
    const lowerRay = new Ray(new Vector(-100, -10), new Vector(1, 0), 550, 1.0);
    const [upperHit] = lens.intersect(upperRay.origin, upperRay.direction);
    const [lowerHit] = lens.intersect(lowerRay.origin, lowerRay.direction);

    assert.ok(upperHit);
    assert.ok(lowerHit);
    approx(upperHit.radialDist, 10);
    approx(lowerHit.radialDist, -10);

    const [upperOut] = lens.interact(upperRay, upperHit, Ray);
    const [lowerOut] = lens.interact(lowerRay, lowerHit, Ray);

    approx(upperOut.origin.x, lowerOut.origin.x);
    approx(upperOut.origin.y, -lowerOut.origin.y);
    approx(upperOut.direction.x, lowerOut.direction.x);
    approx(upperOut.direction.y, -lowerOut.direction.y);
});
