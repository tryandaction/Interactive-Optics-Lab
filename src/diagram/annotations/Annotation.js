/**
 * Annotation.js - 标注类
 * 支持文本、尺寸、角度、距离等多种标注类型
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.8, 4.9
 */

/**
 * 生成唯一ID
 */
function generateAnnotationId() {
    return 'annotation_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 标注类型
 */
export const AnnotationType = {
    TEXT: 'text',
    DIMENSION: 'dimension',
    ANGLE: 'angle',
    DISTANCE: 'distance',
    LABEL: 'label',
    CALLOUT: 'callout'
};

/**
 * 引线样式
 */
export const LeaderLineStyle = {
    STRAIGHT: 'straight',
    CURVED: 'curved',
    ORTHOGONAL: 'orthogonal',
    NONE: 'none'
};

/**
 * 标注类
 */
export class Annotation {
    constructor(config) {
        this.id = config.id || generateAnnotationId();
        this.type = config.type || AnnotationType.TEXT;
        
        // 位置
        this.position = config.position || { x: 0, y: 0 };
        this.anchorPoint = config.anchorPoint || null; // 锚点位置（引线起点）
        
        // 内容
        this.text = config.text || '';
        this.isLatex = config.isLatex || false;
        this.latexRendered = null; // 缓存的LaTeX渲染结果
        
        // 样式
        this.style = {
            fontSize: 14,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#333333',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: '#cccccc',
            borderWidth: 1,
            borderRadius: 4,
            padding: 6,
            textAlign: 'left',
            lineHeight: 1.4,
            ...config.style
        };
        
        // 引线
        this.leaderLine = {
            enabled: config.leaderLine?.enabled !== false,
            style: config.leaderLine?.style || LeaderLineStyle.STRAIGHT,
            color: config.leaderLine?.color || '#666666',
            width: config.leaderLine?.width || 1,
            dashPattern: config.leaderLine?.dashPattern || [],
            arrowSize: config.leaderLine?.arrowSize || 6
        };
        
        // 尺寸标注特定属性
        if (this.type === AnnotationType.DIMENSION) {
            this.startPoint = config.startPoint || { x: 0, y: 0 };
            this.endPoint = config.endPoint || { x: 100, y: 0 };
            this.offset = config.offset || 20; // 标注线偏移距离
            this.unit = config.unit || 'mm';
            this.precision = config.precision || 1;
        }
        
        // 角度标注特定属性
        if (this.type === AnnotationType.ANGLE) {
            this.vertex = config.vertex || { x: 0, y: 0 };
            this.startAngle = config.startAngle || 0;
            this.endAngle = config.endAngle || Math.PI / 2;
            this.radius = config.radius || 30;
            this.showArc = config.showArc !== false;
        }
        
        // 状态
        this.selected = false;
        this.hovered = false;
        this.visible = config.visible !== false;
        this.locked = config.locked || false;
        
        // 关联
        this.componentId = config.componentId || null;
        this.groupId = config.groupId || null;
    }

    /**
     * 渲染标注
     */
    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        switch (this.type) {
            case AnnotationType.TEXT:
            case AnnotationType.LABEL:
            case AnnotationType.CALLOUT:
                this._renderText(ctx);
                break;
            case AnnotationType.DIMENSION:
                this._renderDimension(ctx);
                break;
            case AnnotationType.ANGLE:
                this._renderAngle(ctx);
                break;
            case AnnotationType.DISTANCE:
                this._renderDistance(ctx);
                break;
        }
        
        // 选中/悬停效果
        if (this.selected || this.hovered) {
            this._renderSelectionBox(ctx);
        }
        
        ctx.restore();
    }

    /**
     * 渲染文本标注
     * @private
     */
    _renderText(ctx) {
        // 引线
        if (this.leaderLine.enabled && this.anchorPoint) {
            this._renderLeaderLine(ctx);
        }
        
        // 准备文本
        let displayText = this.text;
        if (this.isLatex && this.latexRendered) {
            // 使用渲染的LaTeX图像
            this._renderLatexImage(ctx);
            return;
        }
        
        // 设置字体
        ctx.font = `${this.style.fontStyle} ${this.style.fontWeight} ${this.style.fontSize}px ${this.style.fontFamily}`;
        ctx.textAlign = this.style.textAlign;
        ctx.textBaseline = 'top';
        
        // 测量文本
        const lines = displayText.split('\n');
        const lineHeight = this.style.fontSize * this.style.lineHeight;
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const textHeight = lines.length * lineHeight;
        
        // 背景框
        const padding = this.style.padding;
        const boxWidth = maxWidth + padding * 2;
        const boxHeight = textHeight + padding * 2;
        
        let boxX = this.position.x;
        let boxY = this.position.y;
        
        // 根据对齐方式调整位置
        if (this.style.textAlign === 'center') {
            boxX -= boxWidth / 2;
        } else if (this.style.textAlign === 'right') {
            boxX -= boxWidth;
        }
        
        // 绘制背景
        if (this.style.backgroundColor) {
            ctx.fillStyle = this.style.backgroundColor;
            if (this.style.borderRadius > 0) {
                this._roundRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            }
        }
        
        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            if (this.style.borderRadius > 0) {
                this._roundRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            }
        }
        
        // 绘制文本
        ctx.fillStyle = this.style.color;
        let textX = boxX + padding;
        if (this.style.textAlign === 'center') {
            textX = boxX + boxWidth / 2;
        } else if (this.style.textAlign === 'right') {
            textX = boxX + boxWidth - padding;
        }
        
        lines.forEach((line, i) => {
            const textY = boxY + padding + i * lineHeight;
            ctx.fillText(line, textX, textY);
        });
    }

    /**
     * 渲染LaTeX图像
     * @private
     */
    _renderLatexImage(ctx) {
        if (!this.latexRendered || !this.latexRendered.image) return;
        
        const img = this.latexRendered.image;
        const width = this.latexRendered.width || img.width;
        const height = this.latexRendered.height || img.height;
        
        // 背景框
        const padding = this.style.padding;
        const boxWidth = width + padding * 2;
        const boxHeight = height + padding * 2;
        
        const boxX = this.position.x - boxWidth / 2;
        const boxY = this.position.y - boxHeight / 2;
        
        // 绘制背景
        if (this.style.backgroundColor) {
            ctx.fillStyle = this.style.backgroundColor;
            if (this.style.borderRadius > 0) {
                this._roundRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.borderRadius);
                ctx.fill();
            } else {
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            }
        }
        
        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            if (this.style.borderRadius > 0) {
                this._roundRect(ctx, boxX, boxY, boxWidth, boxHeight, this.style.borderRadius);
                ctx.stroke();
            } else {
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
            }
        }
        
        // 绘制图像
        ctx.drawImage(img, boxX + padding, boxY + padding, width, height);
    }

    /**
     * 渲染尺寸标注
     * @private
     */
    _renderDimension(ctx) {
        const { startPoint, endPoint, offset } = this;
        
        // 计算标注线方向
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        
        // 垂直偏移方向
        const perpAngle = angle + Math.PI / 2;
        const offsetX = Math.cos(perpAngle) * offset;
        const offsetY = Math.sin(perpAngle) * offset;
        
        // 标注线端点
        const dimStart = {
            x: startPoint.x + offsetX,
            y: startPoint.y + offsetY
        };
        const dimEnd = {
            x: endPoint.x + offsetX,
            y: endPoint.y + offsetY
        };
        
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        
        // 绘制标注线
        ctx.beginPath();
        ctx.moveTo(dimStart.x, dimStart.y);
        ctx.lineTo(dimEnd.x, dimEnd.y);
        ctx.stroke();
        
        // 绘制延伸线
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(dimStart.x, dimStart.y);
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(dimEnd.x, dimEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制箭头
        const arrowSize = 8;
        this._drawArrow(ctx, dimStart, dimEnd, arrowSize);
        this._drawArrow(ctx, dimEnd, dimStart, arrowSize);
        
        // 绘制尺寸文本
        const value = length.toFixed(this.precision);
        const text = `${value} ${this.unit}`;
        
        ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
        ctx.fillStyle = this.style.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const midX = (dimStart.x + dimEnd.x) / 2;
        const midY = (dimStart.y + dimEnd.y) / 2;
        
        // 文本背景
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width + 8;
        const textHeight = this.style.fontSize + 4;
        
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(midX - textWidth / 2, midY - textHeight - 2, textWidth, textHeight);
        
        ctx.fillStyle = this.style.color;
        ctx.fillText(text, midX, midY - 2);
    }

    /**
     * 渲染角度标注
     * @private
     */
    _renderAngle(ctx) {
        const { vertex, startAngle, endAngle, radius, showArc } = this;
        
        ctx.strokeStyle = this.style.color;
        ctx.lineWidth = 1;
        
        // 绘制角度弧
        if (showArc) {
            ctx.beginPath();
            ctx.arc(vertex.x, vertex.y, radius, startAngle, endAngle);
            ctx.stroke();
            
            // 绘制箭头
            const arrowSize = 6;
            const endX = vertex.x + Math.cos(endAngle) * radius;
            const endY = vertex.y + Math.sin(endAngle) * radius;
            const arrowAngle = endAngle + Math.PI / 2;
            
            ctx.save();
            ctx.translate(endX, endY);
            ctx.rotate(arrowAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize * 0.5);
            ctx.lineTo(-arrowSize * 0.7, 0);
            ctx.lineTo(-arrowSize, arrowSize * 0.5);
            ctx.closePath();
            ctx.fillStyle = this.style.color;
            ctx.fill();
            ctx.restore();
        }
        
        // 绘制角度文本
        const angleDeg = ((endAngle - startAngle) * 180 / Math.PI).toFixed(1);
        const text = `${angleDeg}°`;
        
        const midAngle = (startAngle + endAngle) / 2;
        const textRadius = radius + 15;
        const textX = vertex.x + Math.cos(midAngle) * textRadius;
        const textY = vertex.y + Math.sin(midAngle) * textRadius;
        
        ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
        ctx.fillStyle = this.style.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, textX, textY);
    }

    /**
     * 渲染距离标注
     * @private
     */
    _renderDistance(ctx) {
        // 类似尺寸标注，但更简单
        this._renderDimension(ctx);
    }

    /**
     * 渲染引线
     * @private
     */
    _renderLeaderLine(ctx) {
        if (!this.anchorPoint) return;
        
        ctx.strokeStyle = this.leaderLine.color;
        ctx.lineWidth = this.leaderLine.width;
        ctx.setLineDash(this.leaderLine.dashPattern);
        
        ctx.beginPath();
        ctx.moveTo(this.anchorPoint.x, this.anchorPoint.y);
        
        switch (this.leaderLine.style) {
            case LeaderLineStyle.STRAIGHT:
                ctx.lineTo(this.position.x, this.position.y);
                break;
            case LeaderLineStyle.CURVED:
                const cpX = (this.anchorPoint.x + this.position.x) / 2;
                const cpY = this.anchorPoint.y;
                ctx.quadraticCurveTo(cpX, cpY, this.position.x, this.position.y);
                break;
            case LeaderLineStyle.ORTHOGONAL:
                const midX = (this.anchorPoint.x + this.position.x) / 2;
                ctx.lineTo(midX, this.anchorPoint.y);
                ctx.lineTo(midX, this.position.y);
                ctx.lineTo(this.position.x, this.position.y);
                break;
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制箭头
        if (this.leaderLine.arrowSize > 0) {
            const angle = Math.atan2(
                this.position.y - this.anchorPoint.y,
                this.position.x - this.anchorPoint.x
            );
            this._drawArrowHead(ctx, this.position.x, this.position.y, angle, this.leaderLine.arrowSize);
        }
    }

    /**
     * 渲染选择框
     * @private
     */
    _renderSelectionBox(ctx) {
        const bounds = this.getBounds();
        if (!bounds) return;
        
        const padding = 4;
        ctx.strokeStyle = this.selected ? '#4488ff' : '#88aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            bounds.x - padding,
            bounds.y - padding,
            bounds.width + padding * 2,
            bounds.height + padding * 2
        );
        ctx.setLineDash([]);
    }

    /**
     * 绘制圆角矩形
     * @private
     */
    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * 绘制箭头
     * @private
     */
    _drawArrow(ctx, from, to, size) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        this._drawArrowHead(ctx, to.x, to.y, angle, size);
    }

    /**
     * 绘制箭头头部
     * @private
     */
    _drawArrowHead(ctx, x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size, -size * 0.4);
        ctx.lineTo(-size * 0.7, 0);
        ctx.lineTo(-size, size * 0.4);
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        ctx.restore();
    }

    /**
     * 获取边界框
     */
    getBounds() {
        // 简化实现，返回基于位置的边界框
        const size = 100; // 估计大小
        return {
            x: this.position.x - size / 2,
            y: this.position.y - size / 2,
            width: size,
            height: size
        };
    }

    /**
     * 点击测试
     */
    hitTest(point, tolerance = 5) {
        const bounds = this.getBounds();
        if (!bounds) return false;
        
        return point.x >= bounds.x - tolerance &&
               point.x <= bounds.x + bounds.width + tolerance &&
               point.y >= bounds.y - tolerance &&
               point.y <= bounds.y + bounds.height + tolerance;
    }

    /**
     * 移动标注
     */
    move(dx, dy) {
        this.position.x += dx;
        this.position.y += dy;
        
        if (this.anchorPoint) {
            this.anchorPoint.x += dx;
            this.anchorPoint.y += dy;
        }
        
        if (this.type === AnnotationType.DIMENSION) {
            this.startPoint.x += dx;
            this.startPoint.y += dy;
            this.endPoint.x += dx;
            this.endPoint.y += dy;
        }
        
        if (this.type === AnnotationType.ANGLE) {
            this.vertex.x += dx;
            this.vertex.y += dy;
        }
    }

    /**
     * 设置文本
     */
    setText(text, isLatex = false) {
        this.text = text;
        this.isLatex = isLatex;
        if (isLatex) {
            this._renderLatex();
        }
    }

    /**
     * 渲染LaTeX（需要外部库支持）
     * @private
     */
    async _renderLatex() {
        // 这里需要集成KaTeX或MathJax
        // 简化实现：标记需要渲染
        this.latexRendered = null;
        
        // 如果有KaTeX可用
        if (typeof window !== 'undefined' && window.katex) {
            try {
                const html = window.katex.renderToString(this.text, {
                    throwOnError: false,
                    displayMode: true
                });
                
                // 将HTML转换为图像（需要额外处理）
                // 这里简化处理
                console.log('LaTeX rendered:', html);
            } catch (e) {
                console.error('LaTeX rendering error:', e);
            }
        }
    }

    /**
     * 序列化
     */
    serialize() {
        const data = {
            id: this.id,
            type: this.type,
            position: { ...this.position },
            text: this.text,
            isLatex: this.isLatex,
            style: { ...this.style },
            leaderLine: { ...this.leaderLine },
            visible: this.visible,
            locked: this.locked,
            componentId: this.componentId,
            groupId: this.groupId
        };
        
        if (this.anchorPoint) {
            data.anchorPoint = { ...this.anchorPoint };
        }
        
        if (this.type === AnnotationType.DIMENSION) {
            data.startPoint = { ...this.startPoint };
            data.endPoint = { ...this.endPoint };
            data.offset = this.offset;
            data.unit = this.unit;
            data.precision = this.precision;
        }
        
        if (this.type === AnnotationType.ANGLE) {
            data.vertex = { ...this.vertex };
            data.startAngle = this.startAngle;
            data.endAngle = this.endAngle;
            data.radius = this.radius;
            data.showArc = this.showArc;
        }
        
        return data;
    }

    /**
     * 反序列化
     */
    static deserialize(data) {
        return new Annotation(data);
    }
}

// 全局导出
if (typeof window !== 'undefined') {
    window.Annotation = Annotation;
    window.AnnotationType = AnnotationType;
    window.LeaderLineStyle = LeaderLineStyle;
}
