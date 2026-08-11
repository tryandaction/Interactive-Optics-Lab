/**
 * SceneToDiagramAdapter.js
 *
 * Normalizes OpticsLab simulation scenes into a diagram object model.
 * The adapter keeps simulation physics separate from professional drawing/export
 * concerns, while still producing a shape that ExportEngine can consume.
 */

import { getComponentReliability } from '../components/ComponentReliability.js';

export const DIAGRAM_OBJECT_TYPES = Object.freeze({
    PAGE_FRAME: 'page_frame',
    SYMBOL: 'symbol',
    RAY_PATH: 'ray_path',
    CONNECTOR: 'connector',
    LABEL: 'label',
    ANNOTATION: 'annotation',
    GROUP: 'group'
});

const DEFAULT_PAGE = Object.freeze({
    width: 1920,
    height: 1080,
    margin: 48,
    background: '#ffffff'
});

const DEFAULT_RAY_STYLE = Object.freeze({
    stroke: '#f43f5e',
    strokeWidth: 2,
    lineCap: 'round',
    lineJoin: 'round'
});

const DEFAULT_SYMBOL_STYLE = Object.freeze({
    stroke: '#111827',
    fill: 'none',
    strokeWidth: 2
});

const SERIALIZABLE_PROPERTY_TYPES = new Set(['string', 'number', 'boolean']);

export class SceneToDiagramAdapter {
    constructor(options = {}) {
        this.options = {
            includePageFrame: options.includePageFrame ?? true,
            page: { ...DEFAULT_PAGE, ...(options.page || {}) },
            defaultRayStyle: { ...DEFAULT_RAY_STYLE, ...(options.defaultRayStyle || {}) },
            defaultSymbolStyle: { ...DEFAULT_SYMBOL_STYLE, ...(options.defaultSymbolStyle || {}) }
        };
    }

    convert(sceneOrComponents = {}, options = {}) {
        const scene = this._normalizeScene(sceneOrComponents);
        const page = { ...this.options.page, ...(options.page || {}) };
        const includePageFrame = options.includePageFrame ?? this.options.includePageFrame;

        const componentObjects = scene.components
            .map((component, index) => this._componentToSymbol(component, index))
            .filter(Boolean);
        const rayObjects = scene.rays
            .map((ray, index) => this._rayToPath(ray, index))
            .filter(Boolean);
        const annotationObjects = scene.annotations
            .map((annotation, index) => this._annotationToObject(annotation, index))
            .filter(Boolean);
        const linkObjects = scene.diagramLinks
            .map((link, index) => this._linkToConnector(link, index))
            .filter(Boolean);

        const objects = [
            ...(includePageFrame ? [this._createPageFrame(page)] : []),
            ...componentObjects,
            ...rayObjects,
            ...linkObjects,
            ...annotationObjects
        ];

        return {
            version: '1.0.0',
            kind: 'OpticsLabDiagram',
            name: scene.name || 'Untitled OpticsLab diagram',
            page,
            objects,
            source: {
                componentCount: scene.components.length,
                rayCount: scene.rays.length,
                annotationCount: scene.annotations.length,
                diagramLinkCount: scene.diagramLinks.length
            },
            metadata: {
                adapter: 'SceneToDiagramAdapter',
                createdAt: new Date().toISOString()
            }
        };
    }

