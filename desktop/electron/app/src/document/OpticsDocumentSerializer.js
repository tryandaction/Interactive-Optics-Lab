import { isOpticsDocument, normalizeOpticsDocument } from './OpticsDocument.js';
import { OpticsDocumentMigrator } from './OpticsDocumentMigrator.js';

export class OpticsDocumentSerializer {
    static serialize(document, options = {}) {
        const normalized = normalizeOpticsDocument(document);
        const validation = this.validate(normalized);
        if (!validation.valid) {
            throw new TypeError(`Invalid OpticsDocument: ${validation.errors.join('; ')}`);
        }
        return JSON.stringify(normalized, null, options.space ?? 2);
    }

    static deserialize(jsonOrObject, options = {}) {
        let value = jsonOrObject;
        if (typeof jsonOrObject === 'string') {
            try {
                value = JSON.parse(jsonOrObject);
            } catch (error) {
                throw new SyntaxError(`Invalid OpticsDocument JSON: ${error.message}`);
            }
        }

        const document = OpticsDocumentMigrator.migrate(value, options);
        const validation = this.validate(document);
        if (!validation.valid) {
            throw new TypeError(`Invalid OpticsDocument: ${validation.errors.join('; ')}`);
        }
        return document;
    }

    static validate(document) {
        const errors = [];
        if (!isOpticsDocument(document)) {
            errors.push('payload does not satisfy the OpticsDocument v3 shape');
            return { valid: false, errors };
        }

        const ids = new Set();
        document.components.forEach((component, index) => {
            if (!component?.id || !component?.type) {
                errors.push(`component ${index} requires id and type`);
                return;
            }
            if (ids.has(component.id)) {
                errors.push(`duplicate component id: ${component.id}`);
            }
            ids.add(component.id);
        });
        return { valid: errors.length === 0, errors };
    }
}

export function serializeOpticsDocument(document, options) {
    return OpticsDocumentSerializer.serialize(document, options);
}

export function deserializeOpticsDocument(value, options) {
    return OpticsDocumentSerializer.deserialize(value, options);
}
