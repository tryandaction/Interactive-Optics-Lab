export function normalizeRayCount(value, fallback) {
    const numericValue = Number(value);
    const normalized = Number.isFinite(numericValue) ? Math.floor(numericValue) : fallback;
    return Math.max(1, normalized);
}
