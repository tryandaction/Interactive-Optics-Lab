/**
 * Template System Integration Example
 * 
 * Demonstrates how to use the template system:
 * - Browse and search templates
 * - Instantiate templates
 * - Create custom templates
 * - Export templates
 */

import { getAdvancedTemplateManager, TEMPLATE_CATEGORIES } from './templates/index.js';
import { getPDFExporter } from './export/index.js';

/**
 * Example 1: Browse and Use Templates
 */
export function example1_BrowseTemplates() {
    console.log('=== Example 1: Browse Templates ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Get all templates
    const allTemplates = manager.getAllTemplates();
    console.log(`Total templates: ${allTemplates.length}`);
    
    // Get templates by category
    const interferometryTemplates = manager.getTemplatesByCategory('interferometry');
    console.log(`Interferometry templates: ${interferometryTemplates.length}`);
    
    // List all categories
    const categories = manager.getCategories();
    console.log('Available categories:');
    for (const [id, category] of Object.entries(categories)) {
        const count = manager.getTemplatesByCategory(id).length;
        console.log(`  - ${category.name}: ${count} templates`);
    }
}

/**
 * Example 2: Instantiate Template
 */
export function example2_InstantiateTemplate() {
    console.log('=== Example 2: Instantiate Template ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Instantiate Michelson interferometer template
    const diagram = manager.instantiateTemplate('michelson-interferometer', {
        name: 'My Michelson Interferometer',
        parameters: {
            wavelength: 632.8,  // HeNe laser
            armLength: 150      // mm
        }
    });
    
    console.log('Created diagram:', diagram.name);
    console.log('Components:', diagram.components.length);
    console.log('Parameters:', diagram.parameters);
    
    return diagram;
}

/**
 * Example 3: Search Templates
 */
export function example3_SearchTemplates() {
    console.log('=== Example 3: Search Templates ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Search for laser-related templates
    const laserTemplates = manager.searchTemplates('laser');
    console.log(`Found ${laserTemplates.length} laser-related templates:`);
    laserTemplates.forEach(t => {
        console.log(`  - ${t.name} (${t.category})`);
    });
    
    // Search for quantum templates
    const quantumTemplates = manager.searchTemplates('quantum');
    console.log(`\nFound ${quantumTemplates.length} quantum templates:`);
    quantumTemplates.forEach(t => {
        console.log(`  - ${t.name}`);
    });
}

/**
 * Example 4: Create Custom Template
 */
export function example4_CreateCustomTemplate() {
    console.log('=== Example 4: Create Custom Template ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Create a custom diagram
    const customDiagram = {
        name: 'My Custom Setup',
        components: [
            { type: 'laser', x: 50, y: 200, width: 40, height: 40, label: 'Laser' },
            { type: 'lens', x: 150, y: 200, width: 30, height: 30, label: 'Lens 1' },
            { type: 'sample', x: 250, y: 200, width: 50, height: 50, label: 'Sample' },
            { type: 'lens', x: 350, y: 200, width: 30, height: 30, label: 'Lens 2' },
            { type: 'detector', x: 450, y: 200, width: 40, height: 40, label: 'Detector' }
        ],
        rays: [
            { from: 'laser', to: 'lens-1', color: '#FF0000' },
            { from: 'lens-1', to: 'sample', color: '#FF0000' },
            { from: 'sample', to: 'lens-2', color: '#FF0000' },
            { from: 'lens-2', to: 'detector', color: '#FF0000' }
        ],
        parameters: {
            wavelength: 532,
            power: 10
        }
    };
    
    // Save as template
    const template = manager.saveAsTemplate(customDiagram, {
        name: 'Custom Transmission Setup',
        category: 'custom',
        description: 'Simple transmission measurement setup'
    });
    
    console.log('Created custom template:', template.name);
    console.log('Template ID:', template.id);
    
    // Verify it can be retrieved
    const retrieved = manager.getTemplate(template.id);
    console.log('Template retrieved successfully:', retrieved !== undefined);
    
    return template;
}

/**
 * Example 5: Export and Import Templates
 */
export function example5_ExportImportTemplate() {
    console.log('=== Example 5: Export/Import Template ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Create a custom template
    const template = example4_CreateCustomTemplate();
    
    // Export to JSON
    const jsonString = manager.exportTemplate(template.id);
    console.log('Exported template JSON (first 100 chars):');
    console.log(jsonString.substring(0, 100) + '...');
    
    // Import the template (with new ID)
    const imported = manager.importTemplate(jsonString);
    console.log('Imported template:', imported.name);
    console.log('New template ID:', imported.id);
    
    return { exported: jsonString, imported };
}

/**
 * Example 6: Template Browser UI
 */
export function example6_TemplateBrowserUI() {
    console.log('=== Example 6: Template Browser UI ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Create container
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.border = '1px solid #ccc';
    container.style.padding = '20px';
    
    // Create browser
    const browser = manager.createBrowserUI(container);
    
    // Set selection callback
    browser.onSelect((template) => {
        console.log('Template selected:', template.name);
        
        // Instantiate the template
        const diagram = manager.instantiateTemplate(template.id);
        console.log('Created diagram with', diagram.components.length, 'components');
    });
    
    // Add to document
    document.body.appendChild(container);
    
    console.log('Template browser UI created');
    return browser;
}

/**
 * Example 7: Recent Templates
 */
export function example7_RecentTemplates() {
    console.log('=== Example 7: Recent Templates ===');
    
    const manager = getAdvancedTemplateManager();
    
    // Use several templates
    manager.instantiateTemplate('michelson-interferometer');
    manager.instantiateTemplate('laser-cavity');
    manager.instantiateTemplate('microscope');
    
    // Get recent templates
    const recent = manager.getRecentTemplates();
    console.log(`Recent templates (${recent.length}):`);
    recent.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name}`);
    });
}

/**
 * Example 8: Template with PDF Export
 */
export async function example8_TemplateWithPDFExport() {
    console.log('=== Example 8: Template with PDF Export ===');
    
    const manager = getAdvancedTemplateManager();
    const pdfExporter = getPDFExporter();
    
    // Instantiate template
    const diagram = manager.instantiateTemplate('mach-zehnder-interferometer', {
        name: 'Mach-Zehnder for Phase Measurement'
    });
    
    console.log('Created diagram:', diagram.name);
    
    // Export to PDF
    try {
        const pdfBlob = await pdfExporter.export(diagram, {
            pageSize: 'A4',
            orientation: 'landscape',
            includeNotes: true,
            metadata: {
                title: diagram.name,
                author: 'Template System',
                subject: 'Optical Diagram'
            }
        });
        
        console.log('PDF exported successfully');
        console.log('PDF size:', pdfBlob.size, 'bytes');
        
        // Save to file
        await pdfExporter.saveToFile(diagram, 'mach-zehnder.pdf', {
            pageSize: 'A4',
            orientation: 'landscape'
        });
        
        console.log('PDF saved to file');
    } catch (error) {
        console.log('PDF export note:', error.message);
        console.log('(jsPDF library may not be loaded)');
    }
}

/**
 * Example 9: All Template Categories
 */
export function example9_AllCategories() {
    console.log('=== Example 9: All Template Categories ===');
    
    const manager = getAdvancedTemplateManager();
    const categories = manager.getCategories();
    
    for (const [id, category] of Object.entries(categories)) {
        console.log(`\n${category.name}:`);
        console.log(`  Description: ${category.description}`);
        
        const templates = manager.getTemplatesByCategory(id);
        console.log(`  Templates (${templates.length}):`);
        templates.forEach(t => {
            console.log(`    - ${t.name}`);
            console.log(`      ${t.description}`);
        });
    }
}

/**
 * Example 10: Complete Workflow
 */
export async function example10_CompleteWorkflow() {
    console.log('=== Example 10: Complete Workflow ===');
    
    const manager = getAdvancedTemplateManager();
    
    // 1. Browse templates
    console.log('\n1. Browsing templates...');
    const allTemplates = manager.getAllTemplates();
    console.log(`   Found ${allTemplates.length} templates`);
    
    // 2. Search for specific type
    console.log('\n2. Searching for spectroscopy templates...');
    const spectroscopyTemplates = manager.searchTemplates('spectroscopy');
    console.log(`   Found ${spectroscopyTemplates.length} templates`);
    
    // 3. Select and instantiate
    console.log('\n3. Instantiating Raman spectroscopy template...');
    const diagram = manager.instantiateTemplate('raman-spectroscopy', {
        name: 'Raman Measurement Setup',
        parameters: {
            excitationWavelength: 532,
            ramanShift: [500, 2000]
        }
    });
    console.log(`   Created diagram: ${diagram.name}`);
    console.log(`   Components: ${diagram.components.length}`);
    
    // 4. Modify diagram (add annotation)
    console.log('\n4. Adding annotation...');
    diagram.annotations = diagram.annotations || [];
    diagram.annotations.push({
        x: 300,
        y: 150,
        text: 'Raman Shift: 500-2000 cm⁻¹',
        fontSize: 12,
        color: '#000000'
    });
    
    // 5. Save as custom template
    console.log('\n5. Saving as custom template...');
    const customTemplate = manager.saveAsTemplate(diagram, {
        name: 'My Raman Setup',
        category: 'custom',
        description: 'Customized Raman spectroscopy setup'
    });
    console.log(`   Saved as: ${customTemplate.name}`);
    
    // 6. Export template
    console.log('\n6. Exporting template...');
    const jsonString = manager.exportTemplate(customTemplate.id);
    console.log(`   Exported ${jsonString.length} characters`);
    
    // 7. Export diagram to PDF
    console.log('\n7. Exporting diagram to PDF...');
    const pdfExporter = getPDFExporter();
    try {
        await pdfExporter.saveToFile(diagram, 'raman-setup.pdf', {
            pageSize: 'A4',
            orientation: 'landscape',
            includeNotes: true
        });
        console.log('   PDF saved successfully');
    } catch (error) {
        console.log('   PDF export note:', error.message);
    }
    
    console.log('\n✅ Workflow complete!');
}

// Run all examples
export function runAllExamples() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  Template System Integration Examples ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    example1_BrowseTemplates();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example2_InstantiateTemplate();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example3_SearchTemplates();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example4_CreateCustomTemplate();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example5_ExportImportTemplate();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example7_RecentTemplates();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    example9_AllCategories();
    console.log('\n' + '─'.repeat(50) + '\n');
    
    // Async examples
    example8_TemplateWithPDFExport().then(() => {
        console.log('\n' + '─'.repeat(50) + '\n');
        return example10_CompleteWorkflow();
    }).then(() => {
        console.log('\n' + '═'.repeat(50));
        console.log('All examples completed!');
        console.log('═'.repeat(50));
    });
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.TemplateExamples = {
        example1_BrowseTemplates,
        example2_InstantiateTemplate,
        example3_SearchTemplates,
        example4_CreateCustomTemplate,
        example5_ExportImportTemplate,
        example6_TemplateBrowserUI,
        example7_RecentTemplates,
        example8_TemplateWithPDFExport,
        example9_AllCategories,
        example10_CompleteWorkflow,
        runAllExamples
    };
    
    console.log('Template examples loaded! Run window.TemplateExamples.runAllExamples() to see all examples.');
}
