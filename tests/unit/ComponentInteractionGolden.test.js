import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Vector } from '../../src/core/Vector.js';
import {
    buildInteractionMetadata,
    createComponentPose,
    rayToLocalSpace,
    rayToWorldSpace,
    resolveSurfaceNormal
} from '../../src/physics/ComponentInteraction.js';

function closeTo(actual, expected, tolerance = 1e-9) {
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test('local/world ray transform round-trips a rotated component pose', () => {
    const pose = createComponentPose({
        position: new Vector(100, 50),
        axisAngleRad: Math.PI / 2
    });
    const worldRay = {
        id: 'ray-1',
        origin: new Vector(100, 70),
        direction: new Vector(-1, 0)
    };

    const localRay = rayToLocalSpace(worldRay, pose);
    closeTo(localRay.origin.x, 20);
    closeTo(localRay.origin.y, 0);
    closeTo(localRay.direction.x, 0);
    closeTo(localRay.direction.y, 1);

    const restored = rayToWorldSpace(localRay, pose);
    closeTo(restored.origin.x, worldRay.origin.x);
    closeTo(restored.origin.y, worldRay.origin.y);
    closeTo(restored.direction.x, worldRay.direction.x);
    closeTo(restored.direction.y, worldRay.direction.y);
});

test('surface normals and interaction metadata remain explicit under pose transforms', () => {
    const pose = createComponentPose({
        position: new Vector(0, 0),
        axisAngleRad: Math.PI / 2
    });
    const normal = resolveSurfaceNormal(new Vector(1, 0), pose);
    closeTo(normal.x, 0);
    closeTo(normal.y, 1);

    const metadata = buildInteractionMetadata({
        sourceRayId: 'laser-ray',
        parentSegmentId: 'segment-3',
        componentId: 'lens-1',
        inputPort: 'front',
        outputPort: 'back',
        interactionType: 'transmission',
        surfaceNormal: normal,
        wavelengthNm: 780,
        frequencyHz: 3.84349358974359e14,
        frequencyShiftHz: 0,
        polarization: { kind: 'linear', angleRad: 0 },
        intensity: 0.98,
        pathKind: 'output',
        terminationReason: null
    });

    assert.deepEqual({
        ...metadata,
        surfaceNormal: null
    }, {
        sourceRayId: 'laser-ray',
        parentSegmentId: 'segment-3',
        componentId: 'lens-1',
        inputPort: 'front',
        outputPort: 'back',
        interactionType: 'transmission',
        surfaceNormal: null,
        wavelengthNm: 780,
        frequencyHz: 3.84349358974359e14,
        frequencyShiftHz: 0,
        polarization: { kind: 'linear', angleRad: 0 },
        intensity: 0.98,
        pathKind: 'output',
        terminationReason: null
    });
    closeTo(metadata.surfaceNormal.x, 0);
    closeTo(metadata.surfaceNormal.y, 1);
});
