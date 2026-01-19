/**
 * MeasurementPanel.js - 测量工具面板
 * 提供测量工具的UI界面
 * 
 * Requirements: 18.1, 18.3, 18.4
 */

import { getMeasurementTools, MeasurementType, Units } from '../../diagram/measurement/MeasurementTools.js';

/**
 * 测量面板类
 */
export class MeasurementPanel {
    constructor(config = {}) {
        this.container = null;
        this.measurementTools = getMeasurementTools();
        this.visible = false;
        this.position = config.position || 'right';
        this.width = config.width || 300;
        
        // 回调
        this.onToolSelect = null;
        this.onMeasurementDelete = null;
        this.onSettingsChange = null;
        
        this._createPanel();
    }

    /**
     * 创建面板
     * @private
     */
    _createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'measurement-panel';
        this.container.style.cssText = `
            position: fixed;
            ${this.position}: 0;
            top: 60px;
            width: ${this.width}px;
            height: calc(100vh - 60px);
            background: white;
            border-left: 1px solid #ddd;
            box-shadow: -2px 0 8px rgba(0,0,0,0.1);
            display: none;
            flex-direction: column;
            z-index: 900;
            overflow: hidden;
        `;
        
        this._createHeader();
        this._createToolbar();
        this._createMeasurementList();
        this._createSettings();
    }

    /**
     * 创建头部
     * @private
     */
    _createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        `;
        
        const title = document.createElement('h3');
        title.textContent = '测量工具';
        title.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 24px;
            height: 24px;
        `;
        closeBtn.onclick = () => this.hide();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        this.container.appendChild(header);
    }

    /**
     * 创建工具栏
     * @private
     */
    _createToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            padding: 15px;
            border-bottom: 1px solid #eee;
            background: white;
        `;
        
        const toolsLabel = document.createElement('div');
        toolsLabel.textContent = '测量工具';
        toolsLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 500;
        `;
        toolbar.appendChild(toolsLabel);
        
        const tools = [
            { type: MeasurementType.DISTANCE, icon: '📏', label: '距离' },
            { type: MeasurementType.ANGLE, icon: '📐', label: '角度' },
            { type: MeasurementType.AREA, icon: '⬜', label: '面积' },
            { type: MeasurementType.OPTICAL_PATH, icon: '🔦', label: '光程' }
        ];
        
        const toolGrid = document.createElement('div');
        toolGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        `;
        
        tools.forEach(tool => {
            const btn = this._createToolButton(tool);
            toolGrid.appendChild(btn);
        });
        
        toolbar.appendChild(toolGrid);
        
        // 清除按钮
        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清除所有测量';
        clearBtn.style.cssText = `
            width: 100%;
            margin-top: 10px;
            padding: 8px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;
        clearBtn.onclick = () => {
            if (confirm('确定要清除所有测量吗？')) {
                this.measurementTools.clearAll();
                this._updateMeasurementList();
            }
        };
        toolbar.appendChild(clearBtn);
        
        this.container.appendChild(toolbar);
    }

    /**
     * 创建工具按钮
     * @private
     */
    _createToolButton(tool) {
        const btn = document.createElement('button');
        btn.style.cssText = `
            padding: 12px 8px;
            background: white;
            border: 2px solid #ddd;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        `;
        
        const icon = document.createElement('div');
        icon.textContent = tool.icon;
        icon.style.fontSize = '24px';
        
        const label = document.createElement('div');
        label.textContent = tool.label;
        label.style.cssText = 'font-size: 12px; color: #333;';
        
        btn.appendChild(icon);
        btn.appendChild(label);
        
        btn.onmouseenter = () => {
            btn.style.borderColor = '#4488ff';
            btn.style.background = '#f0f7ff';
        };
        btn.onmouseleave = () => {
            btn.style.borderColor = '#ddd';
            btn.style.background = 'white';
        };
        btn.onclick = () => {
            this.measurementTools.startMeasurement(tool.type);
            if (this.onToolSelect) {
                this.onToolSelect(tool.type);
            }
            this._highlightActiveTool(btn);
        };
        
        return btn;
    }

    /**
     * 高亮活动工具
     * @private
     */
    _highlightActiveTool(activeBtn) {
        const buttons = this.container.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn !== activeBtn) {
                btn.style.borderColor = '#ddd';
                btn.style.background = 'white';
            }
        });
        activeBtn.style.borderColor = '#4488ff';
        activeBtn.style.background = '#e3f2fd';
    }

    /**
     * 创建测量列表
     * @private
     */
    _createMeasurementList() {
        const listContainer = document.createElement('div');
        listContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #fafafa;
        `;
        
        const listLabel = document.createElement('div');
        listLabel.textContent = '测量结果';
        listLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 500;
        `;
        listContainer.appendChild(listLabel);
        
        this.measurementListEl = document.createElement('div');
        this.measurementListEl.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        listContainer.appendChild(this.measurementListEl);
        
        this.container.appendChild(listContainer);
        this._updateMeasurementList();
    }

    /**
     * 更新测量列表
     * @private
     */
    _updateMeasurementList() {
        this.measurementListEl.innerHTML = '';
        
        const measurements = this.measurementTools.getAllMeasurements();
        
        if (measurements.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = '暂无测量结果';
            empty.style.cssText = `
                text-align: center;
                color: #999;
                padding: 20px;
                font-size: 13px;
            `;
            this.measurementListEl.appendChild(empty);
            return;
        }
        
        measurements.forEach((measurement, index) => {
            const item = this._createMeasurementItem(measurement, index);
            this.measurementListEl.appendChild(item);
        });
    }

    /**
     * 创建测量项
     * @private
     */
    _createMeasurementItem(measurement, index) {
        const item = document.createElement('div');
        item.style.cssText = `
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const info = document.createElement('div');
        info.style.flex = '1';
        
        const typeLabel = document.createElement('div');
        typeLabel.textContent = this._getTypeLabel(measurement.type);
        typeLabel.style.cssText = `
            font-size: 11px;
            color: #666;
            margin-bottom: 4px;
        `;
        
        const value = document.createElement('div');
        value.textContent = measurement.format(3);
        value.style.cssText = `
            font-size: 15px;
            font-weight: 600;
            color: #333;
        `;
        
        info.appendChild(typeLabel);
        info.appendChild(value);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.style.cssText = `
            background: none;
            border: none;
            cursor: pointer;
            font-size: 18px;
            padding: 4px;
            opacity: 0.6;
        `;
        deleteBtn.onmouseenter = () => deleteBtn.style.opacity = '1';
        deleteBtn.onmouseleave = () => deleteBtn.style.opacity = '0.6';
        deleteBtn.onclick = () => {
            this.measurementTools.deleteMeasurement(index);
            this._updateMeasurementList();
            if (this.onMeasurementDelete) {
                this.onMeasurementDelete(index);
            }
        };
        
        item.appendChild(info);
        item.appendChild(deleteBtn);
        
        return item;
    }

    /**
     * 获取类型标签
     * @private
     */
    _getTypeLabel(type) {
        const labels = {
            [MeasurementType.DISTANCE]: '距离测量',
            [MeasurementType.ANGLE]: '角度测量',
            [MeasurementType.AREA]: '面积测量',
            [MeasurementType.OPTICAL_PATH]: '光程测量'
        };
        return labels[type] || type;
    }

    /**
     * 创建设置区域
     * @private
     */
    _createSettings() {
        const settings = document.createElement('div');
        settings.style.cssText = `
            padding: 15px;
            border-top: 1px solid #eee;
            background: white;
        `;
        
        const settingsLabel = document.createElement('div');
        settingsLabel.textContent = '设置';
        settingsLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
            font-weight: 500;
        `;
        settings.appendChild(settingsLabel);
        
        // 长度单位
        const lengthUnit = this._createSelect(
            '长度单位',
            [
                { value: Units.MM, label: '毫米 (mm)' },
                { value: Units.CM, label: '厘米 (cm)' },
                { value: Units.M, label: '米 (m)' },
                { value: Units.INCH, label: '英寸 (inch)' }
            ],
            this.measurementTools.defaultLengthUnit,
            (value) => {
                this.measurementTools.setDefaultUnits(value, null);
                this._updateMeasurementList();
                if (this.onSettingsChange) {
                    this.onSettingsChange({ lengthUnit: value });
                }
            }
        );
        settings.appendChild(lengthUnit);
        
        // 角度单位
        const angleUnit = this._createSelect(
            '角度单位',
            [
                { value: Units.DEGREE, label: '度 (°)' },
                { value: Units.RADIAN, label: '弧度 (rad)' }
            ],
            this.measurementTools.defaultAngleUnit,
            (value) => {
                this.measurementTools.setDefaultUnits(null, value);
                this._updateMeasurementList();
                if (this.onSettingsChange) {
                    this.onSettingsChange({ angleUnit: value });
                }
            }
        );
        settings.appendChild(angleUnit);
        
        // 像素比例
        const pixelScale = this._createNumberInput(
            '像素/毫米',
            this.measurementTools.pixelsPerMM,
            (value) => {
                this.measurementTools.setPixelsPerMM(value);
                this._updateMeasurementList();
                if (this.onSettingsChange) {
                    this.onSettingsChange({ pixelsPerMM: value });
                }
            }
        );
        settings.appendChild(pixelScale);
        
        this.container.appendChild(settings);
    }

    /**
     * 创建下拉选择
     * @private
     */
    _createSelect(label, options, defaultValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 12px;';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        `;
        
        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            background: white;
        `;
        
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            if (opt.value === defaultValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        select.onchange = () => onChange(select.value);
        
        container.appendChild(labelEl);
        container.appendChild(select);
        
        return container;
    }

    /**
     * 创建数字输入
     * @private
     */
    _createNumberInput(label, defaultValue, onChange) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 12px;';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        `;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = defaultValue;
        input.step = '0.1';
        input.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
        `;
        
        input.onchange = () => onChange(parseFloat(input.value));
        
        container.appendChild(labelEl);
        container.appendChild(input);
        
        return container;
    }

    /**
     * 挂载到容器
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container && this.container) {
            container.appendChild(this.container);
        }
    }

    /**
     * 卸载
     */
    unmount() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    /**
     * 显示
     */
    show() {
        this.visible = true;
        if (this.container) {
            this.container.style.display = 'flex';
        }
        this._updateMeasurementList();
    }

    /**
     * 隐藏
     */
    hide() {
        this.visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * 切换显示
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 刷新
     */
    refresh() {
        this._updateMeasurementList();
    }

    /**
     * 销毁
     */
    destroy() {
        this.unmount();
        this.container = null;
    }
}

// ========== 单例模式 ==========
let measurementPanelInstance = null;

export function getMeasurementPanel(config) {
    if (!measurementPanelInstance) {
        measurementPanelInstance = new MeasurementPanel(config);
    }
    return measurementPanelInstance;
}

export function resetMeasurementPanel() {
    if (measurementPanelInstance) {
        measurementPanelInstance.destroy();
    }
    measurementPanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.MeasurementPanel = MeasurementPanel;
    window.getMeasurementPanel = getMeasurementPanel;
}
