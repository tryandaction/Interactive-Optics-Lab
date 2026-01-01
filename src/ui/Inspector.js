/**
 * Inspector.js - 属性检查器
 * 负责显示和编辑选中组件的属性
 */

/**
 * 属性分组配置
 */
export const PROPERTY_GROUPS = {
    position: { 
        label: '位置与角度', 
        names: ['posX', 'posY', 'angleDeg', 'outputX', 'outputY', 'outputAngleDeg'] 
    },
    geometry: { 
        label: '几何参数', 
        names: ['length', 'diameter', 'width', 'height', 'baseLength', 'radiusOfCurvature', 
                'centralAngleDeg', 'focalLength', 'slitWidth', 'slitSeparation', 'numberOfSlits', 
                'coreDiameter', 'facetLength'] 
    },
    source: { 
        label: '光源特性', 
        names: ['enabled', 'wavelength', 'intensity', 'baseIntensity', 'rayCount', 'numRays', 
                'spreadDeg', 'fanAngleDeg', 'gaussianEnabled', 'initialBeamWaist', 'beamDiameter'] 
    },
    optical: { 
        label: '光学特性', 
        names: ['baseRefractiveIndex', 'refractiveIndex', 'dispersionCoeffB', 'dispersionCoeffB_nm2', 
                'splitRatio', 'pbsUnpolarizedReflectivity', 'type', 'quality', 'coated', 
                'chromaticAberration', 'sphericalAberration', 'numericalAperture', 
                'fiberIntrinsicEfficiency', 'transmissionLossDbPerKm', 'transmissionAxisAngleDeg', 
                'fastAxisAngleDeg', 'gratingPeriodInMicrons', 'maxOrder', 'rfFrequencyMHz', 'rfPower'] 
    },
    display: { 
        label: '显示/状态', 
        names: ['showPattern', 'showEvanescentWave', 'measuredPower', 'hitCount', 'currentCoupling', 
                'fiberLength', 'acceptanceAngle', 'diffractionAngle', 'efficiency0', 'efficiency1', 
                'wavelengthInfo', 'isThickLens'] 
    },
    physics: { 
        label: '物理选项', 
        names: ['ignoreDecay', 'absorptionCoeff'] 
    }
};

/**
 * 属性检查器类
 * 管理组件属性的显示和编辑
 */
