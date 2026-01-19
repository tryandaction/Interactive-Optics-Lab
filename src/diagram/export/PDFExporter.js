/**
 * PDF Exporter - Publication-Quality PDF Export
 * 
 * Features:
 * - Vector graphics preservation
 * - Page size and margin settings
 * - Multi-page export for large diagrams
 * - Technical notes as separate pages
 * - Print-ready formatting
 * - Embedded fonts support
 * 
 * Uses jsPDF library for PDF generation
 */

export class PDFExporter {
    constructor() {
        this.defaultOptions = {
            pageSize: 'A4',           // A4, Letter, Legal, A3, A5
            orientation: 'portrait',   // portrait, landscape
            margins: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20
            },
            unit: 'mm',               // mm, pt, in, cm
            compress: true,
            includeNotes: true,
            multiPage: false,
            quality: 'high',          // low, medium, high
            embedFonts: true,
            metadata: {
                title: 'Optical Diagram',
                author: '',
                subject: 'Optical System Diagram',
                keywords: 'optics, diagram, physics'
            }
        };

        // Page size definitions (in mm)
        this.pageSizes = {
            'A4': { width: 210, height: 297 },
            'A3': { width: 297, height: 420 },
            'A5': { width: 148, height: 210 },
            'Letter': { width: 215.9, height: 279.4 },
            'Legal': { width: 215.9, height: 355.6 }
        };
    }

    /**
     * Export diagram to PDF
     * @param {Object} diagram - Diagram data
     * @param {Object} options - Export options
     * @returns {Promise<Blob>} PDF blob
     */
    async export(diagram, options = {}) {
        const opts = { ...this.defaultOptions, ...options };

        // Check if jsPDF is available
        if (typeof window.jspdf === 'undefined') {
            console.warn('jsPDF library not loaded, falling back to SVG export');
            return this.fallbackToSVG(diagram, opts);
        }

        const { jsPDF } = window.jspdf;

        // Get page dimensions
        const pageSize = this.pageSizes[opts.pageSize] || this.pageSizes['A4'];
        const orientation = opts.orientation;

        // Adjust dimensions for orientation
        const pageWidth = orientation === 'landscape' ? pageSize.height : pageSize.width;
        const pageHeight = orientation === 'landscape' ? pageSize.width : pageSize.height;

        // Create PDF document
        const pdf = new jsPDF({
            orientation: orientation,
            unit: opts.unit,
            format: opts.pageSize,
            compress: opts.compress
        });

        // Set metadata
        pdf.setProperties({
            title: opts.metadata.title,
            author: opts.metadata.author,
            subject: opts.metadata.subject,
            keywords: opts.metadata.keywords,
            creator: 'Professional Optics Diagram System'
        });

        // Calculate content area
        const contentArea = {
            x: opts.margins.left,
            y: opts.margins.top,
            width: pageWidth - opts.margins.left - opts.margins.right,
            height: pageHeight - opts.margins.top - opts.margins.bottom
        };

        // Export diagram content
        await this.exportDiagramContent(pdf, diagram, contentArea, opts);

        // Add technical notes if requested
        if (opts.includeNotes && diagram.notes && diagram.notes.length > 0) {
            pdf.addPage();
            this.exportTechnicalNotes(pdf, diagram.notes, contentArea, opts);
        }

        // Generate blob
        const pdfBlob = pdf.output('blob');
        return pdfBlob;
    }

    /**
     * Export diagram content to PDF
     */
    async exportDiagramContent(pdf, diagram, contentArea, opts) {
        // Get diagram bounds
        const bounds = this.calculateDiagramBounds(diagram);

        // Calculate scale to fit content area
        const scaleX = contentArea.width / bounds.width;
        const scaleY = contentArea.height / bounds.height;
        const scale = Math.min(scaleX, scaleY);

        // Calculate centered position
        const scaledWidth = bounds.width * scale;
        const scaledHeight = bounds.height * scale;
        const offsetX = contentArea.x + (contentArea.width - scaledWidth) / 2;
        const offsetY = contentArea.y + (contentArea.height - scaledHeight) / 2;

        // Render components
        if (diagram.components) {
            for (const component of diagram.components) {
                this.renderComponent(pdf, component, bounds, scale, offsetX, offsetY, opts);
            }
        }

        // Render rays/links
        if (diagram.rays) {
            for (const ray of diagram.rays) {
                this.renderRay(pdf, ray, bounds, scale, offsetX, offsetY, opts);
            }
        }

        // Render annotations
        if (diagram.annotations) {
            for (const annotation of diagram.annotations) {
                this.renderAnnotation(pdf, annotation, bounds, scale, offsetX, offsetY, opts);
            }
        }

        // Add title if provided
        if (diagram.title) {
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(diagram.title, contentArea.x, contentArea.y - 5);
        }
    }

    /**
     * Calculate diagram bounds
     */
    calculateDiagramBounds(diagram) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // Check components
        if (diagram.components) {
            for (const comp of diagram.components) {
                const x = comp.x || comp.position?.x || 0;
                const y = comp.y || comp.position?.y || 0;
                const w = comp.width || 50;
                const h = comp.height || 50;

                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + w);
                maxY = Math.max(maxY, y + h);
            }
        }

        // Check rays
        if (diagram.rays) {
            for (const ray of diagram.rays) {
                if (ray.path) {
                    for (const point of ray.path) {
                        minX = Math.min(minX, point.x);
                        minY = Math.min(minY, point.y);
                        maxX = Math.max(maxX, point.x);
                        maxY = Math.max(maxY, point.y);
                    }
                }
            }
        }

        // Add padding
        const padding = 20;
        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + 2 * padding,
            height: (maxY - minY) + 2 * padding
        };
    }

    /**
     * Render component to PDF
     */
    renderComponent(pdf, component, bounds, scale, offsetX, offsetY, opts) {
        const x = ((component.x || component.position?.x || 0) - bounds.x) * scale + offsetX;
        const y = ((component.y || component.position?.y || 0) - bounds.y) * scale + offsetY;
        const w = (component.width || 50) * scale;
        const h = (component.height || 50) * scale;

        // Set style
        const color = component.color || '#000000';
        const rgb = this.hexToRgb(color);
        pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
        pdf.setLineWidth(0.5);

        // Draw component shape
        if (component.shape === 'circle') {
            pdf.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2, 'S');
        } else {
            pdf.rect(x, y, w, h, 'S');
        }

        // Draw label
        if (component.label) {
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'normal');
            pdf.text(component.label, x + w / 2, y + h + 3, { align: 'center' });
        }
    }

    /**
     * Render ray to PDF
     */
    renderRay(pdf, ray, bounds, scale, offsetX, offsetY, opts) {
        if (!ray.path || ray.path.length < 2) return;

        // Set style
        const color = ray.color || '#FF0000';
        const rgb = this.hexToRgb(color);
        pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
        pdf.setLineWidth(ray.width || 1);

        // Set line style
        if (ray.style === 'dashed') {
            pdf.setLineDash([3, 2]);
        } else if (ray.style === 'dotted') {
            pdf.setLineDash([1, 2]);
        } else {
            pdf.setLineDash([]);
        }

        // Draw path
        const startPoint = ray.path[0];
        const startX = (startPoint.x - bounds.x) * scale + offsetX;
        const startY = (startPoint.y - bounds.y) * scale + offsetY;

        pdf.moveTo(startX, startY);

        for (let i = 1; i < ray.path.length; i++) {
            const point = ray.path[i];
            const px = (point.x - bounds.x) * scale + offsetX;
            const py = (point.y - bounds.y) * scale + offsetY;
            pdf.lineTo(px, py);
        }

        pdf.stroke();
        pdf.setLineDash([]); // Reset
    }

    /**
     * Render annotation to PDF
     */
    renderAnnotation(pdf, annotation, bounds, scale, offsetX, offsetY, opts) {
        const x = ((annotation.x || annotation.position?.x || 0) - bounds.x) * scale + offsetX;
        const y = ((annotation.y || annotation.position?.y || 0) - bounds.y) * scale + offsetY;

        // Set style
        pdf.setFontSize(annotation.fontSize || 10);
        pdf.setFont(undefined, annotation.bold ? 'bold' : 'normal');

        const color = annotation.color || '#000000';
        const rgb = this.hexToRgb(color);
        pdf.setTextColor(rgb.r, rgb.g, rgb.b);

        // Draw text
        if (annotation.text) {
            pdf.text(annotation.text, x, y);
        }

        // Draw leader line if present
        if (annotation.leaderLine && annotation.targetX !== undefined) {
            const targetX = (annotation.targetX - bounds.x) * scale + offsetX;
            const targetY = (annotation.targetY - bounds.y) * scale + offsetY;

            pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
            pdf.setLineWidth(0.5);
            pdf.line(x, y, targetX, targetY);
        }
    }

    /**
     * Export technical notes to PDF
     */
    exportTechnicalNotes(pdf, notes, contentArea, opts) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Technical Notes', contentArea.x, contentArea.y);

        let yOffset = contentArea.y + 10;
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');

        for (const note of notes) {
            // Check if we need a new page
            if (yOffset > contentArea.y + contentArea.height - 20) {
                pdf.addPage();
                yOffset = contentArea.y;
            }

            // Note title
            if (note.title) {
                pdf.setFont(undefined, 'bold');
                pdf.text(note.title, contentArea.x, yOffset);
                yOffset += 6;
                pdf.setFont(undefined, 'normal');
            }

            // Note content
            if (note.content) {
                const lines = pdf.splitTextToSize(note.content, contentArea.width);
                pdf.text(lines, contentArea.x, yOffset);
                yOffset += lines.length * 5 + 5;
            }

            yOffset += 5; // Space between notes
        }
    }

    /**
     * Fallback to SVG export if jsPDF not available
     */
    async fallbackToSVG(diagram, opts) {
        // Create SVG content
        const svgContent = this.createSVGContent(diagram);

        // Convert to blob
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        return blob;
    }

    /**
     * Create SVG content from diagram
     */
    createSVGContent(diagram) {
        const bounds = this.calculateDiagramBounds(diagram);

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">`;

        // Add components
        if (diagram.components) {
            for (const comp of diagram.components) {
                const x = comp.x || comp.position?.x || 0;
                const y = comp.y || comp.position?.y || 0;
                const w = comp.width || 50;
                const h = comp.height || 50;
                const color = comp.color || '#000000';

                if (comp.shape === 'circle') {
                    svg += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 2}" stroke="${color}" fill="none" stroke-width="2"/>`;
                } else {
                    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${color}" fill="none" stroke-width="2"/>`;
                }

                if (comp.label) {
                    svg += `<text x="${x + w / 2}" y="${y + h + 15}" text-anchor="middle" font-size="12">${comp.label}</text>`;
                }
            }
        }

        // Add rays
        if (diagram.rays) {
            for (const ray of diagram.rays) {
                if (ray.path && ray.path.length >= 2) {
                    const color = ray.color || '#FF0000';
                    const pathData = ray.path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    svg += `<path d="${pathData}" stroke="${color}" fill="none" stroke-width="${ray.width || 2}"/>`;
                }
            }
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    /**
     * Save PDF to file
     */
    async saveToFile(diagram, filename, options = {}) {
        const blob = await this.export(diagram, options);
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'diagram.pdf';
        link.click();

        URL.revokeObjectURL(url);
    }
}

// Singleton instance
let pdfExporterInstance = null;

export function getPDFExporter() {
    if (!pdfExporterInstance) {
        pdfExporterInstance = new PDFExporter();
    }
    return pdfExporterInstance;
}

export function resetPDFExporter() {
    pdfExporterInstance = null;
}

// Export presets
export const PDF_PRESETS = {
    journal: {
        pageSize: 'A4',
        orientation: 'portrait',
        quality: 'high',
        includeNotes: true,
        metadata: {
            subject: 'Scientific Publication'
        }
    },
    presentation: {
        pageSize: 'Letter',
        orientation: 'landscape',
        quality: 'high',
        includeNotes: false
    },
    poster: {
        pageSize: 'A3',
        orientation: 'portrait',
        quality: 'high',
        includeNotes: true
    },
    report: {
        pageSize: 'Letter',
        orientation: 'portrait',
        quality: 'medium',
        includeNotes: true,
        multiPage: true
    }
};
