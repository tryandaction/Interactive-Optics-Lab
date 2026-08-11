import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { FabryPerotCavity } from '../../src/components/interferometers/FabryPerotCavity.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('FabryPerotCavity Airy transmission peaks at resonance and stays bounded', () => {
    const cavity = new FabryPerotCavity(new Vector(0, 0), 80, 40, 0, 1, 0.9);
    const resonance = 2e6 / Math.round(2e6 / 633);
    assert.ok(cavity.getTransmission(resonance) > 0.99);
    assert.ok(cavity.getTransmission(resonance + cavity.getFSR(resonance) / 2) < 1);
    assert.ok(cavity.getFinesse() > 1);
    assert.ok(cavity.getFSR(633) > 0);
    assert.ok(cavity.getLinewidth(633) > 0);
    const resonances = cavity.getResonanceWavelengths(633, 2);
    assert.ok(resonances.length >= 3);
    assert.ok(resonances.every(wavelength => wavelength > 300 && wavelength < 1000));
});

test('FabryPerotCavity transmits an axial ray and preserves cavity state', () => {
    const cavity = new FabryPerotCavity(new Vector(10, 20), 80, 40, 30, 2, 0.8);
    const axis = new Vector(Math.cos(Math.PI / 6), Math.sin(Math.PI / 6));
    const ray = new Ray(new Vector(10, 20).subtract(axis.multiply(100)), axis, 633, 1);
    const hit = cavity.intersect(ray.origin, ray.direction)[0];
    assert.ok(hit);
    const output = cavity.interact(ray, hit, Ray)[0];
    assert.ok(output);
    assert.ok(output.intensity > 0 && output.intensity <= 1);
    assert.equal(ray.endReason, 'fp_cavity');

    const restored = deserializeScene(serializeScene([cavity]), { FabryPerotCavity }).components[0];
    assert.equal(restored.length, 80);
    assert.equal(restored.height, 40);
    assert.equal(restored.cavityLength, 2);
    assert.equal(restored.mirrorReflectivity, 0.8);
    assert.ok(Math.abs(restored.angleRad - Math.PI / 6) < 1e-12);
});
