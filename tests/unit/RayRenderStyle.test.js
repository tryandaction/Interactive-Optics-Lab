/**
 * RayRenderStyle.test.js - rendering style helper tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    computeRayRenderStyle,
    parseRgbaColor,
    toRgbaString
} from '../../src/rendering/RayRenderStyle.js';

function alphaOf(rgbaString) {
    const match = rgbaString.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([.\d]+)\s*\)/);
    assert.ok(match, `invalid rgba string: ${rgbaString}`);
    return Number(match[1]);
}

test('RayRenderStyle parses rgb and rgba colors', () => {
    assert.deepEqual(parseRgbaColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30, a: 1 });
    assert.deepEqual(parseRgbaColor('rgba(10, 20, 30, 0.25)'), { r: 10, g: 20, b: 30, a: 0.25 });
    assert.deepEqual(parseRgbaColor('not-a-color'), { r: 255, g: 255, b: 255, a: 1 });
});

test('RayRenderStyle parses hex colors used by exports', () => {
    assert.deepEqual(parseRgbaColor('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
    assert.deepEqual(parseRgbaColor('#0f8'), { r: 0, g: 255, b: 136, a: 1 });
});

test('RayRenderStyle formats rgba with clamped alpha', () => {
    assert.equal(toRgbaString({ r: 10.2, g: 20.6, b: 30.1, a: 2 }), 'rgba(10, 21, 30, 1.000)');
    assert.equal(toRgbaString({ r: 10, g: 20, b: 30, a: -1 }), 'rgba(10, 20, 30, 0.000)');
});

test('RayRenderStyle computes wider glow than core line', () => {
    const ray = {
        intensity: 1,
        getColor: () => 'rgba(255, 0, 0, 0.8)',
        getLineWidth: () => 2
    };

    const style = computeRayRenderStyle(ray, { dpr: 1, background: 'dark' });

    assert.ok(style.glowWidth > style.coreWidth);
    assert.ok(alphaOf(style.coreColor) > alphaOf(style.glowColor));
});

test('RayRenderStyle adapts glow opacity for dark and light backgrounds', () => {
    const ray = {
        intensity: 0.2,
        getColor: () => 'rgba(0, 255, 0, 0.5)',
        getLineWidth: () => 1.5
    };

    const darkStyle = computeRayRenderStyle(ray, { dpr: 1, background: 'dark' });
    const lightStyle = computeRayRenderStyle(ray, { dpr: 1, background: 'light' });

    assert.ok(alphaOf(darkStyle.glowColor) > alphaOf(lightStyle.glowColor));
    assert.ok(darkStyle.glowWidth > lightStyle.coreWidth);
});

test('RayRenderStyle scales widths by device pixel ratio', () => {
    const ray = {
        intensity: 1,
        getColor: () => 'rgba(0, 0, 255, 0.8)',
        getLineWidth: () => 4
    };

    const oneX = computeRayRenderStyle(ray, { dpr: 1 });
    const twoX = computeRayRenderStyle(ray, { dpr: 2 });

    assert.ok(twoX.coreWidth < oneX.coreWidth);
    assert.ok(twoX.glowWidth < oneX.glowWidth);
});
