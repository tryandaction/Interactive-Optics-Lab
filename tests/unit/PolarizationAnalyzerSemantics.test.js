import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PolarizationAnalyzer } from '../../src/components/detectors/PolarizationAnalyzer.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

const EPSILON = 1e-9;

function approx(actual, expected, epsilon = EPSILON) {
    assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to equal ${expected}`);
}

function measure(analyzer, ray) {
    const [hit] = analyzer.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'the incoming ray should hit the analyzer face');
    assert.ok(ray.direction.dot(hit.normal) < 0, 'the analyzer normal should face the incoming ray');
    assert.deepEqual(analyzer.interact(ray, hit, Ray), []);
    assert.equal(ray.endReason, 'absorbed_polarization_analyzer');
}

test('PolarizationAnalyzer accumulates intensity-weighted Stokes readings and clears them on reset', () => {
    const analyzer = new PolarizationAnalyzer(new Vector(0, 0), 60, 50, 0);
    const horizontal = new Ray(new Vector(0, -100), new Vector(0, 1), 532, 2);
    horizontal.setLinearPolarization(0);
    const diagonal = new Ray(new Vector(0, 100), new Vector(0, -1), 532, 0.5);
    diagonal.setLinearPolarization(Math.PI / 4);

    measure(analyzer, horizontal);
    measure(analyzer, diagonal);

    assert.equal(analyzer.hitCount, 2);
    approx(analyzer.stokesS0, 2.5);
    approx(analyzer.stokesS1, 2);
    approx(analyzer.stokesS2, 0.5);
    approx(analyzer.stokesS3, 0);
    assert.equal(analyzer.getPolarizationEllipse().type, 'linear');

    analyzer.reset();
    assert.equal(analyzer.hitCount, 0);
    approx(analyzer.stokesS0, 0);
    approx(analyzer.getDegreeOfPolarization(), 0);
});

test('PolarizationAnalyzer reports the project right-circular Jones convention consistently', () => {
    const analyzer = new PolarizationAnalyzer(new Vector(0, 0), 60, 50, 0);
    const rightCircular = new Ray(new Vector(0, -100), new Vector(0, 1), 532, 1);
    rightCircular.setCircularPolarization(true);

    measure(analyzer, rightCircular);

    approx(analyzer.stokesS0, 1);
    approx(analyzer.stokesS1, 0);
    approx(analyzer.stokesS2, 0);
    approx(analyzer.stokesS3, 1);
    approx(analyzer.getDegreeOfPolarization(), 1);
    assert.equal(analyzer.getPolarizationEllipse().type, 'circular-right');
});
