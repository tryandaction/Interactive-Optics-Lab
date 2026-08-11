import { SchematicEditorModel } from './SchematicEditorModel.js';
import { renderSchematicSvg } from './SchematicRenderer.js';

export class SchematicEditor {
    constructor(root, options = {}) {
        if (!root) throw new Error('SchematicEditor requires a root element');
        this.root = root;
        this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
        this.onSelectionChange = typeof options.onSelectionChange === 'function'
            ? options.onSelectionChange
            : () => {};
        this.onPathSelectionChange = typeof options.onPathSelectionChange === 'function'
            ? options.onPathSelectionChange
            : () => {};
        this.model = new SchematicEditorModel(options.document, {
            gridSize: options.gridSize,
            onChange: (document, reason) => {
                this.render();
                if (reason !== 'move') this.onChange(document, reason);
            }
        });
        this.drag = null;
        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        root.addEventListener('pointerdown', this.handlePointerDown);
        root.addEventListener('pointermove', this.handlePointerMove);
        root.addEventListener('pointerup', this.handlePointerUp);
        root.addEventListener('pointercancel', this.handlePointerUp);
        this.render();
    }

    setDocument(document) {
        this.model.setDocument(document);
        this.render();
    }

    getDocument() {
        return this.model.getDocument();
    }

    render() {
        const selected = this.model.selectedIds;
        this.root.innerHTML = renderSchematicSvg(this.model.getDocument(), { interactive: true });
        for (const id of selected) {
            const escapedId = globalThis.CSS?.escape ? CSS.escape(id) : String(id).replaceAll('"', '\\"');
            this.root.querySelector(`[data-component-id="${escapedId}"]`)?.classList.add('is-selected');
        }
        for (const id of this.model.selectedPathIds) {
            const escapedId = globalThis.CSS?.escape ? CSS.escape(id) : String(id).replaceAll('"', '\\"');
            this.root.querySelectorAll(`[data-path-id="${escapedId}"]`).forEach(path => path.classList.add('is-selected'));
        }
    }

    toPagePoint(event) {
        const svg = this.root.querySelector('svg');
        if (!svg) return { x: 0, y: 0 };
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(svg.getScreenCTM().inverse());
    }

    handlePointerDown(event) {
        const component = event.target.closest('[data-component-id]');
        const path = event.target.closest('[data-path-id]');
        if (path && !component) {
            this.model.selectPath(path.dataset.pathId, { additive: event.ctrlKey || event.metaKey || event.shiftKey });
            this.onPathSelectionChange([...this.model.selectedPathIds], this.model.getDocument());
            this.onSelectionChange([], this.model.getDocument());
            this.render();
            return;
        }
        if (!component) {
            this.model.clearSelection();
            this.onSelectionChange([], this.model.getDocument());
            this.onPathSelectionChange([], this.model.getDocument());
            this.render();
            return;
        }
        const id = component.dataset.componentId;
        this.model.select(id, { additive: event.ctrlKey || event.metaKey || event.shiftKey });
        this.onSelectionChange([...this.model.selectedIds], this.model.getDocument());
        this.onPathSelectionChange([], this.model.getDocument());
        const point = this.toPagePoint(event);
        this.drag = { point };
        this.root.setPointerCapture?.(event.pointerId);
        this.render();
    }

    handlePointerMove(event) {
        if (!this.drag) return;
        const point = this.toPagePoint(event);
        const dx = point.x - this.drag.point.x;
        const dy = point.y - this.drag.point.y;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        this.model.moveSelection(dx, dy, { snap: event.shiftKey });
        this.drag.point = point;
    }

    handlePointerUp() {
        if (this.drag) this.onChange(this.model.getDocument(), 'move');
        this.drag = null;
    }

    destroy() {
        this.root.removeEventListener('pointerdown', this.handlePointerDown);
        this.root.removeEventListener('pointermove', this.handlePointerMove);
        this.root.removeEventListener('pointerup', this.handlePointerUp);
        this.root.removeEventListener('pointercancel', this.handlePointerUp);
        this.root.innerHTML = '';
    }
}
