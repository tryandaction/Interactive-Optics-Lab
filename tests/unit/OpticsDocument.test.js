import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    OPTICS_DOCUMENT_SCHEMA_VERSION,
    cloneOpticsDocument,
    createOpticsDocument,
    normalizeOpticsDocument
} from '../../src/document/OpticsDocument.js';

test('createOpticsDocument creates the complete v3 aggregate', () => {
    const document = createOpticsDocument({
        metadata: { id: 'doc-1', title: 'MOT setup' }
    });

    assert.equal(document.schemaVersion, OPTICS_DOCUMENT_SCHEMA_VERSION);
    assert.equal(document.metadata.id, 'doc-1');
    assert.equal(document.metadata.title, 'MOT setup');
    assert.equal(document.metadata.activeWorkspace, 'bench');
    assert.deepEqual(document.components, []);
    assert.deepEqual(document.beamGraph, { nodes: [], edges: [] });
    assert.deepEqual(document.annotations, []);
    assert.deepEqual(document.views.bench.placements, {});
    assert.deepEqual(document.views.schematic.placements, {});
    assert.equal(document.views.schematic.page.background, '#ffffff');
});

test('bench and schematic placements are independent records', () => {
    const document = createOpticsDocument({
        views: {
            bench: { placements: { laser: { x: 100, y: 120, angleDeg: 0 } } },
            schematic: { placements: { laser: { x: 240, y: 180, angleDeg: 0 } } }
        }
    });

    document.views.schematic.placements.laser.x = 500;

    assert.equal(document.views.bench.placements.laser.x, 100);
    assert.equal(document.views.schematic.placements.laser.x, 500);
});

test('normalizeOpticsDocument repairs optional collections without discarding data', () => {
    const document = normalizeOpticsDocument({
        schemaVersion: OPTICS_DOCUMENT_SCHEMA_VERSION,
        metadata: { id: 'doc-2', title: 'Recovered' },
        components: [{ id: 'laser', type: 'LaserSource', name: 'Laser' }],
        beamGraph: null,
        views: { bench: null },
        annotations: null
    });

    assert.equal(document.components[0].id, 'laser');
    assert.deepEqual(document.beamGraph, { nodes: [], edges: [] });
    assert.deepEqual(document.annotations, []);
    assert.deepEqual(document.views.bench.placements, {});
    assert.deepEqual(document.views.schematic.placements, {});
});

test('cloneOpticsDocument returns a deep isolated copy', () => {
    const original = createOpticsDocument({
        components: [{
            id: 'pbs',
            type: 'BeamSplitter',
            name: 'PBS',
            properties: { splitterType: 'PBS' },
            ports: [{ id: 'input', role: 'input' }]
        }]
    });
    const copy = cloneOpticsDocument(original);

    copy.components[0].properties.splitterType = 'BS';
    copy.components[0].ports[0].role = 'output';

    assert.equal(original.components[0].properties.splitterType, 'PBS');
    assert.equal(original.components[0].ports[0].role, 'input');
});
