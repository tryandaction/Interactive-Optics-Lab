/**
 * Aperture.js - 光阑/狭缝/光栅
 * 限制或分割光束通行，形成衍射与干涉图样
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class Aperture extends OpticalComponent {
    static functionDescription = "限制或分割光束通行，形成衍射与干涉图样。";

    constructor(pos, length = 150, numberOfSlits = 1, slitWidth = 10, slitSeparation = 20, angleDeg = 90) {
        let label = "光阑";
        if (numberOfSlits === 1) label = "单缝";
        else if (numberOfSlits === 2) label = "双缝";
        else if (numberOfSlits > 2) label = `${numberOfSlits}缝光栅`;

        super(pos, angleDeg, label);

        this.length = Math.max(10, length);
        this.numberOfSlits = Math.max(1, numberOfSlits);
        this.slitWidth = Math.max(0.1, slitWidth);
        this.slitSeparation = Math.max(this.slitWidth, slitSeparation);

        this.blockerSegments = [];
        this.openingSegments = [];

        try { this._updateGeometry(); } catch (e) { console.error("Init Aperture Geom Err:", e); }
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            numberOfSlits: this.numberOfSlits,
            slitWidth: this.slitWidth,
            slitSeparation: this.slitSeparation
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.blockerSegments = [];
        this.openingSegments = [];
        const apertureDir = Vector.fromAngle(this.angleRad);
        const firstSlitCenterOffset = - (this.numberOfSlits - 1) * this.slitSeparation / 2;
        const globalLeftEdge = this.pos.subtract(apertureDir.multiply(this.length / 2));
        const globalRightEdge = this.pos.add(apertureDir.multiply(this.length / 2));

        let lastPos = globalLeftEdge;

        for (let i = 0; i < this.numberOfSlits; i++) {
            const slitCenterOffset = firstSlitCenterOffset + i * this.slitSeparation;
            const slitLeftOffset = slitCenterOffset - this.slitWidth / 2;
            const slitRightOffset = slitCenterOffset + this.slitWidth / 2;

            const slitLeftPos = this.pos.add(apertureDir.multiply(slitLeftOffset));
            const slitRightPos = this.pos.add(apertureDir.multiply(slitRightOffset));

            if (slitLeftPos.subtract(lastPos).dot(apertureDir) > 1e-6) {
                this.blockerSegments.push({ p1: lastPos, p2: slitLeftPos });
            }
            this.openingSegments.push({ p1: slitLeftPos, p2: slitRightPos, id: i });

            lastPos = slitRightPos;
        }

        if (globalRightEdge.subtract(lastPos).dot(apertureDir) > 1e-6) {
            this.blockerSegments.push({ p1: lastPos, p2: globalRightEdge });
        }

        let label = "光阑";
        const numOpenings = this.openingSegments.length;
        if (numOpenings === 1) label = "单缝";
        else if (numOpenings === 2) label = "双缝";
        else if (numOpenings > 2) label = `${numOpenings}缝光栅`;
        this.label = label;
    }

    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;

        const checkSegment = (seg, type, id = null) => {
            if (!(seg.p1 instanceof Vector) || !(seg.p2 instanceof Vector)) return;
            const v1 = rayOrigin.subtract(seg.p1);
            const v2 = seg.p2.subtract(seg.p1);
            if (v2.magnitudeSquared() < 1e-9) return;
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            if (Math.abs(dot_v2_v3) < 1e-9) return;
            const t1 = v2.cross(v1) / dot_v2_v3;
            const t2 = v1.dot(v3) / dot_v2_v3;

            if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                if (t1 < closestDist) {
                    closestDist = t1;
                    const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                    const segDir = v2.normalize();
                    let surfaceNormal = new Vector(-segDir.y, segDir.x);
                    if (rayDirection.dot(surfaceNormal) > 1e-9) surfaceNormal = surfaceNormal.multiply(-1);

                    if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) return;
                    closestHit = { distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: type, openingId: id };
                }
            }
        };

        this.blockerSegments.forEach(seg => checkSegment(seg, 'blocker'));
        this.openingSegments.forEach((seg, index) => checkSegment(seg, 'opening', index));

        return closestHit ? [closestHit] : [];
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Aperture AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Aperture PosChange Err:", e); } }

    draw(ctx) {
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#888888';
        ctx.lineWidth = 4;
        ctx.lineCap = 'butt';
        this.blockerSegments.forEach(seg => {
            if (!(seg.p1 instanceof Vector) || !(seg.p2 instanceof Vector)) return;
            if (seg.p1.distanceSquaredTo(seg.p2) > 1e-6) {
                ctx.beginPath();
                ctx.moveTo(seg.p1.x, seg.p1.y);
                ctx.lineTo(seg.p2.x, seg.p2.y);
                ctx.stroke();
            }
        });
        ctx.lineCap = 'round';
    }

    getBoundingBox() {
        if (!(this.pos instanceof Vector)) return super.getBoundingBox();
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        const p1_total = this.pos.subtract(halfLenVec);
        const p2_total = this.pos.add(halfLenVec);
        const minX = Math.min(p1_total.x, p2_total.x);
        const maxX = Math.max(p1_total.x, p2_total.x);
        const minY = Math.min(p1_total.y, p2_total.y);
        const maxY = Math.max(p1_total.y, p2_total.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !(this.pos instanceof Vector)) return false;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        const p1_total = this.pos.subtract(halfLenVec);
        const p2_total = this.pos.add(halfLenVec);

        const lenSq = p1_total.distanceSquaredTo(p2_total);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(p1_total);
        const p1_to_p2 = p2_total.subtract(p1_total);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = p1_total.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25;
    }

    interact(ray, intersectionInfo, RayClass) {
        if (intersectionInfo.surfaceId === 'blocker') {
            ray.terminate('hit_aperture_blocker');
            return [];
        }

        if (intersectionInfo.surfaceId === 'opening') {
            const newBeamDiameter = Math.min(ray.beamDiameter, this.slitWidth);
            const newDirection = ray.direction;
            const newOrigin = intersectionInfo.point.add(newDirection.multiply(1e-6));

            let transmittedRay = null;
            const transmittedIntensity = ray.intensity;

            if (transmittedIntensity >= ray.minIntensityThreshold) {
                try {
                    transmittedRay = new RayClass(
                        newOrigin, newDirection, ray.wavelengthNm, transmittedIntensity, ray.phase,
                        ray.bouncesSoFar + 1,
                        ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                        ray.history.concat([newOrigin.clone()]),
                        newBeamDiameter
                    );
                } catch (e) { console.error(`Error creating transmitted Ray in Aperture (${this.id}):`, e); }
            }

            ray.terminate('pass_aperture_opening');
            return transmittedRay ? [transmittedRay] : [];
        }

        console.warn(`Aperture (${this.id}): Unknown surfaceId in interact: ${intersectionInfo.surfaceId}`);
        ray.terminate('internal_error');
        return [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        const isGrating = this.numberOfSlits > 2;
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '总宽度', type: 'number', min: 1, step: 1, title: '整个光阑/光栅结构的总宽度' },
            numberOfSlits: { value: this.numberOfSlits, label: isGrating ? '# 狭缝 (光栅)' : '# 狭缝', type: 'number', min: 1, max: 100, step: 1, title: '开口(狭缝)的数量 (>=1)' },
            slitWidth: { value: this.slitWidth.toFixed(2), label: '缝宽 (a)', type: 'number', min: 0.01, step: 0.1, title: '每个狭缝的宽度' },
            slitSeparation: { value: this.slitSeparation.toFixed(2), label: '缝间距 (d)', type: 'number', min: 0.01, step: 0.1, title: '相邻狭缝中心之间的距离 (d ≥ a)' }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; }
                break;
            case 'numberOfSlits':
                const n = parseInt(value);
                if (!isNaN(n) && n >= 1 && n !== this.numberOfSlits) { this.numberOfSlits = n; needsGeomUpdate = true; }
                break;
            case 'slitWidth':
                const w = parseFloat(value);
                if (!isNaN(w) && w > 0 && Math.abs(w - this.slitWidth) > 1e-6) { this.slitWidth = w; needsGeomUpdate = true; }
                break;
            case 'slitSeparation':
                const s = parseFloat(value);
                if (!isNaN(s) && s > 0 && Math.abs(s - this.slitSeparation) > 1e-6) { this.slitSeparation = Math.max(this.slitWidth, s); needsGeomUpdate = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Aperture geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Aperture = Aperture;
}
