import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/OpticsDocument.js';
import { DocumentStore } from '../../src/document/DocumentStore.js';

function makeDocument() {
    return createOpticsDocument({
        metadata: {
            id: 'store-doc',
            title: 'Store test',
            createdAt: '2026-08-04T00:00:00.000Z',
            updatedAt: '2026-08-04T00:00:00.000Z'
        },
        components: [{
            id: 'laser',
            type: 'LaserSource',
            name: 'Laser',
            properties: {},
            ports: []
        }],
        views: {
            bench: { placements: { laser: { x: 100, y: 100, angleDeg: 0 } } },
            schematic: { placements: { laser: { x: 300, y: 200, angleDeg: 0 } } }
        }
    });
}

test('DocumentStore applies focused mutations and increments revision', () => {
    const store = new DocumentStore(makeDocument(), {
        now: () => '2026-08-04T01:00:00.000Z'
    });
    const events = [];
    store.subscribe(event => events.push(event));

    store.updateComponent('laser', { name: 'Probe laser' }, 'rename component');

    const document = store.getDocument();
    assert.equal(document.components[0].name, 'Probe laser');
    assert.equal(document.metadata.revision, 1);
    assert.equal(document.metadata.updatedAt, '2026-08-04T01:00:00.000Z');
    assert.equal(events[0].label, 'rename component');
});

test('DocumentStore keeps bench and schematic placement mutations scoped', () => {
    const store = new DocumentStore(makeDocument());

    store.setPlacement('schematic', 'laser', { x: 640, y: 240, angleDeg: 15 });

    const document = store.getDocument();
    assert.equal(document.views.bench.placements.laser.x, 100);
    assert.equal(document.views.schematic.placements.laser.x, 640);
    assert.deepEqual(document.views.schematic.projection.lockedComponentIds, ['laser']);
});

test('DocumentStore undo and redo restore complete document mutations', () => {
    const store = new DocumentStore(makeDocument());

    store.addComponent({
        id: 'mirror',
        type: 'Mirror',
        name: 'M1',
        properties: { length: 80 },
        ports: []
    }, { x: 220, y: 100, angleDeg: 45 });

    assert.equal(store.getDocument().components.length, 2);
    assert.equal(store.undo(), true);
    assert.equal(store.getDocument().components.length, 1);
    assert.equal(store.redo(), true);
    assert.equal(store.getDocument().components.length, 2);
});

test('DocumentStore removeComponent clears shared and view-owned references', () => {
    const document = makeDocument();
    document.beamGraph.nodes.push({ id: 'laser', type: 'LaserSource', ports: [{ id: 'output' }] });
    document.beamGraph.edges.push({
        id: 'edge-1',
        from: { componentId: 'laser', portId: 'output' },
        to: { componentId: 'terminal', portId: 'input' }
    });
    document.annotations.push({ id: 'label-1', view: 'schematic', anchor: { componentId: 'laser' } });
    const store = new DocumentStore(document);

    store.removeComponent('laser');
    const restored = store.getDocument();

    assert.equal(restored.components.length, 0);
    assert.equal(restored.beamGraph.nodes.length, 0);
    assert.equal(restored.beamGraph.edges.length, 0);
    assert.equal(restored.annotations.length, 0);
    assert.equal(restored.views.bench.placements.laser, undefined);
    assert.equal(restored.views.schematic.placements.laser, undefined);
});
