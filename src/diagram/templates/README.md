# Template System Documentation

## Overview

The Template System provides 23+ pre-configured optical diagram templates organized into 8 categories, enabling rapid creation of professional optical system diagrams.

## Features

- **23 Built-in Templates**: Professional templates for common optical setups
- **8 Categories**: Organized by application domain
- **Template Browser**: Visual UI for browsing and searching templates
- **Custom Templates**: Save your own diagrams as reusable templates
- **Import/Export**: Share templates as JSON files
- **Parameter Support**: Templates with configurable parameters
- **Recent Templates**: Quick access to recently used templates

## Template Categories

### 1. Interferometry (4 templates)
- **Michelson Interferometer**: Classic configuration for precision measurements
- **Mach-Zehnder Interferometer**: Phase measurement setup
- **Fabry-Pérot Cavity**: High-finesse optical cavity
- **Sagnac Interferometer**: Rotation-sensitive configuration

### 2. Spectroscopy (4 templates)
- **Basic Spectroscopy**: Simple absorption/emission setup
- **Raman Spectroscopy**: Raman scattering measurement
- **Fluorescence Spectroscopy**: Fluorescence emission measurement
- **Absorption Spectroscopy**: Transmission-based absorption

### 3. Imaging (4 templates)
- **Optical Microscope**: Compound microscope configuration
- **Refracting Telescope**: Keplerian telescope design
- **Camera Lens System**: Multi-element camera lens
- **Optical Projector**: Image projection system

### 4. Laser Systems (3 templates)
- **Laser Cavity**: Basic laser resonator
- **Laser Amplifier**: Optical amplifier configuration
- **Frequency Doubling (SHG)**: Second harmonic generation

### 5. Fiber Optics (3 templates)
- **Fiber Coupling**: Free-space to fiber coupling
- **Fiber Splitter**: 1x2 fiber splitter configuration
- **Fiber Sensor**: Interferometric fiber sensor

### 6. Polarization (2 templates)
- **Polarization Analysis**: Polarization state measurement
- **Polarization Control**: Active polarization manipulation

### 7. Quantum Optics (2 templates)
- **Single Photon Source**: Heralded single photon generation
- **Entangled Photon Pairs**: Polarization-entangled photons

### 8. Atomic Physics (1 template)
- **Magneto-Optical Trap (MOT)**: Laser cooling and trapping

## Quick Start

### Basic Usage

```javascript
import { getAdvancedTemplateManager } from './templates/index.js';

// Get template manager
const manager = getAdvancedTemplateManager();

// Browse all templates
const allTemplates = manager.getAllTemplates();
console.log(`Available templates: ${allTemplates.length}`);

// Instantiate a template
const diagram = manager.instantiateTemplate('michelson-interferometer', {
    name: 'My Michelson Setup',
    parameters: {
        wavelength: 632.8,
        armLength: 150
    }
});

console.log('Created diagram:', diagram.name);
console.log('Components:', diagram.components.length);
```

### Search Templates

```javascript
// Search by keyword
const laserTemplates = manager.searchTemplates('laser');
console.log(`Found ${laserTemplates.length} laser-related templates`);

// Get templates by category
const spectroscopyTemplates = manager.getTemplatesByCategory('spectroscopy');
console.log(`Spectroscopy templates: ${spectroscopyTemplates.length}`);
```

### Create Custom Template

```javascript
// Create your diagram
const myDiagram = {
    name: 'Custom Setup',
    components: [
        { type: 'laser', x: 50, y: 200, label: 'Laser' },
        { type: 'lens', x: 150, y: 200, label: 'Lens' },
        { type: 'detector', x: 250, y: 200, label: 'Detector' }
    ],
    rays: [
        { from: 'laser', to: 'lens', color: '#FF0000' },
        { from: 'lens', to: 'detector', color: '#FF0000' }
    ]
};

// Save as template
const template = manager.saveAsTemplate(myDiagram, {
    name: 'My Custom Template',
    category: 'custom',
    description: 'Simple transmission setup'
});

console.log('Template saved:', template.id);
```

### Export and Import Templates

```javascript
// Export template to JSON
const jsonString = manager.exportTemplate(template.id);

// Save to file
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'my-template.json';
link.click();

// Import template from JSON
const imported = manager.importTemplate(jsonString);
console.log('Imported template:', imported.name);
```

### Template Browser UI

```javascript
// Create browser UI
const container = document.getElementById('template-browser');
const browser = manager.createBrowserUI(container);

// Handle template selection
browser.onSelect((template) => {
    console.log('Selected:', template.name);
    
    // Instantiate the template
    const diagram = manager.instantiateTemplate(template.id);
    
    // Use the diagram...
});
```

## Template Structure

Each template has the following structure:

