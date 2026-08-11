import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { LENS_TYPES, ThinLens } from '../../src/components/lenses/ThinLens.js';

test('biconvex lens preserves immutable surface identity through a 180 degree pose change', () => {
    const lens = new ThinLens(new Vector(400, 300), 80, 150, 90);
    lens.setProperty('lensType', LENS_TYPES.THICK_BICONVEX);

    const before = lens.shapeProfile;
    lens.setProperty('angleDeg', 270);

    assert.deepEqual(before, {
        kind: 'biconvex',
        frontSurface: 'convex',
        backSurface: 'convex'
    });
    assert.deepEqual(lens.shapeProfile, before);
    assert.equal(lens.focalLength, 150);
    assert.equal(lens.frontRadius, 50);
    assert.equal(lens.backRadius, -50);
});

test('biconvex central rays retain forward and reverse propagation semantics at every right angle', () => {
    for (const angleDeg of [0, 90, 180, 270]) {
        const lens = new ThinLens(new Vector(400, 300), 80, 150, angleDeg);
        lens.setProperty('lensType', LENS_TYPES.THICK_BICONVEX);

        for (const directionSign of [-1, 1]) {
            const direction = lens.axisDirection.multiply(directionSign);
            const ray = new Ray(lens.pos.subtract(direction.multiply(100)), direction, 550, 1);
            const [hit] = lens.intersect(ray.origin, ray.direction);
            assert.ok(hit, `angle ${angleDeg}, direction ${directionSign} should hit the lens`);
            assert.ok(hit.normal.dot(ray.direction) <= 1e-9, `angle ${angleDeg} normal must face incoming ray`);

            const [output] = lens.interact(ray, hit, Ray);
            assert.ok(output, `angle ${angleDeg}, direction ${directionSign} should transmit`);
            assert.ok(output.direction.dot(direction) > 0.999999, `angle ${angleDeg} must preserve central-ray direction`);
            assert.deepEqual(lens.shapeProfile, {
                kind: 'biconvex',
                frontSurface: 'convex',
                backSurface: 'convex'
            });
        }
    }
});
