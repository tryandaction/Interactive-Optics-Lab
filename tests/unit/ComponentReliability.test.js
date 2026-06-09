/**
 * ComponentReliability.test.js - component reliability and validation matrix tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    COMPONENT_RELIABILITY,
    RELIABILITY_LEVELS,
    getComponentReliability,
    getReliabilityLabel
} from '../../src/components/ComponentReliability.js';
import {
    COMPONENT_VALIDATION_MATRIX,
    EXPORTED_COMPONENT_TYPES,
    VALIDATION_STATUS
} from '../../src/components/ComponentValidationMatrix.js';
import { Vector } from '../../src/core/Vector.js';
import { ThinLens } from '../../src/components/lenses/ThinLens.js';

const CURRENT_EXPORTED_COMPONENTS = [
    'AcoustoOpticModulator',
    'Aperture',
    'AsphericLens',
    'AtomicCell',
    'BeamSplitter',
    'CCDCamera',
    'CustomComponent',
    'CylindricalLens',
    'DichroicMirror',
    'DielectricBlock',
    'DiffractionGrating',
    'ElectroOpticModulator',
    'FabryPerotCavity',
    'FanSource',
    'FaradayIsolator',
    'FaradayRotator',
    'GRINLens',
    'HalfWavePlate',
    'LEDSource',
    'LaserSource',
    'LineSource',
    'MagneticCoil',
    'MetallicMirror',
    'Mirror',
    'OpticalChopper',
    'OpticalFiber',
    'ParabolicMirror',
    'Photodiode',
    'PointSource',
    'PolarizationAnalyzer',
    'Polarizer',
    'PowerMeter',
    'Prism',
    'PulsedLaserSource',
    'QuarterWavePlate',
    'RingMirror',
    'Screen',
    'Spectrometer',
    'SphericalMirror',
    'ThinLens',
    'VariableAttenuator',
    'WavePlate',
    'WhiteLightSource',
    'WollastonPrism'
].sort();

test('core components include explicit reliability metadata', () => {
    const required = [
        'LaserSource',
        'Mirror',
        'ThinLens',
        'Prism',
        'DielectricBlock',
        'BeamSplitter',
        'Polarizer',
        'DiffractionGrating',
        'OpticalFiber'
    ];

    required.forEach(type => {
        assert.ok(COMPONENT_RELIABILITY[type], `${type} missing reliability metadata`);
        assert.ok(COMPONENT_RELIABILITY[type].scope);
        assert.ok(COMPONENT_RELIABILITY[type].limitations);
    });
});

test('validation matrix covers every current exported component type', () => {
    assert.deepEqual(EXPORTED_COMPONENT_TYPES, CURRENT_EXPORTED_COMPONENTS);

    CURRENT_EXPORTED_COMPONENTS.forEach(type => {
        const entry = COMPONENT_VALIDATION_MATRIX[type];
        assert.ok(entry, `${type} missing validation matrix entry`);
        assert.ok(Object.values(RELIABILITY_LEVELS).includes(entry.reliability), `${type} has invalid reliability`);
        assert.ok(Object.values(VALIDATION_STATUS).includes(entry.validation), `${type} has invalid validation status`);
        assert.ok(entry.category, `${type} missing category`);
        assert.ok(Array.isArray(entry.tests), `${type} tests must be an array`);
        assert.ok(entry.next, `${type} missing next work`);
    });
});

test('all matrix-covered components resolve to a non-unknown reliability level', () => {
    CURRENT_EXPORTED_COMPONENTS.forEach(type => {
        const metadata = getComponentReliability(type);
        assert.notEqual(metadata.level, RELIABILITY_LEVELS.UNKNOWN, `${type} unexpectedly resolves to unknown`);
        assert.ok(metadata.scope);
        assert.ok(metadata.limitations);
    });
});

test('ThinLens is explicitly marked as paraxial approximation', () => {
    const lens = new ThinLens(new Vector(0, 0), 80, 100, 90);
    const metadata = getComponentReliability(lens);
    assert.equal(metadata.level, RELIABILITY_LEVELS.PARAXIAL_APPROXIMATION);
    assert.match(metadata.limitations, /表面追迹|厚透镜/);
});

test('unknown components fall back to unknown reliability', () => {
    const metadata = getComponentReliability('FutureComponent');
    assert.equal(metadata.level, RELIABILITY_LEVELS.UNKNOWN);
    assert.match(metadata.scope, /尚未纳入/);
});

test('reliability labels are readable', () => {
    assert.equal(getReliabilityLabel(RELIABILITY_LEVELS.EXACT_GEOMETRIC), '几何光学基线');
    assert.equal(getReliabilityLabel('not-a-level'), '未评估');
});
