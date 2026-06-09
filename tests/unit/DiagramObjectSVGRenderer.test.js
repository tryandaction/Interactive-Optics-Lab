/**
 * DiagramObjectSVGRenderer.test.js - professional diagram object SVG rendering tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SceneToDiagramAdapter, DIAGRAM_OBJECT_TYPES } from '../../src/diagram/SceneToDiagramAdapter.js';
import { DiagramObjectSVGRenderer } from '../../src/diagram/DiagramObjectSVGRenderer.js';
import { Vector } from '../../src/core/Vector.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { Mirror } from '../../src/components/mirrors/Mirror.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';

function makeDiagram() {
    const adapter = new SceneToDiagramAdapter({
        includePageFrame: true,
        page: { width: 900, height: 500, margin: 32 }
    });

    return adapter.convert({
        name: 'Renderer test <diagram>',
        components: [
            new LaserSource(new Vector(120, 220), 0, 532, 1),
            new Mirror(new Vector(360, 220), 90, 45),
            new ThinLens(new Vector(560, 220), 80, 150, 90)
        ],
        rays: [{
            id: 'ray-a',
            pathPoints: [
                { x: 120, y: 220 },
                { x: 360, y: 220 },
                { x: 560, y: 250 }
            ],
            color: '#ef4444',
            intensity: 0.8
        }],
        annotations: [{
            id: 'label-a',
            text: 'f < 150 & aligned',
            position: { x: 540, y: 150 }
        }],
        diagramLinks: [{
            id: 'connector-a',
            points: [{ x: 120, y: 260 }, { x: 360, y: 260 }],
            style: { stroke: '#334155', strokeWidth: 1.5, lineStyle: 'dashed' }
        }]
    });
}

test('render emits a complete layered SVG document', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const svg = renderer.render(makeDiagram());

    assert.match(svg, /^<\?xml version="1\.0"/);
    assert.match(svg, /<svg\b/);
    assert.match(svg, /id="diagram-object-rays"/);
    assert.match(svg, /id="diagram-object-connectors"/);
    assert.match(svg, /id="diagram-object-symbols"/);
    assert.match(svg, /id="diagram-object-annotations"/);
    assert.match(svg, /class="ol-diagram__symbol ol-diagram__symbol--lasersource"/);
    assert.match(svg, /class="ol-diagram__symbol ol-diagram__symbol--mirror"/);
    assert.match(svg, /class="ol-diagram__symbol ol-diagram__symbol--thinlens"/);
});

test('render escapes diagram names and annotation text', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const svg = renderer.render(makeDiagram());

    assert.match(svg, /aria-label="Renderer test &lt;diagram&gt;"/);
    assert.match(svg, /f &lt; 150 &amp; aligned/);
    assert.doesNotMatch(svg, /f < 150 & aligned/);
});

test('renderFragment omits SVG root and XML declaration for embedding', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const fragment = renderer.renderFragment(makeDiagram());

    assert.doesNotMatch(fragment, /^<\?xml/);
    assert.doesNotMatch(fragment, /^<svg\b/);
    assert.match(fragment, /ol-diagram__content/);
});

test('autoFit produces a compact content viewBox and ray arrows', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const svg = renderer.render(makeDiagram(), {
        autoFit: true,
        contentPadding: 24,
        showRayArrows: true,
        rayGlow: false
    });

    assert.doesNotMatch(svg, /viewBox="0 0 900 500"/);
    assert.match(svg, /marker id="ol-diagram-ray-arrow"/);
    assert.match(svg, /marker-end="url\(#ol-diagram-ray-arrow\)"/);
});

test('paper style renders lens optical axis and focal markers without ray glow', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const svg = renderer.render(makeDiagram(), {
        stylePreset: 'paper',
        showOpticalAxis: true,
        showFocalMarkers: true
    });

    assert.match(svg, /ol-diagram__optical-axis/);
    assert.match(svg, /ol-diagram__focal-markers/);
    assert.match(svg, />F<\/text>/);
    assert.match(svg, />F'<\/text>/);
    assert.doesNotMatch(svg, /filter="url\(#ol-diagram-ray-glow\)"/);
});

test('ray arrows can be disabled for compatibility exports', () => {
    const renderer = new DiagramObjectSVGRenderer();
    const svg = renderer.render(makeDiagram(), { showRayArrows: false });

    assert.doesNotMatch(svg, /marker-end="url\(#ol-diagram-ray-arrow\)"/);
});

test('fallback symbols render unknown component types safely', () => {
    const diagram = makeDiagram();
    diagram.objects.push({
        id: 'symbol-custom',
        objectType: DIAGRAM_OBJECT_TYPES.SYMBOL,
        type: 'Future Component',
        position: { x: 720, y: 220 },
        size: { width: 48, height: 48 },
        angle: 0,
        label: 'Future'
    });

    const svg = new DiagramObjectSVGRenderer().render(diagram);
    assert.match(svg, /ol-diagram__symbol--future-component/);
    assert.match(svg, /stroke-dasharray="5 4"/);
});

test('render validates diagram payload shape', () => {
    const renderer = new DiagramObjectSVGRenderer();
    assert.throws(
        () => renderer.render({ kind: 'NotDiagram', objects: [] }),
        /OpticsLabDiagram/
    );
});
