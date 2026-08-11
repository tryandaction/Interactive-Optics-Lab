import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { MetallicMirror } from '../../src/components/mirrors/MetallicMirror.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('MetallicMirror returns bounded reflectivity and finite phase for all metals', () => {
    for (const metalType of Object.keys(MetallicMirror.METAL_DATA)) {
        const mirror = new MetallicMirror(new Vector(0, 0), 80, 0, metalType);
        for (const cosTheta of [0, 0.5, 1]) {
            const result = mirror.getFresnelReflection(cosTheta);
            assert.ok(result.R >= 0 && result.R <= 1);
            assert.ok(Number.isFinite(result.phaseShift));
        }
    }
});

test('MetallicMirror reflects with incident-facing normal and preserves JSON state', () => {
    const mirror = new MetallicMirror(new Vector(10, 20), 80, 90, 'gold');
    const ray = new Ray(new Vector(100, 20), new Vector(-1, 0), 633, 1);
    const hit = mirror.intersect(ray.origin, ray.direction)[0];
    assert.ok(hit);
    assert.ok(hit.normal.x > 0);
    const reflected = mirror.interact(ray, hit, Ray)[0];
    assert.ok(reflected.direction.x > 0);
    assert.ok(reflected.intensity > 0 && reflected.intensity <= 1);
    assert.equal(ray.endReason, 'metallic_reflection');

    mirror.id = 'metal-json';
    const restored = deserializeScene(serializeScene([mirror]), { MetallicMirror }).components[0];
    assert.equal(restored.id, mirror.id);
    assert.equal(restored.length, 80);
    assert.equal(restored.metalType, 'gold');
    assert.ok(Math.abs(restored.angleRad - Math.PI / 2) < 1e-12);
});
