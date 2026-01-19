/**
 * AnnotationManager.js - 标注管理器
 * 管理所有标注的创建、编辑、渲染和交互
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.6, 4.7, 4.8, 4.9
 */

import { Annotation, AnnotationType, LeaderLineStyle } from './Annotation.js';

/**
 * 标注模板
 */
export const AnnotationTemplates = {
    FOCAL_LENGTH: {
        text: 'f = {value} mm',
        type: AnnotationType.LABEL,
        style: { fontSize: 12, color: '#333333' }
    },
    WAVELENGTH: {
        text: 'λ = {value} nm',
        type: AnnotationType.LABEL,
        style: { fontSize: 12, color: '#cc0000' }
    },
    POWER: {
        text: 'P = {value} mW',
        type: AnnotationType.LABEL,
        style: { fontSize: 12, color: '#0066cc' }
    },
    ANGLE: {
        text: 'θ = {value}°',
        type: AnnotationType.LABEL,
        style: { fontSize: 12, color: '#666666' }
    },
    DISTANCE: {
        text: 'd = {value} mm',
        type: AnnotationType.DIMENSION,
        style: { fontSize: 12, color: '#333333' }
    }
};

/**
 * 标注管理器类
 */
export class AnnotationManager {
    constructor() {
        /** @type {Map<string, Annotation>} */
        this.annotations = new Map();
        
        /** @type {Annotation|null} 当前选中的标注 */
        this.selectedAnnotation = null;
        
        /** @type {Annotation|null} 当前悬停的标注 */
        this.hoveredAnnotation = null;
        
        /** @type {Object|null} 正在创建的标注 */
        this.editingAnnotation = null;
        
        /** @type {boolean} 是否显示所有标注 */
        this.visible = true;
        
        /** @type {Object} 默认样式 */
        this.defaultStyle = {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            color: '#333333',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#cccccc',
            borderWidth: 1,
            borderRadius: 4,
            padding: 6
        };
        
        /** @type {Map<string, Annotation[]>} 分组 */
        this.groups = new Map();
        
        /** @type {boolean} 自动定位避免重叠 */
        this.autoPosition = true;
    }

    /**
     * 创建标注
     */
    createAnnotation(config) {
        const annotation = new Annotation({
            ...config,
            style: { ...this.defaultStyle, ...config.style }
        });
        
        this.annotations.set(annotation.id, annotation);
        
        // 添加到分组
        if (annotation.groupId) {
            this._addToGroup(annotation);
        }
        
        // 自动定位
        if (this.autoPosition && !config.position) {
            this._autoPositionAnnotation(annotation);
        }
        
        return annotation;
    }

    /**
     * 创建文本标注
     */
    createTextAnnotation(text, position, options = {}) {
        return this.createAnnotation({
            type: AnnotationType.TEXT,
            text,
            position,
            ...options
        });
    }

    /**
     * 创建尺寸标注
     */
    createDimensionAnnotation(startPoint, endPoint, options = {}) {
        return this.createAnnotation({
            type: AnnotationType.DIMENSION,
            startPoint,
            endPoint,
            offset: options.offset || 20,
            unit: options.unit || 'mm',
            precision: options.precision || 1,
            ...options
        });
    }

    /**
     * 创建角度标注
     */
    createAngleAnnotation(vertex, startAngle, endAngle, options = {}) {
        return this.createAnnotation({
            type: AnnotationType.ANGLE,
            vertex,
            startAngle,
            endAngle,
            radius: options.radius || 30,
            showArc: options.showArc !== false,
            ...options
        });
    }

    /**
     * 创建标签标注
     */
    createLabelAnnotation(text, anchorPoint, position, options = {}) {
        return this.createAnnotation({
            type: AnnotationType.LABEL,
            text,
            anchorPoint,
            position,
            leaderLine: {
                enabled: true,
                style: LeaderLineStyle.STRAIGHT,
                ...options.leaderLine
            },
            ...options
        });
    }

    /**
     * 从模板创建标注
     */
    createFromTemplate(templateName, values, position, options = {}) {
        const template = AnnotationTemplates[templateName];
        if (!template) {
            console.warn(`AnnotationManager: Template "${templateName}" not found`);
            return null;
        }
        
        // 替换模板中的值
        let text = template.text;
        Object.keys(values).forEach(key => {
            text = text.replace(`{${key}}`, values[key]);
        });
        
        return this.createAnnotation({
            ...template,
            text,
            position,
            ...options
        });
    }

    /**
     * 删除标注
     */
    deleteAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return false;
        
        // 从分组中移除
        if (annotation.groupId) {
            this._removeFromGroup(annotation);
        }
        
        this.annotations.delete(annotationId);
        
        if (this.selectedAnnotation?.id === annotationId) {
            this.selectedAnnotation = null;
        }
        if (this.hoveredAnnotation?.id === annotationId) {
            this.hoveredAnnotation = null;
        }
        
