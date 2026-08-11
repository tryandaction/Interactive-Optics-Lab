function clone(value) {
    return typeof structuredClone === 'function'
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
}

export function insertComponentIntoEdge(graph, edgeId, insertion) {
    const next = clone(graph || { nodes: [], edges: [] });
    next.nodes = Array.isArray(next.nodes) ? next.nodes : [];
    next.edges = Array.isArray(next.edges) ? next.edges : [];
    const edgeIndex = next.edges.findIndex(edge => edge.id === edgeId);
    if (edgeIndex < 0) throw new Error(`Beam edge not found: ${edgeId}`);
    if (!insertion?.componentId) throw new Error('componentId is required');

    const original = next.edges[edgeIndex];
    const shared = { ...original };
    delete shared.id;
    delete shared.from;
    delete shared.to;

    const incoming = {
        ...shared,
        id: `${original.id}:in:${insertion.componentId}`,
        from: clone(original.from),
        to: { componentId: insertion.componentId, portId: insertion.inputPortId || 'input' }
    };
    const outgoing = {
        ...shared,
        id: `${original.id}:out:${insertion.componentId}`,
        from: { componentId: insertion.componentId, portId: insertion.outputPortId || 'output' },
        to: clone(original.to)
    };

    next.edges.splice(edgeIndex, 1, incoming, outgoing);
    return next;
}
