import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PowerMeter } from '../../src/components/detectors/PowerMeter.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

function measure(meter, origin, direction, intensity) {
    const ray = new Ray(origin, direction, 532, intensity);
    const [hit] = meter.intersect(ray.origin, ray.direction);
    assert.ok(hit, 'the incoming ray should hit the power-meter sensor');
    assert.ok(ray.direction.dot(hit.normal) < 0, 'the sensor normal should face the incoming ray');
    assert.deepEqual(meter.interact(ray, hit, Ray), []);
    assert.equal(ray.endReason, 'absorbed_power_meter');
}

test('PowerMeter accumulates educational display readings from both directions and reset clears them', () => {
    const meter = new PowerMeter(new Vector(0, 0), 40, 0);

    measure(meter, new Vector(0, -100), new Vector(0, 1), 2);
    measure(meter, new Vector(0, 100), new Vector(0, -1), 1);

    assert.equal(meter.hitCount, 2);
    assert.equal(meter.totalPower, 3);
    assert.equal(meter.peakPower, 2);
    assert.equal(meter.getAveragePower(), 1.5);

    meter.reset();
    assert.equal(meter.hitCount, 0);
    assert.equal(meter.totalPower, 0);
    assert.equal(meter.peakPower, 0);
});
