import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/OpticsDocument.js';
import {
    captureRuntimeDocument,
    documentToLegacySceneData
} from '../../src/document/ComponentDocumentCodec.js';
import { Serializer } from '../../src/managers/Serializer.js';

function makeRuntimeComponent() {
    return {
        id: 'laser-1',
        label: 'Probe laser',
        pos: { x: 120, y: 220 },
        angleRad: Math.PI / 6,
        toJSON() {
            return {
                type: 'LaserSource',
                id: this.id,
                label: this.label,
                posX: this.pos.x,
                posY: this.pos.y,
                angleDeg: this.angleRad * 180 / Math.PI,
                wavelength: 780,
                intensity: 0.8
            };
        }
    };
}

test('captureRuntimeDocument updates bench data without overwriting schematic layout', () => {
    const existing = createOpticsDocument({
        metadata: { id: 'codec-doc', title: 'Codec setup' },
        components: [{
            id: 'laser-1',
            type: 'LaserSource',
            name: 'Old name',
            properties: {},
            ports: [{ id: 'output', role: 'output' }]
        }],
        views: {
            schematic: {
                placements: { 'laser-1': { x: 600, y: 180, angleDeg: 0 } },
                projection: { initialized: true, lockedComponentIds: ['laser-1'] }
            }
        }
    });

    const captured = captureRuntimeDocument({
        existingDocument: existing,
        components: [makeRuntimeComponent()],
        currentMode: 'lens_imaging',
        camera: { scale: 1.25, offsetX: 10, offsetY: 20 },
        settings: { showGrid: false },
        portResolver: () => [{ id: 'output', role: 'output' }]
    });

    assert.equal(captured.components[0].name, 'Probe laser');
    assert.deepEqual(captured.components[0].properties, { wavelength: 780, intensity: 0.8 });
    assert.deepEqual(captured.views.bench.placements['laser-1'], {
        x: 120,
        y: 220,
        angleDeg: 29.999999999999996
    });
    assert.equal(captured.views.bench.analysis.lensImaging.enabled, true);
    assert.equal(captured.views.schematic.placements['laser-1'].x, 600);
    assert.deepEqual(captured.views.schematic.projection.lockedComponentIds, ['laser-1']);
});

test('documentToLegacySceneData produces one compatibility shape for runtime loading', () => {
    const document = captureRuntimeDocument({
        components: [makeRuntimeComponent()],
        currentMode: 'ray_trace',
        camera: { scale: 2, offsetX: -5, offsetY: 15 },
        settings: { maxBounces: 75 }
    });

    const scene = documentToLegacySceneData(document);

    assert.equal(scene.version, '3.0.0');
    assert.equal(scene.schemaVersion, '3.0.0');
    assert.equal(scene.currentMode, 'ray_trace');
    assert.equal(scene.components[0].posX, 120);
    assert.equal(scene.components[0].wavelength, 780);
    assert.equal(scene.view.cameraScale, 2);
});

test('legacy Serializer facade emits and reads OpticsDocument v3', () => {
    const json = Serializer.serialize(
        [makeRuntimeComponent()],
        { mode: 'ray_trace', showGrid: true },
        { id: 'serializer-doc', name: 'Unified serializer' }
    );
    const parsed = JSON.parse(json);
    const restored = Serializer.deserialize(json);

    assert.equal(parsed.schemaVersion, '3.0.0');
    assert.equal(parsed.version, undefined);
    assert.equal(restored.schemaVersion, '3.0.0');
    assert.equal(restored.metadata.title, 'Unified serializer');
});
