/**
 * BeamSplitter.js - 分束器
 * 分光器将入射光分为两路，可为非偏振或偏振型
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class BeamSplitter extends OpticalComponent {
    static functionDescription = "分光器将入射光分为两路，可为非偏振或偏振型。";

    constructor(pos, length = 80, angleDeg = 45, type = 'BS', splitRatio = 0.5, pbsUnpolarizedReflectivity = 0.5) {
        const effectiveLength = (type === 'PBS') ? length / Math.sqrt(2) : length;
        const initialLabel = type === 'PBS' ? "偏振分束器" : "分束器";
        super(pos, angleDeg, initialLabel);

        this.length = Math.max(20, effectiveLength);
        this.type = type === 'PBS' ? 'PBS' : 'BS';
        this.splitRatio = Math.max(0, Math.min(1, splitRatio));
        this.pbsUnpolarizedReflectivity = Math.max(0, Math.min(1, pbsUnpolarizedReflectivity));

        this.worldVertices = [];
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        try { this._updateGeometry(); } catch (e) { console.error("Init BeamSplitter Geom Err:", e); }
    }

    toJSON() {
        const lengthToSave = this.type === 'PBS' ? this.length * Math.sqrt(2) : this.length;
        return {
            ...super.toJSON(),
            length: lengthToSave,
            splitterType: this.type,
            splitRatio: this.splitRatio,
            pbsUnpolarizedReflectivity: this.pbsUnpolarizedReflectivity
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.label = this.type === 'PBS' ? "偏振分束器" : "分束器";

        if (this.type === 'PBS') {
            const halfSize = this.length / 2.0;
            const localVertices = [
                new Vector(-halfSize, -halfSize), new Vector(halfSize, -halfSize),
                new Vector(halfSize, halfSize), new Vector(-halfSize, halfSize)
            ];
            this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));

            const p1_local = new Vector(-halfSize, halfSize);
            const p2_local = new Vector(halfSize, -halfSize);
            this.p1 = p1_local.rotate(this.angleRad).add(this.pos);
            this.p2 = p2_local.rotate(this.angleRad).add(this.pos);
            
            const edgeVec = this.p2.subtract(this.p1);
            this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize();
        } else {
            const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
            this.p1 = this.pos.subtract(halfLenVec);
            this.p2 = this.pos.add(halfLenVec);
            const edgeVec = this.p2.subtract(this.p1);
            this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize();
        }
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (this.type === 'PBS') {
            if (!this.worldVertices || this.worldVertices.length !== 4) return;
            ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.9)' : 'rgba(100, 200, 255, 0.7)';
            ctx.fillStyle = this.selected ? 'rgba(100, 200, 255, 0.3)' : 'rgba(100, 200, 255, 0.15)';
            ctx.lineWidth = this.selected ? 2 : 1.5;
            ctx.beginPath();
            ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
            for (let i = 1; i < 4; i++) { ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y); }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (this.p1 && this.p2) {
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(this.p1.x, this.p1.y);
                ctx.lineTo(this.p2.x, this.p2.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        } else {
            if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
            ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.9)' : 'rgba(100, 200, 255, 0.7)';
            ctx.lineWidth = this.selected ? 3 : 2;
            ctx.beginPath();
            ctx.moveTo(this.p1.x, this.p1.y);
            ctx.lineTo(this.p2.x, this.p2.y);
            ctx.stroke();
        }
    }

    getBoundingBox() {
        if (this.type === 'PBS' && this.worldVertices && this.worldVertices.length === 4) {
            const xs = this.worldVertices.map(v => v.x);
            const ys = this.worldVertices.map(v => v.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            return { x: minX - 2, y: minY - 2, width: maxX - minX + 4, height: maxY - minY + 4 };
        }
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x), maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y), maxY = Math.max(this.p1.y, this.p2.y);
        return { x: minX - 5, y: minY - 5, width: maxX - minX + 10, height: maxY - minY + 10 };
    }
    
    _containsPointBody(point) {
        if (!point) return false;
        if (this.type === 'PBS') {
            const p_local = point.subtract(this.pos).rotate(-this.angleRad);
            const halfSize = this.length / 2.0;
            return Math.abs(p_local.x) <= halfSize && Math.abs(p_local.y) <= halfSize;
        } else {
            if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
            const lenSq = this.p1.distanceSquaredTo(this.p2);
            if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
            const p1pt = point.subtract(this.p1);
            const p1p2 = this.p2.subtract(this.p1);
            const t = p1pt.dot(p1p2) / lenSq;
            const cT = Math.max(0, Math.min(1, t));
            const closest = this.p1.add(p1p2.multiply(cT));
            return point.distanceSquaredTo(closest) < 25;
        }
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1);
        const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3);
        if (Math.abs(dot_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;
        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.normal.clone();
            if (rayDirection.dot(surfaceNormal) > 0) {
                surfaceNormal = surfaceNormal.multiply(-1);
            }
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'optical_surface' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        if (this.type === 'BS') {
            return this._interactBS(ray, intersectionInfo, RayClass);
        } else if (this.type === 'PBS') {
            return this._interactPBS(ray, intersectionInfo, RayClass);
        }
        return [];
    }

    _interactBS(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const surfaceNormal = intersectionInfo.normal;
        const newRays = [];
        
        const reflectedIntensity = ray.intensity * this.splitRatio;
        if (reflectedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const reflectedDirection = ray.direction.subtract(surfaceNormal.multiply(2 * ray.direction.dot(surfaceNormal))).normalize();
            const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, null, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
            if(ray.hasJones()) reflectedRay.setJones(ray.jones);
            newRays.push(reflectedRay);
        }
        
        const transmittedIntensity = ray.intensity * (1.0 - this.splitRatio);
        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const transmitOrigin = hitPoint.add(ray.direction.multiply(1e-6));
            const transmittedRay = new RayClass(transmitOrigin, ray.direction, ray.wavelengthNm, transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, null, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
            if(ray.hasJones()) transmittedRay.setJones(ray.jones);
            newRays.push(transmittedRay);
        }
        
        ray.terminate('split_bs');
        return newRays;
    }

    _interactPBS(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const surfaceNormal = intersectionInfo.normal;
        const newRays = [];
        
        ray.ensureJonesVector();
        
        const p_axis_vec = this.p2.subtract(this.p1).normalize();
        const p_axis_angle = p_axis_vec.angle();

        let transmittedJones, reflectedJones;
        let transmittedIntensity, reflectedIntensity;

        if (!ray.hasJones()) {
            transmittedIntensity = ray.intensity * (1.0 - this.pbsUnpolarizedReflectivity);
            reflectedIntensity = ray.intensity * this.pbsUnpolarizedReflectivity;
            transmittedJones = Ray.jonesLinear(p_axis_angle);
            reflectedJones = Ray.jonesLinear(p_axis_angle + Math.PI / 2);
        } else {
            const c = Math.cos(p_axis_angle);
            const s = Math.sin(p_axis_angle);
            const P_transmit = [[{re:c*c, im:0}, {re:c*s, im:0}], [{re:c*s, im:0}, {re:s*s, im:0}]];
            
            const s_axis_angle = p_axis_angle + Math.PI / 2;
            const cs = Math.cos(s_axis_angle);
            const ss = Math.sin(s_axis_angle);
            const P_reflect = [[{re:cs*cs, im:0}, {re:cs*ss, im:0}], [{re:cs*ss, im:0}, {re:ss*ss, im:0}]];
            
            transmittedJones = Ray._apply2x2(P_transmit, ray.jones);
            reflectedJones = Ray._apply2x2(P_reflect, ray.jones);

            const inIntensityJones = ray.jonesIntensity();
            const outIntensityJones_T = Ray._cAbs2(transmittedJones.Ex) + Ray._cAbs2(transmittedJones.Ey);
            const outIntensityJones_R = Ray._cAbs2(reflectedJones.Ex) + Ray._cAbs2(reflectedJones.Ey);
            
            const scale_T = inIntensityJones > 1e-12 ? (outIntensityJones_T / inIntensityJones) : 0;
            const scale_R = inIntensityJones > 1e-12 ? (outIntensityJones_R / inIntensityJones) : 0;

            transmittedIntensity = ray.intensity * scale_T;
            reflectedIntensity = ray.intensity * scale_R;
        }
        
        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const transmitOrigin = hitPoint.add(ray.direction.multiply(1e-6));
            const transmittedRay = new RayClass(transmitOrigin, ray.direction, ray.wavelengthNm, transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, null, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
            transmittedRay.setJones(transmittedJones);
            newRays.push(transmittedRay);
        }

        if (reflectedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const reflectedDirection = ray.direction.subtract(surfaceNormal.multiply(2 * ray.direction.dot(surfaceNormal))).normalize();
            const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, null, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
            reflectedRay.setJones(reflectedJones);
            newRays.push(reflectedRay);
        }

        ray.terminate('split_pbs');
        return newRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        const props = {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: this.type === 'PBS' ? '边长' : '长度', type: 'number', min: 10, step: 1 },
            type: {
                value: this.type,
                label: '类型',
                type: 'select',
                options: [ { value: 'BS', label: '标准分束器 (BS)' }, { value: 'PBS', label: '偏振分束器 (PBS)' } ]
            }
        };
        if (this.type === 'BS') {
            props.splitRatio = { value: this.splitRatio.toString(), label: '反射比(BS %)', type: 'select', options: [ { value: '0.1', label: '10/90' }, { value: '0.2', label: '20/80' }, { value: '0.3', label: '30/70' }, { value: '0.4', label: '40/60' }, { value: '0.5', label: '50/50' }, { value: '0.6', label: '60/40' }, { value: '0.7', label: '70/30' }, { value: '0.8', label: '80/20' }, { value: '0.9', label: '90/10' }, { value: '1.0', label: '100/0 (Mirror)' }, { value: '0.0', label: '0/100 (Window)' } ] };
        } else if (this.type === 'PBS') {
            props.pbsUnpolarizedReflectivity = { value: this.pbsUnpolarizedReflectivity.toString(), label: '非偏振光反射比', type: 'select', options: [ { value: '0.1', label: '10/90' }, { value: '0.2', label: '20/80' }, { value: '0.3', label: '30/70' }, { value: '0.4', label: '40/60' }, { value: '0.5', label: '50/50' } ] };
        }
        return props;
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }
        let needsGeomUpdate = false;
        let needsOpticUpdate = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10) { 
                    const newLength = this.type === 'PBS' ? l / Math.sqrt(2) : l;
                    if (Math.abs(newLength - this.length) > 1e-6) {
                        this.length = newLength; 
                        needsGeomUpdate = true;
                    }
                }
                break;
            case 'type':
                if ((value === 'BS' || value === 'PBS') && this.type !== value) {
                    if (value === 'PBS') {
                        this.length /= Math.sqrt(2);
                    } else {
                        this.length *= Math.sqrt(2);
                    }
                    this.type = value; 
                    needsGeomUpdate = true; 
                    needsOpticUpdate = true; 
                    needsInspectorRefresh = true;
                }
                break;
            case 'splitRatio':
                if (this.type === 'BS') {
                    const r = parseFloat(value);
                    if (!isNaN(r)) {
                        const c = Math.max(0, Math.min(1, r));
                        if (Math.abs(c - this.splitRatio) > 1e-9) {
                            this.splitRatio = c;
                            needsOpticUpdate = true;
                        }
                    }
                }
                break;
            case 'pbsUnpolarizedReflectivity':
                if (this.type === 'PBS') {
                    const r = parseFloat(value);
                    if (!isNaN(r)) {
                        const c = Math.max(0, Math.min(1, r));
                        if (Math.abs(c - this.pbsUnpolarizedReflectivity) > 1e-9) {
                            this.pbsUnpolarizedReflectivity = c;
                            needsOpticUpdate = true;
                        }
                    }
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        if (needsOpticUpdate) {
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
    window.BeamSplitter = BeamSplitter;
}
