/**
 * Advanced Template Manager
 * 
 * Manages diagram templates with:
 * - Template instantiation
 * - Custom template creation
 * - Template import/export
 * - Template browser UI
 */

import { TEMPLATE_LIBRARY, TEMPLATE_CATEGORIES, getAllTemplates, getTemplatesByCategory, getTemplateById, searchTemplates } from './TemplateLibrary.js';

export class AdvancedTemplateManager {
    constructor() {
        this.customTemplates = new Map();
        this.recentTemplates = [];
        this.maxRecentTemplates = 10;
    }

    /**
     * Get all available templates (built-in + custom)
     */
    getAllTemplates() {
        const builtIn = getAllTemplates();
        const custom = Array.from(this.customTemplates.values());
        return [...builtIn, ...custom];
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        const builtIn = getTemplatesByCategory(category);
        const custom = Array.from(this.customTemplates.values()).filter(t => t.category === category);
        return [...builtIn, ...custom];
    }

    /**
     * Get template by ID
     */
    getTemplate(id) {
        return getTemplateById(id) || this.customTemplates.get(id);
    }

    /**
     * Search templates
     */
    searchTemplates(query) {
        const builtInResults = searchTemplates(query);
        const lowerQuery = query.toLowerCase();
        const customResults = Array.from(this.customTemplates.values()).filter(t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)
        );
        return [...builtInResults, ...customResults];
    }

    /**
     * Instantiate template - create diagram from template
     */
    instantiateTemplate(templateId, options = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        // Add to recent templates
        this.addToRecent(templateId);

        // Create diagram from template
        const diagram = {
            id: this.generateId(),
            name: options.name || template.name,
            description: template.description,
            components: this.instantiateComponents(template.components, options),
            rays: this.instantiateRays(template.rays, options),
            annotations: template.annotations ? [...template.annotations] : [],
            parameters: { ...template.parameters, ...options.parameters },
            metadata: {
                templateId: templateId,
                createdAt: new Date().toISOString(),
                createdFrom: 'template'
            }
        };

        return diagram;
    }

    /**
     * Instantiate components from template
     */
    instantiateComponents(components, options) {
        if (!components) return [];

        const offsetX = options.offsetX || 0;
        const offsetY = options.offsetY || 0;
        const scale = options.scale || 1;

        return components.map(comp => ({
            ...comp,
            id: this.generateId(),
            x: (comp.x || 0) * scale + offsetX,
            y: (comp.y || 0) * scale + offsetY,
            width: (comp.width || 50) * scale,
            height: (comp.height || 50) * scale
        }));
    }

    /**
     * Instantiate rays from template
     */
    instantiateRays(rays, options) {
        if (!rays) return [];

        return rays.map(ray => ({
            ...ray,
            id: this.generateId()
        }));
    }

    /**
     * Save current diagram as template
     */
    saveAsTemplate(diagram, metadata = {}) {
        const template = {
            id: metadata.id || this.generateId(),
            name: metadata.name || diagram.name || 'Custom Template',
            category: metadata.category || 'custom',
            description: metadata.description || '',
            preview: metadata.preview || null,
            components: this.extractComponents(diagram),
            rays: this.extractRays(diagram),
            annotations: diagram.annotations || [],
            parameters: diagram.parameters || {},
            custom: true,
            createdAt: new Date().toISOString()
        };

        this.customTemplates.set(template.id, template);
        return template;
    }

    /**
     * Extract components from diagram (normalize positions)
     */
    extractComponents(diagram) {
        if (!diagram.components || diagram.components.length === 0) return [];

        // Find bounds
        let minX = Infinity, minY = Infinity;
        for (const comp of diagram.components) {
            minX = Math.min(minX, comp.x || 0);
            minY = Math.min(minY, comp.y || 0);
        }

        // Normalize positions
        return diagram.components.map(comp => ({
            type: comp.type,
            x: (comp.x || 0) - minX,
            y: (comp.y || 0) - minY,
            width: comp.width,
            height: comp.height,
            label: comp.label,
            angle: comp.angle,
            ...comp.properties
        }));
    }

    /**
     * Extract rays from diagram
     */
    extractRays(diagram) {
        if (!diagram.rays) return [];

        return diagram.rays.map(ray => ({
            from: ray.from,
            to: ray.to,
            color: ray.color,
            style: ray.style,
            width: ray.width
        }));
    }

    /**
     * Delete custom template
     */
    deleteTemplate(templateId) {
        if (TEMPLATE_LIBRARY[templateId]) {
            throw new Error('Cannot delete built-in template');
        }
        return this.customTemplates.delete(templateId);
    }

    /**
     * Export template to JSON
     */
    exportTemplate(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        return JSON.stringify(template, null, 2);
    }

    /**
     * Import template from JSON
     */
    importTemplate(jsonString) {
        try {
            const template = JSON.parse(jsonString);
            
            // Validate template
            if (!template.id || !template.name) {
                throw new Error('Invalid template format');
            }

            // Ensure unique ID
            if (this.getTemplate(template.id)) {
                template.id = this.generateId();
            }

            template.custom = true;
            template.importedAt = new Date().toISOString();

            this.customTemplates.set(template.id, template);
            return template;
        } catch (error) {
            throw new Error(`Failed to import template: ${error.message}`);
        }
    }

    /**
     * Get recent templates
     */
    getRecentTemplates() {
        return this.recentTemplates
            .map(id => this.getTemplate(id))
            .filter(t => t !== undefined);
    }

    /**
     * Add template to recent list
     */
    addToRecent(templateId) {
        // Remove if already exists
        this.recentTemplates = this.recentTemplates.filter(id => id !== templateId);
        
        // Add to front
        this.recentTemplates.unshift(templateId);
        
        // Limit size
        if (this.recentTemplates.length > this.maxRecentTemplates) {
            this.recentTemplates = this.recentTemplates.slice(0, this.maxRecentTemplates);
        }
    }

    /**
     * Get template categories
     */
    getCategories() {
        return TEMPLATE_CATEGORIES;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create template browser UI
     */
    createBrowserUI(container) {
        const browser = new TemplateBrowser(this, container);
        return browser;
    }
}

