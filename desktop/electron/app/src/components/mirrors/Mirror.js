/**
 * Mirror.js - 平面镜
 * 依据反射定律反射入射光线，改变光路方向
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class Mirror extends OpticalComponent {
    static functionDescription = "依据反射定律反射入射光线，改变光路方向。";

    constructor(pos, length = 100, angleDeg = 0) {
        super(pos, angleDeg, "反射镜");
        this.length = Math.max(1, length);
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);
        try { this._updateGeometry(); } catch (e) { console.error("Init Mirror Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        // Normal is perpendicular to the segment p1->p2
        const edgeVec = this.p2.subtract(this.p1);
        this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize();
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Mirror AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Mirror PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = 'silver';
        ctx.lineWidth = this.selected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();

        // Draw hatching on the back side
        const backOffset = this.normal.multiply(-5);
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const numHatches = Math.max(3, Math.floor(this.length / 10));
        for (let i = 0; i <= numHatches; i++) {
            const t = i / numHatches;
            const start = Vector.lerp(this.p1, this.p2, t);
            const end = start.add(backOffset);
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x);
        const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y);
        const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(this.p1);
        const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);

        const dot_v2_v3 = v2.dot(v3);
        if (Math.abs(dot_v2_v3) < 1e-9) { return []; }

        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;

        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.normal.clone();
            if (rayDirection.dot(surfaceNormal) > 0) {
                surfaceNormal = surfaceNormal.multiply(-1);
            }
            return [{
                distance: t1,
                point: intersectionPoint,
                normal: surfaceNormal,
                surfaceId: 'front'
            }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal;

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();

        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.ignoreDecay ? ray.intensity : ray.intensity * 0.99;
        const reflectedPhase = ray.phase + Math.PI;
        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;

        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                reflectedRay = new RayClass(
                    newOrigin,
                    reflectedDirection,
                    ray.wavelengthNm,
                    reflectedIntensity,
                    reflectedPhase,
                    nextBounces,
                    ray.mediumRefractiveIndex,
                    ray.sourceId,
                    ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating reflected Ray in Mirror (${this.id}):`, e); }
        }

        ray.terminate('reflected');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 1, step: 1, title: '平面反射镜的长度' }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l;
                    needsGeomUpdate = true;
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Mirror geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Mirror = Mirror;
}
