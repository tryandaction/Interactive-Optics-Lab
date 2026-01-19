/**
 * CalculatorPanel.js - 光学计算器面板
 * 提供光学公式计算的UI界面
 * 
 * Requirements: 18.2
 */

import { getOpticsCalculator, PhysicalConstants } from '../../diagram/calculation/OpticsCalculator.js';

/**
 * 计算器面板类
 */
export class CalculatorPanel {
    constructor(config = {}) {
        this.container = null;
        this.calculator = getOpticsCalculator();
        this.visible = false;
        this.position = config.position || 'right';
        this.width = config.width || 350;
        
        this.currentFormula = null;
        this.resultHistory = [];
        
        this._createPanel();
    }

    /**
     * 创建面板
     * @private
     */
    _createPanel() {
        this.container = document.createElement('div');
        this.container.className = 'calculator-panel';
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
        this._createFormulaSelector();
        this._createCalculatorArea();
        this._createResultHistory();
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
        title.textContent = '光学计算器';
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
     * 创建公式选择器
     * @private
     */
    _createFormulaSelector() {
        const selector = document.createElement('div');
        selector.style.cssText = `
            padding: 15px;
            border-bottom: 1px solid #eee;
            background: white;
        `;
        
        const label = document.createElement('label');
        label.textContent = '选择公式';
        label.style.cssText = `
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            font-weight: 500;
        `;
        
        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            background: white;
        `;
        
        const formulas = [
            { value: '', label: '-- 选择公式 --' },
            { value: 'thinLens', label: '薄透镜公式 (1/f = 1/s_o + 1/s_i)' },
            { value: 'magnification', label: '放大率 (M = -s_i / s_o)' },
            { value: 'numericalAperture', label: '数值孔径 (NA = n·sin(θ))' },
            { value: 'fNumber', label: 'f数 (f/# = f/D)' },
            { value: 'wavelengthFrequency', label: '波长-频率转换 (c = λ·f)' },
            { value: 'photonEnergy', label: '光子能量 (E = hc/λ)' },
            { value: 'gaussianBeam', label: '高斯光束传播' },
            { value: 'beamDivergence', label: '光束发散角' },
            { value: 'rayleighCriterion', label: '瑞利判据 (分辨率)' },
            { value: 'brewsterAngle', label: '布儒斯特角' },
            { value: 'criticalAngle', label: '临界角 (全反射)' },
            { value: 'snellsLaw', label: '斯涅尔定律' },
            { value: 'fresnelReflection', label: '菲涅尔方程 (反射率)' },
            { value: 'gratingEquation', label: '光栅方程' },
            { value: 'interferenceSpacing', label: '干涉条纹间距' }
        ];
        
        formulas.forEach(formula => {
            const option = document.createElement('option');
            option.value = formula.value;
            option.textContent = formula.label;
            select.appendChild(option);
        });
        
        select.onchange = () => {
            this.currentFormula = select.value;
            this._showFormulaInputs(select.value);
        };
        
        selector.appendChild(label);
        selector.appendChild(select);
        this.container.appendChild(selector);
    }

    /**
     * 创建计算区域
     * @private
     */
    _createCalculatorArea() {
        this.calculatorArea = document.createElement('div');
        this.calculatorArea.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background: #fafafa;
        `;
        
        const placeholder = document.createElement('div');
        placeholder.textContent = '请选择一个公式开始计算';
        placeholder.style.cssText = `
            text-align: center;
            color: #999;
            padding: 40px 20px;
            font-size: 13px;
        `;
        this.calculatorArea.appendChild(placeholder);
        
        this.container.appendChild(this.calculatorArea);
    }

    /**
     * 显示公式输入
     * @private
     */
    _showFormulaInputs(formula) {
        this.calculatorArea.innerHTML = '';
        
        if (!formula) {
            const placeholder = document.createElement('div');
            placeholder.textContent = '请选择一个公式开始计算';
            placeholder.style.cssText = `
                text-align: center;
                color: #999;
                padding: 40px 20px;
                font-size: 13px;
            `;
            this.calculatorArea.appendChild(placeholder);
            return;
        }
        
        const inputs = this._getFormulaInputs(formula);
        const form = this._createForm(inputs, formula);
        this.calculatorArea.appendChild(form);
    }

    /**
     * 获取公式输入配置
     * @private
     */
    _getFormulaInputs(formula) {
        const configs = {
            thinLens: [
                { name: 'focalLength', label: '焦距 f (mm)', type: 'number', optional: true },
                { name: 'objectDistance', label: '物距 s_o (mm)', type: 'number', optional: true },
                { name: 'imageDistance', label: '像距 s_i (mm)', type: 'number', optional: true }
            ],
            magnification: [
                { name: 'imageDistance', label: '像距 s_i (mm)', type: 'number' },
                { name: 'objectDistance', label: '物距 s_o (mm)', type: 'number' }
            ],
            numericalAperture: [
                { name: 'refractiveIndex', label: '折射率 n', type: 'number', default: 1.0 },
                { name: 'halfAngle', label: '半角 θ (度)', type: 'number' }
            ],
            fNumber: [
                { name: 'focalLength', label: '焦距 f (mm)', type: 'number' },
                { name: 'apertureDiameter', label: '孔径直径 D (mm)', type: 'number' }
            ],
            wavelengthFrequency: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number', optional: true },
                { name: 'frequency', label: '频率 f (Hz)', type: 'number', optional: true }
            ],
            photonEnergy: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' }
            ],
            gaussianBeam: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' },
                { name: 'beamWaist', label: '束腰半径 w_0 (μm)', type: 'number' },
                { name: 'distance', label: '传播距离 z (mm)', type: 'number' }
            ],
            beamDivergence: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' },
                { name: 'beamWaist', label: '束腰半径 w_0 (μm)', type: 'number' }
            ],
            rayleighCriterion: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' },
                { name: 'apertureDiameter', label: '孔径直径 D (mm)', type: 'number' }
            ],
            brewsterAngle: [
                { name: 'n1', label: '折射率 n1', type: 'number', default: 1.0 },
                { name: 'n2', label: '折射率 n2', type: 'number', default: 1.5 }
            ],
            criticalAngle: [
                { name: 'n1', label: '折射率 n1 (大)', type: 'number', default: 1.5 },
                { name: 'n2', label: '折射率 n2 (小)', type: 'number', default: 1.0 }
            ],
            snellsLaw: [
                { name: 'n1', label: '折射率 n1', type: 'number', default: 1.0 },
                { name: 'theta1', label: '入射角 θ1 (度)', type: 'number' },
                { name: 'n2', label: '折射率 n2', type: 'number', default: 1.5 }
            ],
            fresnelReflection: [
                { name: 'n1', label: '折射率 n1', type: 'number', default: 1.0 },
                { name: 'n2', label: '折射率 n2', type: 'number', default: 1.5 },
                { name: 'incidentAngle', label: '入射角 (度)', type: 'number' }
            ],
            gratingEquation: [
                { name: 'gratingPeriod', label: '光栅周期 d (μm)', type: 'number' },
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' },
                { name: 'order', label: '衍射级次 m', type: 'number', default: 1 },
                { name: 'incidentAngle', label: '入射角 (度)', type: 'number', default: 0 }
            ],
            interferenceSpacing: [
                { name: 'wavelength', label: '波长 λ (nm)', type: 'number' },
                { name: 'distance', label: '距离 L (mm)', type: 'number' },
                { name: 'slitSeparation', label: '缝间距 d (μm)', type: 'number' }
            ]
        };
        
        return configs[formula] || [];
    }

    /**
     * 创建表单
     * @private
     */
    _createForm(inputs, formula) {
        const form = document.createElement('div');
        form.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
        
        const inputElements = {};
        
        inputs.forEach(input => {
            const field = this._createInputField(input);
            form.appendChild(field.container);
            inputElements[input.name] = field.input;
        });
        
        const calculateBtn = document.createElement('button');
        calculateBtn.textContent = '计算';
        calculateBtn.style.cssText = `
            padding: 10px;
            background: #4488ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin-top: 8px;
        `;
        calculateBtn.onclick = () => this._calculate(formula, inputElements);
        
        form.appendChild(calculateBtn);
        
        this.resultArea = document.createElement('div');
        this.resultArea.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            display: none;
        `;
        form.appendChild(this.resultArea);
        
        return form;
    }

    /**
     * 创建输入字段
     * @private
     */
    _createInputField(config) {
        const container = document.createElement('div');
        
        const label = document.createElement('label');
        label.textContent = config.label + (config.optional ? ' (可选)' : '');
        label.style.cssText = `
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
        `;
        
        const input = document.createElement('input');
        input.type = config.type;
        input.name = config.name;
        input.step = 'any';
        if (config.default !== undefined) {
            input.value = config.default;
        }
        input.style.cssText = `
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
        `;
        
        container.appendChild(label);
        container.appendChild(input);
        
        return { container, input };
    }

    /**
     * 执行计算
     * @private
     */
    _calculate(formula, inputElements) {
        const values = {};
        
        // 收集输入值
        for (const [name, input] of Object.entries(inputElements)) {
            const value = input.value.trim();
            if (value !== '') {
                values[name] = parseFloat(value);
            }
        }
        
        // 单位转换
        values = this._convertUnits(formula, values);
        
        // 执行计算
        let result = null;
        
        try {
            switch (formula) {
                case 'thinLens':
                    result = this.calculator.thinLensEquation(
                        values.focalLength, values.objectDistance, values.imageDistance
                    );
                    break;
                case 'magnification':
                    result = this.calculator.magnification(
                        values.imageDistance, values.objectDistance
                    );
                    break;
                case 'numericalAperture':
                    result = this.calculator.numericalAperture(
                        values.refractiveIndex, values.halfAngle * Math.PI / 180
                    );
                    break;
                case 'fNumber':
                    result = this.calculator.fNumber(
                        values.focalLength, values.apertureDiameter
                    );
                    break;
                case 'wavelengthFrequency':
                    result = this.calculator.wavelengthFrequency(
                        values.wavelength, values.frequency
                    );
                    break;
                case 'photonEnergy':
                    result = this.calculator.photonEnergy(values.wavelength);
                    break;
                case 'gaussianBeam':
                    result = this.calculator.gaussianBeam(
                        values.wavelength, values.beamWaist, values.distance
                    );
                    break;
                case 'beamDivergence':
                    result = this.calculator.beamDivergence(
                        values.wavelength, values.beamWaist
                    );
                    break;
                case 'rayleighCriterion':
                    result = this.calculator.rayleighCriterion(
                        values.wavelength, values.apertureDiameter
                    );
                    break;
                case 'brewsterAngle':
                    result = this.calculator.brewsterAngle(values.n1, values.n2);
                    break;
                case 'criticalAngle':
                    result = this.calculator.criticalAngle(values.n1, values.n2);
                    break;
                case 'snellsLaw':
                    result = this.calculator.snellsLaw(
                        values.n1, values.theta1 * Math.PI / 180, values.n2
                    );
                    break;
                case 'fresnelReflection':
                    result = this.calculator.fresnelReflection(
                        values.n1, values.n2, values.incidentAngle * Math.PI / 180
                    );
                    break;
                case 'gratingEquation':
                    result = this.calculator.gratingEquation(
                        values.gratingPeriod, values.wavelength, values.order, 
                        values.incidentAngle * Math.PI / 180
                    );
                    break;
                case 'interferenceSpacing':
                    result = this.calculator.interferenceSpacing(
                        values.wavelength, values.distance, values.slitSeparation
                    );
                    break;
            }
            
            if (result) {
                this._displayResult(result);
                this.calculator.saveResult(result);
                this.resultHistory.unshift(result);
                if (this.resultHistory.length > 10) {
                    this.resultHistory.pop();
                }
            }
        } catch (error) {
            this._displayError(error.message);
        }
    }

    /**
     * 单位转换
     * @private
     */
    _convertUnits(formula, values) {
        const converted = { ...values };
        
        // 波长: nm -> m
        if (converted.wavelength) {
            converted.wavelength = converted.wavelength * 1e-9;
        }
        
        // 距离: mm -> m
        if (converted.focalLength) converted.focalLength = converted.focalLength * 1e-3;
        if (converted.objectDistance) converted.objectDistance = converted.objectDistance * 1e-3;
        if (converted.imageDistance) converted.imageDistance = converted.imageDistance * 1e-3;
        if (converted.distance) converted.distance = converted.distance * 1e-3;
        if (converted.apertureDiameter) converted.apertureDiameter = converted.apertureDiameter * 1e-3;
        
        // 微米 -> m
        if (converted.beamWaist) converted.beamWaist = converted.beamWaist * 1e-6;
        if (converted.gratingPeriod) converted.gratingPeriod = converted.gratingPeriod * 1e-6;
        if (converted.slitSeparation) converted.slitSeparation = converted.slitSeparation * 1e-6;
        
        return converted;
    }

    /**
     * 显示结果
     * @private
     */
    _displayResult(result) {
        this.resultArea.innerHTML = '';
        this.resultArea.style.display = 'block';
        
        const title = document.createElement('div');
        title.textContent = '计算结果';
        title.style.cssText = `
            font-size: 13px;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        `;
        this.resultArea.appendChild(title);
        
        if (result.error) {
            const error = document.createElement('div');
            error.textContent = result.error;
            error.style.cssText = 'color: #f44336; font-size: 13px;';
            this.resultArea.appendChild(error);
            return;
        }
        
        for (const [key, value] of Object.entries(result)) {
            if (key === 'formula') continue;
            
            const row = document.createElement('div');
            row.style.cssText = `
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #f0f0f0;
                font-size: 13px;
            `;
            
            const keyEl = document.createElement('span');
            keyEl.textContent = this._formatKey(key);
            keyEl.style.color = '#666';
            
            const valueEl = document.createElement('span');
            valueEl.textContent = this._formatValue(value);
            valueEl.style.cssText = 'font-weight: 500; color: #333;';
            
            row.appendChild(keyEl);
            row.appendChild(valueEl);
            this.resultArea.appendChild(row);
        }
        
        if (result.formula) {
            const formula = document.createElement('div');
            formula.textContent = `公式: ${result.formula}`;
            formula.style.cssText = `
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #999;
                font-style: italic;
            `;
            this.resultArea.appendChild(formula);
        }
    }

    /**
     * 显示错误
     * @private
     */
    _displayError(message) {
        this.resultArea.innerHTML = '';
        this.resultArea.style.display = 'block';
        
        const error = document.createElement('div');
        error.textContent = `错误: ${message}`;
        error.style.cssText = 'color: #f44336; font-size: 13px;';
        this.resultArea.appendChild(error);
    }

    /**
     * 格式化键名
     * @private
     */
    _formatKey(key) {
        const labels = {
            focalLength: '焦距',
            objectDistance: '物距',
            imageDistance: '像距',
            magnification: '放大率',
            lateral: '横向放大率',
            angular: '角放大率',
            NA: '数值孔径',
            fNumber: 'f数',
            wavelength: '波长',
            frequency: '频率',
            energy: '能量',
            energyEV: '能量 (eV)',
            beamRadius: '光束半径',
            radiusOfCurvature: '曲率半径',
            rayleighRange: '瑞利长度',
            gouyPhase: '古伊相移',
            gouyPhaseDeg: '古伊相移 (度)',
            divergence: '发散角',
            divergenceDeg: '发散角 (度)',
            angularResolution: '角分辨率',
            angularResolutionDeg: '角分辨率 (度)',
            brewsterAngle: '布儒斯特角',
            brewsterAngleDeg: '布儒斯特角 (度)',
            criticalAngle: '临界角',
            criticalAngleDeg: '临界角 (度)',
            reflectanceS: 's偏振反射率',
            reflectanceP: 'p偏振反射率',
            reflectanceAvg: '平均反射率',
            transmittanceS: 's偏振透射率',
            transmittanceP: 'p偏振透射率',
            transmittanceAvg: '平均透射率',
            diffractionAngle: '衍射角',
            diffractionAngleDeg: '衍射角 (度)',
            fringeSpacing: '条纹间距'
        };
        return labels[key] || key;
    }

    /**
     * 格式化值
     * @private
     */
    _formatValue(value) {
        if (typeof value === 'number') {
            if (Math.abs(value) < 0.001 || Math.abs(value) > 10000) {
                return value.toExponential(4);
            }
            return value.toFixed(4);
        }
        return String(value);
    }

    /**
     * 创建结果历史
     * @private
     */
    _createResultHistory() {
        const history = document.createElement('div');
        history.style.cssText = `
            padding: 15px;
            border-top: 1px solid #eee;
            background: white;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        const historyLabel = document.createElement('div');
        historyLabel.textContent = '计算历史';
        historyLabel.style.cssText = `
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            font-weight: 500;
        `;
        history.appendChild(historyLabel);
        
        this.historyList = document.createElement('div');
        this.historyList.style.cssText = 'font-size: 12px; color: #999;';
        this.historyList.textContent = '暂无历史记录';
        history.appendChild(this.historyList);
        
        this.container.appendChild(history);
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
     * 销毁
     */
    destroy() {
        this.unmount();
        this.container = null;
    }
}

// ========== 单例模式 ==========
let calculatorPanelInstance = null;

export function getCalculatorPanel(config) {
    if (!calculatorPanelInstance) {
        calculatorPanelInstance = new CalculatorPanel(config);
    }
    return calculatorPanelInstance;
}

export function resetCalculatorPanel() {
    if (calculatorPanelInstance) {
        calculatorPanelInstance.destroy();
    }
    calculatorPanelInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.CalculatorPanel = CalculatorPanel;
    window.getCalculatorPanel = getCalculatorPanel;
}
