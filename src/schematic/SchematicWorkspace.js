import { SchematicEditor } from './SchematicEditor.js';
import { SchematicProjector } from './SchematicProjector.js';

const WORKSPACES = Object.freeze({ BENCH: 'bench', SCHEMATIC: 'schematic' });

function button(workspace, label, icon) {
    return `<button type="button" class="workspace-tab" data-workspace="${workspace}" role="tab" aria-selected="false">
        <span class="workspace-tab-icon" aria-hidden="true">${icon}</span><span>${label}</span>
    </button>`;
}

const BENCH_ICON = '<svg viewBox="0 0 24 24"><path d="M3 12h18M8 7l-5 5 5 5"/><circle cx="17" cy="12" r="3"/></svg>';
const SCHEMATIC_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 12h4l2-4 2 8 2-4h2"/></svg>';

export class SchematicWorkspace {
    constructor(options = {}) {
        this.switcher = options.switcher;
        this.benchElement = options.benchElement;
        this.root = options.root;
        this.page = this.root?.querySelector('[data-schematic-page]');
        this.getDocument = options.getDocument;
        this.onDocumentChange = options.onDocumentChange || (() => {});
        this.onWorkspaceChange = options.onWorkspaceChange || (() => {});
        this.onExport = options.onExport || (() => {});
        this.editor = null;
        this.workspace = WORKSPACES.BENCH;
        this.handleClick = this.handleClick.bind(this);
        this.handleToolbar = this.handleToolbar.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.renderSwitcher();
        this.switcher?.addEventListener('click', this.handleClick);
        this.root?.addEventListener('click', this.handleToolbar);
        this.root?.addEventListener('change', this.handleChange);
        document.addEventListener('keydown', this.handleKeyDown, true);
        document.body.dataset.workspace = WORKSPACES.BENCH;
    }

    renderSwitcher() {
        if (!this.switcher) return;
        this.switcher.innerHTML = `<div class="workspace-switcher" role="tablist" aria-label="工作区">
            ${button(WORKSPACES.BENCH, '实验台', BENCH_ICON)}
            ${button(WORKSPACES.SCHEMATIC, '光路图', SCHEMATIC_ICON)}
        </div>`;
        this.updateSwitcher();
    }

    updateSwitcher() {
        this.switcher?.querySelectorAll('[data-workspace]').forEach(item => {
            const active = item.dataset.workspace === this.workspace;
            item.classList.toggle('active', active);
            item.setAttribute('aria-selected', String(active));
        });
    }

    handleClick(event) {
        const item = event.target.closest('[data-workspace]');
        if (item) this.switchWorkspace(item.dataset.workspace);
    }

    handleToolbar(event) {
        const action = event.target.closest('[data-schematic-action]')?.dataset.schematicAction;
        const exportFormat = event.target.closest('[data-schematic-export]')?.dataset.schematicExport;
        if (exportFormat && this.editor) {
            this.onExport(exportFormat, this.editor.getDocument());
            return;
        }
        if (!action || !this.editor) return;
        const model = this.editor.model;
        const actions = {
            'align-x': () => model.alignSelection('centerX'),
            'align-y': () => model.alignSelection('centerY'),
            'distribute-x': () => model.distributeSelection('horizontal'),
            'distribute-y': () => model.distributeSelection('vertical'),
            group: () => model.groupSelection('Optical group'),
            'add-annotation': () => {
                const input = this.root.querySelector('[data-annotation-text]');
                if (model.addAnnotation(input?.value)) input.value = '';
            },
            delete: () => model.deleteSelection(),
            'path-solid': () => model.setSelectedPathStyle('solid'),
            'path-dashed': () => model.setSelectedPathStyle('dashed'),
            'path-round-trip': () => {
                const selected = model.document.views.schematic.paths.find(path => model.selectedPathIds.has(path.id));
                model.setSelectedPathStyle(selected?.style || 'solid', { roundTrip: !selected?.roundTrip });
            },
            forward: () => model.changeSelectionLayer(1),
            backward: () => model.changeSelectionLayer(-1)
        };
        actions[action]?.();
    }

    handleChange(event) {
        if (!event.target.matches('[data-schematic-name], [data-label-axis]') || !this.editor) return;
        const [selectedId] = this.editor.model.selectedIds;
        if (event.target.matches('[data-schematic-name]')) {
            if (selectedId) this.editor.model.renameComponent(selectedId, event.target.value);
            return;
        }
        if (event.target.matches('[data-label-axis]') && selectedId) {
            const xInput = this.root.querySelector('[data-label-axis="x"]');
            const yInput = this.root.querySelector('[data-label-axis="y"]');
            this.editor.model.setLabelOffset(selectedId, xInput.value, yInput.value);
        }
    }

    handleKeyDown(event) {
        if (this.workspace !== WORKSPACES.SCHEMATIC || !this.editor) return;
        if ((event.key === 'Delete' || event.key === 'Backspace') && !event.target.matches('input, textarea')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.editor.model.deleteSelection();
        }
    }

    updateSelectionControls(selectedIds, document) {
        const input = this.root?.querySelector('[data-schematic-name]');
        if (!input) return;
        const component = selectedIds.length === 1
            ? document.components.find(item => item.id === selectedIds[0])
            : null;
        input.disabled = !component;
        input.value = component?.name || '';
        const placement = component ? document.views.schematic.placements[component.id] : null;
        for (const axis of ['x', 'y']) {
            const offsetInput = this.root?.querySelector(`[data-label-axis="${axis}"]`);
            if (!offsetInput) continue;
            offsetInput.disabled = !component;
            offsetInput.value = placement?.labelOffset?.[axis] ?? (axis === 'x' ? 0 : 48);
        }
    }

    updatePathControls(selectedIds) {
        this.root?.querySelectorAll('[data-path-control]').forEach(control => {
            control.disabled = selectedIds.length === 0;
        });
    }

    switchWorkspace(workspace) {
        if (workspace !== WORKSPACES.BENCH && workspace !== WORKSPACES.SCHEMATIC) return false;
        if (workspace === WORKSPACES.SCHEMATIC) {
            const projected = SchematicProjector.project(this.getDocument());
            projected.metadata.activeWorkspace = WORKSPACES.SCHEMATIC;
            if (!this.editor) {
                this.editor = new SchematicEditor(this.page, {
                    document: projected,
                    onChange: (document, reason) => this.onDocumentChange(document, reason),
                    onSelectionChange: (ids, document) => this.updateSelectionControls(ids, document),
                    onPathSelectionChange: ids => this.updatePathControls(ids)
                });
            } else {
                this.editor.setDocument(projected);
            }
            this.onDocumentChange(projected, 'project schematic');
        }
        this.workspace = workspace;
        this.benchElement?.toggleAttribute('hidden', workspace !== WORKSPACES.BENCH);
        this.root?.toggleAttribute('hidden', workspace !== WORKSPACES.SCHEMATIC);
        document.body.dataset.workspace = workspace;
        this.updateSwitcher();
        this.onWorkspaceChange(workspace);
        return true;
    }

    refresh(document) {
        if (this.workspace !== WORKSPACES.SCHEMATIC || !this.editor) return;
        this.editor.setDocument(SchematicProjector.project(document));
    }

    destroy() {
        this.switcher?.removeEventListener('click', this.handleClick);
        this.root?.removeEventListener('click', this.handleToolbar);
        this.root?.removeEventListener('change', this.handleChange);
        document.removeEventListener('keydown', this.handleKeyDown, true);
        this.editor?.destroy();
    }
}

export { WORKSPACES };
