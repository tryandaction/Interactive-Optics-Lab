import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { RingMirror } from '../../src/components/mirrors/RingMirror.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';

test('RingMirror transmits the center hole and reflects the outer ring', () => {
    const mirror = new RingMirror(new Vector(0, 0), 50, 20, 0);

    const holeRay = new Ray(new Vector(0, -100), new Vector(0, 1), 550, 1);
    const holeHit = mirror.intersect(holeRay.origin, holeRay.direction)[0];
    assert.equal(holeHit.surfaceId, 'hole');
    const transmitted = mirror.interact(holeRay, holeHit, Ray)[0];
    assert.equal(holeRay.endReason, 'passed_through_hole');
    assert.deepEqual([transmitted.direction.x, transmitted.direction.y], [0, 1]);
    assert.equal(transmitted.intensity, 1);

    const ringRay = new Ray(new Vector(30, -100), new Vector(0, 1), 550, 1);
    const ringHit = mirror.intersect(ringRay.origin, ringRay.direction)[0];
    assert.equal(ringHit.surfaceId, 'ring');
    assert.ok(Math.abs(ringHit.normal.y + 1) < 1e-12);
    const reflected = mirror.interact(ringRay, ringHit, Ray)[0];
    assert.equal(ringRay.endReason, 'ring_reflected');
    assert.ok(reflected.direction.y < -0.999999);
    assert.equal(reflected.intensity, 0.99);
    assert.ok(Math.abs(reflected.phase - Math.PI) < 1e-12);
});

test('RingMirror preserves rotated normal, regions, and JSON state', () => {
    const mirror = new RingMirror(new Vector(10, 20), 60, 25, 90);
    assert.equal(mirror.getRegion(new Vector(10, 20)), 'inner');
    assert.equal(mirror.getRegion(new Vector(10, 50)), 'ring');
    assert.equal(mirror.getRegion(new Vector(10, 90)), 'outside');

    const ray = new Ray(new Vector(100, 50), new Vector(-1, 0), 633, 0.8);
    const hit = mirror.intersect(ray.origin, ray.direction)[0];
    assert.equal(hit.surfaceId, 'ring');
    assert.ok(Math.abs(hit.normal.x - 1) < 1e-12);

    mirror.id = 'ring-json';
    mirror.label = 'test ring';
    mirror.notes = 'ring notes';
    const restored = deserializeScene(serializeScene([mirror]), { RingMirror }).components[0];
    assert.equal(restored.id, mirror.id);
    assert.equal(restored.label, mirror.label);
    assert.equal(restored.notes, mirror.notes);
    assert.equal(restored.outerRadius, 60);
    assert.equal(restored.innerRadius, 25);
    assert.ok(Math.abs(restored.angleRad - Math.PI / 2) < 1e-12);
});
