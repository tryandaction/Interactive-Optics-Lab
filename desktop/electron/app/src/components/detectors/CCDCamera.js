/**
 * CCDCamera.js - CCD相机
 * 具有像素阵列的面阵探测器，累积光强到像素
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class CCDCamera extends OpticalComponent {
    static functionDescription = "具有像素阵列的CCD相机探测器。";

    constructor(pos, width = 80, height = 60, angleDeg = 0, pixelCountX = 32, 
                pixelCountY = 24, quantumEfficiency = 0.8) {
        super(pos, angleDeg, "CCD相机");
        this.width = Math.max(20, width);
        this.height = Math.max(20, height);
        this.pixelCountX = Math.max(4, Math.min(128, pixelCountX));
        this.pixelCountY = Math.max(4, Math.min(128, pixelCountY));
        this.quantumEfficiency = Math.max(0.1, Math.min(1.0, quantumEfficiency));
        this.exposureTime = 1.0;
        this.showImage = true;
        
        // Pixel data array
        this.pixelData = [];
        this.maxPixelValue = 0;
        
        this._updateGeometry();
        this.reset();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            pixelCountX: this.pixelCountX,
            pixelCountY: this.pixelCountY,
            quantumEfficiency: this.quantumEfficiency,
            exposureTime: this.exposureTime,
            showImage: this.showImage
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
        this.pixelWidth = this.width / this.pixelCountX;
        this.pixelHeight = this.height / this.pixelCountY;
    }

    reset() {
        this.pixelData = [];
        for (let y = 0; y < this.pixelCountY; y++) {
            this.pixelData[y] = [];
            for (let x = 0; x < this.pixelCountX; x++) {
                this.pixelData[y][x] = { intensity: 0, hitCount: 0 };
            }
        }
        this.maxPixelValue = 0;
    }

    onAngleChanged() { this._updateGeometry(); this.reset(); }
    onPositionChanged() { this.reset(); }

    /**
     * Get total accumulated intensity
     */
    getTotalIntensity() {
        let total = 0;
        for (let y = 0; y < this.pixelCountY; y++) {
            for (let x = 0; x < this.pixelCountX; x++) {
                total += this.pixelData[y][x].intensity;
            }
        }
        return total;
    }

    /**
     * Get image data as normalized 2D array
     */
    getImage() {
        if (this.maxPixelValue <= 0) return null;
        const image = [];
        for (let y = 0; y < this.pixelCountY; y++) {
            image[y] = [];
            for (let x = 0; x < this.pixelCountX; x++) {
                image[y][x] = this.pixelData[y][x].intensity / this.maxPixelValue;
            }
        }
        return image;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw camera body
        ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#666666';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfWidth - 5, -halfHeight - 5, this.width + 10, this.height + 10);
        ctx.fill();
        ctx.stroke();

        // Draw sensor area
        ctx.fillStyle = 'rgba(20, 20, 30, 1)';
        ctx.fillRect(-halfWidth, -halfHeight, this.width, this.height);

        // Draw pixel image if enabled and has data
        if (this.showImage && this.maxPixelValue > 0) {
            for (let y = 0; y < this.pixelCountY; y++) {
                for (let x = 0; x < this.pixelCountX; x++) {
                    const pixel = this.pixelData[y][x];
                    if (pixel.intensity > 0) {
                        const normalizedValue = pixel.intensity / this.maxPixelValue;
                        const brightness = Math.round(Math.sqrt(normalizedValue) * 255);
                        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
                        
                        const px = -halfWidth + x * this.pixelWidth;
                        const py = -halfHeight + y * this.pixelHeight;
                        ctx.fillRect(px, py, this.pixelWidth, this.pixelHeight);
                    }
                }
            }
        }

        // Draw grid lines (sparse)
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 0.5;
        const gridStep = Math.max(1, Math.floor(this.pixelCountX / 8));
        for (let x = 0; x <= this.pixelCountX; x += gridStep) {
            const px = -halfWidth + x * this.pixelWidth;
            ctx.beginPath();
            ctx.moveTo(px, -halfHeight);
            ctx.lineTo(px, halfHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= this.pixelCountY; y += gridStep) {
            const py = -halfHeight + y * this.pixelHeight;
            ctx.beginPath();
            ctx.moveTo(-halfWidth, py);
            ctx.lineTo(halfWidth, py);
            ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CCD', 0, halfHeight + 15);
        ctx.font = '7px Arial';
        ctx.fillText(`${this.pixelCountX}×${this.pixelCountY}`, 0, halfHeight + 23);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 15;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const w = (this.width + 10) * cosA + (this.height + 10) * sinA;
        const h = (this.width + 10) * sinA + (this.height + 10) * cosA;
        return {
            x: this.pos.x - w / 2 - buffer,
            y: this.pos.y - h / 2 - buffer,
            width: w + 2 * buffer,
            height: h + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point) return false;
        const local = point.subtract(this.pos);
        const x = local.dot(this.axisDirection);
        const y = local.dot(this.perpDirection);
        return Math.abs(x) <= this.width / 2 + 10 && Math.abs(y) <= this.height / 2 + 10;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with sensor plane
        const denom = rayDirection.dot(this.perpDirection);
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = this.pos.subtract(rayOrigin).dot(this.perpDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const localHit = hitPoint.subtract(this.pos);
        const x = localHit.dot(this.axisDirection);
        const y = localHit.dot(this.perpDirection);
        
        // Check if within sensor bounds
        if (Math.abs(x) > this.width / 2 || Math.abs(y) > this.height / 2) return [];
        
        let normal = this.perpDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'sensor',
            localX: x,
            localY: y
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const localX = intersectionInfo.localX;
        const localY = intersectionInfo.localY;
        
        // Convert to pixel coordinates
        const pixelX = Math.floor((localX + this.width / 2) / this.pixelWidth);
        const pixelY = Math.floor((localY + this.height / 2) / this.pixelHeight);
        
        // Clamp to valid range
        const validX = Math.max(0, Math.min(this.pixelCountX - 1, pixelX));
        const validY = Math.max(0, Math.min(this.pixelCountY - 1, pixelY));
        
        // Accumulate intensity with quantum efficiency
        const effectiveIntensity = ray.intensity * this.quantumEfficiency * this.exposureTime;
        this.pixelData[validY][validX].intensity += effectiveIntensity;
        this.pixelData[validY][validX].hitCount += 1;
        
        // Update max value
        if (this.pixelData[validY][validX].intensity > this.maxPixelValue) {
            this.maxPixelValue = this.pixelData[validY][validX].intensity;
        }
        
        ray.terminate('absorbed_ccd');
        return [];
    }

    getProperties() {
        const totalIntensity = this.getTotalIntensity();
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 5 },
            pixelCountX: { value: this.pixelCountX, label: '水平像素数', type: 'number', min: 4, max: 128, step: 4 },
            pixelCountY: { value: this.pixelCountY, label: '垂直像素数', type: 'number', min: 4, max: 128, step: 4 },
            quantumEfficiency: { 
                value: this.quantumEfficiency.toFixed(2), 
                label: '量子效率', 
                type: 'number', 
                min: 0.1, 
                max: 1.0, 
                step: 0.05 
            },
            exposureTime: { value: this.exposureTime.toFixed(2), label: '曝光时间', type: 'number', min: 0.1, step: 0.1 },
            showImage: { value: this.showImage, label: '显示图像', type: 'checkbox' },
            totalIntensity: { 
                value: totalIntensity.toFixed(4), 
                label: '总累积强度', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsReset = false;
        let needsRetrace = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsReset = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsReset = true; }
                break;
            case 'pixelCountX':
                const px = parseInt(value);
                if (!isNaN(px) && px >= 4 && px <= 128) { this.pixelCountX = px; needsReset = true; }
                break;
            case 'pixelCountY':
                const py = parseInt(value);
                if (!isNaN(py) && py >= 4 && py <= 128) { this.pixelCountY = py; needsReset = true; }
                break;
            case 'quantumEfficiency':
                const qe = parseFloat(value);
                if (!isNaN(qe)) { this.quantumEfficiency = Math.max(0.1, Math.min(1.0, qe)); needsRetrace = true; }
                break;
            case 'exposureTime':
                const et = parseFloat(value);
                if (!isNaN(et) && et >= 0.1) { this.exposureTime = et; needsRetrace = true; }
                break;
            case 'showImage':
                this.showImage = !!value;
                break;
            default:
                return false;
        }

        if (needsReset) {
            this._updateGeometry();
            this.reset();
        }
        if (needsReset || needsRetrace) {
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.CCDCamera = CCDCamera;
}
