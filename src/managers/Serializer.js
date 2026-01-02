/**
 * Serializer.js - 场景数据序列化/反序列化器
 * 负责将画布组件转换为JSON格式，以及从JSON恢复组件
 */

export class Serializer {
    static CURRENT_VERSION = '2.0.0';
    
    // 支持的旧版本列表（用于迁移）
    static SUPPORTED_VERSIONS = ['1.0', '1.1', '2.0.0'];

    /**
     * 序列化场景数据
     * @param {Array} components - 画布上的组件数组
     * @param {Object} settings - 模拟设置
     * @param {Object} metadata - 可选的元数据
     * @returns {string} 格式化的JSON字符串
     */
    static serialize(components, settings = {}, metadata = {}) {
        const sceneData = {
            version: this.CURRENT_VERSION,
            name: metadata.name || '未命名场景',
            components: [],
            settings: this.serializeSettings(settings),
            metadata: {
                createdAt: metadata.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...metadata
            }
        };

        // 序列化每个组件
        if (Array.isArray(components)) {
            components.forEach(comp => {
                try {
                    const compData = this.serializeComponent(comp);
                    if (compData) {
                        sceneData.components.push(compData);
                    }
                } catch (e) {
                    console.error(`Error serializing component ${comp?.label} (${comp?.id}):`, e);
                }
            });
        }

        // 使用2空格缩进格式化JSON，便于Git diff
        return JSON.stringify(sceneData, null, 2);
    }

    /**
     * 序列化单个组件
     * @param {Object} component - 组件对象
     * @returns {Object} 组件数据对象
     */
    static serializeComponent(component) {
        if (!component) return null;

        // 优先使用组件自带的toJSON方法
        if (typeof component.toJSON === 'function') {
            const data = component.toJSON();
            // 确保包含必要字段
            return {
                type: data.type || component.constructor?.name || 'Unknown',
                id: data.id || component.id,
                x: data.posX ?? component.pos?.x ?? 0,
                y: data.posY ?? component.pos?.y ?? 0,
                angle: data.angleDeg ?? (component.angleRad ? component.angleRad * (180 / Math.PI) : 0),
                properties: this.extractProperties(data, component),
                // 保留原始数据以确保兼容性
                _raw: data
            };
        }

        // 回退：手动提取基本属性
        return {
            type: component.constructor?.name || 'Unknown',
            id: component.id,
            x: component.pos?.x ?? 0,
            y: component.pos?.y ?? 0,
            angle: component.angleRad ? component.angleRad * (180 / Math.PI) : 0,
            properties: {},
            _raw: null
        };
    }

    /**
     * 从组件数据中提取属性
     * @param {Object} data - toJSON返回的数据
     * @param {Object} component - 原始组件
     * @returns {Object} 属性对象
     */
    static extractProperties(data, component) {
        const properties = {};
        const excludeKeys = ['type', 'id', 'posX', 'posY', 'angleDeg', 'label', 'notes', 
                           'userId', 'lastEditedBy', 'lastEditedAt', 'version'];
        
        for (const key in data) {
            if (!excludeKeys.includes(key) && data.hasOwnProperty(key)) {
                properties[key] = data[key];
            }
        }

        // 添加label和notes
        if (data.label) properties.label = data.label;
        if (data.notes) properties.notes = data.notes;

        return properties;
    }

    /**
     * 序列化设置
     * @param {Object} settings - 设置对象
     * @returns {Object} 序列化的设置
     */
    static serializeSettings(settings) {
        return {
            mode: settings.mode || settings.currentMode || 'ray_trace',
            maxRays: settings.maxRays ?? settings.maxRaysPerSource ?? 100,
            maxBounces: settings.maxBounces ?? settings.globalMaxBounces ?? 50,
            minIntensity: settings.minIntensity ?? settings.globalMinIntensity ?? 0.001,
            showGrid: settings.showGrid ?? true,
            showArrows: settings.showArrows ?? settings.globalShowArrows ?? false,
            arrowSpeed: settings.arrowSpeed ?? settings.arrowAnimationSpeed ?? 100,
            fastWhiteLightMode: settings.fastWhiteLightMode ?? false
        };
    }

