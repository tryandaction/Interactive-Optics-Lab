/**
 * ThinLens.js - 薄透镜/厚透镜
 * 基于薄透镜/厚透镜公式使光线汇聚或发散，可模拟色散，支持多种透镜类型
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { DEFAULT_WAVELENGTH_NM } from '../../core/constants.js';

// --- Lens Type Constants ---
export const LENS_TYPES = {
    THIN_LENS: 'thin_lens',
    THICK_PLANO_CONVEX: 'plano_convex',
    THICK_PLANO_CONCAVE: 'plano_concave',
    THICK_BICONVEX: 'biconvex',
    THICK_BICONCAVE: 'biconcave',
    THICK_CUSTOM: 'custom'
};

// --- Thick Lens Preset Configurations ---
export const THICK_LENS_PRESETS = {
    [LENS_TYPES.THICK_PLANO_CONVEX]: {
        frontRadius: 50,
        backRadius: Infinity,
        thickness: 20
    },
    [LENS_TYPES.THICK_PLANO_CONCAVE]: {
        frontRadius: -50,
        backRadius: Infinity,
        thickness: 20
    },
    [LENS_TYPES.THICK_BICONVEX]: {
        frontRadius: 50,
        backRadius: -50,
        thickness: 20
    },
    [LENS_TYPES.THICK_BICONCAVE]: {
        frontRadius: -50,
        backRadius: 50,
        thickness: 20
    }
};

export class ThinLens extends OpticalComponent {
    static functionDescription = "基于薄透镜/厚透镜公式使光线汇聚或发散，可模拟色散，支持多种透镜类型。";

    constructor(pos, diameter = 80, focalLength = 150, angleDeg = 90) {
        super(pos, angleDeg, "薄透镜");
        this.diameter = Math.max(10, diameter);

        this.lensType = LENS_TYPES.THIN_LENS;
        this.focalLength = focalLength === 0 ? Infinity : focalLength;

        // Thick Lens Parameters
        this.thickness = 20;
        this.frontRadius = 50;
        this.backRadius = -50;

        // Physics Properties
        this.baseRefractiveIndex = 1.5;
        this.dispersionCoeffB = 5000;
        this.chromaticAberration = 0.005;
        this.sphericalAberration = 0.01;
        this.quality = 0.98;
        this.coated = false;

        // Geometry Cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.lensDir = Vector.fromAngle(this.angleRad);
        this.axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);

        // Thick Lens Geometry Cache
        this.frontCenter = null;
        this.backCenter = null;
        this.effectiveFocalLength = this.focalLength;

        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550);

        try { this._updateGeometry(); } catch (e) { console.error("Init Lens Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            diameter: this.diameter,
            lensType: this.lensType,
            focalLength: this.focalLength,
            thickness: this.thickness,
            frontRadius: this.frontRadius,
            backRadius: this.backRadius,
            baseRefractiveIndex: this.baseRefractiveIndex,
            dispersionCoeffB: this.dispersionCoeffB,
            quality: this.quality
        };
    }

    getRefractiveIndex(wavelengthNm = 550) {
        if (typeof wavelengthNm !== 'number' || wavelengthNm <= 0) {
            return this.baseRefractiveIndex;
        }
        const n = this._cauchyA + this.dispersionCoeffB / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n);
    }

    _updateCauchyA() {
        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550);
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) { console.error("Lens position invalid."); return; }
        this.lensDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = this.lensDir.multiply(this.diameter / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.axisDirection = new Vector(-this.lensDir.y, this.lensDir.x);

        if (this.isThickLens) {
            this._updateThickLensGeometry();
        }

        let lensType = "薄透镜";
        if (Math.abs(this.focalLength) === Infinity) { lensType = "平板"; }
        else if (this.focalLength > 0) { lensType = "凸透镜"; }
        else { lensType = "凹透镜"; }
        if (this.isThickLens && Math.abs(this.focalLength) !== Infinity) { lensType = "厚" + lensType; }
        this.label = lensType;
    }

    _updateThickLensGeometry() {
        const axisDir = this.axisDirection;

        if (Math.abs(this.frontRadius) === Infinity) {
            this.frontCenter = null;
        } else {
            const frontOffset = axisDir.multiply(this.frontRadius);
            this.frontCenter = this.pos.add(frontOffset);
        }

        if (Math.abs(this.backRadius) === Infinity) {
            this.backCenter = null;
        } else {
            const backOffset = axisDir.multiply(this.backRadius);
            this.backCenter = this.pos.add(backOffset);
        }

        this._calculateEffectiveFocalLength();
    }

    _calculateEffectiveFocalLength(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        if (!this.isThickLens) {
            return this.focalLength;
        }

        const n = this.getRefractiveIndex(wavelengthNm);
        const R1 = this.frontRadius;
        const R2 = this.backRadius;
        const d = this.thickness;

        let power = 0;

        if (Math.abs(R1) === Infinity && Math.abs(R2) === Infinity) {
            power = 0;
        } else if (Math.abs(R1) === Infinity) {
            power = (n - 1) * (-1 / R2);
        } else if (Math.abs(R2) === Infinity) {
            power = (n - 1) * (1 / R1);
        } else {
            power = (n - 1) * (1 / R1 - 1 / R2) + (n - 1) * (n - 1) * d / (n * R1 * R2);
        }

        return Math.abs(power) < 1e-9 ? Infinity : 1 / power;
    }

    get isThickLens() {
        return this.lensType !== LENS_TYPES.THIN_LENS;
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Lens AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Lens PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector) || !this.pos) return;

        const center = this.pos;
        const p1 = this.p1;
        const p2 = this.p2;
        const diameter = this.diameter;
        const F = this.effectiveFocalLength;
        const isFlat = Math.abs(F) === Infinity;
        const isConvex = F > 0;
        const selected = this.selected;

        const convexColor = '#90c0ff';
        const concaveColor = '#FFB6C1';
        const flatColor = '#D3D3D3';
        const selectedColor = '#FFFF00';

        let baseStrokeColor = isFlat ? flatColor : (isConvex ? convexColor : concaveColor);
        ctx.strokeStyle = selected ? selectedColor : baseStrokeColor;
        ctx.lineWidth = selected ? 2.5 : 1.8;

        const baseFillAlpha = this.isThickLens ? 0.20 : 0.10;
        const selectedFillAlpha = this.isThickLens ? 0.30 : 0.20;
        let fillStyle = "rgba(0,0,0,0)";
        if (!isFlat) {
            let rgb = isConvex ? '144, 192, 255' : '255, 160, 160';
            fillStyle = selected ? `rgba(${rgb}, ${selectedFillAlpha})` : `rgba(${rgb}, ${baseFillAlpha})`;
        } else {
            let rgb = '211, 211, 211';
            fillStyle = selected ? `rgba(${rgb}, ${selectedFillAlpha})` : `rgba(${rgb}, ${baseFillAlpha})`;
        }
        ctx.fillStyle = fillStyle;

        const perpDir = this.axisDirection.clone();

        ctx.beginPath();
        if (this.isThickLens) {
            this._drawThickLensShape(ctx);
        } else {
            if (isFlat) {
                const thickness = 4;
                const perpOffset = perpDir.multiply(thickness / 2);
                const p1_corner1 = p1.add(perpOffset);
                const p1_corner2 = p1.subtract(perpOffset);
                const p2_corner1 = p2.add(perpOffset);
                const p2_corner2 = p2.subtract(perpOffset);
                ctx.moveTo(p1_corner1.x, p1_corner1.y);
                ctx.lineTo(p2_corner1.x, p2_corner1.y);
                ctx.lineTo(p2_corner2.x, p2_corner2.y);
                ctx.lineTo(p1_corner2.x, p1_corner2.y);
                ctx.closePath();
            } else {
                const baseCurvature = diameter * 0.12;
                const focalLengthFactor = Math.min(4, Math.max(0.2, 150 / Math.abs(F)));
                let curveMagnitude = Math.max(2.0, baseCurvature * focalLengthFactor);
                let cp1, cp2;
                if (isConvex) {
                    cp1 = center.add(perpDir.multiply(curveMagnitude));
                    cp2 = center.add(perpDir.multiply(-curveMagnitude));
                } else {
                    cp1 = center.add(perpDir.multiply(-curveMagnitude));
                    cp2 = center.add(perpDir.multiply(curveMagnitude));
                }
                ctx.moveTo(p1.x, p1.y);
                ctx.quadraticCurveTo(cp1.x, cp1.y, p2.x, p2.y);
                ctx.quadraticCurveTo(cp2.x, cp2.y, p1.x, p1.y);
                ctx.closePath();
            }
        }
        ctx.fill();
        ctx.stroke();

        if (!isFlat && !this.isThickLens) {
            const arrowSize = Math.min(10, diameter * 0.12);
            const edgeOffsetRatio = 0.9;
            const p1ArrowPos = Vector.lerp(center, p1, edgeOffsetRatio);
            const p2ArrowPos = Vector.lerp(center, p2, edgeOffsetRatio);
            const arrowDir = perpDir.clone();
            ctx.fillStyle = ctx.strokeStyle;
            if (isConvex) {
                this._drawArrowhead(ctx, p1ArrowPos, arrowDir.multiply(-1), arrowSize);
                this._drawArrowhead(ctx, p2ArrowPos, arrowDir, arrowSize);
            } else {
                this._drawArrowhead(ctx, p1ArrowPos, arrowDir, arrowSize);
                this._drawArrowhead(ctx, p2ArrowPos, arrowDir.multiply(-1), arrowSize);
            }
        }

        if (selected && !isFlat) {
            try {
                const focalPoint1 = center.add(this.axisDirection.multiply(F));
                const focalPoint2 = center.add(this.axisDirection.multiply(-F));
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(focalPoint1.x, focalPoint1.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(focalPoint2.x, focalPoint2.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.setLineDash([2, 3]);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(center.x, center.y);
                ctx.lineTo(focalPoint1.x, focalPoint1.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(center.x, center.y);
                ctx.lineTo(focalPoint2.x, focalPoint2.y);
                ctx.stroke();
                ctx.setLineDash([]);
            } catch (e) { console.error("Error drawing focal points:", e); }
        }
    }

    _drawThickLensShape(ctx) {
        const center = this.pos;
        const perpDir = this.axisDirection;
        const halfWidth = this.diameter / 2;
        const thickness = this.thickness;

        const frontLeft = center.add(this.lensDir.multiply(-halfWidth));
        const frontRight = center.add(this.lensDir.multiply(halfWidth));
        const backLeft = frontLeft.add(perpDir.multiply(thickness));
        const backRight = frontRight.add(perpDir.multiply(thickness));

        if (Math.abs(this.frontRadius) === Infinity) {
            ctx.moveTo(frontLeft.x, frontLeft.y);
            ctx.lineTo(frontRight.x, frontRight.y);
        } else {
            const isFrontConvex = this.frontRadius > 0;
            const radius = Math.abs(this.frontRadius);
            this._drawCircularArc(ctx, frontLeft, frontRight, this.frontCenter, radius, isFrontConvex);
        }

        if (Math.abs(this.backRadius) === Infinity) {
            ctx.lineTo(backRight.x, backRight.y);
            ctx.lineTo(backLeft.x, backLeft.y);
        } else {
            const isBackConvex = this.backRadius < 0;
            const radius = Math.abs(this.backRadius);
            this._drawCircularArc(ctx, backRight, backLeft, this.backCenter, radius, isBackConvex);
        }

        ctx.closePath();
    }

    _drawCircularArc(ctx, startPoint, endPoint, center, radius, isConvex) {
        if (!center || radius <= 0) return;

        const startVec = startPoint.subtract(center);
        const endVec = endPoint.subtract(center);
        const startAngle = startVec.angle();
        let endAngle = endVec.angle();

        if (isConvex) {
            if (endAngle < startAngle) endAngle += 2 * Math.PI;
        } else {
            if (endAngle > startAngle) endAngle -= 2 * Math.PI;
        }

        const counterclockwise = !isConvex;
        ctx.arc(center.x, center.y, radius, startAngle, endAngle, counterclockwise);
    }

    _drawArrowhead(ctx, tip, direction, size) {
        if (!direction || direction.magnitudeSquared() < 1e-6 || size <= 0) return;
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

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const p1 = this.p1;
        const p2 = this.p2;
        const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(p1);
        const p1_to_p2 = p2.subtract(p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPointOnSegment = p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPointOnSegment) < 25;
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 10;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3);
        if (Math.abs(dot_v2_v3) < 1e-9) { return []; }
        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.axisDirection.clone();
            if (rayDirection.dot(surfaceNormal) > 0) { surfaceNormal = surfaceNormal.multiply(-1); }
            if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) {
                console.error(`ThinLens (${this.id}) intersect NaN.`);
                return [];
            }
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'lens_plane' }];
        }
        return [];
    }

    _interactThickLens(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        if (!hitPoint || isNaN(hitPoint.x) || isNaN(hitPoint.y) ||
            !ray.direction || isNaN(ray.direction.x) || isNaN(ray.direction.y)) {
            ray.terminate('invalid_input_thick_lens');
            return [];
        }

        const lensCenter = this.pos;
        const axisDir = this.axisDirection;
        const lensPlaneDir = this.lensDir;
        const vecCenterToHit = hitPoint.subtract(lensCenter);
        const h = vecCenterToHit.dot(lensPlaneDir);

        const f_eff = this.effectiveFocalLength;
        if (isNaN(f_eff)) {
            ray.terminate('nan_focal_thick_lens');
            return [];
        }
        const deviation = (Math.abs(f_eff) < 1e-9) ? 0 : -h / f_eff;

        const incidentDirection = ray.direction;
        const incidentAngleRelAxis = Math.atan2(
            incidentDirection.dot(axisDir.rotate(Math.PI / 2)),
            incidentDirection.dot(axisDir)
        );
        const outputAngleRelAxis = incidentAngleRelAxis + deviation;
        const outputWorldAngle = axisDir.angle() + outputAngleRelAxis;
        const newDirection = Vector.fromAngle(outputWorldAngle);

        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            ray.terminate('nan_direction_thick_lens');
            return [];
        }

        const transmittedIntensity = ray.intensity * this.quality;
        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
            const transmittedRay = new RayClass(
                newOrigin, newDirection, ray.wavelengthNm, transmittedIntensity,
                ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                ray.history.concat([newOrigin.clone()]), ray.beamDiameter
            );
            ray.terminate('refracted_thick_lens');
            return [transmittedRay];
        } else {
            ray.terminate('too_dim_thick_lens');
            return [];
        }
    }

    interact(ray, intersectionInfo, RayClass) {
        if (this.isThickLens) {
            return this._interactThickLens(ray, intersectionInfo, RayClass);
        }

        const hitPoint = intersectionInfo.point;
        const f_user = this.focalLength;
        const n_base = this.baseRefractiveIndex;
        const incidentDirection = ray.direction;
        const incidentWavelength = ray.wavelengthNm;

        if (!(hitPoint instanceof Vector) || !(incidentDirection instanceof Vector) ||
            isNaN(hitPoint.x) || isNaN(incidentDirection.x) || isNaN(f_user) || isNaN(n_base)) {
            console.error(`ThinLens (${this.id}): Invalid geometry, f, or n_base for interact.`);
            ray.terminate('invalid_geom_interact_lens');
            return [];
        }

        if (Math.abs(f_user) === Infinity) {
            const transmittedIntensity = ray.intensity * this.quality;
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(
                        transmitOrigin, incidentDirection, incidentWavelength,
                        Math.min(ray.intensity, transmittedIntensity), ray.phase,
                        ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId,
                        ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]),
                        ray.beamDiameter
                    );
                } catch (e) { console.error(`Flat Lens (${this.id}) pass-through error:`, e); }
            }
            ray.terminate('pass_flat_lens');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        let f_actual = f_user;
        let n_wl = n_base;
        try {
            n_wl = this.getRefractiveIndex(incidentWavelength);
            if (isNaN(n_wl) || n_wl < 1.0) n_wl = n_base;

            const n_base_minus_1 = n_base - 1.0;
            const n_wl_minus_1 = n_wl - 1.0;

            if (Math.abs(n_wl_minus_1) < 1e-9) {
                f_actual = Infinity;
            } else if (Math.abs(n_base_minus_1) < 1e-9) {
                f_actual = Infinity;
            } else {
                f_actual = f_user * (n_base_minus_1 / n_wl_minus_1);
            }

            if (!isFinite(f_actual)) {
                f_actual = Infinity;
            }
        } catch (e) {
            console.error(`ThinLens (${this.id}): Error calculating refractive index. Using f_user.`, e);
            f_actual = f_user;
        }

        if (Math.abs(f_actual) === Infinity) {
            const transmittedIntensity = ray.intensity * this.quality;
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(transmitOrigin, incidentDirection, incidentWavelength,
                        transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                        ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                        ray.history.concat([transmitOrigin.clone()]), ray.beamDiameter);
                } catch (e) { /* ignore */ }
            }
            ray.terminate('pass_flat_lens_chromatic');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        const lensCenter = this.pos;
        const axisDir = this.axisDirection;
        const lensPlaneDir = this.lensDir;

        const vecCenterToHit = hitPoint.subtract(lensCenter);
        const h = vecCenterToHit.dot(lensPlaneDir);

        const axisAngle = axisDir.angle();
        const incidentWorldAngle = incidentDirection.angle();
        const incidentAngleRelAxis = Math.atan2(Math.sin(incidentWorldAngle - axisAngle), Math.cos(incidentWorldAngle - axisAngle));

        const deviation = (Math.abs(f_actual) < 1e-9) ? 0 : -h / f_actual;
        const outputAngleRelAxis = incidentAngleRelAxis + deviation;
        const outputWorldAngle = axisAngle + outputAngleRelAxis;
        const normalizedOutputWorldAngle = Math.atan2(Math.sin(outputWorldAngle), Math.cos(outputWorldAngle));
        const newDirection = Vector.fromAngle(normalizedOutputWorldAngle);

        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            console.error(`ThinLens (${this.id}): NaN/zero direction calculated. Fallback.`);
            const fallbackDirection = incidentDirection.clone();
            const newOrigin = hitPoint.add(fallbackDirection.multiply(1e-6));
            const transmittedIntensity = ray.intensity * this.quality;
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(newOrigin, fallbackDirection, incidentWavelength,
                        transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
                        ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                        ray.history.concat([newOrigin.clone()]), ray.beamDiameter);
                } catch (e) { /* ignore */ }
            }
            ray.terminate('refract_error_lens_chromatic');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        let transmittedIntensity = ray.intensity * this.quality;
        const nextBounces = ray.bouncesSoFar + 1;
        let transmittedRay = null;

        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, incidentWavelength, transmittedIntensity,
                    ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId,
                    ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()]),
                    ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in Lens (${this.id}):`, e); }
        }

        ray.terminate('refracted_lens_chromatic');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    /**
     * ABCD Matrix for thin lens transformation
     * For a thin lens: A=1, B=0, C=-1/f, D=1
     * @returns {Object} ABCD matrix elements {A, B, C, D}
     */
    getABCDMatrix() {
        const f = this.isThickLens ? this.effectiveFocalLength : this.focalLength;
        if (Math.abs(f) === Infinity) {
            return { A: 1, B: 0, C: 0, D: 1 }; // Identity matrix for flat lens
        }
        return { A: 1, B: 0, C: -1 / f, D: 1 };
    }

    /**
     * Transform Gaussian beam q-parameter through the lens
     * q' = (A*q + B) / (C*q + D)
     * where q = z + i*z_R (z is distance from waist, z_R is Rayleigh range)
     * @param {Object} qParam - Complex q parameter {re: real, im: imaginary}
     * @returns {Object} Transformed q parameter {re, im}
     */
    transformGaussianBeam(qParam) {
        const { A, B, C, D } = this.getABCDMatrix();
        
        // q' = (A*q + B) / (C*q + D)
        // For complex division: (a+bi)/(c+di) = ((ac+bd) + (bc-ad)i) / (c²+d²)
        const numerator = {
            re: A * qParam.re + B,
            im: A * qParam.im
        };
        const denominator = {
            re: C * qParam.re + D,
            im: C * qParam.im
        };
        
        const denomMag2 = denominator.re * denominator.re + denominator.im * denominator.im;
        if (denomMag2 < 1e-12) {
            return qParam; // Return unchanged if denominator is too small
        }
        
        return {
            re: (numerator.re * denominator.re + numerator.im * denominator.im) / denomMag2,
            im: (numerator.im * denominator.re - numerator.re * denominator.im) / denomMag2
        };
    }

    /**
     * Calculate output beam parameters from input Gaussian beam
     * @param {number} w0_in - Input beam waist radius
     * @param {number} z_in - Distance from input waist to lens
     * @param {number} wavelengthNm - Wavelength in nm
     * @returns {Object} Output beam parameters {w0_out, z_out, w_at_lens}
     */
    transformBeamParameters(w0_in, z_in, wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        const lambda = wavelengthNm * 1e-9; // Convert to meters (assuming pixel = 1mm scale)
        const z_R_in = Math.PI * w0_in * w0_in / (lambda * 1e6); // Rayleigh range in pixels
        
        // Input q parameter at lens position
        const q_in = { re: z_in, im: z_R_in };
        
        // Transform through lens
        const q_out = this.transformGaussianBeam(q_in);
        
        // Extract output parameters
        // q = z + i*z_R, so z_R_out = Im(q_out), z_out = Re(q_out)
        const z_R_out = q_out.im;
        const z_out = q_out.re;
        
        // Output waist: w0² = z_R * λ / π
        const w0_out = Math.sqrt(Math.abs(z_R_out) * lambda * 1e6 / Math.PI);
        
        // Beam radius at lens
        const w_at_lens = w0_in * Math.sqrt(1 + (z_in / z_R_in) ** 2);
        
        return {
            w0_out: w0_out,
            z_out: z_out,
            w_at_lens: w_at_lens,
            z_R_out: z_R_out
        };
    }

    getProperties() {
        const baseProps = super.getProperties();

        const geomProps = {
            diameter: { value: this.diameter.toFixed(1), label: '直径 (D)', type: 'number', min: 10, step: 1, title: '透镜的物理直径' },
        };

        const lensTypeProps = {
            lensType: {
                value: this.lensType,
                label: '透镜类型',
                type: 'select',
                options: [
                    { value: LENS_TYPES.THIN_LENS, label: '薄透镜' },
                    { value: LENS_TYPES.THICK_PLANO_CONVEX, label: '平凸透镜' },
                    { value: LENS_TYPES.THICK_PLANO_CONCAVE, label: '平凹透镜' },
                    { value: LENS_TYPES.THICK_BICONVEX, label: '双凸透镜' },
                    { value: LENS_TYPES.THICK_BICONCAVE, label: '双凹透镜' },
                    { value: LENS_TYPES.THICK_CUSTOM, label: '自定义厚透镜' }
                ],
                title: '选择透镜类型：薄透镜或各种厚透镜形式'
            }
        };

        const coreOpticalProps = {};
        if (this.lensType === LENS_TYPES.THIN_LENS) {
            coreOpticalProps.focalLength = {
                value: Math.abs(this.focalLength) === Infinity ? 'Infinity' : this.focalLength.toFixed(1),
                label: '焦距 (f)',
                type: 'number',
                step: 10,
                title: '正值=凸透镜(汇聚), 负值=凹透镜(发散), Infinity=平板',
                placeholder: 'f>0凸, f<0凹'
            };
        }

        const thickLensProps = {};
        if (this.isThickLens) {
            thickLensProps.thickness = {
                value: this.thickness.toFixed(1),
                label: '厚度 (d)',
                type: 'number',
                min: 1,
                step: 1,
                title: '透镜中心厚度'
            };
            thickLensProps.frontRadius = {
                value: Math.abs(this.frontRadius) === Infinity ? 'Infinity' : this.frontRadius.toFixed(1),
                label: '前表面曲率半径 (R₁)',
                type: 'number',
                step: 10,
                title: '前表面曲率半径 (R₁ > 0: 凸面, R₁ < 0: 凹面, Infinity: 平面)'
            };
            thickLensProps.backRadius = {
                value: Math.abs(this.backRadius) === Infinity ? 'Infinity' : this.backRadius.toFixed(1),
                label: '后表面曲率半径 (R₂)',
                type: 'number',
                step: 10,
                title: '后表面曲率半径 (R₂ > 0: 凸面, R₂ < 0: 凹面, Infinity: 平面)'
            };
            thickLensProps.effectiveFocalLength = {
                value: Math.abs(this.effectiveFocalLength) === Infinity ? '∞' : this.effectiveFocalLength.toFixed(1),
                label: '有效焦距 (f_eff)',
                type: 'text',
                readonly: true,
                title: '根据透镜制造者公式计算的有效焦距'
            };
        }

        const advancedOpticalProps = {
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '基准折射率 (n₀@550nm)', type: 'number', min: 1.0, step: 0.01, title: '在 550nm 波长下的折射率' },
            dispersionCoeffB: { value: this.dispersionCoeffB.toFixed(0), label: '色散系数 (B)', type: 'number', min: 0, step: 100, title: '柯西色散公式 B 项 (nm²)' },
            quality: { value: this.quality.toFixed(2), label: '透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01, title: '光线通过透镜后的强度比例 (0.1 - 1.0)' },
        };

        return {
            ...baseProps,
            ...geomProps,
            ...lensTypeProps,
            ...coreOpticalProps,
            ...thickLensProps,
            ...advancedOpticalProps
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsGeomUpdate = false;
        let needsOpticalRecalc = false;
        let needsRetraceUpdate = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 10 && Math.abs(d - this.diameter) > 1e-6) {
                    this.diameter = d;
                    needsGeomUpdate = true;
                }
                break;
            case 'lensType':
                if (Object.values(LENS_TYPES).includes(value) && this.lensType !== value) {
                    const wasThick = this.isThickLens;
                    this.lensType = value;
                    if (value !== LENS_TYPES.THIN_LENS && THICK_LENS_PRESETS[value]) {
                        const preset = THICK_LENS_PRESETS[value];
                        this.frontRadius = preset.frontRadius;
                        this.backRadius = preset.backRadius;
                        this.thickness = preset.thickness;
                    }
                    // 从厚透镜切回薄透镜时清理缓存
                    if (wasThick && !this.isThickLens) {
                        this.frontCenter = null;
                        this.backCenter = null;
                        this.effectiveFocalLength = this.focalLength;
                    }
                    needsGeomUpdate = true;
                    needsInspectorRefresh = true;
                }
                break;
            case 'focalLength':
                let f_val;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { f_val = Infinity; }
                else { f_val = parseFloat(value); }
                if (!isNaN(f_val)) {
                    const newF = (f_val === 0) ? Infinity : f_val;
                    if (newF !== this.focalLength) {
                        this.focalLength = newF;
                        if (!this.isThickLens) {
                            this.effectiveFocalLength = newF;
                        }
                        needsGeomUpdate = true;
                        needsRetraceUpdate = true;
                    }
                }
                break;
            case 'thickness':
                const t = parseFloat(value);
                if (!isNaN(t) && t >= 1 && Math.abs(t - this.thickness) > 1e-6) {
                    this.thickness = t;
                    if (this.isThickLens) { needsGeomUpdate = true; needsRetraceUpdate = true; }
                }
                break;
            case 'frontRadius':
                let fr;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { fr = Infinity; }
                else { fr = parseFloat(value); }
                if (!isNaN(fr)) {
                    const newFR = (fr === 0) ? Infinity : fr;
                    if (newFR !== this.frontRadius) {
                        this.frontRadius = newFR;
                        if (this.isThickLens) { needsGeomUpdate = true; needsRetraceUpdate = true; }
                    }
                }
                break;
            case 'backRadius':
                let br;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { br = Infinity; }
                else { br = parseFloat(value); }
                if (!isNaN(br)) {
                    const newBR = (br === 0) ? Infinity : br;
                    if (newBR !== this.backRadius) {
                        this.backRadius = newBR;
                        if (this.isThickLens) { needsGeomUpdate = true; needsRetraceUpdate = true; }
                    }
                }
                break;
            case 'baseRefractiveIndex':
                const n = parseFloat(value);
                if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) {
                    this.baseRefractiveIndex = n;
                    needsOpticalRecalc = true;
                }
                break;
            case 'dispersionCoeffB':
                const b = parseFloat(value);
                if (!isNaN(b) && b >= 0 && Math.abs(b - this.dispersionCoeffB) > 1e-9) {
                    this.dispersionCoeffB = b;
                    needsOpticalRecalc = true;
                }
                break;
            case 'quality':
                const q = parseFloat(value);
                if (!isNaN(q) && q >= 0.1 && q <= 1.0) {
                    this.quality = q;
                    needsRetraceUpdate = true;
                }
                break;
            default:
                return false;
        }

        if (needsOpticalRecalc) {
            try { this._updateCauchyA(); } catch (e) { console.error(`Lens (${this.id}) Cauchy update error:`, e); }
            needsRetraceUpdate = true;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Lens (${this.id}) geom update error:`, e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
            needsInspectorRefresh = true;
        } else if (needsRetraceUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }

        if (needsInspectorRefresh && typeof window !== 'undefined' &&
            window.selectedComponent === this && window.updateInspector) {
            window.updateInspector();
        }

        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ThinLens = ThinLens;
    window.LENS_TYPES = LENS_TYPES;
    window.THICK_LENS_PRESETS = THICK_LENS_PRESETS;
}
