/**
 * OpticalFiber.js - 光纤
 * 模拟光纤耦合与传输损耗，限制入射角与数值孔径
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { N_AIR } from '../../core/constants.js';

export class OpticalFiber extends OpticalComponent {
    static functionDescription = "模拟光纤耦合与传输损耗，限制入射角与数值孔径。";

    constructor(pos, initialOutputPos, angleDeg = 0, outputAngleDeg = 0, numericalAperture = 0.22, coreDiameter = 9, fiberIntrinsicEfficiency = 1.0, transmissionLossDbPerKm = 0.0, facetLength = 15) {
        super(pos, angleDeg, "光纤");

        this.outputPos = initialOutputPos instanceof Vector ? initialOutputPos.clone() : new Vector(pos.x + 100, pos.y);
        this.outputAngleRad = outputAngleDeg * Math.PI / 180;

        this.coreDiameter = Math.max(1, coreDiameter);
        this.numericalAperture = Math.max(0.01, Math.min(1.0, numericalAperture));
        this.fiberIntrinsicEfficiency = Math.max(0, Math.min(1, fiberIntrinsicEfficiency));
        this.transmissionLossDbPerKm = Math.max(0, transmissionLossDbPerKm);
        this.facetLength = Math.max(5, facetLength);

        this.fiberLength = 0;
        this.acceptanceAngleRad = Math.asin(this.numericalAperture / N_AIR);
        this.inputFacetP1 = null;
        this.inputFacetP2 = null;
        this.inputFacetNormal = null;
        this.outputFacetP1 = null;
        this.outputFacetP2 = null;
        this.outputFacetNormal = null;

        this.outputRaysPending = [];
        this.lastCalculatedCouplingFactor = 0.0;
        this.hitCount = 0;

        this.draggingOutput = false;
        this.draggingOutputAngle = false;
        this.outputAngleDragStartAngle = 0;
        this.outputAngleDragStartMouseAngle = 0;

        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            outputX: this.outputPos.x,
            outputY: this.outputPos.y,
            outputAngleDeg: this.outputAngleRad * (180 / Math.PI),
            numericalAperture: this.numericalAperture,
            coreDiameter: this.coreDiameter,
            fiberIntrinsicEfficiency: this.fiberIntrinsicEfficiency,
            transmissionLossDbPerKm: this.transmissionLossDbPerKm,
            facetLength: this.facetLength
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector) || !(this.outputPos instanceof Vector)) return;

        const fiberVec = this.outputPos.subtract(this.pos);
        this.fiberLength = fiberVec.magnitude();

        this.inputFacetNormal = Vector.fromAngle(this.angleRad);
        const inputFacetDir = this.inputFacetNormal.rotate(Math.PI / 2);
        const inputHalfFacetVec = inputFacetDir.multiply(this.facetLength / 2);
        this.inputFacetP1 = this.pos.subtract(inputHalfFacetVec);
        this.inputFacetP2 = this.pos.add(inputHalfFacetVec);

        this.outputFacetNormal = Vector.fromAngle(this.outputAngleRad);
        const outputFacetDir = this.outputFacetNormal.rotate(Math.PI / 2);
        const outputHalfFacetVec = outputFacetDir.multiply(this.facetLength / 2);
        this.outputFacetP1 = this.outputPos.subtract(outputHalfFacetVec);
        this.outputFacetP2 = this.outputPos.add(outputHalfFacetVec);

        this.acceptanceAngleRad = Math.asin(this.numericalAperture / N_AIR);
        this.reset();
    }

    onPositionChanged() { this._updateGeometry(); }
    onAngleChanged() { this._updateGeometry(); }

    reset() {
        this.outputRaysPending = [];
        this.lastCalculatedCouplingFactor = 0.0;
        this.hitCount = 0;
    }

    _getOutputAngleHandlePos() {
        if (!this.outputPos || !this.outputFacetNormal) return null;
        const offset = 30;
        return this.outputPos.add(this.outputFacetNormal.multiply(offset));
    }

    _isPointOnOutputAngleHandle(point) {
        const handlePos = this._getOutputAngleHandlePos();
        if (!handlePos || !point) return false;
        const handleRadius = 6;
        const clickRadius = handleRadius + 10;
        return point.distanceSquaredTo(handlePos) <= clickRadius * clickRadius;
    }

    draw(ctx) {
        if (!this.pos || !this.outputPos) return;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#5588AA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.outputPos.x, this.outputPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (this.inputFacetP1 && this.inputFacetP2) {
            ctx.strokeStyle = this.selected ? '#00FF00' : '#88AAFF';
            ctx.lineWidth = this.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(this.inputFacetP1.x, this.inputFacetP1.y);
            ctx.lineTo(this.inputFacetP2.x, this.inputFacetP2.y);
            ctx.stroke();
        }

        if (this.outputFacetP1 && this.outputFacetP2) {
            ctx.strokeStyle = this.selected ? '#00FFFF' : '#88AAFF';
            ctx.lineWidth = this.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(this.outputFacetP1.x, this.outputFacetP1.y);
            ctx.lineTo(this.outputFacetP2.x, this.outputFacetP2.y);
            ctx.stroke();
        }

        const handleRadius = 6;

        ctx.fillStyle = this.selected && this.dragging ? '#FF0000' : (this.selected ? '#FFFF00' : '#888888');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, handleRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.selected && this.draggingOutput ? '#FF0000' : (this.selected ? '#FFFF00' : '#888888');
        ctx.beginPath();
        ctx.arc(this.outputPos.x, this.outputPos.y, handleRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    drawSelection(ctx) {
        super.drawSelection(ctx);

        if (this.selected) {
            const outputHandlePos = this._getOutputAngleHandlePos();
            if (outputHandlePos) {
                const radius = 6;

                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.outputPos.x, this.outputPos.y);
                ctx.lineTo(outputHandlePos.x, outputHandlePos.y);
                ctx.stroke();

                ctx.fillStyle = this.draggingOutputAngle ? '#FF0000' : '#FFFF00';
                ctx.strokeStyle = '#000000';
                ctx.beginPath();
                ctx.arc(outputHandlePos.x, outputHandlePos.y, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(outputHandlePos.x, outputHandlePos.y, radius * 1.5, 0, Math.PI * 1.5);
                ctx.stroke();

                const arrowSize = radius * 0.8;
                const arrowAngle = Math.PI * 1.5;
                const arrowX = outputHandlePos.x + radius * 1.5 * Math.cos(arrowAngle);
                const arrowY = outputHandlePos.y + radius * 1.5 * Math.sin(arrowAngle);

                ctx.beginPath();
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX + arrowSize * Math.cos(arrowAngle - Math.PI * 0.85), arrowY + arrowSize * Math.sin(arrowAngle - Math.PI * 0.85));
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX + arrowSize * Math.cos(arrowAngle + Math.PI * 0.85), arrowY + arrowSize * Math.sin(arrowAngle + Math.PI * 0.85));
                ctx.stroke();
            }
        }
    }

    containsPoint(point) {
        if (!point) return false;

        if (this.selected) {
            if (this._isPointOnOutputAngleHandle(point)) return true;
            if (super.isPointOnAngleHandle(point)) return true;
        }

        const handleRadius = 8;
        if (this.pos && point.distanceSquaredTo(this.pos) <= handleRadius * handleRadius) return true;
        if (this.outputPos && point.distanceSquaredTo(this.outputPos) <= handleRadius * handleRadius) return true;

        if (this.pos && this.outputPos) {
            const p1 = this.pos;
            const p2 = this.outputPos;
            const p1p2 = p2.subtract(p1);
            const lenSq = p1p2.magnitudeSquared();

            if (lenSq > 1e-9) {
                const p1pt = point.subtract(p1);
                const t = p1pt.dot(p1p2) / lenSq;
                const cT = Math.max(0, Math.min(1, t));
                const closest = p1.add(p1p2.multiply(cT));
                return point.distanceSquaredTo(closest) <= 25;
            }
        }

        return false;
    }

    startDrag(mousePos) {
        if (!mousePos) return;

        this.draggingOutput = false;
        this.draggingOutputAngle = false;

        if (this.selected && this._isPointOnOutputAngleHandle(mousePos)) {
            this.draggingOutputAngle = true;
            const vec = mousePos.subtract(this.outputPos);
            this.outputAngleDragStartMouseAngle = vec.angle();
            this.outputAngleDragStartAngle = this.outputAngleRad;
            return;
        }

        if (this.selected && super.isPointOnAngleHandle(mousePos)) {
            super.startDrag(mousePos);
            return;
        }

        const handleRadius = 8;
        if (this.outputPos && mousePos.distanceSquaredTo(this.outputPos) <= handleRadius * handleRadius) {
            this.draggingOutput = true;
            this.dragOffset = this.outputPos.subtract(mousePos);
            return;
        }

        if (this.pos && mousePos.distanceSquaredTo(this.pos) <= handleRadius * handleRadius) {
            super.startDrag(mousePos);
            return;
        }

        if (this.containsPoint(mousePos)) {
            super.startDrag(mousePos);
        }
    }

    drag(mousePos) {
        if (!mousePos) return;

        if (this.draggingOutputAngle) {
            const vec = mousePos.subtract(this.outputPos);
            const currentMouseAngle = vec.angle();
            let angleDelta = currentMouseAngle - this.outputAngleDragStartMouseAngle;

            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

            this.outputAngleRad = this.outputAngleDragStartAngle + angleDelta;
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        } else if (this.draggingOutput) {
            this.outputPos = mousePos.add(this.dragOffset);
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        } else {
            super.drag(mousePos);
        }
    }

    endDrag() {
        this.draggingOutput = false;
        this.draggingOutputAngle = false;
        super.endDrag();
    }

    checkInputCoupling(rayOrigin, rayDirection) {
        if (!this.inputFacetP1 || !this.inputFacetP2 || !this.inputFacetNormal) return null;

        const p1 = this.inputFacetP1;
        const p2 = this.inputFacetP2;
        const N = this.inputFacetNormal;

        const D_dot_N = rayDirection.dot(N);
        if (D_dot_N >= -1e-9) return null;

        const tPlane = p1.subtract(rayOrigin).dot(N) / D_dot_N;
        if (tPlane < 1e-6) return null;

        const hitPoint = rayOrigin.add(rayDirection.multiply(tPlane));

        const facetVec = p2.subtract(p1);
        const facetLenSq = facetVec.magnitudeSquared();
        const tSegment = hitPoint.subtract(p1).dot(facetVec) / facetLenSq;
        if (tSegment < -1e-6 || tSegment > 1.0 + 1e-6) return null;

        const coreRadiusSq = (this.coreDiameter / 2.0) ** 2;
        const distSqFromCenter = hitPoint.distanceSquaredTo(this.pos);
        if (distSqFromCenter > coreRadiusSq + 1e-6) return null;

        const cosThetaFacet = rayDirection.multiply(-1).dot(N);
        const minCosFacet = Math.cos(this.acceptanceAngleRad);

        if (cosThetaFacet < minCosFacet - 1e-6) {
            this.lastCalculatedCouplingFactor = 0.0;
            return null;
        }

        const angleFactor = (minCosFacet < 1.0 - 1e-9)
            ? Math.max(0, Math.min(1, (cosThetaFacet - minCosFacet) / (1.0 - minCosFacet)))
            : 1.0;

        const coreRadius = this.coreDiameter / 2.0;
        const positionFactor = coreRadius < 1e-6
            ? 1.0
            : Math.max(0, 1.0 - (Math.sqrt(distSqFromCenter) / coreRadius));

        const couplingFactor = Math.max(0, Math.min(1, angleFactor * positionFactor));
        this.lastCalculatedCouplingFactor = couplingFactor;

        return {
            distance: tPlane,
            point: hitPoint,
            normal: N.multiply(-1.0),
            surfaceId: 'input_facet',
            couplingFactor: couplingFactor
        };
    }

    handleInputInteraction(ray, hitInfo, RayClass) {
        if (!hitInfo || typeof hitInfo.couplingFactor !== 'number') {
            ray.terminate('invalid_coupling');
            return [];
        }

        const dynamicCouplingEfficiency = this.fiberIntrinsicEfficiency * hitInfo.couplingFactor;
        const coupledIntensity = ray.intensity * dynamicCouplingEfficiency;

        if (coupledIntensity < ray.minIntensityThreshold && !ray.ignoreDecay) {
            ray.terminate('too_dim_fiber');
            return [];
        }

        let transmissionFactor = 1.0;
        if (this.transmissionLossDbPerKm > 1e-9 && this.fiberLength > 1e-6) {
            const PIXELS_PER_KM = 1e6;
            const lengthKm = this.fiberLength / PIXELS_PER_KM;
            const lossDb = this.transmissionLossDbPerKm * lengthKm;
            transmissionFactor = Math.pow(10, -lossDb / 10.0);
        }

        const outputIntensity = coupledIntensity * transmissionFactor;

        if (outputIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            this.outputRaysPending.push({
                wavelengthNm: ray.wavelengthNm,
                intensity: outputIntensity,
                phase: ray.phase,
                sourceId: ray.sourceId,
                polarizationAngle: ray.polarizationAngle,
                ignoreDecay: ray.ignoreDecay
            });
        }

        ray.terminate('coupled_fiber');
        this.hitCount++;

        return [];
    }

    generateOutputRays(RayClass) {
        const outputRays = [];

        if (this.outputRaysPending.length === 0 || !this.outputPos || !this.outputFacetNormal) {
            return outputRays;
        }

        const outputDirection = this.outputFacetNormal.clone();

        this.outputRaysPending.forEach(pendingRay => {
            const origin = this.outputPos.add(outputDirection.multiply(1e-6));

            try {
                const newRay = new RayClass(
                    origin,
                    outputDirection,
                    pendingRay.wavelengthNm,
                    pendingRay.intensity,
                    pendingRay.phase,
                    1,
                    N_AIR,
                    pendingRay.sourceId,
                    pendingRay.polarizationAngle,
                    pendingRay.ignoreDecay,
                    [origin.clone()]
                );

                outputRays.push(newRay);
            } catch (e) {
                console.error(`光纤 (${this.id}) 创建输出光线错误:`, e);
            }
        });

        this.outputRaysPending = [];

        return outputRays;
    }

    getProperties() {
        return {
            posX: { value: this.pos.x, label: '输入 X', type: 'number', step: 1 },
            posY: { value: this.pos.y, label: '输入 Y', type: 'number', step: 1 },
            angleDeg: { value: this.angleRad * 180 / Math.PI, label: '输入角度(°)', type: 'number', step: 1 },
            outputX: { value: this.outputPos.x, label: '输出 X', type: 'number', step: 1 },
            outputY: { value: this.outputPos.y, label: '输出 Y', type: 'number', step: 1 },
            outputAngleDeg: { value: this.outputAngleRad * 180 / Math.PI, label: '输出角度(°)', type: 'number', step: 1 },
            fiberLength: { value: this.fiberLength, label: '长度 (px)', type: 'text', readonly: true },
            currentCoupling: { value: this.lastCalculatedCouplingFactor, label: '耦合因子', type: 'text', readonly: true },
            numericalAperture: { value: this.numericalAperture, label: '数值孔径(NA)', type: 'number', min: 0.01, max: 1.0, step: 0.01 },
            acceptanceAngle: { value: this.acceptanceAngleRad * 180 / Math.PI, label: '接受角(°)', type: 'text', readonly: true },
            fiberIntrinsicEfficiency: { value: this.fiberIntrinsicEfficiency, label: '固有效率', type: 'number', min: 0, max: 1, step: 0.05 },
            transmissionLossDbPerKm: { value: this.transmissionLossDbPerKm, label: '损耗 (dB/km)', type: 'number', min: 0, step: 0.1 },
            coreDiameter: { value: this.coreDiameter, label: '纤芯直径 (px)', type: 'number', min: 1, step: 1 },
            facetLength: { value: this.facetLength, label: '端面长度 (px)', type: 'number', min: 5, step: 1 },
            hitCount: { value: this.hitCount, label: '命中次数', type: 'text', readonly: true }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;

        switch (propName) {
            case 'outputX':
                const ox = parseFloat(value);
                if (!isNaN(ox) && this.outputPos) { this.outputPos.x = ox; needsGeomUpdate = true; }
                break;
            case 'outputY':
                const oy = parseFloat(value);
                if (!isNaN(oy) && this.outputPos) { this.outputPos.y = oy; needsGeomUpdate = true; }
                break;
            case 'outputAngleDeg':
                const oa = parseFloat(value);
                if (!isNaN(oa)) { this.outputAngleRad = oa * Math.PI / 180; needsGeomUpdate = true; }
                break;
            case 'numericalAperture':
                const na = parseFloat(value);
                if (!isNaN(na) && na > 0 && na <= 1.0) { this.numericalAperture = na; needsGeomUpdate = true; }
                break;
            case 'fiberIntrinsicEfficiency':
                const fie = parseFloat(value);
                if (!isNaN(fie) && fie >= 0 && fie <= 1.0) { this.fiberIntrinsicEfficiency = fie; needsRetraceUpdate = true; }
                break;
            case 'transmissionLossDbPerKm':
                const tl = parseFloat(value);
                if (!isNaN(tl) && tl >= 0) { this.transmissionLossDbPerKm = tl; needsRetraceUpdate = true; }
                break;
            case 'coreDiameter':
                const cd = parseFloat(value);
                if (!isNaN(cd) && cd >= 1) { this.coreDiameter = cd; needsGeomUpdate = true; }
                break;
            case 'facetLength':
                const fl = parseFloat(value);
                if (!isNaN(fl) && fl >= 5) { this.facetLength = fl; needsGeomUpdate = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        } else if (needsRetraceUpdate) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }

        return true;
    }

    getBoundingBox() {
        if (!this.pos || !this.outputPos) return { x: 0, y: 0, width: 0, height: 0 };

        const minX = Math.min(this.pos.x, this.outputPos.x);
        const minY = Math.min(this.pos.y, this.outputPos.y);
        const maxX = Math.max(this.pos.x, this.outputPos.x);
        const maxY = Math.max(this.pos.y, this.outputPos.y);

        const buffer = Math.max(this.facetLength / 2, 10);

        return {
            x: minX - buffer,
            y: minY - buffer,
            width: maxX - minX + 2 * buffer,
            height: maxY - minY + 2 * buffer
        };
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.OpticalFiber = OpticalFiber;
}
