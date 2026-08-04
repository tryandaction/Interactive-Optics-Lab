import { alignPlacements, distributePlacements } from '../bench/BenchAlignment.js';
import { cloneOpticsDocument } from '../document/index.js';

function createGroupId(groups) {
    let index = groups.length + 1;
    while (groups.some(group => group.id === `group-${index}`)) index += 1;
    return `group-${index}`;
}

function createAnnotationId(annotations) {
    let index = annotations.length + 1;
    while (annotations.some(annotation => annotation.id === `annotation-${index}`)) index += 1;
    return `annotation-${index}`;
}

export class SchematicEditorModel {
    constructor(document, options = {}) {
        this.document = cloneOpticsDocument(document);
        this.gridSize = Number(options.gridSize) || 20;
        this.selectedIds = new Set();
        this.selectedPathIds = new Set();
        this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    }

    getDocument() {
        return cloneOpticsDocument(this.document);
    }

    setDocument(document) {
        this.document = cloneOpticsDocument(document);
        this.selectedIds = new Set([...this.selectedIds].filter(id => this.document.views.schematic.placements[id]));
        this.selectedPathIds = new Set([...this.selectedPathIds].filter(id =>
            this.document.views.schematic.paths.some(path => path.id === id)
        ));
    }

    select(ids, options = {}) {
        const next = options.additive ? new Set(this.selectedIds) : new Set();
        for (const id of Array.isArray(ids) ? ids : [ids]) {
            if (this.document.views.schematic.placements[id]) next.add(id);
        }
        this.selectedIds = next;
        this.selectedPathIds.clear();
        return [...next];
    }

    selectPath(ids, options = {}) {
        const next = options.additive ? new Set(this.selectedPathIds) : new Set();
        for (const id of Array.isArray(ids) ? ids : [ids]) {
            if (this.document.views.schematic.paths.some(path => path.id === id)) next.add(id);
        }
        this.selectedPathIds = next;
        this.selectedIds.clear();
        return [...next];
    }

    clearSelection() {
        this.selectedIds.clear();
        this.selectedPathIds.clear();
    }

    lockSelection() {
        const projection = this.document.views.schematic.projection;
        projection.lockedComponentIds = [...new Set([...projection.lockedComponentIds, ...this.selectedIds])];
    }

    commit(reason) {
        this.lockSelection();
        this.onChange(this.getDocument(), reason);
    }

    moveSelection(dx, dy, options = {}) {
        const placements = this.document.views.schematic.placements;
        for (const id of this.selectedIds) {
            const placement = placements[id];
            if (!placement) continue;
            const x = placement.x + dx;
            const y = placement.y + dy;
            placement.x = options.snap ? Math.round(x / this.gridSize) * this.gridSize : x;
            placement.y = options.snap ? Math.round(y / this.gridSize) * this.gridSize : y;
        }
        this.commit('move');
    }

    alignSelection(direction) {
        const placements = this.document.views.schematic.placements;
        const items = [...this.selectedIds].map(id => ({ id, ...placements[id] })).filter(item => Number.isFinite(item.x));
        for (const aligned of alignPlacements(items, direction)) {
            placements[aligned.id] = { ...placements[aligned.id], x: aligned.x, y: aligned.y };
        }
        this.commit('align');
    }

    distributeSelection(direction) {
        const placements = this.document.views.schematic.placements;
        const items = [...this.selectedIds].map(id => ({ id, ...placements[id] })).filter(item => Number.isFinite(item.x));
        for (const distributed of distributePlacements(items, direction)) {
            placements[distributed.id] = { ...placements[distributed.id], x: distributed.x, y: distributed.y };
        }
        this.commit('distribute');
    }

    groupSelection(name = 'Group') {
        if (!this.selectedIds.size) return null;
        const groups = this.document.views.schematic.groups;
        const id = createGroupId(groups);
        groups.push({ id, name, componentIds: [...this.selectedIds] });
        this.commit('group');
        return id;
    }

