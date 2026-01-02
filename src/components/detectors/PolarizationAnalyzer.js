/**
 * PolarizationAnalyzer.js - 偏振分析仪
 * 测量并显示入射光的Stokes参数和偏振态
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class PolarizationAnalyzer extends OpticalComponent {
    static functionDescription = "测量并显示入射光Stokes参数和偏振态的偏振分析仪。";

    constructor(pos, width = 60, height = 50, angleDeg = 0) {
        super(pos, angleDeg, "偏振分析仪");
        this.width = Math.max(40, width);
        this.height = Math.max(40, height);
        
        // Accumulated Stokes parameters
        this.stokesS0 = 0; // Total intensity
        this.stokesS1 = 0; // Horizontal vs Vertical
        this.stokesS2 = 0; // +45° vs -45°
        this.stokesS3 = 0; // Right vs Left circular
        this.hitCount = 0;
        
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    reset() {
        this.stokesS0 = 0;
        this.stokesS1 = 0;
        this.stokesS2 = 0;
        this.stokesS3 = 0;
        this.hitCount = 0;
    }

    onAngleChanged() { this._updateGeometry(); this.reset(); }
    onPositionChanged() { this.reset(); }

    /**
     * Calculate Stokes parameters from Jones vector
     * S0 = |Ex|² + |Ey|²
     * S1 = |Ex|² - |Ey|²
     * S2 = 2*Re(Ex*Ey*)
     * S3 = 2*Im(Ex*Ey*)
     */
    calculateStokes(jones) {
        if (!jones || !jones.Ex || !jones.Ey) {
            return { S0: 0, S1: 0, S2: 0, S3: 0 };
        }
        
        const Ex_mag2 = Ray._cAbs2(jones.Ex);
        const Ey_mag2 = Ray._cAbs2(jones.Ey);
        
        // Ex * Ey* (conjugate of Ey)
        const ExEyConj = {
            re: jones.Ex.re * jones.Ey.re + jones.Ex.im * jones.Ey.im,
            im: jones.Ex.im * jones.Ey.re - jones.Ex.re * jones.Ey.im
        };
        
        return {
            S0: Ex_mag2 + Ey_mag2,
            S1: Ex_mag2 - Ey_mag2,
            S2: 2 * ExEyConj.re,
            S3: 2 * ExEyConj.im
        };
    }

    /**
     * Get degree of polarization
     * DOP = sqrt(S1² + S2² + S3²) / S0
     */
    getDegreeOfPolarization() {
        if (this.stokesS0 <= 0) return 0;
        const polarizedPart = Math.sqrt(
            this.stokesS1 * this.stokesS1 + 
            this.stokesS2 * this.stokesS2 + 
            this.stokesS3 * this.stokesS3
        );
        return Math.min(1, polarizedPart / this.stokesS0);
    }

    /**
     * Get polarization ellipse parameters
     */
    getPolarizationEllipse() {
        if (this.stokesS0 <= 0) return { psi: 0, chi: 0, type: 'unpolarized' };
        
        // Orientation angle (azimuth)
        const psi = 0.5 * Math.atan2(this.stokesS2, this.stokesS1);
        
        // Ellipticity angle
        const dop = this.getDegreeOfPolarization();
        const chi = 0.5 * Math.asin(this.stokesS3 / (this.stokesS0 * dop + 1e-12));
        
        // Determine polarization type
        let type = 'elliptical';
        if (Math.abs(chi) < 0.01) {
            type = 'linear';
        } else if (Math.abs(Math.abs(chi) - Math.PI / 4) < 0.01) {
            type = chi > 0 ? 'circular-right' : 'circular-left';
        }
        
        return { psi, chi, type };
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw analyzer body
        ctx.fillStyle = 'rgba(50, 40, 60, 0.9)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#8060A0';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw polarization state visualization
        const displayRadius = Math.min(halfWidth, halfHeight) * 0.6;
        const centerY = -halfHeight * 0.2;
        
        // Draw reference circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, centerY, displayRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw polarization ellipse if we have data
        if (this.stokesS0 > 0) {
            const ellipse = this.getPolarizationEllipse();
            const dop = this.getDegreeOfPolarization();
            
            ctx.save();
            ctx.translate(0, centerY);
            ctx.rotate(ellipse.psi);
            
            // Draw ellipse
            const a = displayRadius * dop;
            const b = displayRadius * dop * Math.abs(Math.sin(2 * ellipse.chi));
            
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, Math.max(2, a), Math.max(1, b), 0, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw orientation line
            ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-a, 0);
            ctx.lineTo(a, 0);
            ctx.stroke();
            
            ctx.restore();
        }

        // Draw Stokes values
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        
        const textX = -halfWidth + 3;
        const textY = halfHeight - 20;
        const lineHeight = 8;
        
        ctx.fillText(`S0: ${this.stokesS0.toFixed(2)}`, textX, textY);
        ctx.fillText(`S1: ${this.stokesS1.toFixed(2)}`, textX, textY + lineHeight);
        ctx.fillText(`S2: ${this.stokesS2.toFixed(2)}`, textX + halfWidth, textY);
        ctx.fillText(`S3: ${this.stokesS3.toFixed(2)}`, textX + halfWidth, textY + lineHeight);

        // Draw DOP
        const dop = this.getDegreeOfPolarization();
        ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(`DOP: ${(dop * 100).toFixed(0)}%`, 0, halfHeight - 3);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 10;
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
        // Intersect with front face
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
        // Ensure ray has Jones vector
        ray.ensureJonesVector();
        
        // Calculate and accumulate Stokes parameters
        if (ray.hasJones()) {
            const stokes = this.calculateStokes(ray.jones);
            this.stokesS0 += stokes.S0 * ray.intensity;
            this.stokesS1 += stokes.S1 * ray.intensity;
            this.stokesS2 += stokes.S2 * ray.intensity;
            this.stokesS3 += stokes.S3 * ray.intensity;
        } else {
            // Unpolarized light contributes only to S0
            this.stokesS0 += ray.intensity;
        }
        
        this.hitCount += 1;
        
        ray.terminate('absorbed_polarization_analyzer');
        return [];
    }

    getProperties() {
        const dop = this.getDegreeOfPolarization();
        const ellipse = this.getPolarizationEllipse();
        
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 40, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 40, step: 5 },
            stokesS0: { value: this.stokesS0.toFixed(4), label: 'S₀ (总强度)', type: 'text', readonly: true },
            stokesS1: { value: this.stokesS1.toFixed(4), label: 'S₁ (H-V)', type: 'text', readonly: true },
            stokesS2: { value: this.stokesS2.toFixed(4), label: 'S₂ (+45°/-45°)', type: 'text', readonly: true },
            stokesS3: { value: this.stokesS3.toFixed(4), label: 'S₃ (R-L)', type: 'text', readonly: true },
            dop: { value: (dop * 100).toFixed(1) + '%', label: '偏振度 (DOP)', type: 'text', readonly: true },
            polarizationType: { value: ellipse.type, label: '偏振类型', type: 'text', readonly: true },
            orientationAngle: { 
                value: (ellipse.psi * 180 / Math.PI).toFixed(1) + '°', 
                label: '方位角', 
                type: 'text', 
                readonly: true 
            },
            hitCount: { value: this.hitCount, label: '命中光线数', type: 'text', readonly: true }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 40) { 
                    this.width = w; 
                    this._updateGeometry();
                    this.reset();
                    if (typeof window !== 'undefined') window.needsRetrace = true;
                }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 40) { 
                    this.height = h; 
                    this._updateGeometry();
                    this.reset();
                    if (typeof window !== 'undefined') window.needsRetrace = true;
                }
                break;
            default:
                return false;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.PolarizationAnalyzer = PolarizationAnalyzer;
}
