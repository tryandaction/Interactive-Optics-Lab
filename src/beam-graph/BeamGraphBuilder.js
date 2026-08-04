import { BeamGraph } from './BeamGraph.js';
import { ComponentPortRegistry } from './ComponentPortRegistry.js';

const SPEED_OF_LIGHT = 299792458;

function typeOf(component) {
    return component?.type || component?.constructor?.name || 'UnknownComponent';
}

function serializePolarization(trace) {
    if (trace.polarization) return structuredClone(trace.polarization);
    if (trace.polarizationAngle === 'circular' || trace.polarizationAngle === 'elliptical') {
        return { kind: trace.polarizationAngle };
    }
    if (Number.isFinite(trace.polarizationAngle)) {
        return { kind: 'linear', angleDeg: trace.polarizationAngle * 180 / Math.PI };
    }
    if (trace.jones) return { kind: 'jones', value: structuredClone(trace.jones) };
    return { kind: 'unpolarized' };
}

function pointsOf(trace) {
    const points = Array.isArray(trace.points)
        ? trace.points
        : typeof trace.getPathPoints === 'function' ? trace.getPathPoints() : trace.history;
    return (Array.isArray(points) ? points : [])
        .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
        .map(point => ({ x: point.x, y: point.y }));
}

function makeTerminationNode(graph, trace) {
    const id = `termination:${trace.traceId}`;
    if (!graph.nodes.some(node => node.id === id)) {
        graph.addNode({
            id,
            type: 'termination',
            name: trace.endReason || 'terminated',
            reason: trace.endReason || 'terminated',
            ports: [{ id: 'input', kind: 'input', role: 'input' }]
        });
    }
    return id;
}

export class BeamGraphBuilder {
    static fromTraceRecords(components = [], traces = []) {
        const graph = BeamGraph.fromComponents(components);
        const componentsById = new Map(components.map(component => [component.id, component]));

        traces.forEach((trace, index) => {
            const traceId = trace.traceId || `trace-${index + 1}`;
            const normalizedTrace = { ...trace, traceId };
            const originComponentId = trace.originComponentId || trace.sourceId;
            const originComponent = componentsById.get(originComponentId);
            if (!originComponent) return;

            const outputPort = ComponentPortRegistry.resolveOutputPort(typeOf(originComponent), trace);
            if (!outputPort) return;

            let targetComponentId = trace.hitComponentId;
            let inputPortId;
            if (targetComponentId && componentsById.has(targetComponentId)) {
                inputPortId = ComponentPortRegistry.resolveInputPort(typeOf(componentsById.get(targetComponentId)))?.id;
            } else {
                targetComponentId = makeTerminationNode(graph, normalizedTrace);
                inputPortId = 'input';
            }

            const wavelengthNm = Number.isFinite(trace.wavelengthNm) ? trace.wavelengthNm : 550;
            const frequencyOffsetHz = Number.isFinite(trace.frequencyOffsetHz) ? trace.frequencyOffsetHz : 0;
            graph.addEdge({
                id: `beam:${traceId}`,
                traceId,
                parentTraceId: trace.parentTraceId || null,
                sourceId: trace.sourceId || originComponentId,
                from: { componentId: originComponentId, portId: outputPort.id },
                to: { componentId: targetComponentId, portId: inputPortId },
                branchKind: trace.branchKind || outputPort.role,
                wavelengthNm,
                frequencyOffsetHz,
                opticalFrequencyHz: SPEED_OF_LIGHT / (wavelengthNm * 1e-9) + frequencyOffsetHz,
                polarization: serializePolarization(trace),
                intensity: Number.isFinite(trace.intensity) ? trace.intensity : 1,
                direction: trace.direction || 'forward',
                roundTrip: trace.roundTrip === true || trace.direction === 'return',
                auxiliary: trace.auxiliary === true,
                style: trace.style || (trace.auxiliary ? 'dashed' : 'solid'),
                points: pointsOf(trace),
                endReason: trace.endReason || null
            });
        });

        return graph;
    }
}
