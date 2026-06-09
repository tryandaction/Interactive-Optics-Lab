/**
 * SceneToDiagramAdapter.test.js - simulation scene to diagram object model tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneToDiagramAdapter, DIAGRAM_OBJECT_TYPES } from '../../src/diagram/SceneToDiagramAdapter.js';
import { ExportEngine } from '../../src/diagram/ExportEngine.js';
import { Vector } from '../../src/core/Vector.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { Mirror } from '../../src/components/mirrors/Mirror.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';

function makeScene() {
    const source = new LaserSource(new Vector(100, 120), 0, 532, 1);
    const mirror = new Mirror(new Vector(320, 120), 80, 45);
    const lens = new ThinLens(new Vector(520, 160), 90, 180, 90);

    return {
        name: 'Adapter test scene',
        components: [source, mirror, lens],
        rays: [{
            id: 'probe-ray',
            pathPoints: [
                new Vector(100, 120),
                new Vector(320, 120),
                new Vector(520, 160)
            ],
            color: '#22c55e',
            intensity: 0.8,
            wavelength: 532,
            sourceId: source.id
        }],
        annotations: [{
            id: 'note-1',
            text: 'f = 180 mm',
            position: new Vector(520, 80),
            fontSize: 16
        }],
        diagramLinks: [{
            id: 'link-1',
            from: source.id,
            to: mirror.id,
            points: [new Vector(100, 145), new Vector(320, 145)]
        }]
    };
}

test('convert normalizes components into stable diagram symbols', () => {
    const adapter = new SceneToDiagramAdapter({ includePageFrame: false });
    const scene = makeScene();
    const diagram = adapter.convert(scene);

    assert.equal(diagram.kind, 'OpticsLabDiagram');
    assert.equal(diagram.name, 'Adapter test scene');
    assert.equal(diagram.source.componentCount, 3);
    assert.equal(diagram.source.rayCount, 1);

    const symbols = diagram.objects.filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.SYMBOL);
    assert.equal(symbols.length, 3);
    assert.deepEqual(symbols.map(symbol => symbol.type), ['LaserSource', 'Mirror', 'ThinLens']);
    assert.deepEqual(symbols[0].position, { x: 100, y: 120 });
    assert.equal(symbols[1].size.width, 80);
    assert.equal(symbols[2].reliability.level, 'paraxial_approximation');
});

test('convert preserves ray paths, annotations, connectors and page frame', () => {
    const adapter = new SceneToDiagramAdapter();
    const diagram = adapter.convert(makeScene());

    const pageFrame = diagram.objects.find(object => object.objectType === DIAGRAM_OBJECT_TYPES.PAGE_FRAME);
    const ray = diagram.objects.find(object => object.objectType === DIAGRAM_OBJECT_TYPES.RAY_PATH);
    const annotation = diagram.objects.find(object => object.objectType === DIAGRAM_OBJECT_TYPES.ANNOTATION);
    const connector = diagram.objects.find(object => object.objectType === DIAGRAM_OBJECT_TYPES.CONNECTOR);

    assert.ok(pageFrame);
    assert.equal(ray.points.length, 3);
    assert.equal(ray.style.stroke, '#22c55e');
    assert.equal(annotation.text, 'f = 180 mm');
    assert.equal(connector.points.length, 2);
});

test('serialize and deserialize round-trip diagram payloads', () => {
    const adapter = new SceneToDiagramAdapter({ includePageFrame: false });
    const diagram = adapter.convert(makeScene());
    const restored = adapter.deserialize(adapter.serialize(diagram));

    assert.equal(restored.kind, 'OpticsLabDiagram');
    assert.equal(restored.objects.length, diagram.objects.length);
    assert.deepEqual(restored.objects[0].position, diagram.objects[0].position);
});

test('toExportScene returns an ExportEngine-compatible scene', async () => {
    const adapter = new SceneToDiagramAdapter({ includePageFrame: false });
    const diagram = adapter.convert(makeScene());
    const exportScene = adapter.toExportScene(diagram);

    assert.equal(exportScene.components.length, 3);
    assert.equal(exportScene.rays.length, 1);
    assert.equal(exportScene.rays[0].pathPoints.length, 3);

    const engine = new ExportEngine();
    const svg = await engine.exportSVG(exportScene, {
        ...engine.getConfig(),
        width: 800,
        height: 480,
        includeNotes: false,
        includeGrid: false,
        includeAnnotations: true,
        includeDiagramLinks: true,
        includeProfessionalLabels: false,
        backgroundColor: '#ffffff'
    });

    assert.match(svg, /<svg\b/);
    assert.match(svg, /id="rays"/);
    assert.match(svg, /id="components"/);
});

test('convert does not mutate source scene objects', () => {
    const adapter = new SceneToDiagramAdapter({ includePageFrame: false });
    const scene = makeScene();
    const originalPosition = scene.components[0].pos.clone();

    const diagram = adapter.convert(scene);
    diagram.objects[0].position.x = 9999;

    assert.ok(scene.components[0].pos.equals(originalPosition));
});
