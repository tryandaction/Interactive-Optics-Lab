/**
 * AtomicCell.js - 原子气室
 * 模拟原子与光的相互作用，支持Beer-Lambert吸收和多普勒展宽
 */

import { Vector } from '../../core/Vector.js';
import { OpticalComponent } from '../../core/OpticalComponent.js';

export class AtomicCell extends OpticalComponent {
    static functionDescription = "模拟原子与光相互作用的原子气室，支持共振吸收。";

    // Atomic transition data (wavelength in nm, linewidth in MHz)
    static ATOM_DATA = {
        Rb85: {
            name: '铷-85',
            D1: { wavelength: 794.98, linewidth: 5.75 },
            D2: { wavelength: 780.24, linewidth: 6.07 }
        },
        Rb87: {
            name: '铷-87',
            D1: { wavelength: 794.98, linewidth: 5.75 },
            D2: { wavelength: 780.24, linewidth: 6.07 }
        },
        Cs133: {
            name: '铯-133',
            D1: { wavelength: 894.35, linewidth: 4.56 },
            D2: { wavelength: 852.35, linewidth: 5.22 }
        },
        Na23: {
            name: '钠-23',
            D1: { wavelength: 589.76, linewidth: 9.76 },
            D2: { wavelength: 589.16, linewidth: 9.76 }
        },
        K39: {
            name: '钾-39',
            D1: { wavelength: 770.11, linewidth: 5.96 },
            D2: { wavelength: 766.70, linewidth: 6.04 }
        }
    };

