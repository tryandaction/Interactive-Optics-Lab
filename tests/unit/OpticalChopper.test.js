import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { OpticalChopper } from '../../src/components/modulators/OpticalChopper.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('OpticalChopper blocks blade sectors and passes open slots', () => {
    const chopper = new OpticalChopper(new Vector(0, 0), 50, 0, 1000, 0.5, 6, 0);
    const blockedRay = new Ray(new Vector(20, -100), new Vector(0, 1), 633, 1);
    const blockedHit = chopper.intersect(blockedRay.origin, blockedRay.direction)[0];
    assert.equal(chopper.interact(blockedRay, blockedHit, Ray).length, 0);
    assert.equal(blockedRay.endReason, 'blocked_by_chopper');

    const openChopper = new OpticalChopper(new Vector(0, 0), 50, 0, 1000, 0.5, 6, 0.2);
    const openRay = new Ray(new Vector(20, -100), new Vector(0, 1), 633, 1);
    const openHit = openChopper.intersect(openRay.origin, openRay.direction)[0];
    assert.equal(openChopper.interact(openRay, openHit, Ray).length, 1);
    assert.equal(openRay.endReason, 'passed_chopper');
});

test('OpticalChopper exposes period/average transmission and preserves normalized phase', () => {
    const chopper = new OpticalChopper(new Vector(10, 20), 60, 30, 2000, 0.7, 8, 1.25);
    assert.equal(chopper.currentPhase, 0.25);
    assert.equal(chopper.getPeriod(), 0.0005);
    assert.equal(chopper.getAverageTransmission(), 0.7);
    const restored = deserializeScene(serializeScene([chopper]), { OpticalChopper }).components[0];
    assert.equal(restored.frequency, 2000);
    assert.equal(restored.dutyCycle, 0.7);
    assert.equal(restored.numSlots, 8);
    assert.equal(restored.currentPhase, 0.25);
    assert.ok(Math.abs(restored.angleRad - Math.PI / 6) < 1e-12);
});
