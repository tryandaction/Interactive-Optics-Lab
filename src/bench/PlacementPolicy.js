import { findNearestBeamSegment } from './BeamSnap.js';

const SOURCE_TYPES = new Set([
    'LaserSource', 'FanSource', 'LineSource', 'WhiteLightSource',
    'PointSource', 'LEDSource', 'PulsedLaserSource'
]);

const FORTY_FIVE_DEGREE_TYPES = new Set([
    'Mirror', 'SphericalMirror', 'ParabolicMirror', 'ConcaveMirror',
    'ConvexMirror', 'ParabolicMirrorToolbar', 'BeamSplitter'
]);

const AXIS_INLINE_TYPES = new Set([
    'DielectricBlock', 'Prism', 'OpticalFiber', 'AcoustoOpticModulator',
    'ElectroOpticModulator', 'FaradayRotator', 'FaradayIsolator',
    'AtomicCell', 'MagneticCoil', 'FabryPerotCavity', 'WollastonPrism'
]);

export function normalizeAngleDeg(angleDeg) {
    const normalized = angleDeg % 360;
    return normalized < 0 ? normalized + 360 : normalized;
}

export function lockAngleDeg(angleDeg, incrementDeg = 15) {
    if (!Number.isFinite(angleDeg)) return 0;
    if (!Number.isFinite(incrementDeg) || incrementDeg <= 0) return normalizeAngleDeg(angleDeg);
    return normalizeAngleDeg(Math.round(angleDeg / incrementDeg) * incrementDeg);
}

export function getDefaultPlacementAngleDeg(componentType) {
    if (SOURCE_TYPES.has(componentType) || AXIS_INLINE_TYPES.has(componentType)) return 0;
    if (FORTY_FIVE_DEGREE_TYPES.has(componentType)) return 45;
    return 90;
}

export function getBeamAlignedAngleDeg(componentType, beamAngleDeg) {
    if (SOURCE_TYPES.has(componentType) || AXIS_INLINE_TYPES.has(componentType)) {
        return normalizeAngleDeg(beamAngleDeg);
    }
    if (FORTY_FIVE_DEGREE_TYPES.has(componentType)) {
        return normalizeAngleDeg(beamAngleDeg + 45);
    }
    return normalizeAngleDeg(beamAngleDeg + 90);
}

export function createPlacementPreview(componentType, cursor, beamPaths = [], options = {}) {
    const threshold = options.threshold ?? 12;
    const snap = options.snapToBeam === false
        ? null
        : findNearestBeamSegment(cursor, beamPaths, threshold);
    const position = snap ? { ...snap.point } : { x: cursor.x, y: cursor.y };
    let angleDeg = snap
        ? getBeamAlignedAngleDeg(componentType, snap.angleDeg)
        : getDefaultPlacementAngleDeg(componentType);

    if (options.angleLocked) {
        angleDeg = lockAngleDeg(angleDeg, options.angleIncrementDeg ?? 15);
    }

    return {
        componentType,
        position,
        angleDeg,
        snappedToBeam: Boolean(snap),
        beam: snap
            ? { pathIndex: snap.pathIndex, segmentIndex: snap.segmentIndex, t: snap.t, distance: snap.distance }
            : null
    };
}
