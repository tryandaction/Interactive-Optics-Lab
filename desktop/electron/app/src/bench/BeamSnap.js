function asPoint(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return { x: value.x, y: value.y };
}

function getPathPoints(path) {
    if (Array.isArray(path)) return path;
    if (typeof path?.getPathPoints === 'function') return path.getPathPoints();
    return Array.isArray(path?.points) ? path.points : [];
}

export function closestPointOnSegment(point, start, end) {
    const target = asPoint(point);
    const a = asPoint(start);
    const b = asPoint(end);
    if (!target || !a || !b) return null;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= Number.EPSILON) return null;

    const projection = ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, projection));
    const projected = { x: a.x + t * dx, y: a.y + t * dy };
    return {
        point: projected,
        t,
        distance: Math.hypot(target.x - projected.x, target.y - projected.y),
        angleDeg: Math.atan2(dy, dx) * 180 / Math.PI
    };
}

export function findNearestBeamSegment(point, paths, threshold = 12) {
    if (!Array.isArray(paths) || !Number.isFinite(threshold) || threshold < 0) return null;

    let nearest = null;
    paths.forEach((path, pathIndex) => {
        const points = getPathPoints(path);
        for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex++) {
            const candidate = closestPointOnSegment(point, points[segmentIndex], points[segmentIndex + 1]);
            if (!candidate || candidate.distance > threshold) continue;
            if (!nearest || candidate.distance < nearest.distance) {
                nearest = { ...candidate, pathIndex, segmentIndex, path };
            }
        }
    });
    return nearest;
}
