import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/OpticsDocument.js';
import { OpticsDocumentMigrator } from '../../src/document/OpticsDocumentMigrator.js';
import { OpticsDocumentSerializer } from '../../src/document/OpticsDocumentSerializer.js';

test('OpticsDocumentSerializer round-trips complete v3 documents deterministically', () => {
    const document = createOpticsDocument({
        metadata: {
            id: 'doc-round-trip',
            title: 'Laser chain',
            createdAt: '2026-08-04T00:00:00.000Z',
            updatedAt: '2026-08-04T00:00:00.000Z'
        },
        components: [{
            id: 'laser',
            type: 'LaserSource',
            name: 'Cooling laser',
            properties: { wavelength: 780 },
            ports: [{ id: 'output', role: 'output' }]
        }],
        beamGraph: {
            nodes: [{ id: 'laser:output', componentId: 'laser', portId: 'output', role: 'output' }],
            edges: []
        },
        views: {
            bench: { placements: { laser: { x: 100, y: 200, angleDeg: 0 } } },
            schematic: { placements: { laser: { x: 240, y: 160, angleDeg: 0 } } }
        }
    });

    const first = OpticsDocumentSerializer.serialize(document);
    const second = OpticsDocumentSerializer.serialize(document);
    const restored = OpticsDocumentSerializer.deserialize(first);

    assert.equal(first, second);
    assert.deepEqual(restored, document);
});

test('migrates legacy 1.1 scene into shared components and independent views', () => {
    const migrated = OpticsDocumentMigrator.migrate({
        version: '1.1',
        name: 'Legacy MOT',
        currentMode: 'lens_imaging',
        view: { cameraScale: 1.5, cameraOffsetX: 20, cameraOffsetY: -10 },
        settings: { showGrid: false, globalMaxBounces: 80 },
        components: [{
            type: 'LaserSource',
            id: 'laser-1',
            label: 'Probe',
            posX: 120,
            posY: 220,
            angleDeg: 15,
            wavelength: 780
        }],
        diagram: {
            kind: 'OpticsLabDiagram',
            page: { width: 1200, height: 700, background: '#ffffff' },
            objects: [
                {
                    id: 'symbol-laser-1',
                    objectType: 'symbol',
                    sourceComponentId: 'laser-1',
                    position: { x: 400, y: 160 },
                    angleRad: 0.5,
                    label: 'Probe'
                },
                {
                    id: 'ray-1',
                    objectType: 'ray_path',
                    points: [{ x: 400, y: 160 }, { x: 700, y: 160 }],
                    style: { stroke: '#ef4444', strokeWidth: 2 }
                }
            ]
        }
    }, { now: '2026-08-04T00:00:00.000Z' });

    assert.equal(migrated.schemaVersion, '3.0.0');
    assert.equal(migrated.metadata.title, 'Legacy MOT');
    assert.equal(migrated.metadata.sourceVersion, '1.1');
    assert.deepEqual(migrated.components[0], {
        id: 'laser-1',
        type: 'LaserSource',
        name: 'Probe',
        properties: { wavelength: 780 },
        ports: []
    });
    assert.deepEqual(migrated.views.bench.placements['laser-1'], {
        x: 120,
        y: 220,
        angleDeg: 15
    });
    assert.equal(migrated.views.bench.camera.scale, 1.5);
    assert.equal(migrated.views.bench.analysis.lensImaging.enabled, true);
    assert.equal(migrated.views.schematic.placements['laser-1'].x, 400);
    assert.deepEqual(migrated.views.schematic.projection.lockedComponentIds, ['laser-1']);
    assert.equal(migrated.views.schematic.paths[0].id, 'ray-1');
});

test('migrates Serializer 2.0 component wrappers without retaining duplicated coordinates', () => {
    const migrated = OpticsDocumentMigrator.migrate({
        version: '2.0.0',
        name: 'Wrapped scene',
        components: [{
            type: 'Mirror',
            id: 'mirror-1',
            x: 320,
            y: 180,
            angle: 45,
            properties: { length: 80 },
            _raw: {
                type: 'Mirror',
                id: 'mirror-1',
                label: 'M1',
                posX: 320,
                posY: 180,
                angleDeg: 45,
                length: 80
            }
        }]
    });

    assert.equal(migrated.components[0].name, 'M1');
    assert.deepEqual(migrated.components[0].properties, { length: 80 });
    assert.deepEqual(migrated.views.bench.placements['mirror-1'], {
        x: 320,
        y: 180,
        angleDeg: 45
    });
});

test('rejects malformed JSON and unsupported future schemas', () => {
    assert.throws(
        () => OpticsDocumentSerializer.deserialize('{broken'),
        /Invalid OpticsDocument JSON/
    );
    assert.throws(
        () => OpticsDocumentMigrator.migrate({ schemaVersion: '99.0.0' }),
        /Unsupported OpticsDocument schema version/
    );
});
