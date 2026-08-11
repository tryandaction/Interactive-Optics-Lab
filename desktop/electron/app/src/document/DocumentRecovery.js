import { OpticsDocumentSerializer } from './OpticsDocumentSerializer.js';

function checksum(text) {
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export class DocumentRecovery {
    constructor(options = {}) {
        this._storage = options.storage || globalThis.localStorage;
        this._serializer = options.serializer || OpticsDocumentSerializer;
        this._key = options.key || 'opticslab_document_recovery_v3';
        this._now = options.now || (() => new Date().toISOString());
    }

    save(document) {
        if (!this._storage) return false;
        const payload = this._serializer.serialize(document);
        this._storage.setItem(this._key, JSON.stringify({
            checksum: checksum(payload),
            savedAt: this._now(),
            payload
        }));
        return true;
    }

    load() {
        if (!this._storage) return null;
        const raw = this._storage.getItem(this._key);
        if (!raw) return null;
        const envelope = JSON.parse(raw);
        if (envelope.checksum && checksum(envelope.payload) !== envelope.checksum) {
            throw new Error('OpticsLab recovery checksum mismatch.');
        }
        return this._serializer.deserialize(envelope.payload);
    }

    hasRecovery() {
        return Boolean(this._storage?.getItem(this._key));
    }

    clear() {
        this._storage?.removeItem(this._key);
    }
}

export { checksum as computeRecoveryChecksum };
