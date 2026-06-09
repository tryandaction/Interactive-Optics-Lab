/**
 * HistoryManager.test.js - command history regression tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { GameObject } from '../../src/core/GameObject.js';
import {
    HistoryManager,
    SetPropertyCommand
} from '../../src/managers/HistoryManager.js';

test('SetPropertyCommand preserves angleDeg unit contract across undo and redo', () => {
    const component = new GameObject(new Vector(0, 0), 30, 'test');
    const history = new HistoryManager();

    history.addCommand(new SetPropertyCommand(component, 'angleDeg', 30, 45));
    history.peekUndo().execute();

    assert.equal(component.angleRad, Math.PI / 4);

    history.undo();
    assert.equal(component.angleRad, Math.PI / 6);

    history.redo();
    assert.equal(component.angleRad, Math.PI / 4);
});

test('SetPropertyCommand preserves position values across undo and redo', () => {
    const component = new GameObject(new Vector(10, 20), 0, 'test');
    const history = new HistoryManager();

    history.addCommand(new SetPropertyCommand(component, 'posX', 10, 42));
    history.peekUndo().execute();

    assert.equal(component.pos.x, 42);

    history.undo();
    assert.equal(component.pos.x, 10);

    history.redo();
    assert.equal(component.pos.x, 42);
});
