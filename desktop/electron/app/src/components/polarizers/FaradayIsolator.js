/**
 * FaradayIsolator.js - 光隔离器
 * 利用法拉第效应实现光的单向传输，保护光源
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';
import { N_AIR } from '../../core/constants.js';

export class FaradayIsolator extends OpticalComponent {
    static functionDescription = "利用法拉第效应实现光的单向传输，保护光源。";

    constructor(pos, width = 80, height = 30, angleDeg = 0) {
        super(pos, angleDeg, "光隔离器");
        this.width = Math.max(40, width);
        this.height = Math.max(20, height);

        this.worldVertices = [];
        this.worldNormals = [];
        this.forwardDirection = Vector.fromAngle(this.angleRad);
        try { this._updateGeometry(); } catch (e) { console.error("Init FaradayIsolator geom error:", e); }
    }

    toJSON() {
        return { ...super.toJSON(), width: this.width, height: this.height };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        
        this.forwardDirection = Vector.fromAngle(this.angleRad);
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
        
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#8A2BE2';
        ctx.fillStyle = this.selected ? 'rgba(138, 43, 226, 0.2)' : 'rgba(138, 43, 226, 0.1)';
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) { ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);
        const halfH = this.height / 2;
        const halfW = this.width / 2;
        const polWidth = this.width * 0.15;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;

        const inPolX = -halfW + polWidth / 2;
        ctx.beginPath();
        ctx.moveTo(inPolX, -halfH * 0.8);
        ctx.lineTo(inPolX, halfH * 0.8);
        ctx.moveTo(inPolX - 4, 0);
        ctx.lineTo(inPolX + 4, 0);
        ctx.stroke();
        
        const outPolX = halfW - polWidth / 2;
        ctx.beginPath();
        ctx.moveTo(outPolX, -halfH * 0.8);
        ctx.lineTo(outPolX, halfH * 0.8);
        ctx.stroke();
        const pol_len = 4;
        ctx.beginPath();
        ctx.moveTo(outPolX - pol_len, -pol_len);
        ctx.lineTo(outPolX + pol_len, pol_len);
        ctx.stroke();

        ctx.restore();

        ctx.save();
        const arrowLength = this.width * 0.6;
        const arrowSize = 8;
        const startPoint = this.pos.subtract(this.forwardDirection.multiply(arrowLength / 2));
        const endPoint = this.pos.add(this.forwardDirection.multiply(arrowLength / 2));
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        const normDir = this.forwardDirection;
        const angle = Math.PI / 6;
        const v1 = normDir.rotate(Math.PI + angle).multiply(arrowSize);
        const v2 = normDir.rotate(Math.PI - angle).multiply(arrowSize);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
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
        const isForward = ray.direction.dot(this.forwardDirection) > 0;

        ray.ensureJonesVector();
        let currentJones = ray.jones;
        let currentIntensity = ray.intensity;

        const pol0_axis = this.angleRad;
        const rot_angle = Math.PI / 4;
        const pol45_axis = this.angleRad + Math.PI / 4;

        const c0 = Math.cos(pol0_axis), s0 = Math.sin(pol0_axis);
        const P0 = [[{re:c0*c0, im:0}, {re:c0*s0, im:0}], [{re:c0*s0, im:0}, {re:s0*s0, im:0}]];
        
        const c45 = Math.cos(pol45_axis), s45 = Math.sin(pol45_axis);
        const P45 = [[{re:c45*c45, im:0}, {re:c45*s45, im:0}], [{re:c45*s45, im:0}, {re:s45*s45, im:0}]];

        const R45 = Ray._rot2(rot_angle);

        if (isEntering) {
            if (isForward) {
                if (!ray.hasJones()) { currentIntensity /= 2; currentJones = Ray.jonesLinear(pol0_axis); }
                else { currentJones = Ray._apply2x2(P0, currentJones); }
                currentJones = Ray._apply2x2(R45, currentJones);
            } else {
                if (!ray.hasJones()) { currentIntensity /= 2; currentJones = Ray.jonesLinear(pol45_axis); }
                else { currentJones = Ray._apply2x2(P45, currentJones); }
            }
        } else {
            if (isForward) {
                if (ray.hasJones()) { currentJones = Ray._apply2x2(P45, ray.jones); }
            } else {
                if (ray.hasJones()) {
                    currentJones = Ray._apply2x2(R45, ray.jones);
                    currentJones = Ray._apply2x2(P0, currentJones);
                }
            }
        }

        const inIntensityJones = ray.hasJones() ? ray.jonesIntensity() : 1.0;
        const outIntensityJones = (currentJones) ? Ray._cAbs2(currentJones.Ex) + Ray._cAbs2(currentJones.Ey) : 0;
        const scale = inIntensityJones > 1e-12 ? (outIntensityJones / inIntensityJones) : 0;
        const finalIntensity = currentIntensity * scale;

        if (finalIntensity < ray.minIntensityThreshold) {
            ray.terminate('blocked_isolator');
            return [];
        }

        const mediumIndex = isEntering ? 1.5 : N_AIR;
        const newOrigin = intersectionInfo.point.add(ray.direction.multiply(1e-6));
        const outRay = new RayClass(
            newOrigin, ray.direction, ray.wavelengthNm, finalIntensity, ray.phase,
            ray.bouncesSoFar + 1, mediumIndex, ray.sourceId,
            ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
        );
        if (currentJones) outRay.setJones(currentJones);

        ray.terminate('pass_isolator_surface');
        return [outRay];
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
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 40, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;
        let needsGeomUpdate = false;
        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 40) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsGeomUpdate = true; }
                break;
            default:
                return false;
        }
        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.FaradayIsolator = FaradayIsolator;
}
