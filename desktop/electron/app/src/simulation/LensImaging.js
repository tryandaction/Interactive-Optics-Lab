/**
 * LensImaging.js - 透镜成像图绘制器
 * 负责绘制透镜成像的光学系统图
 */

import { Vector } from '../core/Vector.js';

/**
 * 透镜成像绘制器类
 * 绘制透镜成像的主光线和像
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
            INFO_COLOR: 'rgba(230, 230, 230, 0.9)'
        };
    }

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

        // 查找物体和透镜
        const objectSource = this._findObjectSource(components);
        const lens = this._findLens(components);

        // 验证
        if (!this._validateInputs(objectSource, lens, showHint)) {
            return false;
        }

        const width = canvasWidth || ctx.canvas.width / dpr;
        const height = canvasHeight || ctx.canvas.height / dpr;

        // 计算参数
        const params = this._calculateParameters(objectSource, lens, dpr);
        if (!params) {
            showHint('计算参数错误。');
            return false;
        }

        // 绘制
        ctx.save();
        try {
            this._drawStaticElements(ctx, params, width, height, dpr);
            this._drawPrincipalRays(ctx, params, width, height, dpr);
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
     * 查找物体光源
     * @private
     */
    _findObjectSource(components) {
        return components.find(comp => 
            comp.constructor.name === 'LaserSource' ||
            comp.constructor.name === 'FanSource' ||
            comp.constructor.name === 'LineSource' ||
            comp.constructor.name === 'WhiteLightSource'
        );
    }

    /**
     * 查找透镜
     * @private
     */
    _findLens(components) {
        return components.find(comp => comp.constructor.name === 'ThinLens');
    }

    /**
     * 验证输入
     * @private
     */
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

    /**
     * 计算参数
     * @private
     */
    _calculateParameters(objectSource, lens, dpr) {
        const F = lens.focalLength;
        const isFlat = Math.abs(F) === Infinity;
        const LENS_CENTER = lens.pos;
        const LENS_AXIS = lens.axisDirection.clone();
        const LENS_PLANE_DIR = lens.p1.subtract(lens.p2).normalize();

        // 物体计算
        const OBJ_TIP = objectSource.pos.clone();
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

        if (!this._isValidVector(OBJ_BASE, OBJ_TIP_EFFECTIVE)) {
            return null;
        }

        // 像计算
        const u = -u_dist_signed;
        let v = Infinity, M = 0, hi_signed = 0;
        let IMG_TIP = null, IMG_BASE = null;
        let isRealImage = false, imageAtInfinity = false;

        if (isFlat) {
            v = -u;
            M = 1.0;
        } else if (Math.abs(u) < 1e-9) {
            v = 0;
            M = 1.0;
        } else if (Math.abs(F) < 1e-9) {
            v = -u;
            M = 1.0;
        } else if (Math.abs(u - F) < 1e-6) {
            v = Infinity;
            M = Infinity;
            imageAtInfinity = true;
        } else {
            const one_over_v = 1/F - 1/u;
            if (Math.abs(one_over_v) < 1e-9) {
                v = Infinity;
                M = Infinity;
                imageAtInfinity = true;
            } else {
                v = 1 / one_over_v;
                M = -v / u;
            }
        }

        if (!imageAtInfinity) {
            IMG_BASE = LENS_CENTER.add(LENS_AXIS.multiply(v));
            hi_signed = M * ho_effective;
            IMG_TIP = IMG_BASE.add(LENS_PLANE_DIR.multiply(hi_signed));
            isRealImage = (u_dist_signed * v < -1e-9);
        }

        // 焦点
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
            isRealImage, imageAtInfinity
        };
    }

    /**
     * 绘制静态元素
     * @private
     */
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

        // 透镜
        this._drawLensSchematic(ctx, lens, styles.LENS_COLOR, THICK_LINE_WIDTH, dpr);

        // 物体
        this._drawArrow(ctx, OBJ_BASE, OBJ_TIP_EFFECTIVE, styles.OBJ_COLOR, 8/dpr, THICK_LINE_WIDTH);
        this._drawLabeledPoint(ctx, OBJ_TIP_EFFECTIVE, "A", styles.OBJ_COLOR, POINT_RADIUS, dpr);
        this._drawLabeledPoint(ctx, OBJ_BASE, "B", styles.OBJ_COLOR, POINT_RADIUS, dpr, new Vector(5, 5));

        // 焦点
        if (F_obj_world && F_img_world) {
            this._drawLabeledPoint(ctx, F_obj_world, "F", styles.FOCI_COLOR, POINT_RADIUS, dpr, new Vector(-15, 5), 'right');
            this._drawLabeledPoint(ctx, F_img_world, "F'", styles.FOCI_COLOR, POINT_RADIUS, dpr, new Vector(5, 5), 'left');
        }

        // 像
        if (IMG_TIP && IMG_BASE) {
            const imageColor = isRealImage ? styles.IMG_REAL_COLOR : styles.IMG_VIRTUAL_COLOR;
            const imageLabel = isRealImage ? "A' (实)" : "A' (虚)";
            const dashes = isRealImage ? [] : DASH_PATTERN;
            this._drawArrow(ctx, IMG_BASE, IMG_TIP, imageColor, 8/dpr, THICK_LINE_WIDTH);
            this._drawLabeledPoint(ctx, IMG_TIP, imageLabel, imageColor, POINT_RADIUS, dpr);
            this._drawLabeledPoint(ctx, IMG_BASE, "B'", imageColor, POINT_RADIUS, dpr, new Vector(5, 5));
        }
    }

    /**
     * 绘制主光线
     * @private
     */
    _drawPrincipalRays(ctx, params, canvasWidth, canvasHeight, dpr) {
        const { styles } = this;
        const RAY_WIDTH = 1.2 / dpr;
        const DASH_PATTERN = [4 / dpr, 3 / dpr];

        const {
            lens, F, isFlat,
            LENS_CENTER, LENS_AXIS, LENS_PLANE_DIR,
            OBJ_TIP_EFFECTIVE, IMG_TIP,
            F_obj_world, F_img_world,
            isRealImage, imageAtInfinity
        } = params;

        // 光线1：平行光 -> F'
        if (!isFlat && F_img_world) {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = LENS_AXIS.clone();
            const hitPoint = this._intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lens.p1, lens.p2);
            
            if (hitPoint) {
                let dirOut;
                if (F > 0) {
                    dirOut = F_img_world.subtract(hitPoint).normalize();
                } else {
                    dirOut = hitPoint.subtract(F_img_world).normalize();
                }

                if (this._isValidVector(dirOut)) {
                    const endPoint = imageAtInfinity ? this._extendRay(hitPoint, dirOut, canvasWidth, canvasHeight) : IMG_TIP;
                    this._drawPrincipalRay(ctx, startPoint, hitPoint, dirOut, endPoint, false, !isRealImage, styles.RAY_PARALLEL_COLOR, RAY_WIDTH, DASH_PATTERN, canvasWidth, canvasHeight);
                }
            }
        }

        // 光线2：过中心 -> 不偏折
        {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const hitPoint = LENS_CENTER;
            const dir = hitPoint.subtract(startPoint).normalize();
            
            if (this._isValidVector(dir)) {
                const endPoint = imageAtInfinity ? this._extendRay(hitPoint, dir, canvasWidth, canvasHeight) : IMG_TIP;
                this._drawPrincipalRay(ctx, startPoint, hitPoint, dir, endPoint, false, !isRealImage, styles.RAY_CENTER_COLOR, RAY_WIDTH, DASH_PATTERN, canvasWidth, canvasHeight);
            }
        }

        // 光线3：过F -> 平行光
        if (!isFlat && F_obj_world) {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = F_obj_world.subtract(startPoint).normalize();
            
            if (this._isValidVector(dirIn) && dirIn.magnitudeSquared() > 1e-9) {
                const isVirtualIn = (F < 0);
                const hitPoint = this._intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lens.p1, lens.p2);
                
                if (hitPoint) {
                    const dirOut = LENS_AXIS.clone();
                    const endPoint = imageAtInfinity ? this._extendRay(hitPoint, dirOut, canvasWidth, canvasHeight) : IMG_TIP;
                    this._drawPrincipalRay(ctx, startPoint, hitPoint, dirOut, endPoint, isVirtualIn, !isRealImage, styles.RAY_FOCAL_COLOR, RAY_WIDTH, DASH_PATTERN, canvasWidth, canvasHeight);
                }
            }
        }
    }

    /**
     * 绘制信息
     * @private
     */
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

        const formatNum = (n, figs = 1) => {
            if (Math.abs(n) === Infinity) return "∞";
            return this._isValidNumber(n) ? n.toFixed(figs) : "N/A";
        };

        const textLines = [
            `f = ${formatNum(F)}`,
            `u = ${formatNum(u)}`,
            `v = ${formatNum(v)}`,
            `M = ${formatNum(M, 2)}`,
            `hₒ = ${formatNum(ho_signed)}`,
            `hᵢ = ${formatNum(hi_signed)}`
        ];

        textLines.forEach(line => {
            ctx.fillText(line, textX, textY);
            textY += lineHeight;
        });

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
            imagePropsText += (absM > 1.0 + 1e-2) ? "放大" : ((absM < 1.0 - 1e-2) ? "缩小" : "等大");
        } else {
            imagePropsText += "---";
        }
        ctx.fillText(imagePropsText, textX, textY);
    }

    // 辅助方法
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
        
        const F = lens.focalLength;
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
        const length = Math.max(canvasWidth, canvasHeight) * factor;
        const normDir = direction.normalize();
        return this._isValidVector(normDir) ? startPoint.add(normDir.multiply(length)) : startPoint;
    }

    _drawPrincipalRay(ctx, startPoint, hitPoint, dirOut, endPoint, isVirtualIn, isVirtualOut, color, width, dashPattern, canvasWidth, canvasHeight) {
        if (!hitPoint) return;

        // 入射段
        this._drawLine(ctx, startPoint, hitPoint, color, width, isVirtualIn ? dashPattern : []);

        // 出射段（实际路径）
        const effectiveEndPoint = endPoint || this._extendRay(hitPoint, dirOut, canvasWidth, canvasHeight);
        if (effectiveEndPoint) {
            this._drawLine(ctx, hitPoint, effectiveEndPoint, color, width);
        }

        // 反向延长（虚像路径）
        if (isVirtualOut && effectiveEndPoint) {
            const virtualOrigin = this._extendRay(hitPoint, dirOut.multiply(-1), canvasWidth, canvasHeight);
            this._drawLine(ctx, hitPoint, virtualOrigin, color, width, dashPattern);
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.LensImaging = LensImaging;
}
