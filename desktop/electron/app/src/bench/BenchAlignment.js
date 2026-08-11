function cloneItems(items) {
    return items.map(item => ({ ...item }));
}

export function alignPlacements(items, direction) {
    if (!Array.isArray(items) || items.length < 2) return cloneItems(items || []);
    const result = cloneItems(items);
    const xs = result.map(item => item.x);
    const ys = result.map(item => item.y);

    switch (direction) {
        case 'left': result.forEach(item => { item.x = Math.min(...xs); }); break;
        case 'right': result.forEach(item => { item.x = Math.max(...xs); }); break;
        case 'top': result.forEach(item => { item.y = Math.min(...ys); }); break;
        case 'bottom': result.forEach(item => { item.y = Math.max(...ys); }); break;
        case 'center-horizontal':
        case 'centerX': {
            const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
            result.forEach(item => { item.x = centerX; });
            break;
        }
        case 'center-vertical':
        case 'centerY': {
            const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
            result.forEach(item => { item.y = centerY; });
            break;
        }
        default: throw new Error(`Unsupported alignment direction: ${direction}`);
    }
    return result;
}

export function distributePlacements(items, direction) {
    if (!Array.isArray(items) || items.length < 3) return cloneItems(items || []);
    const result = cloneItems(items);
    const axis = direction === 'horizontal' ? 'x' : direction === 'vertical' ? 'y' : null;
    if (!axis) throw new Error(`Unsupported distribution direction: ${direction}`);

    const sorted = [...result].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0][axis];
    const last = sorted[sorted.length - 1][axis];
    const step = (last - first) / (sorted.length - 1);
    sorted.forEach((item, index) => { item[axis] = first + step * index; });
    return result;
}
