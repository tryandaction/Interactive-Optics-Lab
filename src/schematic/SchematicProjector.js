import { cloneOpticsDocument } from '../document/index.js';

const COLUMN_GAP = 240;
const ROW_GAP = 150;
const ORIGIN = Object.freeze({ x: 180, y: 220 });

function componentId(endpoint) {
    return endpoint?.componentId || endpoint?.nodeId || endpoint?.id || null;
}

function calculateDepths(componentIds, edges) {
    const ids = new Set(componentIds);
    const incoming = new Map(componentIds.map(id => [id, 0]));
    const outgoing = new Map(componentIds.map(id => [id, []]));

    for (const edge of edges) {
        const from = componentId(edge.from);
        const to = componentId(edge.to);
        if (!ids.has(from) || !ids.has(to) || from === to) continue;
        outgoing.get(from).push(to);
        incoming.set(to, incoming.get(to) + 1);
    }

    const depths = new Map(componentIds.map(id => [id, 0]));
    const queue = componentIds.filter(id => incoming.get(id) === 0);
    const remaining = new Map(incoming);
    for (let index = 0; index < queue.length; index += 1) {
        const from = queue[index];
        for (const to of outgoing.get(from)) {
            depths.set(to, Math.max(depths.get(to), depths.get(from) + 1));
            remaining.set(to, remaining.get(to) - 1);
            if (remaining.get(to) === 0) queue.push(to);
        }
    }

    // Cyclic paths (for example round trips) retain a deterministic column.
    for (const id of componentIds) {
        if (remaining.get(id) > 0) {
            const predecessors = edges
                .filter(edge => componentId(edge.to) === id)
                .map(edge => componentId(edge.from))
                .filter(predecessor => predecessor !== id && depths.has(predecessor));
            if (predecessors.length) {
                depths.set(id, Math.max(...predecessors.map(predecessor => depths.get(predecessor) + 1)));
            }
        }
    }
    return depths;
}

function createPlacement(column, row, page) {
    const margin = Number(page?.margin) || 48;
    const originX = Math.max(ORIGIN.x, margin + 72);
    const originY = Math.max(120, margin + 72);
    return {
        x: originX + column * COLUMN_GAP,
        y: originY + row * ROW_GAP,
        angleDeg: 0,
        labelOffset: { x: 0, y: 48 }
    };
}

function projectPaths(existingPaths, edges, validIds) {
    const existingById = new Map(existingPaths.map(path => [path.id, path]));
    const projected = [];

    for (const edge of edges) {
        const fromId = componentId(edge.from);
        const toId = componentId(edge.to);
        if (!validIds.has(fromId) || !validIds.has(toId)) continue;
        const current = existingById.get(edge.id);
        projected.push({
            id: edge.id,
            from: { ...edge.from, componentId: fromId },
            to: { ...edge.to, componentId: toId },
            style: edge.style || edge.pathStyle || 'solid',
            roundTrip: edge.roundTrip === true,
            wavelengthNm: edge.wavelengthNm ?? null,
            polarization: edge.polarization ?? null,
            frequencyOffsetHz: edge.frequencyOffsetHz ?? 0,
            ...(current || {})
        });
    }

    for (const path of existingPaths) {
        if (projected.some(item => item.id === path.id)) continue;
        if (path.manual === true || path.locked === true) projected.push({ ...path });
    }
    return projected;
}

export class SchematicProjector {
    static project(sourceDocument) {
        const document = cloneOpticsDocument(sourceDocument);
        const view = document.views.schematic;
        const componentIds = document.components.map(component => component.id);
        const validIds = new Set(componentIds);
        const graphEdges = document.beamGraph.edges || [];
        const depths = calculateDepths(componentIds, graphEdges);
        const rowsByColumn = new Map();
        const page = view.page;
        const maximumY = page.height - page.margin - 48;
        const maximumRows = Math.max(1, Math.floor((maximumY - Math.max(120, page.margin + 72)) / ROW_GAP) + 1);

        for (const id of componentIds) {
            if (view.placements[id]) continue;
            const depth = depths.get(id) || 0;
            let column = depth;
            while ((rowsByColumn.get(column) || 0) >= maximumRows) column += 1;
            const row = rowsByColumn.get(column) || 0;
            view.placements[id] = createPlacement(column, row, page);
            rowsByColumn.set(column, row + 1);
        }

        for (const id of Object.keys(view.placements)) {
            if (!validIds.has(id)) delete view.placements[id];
        }
        view.paths = projectPaths(view.paths, graphEdges, validIds);
        view.projection.initialized = true;
        view.projection.lockedComponentIds = view.projection.lockedComponentIds
            .filter(id => validIds.has(id));
        return document;
    }
}
