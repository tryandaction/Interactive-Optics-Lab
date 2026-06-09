/**
 * ExportEngineRenderStyle.test.js - export rendering style regression tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExportEngine } from '../../src/diagram/ExportEngine.js';

test('ExportEngine renders SVG rays with glow and core layers', () => {
    const engine = new ExportEngine();
    const config = {
        ...engine.getConfig(),
        backgroundColor: '#ffffff',
        strokeScale: 1,
        rayStyle: {
            color: '#ff0000',
            lineWidth: 2,
            lineStyle: 'solid'
        }
    };

    const svg = engine._renderRaysToSVG([
        {
            pathPoints: [
                { x: 0, y: 0 },
                { x: 30, y: 0 }
            ],
            color: '#ff0000',
            lineWidth: 2,
            intensity: 1
        }
    ], config);

    assert.match(svg, /id="ray-0-glow"/);
    assert.match(svg, /id="ray-0-core"/);
    assert.match(svg, /stroke="rgba\(255, 0, 0,/);
    assert.equal((svg.match(/<path/g) || []).length, 2);
});

test('ExportEngine keeps dashed and dotted SVG ray classes on both layers', () => {
    const engine = new ExportEngine();
    const config = {
        ...engine.getConfig(),
        rayStyle: {
            color: '#00ff00',
            lineWidth: 1.5,
            lineStyle: 'dashed'
        }
    };

    const svg = engine._renderRaysToSVG([
        {
            pathPoints: [
                { x: 0, y: 0 },
                { x: 10, y: 10 }
            ],
            lineStyle: 'dotted'
        }
    ], config);

    assert.equal((svg.match(/class="ray ray-dotted"/g) || []).length, 2);
});
