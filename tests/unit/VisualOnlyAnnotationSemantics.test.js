import { test } from 'node:test';
import assert from 'node:assert/strict';

import { MagneticCoil } from '../../src/components/atomic/MagneticCoil.js';
import { CustomComponent } from '../../src/components/misc/CustomComponent.js';
import { Ray } from '../../src/core/Ray.js';
import { Vector } from '../../src/core/Vector.js';

const ANNOTATION_COMPONENTS = [
    ['magnetic coil', MagneticCoil],
    ['custom component', CustomComponent]
];

for (const [label, ComponentClass] of ANNOTATION_COMPONENTS) {
    test(`visual-only ${label} does not block or mutate an optical ray`, () => {
        const component = new ComponentClass(new Vector(0, 0));
        const ray = new Ray(new Vector(-100, 0), new Vector(1, 0), 532, 1);

        assert.deepEqual(component.intersect(ray.origin, ray.direction), []);
        assert.deepEqual(component.interact(ray, null, Ray), []);
        assert.equal(ray.terminated, false);
        assert.equal(ray.endReason, null);
        assert.equal(ray.intensity, 1);
        assert.equal(ray.wavelengthNm, 532);
    });
}
