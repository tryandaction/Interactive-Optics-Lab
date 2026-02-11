/**
 * FaradayRotator.js - 法拉第旋光器
 * 利用法拉第效应旋转偏振方向，旋转角与传播方向无关
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';
import { N_AIR } from '../../core/constants.js';

export class FaradayRotator extends OpticalComponent {
    static functionDescription = "利用法拉第效应旋转偏振方向，旋转角与传播方向无关。";

    constructor(pos, width = 40, height = 25, angleDeg = 0, rotationAngleDeg = 45.0) {
        super(pos, angleDeg, "法拉第旋光器");
        this.width = Math.max(20, width);
        this.height = Math.max(10, height);
        this.rotationAngleRad = rotationAngleDeg * (Math.PI / 180);

        this.worldVertices = [];
        this.worldNormals = [];

        try { this._updateGeometry(); } catch (e) { console.error("Init FaradayRotator geom error:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            rotationAngleDeg: this.rotationAngleRad * (180 / Math.PI)
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));

        this.worldNormals = [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 4];
            const edgeVec = p2.subtract(p1);
            this.worldNormals.push(new Vector(edgeVec.y, -edgeVec.x).normalize());
        }
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.save();
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#FF69B4';
        ctx.fillStyle = this.selected ? 'rgba(255, 105, 180, 0.3)' : 'rgba(255, 105, 180, 0.15)';
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) { ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const center = this.pos;
        const radius = Math.min(this.width, this.height) * 0.3;
        ctx.strokeStyle = this.selected ? 'yellow' : 'white';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, Math.PI * 1.2, Math.PI * 0.2);
        ctx.stroke();
        
        const arrowAngle = Math.PI * 0.2;
        const endPoint = center.add(Vector.fromAngle(arrowAngle).multiply(radius));
        const normDir = Vector.fromAngle(arrowAngle + Math.PI/2);
        const arrowSize = 4;
        const v1 = normDir.rotate(Math.PI + Math.PI / 6).multiply(arrowSize);
        const v2 = normDir.rotate(Math.PI - Math.PI / 6).multiply(arrowSize);
        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x + v1.x, endPoint.y + v1.y);
        ctx.lineTo(endPoint.x + v2.x, endPoint.y + v2.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    getBoundingBox() {
        if (!this.worldVertices || this.worldVertices.length !== 4) return super.getBoundingBox();
        const xs = this.worldVertices.map(v => v.x);
        const ys = this.worldVertices.map(v => v.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        return { x: minX - 2, y: minY - 2, width: maxX - minX + 4, height: maxY - minY + 4 };
    }

    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4) return [];

        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 4];
            const v1 = rayOrigin.subtract(p1);
            const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);

            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3;
                const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    if (t1 < closestDist) {
                        closestDist = t1;
                        const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        let interactionNormal = this.worldNormals[i].clone();
                        if (rayDirection.dot(interactionNormal) > 0) {
                            interactionNormal = interactionNormal.multiply(-1);
                        }
                        closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: i };
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }
    
    interact(ray, intersectionInfo, RayClass) {
        const outwardNormal = this.worldNormals[intersectionInfo.surfaceId];
        const isEntering = ray.direction.dot(outwardNormal) < -1e-9;
        const newRays = [];

        if (isEntering) {
            const transmittedRay = new RayClass(
                intersectionInfo.point.add(ray.direction.multiply(1e-6)),
                ray.direction, ray.wavelengthNm, ray.intensity, ray.phase,
                ray.bouncesSoFar + 1, 1.5,
                ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                ray.history.concat([intersectionInfo.point.clone()])
            );
            transmittedRay.jones = ray.jones;
            newRays.push(transmittedRay);
        } else {
            ray.ensureJonesVector();
            
            let outRay = new RayClass(
                intersectionInfo.point.add(ray.direction.multiply(1e-6)),
                ray.direction, ray.wavelengthNm, ray.intensity, ray.phase,
                ray.bouncesSoFar + 1, N_AIR,
                ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                ray.history.concat([intersectionInfo.point.clone()])
            );
            
            if (ray.hasJones()) {
                const theta = this.rotationAngleRad;
                const R = Ray._rot2(theta);
                const v_out = Ray._apply2x2(R, ray.jones);
                outRay.setJones(v_out);
            }
            newRays.push(outRay);
        }
        
        ray.terminate('pass_rotator_surface');
        return newRays;
    }
    
    _containsPointBody(point) {
        if (!point) return false;
        const p_local = point.subtract(this.pos).rotate(-this.angleRad);
        return Math.abs(p_local.x) <= this.width / 2 && Math.abs(p_local.y) <= this.height / 2;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            rotationAngleDeg: { value: (this.rotationAngleRad * 180 / Math.PI).toFixed(1), label: '旋转角度 (°)', type: 'number', step: 1 },
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 10, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;
        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;
        switch (propName) {
            case 'rotationAngleDeg':
                const angle = parseFloat(value);
                if (!isNaN(angle)) {
                    this.rotationAngleRad = angle * (Math.PI / 180);
                    needsRetraceUpdate = true;
                }
                break;
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 10) { this.height = h; needsGeomUpdate = true; }
                break;
            default:
                return false;
        }
        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsRetraceUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.FaradayRotator = FaradayRotator;
}