export class Inspector {
    /**
     * @param {HTMLElement} container - 检查器容器元素
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        /** @type {HTMLElement} */
        this.container = container;
        /** @type {HTMLButtonElement} */
        this.deleteBtn = options.deleteBtn || null;
        /** @type {Object} 当前选中的组件 */
        this.selectedComponent = null;
        /** @type {Function} 属性变更回调 */
        this.onPropertyChange = options.onPropertyChange || null;
        /** @type {Function} 删除回调 */
        this.onDelete = options.onDelete || null;
        /** @type {Function} 标签页激活回调 */
        this.onActivateTab = options.onActivateTab || null;
    }

    /**
     * 更新检查器显示
     * @param {Object} component - 选中的组件
     */
    update(component) {
        this.selectedComponent = component;
        this.container.innerHTML = '';

        if (!component) {
            this._showPlaceholder();
            return;
        }

        if (this.deleteBtn) {
            this.deleteBtn.disabled = false;
        }

        this._renderInfoHeader(component);
        this._renderDivider();
        this._renderProperties(component);

        if (this.onActivateTab) {
            this.onActivateTab('properties-tab');
        }
    }

    /**
     * 显示占位符
     * @private
     */
    _showPlaceholder() {
        if (this.deleteBtn) {
            this.deleteBtn.disabled = true;
        }
        this.container.innerHTML = '<p class="placeholder-text">请先选中一个元件...</p>';
    }

    /**
     * 渲染信息头部
     * @private
     */
    _renderInfoHeader(component) {
        const infoHeader = document.createElement('div');
        infoHeader.className = 'inspector-info-header';

        // 标题
        const title = document.createElement('h3');
        title.textContent = component.label;
        infoHeader.appendChild(title);

        // 功能描述
        if (component.constructor.functionDescription) {
            const funcDesc = document.createElement('p');
            funcDesc.className = 'component-function';
            funcDesc.textContent = component.constructor.functionDescription;
            infoHeader.appendChild(funcDesc);
        }

        // 备注
        const notesContainer = document.createElement('div');
        notesContainer.className = 'prop notes-prop';
        
        const notesLabel = document.createElement('label');
        notesLabel.htmlFor = 'component-notes-textarea';
        notesLabel.textContent = '备注:';
        
        const notesTextarea = document.createElement('textarea');
        notesTextarea.id = 'component-notes-textarea';
        notesTextarea.value = component.notes || '';
        notesTextarea.placeholder = '可在此添加备注信息...';
        notesTextarea.onchange = (e) => this._handlePropertyChange('notes', e.target.value, true);
        
        notesContainer.appendChild(notesLabel);
        notesContainer.appendChild(notesTextarea);
        infoHeader.appendChild(notesContainer);

        this.container.appendChild(infoHeader);
    }

    /**
     * 渲染分隔线
     * @private
     */
    _renderDivider() {
        const hr = document.createElement('hr');
        hr.className = 'prop-group-divider';
        this.container.appendChild(hr);
    }

    /**
     * 渲染属性
     * @private
     */
    _renderProperties(component) {
        let props;
        try {
            props = component.getProperties();
            if (!props || typeof props !== 'object') {
                throw new Error("getProperties did not return a valid object.");
            }
        } catch (e) {
            console.error(`Error getting properties for ${component.label}:`, e);
            this.container.innerHTML = '<p class="placeholder-text error-text">加载属性时出错。</p>';
            if (this.deleteBtn) this.deleteBtn.disabled = true;
            return;
        }

        // 分组属性
        const groupedProps = this._groupProperties(props);

        // 渲染分组
        const groupOrder = ['position', 'geometry', 'source', 'optical', 'physics', 'display', 'other'];
        let groupAdded = false;

        groupOrder.forEach(groupKey => {
            const propertiesInGroup = groupedProps[groupKey];
            if (propertiesInGroup && propertiesInGroup.length > 0 && 
                propertiesInGroup.some(p => p.data)) {
                
                if (groupAdded) {
                    this._renderDivider();
                }

                const groupLabel = PROPERTY_GROUPS[groupKey]?.label || '其它属性';
                const titleEl = document.createElement('h5');
                titleEl.className = 'prop-group-title';
                titleEl.textContent = groupLabel;
                this.container.appendChild(titleEl);
                groupAdded = true;

                propertiesInGroup.forEach(propInfo => {
                    this._renderProperty(propInfo.name, propInfo.data, component.id);
                });
            }
        });
    }

    /**
     * 分组属性
     * @private
     */
    _groupProperties(props) {
        const groupedProps = {};
        const assignedProps = new Set();

        // 按定义的分组分配属性
        for (const groupKey in PROPERTY_GROUPS) {
            groupedProps[groupKey] = [];
            PROPERTY_GROUPS[groupKey].names.forEach(name => {
                if (props[name]) {
                    groupedProps[groupKey].push({ name, data: props[name] });
                    assignedProps.add(name);
                }
            });
        }

        // 未分配的属性放入 other 组
        groupedProps['other'] = [];
        for (const propName in props) {
            if (!assignedProps.has(propName)) {
                groupedProps['other'].push({ name: propName, data: props[propName] });
            }
        }

        return groupedProps;
    }

    /**
     * 渲染单个属性
     * @private
     */
    _renderProperty(propName, propData, componentId) {
        if (!propData || typeof propData !== 'object' || !propData.hasOwnProperty('value')) {
            return;
        }

        const { value, label, type = 'text', options, min, max, step, 
                placeholder, readonly = false, title = '' } = propData;

        const div = document.createElement('div');
        div.className = 'prop';

        // 标签
        const labelEl = document.createElement('label');
        labelEl.textContent = label ? label + ':' : propName + ':';
        const inputId = `prop-${propName}-${componentId}-${Date.now()}`;
        labelEl.htmlFor = inputId;
        if (title) labelEl.title = title;
        div.appendChild(labelEl);

        // 输入元素
        let inputEl;

        if (type === 'select' && Array.isArray(options)) {
            inputEl = this._createSelect(options, value, propName);
        } else if (type === 'checkbox') {
            inputEl = this._createCheckbox(value, propName);
        } else {
            inputEl = this._createInput(type, value, propName, { min, max, step, placeholder });
        }

        // 禁用/只读状态
        const isDisabled = propData.disabled === true;
        if (isDisabled) inputEl.disabled = true;
        if (readonly) inputEl.readOnly = true;
        if (isDisabled || readonly) {
            inputEl.classList.add('readonly-or-disabled');
        }

        inputEl.id = inputId;
        div.appendChild(inputEl);
        this.container.appendChild(div);
    }

    /**
     * 创建下拉选择框
     * @private
     */
    _createSelect(options, value, propName) {
        const select = document.createElement('select');
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.label;
            if (String(opt.value) === String(value)) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        select.onchange = (e) => this._handlePropertyChange(propName, e.target.value, true);
        return select;
    }

    /**
     * 创建复选框
     * @private
     */
    _createCheckbox(value, propName) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!value;
        checkbox.onchange = (e) => this._handlePropertyChange(propName, e.target.checked, true);
        return checkbox;
    }

    /**
     * 创建输入框
     * @private
     */
    _createInput(type, value, propName, attrs = {}) {
        const input = document.createElement('input');
        input.type = type;
        input.value = (value === null || value === undefined) ? '' : value;
        
        if (attrs.placeholder !== undefined) input.placeholder = attrs.placeholder;
        if (attrs.min !== undefined) input.min = attrs.min;
        if (attrs.max !== undefined) input.max = attrs.max;
        if (attrs.step !== undefined) input.step = attrs.step;

        if (type === 'range' || type === 'number') {
            input.oninput = (e) => this._handlePropertyChange(propName, e.target.value, false);
            input.onchange = (e) => this._handlePropertyChange(propName, e.target.value, true);
        } else {
            input.onchange = (e) => this._handlePropertyChange(propName, e.target.value, true);
        }

        return input;
    }

    /**
     * 处理属性变更
     * @private
     */
    _handlePropertyChange(propName, value, isFinal) {
        if (this.onPropertyChange && this.selectedComponent) {
            this.onPropertyChange({
                component: this.selectedComponent,
                propName,
                value,
                isFinal
            });
        }
    }

    /**
     * 设置删除按钮
     * @param {HTMLButtonElement} btn - 删除按钮元素
     */
    setDeleteButton(btn) {
        this.deleteBtn = btn;
        if (btn && this.onDelete) {
            btn.onclick = () => {
                if (this.selectedComponent) {
                    this.onDelete(this.selectedComponent);
                }
            };
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Inspector = Inspector;
    window.PROPERTY_GROUPS = PROPERTY_GROUPS;
}
