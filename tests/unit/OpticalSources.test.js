/**
 * OpticalSources.test.js - Laser/Fan/Line/WhiteLight source generation
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import { Ray } from '../../src/core/Ray.js';
import { deserializeScene, serializeScene } from '../../src/utils/Serialization.js';
import { LaserSource } from '../../src/components/sources/LaserSource.js';
import { FanSource } from '../../src/components/sources/FanSource.js';
import { LEDSource } from '../../src/components/sources/LEDSource.js';
import { LineSource } from '../../src/components/sources/LineSource.js';
import { PointSource } from '../../src/components/sources/PointSource.js';
import { PulsedLaserSource } from '../../src/components/sources/PulsedLaserSource.js';
import { WhiteLightSource } from '../../src/components/sources/WhiteLightSource.js';

test('LaserSource 角度分布与强度拆分', () => {
    const src = new LaserSource(new Vector(0, 0), 0, 550, 3.0, 3, 20);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 3);
    rays.forEach(ray => assert.ok(Math.abs(ray.intensity - 1.0) < 1e-6));

    const half = 10 * Math.PI / 180;
    const angles = rays.map(r => Math.atan2(r.direction.y, r.direction.x));
    assert.ok(Math.abs(angles[0] + half) < 1e-3);
    assert.ok(Math.abs(angles[1]) < 1e-3);
    assert.ok(Math.abs(angles[2] - half) < 1e-3);
});

test('FanSource 扇形角覆盖', () => {
    const src = new FanSource(new Vector(0, 0), 0, 550, 5.0, 5, 40);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 5);

    const half = 20 * Math.PI / 180;
    const angles = rays.map(r => Math.atan2(r.direction.y, r.direction.x));
    assert.ok(Math.abs(angles[0] + half) < 1e-3);
    assert.ok(Math.abs(angles[angles.length - 1] - half) < 1e-3);
});

test('LineSource 线段均匀发射', () => {
    const src = new LineSource(new Vector(0, 0), 0, 550, 3.0, 3, 10);
    const rays = src.generateRays(Ray);
    assert.equal(rays.length, 3);

    rays.forEach(ray => {
        assert.ok(Math.abs(ray.direction.x) < 1e-6);
        assert.ok(ray.direction.y > 0.99);
    });

    const xs = rays.map(r => r.origin.x).sort((a, b) => a - b);
    assert.ok(Math.abs(xs[0] + 5) < 1e-6);
    assert.ok(Math.abs(xs[1]) < 1e-6);
    assert.ok(Math.abs(xs[2] - 5) < 1e-6);
});

test('WhiteLightSource 快速模式单波长输出', () => {
    const savedWindow = global.window;
    const savedRandom = Math.random;
    global.window = { maxRaysPerSource: 1001, fastWhiteLightMode: true };
    Math.random = () => 0;

    try {
        const src = new WhiteLightSource(new Vector(0, 0), 0, 30.0, 3, 0);
        const rays = src.generateRays(Ray);
        assert.equal(rays.length, 3);
        rays.forEach(ray => assert.equal(ray.wavelengthNm, 380));
    } finally {
        Math.random = savedRandom;
        global.window = savedWindow;
    }
});

test('PointSource uniformly covers its centered angular range and conserves total intensity', () => {
    const source = new PointSource(new Vector(4, -3), 532, 2.4, 4, 80, true);
    source.angleRad = Math.PI / 2;

    const rays = source.generateRays(Ray);
    assert.equal(rays.length, 4);
    assert.deepEqual(
        rays.map(ray => [ray.origin.x, ray.origin.y]),
        [[4, -3], [4, -3], [4, -3], [4, -3]]
    );
    assert.ok(rays.every(ray => ray.wavelengthNm === 532));
    assert.ok(rays.every(ray => Math.abs(ray.intensity - 0.6) < 1e-12));
    assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 2.4) < 1e-12);

    const angles = rays.map(ray => Math.atan2(ray.direction.y, ray.direction.x));
    const expectedAngles = [60, 80, 100, 120].map(degrees => degrees * Math.PI / 180);
    angles.forEach((angle, index) => assert.ok(Math.abs(angle - expectedAngles[index]) < 1e-12));
});

test('PointSource emits no rays when disabled and normalizes constructor ray counts', () => {
    const disabled = new PointSource(new Vector(0, 0), 550, 1, 5, 360, false);
    assert.deepEqual(disabled.generateRays(Ray), []);

    const source = new PointSource(new Vector(0, 0), 550, 1, 2.5, 360, true);
    const rays = source.generateRays(Ray);
    assert.equal(source.numRays, 2);
    assert.equal(rays.length, 2);
    assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 1) < 1e-12);
});

test('LEDSource emits deterministic Gaussian-spectrum, unpolarized fan samples and conserves intensity', () => {
    const source = new LEDSource(new Vector(2, 3), 0, 500, 23.55, 3, 3, 60, true);
    const savedRandom = Math.random;
    const samples = [0.5, 0, 0.1, 0.5, 0.5, 0.2, 0.5, 0.25, 0.3];
    Math.random = () => samples.shift();

    try {
        const rays = source.generateRays(Ray);
        assert.equal(rays.length, 3);
        assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 3) < 1e-12);
        assert.ok(rays.every(ray => ray.polarizationAngle === null && ray.jones === null));

        const sigma = 10;
        const expectedWavelengths = [
            500 + Math.sqrt(-2 * Math.log(0.5)) * sigma,
            500 - Math.sqrt(-2 * Math.log(0.5)) * sigma,
            500
        ];
        rays.forEach((ray, index) => {
            assert.ok(Math.abs(ray.wavelengthNm - expectedWavelengths[index]) < 1e-9);
            assert.deepEqual([ray.origin.x, ray.origin.y], [2, 3]);
        });

        const angles = rays.map(ray => Math.atan2(ray.direction.y, ray.direction.x));
        const expectedAngles = [-30, 0, 30].map(degrees => degrees * Math.PI / 180);
        angles.forEach((angle, index) => assert.ok(Math.abs(angle - expectedAngles[index]) < 1e-12));
        assert.deepEqual(rays.map(ray => ray.phase), [0.2 * Math.PI, 0.4 * Math.PI, 0.6 * Math.PI]);
    } finally {
        Math.random = savedRandom;
    }
});

test('LEDSource emits no rays when disabled and normalizes constructor ray counts', () => {
    const disabled = new LEDSource(new Vector(0, 0), 0, 500, 30, 1, 4, 30, false);
    assert.deepEqual(disabled.generateRays(Ray), []);

    const source = new LEDSource(new Vector(0, 0), 0, 500, 30, 1, 2.5, 30, true);
    const rays = source.generateRays(Ray);
    assert.equal(source.numRays, 2);
    assert.equal(rays.length, 2);
    assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 1) < 1e-12);
});

test('PointSource and LEDSource preserve source state through generic scene serialization', () => {
    const point = new PointSource(new Vector(12, 34), 510, 1.8, 7, 120, false);
    point.angleRad = Math.PI / 3;
    point.id = 'point-source-json';
    point.label = 'Point test source';
    point.notes = 'point notes';

    const led = new LEDSource(new Vector(-5, 8), 25, 635, 42, 2.5, 9, 50, true);
    led.id = 'led-source-json';
    led.label = 'LED test source';
    led.notes = 'led notes';

    const scene = deserializeScene(serializeScene([point, led]), { PointSource, LEDSource });
    assert.equal(scene.components.length, 2);

    const [restoredPoint, restoredLed] = scene.components;
    assert.equal(restoredPoint.id, point.id);
    assert.equal(restoredPoint.label, point.label);
    assert.equal(restoredPoint.notes, point.notes);
    assert.equal(restoredPoint.wavelength, 510);
    assert.equal(restoredPoint.numRays, 7);
    assert.equal(restoredPoint.angularRangeDeg, 120);
    assert.equal(restoredPoint.enabled, false);
    assert.ok(Math.abs(restoredPoint.angleRad - Math.PI / 3) < 1e-12);

    assert.equal(restoredLed.id, led.id);
    assert.equal(restoredLed.label, led.label);
    assert.equal(restoredLed.notes, led.notes);
    assert.equal(restoredLed.centerWavelength, 635);
    assert.equal(restoredLed.fwhm, 42);
    assert.equal(restoredLed.intensity, 2.5);
    assert.equal(restoredLed.numRays, 9);
    assert.ok(Math.abs(restoredLed.spreadRad - 50 * Math.PI / 180) < 1e-12);
});

test('WhiteLightSource full-spectrum mode preserves weighted wavelength energy and JSON state', () => {
    const savedWindow = global.window;
    global.window = { maxRaysPerSource: 1001, fastWhiteLightMode: false };
    try {
        const source = new WhiteLightSource(new Vector(5, 6), 20, 30, 2, 0, true);
        source.id = 'white-json';
        const rays = source.generateRays(Ray);
        assert.equal(rays.length, source.componentWavelengths.length * 2);
        assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 30) < 1e-9);
        assert.deepEqual(new Set(rays.map(ray => ray.wavelengthNm)), new Set(source.componentWavelengths.map(item => item.wl)));
        const restored = deserializeScene(serializeScene([source]), { WhiteLightSource }).components[0];
        assert.equal(restored.id, source.id);
        assert.equal(restored.baseIntensity, 30);
        assert.equal(restored.rayCount, 2);
    } finally {
        global.window = savedWindow;
    }
});

test('PulsedLaserSource preserves pulse formulas, fan emission, and JSON state', () => {
    const source = new PulsedLaserSource(new Vector(7, 9), 15, 800, 4, 200, 2e6, 3, 20, true);
    source.id = 'pulsed-source-json';
    source.chirpParameter = 1.25;

    assert.equal(source.getPulseEnergy(), 4 * 200e-15);
    assert.equal(source.getAveragePower(), 4 * 200e-15 * 2e6);
    const expectedBandwidth = ((800e-9 * 800e-9) * (0.44 / (200e-15)) / 3e8) * 1e9;
    assert.ok(Math.abs(source.getSpectralBandwidth() - expectedBandwidth) < 1e-9);

    const rays = source.generateRays(Ray);
    assert.equal(rays.length, 3);
    assert.ok(rays.every(ray => Math.abs(ray.intensity - 4 / 3) < 1e-12));
    assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 4) < 1e-12);

    const serialized = JSON.parse(serializeScene([source]));
    const scene = deserializeScene(JSON.stringify(serialized), { PulsedLaserSource });
    const restored = scene.components[0];
    assert.equal(restored.id, source.id);
    assert.equal(restored.peakPower, 4);
    assert.equal(restored.pulseWidthFs, 200);
    assert.equal(restored.repetitionRateHz, 2e6);
    assert.equal(restored.numRays, 3);
    assert.equal(restored.chirpParameter, 1.25);
    assert.ok(Math.abs(restored.angleRad - 15 * Math.PI / 180) < 1e-12);
});

test('PulsedLaserSource normalizes fractional ray counts and respects disabled state', () => {
    const disabled = new PulsedLaserSource(new Vector(0, 0), 0, 800, 2, 100, 1e6, 4, 0, false);
    assert.deepEqual(disabled.generateRays(Ray), []);

    const source = new PulsedLaserSource(new Vector(0, 0), 0, 800, 2, 100, 1e6, 2.5, 0, true);
    const rays = source.generateRays(Ray);
    assert.equal(source.numRays, 2);
    assert.equal(rays.length, 2);
    assert.ok(Math.abs(rays.reduce((sum, ray) => sum + ray.intensity, 0) - 2) < 1e-12);
});
