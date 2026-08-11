import { test } from 'node:test';
import assert from 'node:assert/strict';

import { VariableAttenuator } from '../../src/components/modulators/VariableAttenuator.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

const EPSILON = 1e-9;

function approx(actual, expected, epsilon = EPSILON) {
    assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to equal ${expected}`);
}

function transmit(attenuator, origin, direction, intensity) {
    const ray = new Ray(origin, direction, 532, intensity);
    ray.setLinearPolarization(Math.PI / 6);
    const [hit] = attenuator.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'the incoming ray should hit the attenuator aperture');
    assert.ok(ray.direction.dot(hit.normal) < 0, 'the attenuator normal should face the incoming ray');
    const [output] = attenuator.interact(ray, hit, Ray);
    assert.ok(output, 'the attenuator should produce a transmitted ray above threshold');
    assert.equal(ray.endReason, 'attenuated');
    return output;
}

test('VariableAttenuator applies scalar transmission from both directions without changing wavelength or Jones state', () => {
    const attenuator = new VariableAttenuator(new Vector(0, 0), 40, 0, 0.25);

    const forward = transmit(attenuator, new Vector(0, -100), new Vector(0, 1), 2);
    const reverse = transmit(attenuator, new Vector(0, 100), new Vector(0, -1), 1);

    approx(forward.intensity, 0.5);
    approx(reverse.intensity, 0.25);
    assert.equal(forward.wavelengthNm, 532);
    approx(forward.jonesIntensity(), 1);
    approx(reverse.jonesIntensity(), 1);
    approx(attenuator.getOpticalDensity(), -Math.log10(0.25));
    approx(attenuator.getAttenuationDB(), -10 * Math.log10(0.25));
});

test('VariableAttenuator clamps transmission to its stated educational range', () => {
    const attenuator = new VariableAttenuator(new Vector(0, 0));

    attenuator.setProperty('transmission', 0);
    assert.equal(attenuator.transmission, 0.001);
    attenuator.setProperty('transmission', 4);
    assert.equal(attenuator.transmission, 1);
});
