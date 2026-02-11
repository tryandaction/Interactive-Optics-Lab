/**
 * SymbolLibrary.js - 符号库
 * 管理专业绘图模式下的光学元件符号
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

/**
 * 生成唯一ID
 */
function generateSymbolId() {
    return 'symbol_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 符号定义数据结构
 * @typedef {Object} SymbolDefinition
 * @property {string} id - 符号唯一标识
 * @property {string} name - 符号名称
 * @property {string} category - 符号分类
 * @property {Function} draw - 绘制函数 (ctx, x, y, angle, size, style) => void
 * @property {Function} boundingBox - 边界框计算函数 (size) => {width, height}
 * @property {Object} defaultStyle - 默认样式
 */

/**
 * 符号样式配置
 * @typedef {Object} SymbolStyle
 * @property {string} color - 线条颜色
 * @property {string} fillColor - 填充颜色
 * @property {number} lineWidth - 线条宽度
 * @property {boolean} filled - 是否填充
 * @property {number} size - 符号大小
 */

/**
 * 符号库类
 * 负责管理和渲染专业光学元件符号
 */
export class SymbolLibrary {
    constructor() {
        /** @type {Map<string, SymbolDefinition>} 符号注册表 */
        this.symbols = new Map();
        
        /** @type {Map<string, string[]>} 分类索引 */
        this.categories = new Map();
        
        /** @type {Object} 默认样式 */
        this.defaultStyle = {
            color: '#000000',
            fillColor: '#000000',
            lineWidth: 2,
            filled: false,
            size: 30
        };
        
        // 初始化标准符号
        this._initializeStandardSymbols();
    }

    /**
     * 注册新符号
     * @param {string} componentType - 组件类型名称
     * @param {SymbolDefinition} definition - 符号定义
     */
    registerSymbol(componentType, definition) {
        const symbol = {
            id: definition.id || generateSymbolId(),
            name: definition.name || componentType,
            category: definition.category || 'misc',
            draw: definition.draw,
            boundingBox: definition.boundingBox || ((size) => ({ width: size, height: size })),
            defaultStyle: { ...this.defaultStyle, ...definition.defaultStyle }
        };
        
        this.symbols.set(componentType, symbol);
        
        // 更新分类索引
        if (!this.categories.has(symbol.category)) {
            this.categories.set(symbol.category, []);
        }
        this.categories.get(symbol.category).push(componentType);
        
        return symbol;
    }

    /**
     * 获取符号定义
     * @param {string} componentType - 组件类型名称
     * @returns {SymbolDefinition|null}
     */
    getSymbol(componentType) {
        return this.symbols.get(componentType) || null;
    }

    /**
     * 检查符号是否存在
     * @param {string} componentType - 组件类型名称
     * @returns {boolean}
     */
    hasSymbol(componentType) {
        return this.symbols.has(componentType);
    }

    /**
     * 获取所有符号类型
     * @returns {string[]}
     */
    getAllSymbolTypes() {
        return Array.from(this.symbols.keys());
    }

    /**
     * 获取指定分类的符号
     * @param {string} category - 分类名称
     * @returns {string[]}
     */
    getSymbolsByCategory(category) {
        return this.categories.get(category) || [];
    }

    /**
     * 获取所有分类
     * @returns {string[]}
     */
    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    /**
     * 渲染符号
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {string} componentType - 组件类型名称
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} angle - 旋转角度（弧度）
     * @param {number} size - 符号大小
     * @param {SymbolStyle} style - 样式配置
     */
    renderSymbol(ctx, componentType, x, y, angle = 0, size = 30, style = {}) {
        const symbol = this.getSymbol(componentType);
        
        if (!symbol) {
            console.warn(`SymbolLibrary: Symbol not found for "${componentType}"`);
            this._renderFallbackSymbol(ctx, x, y, angle, size, style);
            return;
        }

        // 合并样式
        const mergedStyle = {
            ...this.defaultStyle,
            ...symbol.defaultStyle,
            ...style,
            size
        };

        ctx.save();
        
        // 应用样式
        ctx.strokeStyle = mergedStyle.color;
        ctx.fillStyle = mergedStyle.fillColor;
        ctx.lineWidth = mergedStyle.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 绘制符号
        try {
            symbol.draw(ctx, x, y, angle, size, mergedStyle);
        } catch (error) {
            console.error(`SymbolLibrary: Error rendering symbol "${componentType}":`, error);
            this._renderFallbackSymbol(ctx, x, y, angle, size, mergedStyle);
        }
        
        ctx.restore();
    }

    /**
     * 获取符号边界框
     * @param {string} componentType - 组件类型名称
     * @param {number} size - 符号大小
     * @returns {{width: number, height: number}}
     */
    getBoundingBox(componentType, size = 30) {
        const symbol = this.getSymbol(componentType);
        if (!symbol) {
            return { width: size, height: size };
        }
        return symbol.boundingBox(size);
    }

    /**
     * 渲染后备符号（当找不到符号定义时）
     * @private
     */
    _renderFallbackSymbol(ctx, x, y, angle, size, style) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // 绘制一个简单的方框表示未知符号
        ctx.strokeStyle = style.color || '#666666';
        ctx.lineWidth = style.lineWidth || 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        // 绘制问号
        ctx.setLineDash([]);
        ctx.font = `${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = style.color || '#666666';
        ctx.fillText('?', 0, 0);
        
        ctx.restore();
    }

    /**
     * 初始化标准光学元件符号
     * @private
     */
    _initializeStandardSymbols() {
        // 激光光源符号
        this._registerLaserSource();
        
        // 反射镜符号
        this._registerMirror();
        
        // 透镜符号
        this._registerThinLens();
        
        // AOM符号
        this._registerAOM();
        
        // 分束器符号
        this._registerBeamSplitter();
        
        // 偏振片符号
        this._registerPolarizer();
        
        // 探测器符号
        this._registerScreen();
        this._registerPhotodiode();
        
        // 原子气室符号
        this._registerAtomicCell();
        
        // 波片符号
        this._registerWaveplate();
        
        // 光纤符号
        this._registerFiber();
        
        // 光阑符号
        this._registerAperture();
    }


    /**
     * 注册激光光源符号
     * @private
     */
    _registerLaserSource() {
        this.registerSymbol('LaserSource', {
            name: '激光光源',
            category: 'sources',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                const w = size;
                const h = size * 0.5;
                
                // 激光器主体（矩形）
                if (style.filled) {
                    ctx.fillRect(-w/2, -h/2, w, h);
                }
                ctx.strokeRect(-w/2, -h/2, w, h);
                
                // 输出光束箭头
                ctx.beginPath();
                ctx.moveTo(w/2, 0);
                ctx.lineTo(w/2 + size * 0.3, 0);
                ctx.stroke();
                
                // 箭头头部
                const arrowSize = size * 0.15;
                ctx.beginPath();
                ctx.moveTo(w/2 + size * 0.3, 0);
                ctx.lineTo(w/2 + size * 0.3 - arrowSize, -arrowSize * 0.6);
                ctx.lineTo(w/2 + size * 0.3 - arrowSize, arrowSize * 0.6);
                ctx.closePath();
                ctx.fill();
                
                // 内部波浪线表示激光
                ctx.beginPath();
                const waveStart = -w/4;
                const waveEnd = w/4;
                const waveAmp = h * 0.2;
                for (let i = waveStart; i <= waveEnd; i += 2) {
                    const yOffset = Math.sin((i - waveStart) / (waveEnd - waveStart) * Math.PI * 3) * waveAmp;
                    if (i === waveStart) {
                        ctx.moveTo(i, yOffset);
                    } else {
                        ctx.lineTo(i, yOffset);
                    }
                }
                ctx.stroke();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 1.5, height: size * 0.5 }),
            defaultStyle: { color: '#000000', fillColor: '#ffffff', filled: false }
        });
    }

    /**
     * 注册反射镜符号
     * @private
     */
    _registerMirror() {
        this.registerSymbol('Mirror', {
            name: '反射镜',
            category: 'mirrors',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 反射面（粗线）
                ctx.lineWidth = style.lineWidth * 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -size/2);
                ctx.lineTo(0, size/2);
                ctx.stroke();
                
                // 背面阴影线（表示镜面背面）
                ctx.lineWidth = style.lineWidth * 0.5;
                const spacing = size / 8;
                for (let i = -size/2 + spacing; i < size/2; i += spacing) {
                    ctx.beginPath();
                    ctx.moveTo(-2, i);
                    ctx.lineTo(-size * 0.2, i + spacing);
                    ctx.stroke();
                }
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.3, height: size }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }

    /**
     * 注册透镜符号
     * @private
     */
    _registerThinLens() {
        this.registerSymbol('ThinLens', {
            name: '薄透镜',
            category: 'lenses',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 双凸透镜轮廓
                ctx.beginPath();
                
                // 左侧弧线
                ctx.arc(-size * 0.3, 0, size * 0.6, -Math.PI/3, Math.PI/3, false);
                
                // 右侧弧线
                ctx.arc(size * 0.3, 0, size * 0.6, Math.PI - Math.PI/3, Math.PI + Math.PI/3, false);
                
                ctx.closePath();
                
                if (style.filled) {
                    ctx.fillStyle = 'rgba(100, 150, 255, 0.2)';
                    ctx.fill();
                }
                ctx.stroke();
                
                // 上下箭头表示会聚透镜
                const arrowSize = size * 0.15;
                
                // 上箭头
                ctx.beginPath();
                ctx.moveTo(0, -size/2 - arrowSize);
                ctx.lineTo(-arrowSize * 0.6, -size/2);
                ctx.lineTo(arrowSize * 0.6, -size/2);
                ctx.closePath();
                ctx.fill();
                
                // 下箭头
                ctx.beginPath();
                ctx.moveTo(0, size/2 + arrowSize);
                ctx.lineTo(-arrowSize * 0.6, size/2);
                ctx.lineTo(arrowSize * 0.6, size/2);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.6, height: size * 1.2 }),
            defaultStyle: { color: '#000000', fillColor: '#000000', filled: false }
        });
    }

    /**
     * 注册AOM符号
     * @private
     */
    _registerAOM() {
        this.registerSymbol('AcoustoOpticModulator', {
            name: '声光调制器',
            category: 'modulators',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                const w = size;
                const h = size * 0.6;
                
                // AOM主体（矩形）
                if (style.filled) {
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
                    ctx.fillRect(-w/2, -h/2, w, h);
                }
                ctx.strokeRect(-w/2, -h/2, w, h);
                
                // 声波符号（波浪线）
                ctx.beginPath();
                const waveY = h * 0.25;
                for (let i = -w/2 + 5; i < w/2 - 5; i += 2) {
                    const yOffset = Math.sin((i + w/2) / w * Math.PI * 4) * h * 0.15;
                    if (i === -w/2 + 5) {
                        ctx.moveTo(i, waveY + yOffset);
                    } else {
                        ctx.lineTo(i, waveY + yOffset);
                    }
                }
                ctx.stroke();
                
                // 标注 "AOM"
                ctx.font = `${size * 0.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = style.color;
                ctx.fillText('AOM', 0, -h * 0.15);
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size, height: size * 0.6 }),
            defaultStyle: { color: '#000000', filled: false }
        });
        
        // 别名
        this.symbols.set('AOM', this.symbols.get('AcoustoOpticModulator'));
    }

    /**
     * 注册分束器符号
     * @private
     */
    _registerBeamSplitter() {
        this.registerSymbol('BeamSplitter', {
            name: '分束器',
            category: 'splitters',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 正方形外框
                const s = size * 0.7;
                ctx.strokeRect(-s/2, -s/2, s, s);
                
                // 对角线（分束面）
                ctx.beginPath();
                ctx.moveTo(-s/2, s/2);
                ctx.lineTo(s/2, -s/2);
                ctx.stroke();
                
                // 分束面阴影线
                ctx.lineWidth = style.lineWidth * 0.5;
                const spacing = s / 6;
                for (let i = 1; i < 6; i++) {
                    const offset = i * spacing;
                    ctx.beginPath();
                    ctx.moveTo(-s/2 + offset, s/2);
                    ctx.lineTo(-s/2 + offset - s * 0.1, s/2 - s * 0.1);
                    ctx.stroke();
                }
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.7, height: size * 0.7 }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
        
        // PBS别名
        this.registerSymbol('PBS', {
            name: '偏振分束器',
            category: 'splitters',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 正方形外框
                const s = size * 0.7;
                ctx.strokeRect(-s/2, -s/2, s, s);
                
                // 对角线（分束面）
                ctx.lineWidth = style.lineWidth * 1.5;
                ctx.beginPath();
                ctx.moveTo(-s/2, s/2);
                ctx.lineTo(s/2, -s/2);
                ctx.stroke();
                
                // 标注 "PBS"
                ctx.font = `${size * 0.18}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = style.color;
                ctx.fillText('PBS', 0, s * 0.25);
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.7, height: size * 0.7 }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }


    /**
     * 注册偏振片符号
     * @private
     */
    _registerPolarizer() {
        this.registerSymbol('Polarizer', {
            name: '偏振片',
            category: 'polarizers',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 圆形外框
                ctx.beginPath();
                ctx.arc(0, 0, size/2, 0, Math.PI * 2);
                if (style.filled) {
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
                    ctx.fill();
                }
                ctx.stroke();
                
                // 偏振方向线（双向箭头）
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.35);
                ctx.lineTo(0, size * 0.35);
                ctx.stroke();
                
                // 上箭头
                const arrowSize = size * 0.1;
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.35);
                ctx.lineTo(-arrowSize, -size * 0.25);
                ctx.moveTo(0, -size * 0.35);
                ctx.lineTo(arrowSize, -size * 0.25);
                ctx.stroke();
                
                // 下箭头
                ctx.beginPath();
                ctx.moveTo(0, size * 0.35);
                ctx.lineTo(-arrowSize, size * 0.25);
                ctx.moveTo(0, size * 0.35);
                ctx.lineTo(arrowSize, size * 0.25);
                ctx.stroke();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size, height: size }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }

    /**
     * 注册屏幕/探测器符号
     * @private
     */
    _registerScreen() {
        this.registerSymbol('Screen', {
            name: '屏幕',
            category: 'detectors',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 屏幕主体（粗线）
                ctx.lineWidth = style.lineWidth * 2;
                ctx.beginPath();
                ctx.moveTo(0, -size/2);
                ctx.lineTo(0, size/2);
                ctx.stroke();
                
                // 底座
                ctx.lineWidth = style.lineWidth;
                ctx.beginPath();
                ctx.moveTo(-size * 0.2, size/2);
                ctx.lineTo(size * 0.2, size/2);
                ctx.stroke();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.4, height: size }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }

    /**
     * 注册光电二极管符号
     * @private
     */
    _registerPhotodiode() {
        this.registerSymbol('Photodiode', {
            name: '光电二极管',
            category: 'detectors',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 二极管三角形
                ctx.beginPath();
                ctx.moveTo(-size * 0.3, -size * 0.3);
                ctx.lineTo(-size * 0.3, size * 0.3);
                ctx.lineTo(size * 0.2, 0);
                ctx.closePath();
                if (style.filled) {
                    ctx.fill();
                }
                ctx.stroke();
                
                // 阴极线
                ctx.beginPath();
                ctx.moveTo(size * 0.2, -size * 0.3);
                ctx.lineTo(size * 0.2, size * 0.3);
                ctx.stroke();
                
                // 光线箭头（表示光电效应）
                ctx.lineWidth = style.lineWidth * 0.7;
                const arrowLen = size * 0.25;
                
                // 上方光线
                ctx.beginPath();
                ctx.moveTo(-size * 0.5, -size * 0.35);
                ctx.lineTo(-size * 0.3, -size * 0.15);
                ctx.stroke();
                this._drawSmallArrow(ctx, -size * 0.3, -size * 0.15, Math.PI * 0.25, size * 0.08);
                
                // 下方光线
                ctx.beginPath();
                ctx.moveTo(-size * 0.5, size * 0.05);
                ctx.lineTo(-size * 0.3, size * 0.15);
                ctx.stroke();
                this._drawSmallArrow(ctx, -size * 0.3, size * 0.15, Math.PI * 0.15, size * 0.08);
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.7, height: size * 0.7 }),
            defaultStyle: { color: '#000000', lineWidth: 2, filled: false }
        });
    }

    /**
     * 注册原子气室符号
     * @private
     */
    _registerAtomicCell() {
        this.registerSymbol('AtomicCell', {
            name: '原子气室',
            category: 'atomic',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                const w = size * 1.2;
                const h = size * 0.6;
                
                // 气室主体（圆角矩形）
                const radius = h * 0.3;
                ctx.beginPath();
                ctx.moveTo(-w/2 + radius, -h/2);
                ctx.lineTo(w/2 - radius, -h/2);
                ctx.arcTo(w/2, -h/2, w/2, -h/2 + radius, radius);
                ctx.lineTo(w/2, h/2 - radius);
                ctx.arcTo(w/2, h/2, w/2 - radius, h/2, radius);
                ctx.lineTo(-w/2 + radius, h/2);
                ctx.arcTo(-w/2, h/2, -w/2, h/2 - radius, radius);
                ctx.lineTo(-w/2, -h/2 + radius);
                ctx.arcTo(-w/2, -h/2, -w/2 + radius, -h/2, radius);
                ctx.closePath();
                
                if (style.filled) {
                    ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
                    ctx.fill();
                }
                ctx.stroke();
                
                // 内部原子符号（小圆点）
                ctx.fillStyle = style.color;
                const dotSize = size * 0.04;
                const dots = [
                    [-w * 0.2, -h * 0.1],
                    [w * 0.1, h * 0.1],
                    [-w * 0.1, h * 0.15],
                    [w * 0.2, -h * 0.15],
                    [0, 0]
                ];
                dots.forEach(([dx, dy]) => {
                    ctx.beginPath();
                    ctx.arc(dx, dy, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 1.2, height: size * 0.6 }),
            defaultStyle: { color: '#000000', lineWidth: 2, filled: false }
        });
        
        // 别名
        this.symbols.set('VaporCell', this.symbols.get('AtomicCell'));
        this.symbols.set('GasCell', this.symbols.get('AtomicCell'));
    }

    /**
     * 注册波片符号
     * @private
     */
    _registerWaveplate() {
        // 半波片
        this.registerSymbol('HalfWavePlate', {
            name: '半波片',
            category: 'waveplates',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 矩形主体
                const w = size * 0.15;
                const h = size * 0.8;
                ctx.strokeRect(-w/2, -h/2, w, h);
                
                // λ/2 标注
                ctx.font = `${size * 0.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = style.color;
                ctx.fillText('λ/2', w/2 + size * 0.2, 0);
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.5, height: size * 0.8 }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
        
        // 四分之一波片
        this.registerSymbol('QuarterWavePlate', {
            name: '四分之一波片',
            category: 'waveplates',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 矩形主体
                const w = size * 0.15;
                const h = size * 0.8;
                ctx.strokeRect(-w/2, -h/2, w, h);
                
                // λ/4 标注
                ctx.font = `${size * 0.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = style.color;
                ctx.fillText('λ/4', w/2 + size * 0.2, 0);
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.5, height: size * 0.8 }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }

    /**
     * 注册光纤符号
     * @private
     */
    _registerFiber() {
        this.registerSymbol('Fiber', {
            name: '光纤',
            category: 'fibers',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 光纤线（波浪形）
                ctx.beginPath();
                const startX = -size * 0.6;
                const endX = size * 0.6;
                for (let i = startX; i <= endX; i += 2) {
                    const yOffset = Math.sin((i - startX) / (endX - startX) * Math.PI * 2) * size * 0.1;
                    if (i === startX) {
                        ctx.moveTo(i, yOffset);
                    } else {
                        ctx.lineTo(i, yOffset);
                    }
                }
                ctx.stroke();
                
                // 两端连接器
                const connSize = size * 0.15;
                ctx.fillStyle = style.color;
                
                // 左端
                ctx.beginPath();
                ctx.arc(startX, 0, connSize, 0, Math.PI * 2);
                ctx.fill();
                
                // 右端
                ctx.beginPath();
                ctx.arc(endX, 0, connSize, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 1.4, height: size * 0.4 }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
    }

    /**
     * 注册光阑符号
     * @private
     */
    _registerAperture() {
        this.registerSymbol('Aperture', {
            name: '光阑',
            category: 'misc',
            draw: (ctx, x, y, angle, size, style) => {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle);
                
                // 上半部分
                ctx.lineWidth = style.lineWidth * 1.5;
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.15);
                ctx.lineTo(0, -size/2);
                ctx.stroke();
                
                // 下半部分
                ctx.beginPath();
                ctx.moveTo(0, size * 0.15);
                ctx.lineTo(0, size/2);
                ctx.stroke();
                
                // 上挡板
                ctx.lineWidth = style.lineWidth;
                ctx.beginPath();
                ctx.moveTo(-size * 0.2, -size * 0.15);
                ctx.lineTo(size * 0.2, -size * 0.15);
                ctx.stroke();
                
                // 下挡板
                ctx.beginPath();
                ctx.moveTo(-size * 0.2, size * 0.15);
                ctx.lineTo(size * 0.2, size * 0.15);
                ctx.stroke();
                
                ctx.restore();
            },
            boundingBox: (size) => ({ width: size * 0.4, height: size }),
            defaultStyle: { color: '#000000', lineWidth: 2 }
        });
        
        // 别名
        this.symbols.set('Iris', this.symbols.get('Aperture'));
    }

    /**
     * 绘制小箭头辅助函数
     * @private
     */
    _drawSmallArrow(ctx, x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size * 0.5);
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, size * 0.5);
        ctx.stroke();
        
        ctx.restore();
    }

    /**
     * 序列化符号库配置
     * @returns {Object}
     */
    serialize() {
        const symbolData = {};
        this.symbols.forEach((symbol, type) => {
            symbolData[type] = {
                name: symbol.name,
                category: symbol.category,
                defaultStyle: symbol.defaultStyle
            };
        });
        return {
            defaultStyle: this.defaultStyle,
            symbols: symbolData
        };
    }
}

// 创建单例实例
let symbolLibraryInstance = null;

/**
 * 获取SymbolLibrary单例实例
 * @returns {SymbolLibrary}
 */
export function getSymbolLibrary() {
    if (!symbolLibraryInstance) {
        symbolLibraryInstance = new SymbolLibrary();
    }
    return symbolLibraryInstance;
}

/**
 * 重置SymbolLibrary单例（主要用于测试）
 */
export function resetSymbolLibrary() {
    symbolLibraryInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SymbolLibrary = SymbolLibrary;
    window.getSymbolLibrary = getSymbolLibrary;
}
