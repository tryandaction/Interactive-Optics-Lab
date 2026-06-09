/**
 * GridRenderStyle.test.js - grid rendering style helper tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    computeGridRenderStyle,
    isMajorGridLine
} from '../../src/rendering/GridRenderStyle.js';

test('GridRenderStyle computes minor and major grid styles', () => {
    const style = computeGridRenderStyle({
        dpr: 2,
        gridSize: 50,
        minorColor: 'rgba(1, 2, 3, 0.1)',
        majorColor: 'rgba(4, 5, 6, 0.2)'
    });

    assert.equal(style.minorColor, 'rgba(1, 2, 3, 0.1)');
    assert.equal(style.majorColor, 'rgba(4, 5, 6, 0.2)');
    assert.equal(style.gridSize, 50);
    assert.equal(style.majorEvery, 5);
    assert.equal(style.pixelOffset, 0.25);
    assert.ok(style.majorWidth > style.minorWidth);
});

test('GridRenderStyle clamps grid size and major interval', () => {
    const style = computeGridRenderStyle({
        dpr: 0,
        gridSize: 1,
        majorEvery: 1
    });

    assert.equal(style.gridSize, 5);
    assert.equal(style.majorEvery, 2);
    assert.equal(style.pixelOffset, 0.5);
});

test('GridRenderStyle identifies major grid lines', () => {
    assert.equal(isMajorGridLine(0, 5), false);
    assert.equal(isMajorGridLine(1, 5), false);
    assert.equal(isMajorGridLine(5, 5), true);
    assert.equal(isMajorGridLine(10, 5), true);
    assert.equal(isMajorGridLine(6, 5), false);
});
