/**
 * ParameterDisplay.js - 元件参数显示管理器
 * 提供元件参数的显示、格式化和渲染功能
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

/**
 * 参数单位映射
 */
export const ParameterUnits = {
    // 长度
    length: { unit: 'mm', precision: 1 },
    focalLength: { unit: 'mm', precision: 1 },
    radius: { unit: 'mm', precision: 2 },
    
    // 角度
    angle: { unit: '°', precision: 1 },
    rotation: { unit: '°', precision: 1 },
    
    // 频率
    frequency: { unit: 'MHz', precision: 2 },
    detuning: { unit: 'MHz', precision: 2 },
    
    // 功率
    power: { unit: 'mW', precision: 2 },
    intensity: { unit: 'mW/cm²', precision: 2 },
    
    // 波长
    wavelength: { unit: 'nm', precision: 1 },
    
    // 折射率
    refractiveIndex: { unit: '', precision: 4 },
    
    // 反射率/透射率
    reflectivity: { unit: '%', precision: 1 },
    transmittance: { unit: '%', precision: 1 },
    
    // 其他
    ratio: { unit: '', precision: 2 },
    percentage: { unit: '%', precision: 1 }
};

/**
 * 参数显示位置枚举
 */
export const LabelPosition = {
    TOP: 'top',
    BOTTOM: 'bottom',
    LEFT: 'left',
    RIGHT: 'right',
    AUTO: 'auto'
};

/**
 * 参数显示配置
 * @typedef {Object} ParameterConfig
 * @property {string} name - 参数名称
 * @property {string} label - 显示标签
 * @property {string} type - 参数类型（用于确定单位和精度）
 * @property {boolean} visible - 是否显示
 * @property {string} position - 标签位置
 */

/**
 * 参数显示管理器类
 */
export class ParameterDisplayManager {
    constructor(options = {}) {
        /** @type {Map<string, Map<string, ParameterConfig>>} 元件ID -> 参数配置映射 */
        this.componentConfigs = new Map();
        
        /** @type {boolean} 全局显示开关 */
        this.globalEnabled = options.globalEnabled !== false;
        
        /** @type {Object} 默认样式 */
        this.defaultStyle = {
            fontSize: 11,
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: 3,
            borderRadius: 2,
            offset: 15,
            ...options.defaultStyle
        };
        
        /** @type {Set<string>} 默认显示的参数类型 */
        this.defaultVisibleParams = new Set(options.defaultVisibleParams || [
            'focalLength', 'angle', 'wavelength', 'frequency'
        ]);
        
        /** @type {Array<Function>} 变更监听器 */
        this.changeListeners = [];
    }

    /**
     * 设置全局显示开关
     * @param {boolean} enabled
     */
    setGlobalEnabled(enabled) {
        this.globalEnabled = enabled;
        this._notifyChange('globalEnabledChanged', { enabled });
    }

    /**
     * 获取全局显示状态
     * @returns {boolean}
     */
    isGlobalEnabled() {
        return this.globalEnabled;
    }

    /**
     * 配置元件参数显示
     * @param {string} componentId - 元件ID
     * @param {string} paramName - 参数名称
     * @param {Partial<ParameterConfig>} config - 配置
     */
    configureParameter(componentId, paramName, config) {
        if (!this.componentConfigs.has(componentId)) {
            this.componentConfigs.set(componentId, new Map());
        }
        
        const compConfig = this.componentConfigs.get(componentId);
        const existing = compConfig.get(paramName) || {
            name: paramName,
            label: paramName,
            type: 'ratio',
            visible: this.defaultVisibleParams.has(paramName),
            position: LabelPosition.AUTO
        };
        
        compConfig.set(paramName, { ...existing, ...config });
        this._notifyChange('parameterConfigured', { componentId, paramName, config });
    }

    /**
     * 设置参数可见性
     * @param {string} componentId - 元件ID
     * @param {string} paramName - 参数名称
     * @param {boolean} visible - 是否可见
     */
    setParameterVisible(componentId, paramName, visible) {
        this.configureParameter(componentId, paramName, { visible });
    }

    /**
     * 获取参数配置
     * @param {string} componentId - 元件ID
     * @param {string} paramName - 参数名称
     * @returns {ParameterConfig|null}
     */
    getParameterConfig(componentId, paramName) {
        const compConfig = this.componentConfigs.get(componentId);
        return compConfig ? compConfig.get(paramName) : null;
    }

    /**
     * 获取元件的所有参数配置
     * @param {string} componentId - 元件ID
     * @returns {Map<string, ParameterConfig>}
     */
    getComponentConfigs(componentId) {
        return this.componentConfigs.get(componentId) || new Map();
    }