```javascript
{
    id: 'unique-template-id',
    name: 'Template Name',
    category: 'category-name',
    description: 'Template description',
    preview: 'data:image/svg+xml;base64,...',  // Optional preview image
    components: [
        {
            type: 'component-type',
            x: 100,
            y: 200,
            width: 50,
            height: 50,
            label: 'Component Label',
            // ... other properties
        }
    ],
    rays: [
        {
            from: 'source-id',
            to: 'target-id',
            color: '#FF0000',
            style: 'solid',
            width: 2
        }
    ],
    annotations: [
        {
            x: 150,
            y: 100,
            text: 'Annotation text',
            fontSize: 12,
            color: '#000000'
        }
    ],
    parameters: {
        // Template-specific parameters
        wavelength: 632.8,
        power: 10,
        // ...
    }
}
```

## API Reference

### AdvancedTemplateManager

#### Methods

##### `getAllTemplates()`
Returns all available templates (built-in + custom).

```javascript
const templates = manager.getAllTemplates();
```

##### `getTemplatesByCategory(category)`
Returns templates in a specific category.

```javascript
const templates = manager.getTemplatesByCategory('interferometry');
```

##### `getTemplate(id)`
Returns a specific template by ID.

```javascript
const template = manager.getTemplate('michelson-interferometer');
```

##### `searchTemplates(query)`
Searches templates by name, description, or category.

```javascript
const results = manager.searchTemplates('laser');
```

##### `instantiateTemplate(templateId, options)`
Creates a diagram from a template.

```javascript
const diagram = manager.instantiateTemplate('laser-cavity', {
    name: 'My Laser',
    offsetX: 100,
    offsetY: 50,
    scale: 1.5,
    parameters: {
        cavityLength: 300,
        gain: 1.1
    }
});
```

**Options:**
- `name`: Diagram name (default: template name)
- `offsetX`: X offset for all components (default: 0)
- `offsetY`: Y offset for all components (default: 0)
- `scale`: Scale factor for all components (default: 1)
- `parameters`: Override template parameters

##### `saveAsTemplate(diagram, metadata)`
Saves a diagram as a custom template.

```javascript
const template = manager.saveAsTemplate(diagram, {
    name: 'My Template',
    category: 'custom',
    description: 'Custom setup',
    preview: 'data:image/svg+xml;base64,...'
});
```

##### `deleteTemplate(templateId)`
Deletes a custom template (cannot delete built-in templates).

```javascript
manager.deleteTemplate(customTemplateId);
```

##### `exportTemplate(templateId)`
Exports a template to JSON string.

```javascript
const jsonString = manager.exportTemplate(templateId);
```

##### `importTemplate(jsonString)`
Imports a template from JSON string.

```javascript
const template = manager.importTemplate(jsonString);
```

##### `getRecentTemplates()`
Returns recently used templates.

```javascript
const recent = manager.getRecentTemplates();
```

##### `getCategories()`
Returns all template categories.

```javascript
const categories = manager.getCategories();
```

##### `createBrowserUI(container)`
Creates a template browser UI in the specified container.

```javascript
const browser = manager.createBrowserUI(containerElement);
```

### TemplateBrowser

#### Methods

##### `onSelect(callback)`
Sets the callback for template selection.

```javascript
browser.onSelect((template) => {
    console.log('Selected:', template.name);
});
```

## Integration with Export System

Templates work seamlessly with the export system:

```javascript
import { getAdvancedTemplateManager } from './templates/index.js';
import { getPDFExporter } from './export/index.js';

// Create diagram from template
const manager = getAdvancedTemplateManager();
const diagram = manager.instantiateTemplate('mach-zehnder-interferometer');

// Export to PDF
const pdfExporter = getPDFExporter();
await pdfExporter.saveToFile(diagram, 'mach-zehnder.pdf', {
    pageSize: 'A4',
    orientation: 'landscape',
    includeNotes: true
});
```

## Best Practices

### 1. Template Naming
- Use descriptive names that clearly indicate the setup
- Include key parameters in the name if relevant
- Example: "Michelson Interferometer (HeNe, 150mm arms)"

### 2. Component Positioning
- Use consistent spacing between components
- Align components on a grid for clean appearance
- Leave room for annotations and labels

### 3. Parameters
- Include all relevant optical parameters
- Use standard units (nm for wavelength, mm for distances)
- Document parameter meanings in description

### 4. Custom Templates
- Save frequently used setups as templates
- Organize custom templates by project or experiment type
- Export templates for sharing with collaborators

### 5. Template Reuse
- Start with a similar template and modify
- Use template parameters to customize setups
- Combine multiple templates for complex systems

## Examples

See `TemplateIntegrationExample.js` for comprehensive examples including:
- Browsing and searching templates
- Instantiating templates with parameters
- Creating custom templates
- Exporting and importing templates
- Using template browser UI
- Integration with PDF export
- Complete workflow examples

## File Structure

```
src/diagram/templates/
├── TemplateLibrary.js          # 23 built-in templates
├── AdvancedTemplateManager.js  # Template management
├── index.js                     # Module exports
└── README.md                    # This file
```

## Future Enhancements

Potential future additions:
- Template preview generation
- Template versioning
- Template sharing platform
- More specialized templates
- Template validation
- Template dependencies
- Parametric template generation

## Support

For issues or questions:
1. Check the integration examples
2. Review the API reference
3. Examine built-in templates for patterns
4. Consult the main documentation

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready ✅
