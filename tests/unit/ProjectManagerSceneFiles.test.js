import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ProjectManager } from '../../src/managers/ProjectManager.js';

test('ProjectManager recognizes v3 and legacy scene file names without treating project config as a scene', () => {
    assert.equal(ProjectManager.isSceneFileName('experiment.opticslab.json'), true);
    assert.equal(ProjectManager.isSceneFileName('experiment.scene.json'), true);
    assert.equal(ProjectManager.isSceneFileName('.opticslab.json'), false);
    assert.equal(ProjectManager.isSceneFileName('notes.json'), false);
});

test('ProjectManager derives scene names from both supported extensions', () => {
    assert.equal(ProjectManager.getSceneNameFromFile('experiment.opticslab.json'), 'experiment');
    assert.equal(ProjectManager.getSceneNameFromFile('legacy.scene.json'), 'legacy');
    assert.equal(ProjectManager.getSceneNameFromFile('notes.json'), null);
});
