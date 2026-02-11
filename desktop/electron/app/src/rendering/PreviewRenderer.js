/**
 * PreviewRenderer.js - 放置预览渲染器
 * 负责绘制组件放置时的预览效果
 */

/**
 * 放置预览渲染器类
 * 在用户选择工具后，在鼠标位置显示组件预览
 */
export class PreviewRenderer {
    /**
     * @param {Object} componentClasses - 组件类映射对象
     */
    constructor(componentClasses = {}) {
        /** @type {Object} 组件类映射 */
        this.componentClasses = componentClasses;
    }

    /**
     * 设置组件类映射
     * @param {Object} classes - 组件类映射对象
     */
    setComponentClasses(classes) {
        this.componentClasses = classes;
    }

    /**
     * 绘制放置预览
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
     * @param {string} componentToAdd - 要添加的组件类型名称
     * @param {Object} mousePos - 鼠标位置 (Vector)
     */
    drawPlacementPreview(ctx, componentToAdd, mousePos) {
        if (!componentToAdd || !mousePos) return;

        ctx.save();
        ctx.globalAlpha = 0.5; // 半透明预览
        ctx.setLineDash([3, 3]); // 虚线轮廓

        let previewComp = null;
        const previewPos = mousePos.clone();

        try {
            previewComp = this._createPreviewComponent(componentToAdd, previewPos);

            if (previewComp) {
                previewComp.selected = false;
                previewComp.draw(ctx);
            }
        } catch (e) {
            console.error("Error creating preview component:", e);
        }

        ctx.restore();
    }

    /**
     * 创建预览组件实例
     * @private
     * @param {string} componentType - 组件类型名称
     * @param {Object} pos - 位置 (Vector)
     * @returns {Object|null} 组件实例或 null
     */
    _createPreviewComponent(componentType, pos) {
        const classes = this.componentClasses;

        // 特殊情况处理
        switch (componentType) {
            case 'ConcaveMirror':
                if (classes.SphericalMirror) {
                    return new classes.SphericalMirror(pos, 200, 90, 0);
                }
                break;
            case 'ConvexMirror':
                if (classes.SphericalMirror) {
                    return new classes.SphericalMirror(pos, -200, 90, 0);
                }
                break;
            case 'ParabolicMirrorToolbar':
                if (classes.ParabolicMirror) {
                    return new classes.ParabolicMirror(pos, 100, 100, 0);
                }
                break;
            default:
                // 标准组件创建
                if (classes[componentType]) {
                    return new classes[componentType](pos);
                }
        }

        return null;
    }

    /**
     * 获取支持的组件类型列表
     * @returns {string[]} 组件类型名称数组
     */
    getSupportedTypes() {
        return Object.keys(this.componentClasses);
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.PreviewRenderer = PreviewRenderer;
}
