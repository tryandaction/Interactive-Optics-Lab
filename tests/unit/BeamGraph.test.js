import { test } from 'node:test';
import assert from 'node:assert/strict';

import { BeamGraph, BeamGraphBuilder } from '../../src/beam-graph/index.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';
import { RayTracer } from '../../src/simulation/RayTracer.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { AcoustoOpticModulator } from '../../src/components/special/AcoustoOpticModulator.js';

const components = [
    { id: 'laser', type: 'LaserSource', name: 'Laser' },
    { id: 'aom', type: 'AcoustoOpticModulator', name: 'AOM' },
    { id: 'pbs', type: 'BeamSplitter', name: 'PBS', properties: { type: 'PBS' } },
    { id: 'mirror', type: 'Mirror', name: 'M1' },
    { id: 'waveplate', type: 'HalfWavePlate', name: 'HWP' },
    { id: 'cell', type: 'AtomicCell', name: 'Cell' }
];

test('BeamGraph supports stable split branches and rejects dangling ports', () => {
    const graph = BeamGraph.fromComponents(components);
    graph.addEdge({
        id: 'e-in',
        from: { componentId: 'laser', portId: 'output' },
        to: { componentId: 'pbs', portId: 'input' }
    });
    graph.addEdge({
        id: 'e-t',
        from: { componentId: 'pbs', portId: 'transmitted' },
        to: { componentId: 'cell', portId: 'input' }
    });
    graph.addEdge({
        id: 'e-r',
        from: { componentId: 'pbs', portId: 'reflected' },
        to: { componentId: 'mirror', portId: 'input' }
    });

    assert.equal(graph.getOutgoing('pbs').length, 2);
    assert.throws(() => graph.addEdge({
        id: 'bad',
        from: { componentId: 'pbs', portId: 'missing' },
        to: { componentId: 'cell', portId: 'input' }
    }), /port/i);
});

test('BeamGraphBuilder preserves frequency, wavelength, polarization, auxiliary style, and termination', () => {
    const graph = BeamGraphBuilder.fromTraceRecords(components, [
        {
            traceId: 'r0', sourceId: 'laser', originComponentId: 'laser', hitComponentId: 'aom',
            branchKind: 'output', wavelengthNm: 780, polarization: { kind: 'linear', angleDeg: 0 },
            points: [{ x: 0, y: 0 }, { x: 100, y: 0 }]
        },
        {
            traceId: 'r1', parentTraceId: 'r0', sourceId: 'laser', originComponentId: 'aom', hitComponentId: 'pbs',
            branchKind: 'firstOrder', wavelengthNm: 780, frequencyOffsetHz: 80e6,
            polarization: { kind: 'linear', angleDeg: 0 }, points: [{ x: 100, y: 0 }, { x: 200, y: 0 }]
        },
        {
            traceId: 'r2', parentTraceId: 'r1', sourceId: 'laser', originComponentId: 'pbs',
            branchKind: 'reflected', wavelengthNm: 780, frequencyOffsetHz: 80e6,
            auxiliary: true, endReason: 'out_of_bounds', points: [{ x: 200, y: 0 }, { x: 200, y: 120 }]
        }
    ]);

    const shifted = graph.edges.find(edge => edge.id === 'beam:r1');
    const auxiliary = graph.edges.find(edge => edge.id === 'beam:r2');
    assert.equal(shifted.from.portId, 'firstOrder');
    assert.equal(shifted.frequencyOffsetHz, 80e6);
    assert.equal(shifted.wavelengthNm, 780);
    assert.deepEqual(shifted.polarization, { kind: 'linear', angleDeg: 0 });
    assert.equal(auxiliary.style, 'dashed');
    assert.match(auxiliary.to.componentId, /^termination:/);
    assert.equal(graph.nodes.find(node => node.id === auxiliary.to.componentId).reason, 'out_of_bounds');
});

test('BeamGraphBuilder represents return paths as explicit round-trip edges', () => {
    const graph = BeamGraphBuilder.fromTraceRecords(components, [{
        traceId: 'return-1', sourceId: 'laser', originComponentId: 'mirror', hitComponentId: 'waveplate',
        branchKind: 'reflected', direction: 'return', roundTrip: true,
        wavelengthNm: 780, points: [{ x: 300, y: 0 }, { x: 180, y: 0 }]
    }]);

    assert.equal(graph.edges[0].direction, 'return');
    assert.equal(graph.edges[0].roundTrip, true);
    assert.equal(graph.edges[0].from.portId, 'reflected');
});

test('Ray links physical successors without changing optical state', () => {
    const parent = new Ray(new Vector(0, 0), new Vector(1, 0), 780, 0.8, 0, 0, 1, 'laser', 0);
    parent.originComponentId = 'laser';
    parent.markInteraction({ id: 'aom', constructor: { name: 'AcoustoOpticModulator' } });
    const zeroOrder = new Ray(new Vector(10, 0), new Vector(1, 0), 780, 0.3, 0, 1, 1, 'laser', 0);
    const firstOrder = new Ray(new Vector(10, 0), new Vector(0.99, 0.01), 780, 0.5, 0, 1, 1, 'laser', 0);

    Ray.linkSuccessors(parent, [zeroOrder, firstOrder], {
        id: 'aom',
        rfFrequencyMHz: 80,
        constructor: { name: 'AcoustoOpticModulator' }
    });

    assert.equal(zeroOrder.parentTraceId, parent.traceId);
    assert.equal(zeroOrder.branchKind, 'zeroOrder');
    assert.equal(zeroOrder.frequencyOffsetHz, 0);
    assert.equal(firstOrder.branchKind, 'firstOrder');
    assert.equal(firstOrder.frequencyOffsetHz, 80e6);
    assert.equal(firstOrder.wavelengthNm, 780);
    assert.equal(firstOrder.intensity, 0.5);
});

test('RayTracer emits a live BeamGraph for a laser through an AOM', () => {
    const savedWindow = global.window;
    global.window = { globalMaxBounces: 50, globalMinIntensity: 1e-6 };
    try {
        const laser = new LaserSource(new Vector(0, 0), 0, 780, 1, 1, 0);
        const aom = new AcoustoOpticModulator(new Vector(100, 0), 50, 20, 0, 80, 1);
        const result = new RayTracer().traceAllRays([laser, aom], 500, 300);
        const firstOrder = result.beamGraph.edges.find(edge => edge.from.componentId === aom.id);

        assert.equal(firstOrder.from.portId, 'firstOrder');
        assert.equal(firstOrder.frequencyOffsetHz, 80e6);
        assert.match(firstOrder.to.componentId, /^termination:/);
    } finally {
        global.window = savedWindow;
    }
});
