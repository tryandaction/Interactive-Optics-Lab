/**
 * Toolbar.js - 工具栏管理器
 * 负责管理工具栏按钮和组件选择
 */

/**
 * 工具栏管理器类
 * 管理工具栏按钮状态和组件选择
 */
export class Toolbar {
    /**
     * @param {HTMLElement} container - 工具栏容器元素
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        /** @type {HTMLElement} */
        this.container = container;
        /** @type {string|null} 当前选中的组件类型 */
        this.selectedTool = null;
        /** @type {Function} 工具选择回调 */
        this.onToolSelect = options.onToolSelect || null;
        /** @type {Map} 按钮映射 */
        this.buttons = new Map();
    }

    /**
     * 初始化工具栏
     * @param {Array} toolGroups - 工具组配置数组
     */
    init(toolGroups) {
        toolGroups.forEach(group => {
            if (group.label) {
                const groupLabel = document.createElement('div');
                groupLabel.className = 'toolbar-group-label';
                groupLabel.textContent = group.label;
                this.container.appendChild(groupLabel);
            }

            const groupContainer = document.createElement('div');
            groupContainer.className = 'toolbar-group';

            group.tools.forEach(tool => {
                const button = this._createToolButton(tool);
                groupContainer.appendChild(button);
                this.buttons.set(tool.type, button);
            });

            this.container.appendChild(groupContainer);
        });
    }

    /**
     * 创建工具按钮
     * @private
     */
    _createToolButton(tool) {
        const button = document.createElement('button');
        button.className = 'toolbar-btn';
        button.dataset.tool = tool.type;
        button.title = tool.tooltip || tool.label;

        if (tool.icon) {
            const icon = document.createElement('span');
            icon.className = 'toolbar-icon';
            icon.innerHTML = tool.icon;
            button.appendChild(icon);
        }

        const label = document.createElement('span');
        label.className = 'toolbar-label';
        label.textContent = tool.label;
        button.appendChild(label);

        button.onclick = () => this.selectTool(tool.type);

        return button;
    }

    /**
     * 选择工具
     * @param {string} toolType - 工具类型
     */
    selectTool(toolType) {
        // 取消之前的选择
        if (this.selectedTool) {
            const prevButton = this.buttons.get(this.selectedTool);
            if (prevButton) {
                prevButton.classList.remove('active');
            }
        }

        // 如果点击同一个工具，取消选择
        if (this.selectedTool === toolType) {
            this.selectedTool = null;
            if (this.onToolSelect) {
                this.onToolSelect(null);
            }
            return;
        }

        // 选择新工具
        this.selectedTool = toolType;
        const button = this.buttons.get(toolType);
        if (button) {
            button.classList.add('active');
        }

        if (this.onToolSelect) {
            this.onToolSelect(toolType);
        }
    }

    /**
     * 清除工具选择
     */
    clearSelection() {
        if (this.selectedTool) {
            const button = this.buttons.get(this.selectedTool);
            if (button) {
                button.classList.remove('active');
            }
            this.selectedTool = null;
        }
    }

    /**
     * 获取当前选中的工具
     * @returns {string|null} 工具类型
     */
    getSelectedTool() {
        return this.selectedTool;
    }

    /**
     * 启用/禁用工具
     * @param {string} toolType - 工具类型
     * @param {boolean} enabled - 是否启用
     */
    setToolEnabled(toolType, enabled) {
        const button = this.buttons.get(toolType);
        if (button) {
            button.disabled = !enabled;
        }
    }

    /**
     * 显示/隐藏工具
     * @param {string} toolType - 工具类型
     * @param {boolean} visible - 是否可见
     */
    setToolVisible(toolType, visible) {
        const button = this.buttons.get(toolType);
        if (button) {
            button.style.display = visible ? '' : 'none';
        }
    }
}

/**
 * 默认工具组配置
 */
