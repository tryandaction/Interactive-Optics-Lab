/**
 * WollastonPrism.js - Wollaston棱镜
 * 将入射光分为两束正交偏振光的双折射棱镜
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';
import { Ray } from '../../core/Ray.js';

export class WollastonPrism extends OpticalComponent {
    static functionDescription = "将入射光分为两束正交偏振光的Wollaston棱镜。";

    constructor(pos, width = 60, height = 40, angleDeg = 0, separationAngleDeg = 15) {
        super(pos, angleDeg, "Wollaston棱镜");
        this.width = Math.max(20, width);
        this.height = Math.max(20, height);
        this.separationAngleDeg = Math.max(1, Math.min(45, separationAngleDeg));
        
        // Birefringent material properties (calcite-like)
        this.no = 1.658; // Ordinary refractive index
        this.ne = 1.486; // Extraordinary refractive index
        
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            separationAngleDeg: this.separationAngleDeg
        };
    }

    _updateGeometry() {
        this.axisDirection = Vector.fromAngle(this.angleRad);
        this.perpDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { /* No geometry update needed */ }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw prism body (two triangular prisms joined)
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#8090C0';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        // Draw outer rectangle
        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw diagonal line showing prism junction
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-halfWidth, halfHeight);
        ctx.lineTo(halfWidth, -halfHeight);
        ctx.stroke();

        // Draw optic axis indicators
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        
        // First prism optic axis (vertical)
        ctx.beginPath();
        ctx.moveTo(-halfWidth * 0.5, -halfHeight * 0.3);
        ctx.lineTo(-halfWidth * 0.5, halfHeight * 0.3);
        ctx.stroke();
        
        // Second prism optic axis (horizontal)
        ctx.beginPath();
        ctx.moveTo(halfWidth * 0.2, 0);
        ctx.lineTo(halfWidth * 0.8, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw output beam indicators
        const sepRad = this.separationAngleDeg * Math.PI / 180;
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
        ctx.lineWidth = 1;
        
        // O-ray (ordinary)
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth + 15, -15 * Math.tan(sepRad / 2));
        ctx.stroke();
        
        // E-ray (extraordinary)
        ctx.beginPath();
        ctx.moveTo(halfWidth, 0);
        ctx.lineTo(halfWidth + 15, 15 * Math.tan(sepRad / 2));
        ctx.stroke();

        // Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('W', 0, 4);
        ctx.fillText(`${this.separationAngleDeg}°`, 0, halfHeight + 12);

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
        // Intersect with entry face
        const entryCenter = this.pos.subtract(this.axisDirection.multiply(this.width / 2));
        const denom = rayDirection.dot(this.axisDirection);
        if (Math.abs(denom) < 1e-9) return [];
        
        const t = entryCenter.subtract(rayOrigin).dot(this.axisDirection) / denom;
        if (t < 1e-6) return [];
        
        const hitPoint = rayOrigin.add(rayDirection.multiply(t));
        const localHit = hitPoint.subtract(entryCenter);
        const perpDist = Math.abs(localHit.dot(this.perpDirection));
        
        if (perpDist > this.height / 2) return [];
        
        let normal = this.axisDirection.multiply(-1);
        if (denom > 0) normal = normal.multiply(-1);
        
        return [{
            distance: t,
            point: hitPoint,
            normal: normal,
            surfaceId: 'entry'
        }];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        
        // Ensure ray has Jones vector
        ray.ensureJonesVector();
        
        const outputRays = [];
        const sepRad = this.separationAngleDeg * Math.PI / 180;
        const halfSep = sepRad / 2;
        
        // Exit point
        const exitPoint = this.pos.add(this.axisDirection.multiply(this.width / 2));
        
        // Calculate intensity split based on polarization
        let oIntensity, eIntensity;
        
        if (ray.hasJones()) {
            // Split based on Jones vector components
            const totalIntensity = Ray._cAbs2(ray.jones.Ex) + Ray._cAbs2(ray.jones.Ey);
            if (totalIntensity > 1e-12) {
                // Assume optic axis is vertical for first prism
                // O-ray: horizontal polarization (Ex)
                // E-ray: vertical polarization (Ey)
                oIntensity = ray.intensity * Ray._cAbs2(ray.jones.Ex) / totalIntensity;
                eIntensity = ray.intensity * Ray._cAbs2(ray.jones.Ey) / totalIntensity;
            } else {
                oIntensity = ray.intensity * 0.5;
                eIntensity = ray.intensity * 0.5;
            }
        } else {
            // Unpolarized: split 50/50
            oIntensity = ray.intensity * 0.5;
            eIntensity = ray.intensity * 0.5;
        }
        
        // Create O-ray (ordinary ray) - deflected one way
        if (oIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const oAngle = incidentDirection.angle() - halfSep;
            const oDirection = Vector.fromAngle(oAngle);
            const oOrigin = exitPoint.add(oDirection.multiply(1e-6));
            
            try {
                const oRay = new RayClass(
                    oOrigin, oDirection, ray.wavelengthNm,
                    oIntensity, ray.phase, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, 0, // Horizontal polarization
                    ray.ignoreDecay, ray.history.concat([hitPoint.clone(), oOrigin.clone()]),
                    ray.beamDiameter
                );
                // Set horizontal polarization (Jones vector for 0°)
                oRay.setLinearPolarization(0);
                outputRays.push(oRay);
            } catch (e) { console.error(`Error creating O-ray in WollastonPrism:`, e); }
        }
        
        // Create E-ray (extraordinary ray) - deflected other way
        if (eIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const eAngle = incidentDirection.angle() + halfSep;
            const eDirection = Vector.fromAngle(eAngle);
            const eOrigin = exitPoint.add(eDirection.multiply(1e-6));
            
            try {
                const eRay = new RayClass(
                    eOrigin, eDirection, ray.wavelengthNm,
                    eIntensity, ray.phase, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, Math.PI / 2, // Vertical polarization
                    ray.ignoreDecay, ray.history.concat([hitPoint.clone(), eOrigin.clone()]),
                    ray.beamDiameter
                );
                // Set vertical polarization (Jones vector for 90°)
                eRay.setLinearPolarization(Math.PI / 2);
                outputRays.push(eRay);
            } catch (e) { console.error(`Error creating E-ray in WollastonPrism:`, e); }
        }

        ray.terminate('wollaston_split');
        return outputRays;
    }

    getProperties() {
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 5 },
            separationAngleDeg: { 
                value: this.separationAngleDeg.toFixed(1), 
                label: '分离角 (°)', 
                type: 'number', 
                min: 1, 
                max: 45, 
                step: 1 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsRetrace = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsRetrace = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsRetrace = true; }
                break;
            case 'separationAngleDeg':
                const sep = parseFloat(value);
                if (!isNaN(sep)) { 
                    this.separationAngleDeg = Math.max(1, Math.min(45, sep)); 
                    needsRetrace = true; 
                }
                break;
            default:
                return false;
        }

        if (needsRetrace && typeof window !== 'undefined') {
            window.needsRetrace = true;
        }
        return true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.WollastonPrism = WollastonPrism;
}
