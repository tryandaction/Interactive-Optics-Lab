/**
 * Screen.js - 屏幕
 * 接收并显示光线命中位置与强度分布
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class Screen extends OpticalComponent {
    static functionDescription = "接收并显示光线命中位置与强度分布。";

    constructor(pos, length = 150, angleDeg = 0, numBins = 200) {
        super(pos, angleDeg, "屏幕");
        this.length = Math.max(10, length);
        this.numBins = Math.max(1, numBins);
        this.showPattern = true;

        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.screenDir = Vector.fromAngle(angleDeg);
        this.binWidth = 0;

        this.binData = [];
        this.maxIntensity = 0;

        try { this._updateGeometry(); } catch (e) { console.error("Init Screen Geom Err:", e); }
        this.reset();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            length: this.length,
            numBins: this.numBins,
            showPattern: this.showPattern
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.screenDir = this.p2.subtract(this.p1).normalize();
        this.binWidth = this.numBins > 0 ? this.length / this.numBins : 0;
        this.reset();
    }

    reset() {
        this.binData = Array(this.numBins).fill(null).map(() => ({
            real: 0.0, imag: 0.0,
            intensitySum: 0.0,
            hitCount: 0
        }));
        this.maxIntensity = 0;
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Screen AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Screen PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#DDDDDD';
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (this.showPattern) {
            this.drawIntensityPattern(ctx);
        }
    }

    drawIntensityPattern(ctx) {
        if (!this.binData || this.binData.length !== this.numBins || this.maxIntensity <= 1e-9 || this.binWidth <= 0) {
            return;
        }

        const patternHeight = 30;
        const patternNormal = new Vector(-this.screenDir.y, this.screenDir.x);
        const baseOffset = patternNormal.multiply(3);

        const dpr = window.devicePixelRatio || 1;
        const cameraScale = window.cameraScale || 1;
        let barWidthPixels = this.binWidth * cameraScale;
        const minVisualWidth = 0.5;
        const maxVisualWidth = this.binWidth * 2;
        barWidthPixels = Math.max(minVisualWidth, Math.min(maxVisualWidth, barWidthPixels));

        ctx.lineWidth = barWidthPixels / dpr;
        ctx.lineCap = 'butt';

        for (let i = 0; i < this.numBins; i++) {
            const bin = this.binData[i];
            if (!bin || bin.hitCount === 0) continue;

            const coherentIntensity = bin.real * bin.real + bin.imag * bin.imag;
            if (isNaN(coherentIntensity) || coherentIntensity < 1e-12) continue;

            const normalizedIntensity = Math.min(1.0, coherentIntensity / this.maxIntensity);
            if (normalizedIntensity <= 0) continue;

            const t = (i + 0.5) / this.numBins;
            const binCenterPos = Vector.lerp(this.p1, this.p2, t);
            if (!binCenterPos || isNaN(binCenterPos.x)) continue;

            const barStart = binCenterPos.add(baseOffset);
            const barVector = patternNormal.multiply(normalizedIntensity * patternHeight);
            const barEnd = barStart.add(barVector);

            if (!barStart || !barEnd || isNaN(barStart.x) || isNaN(barEnd.x)) continue;

            const brightnessFactor = Math.sqrt(normalizedIntensity);
            const brightness = Math.min(255, Math.max(0, Math.round(brightnessFactor * 255)));
            ctx.strokeStyle = `rgb(${brightness},${brightness},${brightness})`;

            ctx.beginPath();
            ctx.moveTo(barStart.x, barStart.y);
            ctx.lineTo(barEnd.x, barEnd.y);
            ctx.stroke();
        }
        ctx.lineCap = 'round';
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x), maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y), maxY = Math.max(this.p1.y, this.p2.y);
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
        if (Math.abs(dot_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / dot_v2_v3;
        const t2 = v1.dot(v3) / dot_v2_v3;

        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.screenDir.rotate(Math.PI / 2);
            if (rayDirection.dot(surfaceNormal) > 0) surfaceNormal = surfaceNormal.multiply(-1);
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'front' }];
        }
        return [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        if (!this.p1 || !this.screenDir || this.length <= 1e-9 || !this.binData) {
            ray.terminate('screen_geom_invalid');
            return [];
        }

        const hitVector = hitPoint.subtract(this.p1);
        const distAlongScreen = hitVector.dot(this.screenDir);
        const t = distAlongScreen / this.length;

        const binIndex = Math.floor(t * this.numBins);
        const validBinIndex = Math.max(0, Math.min(this.numBins - 1, binIndex));

        const complexAmp = ray.getComplexAmplitude();

        if (validBinIndex >= 0 && validBinIndex < this.binData.length) {
            const bin = this.binData[validBinIndex];

            const rayReal = complexAmp.amplitude * Math.cos(complexAmp.phase);
            const rayImag = complexAmp.amplitude * Math.sin(complexAmp.phase);

            if (!isNaN(rayReal) && !isNaN(rayImag)) {
                bin.real += rayReal;
                bin.imag += rayImag;
            }

            bin.intensitySum += ray.intensity;
            bin.hitCount += 1;

            const currentBinCoherentIntensity = bin.real * bin.real + bin.imag * bin.imag;
            if (!isNaN(currentBinCoherentIntensity) && currentBinCoherentIntensity > this.maxIntensity) {
                this.maxIntensity = currentBinCoherentIntensity;
            }
        }

        return [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 10, step: 1, title: '屏幕的长度' },
            numBins: { value: this.numBins, label: '像素单元数', type: 'number', min: 1, max: 1000, step: 1, title: '用于计算强度分布的分格数量' },
            showPattern: { value: this.showPattern, label: '显示强度图样', type: 'checkbox', title: '是否在屏幕旁边绘制计算出的光强分布图' }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
            return true;
        }

        let needsGeomUpdate = false;

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l;
                    needsGeomUpdate = true;
                }
                break;
            case 'numBins':
                const b = parseInt(value);
                if (!isNaN(b) && b >= 1 && b !== this.numBins) {
                    this.numBins = b;
                    needsGeomUpdate = true;
                }
                break;
            case 'showPattern':
                const s = !!value;
                if (this.showPattern !== s) {
                    this.showPattern = s;
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Screen geometry:", e); }
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Screen = Screen;
}
