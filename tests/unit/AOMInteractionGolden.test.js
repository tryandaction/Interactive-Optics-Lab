import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AcoustoOpticModulator } from '../../src/components/special/AcoustoOpticModulator.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

test('AOM direct interaction emits semantic orders and frequency shift metadata', () => {
    const aom = new AcoustoOpticModulator(new Vector(0, 0), 50, 20, 0, 80, 0.35);
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0), 780, 1);
    const [hit] = aom.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'the incoming ray should hit the AOM input surface');

    const outputs = aom.interact(ray, hit, Ray);
    const zeroOrder = outputs.find(output => output.direction.y === 0);
    const firstOrder = outputs.find(output => output.direction.y > 0);

    assert.ok(zeroOrder, 'the zero order should remain collinear with the input');
    assert.ok(firstOrder, 'the first order should be diffracted');
    assert.equal(zeroOrder.branchKind, 'zeroOrder');
    assert.equal(zeroOrder.frequencyOffsetHz, 0);
    assert.equal(firstOrder.branchKind, 'firstOrder');
    assert.equal(firstOrder.frequencyOffsetHz, 80e6);
    assert.equal(firstOrder.wavelengthNm, 780);
    assert.equal(firstOrder.intensity + zeroOrder.intensity, 1);
});
