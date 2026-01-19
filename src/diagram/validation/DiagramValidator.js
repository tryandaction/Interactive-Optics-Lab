/**
 * DiagramValidator.js - 图表验证器
 * 验证图表数据的完整性和正确性
 * 
 * Requirements: 所有阶段的验证需求
 */

/**
 * 验证结果类
 */
export class ValidationResult {
    constructor() {
        this.valid = true;
        this.errors = [];
        this.warnings = [];
    }

    addError(message, context = {}) {
        this.valid = false;
        this.errors.push({ message, context, timestamp: Date.now() });
    }

    addWarning(message, context = {}) {
        this.warnings.push({ message, context, timestamp: Date.now() });
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    hasWarnings() {
        return this.warnings.length > 0;
    }

    getReport() {
        return {
            valid: this.valid,
            errorCount: this.errors.length,
            warningCount: this.warnings.length,
            errors: this.errors,
            warnings: this.warnings
        };
    }
}

/**
 * 图表验证器类
 */
export class DiagramValidator {
    constructor() {
        this.rules = new Map();
        this._registerDefaultRules();
    }

    /**
     * 注册默认验证规则
     * @private
     */
    _registerDefaultRules() {
        // 组件验证规则
        this.addRule('component-has-id', (component) => {
            return component.id && typeof component.id === 'string';
        }, 'Component must have a valid ID');

        this.addRule('component-has-type', (component) => {
            return component.type && typeof component.type === 'string';
        }, 'Component must have a valid type');

        this.addRule('component-has-position', (component) => {
            return component.pos && 
                   typeof component.pos.x === 'number' && 
                   typeof component.pos.y === 'number';
        }, 'Component must have valid position coordinates');

        // 光线验证规则
        this.addRule('ray-has-endpoints', (ray) => {
            return ray.p1 && ray.p2 && 
                   typeof ray.p1.x === 'number' && 
                   typeof ray.p1.y === 'number' &&
                   typeof ray.p2.x === 'number' && 
                   typeof ray.p2.y === 'number';
        }, 'Ray must have valid start and end points');

        this.addRule('ray-wavelength-valid', (ray) => {
            if (ray.wavelength === undefined) return true;
            return ray.wavelength >= 380 && ray.wavelength <= 780;
        }, 'Ray wavelength must be in visible range (380-780nm)');

        // 连接点验证规则
        this.addRule('connection-point-valid', (point) => {
            return point.x !== undefined && 
                   point.y !== undefined &&
                   typeof point.x === 'number' && 
                   typeof point.y === 'number';
        }, 'Connection point must have valid coordinates');

        // 注释验证规则
        this.addRule('annotation-has-content', (annotation) => {
            return annotation.text && annotation.text.length > 0;
        }, 'Annotation must have text content');

        // 图层验证规则
        this.addRule('layer-has-name', (layer) => {
            return layer.name && typeof layer.name === 'string';
        }, 'Layer must have a valid name');

        this.addRule('layer-z-order-valid', (layer) => {
            return typeof layer.zOrder === 'number' && layer.zOrder >= 0;
        }, 'Layer z-order must be a non-negative number');
    }

    /**
     * 添加验证规则
     */
    addRule(name, validator, message) {
        this.rules.set(name, { validator, message });
    }

    /**
     * 移除验证规则
     */
    removeRule(name) {
        this.rules.delete(name);
    }

    /**
     * 验证单个组件
     */
    validateComponent(component) {
        const result = new ValidationResult();

        // 应用组件相关规则
        for (const [name, rule] of this.rules.entries()) {
            if (name.startsWith('component-')) {
                try {
                    if (!rule.validator(component)) {
                        result.addError(rule.message, { rule: name, component });
                    }
                } catch (error) {
                    result.addError(`Rule ${name} threw error: ${error.message}`, { rule: name, component });
                }
            }
        }

        return result;
    }

    /**
     * 验证单个光线
     */
    validateRay(ray) {
        const result = new ValidationResult();

        // 应用光线相关规则
        for (const [name, rule] of this.rules.entries()) {
            if (name.startsWith('ray-')) {
                try {
                    if (!rule.validator(ray)) {
                        result.addError(rule.message, { rule: name, ray });
                    }
                } catch (error) {
                    result.addError(`Rule ${name} threw error: ${error.message}`, { rule: name, ray });
                }
            }
        }

        return result;
    }

    /**
     * 验证注释
     */
    validateAnnotation(annotation) {
        const result = new ValidationResult();

        for (const [name, rule] of this.rules.entries()) {
            if (name.startsWith('annotation-')) {
                try {
                    if (!rule.validator(annotation)) {
                        result.addError(rule.message, { rule: name, annotation });
                    }
                } catch (error) {
                    result.addError(`Rule ${name} threw error: ${error.message}`, { rule: name, annotation });
                }
            }
        }

        return result;
    }

