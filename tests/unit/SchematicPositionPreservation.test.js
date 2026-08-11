import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/index.js';
import { SchematicProjector } from '../../src/schematic/index.js';

test('initial projection preserves bench centers, angles, and relative distance', () => {
    const source = createOpticsDocument({
        components: [
            { id: 'laser', type: 'LaserSource', name: 'Laser' },
            { id: 'lens', type: 'ThinLens', name: 'L1' }
        ],
        beamGraph: {
            nodes: [
                { id: 'laser', type: 'LaserSource' },
                { id: 'lens', type: 'ThinLens' }
            ],
            edges: [{
                id: 'laser-to-lens',
                from: { componentId: 'laser', portId: 'output' },
                to: { componentId: 'lens', portId: 'input' }
            }]
        },
        views: {
            bench: {
                placements: {
                    laser: { x: 160, y: 280, angleDeg: 15 },
                    lens: { x: 540, y: 340, angleDeg: 105 }
                }
            }
        }
    });

    const projected = SchematicProjector.project(source);

    assert.deepEqual(projected.views.schematic.placements.laser, {
        x: 160,
        y: 280,
        angleDeg: 15,
        labelOffset: { x: 0, y: 48 }
    });
    assert.deepEqual(projected.views.schematic.placements.lens, {
        x: 540,
        y: 340,
        angleDeg: 105,
        labelOffset: { x: 0, y: 48 }
    });
});
