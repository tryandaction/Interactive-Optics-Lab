import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AtomicCell } from '../../src/components/atomic/AtomicCell.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

test('visual-only AtomicCell terminates rays without producing pseudo-physical transmission', () => {
    const cell = new AtomicCell(new Vector(0, 0), 80, 40, 0, 'Rb87');
    const ray = new Ray(new Vector(-100, 0), new Vector(1, 0), 700, 1);
    const [hit] = cell.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'the incoming ray should hit the atomic cell boundary');

    const outputs = cell.interact(ray, hit, Ray);

    assert.deepEqual(outputs, []);
    assert.equal(ray.terminated, true);
    assert.equal(ray.endReason, 'visual_only_atomic_cell');
});
