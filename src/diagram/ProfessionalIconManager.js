/**
 * ProfessionalIconManager.js - 专业图标管理器
 * 管理高质量SVG光学元件图标的加载、缓存和渲染
 * 
 * Requirements: 1.1, 1.3, 1.7, 6.1, 6.2, 6.5
 */

/**
 * 生成唯一ID
 */
function generateIconId() {
    return 'icon_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 连接点类型
 */
export const CONNECTION_POINT_TYPES = {
    INPUT: 'input',
    OUTPUT: 'output',
    BIDIRECTIONAL: 'bidirectional'
};

/**
 * 图标分类
 */
export const ICON_CATEGORIES = {
    SOURCES: 'sources',
    MIRRORS: 'mirrors',
    LENSES: 'lenses',
    SPLITTERS: 'splitters',
    MODULATORS: 'modulators',
    WAVEPLATES: 'waveplates',
    POLARIZERS: 'polarizers',
    DETECTORS: 'detectors',
    ATOMIC: 'atomic',
    FIBERS: 'fibers',
    MISC: 'misc'
};

/**
 * 专业图标管理器类
 */
export class ProfessionalIconManager {
    constructor() {
        this.iconDefinitions = new Map();
        this.iconCache = new Map();
        this.loadingPromises = new Map();
        this.categories = new Map();
        this.aliasMap = new Map();
        this.defaultStyle = {
            color: '#000000',
            fillColor: '#333333',
            strokeWidth: 1.5,
            scale: 1.0,
            opacity: 1.0,
            preserveSvgColors: true
        };
        this.variants = new Map();
        this._builtinDrawFunctions = {};
        this._initializeBuiltinIcons();
    }

    registerIcon(componentType, definition) {
        const icon = {
            id: definition.id || generateIconId(),
            name: definition.name || componentType,
            category: definition.category || ICON_CATEGORIES.MISC,
            svgContent: definition.svgContent || null,
            width: definition.width || 60,
            height: definition.height || 60,
            connectionPoints: definition.connectionPoints || [],
            defaultStyle: { ...this.defaultStyle, ...definition.defaultStyle }
        };
        this.iconDefinitions.set(componentType, icon);
        if (!this.categories.has(icon.category)) {
            this.categories.set(icon.category, []);
        }
        const categoryList = this.categories.get(icon.category);
        if (!categoryList.includes(componentType)) {
            categoryList.push(componentType);
        }
        return icon;
    }

    /**
     * 注册别名，用于将组件类型映射到已有图标类型
     */
    registerAlias(aliasType, targetType) {
        if (!aliasType || !targetType || aliasType === targetType) {
            return false;
        }
        this.aliasMap.set(aliasType, targetType);
        return true;
    }

    /**
     * 解析图标类型（处理别名）
     */
    resolveIconType(componentType) {
        if (!componentType) return componentType;
        let current = componentType;
        const visited = new Set([current]);
        while (this.aliasMap.has(current) && !this.iconDefinitions.has(current)) {
            const next = this.aliasMap.get(current);
            if (!next || visited.has(next)) break;
            visited.add(next);
            current = next;
        }
        return current;
    }

    getIconDefinition(componentType) {
        if (this.iconDefinitions.has(componentType)) {
            return this.iconDefinitions.get(componentType) || null;
        }
        const resolved = this.resolveIconType(componentType);
        return this.iconDefinitions.get(resolved) || null;
    }

    hasIcon(componentType) {
        if (this.iconDefinitions.has(componentType)) return true;
        const resolved = this.resolveIconType(componentType);
        return this.iconDefinitions.has(resolved);
    }

    getAllIconTypes() {
        return Array.from(this.iconDefinitions.keys());
    }

    getIconsByCategory(category) {
        return this.categories.get(category) || [];
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    getConnectionPoints(componentType) {
        const icon = this.getIconDefinition(componentType);
        return icon ? [...icon.connectionPoints] : [];
    }

    async loadSVG(svgSource, cacheKey) {
        if (this.iconCache.has(cacheKey)) {
            return this.iconCache.get(cacheKey).cloneNode(true);
        }
        if (this.loadingPromises.has(cacheKey)) {
            const cached = await this.loadingPromises.get(cacheKey);
            return cached.cloneNode(true);
        }
        const loadPromise = this._loadSVGInternal(svgSource);
        this.loadingPromises.set(cacheKey, loadPromise);
        try {
            const svgElement = await loadPromise;
            this.iconCache.set(cacheKey, svgElement);
            return svgElement.cloneNode(true);
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    async _loadSVGInternal(svgSource) {
        if (svgSource.startsWith('http') || svgSource.startsWith('/')) {
            const response = await fetch(svgSource);
            const svgText = await response.text();
            return this._parseSVG(svgText);
        } else if (svgSource.startsWith('<svg') || svgSource.startsWith('<?xml')) {
            return this._parseSVG(svgSource);
        } else {
            throw new Error('Invalid SVG source: must be URL or SVG content');
        }
    }

    _parseSVG(svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = doc.querySelector('svg');
        if (!svgElement) {
            throw new Error('Invalid SVG: no svg element found');
        }
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
            throw new Error('SVG parse error: ' + parserError.textContent);
        }
        return svgElement;
    }

    renderIcon(ctx, componentType, x, y, angle = 0, scale = 1, style = {}) {
        const resolvedType = this.resolveIconType(componentType);
        const icon = this.getIconDefinition(resolvedType);
        if (!icon) {
            console.warn(`ProfessionalIconManager: Icon not found for "${componentType}"`);
            this._renderPlaceholder(ctx, x, y, angle, scale, componentType);
            return;
        }
        const mergedStyle = { ...icon.defaultStyle, ...style };
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        if (mergedStyle.opacity !== undefined) {
            ctx.globalAlpha = mergedStyle.opacity;
        }
        if (icon.svgContent) {
            this._renderSVGToCanvas(ctx, icon, mergedStyle);
        } else {
            this._renderBuiltinIcon(ctx, resolvedType, icon, mergedStyle);
        }
        ctx.restore();
    }

    _renderSVGToCanvas(ctx, icon, style) {
        const cacheKey = icon.id + '_' + JSON.stringify(style);
        if (this.iconCache.has(cacheKey + '_img')) {
            const img = this.iconCache.get(cacheKey + '_img');
            ctx.drawImage(img, -icon.width / 2, -icon.height / 2, icon.width, icon.height);
            return;
        }
        this._loadSVGAsImage(icon, style).then(img => {
            this.iconCache.set(cacheKey + '_img', img);
            // 异步加载完成后触发重绘，否则用户永远只看到占位符
            if (typeof window !== 'undefined' && window.needsRetrace !== undefined) {
                window.needsRetrace = true;
            }
        }).catch(err => {
            console.warn(`ProfessionalIconManager: Failed to load SVG icon "${icon.name}":`, err);
        });
        this._renderPlaceholder(ctx, 0, 0, 0, 1, icon.name);
    }

    async _loadSVGAsImage(icon, style) {
        let svgContent = icon.svgContent;
        svgContent = this._applySVGStyle(svgContent, style);
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load SVG as image')); };
            img.src = url;
        });
    }

    _applySVGStyle(svgContent, style) {
        if (style.preserveSvgColors) {
            return svgContent;
        }
        let styled = svgContent;
        if (style.color) {
            styled = styled.replace(/stroke="[^"]*"/g, `stroke="${style.color}"`);
        }
        if (style.fillColor) {
            styled = styled.replace(/fill="[^"]*"/g, `fill="${style.fillColor}"`);
        }
        if (style.strokeWidth) {
            styled = styled.replace(/stroke-width="[^"]*"/g, `stroke-width="${style.strokeWidth}"`);
        }
        return styled;
    }

    /**
     * 预加载单个专业图标的SVG图像
     * @param {string} componentType
     * @param {Object} style
     * @returns {Promise<boolean>}
     */
    async preloadIcon(componentType, style = {}) {
        const icon = this.getIconDefinition(componentType);
        if (!icon || !icon.svgContent) return false;
        const mergedStyle = { ...icon.defaultStyle, ...style };
        const cacheKey = icon.id + '_' + JSON.stringify(mergedStyle);
        if (this.iconCache.has(cacheKey + '_img')) return true;
        const img = await this._loadSVGAsImage(icon, mergedStyle);
        this.iconCache.set(cacheKey + '_img', img);
        return true;
    }

    /**
     * 预加载多个图标
     * @param {string[]} componentTypes
     * @param {Object} style
     * @returns {Promise<void>}
     */
    async preloadIcons(componentTypes = [], style = {}) {
        const uniqueTypes = Array.from(new Set(componentTypes));
        const tasks = uniqueTypes.map(type => this.preloadIcon(type, style));
        await Promise.all(tasks);
    }

    _renderPlaceholder(ctx, x, y, angle, scale, label) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        const size = 40;
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-size / 2, -size / 2, size, size);
        ctx.setLineDash([]);
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 0);
        if (label) {
            ctx.font = '10px Arial';
            ctx.fillText(label.substring(0, 8), 0, size / 2 + 10);
        }
        ctx.restore();
    }

    _renderBuiltinIcon(ctx, componentType, icon, style) {
        const drawFunc = this._builtinDrawFunctions[componentType];
        if (drawFunc) {
            drawFunc(ctx, icon, style);
        } else {
            this._renderPlaceholder(ctx, 0, 0, 0, 1, icon.name);
        }
    }

    getBoundingBox(componentType, scale = 1) {
        const icon = this.getIconDefinition(componentType);
        if (!icon) return { width: 40 * scale, height: 40 * scale };
        return { width: icon.width * scale, height: icon.height * scale };
    }

    getConnectionPointWorldPosition(componentType, pointId, componentPos, angle = 0, scale = 1) {
        const icon = this.getIconDefinition(componentType);
        if (!icon) return null;
        const point = icon.connectionPoints.find(p => p.id === pointId);
        if (!point) return null;
        const localX = (point.position.x - 0.5) * icon.width * scale;
        const localY = (point.position.y - 0.5) * icon.height * scale;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const worldX = componentPos.x + localX * cos - localY * sin;
        const worldY = componentPos.y + localX * sin + localY * cos;
        const worldDirection = (point.direction * Math.PI / 180) + angle;
        return { x: worldX, y: worldY, direction: worldDirection };
    }

    findNearestConnectionPoint(position, components, maxDistance = 20) {
        let nearest = null;
        let minDist = maxDistance;
        for (const comp of components) {
            const points = this.getConnectionPoints(comp.type || comp.constructor?.name);
            for (const point of points) {
                const worldPos = this.getConnectionPointWorldPosition(
                    comp.type || comp.constructor?.name,
                    point.id,
                    comp.pos || { x: comp.x, y: comp.y },
                    comp.angle ?? comp.angleRad ?? 0,
                    comp.scale || 1
                );
                if (!worldPos) continue;
                const dist = Math.hypot(position.x - worldPos.x, position.y - worldPos.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = { component: comp, point, worldPos };
                }
            }
        }
        return nearest;
    }

    importCustomIcon(componentType, svgContent, options = {}) {
        const svgElement = this._parseSVG(svgContent);
        const viewBox = svgElement.getAttribute('viewBox');
        let width = 60, height = 60;
        if (viewBox) {
            const parts = viewBox.split(/\s+/);
            if (parts.length >= 4) {
                width = parseFloat(parts[2]) || 60;
                height = parseFloat(parts[3]) || 60;
            }
        } else {
            width = parseFloat(svgElement.getAttribute('width')) || 60;
            height = parseFloat(svgElement.getAttribute('height')) || 60;
        }
        this.registerIcon(componentType, {
            name: options.name || componentType,
            category: options.category || ICON_CATEGORIES.MISC,
            svgContent: svgContent,
            width, height,
            connectionPoints: options.connectionPoints || [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ],
            defaultStyle: options.defaultStyle
        });
    }

    clearCache() {
        this.iconCache.clear();
        this.loadingPromises.clear();
    }

    serialize() {
        const icons = {};
        this.iconDefinitions.forEach((icon, type) => {
            icons[type] = {
                name: icon.name,
                category: icon.category,
                width: icon.width,
                height: icon.height,
                connectionPoints: icon.connectionPoints,
                hasSvg: !!icon.svgContent
            };
        });
        return { defaultStyle: this.defaultStyle, icons };
    }

    /**
     * 初始化内置专业图标
     * 使用3D风格绘制函数，参考ComponentLibrary (gwoptics.de)
     */
    _initializeBuiltinIcons() {
        // ========== 光源 ==========
        this.registerIcon('LaserSource', {
            name: '激光光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 80, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['LaserSource'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 3D激光器主体
            const grad = ctx.createLinearGradient(-w/2, -h/2, -w/2, h/2);
            grad.addColorStop(0, '#666666');
            grad.addColorStop(0.3, '#999999');
            grad.addColorStop(0.7, '#888888');
            grad.addColorStop(1, '#555555');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w * 0.85, h);
            ctx.strokeStyle = style.color || '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w * 0.85, h);
            // 输出窗口
            ctx.fillStyle = '#4488ff';
            ctx.fillRect(w/2 - w*0.2, -h/4, w*0.05, h/2);
            // 输出光束
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w/2 - w*0.15, 0);
            ctx.lineTo(w/2, 0);
            ctx.stroke();
        };

        // ========== 反射镜 ==========
        this.registerIcon('Mirror', {
            name: '反射镜',
            category: ICON_CATEGORIES.MIRRORS,
            width: 12, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['Mirror'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 3D镜面效果
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, '#aaccff');
            grad.addColorStop(0.5, '#ffffff');
            grad.addColorStop(1, '#88aadd');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            // 边框
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            // 背面阴影线
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 0.8;
            const spacing = h / 8;
            for (let i = -h/2 + spacing; i < h/2; i += spacing) {
                ctx.beginPath();
                ctx.moveTo(w/2, i);
                ctx.lineTo(w/2 + 4, i + spacing * 0.6);
                ctx.stroke();
            }
        };

        // 二向色镜
        this.registerIcon('DichroicMirror', {
            name: '二向色镜',
            category: ICON_CATEGORIES.MIRRORS,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['DichroicMirror'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.save();
            ctx.rotate(Math.PI / 4);
            const grad = ctx.createLinearGradient(-s/3, 0, s/3, 0);
            grad.addColorStop(0, '#ffaaff');
            grad.addColorStop(0.5, '#aaffaa');
            grad.addColorStop(1, '#aaaaff');
            ctx.fillStyle = grad;
            ctx.fillRect(-3, -s/2.5, 6, s/1.25);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.strokeRect(-3, -s/2.5, 6, s/1.25);
            ctx.restore();
        };

        // ========== 透镜 ==========
        this.registerIcon('ConvexLens', {
            name: '凸透镜',
            category: ICON_CATEGORIES.LENSES,
            width: 20, height: 60,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['ConvexLens'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.beginPath();
            ctx.moveTo(0, -h/2);
            ctx.quadraticCurveTo(-w/2, 0, 0, h/2);
            ctx.quadraticCurveTo(w/2, 0, 0, -h/2);
            ctx.closePath();
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
            grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.5)');
            grad.addColorStop(1, 'rgba(100, 180, 255, 0.3)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#3366aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        this.registerIcon('ConcaveLens', {
            name: '凹透镜',
            category: ICON_CATEGORIES.LENSES,
            width: 20, height: 60,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['ConcaveLens'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.beginPath();
            ctx.moveTo(-w/2, -h/2);
            ctx.quadraticCurveTo(w/4, 0, -w/2, h/2);
            ctx.lineTo(w/2, h/2);
            ctx.quadraticCurveTo(-w/4, 0, w/2, -h/2);
            ctx.closePath();
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
            grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.5)');
            grad.addColorStop(1, 'rgba(100, 180, 255, 0.3)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = '#3366aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };
        // 别名
        this._builtinDrawFunctions['ThinLens'] = this._builtinDrawFunctions['ConvexLens'];
        this.iconDefinitions.set('ThinLens', this.iconDefinitions.get('ConvexLens'));
        this.registerAlias('ThinLens', 'ConvexLens');
        this.registerAlias('SphericalMirror', 'CurvedMirror');
        this.registerAlias('ConcaveMirror', 'CurvedMirror');
        this.registerAlias('ConvexMirror', 'CurvedMirror');
        this.registerAlias('ParabolicMirror', 'CurvedMirror');
        this.registerAlias('ParabolicMirrorToolbar', 'ParabolicMirror');

        // BS 是 BeamSplitter 的 type 属性值
        this.registerAlias('BS', 'BeamSplitter');

        // ========== 分束器 ==========
        this.registerIcon('BeamSplitter', {
            name: '分束器',
            category: ICON_CATEGORIES.SPLITTERS,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'transmitted', label: 'T', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: 'reflected', label: 'R', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['BeamSplitter'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height) * 0.8;
            // 立方体效果
            const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            grad.addColorStop(0, '#e8e8e8');
            grad.addColorStop(0.5, '#ffffff');
            grad.addColorStop(1, '#d0d0d0');
            ctx.fillStyle = grad;
            ctx.fillRect(-s/2, -s/2, s, s);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s/2, -s/2, s, s);
            // 分束面对角线
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-s/2, s/2);
            ctx.lineTo(s/2, -s/2);
            ctx.stroke();
        };

        this.registerIcon('PBS', {
            name: '偏振分束器',
            category: ICON_CATEGORIES.SPLITTERS,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 's-pol', label: 's', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: 'p-pol', label: 'p', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['PBS'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height) * 0.8;
            const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            grad.addColorStop(0, '#e0e8f0');
            grad.addColorStop(0.5, '#f8f8ff');
            grad.addColorStop(1, '#d0d8e0');
            ctx.fillStyle = grad;
            ctx.fillRect(-s/2, -s/2, s, s);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-s/2, -s/2, s, s);
            // PBS对角线（更粗）
            ctx.strokeStyle = '#0066cc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-s/2, s/2);
            ctx.lineTo(s/2, -s/2);
            ctx.stroke();
            // 标注
            ctx.fillStyle = '#333333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PBS', 0, s/2 + 12);
        };

        // ========== 调制器 ==========
        this.registerIcon('AOM', {
            name: '声光调制器',
            category: ICON_CATEGORIES.MODULATORS,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: '0th', label: '0', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: '+1st', label: '+1', position: { x: 0.95, y: 0.2 }, direction: -20, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: '-1st', label: '-1', position: { x: 0.95, y: 0.8 }, direction: 20, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['AOM'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 3D晶体效果
            const grad = ctx.createLinearGradient(-w/2, -h/2, -w/2, h/2);
            grad.addColorStop(0, '#b8d4e8');
            grad.addColorStop(0.3, '#d8ecf8');
            grad.addColorStop(0.7, '#c8dce8');
            grad.addColorStop(1, '#a8c4d8');
            ctx.fillStyle = grad;
            // 平行四边形形状
            ctx.beginPath();
            ctx.moveTo(-w/2 + 5, -h/2);
            ctx.lineTo(w/2, -h/2);
            ctx.lineTo(w/2 - 5, h/2);
            ctx.lineTo(-w/2, h/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#336699';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 声波符号
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(-w/4 + i * 8, h/2 + 8, 4 + i * 2, Math.PI, 0, true);
                ctx.stroke();
            }
            // 标注
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('AOM', 0, 3);
        };
        this._builtinDrawFunctions['AcoustoOpticModulator'] = this._builtinDrawFunctions['AOM'];
        this.iconDefinitions.set('AcoustoOpticModulator', this.iconDefinitions.get('AOM'));

        this.registerIcon('EOM', {
            name: '电光调制器',
            category: ICON_CATEGORIES.MODULATORS,
            width: 50, height: 30,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['EOM'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, -h/2, -w/2, h/2);
            grad.addColorStop(0, '#d8b8e8');
            grad.addColorStop(0.5, '#f0e0f8');
            grad.addColorStop(1, '#c8a8d8');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#663399';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            // 电极
            ctx.fillStyle = '#888888';
            ctx.fillRect(-w/2, -h/2 - 5, w, 5);
            ctx.fillRect(-w/2, h/2, w, 5);
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('EOM', 0, 3);
        };

        // ========== 波片 ==========
        this.registerIcon('HalfWavePlate', {
            name: '半波片',
            category: ICON_CATEGORIES.WAVEPLATES,
            width: 8, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['HalfWavePlate'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, '#aaddaa');
            grad.addColorStop(0.5, '#ccffcc');
            grad.addColorStop(1, '#88bb88');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#336633';
            ctx.lineWidth = 1;
            ctx.strokeRect(-w/2, -h/2, w, h);
            // 标注
            ctx.fillStyle = '#333333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('λ/2', w/2 + 4, 4);
        };

        this.registerIcon('QuarterWavePlate', {
            name: '四分之一波片',
            category: ICON_CATEGORIES.WAVEPLATES,
            width: 8, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['QuarterWavePlate'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, '#aaaadd');
            grad.addColorStop(0.5, '#ccccff');
            grad.addColorStop(1, '#8888bb');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#333366';
            ctx.lineWidth = 1;
            ctx.strokeRect(-w/2, -h/2, w, h);
            ctx.fillStyle = '#333333';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('λ/4', w/2 + 4, 4);
        };

        // ========== 偏振器 ==========
        this.registerIcon('Polarizer', {
            name: '偏振片',
            category: ICON_CATEGORIES.POLARIZERS,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['Polarizer'] = (ctx, icon, style) => {
            const r = Math.min(icon.width, icon.height) / 2;
            // 圆形外框
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 偏振方向箭头
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.7);
            ctx.lineTo(0, r * 0.7);
            ctx.stroke();
            // 箭头
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.7);
            ctx.lineTo(-4, -r * 0.5);
            ctx.moveTo(0, -r * 0.7);
            ctx.lineTo(4, -r * 0.5);
            ctx.stroke();
        };

        // ========== 探测器 ==========
        this.registerIcon('Photodiode', {
            name: '光电二极管',
            category: ICON_CATEGORIES.DETECTORS,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['Photodiode'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            // 3D外壳
            const grad = ctx.createLinearGradient(-s/2, -s/2, s/2, s/2);
            grad.addColorStop(0, '#444444');
            grad.addColorStop(0.5, '#666666');
            grad.addColorStop(1, '#333333');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 感光窗口
            ctx.fillStyle = '#224488';
            ctx.beginPath();
            ctx.arc(0, 0, s/4, 0, Math.PI * 2);
            ctx.fill();
            // 光线箭头
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-s/2 - 5, -5);
            ctx.lineTo(-s/3, 0);
            ctx.moveTo(-s/2 - 5, 5);
            ctx.lineTo(-s/3, 0);
            ctx.stroke();
        };

        this.registerIcon('Screen', {
            name: '屏幕',
            category: ICON_CATEGORIES.DETECTORS,
            width: 10, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['Screen'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#333333';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 1;
            ctx.strokeRect(-w/2, -h/2, w, h);
        };

        // ========== 原子/气室 ==========
        this.registerIcon('AtomicCell', {
            name: '原子气室',
            category: ICON_CATEGORIES.ATOMIC,
            width: 70, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['AtomicCell'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 玻璃气室3D效果
            const grad = ctx.createLinearGradient(-w/2, -h/2, -w/2, h/2);
            grad.addColorStop(0, 'rgba(255, 220, 180, 0.4)');
            grad.addColorStop(0.5, 'rgba(255, 240, 220, 0.6)');
            grad.addColorStop(1, 'rgba(255, 200, 150, 0.4)');
            ctx.fillStyle = grad;
            // 圆角矩形
            const r = h * 0.3;
            ctx.beginPath();
            ctx.moveTo(-w/2 + r, -h/2);
            ctx.lineTo(w/2 - r, -h/2);
            ctx.arcTo(w/2, -h/2, w/2, -h/2 + r, r);
            ctx.lineTo(w/2, h/2 - r);
            ctx.arcTo(w/2, h/2, w/2 - r, h/2, r);
            ctx.lineTo(-w/2 + r, h/2);
            ctx.arcTo(-w/2, h/2, -w/2, h/2 - r, r);
            ctx.lineTo(-w/2, -h/2 + r);
            ctx.arcTo(-w/2, -h/2, -w/2 + r, -h/2, r);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#996633';
            ctx.lineWidth = 2;
            ctx.stroke();
            // 原子符号
            ctx.fillStyle = '#cc6600';
            const dots = [[-15, -5], [0, 5], [15, -3], [-8, 8], [10, 0]];
            dots.forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                ctx.fill();
            });
        };
        this._builtinDrawFunctions['VaporCell'] = this._builtinDrawFunctions['AtomicCell'];
        this._builtinDrawFunctions['GasCell'] = this._builtinDrawFunctions['AtomicCell'];

        this.registerIcon('MagneticCoil', {
            name: '磁场线圈',
            category: ICON_CATEGORIES.ATOMIC,
            width: 50, height: 60,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0.5, y: 0 }, direction: -90, type: CONNECTION_POINT_TYPES.BIDIRECTIONAL },
                { id: 'output', label: 'out', position: { x: 0.5, y: 1 }, direction: 90, type: CONNECTION_POINT_TYPES.BIDIRECTIONAL }
            ]
        });
        this._builtinDrawFunctions['MagneticCoil'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.strokeStyle = '#cc6600';
            ctx.lineWidth = 3;
            // 绘制线圈
            const coils = 5;
            const coilH = h / coils;
            for (let i = 0; i < coils; i++) {
                ctx.beginPath();
                ctx.ellipse(0, -h/2 + coilH/2 + i * coilH, w/2, coilH/3, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        };

        // ========== 光纤 ==========
        this.registerIcon('Fiber', {
            name: '光纤',
            category: ICON_CATEGORIES.FIBERS,
            width: 80, height: 20,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['Fiber'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 光纤线
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 10, 0);
            ctx.bezierCurveTo(-w/4, -h/2, w/4, h/2, w/2 - 10, 0);
            ctx.stroke();
            // 连接器
            ctx.fillStyle = '#666666';
            ctx.fillRect(-w/2, -h/3, 10, h * 2/3);
            ctx.fillRect(w/2 - 10, -h/3, 10, h * 2/3);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.strokeRect(-w/2, -h/3, 10, h * 2/3);
            ctx.strokeRect(w/2 - 10, -h/3, 10, h * 2/3);
        };

        this.registerIcon('FiberCoupler', {
            name: '光纤耦合器',
            category: ICON_CATEGORIES.FIBERS,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'fiber', label: 'fiber', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['FiberCoupler'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            // 耦合器主体
            const grad = ctx.createLinearGradient(-s/2, 0, s/2, 0);
            grad.addColorStop(0, '#888888');
            grad.addColorStop(0.5, '#aaaaaa');
            grad.addColorStop(1, '#666666');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-s/2, -s/3);
            ctx.lineTo(s/4, -s/4);
            ctx.lineTo(s/4, s/4);
            ctx.lineTo(-s/2, s/3);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.stroke();
            // 光纤输出
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(s/4, 0);
            ctx.lineTo(s/2, 0);
            ctx.stroke();
        };

        // ========== 其他 ==========
        this.registerIcon('Aperture', {
            name: '光阑',
            category: ICON_CATEGORIES.MISC,
            width: 10, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['Aperture'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#333333';
            ctx.fillRect(-w/2, -h/2, w, h * 0.35);
            ctx.fillRect(-w/2, h * 0.15, w, h * 0.35);
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 1;
            ctx.strokeRect(-w/2, -h/2, w, h * 0.35);
            ctx.strokeRect(-w/2, h * 0.15, w, h * 0.35);
        };
        this._builtinDrawFunctions['Iris'] = this._builtinDrawFunctions['Aperture'];

        // ========== 更多光源 ==========
        this.registerIcon('FanSource', {
            name: '扇形光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['FanSource'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(-w/3, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-w/3, 0);
            ctx.lineTo(w/2, -h/2);
            ctx.moveTo(-w/3, 0);
            ctx.lineTo(w/2, 0);
            ctx.moveTo(-w/3, 0);
            ctx.lineTo(w/2, h/2);
            ctx.stroke();
        };

        this.registerIcon('LineSource', {
            name: '线光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['LineSource'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-w/3, -h/3);
            ctx.lineTo(-w/3, h/3);
            ctx.stroke();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1.5;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(-w/3, i * h/6);
                ctx.lineTo(w/2, i * h/6);
                ctx.stroke();
            }
        };

        this.registerIcon('WhiteLightSource', {
            name: '白光光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['WhiteLightSource'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(-w/4, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
            colors.forEach((color, i) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-w/4 + 8, 0);
                ctx.lineTo(w/2, -h/3 + i * h/5);
                ctx.stroke();
            });
        };

        this.registerIcon('PointSource', {
            name: '点光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['PointSource'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8);
                ctx.lineTo(Math.cos(angle) * s/2.5, Math.sin(angle) * s/2.5);
                ctx.stroke();
            }
        };

        this.registerIcon('LEDSource', {
            name: 'LED光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 50, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['LEDSource'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#88ff88';
            ctx.beginPath();
            ctx.ellipse(-w/6, 0, w/4, h/3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#44aa44';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-w/6, h/3);
            ctx.lineTo(-w/6, h/2);
            ctx.moveTo(-w/6 - 5, h/3);
            ctx.lineTo(-w/6 - 5, h/2);
            ctx.stroke();
        };

        this.registerIcon('PulsedLaserSource', {
            name: '脉冲激光源',
            category: ICON_CATEGORIES.SOURCES,
            width: 80, height: 40,
            connectionPoints: [
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['PulsedLaserSource'] = this._builtinDrawFunctions['LaserSource'];

        // ========== 更多透镜 ==========
        this.registerIcon('CylindricalLens', {
            name: '柱面透镜',
            category: ICON_CATEGORIES.LENSES,
            width: 25, height: 60,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['CylindricalLens'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
            grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.5)');
            grad.addColorStop(1, 'rgba(100, 180, 255, 0.3)');
            ctx.fillStyle = grad;
            // 使用兼容性更好的圆角矩形绘制
            const r = w/2;
            ctx.beginPath();
            ctx.moveTo(-w/2 + r, -h/2);
            ctx.lineTo(w/2 - r, -h/2);
            ctx.arcTo(w/2, -h/2, w/2, -h/2 + r, r);
            ctx.lineTo(w/2, h/2 - r);
            ctx.arcTo(w/2, h/2, w/2 - r, h/2, r);
            ctx.lineTo(-w/2 + r, h/2);
            ctx.arcTo(-w/2, h/2, -w/2, h/2 - r, r);
            ctx.lineTo(-w/2, -h/2 + r);
            ctx.arcTo(-w/2, -h/2, -w/2 + r, -h/2, r);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#3366aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        this.registerIcon('AsphericLens', {
            name: '非球面透镜',
            category: ICON_CATEGORIES.LENSES,
            width: 25, height: 60,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['AsphericLens'] = this._builtinDrawFunctions['ConvexLens'];

        this.registerIcon('GRINLens', {
            name: 'GRIN透镜',
            category: ICON_CATEGORIES.LENSES,
            width: 30, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['GRINLens'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(0, -h/2, 0, h/2);
            grad.addColorStop(0, 'rgba(100, 180, 255, 0.2)');
            grad.addColorStop(0.5, 'rgba(100, 180, 255, 0.6)');
            grad.addColorStop(1, 'rgba(100, 180, 255, 0.2)');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#3366aa';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
        };

        // ========== 更多反射镜 ==========
        this.registerIcon('MetallicMirror', {
            name: '金属镜',
            category: ICON_CATEGORIES.MIRRORS,
            width: 12, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['MetallicMirror'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
            grad.addColorStop(0, '#888888');
            grad.addColorStop(0.5, '#cccccc');
            grad.addColorStop(1, '#666666');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
        };

        this.registerIcon('RingMirror', {
            name: '环形镜',
            category: ICON_CATEGORIES.MIRRORS,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['RingMirror'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.strokeStyle = '#aaccff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5 - 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5 + 2, 0, Math.PI * 2);
            ctx.stroke();
        };

        // ========== 更多探测器 ==========
        this.registerIcon('CCDCamera', {
            name: 'CCD相机',
            category: ICON_CATEGORIES.DETECTORS,
            width: 50, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['CCDCamera'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#444444';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            ctx.fillStyle = '#224488';
            ctx.fillRect(-w/3, -h/3, w * 0.5, h * 0.6);
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(-w/3 + i * w/8, -h/3);
                ctx.lineTo(-w/3 + i * w/8, h/3 - h * 0.1);
                ctx.stroke();
            }
        };

        this.registerIcon('Spectrometer', {
            name: '光谱仪',
            category: ICON_CATEGORIES.DETECTORS,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['Spectrometer'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#333333';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            const colors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8800ff'];
            colors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(-w/3 + i * w/10, -h/4, w/12, h/2);
            });
        };

        this.registerIcon('PowerMeter', {
            name: '功率计',
            category: ICON_CATEGORIES.DETECTORS,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['PowerMeter'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('W', 0, 0);
        };

        this.registerIcon('PolarizationAnalyzer', {
            name: '偏振分析仪',
            category: ICON_CATEGORIES.DETECTORS,
            width: 50, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT }
            ]
        });
        this._builtinDrawFunctions['PolarizationAnalyzer'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = '#444444';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#222222';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, w/4, h/4, Math.PI/4, 0, Math.PI * 2);
            ctx.stroke();
        };

        // ========== 更多元件 ==========
        this.registerIcon('OpticalFiber', {
            name: '光纤',
            category: ICON_CATEGORIES.FIBERS,
            width: 80, height: 30,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['OpticalFiber'] = this._builtinDrawFunctions['Fiber'];

        this.registerIcon('Prism', {
            name: '棱镜',
            category: ICON_CATEGORIES.MISC,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['Prism'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            const grad = ctx.createLinearGradient(-s/2, 0, s/2, 0);
            grad.addColorStop(0, 'rgba(200, 220, 255, 0.4)');
            grad.addColorStop(0.5, 'rgba(230, 240, 255, 0.6)');
            grad.addColorStop(1, 'rgba(200, 220, 255, 0.4)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -s/2.2);
            ctx.lineTo(-s/2.2, s/2.5);
            ctx.lineTo(s/2.2, s/2.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#6688aa';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        };

        this.registerIcon('DiffractionGrating', {
            name: '衍射光栅',
            category: ICON_CATEGORIES.MISC,
            width: 15, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0.5, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 0.5, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['DiffractionGrating'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            const spacing = h / 12;
            for (let i = 0; i < 12; i++) {
                ctx.beginPath();
                ctx.moveTo(-w/2, -h/2 + i * spacing);
                ctx.lineTo(w/2, -h/2 + i * spacing);
                ctx.stroke();
            }
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
        };

        this.registerIcon('DielectricBlock', {
            name: '介质块',
            category: ICON_CATEGORIES.MISC,
            width: 60, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['DielectricBlock'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            const grad = ctx.createLinearGradient(-w/2, -h/2, -w/2, h/2);
            grad.addColorStop(0, 'rgba(170, 221, 170, 0.3)');
            grad.addColorStop(0.5, 'rgba(200, 240, 200, 0.5)');
            grad.addColorStop(1, 'rgba(170, 221, 170, 0.3)');
            ctx.fillStyle = grad;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#66aa66';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
        };

        this.registerIcon('WollastonPrism', {
            name: 'Wollaston棱镜',
            category: ICON_CATEGORIES.POLARIZERS,
            width: 50, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output1', label: 'o', position: { x: 1, y: 0.3 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT },
                { id: 'output2', label: 'e', position: { x: 1, y: 0.7 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['WollastonPrism'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.fillStyle = 'rgba(200, 220, 255, 0.4)';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#6688aa';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            ctx.beginPath();
            ctx.moveTo(0, -h/2);
            ctx.lineTo(0, h/2);
            ctx.stroke();
        };

        this.registerIcon('ElectroOpticModulator', {
            name: '电光调制器',
            category: ICON_CATEGORIES.MODULATORS,
            width: 50, height: 30,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['ElectroOpticModulator'] = this._builtinDrawFunctions['EOM'];

        this.registerIcon('VariableAttenuator', {
            name: '可变衰减器',
            category: ICON_CATEGORIES.MODULATORS,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['VariableAttenuator'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-s/4, s/4);
            ctx.lineTo(s/4, -s/4);
            ctx.stroke();
        };

        this.registerIcon('OpticalChopper', {
            name: '光学斩波器',
            category: ICON_CATEGORIES.MODULATORS,
            width: 50, height: 50,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['OpticalChopper'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, s/2.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#333333';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, s/2.5, i * Math.PI/2, i * Math.PI/2 + Math.PI/4);
                ctx.closePath();
                ctx.fill();
            }
        };

        this.registerIcon('FabryPerotCavity', {
            name: 'F-P腔',
            category: ICON_CATEGORIES.MISC,
            width: 80, height: 30,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['FabryPerotCavity'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            ctx.strokeStyle = '#aaccff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 5, -h/2);
            ctx.lineTo(-w/2 + 5, h/2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(w/2 - 5, -h/2);
            ctx.lineTo(w/2 - 5, h/2);
            ctx.stroke();
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(-w/2 + 8, 0);
            ctx.lineTo(w/2 - 8, 0);
            ctx.stroke();
            ctx.setLineDash([]);
        };

        // ===== 法拉第旋转器 =====
        this.registerIcon('FaradayRotator', {
            name: '法拉第旋转器',
            category: ICON_CATEGORIES.POLARIZATION,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['FaradayRotator'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            const r = s / 2.5;
            // 外圆
            ctx.strokeStyle = '#8855cc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            // 旋转箭头弧线
            ctx.strokeStyle = '#aa77ee';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.6, -Math.PI * 0.7, Math.PI * 0.3);
            ctx.stroke();
            // 箭头头部
            const ax = r * 0.6 * Math.cos(Math.PI * 0.3);
            const ay = r * 0.6 * Math.sin(Math.PI * 0.3);
            ctx.fillStyle = '#aa77ee';
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - 5, ay - 3);
            ctx.lineTo(ax - 3, ay + 4);
            ctx.closePath();
            ctx.fill();
            // F标记
            ctx.fillStyle = '#8855cc';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', 0, 0);
        };

        // ===== 法拉第隔离器 =====
        this.registerIcon('FaradayIsolator', {
            name: '法拉第隔离器',
            category: ICON_CATEGORIES.POLARIZATION,
            width: 50, height: 35,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['FaradayIsolator'] = (ctx, icon, style) => {
            const w = icon.width, h = icon.height;
            // 外框
            ctx.fillStyle = 'rgba(136, 85, 204, 0.15)';
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeStyle = '#8855cc';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-w/2, -h/2, w, h);
            // 输入偏振器（左竖线）
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 6, -h/2 + 4);
            ctx.lineTo(-w/2 + 6, h/2 - 4);
            ctx.stroke();
            // 法拉第旋转器（中间圆）
            ctx.strokeStyle = '#aa77ee';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, h/3.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#8855cc';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', 0, 0);
            // 输出偏振器（右竖线）
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w/2 - 6, -h/2 + 4);
            ctx.lineTo(w/2 - 6, h/2 - 4);
            ctx.stroke();
            // 箭头表示单向
            ctx.fillStyle = '#8855cc';
            ctx.beginPath();
            ctx.moveTo(w/2 - 2, 0);
            ctx.lineTo(w/2 - 8, -4);
            ctx.lineTo(w/2 - 8, 4);
            ctx.closePath();
            ctx.fill();
        };

        // ===== WavePlate 别名到 HalfWavePlate =====
        this.registerIcon('WavePlate', {
            name: '波片',
            category: ICON_CATEGORIES.POLARIZATION,
            width: 12, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['WavePlate'] = this._builtinDrawFunctions['HalfWavePlate'];

        // ===== 自定义元件 =====
        this.registerIcon('CustomComponent', {
            name: '自定义元件',
            category: ICON_CATEGORIES.MISC,
            width: 40, height: 40,
            connectionPoints: [
                { id: 'input', label: 'in', position: { x: 0, y: 0.5 }, direction: 180, type: CONNECTION_POINT_TYPES.INPUT },
                { id: 'output', label: 'out', position: { x: 1, y: 0.5 }, direction: 0, type: CONNECTION_POINT_TYPES.OUTPUT }
            ]
        });
        this._builtinDrawFunctions['CustomComponent'] = (ctx, icon, style) => {
            const s = Math.min(icon.width, icon.height);
            // 虚线外框
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(-s/2, -s/2, s, s);
            ctx.setLineDash([]);
            // 齿轮图标
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, s/5, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * s/5, Math.sin(a) * s/5);
                ctx.lineTo(Math.cos(a) * s/3.2, Math.sin(a) * s/3.2);
                ctx.stroke();
            }
        };
    }
}


// ========== 单例模式 ==========
let professionalIconManagerInstance = null;

/**
 * 获取ProfessionalIconManager单例实例
 * @returns {ProfessionalIconManager}
 */
export function getProfessionalIconManager() {
    if (!professionalIconManagerInstance) {
        professionalIconManagerInstance = new ProfessionalIconManager();
    }
    return professionalIconManagerInstance;
}

/**
 * 重置ProfessionalIconManager单例（主要用于测试）
 */
export function resetProfessionalIconManager() {
    professionalIconManagerInstance = null;
}

// ========== 全局导出（兼容性） ==========
if (typeof window !== 'undefined') {
    window.ProfessionalIconManager = ProfessionalIconManager;
    window.getProfessionalIconManager = getProfessionalIconManager;
    window.CONNECTION_POINT_TYPES = CONNECTION_POINT_TYPES;
    window.ICON_CATEGORIES = ICON_CATEGORIES;
}
