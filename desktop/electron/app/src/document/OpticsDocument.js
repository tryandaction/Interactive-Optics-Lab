export const OPTICS_DOCUMENT_SCHEMA_VERSION = '3.0.0';

const DEFAULT_PAGE = Object.freeze({
    width: 1600,
    height: 900,
    margin: 48,
    background: '#ffffff'
});

const DEFAULT_CAMERA = Object.freeze({
    scale: 1,
    offsetX: 0,
    offsetY: 0
});

function deepClone(value) {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function createDocumentId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeBenchView(value) {
    const view = asObject(value);
    const analysis = asObject(view.analysis);
    return {
        camera: { ...DEFAULT_CAMERA, ...asObject(view.camera) },
        placements: deepClone(asObject(view.placements)),
        settings: deepClone(asObject(view.settings)),
        analysis: {
            ...deepClone(analysis),
            lensImaging: {
                enabled: false,
                ...deepClone(asObject(analysis.lensImaging))
            }
        }
    };
}

function normalizeSchematicView(value) {
    const view = asObject(value);
    const projection = asObject(view.projection);
    return {
        page: { ...DEFAULT_PAGE, ...asObject(view.page) },
        camera: { ...DEFAULT_CAMERA, ...asObject(view.camera) },
        placements: deepClone(asObject(view.placements)),
        paths: deepClone(asArray(view.paths)),
        terminationNodes: deepClone(asArray(view.terminationNodes)),
        groups: deepClone(asArray(view.groups)),
        layers: deepClone(asArray(view.layers)),
        projection: {
            initialized: projection.initialized === true,
            lockedComponentIds: [...asArray(projection.lockedComponentIds)]
        }
    };
}

export function normalizeOpticsDocument(value = {}, options = {}) {
    const input = asObject(value);
    const metadata = asObject(input.metadata);
    const now = options.now || new Date().toISOString();
    const activeWorkspace = metadata.activeWorkspace === 'schematic' ? 'schematic' : 'bench';
    const beamGraph = asObject(input.beamGraph);
    const views = asObject(input.views);

    return {
        schemaVersion: OPTICS_DOCUMENT_SCHEMA_VERSION,
        metadata: {
            id: metadata.id || options.id || createDocumentId(),
            title: metadata.title || input.name || '未命名光学实验',
            createdAt: metadata.createdAt || now,
            updatedAt: metadata.updatedAt || now,
            activeWorkspace,
            sourceVersion: metadata.sourceVersion ?? null,
            revision: Number.isInteger(metadata.revision) && metadata.revision >= 0
                ? metadata.revision
                : 0
        },
        components: deepClone(asArray(input.components)),
        beamGraph: {
            nodes: deepClone(asArray(beamGraph.nodes)),
            edges: deepClone(asArray(beamGraph.edges))
        },
        views: {
            bench: normalizeBenchView(views.bench),
            schematic: normalizeSchematicView(views.schematic)
        },
        annotations: deepClone(asArray(input.annotations))
    };
}

export function createOpticsDocument(initial = {}, options = {}) {
    return normalizeOpticsDocument(initial, options);
}

export function cloneOpticsDocument(document) {
    return deepClone(normalizeOpticsDocument(document));
}

export function isOpticsDocument(value) {
    return value?.schemaVersion === OPTICS_DOCUMENT_SCHEMA_VERSION
        && Array.isArray(value.components)
        && value.views?.bench
        && value.views?.schematic
        && Array.isArray(value.annotations);
}
