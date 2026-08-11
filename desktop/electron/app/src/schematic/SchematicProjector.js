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

function benchPlacementToSchematicPlacement(placement) {
    const x = Number(placement?.x);
    const y = Number(placement?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const angleDeg = Number(placement?.angleDeg);
    return {
        x,
        y,
        angleDeg: Number.isFinite(angleDeg) ? angleDeg : 0,
        labelOffset: { x: 0, y: 48 }
    };
}

function terminationNodesFromGraph(nodes) {
    return nodes
        .filter(node => node?.type === 'termination' && node.id)
        .map(node => ({ id: node.id, reason: node.reason || node.name || 'terminated' }));
}

function createTerminationPlacement(nodeId, edges, placements, page) {
    const incoming = edges.find(edge => componentId(edge.to) === nodeId);
    const source = placements[componentId(incoming?.from)];
    const margin = Number(page?.margin) || 48;
    if (!source) return createPlacement(0, 0, page);
    return {
        x: Math.min(page.width - margin - 24, Math.max(margin + 24, source.x + COLUMN_GAP / 2)),
        y: Math.min(page.height - margin - 24, Math.max(margin + 24, source.y)),
        angleDeg: 0,
        labelOffset: { x: 0, y: 42 }
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
            ...(current || {}),
            id: edge.id,
            from: { ...edge.from, componentId: fromId },
            to: { ...edge.to, componentId: toId },
            style: current?.style || edge.style || edge.pathStyle || 'solid',
            roundTrip: current?.roundTrip ?? edge.roundTrip === true,
            branchKind: edge.branchKind || null,
            auxiliary: edge.auxiliary === true,
            wavelengthNm: edge.wavelengthNm ?? null,
            polarization: edge.polarization ?? null,
            intensity: edge.intensity ?? null,
            frequencyOffsetHz: edge.frequencyOffsetHz ?? 0,
            interactionType: edge.interactionType || null,
            surfaceId: edge.surfaceId || null,
            surfaceNormal: edge.surfaceNormal ? { ...edge.surfaceNormal } : null,
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
        const benchPlacements = document.views.bench.placements || {};
        const componentIds = document.components.map(component => component.id);
        const graphEdges = document.beamGraph.edges || [];
        const terminationNodes = terminationNodesFromGraph(document.beamGraph.nodes || []);
        const terminationIds = new Set(terminationNodes.map(node => node.id));
        const validIds = new Set([...componentIds, ...terminationIds]);
        const depths = calculateDepths(componentIds, graphEdges);
        const rowsByColumn = new Map();
        const page = view.page;
        const maximumY = page.height - page.margin - 48;
        const maximumRows = Math.max(1, Math.floor((maximumY - Math.max(120, page.margin + 72)) / ROW_GAP) + 1);

        for (const id of componentIds) {
            if (view.placements[id]) continue;
            const benchPlacement = benchPlacementToSchematicPlacement(benchPlacements[id]);
            if (benchPlacement) {
                view.placements[id] = benchPlacement;
                continue;
            }
            const depth = depths.get(id) || 0;
            let column = depth;
            while ((rowsByColumn.get(column) || 0) >= maximumRows) column += 1;
            const row = rowsByColumn.get(column) || 0;
            view.placements[id] = createPlacement(column, row, page);
            rowsByColumn.set(column, row + 1);
        }

        view.terminationNodes = terminationNodes;
        for (const node of terminationNodes) {
            if (!view.placements[node.id]) {
                view.placements[node.id] = createTerminationPlacement(node.id, graphEdges, view.placements, page);
            }
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
