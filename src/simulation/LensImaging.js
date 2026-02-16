/**
 * LensImaging.js - 透镜成像交互式绘制器
 * 负责绘制透镜成像的光学系统图，支持可拖拽物体箭头和实时成像计算
 */

import { Vector } from '../core/Vector.js';

/**
 * 透镜成像绘制器类
 * 绘制透镜成像的主光线和像，支持交互式物体拖拽
 */
export class LensImaging {
    constructor() {
        /** @type {Object} 样式配置 */
        this.styles = {
            AXIS_COLOR: 'rgba(180, 180, 180, 0.5)',
            LENS_COLOR: '#AAAAFF',
            OBJ_COLOR: '#FFA500',
            IMG_REAL_COLOR: '#32CD32',
            IMG_VIRTUAL_COLOR: '#90EE90',
            FOCI_COLOR: 'cyan',
            RAY_PARALLEL_COLOR: 'rgba(255, 100, 100, 0.85)',
            RAY_CENTER_COLOR: 'rgba(100, 255, 100, 0.85)',
            RAY_FOCAL_COLOR: 'rgba(100, 100, 255, 0.85)',
            INFO_COLOR: 'rgba(230, 230, 230, 0.9)',
            DRAG_HINT_COLOR: 'rgba(255, 200, 100, 0.6)'
        };

        // --- Interactive state ---
        /** @type {Vector|null} 用户拖拽的物体尖端位置（覆盖光源位置） */
        this.objectTipOverride = null;
        /** @type {boolean} 是否正在拖拽物体 */
        this.isDraggingObject = false;
        /** @type {boolean} 鼠标是否悬停在物体箭头上 */
        this.isHoveringObject = false;
        /** @type {number} 物体箭头的点击检测半径 */
        this.hitRadius = 15;

        // --- Cached calculation results (for UI panel) ---
        /** @type {Object|null} 最近一次计算的参数 */
        this.lastParams = null;
    }

    /**
     * 重置交互状态（模式切换时调用）
     */
    reset() {
        this.objectTipOverride = null;
        this.isDraggingObject = false;
        this.isHoveringObject = false;
        this.lastParams = null;
    }

    // ==================== Mouse Event Handlers ====================

    /**
     * 处理鼠标按下事件
     * @param {Vector} mousePos - 鼠标世界坐标
     * @returns {boolean} 是否消费了该事件（开始拖拽物体）
     */
    handleMouseDown(mousePos) {
        if (!this.lastParams || !mousePos) return false;
        const { OBJ_TIP_EFFECTIVE } = this.lastParams;
        if (!OBJ_TIP_EFFECTIVE) return false;

        const dist = mousePos.distanceTo(OBJ_TIP_EFFECTIVE);
        if (dist < this.hitRadius) {
            this.isDraggingObject = true;
            return true;
        }
        return false;
    }

    /**
     * 处理鼠标移动事件
     * @param {Vector} mousePos - 鼠标世界坐标
     * @returns {string|null} 建议的 cursor 样式，null 表示不处理
     */
    handleMouseMove(mousePos) {
        if (!mousePos) return null;

        if (this.isDraggingObject) {
            this.objectTipOverride = mousePos.clone();
            return 'grabbing';
        }

        // Hover detection
        if (this.lastParams && this.lastParams.OBJ_TIP_EFFECTIVE) {
            const dist = mousePos.distanceTo(this.lastParams.OBJ_TIP_EFFECTIVE);
            this.isHoveringObject = dist < this.hitRadius;
            return this.isHoveringObject ? 'grab' : null;
        }
        return null;
    }

    /**
     * 处理鼠标释放事件
     * @returns {boolean} 是否消费了该事件
     */
    handleMouseUp() {
        if (this.isDraggingObject) {
            this.isDraggingObject = false;
            return true;
        }
        return false;
    }

    // ==================== Main Drawing Entry ====================

