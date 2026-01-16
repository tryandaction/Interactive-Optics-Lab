/**
 * DiagramTemplateSystem.js - 专业绘图模板系统
 * 提供内置光学实验模板和自定义模板管理
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

/**
 * 生成唯一ID
 */
function generateId() {
    return 'tpl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * 模板类别
 */
export const TEMPLATE_CATEGORIES = {
    INTERFEROMETER: 'interferometer',
    SPECTROSCOPY: 'spectroscopy',
    ATOMIC_PHYSICS: 'atomic_physics',
    LASER_SYSTEM: 'laser_system',
    IMAGING: 'imaging',
    CUSTOM: 'custom'
};

/**
 * 模板类别名称映射
 */
export const CATEGORY_NAMES = {
    [TEMPLATE_CATEGORIES.INTERFEROMETER]: '干涉仪',
    [TEMPLATE_CATEGORIES.SPECTROSCOPY]: '光谱学',
    [TEMPLATE_CATEGORIES.ATOMIC_PHYSICS]: '原子物理',
    [TEMPLATE_CATEGORIES.LASER_SYSTEM]: '激光系统',
    [TEMPLATE_CATEGORIES.IMAGING]: '成像系统',
    [TEMPLATE_CATEGORIES.CUSTOM]: '自定义'
};

/**
 * 图表模板类
 */
export class DiagramTemplate {
    constructor(config = {}) {
        this.id = config.id || generateId();
        this.name = config.name || '未命名模板';
        this.description = config.description || '';
        this.category = config.category || TEMPLATE_CATEGORIES.CUSTOM;
        this.thumbnail = config.thumbnail || null;
        this.created = config.created || Date.now();
        this.modified = config.modified || Date.now();
        this.author = config.author || 'User';
        this.version = config.version || '1.0';
        
        // 模板数据
        this.components = config.components || [];
        this.rayLinks = config.rayLinks || [];
        this.labels = config.labels || [];
        this.technicalNotes = config.technicalNotes || null;
        this.groups = config.groups || [];
        
        // 布局信息
        this.canvasSize = config.canvasSize || { width: 1200, height: 800 };
        this.gridSettings = config.gridSettings || { show: true, size: 20 };
    }

    /**
     * 序列化模板
     */
    serialize() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            thumbnail: this.thumbnail,
            created: this.created,
            modified: this.modified,
            author: this.author,
            version: this.version,
            components: this.components,
            rayLinks: this.rayLinks,
            labels: this.labels,
            technicalNotes: this.technicalNotes,
            groups: this.groups,
            canvasSize: this.canvasSize,
            gridSettings: this.gridSettings
        };
    }

    /**
     * 从序列化数据创建模板
     */
    static deserialize(data) {
        return new DiagramTemplate(data);
    }

    /**
     * 克隆模板（用于实例化）
     */
    clone() {
        const cloned = new DiagramTemplate(this.serialize());
        cloned.id = generateId();
        cloned.created = Date.now();
        cloned.modified = Date.now();
        
        // 重新生成组件ID
        const idMap = new Map();
        cloned.components = cloned.components.map(comp => {
            const oldId = comp.id || comp.uuid;
            const newId = generateId();
            idMap.set(oldId, newId);
            return { ...comp, id: newId, uuid: newId };
        });
        
        // 更新链接引用
        cloned.rayLinks = cloned.rayLinks.map(link => ({
            ...link,
            id: generateId(),
            sourceComponentId: idMap.get(link.sourceComponentId) || link.sourceComponentId,
            targetComponentId: idMap.get(link.targetComponentId) || link.targetComponentId
        }));
        
        // 更新标签引用
        cloned.labels = cloned.labels.map(label => ({
            ...label,
            id: generateId(),
            targetId: idMap.get(label.targetId) || label.targetId
        }));
        
        return cloned;
    }
}

/**
 * 内置模板定义
 */
