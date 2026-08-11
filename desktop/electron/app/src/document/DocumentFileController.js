import { OpticsDocumentSerializer } from './OpticsDocumentSerializer.js';

const FILE_TYPES = [{
    description: 'OpticsLab document',
    accept: { 'application/json': ['.opticslab.json'] }
}];

function slugify(value) {
    return String(value || 'untitled-optics')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'untitled-optics';
}

function fileNameFor(document) {
    return `${slugify(document?.metadata?.title)}.opticslab.json`;
}

export class DocumentFileController {
    constructor(options = {}) {
        this._serializer = options.serializer || OpticsDocumentSerializer;
        this._showSaveFilePicker = options.showSaveFilePicker
            || globalThis.showSaveFilePicker?.bind(globalThis);
        this._showOpenFilePicker = options.showOpenFilePicker
            || globalThis.showOpenFilePicker?.bind(globalThis);
        this._download = options.download || (payload => this._downloadInBrowser(payload));
        this._openFile = options.openFile || (() => this._openWithInput());
        this._handle = options.handle || null;
        this.fileName = options.fileName || null;
    }

    async save(document) {
        if (!this._handle) return this.saveAs(document);
        const text = this._serializer.serialize(document);
        await this._writeHandle(this._handle, text);
        return { mode: 'handle', handle: this._handle, fileName: this.fileName, text };
    }

    async saveAs(document) {
        const text = this._serializer.serialize(document);
        const suggestedName = fileNameFor(document);
        if (this._showSaveFilePicker) {
            const handle = await this._showSaveFilePicker({
                id: 'opticslab-document',
                suggestedName,
                types: FILE_TYPES
            });
            await this._writeHandle(handle, text);
            this._handle = handle;
            this.fileName = handle.name || suggestedName;
            return { mode: 'handle', handle, fileName: this.fileName, text };
        }

        const payload = { fileName: suggestedName, text, mimeType: 'application/json' };
        await this._download(payload);
        this.fileName = suggestedName;
        return { mode: 'download', ...payload };
    }

    async open() {
        let handle = null;
        let file = null;
        if (this._showOpenFilePicker) {
            const handles = await this._showOpenFilePicker({
                id: 'opticslab-document',
                multiple: false,
                types: FILE_TYPES
            });
            handle = handles?.[0] || null;
            file = handle ? await handle.getFile() : null;
        } else {
            file = await this._openFile();
        }
        if (!file) throw new Error('No OpticsLab document selected.');

        const text = await file.text();
        const document = this._serializer.deserialize(text);
        this._handle = handle;
        this.fileName = file.name || handle?.name || null;
        return { document, handle, fileName: this.fileName };
    }

    clearHandle() {
        this._handle = null;
        this.fileName = null;
    }

    async _writeHandle(handle, text) {
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
    }

    _downloadInBrowser(payload) {
        if (typeof document === 'undefined' || typeof URL === 'undefined') {
            throw new Error('Download fallback is unavailable outside a browser.');
        }
        const blob = new Blob([payload.text], { type: payload.mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = payload.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    _openWithInput() {
        if (typeof document === 'undefined') {
            return Promise.reject(new Error('File input fallback is unavailable outside a browser.'));
        }
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.opticslab.json,.json,application/json';
            input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
            input.addEventListener('cancel', () => reject(new DOMException('Open cancelled', 'AbortError')), { once: true });
            input.click();
        });
    }
}

export { fileNameFor as createOpticsDocumentFileName };