    /**
     * 验证图层
     */
    validateLayer(layer) {
        const result = new ValidationResult();

        for (const [name, rule] of this.rules.entries()) {
            if (name.startsWith('layer-')) {
                try {
                    if (!rule.validator(layer)) {
                        result.addError(rule.message, { rule: name, layer });
                    }
                } catch (error) {
                    result.addError(`Rule ${name} threw error: ${error.message}`, { rule: name, layer });
                }
            }
        }

        return result;
    }

    /**
     * 验证完整图表
     */
    validateDiagram(diagram) {
        const result = new ValidationResult();

        // 验证基本结构
        if (!diagram) {
            result.addError('Diagram is null or undefined');
            return result;
        }

        // 验证所有组件
        if (diagram.components && Array.isArray(diagram.components)) {
            diagram.components.forEach((component, index) => {
                const componentResult = this.validateComponent(component);
                if (componentResult.hasErrors()) {
                    componentResult.errors.forEach(error => {
                        result.addError(`Component ${index}: ${error.message}`, error.context);
                    });
                }
            });

            // 检查重复ID
            const ids = new Set();
            diagram.components.forEach((component, index) => {
                if (component.id) {
                    if (ids.has(component.id)) {
                        result.addError(`Duplicate component ID: ${component.id}`, { index, component });
                    }
                    ids.add(component.id);
                }
            });
        }

        // 验证所有光线
        if (diagram.rays && Array.isArray(diagram.rays)) {
            diagram.rays.forEach((ray, index) => {
                const rayResult = this.validateRay(ray);
                if (rayResult.hasErrors()) {
                    rayResult.errors.forEach(error => {
                        result.addError(`Ray ${index}: ${error.message}`, error.context);
                    });
                }
            });
        }

        // 验证所有注释
        if (diagram.annotations && Array.isArray(diagram.annotations)) {
            diagram.annotations.forEach((annotation, index) => {
                const annotationResult = this.validateAnnotation(annotation);
                if (annotationResult.hasErrors()) {
                    annotationResult.errors.forEach(error => {
                        result.addError(`Annotation ${index}: ${error.message}`, error.context);
                    });
                }
            });
        }

        // 验证所有图层
        if (diagram.layers && Array.isArray(diagram.layers)) {
            diagram.layers.forEach((layer, index) => {
                const layerResult = this.validateLayer(layer);
                if (layerResult.hasErrors()) {
                    layerResult.errors.forEach(error => {
                        result.addError(`Layer ${index}: ${error.message}`, error.context);
                    });
                }
            });

            // 检查图层z-order冲突
            const zOrders = new Map();
            diagram.layers.forEach((layer, index) => {
                if (typeof layer.zOrder === 'number') {
                    if (zOrders.has(layer.zOrder)) {
                        result.addWarning(`Duplicate z-order ${layer.zOrder}`, { 
                            layer1: zOrders.get(layer.zOrder), 
                            layer2: index 
                        });
                    }
                    zOrders.set(layer.zOrder, index);
                }
            });
        }

        // 验证连接关系
        if (diagram.components && diagram.rays) {
            this._validateConnections(diagram, result);
        }

        return result;
    }

    /**
     * 验证连接关系
     * @private
     */
    _validateConnections(diagram, result) {
        const componentIds = new Set(diagram.components.map(c => c.id));

        diagram.rays.forEach((ray, index) => {
            // 检查光线是否连接到有效组件
            if (ray.sourceId && !componentIds.has(ray.sourceId)) {
                result.addWarning(`Ray ${index} references non-existent source component: ${ray.sourceId}`, { ray });
            }
            if (ray.targetId && !componentIds.has(ray.targetId)) {
                result.addWarning(`Ray ${index} references non-existent target component: ${ray.targetId}`, { ray });
            }
        });
    }

    /**
     * 验证导出数据
     */
    validateExport(exportData, format) {
        const result = new ValidationResult();

        if (!exportData) {
            result.addError('Export data is null or undefined');
            return result;
        }

        switch (format) {
            case 'svg':
                if (!exportData.includes('<svg')) {
                    result.addError('Invalid SVG format: missing <svg> tag');
                }
                break;
            case 'png':
            case 'jpeg':
                if (!(exportData instanceof Blob || exportData instanceof ArrayBuffer)) {
                    result.addError(`Invalid ${format.toUpperCase()} format: expected Blob or ArrayBuffer`);
                }
                break;
            case 'json':
                try {
                    if (typeof exportData === 'string') {
                        JSON.parse(exportData);
                    }
                } catch (error) {
                    result.addError('Invalid JSON format: ' + error.message);
                }
                break;
        }

        return result;
    }
}

// 单例实例
let validatorInstance = null;

/**
 * 获取验证器单例
 */
export function getDiagramValidator() {
    if (!validatorInstance) {
        validatorInstance = new DiagramValidator();
    }
    return validatorInstance;
}

/**
 * 重置验证器单例
 */
export function resetDiagramValidator() {
    validatorInstance = null;
}