    /**
     * 反序列化场景数据
     * @param {string} json - JSON字符串
     * @returns {Object} 场景数据对象
     */
    static deserialize(json) {
        let data;
        
        try {
            data = typeof json === 'string' ? JSON.parse(json) : json;
        } catch (e) {
            throw new Error(`Invalid JSON format: ${e.message}`);
        }

        // 验证数据格式
        if (!this.validate(data)) {
            throw new Error('Invalid scene data format');
        }

        // 检查是否需要迁移
        if (this.needsMigration(data)) {
            data = this.migrate(data);
        }

        return {
            version: data.version,
            name: data.name || '未命名场景',
            components: this.deserializeComponents(data.components || []),
            settings: this.deserializeSettings(data.settings || data),
            metadata: data.metadata || {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * 反序列化组件数组
     * @param {Array} componentsData - 组件数据数组
     * @returns {Array} 组件数据数组（用于创建组件）
     */
    static deserializeComponents(componentsData) {
        return componentsData.map(compData => {
            return this.deserializeComponent(compData);
        }).filter(c => c !== null);
    }

    /**
     * 反序列化单个组件
     * @param {Object} compData - 组件数据
     * @returns {Object} 标准化的组件数据
     */
    static deserializeComponent(compData) {
        if (!compData) return null;

        // 处理新格式（2.0.0）- 有 _raw 字段
        if (compData._raw) {
            return {
                ...compData._raw,
                type: compData.type,
                id: compData.id,
                posX: compData.x ?? compData._raw.posX ?? 0,
                posY: compData.y ?? compData._raw.posY ?? 0,
                angleDeg: compData.angle ?? compData._raw.angleDeg ?? 0,
                ...compData.properties
            };
        }

        // 处理旧格式（1.0, 1.1）或直接保存的格式
        return {
            type: compData.type,
            id: compData.id,
            posX: compData.posX ?? compData.x ?? 0,
            posY: compData.posY ?? compData.y ?? 0,
            angleDeg: compData.angleDeg ?? compData.angle ?? 0,
            label: compData.label,
            notes: compData.notes,
            // 保留所有其他属性
            ...compData
        };
    }

    /**
     * 反序列化设置
     * @param {Object} settings - 设置数据
     * @returns {Object} 标准化的设置
     */
    static deserializeSettings(settings) {
        return {
            mode: settings.mode || settings.currentMode || 'ray_trace',
            maxRays: settings.maxRays ?? settings.maxRaysPerSource ?? 100,
            maxBounces: settings.maxBounces ?? settings.globalMaxBounces ?? 50,
            minIntensity: settings.minIntensity ?? settings.globalMinIntensity ?? 0.001,
            showGrid: settings.showGrid ?? true,
            showArrows: settings.showArrows ?? settings.globalShowArrows ?? false,
            arrowSpeed: settings.arrowSpeed ?? settings.arrowAnimationSpeed ?? 100,
            fastWhiteLightMode: settings.fastWhiteLightMode ?? false
        };
    }

    /**
     * 验证场景数据格式
     * @param {Object} data - 待验证的数据
     * @returns {boolean} 是否有效
     */
    static validate(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // 检查版本号（旧版本可能没有version字段）
        if (data.version && !this.SUPPORTED_VERSIONS.includes(data.version)) {
            console.warn(`Unknown scene version: ${data.version}`);
            // 仍然尝试加载，但发出警告
        }

        // 检查组件数组
        if (data.components !== undefined && !Array.isArray(data.components)) {
            return false;
        }

        // 验证每个组件的基本结构
        if (data.components && Array.isArray(data.components)) {
            for (const comp of data.components) {
                if (!comp || typeof comp !== 'object') {
                    return false;
                }
                // 组件必须有type字段
                if (!comp.type) {
                    console.warn('Component missing type field:', comp);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 详细验证并返回错误信息
     * @param {Object} data - 待验证的数据
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    static validateWithErrors(data) {
        const errors = [];

        if (!data || typeof data !== 'object') {
            errors.push('Data must be a non-null object');
            return { valid: false, errors };
        }

        if (data.components !== undefined && !Array.isArray(data.components)) {
            errors.push('Components must be an array');
        }

        if (data.components && Array.isArray(data.components)) {
            data.components.forEach((comp, index) => {
                if (!comp || typeof comp !== 'object') {
                    errors.push(`Component at index ${index} is invalid`);
                } else if (!comp.type) {
                    errors.push(`Component at index ${index} is missing type field`);
                }
            });
        }

        if (data.settings && typeof data.settings !== 'object') {
            errors.push('Settings must be an object');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 检查是否需要版本迁移
     * @param {Object} data - 场景数据
     * @returns {boolean} 是否需要迁移
     */
    static needsMigration(data) {
        if (!data.version) return true;
        return data.version !== this.CURRENT_VERSION;
    }

    /**
     * 迁移旧版本数据到当前版本
     * @param {Object} data - 旧版本数据
     * @returns {Object} 迁移后的数据
     */
    static migrate(data) {
        let migratedData = { ...data };
        const version = data.version || '1.0';

        console.log(`Migrating scene data from version ${version} to ${this.CURRENT_VERSION}`);

        // 从1.0迁移
        if (version === '1.0' || !version) {
            migratedData = this.migrateFrom1_0(migratedData);
        }

        // 从1.1迁移
        if (version === '1.1' || migratedData.version === '1.1') {
            migratedData = this.migrateFrom1_1(migratedData);
        }

        migratedData.version = this.CURRENT_VERSION;
        return migratedData;
    }

    /**
     * 从1.0版本迁移
     */
    static migrateFrom1_0(data) {
        // 1.0版本没有settings对象，需要创建
        if (!data.settings) {
            data.settings = {
                mode: data.currentMode || 'ray_trace',
                maxRays: 100,
                maxBounces: 50,
                minIntensity: 0.001,
                showGrid: true,
                showArrows: false
            };
        }

        // 添加metadata
        if (!data.metadata) {
            data.metadata = {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        data.version = '1.1';
        return data;
    }

    /**
     * 从1.1版本迁移
     */
    static migrateFrom1_1(data) {
        // 1.1到2.0的主要变化：组件格式标准化
        if (data.components && Array.isArray(data.components)) {
            data.components = data.components.map(comp => {
                // 确保所有组件都有标准字段
                return {
                    ...comp,
                    x: comp.posX ?? comp.x,
                    y: comp.posY ?? comp.y,
                    angle: comp.angleDeg ?? comp.angle ?? 0
                };
            });
        }

        // 确保有name字段
        if (!data.name) {
            data.name = '未命名场景';
        }

        data.version = '2.0.0';
        return data;
    }

    /**
     * 创建空场景数据
     * @param {string} name - 场景名称
     * @returns {Object} 空场景数据
     */
    static createEmptyScene(name = '未命名场景') {
        return {
            version: this.CURRENT_VERSION,
            name: name,
            components: [],
            settings: {
                mode: 'ray_trace',
                maxRays: 100,
                maxBounces: 50,
                minIntensity: 0.001,
                showGrid: true,
                showArrows: false,
                arrowSpeed: 100,
                fastWhiteLightMode: false
            },
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * 比较两个场景是否等价（用于测试）
     * @param {Object} scene1 - 场景1
     * @param {Object} scene2 - 场景2
     * @returns {boolean} 是否等价
     */
    static areEquivalent(scene1, scene2) {
        // 比较组件数量
        if (scene1.components?.length !== scene2.components?.length) {
            return false;
        }

        // 比较每个组件
        for (let i = 0; i < scene1.components.length; i++) {
            const c1 = scene1.components[i];
            const c2 = scene2.components[i];

            if (c1.type !== c2.type) return false;
            if (Math.abs((c1.x ?? c1.posX) - (c2.x ?? c2.posX)) > 0.001) return false;
            if (Math.abs((c1.y ?? c1.posY) - (c2.y ?? c2.posY)) > 0.001) return false;
            if (Math.abs((c1.angle ?? c1.angleDeg) - (c2.angle ?? c2.angleDeg)) > 0.001) return false;
        }

        // 比较设置
        const s1 = scene1.settings || {};
        const s2 = scene2.settings || {};
        if (s1.mode !== s2.mode) return false;
        if (s1.showGrid !== s2.showGrid) return false;

        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Serializer = Serializer;
}