/**
 * Template Browser UI Component
 */
export class TemplateBrowser {
    constructor(manager, container) {
        this.manager = manager;
        this.container = container;
        this.selectedCategory = 'all';
        this.searchQuery = '';
        this.onTemplateSelect = null;

        this.render();
    }

    /**
     * Render browser UI
     */
    render() {
        this.container.innerHTML = '';
        this.container.className = 'template-browser';

        // Create header
        const header = document.createElement('div');
        header.className = 'template-browser-header';
        header.innerHTML = `
            <h3>Diagram Templates</h3>
            <input type="text" class="template-search" placeholder="Search templates..." />
        `;
        this.container.appendChild(header);

        // Search functionality
        const searchInput = header.querySelector('.template-search');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderTemplates();
        });

        // Create category tabs
        const tabs = document.createElement('div');
        tabs.className = 'template-categories';
        
        // Add "All" tab
        tabs.appendChild(this.createCategoryTab('all', 'All Templates'));

        // Add category tabs
        const categories = this.manager.getCategories();
        for (const [id, category] of Object.entries(categories)) {
            tabs.appendChild(this.createCategoryTab(id, category.name));
        }

        this.container.appendChild(tabs);

        // Create template grid
        this.templateGrid = document.createElement('div');
        this.templateGrid.className = 'template-grid';
        this.container.appendChild(this.templateGrid);

        // Render templates
        this.renderTemplates();
    }

    /**
     * Create category tab
     */
    createCategoryTab(id, name) {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        tab.textContent = name;
        tab.dataset.category = id;

        if (id === this.selectedCategory) {
            tab.classList.add('active');
        }

        tab.addEventListener('click', () => {
            this.selectedCategory = id;
            this.renderTemplates();
            
            // Update active tab
            this.container.querySelectorAll('.category-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.category === id);
            });
        });

        return tab;
    }

    /**
     * Render templates
     */
    renderTemplates() {
        this.templateGrid.innerHTML = '';

        // Get templates
        let templates;
        if (this.searchQuery) {
            templates = this.manager.searchTemplates(this.searchQuery);
        } else if (this.selectedCategory === 'all') {
            templates = this.manager.getAllTemplates();
        } else {
            templates = this.manager.getTemplatesByCategory(this.selectedCategory);
        }

        // Render template cards
        for (const template of templates) {
            const card = this.createTemplateCard(template);
            this.templateGrid.appendChild(card);
        }

        // Show empty state if no templates
        if (templates.length === 0) {
            this.templateGrid.innerHTML = '<div class="empty-state">No templates found</div>';
        }
    }

    /**
     * Create template card
     */
    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.innerHTML = `
            <div class="template-preview">
                ${template.preview ? `<img src="${template.preview}" alt="${template.name}" />` : '<div class="preview-placeholder">📐</div>'}
            </div>
            <div class="template-info">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
                ${template.custom ? '<span class="custom-badge">Custom</span>' : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            if (this.onTemplateSelect) {
                this.onTemplateSelect(template);
            }
        });

        return card;
    }

    /**
     * Set template selection callback
     */
    onSelect(callback) {
        this.onTemplateSelect = callback;
    }
}

// Singleton instance
let templateManagerInstance = null;

export function getAdvancedTemplateManager() {
    if (!templateManagerInstance) {
        templateManagerInstance = new AdvancedTemplateManager();
    }
    return templateManagerInstance;
}

export function resetAdvancedTemplateManager() {
    templateManagerInstance = null;
}