    /**
     * 绘制光学系统图
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
     * @param {Object} options - 配置选项
     * @returns {boolean} 是否成功绘制
     */
    drawOpticalSystemDiagram(ctx, options = {}) {
        const {
            components = [],
            canvasWidth,
            canvasHeight,
            showHint = () => {}
        } = options;

        const dpr = window.devicePixelRatio || 1;

        // 查找透镜和物体
        const lens = this._findLens(components);
        const objectSource = this._findObjectSource(components);

        if (!this._validateInputs(objectSource, lens, showHint)) {
            return false;
        }

        const width = canvasWidth || ctx.canvas.width / dpr;
        const height = canvasHeight || ctx.canvas.height / dpr;

        // 确定物体尖端位置：优先使用拖拽覆盖位置
        const objectTip = this.objectTipOverride || objectSource.pos.clone();

        // 计算参数
        const params = this._calculateParameters(objectTip, lens, dpr);
        if (!params) {
            showHint('计算参数错误。');
            return false;
        }
        this.lastParams = params;

        // 绘制
        ctx.save();
        try {
            this._drawStaticElements(ctx, params, width, height, dpr);
            this._drawPrincipalRays(ctx, params, width, height, dpr);
            this._drawDragHint(ctx, params, dpr);
            this._drawInfo(ctx, params, dpr);
        } catch (error) {
            console.error("[LensImaging] Error during drawing:", error);
            showHint('绘制透镜成像图时出错!');
            ctx.restore();
            return false;
        } finally {
            ctx.restore();
        }

        return true;
    }

    /**
     * 获取当前成像参数（供 UI 面板使用）
     * @returns {Object|null}
     */
    getImagingInfo() {
        if (!this.lastParams) return null;
        const { F, u, v, M, ho_signed, hi_signed, isRealImage, imageAtInfinity } = this.lastParams;
        const fmt = (n, d = 1) => Math.abs(n) === Infinity ? '∞' : (typeof n === 'number' && isFinite(n) ? n.toFixed(d) : 'N/A');

        let nature = '';
        if (imageAtInfinity) {
            nature = '无穷远';
        } else if (typeof M === 'number' && isFinite(M)) {
            nature += isRealImage ? '实像' : '虚像';
            nature += ', ' + ((M * ho_signed >= -1e-9) ? '正立' : '倒立');
            const absM = Math.abs(M);
            nature += ', ' + (absM > 1.02 ? '放大' : (absM < 0.98 ? '缩小' : '等大'));
        }

        return { f: fmt(F), u: fmt(u), v: fmt(v), M: fmt(M, 2), ho: fmt(ho_signed), hi: fmt(hi_signed), nature };
    }

    // ==================== Component Finding ====================

    _findObjectSource(components) {
        return components.find(comp =>
            comp.constructor.name === 'LaserSource' ||
            comp.constructor.name === 'FanSource' ||
            comp.constructor.name === 'LineSource' ||
            comp.constructor.name === 'WhiteLightSource'
        );
    }

    _findLens(components) {
        return components.find(comp => comp.constructor.name === 'ThinLens');
    }

    _validateInputs(objectSource, lens, showHint) {
        if (!objectSource || !lens) {
            showHint('透镜成像需要：1个有效光源和1个有效薄透镜。');
            return false;
        }
        if (!this._isValidVector(objectSource.pos, lens.pos, lens.axisDirection, lens.p1, lens.p2)) {
            showHint('组件位置无效。');
            return false;
        }
        if (!this._isValidNumber(lens.focalLength, lens.diameter) || lens.diameter < 1e-6) {
            showHint('透镜参数无效。');
            return false;
        }
        return true;
    }

    // ==================== Core Calculation ====================

