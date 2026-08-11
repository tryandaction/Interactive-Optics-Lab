import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/index.js';
import { SchematicExporter, SchematicProjector } from '../../src/schematic/index.js';

function makeDocument(count = 3) {
    const components = Array.from({ length: count }, (_, index) => ({
        id: `component-${index}`,
        type: index === 0 ? 'LaserSource' : index === count - 1 ? 'AtomicCell' : 'Mirror',
        name: `C${index}`
    }));
    const nodes = components.map(component => ({ id: component.id, type: component.type }));
    const edges = components.slice(1).map((component, index) => ({
        id: `edge-${index}`,
        from: { componentId: components[index].id, portId: 'output' },
        to: { componentId: component.id, portId: 'input' }
    }));
    return createOpticsDocument({ components, beamGraph: { nodes, edges } });
}

test('SchematicExporter emits editable v3 SVG layers with stable page dimensions', () => {
    const document = SchematicProjector.project(makeDocument());
    const svg = SchematicExporter.toSvg(document);

    assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(svg, /viewBox="0 0 1600 900"/);
    assert.match(svg, /id="layer-beams"/);
    assert.match(svg, /id="layer-components"/);
    assert.match(svg, /vector-effect="non-scaling-stroke"/);
});

test('SchematicExporter preserves BeamGraph path semantics as structured SVG data attributes', () => {
    const document = makeDocument(2);
    Object.assign(document.beamGraph.edges[0], {
        branchKind: 'firstOrder',
        auxiliary: true,
        style: 'dashed',
        wavelengthNm: 780,
        polarization: 'circular',
        intensity: 0.42,
        frequencyOffsetHz: 80e6,
        interactionType: 'diffraction',
        surfaceId: 'acoustic_crystal',
        surfaceNormal: { x: -1, y: 0 }
    });

    const projected = SchematicProjector.project(document);
    const path = projected.views.schematic.paths[0];
    const svg = SchematicExporter.toSvg(projected);

    assert.equal(path.branchKind, 'firstOrder');
    assert.equal(path.auxiliary, true);
    assert.equal(path.wavelengthNm, 780);
    assert.equal(path.polarization, 'circular');
    assert.equal(path.intensity, 0.42);
    assert.equal(path.interactionType, 'diffraction');
    assert.equal(path.surfaceId, 'acoustic_crystal');
    assert.deepEqual(path.surfaceNormal, { x: -1, y: 0 });
    assert.match(svg, /data-branch-kind="firstOrder"/);
    assert.match(svg, /data-auxiliary="true"/);
    assert.match(svg, /data-wavelength-nm="780"/);
    assert.match(svg, /data-polarization="circular"/);
    assert.match(svg, /data-intensity="0\.42"/);
    assert.match(svg, /data-frequency-offset-hz="80000000"/);
    assert.match(svg, /data-interaction-type="diffraction"/);
    assert.match(svg, /data-surface-id="acoustic_crystal"/);
    assert.match(svg, /data-surface-normal-x="-1"/);
    assert.match(svg, /data-surface-normal-y="0"/);
});

test('SchematicProjector renders BeamGraph termination nodes without creating user components', () => {
    const document = createOpticsDocument({
        components: [{ id: 'laser', type: 'LaserSource', name: 'Laser' }],
        beamGraph: {
            nodes: [
                { id: 'laser', type: 'LaserSource' },
                { id: 'termination:ray-1', type: 'termination', reason: 'out_of_bounds' }
            ],
            edges: [{
                id: 'beam:ray-1',
                from: { componentId: 'laser', portId: 'output' },
                to: { componentId: 'termination:ray-1', portId: 'input' },
                endReason: 'out_of_bounds'
            }]
        }
    });

    const projected = SchematicProjector.project(document);
    const svg = SchematicExporter.toSvg(projected);

    assert.equal(projected.components.length, 1);
    assert.deepEqual(projected.views.schematic.terminationNodes, [{
        id: 'termination:ray-1',
        reason: 'out_of_bounds'
    }]);
    assert.ok(projected.views.schematic.placements['termination:ray-1']);
    assert.equal(projected.views.schematic.paths[0].to.componentId, 'termination:ray-1');
    assert.match(svg, /data-component-id="termination:ray-1"/);
    assert.match(svg, /data-symbol-kind="termination"/);
    assert.match(svg, />out_of_bounds</);
});

test('SchematicExporter creates a PDF blob through an injected jsPDF implementation', () => {
    const calls = [];
    class FakePdf {
        constructor(options) { calls.push(['constructor', options]); }
        addImage(...args) { calls.push(['addImage', ...args]); }
        output(type) {
            calls.push(['output', type]);
            return new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' });
        }
    }

    const blob = SchematicExporter.pdfFromPngDataUrl(
        makeDocument(),
        'data:image/png;base64,AAAA',
        { PdfConstructor: FakePdf }
    );
    assert.equal(blob.type, 'application/pdf');
    assert.equal(calls[0][1].orientation, 'landscape');
    assert.equal(calls[1][0], 'addImage');
    assert.deepEqual(calls.at(-1), ['output', 'blob']);
});

test('projecting and rendering 100 components stays within the interaction budget', () => {
    const startedAt = performance.now();
    const projected = SchematicProjector.project(makeDocument(100));
    const svg = SchematicExporter.toSvg(projected);
    const elapsed = performance.now() - startedAt;

    assert.equal(projected.components.length, 100);
    assert.equal(projected.views.schematic.paths.length, 99);
    assert.match(svg, /component-component-99/);
    assert.ok(elapsed < 1000, `100-component projection/render took ${elapsed.toFixed(1)}ms`);
});
