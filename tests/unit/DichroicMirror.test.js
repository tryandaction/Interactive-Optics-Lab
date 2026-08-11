import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { DichroicMirror } from '../../src/components/mirrors/DichroicMirror.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('DichroicMirror splits wavelengths with bounded sigmoid reflectivity', () => {
    const mirror = new DichroicMirror(new Vector(0, 0), 100, 0, 550, 20, true);
    assert.ok(mirror.getReflectivity(450) > 0.99);
    assert.ok(Math.abs(mirror.getReflectivity(550) - 0.5) < 1e-12);
    assert.ok(mirror.getReflectivity(650) < 0.01);

    const ray = new Ray(new Vector(0, -100), new Vector(0, 1), 450, 1);
    const hit = mirror.intersect(ray.origin, ray.direction)[0];
    assert.ok(hit);
    assert.ok(hit.normal.y < 0);
    const branches = mirror.interact(ray, hit, Ray);
    assert.equal(branches.length, 1);
    assert.ok(branches[0].direction.y < 0);
    assert.ok(branches[0].intensity <= 1);

    const transmittedRay = new Ray(new Vector(0, -100), new Vector(0, 1), 650, 1);
    const transmitted = mirror.interact(transmittedRay, mirror.intersect(transmittedRay.origin, transmittedRay.direction)[0], Ray);
    assert.equal(transmitted.length, 1);
    assert.ok(transmitted[0].direction.y > 0);
});

test('DichroicMirror preserves parameters through generic scene serialization', () => {
    const mirror = new DichroicMirror(new Vector(10, 20), 80, 30, 600, 12, false);
    mirror.id = 'dichroic-json';
    const restored = deserializeScene(serializeScene([mirror]), { DichroicMirror }).components[0];
    assert.equal(restored.id, mirror.id);
    assert.equal(restored.length, 80);
    assert.equal(restored.cutoffWavelength, 600);
    assert.equal(restored.transitionWidth, 12);
    assert.equal(restored.reflectShortWave, false);
    assert.ok(Math.abs(restored.angleRad - Math.PI / 6) < 1e-12);
});