    _calculateParameters(objectTip, lens, dpr) {
        const F = lens.isThickLens ? lens.effectiveFocalLength : lens.focalLength;
        const isFlat = Math.abs(F) === Infinity;
        const LENS_CENTER = lens.pos;
        const LENS_AXIS = lens.axisDirection.clone();
        const LENS_PLANE_DIR = lens.p1.subtract(lens.p2).normalize();

        // 物体投影到光轴
        const OBJ_TIP = objectTip;
        const vecCenterToObjTip = OBJ_TIP.subtract(LENS_CENTER);
        const u_dist_signed = vecCenterToObjTip.dot(LENS_AXIS);
        const OBJ_BASE = LENS_CENTER.add(LENS_AXIS.multiply(u_dist_signed));
        const objHeightVec = OBJ_TIP.subtract(OBJ_BASE);
        const ho_signed = objHeightVec.dot(LENS_PLANE_DIR);

        const MIN_DIAGRAM_HEIGHT = 5 / dpr;
        let ho_effective = ho_signed;
        if (Math.abs(ho_effective) < MIN_DIAGRAM_HEIGHT) {
            ho_effective = Math.sign(ho_effective) * MIN_DIAGRAM_HEIGHT || MIN_DIAGRAM_HEIGHT;
        }
        const OBJ_TIP_EFFECTIVE = OBJ_BASE.add(LENS_PLANE_DIR.multiply(ho_effective));

        if (!this._isValidVector(OBJ_BASE, OBJ_TIP_EFFECTIVE)) return null;

        // 薄透镜方程: 1/f = 1/v - 1/u  (符号约定: u 为物距，物在左侧 u>0)
        const u = -u_dist_signed;
        let v = Infinity, M = 0, hi_signed = 0;
        let IMG_TIP = null, IMG_BASE = null;
        let isRealImage = false, imageAtInfinity = false;

        if (isFlat) {
            v = -u; M = 1.0;
        } else if (Math.abs(u) < 1e-9) {
            v = 0; M = 1.0;
        } else if (Math.abs(F) < 1e-9) {
            v = -u; M = 1.0;
        } else if (Math.abs(u - F) < 1e-6) {
            // 物体恰好在焦点 → 像在无穷远
            v = Infinity; M = Infinity; imageAtInfinity = true;
        } else {
            const one_over_v = 1 / F - 1 / u;
            if (Math.abs(one_over_v) < 1e-9) {
                v = Infinity; M = Infinity; imageAtInfinity = true;
            } else {
                v = 1 / one_over_v;
                M = -v / u;
            }
        }

        if (!imageAtInfinity) {
            IMG_BASE = LENS_CENTER.add(LENS_AXIS.multiply(v));
            hi_signed = M * ho_effective;
            if (!this._isValidNumber(hi_signed)) hi_signed = 0;
            IMG_TIP = IMG_BASE.add(LENS_PLANE_DIR.multiply(hi_signed));
            isRealImage = (u_dist_signed * v < -1e-9);
            if (!this._isValidVector(IMG_BASE, IMG_TIP)) {
                IMG_BASE = null; IMG_TIP = null;
            }
        }

        // 焦点世界坐标
        let F_obj_world = null, F_img_world = null;
        if (!isFlat) {
            F_obj_world = LENS_CENTER.add(LENS_AXIS.multiply(-F));
            F_img_world = LENS_CENTER.add(LENS_AXIS.multiply(F));
        }

        return {
            lens, F, isFlat,
            LENS_CENTER, LENS_AXIS, LENS_PLANE_DIR,
            OBJ_BASE, OBJ_TIP_EFFECTIVE,
            IMG_BASE, IMG_TIP,
            F_obj_world, F_img_world,
            u, v, M, ho_signed, hi_signed,
            isRealImage, imageAtInfinity,
            lensP1: lens.p1, lensP2: lens.p2
        };
    }

    // ==================== Drawing Methods ====================

