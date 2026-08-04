import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    findNearestBeamSegment,
    createPlacementPreview,
    lockAngleDeg,
    alignPlacements,
    distributePlacements,
    insertComponentIntoEdge
} from '../../src/bench/index.js';

test('findNearestBeamSegment projects onto the closest finite ray segment', () => {
    const result = findNearestBeamSegment(
        { x: 54, y: 8 },
        [[{ x: 0, y: 0 }, { x: 100, y: 0 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]],
        12
    );

    assert.deepEqual(result.point, { x: 54, y: 0 });
    assert.equal(result.pathIndex, 0);
    assert.equal(result.segmentIndex, 0);
    assert.equal(result.distance, 8);
    assert.equal(result.angleDeg, 0);
});

test('placement preview snaps to a beam and automatically faces the optical axis', () => {
    const paths = [[{ x: 0, y: 40 }, { x: 120, y: 40 }]];
    const lens = createPlacementPreview('ThinLens', { x: 60, y: 46 }, paths);
    const mirror = createPlacementPreview('Mirror', { x: 80, y: 36 }, paths);

    assert.deepEqual(lens.position, { x: 60, y: 40 });
    assert.equal(lens.angleDeg, 90);
    assert.equal(lens.snappedToBeam, true);
    assert.equal(mirror.angleDeg, 45);
});

test('angle locking uses deterministic increments and normalizes the result', () => {
    assert.equal(lockAngleDeg(22, 15), 15);
    assert.equal(lockAngleDeg(358, 15), 0);
    assert.equal(lockAngleDeg(-17, 15), 345);
});

test('alignment and distribution return immutable placement updates', () => {
    const items = [
        { id: 'a', x: 10, y: 30 },
        { id: 'b', x: 50, y: 10 },
        { id: 'c', x: 90, y: 60 }
    ];

    const aligned = alignPlacements(items, 'top');
    assert.deepEqual(aligned.map(item => item.y), [10, 10, 10]);
    assert.deepEqual(items.map(item => item.y), [30, 10, 60]);

    const distributed = distributePlacements(items, 'horizontal');
    assert.deepEqual(distributed.map(item => item.x), [10, 50, 90]);
});

test('insertComponentIntoEdge replaces one graph edge with two port-aware edges', () => {
    const graph = {
        nodes: [{ id: 'laser' }, { id: 'cell' }],
        edges: [{
            id: 'beam-1',
            from: { componentId: 'laser', portId: 'output' },
            to: { componentId: 'cell', portId: 'input' },
            wavelengthNm: 780,
            polarization: { kind: 'linear', angleDeg: 0 }
        }]
    };

    const next = insertComponentIntoEdge(graph, 'beam-1', {
        componentId: 'aom',
        inputPortId: 'input',
        outputPortId: 'output'
    });

    assert.equal(next.edges.length, 2);
    assert.deepEqual(next.edges[0].to, { componentId: 'aom', portId: 'input' });
    assert.deepEqual(next.edges[1].from, { componentId: 'aom', portId: 'output' });
    assert.equal(next.edges[1].wavelengthNm, 780);
    assert.equal(graph.edges.length, 1);
});