    toExportScene(diagramOrScene = {}) {
        const diagram = this._isDiagram(diagramOrScene)
            ? diagramOrScene
            : this.convert(diagramOrScene);
        const objects = Array.isArray(diagram.objects) ? diagram.objects : [];

        return {
            name: diagram.name,
            page: diagram.page,
            components: objects
                .filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.SYMBOL)
                .map(object => this._symbolToExportComponent(object)),
            rays: objects
                .filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.RAY_PATH)
                .map(object => this._pathToExportRay(object)),
            diagramLinks: objects
                .filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.CONNECTOR)
                .map(object => ({ ...object })),
            annotations: objects
                .filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.ANNOTATION)
                .map(object => this._annotationToExportAnnotation(object)),
            professionalLabels: objects
                .filter(object => object.objectType === DIAGRAM_OBJECT_TYPES.LABEL)
                .map(object => this._annotationToExportAnnotation(object)),
            notes: diagram.notes || []
        };
    }

    serialize(diagram) {
        if (!this._isDiagram(diagram)) {
            throw new TypeError('SceneToDiagramAdapter.serialize expects an OpticsLabDiagram object.');
        }
        return JSON.stringify(diagram, null, 2);
    }

    deserialize(jsonOrObject) {
        const diagram = typeof jsonOrObject === 'string'
            ? JSON.parse(jsonOrObject)
            : jsonOrObject;

        if (!this._isDiagram(diagram)) {
            throw new TypeError('Invalid OpticsLabDiagram payload.');
        }

        return {
            ...diagram,
            page: { ...DEFAULT_PAGE, ...(diagram.page || {}) },
            objects: Array.isArray(diagram.objects) ? diagram.objects : []
        };
    }

    _normalizeScene(sceneOrComponents) {
        if (Array.isArray(sceneOrComponents)) {
            return {
                name: 'Untitled OpticsLab diagram',
                components: sceneOrComponents,
                rays: [],
                annotations: [],
                diagramLinks: []
            };
        }

        const scene = sceneOrComponents || {};
        return {
            name: scene.name || scene.title || 'Untitled OpticsLab diagram',
            components: this._asArray(scene.components || scene.objects),
            rays: this._asArray(scene.rays || scene.currentRayPaths || scene.rayPaths),
            annotations: this._asArray(scene.annotations || scene.labels),
            diagramLinks: this._asArray(scene.diagramLinks || scene.links || scene.connectors),
            notes: this._asArray(scene.notes)
        };
    }

    _componentToSymbol(component, index) {
        if (!component) return null;

        const type = this._readComponentType(component);
        const position = this._readPosition(component);
        const angle = this._readAngleRad(component);
        const reliability = getComponentReliability(type);

        return {
            id: this._stableObjectId('symbol', component.id, index),
            objectType: DIAGRAM_OBJECT_TYPES.SYMBOL,
            type,
            position,
            pos: { ...position },
            x: position.x,
            y: position.y,
            angle,
            angleRad: angle,
            label: this._readLabel(component, type),
            size: this._readSize(component),
            reliability: {
                level: reliability.level,
                scope: reliability.scope,
                limitations: reliability.limitations
            },
            sourceComponentId: component.id ?? null,
            style: { ...this.options.defaultSymbolStyle },
            data: {
                properties: this._extractSerializableProperties(component)
            }
        };
    }

    _rayToPath(ray, index) {
        const points = this._readRayPoints(ray);
        if (points.length < 2) return null;

        return {
            id: this._stableObjectId('ray', ray?.id, index),
            objectType: DIAGRAM_OBJECT_TYPES.RAY_PATH,
            points,
            pathPoints: points.map(point => ({ ...point })),
            color: ray?.color || ray?._rayColor || this.options.defaultRayStyle.stroke,
            intensity: this._finiteNumber(ray?.intensity, 1),
            wavelength: this._finiteNumber(ray?.wavelength, ray?.wavelengthNm),
            sourceComponentId: ray?.sourceId || ray?.sourceComponentId || null,
            style: {
                ...this.options.defaultRayStyle,
                stroke: ray?.color || ray?._rayColor || this.options.defaultRayStyle.stroke,
                strokeWidth: this._finiteNumber(ray?.strokeWidth, this.options.defaultRayStyle.strokeWidth)
            },
            data: {
                segmentCount: points.length - 1
            }
        };
    }

    _annotationToObject(annotation, index) {
        if (!annotation) return null;

        const position = this._readPosition(annotation);
        const objectType = annotation.objectType === DIAGRAM_OBJECT_TYPES.LABEL
            ? DIAGRAM_OBJECT_TYPES.LABEL
            : DIAGRAM_OBJECT_TYPES.ANNOTATION;

        return {
            id: this._stableObjectId(objectType, annotation.id, index),
            objectType,
            text: String(annotation.text || annotation.label || annotation.content || ''),
            position,
            pos: { ...position },
            x: position.x,
            y: position.y,
            style: {
                fill: annotation.fill || annotation.color || '#111827',
                fontSize: this._finiteNumber(annotation.fontSize, 14),
                fontFamily: annotation.fontFamily || 'Arial, sans-serif'
            },
            sourceAnnotationId: annotation.id ?? null
        };
    }

    _linkToConnector(link, index) {
        if (!link) return null;

        return {
            id: this._stableObjectId('connector', link.id, index),
            objectType: DIAGRAM_OBJECT_TYPES.CONNECTOR,
            from: link.from || link.source || link.sourceId || null,
            to: link.to || link.target || link.targetId || null,
            points: this._asArray(link.points).map(point => this._normalizePoint(point)).filter(Boolean),
            style: {
                stroke: link.stroke || link.color || '#64748b',
                strokeWidth: this._finiteNumber(link.strokeWidth, 1.5)
            }
        };
    }

    _createPageFrame(page) {
        return {
            id: 'page-frame',
            objectType: DIAGRAM_OBJECT_TYPES.PAGE_FRAME,
            position: { x: 0, y: 0 },
            size: { width: page.width, height: page.height },
            margin: page.margin,
            style: {
                fill: page.background,
                stroke: '#e5e7eb',
                strokeWidth: 1
            },
            locked: true
        };
    }

    _symbolToExportComponent(object) {
        const position = this._readPosition(object);
        return {
            id: object.sourceComponentId || object.id,
            type: object.type,
            label: object.label,
            pos: { ...position },
            x: position.x,
            y: position.y,
            angle: object.angle,
            angleRad: object.angleRad ?? object.angle,
            width: object.size?.width,
            height: object.size?.height,
            radius: object.size?.radius,
            reliability: object.reliability,
            style: { ...(object.style || {}) },
            properties: { ...(object.data?.properties || {}) }
        };
    }

    _pathToExportRay(object) {
        return {
            id: object.id,
            points: object.points.map(point => ({ ...point })),
            pathPoints: object.points.map(point => ({ ...point })),
            color: object.color || object.style?.stroke,
            intensity: object.intensity,
            wavelength: object.wavelength,
            style: { ...(object.style || {}) }
        };
    }

    _annotationToExportAnnotation(object) {
        const position = this._readPosition(object);
        return {
            id: object.sourceAnnotationId || object.id,
            text: object.text,
            position,
            pos: { ...position },
            x: position.x,
            y: position.y,
            style: { ...(object.style || {}) }
        };
    }

    _readRayPoints(ray) {
        const candidateCollections = [
            ray?.pathPoints,
            ray?.points,
            ray?.history,
            ray?.segments
        ];

        for (const collection of candidateCollections) {
            const points = this._asArray(collection)
                .map(item => this._normalizePoint(item?.point || item?.position || item?.pos || item))
                .filter(Boolean);
            if (points.length >= 2) return points;
        }

        const origin = this._normalizePoint(ray?.origin || ray?.start || ray?.pos);
        const end = this._normalizePoint(ray?.end || ray?.endPoint || ray?.target);
        return origin && end ? [origin, end] : [];
    }

    _readPosition(value) {
        return this._normalizePoint(value?.position || value?.pos || value) || { x: 0, y: 0 };
    }

    _normalizePoint(value) {
        if (!value) return null;
        const x = this._finiteNumber(value.x, NaN);
        const y = this._finiteNumber(value.y, NaN);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
    }

    _readAngleRad(component) {
        if (Number.isFinite(component?.angleRad)) return component.angleRad;
        if (Number.isFinite(component?.angle)) return component.angle;
        if (Number.isFinite(component?.rotation)) return component.rotation;
        if (Number.isFinite(component?.angleDeg)) return component.angleDeg * Math.PI / 180;
        return 0;
    }

    _readComponentType(component) {
        return String(component?.type || component?.componentType || component?.constructor?.name || 'UnknownComponent');
    }

    _readLabel(component, type) {
        return String(component?.label || component?.name || component?.displayName || type);
    }

    _readSize(component) {
        const width = this._finiteNumber(component?.width ?? component?.length ?? component?.diameter, 40);
        const height = this._finiteNumber(component?.height ?? component?.thickness ?? component?.diameter, 40);
        const radius = this._finiteNumber(component?.radius, Math.max(width, height) / 2);

        return { width, height, radius };
    }

    _extractSerializableProperties(component) {
        const ignored = new Set([
            'id',
            'type',
            'componentType',
            'constructor',
            'pos',
            'position',
            'x',
            'y',
            'angle',
            'angleRad',
            'angleDeg',
            'label',
            'name',
            'displayName',
            'style'
        ]);
        const properties = {};

        Object.entries(component || {}).forEach(([key, value]) => {
            if (ignored.has(key) || key.startsWith('_')) return;

            if (SERIALIZABLE_PROPERTY_TYPES.has(typeof value)) {
                properties[key] = value;
                return;
            }

            if (Array.isArray(value) && value.every(item => SERIALIZABLE_PROPERTY_TYPES.has(typeof item))) {
                properties[key] = [...value];
            }
        });

        return properties;
    }

    _stableObjectId(prefix, sourceId, index) {
        const raw = sourceId == null || sourceId === ''
            ? `${prefix}-${index + 1}`
            : `${prefix}-${sourceId}`;
        return String(raw).replace(/[^a-zA-Z0-9_-]/g, '-');
    }

    _isDiagram(value) {
        return value?.kind === 'OpticsLabDiagram' && Array.isArray(value.objects);
    }

    _asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    _finiteNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
}

export function createSceneToDiagramAdapter(options) {
    return new SceneToDiagramAdapter(options);
}