    _drawStaticElements(ctx, params, canvasWidth, canvasHeight, dpr) {
        const { styles } = this;
        const LINE_WIDTH = 1.0 / dpr;
        const THICK_LINE_WIDTH = 1.8 / dpr;
        const POINT_RADIUS = 3 / dpr;
        const DASH_PATTERN = [4 / dpr, 3 / dpr];

        const {
            lens, LENS_CENTER, LENS_AXIS, LENS_PLANE_DIR,
            OBJ_BASE, OBJ_TIP_EFFECTIVE,
            IMG_BASE, IMG_TIP,
            F_obj_world, F_img_world,
            isRealImage
        } = params;

        // 光轴
        const axisP1 = LENS_CENTER.add(LENS_AXIS.multiply(-canvasWidth * 1.5));
        const axisP2 = LENS_CENTER.add(LENS_AXIS.multiply(canvasWidth * 1.5));
        this._drawLine(ctx, axisP1, axisP2, styles.AXIS_COLOR, LINE_WIDTH, DASH_PATTERN);

        // 透镜示意图
        this._drawLensSchematic(ctx, lens, styles.LENS_COLOR, THICK_LINE_WIDTH, dpr);

        // 物体箭头（高亮拖拽状态）
        const objColor = this.isHoveringObject || this.isDraggingObject
            ? '#FFD700' : styles.OBJ_COLOR;
        const objWidth = this.isHoveringObject || this.isDraggingObject
            ? THICK_LINE_WIDTH * 1.5 : THICK_LINE_WIDTH;
        this._drawArrow(ctx, OBJ_BASE, OBJ_TIP_EFFECTIVE, objColor, 8 / dpr, objWidth);
        this._drawLabeledPoint(ctx, OBJ_TIP_EFFECTIVE, "A", styles.OBJ_COLOR, POINT_RADIUS, dpr);
        this._drawLabeledPoint(ctx, OBJ_BASE, "B", styles.OBJ_COLOR, POINT_RADIUS, dpr, new Vector(5, 5));

        // 焦点
        if (F_obj_world && F_img_world) {
            this._drawLabeledPoint(ctx, F_obj_world, "F", styles.FOCI_COLOR, POINT_RADIUS, dpr, new Vector(-15, 5), 'right');
            this._drawLabeledPoint(ctx, F_img_world, "F'", styles.FOCI_COLOR, POINT_RADIUS, dpr, new Vector(5, 5), 'left');
        }

        // 像箭头
        if (IMG_TIP && IMG_BASE) {
            const imageColor = isRealImage ? styles.IMG_REAL_COLOR : styles.IMG_VIRTUAL_COLOR;
            const imageLabel = isRealImage ? "A' (实)" : "A' (虚)";
            if (!isRealImage) {
                // 虚像用虚线箭头
                this._drawLine(ctx, IMG_BASE, IMG_TIP, imageColor, THICK_LINE_WIDTH, DASH_PATTERN);
                // 虚线箭头头部仍然实心
                const vec = IMG_TIP.subtract(IMG_BASE);
                if (vec.magnitudeSquared() > 1e-9) {
                    const normDir = vec.normalize();
                    const angle = Math.PI / 6;
                    const size = 8 / dpr;
                    const v1 = normDir.rotate(Math.PI + angle).multiply(size);
                    const v2 = normDir.rotate(Math.PI - angle).multiply(size);
                    ctx.fillStyle = imageColor;
                    ctx.beginPath();
                    ctx.moveTo(IMG_TIP.x, IMG_TIP.y);
                    ctx.lineTo(IMG_TIP.x + v1.x, IMG_TIP.y + v1.y);
                    ctx.lineTo(IMG_TIP.x + v2.x, IMG_TIP.y + v2.y);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                this._drawArrow(ctx, IMG_BASE, IMG_TIP, imageColor, 8 / dpr, THICK_LINE_WIDTH);
            }
            this._drawLabeledPoint(ctx, IMG_TIP, imageLabel, imageColor, POINT_RADIUS, dpr);
            this._drawLabeledPoint(ctx, IMG_BASE, "B'", imageColor, POINT_RADIUS, dpr, new Vector(5, 5));
        }
    }

    _drawPrincipalRays(ctx, params, canvasWidth, canvasHeight, dpr) {
        const { styles } = this;
        const RAY_WIDTH = 1.2 / dpr;
        const DASH_PATTERN = [4 / dpr, 3 / dpr];

        const {
            lens, F, isFlat,
            LENS_CENTER, LENS_AXIS, LENS_PLANE_DIR,
            OBJ_TIP_EFFECTIVE, IMG_TIP,
            F_obj_world, F_img_world,
            isRealImage, imageAtInfinity,
            lensP1, lensP2
        } = params;

        const drawPrincipalRay = (startPoint, hitPoint, dirOut, endPoint, isVirtualIn, isVirtualOut, color) => {
            if (!hitPoint) return;
            // 入射段
            this._drawLine(ctx, startPoint, hitPoint, color, RAY_WIDTH, isVirtualIn ? DASH_PATTERN : []);
            // 出射段（实际路径 - 实线）
            const effectiveEnd = imageAtInfinity
                ? this._extendRay(hitPoint, dirOut, canvasWidth, canvasHeight)
                : endPoint;
            if (effectiveEnd) {
                this._drawLine(ctx, hitPoint, effectiveEnd, color, RAY_WIDTH);
            }
            // 反向延长（虚像路径 - 虚线）
            if (isVirtualOut && effectiveEnd) {
                const virtualOrigin = this._extendRay(hitPoint, dirOut.multiply(-1), canvasWidth, canvasHeight);
                this._drawLine(ctx, hitPoint, virtualOrigin, color, RAY_WIDTH, DASH_PATTERN);
            }
        };

        // 光线1：平行于光轴 → 经透镜后过像方焦点 F'
        if (!isFlat && F_img_world) {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = LENS_AXIS.clone();
            const hitPoint = this._intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lensP1, lensP2);
            if (hitPoint) {
                let dirOut;
                if (F > 0) { dirOut = F_img_world.subtract(hitPoint).normalize(); }
                else { dirOut = hitPoint.subtract(F_img_world).normalize(); }
                if (this._isValidVector(dirOut)) {
                    drawPrincipalRay(startPoint, hitPoint, dirOut, IMG_TIP, false, !isRealImage, styles.RAY_PARALLEL_COLOR);
                }
            }
        }

        // 光线2：过光心 → 不偏折
        {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const hitPoint = LENS_CENTER;
            const dir = hitPoint.subtract(startPoint).normalize();
            if (this._isValidVector(dir)) {
                drawPrincipalRay(startPoint, hitPoint, dir, IMG_TIP, false, !isRealImage, styles.RAY_CENTER_COLOR);
            }
        }

        // 光线3：过物方焦点 F → 经透镜后平行于光轴
        if (!isFlat && F_obj_world) {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = F_obj_world.subtract(startPoint).normalize();
            if (this._isValidVector(dirIn) && dirIn.magnitudeSquared() > 1e-9) {
                const isVirtualIn = (F < 0);
                const hitPoint = this._intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lensP1, lensP2);
                if (hitPoint) {
                    const dirOut = LENS_AXIS.clone();
                    drawPrincipalRay(startPoint, hitPoint, dirOut, IMG_TIP, isVirtualIn, !isRealImage, styles.RAY_FOCAL_COLOR);
                } else if (isVirtualIn) {
                    const aimPoint = this._extendRay(startPoint, dirIn, canvasWidth, canvasHeight);
                    this._drawLine(ctx, startPoint, aimPoint, styles.RAY_FOCAL_COLOR, RAY_WIDTH, DASH_PATTERN);
                }
            }
        }
    }

    _drawDragHint(ctx, params, dpr) {
        if (this.isHoveringObject && !this.isDraggingObject) {
            const { OBJ_TIP_EFFECTIVE } = params;
            if (!OBJ_TIP_EFFECTIVE) return;
            ctx.save();
            ctx.fillStyle = this.styles.DRAG_HINT_COLOR;
            ctx.font = `${11 / dpr}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('拖拽移动物体', OBJ_TIP_EFFECTIVE.x, OBJ_TIP_EFFECTIVE.y - 12 / dpr);
            ctx.restore();
        }
    }

    _drawInfo(ctx, params, dpr) {
        const { styles } = this;
        const { F, u, v, M, ho_signed, hi_signed, isRealImage, imageAtInfinity } = params;

        const infoFont = `${13 / dpr}px sans-serif`;
        const lineHeight = 16 / dpr;
        const textX = 15 / dpr;
        let textY = 20 / dpr;

        ctx.fillStyle = styles.INFO_COLOR;
        ctx.font = infoFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const fmt = (n, figs = 1) => {
            if (Math.abs(n) === Infinity) return "∞";
            return this._isValidNumber(n) ? n.toFixed(figs) : "N/A";
        };

        const textLines = [
            `f = ${fmt(F)}`, `u = ${fmt(u)}`, `v = ${fmt(v)}`,
            `M = ${fmt(M, 2)}`, `hₒ = ${fmt(ho_signed)}`, `hᵢ = ${fmt(hi_signed)}`
        ];
        textLines.forEach(line => { ctx.fillText(line, textX, textY); textY += lineHeight; });

        // 像性质
        let imagePropsText = "像: ";
        if (imageAtInfinity) {
            imagePropsText += "无穷远";
        } else if (this._isValidNumber(M)) {
            imagePropsText += isRealImage ? "实" : "虚";
            imagePropsText += ", ";
            imagePropsText += (M * ho_signed >= -1e-9) ? "正" : "倒";
            imagePropsText += ", ";
            const absM = Math.abs(M);
            imagePropsText += (absM > 1.02) ? "放大" : ((absM < 0.98) ? "缩小" : "等大");
        } else {
            imagePropsText += "---";
        }
        ctx.fillText(imagePropsText, textX, textY);
    }

    // ==================== Utility Methods ====================

    _isValidVector(...vectors) {
        return vectors.every(v => v && v instanceof Vector && !isNaN(v.x) && !isNaN(v.y));
    }

    _isValidNumber(...numbers) {
        return numbers.every(n => typeof n === 'number' && isFinite(n));
    }

    _drawLine(ctx, p1, p2, color, width, dashes = []) {
        if (!this._isValidVector(p1, p2)) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.setLineDash(dashes);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
    }

    _drawArrow(ctx, p1, p2, color, size, width) {
        if (!this._isValidVector(p1, p2)) return;
        const vec = p2.subtract(p1);
        if (vec.magnitudeSquared() < 1e-9) return;
        this._drawLine(ctx, p1, p2, color, width);
        const normDir = vec.normalize();
        if (!this._isValidVector(normDir)) return;
        const angle = Math.PI / 6;
        const v1 = normDir.rotate(Math.PI + angle).multiply(size);
        const v2 = normDir.rotate(Math.PI - angle).multiply(size);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x + v1.x, p2.y + v1.y);
        ctx.lineTo(p2.x + v2.x, p2.y + v2.y);
        ctx.closePath();
        ctx.fill();
    }

    _drawLabeledPoint(ctx, point, label, color, radius, dpr, offset = new Vector(5, -5), align = 'left') {
        if (!this._isValidVector(point)) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.font = `italic ${12 / dpr}px sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = this.styles.INFO_COLOR;
        ctx.fillText(label, point.x + offset.x / dpr, point.y + offset.y / dpr);
    }

    _drawLensSchematic(ctx, lens, color, lineWidth, dpr) {
        if (!lens || !this._isValidVector(lens.p1, lens.p2, lens.axisDirection)) return;
        this._drawLine(ctx, lens.p1, lens.p2, color, lineWidth * 1.2);
        const F = lens.isThickLens ? lens.effectiveFocalLength : lens.focalLength;
        const isFlat = Math.abs(F) === Infinity;
        if (!isFlat) {
            const arrowSize = 8 * 0.8 / dpr;
            const midTop = Vector.lerp(lens.pos, lens.p1, 0.85);
            const midBot = Vector.lerp(lens.pos, lens.p2, 0.85);
            const arrowDir = lens.axisDirection.clone();
            ctx.fillStyle = color;
            if (F > 0) {
                this._drawArrowhead(ctx, midTop, arrowDir.multiply(-1), arrowSize);
                this._drawArrowhead(ctx, midBot, arrowDir, arrowSize);
            } else {
                this._drawArrowhead(ctx, midTop, arrowDir, arrowSize);
                this._drawArrowhead(ctx, midBot, arrowDir.multiply(-1), arrowSize);
            }
        }
    }

    _drawArrowhead(ctx, tip, direction, size) {
        if (!this._isValidVector(tip, direction) || direction.magnitudeSquared() < 1e-6) return;
        const normDir = direction.normalize();
        const angle = Math.PI / 6;
        const v1 = normDir.rotate(Math.PI + angle).multiply(size);
        const v2 = normDir.rotate(Math.PI - angle).multiply(size);
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x + v1.x, tip.y + v1.y);
        ctx.lineTo(tip.x + v2.x, tip.y + v2.y);
        ctx.closePath();
        ctx.fill();
    }

    _intersectLensLine(rayOrigin, rayDir, lensCenter, lensPlaneDir, lensP1, lensP2) {
        if (!this._isValidVector(rayOrigin, rayDir, lensCenter, lensPlaneDir, lensP1, lensP2)) return null;
        const OC = rayOrigin.subtract(lensCenter);
        const cross = rayDir.cross(lensPlaneDir);
        if (Math.abs(cross) < 1e-9) return null;
        const s = -(OC.cross(lensPlaneDir)) / cross;
        if (s < 1e-6) return null;
        const hitPoint = rayOrigin.add(rayDir.multiply(s));
        const lensDiameterSq = lensP1.distanceSquaredTo(lensP2);
        const proj = hitPoint.subtract(lensP1).dot(lensP2.subtract(lensP1)) / (lensDiameterSq > 1e-9 ? lensDiameterSq : 1);
        if (proj < -0.05 || proj > 1.05) return null;
        return hitPoint;
    }

    _extendRay(startPoint, direction, canvasWidth, canvasHeight, factor = 2.0) {
        if (!this._isValidVector(startPoint, direction) || direction.magnitudeSquared() < 1e-9) return startPoint;
        const length = Math.max(canvasWidth || 2000, canvasHeight || 1500) * factor;
        const normDir = direction.normalize();
        return this._isValidVector(normDir) ? startPoint.add(normDir.multiply(length)) : startPoint;
    }
}

// 单例
let lensImagingInstance = null;

export function getLensImaging() {
    if (!lensImagingInstance) {
        lensImagingInstance = new LensImaging();
    }
    return lensImagingInstance;
}

export function resetLensImaging() {
    if (lensImagingInstance) {
        lensImagingInstance.reset();
    }
    lensImagingInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.LensImaging = LensImaging;
    window.getLensImaging = getLensImaging;
}
