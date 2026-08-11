import { cloneOpticsDocument, normalizeOpticsDocument } from './OpticsDocument.js';

function referencesComponent(endpoint, componentId) {
    return endpoint?.componentId === componentId || endpoint === componentId;
}

export class DocumentStore {
    constructor(document, options = {}) {
        this._document = normalizeOpticsDocument(document);
        this._now = options.now || (() => new Date().toISOString());
        this._listeners = new Set();
        this._undoStack = [];
        this._redoStack = [];
        this._historyLimit = options.historyLimit ?? 100;
    }

    getDocument() {
        return cloneOpticsDocument(this._document);
    }

    subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    transact(label, mutator, options = {}) {
        if (typeof mutator !== 'function') {
            throw new TypeError('DocumentStore.transact requires a mutator function.');
        }
        const before = cloneOpticsDocument(this._document);
        const draft = cloneOpticsDocument(this._document);
        mutator(draft);
        draft.metadata.revision = before.metadata.revision + 1;
        draft.metadata.updatedAt = this._now();
        this._document = normalizeOpticsDocument(draft);

        if (options.recordHistory !== false) {
            this._undoStack.push({ label, before, after: cloneOpticsDocument(this._document) });
            if (this._undoStack.length > this._historyLimit) this._undoStack.shift();
            this._redoStack = [];
        }
        this._emit({ type: 'change', label, document: this.getDocument() });
        return this.getDocument();
    }

    replaceDocument(document, label = 'replace document', options = {}) {
        const next = normalizeOpticsDocument(document);
        return this.transact(label, draft => {
            Object.keys(draft).forEach(key => delete draft[key]);
            Object.assign(draft, next);
        }, options);
    }

    updateComponent(componentId, patch, label = 'update component') {
        return this.transact(label, draft => {
            const component = draft.components.find(item => item.id === componentId);
            if (!component) throw new Error(`Component not found: ${componentId}`);
            Object.assign(component, patch);
        });
    }

    addComponent(component, benchPlacement = null, label = 'add component') {
        return this.transact(label, draft => {
            if (!component?.id || !component?.type) {
                throw new TypeError('A component requires stable id and type fields.');
            }
            if (draft.components.some(item => item.id === component.id)) {
                throw new Error(`Duplicate component id: ${component.id}`);
            }
            draft.components.push(cloneOpticsDocument({ components: [component] }).components[0]);
            if (benchPlacement) {
                draft.views.bench.placements[component.id] = { ...benchPlacement };
            }
        });
    }

    removeComponent(componentId, label = 'remove component') {
        return this.transact(label, draft => {
            draft.components = draft.components.filter(component => component.id !== componentId);
            delete draft.views.bench.placements[componentId];
            delete draft.views.schematic.placements[componentId];
            draft.views.schematic.projection.lockedComponentIds =
                draft.views.schematic.projection.lockedComponentIds.filter(id => id !== componentId);
            draft.beamGraph.nodes = draft.beamGraph.nodes.filter(node =>
                node.id !== componentId && node.componentId !== componentId
            );
            draft.beamGraph.edges = draft.beamGraph.edges.filter(edge =>
                !referencesComponent(edge.from, componentId)
                && !referencesComponent(edge.to, componentId)
            );
            draft.annotations = draft.annotations.filter(annotation =>
                annotation.anchor?.componentId !== componentId
            );
            draft.views.schematic.paths = draft.views.schematic.paths.filter(path =>
                !referencesComponent(path.from, componentId)
                && !referencesComponent(path.to, componentId)
                && path.sourceComponentId !== componentId
            );
            draft.views.schematic.groups = draft.views.schematic.groups
                .map(group => ({
                    ...group,
                    componentIds: (group.componentIds || []).filter(id => id !== componentId)
                }))
                .filter(group => group.componentIds.length > 0);
        });
    }

    setPlacement(viewName, componentId, placement, label = `move ${viewName} component`) {
        if (viewName !== 'bench' && viewName !== 'schematic') {
            throw new Error(`Unknown document view: ${viewName}`);
        }
        return this.transact(label, draft => {
            draft.views[viewName].placements[componentId] = { ...placement };
            if (viewName === 'schematic') {
                const locked = new Set(draft.views.schematic.projection.lockedComponentIds);
                locked.add(componentId);
                draft.views.schematic.projection.lockedComponentIds = [...locked];
            }
        });
    }

    setWorkspace(workspace, label = 'switch workspace') {
        if (workspace !== 'bench' && workspace !== 'schematic') {
            throw new Error(`Unknown workspace: ${workspace}`);
        }
        return this.transact(label, draft => {
            draft.metadata.activeWorkspace = workspace;
        }, { recordHistory: false });
    }

    setBeamGraph(beamGraph, label = 'update beam graph') {
        return this.transact(label, draft => {
            draft.beamGraph = {
                nodes: [...(beamGraph?.nodes || [])],
                edges: [...(beamGraph?.edges || [])]
            };
        }, { recordHistory: false });
    }

    canUndo() {
        return this._undoStack.length > 0;
    }

    canRedo() {
        return this._redoStack.length > 0;
    }

    undo() {
        const entry = this._undoStack.pop();
        if (!entry) return false;
        this._redoStack.push(entry);
        this._document = cloneOpticsDocument(entry.before);
        this._emit({ type: 'undo', label: entry.label, document: this.getDocument() });
        return true;
    }

    redo() {
        const entry = this._redoStack.pop();
        if (!entry) return false;
        this._undoStack.push(entry);
        this._document = cloneOpticsDocument(entry.after);
        this._emit({ type: 'redo', label: entry.label, document: this.getDocument() });
        return true;
    }

    _emit(event) {
        this._listeners.forEach(listener => listener(event));
    }
}