        return true;
    }

    /**
     * 获取标注
     */
    getAnnotation(annotationId) {
        return this.annotations.get(annotationId) || null;
    }

    /**
     * 获取所有标注
     */
    getAllAnnotations() {
        return Array.from(this.annotations.values());
    }

    /**
     * 获取组件相关的标注
     */
    getAnnotationsForComponent(componentId) {
        return this.getAllAnnotations().filter(a => a.componentId === componentId);
    }

    /**
     * 删除组件相关的所有标注
     */
    deleteAnnotationsForComponent(componentId) {
        const annotations = this.getAnnotationsForComponent(componentId);
        annotations.forEach(a => this.deleteAnnotation(a.id));
        return annotations.length;
    }

    /**
     * 获取分组中的标注
     */
    getAnnotationsInGroup(groupId) {
        return this.groups.get(groupId) || [];
    }

    /**
     * 创建分组
     */
    createGroup(groupId, annotationIds) {
        const annotations = annotationIds
            .map(id => this.annotations.get(id))
            .filter(a => a !== undefined);
        
        annotations.forEach(a => {
            a.groupId = groupId;
        });
        
        this.groups.set(groupId, annotations);
        return annotations;
    }

    /**
     * 删除分组
     */
    deleteGroup(groupId, deleteAnnotations = false) {
        const annotations = this.groups.get(groupId);
        if (!annotations) return false;
        
        if (deleteAnnotations) {
            annotations.forEach(a => this.deleteAnnotation(a.id));
        } else {
            annotations.forEach(a => {
                a.groupId = null;
            });
        }
        
        this.groups.delete(groupId);
        return true;
    }

    /**
     * 添加到分组
     * @private
     */
    _addToGroup(annotation) {
        if (!annotation.groupId) return;
        
        let group = this.groups.get(annotation.groupId);
        if (!group) {
            group = [];
            this.groups.set(annotation.groupId, group);
        }
        
        if (!group.includes(annotation)) {
            group.push(annotation);
        }
    }

    /**
     * 从分组中移除
     * @private
     */
    _removeFromGroup(annotation) {
        if (!annotation.groupId) return;
        
        const group = this.groups.get(annotation.groupId);
        if (group) {
            const index = group.indexOf(annotation);
            if (index !== -1) {
                group.splice(index, 1);
            }
        }
    }

    /**
     * 自动定位标注
     * @private
     */
    _autoPositionAnnotation(annotation) {
        // 简化实现：在锚点附近找一个不重叠的位置
        if (!annotation.anchorPoint) return;
        
        const offsets = [
            { x: 50, y: -30 },
            { x: -50, y: -30 },
            { x: 50, y: 30 },
            { x: -50, y: 30 },
            { x: 0, y: -50 },
            { x: 0, y: 50 }
        ];
        
        for (const offset of offsets) {
            const testPos = {
                x: annotation.anchorPoint.x + offset.x,
                y: annotation.anchorPoint.y + offset.y
            };
            
            if (!this._hasOverlap(testPos, annotation)) {
                annotation.position = testPos;
                return;
            }
        }
        
        // 如果都重叠，使用第一个偏移
        annotation.position = {
            x: annotation.anchorPoint.x + offsets[0].x,
            y: annotation.anchorPoint.y + offsets[0].y
        };
    }

    /**
     * 检查位置是否与其他标注重叠
     * @private
     */
    _hasOverlap(position, excludeAnnotation) {
        const testBounds = {
            x: position.x - 50,
            y: position.y - 25,
            width: 100,
            height: 50
        };
        
        for (const annotation of this.annotations.values()) {
            if (annotation === excludeAnnotation) continue;
            if (!annotation.visible) continue;
            
            const bounds = annotation.getBounds();
            if (this._boundsOverlap(testBounds, bounds)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 检查两个边界框是否重叠
     * @private
     */
    _boundsOverlap(a, b) {
        return !(a.x + a.width < b.x ||
                 b.x + b.width < a.x ||
                 a.y + a.height < b.y ||
                 b.y + b.height < a.y);
    }

    /**
     * 渲染所有标注
     */
    render(ctx) {
        if (!this.visible) return;
        
        // 按z-order排序（选中的在最上层）
        const sorted = this.getAllAnnotations().sort((a, b) => {
            if (a === this.selectedAnnotation) return 1;
            if (b === this.selectedAnnotation) return -1;
            return 0;
        });
        
        sorted.forEach(annotation => {
            annotation.hovered = annotation === this.hoveredAnnotation;
            annotation.selected = annotation === this.selectedAnnotation;
            annotation.render(ctx);
        });
        
        // 渲染正在创建的标注
        if (this.editingAnnotation) {
            this._renderEditingAnnotation(ctx);
        }
    }

    /**
     * 渲染正在创建的标注
     * @private
     */
    _renderEditingAnnotation(ctx) {
        // 根据类型渲染预览
        if (this.editingAnnotation.type === AnnotationType.DIMENSION) {
            const { startPoint, currentPoint } = this.editingAnnotation;
            if (!startPoint || !currentPoint) return;
            
            ctx.save();
            ctx.strokeStyle = '#4488ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(currentPoint.x, currentPoint.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * 开始创建标注
     */
    startAnnotationCreation(type, startPoint) {
        this.editingAnnotation = {
            type,
            startPoint: { ...startPoint },
            currentPoint: null
        };
    }

    /**
     * 更新正在创建的标注
     */
    updateAnnotationCreation(currentPoint) {
        if (!this.editingAnnotation) return;
        this.editingAnnotation.currentPoint = { ...currentPoint };
    }

    /**
     * 完成标注创建
     */
    finishAnnotationCreation(options = {}) {
        if (!this.editingAnnotation) return null;
        
        const { type, startPoint, currentPoint } = this.editingAnnotation;
        let annotation = null;
        
        switch (type) {
            case AnnotationType.DIMENSION:
                if (startPoint && currentPoint) {
                    annotation = this.createDimensionAnnotation(startPoint, currentPoint, options);
                }
                break;
            case AnnotationType.TEXT:
            case AnnotationType.LABEL:
                if (currentPoint) {
                    annotation = this.createTextAnnotation(
                        options.text || 'New Annotation',
                        currentPoint,
                        options
                    );
                }
                break;
        }
        
        this.editingAnnotation = null;
        return annotation;
    }

    /**
     * 取消标注创建
     */
    cancelAnnotationCreation() {
        this.editingAnnotation = null;
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(position) {
        // 如果正在创建标注
        if (this.editingAnnotation) {
            this.updateAnnotationCreation(position);
            return null;
        }
        
        // 检测悬停
        let hovered = null;
        for (const annotation of this.annotations.values()) {
            if (annotation.visible && annotation.hitTest(position)) {
                hovered = annotation;
                break;
            }
        }
        
        this.hoveredAnnotation = hovered;
        return hovered;
    }

    /**
     * 处理鼠标点击
     */
    handleMouseClick(position) {
        // 如果正在创建标注
        if (this.editingAnnotation) {
            return this.finishAnnotationCreation();
        }
        
        // 选择标注
        for (const annotation of this.annotations.values()) {
            if (annotation.visible && annotation.hitTest(position)) {
                this.selectedAnnotation = annotation;
                return annotation;
            }
        }
        
        this.selectedAnnotation = null;
        return null;
    }

    /**
     * 移动选中的标注
     */
    moveSelectedAnnotation(dx, dy) {
        if (this.selectedAnnotation && !this.selectedAnnotation.locked) {
            this.selectedAnnotation.move(dx, dy);
        }
    }

    /**
     * 删除选中的标注
     */
    deleteSelectedAnnotation() {
        if (this.selectedAnnotation) {
            this.deleteAnnotation(this.selectedAnnotation.id);
        }
    }

    /**
     * 设置全局可见性
     */
    setVisible(visible) {
        this.visible = visible;
    }

    /**
     * 切换可见性
     */
    toggleVisible() {
        this.visible = !this.visible;
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            visible: this.visible,
            defaultStyle: { ...this.defaultStyle },
            autoPosition: this.autoPosition,
            annotations: this.getAllAnnotations().map(a => a.serialize()),
            groups: Array.from(this.groups.entries()).map(([id, annotations]) => ({
                id,
                annotationIds: annotations.map(a => a.id)
            }))
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.visible !== undefined) this.visible = data.visible;
        if (data.defaultStyle) this.defaultStyle = { ...data.defaultStyle };
        if (data.autoPosition !== undefined) this.autoPosition = data.autoPosition;
        
        // 恢复标注
        if (data.annotations) {
            data.annotations.forEach(annotationData => {
                const annotation = Annotation.deserialize(annotationData);
                this.annotations.set(annotation.id, annotation);
            });
        }
        
        // 恢复分组
        if (data.groups) {
            data.groups.forEach(groupData => {
                const annotations = groupData.annotationIds
                    .map(id => this.annotations.get(id))
                    .filter(a => a !== undefined);
                this.groups.set(groupData.id, annotations);
            });
        }
    }

    /**
     * 清除所有数据
     */
    clear() {
        this.annotations.clear();
        this.groups.clear();
        this.selectedAnnotation = null;
        this.hoveredAnnotation = null;
        this.editingAnnotation = null;
    }
}

// ========== 单例模式 ==========
let annotationManagerInstance = null;

export function getAnnotationManager() {
    if (!annotationManagerInstance) {
        annotationManagerInstance = new AnnotationManager();
    }
    return annotationManagerInstance;
}

export function resetAnnotationManager() {
    annotationManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.AnnotationManager = AnnotationManager;
    window.getAnnotationManager = getAnnotationManager;
    window.AnnotationTemplates = AnnotationTemplates;
}
