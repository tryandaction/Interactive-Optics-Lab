import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument, DocumentStore } from '../../src/document/index.js';
import { SchematicEditorModel, SchematicProjector } from '../../src/schematic/index.js';

function makeDocument() {
    return createOpticsDocument({
        components: [
            { id: 'laser', type: 'LaserSource', name: 'Laser' },
            { id: 'pbs', type: 'BeamSplitter', name: 'PBS' }
        ],
        beamGraph: {
            nodes: [{ id: 'laser' }, { id: 'pbs' }],
            edges: [{ id: 'edge-1', from: { componentId: 'laser' }, to: { componentId: 'pbs' } }]
        },
        views: {
            bench: { placements: { laser: { x: 100, y: 200 }, pbs: { x: 400, y: 200 } } },
            schematic: {
                placements: { laser: { x: 180, y: 220 }, pbs: { x: 660, y: 300 } },
                paths: [{ id: 'edge-1', from: { componentId: 'laser' }, to: { componentId: 'pbs' } }],
                groups: [{ id: 'group-1', name: 'Input', componentIds: ['laser', 'pbs'] }],
                projection: { initialized: true, lockedComponentIds: ['pbs'] }
            }
        },
        annotations: [{ id: 'a1', view: 'schematic', text: 'splitter', anchor: { componentId: 'pbs' } }]
    });
}

test('schematic rename updates the shared component without changing either placement', () => {
    const model = new SchematicEditorModel(makeDocument());
    model.renameComponent('pbs', 'Analysis PBS');
    const document = model.getDocument();

    assert.equal(document.components.find(component => component.id === 'pbs').name, 'Analysis PBS');
    assert.deepEqual(document.views.bench.placements.pbs, { x: 400, y: 200 });
    assert.deepEqual(document.views.schematic.placements.pbs, { x: 660, y: 300 });
});

test('deleting in schematic removes the shared entity and all cross-view references', () => {
    const model = new SchematicEditorModel(makeDocument());
    model.select('pbs');
    model.deleteSelection();
    const document = model.getDocument();

    assert.deepEqual(document.components.map(component => component.id), ['laser']);
    assert.equal(document.views.bench.placements.pbs, undefined);
    assert.equal(document.views.schematic.placements.pbs, undefined);
    assert.equal(document.beamGraph.edges.length, 0);
    assert.equal(document.views.schematic.paths.length, 0);
    assert.deepEqual(document.views.schematic.groups[0].componentIds, ['laser']);
    assert.equal(document.annotations.length, 0);
});

test('document history restores shared data and both independent layouts after schematic edit', () => {
    const source = makeDocument();
    const store = new DocumentStore(source);
    const model = new SchematicEditorModel(source);
    model.select('pbs');
    model.moveSelection(80, 40);
    model.renameComponent('pbs', 'Output PBS');
    store.replaceDocument(model.getDocument(), 'edit schematic');

    assert.equal(store.getDocument().views.schematic.placements.pbs.x, 740);
    assert.equal(store.getDocument().views.bench.placements.pbs.x, 400);
    assert.equal(store.undo(), true);
    assert.deepEqual(store.getDocument(), source);
    assert.equal(store.redo(), true);
    assert.equal(store.getDocument().components[1].name, 'Output PBS');
});

test('reprojection preserves renamed entities and manually locked layout while adding bench entities', () => {
    const source = makeDocument();
    source.components[1].name = 'Analysis PBS';
    source.components.push({ id: 'cell', type: 'AtomicCell', name: 'Cell' });
    source.beamGraph.nodes.push({ id: 'cell' });
    source.beamGraph.edges.push({ id: 'edge-2', from: { componentId: 'pbs' }, to: { componentId: 'cell' } });

    const projected = SchematicProjector.project(source);
    assert.equal(projected.components[1].name, 'Analysis PBS');
    assert.deepEqual(projected.views.schematic.placements.pbs, { x: 660, y: 300 });
    assert.ok(projected.views.schematic.placements.cell);
});