export const BUILTIN_TEMPLATES = {
    /**
     * Mach-Zehnder干涉仪
     */
    'mach-zehnder': new DiagramTemplate({
        id: 'builtin-mach-zehnder',
        name: 'Mach-Zehnder干涉仪',
        description: '经典的Mach-Zehnder干涉仪配置，用于精密测量和量子光学实验',
        category: TEMPLATE_CATEGORIES.INTERFEROMETER,
        author: 'System',
        components: [
            { id: 'mz-laser', type: 'Laser', pos: { x: 100, y: 400 }, angle: 0, params: { wavelength: 632.8 } },
            { id: 'mz-bs1', type: 'BeamSplitter', pos: { x: 300, y: 400 }, angle: 45, params: { ratio: 0.5 } },
            { id: 'mz-m1', type: 'Mirror', pos: { x: 300, y: 200 }, angle: 45 },
            { id: 'mz-m2', type: 'Mirror', pos: { x: 600, y: 400 }, angle: 135 },
            { id: 'mz-bs2', type: 'BeamSplitter', pos: { x: 600, y: 200 }, angle: 45, params: { ratio: 0.5 } },
            { id: 'mz-det1', type: 'Detector', pos: { x: 800, y: 200 }, angle: 0 },
            { id: 'mz-det2', type: 'Detector', pos: { x: 600, y: 50 }, angle: -90 }
        ],
        rayLinks: [
            { id: 'mz-link1', sourceComponentId: 'mz-laser', sourcePoint: 'output', targetComponentId: 'mz-bs1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mz-link2', sourceComponentId: 'mz-bs1', sourcePoint: 'transmitted', targetComponentId: 'mz-m2', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mz-link3', sourceComponentId: 'mz-bs1', sourcePoint: 'reflected', targetComponentId: 'mz-m1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mz-link4', sourceComponentId: 'mz-m1', sourcePoint: 'output', targetComponentId: 'mz-bs2', targetPoint: 'input-top', style: 'solid', color: '#ff0000' },
            { id: 'mz-link5', sourceComponentId: 'mz-m2', sourcePoint: 'output', targetComponentId: 'mz-bs2', targetPoint: 'input-side', style: 'solid', color: '#ff0000' },
            { id: 'mz-link6', sourceComponentId: 'mz-bs2', sourcePoint: 'transmitted', targetComponentId: 'mz-det1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mz-link7', sourceComponentId: 'mz-bs2', sourcePoint: 'reflected', targetComponentId: 'mz-det2', targetPoint: 'input', style: 'solid', color: '#ff0000' }
        ],
        labels: [
            { id: 'mz-lbl1', text: 'He-Ne Laser\nλ = 632.8 nm', position: { x: 100, y: 450 }, targetId: 'mz-laser', color: '#ffffff' },
            { id: 'mz-lbl2', text: 'BS₁ (50:50)', position: { x: 300, y: 450 }, targetId: 'mz-bs1', color: '#4fc3f7' },
            { id: 'mz-lbl3', text: 'BS₂ (50:50)', position: { x: 600, y: 250 }, targetId: 'mz-bs2', color: '#4fc3f7' },
            { id: 'mz-lbl4', text: 'M₁', position: { x: 300, y: 160 }, targetId: 'mz-m1', color: '#ffffff' },
            { id: 'mz-lbl5', text: 'M₂', position: { x: 650, y: 400 }, targetId: 'mz-m2', color: '#ffffff' },
            { id: 'mz-lbl6', text: 'D₁', position: { x: 850, y: 200 }, targetId: 'mz-det1', color: '#81c784' },
            { id: 'mz-lbl7', text: 'D₂', position: { x: 650, y: 50 }, targetId: 'mz-det2', color: '#81c784' }
        ],
        technicalNotes: {
            sections: [
                {
                    title: '干涉条件',
                    color: '#cc0000',
                    items: [
                        '相干长度 > 光程差',
                        '两臂光程差可调',
                        '输出强度: I = I₀(1 + cos(Δφ))'
                    ]
                },
                {
                    title: '应用',
                    color: '#0066cc',
                    items: [
                        '精密位移测量',
                        '折射率测量',
                        '量子光学实验'
                    ]
                }
            ]
        },
        canvasSize: { width: 1000, height: 600 }
    }),

    /**
     * 饱和吸收光谱
     */
    'saturated-absorption': new DiagramTemplate({
        id: 'builtin-saturated-absorption',
        name: '饱和吸收光谱',
        description: '用于激光频率稳定的饱和吸收光谱配置',
        category: TEMPLATE_CATEGORIES.SPECTROSCOPY,
        author: 'System',
        components: [
            { id: 'sa-laser', type: 'Laser', pos: { x: 100, y: 300 }, angle: 0, params: { wavelength: 780 } },
            { id: 'sa-isolator', type: 'OpticalIsolator', pos: { x: 200, y: 300 }, angle: 0 },
            { id: 'sa-hwp1', type: 'HalfWavePlate', pos: { x: 300, y: 300 }, angle: 22.5 },
            { id: 'sa-pbs', type: 'PolarizingBeamSplitter', pos: { x: 400, y: 300 }, angle: 0 },
            { id: 'sa-cell', type: 'VaporCell', pos: { x: 550, y: 300 }, angle: 0, params: { element: 'Rb' } },
            { id: 'sa-m1', type: 'Mirror', pos: { x: 700, y: 300 }, angle: 0 },
            { id: 'sa-qwp', type: 'QuarterWavePlate', pos: { x: 400, y: 150 }, angle: 45 },
            { id: 'sa-det', type: 'Photodiode', pos: { x: 400, y: 50 }, angle: -90 }
        ],
        rayLinks: [
            { id: 'sa-link1', sourceComponentId: 'sa-laser', sourcePoint: 'output', targetComponentId: 'sa-isolator', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'sa-link2', sourceComponentId: 'sa-isolator', sourcePoint: 'output', targetComponentId: 'sa-hwp1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'sa-link3', sourceComponentId: 'sa-hwp1', sourcePoint: 'output', targetComponentId: 'sa-pbs', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'sa-link4', sourceComponentId: 'sa-pbs', sourcePoint: 'transmitted', targetComponentId: 'sa-cell', targetPoint: 'input', style: 'solid', color: '#ff0000', label: 'Pump' },
            { id: 'sa-link5', sourceComponentId: 'sa-cell', sourcePoint: 'output', targetComponentId: 'sa-m1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'sa-link6', sourceComponentId: 'sa-m1', sourcePoint: 'output', targetComponentId: 'sa-cell', targetPoint: 'output', style: 'dashed', color: '#ff6666', label: 'Probe' },
            { id: 'sa-link7', sourceComponentId: 'sa-pbs', sourcePoint: 'reflected', targetComponentId: 'sa-qwp', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'sa-link8', sourceComponentId: 'sa-qwp', sourcePoint: 'output', targetComponentId: 'sa-det', targetPoint: 'input', style: 'solid', color: '#ff0000' }
        ],
        labels: [
            { id: 'sa-lbl1', text: 'ECDL\nλ = 780 nm', position: { x: 100, y: 360 }, targetId: 'sa-laser', color: '#ffffff' },
            { id: 'sa-lbl2', text: 'Optical\nIsolator', position: { x: 200, y: 360 }, targetId: 'sa-isolator', color: '#4fc3f7' },
            { id: 'sa-lbl3', text: 'λ/2', position: { x: 300, y: 260 }, targetId: 'sa-hwp1', color: '#ffcc00' },
            { id: 'sa-lbl4', text: 'PBS', position: { x: 400, y: 360 }, targetId: 'sa-pbs', color: '#4fc3f7' },
            { id: 'sa-lbl5', text: 'Rb Cell', position: { x: 550, y: 360 }, targetId: 'sa-cell', color: '#81c784' },
            { id: 'sa-lbl6', text: 'λ/4', position: { x: 450, y: 150 }, targetId: 'sa-qwp', color: '#ffcc00' },
            { id: 'sa-lbl7', text: 'PD', position: { x: 450, y: 50 }, targetId: 'sa-det', color: '#81c784' }
        ],
        technicalNotes: {
            sections: [
                {
                    title: '激光参数',
                    color: '#cc0000',
                    items: [
                        'λ = 780.241 nm (⁸⁷Rb D₂)',
                        '线宽 < 1 MHz',
                        '功率 ~ 10 mW'
                    ]
                },
                {
                    title: '气室参数',
                    color: '#0066cc',
                    items: [
                        '天然丰度 Rb',
                        '温度: 室温',
                        '长度: 75 mm'
                    ]
                }
            ]
        },
        canvasSize: { width: 900, height: 500 }
    }),

    /**
     * 磁光阱 (MOT)
     */
    'magneto-optical-trap': new DiagramTemplate({
        id: 'builtin-mot',
        name: '磁光阱 (MOT)',
        description: '三维磁光阱配置，用于冷原子实验',
        category: TEMPLATE_CATEGORIES.ATOMIC_PHYSICS,
        author: 'System',
        components: [
            { id: 'mot-laser', type: 'Laser', pos: { x: 100, y: 400 }, angle: 0, params: { wavelength: 780 } },
            { id: 'mot-aom', type: 'AOM', pos: { x: 250, y: 400 }, angle: 0, params: { frequency: 80, shift: -1 } },
            { id: 'mot-fiber', type: 'FiberCoupler', pos: { x: 400, y: 400 }, angle: 0 },
            { id: 'mot-collimator', type: 'Collimator', pos: { x: 550, y: 400 }, angle: 0 },
            { id: 'mot-hwp', type: 'HalfWavePlate', pos: { x: 650, y: 400 }, angle: 22.5 },
            { id: 'mot-pbs', type: 'PolarizingBeamSplitter', pos: { x: 750, y: 400 }, angle: 0 },
            { id: 'mot-qwp1', type: 'QuarterWavePlate', pos: { x: 850, y: 400 }, angle: 45 },
            { id: 'mot-chamber', type: 'VacuumChamber', pos: { x: 950, y: 300 }, angle: 0 },
            { id: 'mot-qwp2', type: 'QuarterWavePlate', pos: { x: 750, y: 200 }, angle: 45 },
            { id: 'mot-m1', type: 'Mirror', pos: { x: 750, y: 100 }, angle: 45 },
            { id: 'mot-coils', type: 'AntiHelmholtzCoils', pos: { x: 950, y: 300 }, angle: 0 }
        ],
        rayLinks: [
            { id: 'mot-link1', sourceComponentId: 'mot-laser', sourcePoint: 'output', targetComponentId: 'mot-aom', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link2', sourceComponentId: 'mot-aom', sourcePoint: 'order1', targetComponentId: 'mot-fiber', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link3', sourceComponentId: 'mot-fiber', sourcePoint: 'output', targetComponentId: 'mot-collimator', targetPoint: 'input', style: 'dashed', color: '#ff6666' },
            { id: 'mot-link4', sourceComponentId: 'mot-collimator', sourcePoint: 'output', targetComponentId: 'mot-hwp', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link5', sourceComponentId: 'mot-hwp', sourcePoint: 'output', targetComponentId: 'mot-pbs', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link6', sourceComponentId: 'mot-pbs', sourcePoint: 'transmitted', targetComponentId: 'mot-qwp1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link7', sourceComponentId: 'mot-qwp1', sourcePoint: 'output', targetComponentId: 'mot-chamber', targetPoint: 'input-x', style: 'solid', color: '#ff0000', label: 'σ⁺' },
            { id: 'mot-link8', sourceComponentId: 'mot-pbs', sourcePoint: 'reflected', targetComponentId: 'mot-qwp2', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'mot-link9', sourceComponentId: 'mot-qwp2', sourcePoint: 'output', targetComponentId: 'mot-m1', targetPoint: 'input', style: 'solid', color: '#ff0000' }
        ],
        labels: [
            { id: 'mot-lbl1', text: 'Cooling Laser\nλ = 780 nm', position: { x: 100, y: 460 }, targetId: 'mot-laser', color: '#ffffff' },
            { id: 'mot-lbl2', text: 'AOM\nf = 80 MHz\nΔ = -Γ', position: { x: 250, y: 460 }, targetId: 'mot-aom', color: '#ff6b6b' },
            { id: 'mot-lbl3', text: 'PM Fiber', position: { x: 400, y: 460 }, targetId: 'mot-fiber', color: '#4fc3f7' },
            { id: 'mot-lbl4', text: 'λ/2', position: { x: 650, y: 360 }, targetId: 'mot-hwp', color: '#ffcc00' },
            { id: 'mot-lbl5', text: 'PBS', position: { x: 750, y: 460 }, targetId: 'mot-pbs', color: '#4fc3f7' },
            { id: 'mot-lbl6', text: 'λ/4', position: { x: 850, y: 360 }, targetId: 'mot-qwp1', color: '#ffcc00' },
            { id: 'mot-lbl7', text: 'MOT\nChamber', position: { x: 1000, y: 300 }, targetId: 'mot-chamber', color: '#81c784' },
            { id: 'mot-lbl8', text: 'Anti-Helmholtz\nCoils', position: { x: 1050, y: 350 }, targetId: 'mot-coils', color: '#ba68c8' }
        ],
        technicalNotes: {
            sections: [
                {
                    title: '冷却光参数',
                    color: '#cc0000',
                    items: [
                        'λ = 780.241 nm (⁸⁷Rb D₂)',
                        'Δ = -Γ ≈ -6 MHz',
                        'I ≈ Isat per beam',
                        '光束直径 ~ 25 mm'
                    ]
                },
                {
                    title: '磁场参数',
                    color: '#0066cc',
                    items: [
                        '梯度: ~10 G/cm',
                        '零点位于腔室中心'
                    ]
                },
                {
                    title: '预期性能',
                    color: '#009900',
                    items: [
                        '原子数: ~10⁸',
                        '温度: ~100 μK',
                        '密度: ~10¹⁰ cm⁻³'
                    ]
                }
            ]
        },
        canvasSize: { width: 1200, height: 600 }
    }),

    /**
     * 双缝干涉
     */
    'double-slit': new DiagramTemplate({
        id: 'builtin-double-slit',
        name: '双缝干涉',
        description: '经典双缝干涉实验配置',
        category: TEMPLATE_CATEGORIES.INTERFEROMETER,
        author: 'System',
        components: [
            { id: 'ds-laser', type: 'Laser', pos: { x: 100, y: 300 }, angle: 0 },
            { id: 'ds-lens1', type: 'Lens', pos: { x: 250, y: 300 }, angle: 0, params: { focalLength: 50 } },
            { id: 'ds-pinhole', type: 'Pinhole', pos: { x: 350, y: 300 }, angle: 0 },
            { id: 'ds-lens2', type: 'Lens', pos: { x: 450, y: 300 }, angle: 0, params: { focalLength: 100 } },
            { id: 'ds-slit', type: 'DoubleSlit', pos: { x: 600, y: 300 }, angle: 0, params: { separation: 0.5, width: 0.1 } },
            { id: 'ds-screen', type: 'Screen', pos: { x: 900, y: 300 }, angle: 0 }
        ],
        rayLinks: [
            { id: 'ds-link1', sourceComponentId: 'ds-laser', sourcePoint: 'output', targetComponentId: 'ds-lens1', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'ds-link2', sourceComponentId: 'ds-lens1', sourcePoint: 'output', targetComponentId: 'ds-pinhole', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'ds-link3', sourceComponentId: 'ds-pinhole', sourcePoint: 'output', targetComponentId: 'ds-lens2', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'ds-link4', sourceComponentId: 'ds-lens2', sourcePoint: 'output', targetComponentId: 'ds-slit', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'ds-link5', sourceComponentId: 'ds-slit', sourcePoint: 'output1', targetComponentId: 'ds-screen', targetPoint: 'input', style: 'solid', color: '#ff0000' },
            { id: 'ds-link6', sourceComponentId: 'ds-slit', sourcePoint: 'output2', targetComponentId: 'ds-screen', targetPoint: 'input', style: 'solid', color: '#ff0000' }
        ],
        labels: [
            { id: 'ds-lbl1', text: 'Laser', position: { x: 100, y: 360 }, targetId: 'ds-laser', color: '#ffffff' },
            { id: 'ds-lbl2', text: 'Spatial Filter', position: { x: 300, y: 360 }, color: '#4fc3f7' },
            { id: 'ds-lbl3', text: 'Collimating\nLens', position: { x: 450, y: 360 }, targetId: 'ds-lens2', color: '#4fc3f7' },
            { id: 'ds-lbl4', text: 'Double Slit\nd = 0.5 mm', position: { x: 600, y: 360 }, targetId: 'ds-slit', color: '#ffcc00' },
            { id: 'ds-lbl5', text: 'Screen', position: { x: 900, y: 360 }, targetId: 'ds-screen', color: '#81c784' }
        ],
        technicalNotes: {
            sections: [
                {
                    title: '干涉条纹',
                    color: '#cc0000',
                    items: [
                        '条纹间距: Δy = λL/d',
                        'L: 缝到屏距离',
                        'd: 缝间距'
                    ]
                }
            ]
        },
        canvasSize: { width: 1100, height: 500 }
    })
};


/**
 * 模板管理器类
 */
export class DiagramTemplateManager {
    constructor() {
        this.templates = new Map();
        this.customTemplates = new Map();
        this.listeners = [];
        
        // 加载内置模板
        this._loadBuiltinTemplates();
    }

    /**
     * 加载内置模板
     * @private
     */
    _loadBuiltinTemplates() {
        Object.entries(BUILTIN_TEMPLATES).forEach(([key, template]) => {
            this.templates.set(template.id, template);
        });
    }

    /**
     * 获取所有模板
     */
    getAllTemplates() {
        return [...this.templates.values(), ...this.customTemplates.values()];
    }

    /**
     * 获取内置模板
     */
    getBuiltinTemplates() {
        return Array.from(this.templates.values());
    }

    /**
     * 获取自定义模板
     */
    getCustomTemplates() {
        return Array.from(this.customTemplates.values());
    }

    /**
     * 按类别获取模板
     */
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(t => t.category === category);
    }

    /**
     * 获取模板
     */
    getTemplate(id) {
        return this.templates.get(id) || this.customTemplates.get(id);
    }

    /**
     * 搜索模板
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        return this.getAllTemplates().filter(t => 
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 添加自定义模板
     */
    addCustomTemplate(template) {
        if (!(template instanceof DiagramTemplate)) {
            template = new DiagramTemplate(template);
        }
        template.category = TEMPLATE_CATEGORIES.CUSTOM;
        this.customTemplates.set(template.id, template);
        this._notifyListeners('add', template);
        return template;
    }

    /**
     * 从当前场景创建模板
     */
    createTemplateFromScene(name, description, sceneData) {
        const template = new DiagramTemplate({
            name,
            description,
            category: TEMPLATE_CATEGORIES.CUSTOM,
            components: sceneData.components || [],
            rayLinks: sceneData.rayLinks || [],
            labels: sceneData.labels || [],
            technicalNotes: sceneData.technicalNotes || null,
            groups: sceneData.groups || [],
            canvasSize: sceneData.canvasSize || { width: 1200, height: 800 }
        });
        
        return this.addCustomTemplate(template);
    }

    /**
     * 删除自定义模板
     */
    deleteCustomTemplate(id) {
        const template = this.customTemplates.get(id);
        if (template) {
            this.customTemplates.delete(id);
            this._notifyListeners('delete', template);
            return true;
        }
        return false;
    }

    /**
     * 更新自定义模板
     */
    updateCustomTemplate(id, updates) {
        const template = this.customTemplates.get(id);
        if (template) {
            Object.assign(template, updates);
            template.modified = Date.now();
            this._notifyListeners('update', template);
            return template;
        }
        return null;
    }

    /**
     * 实例化模板（创建可编辑副本）
     */
    instantiateTemplate(id) {
        const template = this.getTemplate(id);
        if (!template) return null;
        
        return template.clone();
    }

    /**
     * 导出模板为JSON
     */
    exportTemplate(id) {
        const template = this.getTemplate(id);
        if (!template) return null;
        
        return JSON.stringify(template.serialize(), null, 2);
    }

    /**
     * 导入模板
     */
    importTemplate(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const template = DiagramTemplate.deserialize(data);
            template.id = generateId(); // 生成新ID避免冲突
            template.category = TEMPLATE_CATEGORIES.CUSTOM;
            return this.addCustomTemplate(template);
        } catch (e) {
            console.error('DiagramTemplateManager: Failed to import template', e);
            return null;
        }
    }

    /**
     * 保存自定义模板到本地存储
     */
    saveToLocalStorage() {
        try {
            const data = Array.from(this.customTemplates.values()).map(t => t.serialize());
            localStorage.setItem('diagram-custom-templates', JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('DiagramTemplateManager: Failed to save to localStorage', e);
            return false;
        }
    }

    /**
     * 从本地存储加载自定义模板
     */
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('diagram-custom-templates');
            if (data) {
                const templates = JSON.parse(data);
                templates.forEach(t => {
                    const template = DiagramTemplate.deserialize(t);
                    this.customTemplates.set(template.id, template);
                });
            }
            return true;
        } catch (e) {
            console.error('DiagramTemplateManager: Failed to load from localStorage', e);
            return false;
        }
    }

    /**
     * 添加监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            const idx = this.listeners.indexOf(callback);
            if (idx !== -1) this.listeners.splice(idx, 1);
        };
    }

    /**
     * 通知监听器
     * @private
     */
    _notifyListeners(action, template) {
        this.listeners.forEach(cb => cb(action, template));
    }

    /**
     * 获取类别列表
     */
    getCategories() {
        return Object.entries(CATEGORY_NAMES).map(([key, name]) => ({
            key,
            name,
            count: this.getTemplatesByCategory(key).length
        }));
    }
}