    /**
     * 格式化参数值
     * @param {number} value - 参数值
     * @param {string} type - 参数类型
     * @returns {string}
     */
    formatValue(value, type) {
        const unitConfig = ParameterUnits[type] || { unit: '', precision: 2 };
        
        // 处理特殊值
        if (value === null || value === undefined || isNaN(value)) {
            return '--';
        }
        
        // 格式化数值
        let formattedValue;
        if (Math.abs(value) >= 1000) {
            formattedValue = value.toExponential(unitConfig.precision);
        } else {
            formattedValue = value.toFixed(unitConfig.precision);
        }
        
        // 移除尾部零
        formattedValue = parseFloat(formattedValue).toString();
        
        // 添加单位
        if (unitConfig.unit) {
            return `${formattedValue} ${unitConfig.unit}`;
        }
        return formattedValue;
    }

    /**
     * 格式化参数标签
     * @param {string} label - 标签
     * @param {number} value - 值
     * @param {string} type - 类型
     * @returns {string}
     */
    formatLabel(label, value, type) {
        const formattedValue = this.formatValue(value, type);
        return `${label} = ${formattedValue}`;
    }

    /**
     * 计算标签位置
     * @param {Object} component - 元件
     * @param {string} position - 位置设置
     * @param {number} index - 参数索引（用于多参数偏移）
     * @returns {{x: number, y: number}}
     */
    calculateLabelPosition(component, position, index = 0) {
        const compX = component.pos?.x || component.x || 0;
        const compY = component.pos?.y || component.y || 0;
        const offset = this.defaultStyle.offset + index * (this.defaultStyle.fontSize + 5);
        
        switch (position) {
            case LabelPosition.TOP:
                return { x: compX, y: compY - offset };
            case LabelPosition.BOTTOM:
                return { x: compX, y: compY + offset };
            case LabelPosition.LEFT:
                return { x: compX - offset * 2, y: compY };
            case LabelPosition.RIGHT:
                return { x: compX + offset * 2, y: compY };
            case LabelPosition.AUTO:
            default:
                // 默认放在右上方
                return { x: compX + offset, y: compY - offset };
        }
    }

    /**
     * 渲染元件参数到Canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} component - 元件
     */
    renderComponentParameters(ctx, component) {
        if (!this.globalEnabled) return;
        
        const componentId = component.id;
        const configs = this.getComponentConfigs(componentId);
        
        // 获取元件参数
        const params = this._extractParameters(component);
        
        let visibleIndex = 0;
        params.forEach((value, paramName) => {
            // 检查是否应该显示
            let config = configs.get(paramName);
            if (!config) {
                // 使用默认配置
                config = {
                    name: paramName,
                    label: this._formatParamLabel(paramName),
                    type: this._guessParamType(paramName),
                    visible: this.defaultVisibleParams.has(paramName),
                    position: LabelPosition.AUTO
                };
            }
            
            if (!config.visible) return;
            
            // 计算位置
            const pos = this.calculateLabelPosition(component, config.position, visibleIndex);
            
            // 渲染标签
            this._renderLabel(ctx, config.label, value, config.type, pos);
            
            visibleIndex++;
        });
    }

    /**
     * 提取元件参数
     * @private
     */
    _extractParameters(component) {
        const params = new Map();
        
        // 常见参数
        if (component.focalLength !== undefined) params.set('focalLength', component.focalLength);
        if (component.angle !== undefined) params.set('angle', component.angle * 180 / Math.PI);
        if (component.wavelength !== undefined) params.set('wavelength', component.wavelength);
        if (component.frequency !== undefined) params.set('frequency', component.frequency);
        if (component.power !== undefined) params.set('power', component.power);
        if (component.reflectivity !== undefined) params.set('reflectivity', component.reflectivity * 100);
        if (component.transmittance !== undefined) params.set('transmittance', component.transmittance * 100);
        if (component.refractiveIndex !== undefined) params.set('refractiveIndex', component.refractiveIndex);
        if (component.radius !== undefined) params.set('radius', component.radius);
        if (component.detuning !== undefined) params.set('detuning', component.detuning);
        
        return params;
    }

    /**
     * 格式化参数标签名
     * @private
     */
    _formatParamLabel(paramName) {
        const labels = {
            focalLength: 'f',
            angle: 'θ',
            wavelength: 'λ',
            frequency: 'ν',
            power: 'P',
            reflectivity: 'R',
            transmittance: 'T',
            refractiveIndex: 'n',
            radius: 'r',
            detuning: 'Δ'
        };
        return labels[paramName] || paramName;
    }

    /**
     * 猜测参数类型
     * @private
     */
    _guessParamType(paramName) {
        if (ParameterUnits[paramName]) {
            return paramName;
        }
        
        // 根据名称猜测
        if (paramName.includes('angle') || paramName.includes('rotation')) return 'angle';
        if (paramName.includes('length') || paramName.includes('radius')) return 'length';
        if (paramName.includes('frequency')) return 'frequency';
        if (paramName.includes('power')) return 'power';
        if (paramName.includes('wavelength')) return 'wavelength';
        
        return 'ratio';
    }

