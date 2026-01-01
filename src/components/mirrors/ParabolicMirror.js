/**
 * ParabolicMirror.js - 抛物面镜
 * 抛物面反射镜将平行光聚焦至焦点或反之
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class ParabolicMirror extends OpticalComponent {
    static functionDescription = "抛物面反射镜将平行光聚焦至焦点或反之。";

    constructor(pos, focalLength = 100, diameter = 100, angleDeg = 0) {
        super(pos, angleDeg, focalLength > 0 ? "抛物面凹镜" : "抛物面凸镜?");
        if (focalLength <= 0) {
            console.warn("ParabolicMirror currently only supports positive focal lengths (concave).");
            focalLength = 100;
            this.label = "抛物面凹镜";
        }

        this.focalLength = focalLength;
        this.diameter = Math.max(10, diameter);

        // Geometry Cache
        this.vertex = this.pos.clone();
        this.focus = null;
        this.p1 = null;
        this.p2 = null;
        this.axisDirection = null;
        this.localXAxis = null;
        this.localYAxis = null;

        try { this._updateGeometry(); } catch (e) { console.error("Init ParabolicMirror geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            focalLength: this.focalLength,
            diameter: this.diameter
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector) || this.focalLength <= 0) return;

        this.vertex = this.pos.clone();
        this.localXAxis = Vector.fromAngle(this.angleRad);
        this.localYAxis = new Vector(-this.localXAxis.y, this.localXAxis.x);

        this.focus = this.vertex.subtract(this.localXAxis.multiply(this.focalLength));
        this.axisDirection = this.localXAxis;

        const y_local = this.diameter / 2.0;
        const x_local = (y_local * y_local) / (4.0 * this.focalLength);

        const localP1 = new Vector(x_local, -y_local);
        const localP2 = new Vector(x_local, y_local);

        this.p1 = this.vertex.add(this.localXAxis.multiply(localP1.x)).add(this.localYAxis.multiply(localP1.y));
        this.p2 = this.vertex.add(this.localXAxis.multiply(localP2.x)).add(this.localYAxis.multiply(localP2.y));

        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector) || 
            isNaN(this.p1.x) || isNaN(this.p2.x)) {
            console.error(`ParabolicMirror (${this.id}): NaN in calculated endpoints.`);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`ParabolicMirror (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`ParabolicMirror (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.vertex || !this.p1 || !this.p2) return;

        ctx.strokeStyle = this.selected ? 'yellow' : '#FFC080';
        ctx.lineWidth = this.selected ? 3 : 2;

        const numSegments = 20;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            const y_local = -this.diameter / 2.0 + t * this.diameter;
            const x_local = (y_local * y_local) / (4.0 * this.focalLength);
            const worldPoint = this.vertex.add(this.localXAxis.multiply(x_local)).add(this.localYAxis.multiply(y_local));
            ctx.lineTo(worldPoint.x, worldPoint.y);
        }
        ctx.stroke();

        const backNormal = this.localXAxis.multiply(-1);
        const backOffset = backNormal.multiply(5);
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const numHatches = Math.max(3, Math.floor(this.diameter / 10));
        const chordVec = this.p2.subtract(this.p1);
        for (let i = 0; i <= numHatches; i++) {
            const t = i / numHatches;
            const approxPos = this.p1.add(chordVec.multiply(t));
            const start = approxPos;
            const end = start.add(backOffset);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }

        if (this.focus && this.selected) {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.focus.x, this.focus.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    getBoundingBox() {
        if (!this.vertex || !this.p1 || !this.p2) return super.getBoundingBox();

        let minX = Math.min(this.vertex.x, this.p1.x, this.p2.x);
        let maxX = Math.max(this.vertex.x, this.p1.x, this.p2.x);
        let minY = Math.min(this.vertex.y, this.p1.y, this.p2.y);
        let maxY = Math.max(this.vertex.y, this.p1.y, this.p2.y);

        const buffer = 3;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !this.p1 || !this.p2) return false;
        const p1 = this.p1;
        const p2 = this.p2;
        const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.vertex) < 25;

        const p1_to_point = point.subtract(p1);
        const p1_to_p2 = p2.subtract(p1);
        const t = lenSq < 1e-9 ? 0.5 : p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));

        const closestPointOnChord = p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPointOnChord) < 150;
    }

    intersect(rayOrigin, rayDirection) {
        if (!this.vertex || !this.localXAxis || !this.localYAxis || this.focalLength <= 0) return [];

        const O = rayOrigin;
        const D = rayDirection;
        const V = this.vertex;
        const f = this.focalLength;
        const ax = this.localXAxis;
        const ay = this.localYAxis;

        const O_local_vec = O.subtract(V);
        const O_local_x = O_local_vec.dot(ax);
        const O_local_y = O_local_vec.dot(ay);
        const D_local_x = D.dot(ax);
        const D_local_y = D.dot(ay);

        const A = D_local_y * D_local_y;
        const B = 2.0 * O_local_y * D_local_y - 4.0 * f * D_local_x;
        const C = O_local_y * O_local_y - 4.0 * f * O_local_x;

        const discriminant = B * B - 4.0 * A * C;

        if (discriminant < 1e-9) return [];

        const sqrtDiscriminant = Math.sqrt(discriminant);

        if (Math.abs(A) < 1e-9) {
            if (Math.abs(B) < 1e-9) return [];
            const t = -C / B;
            if (t < 1e-6) return [];
            const hit_local_y = O_local_y + t * D_local_y;
            if (Math.abs(hit_local_y) > this.diameter / 2.0 + 1e-6) return [];

            const hitPoint = O.add(D.multiply(t));
            const grad_local = new Vector(-4.0 * f, 2.0 * hit_local_y);
            let normal_local = grad_local.normalize();
            let normal = ax.multiply(normal_local.x).add(ay.multiply(normal_local.y));
            if (D.dot(normal) > 1e-9) { normal = normal.multiply(-1); }
            if (isNaN(hitPoint.x) || isNaN(normal.x)) return [];

            return [{ distance: t, point: hitPoint, normal: normal, surfaceId: 'parabola' }];
        } else {
            const t_minus = (-B - sqrtDiscriminant) / (2.0 * A);
            const t_plus = (-B + sqrtDiscriminant) / (2.0 * A);

            let validHits = [];
            for (const t of [t_minus, t_plus]) {
                if (t > 1e-6) {
                    const hit_local_y = O_local_y + t * D_local_y;
                    if (Math.abs(hit_local_y) <= this.diameter / 2.0 + 1e-6) {
                        const hitPoint = O.add(D.multiply(t));

                        const grad_local = new Vector(-4.0 * f, 2.0 * hit_local_y);
                        let normal_local = grad_local.normalize();
                        if (normal_local.magnitudeSquared() < 0.5) continue;

                        let normal = ax.multiply(normal_local.x).add(ay.multiply(normal_local.y));

                        if (normal.dot(this.localXAxis) > 0) {
                            normal = normal.multiply(-1);
                        }

                        if (D.dot(normal) > 1e-9) { normal = normal.multiply(-1); }

                        if (isNaN(hitPoint.x) || isNaN(normal.x) || normal.magnitudeSquared() < 0.5) {
                            console.error(`ParabolicMirror (${this.id}): NaN normal or hitpoint. t=${t}`);
                            continue;
                        }
                        validHits.push({ distance: t, point: hitPoint, normal: normal, surfaceId: 'parabola' });
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
            console.error(`ParabolicMirror (${this.id}): Invalid geometry for interact.`);
            ray.terminate('internal_error');
            return [];
        }

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        let reflectedDirection = I.subtract(N.multiply(2 * dot_I_N));
        const magSq = reflectedDirection.magnitudeSquared();

        if (magSq < 1e-9) {
            console.warn(`ParabolicMirror (${this.id}): Near-zero reflection vector.`);
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
            } catch (e) { console.error(`Error creating reflected Ray in ParabolicMirror (${this.id}):`, e); }
        }

        ray.terminate('reflected_parabolic');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            focalLength: { value: this.focalLength.toFixed(1), label: '焦距 (f)', type: 'number', min: 1, step: 1 },
            diameter: { value: this.diameter.toFixed(1), label: '孔径(直径)', type: 'number', min: 10, step: 1 }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'focalLength':
                const f = parseFloat(value);
                if (!isNaN(f) && f > 0 && Math.abs(f - this.focalLength) > 1e-6) {
                    this.focalLength = f;
                    needsGeomUpdate = true;
                } else if (f <= 0) { console.warn("ParabolicMirror focal length must be positive."); }
                break;
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 10 && Math.abs(d - this.diameter) > 1e-6) {
                    this.diameter = d;
                    needsGeomUpdate = true;
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating ParabolicMirror geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ParabolicMirror = ParabolicMirror;
}
