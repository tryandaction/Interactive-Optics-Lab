/**
 * SphericalMirror.js - 球面镜
 * 具有球面曲率的反射镜，聚焦或发散光线
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class SphericalMirror extends OpticalComponent {
    static functionDescription = "具有球面曲率的反射镜，聚焦或发散光线。";

    constructor(pos, radiusOfCurvature = 200, centralAngleDeg = 90, angleDeg = 0) {
        let label = "球面镜";
        if (radiusOfCurvature > 0) label = "凹面镜";
        else if (radiusOfCurvature < 0) label = "凸面镜";
        else label = "平面镜(r=inf)";

        super(pos, angleDeg, label);

        this.radiusOfCurvature = radiusOfCurvature === 0 ? Infinity : radiusOfCurvature;
        this.centralAngleRad = Math.max(1e-6, Math.min(2 * Math.PI, centralAngleDeg * Math.PI / 180));

        // Geometry cache
        this.centerOfCurvature = null;
        this.arcPoint1 = null;
        this.arcPoint2 = null;
        this.isPlane = Math.abs(this.radiusOfCurvature) === Infinity;

        try { this._updateGeometry(); } catch (e) { console.error("Init SphericalMirror geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            radiusOfCurvature: this.radiusOfCurvature,
            centralAngleDeg: this.centralAngleRad * (180 / Math.PI)
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.isPlane = Math.abs(this.radiusOfCurvature) === Infinity;

        if (this.isPlane) this.label = "平面镜(r=inf)";
        else this.label = this.radiusOfCurvature > 0 ? "凹面镜" : "凸面镜";

        const axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);

        if (this.isPlane) {
            const effectiveDiameter = 100;
            const halfLenVec = Vector.fromAngle(this.angleRad).multiply(effectiveDiameter / 2);
            this.arcPoint1 = this.pos.subtract(halfLenVec);
            this.arcPoint2 = this.pos.add(halfLenVec);
            this.centerOfCurvature = null;
        } else {
            this.centerOfCurvature = this.pos.add(axisDirection.multiply(this.radiusOfCurvature));
            const halfAngle = this.centralAngleRad / 2.0;

            const vec1 = axisDirection.rotate(-halfAngle).multiply(-this.radiusOfCurvature);
            const vec2 = axisDirection.rotate(halfAngle).multiply(-this.radiusOfCurvature);

            this.arcPoint1 = this.centerOfCurvature.add(vec1);
            this.arcPoint2 = this.centerOfCurvature.add(vec2);
        }

        if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector) || 
            isNaN(this.arcPoint1.x) || isNaN(this.arcPoint2.x)) {
            console.error(`SphericalMirror (${this.id}): NaN in calculated arc endpoints.`);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`SphericalMirror (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`SphericalMirror (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return;

        ctx.strokeStyle = this.selected ? 'yellow' : 'silver';
        ctx.lineWidth = this.selected ? 3 : 2;

        if (this.isPlane) {
            ctx.beginPath();
            ctx.moveTo(this.arcPoint1.x, this.arcPoint1.y);
            ctx.lineTo(this.arcPoint2.x, this.arcPoint2.y);
            ctx.stroke();
            
            const backNormal = Vector.fromAngle(this.angleRad - Math.PI / 2);
            const backOffset = backNormal.multiply(5);
            ctx.strokeStyle = 'dimgray';
            ctx.lineWidth = 1;
            const effectiveDiameter = this.arcPoint1.distanceTo(this.arcPoint2);
            const numHatches = Math.max(3, Math.floor(effectiveDiameter / 10));
            for (let i = 0; i <= numHatches; i++) {
                const t = i / numHatches;
                const start = Vector.lerp(this.arcPoint1, this.arcPoint2, t);
                const end = start.add(backOffset);
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        } else if (this.centerOfCurvature instanceof Vector) {
            const r = Math.abs(this.radiusOfCurvature);
            const startVec = this.arcPoint1.subtract(this.centerOfCurvature);
            const endVec = this.arcPoint2.subtract(this.centerOfCurvature);
            const startAngle = startVec.angle();
            let endAngle = endVec.angle();

            const sweepAnticlockwise = (this.radiusOfCurvature > 0);

            if (sweepAnticlockwise && endAngle < startAngle) { endAngle += 2 * Math.PI; }
            if (!sweepAnticlockwise && endAngle > startAngle) { endAngle -= 2 * Math.PI; }

            if (Math.abs(this.centralAngleRad - 2 * Math.PI) < 1e-9) {
                ctx.beginPath();
                ctx.arc(this.centerOfCurvature.x, this.centerOfCurvature.y, r, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(this.centerOfCurvature.x, this.centerOfCurvature.y, r, startAngle, endAngle, !sweepAnticlockwise);
                ctx.stroke();
            }

            const backNormal = Vector.fromAngle(this.angleRad - Math.PI / 2);
            const backOffset = backNormal.multiply(5);
            ctx.strokeStyle = 'dimgray';
            ctx.lineWidth = 1;
            const chordLength = this.arcPoint1.distanceTo(this.arcPoint2);
            const numHatches = Math.max(3, Math.floor(chordLength / 10));
            const chordVec = this.arcPoint2.subtract(this.arcPoint1);
            for (let i = 0; i <= numHatches; i++) {
                const t = i / numHatches;
                const approxChordPos = this.arcPoint1.add(chordVec.multiply(t));
                const start = approxChordPos;
                const end = start.add(backOffset);
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
            }
        }
    }

    getBoundingBox() {
        if (this.isPlane || !(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) {
            const effectiveDiameter = 100;
            const halfLenVec = Vector.fromAngle(this.angleRad).multiply(effectiveDiameter / 2);
            const p1_total = this.pos.subtract(halfLenVec);
            const p2_total = this.pos.add(halfLenVec);
            const minX = Math.min(p1_total.x, p2_total.x);
            const maxX = Math.max(p1_total.x, p2_total.x);
            const minY = Math.min(p1_total.y, p2_total.y);
            const maxY = Math.max(p1_total.y, p2_total.y);
            const buffer = 5;
            return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
        }

        let minX = Math.min(this.arcPoint1.x, this.arcPoint2.x);
        let maxX = Math.max(this.arcPoint1.x, this.arcPoint2.x);
        let minY = Math.min(this.arcPoint1.y, this.arcPoint2.y);
        let maxY = Math.max(this.arcPoint1.y, this.arcPoint2.y);

        minX = Math.min(minX, this.pos.x);
        maxX = Math.max(maxX, this.pos.x);
        minY = Math.min(minY, this.pos.y);
        maxY = Math.max(maxY, this.pos.y);

        const buffer = 3;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return false;
        const p1 = this.arcPoint1;
        const p2 = this.arcPoint2;
        const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9 && !this.isPlane) return point.distanceSquaredTo(this.pos) < 25;

        const p1_to_point = point.subtract(p1);
        const p1_to_p2 = p2.subtract(p1);
        const t = lenSq < 1e-9 ? 0.5 : p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));

        const closestPointOnChord = p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPointOnChord) < 100;
    }

    intersect(rayOrigin, rayDirection) {
        if (this.isPlane) {
            if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return [];
            const p1 = this.arcPoint1;
            const p2 = this.arcPoint2;
            const v1 = rayOrigin.subtract(p1);
            const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            if (Math.abs(dot_v2_v3) < 1e-9) { return []; }
            const t1 = v2.cross(v1) / dot_v2_v3;
            const t2 = v1.dot(v3) / dot_v2_v3;
            if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1 + 1e-6) {
                const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                const edgeVec = p2.subtract(p1);
                let surfaceNormal = new Vector(-edgeVec.y, edgeVec.x).normalize();
                if (rayDirection.dot(surfaceNormal) > 1e-9) { surfaceNormal = surfaceNormal.multiply(-1); }
                if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) { return []; }
                return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'plane' }];
            }
            return [];
        } else {
            if (!(this.centerOfCurvature instanceof Vector)) return [];
            const C = this.centerOfCurvature;
            const r = Math.abs(this.radiusOfCurvature);
            const O = rayOrigin;
            const D = rayDirection;
            const OC = O.subtract(C);

            const a = D.dot(D);
            const b = 2.0 * OC.dot(D);
            const c = OC.dot(OC) - r * r;
            const discriminant = b * b - 4.0 * a * c;

            if (discriminant < 1e-9) return [];

            const sqrtDiscriminant = Math.sqrt(discriminant);
            const t_minus = (-b - sqrtDiscriminant) / (2.0 * a);
            const t_plus = (-b + sqrtDiscriminant) / (2.0 * a);

            let validHits = [];
            for (const t of [t_minus, t_plus]) {
                if (t > 1e-6) {
                    const hitPoint = O.add(D.multiply(t));
                    const hitVec = hitPoint.subtract(C);

                    if (Math.abs(hitVec.magnitudeSquared() - r * r) > 1e-3) continue;

                    const hitAngle = Math.atan2(hitVec.y, hitVec.x);
                    const startVec = this.arcPoint1.subtract(C);
                    const endVec = this.arcPoint2.subtract(C);
                    const startAngle = Math.atan2(startVec.y, startVec.x);
                    const endAngle = Math.atan2(endVec.y, endVec.x);

                    const twoPi = 2 * Math.PI;
                    const tolerance = 1e-4;

                    const normalizeAngle = (angle) => (angle % twoPi + twoPi) % twoPi;
                    const normHit = normalizeAngle(hitAngle);
                    let normStart = normalizeAngle(startAngle);
                    let normEnd = normalizeAngle(endAngle);

                    let isBetween = false;
                    if (normStart > normEnd + tolerance) {
                        isBetween = (normHit >= normStart - tolerance || normHit <= normEnd + tolerance);
                    } else {
                        isBetween = (normHit >= normStart - tolerance && normHit <= normEnd + tolerance);
                    }
                    if (Math.abs(this.centralAngleRad - twoPi) < tolerance) isBetween = true;

                    if (isBetween) {
                        let normal = hitPoint.subtract(C).normalize();
                        if (this.radiusOfCurvature > 0) normal = normal.multiply(-1);
                        if (rayDirection.dot(normal) > 1e-9) { normal = normal.multiply(-1); }

                        if (isNaN(hitPoint.x) || isNaN(normal.x)) continue;
                        validHits.push({ distance: t, point: hitPoint, normal: normal, surfaceId: 'arc' });
                    }
                }
            }

            if (validHits.length === 0) return [];
            validHits.sort((a, b) => a.distance - b.distance);
            return [validHits[0]];
        }
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal;

        if (!(hitPoint instanceof Vector) || !(normal instanceof Vector) || 
            isNaN(hitPoint.x) || isNaN(normal.x) || normal.magnitudeSquared() < 0.5) {
            console.error(`SphericalMirror (${this.id}): Invalid geometry for interact.`);
            ray.terminate('internal_error');
            return [];
        }

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        let reflectedDirection = I.subtract(N.multiply(2 * dot_I_N));
        const magSq = reflectedDirection.magnitudeSquared();

        if (magSq < 1e-9) {
            console.warn(`SphericalMirror (${this.id}): Near-zero reflection vector.`);
            reflectedDirection = N.multiply(-1);
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        } else {
            reflectedDirection = reflectedDirection.divide(Math.sqrt(magSq));
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        }

        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.intensity;
        const reflectedPhase = ray.phase + Math.PI;
        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;

        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                if (isNaN(newOrigin.x)) throw new Error("NaN origin");
                reflectedRay = new RayClass(
                    newOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, reflectedPhase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating reflected Ray in SphericalMirror (${this.id}):`, e); }
        }

        ray.terminate('reflected_spherical');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            radiusOfCurvature: {
                value: Math.abs(this.radiusOfCurvature) === Infinity ? 'Infinity' : this.radiusOfCurvature.toFixed(1),
                label: '曲率半径 (R)',
                type: 'number',
                step: 10,
                title: '球面镜的曲率半径 (R > 0: 凹面镜, R < 0: 凸面镜, Infinity: 平面镜)',
                placeholder: 'R>0凹, R<0凸, Infinity'
            },
            centralAngleDeg: {
                value: (this.centralAngleRad * (180 / Math.PI)).toFixed(1),
                label: '弧度角 (°)',
                type: 'number',
                min: 1,
                max: 360,
                step: 1,
                title: '镜面弧线对应的圆心角 (1°-360°)'
            },
            focalLength: {
                value: (Math.abs(this.radiusOfCurvature) === Infinity || Math.abs(this.radiusOfCurvature) < 1e-6) 
                    ? '∞' : (this.radiusOfCurvature / 2.0).toFixed(1),
                label: '焦距 (f=R/2)',
                type: 'text',
                readonly: true,
                title: '球面镜的焦距 (近似值 f=R/2)'
            }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'radiusOfCurvature':
                let r;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { r = Infinity; }
                else { r = parseFloat(value); }
                if (!isNaN(r)) {
                    const newR = (r === 0) ? Infinity : r;
                    if (newR !== this.radiusOfCurvature) {
                        this.radiusOfCurvature = newR;
                        needsGeomUpdate = true;
                    }
                } else { console.warn("Invalid radius of curvature input:", value); }
                break;
            case 'centralAngleDeg':
                const angleDeg = parseFloat(value);
                if (!isNaN(angleDeg)) {
                    const clampedAngleRad = Math.max(1 * Math.PI / 180, Math.min(2 * Math.PI, angleDeg * Math.PI / 180));
                    if (Math.abs(clampedAngleRad - this.centralAngleRad) > 1e-9) {
                        this.centralAngleRad = clampedAngleRad;
                        needsGeomUpdate = true;
                    }
                } else { console.warn("Invalid central angle input:", value); }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating SphericalMirror geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SphericalMirror = SphericalMirror;
}
