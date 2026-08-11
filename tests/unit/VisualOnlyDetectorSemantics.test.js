import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CCDCamera } from '../../src/components/detectors/CCDCamera.js';
import { Spectrometer } from '../../src/components/detectors/Spectrometer.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

function createIncomingRay(wavelength = 532) {
    return new Ray(new Vector(0, -100), new Vector(0, 1), wavelength, 1);
}

test('visual-only CCD camera retains display data without creating a physical downstream ray', () => {
    const camera = new CCDCamera(new Vector(0, 0));
    const ray = createIncomingRay();
    const [hit] = camera.intersect(ray.origin, ray.direction);

    assert.ok(hit, 'the incoming ray should hit the CCD entrance plane');
    assert.deepEqual(camera.interact(ray, hit, Ray), []);
    assert.equal(ray.terminated, true);
    assert.equal(ray.endReason, 'visual_only_ccd_camera');
    assert.equal(camera.getTotalIntensity(), camera.quantumEfficiency * camera.exposureTime);
});

test('visual-only spectrometer retains its spectrum bin without creating a physical downstream ray', () => {
    const spectrometer = new Spectrometer(new Vector(0, 0));
    const ray = createIncomingRay();
    const [hit] = spectrometer.intersect(ray.origin, ray.direction);

    assert.ok(hit, 'the incoming ray should hit the spectrometer entrance plane');
    assert.deepEqual(spectrometer.interact(ray, hit, Ray), []);
    assert.equal(ray.terminated, true);
    assert.equal(ray.endReason, 'visual_only_spectrometer');
    assert.deepEqual(spectrometer.getSpectrumArray(), [{ wavelength: 532, intensity: 1 }]);
});
