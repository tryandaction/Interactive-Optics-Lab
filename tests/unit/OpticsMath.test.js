/**
 * OpticsMath.test.js - pure optical math helper tests
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector } from '../../src/core/Vector.js';
import {
    reflectDirection,
    fresnelUnpolarizedReflectance,
    snellRefraction,
    paraxialThinLensDirection,
    paraxialForwardLensDirection,
    thinLensImaging,
    diffractionGratingDirection,
    fiberCouplingFactor,
    jonesIntensity,
    normalizeJones,
    jonesLinear,
    jonesCircular,
    jonesRotationMatrix,
    applyJonesMatrix,
    projectJonesLinear,
    splitJonesByPBS,
    splitJonesByOrthogonalAxes,
    transformJonesByRetarder
} from '../../src/core/OpticsMath.js';

const EPS = 1e-6;

function approx(actual, expected, eps = EPS) {
    assert.ok(
        Math.abs(actual - expected) < eps,
        `expected ${actual} ≈ ${expected} (eps=${eps})`
    );
}

test('OpticsMath reflectDirection mirrors the normal component', () => {
    const incident = new Vector(1, -1).normalize();
    const normal = new Vector(0, 1);

    const reflected = reflectDirection(incident, normal);

    approx(reflected.x, incident.x);
    approx(reflected.y, -incident.y);
});

test('OpticsMath fresnelUnpolarizedReflectance matches normal incidence formula', () => {
    const n1 = 1.0;
    const n2 = 1.5;
    const expected = ((n1 - n2) / (n1 + n2)) ** 2;

    approx(fresnelUnpolarizedReflectance(n1, n2, 1, 1), expected);
});

test('OpticsMath snellRefraction bends toward normal from air to glass', () => {
    const incidentAngle = Math.PI / 6;
    const incident = new Vector(Math.sin(incidentAngle), -Math.cos(incidentAngle));
    const normal = new Vector(0, 1);
    const result = snellRefraction(incident, normal, 1.0, 1.5);

    assert.equal(result.isTotalInternalReflection, false);
    assert.ok(result.refractedDirection);
    const expectedSinT = Math.sin(incidentAngle) / 1.5;
    const actualSinT = Math.abs(result.refractedDirection.x);
    approx(actualSinT, expectedSinT);
    assert.ok(result.reflectance > 0 && result.reflectance < 1);
});

test('OpticsMath snellRefraction detects total internal reflection', () => {
    const incidentAngle = Math.asin(1 / 1.5) + 0.1;
    const incident = new Vector(Math.sin(incidentAngle), -Math.cos(incidentAngle));
    const normal = new Vector(0, 1);
    const result = snellRefraction(incident, normal, 1.5, 1.0);

    assert.equal(result.isTotalInternalReflection, true);
    assert.equal(result.refractedDirection, null);
    approx(result.reflectance, 1);
});

test('OpticsMath paraxialThinLensDirection applies paraxial lens power to parallel rays', () => {
    const axis = new Vector(1, 0);
    const lensPlane = new Vector(0, 1);
    const focalLength = 100;
    const height = 10;

    const output = paraxialThinLensDirection(
        axis,
        axis,
        lensPlane,
        height,
        focalLength
    );

    approx(output.angle(), -height / focalLength);
});

test('OpticsMath paraxialThinLensDirection preserves incident angle then applies lens power', () => {
    const axis = new Vector(1, 0);
    const lensPlane = new Vector(0, 1);
    const incidentAngle = Math.PI / 12;
    const height = 12;
    const focalLength = 120;
    const incident = Vector.fromAngle(incidentAngle);

    const output = paraxialThinLensDirection(
        incident,
        axis,
        lensPlane,
        height,
        focalLength
    );

    approx(output.angle(), incidentAngle - height / focalLength);
});

test('OpticsMath paraxialForwardLensDirection focuses off-axis rays with forward axis selection', () => {
    const geometricAxis = new Vector(0, -1);
    const lensPlane = new Vector(1, 0);
    const incident = new Vector(0, 1);
    const height = 10;
    const focalLength = 100;

    const output = paraxialForwardLensDirection(
        incident,
        geometricAxis,
        lensPlane,
        height,
        focalLength
    );

    const tToFocalPlane = 100 / output.y;
    const xAtFocalPlane = height + output.x * tToFocalPlane;
    approx(xAtFocalPlane, 0, 0.15);
});

test('OpticsMath paraxialForwardLensDirection preserves signed object height', () => {
    const axis = new Vector(0, 1);
    const lensPlane = new Vector(1, 0);
    const focalLength = 100;

    const upper = paraxialForwardLensDirection(new Vector(0, 1), axis, lensPlane, 10, focalLength);
    const lower = paraxialForwardLensDirection(new Vector(0, 1), axis, lensPlane, -10, focalLength);

    approx(upper.x, -lower.x);
    approx(upper.y, lower.y);
});

test('OpticsMath thinLensImaging returns real same-size image for object at 2f', () => {
    const result = thinLensImaging(200, 100);

    approx(result.v, 200);
    approx(result.magnification, -1);
    assert.equal(result.isRealImage, true);
    assert.equal(result.imageAtInfinity, false);
});

test('OpticsMath thinLensImaging reports image at infinity when object is at f', () => {
    const result = thinLensImaging(100, 100);

    assert.equal(result.v, Infinity);
    assert.equal(result.magnification, Infinity);
    assert.equal(result.isRealImage, false);
    assert.equal(result.imageAtInfinity, true);
});

test('OpticsMath thinLensImaging returns virtual upright image when object is inside f', () => {
    const result = thinLensImaging(50, 100);

    approx(result.v, -100);
    approx(result.magnification, 2);
    assert.equal(result.isRealImage, false);
    assert.equal(result.imageAtInfinity, false);
});

test('OpticsMath thinLensImaging handles diverging lenses as virtual images', () => {
    const result = thinLensImaging(100, -100);

    approx(result.v, -50);
    approx(result.magnification, 0.5);
    assert.equal(result.isRealImage, false);
    assert.equal(result.imageAtInfinity, false);
});

test('OpticsMath diffractionGratingDirection separates +/- first orders at normal incidence', () => {
    const incident = new Vector(0, 1);
    const gratingDirection = new Vector(1, 0);
    const normal = new Vector(0, 1);
    const wavelengthPixels = 0.55;
    const gratingPeriodPixels = 1.0;

    const minusFirst = diffractionGratingDirection(incident, gratingDirection, normal, wavelengthPixels, gratingPeriodPixels, -1);
    const zero = diffractionGratingDirection(incident, gratingDirection, normal, wavelengthPixels, gratingPeriodPixels, 0);
    const plusFirst = diffractionGratingDirection(incident, gratingDirection, normal, wavelengthPixels, gratingPeriodPixels, 1);

    assert.ok(minusFirst);
    assert.ok(zero);
    assert.ok(plusFirst);
    approx(zero.x, 0);
    approx(zero.y, 1);
    approx(minusFirst.x, -0.55);
    approx(plusFirst.x, 0.55);
    approx(minusFirst.y, plusFirst.y);
});

test('OpticsMath fiberCouplingFactor applies NA angle and core position limits', () => {
    approx(fiberCouplingFactor(1.0, 0.9, 0, 5), 1.0);
    approx(fiberCouplingFactor(0.9, 0.9, 0, 5), 0.0);
    approx(fiberCouplingFactor(1.0, 0.9, 2.5, 5), 0.5);
    approx(fiberCouplingFactor(0.89, 0.9, 0, 5), 0.0);
});

test('OpticsMath normalizeJones separates polarization state from intensity', () => {
    const jones = {
        Ex: { re: 0.5, im: 0 },
        Ey: { re: 0.5, im: 0 }
    };

    approx(jonesIntensity(jones), 0.5);
    const normalized = normalizeJones(jones);
    approx(jonesIntensity(normalized), 1.0);
    approx(normalized.Ex.re, 1 / Math.sqrt(2));
    approx(normalized.Ey.re, 1 / Math.sqrt(2));
});

test('OpticsMath jonesLinear creates unit-intensity linear polarization states', () => {
    const horizontal = jonesLinear(0);
    const vertical = jonesLinear(Math.PI / 2);

    approx(jonesIntensity(horizontal), 1.0);
    approx(horizontal.Ex.re, 1.0);
    approx(horizontal.Ey.re, 0.0);

    approx(jonesIntensity(vertical), 1.0);
    approx(vertical.Ex.re, 0.0);
    approx(vertical.Ey.re, 1.0);
});

test('OpticsMath projectJonesLinear follows Malus projection ratios', () => {
    const input = jonesLinear(Math.PI / 4);
    const projected = projectJonesLinear(input, 0);

    approx(jonesIntensity(projected), 0.5);
    approx(projected.Ex.re, 1 / Math.sqrt(2));
    approx(projected.Ey.re, 0.0);
});

test('OpticsMath splitJonesByPBS conserves normalized Jones power ratios', () => {
    const input = jonesLinear(Math.PI / 4);
    const split = splitJonesByPBS(input, 0);

    approx(split.transmittedScale, 0.5);
    approx(split.reflectedScale, 0.5);
    approx(split.transmittedScale + split.reflectedScale, 1.0);
    approx(jonesIntensity(split.transmittedJones), 0.5);
    approx(jonesIntensity(split.reflectedJones), 0.5);
});

test('OpticsMath splitJonesByOrthogonalAxes splits linear 45 degree light equally', () => {
    const input = jonesLinear(Math.PI / 4);
    const split = splitJonesByOrthogonalAxes(input, 0);

    approx(split.primaryScale, 0.5);
    approx(split.secondaryScale, 0.5);
    approx(split.primaryScale + split.secondaryScale, 1.0);
    approx(jonesIntensity(split.primaryJones), 0.5);
    approx(jonesIntensity(split.secondaryJones), 0.5);
});

test('OpticsMath jonesRotationMatrix rotates linear polarization bases', () => {
    const horizontal = jonesLinear(0);
    const rotated = applyJonesMatrix(jonesRotationMatrix(Math.PI / 2), horizontal);

    approx(jonesIntensity(rotated), 1.0);
    approx(rotated.Ex.re, 0.0);
    approx(rotated.Ey.re, 1.0);
});

test('OpticsMath jonesCircular creates unit circular states with opposite handedness', () => {
    const right = jonesCircular(true);
    const left = jonesCircular(false);

    approx(jonesIntensity(right), 1.0);
    approx(jonesIntensity(left), 1.0);
    approx(right.Ey.im, -left.Ey.im);
});

test('OpticsMath transformJonesByRetarder applies half-wave plate rotation rule', () => {
    const fastAxis = Math.PI / 6;
    const inputAngle = Math.PI / 9;
    const halfWaveMatrix = [
        [{ re: 1, im: 0 }, { re: 0, im: 0 }],
        [{ re: 0, im: 0 }, { re: -1, im: 0 }]
    ];

    const output = transformJonesByRetarder(jonesLinear(inputAngle), halfWaveMatrix, fastAxis);
    const outputAngle = Math.atan2(output.Ey.re, output.Ex.re);
    const expectedAngle = 2 * fastAxis - inputAngle;
    const diff = Math.atan2(Math.sin(outputAngle - expectedAngle), Math.cos(outputAngle - expectedAngle));

    approx(jonesIntensity(output), 1.0);
    approx(diff, 0, 1e-4);
});