    ungroup(groupId) {
        const groups = this.document.views.schematic.groups;
        this.document.views.schematic.groups = groups.filter(group => group.id !== groupId);
        this.commit('ungroup');
    }

    setPathStyle(pathId, style, options = {}) {
        const path = this.document.views.schematic.paths.find(item => item.id === pathId);
        if (!path) return false;
        path.style = style;
        if ('roundTrip' in options) path.roundTrip = options.roundTrip === true;
        path.locked = true;
        this.onChange(this.getDocument(), 'path-style');
        return true;
    }

    setSelectedPathStyle(style, options = {}) {
        let changed = false;
        for (const path of this.document.views.schematic.paths) {
            if (!this.selectedPathIds.has(path.id)) continue;
            path.style = style;
            if ('roundTrip' in options) path.roundTrip = options.roundTrip === true;
            path.locked = true;
            changed = true;
        }
        if (changed) this.onChange(this.getDocument(), 'path-style');
        return changed;
    }

    changeSelectionLayer(delta) {
        if (!this.selectedIds.size) return false;
        for (const id of this.selectedIds) {
            const placement = this.document.views.schematic.placements[id];
            placement.zIndex = (Number(placement.zIndex) || 0) + Number(delta || 0);
        }
        this.commit('layer');
        return true;
    }

    setLabelOffset(componentId, x, y) {
        const placement = this.document.views.schematic.placements[componentId];
        if (!placement) return false;
        placement.labelOffset = { x: Number(x) || 0, y: Number(y) || 0 };
        this.selectedIds = new Set([componentId]);
        this.commit('label');
        return true;
    }

    renameComponent(componentId, name) {
        const component = this.document.components.find(item => item.id === componentId);
        const nextName = String(name ?? '').trim();
        if (!component || !nextName) return false;
        component.name = nextName;
        this.onChange(this.getDocument(), 'rename');
        return true;
    }

    addAnnotation(text, position = {}) {
        const value = String(text ?? '').trim();
        if (!value) return null;
        const page = this.document.views.schematic.page;
        const id = createAnnotationId(this.document.annotations);
        this.document.annotations.push({
            id,
            view: 'schematic',
            kind: 'annotation',
            text: value,
            anchor: null,
            position: {
                x: Number.isFinite(Number(position.x)) ? Number(position.x) : page.width / 2,
                y: Number.isFinite(Number(position.y)) ? Number(position.y) : page.height / 2
            },
            style: {}
        });
        this.onChange(this.getDocument(), 'annotation-add');
        return id;
    }

    deleteSelection() {
        const removedIds = new Set(this.selectedIds);
        if (!removedIds.size) return false;
        const referencesRemoved = endpoint => removedIds.has(endpoint?.componentId || endpoint);
        const bench = this.document.views.bench;
        const schematic = this.document.views.schematic;

        this.document.components = this.document.components.filter(component => !removedIds.has(component.id));
        for (const id of removedIds) {
            delete bench.placements[id];
            delete schematic.placements[id];
        }
        this.document.beamGraph.nodes = this.document.beamGraph.nodes.filter(node =>
            !removedIds.has(node.id) && !removedIds.has(node.componentId)
        );
        this.document.beamGraph.edges = this.document.beamGraph.edges.filter(edge =>
            !referencesRemoved(edge.from) && !referencesRemoved(edge.to)
        );
        schematic.paths = schematic.paths.filter(path =>
            !referencesRemoved(path.from) && !referencesRemoved(path.to)
        );
        schematic.groups = schematic.groups
            .map(group => ({ ...group, componentIds: group.componentIds.filter(id => !removedIds.has(id)) }))
            .filter(group => group.componentIds.length);
        schematic.projection.lockedComponentIds = schematic.projection.lockedComponentIds
            .filter(id => !removedIds.has(id));
        this.document.annotations = this.document.annotations.filter(annotation =>
            !removedIds.has(annotation.anchor?.componentId)
        );
        this.selectedIds.clear();
        this.onChange(this.getDocument(), 'delete');
        return true;
    }
}
