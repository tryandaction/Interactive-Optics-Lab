import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ComponentPortRegistry } from '../../src/beam-graph/index.js';

test('acceptance components expose deterministic semantic ports', () => {
    const expected = {
        LaserSource: ['output'],
        AcoustoOpticModulator: ['input', 'zeroOrder', 'firstOrder'],
        Mirror: ['input', 'reflected'],
        BeamSplitter: ['input', 'transmitted', 'reflected'],
        HalfWavePlate: ['input', 'output'],
        ThinLens: ['input', 'output', 'transmitted', 'reflected'],
        AtomicCell: ['input']
    };

    Object.entries(expected).forEach(([type, ids]) => {
        assert.deepEqual(ComponentPortRegistry.getPorts(type).map(port => port.id), ids);
    });
});

test('port resolution maps physical branch roles without unstable indices', () => {
    assert.equal(ComponentPortRegistry.resolveOutputPort('BeamSplitter', { branchKind: 'reflected' }).id, 'reflected');
    assert.equal(ComponentPortRegistry.resolveOutputPort('ThinLens', { branchKind: 'transmitted' }).id, 'transmitted');
    assert.equal(ComponentPortRegistry.resolveOutputPort('ThinLens', { branchKind: 'reflected' }).id, 'reflected');
    assert.equal(ComponentPortRegistry.resolveOutputPort('AcoustoOpticModulator', { branchKind: 'firstOrder' }).id, 'firstOrder');
    assert.equal(ComponentPortRegistry.resolveInputPort('AtomicCell').id, 'input');
    assert.equal(ComponentPortRegistry.resolveOutputPort('AtomicCell'), null);
});
