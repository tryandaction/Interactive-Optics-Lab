/**
 * Compatibility facade for the unified OpticsDocument v3 serializer.
 * New code should import from src/document directly.
 */

import {
    OPTICS_DOCUMENT_SCHEMA_VERSION,
    createOpticsDocument
} from '../document/OpticsDocument.js';
import { OpticsDocumentMigrator } from '../document/OpticsDocumentMigrator.js';
import { OpticsDocumentSerializer } from '../document/OpticsDocumentSerializer.js';
import {
    captureRuntimeDocument,
    documentToLegacySceneData
} from '../document/ComponentDocumentCodec.js';

export class Serializer {
    static CURRENT_VERSION = OPTICS_DOCUMENT_SCHEMA_VERSION;
    static SUPPORTED_VERSIONS = ['1.0', '1.1', '2.0.0', OPTICS_DOCUMENT_SCHEMA_VERSION];

    static serialize(componentsOrDocument, settings = {}, metadata = {}) {
        const document = componentsOrDocument?.schemaVersion
            ? componentsOrDocument
            : captureRuntimeDocument({
                components: Array.isArray(componentsOrDocument) ? componentsOrDocument : [],
                currentMode: settings.mode || settings.currentMode || 'ray_trace',
                settings: this.serializeSettings(settings),
                metadata
            });
        return OpticsDocumentSerializer.serialize(document);
    }

    static deserialize(jsonOrObject) {
        return OpticsDocumentSerializer.deserialize(jsonOrObject);
    }

    static validate(data) {
        try {
            const document = OpticsDocumentMigrator.migrate(data);
            return OpticsDocumentSerializer.validate(document).valid;
        } catch {
            return false;
        }
    }

    static validateWithErrors(data) {
        try {
            return OpticsDocumentSerializer.validate(OpticsDocumentMigrator.migrate(data));
        } catch (error) {
            return { valid: false, errors: [error.message] };
        }
    }

    static needsMigration(data) {
        return data?.schemaVersion !== OPTICS_DOCUMENT_SCHEMA_VERSION;
    }

    static migrate(data) {
        return OpticsDocumentMigrator.migrate(data);
    }

    static captureDocument(options) {
        return captureRuntimeDocument(options);
    }

    static toLegacySceneData(document) {
        return documentToLegacySceneData(document);
    }

    static serializeComponent(component) {
        return documentToLegacySceneData(captureRuntimeDocument({ components: [component] }))
            .components[0] || null;
    }

    static deserializeComponent(component) {
        if (!component) return null;
        if (component.properties && component.id && component.type) {
            return { type: component.type, id: component.id, label: component.name, ...component.properties };
        }
        return { ...component };
    }

    static deserializeComponents(components) {
        return (components || []).map(component => this.deserializeComponent(component)).filter(Boolean);
    }

    static serializeSettings(settings = {}) {
        return {
            showGrid: settings.showGrid ?? true,
            maxRays: settings.maxRays ?? settings.maxRaysPerSource ?? 100,
            maxBounces: settings.maxBounces ?? settings.globalMaxBounces ?? 50,
            minIntensity: settings.minIntensity ?? settings.globalMinIntensity ?? 0.001,
            fastWhiteLightMode: settings.fastWhiteLightMode ?? false,
            showArrows: settings.showArrows ?? settings.globalShowArrows ?? false,
            onlyShowSelectedSourceArrow: settings.onlyShowSelectedSourceArrow ?? false,
            arrowSpeed: settings.arrowSpeed ?? settings.arrowAnimationSpeed ?? 100
        };
    }

    static deserializeSettings(settings = {}) {
        return this.serializeSettings(settings);
    }

    static createEmptyScene(name = '未命名场景') {
        return createOpticsDocument({ metadata: { title: name } });
    }

    static areEquivalent(first, second) {
        try {
            const left = OpticsDocumentSerializer.deserialize(first);
            const right = OpticsDocumentSerializer.deserialize(second);
            const scrub = document => ({
                ...document,
                metadata: {
                    ...document.metadata,
                    updatedAt: null,
                    revision: 0
                }
            });
            return JSON.stringify(scrub(left)) === JSON.stringify(scrub(right));
        } catch {
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.Serializer = Serializer;
}
