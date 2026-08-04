import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/index.js';
import { SchematicEditorModel, renderSchematicSvg, renderSchematicSymbol } from '../../src/schematic/index.js';

function makeEditorDocument() {
    return createOpticsDocument({
        components: [
            { id: 'laser', type: 'LaserSource', name: 'Laser' },
            { id: 'pbs', type: 'BeamSplitter', name: 'PBS' },
            { id: 'cell', type: 'AtomicCell', name: 'Cell' }
        ],
        views: {
            bench: { placements: { laser: { x: 10, y: 20 } } },
            schematic: {
                placements: {
                    laser: { x: 180, y: 260, angleDeg: 0, labelOffset: { x: 0, y: 48 } },
                    pbs: { x: 500, y: 260, angleDeg: 0, labelOffset: { x: 0, y: 48 } },
                    cell: { x: 820, y: 380, angleDeg: 0, labelOffset: { x: 0, y: 48 } }
                },
                paths: [
                    { id: 'beam-1', from: { componentId: 'laser' }, to: { componentId: 'pbs' }, style: 'solid' },
                    { id: 'beam-2', from: { componentId: 'pbs' }, to: { componentId: 'cell' }, style: 'dashed', roundTrip: true }
                ]
            }
        },
        annotations: [{ id: 'note-1', view: 'schematic', text: '780 nm', anchor: { componentId: 'pbs' }, position: { x: 12, y: -52 } }]
    });
}

test('renderSchematicSymbol emits stable semantic SVG with non-scaling strokes', () => {
    const symbol = renderSchematicSymbol({ id: 'pbs', type: 'BeamSplitter', name: 'PBS' }, { x: 100, y: 100, angleDeg: 0 });
    assert.match(symbol, /id="component-pbs"/);
    assert.match(symbol, /data-component-type="BeamSplitter"/);
    assert.match(symbol, /vector-effect="non-scaling-stroke"/);
});

test('renderSchematicSvg emits editable page layers, labels, dashed and round-trip paths', () => {
    const svg = renderSchematicSvg(makeEditorDocument());
    const interactiveSvg = renderSchematicSvg(makeEditorDocument(), { interactive: true });
    assert.match(svg, /<svg[^>]+viewBox="0 0 1600 900"/);
    assert.match(svg, /id="layer-beams"/);
    assert.match(svg, /id="layer-components"/);
    assert.match(svg, /id="layer-labels"/);
    assert.match(svg, /stroke-dasharray="10 7"/);
    assert.match(svg, /data-round-trip="true"/);
    assert.match(svg, />780 nm</);
    assert.doesNotMatch(svg, /schematic-path-hit/);
    assert.match(interactiveSvg, /class="schematic-path-hit"/);
});

test('SchematicEditorModel keeps bench coordinates isolated while moving, snapping, aligning and grouping', () => {
    const model = new SchematicEditorModel(makeEditorDocument(), { gridSize: 20 });
    model.select(['laser', 'pbs']);
    model.moveSelection(13, 7, { snap: true });
    model.alignSelection('centerY');
    const groupId = model.groupSelection('Input optics');
    const document = model.getDocument();

    assert.deepEqual(document.views.bench.placements.laser, { x: 10, y: 20 });
    assert.equal(document.views.schematic.placements.laser.x % 20, 0);
    assert.equal(document.views.schematic.placements.laser.y, document.views.schematic.placements.pbs.y);
    assert.deepEqual(document.views.schematic.groups.find(group => group.id === groupId).componentIds, ['laser', 'pbs']);
    assert.ok(document.views.schematic.projection.lockedComponentIds.includes('laser'));
});

test('SchematicEditorModel edits selected path semantics, label anchors and component hierarchy', () => {
    const model = new SchematicEditorModel(makeEditorDocument());
    model.selectPath('beam-2');
    model.setSelectedPathStyle('solid', { roundTrip: false });
    model.select('pbs');
    model.setLabelOffset('pbs', 30, -40);
    model.changeSelectionLayer(2);
    const annotationId = model.addAnnotation('Frequency shifted');
    const document = model.getDocument();
    const path = document.views.schematic.paths.find(item => item.id === 'beam-2');

    assert.equal(path.style, 'solid');
    assert.equal(path.roundTrip, false);
    assert.equal(path.locked, true);
    assert.deepEqual(document.views.schematic.placements.pbs.labelOffset, { x: 30, y: -40 });
    assert.equal(document.views.schematic.placements.pbs.zIndex, 2);
    assert.deepEqual(
        document.annotations.find(annotation => annotation.id === annotationId),
        {
            id: annotationId,
            view: 'schematic',
            kind: 'annotation',
            text: 'Frequency shifted',
            anchor: null,
            position: { x: 800, y: 450 },
            style: {}
        }
    );
    assert.deepEqual(document.views.bench.placements.laser, { x: 10, y: 20 });
});