    /**
     * 渲染标签
     * @private
     */
    _renderLabel(ctx, label, value, type, pos) {
        const text = this.formatLabel(label, value, type);
        
        ctx.save();
        
        // 设置字体
        ctx.font = `${this.defaultStyle.fontSize}px ${this.defaultStyle.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        // 测量文本
        const metrics = ctx.measureText(text);
        const width = metrics.width + this.defaultStyle.padding * 2;
        const height = this.defaultStyle.fontSize + this.defaultStyle.padding * 2;
        
        // 绘制背景
        if (this.defaultStyle.backgroundColor !== 'transparent') {
            ctx.fillStyle = this.defaultStyle.backgroundColor;
            
            if (this.defaultStyle.borderRadius > 0) {
                this._roundRect(ctx, pos.x - this.defaultStyle.padding, pos.y - height/2, 
                    width, height, this.defaultStyle.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(pos.x - this.defaultStyle.padding, pos.y - height/2, width, height);
            }
        }
        
        // 绘制文本
        ctx.fillStyle = this.defaultStyle.color;
        ctx.fillText(text, pos.x, pos.y);
        
        ctx.restore();
    }

    /**
     * 绘制圆角矩形
     * @private
     */
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
    }

    /**
     * 渲染到SVG
     * @param {Object} component - 元件
     * @returns {string}
     */
    renderToSVG(component) {
        if (!this.globalEnabled) return '';
        
        const componentId = component.id;
        const configs = this.getComponentConfigs(componentId);
        const params = this._extractParameters(component);
        
        const parts = [];
        let visibleIndex = 0;
        
        params.forEach((value, paramName) => {
            let config = configs.get(paramName);
            if (!config) {
                config = {
                    name: paramName,
                    label: this._formatParamLabel(paramName),
                    type: this._guessParamType(paramName),
                    visible: this.defaultVisibleParams.has(paramName),
                    position: LabelPosition.AUTO
                };
            }
            
            if (!config.visible) return;
            
            const pos = this.calculateLabelPosition(component, config.position, visibleIndex);
            const text = this.formatLabel(config.label, value, config.type);
            
            parts.push(`<text x="${pos.x}" y="${pos.y}" `);
            parts.push(`font-size="${this.defaultStyle.fontSize}" `);
            parts.push(`font-family="${this.defaultStyle.fontFamily}" `);
            parts.push(`fill="${this.defaultStyle.color}" `);
            parts.push(`dominant-baseline="middle">${this._escapeXML(text)}</text>`);
            
            visibleIndex++;
        });
        
        return parts.join('\n');
    }

    /**
     * 转义XML
     * @private
     */
    _escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * 注册变更监听器
     * @param {Function} callback
     * @returns {Function}
     */
    onChange(callback) {
        this.changeListeners.push(callback);
        return () => {
            const index = this.changeListeners.indexOf(callback);
            if (index > -1) {
                this.changeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知变更
     * @private
     */
    _notifyChange(type, data) {
        this.changeListeners.forEach(listener => {
            try {
                listener(type, data);
            } catch (error) {
                console.error('ParameterDisplayManager: Error in change listener:', error);
            }
        });
    }

    /**
     * 序列化
     * @returns {Object}
     */
    serialize() {
        const configs = {};
        this.componentConfigs.forEach((paramConfigs, componentId) => {
            configs[componentId] = {};
            paramConfigs.forEach((config, paramName) => {
                configs[componentId][paramName] = { ...config };
            });
        });
        
        return {
            globalEnabled: this.globalEnabled,
            defaultStyle: { ...this.defaultStyle },
            defaultVisibleParams: Array.from(this.defaultVisibleParams),
            componentConfigs: configs
        };
    }

    /**
     * 反序列化
     * @param {Object} data
     */
    deserialize(data) {
        if (data.globalEnabled !== undefined) {
            this.globalEnabled = data.globalEnabled;
        }
        if (data.defaultStyle) {
            this.defaultStyle = { ...this.defaultStyle, ...data.defaultStyle };
        }
        if (data.defaultVisibleParams) {
            this.defaultVisibleParams = new Set(data.defaultVisibleParams);
        }
        if (data.componentConfigs) {
            this.componentConfigs.clear();
            Object.entries(data.componentConfigs).forEach(([componentId, paramConfigs]) => {
                const configMap = new Map();
                Object.entries(paramConfigs).forEach(([paramName, config]) => {
                    configMap.set(paramName, config);
                });
                this.componentConfigs.set(componentId, configMap);
            });
        }
    }
}

// 创建单例实例
let parameterDisplayManagerInstance = null;

/**
 * 获取ParameterDisplayManager单例实例
 * @param {Object} options
 * @returns {ParameterDisplayManager}
 */
export function getParameterDisplayManager(options = {}) {
    if (!parameterDisplayManagerInstance) {
        parameterDisplayManagerInstance = new ParameterDisplayManager(options);
    }
    return parameterDisplayManagerInstance;
}

/**
 * 重置ParameterDisplayManager单例
 */
export function resetParameterDisplayManager() {
    parameterDisplayManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ParameterDisplayManager = ParameterDisplayManager;
    window.ParameterUnits = ParameterUnits;
    window.LabelPosition = LabelPosition;
    window.getParameterDisplayManager = getParameterDisplayManager;
}