/**
 * 模板浏览器面板
 */
export class TemplateBrowserPanel {
    constructor(options = {}) {
        this.manager = options.manager || getDiagramTemplateManager();
        this.onSelect = options.onSelect || (() => {});
        this.onApply = options.onApply || (() => {});
        
        this.panel = null;
        this.selectedTemplate = null;
        this.currentCategory = null;
        this.searchQuery = '';
    }

    /**
     * 打开面板
     */
    open() {
        if (this.panel) {
            this.close();
            return;
        }
        
        this._createPanel();
        this._renderTemplates();
    }

    /**
     * 关闭面板
     */
    close() {
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }
    }

    /**
     * 切换面板
     */
    toggle() {
        if (this.panel) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * 创建面板
     * @private
     */
    _createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'template-browser-panel';
        this.panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            max-width: 90vw;
            max-height: 80vh;
            background: var(--panel-bg, #1e1e1e);
            border: 1px solid var(--border-color, #333);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            z-index: 10005;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        this.panel.innerHTML = `
            <div class="template-browser-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
            ">
                <h3 style="margin: 0; font-size: 16px; color: var(--text-primary, #fff);">模板库</h3>
                <button class="template-browser-close" style="
                    background: none;
                    border: none;
                    font-size: 20px;
                    color: var(--text-secondary, #888);
                    cursor: pointer;
                ">&times;</button>
            </div>
            <div class="template-browser-toolbar" style="
                display: flex;
                gap: 12px;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #333);
            ">
                <input type="text" class="template-search" placeholder="搜索模板..." style="
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    background: var(--input-bg, #2d2d2d);
                    color: var(--text-primary, #fff);
                    font-size: 13px;
                ">
                <select class="template-category-filter" style="
                    padding: 8px 12px;
                    border: 1px solid var(--border-color, #444);
                    border-radius: 4px;
                    background: var(--input-bg, #2d2d2d);
                    color: var(--text-primary, #fff);
                    font-size: 13px;
                ">
                    <option value="">所有类别</option>
                    ${Object.entries(CATEGORY_NAMES).map(([key, name]) => 
                        `<option value="${key}">${name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="template-browser-content" style="
                display: flex;
                flex: 1;
                overflow: hidden;
            ">
                <div class="template-list" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 12px;
                    align-content: start;
                "></div>
                <div class="template-preview" style="
                    width: 300px;
                    border-left: 1px solid var(--border-color, #333);
                    padding: 16px;
                    overflow-y: auto;
                    display: none;
                "></div>
            </div>
            <div class="template-browser-footer" style="
                display: flex;
                justify-content: space-between;
                padding: 12px 16px;
                border-top: 1px solid var(--border-color, #333);
            ">
                <div>
                    <button class="template-import-btn" style="
                        padding: 8px 16px;
                        border: 1px solid var(--border-color, #444);
                        border-radius: 4px;
                        background: transparent;
                        color: var(--text-primary, #fff);
                        cursor: pointer;
                        font-size: 13px;
                    ">导入模板</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="template-cancel-btn" style="
                        padding: 8px 16px;
                        border: 1px solid var(--border-color, #444);
                        border-radius: 4px;
                        background: transparent;
                        color: var(--text-primary, #fff);
                        cursor: pointer;
                        font-size: 13px;
                    ">取消</button>
                    <button class="template-apply-btn" style="
                        padding: 8px 16px;
                        border: none;
                        border-radius: 4px;
                        background: var(--accent-color, #0078d4);
                        color: #fff;
                        cursor: pointer;
                        font-size: 13px;
                        opacity: 0.5;
                    " disabled>应用模板</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);
        this._bindEvents();
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 关闭按钮
        this.panel.querySelector('.template-browser-close')?.addEventListener('click', () => this.close());
        this.panel.querySelector('.template-cancel-btn')?.addEventListener('click', () => this.close());

        // 搜索
        this.panel.querySelector('.template-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this._renderTemplates();
        });

        // 类别筛选
        this.panel.querySelector('.template-category-filter')?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value || null;
            this._renderTemplates();
        });

        // 应用按钮
        this.panel.querySelector('.template-apply-btn')?.addEventListener('click', () => {
            if (this.selectedTemplate) {
                const instance = this.manager.instantiateTemplate(this.selectedTemplate.id);
                if (instance) {
                    this.onApply(instance);
                    this.close();
                }
            }
        });

        // 导入按钮
        this.panel.querySelector('.template-import-btn')?.addEventListener('click', () => {
            this._showImportDialog();
        });
    }

    /**
     * 渲染模板列表
     * @private
     */
    _renderTemplates() {
        const list = this.panel?.querySelector('.template-list');
        if (!list) return;

        let templates = this.manager.getAllTemplates();

        // 应用类别筛选
        if (this.currentCategory) {
            templates = templates.filter(t => t.category === this.currentCategory);
        }

        // 应用搜索
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            templates = templates.filter(t => 
                t.name.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        list.innerHTML = templates.map(template => `
            <div class="template-card" data-id="${template.id}" style="
                padding: 12px;
                border: 1px solid var(--border-color, #444);
                border-radius: 6px;
                background: var(--item-bg, #252526);
                cursor: pointer;
                transition: all 0.2s;
            ">
                <div class="template-thumbnail" style="
                    height: 100px;
                    background: var(--thumbnail-bg, #1a1a1a);
                    border-radius: 4px;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-secondary, #666);
                    font-size: 12px;
                ">${template.thumbnail ? `<img src="${template.thumbnail}" style="max-width: 100%; max-height: 100%;">` : '预览'}</div>
                <div class="template-name" style="
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary, #fff);
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                ">${template.name}</div>
                <div class="template-category" style="
                    font-size: 11px;
                    color: var(--text-secondary, #888);
                ">${CATEGORY_NAMES[template.category] || template.category}</div>
            </div>
        `).join('');

        // 绑定卡片点击事件
        list.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                this._selectTemplate(id);
                
                // 更新选中状态
                list.querySelectorAll('.template-card').forEach(c => {
                    c.style.borderColor = 'var(--border-color, #444)';
                });
                card.style.borderColor = 'var(--accent-color, #0078d4)';
            });
        });
    }

    /**
     * 选择模板
     * @private
     */
    _selectTemplate(id) {
        const template = this.manager.getTemplate(id);
        if (!template) return;

        this.selectedTemplate = template;
        this.onSelect(template);

        // 显示预览
        const preview = this.panel?.querySelector('.template-preview');
        if (preview) {
            preview.style.display = 'block';
            preview.innerHTML = `
                <h4 style="margin: 0 0 12px 0; font-size: 14px; color: var(--text-primary, #fff);">${template.name}</h4>
                <p style="margin: 0 0 12px 0; font-size: 12px; color: var(--text-secondary, #888);">${template.description}</p>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: var(--text-secondary, #666);">类别: </span>
                    <span style="font-size: 11px; color: var(--text-primary, #fff);">${CATEGORY_NAMES[template.category]}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: var(--text-secondary, #666);">组件数: </span>
                    <span style="font-size: 11px; color: var(--text-primary, #fff);">${template.components.length}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: var(--text-secondary, #666);">链接数: </span>
                    <span style="font-size: 11px; color: var(--text-primary, #fff);">${template.rayLinks.length}</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <span style="font-size: 11px; color: var(--text-secondary, #666);">作者: </span>
                    <span style="font-size: 11px; color: var(--text-primary, #fff);">${template.author}</span>
                </div>
                ${template.technicalNotes ? `
                    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-color, #333);">
                        <h5 style="margin: 0 0 8px 0; font-size: 12px; color: var(--text-secondary, #888);">技术说明</h5>
                        ${template.technicalNotes.sections?.map(section => `
                            <div style="margin-bottom: 8px;">
                                <div style="font-size: 11px; color: ${section.color}; font-weight: 500;">${section.title}</div>
                                <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 10px; color: var(--text-secondary, #888);">
                                    ${section.items.slice(0, 2).map(item => `<li>${item}</li>`).join('')}
                                    ${section.items.length > 2 ? `<li>...</li>` : ''}
                                </ul>
                            </div>
                        `).join('') || ''}
                    </div>
                ` : ''}
            `;
        }

        // 启用应用按钮
        const applyBtn = this.panel?.querySelector('.template-apply-btn');
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.style.opacity = '1';
        }
    }

    /**
     * 显示导入对话框
     * @private
     */
    _showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const template = this.manager.importTemplate(event.target.result);
                    if (template) {
                        this._renderTemplates();
                        console.log('Template imported:', template.name);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
}

// 单例
let templateManagerInstance = null;

export function getDiagramTemplateManager() {
    if (!templateManagerInstance) {
        templateManagerInstance = new DiagramTemplateManager();
        templateManagerInstance.loadFromLocalStorage();
    }
    return templateManagerInstance;
}

export function resetDiagramTemplateManager() {
    if (templateManagerInstance) {
        templateManagerInstance.saveToLocalStorage();
    }
    templateManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagramTemplateManager = DiagramTemplateManager;
    window.DiagramTemplate = DiagramTemplate;
    window.getDiagramTemplateManager = getDiagramTemplateManager;
    window.TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES;
    window.BUILTIN_TEMPLATES = BUILTIN_TEMPLATES;
}
