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
