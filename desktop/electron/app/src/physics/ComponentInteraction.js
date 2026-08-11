import { Vector } from '../core/Vector.js';

function toVector(value, fallback = new Vector(0, 0)) {
    if (value instanceof Vector) return value.clone();
    const x = Number(value?.x);
    const y = Number(value?.y);
    return Number.isFinite(x) && Number.isFinite(y) ? new Vector(x, y) : fallback.clone();
}

function rotate(vector, angleRad) {
    const cosine = Math.cos(angleRad);
    const sine = Math.sin(angleRad);
    return new Vector(
        vector.x * cosine - vector.y * sine,
        vector.x * sine + vector.y * cosine
    );
}

function normalized(vector) {
    const lengthSquared = vector.magnitudeSquared();
    if (lengthSquared < 1e-12) throw new Error('A surface normal or ray direction must be non-zero.');
    return vector.multiply(1 / Math.sqrt(lengthSquared));
}

function finiteNumber(value, fallback = null) {
    return Number.isFinite(value) ? value : fallback;
}

export function createComponentPose({ position, axisAngleRad = 0 } = {}) {
    return Object.freeze({
        position: toVector(position),
        axisAngleRad: finiteNumber(axisAngleRad, 0)
    });
}

export function rayToLocalSpace(ray, pose) {
    const origin = toVector(ray?.origin).subtract(pose.position);
    return {
        ...ray,
        origin: rotate(origin, -pose.axisAngleRad),
        direction: rotate(normalized(toVector(ray?.direction)), -pose.axisAngleRad)
    };
}

export function rayToWorldSpace(ray, pose) {
    return {
        ...ray,
        origin: rotate(toVector(ray?.origin), pose.axisAngleRad).add(pose.position),
        direction: rotate(normalized(toVector(ray?.direction)), pose.axisAngleRad)
    };
}

export function resolveSurfaceNormal(localNormal, pose) {
    return normalized(rotate(toVector(localNormal), pose.axisAngleRad));
}

export function intersectComponent(component, worldRay, pose) {
    if (!component) return [];

    if (typeof component.intersectLocal === 'function') {
        return component.intersectLocal(rayToLocalSpace(worldRay, pose))
            .map(hit => ({
                ...hit,
                localPoint: toVector(hit.point),
                point: rayToWorldSpace({ origin: hit.point, direction: new Vector(1, 0) }, pose).origin,
                localNormal: toVector(hit.normal),
                normal: resolveSurfaceNormal(hit.normal, pose)
            }));
    }

    if (typeof component.intersect !== 'function') return [];
    return component.intersect(worldRay.origin, worldRay.direction).map(hit => ({
        ...hit,
        point: toVector(hit.point),
        normal: normalized(toVector(hit.normal)),
        localPoint: rayToLocalSpace({ origin: hit.point, direction: new Vector(1, 0) }, pose).origin,
        localNormal: rayToLocalSpace({ origin: new Vector(0, 0), direction: hit.normal }, pose).direction
    }));
}

export function interactWithComponent(component, ray, hit, RayClass) {
    if (!component || typeof component.interact !== 'function') return terminateBeam(ray, 'no_interaction_logic');
    return component.interact(ray, hit, RayClass);
}

export function propagatePolarization(rayState, polarization) {
    return { ...rayState, polarization };
}

export function propagateWavelength(rayState, wavelengthNm) {
    return { ...rayState, wavelengthNm: finiteNumber(wavelengthNm, rayState?.wavelengthNm ?? null) };
}

export function propagateFrequency(rayState, frequencyHz, frequencyShiftHz = 0) {
    return {
        ...rayState,
        frequencyHz: finiteNumber(frequencyHz, rayState?.frequencyHz ?? null),
        frequencyShiftHz: finiteNumber(frequencyShiftHz, 0)
    };
}

export function splitBeam(rayState, branches) {
    return (Array.isArray(branches) ? branches : []).map((branch, index) => ({
        ...rayState,
        ...branch,
        branchIndex: index,
        pathKind: branch.pathKind || rayState?.pathKind || 'output'
    }));
}

export function terminateBeam(rayState, terminationReason) {
    return {
        ...rayState,
        terminated: true,
        terminationReason: terminationReason || 'unknown'
    };
}

export function buildInteractionMetadata({
    sourceRayId = null,
    parentSegmentId = null,
    componentId = null,
    inputPort = null,
    outputPort = null,
    interactionType = null,
    surfaceNormal = null,
    wavelengthNm = null,
    frequencyHz = null,
    frequencyShiftHz = 0,
    polarization = null,
    intensity = null,
    pathKind = 'output',
    terminationReason = null
} = {}) {
    const normal = surfaceNormal ? normalized(toVector(surfaceNormal)) : null;
    return {
        sourceRayId,
        parentSegmentId,
        componentId,
        inputPort,
        outputPort,
        interactionType,
        surfaceNormal: normal ? { x: normal.x, y: normal.y } : null,
        wavelengthNm,
        frequencyHz,
        frequencyShiftHz,
        polarization,
        intensity,
        pathKind,
        terminationReason
    };
}
