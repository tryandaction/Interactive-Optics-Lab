import { normalizeOpticsDocument } from '../document/index.js';
import { renderSchematicSvg } from './SchematicRenderer.js';

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';

function dataUrlToBlob(dataUrl) {
    const [header, encoded] = dataUrl.split(',');
    const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new Blob([bytes], { type: mimeType });
}

function safeFilename(title, extension) {
    const stem = String(title || 'optical-setup')
        .trim()
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'optical-setup';
    return `${stem}.${extension}`;
}

export class SchematicExporter {
    static toSvg(sourceDocument, options = {}) {
        const svg = renderSchematicSvg(sourceDocument, options);
        return options.includeXmlDeclaration === false ? svg : `${XML_HEADER}${svg}`;
    }

    static toSvgBlob(sourceDocument, options = {}) {
        return new Blob([this.toSvg(sourceDocument, options)], { type: 'image/svg+xml;charset=utf-8' });
    }

    static async toPngDataUrl(sourceDocument, options = {}) {
        const documentData = normalizeOpticsDocument(sourceDocument);
        const page = documentData.views.schematic.page;
        const scale = Math.max(1, Number(options.scale) || 2);
        const documentRef = options.documentRef || globalThis.document;
        const ImageConstructor = options.ImageConstructor || globalThis.Image;
        const urlApi = options.urlApi || globalThis.URL;
        if (!documentRef || !ImageConstructor || !urlApi) {
            throw new Error('PNG export requires browser canvas and image APIs.');
        }

        const canvas = documentRef.createElement('canvas');
        canvas.width = page.width * scale;
        canvas.height = page.height * scale;
        const context = canvas.getContext('2d');
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.fillStyle = page.background;
        context.fillRect(0, 0, page.width, page.height);

        const source = urlApi.createObjectURL(this.toSvgBlob(documentData));
        try {
            const image = new ImageConstructor();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Unable to rasterize schematic SVG.'));
                image.src = source;
            });
            context.drawImage(image, 0, 0, page.width, page.height);
            return canvas.toDataURL('image/png');
        } finally {
            urlApi.revokeObjectURL(source);
        }
    }

    static async toPngBlob(sourceDocument, options = {}) {
        return dataUrlToBlob(await this.toPngDataUrl(sourceDocument, options));
    }

    static pdfFromPngDataUrl(sourceDocument, pngDataUrl, options = {}) {
        const documentData = normalizeOpticsDocument(sourceDocument);
        const page = documentData.views.schematic.page;
        const PdfConstructor = options.PdfConstructor || globalThis.jspdf?.jsPDF;
        if (!PdfConstructor) throw new Error('PDF export requires jsPDF.');
        const pdf = new PdfConstructor({
            orientation: 'landscape',
            unit: 'px',
            format: [page.width, page.height],
            compress: true,
            hotfixes: ['px_scaling']
        });
        pdf.addImage(pngDataUrl, 'PNG', 0, 0, page.width, page.height, undefined, 'FAST');
        return pdf.output('blob');
    }

    static async toPdfBlob(sourceDocument, options = {}) {
        const png = await this.toPngDataUrl(sourceDocument, options);
        return this.pdfFromPngDataUrl(sourceDocument, png, options);
    }

    static async download(sourceDocument, format, options = {}) {
        const documentData = normalizeOpticsDocument(sourceDocument);
        const normalizedFormat = String(format).toLowerCase();
        let blob;
        if (normalizedFormat === 'svg') blob = this.toSvgBlob(documentData, options);
        else if (normalizedFormat === 'png') blob = await this.toPngBlob(documentData, options);
        else if (normalizedFormat === 'pdf') blob = await this.toPdfBlob(documentData, options);
        else throw new Error(`Unsupported schematic export format: ${format}`);

        const documentRef = options.documentRef || globalThis.document;
        const urlApi = options.urlApi || globalThis.URL;
        const anchor = documentRef.createElement('a');
        const url = urlApi.createObjectURL(blob);
        anchor.href = url;
        anchor.download = options.filename || safeFilename(documentData.metadata.title, normalizedFormat);
        documentRef.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => urlApi.revokeObjectURL(url), 0);
        return { blob, filename: anchor.download };
    }
}

export { safeFilename as createSchematicFilename };