export const DEFAULT_TOOL_GROUPS = [
    {
        label: '光源',
        tools: [
            { type: 'LaserSource', label: '激光', tooltip: '添加激光光源' },
            { type: 'FanSource', label: '扇形光', tooltip: '添加扇形光源' },
            { type: 'LineSource', label: '线光源', tooltip: '添加线光源' },
            { type: 'WhiteLightSource', label: '白光', tooltip: '添加白光光源' },
            { type: 'PointSource', label: '点光源', tooltip: '添加点光源' },
            { type: 'LEDSource', label: 'LED', tooltip: '添加LED光源' },
            { type: 'PulsedLaserSource', label: '脉冲激光', tooltip: '添加脉冲激光源' }
        ]
    },
    {
        label: '反射镜',
        tools: [
            { type: 'Mirror', label: '平面镜', tooltip: '添加平面反射镜' },
            { type: 'ConcaveMirror', label: '凹面镜', tooltip: '添加凹面反射镜' },
            { type: 'ConvexMirror', label: '凸面镜', tooltip: '添加凸面反射镜' },
            { type: 'ParabolicMirrorToolbar', label: '抛物面镜', tooltip: '添加抛物面反射镜' },
            { type: 'DichroicMirror', label: '二向色镜', tooltip: '添加二向色镜' },
            { type: 'MetallicMirror', label: '金属镜', tooltip: '添加金属镜' },
            { type: 'RingMirror', label: '环形镜', tooltip: '添加环形镜' }
        ]
    },
    {
        label: '透镜',
        tools: [
            { type: 'ThinLens', label: '薄透镜', tooltip: '添加薄透镜' },
            { type: 'CylindricalLens', label: '柱面透镜', tooltip: '添加柱面透镜' },
            { type: 'AsphericLens', label: '非球面透镜', tooltip: '添加非球面透镜' },
            { type: 'GRINLens', label: 'GRIN透镜', tooltip: '添加梯度折射率透镜' }
        ]
    },
    {
        label: '偏振器件',
        tools: [
            { type: 'Polarizer', label: '偏振片', tooltip: '添加偏振片' },
            { type: 'BeamSplitter', label: '分束器', tooltip: '添加分束器' },
            { type: 'HalfWavePlate', label: '半波片', tooltip: '添加半波片' },
            { type: 'QuarterWavePlate', label: '四分之一波片', tooltip: '添加四分之一波片' },
            { type: 'FaradayRotator', label: '法拉第旋转器', tooltip: '添加法拉第旋转器' },
            { type: 'FaradayIsolator', label: '法拉第隔离器', tooltip: '添加法拉第隔离器' },
            { type: 'WollastonPrism', label: 'Wollaston棱镜', tooltip: '添加Wollaston偏振分束棱镜' }
        ]
    },
    {
        label: '探测器',
        tools: [
            { type: 'Screen', label: '屏幕', tooltip: '添加屏幕' },
            { type: 'Photodiode', label: '光电二极管', tooltip: '添加光电二极管' },
            { type: 'CCDCamera', label: 'CCD相机', tooltip: '添加CCD相机' },
            { type: 'Spectrometer', label: '光谱仪', tooltip: '添加光谱仪' },
            { type: 'PowerMeter', label: '功率计', tooltip: '添加功率计' },
            { type: 'PolarizationAnalyzer', label: '偏振分析仪', tooltip: '添加偏振分析仪' }
        ]
    },
    {
        label: '调制器',
        tools: [
            { type: 'ElectroOpticModulator', label: 'EOM', tooltip: '添加电光调制器' },
            { type: 'AcoustoOpticModulator', label: 'AOM', tooltip: '添加声光调制器' },
            { type: 'VariableAttenuator', label: '可调衰减器', tooltip: '添加可调衰减器' },
            { type: 'OpticalChopper', label: '光学斩波器', tooltip: '添加光学斩波器' }
        ]
    },
    {
        label: '原子物理',
        tools: [
            { type: 'AtomicCell', label: '原子气室', tooltip: '添加原子气室' },
            { type: 'MagneticCoil', label: '磁场线圈', tooltip: '添加磁场线圈标注' }
        ]
    },
    {
        label: '干涉仪',
        tools: [
            { type: 'FabryPerotCavity', label: 'F-P腔', tooltip: '添加法布里-珀罗腔' }
        ]
    },
    {
        label: '特殊元件',
        tools: [
            { type: 'Prism', label: '棱镜', tooltip: '添加棱镜' },
            { type: 'DiffractionGrating', label: '衍射光栅', tooltip: '添加衍射光栅' },
            { type: 'DielectricBlock', label: '介质块', tooltip: '添加介质块' },
            { type: 'OpticalFiber', label: '光纤', tooltip: '添加光纤' },
            { type: 'Aperture', label: '光阑', tooltip: '添加光阑' }
        ]
    },
    {
        label: '其它',
        tools: [
            { type: 'CustomComponent', label: '自定义', tooltip: '添加自定义组件' }
        ]
    }
];

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Toolbar = Toolbar;
    window.DEFAULT_TOOL_GROUPS = DEFAULT_TOOL_GROUPS;
}
