/**
 * Template Module - Index
 * Exports template system functionality
 */

export {
    TEMPLATE_LIBRARY,
    TEMPLATE_CATEGORIES,
    getAllTemplates,
    getTemplatesByCategory,
    getTemplateById,
    searchTemplates
} from './TemplateLibrary.js';

export {
    AdvancedTemplateManager,
    TemplateBrowser,
    getAdvancedTemplateManager,
    resetAdvancedTemplateManager
} from './AdvancedTemplateManager.js';
