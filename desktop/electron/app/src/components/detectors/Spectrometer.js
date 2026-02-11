/**
 * Spectrometer.js - 光谱仪
 * 记录入射光的波长-强度分布并显示光谱曲线
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class Spectrometer extends OpticalComponent {
    static functionDescription = "记录入射光波长-强度分布的光谱仪。";

    constructor(pos, width = 80, height = 50, angleDeg = 0, wavelengthMin = 380, 
                wavelengthMax = 750, resolution = 1) {
        super(pos, angleDeg, "光谱仪");
        this.width = Math.max(40, width);
        this.height = Math.max(30, height);
        this.wavelengthMin = Math.max(200, wavelengthMin);
        this.wavelengthMax = Math.min(1000, wavelengthMax);
        this.resolution = Math.max(0.1, Math.min(10, resolution)); // nm
        this.showSpectrum = true;
        
        // Spectrum data: wavelength -> intensity
        this.spectrumData = {};
        this.maxIntensity = 0;
        this.totalHits = 0;
        
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            wavelengthMin: this.wavelengthMin,
            wavelengthMax: this.wavelengthMax,
            resolution: this.resolution,
            showSpectrum: this.showSpectrum
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    reset() {
        this.spectrumData = {};
        this.maxIntensity = 0;
        this.totalHits = 0;
    }

    onAngleChanged() { this._updateGeometry(); this.reset(); }
    onPositionChanged() { this.reset(); }

    /**
     * Get wavelength bin for a given wavelength
     */
    getWavelengthBin(wavelengthNm) {
        return Math.round(wavelengthNm / this.resolution) * this.resolution;
    }

    /**
     * Get spectrum as sorted array of {wavelength, intensity}
     */
    getSpectrumArray() {
        const result = [];
        for (const [wl, intensity] of Object.entries(this.spectrumData)) {
            result.push({ wavelength: parseFloat(wl), intensity });
        }
        return result.sort((a, b) => a.wavelength - b.wavelength);
    }

    /**
     * Convert wavelength to RGB color for display
     */
    wavelengthToColor(wavelengthNm) {
        let r = 0, g = 0, b = 0;
        
        if (wavelengthNm >= 380 && wavelengthNm < 440) {
            r = -(wavelengthNm - 440) / (440 - 380);
            b = 1.0;
        } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
            g = (wavelengthNm - 440) / (490 - 440);
            b = 1.0;
        } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
            g = 1.0;
            b = -(wavelengthNm - 510) / (510 - 490);
        } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
            r = (wavelengthNm - 510) / (580 - 510);
            g = 1.0;
        } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
            r = 1.0;
            g = -(wavelengthNm - 645) / (645 - 580);
        } else if (wavelengthNm >= 645 && wavelengthNm <= 750) {
            r = 1.0;
        }
        
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw spectrometer body
        ctx.fillStyle = 'rgba(30, 30, 40, 0.9)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#555555';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw spectrum display area
        const displayMargin = 5;
        const displayWidth = this.width - 2 * displayMargin;
        const displayHeight = this.height - 2 * displayMargin - 10;
        const displayX = -halfWidth + displayMargin;
        const displayY = -halfHeight + displayMargin;

        ctx.fillStyle = 'rgba(10, 10, 15, 1)';
        ctx.fillRect(displayX, displayY, displayWidth, displayHeight);

        // Draw spectrum if enabled and has data
        if (this.showSpectrum && this.maxIntensity > 0) {
            const spectrum = this.getSpectrumArray();
            const wlRange = this.wavelengthMax - this.wavelengthMin;
            
            for (const point of spectrum) {
                if (point.wavelength < this.wavelengthMin || point.wavelength > this.wavelengthMax) continue;
                
                const x = displayX + ((point.wavelength - this.wavelengthMin) / wlRange) * displayWidth;
                const normalizedIntensity = point.intensity / this.maxIntensity;
                const barHeight = normalizedIntensity * displayHeight;
                
                ctx.fillStyle = this.wavelengthToColor(point.wavelength);
                ctx.fillRect(x - 1, displayY + displayHeight - barHeight, 2, barHeight);
            }
        }

        // Draw wavelength scale
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '6px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.wavelengthMin}`, displayX, halfHeight - 2);
        ctx.fillText(`${this.wavelengthMax}nm`, displayX + displayWidth, halfHeight - 2);

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('光谱仪', 0, halfHeight + 12);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 15;
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const w = this.width * cosA + this.height * sinA;
        const h = this.width * sinA + this.height * cosA;
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
        return Math.abs(x) <= this.width / 2 + 5 && Math.abs(y) <= this.height / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        // Intersect with entrance slit (front face)
        const entryCenter = this.pos.subtract(this.perpDirection.multiply(this.height / 2));
        const denom = rayDirection.dot(this.perpDirection);
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = entryCenter.subtract(rayOrigin).dot(this.perpDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const localHit = hitPoint.subtract(this.pos);
        const x = localHit.dot(this.axisDirection);
        
        if (Math.abs(x) > this.width / 2) return [];
        
        let normal = this.perpDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'entrance'
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        // Record wavelength and intensity
        const wavelengthBin = this.getWavelengthBin(ray.wavelengthNm);
        
        if (!this.spectrumData[wavelengthBin]) {
            this.spectrumData[wavelengthBin] = 0;
        }
        this.spectrumData[wavelengthBin] += ray.intensity;
        this.totalHits += 1;
        
        // Update max intensity
        if (this.spectrumData[wavelengthBin] > this.maxIntensity) {
            this.maxIntensity = this.spectrumData[wavelengthBin];
        }
        
        ray.terminate('absorbed_spectrometer');
        return [];
    }

    getProperties() {
        const spectrum = this.getSpectrumArray();
        const peakWavelength = spectrum.length > 0 
            ? spectrum.reduce((a, b) => a.intensity > b.intensity ? a : b).wavelength 
            : 0;
        
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 40, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 30, step: 5 },
            wavelengthMin: { value: this.wavelengthMin.toFixed(0), label: '最小波长 (nm)', type: 'number', min: 200, max: 900, step: 10 },
            wavelengthMax: { value: this.wavelengthMax.toFixed(0), label: '最大波长 (nm)', type: 'number', min: 300, max: 1000, step: 10 },
            resolution: { value: this.resolution.toFixed(1), label: '分辨率 (nm)', type: 'number', min: 0.1, max: 10, step: 0.1 },
            showSpectrum: { value: this.showSpectrum, label: '显示光谱', type: 'checkbox' },
            totalHits: { value: this.totalHits, label: '总命中数', type: 'text', readonly: true },
            peakWavelength: { 
                value: peakWavelength > 0 ? peakWavelength.toFixed(1) + ' nm' : '-', 
                label: '峰值波长', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsReset = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 40) { this.width = w; needsReset = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 30) { this.height = h; needsReset = true; }
                break;
            case 'wavelengthMin':
                const wlMin = parseFloat(value);
                if (!isNaN(wlMin) && wlMin >= 200 && wlMin < this.wavelengthMax) { 
                    this.wavelengthMin = wlMin; 
                }
                break;
            case 'wavelengthMax':
                const wlMax = parseFloat(value);
                if (!isNaN(wlMax) && wlMax <= 1000 && wlMax > this.wavelengthMin) { 
                    this.wavelengthMax = wlMax; 
                }
                break;
            case 'resolution':
                const res = parseFloat(value);
                if (!isNaN(res)) { this.resolution = Math.max(0.1, Math.min(10, res)); needsReset = true; }
                break;
            case 'showSpectrum':
                this.showSpectrum = !!value;
                break;
            default:
                return false;
        }

        if (needsReset) {
            this._updateGeometry();
            this.reset();
            if (typeof window !== 'undefined') window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.Spectrometer = Spectrometer;
}
