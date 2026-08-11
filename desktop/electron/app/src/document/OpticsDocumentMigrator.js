import {
    OPTICS_DOCUMENT_SCHEMA_VERSION,
    normalizeOpticsDocument
} from './OpticsDocument.js';

const LEGACY_VERSIONS = new Set(['1.0', '1.1', '2.0.0']);
const COMPONENT_RESERVED_KEYS = new Set([
    'type', 'componentType', 'id', 'label', 'name',
    'pos', 'position', 'posX', 'posY', 'x', 'y',
    'angle', 'angleRad', 'angleDeg', 'rotation',
    'properties', 'ports', '_raw', 'notes'
]);

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function finiteNumber(...values) {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number)) return number;
    }
    return 0;
}

function readPosition(component) {
    const raw = asObject(component._raw);
    const position = asObject(component.position || component.pos || raw.position || raw.pos);
    return {
        x: finiteNumber(component.posX, component.x, raw.posX, raw.x, position.x),
        y: finiteNumber(component.posY, component.y, raw.posY, raw.y, position.y),
        angleDeg: Number.isFinite(Number(component.angleDeg ?? raw.angleDeg))
            ? Number(component.angleDeg ?? raw.angleDeg)
            : finiteNumber(component.angle, raw.angle) * (component.angleRad == null && raw.angleRad == null ? 1 : 180 / Math.PI)
    };
}

function extractProperties(component) {
    const raw = asObject(component._raw);
    const result = {};
    const copyValues = source => {
        Object.entries(source).forEach(([key, value]) => {
            if (COMPONENT_RESERVED_KEYS.has(key) || value === undefined) return;
            result[key] = value;
        });
    };

    copyValues(raw);
    copyValues(component);
    Object.assign(result, asObject(component.properties));
    return result;
}

function migrateComponent(component, index) {
    const raw = asObject(component._raw);
    const type = String(component.type || raw.type || component.componentType || 'UnknownComponent');
    const id = String(component.id || raw.id || `component-${index + 1}`);
    return {
        record: {
            id,
            type,
            name: String(component.label || raw.label || component.name || raw.name || type),
            properties: extractProperties(component),
            ports: [...asArray(component.ports || raw.ports)]
        },
        placement: readPosition(component)
    };
}

function migrateSettings(settings, currentMode) {
    const source = asObject(settings);
    return {
        showGrid: source.showGrid ?? true,
        maxRays: finiteNumber(source.maxRays, source.maxRaysPerSource, 100),
        maxBounces: finiteNumber(source.maxBounces, source.globalMaxBounces, 50),
        minIntensity: finiteNumber(source.minIntensity, source.globalMinIntensity, 0.001),
        fastWhiteLightMode: source.fastWhiteLightMode === true,
        showArrows: source.showArrows ?? source.globalShowArrows ?? false,
        onlyShowSelectedSourceArrow: source.onlyShowSelectedSourceArrow === true,
        arrowSpeed: finiteNumber(source.arrowSpeed, source.arrowAnimationSpeed, 100),
        legacyMode: currentMode || source.mode || 'ray_trace'
    };
}

function migrateDiagram(diagram) {
    const source = asObject(diagram);
    const objects = asArray(source.objects);
    const placements = {};
    const paths = [];
    const lockedComponentIds = [];
    const annotations = [];

    objects.forEach(object => {
        if (object?.objectType === 'symbol') {
            const componentId = object.sourceComponentId || String(object.id || '').replace(/^symbol-/, '');
            if (!componentId) return;
            const position = asObject(object.position || object.pos || object);
            placements[componentId] = {
                x: finiteNumber(position.x, object.x),
                y: finiteNumber(position.y, object.y),
                angleDeg: Number.isFinite(Number(object.angleDeg))
                    ? Number(object.angleDeg)
                    : finiteNumber(object.angleRad, object.angle) * 180 / Math.PI,
                labelOffset: asObject(object.labelOffset)
            };
            lockedComponentIds.push(componentId);
            return;
        }

        if (object?.objectType === 'ray_path' || object?.objectType === 'connector') {
            paths.push({ ...object });
            return;
        }

        if (object?.objectType === 'annotation' || object?.objectType === 'label') {
            annotations.push({
                id: object.id || `annotation-${annotations.length + 1}`,
                view: 'schematic',
                kind: object.objectType,
                text: String(object.text || object.label || ''),
                anchor: object.anchor || null,
                position: { ...asObject(object.position || object.pos) },
                style: { ...asObject(object.style) }
            });
        }
    });

    return {
        page: { ...asObject(source.page) },
        placements,
        paths,
        lockedComponentIds: [...new Set(lockedComponentIds)],
        annotations,
        initialized: objects.length > 0
    };
}

function migrateLegacyScene(input, sourceVersion, options) {
    const components = [];
    const benchPlacements = {};
    asArray(input.components).forEach((component, index) => {
        const migrated = migrateComponent(component, index);
        components.push(migrated.record);
        benchPlacements[migrated.record.id] = migrated.placement;
    });

    const currentMode = input.currentMode || input.settings?.mode || 'ray_trace';
    const legacyView = asObject(input.view);
    const diagram = migrateDiagram(input.diagram);
    const legacyAnnotations = asArray(input.annotations).map((annotation, index) => ({
        id: annotation.id || `annotation-${index + 1}`,
        view: annotation.view || 'bench',
        kind: annotation.kind || 'annotation',
        text: String(annotation.text || annotation.label || ''),
        anchor: annotation.anchor || null,
        position: { ...asObject(annotation.position || annotation.pos) },
        style: { ...asObject(annotation.style) }
    }));

    return normalizeOpticsDocument({
        metadata: {
            id: input.metadata?.id,
            title: input.name || input.metadata?.title || '未命名光学实验',
            createdAt: input.metadata?.createdAt,
            updatedAt: input.metadata?.updatedAt,
            activeWorkspace: 'bench',
            sourceVersion,
            revision: 0
        },
        components,
        beamGraph: input.beamGraph,
        views: {
            bench: {
                camera: {
                    scale: finiteNumber(legacyView.cameraScale, 1),
                    offsetX: finiteNumber(legacyView.cameraOffsetX, 0),
                    offsetY: finiteNumber(legacyView.cameraOffsetY, 0)
                },
                placements: benchPlacements,
                settings: migrateSettings(input.settings, currentMode),
                analysis: {
                    lensImaging: { enabled: currentMode === 'lens_imaging' }
                }
            },
            schematic: {
                page: diagram.page,
                placements: diagram.placements,
                paths: diagram.paths,
                projection: {
                    initialized: diagram.initialized,
                    lockedComponentIds: diagram.lockedComponentIds
                }
            }
        },
        annotations: [...legacyAnnotations, ...diagram.annotations]
    }, options);
}

export class OpticsDocumentMigrator {
    static migrate(value, options = {}) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new TypeError('OpticsDocument payload must be an object.');
        }

        const version = value.schemaVersion || value.version || '1.0';
        if (version === OPTICS_DOCUMENT_SCHEMA_VERSION) {
            return normalizeOpticsDocument(value, options);
        }
        if (!LEGACY_VERSIONS.has(version)) {
            throw new Error(`Unsupported OpticsDocument schema version: ${version}`);
        }
        return migrateLegacyScene(value, version, options);
    }
}

export function migrateOpticsDocument(value, options) {
    return OpticsDocumentMigrator.migrate(value, options);
}
