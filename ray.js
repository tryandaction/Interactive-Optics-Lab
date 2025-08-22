// ray.js
// 定义光线类

// 定义一些光学常数
const SPEED_OF_LIGHT = 299792458; // m/s
const N_AIR = 1.000293; // Approx refractive index of air
const DEFAULT_WAVELENGTH_NM = 550; // nm (green)
const MAX_RAY_BOUNCES = 500;      // Max reflections/refractions
const MIN_RAY_INTENSITY = 0.0001; // Stop tracing below this intensity
// Add or modify these near the top constants in ray.js
const MIN_RAY_WIDTH = 1.0; // <<< CHANGE from 0.5 to 1.0 (or even 1.2 if 1.0 still feels too thin)
const MAX_RAY_WIDTH = 3.0; // <<< CHANGE from 2.5 to 3.0 (Allow slightly thicker max)
// --- Add near other constants in ray.js ---
const PIXELS_PER_MICROMETER = 1.0; // <<<--- 关键比例：1像素代表多少微米 (初始假设 1:1)
const PIXELS_PER_NANOMETER = PIXELS_PER_MICROMETER / 1000.0; // 自动计算 nm 比例

class Ray {
    // 构造函数
    // 构造函数
    constructor(origin, direction,
        wavelengthNm = DEFAULT_WAVELENGTH_NM,
        intensity = 1.0,
        phase = 0.0,
        bounces = 0,
        mediumRefractiveIndex = N_AIR,
        sourceId = null, // <-- 追踪来源 ID
        polarizationAngle = null, // null for unpolarized, angle in radians for linear
        ignoreDecay = false, // If true, intensity doesn't drop (except at splitters/polarizers if handled)
        initialHistory = null, // <<<--- ADDED PARAMETER
        beamDiameter = 1.0, // <<< ADD New parameter with default
        beamWaist = null,
        z_R = null,
    ) {
        if (!(origin instanceof Vector)) throw new Error("Ray origin must be a Vector.");
        if (!(direction instanceof Vector)) throw new Error("Ray direction must be a Vector.");

        this.origin = origin;
        this.direction = direction.normalize();
        if (this.direction.magnitudeSquared() < 1e-9) { // Check AFTER normalization
            console.error("RAY CONSTRUCTOR ERROR: Direction normalized to zero vector!", direction);
            this.terminate('zero_direction_on_creation');
        }
        this.wavelengthNm = wavelengthNm;
        this.intensity = Math.max(0, intensity); // Ensure non-negative
        this.phase = phase;
        this.bouncesSoFar = bounces; // Renamed for clarity
        this.mediumRefractiveIndex = mediumRefractiveIndex;
        this.sourceId = sourceId; // Store the source ID
        this.polarizationAngle = (polarizationAngle === null || typeof polarizationAngle === 'number' || typeof polarizationAngle === 'string')
            ? polarizationAngle // Allow null, number, or string ('circular')
            : null;             // Default to null if invalid type
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = Math.max(0, beamDiameter); // <<< ADD Store beam diameter
        this.beamWaist = beamWaist; // Radius at the narrowest point (w0)
        this.z_R = z_R;         // Rayleigh range

        // --- Add/Verify these checks ---
        if (!(origin instanceof Vector) || !(direction instanceof Vector)) {
            console.error("Ray CONSTRUCTOR ERROR: Origin or Direction is not a Vector!", origin, direction);
            this.terminate('invalid_geom_on_creation'); // Terminate immediately
        }
        // Normalize again after potential modification? Usually normalize() handles zero vector.
        if (this.direction.magnitudeSquared() < 0.5) { // Check if direction is near zero vector
            console.error("Ray CONSTRUCTOR ERROR: Direction vector is zero or near-zero.", direction);
            this.terminate('zero_direction_on_creation');
        }

        // Sanity check initial values AFTER assignment and clamping
        if (isNaN(this.origin?.x) || isNaN(this.origin?.y) ||
            isNaN(this.direction?.x) || isNaN(this.direction?.y) ||
            isNaN(this.intensity) || isNaN(this.phase) || this.intensity < 0) { // Check intensity < 0 just in case Math.max failed?
            console.error("Ray CONSTRUCTOR ERROR: Created with NaN or invalid values:", {
                ox: this.origin?.x, oy: this.origin?.y, dx: this.direction?.x, dy: this.direction?.y, i: this.intensity, p: this.phase
            });
            this.terminate('nan_on_creation');
        }

        // --- History ---
        if (initialHistory && Array.isArray(initialHistory) && initialHistory.length > 0) {
            // If initialHistory is provided, use it (append the current origin if necessary)
            // We assume the interaction logic correctly passes history INCLUDING the new origin.
            this.history = initialHistory;
        } else {
            // Otherwise, start fresh history with the current origin
            this.history = [origin.clone()];
        }
        // Ensure the very first point is always valid
        if (!this.history[0] || !(this.history[0] instanceof Vector) || isNaN(this.history[0].x)) {
            console.error("Ray history initialization error! Defaulting.", origin);
            this.history = [origin.clone()]; // Fallback
        }
        // --- End History Modification ---

        this.terminated = false;
        //this.nextRaySegment = null; // <<<--- DELETE OR COMMENT OUT THIS LINE if it exists
        this.endReason = null;
        this.animateArrow = true; // <<<--- ADD THIS LINE IN ray.js constructor
        //         this.lastHitInfo = null; // { point: Vector, surfaceId: any }
        // this.stuckCounter = 0;   // Counts consecutive "similar" hits
        // this.STUCK_THRESHOLD = 10; // Terminate after this many similar hits (adjust as needed)

        // Cache calculated properties
        this._color = this.calculateColor();
        this._lineWidth = this.calculateLineWidth();

        // Constants accessible on the instance (or could be static/global)
        this.maxBounces = MAX_RAY_BOUNCES;
        this.minIntensityThreshold = MIN_RAY_INTENSITY;
        // this.arrowAnimationProgress = 0.0; // Represents progress along *this specific segment* [0, 1] or distance

        // Sanity check initial values (might be redundant now)
        if (isNaN(this.origin.x) || isNaN(this.direction.x) || isNaN(this.intensity) || isNaN(this.phase)) {
            console.error("Ray created with NaN values:", this);
            this.terminate('nan_on_creation');
        }

        // --- Initialize Jones vector (backward compatible) ---
        // Jones vector stores complex amplitudes Ex,Ey; we normalize intensity separately.
        this.jones = null; // { Ex: {re,im}, Ey: {re,im} }
        try {
            if (typeof this.polarizationAngle === 'number') {
                // Linear polarization at angle theta
                const c = Math.cos(this.polarizationAngle);
                const s = Math.sin(this.polarizationAngle);
                this.jones = { Ex: { re: c, im: 0 }, Ey: { re: s, im: 0 } };
            } else if (this.polarizationAngle === 'circular') {
                // Right-hand circular by default: [1, i]/sqrt(2)
                const invSqrt2 = 1 / Math.sqrt(2);
                this.jones = { Ex: { re: invSqrt2, im: 0 }, Ey: { re: 0, im: invSqrt2 } };
            } else {
                // Unpolarized or unspecified -> leave null (components decide how to handle)
                this.jones = null;
            }
        } catch (e) { console.warn('Failed to initialize Jones vector:', e); this.jones = null; }
    }

