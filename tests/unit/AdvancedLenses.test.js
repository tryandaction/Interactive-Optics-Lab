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
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

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

test('AsphericLens matches spherical and parabolic sag references', () => {
    const spherical = new AsphericLens(new Vector(0, 0), 80, 100, 0, [0, 0, 0, 0], 0);
    const parabolic = new AsphericLens(new Vector(0, 0), 80, 100, -1, [0, 0, 0, 0], 0);

    const radius = 20;
    approx(spherical.getSurfaceHeight(radius), 100 - Math.sqrt(100 ** 2 - radius ** 2));
    approx(spherical.getSurfaceSlope(radius), radius / Math.sqrt(100 ** 2 - radius ** 2));
    approx(parabolic.getSurfaceHeight(radius), radius ** 2 / (2 * 100));
    approx(parabolic.getSurfaceSlope(radius), radius / 100);
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

test('GRINLens quarter-pitch transfer is directionally symmetric', () => {
    const length = 20;
    const gradient = Math.PI / (2 * length);
    const lens = new GRINLens(new Vector(0, 0), 30, length, 1.6, gradient, 0);

    const forwardRay = new Ray(new Vector(-100, 5), new Vector(1, 0), 550, 1);
    const [forwardHit] = lens.intersect(forwardRay.origin, forwardRay.direction);
    assert.ok(forwardHit);
    approx(forwardHit.point.x, -length / 2);
    assert.equal(forwardHit.surfaceId, 'entry');
    const [forwardOut] = lens.interact(forwardRay, forwardHit, Ray);
    approx(forwardOut.origin.x, length / 2, 1e-4);
    approx(forwardOut.origin.y, 0, 1e-4);
    approx(forwardOut.direction.y / forwardOut.direction.x, -5 * gradient, 1e-6);

    const reverseRay = new Ray(new Vector(100, 5), new Vector(-1, 0), 550, 1);
    const [reverseHit] = lens.intersect(reverseRay.origin, reverseRay.direction);
    assert.ok(reverseHit);
    approx(reverseHit.point.x, length / 2);
    assert.equal(reverseHit.surfaceId, 'exit');
    const [reverseOut] = lens.interact(reverseRay, reverseHit, Ray);
    approx(reverseOut.origin.x, -length / 2, 1e-4);
    approx(reverseOut.origin.y, 0, 1e-4);
    approx(reverseOut.direction.y / reverseOut.direction.x, 5 * gradient, 1e-6);
});

test('AsphericLens and GRINLens preserve model parameters through generic serialization', () => {
    const aspheric = new AsphericLens(new Vector(3, 4), 70, 90, -1, [1e-6, 0, 0, 0], 45);
    aspheric.quality = 0.91;
    aspheric.baseRefractiveIndex = 1.62;
    const grin = new GRINLens(new Vector(-3, 8), 45, 25, 1.7, 0.02, 30);
    grin.quality = 0.93;
    const [restoredAspheric, restoredGrin] = deserializeScene(serializeScene([aspheric, grin]), { AsphericLens, GRINLens }).components;
    assert.equal(restoredAspheric.baseRadius, 90);
    assert.equal(restoredAspheric.conicConstant, -1);
    assert.equal(restoredAspheric.asphericCoeffs[0], 1e-6);
    assert.equal(restoredAspheric.quality, 0.91);
    assert.equal(restoredAspheric.baseRefractiveIndex, 1.62);
    assert.equal(restoredGrin.n0, 1.7);
    assert.equal(restoredGrin.gradientCoeff, 0.02);
    assert.equal(restoredGrin.quality, 0.93);
});
