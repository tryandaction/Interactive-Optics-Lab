import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LENS_TYPES, ThinLens } from '../../src/components/lenses/ThinLens.js';
import { N_AIR } from '../../src/core/constants.js';
import { snellRefraction } from '../../src/core/OpticsMath.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';
import { RayTracer } from '../../src/simulation/RayTracer.js';

const EPSILON = 1e-6;

function approx(actual, expected, epsilon = EPSILON) {
    assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to equal ${expected}`);
}

function passThroughTwoSurfaces(lens, ray) {
    const [entryHit] = lens.intersect(ray.origin, ray.direction);
    assert.ok(entryHit, 'the ray should hit the first lens surface');
    assert.equal(entryHit.surfaceId, 'front_surface');
    assert.ok(ray.direction.dot(entryHit.normal) < 0, 'entry normal should face the incoming ray');

    const [insideRay] = lens.interact(ray, entryHit, Ray);
    assert.ok(insideRay, 'entry refraction should produce an internal ray');

    const [exitHit] = lens.intersect(insideRay.origin, insideRay.direction);
    assert.ok(exitHit, 'the internal ray should hit the second lens surface');
    assert.equal(exitHit.surfaceId, 'back_surface');
    assert.ok(insideRay.direction.dot(exitHit.normal) < 0, 'exit normal should face the internal ray');

    const [outputRay] = lens.interact(insideRay, exitHit, Ray);
    assert.ok(outputRay, 'exit refraction should produce an external ray');
    return { entryHit, insideRay, exitHit, outputRay };
}

test('thick biconvex lens traces an off-axis ray across two physical surfaces', () => {
    const lens = new ThinLens(new Vector(0, 0), 60, 150, 0);
    lens.setProperty('lensType', LENS_TYPES.THICK_BICONVEX);
    lens.setProperty('thickness', 20);
    lens.setProperty('quality', 0.9);

    const height = 10;
    const ray = new Ray(
        lens.pos.subtract(lens.axisDirection.multiply(100)).add(lens.lensDir.multiply(height)),
        lens.axisDirection,
        550,
        1
    );
    const { entryHit, insideRay, exitHit, outputRay } = passThroughTwoSurfaces(lens, ray);

    assert.ok(exitHit.point.subtract(entryHit.point).dot(lens.axisDirection) > lens.thickness * 0.5);
    approx(insideRay.mediumRefractiveIndex, lens.getRefractiveIndex(550));
    approx(outputRay.mediumRefractiveIndex, N_AIR);
    const lensIndex = lens.getRefractiveIndex(550);
    const entryReflectance = snellRefraction(ray.direction, entryHit.normal, N_AIR, lensIndex).reflectance;
    const exitReflectance = snellRefraction(insideRay.direction, exitHit.normal, lensIndex, N_AIR).reflectance;
    approx(outputRay.intensity, 0.9 * (1 - entryReflectance) * (1 - exitReflectance));
    assert.ok(outputRay.direction.dot(lens.lensDir) < 0, 'positive-height ray should bend toward the optical axis');
});

test('thick plano lens supports a plane exit surface without creating a duplicate self-hit', () => {
    const lens = new ThinLens(new Vector(0, 0), 60, 150, 0);
    lens.setProperty('lensType', LENS_TYPES.THICK_PLANO_CONVEX);
    lens.setProperty('thickness', 16);

    const ray = new Ray(lens.pos.subtract(lens.axisDirection.multiply(100)), lens.axisDirection, 550, 1);
    const { entryHit, exitHit, outputRay } = passThroughTwoSurfaces(lens, ray);

    assert.equal(entryHit.surfaceId, 'front_surface');
    assert.equal(exitHit.surfaceId, 'back_surface');
    assert.ok(outputRay.direction.dot(lens.axisDirection) > 0.999999);
});

test('thick lens splits unpolarized interface energy into reflected and refracted branches', () => {
    const lens = new ThinLens(new Vector(0, 0), 60, 150, 0);
    lens.setProperty('lensType', LENS_TYPES.THICK_BICONVEX);
    const ray = new Ray(lens.pos.subtract(lens.axisDirection.multiply(100)), lens.axisDirection, 550, 1);
    const [entryHit] = lens.intersect(ray.origin, ray.direction);
    const outputs = lens.interact(ray, entryHit, Ray);

    assert.equal(outputs.length, 2);
    approx(outputs.reduce((sum, output) => sum + output.intensity, 0), 1);
    const refracted = outputs.find(output => output.mediumRefractiveIndex > N_AIR + 0.1);
    const reflected = outputs.find(output => output.mediumRefractiveIndex <= N_AIR + 0.01);
    assert.ok(refracted, 'one branch should enter the lens medium');
    assert.ok(reflected, 'one branch should remain in the incident medium');
    assert.ok(reflected.direction.dot(lens.axisDirection) < 0, 'the reflected branch should return toward the source');
});

test('thick lens records front and back surface events without a false round trip', () => {
    const savedWindow = global.window;
    global.window = { globalMaxBounces: 50, globalMinIntensity: 1e-6 };
    try {
        const lens = new ThinLens(new Vector(100, 0), 60, 150, 270);
        lens.setProperty('lensType', LENS_TYPES.THICK_BICONVEX);
        const ray = new Ray(new Vector(0, 10), new Vector(1, 0), 550, 1);
        ray.originComponentId = 'source';
        ray.sourceId = 'source';
        ray.visitedComponentIds = ['source'];
        const source = { id: 'source', type: 'LaserSource', name: 'Test source' };
        const result = new RayTracer().traceAllRays([source, lens], 500, 300, [ray]);
        const surfaceEdges = result.beamGraph.edges.filter(edge => edge.to.componentId === lens.id);

        assert.ok(surfaceEdges.some(edge => edge.surfaceId === 'front_surface'));
        assert.ok(surfaceEdges.some(edge => edge.surfaceId === 'back_surface'));
        const internalEdge = surfaceEdges.find(edge =>
            edge.from.componentId === lens.id && edge.to.componentId === lens.id
        );
        assert.ok(internalEdge, 'the exit surface should be reached by a lens-originated internal ray');
        assert.equal(internalEdge.roundTrip, false);
    } finally {
        global.window = savedWindow;
    }
});
