import {
    createOpticsDocument,
    normalizeOpticsDocument
} from './OpticsDocument.js';

const RESERVED_COMPONENT_KEYS = new Set([
    'type', 'id', 'label', 'name', 'notes',
    'pos', 'position', 'posX', 'posY', 'x', 'y',
    'angle', 'angleRad', 'angleDeg', 'rotation', 'ports'
]);

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function serializeRuntimeComponent(component, index, portResolver) {
    const data = typeof component?.toJSON === 'function'
        ? component.toJSON()
        : { ...component };
    const type = String(data.type || component?.constructor?.name || 'UnknownComponent');
    const id = String(data.id || component?.id || `component-${index + 1}`);
    const properties = {};
    Object.entries(data).forEach(([key, value]) => {
        if (RESERVED_COMPONENT_KEYS.has(key) || value === undefined) return;
        properties[key] = value;
    });
    const position = asObject(component?.pos || component?.position);
    const angleDeg = Number.isFinite(Number(data.angleDeg))
        ? Number(data.angleDeg)
        : Number(component?.angleRad || 0) * 180 / Math.PI;

    return {
        record: {
            id,
            type,
            name: String(data.label || component?.label || data.name || type),
            properties,
            ports: [...(portResolver?.(type, component, data) || data.ports || [])]
        },
        placement: {
            x: Number(data.posX ?? data.x ?? position.x ?? 0),
            y: Number(data.posY ?? data.y ?? position.y ?? 0),
            angleDeg
        }
    };
}

export function captureRuntimeDocument(options = {}) {
    const existing = options.existingDocument
        ? normalizeOpticsDocument(options.existingDocument)
        : createOpticsDocument({
            metadata: {
                id: options.metadata?.id,
                title: options.metadata?.title || options.metadata?.name
            }
        });
    const components = [];
    const placements = {};
    const activeIds = new Set();

    (options.components || []).forEach((component, index) => {
        const serialized = serializeRuntimeComponent(component, index, options.portResolver);
        const previous = existing.components.find(item => item.id === serialized.record.id);
        if (serialized.record.ports.length === 0 && previous?.ports?.length) {
            serialized.record.ports = previous.ports.map(port => ({ ...port }));
        }
        components.push(serialized.record);
        placements[serialized.record.id] = serialized.placement;
        activeIds.add(serialized.record.id);
    });

    const schematicPlacements = Object.fromEntries(
        Object.entries(existing.views.schematic.placements)
            .filter(([componentId]) => activeIds.has(componentId))
    );
    const metadata = asObject(options.metadata);
    const camera = asObject(options.camera);
    const currentMode = options.currentMode || options.settings?.mode || 'ray_trace';

    return normalizeOpticsDocument({
        ...existing,
        metadata: {
            ...existing.metadata,
            ...(metadata.id ? { id: metadata.id } : {}),
            title: metadata.title || metadata.name || existing.metadata.title,
            activeWorkspace: existing.metadata.activeWorkspace
        },
        components,
        beamGraph: options.beamGraph || existing.beamGraph,
        views: {
            bench: {
                camera: {
                    scale: Number(camera.scale ?? camera.cameraScale ?? existing.views.bench.camera.scale),
                    offsetX: Number(camera.offsetX ?? camera.cameraOffsetX ?? existing.views.bench.camera.offsetX),
                    offsetY: Number(camera.offsetY ?? camera.cameraOffsetY ?? existing.views.bench.camera.offsetY)
                },
                placements,
                settings: {
                    ...existing.views.bench.settings,
                    ...asObject(options.settings),
                    mode: undefined
                },
                analysis: {
                    ...existing.views.bench.analysis,
                    lensImaging: {
                        ...existing.views.bench.analysis.lensImaging,
                        enabled: currentMode === 'lens_imaging'
                    }
                }
            },
            schematic: {
                ...existing.views.schematic,
                placements: schematicPlacements,
                projection: {
                    ...existing.views.schematic.projection,
                    lockedComponentIds: existing.views.schematic.projection.lockedComponentIds
                        .filter(componentId => activeIds.has(componentId))
                }
            }
        },
        annotations: existing.annotations.filter(annotation =>
            !annotation.anchor?.componentId || activeIds.has(annotation.anchor.componentId)
        )
    });
}

export function documentToLegacySceneData(document) {
    const normalized = normalizeOpticsDocument(document);
    const bench = normalized.views.bench;
    const schematic = normalized.views.schematic;
    const currentMode = bench.analysis.lensImaging.enabled ? 'lens_imaging' : 'ray_trace';
    const components = normalized.components.map(component => {
        const placement = bench.placements[component.id] || { x: 0, y: 0, angleDeg: 0 };
        return {
            type: component.type,
            id: component.id,
            label: component.name,
            posX: placement.x,
            posY: placement.y,
            angleDeg: placement.angleDeg,
            ...component.properties
        };
    });
    const diagramObjects = [
        ...normalized.components
            .filter(component => schematic.placements[component.id])
            .map(component => {
                const placement = schematic.placements[component.id];
                return {
                    id: `symbol-${component.id}`,
                    objectType: 'symbol',
                    sourceComponentId: component.id,
                    type: component.type,
                    label: component.name,
                    position: { x: placement.x, y: placement.y },
                    angleRad: Number(placement.angleDeg || 0) * Math.PI / 180,
                    labelOffset: placement.labelOffset
                };
            }),
        ...schematic.paths.map(path => ({ ...path })),
        ...normalized.annotations
            .filter(annotation => annotation.view === 'schematic')
            .map(annotation => ({
                id: annotation.id,
                objectType: annotation.kind || 'annotation',
                text: annotation.text,
                position: annotation.position,
                style: annotation.style,
                anchor: annotation.anchor
            }))
    ];

    return {
        version: normalized.schemaVersion,
        schemaVersion: normalized.schemaVersion,
        name: normalized.metadata.title,
        currentMode,
        view: {
            cameraScale: bench.camera.scale,
            cameraOffsetX: bench.camera.offsetX,
            cameraOffsetY: bench.camera.offsetY
        },
        settings: { ...bench.settings, mode: currentMode },
        components,
        beamGraph: normalized.beamGraph,
        annotations: normalized.annotations,
        metadata: normalized.metadata,
        diagram: {
            version: '1.0.0',
            kind: 'OpticsLabDiagram',
            name: normalized.metadata.title,
            page: schematic.page,
            objects: diagramObjects
        }
    };
}
