import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/index.js';
import { SchematicProjector } from '../../src/schematic/index.js';

function makeDocument() {
    return createOpticsDocument({
        components: [
            { id: 'laser', type: 'LaserSource', name: 'Laser' },
            { id: 'aom', type: 'AcoustoOpticModulator', name: 'AOM' },
            { id: 'pbs', type: 'BeamSplitter', name: 'PBS' },
            { id: 'cell', type: 'AtomicCell', name: 'Cell' }
        ],
        beamGraph: {
            nodes: [
                { id: 'laser', type: 'LaserSource' },
                { id: 'aom', type: 'AcoustoOpticModulator' },
                { id: 'pbs', type: 'BeamSplitter' },
                { id: 'cell', type: 'AtomicCell' }
            ],
            edges: [
                { id: 'e1', from: { componentId: 'laser', portId: 'output' }, to: { componentId: 'aom', portId: 'input' } },
                { id: 'e2', from: { componentId: 'aom', portId: 'firstOrder' }, to: { componentId: 'pbs', portId: 'input' } },
                { id: 'e3', from: { componentId: 'pbs', portId: 'transmitted' }, to: { componentId: 'cell', portId: 'input' } }
            ]
        },
        views: {
            schematic: {
                placements: { aom: { x: 420, y: 180, angleDeg: 0, labelOffset: { x: 0, y: 46 } } },
                projection: { initialized: true, lockedComponentIds: ['aom'] }
            }
        }
    });
}

test('SchematicProjector fills missing graph columns without overwriting locked placements', () => {
    const source = makeDocument();
    const projected = SchematicProjector.project(source);

    assert.deepEqual(projected.views.schematic.placements.aom, source.views.schematic.placements.aom);
    assert.ok(projected.views.schematic.placements.laser.x < projected.views.schematic.placements.pbs.x);
    assert.equal(projected.views.schematic.paths.length, 3);
    assert.equal(projected.views.schematic.projection.initialized, true);
});

test('SchematicProjector incrementally adds nodes while preserving all existing manual coordinates', () => {
    const first = SchematicProjector.project(makeDocument());
    const savedLaser = { ...first.views.schematic.placements.laser };
    first.views.schematic.projection.lockedComponentIds.push('laser');
    first.components.push({ id: 'mirror', type: 'Mirror', name: 'M1' });
    first.beamGraph.nodes.push({ id: 'mirror', type: 'Mirror' });
    first.beamGraph.edges.push({
        id: 'e4',
        from: { componentId: 'pbs', portId: 'reflected' },
        to: { componentId: 'mirror', portId: 'input' }
    });

    const second = SchematicProjector.project(first);
    assert.deepEqual(second.views.schematic.placements.laser, savedLaser);
    assert.ok(second.views.schematic.placements.mirror);
    assert.equal(second.views.schematic.paths.length, 4);
});

test('SchematicProjector wraps disconnected components into page-bounded columns', () => {
    const components = Array.from({ length: 12 }, (_, index) => ({
        id: `free-${index}`,
        type: 'Mirror',
        name: `M${index + 1}`
    }));
    const projected = SchematicProjector.project(createOpticsDocument({ components }));
    const placements = Object.values(projected.views.schematic.placements);
    const uniquePositions = new Set(placements.map(item => `${item.x}:${item.y}`));

    assert.equal(uniquePositions.size, components.length);
    assert.ok(placements.every(item => item.y >= 48 && item.y <= 852));
    assert.ok(placements.every(item => item.x >= 48 && item.x <= 1552));
});
