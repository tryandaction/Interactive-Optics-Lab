import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { ElectroOpticModulator } from '../../src/components/modulators/ElectroOpticModulator.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('ElectroOpticModulator phase mode shifts phase and preserves intensity up to quality', () => {
    const modulator = new ElectroOpticModulator(new Vector(0, 0), 60, 30, 0, 'phase', 100);
    modulator.appliedVoltage = 50;
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0), 633, 0.8, 0.25);
    const hit = modulator.intersect(ray.origin, ray.direction)[0];
    assert.ok(hit);
    const output = modulator.interact(ray, hit, Ray)[0];
    assert.ok(output);
    assert.ok(Math.abs(output.phase - (0.25 + Math.PI / 2)) < 1e-12);
    assert.ok(Math.abs(output.intensity - 0.8 * 0.98) < 1e-12);
    assert.equal(ray.endReason, 'modulated_eom');
});

test('ElectroOpticModulator amplitude mode applies cosine-square transmission and restores state', () => {
    const modulator = new ElectroOpticModulator(new Vector(10, 20), 60, 30, 30, 'amplitude', 100);
    modulator.appliedVoltage = 50;
    modulator.modulationFrequency = 2e6;
    modulator.quality = 0.9;
    assert.ok(Math.abs(modulator.getIntensityTransmission() - 0.5) < 1e-12);

    const scene = deserializeScene(serializeScene([modulator]), { ElectroOpticModulator });
    const restored = scene.components[0];
    assert.equal(restored.modulationType, 'amplitude');
    assert.equal(restored.halfWaveVoltage, 100);
    assert.equal(restored.appliedVoltage, 50);
    assert.equal(restored.modulationFrequency, 2e6);
    assert.equal(restored.quality, 0.9);
    assert.ok(Math.abs(restored.angleRad - Math.PI / 6) < 1e-12);
});
