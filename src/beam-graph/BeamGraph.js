import { ComponentPortRegistry } from './ComponentPortRegistry.js';

function clone(value) {
    return typeof structuredClone === 'function'
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
}

function componentType(component) {
    return component?.type || component?.constructor?.name || 'UnknownComponent';
}

export class BeamGraph {
    constructor(data = {}) {
        this.nodes = clone(Array.isArray(data.nodes) ? data.nodes : []);
        this.edges = clone(Array.isArray(data.edges) ? data.edges : []);
    }

    static fromComponents(components = []) {
        return new BeamGraph({
            nodes: components.map(component => ({
                id: component.id,
                type: componentType(component),
                name: component.name || component.label || componentType(component),
                ports: ComponentPortRegistry.getPorts(component),
                properties: clone(component.properties || {})
            })),
            edges: []
        });
    }

    addNode(node) {
        if (!node?.id) throw new Error('BeamGraph node id is required.');
        if (this.nodes.some(existing => existing.id === node.id)) {
            throw new Error(`Duplicate BeamGraph node: ${node.id}`);
        }
        this.nodes.push(clone(node));
        return this;
    }

    addEdge(edge) {
        if (!edge?.id || !edge.from?.componentId || !edge.to?.componentId) {
            throw new Error('BeamGraph edge endpoints are required.');
        }
        if (this.edges.some(existing => existing.id === edge.id)) {
            throw new Error(`Duplicate BeamGraph edge: ${edge.id}`);
        }
        this._assertPort(edge.from, 'from');
        this._assertPort(edge.to, 'to');
        this.edges.push(clone(edge));
        return this;
    }

    _assertPort(endpoint, side) {
        const node = this.nodes.find(candidate => candidate.id === endpoint.componentId);
        if (!node) throw new Error(`BeamGraph ${side} node not found: ${endpoint.componentId}`);
        const ports = Array.isArray(node.ports) ? node.ports : [];
        if (!ports.some(port => port.id === endpoint.portId)) {
            throw new Error(`BeamGraph ${side} port not found: ${endpoint.componentId}.${endpoint.portId}`);
        }
    }

    getOutgoing(componentId) {
        return this.edges.filter(edge => edge.from.componentId === componentId).map(clone);
    }

    getIncoming(componentId) {
        return this.edges.filter(edge => edge.to.componentId === componentId).map(clone);
    }

    removeEdge(edgeId) {
        this.edges = this.edges.filter(edge => edge.id !== edgeId);
        return this;
    }

    toJSON() {
        return clone({ nodes: this.nodes, edges: this.edges });
    }
}