    // --- 偏振相关 ---
    // Replace the existing isPolarized method:
    isPolarized() {
        // Consider number angles, circular marker, or presence of jones as polarized
        return typeof this.polarizationAngle === 'number' || this.polarizationAngle === 'circular' || !!this.jones; // Add other markers later if needed
    }
    getPolarizationAngle() { return this.polarizationAngle; }
    // Replace the existing setPolarization method:
    setPolarization(angleRad) {
        if (typeof angleRad === 'number' && !isNaN(angleRad)) {
            // Normalize angle to [-PI, PI]
            this.polarizationAngle = Math.atan2(Math.sin(angleRad), Math.cos(angleRad));
        } else {
            console.warn("setPolarization called with invalid angle:", angleRad);
            // Optionally set to unpolarized or keep current state? Let's keep current.
            // this.polarizationAngle = null;
        }
    }
    // Add this new method inside the Ray class
    setSpecialPolarization(state) {
        if (state === 'circular' /* || state === 'elliptical' etc. */) {
            this.polarizationAngle = state;
        } else {
            console.warn("setSpecialPolarization called with unknown state:", state);
        }
    }
    setUnpolarized() { this.polarizationAngle = null; }

    // --- Jones helpers ---
    hasJones() { return !!(this.jones && this.jones.Ex && this.jones.Ey); }
    static _cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    static _cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    static _cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
    static _cScale(a, s) { return { re: a.re * s, im: a.im * s }; }
    static _cAbs2(a) { return a.re * a.re + a.im * a.im; }
    static _rot2(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        return [[{ re: c, im: 0 }, { re: -s, im: 0 }], [{ re: s, im: 0 }, { re: c, im: 0 }]];
    }
    static _apply2x2(J, v) {
        const Ex = Ray._cAdd(Ray._cMul(J[0][0], v.Ex), Ray._cMul(J[0][1], v.Ey));
        const Ey = Ray._cAdd(Ray._cMul(J[1][0], v.Ex), Ray._cMul(J[1][1], v.Ey));
        return { Ex, Ey };
    }
    static jonesLinear(angleRad) {
        const c = Math.cos(angleRad), s = Math.sin(angleRad);
        return { Ex: { re: c, im: 0 }, Ey: { re: s, im: 0 } };
    }
    static jonesCircular(rightHanded = true) {
        const inv = 1 / Math.sqrt(2);
        return rightHanded ? { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: inv } } : { Ex: { re: inv, im: 0 }, Ey: { re: 0, im: -inv } };
    }
    jonesIntensity() {
        if (!this.hasJones()) return null;
        return Ray._cAbs2(this.jones.Ex) + Ray._cAbs2(this.jones.Ey);
    }
    setJones(j) { this.jones = j; }
    setLinearPolarization(angleRad) {
        this.polarizationAngle = Math.atan2(Math.sin(angleRad), Math.cos(angleRad));
        this.jones = Ray.jonesLinear(this.polarizationAngle);
    }
    setCircularPolarization(rightHanded = true) {
        this.polarizationAngle = 'circular';
        this.jones = Ray.jonesCircular(rightHanded);
    }

    // --- REPLACEMENT for Ray.calculateColor (Revised Algorithm & Intensity Mapping) ---
    calculateColor() {
        const wl = this.wavelengthNm;
        let R = 0, G = 0, B = 0;

        // Standard approximate wavelength to RGB conversion
        if (wl >= 380 && wl < 440) { R = -(wl - 440) / (440 - 380); G = 0.0; B = 1.0; }
        else if (wl >= 440 && wl < 490) { R = 0.0; G = (wl - 440) / (490 - 440); B = 1.0; }
        else if (wl >= 490 && wl < 510) { R = 0.0; G = 1.0; B = -(wl - 510) / (510 - 490); }
        else if (wl >= 510 && wl < 580) { R = (wl - 510) / (580 - 510); G = 1.0; B = 0.0; }
        else if (wl >= 580 && wl < 645) { R = 1.0; G = -(wl - 645) / (645 - 580); B = 0.0; }
        else if (wl >= 645 && wl <= 750) { R = 1.0; G = 0.0; B = 0.0; }
        else { R = 0.0; G = 0.0; B = 0.0; } // Outside visible range -> black (or dim gray?)

        // Adjust intensity factor for wavelengths outside the main peak (380-440nm and 645-750nm)
        let factor = 1.0;
        if (wl < 420) factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
        else if (wl > 680) factor = 0.3 + 0.7 * (750 - wl) / (750 - 680);

        // Gamma correction factor (approx 2.2 is common for sRGB)
        const gamma = 2.2;

        // Apply intensity adjustments and gamma correction
        // Map intensity more linearly to brightness for visual clarity at low intensities
        // Clamp max intensity effect for color calculation to avoid excessive brightness
        const intensityForColor = Math.min(this.intensity, 1.5);
        // Start brightness from 0.2, use sqrt mapping for better low-intensity visibility
        const brightness = 0.2 + 0.8 * Math.pow(intensityForColor, 0.5);

        R = Math.pow(R * factor, gamma) * brightness;
        G = Math.pow(G * factor, gamma) * brightness;
        B = Math.pow(B * factor, gamma) * brightness;

        // --- Alpha based on Intensity ---
        // Make alpha more sensitive to low intensity, max out sooner for clarity
        const intensityForAlpha = this.intensity; // Use original intensity for alpha calculation
        const MIN_ALPHA = 0.02; // Lower minimum alpha for very faint rays
        const MAX_ALPHA = 0.85; // Slightly lower max alpha to avoid dense look
        // Use tanh for a smooth curve that saturates faster than linear or sqrt
        let alpha = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * Math.tanh(intensityForAlpha * 2.0);
        alpha = Math.max(0, Math.min(1, alpha)); // Clamp alpha strictly between 0 and 1

        // Convert RGB to 0-255 range and clamp
        const rInt = Math.min(255, Math.max(0, Math.round(R * 255)));
        const gInt = Math.min(255, Math.max(0, Math.round(G * 255)));
        const bInt = Math.min(255, Math.max(0, Math.round(B * 255)));

        // Handle non-visible range explicitly making it very dim gray/nearly invisible
        if (wl < 380 || wl > 750) {
            // Option 1: Very dim gray (might still be visually confusing)
            // return `rgba(80, 80, 80, ${alpha * 0.1})`; 
            // Option 2: Use calculated color but make it extremely transparent
            alpha = alpha * 0.05; // Make non-visible nearly transparent
            return `rgba(${rInt},${gInt},${bInt},${alpha.toFixed(3)})`;
        }

        // Return the final RGBA color string
        return `rgba(${rInt},${gInt},${bInt},${alpha.toFixed(3)})`;
    }
    // --- END OF REPLACEMENT ---


    // --- REPLACEMENT for calculateLineWidth method in Ray class (V4 - Simpler Gaussian Width Display) ---
    calculateLineWidth() {
        let baseWidth;

        // Check if it's a Gaussian beam with valid parameters AND the source enabled it
        // (Technically, the check for w0!=null && zR!=null IS the check for Gaussian type)
        if (this.beamWaist !== null && this.z_R !== null && this.beamWaist > 1e-6) {
            // --- SIMPLIFIED APPROACH ---
            // Use 2 * beamWaist (w0) as the base diameter for line width calculation.
            // This ignores the divergence effect for now, but makes the w0 setting visible.
            baseWidth = this.beamWaist * 2.0; // Use w0 directly to set the base diameter

            // Optional: Clamp the base width derived from w0 to prevent extreme values immediately
            baseWidth = Math.max(0.5, Math.min(baseWidth, 15.0)); // Clamp diameter effect (e.g., 0.5px to 15px)
            // --- END SIMPLIFIED APPROACH ---

        } else {
            // Not a Gaussian beam, use the fixed beamDiameter (as before)
            baseWidth = this.beamDiameter > 0 ? this.beamDiameter : 1.0;
        }

        // Now, modulate this baseWidth by intensity (less sensitive factor)
        const intensityFactor = Math.pow(Math.max(0.01, this.intensity), 0.2); // Less sensitive

        // Scale the base width by intensity factor
        let finalWidth = baseWidth * intensityFactor;

        // Clamp final width between global MIN and MAX limits
        // Ensure finalWidth is at least MIN_RAY_WIDTH
        finalWidth = Math.max(MIN_RAY_WIDTH, Math.min(MAX_RAY_WIDTH, finalWidth));

        // Debug log can be helpful here:
        // console.log(`Ray ${this.sourceId}-${this.bouncesSoFar}, isGauss=${this.beamWaist!==null}, w0=${this.beamWaist?.toFixed(2)}, baseW=${baseWidth?.toFixed(2)}, factor=${intensityFactor?.toFixed(2)}, finalW=${finalWidth?.toFixed(2)}`);

        return finalWidth;
    }
    // --- END OF REPLACEMENT ---

    getColor() { return this._color; }
    getLineWidth() { return this._lineWidth; }

    // --- REPLACEMENT for addHistoryPoint (Accurate Phase Calculation) ---
    addHistoryPoint(point) {
        if (this.terminated || !(point instanceof Vector)) return;

        const lastPoint = this.history[this.history.length - 1];
        if (!(lastPoint instanceof Vector) || isNaN(lastPoint.x)) {
            console.error(`Ray ${this.sourceId}-${this.bouncesSoFar}: Cannot add history, last point invalid.`);
            return; // Safety check
        }
        if (isNaN(point.x)) {
            console.error(`Ray ${this.sourceId}-${this.bouncesSoFar}: Cannot add history, new point invalid.`);
            return; // Safety check
        }


        // Calculate geometric distance for this segment
        const distance = point.distanceTo(lastPoint);
        if (isNaN(distance) || distance < 1e-9) {
            // Don't add point or update phase if distance is negligible or invalid
            // This also helps prevent phase explosion if points are too close
            return;
        }

        // --- Update phase based on optical path length ---
        // Optical Path Length = geometric distance * refractive index
        // Phase Change = (2 * pi / vacuum_wavelength) * Optical Path Length
        // Phase Change = (2 * pi / vacuum_wavelength_nm) * distance_pixels * refractive_index * (meters_per_pixel / nm_per_meter)
        // Phase Change = (2 * pi / wavelengthNm) * distance * mediumRefractiveIndex * (1 / PIXELS_PER_NANOMETER / 1e9) ??? --- Complicated units!

        // --- Let's use a unit-consistent approach ---
        // Assume distance is in pixels.
        // Convert wavelength to pixels: lambda_px = wavelengthNm * PIXELS_PER_NANOMETER
        // Phase Change = (2 * pi / lambda_px) * distance_pixels * mediumRefractiveIndex
        const lambda_px = this.wavelengthNm * PIXELS_PER_NANOMETER;

        if (lambda_px > 1e-9 && !isNaN(this.mediumRefractiveIndex)) { // Ensure valid wavelength in pixels and refractive index
            const phaseChange = (2 * Math.PI / lambda_px) * distance * this.mediumRefractiveIndex;
            this.phase += phaseChange;

            // Normalize phase to [-PI, PI] to prevent overflow (optional but good practice)
            this.phase = Math.atan2(Math.sin(this.phase), Math.cos(this.phase));

        } else {
            console.warn(`Ray ${this.sourceId}-${this.bouncesSoFar}: Could not update phase. lambda_px=${lambda_px}, n=${this.mediumRefractiveIndex}`);
        }

        // Add the new point to history
        this.history.push(point.clone());
    }
    // --- END OF REPLACEMENT ---

    getPathPoints() { return this.history; }

    // --- 干涉计算 ---
    getComplexAmplitude() {
        // Amplitude A = sqrt(Intensity)
        const amplitude = Math.sqrt(this.intensity);
        // Return components for calculating real/imaginary parts
        return { amplitude: amplitude, phase: this.phase };
        // Or return complex number if using a library:
        // return new Complex(amplitude * Math.cos(this.phase), amplitude * Math.sin(this.phase));
    }

    // --- 终止和检查 ---
    terminate(reason = 'unknown') {
        if (!this.terminated) {
            this.terminated = true;
            this.endReason = reason;
        }
    }

    // Check if the ray should terminate (used in traceAllRays)
    // --- PASTE this entire method into ray.js, replacing the old shouldTerminate ---
    shouldTerminate() {
        // --- High Priority Checks First ---
        if (this.terminated) {
            // Already terminated, reason should be set.
            // console.log(`Ray ${this.sourceId}-${this.bouncesSoFar}: ShouldTerminate = true (already terminated: ${this.endReason})`); // DEBUG - Noisy
            return true;
        }

        // Check for NaN values in critical properties
        if (isNaN(this.origin?.x) || isNaN(this.origin?.y) ||
            isNaN(this.direction?.x) || isNaN(this.direction?.y) ||
            isNaN(this.intensity) || isNaN(this.phase)) {
            console.error(`Ray ${this.sourceId}-${this.bouncesSoFar}: TERMINATING (NaN value detected!)`, {
                ox: this.origin?.x, oy: this.origin?.y, dx: this.direction?.x, dy: this.direction?.y, i: this.intensity, p: this.phase
            }); // DEBUG
            this.terminate('nan_value');
            return true;
        }
        // Check for near-zero direction vector AFTER normalization (should be caught in constructor/interaction, but safe check)
        if (this.direction.magnitudeSquared() < 1e-9) {
            console.error(`Ray ${this.sourceId}-${this.bouncesSoFar}: TERMINATING (Zero direction vector detected!)`, this.direction); // DEBUG
            this.terminate('zero_direction_runtime');
            return true;
        }


        // --- Standard Termination Conditions ---

        // Check max bounces ONLY if the global ignore flag is FALSE
        // Ensure window.ignoreMaxBounces is accessible (it should be)
        // const limitBounces = (typeof window.ignoreMaxBounces === 'boolean') ? !window.ignoreMaxBounces : true; // Default to limiting if flag is undefined
        // if (limitBounces && this.bouncesSoFar >= this.maxBounces) {
        if (this.bouncesSoFar >= globalMaxBounces) {
            // console.log(`Ray ${this.sourceId}-${this.bouncesSoFar}: TERMINATING (max bounces ${globalMaxBounces} reached)`); // Keep console log if needed
            this.terminate('max_bounces');
            return true;
        }

        // Check low intensity ONLY if ignoreDecay flag is FALSE
        if (!this.ignoreDecay && this.intensity < globalMinIntensity) {
            // console.log(`Ray ${this.sourceId}-${this.bouncesSoFar}: ShouldTerminate = true (low intensity: ${this.intensity.toExponential(2)} < ${globalMinIntensity.toExponential(2)})`); // Keep console log if needed
            this.terminate('low_intensity');
            return true;
        }

        // --- Stuck Ray Check (handled in traceAllRays for now) ---
        // if (this.stuckCounter >= this.STUCK_THRESHOLD) {
        //     console.warn(`Ray ${this.sourceId}-${this.bouncesSoFar}: TERMINATING (Stuck Detection Threshold Reached).`);
        //     this.terminate('stuck_loop');
        //     return true;
        // }

        // If none of the above conditions met, the ray should continue
        // console.log(`Ray ${this.sourceId}-${this.bouncesSoFar}: ShouldTerminate = false`); // DEBUG - Very Noisy
        return false;
    }
    // --- END OF PASTE ---

    // --- NEW METHOD: Calculate Gaussian beam width at a distance from waist ---
    getWidthAt(distanceFromWaist) {
        // Check if this ray represents a Gaussian beam
        if (this.beamWaist === null || this.z_R === null || this.z_R <= 1e-9) {
            // Not a Gaussian beam, or invalid parameters, return the fixed beamDiameter
            // (beamDiameter represents non-Gaussian width or initial width for Gaussian)
            return this.beamDiameter > 0 ? this.beamDiameter / 2.0 : 1.0; // Return radius
        }

        // Gaussian beam width formula: w(z) = w0 * sqrt(1 + (z / z_R)^2)
        // where z is the distance from the beam waist.
        const w0 = this.beamWaist;
        const z = Math.abs(distanceFromWaist); // Distance is always positive
        const z_over_zR = z / this.z_R;

        const width_w_z = w0 * Math.sqrt(1.0 + z_over_zR * z_over_zR);

        // Return the calculated radius at distance z
        return width_w_z;
    }
    // --- END OF NEW METHOD ---



}

console.log("ray.js: Ray class defined with sourceId and updated methods.");