    constructor(pos, width = 80, height = 40, angleDeg = 0, atomType = 'Rb87', 
                density = 1e10, temperature = 300) {
        super(pos, angleDeg, "原子气室");
        this.width = Math.max(20, width);
        this.height = Math.max(20, height);
        this.atomType = AtomicCell.ATOM_DATA[atomType] ? atomType : 'Rb87';
        this.density = Math.max(1e6, density); // atoms/cm³
        this.temperature = Math.max(1, temperature); // Kelvin
        this.transitionLine = 'D2'; // D1 or D2
        
        // Geometry cache
        this.corners = [];
        this._updateGeometry();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            width: this.width,
            height: this.height,
            atomType: this.atomType,
            density: this.density,
            temperature: this.temperature,
            transitionLine: this.transitionLine
        };
    }

    _updateGeometry() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const dir = Vector.fromAngle(this.angleRad);
        const perp = Vector.fromAngle(this.angleRad + Math.PI / 2);
        
        this.corners = [
            this.pos.add(dir.multiply(-halfWidth)).add(perp.multiply(-halfHeight)),
            this.pos.add(dir.multiply(halfWidth)).add(perp.multiply(-halfHeight)),
            this.pos.add(dir.multiply(halfWidth)).add(perp.multiply(halfHeight)),
            this.pos.add(dir.multiply(-halfWidth)).add(perp.multiply(halfHeight))
        ];
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    /**
     * Get resonance wavelength for current atom and transition
     */
    getResonanceWavelength() {
        const atom = AtomicCell.ATOM_DATA[this.atomType];
        return atom[this.transitionLine].wavelength;
    }

    /**
     * Get natural linewidth in nm
     */
    getNaturalLinewidth() {
        const atom = AtomicCell.ATOM_DATA[this.atomType];
        const linewidthMHz = atom[this.transitionLine].linewidth;
        const wavelengthNm = atom[this.transitionLine].wavelength;
        // Convert MHz to nm: Δλ = λ² * Δν / c
        const c = 3e17; // nm/s
        return (wavelengthNm * wavelengthNm * linewidthMHz * 1e6) / c;
    }

    /**
     * Get Doppler-broadened linewidth in nm
     */
    getDopplerLinewidth() {
        const atom = AtomicCell.ATOM_DATA[this.atomType];
        const wavelengthNm = atom[this.transitionLine].wavelength;
        const kB = 1.38e-23; // Boltzmann constant
        const c = 3e8; // m/s
        
        // Atomic mass (approximate, in kg)
        const masses = {
            Rb85: 85 * 1.66e-27,
            Rb87: 87 * 1.66e-27,
            Cs133: 133 * 1.66e-27,
            Na23: 23 * 1.66e-27,
            K39: 39 * 1.66e-27
        };
        const m = masses[this.atomType];
        
        // Doppler width: Δλ_D = λ * sqrt(8 * kB * T * ln(2) / (m * c²))
        const dopplerWidth = wavelengthNm * Math.sqrt(8 * kB * this.temperature * Math.log(2) / (m * c * c));
        return dopplerWidth;
    }

    /**
     * Calculate absorption coefficient using Voigt profile approximation
     * @param {number} wavelengthNm - Incident wavelength
     * @returns {number} Absorption coefficient (1/cm)
     */
    getAbsorptionCoefficient(wavelengthNm) {
        const resonanceWl = this.getResonanceWavelength();
        const naturalWidth = this.getNaturalLinewidth();
        const dopplerWidth = this.getDopplerLinewidth();
        
        // Detuning from resonance
        const detuning = wavelengthNm - resonanceWl;
        
        // Voigt profile approximation using pseudo-Voigt
        // Gaussian (Doppler) and Lorentzian (natural) contributions
        const sigmaG = dopplerWidth / (2 * Math.sqrt(2 * Math.log(2)));
        const gammaL = naturalWidth / 2;
        
        // Pseudo-Voigt mixing parameter
        const fG = dopplerWidth;
        const fL = naturalWidth;
        const f = Math.pow(fG * fG * fG * fG * fG + 2.69269 * fG * fG * fG * fG * fL + 
                          2.42843 * fG * fG * fG * fL * fL + 4.47163 * fG * fG * fL * fL * fL + 
                          0.07842 * fG * fL * fL * fL * fL + fL * fL * fL * fL * fL, 0.2);
        const eta = 1.36603 * (fL / f) - 0.47719 * Math.pow(fL / f, 2) + 0.11116 * Math.pow(fL / f, 3);
        
        // Gaussian component
        const gaussian = Math.exp(-detuning * detuning / (2 * sigmaG * sigmaG)) / (sigmaG * Math.sqrt(2 * Math.PI));
        
        // Lorentzian component
        const lorentzian = (gammaL / Math.PI) / (detuning * detuning + gammaL * gammaL);
        
        // Pseudo-Voigt profile
        const voigt = eta * lorentzian + (1 - eta) * gaussian;
        
        // Peak absorption cross-section (simplified)
        const sigma0 = 3 * Math.pow(resonanceWl * 1e-7, 2) / (2 * Math.PI); // cm²
        
        // Absorption coefficient: α = n * σ * profile
        const alpha = this.density * sigma0 * voigt * dopplerWidth;
        
        return Math.max(0, alpha);
    }

    /**
     * Calculate transmission using Beer-Lambert law
     * I = I0 * exp(-α * L)
     * @param {number} wavelengthNm - Incident wavelength
     * @param {number} pathLength - Path length through cell (in pixels, converted to cm)
     * @returns {number} Transmission (0-1)
     */
    getTransmission(wavelengthNm, pathLength) {
        const alpha = this.getAbsorptionCoefficient(wavelengthNm);
        const pathLengthCm = pathLength * 0.01; // Assume 1 pixel = 0.01 cm
        return Math.exp(-alpha * pathLengthCm);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        // Draw cell body (glass container)
        ctx.fillStyle = 'rgba(200, 150, 100, 0.15)';
        ctx.strokeStyle = this.selected ? '#FFFF00' : 'rgba(150, 100, 50, 0.8)';
        ctx.lineWidth = this.selected ? 2.5 : 2;

        ctx.beginPath();
        ctx.rect(-halfWidth, -halfHeight, this.width, this.height);
        ctx.fill();
        ctx.stroke();

        // Draw vapor indication (wavy lines)
        ctx.strokeStyle = 'rgba(255, 200, 150, 0.4)';
        ctx.lineWidth = 1;
        for (let y = -halfHeight + 10; y < halfHeight - 5; y += 8) {
            ctx.beginPath();
            for (let x = -halfWidth + 5; x < halfWidth - 5; x += 2) {
                const wave = Math.sin((x + y) * 0.2) * 2;
                if (x === -halfWidth + 5) {
                    ctx.moveTo(x, y + wave);
                } else {
                    ctx.lineTo(x, y + wave);
                }
            }
            ctx.stroke();
        }

        // Draw atom type label
        const atomData = AtomicCell.ATOM_DATA[this.atomType];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(atomData.name, 0, 4);

        // Draw resonance wavelength indicator
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(255, 200, 150, 0.8)';
        ctx.fillText(`λ=${this.getResonanceWavelength().toFixed(1)}nm`, 0, halfHeight - 5);

        ctx.restore();
    }

    getBoundingBox() {
        const buffer = 5;
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
        if (!point || this.corners.length < 4) return false;
        // Simple bounding box check
        const local = point.subtract(this.pos);
        const dir = Vector.fromAngle(this.angleRad);
        const perp = Vector.fromAngle(this.angleRad + Math.PI / 2);
        const x = local.dot(dir);
        const y = local.dot(perp);
        return Math.abs(x) <= this.width / 2 + 5 && Math.abs(y) <= this.height / 2 + 5;
    }

    intersect(rayOrigin, rayDirection) {
        // Find intersection with cell boundaries
        const dir = Vector.fromAngle(this.angleRad);
        const perp = Vector.fromAngle(this.angleRad + Math.PI / 2);
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        let nearestT = Infinity;
        let nearestInfo = null;

        // Check all four edges
        const edges = [
            { p1: this.corners[0], p2: this.corners[1], normal: perp.multiply(-1) },
            { p1: this.corners[1], p2: this.corners[2], normal: dir },
            { p1: this.corners[2], p2: this.corners[3], normal: perp },
            { p1: this.corners[3], p2: this.corners[0], normal: dir.multiply(-1) }
        ];

        for (const edge of edges) {
            const v1 = rayOrigin.subtract(edge.p1);
            const v2 = edge.p2.subtract(edge.p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            
            if (Math.abs(dot_v2_v3) < 1e-9) continue;
            
            const t1 = v2.cross(v1) / dot_v2_v3;
            const t2 = v1.dot(v3) / dot_v2_v3;
            
            if (t1 > 1e-6 && t2 >= 0 && t2 <= 1 && t1 < nearestT) {
                nearestT = t1;
                let normal = edge.normal;
                if (rayDirection.dot(normal) > 0) normal = normal.multiply(-1);
                nearestInfo = {
                    distance: t1,
                    point: rayOrigin.add(rayDirection.multiply(t1)),
                    normal: normal,
                    surfaceId: 'cell_wall'
                };
            }
        }

        return nearestInfo ? [nearestInfo] : [];
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        
        // Calculate path length through cell
        // Find exit point
        const testOrigin = hitPoint.add(incidentDirection.multiply(1));
        const exitIntersections = this.intersect(testOrigin, incidentDirection);
        
        let pathLength = this.width; // Default
        if (exitIntersections.length > 0) {
            pathLength = exitIntersections[0].distance + 1;
        }
        
        // Calculate transmission using Beer-Lambert law
        const transmission = this.getTransmission(ray.wavelengthNm, pathLength);
        const transmittedIntensity = ray.intensity * transmission;
        
        // Exit point
        const exitPoint = hitPoint.add(incidentDirection.multiply(pathLength));
        const newOrigin = exitPoint.add(incidentDirection.multiply(1e-6));
        
        let transmittedRay = null;
        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            try {
                transmittedRay = new RayClass(
                    newOrigin, incidentDirection, ray.wavelengthNm,
                    transmittedIntensity, ray.phase, ray.bouncesSoFar + 1,
                    ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([hitPoint.clone(), newOrigin.clone()]),
                    ray.beamDiameter
                );
            } catch (e) { console.error(`Error creating transmitted Ray in AtomicCell:`, e); }
        }

        ray.terminate('absorbed_atomic_cell');
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
    }

    getProperties() {
        const resonanceWl = this.getResonanceWavelength();
        const dopplerWidth = this.getDopplerLinewidth();
        
        return {
            ...super.getProperties(),
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 5 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 5 },
            atomType: {
                value: this.atomType,
                label: '原子种类',
                type: 'select',
                options: Object.entries(AtomicCell.ATOM_DATA).map(([key, data]) => ({
                    value: key,
                    label: data.name
                }))
            },
            transitionLine: {
                value: this.transitionLine,
                label: '跃迁线',
                type: 'select',
                options: [
                    { value: 'D1', label: 'D1线' },
                    { value: 'D2', label: 'D2线' }
                ]
            },
            density: { 
                value: this.density.toExponential(2), 
                label: '原子密度 (cm⁻³)', 
                type: 'number', 
                min: 1e6, 
                max: 1e15, 
                step: 1e9 
            },
            temperature: { value: this.temperature.toFixed(0), label: '温度 (K)', type: 'number', min: 1, max: 1000, step: 10 },
            resonanceWavelength: { 
                value: resonanceWl.toFixed(2) + ' nm', 
                label: '共振波长', 
                type: 'text', 
                readonly: true 
            },
            dopplerWidth: { 
                value: (dopplerWidth * 1000).toFixed(3) + ' pm', 
                label: '多普勒线宽', 
                type: 'text', 
                readonly: true 
            }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        let needsRetrace = false;
        let needsInspectorRefresh = false;

        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsGeomUpdate = true; }
                break;
            case 'atomType':
                if (AtomicCell.ATOM_DATA[value]) {
                    this.atomType = value;
                    needsRetrace = true;
                    needsInspectorRefresh = true;
                }
                break;
            case 'transitionLine':
                if (value === 'D1' || value === 'D2') {
                    this.transitionLine = value;
                    needsRetrace = true;
                    needsInspectorRefresh = true;
                }
                break;
            case 'density':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 1e6) { this.density = d; needsRetrace = true; }
                break;
            case 'temperature':
                const t = parseFloat(value);
                if (!isNaN(t) && t >= 1) { this.temperature = t; needsRetrace = true; needsInspectorRefresh = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
        }
        if (needsGeomUpdate || needsRetrace) {
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
    window.AtomicCell = AtomicCell;
}
