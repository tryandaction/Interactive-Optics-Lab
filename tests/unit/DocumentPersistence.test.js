import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createOpticsDocument } from '../../src/document/OpticsDocument.js';
import { DocumentFileController } from '../../src/document/DocumentFileController.js';
import { DocumentRecovery } from '../../src/document/DocumentRecovery.js';

function makeDocument(title = 'Persistence test') {
    return createOpticsDocument({
        metadata: {
            id: 'persist-doc',
            title,
            createdAt: '2026-08-04T00:00:00.000Z',
            updatedAt: '2026-08-04T00:00:00.000Z'
        }
    });
}

function createWritableHandle(name = 'setup.opticslab.json') {
    const writes = [];
    return {
        name,
        writes,
        async createWritable() {
            return {
                async write(value) { writes.push(value); },
                async close() { writes.push('closed'); }
            };
        },
        async getFile() {
            return { name, async text() { return writes[0] || ''; } };
        }
    };
}

test('DocumentFileController saveAs writes .opticslab.json and later save reuses the handle', async () => {
    const handle = createWritableHandle();
    let pickerCalls = 0;
    const controller = new DocumentFileController({
        showSaveFilePicker: async options => {
            pickerCalls += 1;
            assert.match(options.suggestedName, /\.opticslab\.json$/);
            return handle;
        }
    });

    await controller.saveAs(makeDocument('Laser setup'));
    await controller.save(makeDocument('Laser setup updated'));

    assert.equal(pickerCalls, 1);
    assert.equal(handle.writes.filter(value => value !== 'closed').length, 2);
    assert.match(handle.writes[0], /"schemaVersion": "3\.0\.0"/);
});

test('DocumentFileController uses an injected download fallback without file picker support', async () => {
    const downloads = [];
    const controller = new DocumentFileController({
        download: payload => downloads.push(payload)
    });

    const result = await controller.saveAs(makeDocument('Fallback file'));

    assert.equal(result.mode, 'download');
    assert.equal(downloads.length, 1);
    assert.match(downloads[0].fileName, /fallback-file\.opticslab\.json$/);
    assert.match(downloads[0].text, /"title": "Fallback file"/);
});

test('DocumentFileController opens and migrates selected legacy files', async () => {
    const controller = new DocumentFileController({
        showOpenFilePicker: async () => [{
            name: 'legacy.json',
            async getFile() {
                return {
                    name: 'legacy.json',
                    async text() {
                        return JSON.stringify({
                            version: '1.1',
                            name: 'Legacy open',
                            components: []
                        });
                    }
                };
            }
        }]
    });

    const result = await controller.open();

    assert.equal(result.document.schemaVersion, '3.0.0');
    assert.equal(result.document.metadata.title, 'Legacy open');
    assert.equal(result.fileName, 'legacy.json');
});

test('DocumentRecovery saves, migrates, and clears complete documents', () => {
    const values = new Map();
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
    const recovery = new DocumentRecovery({ storage, key: 'test-recovery' });

    recovery.save(makeDocument());
    assert.equal(recovery.hasRecovery(), true);
    assert.equal(recovery.load().metadata.id, 'persist-doc');

    values.set('test-recovery', JSON.stringify({
        checksum: null,
        savedAt: '2026-08-04T00:00:00.000Z',
        payload: JSON.stringify({ version: '1.1', name: 'Recovered legacy', components: [] })
    }));
    assert.equal(recovery.load().metadata.title, 'Recovered legacy');

    recovery.clear();
    assert.equal(recovery.hasRecovery(), false);
});
