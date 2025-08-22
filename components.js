// components.js
// 包含所有光学元件类的定义

// --- 确保 Vector.lerp 存在 ---
// (Vector.js 应该已经包含这个)
if (typeof Vector.lerp === 'undefined') {
    Vector.lerp = function (v1, v2, t) {
        t = Math.max(0, Math.min(1, t));
        return v1.multiply(1 - t).add(v2.multiply(t));
    };
    console.warn("components.js: Manually added Vector.lerp helper function.");
}
// 确保 N_AIR 和 DEFAULT_WAVELENGTH_NM 可访问 (来自 ray.js 或全局)
// 如果它们不在全局作用域，可能需要从 Ray 类或其他地方获取
// const N_AIR = 1.000293; // Best defined globally or imported if using modules
// const DEFAULT_WAVELENGTH_NM = 550;

// --- GameObject: 所有模拟中对象的基础类 ---
class GameObject {
    constructor(pos, angleDeg = 0, label = "Object") {
        if (!(pos instanceof Vector)) {
            console.error("GameObject position must be a Vector! Defaulting position.", label);
            pos = new Vector(100, 100); // Provide a default to avoid crash
        }
        this.pos = pos; // Position (Vector)
        this.angleRad = angleDeg * (Math.PI / 180); // Angle in radians
        this.label = label; // Label for identification
        this.notes = ""; // User editable notes

        this.selected = false; // Is the object currently selected?
        this.dragging = false; // Is the object currently being dragged (position)?
        this.dragOffset = new Vector(0, 0); // Offset from mouse to object center during drag
        this.isDraggingAngle = false; // Is the object's angle handle being dragged?
        this.angleDragStartAngle = 0; // Object's angle when angle drag started
        this.angleDragStartMouseAngle = 0; // Mouse angle relative to object center when angle drag started

        // Angle handle properties
        this.angleHandleOffset = 30; // Distance from center to handle
        this.angleHandleRadius = 6;  // Visual and click radius of the handle

        // Unique ID (simple version)
        this.id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // --- Angle Handle ---
    getAngleHandlePos() {
        const handleVec = Vector.fromAngle(this.angleRad).multiply(this.angleHandleOffset);
        return this.pos.add(handleVec);
    }

    isPointOnAngleHandle(point) {
        const handlePos = this.getAngleHandlePos();
        // Use distance squared for efficiency
        return point.distanceSquaredTo(handlePos) < this.angleHandleRadius * this.angleHandleRadius;
    }

    // --- Interaction ---
    // Check if a point is contained within the object (including angle handle for selected objects)
    containsPoint(point) {
        if (!(point instanceof Vector)) return false; // Basic type check

        // Prioritize angle handle for selected objects
        if (this.selected && this.isPointOnAngleHandle(point)) {
            return true; // Clicked the angle handle
        }
        // Check the main body using subclass implementation
        try {
            return this._containsPointBody(point);
        } catch (e) {
            console.error(`Error in _containsPointBody for ${this.label} (${this.constructor.name}):`, e);
            return false; // Assume false if error occurs
        }
    }

    // Virtual method: Subclasses MUST override this to define their main body collision shape
    _containsPointBody(point) {
        console.warn(`_containsPointBody() not implemented for ${this.label} (${this.constructor.name}). Using basic bounding box.`);
        // Fallback to a simple bounding box check (often inaccurate)
        const bounds = this.getBoundingBox();
        if (!bounds) return false;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }

    // Virtual method: Subclasses can override to define their bounding box
    getBoundingBox() {
        // Default bounding box (small square around pos) - subclasses should provide better ones
        const size = 10;
        return { x: this.pos.x - size / 2, y: this.pos.y - size / 2, width: size, height: size };
    }

    startDrag(mousePos) {
        if (!(mousePos instanceof Vector)) return;

        if (this.selected && this.isPointOnAngleHandle(mousePos)) {
            this.isDraggingAngle = true;
            this.dragging = false; // Not dragging position
            this.angleDragStartAngle = this.angleRad;
            const vectorToMouse = mousePos.subtract(this.pos);
            this.angleDragStartMouseAngle = vectorToMouse.angle();
        } else {
            // Assume dragging position if clicked anywhere else on the body
            this.isDraggingAngle = false;
            this.dragging = true;
            this.dragOffset = this.pos.subtract(mousePos);
        }
    }

    drag(mousePos) {
        if (!(mousePos instanceof Vector)) return;
        let needsGeomUpdate = false;

        if (this.dragging) { // Dragging position
            this.pos = mousePos.add(this.dragOffset);
            needsGeomUpdate = true; // Position changed, geometry likely needs update
        } else if (this.isDraggingAngle) { // Dragging angle
            const vectorToMouse = mousePos.subtract(this.pos);
            const currentMouseAngle = vectorToMouse.angle();

            let angleDelta = currentMouseAngle - this.angleDragStartMouseAngle;

            // Handle angle wrap around [-PI, PI]
            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

            const newAngleRad = this.angleDragStartAngle + angleDelta;

            // Use setProperty to handle angle update and side effects
            // Convert back to degrees for setProperty
            this.setProperty('angleDeg', newAngleRad * (180 / Math.PI));
            // Note: setProperty should trigger needsRetrace and call onAngleChanged
        }

        // If geometry needs updating due to drag, call relevant methods
        if (needsGeomUpdate) {
            // Call position change handler first (might affect geometry update)
            if (typeof this.onPositionChanged === 'function') {
                try { this.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged:", e); }
            }
            // Then, explicitly call _updateGeometry if it exists (common pattern)
            if (typeof this._updateGeometry === 'function') {
                try { this._updateGeometry(); } catch (e) { console.error("Error in _updateGeometry during drag:", e); }
            }
            // Mark for retrace AFTER geometry is potentially updated
            needsRetrace = true;
        }
    }

    endDrag() {
        this.dragging = false;
        this.isDraggingAngle = false;
    }

    // --- Property Editing ---
    getProperties() {
        // Base properties: position and angle
        return {
            posX: { value: this.pos.x.toFixed(1), label: '位置 X', type: 'number', step: 1 },
            posY: { value: this.pos.y.toFixed(1), label: '位置 Y', type: 'number', step: 1 },
            angleDeg: { value: (this.angleRad * (180 / Math.PI)).toFixed(1), label: '角度 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        let needsGeomUpdate = false;
        let handled = false; // Track if property was handled here

        switch (propName) {
            case 'posX':
                const newX = parseFloat(value);
                if (!isNaN(newX) && Math.abs(this.pos.x - newX) > 1e-6) {
                    this.pos.x = newX;
                    needsGeomUpdate = true; handled = true;
                }
                break;
            case 'posY':
                const newY = parseFloat(value);
                if (!isNaN(newY) && Math.abs(this.pos.y - newY) > 1e-6) {
                    this.pos.y = newY;
                    needsGeomUpdate = true; handled = true;
                }
                break;
            case 'angleDeg':
                const newAngleDeg = parseFloat(value);
                if (!isNaN(newAngleDeg)) {
                    const newAngleRad = newAngleDeg * (Math.PI / 180);
                    if (Math.abs(this.angleRad - newAngleRad) > 1e-6) {
                        this.angleRad = newAngleRad;
                        // Angle change explicitly calls handler BEFORE geometry update
                        if (typeof this.onAngleChanged === 'function') {
                            try { this.onAngleChanged(); } catch (e) { console.error("Error in onAngleChanged:", e); }
                        }
                        needsGeomUpdate = true; handled = true;
                    }
                }
                break;
            case 'notes':
                if (typeof value === 'string' && this.notes !== value) {
                    this.notes = value;
                    sceneModified = true; // Mark scene as modified
                }
                handled = true;
                break;
            // Base class doesn't handle other properties by default
        }

        // If geometry potentially changed, update it
        if (needsGeomUpdate) {
            if (handled) { // Only call if base properties changed
                if (typeof this.onPositionChanged === 'function' && (propName === 'posX' || propName === 'posY')) {
                    try { this.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged:", e); }
                }
                if (typeof this._updateGeometry === 'function') {
                    try { this._updateGeometry(); } catch (e) { console.error("Error in _updateGeometry from setProperty:", e); }
                }
            }
            // Always mark for retrace if any property change might affect optics
            needsRetrace = true;
        }

        return handled; // Return true if handled by base, false otherwise (for subclass override chain)
    }

    // Default angle change handler (subclasses can override)
    // onAngleChanged() {}
    // Default position change handler (subclasses can override)
    // onPositionChanged() {}

    // --- Drawing ---
    // Base draw method (simple circle and direction line) - Subclasses should override
    draw(ctx) {
        // Draw center position
        ctx.fillStyle = this.selected ? 'yellow' : 'gray';
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw direction line
        const dir = Vector.fromAngle(this.angleRad);
        const endPoint = this.pos.add(dir.multiply(15));
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
    }

    // Draw selection highlight (includes angle handle)
    drawSelection(ctx) {
        if (!this.selected) return; // Only draw if selected

        // Draw angle handle
        try {
            const handlePos = this.getAngleHandlePos();
            if (handlePos instanceof Vector) {
                ctx.fillStyle = 'yellow';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(handlePos.x, handlePos.y, this.angleHandleRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Optional line from center to handle
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.lineTo(handlePos.x, handlePos.y);
                ctx.stroke();
            }
        } catch (e) {
            console.error(`Error drawing angle handle for ${this.label}:`, e);
        }

        // Subclasses might add their own selection visuals by overriding or extending this
    }


    // --- Inside GameObject class ---

    toJSON() {
        return {
            type: this.constructor.name, // Crucial for knowing which class to recreate
            id: this.id,
            label: this.label,
            posX: this.pos.x,
            posY: this.pos.y,
            angleDeg: this.angleRad * (180 / Math.PI),
            notes: this.notes
            // Note: We don't save 'selected', 'dragging' etc. as they are transient states
        };
    }

    // --- Reset ---
    // Optional method for components that need to reset state (e.g., Screen)
    reset() {
        // Default does nothing
    }
}

// --- OpticalComponent: Base class for objects interacting with light ---
class OpticalComponent extends GameObject {
    constructor(pos, angleDeg = 0, label = "Optical Component") {
        super(pos, angleDeg, label);
    }

    // --- Abstract Methods for Light Interaction ---

    // Calculate intersection(s) of a ray with this component.
    // rayOrigin: Vector, rayDirection: Vector (normalized)
    // Returns: Array of intersection objects [{ distance, point, normal, surfaceId }, ...]
    //          Normal should point towards the side the ray is coming from.
    //          Returns [] if no intersection.
    intersect(rayOrigin, rayDirection) {
        console.warn(`intersect() method not implemented for ${this.label} (${this.constructor.name})`);
        return [];
    }

    // Handle the interaction of a ray at a specific intersection point.
    // ray: The incoming Ray object.
    // intersectionInfo: The specific intersection object from intersect().
    // RayClass: The Ray constructor (passed in by traceAllRays).
    // Returns: Array of new Ray objects created by the interaction (e.g., reflected, refracted).
    interact(ray, intersectionInfo, RayClass) {
        console.warn(`interact() method not implemented for ${this.label} (${this.constructor.name})`);
        ray.terminate('no_interaction_logic'); // Terminate ray if no logic defined
        return []; // No new rays produced
    }
}


// --- Concrete Component Implementations ---

// --- LaserSource ---
class LaserSource extends GameObject {
    static functionDescription = "发射一束或多束具有特定波长和强度的相干光。";
    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 1.0, numRays = 1, spreadDeg = 0, enabled = true, polarizationAngleDeg = null, ignoreDecay = false, beamDiameter = 10.0, initialBeamWaist = 5.0) {
        super(pos, angleDeg, "激光");
        this.wavelength = wavelength;
        this.intensity = Math.max(0, intensity);
        this.numRays = Math.max(1, numRays);
        this.spreadRad = spreadDeg * (Math.PI / 180);
        this.enabled = enabled;
        this.polarizationAngleRad = (polarizationAngleDeg === null || isNaN(polarizationAngleDeg)) ? null : polarizationAngleDeg * (Math.PI / 180);
        this.ignoreDecay = ignoreDecay;
        // this.arrowAnimationDistance = 0; // For animation state
        this._rayColor = this.calculateRayColor(); // Cache color
        this.gaussianEnabled = true;
        this._rayColor = this.calculateRayColor(); // Cache color
    } // End constructor

    // --- Inside LaserSource class ---

    toJSON() {
        const baseData = super.toJSON(); // Get base properties (pos, angle, id, label, type)
        return {
            ...baseData, // Spread base properties
            // Add LaserSource specific properties
            wavelength: this.wavelength,
            intensity: this.intensity,
            numRays: this.numRays,
            spreadDeg: this.spreadRad * (180 / Math.PI), // Save angle in degrees
            enabled: this.enabled,
            // Save angle in degrees if it exists, otherwise save null
            polarizationAngleDeg: this.polarizationAngleRad === null ? null : this.polarizationAngleRad * (180 / Math.PI),
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter,
            initialBeamWaist: this.initialBeamWaist,
            gaussianEnabled: this.gaussianEnabled
        };
    }

    calculateRayColor() {
        // (Using the simplified wavelength-to-RGB from previous code)
        const wl = this.wavelength; let r = 0, g = 0, b = 0;
        if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); b = 1.0; } else if (wl >= 440 && wl < 490) { g = (wl - 440) / (490 - 440); b = 1.0; } else if (wl >= 490 && wl < 510) { g = 1.0; b = -(wl - 510) / (510 - 490); } else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1.0; } else if (wl >= 580 && wl < 645) { r = 1.0; g = -(wl - 645) / (645 - 580); } else if (wl >= 645 && wl <= 750) { r = 1.0; }
        const f = 0.3 + 0.7 * Math.min(1, this.intensity); r = Math.min(255, Math.max(0, Math.round(r * 255 * f))); g = Math.min(255, Math.max(0, Math.round(g * 255 * f))); b = Math.min(255, Math.max(0, Math.round(b * 255 * f)));
        return `rgb(${r},${g},${b})`;
    }

    // --- RESTORED LaserSource.generateRays (Does NOT use maxRaysPerSource limit) ---
    generateRays(RayClass) {
        // Use this.numRays directly, NOT limited by global setting
        if (!this.enabled || this.numRays <= 0 || typeof RayClass === 'undefined') {
            // console.log(`[LaserSource ${this.id}] generateRays skipped (enabled=${this.enabled}, numRays=${this.numRays})`);
            return [];
        }
        // console.log(`[LaserSource ${this.id}] generateRays STARTING (numRays=${this.numRays}, intensity=${this.intensity.toFixed(3)})`);

        const rays = [];
        const intensityPerRay = this.intensity > 0 && this.numRays > 0 ? this.intensity / this.numRays : 0; // Use this.numRays
        // console.log(`  Intensity per ray: ${intensityPerRay.toFixed(4)}`);

        const halfSpreadRad = this.spreadRad / 2;
        const startAngle = this.angleRad - halfSpreadRad;
        const angleStep = (this.numRays > 1 && this.spreadRad > 1e-9) ? this.spreadRad / (this.numRays - 1) : 0; // Use this.numRays

        for (let i = 0; i < this.numRays; i++) { // Loop using this.numRays
            const angle = (this.numRays === 1) ? this.angleRad : startAngle + i * angleStep; // Use this.numRays
            const direction = Vector.fromAngle(angle);
            if (isNaN(direction.x) || isNaN(direction.y) || direction.magnitudeSquared() < 0.1) {
                console.error(`LaserSource (${this.id}): Invalid angle/direction ray ${i}`); continue;
            }

            try {
                const origin = this.pos.clone();
                if (isNaN(origin.x)) throw new Error("Origin is NaN");

                // --- Calculate Gaussian parameters ONLY if enabled ---
                let rayBeamWaist = null;
                let rayZR = null;
                let useGaussian = this.gaussianEnabled && this.initialBeamWaist !== null && this.initialBeamWaist > 1e-6;
                if (useGaussian) {
                    rayBeamWaist = this.initialBeamWaist;
                    const lambda_meters = this.wavelength * 1e-9;
                    if (lambda_meters > 1e-12) {
                        rayZR = (Math.PI * rayBeamWaist * rayBeamWaist) / lambda_meters;
                        if (isNaN(rayZR)) { useGaussian = false; rayBeamWaist = null; rayZR = null; }
                    } else { useGaussian = false; rayBeamWaist = null; rayZR = null; }
                }

                const newRay = new RayClass(
                    origin, direction, this.wavelength, intensityPerRay,
                    0.0, // Phase
                    0, N_AIR, this.id, this.polarizationAngle, this.ignoreDecay,
                    null, // initialHistory
                    this.beamDiameter,
                    useGaussian ? rayBeamWaist : null,
                    useGaussian ? rayZR : null
                );
                // Basic validation
                if (!newRay || !(newRay instanceof Ray) || isNaN(newRay.origin?.x) || isNaN(newRay.direction?.x)) {
                    console.error(`LaserSource ${this.id}: Failed valid ray idx ${i}`); continue;
                }
                rays.push(newRay);
            } catch (e) { console.error(`LaserSource (${this.id}) Error creating Ray idx ${i}:`, e); }
        }
        // console.log(`[LaserSource ${this.id}] generateRays FINISHED. Returning ${rays.length} rays.`);
        return rays;
    }
    // --- END OF RESTORED METHOD ---

    draw(ctx) {
        const size = 12; const halfHeight = size * 0.4;
        const p1 = this.pos.add(Vector.fromAngle(this.angleRad + Math.PI).multiply(size * 0.6));
        const p2 = this.pos.add(Vector.fromAngle(this.angleRad + Math.PI / 2).multiply(halfHeight));
        const p3 = this.pos.add(Vector.fromAngle(this.angleRad - Math.PI / 2).multiply(halfHeight));
        const p4 = this.pos.add(Vector.fromAngle(this.angleRad).multiply(size * 0.8));

        ctx.fillStyle = this.enabled ? this._rayColor : 'dimgray';
        ctx.strokeStyle = this.selected ? 'yellow' : (this.enabled ? 'white' : '#555'); // Add selection highlight
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p4.x, p4.y); ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
    }

    getBoundingBox() {
        // Simple bounding box, slightly larger than the drawn shape
        const size = 15;
        // More accurate calculation considering rotation might be needed if shape is complex
        const cosA = Math.abs(Math.cos(this.angleRad));
        const sinA = Math.abs(Math.sin(this.angleRad));
        const width = size * cosA + size * 0.8 * sinA; // Approximate rotated width/height
        const height = size * sinA + size * 0.8 * cosA;
        return {
            x: this.pos.x - width / 2,
            y: this.pos.y - height / 2,
            width: width,
            height: height
        };
    }

    // Use raycasting or winding number for accurate point-in-polygon test
    _containsPointBody(point) {
        // Simplified: Use bounding box for now
        const bounds = this.getBoundingBox();
        if (!bounds) return false;
        return point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y && point.y <= bounds.y + bounds.height;
        // TODO: Implement point-in-polygon test using vertices p1,p2,p4,p3
    }


    // --- REPLACEMENT for LaserSource.getProperties (V5 - Conditional Showing/Hiding) ---
    getProperties() {
        // console.log(`[LaserSource ${this.id}] Getting properties...`); // Keep for debugging if needed
        let baseProps;
        try {
            baseProps = super.getProperties();
            if (!baseProps || typeof baseProps !== 'object') baseProps = {};
        } catch (e) { console.error(` !!! Error getting base properties for LaserSource ${this.id}:`, e); baseProps = {}; }

        let polarizationAngleDeg = '';
        try {
            if (this.polarizationAngleRad !== null && typeof this.polarizationAngleRad === 'number' && !isNaN(this.polarizationAngleRad)) {
                polarizationAngleDeg = (this.polarizationAngleRad * (180 / Math.PI)).toFixed(1);
            }
        } catch (e) { console.error(` !!! Error calculating polarizationAngleDeg for LaserSource ${this.id}:`, e); polarizationAngleDeg = 'Error'; }

        // --- Base properties always shown ---
        const props = {
            ...baseProps,
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength ?? DEFAULT_WAVELENGTH_NM, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: (typeof this.intensity === 'number' ? this.intensity.toFixed(2) : '0.00'), label: '强度', type: 'number', min: 0, max: 30, step: 0.1 },
            numRays: { value: this.numRays ?? 1, label: '#射线', type: 'number', min: 1, max: 501, step: 1 },
            spreadDeg: { value: (typeof this.spreadRad === 'number' ? (this.spreadRad * 180 / Math.PI).toFixed(1) : '0.0'), label: '发散角 (°)', type: 'number', min: 0, max: 90, step: 1 },
            polarizationAngleDeg: { value: polarizationAngleDeg, label: '偏振角 (°)', type: 'text', placeholder: '空=非偏振' },
            ignoreDecay: { value: !!this.ignoreDecay, label: '强度不衰减', type: 'checkbox' },
            // --- Mode Switch ---
            gaussianEnabled: { value: !!this.gaussianEnabled, label: '高斯光束模式', type: 'checkbox' },
        };

        // --- Conditionally add beam type specific properties ---
        if (this.gaussianEnabled) {
            // Properties for Gaussian mode
            props.initialBeamWaist = {
                value: (typeof this.initialBeamWaist === 'number' && !isNaN(this.initialBeamWaist) ? this.initialBeamWaist.toFixed(2) : '5.00'), // Default value display
                label: '↳ 腰半径 w₀ (px)',
                type: 'number',
                min: 0.1,
                step: 0.1,
                placeholder: '输入正数'
                // No 'disabled' flag needed as it's only shown when enabled
            };
            // DO NOT add beamDiameter when Gaussian is enabled
        } else {
            // Properties for Geometric (non-Gaussian) mode
            props.beamDiameter = {
                value: (typeof this.beamDiameter === 'number' ? this.beamDiameter.toFixed(1) : '10.0'), // Match default
                label: '光束直径 (px)',
                type: 'number',
                min: 0,
                step: 0.5
                // No 'disabled' flag needed as it's only shown when enabled
            };
            // DO NOT add initialBeamWaist when Gaussian is disabled
        }

        // console.log(`[LaserSource ${this.id}] Properties generated (Gaussian: ${this.gaussianEnabled}):`, props);
        return props;
    }
    // --- END OF REPLACEMENT ---

    setProperty(propName, value) {
        // Let base class handle pos/angle FIRST. If it handles it, we are done.
        if (super.setProperty(propName, value)) {
            // Base class handled pos/angle, and it already called necessary geometry updates and set needsRetrace.
            return true;
        }

        // If base class didn't handle it, check LaserSource specific properties.
        let needsColorUpdate = false;
        let needsRayUpdate = false;

        switch (propName) {
            case 'initialBeamWaist':
                let newWaistValue = null; // Default to null if invalid
                const trimmedValue = String(value).trim();

                if (trimmedValue === '') {
                    // If input is cleared, maybe reset to default or keep null? Let's keep null for now.
                    newWaistValue = null; // Or maybe: newWaistValue = 5.0; // Reset to default? Choose one.
                    console.log("Waist input cleared, setting internal value to null (or default if preferred).");
                } else {
                    const bw = parseFloat(trimmedValue);
                    if (!isNaN(bw) && bw > 1e-6) { // Waist must be positive and valid number
                        newWaistValue = bw;
                    } else {
                        console.warn("Invalid initialBeamWaist input:", value, "- value will not be set.");
                        // Keep the existing value if input is invalid, prevent setting NaN/invalid
                        // Return false or break? Let's break and not update.
                        return false; // Indicate property set failed due to invalid input
                    }
                }

                // Check if the valid new value is different from the current one
                if (this.initialBeamWaist !== newWaistValue) {
                    // Use tolerance for float comparison if both are numbers
                    if (typeof this.initialBeamWaist === 'number' && typeof newWaistValue === 'number' && Math.abs(this.initialBeamWaist - newWaistValue) < 1e-6) {
                        // Difference is too small, don't update
                    } else {
                        this.initialBeamWaist = newWaistValue;
                        needsRayUpdate = true;
                        console.log(`[LaserSource setProperty] Waist updated to: ${this.initialBeamWaist}`);
                    }
                }
                break;
            case 'enabled':
                const newState = !!value;
                if (this.enabled !== newState) { this.enabled = newState; needsRayUpdate = true; }
                break;
            case 'wavelength':
                const newWl = parseFloat(value);
                if (!isNaN(newWl)) { const clamped = Math.max(380, Math.min(750, newWl)); if (Math.abs(clamped - this.wavelength) > 1e-6) { this.wavelength = clamped; needsColorUpdate = true; needsRayUpdate = true; } }
                break;
            case 'intensity':
                const newI = parseFloat(value);
                if (!isNaN(newI)) { const clamped = Math.max(0, newI); if (Math.abs(clamped - this.intensity) > 1e-6) { this.intensity = clamped; needsColorUpdate = true; needsRayUpdate = true; } }
                break;
            case 'numRays':
                const newC = parseInt(value);
                if (!isNaN(newC)) { const clamped = Math.max(1, Math.min(501, newC)); if (clamped !== this.numRays) { this.numRays = clamped; needsRayUpdate = true; } }
                break;
            case 'spreadDeg':
                const newA = parseFloat(value);
                if (!isNaN(newA)) { const clampedRad = Math.max(0, Math.min(90, newA)) * Math.PI / 180; if (Math.abs(clampedRad - this.spreadRad) > 1e-6) { this.spreadRad = clampedRad; needsRayUpdate = true; } }
                break;
            case 'polarizationAngleDeg':
                if (value === null || value === '' || String(value).trim() === '') {
                    if (this.polarizationAngleRad !== null) { this.polarizationAngleRad = null; needsRayUpdate = true; }
                } else {
                    const newAngle = parseFloat(value);
                    if (!isNaN(newAngle)) {
                        const newRad = newAngle * (Math.PI / 180);
                        const normalizedNewRad = Math.atan2(Math.sin(newRad), Math.cos(newRad));
                        const currentRad = this.polarizationAngleRad === null ? -Infinity : this.polarizationAngleRad;
                        if (Math.abs(normalizedNewRad - currentRad) > 1e-6) {
                            this.polarizationAngleRad = normalizedNewRad; needsRayUpdate = true;
                        }
                    } else { console.warn("Invalid polarization angle input:", value); }
                }
                break;
            case 'ignoreDecay':
                const newDecay = !!value;
                if (this.ignoreDecay !== newDecay) { this.ignoreDecay = newDecay; needsRayUpdate = true; }
                break;
            case 'gaussianEnabled':
                // Explicitly check the type and value passed from the checkbox handler
                let newGaussianState;
                if (typeof value === 'boolean') {
                    newGaussianState = value; // Directly use the boolean value
                } else {
                    // Fallback/Warning if the value is not a boolean as expected
                    console.warn(`LaserSource setProperty('gaussianEnabled'): Received non-boolean value:`, value, `(Type: ${typeof value}). Defaulting to false.`);
                    newGaussianState = false; // Or keep current state: newGaussianState = this.gaussianEnabled;
                }

                if (this.gaussianEnabled !== newGaussianState) {
                    this.gaussianEnabled = newGaussianState;
                    needsRayUpdate = true; // Toggling mode requires retrace

                    console.log(`[LaserSource setProperty] Gaussian mode set to: ${this.gaussianEnabled}`); // Debug log

                    // Refresh inspector to reflect the change and potentially update dependent fields visually
                    if (selectedComponent === this) {
                        // We need to update the inspector AFTER the property has been set.
                        // Schedule the update slightly later or rely on the main loop redraw triggering it.
                        // For simplicity, let's call it directly here, but be aware of potential loops if not careful.
                        updateInspector();
                    }
                }
                break;
            default:
                // Property not handled by base class or this class
                console.warn(`LaserSource: Unknown property ${propName}`); // Log warning
                return false; // Indicate not handled
        }

        // Apply updates if specific properties changed
        if (needsColorUpdate) {
            try { this._rayColor = this.calculateRayColor(); } catch (e) { console.error("Error updating LaserSource color:", e); }
        }
        if (needsRayUpdate) {
            needsRetrace = true; // Mark global flag
        }
        return true; // Indicate property was handled (by this class)
    }
}

// --- FanSource ---
class FanSource extends GameObject {
    static functionDescription = "以扇形角度发出多束光线，覆盖一定角域。";
    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 10.0, rayCount = 201, fanAngleDeg = 30, enabled = true, ignoreDecay = false, beamDiameter = 1.0) {
        super(pos, angleDeg, "扇形光源");
        this.wavelength = wavelength;
        this.intensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount); // Use this.rayCount for storage
        this.fanAngleRad = fanAngleDeg * Math.PI / 180;
        this.enabled = enabled;
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = beamDiameter; // Store beamDiameter
        this._rayColor = this.calculateRayColor();
    }

    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            wavelength: this.wavelength,
            intensity: this.intensity,
            rayCount: this.rayCount,
            fanAngleDeg: this.fanAngleRad * 180 / Math.PI,
            enabled: this.enabled,
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter
        };
    }

    calculateRayColor() { // Same as LaserSource
        const wl = this.wavelength; let r = 0, g = 0, b = 0;
        if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); b = 1.0; } else if (wl >= 440 && wl < 490) { g = (wl - 440) / (490 - 440); b = 1.0; } else if (wl >= 490 && wl < 510) { g = 1.0; b = -(wl - 510) / (510 - 490); } else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1.0; } else if (wl >= 580 && wl < 645) { r = 1.0; g = -(wl - 645) / (645 - 580); } else if (wl >= 645 && wl <= 750) { r = 1.0; }
        const f = 0.3 + 0.7 * Math.min(1, this.intensity); r = Math.min(255, Math.max(0, Math.round(r * 255 * f))); g = Math.min(255, Math.max(0, Math.round(g * 255 * f))); b = Math.min(255, Math.max(0, Math.round(b * 255 * f)));
        return `rgb(${r},${g},${b})`;
    }

    generateRays(RayClass) {
        // --- Limit ray count based on global setting ---
        const actualRayCount = Math.min(this.rayCount, window.maxRaysPerSource || 1001); // Use global setting, provide fallback
        // --- End Limit ---

        // Use actualRayCount instead of this.rayCount in the rest of the function logic
        if (!this.enabled || actualRayCount <= 0 || typeof RayClass === 'undefined') { // Use actualRayCount
            // console.log(`[FanSource ${this.id}] generateRays skipped (enabled=${this.enabled}, actualRayCount=${actualRayCount})`); // Less noisy log
            return [];
        }
        // console.log(`[FanSource ${this.id}] generateRays STARTING (actualRayCount=${actualRayCount}, ...)`); // Less noisy log

        const rays = [];
        const intensityPerRay = this.intensity > 0 && actualRayCount > 0 ? this.intensity / actualRayCount : 0; // Use actualRayCount
        // console.log(`  Intensity per ray: ${intensityPerRay.toFixed(4)}`);

        const halfFanAngleRad = this.fanAngleRad / 2;
        const startAngleRad = this.angleRad - halfFanAngleRad;
        // Use actualRayCount for angle step calculation
        const angleStep = actualRayCount > 1 ? this.fanAngleRad / (actualRayCount - 1) : 0;
        // console.log(`  StartAngle=${(startAngleRad * 180 / Math.PI).toFixed(1)}deg, Step=${(angleStep * 180 / Math.PI).toFixed(1)}deg`);

        for (let i = 0; i < actualRayCount; i++) { // Loop up to actualRayCount
            const currentAngleRad = actualRayCount === 1 ? this.angleRad : startAngleRad + i * angleStep; // Use actualRayCount
            if (isNaN(currentAngleRad)) { console.error(`FanSource ${this.id}: NaN angle idx ${i}`); continue; }

            const direction = Vector.fromAngle(currentAngleRad);
            if (isNaN(direction.x) || isNaN(direction.y) || direction.magnitudeSquared() < 0.1) {
                console.error(`FanSource ${this.id}: Invalid direction idx ${i}`); continue;
            }

            const origin = this.pos.clone();
            if (isNaN(origin.x) || isNaN(origin.y)) { console.error(`FanSource ${this.id}: NaN origin`); continue; }

            try {
                const newRay = new RayClass(origin, direction, this.wavelength, intensityPerRay,
                    0.0, // Initial Phase 0.0 for coherence
                    0, N_AIR, this.id, null, this.ignoreDecay, this.beamDiameter // Pass beamDiameter
                );
                // Basic validation (can be removed if confident)
                if (!newRay || !(newRay instanceof Ray) || isNaN(newRay.origin?.x) || isNaN(newRay.direction?.x)) {
                    console.error(`FanSource ${this.id}: Failed to create valid ray idx ${i}`); continue;
                }
                rays.push(newRay);

            } catch (e) { console.error(`FanSource (${this.id}) Error creating Ray idx ${i}:`, e); }
        }
        // console.log(`[FanSource ${this.id}] generateRays FINISHED. Returning ${rays.length} rays (limited by setting: ${window.maxRaysPerSource}).`); // Less noisy log
        return rays;
    }


    draw(ctx) {
        // Draw center point
        ctx.fillStyle = this.enabled ? (this._rayColor || 'magenta') : 'dimgray';
        ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2); ctx.fill();

        // Draw fan arc outline
        const radius = 20; const o = this.angleRad, hfa = this.fanAngleRad / 2, sa = o - hfa, ea = o + hfa;
        ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.8)' : 'rgba(150, 150, 150, 0.6)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.pos.x, this.pos.y);
        // Ensure start/end angles are correct for arc drawing direction
        ctx.arc(this.pos.x, this.pos.y, radius, sa, ea);
        ctx.closePath(); ctx.stroke();
    }

    getBoundingBox() {
        // Bounding box around the center point and the arc
        const radius = 25; // Slightly larger than draw radius
        return {
            x: this.pos.x - radius, y: this.pos.y - radius,
            width: radius * 2, height: radius * 2
        };
    }

    _containsPointBody(point) {
        // Check near center point
        if (!point || !(this.pos instanceof Vector)) return false;
        return point.distanceSquaredTo(this.pos) < 25; // 5px radius
    }


    getProperties() {
        // console.log(`[FanSource ${this.id}] Getting properties...`); // DEBUG
        let baseProps;
        try {
            baseProps = super.getProperties();
            if (!baseProps || typeof baseProps !== 'object') baseProps = {};
        } catch (e) { console.error(` !!! Error getting base properties for FanSource ${this.id}:`, e); baseProps = {}; }

        const props = {
            ...baseProps,
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength ?? DEFAULT_WAVELENGTH_NM, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: (typeof this.intensity === 'number' ? this.intensity.toFixed(2) : '0.00'), label: '强度', type: 'number', min: 0, max: 50, step: 0.1 },
            rayCount: { value: this.rayCount ?? 201, label: '#射线', type: 'number', min: 1, max: 1001, step: 10 }, // Use this.rayCount
            fanAngleDeg: { value: (typeof this.fanAngleRad === 'number' ? (this.fanAngleRad * 180 / Math.PI).toFixed(1) : '30.0'), label: '扇形角 (°)', type: 'number', min: 1, max: 360, step: 1 },
            ignoreDecay: { value: !!this.ignoreDecay, label: '强度不衰减', type: 'checkbox' },
            beamDiameter: { value: (typeof this.beamDiameter === 'number' ? this.beamDiameter.toFixed(1) : '1.0'), label: '光束直径 (px)', type: 'number', min: 0, step: 0.5 },
        };
        // console.log(`[FanSource ${this.id}] Properties generated:`, props); // DEBUG
        return props;
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsColorUpdate = false, needsRayUpdate = false;
        try {
            switch (propName) {
                case 'enabled': const n = !!value; if (this.enabled !== n) { this.enabled = n; needsRayUpdate = true; } break;
                case 'wavelength': const w = parseFloat(value); if (!isNaN(w)) { const c = Math.max(380, Math.min(750, w)); if (Math.abs(c - this.wavelength) > 1e-6) { this.wavelength = c; needsColorUpdate = true; needsRayUpdate = true; } } break;
                case 'intensity': const i = parseFloat(value); if (!isNaN(i)) { const c = Math.max(0, i); if (Math.abs(c - this.intensity) > 1e-6) { this.intensity = c; needsColorUpdate = true; needsRayUpdate = true; } } break;
                case 'rayCount': // Use this.rayCount
                    const r = parseInt(value);
                    if (!isNaN(r)) {
                        const c = Math.max(1, Math.min(1001, r));
                        if (c !== this.rayCount) {
                            this.rayCount = c;
                            needsRayUpdate = true;
                        }
                    }
                    break;
                case 'fanAngleDeg': const a = parseFloat(value); if (!isNaN(a)) { const c = Math.max(1, Math.min(360, a)) * Math.PI / 180; if (Math.abs(c - this.fanAngleRad) > 1e-6) { this.fanAngleRad = c; needsRayUpdate = true; } } break;
                case 'ignoreDecay': const d = !!value; if (this.ignoreDecay !== d) { this.ignoreDecay = d; needsRayUpdate = true; } break;
                case 'beamDiameter': // Add handling for beamDiameter if needed
                    const bd = parseFloat(value);
                    if (!isNaN(bd) && bd >= 0) {
                        if (Math.abs(bd - this.beamDiameter) > 1e-6) {
                            this.beamDiameter = bd;
                            needsRayUpdate = true; // Changing diameter should update rays
                        }
                    }
                    break;
                default: return false;
            }
        } catch (e) { console.error(`Error setting FanSource prop ${propName}:`, e); return false; }

        if (needsColorUpdate) { try { this._rayColor = this.calculateRayColor(); } catch (e) { console.error("Error updating FanSource color:", e); } }
        if (needsRayUpdate) { needsRetrace = true; }
        return true;
    }
}

// --- LineSource ---
class LineSource extends GameObject {
    static functionDescription = "沿线段分布发射多束光线，用于面源近似。";
    constructor(pos, angleDeg = 0, wavelength = DEFAULT_WAVELENGTH_NM, intensity = 10.0, rayCount = 201, length = 50, enabled = true, ignoreDecay = false, beamDiameter = 1.0) {
        super(pos, angleDeg, "线光源");
        this.wavelength = wavelength;
        this.intensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount); // Use this.rayCount for storage
        this.length = Math.max(1, length);
        this.enabled = enabled;
        this.ignoreDecay = ignoreDecay;
        this.beamDiameter = beamDiameter; // Store beamDiameter

        this.p1 = this.pos.clone();
        this.p2 = this.pos.clone();
        this._rayColor = this.calculateRayColor();
        try { this._updateGeometry(); } catch (e) { console.error("Init LineSource Geom Err:", e); }
    }

    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            wavelength: this.wavelength,
            intensity: this.intensity,
            rayCount: this.rayCount,
            length: this.length,
            enabled: this.enabled,
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter
        };
    }

    calculateRayColor() { // Same as LaserSource
        const wl = this.wavelength; let r = 0, g = 0, b = 0;
        if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); b = 1.0; } else if (wl >= 440 && wl < 490) { g = (wl - 440) / (490 - 440); b = 1.0; } else if (wl >= 490 && wl < 510) { g = 1.0; b = -(wl - 510) / (510 - 490); } else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1.0; } else if (wl >= 580 && wl < 645) { r = 1.0; g = -(wl - 645) / (645 - 580); } else if (wl >= 645 && wl <= 750) { r = 1.0; }
        const f = 0.3 + 0.7 * Math.min(1, this.intensity); r = Math.min(255, Math.max(0, Math.round(r * 255 * f))); g = Math.min(255, Math.max(0, Math.round(g * 255 * f))); b = Math.min(255, Math.max(0, Math.round(b * 255 * f)));
        return `rgb(${r},${g},${b})`;
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector) || typeof this.angleRad !== 'number' || typeof this.length !== 'number') return;
        const lineDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = lineDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
    }

    _updateGeometry() {
        console.log(`[LineSource ${this.id}] _updateGeometry called. Pos: (${this.pos?.x.toFixed(1)},${this.pos?.y.toFixed(1)}), Angle: ${(this.angleRad * 180 / Math.PI).toFixed(1)}, Length: ${this.length}`); // DEBUG
        if (!(this.pos instanceof Vector) || typeof this.angleRad !== 'number' || typeof this.length !== 'number') {
            console.error("  !!! Invalid state for geometry update."); // DEBUG
            return;
        }
        const lineDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = lineDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        // --- DEBUG: Log calculated points ---
        if (isNaN(this.p1?.x) || isNaN(this.p2?.x)) {
            console.error(`  !!! Calculated NaN endpoints: p1=(${this.p1?.x}, ${this.p1?.y}), p2=(${this.p2?.x}, ${this.p2?.y})`);
        } else {
            console.log(`  Updated endpoints: p1=(${this.p1.x.toFixed(1)}, ${this.p1.y.toFixed(1)}), p2=(${this.p2.x.toFixed(1)}, ${this.p2.y.toFixed(1)})`); // DEBUG
        }
        // --- END DEBUG ---
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("LineSource AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("LineSource PosChange Err:", e); } }

    generateRays(RayClass) {
        // --- Limit ray count based on global setting ---
        const actualRayCount = Math.min(this.rayCount, window.maxRaysPerSource || 1001); // Use global setting
        // --- End Limit ---

        // Use actualRayCount instead of this.rayCount in the rest of the function logic
        if (!this.enabled || actualRayCount <= 0 || typeof RayClass === 'undefined' || // Use actualRayCount
            !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector) || isNaN(this.p1.x) || isNaN(this.p2.x)) {
            // console.log(`[LineSource ${this.id}] generateRays skipped (enabled=${this.enabled}, actualRayCount=${actualRayCount}, geom valid=${this.p1 instanceof Vector && !isNaN(this.p1.x)})`); // Less noisy
            return [];
        }
        // console.log(`[LineSource ${this.id}] generateRays STARTING (actualRayCount=${actualRayCount}, ...)`); // Less noisy

        const rays = [];
        const intensityPerRay = this.intensity > 0 && actualRayCount > 0 ? this.intensity / actualRayCount : 0; // Use actualRayCount
        // console.log(`  Intensity per ray: ${intensityPerRay.toFixed(4)}`);

        const emissionAngleRad = this.angleRad + Math.PI / 2;
        const emissionDirection = Vector.fromAngle(emissionAngleRad);
        if (isNaN(emissionDirection.x)) { console.error(`LineSource ${this.id}: NaN emission direction`); return []; }
        // console.log(`  Emission Direction: (${emissionDirection.x.toFixed(3)}, ${emissionDirection.y.toFixed(3)})`);

        // Use actualRayCount for interpolation step
        const numSegments = actualRayCount > 1 ? actualRayCount - 1 : 1;

        for (let i = 0; i < actualRayCount; i++) { // Loop up to actualRayCount
            const t = actualRayCount === 1 ? 0.5 : i / numSegments; // Use actualRayCount
            const origin = Vector.lerp(this.p1, this.p2, t);
            if (isNaN(origin.x) || isNaN(origin.y)) { console.error(`LineSource ${this.id}: NaN origin idx ${i}`); continue; }

            try {
                const newRay = new RayClass(origin, emissionDirection.clone(), this.wavelength, intensityPerRay,
                    0.0, // Initial Phase 0.0 for coherence
                    0, N_AIR, this.id, null, this.ignoreDecay, this.beamDiameter // Pass beamDiameter
                );
                // Basic validation
                if (!newRay || !(newRay instanceof Ray) || isNaN(newRay.origin?.x) || isNaN(newRay.direction?.x)) {
                    console.error(`LineSource ${this.id}: Failed to create valid ray idx ${i}`); continue;
                }
                rays.push(newRay);

            } catch (e) { console.error(`LineSource (${this.id}) Error creating Ray idx ${i}:`, e); }
        }
        // console.log(`[LineSource ${this.id}] generateRays FINISHED. Returning ${rays.length} rays (limited by setting: ${window.maxRaysPerSource}).`); // Less noisy
        return rays;
    }


    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = this.enabled ? (this._rayColor || 'magenta') : 'dimgray';
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();

        // Draw center point (optional, but helps locate)
        ctx.fillStyle = this.selected ? 'yellow' : ctx.strokeStyle;
        ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, 3, 0, 2 * Math.PI); ctx.fill();
    }

    getBoundingBox() {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox(); // Fallback
        // Calculate bounding box containing the line segment
        const minX = Math.min(this.p1.x, this.p2.x); const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y); const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5; // Click buffer
        return {
            x: minX - buffer, y: minY - buffer,
            width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        // Point-to-line-segment distance check
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25; // Treat as point if length is near zero

        const p1_to_point = point.subtract(this.p1);
        const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t)); // Clamp projection onto segment

        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25; // 5px radius check
    }

    getProperties() {
        // console.log(`[LineSource ${this.id}] Getting properties...`); // DEBUG
        let baseProps;
        try {
            baseProps = super.getProperties();
            if (!baseProps || typeof baseProps !== 'object') baseProps = {};
        } catch (e) { console.error(` !!! Error getting base properties for LineSource ${this.id}:`, e); baseProps = {}; }

        const props = {
            ...baseProps,
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            wavelength: { value: this.wavelength ?? DEFAULT_WAVELENGTH_NM, label: '波长 (nm)', type: 'number', min: 380, max: 750, step: 1 },
            intensity: { value: (typeof this.intensity === 'number' ? this.intensity.toFixed(2) : '0.00'), label: '强度', type: 'number', min: 0, max: 50, step: 0.1 },
            rayCount: { value: this.rayCount ?? 201, label: '#射线', type: 'number', min: 1, max: 1001, step: 10 }, // Use this.rayCount
            length: { value: (typeof this.length === 'number' ? this.length.toFixed(1) : '50.0'), label: '长度', type: 'number', min: 1, max: 1000, step: 1 },
            ignoreDecay: { value: !!this.ignoreDecay, label: '强度不衰减', type: 'checkbox' },
            beamDiameter: { value: (typeof this.beamDiameter === 'number' ? this.beamDiameter.toFixed(1) : '1.0'), label: '光束直径 (px)', type: 'number', min: 0, step: 0.5 },
        };
        // console.log(`[LineSource ${this.id}] Properties generated:`, props); // DEBUG
        return props;
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsColorUpdate = false, needsRayUpdate = false, needsGeomUpdate = false;
        try {
            switch (propName) {
                case 'enabled': const n = !!value; if (this.enabled !== n) { this.enabled = n; needsRayUpdate = true; } break;
                case 'wavelength': const w = parseFloat(value); if (!isNaN(w)) { const c = Math.max(380, Math.min(750, w)); if (Math.abs(c - this.wavelength) > 1e-6) { this.wavelength = c; needsColorUpdate = true; needsRayUpdate = true; } } break;
                case 'intensity': const i = parseFloat(value); if (!isNaN(i)) { const c = Math.max(0, i); if (Math.abs(c - this.intensity) > 1e-6) { this.intensity = c; needsColorUpdate = true; needsRayUpdate = true; } } break;
                case 'rayCount': // Use this.rayCount
                    const r = parseInt(value);
                    if (!isNaN(r)) {
                        const c = Math.max(1, Math.min(1001, r));
                        if (c !== this.rayCount) {
                            this.rayCount = c;
                            needsRayUpdate = true;
                        }
                    }
                    break;
                case 'length': const l = parseFloat(value); if (!isNaN(l)) { const c = Math.max(1, l); if (Math.abs(c - this.length) > 1e-6) { this.length = c; needsGeomUpdate = true; needsRayUpdate = true; } } break; // Length change also needs ray update for origins
                case 'ignoreDecay': const d = !!value; if (this.ignoreDecay !== d) { this.ignoreDecay = d; needsRayUpdate = true; } break;
                case 'beamDiameter': // Add handling for beamDiameter
                    const bd = parseFloat(value);
                    if (!isNaN(bd) && bd >= 0) {
                        if (Math.abs(bd - this.beamDiameter) > 1e-6) {
                            this.beamDiameter = bd;
                            needsRayUpdate = true;
                        }
                    }
                    break;
                default: return false;
            }
        } catch (e) { console.error(`Error setting LineSource prop ${propName}:`, e); return false; }

        if (needsColorUpdate) { try { this._rayColor = this.calculateRayColor(); } catch (e) { console.error("Error updating LineSource color:", e); } }
        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating LineSource geometry in setProperty:", e); }
            needsRetrace = true; // Geometry change requires retrace
        } else if (needsRayUpdate) { // Only set retrace if geometry didn't already set it
            needsRetrace = true;
        }
        return true;
    }

}



// --- START OF REPLACEMENT: WhiteLightSource Class (V3 - Gaussian Enabled, Defaults Adjusted) ---

class WhiteLightSource extends GameObject {
    static functionDescription = "发射包含可见光谱的宽带光线，可观察色散。";
    constructor(pos, angleDeg = 0, intensity = 75.0, rayCount = 41, spreadDeg = 0, enabled = true, ignoreDecay = false, beamDiameter = 10.0, initialBeamWaist = 5.0) { // Updated Defaults
        // Determine initial label based on default gaussianEnabled = true
        super(pos, angleDeg, "白光光源(高斯)"); // Default label assumes Gaussian

        this.baseIntensity = Math.max(0, intensity);
        this.rayCount = Math.max(1, rayCount); // User-set desired number of rays/directions
        this.spreadRad = spreadDeg * (Math.PI / 180);
        this.enabled = enabled;
        this.ignoreDecay = ignoreDecay;

        // Beam Geometry Properties
        this.beamDiameter = Math.max(0, beamDiameter); // Used in geometric mode
        this.initialBeamWaist = initialBeamWaist; // w0, used in Gaussian mode
        this.gaussianEnabled = true; // <<< DEFAULT to Gaussian mode ON

        // Ensure the label is correct based on the initial gaussianEnabled state
        this.label = this.gaussianEnabled ? "白光光源(高斯)" : "白光光源(几何)";

        // --- Spectrum Definition ---
        // (Using a slightly smoother distribution)
        this.componentWavelengths = [
            { wl: 380, factor: 0.05 }, { wl: 400, factor: 0.2 }, { wl: 420, factor: 0.5 },
            { wl: 440, factor: 0.9 }, { wl: 460, factor: 1.05 }, { wl: 480, factor: 1.1 },
            { wl: 500, factor: 1.2 }, { wl: 520, factor: 1.3 }, { wl: 540, factor: 1.4 },
            { wl: 555, factor: 1.4 }, // Peak slightly shifted
            { wl: 570, factor: 1.3 }, { wl: 590, factor: 1.2 }, { wl: 610, factor: 1.1 },
            { wl: 630, factor: 0.95 }, { wl: 650, factor: 0.8 }, { wl: 670, factor: 0.6 },
            { wl: 690, factor: 0.4 }, { wl: 710, factor: 0.2 }, { wl: 730, factor: 0.1 },
            { wl: 750, factor: 0.05 } // Include edge
        ];
        this.numWavelengths = this.componentWavelengths.length;
        this._updateCumulativeDistribution(); // Calculate distribution table
    }

    // --- Add inside WhiteLightSource class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            baseIntensity: this.baseIntensity, // Use baseIntensity
            rayCount: this.rayCount,
            spreadDeg: this.spreadRad * (180 / Math.PI), // Save in degrees
            enabled: this.enabled,
            ignoreDecay: this.ignoreDecay,
            beamDiameter: this.beamDiameter, 
            initialBeamWaist: this.initialBeamWaist,
            gaussianEnabled: this.gaussianEnabled
            // No need to save spectrum definition, it's constant
        };
    }


    // Helper to calculate cumulative distribution for weighted sampling
    _updateCumulativeDistribution() {
        this.totalIntensityFactorSum = this.componentWavelengths.reduce((sum, comp) => sum + comp.factor, 0);
        if (this.totalIntensityFactorSum <= 1e-9) {
            console.warn("WhiteLightSource: Total intensity factor sum is zero. Using uniform distribution.");
            // Handle uniform distribution: assign equal probability
            this.cumulativeDistribution = this.componentWavelengths.map((comp, index) => ({
                wl: comp.wl,
                cdf: (index + 1) / this.numWavelengths
            }));
        } else {
            this.cumulativeDistribution = [];
            let cumulative = 0;
            for (const comp of this.componentWavelengths) {
                cumulative += comp.factor / this.totalIntensityFactorSum;
                this.cumulativeDistribution.push({ wl: comp.wl, cdf: cumulative });
            }
            // Ensure the last value is exactly 1.0
            if (this.cumulativeDistribution.length > 0) {
                this.cumulativeDistribution[this.cumulativeDistribution.length - 1].cdf = 1.0;
            }
        }
    }

    // Helper to select a wavelength based on the distribution
    _selectWavelength() {
        if (!this.cumulativeDistribution || this.cumulativeDistribution.length === 0) {
            return DEFAULT_WAVELENGTH_NM; // Fallback
        }
        const randomSample = Math.random();
        for (const dist of this.cumulativeDistribution) {
            if (randomSample <= dist.cdf) {
                return dist.wl;
            }
        }
        // Fallback in case of rounding errors (shouldn't happen if last cdf is 1.0)
        return this.cumulativeDistribution[this.cumulativeDistribution.length - 1].wl;
    }

    // --- REPLACEMENT for WhiteLightSource.generateRays (V4 - Implements Fast Mode & Gaussian) ---
    generateRays(RayClass) {
        // Limit number of directions/points by global setting
        const actualRayCount = Math.min(this.rayCount, window.maxRaysPerSource || 1001);

        if (!this.enabled || actualRayCount <= 0 || typeof RayClass === 'undefined' || this.componentWavelengths.length === 0) {
            return [];
        }

        // Check the global fast mode setting
        const useFastMode = window.fastWhiteLightMode === true; // Explicitly check boolean true

        // Log mode being used
        console.log(`[WLS ${this.id}] Generating rays. Mode: ${useFastMode ? 'Fast (Random WL)' : 'Accurate (All WL)'}. Directions: ${actualRayCount}. Gaussian: ${this.gaussianEnabled}.`);

        const rays = [];
        const halfSpreadRad = this.spreadRad / 2;
        const startAngle = this.angleRad - halfSpreadRad;
        const angleStep = (actualRayCount > 1 && this.spreadRad > 1e-9) ? this.spreadRad / (actualRayCount - 1) : 0;

        // Intensity per direction point (used differently in fast vs accurate)
        const intensityPerPoint = this.baseIntensity > 0 && actualRayCount > 0 ? this.baseIntensity / actualRayCount : 0;

        // Ensure totalIntensityFactorSum is valid for accurate mode intensity calculation
        if (!useFastMode && this.totalIntensityFactorSum <= 1e-9) {
            console.error(`WLS ${this.id}: Invalid totalIntensityFactorSum (${this.totalIntensityFactorSum}) in Accurate Mode. Cannot generate rays.`);
            return [];
        }

        for (let i = 0; i < actualRayCount; i++) { // Loop through directions/points
            const angle = (actualRayCount === 1) ? this.angleRad : startAngle + i * angleStep;
            const direction = Vector.fromAngle(angle);
            if (isNaN(direction.x)) continue; // Skip invalid directions
            const origin = this.pos.clone();
            if (isNaN(origin.x)) continue; // Skip invalid origins

            // --- Determine Gaussian Parameters (Common Logic) ---
            let useGaussian = this.gaussianEnabled && this.initialBeamWaist !== null && this.initialBeamWaist > 1e-6;
            let baseBeamWaist = useGaussian ? this.initialBeamWaist : null; // w0

            // --- Helper to get zR for a specific wavelength ---
            const calculateZR = (wavelengthNm) => {
                if (!useGaussian || baseBeamWaist === null) return null;
                const lambda_meters = wavelengthNm * 1e-9;
                if (lambda_meters <= 1e-12) return null; // Invalid wavelength
                const zR = (Math.PI * baseBeamWaist * baseBeamWaist) / lambda_meters;
                return isNaN(zR) ? null : zR;
            };
            // --- End Helper ---


            // === Branch based on Mode ===
            if (useFastMode) {
                // --- FAST MODE: One random ray per direction ---
                const randomWavelength = this._selectWavelength();
                const finalIntensity = intensityPerPoint; // Use average intensity for this point

                if (finalIntensity >= MIN_RAY_INTENSITY || this.ignoreDecay) {
                    const rayZR = calculateZR(randomWavelength);
                    try {
                        const newRay = new RayClass(
                            origin.clone(), direction.clone(), randomWavelength,
                            Math.max(0, finalIntensity), 0.0, // Phase 0.0
                            0, N_AIR, this.id, null, this.ignoreDecay, null,
                            this.beamDiameter, // Pass geometric diameter (Ray handles width calc)
                            baseBeamWaist, // Pass w0 if Gaussian
                            rayZR // Pass zR if Gaussian
                        );
                        if (!newRay || !(newRay instanceof Ray) || isNaN(newRay.origin?.x)) continue;
                        rays.push(newRay);
                    } catch (e) { console.error(`WLS (${this.id}) Error Fast Mode Ray (idx=${i}):`, e); }
                }

            } else {
                // --- ACCURATE MODE: All wavelengths per direction ---
                this.componentWavelengths.forEach(compWl => {
                    // Intensity for this specific wavelength, normalized by factor sum
                    const finalIntensity = intensityPerPoint * (compWl.factor / this.totalIntensityFactorSum);

                    if (finalIntensity >= MIN_RAY_INTENSITY || this.ignoreDecay) {
                        const rayZR = calculateZR(compWl.wl); // Calculate zR for this specific wavelength
                        try {
                            const newRay = new RayClass(
                                origin.clone(), direction.clone(), compWl.wl, // Use component wavelength
                                Math.max(0, finalIntensity), 0.0, // Phase 0.0
                                0, N_AIR, this.id, null, this.ignoreDecay, null,
                                this.beamDiameter, // Pass geometric diameter
                                baseBeamWaist, // Pass w0 if Gaussian
                                rayZR // Pass specific zR if Gaussian
                            );
                            if (!newRay || !(newRay instanceof Ray) || isNaN(newRay.origin?.x)) return; // Skip if invalid ray created
                            rays.push(newRay);
                        } catch (e) { console.error(`WLS (${this.id}) Error Accurate Mode Ray (wl=${compWl.wl}, idx=${i}):`, e); }
                    }
                }); // End wavelength loop (Accurate Mode)
            } // End Mode Branch
        } // End direction loop

        console.log(`[WhiteLightSource ${this.id}] Generated ${rays.length} total rays.`);
        return rays;
    }

    // Draw representation (simple white/gray circle)
    draw(ctx) {
        const drawColor = this.enabled ? `rgb(220, 220, 220)` : 'dimgray';
        ctx.fillStyle = drawColor;
        ctx.strokeStyle = this.selected ? 'yellow' : '#CCCCCC';
        ctx.lineWidth = this.selected ? 2.5 : 1.5; // Slightly thicker when selected

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 8, 0, Math.PI * 2); // Slightly larger radius
        ctx.fill();
        ctx.stroke();

        // Draw spread indicator (similar to FanSource)
        if (this.spreadRad > 1e-3) {
            const radius = 18; const o = this.angleRad; const hfa = this.spreadRad / 2;
            const sa = o - hfa; const ea = o + hfa;
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.pos.x, this.pos.y);
            ctx.arc(this.pos.x, this.pos.y, radius, sa, ea);
            ctx.closePath(); ctx.stroke();
        } else { // Draw direction line for collimated beam
            const dir = Vector.fromAngle(this.angleRad);
            const endPoint = this.pos.add(dir.multiply(18));
            ctx.strokeStyle = '#CCCCCC';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(this.pos.x, this.pos.y); ctx.lineTo(endPoint.x, endPoint.y); ctx.stroke();
        }
    }

    // Bounding box for interaction
    getBoundingBox() {
        const size = 18; // Match drawing radius + buffer
        return { x: this.pos.x - size, y: this.pos.y - size, width: size * 2, height: size * 2 };
    }

    // Point containment check
    _containsPointBody(point) {
        return point.distanceSquaredTo(this.pos) < 18 * 18; // Click radius
    }

    // Get properties for inspector (V3 - Conditional Gaussian/Geometric Params)
    getProperties() {
        const baseProps = super.getProperties(); // Gets posX, posY, angleDeg

        const props = {
            ...baseProps,
            enabled: { value: !!this.enabled, label: '开启', type: 'checkbox' },
            intensity: { value: (typeof this.baseIntensity === 'number' ? this.baseIntensity.toFixed(2) : '75.00'), label: '总强度', type: 'number', min: 0, max: 200, step: 1 },
            rayCount: { value: this.rayCount ?? 41, label: '#方向/点数', type: 'number', min: 1, max: 1001, step: 10, title: '每个方向的光谱分量数取决于精确/快速模式' }, // Updated label slightly
            spreadDeg: { value: (typeof this.spreadRad === 'number' ? (this.spreadRad * 180 / Math.PI).toFixed(1) : '0.0'), label: '发散角 (°)', type: 'number', min: 0, max: 180, step: 1 },
            ignoreDecay: { value: !!this.ignoreDecay, label: '强度不衰减', type: 'checkbox' },
            // --- Gaussian Mode Toggle ---
            gaussianEnabled: { value: !!this.gaussianEnabled, label: '高斯光束模式', type: 'checkbox' },
        };

        // --- Conditionally add beam geometry properties ---
        if (this.gaussianEnabled) {
            props.initialBeamWaist = {
                value: (typeof this.initialBeamWaist === 'number' && !isNaN(this.initialBeamWaist) ? this.initialBeamWaist.toFixed(2) : '5.00'),
                label: '↳ 腰半径 w₀ (px)', type: 'number', min: 0.1, step: 0.1, placeholder: '输入正数'
            };
            // DO NOT show beamDiameter when Gaussian is enabled
        } else {
            props.beamDiameter = {
                value: (typeof this.beamDiameter === 'number' ? this.beamDiameter.toFixed(1) : '10.0'),
                label: '光束直径 (px)', type: 'number', min: 0, step: 0.5
            };
            // DO NOT show initialBeamWaist when Gaussian is disabled
        }

        // Read-only info about the spectrum simulation
        props.wavelengthInfo = { value: `${this.numWavelengths}波长(模拟光谱)`, label: '光谱模拟', type: 'text', readonly: true };

        return props;
    }

    // Set properties from inspector (V3 - Handle Gaussian Toggle and Params)
    setProperty(propName, value) {
        // Let base class handle pos/angle first
        if (super.setProperty(propName, value)) { return true; }

        let needsRayUpdate = false; // Flag if ray generation logic needs re-run
        let needsInspectorRefresh = false; // Flag if UI needs update (e.g., label change)

        switch (propName) {
            case 'enabled': const ne = !!value; if (this.enabled !== ne) { this.enabled = ne; needsRayUpdate = true; } break;
            case 'intensity': const ni = parseFloat(value); if (!isNaN(ni)) { const c = Math.max(0, ni); if (Math.abs(c - this.baseIntensity) > 1e-6) { this.baseIntensity = c; needsRayUpdate = true; } } break;
            case 'rayCount': const nc = parseInt(value); if (!isNaN(nc)) { const c = Math.max(1, Math.min(1001, nc)); if (c !== this.rayCount) { this.rayCount = c; needsRayUpdate = true; } } break;
            case 'spreadDeg': const ns = parseFloat(value); if (!isNaN(ns)) { const r = Math.max(0, Math.min(180, ns)) * Math.PI / 180; if (Math.abs(r - this.spreadRad) > 1e-6) { this.spreadRad = r; needsRayUpdate = true; } } break;
            case 'ignoreDecay': const nd = !!value; if (this.ignoreDecay !== nd) { this.ignoreDecay = nd; needsRayUpdate = true; } break;
            case 'gaussianEnabled': // --- Handle Gaussian Toggle ---
                const newGaussianState = !!value;
                if (this.gaussianEnabled !== newGaussianState) {
                    this.gaussianEnabled = newGaussianState;
                    this.label = this.gaussianEnabled ? "白光光源(高斯)" : "白光光源(几何)"; // Update label
                    needsRayUpdate = true;
                    needsInspectorRefresh = true; // Need to refresh UI to show/hide correct params
                }
                break;
            case 'initialBeamWaist': // --- Handle Waist Input (only relevant if Gaussian enabled) ---
                let newWaistValue = null;
                const trimmedValueWaist = String(value).trim();
                if (trimmedValueWaist === '') { newWaistValue = null; /* Or maybe default: 5.0? */ }
                else { const bw = parseFloat(trimmedValueWaist); if (!isNaN(bw) && bw > 1e-6) { newWaistValue = bw; } else { return false; /* Invalid input */ } }
                if (this.initialBeamWaist !== newWaistValue) { if (!(typeof this.initialBeamWaist === 'number' && typeof newWaistValue === 'number' && Math.abs(this.initialBeamWaist - newWaistValue) < 1e-6)) { this.initialBeamWaist = newWaistValue; if (this.gaussianEnabled) needsRayUpdate = true; } }
                break;
            case 'beamDiameter': // --- Handle Diameter Input (only relevant if Gaussian disabled) ---
                const bd = parseFloat(value);
                if (!isNaN(bd) && bd >= 0) { if (Math.abs(bd - this.beamDiameter) > 1e-6) { this.beamDiameter = bd; if (!this.gaussianEnabled) needsRayUpdate = true; } }
                break;
            case 'wavelengthInfo': return true; // Read-only property
            default: return false; // Property not handled here
        }

        // If ray generation parameters changed, flag for retrace
        if (needsRayUpdate) { needsRetrace = true; }

        // If inspector needs refresh (due to label change or conditional props), update it
        if (needsInspectorRefresh && selectedComponent === this) {
            updateInspector();
        }

        return true; // Indicate property was handled
    }
}

// --- END OF REPLACEMENT: WhiteLightSource Class ---



// --- Mirror (Plane Mirror) ---
class Mirror extends OpticalComponent {
    static functionDescription = "依据反射定律反射入射光线，改变光路方向。";
    constructor(pos, length = 100, angleDeg = 0) {
        super(pos, angleDeg, "反射镜");
        this.length = Math.max(1, length);
        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2); // Normal perpendicular to mirror line
        try { this._updateGeometry(); } catch (e) { console.error("Init Mirror Geom Err:", e); }
    }

    // --- Add inside Mirror class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        // Normal is perpendicular to the segment p1->p2
        const edgeVec = this.p2.subtract(this.p1);
        this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize(); // Rotated 90 deg CCW
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Mirror AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Mirror PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        ctx.strokeStyle = 'silver';
        ctx.lineWidth = this.selected ? 4 : 3; // Thicker when selected
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();

        // Draw hatching on the back side
        const backOffset = this.normal.multiply(-5); // Offset opposite to normal
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const numHatches = Math.max(3, Math.floor(this.length / 10));
        for (let i = 0; i <= numHatches; i++) {
            const t = i / numHatches;
            const start = Vector.lerp(this.p1, this.p2, t); // Point on mirror surface
            const end = start.add(backOffset); // Point on back
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        }
    }

    getBoundingBox() { // Same as LineSource
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x); const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y); const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Same as LineSource
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(this.p1); const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq; const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25;
    }

    intersect(rayOrigin, rayDirection) {
        if (!(this.p1 instanceof Vector)) return []; // Geometry not ready
        // Ray-line segment intersection test
        const v1 = rayOrigin.subtract(this.p1); // Vector from p1 to ray origin
        const v2 = this.p2.subtract(this.p1);     // Vector along the mirror segment
        const v3 = new Vector(-rayDirection.y, rayDirection.x); // Normal to ray direction

        const dot_v2_v3 = v2.dot(v3);

        if (Math.abs(dot_v2_v3) < 1e-9) { return []; } // Parallel or collinear

        const t1 = v2.cross(v1) / dot_v2_v3; // Distance along the ray
        const t2 = v1.dot(v3) / dot_v2_v3; // Parameter along the segment (0 to 1)

        // Check if intersection is valid
        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) { // t1 > 0 (in front), 0 <= t2 <= 1 (on segment)
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));

            // Determine normal: should point towards the incoming ray
            let surfaceNormal = this.normal.clone();
            // If ray direction and default normal point roughly in same direction, flip normal
            if (rayDirection.dot(surfaceNormal) > 0) {
                surfaceNormal = surfaceNormal.multiply(-1);
            }

            return [{
                distance: t1,
                point: intersectionPoint,
                normal: surfaceNormal,
                surfaceId: 'front' // Simple identifier
            }];
        }
        return []; // No valid intersection
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal; // Normal pointing towards incoming ray

        // Reflection law: R = I - 2 * (I · N) * N
        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();

        // Create the reflected ray
        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6)); // Offset slightly
        // Assume perfect reflection for intensity unless ignoreDecay is false (could add reflectivity property)
        const reflectedIntensity = ray.ignoreDecay ? ray.intensity : ray.intensity * 0.99; // Simulate slight loss if not ignoring decay
        const reflectedPhase = ray.phase + Math.PI; // Simple pi phase shift on reflection

        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                reflectedRay = new RayClass(
                    newOrigin,
                    reflectedDirection,
                    ray.wavelengthNm,
                    reflectedIntensity,
                    reflectedPhase,
                    nextBounces,
                    ray.mediumRefractiveIndex, // Stays in the same medium
                    ray.sourceId, // Inherit source ID
                    ray.polarizationAngle, // TODO: Handle polarization change on reflection
                    ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()]) // Pass history + new origin
                );
            } catch (e) { console.error(`Error creating reflected Ray in Mirror (${this.id}):`, e); }
        }

        ray.terminate('reflected'); // Terminate the original ray segment

        return reflectedRay ? [reflectedRay] : []; // Return array with the new ray if created
    }

    // --- REPLACEMENT for Mirror.getProperties ---
    getProperties() {
        const baseProps = super.getProperties(); // posX, posY, angleDeg
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 1, step: 1, title: '平面反射镜的长度' }
        };
    }
    // --- END REPLACEMENT ---

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l; needsGeomUpdate = true;
                }
                break;
            default: console.warn(`Mirror: Unknown property ${propName}`); break;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Mirror geometry:", e); }
            needsRetrace = true;
        }
    }
}

// --- START OF SphericalMirror CLASS ---
// --- START OF REVISED SphericalMirror CLASS (Using Central Angle) ---

class SphericalMirror extends OpticalComponent {
    static functionDescription = "具有球面曲率的反射镜，聚焦或发散光线。";
    constructor(pos, radiusOfCurvature = 200, centralAngleDeg = 90, angleDeg = 0) { // Changed diameter to centralAngleDeg
        let label = "球面镜";
        if (radiusOfCurvature > 0) label = "凹面镜";
        else if (radiusOfCurvature < 0) label = "凸面镜";
        else label = "平面镜(r=inf)";

        super(pos, angleDeg, label);

        this.radiusOfCurvature = radiusOfCurvature === 0 ? Infinity : radiusOfCurvature;
        // Use central angle to define the arc size (0 to 360 degrees)
        this.centralAngleRad = Math.max(1e-6, Math.min(2 * Math.PI, centralAngleDeg * Math.PI / 180)); // Store in radians, clamp >0 to 360

        // Geometry cache
        this.centerOfCurvature = null;
        this.arcPoint1 = null;
        this.arcPoint2 = null;
        this.isPlane = Math.abs(this.radiusOfCurvature) === Infinity;

        try { this._updateGeometry(); } catch (e) { console.error("Init SphericalMirror geom error:", e); }
    }

    // --- Add inside SphericalMirror class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            // Save Infinity directly, JSON.stringify handles it (becomes null)
            radiusOfCurvature: this.radiusOfCurvature,
            centralAngleDeg: this.centralAngleRad * (180 / Math.PI) // Save in degrees
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.isPlane = Math.abs(this.radiusOfCurvature) === Infinity;

        if (this.isPlane) this.label = "平面镜(r=inf)";
        else this.label = this.radiusOfCurvature > 0 ? "凹面镜" : "凸面镜";

        const axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);

        if (this.isPlane) {
            const effectiveDiameter = 100; // Fixed effective size for plane mirrors from this class
            const halfLenVec = Vector.fromAngle(this.angleRad).multiply(effectiveDiameter / 2);
            this.arcPoint1 = this.pos.subtract(halfLenVec);
            this.arcPoint2 = this.pos.add(halfLenVec);
            this.centerOfCurvature = null;
        } else {
            // Spherical mirror: Calculate endpoints based on central angle
            this.centerOfCurvature = this.pos.add(axisDirection.multiply(this.radiusOfCurvature));
            const r = Math.abs(this.radiusOfCurvature);
            const halfAngle = this.centralAngleRad / 2.0;

            // Calculate vectors from Center of Curvature to arc endpoints
            const vec1 = axisDirection.rotate(-halfAngle).multiply(-this.radiusOfCurvature); // Use actual RoC sign
            const vec2 = axisDirection.rotate(halfAngle).multiply(-this.radiusOfCurvature); // Use actual RoC sign

            this.arcPoint1 = this.centerOfCurvature.add(vec1);
            this.arcPoint2 = this.centerOfCurvature.add(vec2);
        }

        // Safety check
        if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector) || isNaN(this.arcPoint1.x) || isNaN(this.arcPoint2.x)) {
            console.error(`SphericalMirror (${this.id}): NaN in calculated arc endpoints after angle update.`);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`SphericalMirror (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`SphericalMirror (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return;

        ctx.strokeStyle = this.selected ? 'yellow' : 'silver';
        ctx.lineWidth = this.selected ? 3 : 2;

        if (this.isPlane) {
            // Draw plane mirror line
            ctx.beginPath();
            ctx.moveTo(this.arcPoint1.x, this.arcPoint1.y);
            ctx.lineTo(this.arcPoint2.x, this.arcPoint2.y);
            ctx.stroke();
            // Draw hatching for plane mirror
            const backNormal = Vector.fromAngle(this.angleRad - Math.PI / 2);
            const backOffset = backNormal.multiply(5);
            ctx.strokeStyle = 'dimgray'; ctx.lineWidth = 1;
            const effectiveDiameter = this.arcPoint1.distanceTo(this.arcPoint2);
            const numHatches = Math.max(3, Math.floor(effectiveDiameter / 10));
            for (let i = 0; i <= numHatches; i++) {
                const t = i / numHatches;
                const start = Vector.lerp(this.arcPoint1, this.arcPoint2, t);
                const end = start.add(backOffset);
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
            }

        } else if (this.centerOfCurvature instanceof Vector) {
            // Draw spherical mirror arc
            const r = Math.abs(this.radiusOfCurvature);
            const startVec = this.arcPoint1.subtract(this.centerOfCurvature);
            const endVec = this.arcPoint2.subtract(this.centerOfCurvature);
            const startAngle = startVec.angle();
            let endAngle = endVec.angle();

            // Determine sweep direction based on R sign (concave R>0, convex R<0)
            const sweepAnticlockwise = (this.radiusOfCurvature > 0);

            // Adjust endAngle if the arc crosses the +/- PI boundary
            // Correctly handle the sweep direction for arc drawing
            if (sweepAnticlockwise && endAngle < startAngle) { endAngle += 2 * Math.PI; }
            if (!sweepAnticlockwise && endAngle > startAngle) { endAngle -= 2 * Math.PI; }

            // Handle full circle case explicitly
            if (Math.abs(this.centralAngleRad - 2 * Math.PI) < 1e-9) {
                ctx.beginPath();
                ctx.arc(this.centerOfCurvature.x, this.centerOfCurvature.y, r, 0, 2 * Math.PI);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(this.centerOfCurvature.x, this.centerOfCurvature.y, r, startAngle, endAngle, !sweepAnticlockwise);
                ctx.stroke();
            }


            // Draw hatching on the back side (approximate based on chord)
            const backNormal = Vector.fromAngle(this.angleRad - Math.PI / 2);
            const backOffset = backNormal.multiply(5);
            ctx.strokeStyle = 'dimgray';
            ctx.lineWidth = 1;
            const chordLength = this.arcPoint1.distanceTo(this.arcPoint2);
            const numHatches = Math.max(3, Math.floor(chordLength / 10));
            const chordVec = this.arcPoint2.subtract(this.arcPoint1);
            for (let i = 0; i <= numHatches; i++) {
                const t = i / numHatches;
                const approxChordPos = this.arcPoint1.add(chordVec.multiply(t));
                const start = approxChordPos;
                const end = start.add(backOffset);
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
            }
        }
    }

    getBoundingBox() {
        if (this.isPlane || !(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) {
            const effectiveDiameter = 100; // Match plane mirror drawing size
            const halfLenVec = Vector.fromAngle(this.angleRad).multiply(effectiveDiameter / 2);
            const p1_total = this.pos.subtract(halfLenVec); const p2_total = this.pos.add(halfLenVec);
            const minX = Math.min(p1_total.x, p2_total.x); const maxX = Math.max(p1_total.x, p2_total.x);
            const minY = Math.min(p1_total.y, p2_total.y); const maxY = Math.max(p1_total.y, p2_total.y);
            const buffer = 5;
            return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
        }

        // BBox for arc includes endpoints and potentially the center point (this.pos)
        let minX = Math.min(this.arcPoint1.x, this.arcPoint2.x);
        let maxX = Math.max(this.arcPoint1.x, this.arcPoint2.x);
        let minY = Math.min(this.arcPoint1.y, this.arcPoint2.y);
        let maxY = Math.max(this.arcPoint1.y, this.arcPoint2.y);

        minX = Math.min(minX, this.pos.x); maxX = Math.max(maxX, this.pos.x);
        minY = Math.min(minY, this.pos.y); maxY = Math.max(maxY, this.pos.y);

        const buffer = 3;
        return {
            x: minX - buffer, y: minY - buffer,
            width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer
        };
    }

    _containsPointBody(point) {
        if (!point || !(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return false;
        const p1 = this.arcPoint1; const p2 = this.arcPoint2;
        const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9 && !this.isPlane) return point.distanceSquaredTo(this.pos) < 25;

        const p1_to_point = point.subtract(p1); const p1_to_p2 = p2.subtract(p1);
        const t = lenSq < 1e-9 ? 0.5 : p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));

        const closestPointOnChord = p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPointOnChord) < 100; // 10px tolerance from chord
    }

    intersect(rayOrigin, rayDirection) {
        if (this.isPlane) {
            if (!(this.arcPoint1 instanceof Vector) || !(this.arcPoint2 instanceof Vector)) return [];
            const p1 = this.arcPoint1; const p2 = this.arcPoint2;
            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3); if (Math.abs(dot_v2_v3) < 1e-9) { return []; }
            const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
            if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1 + 1e-6) { // Allow slight tolerance for segment check
                const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                const edgeVec = p2.subtract(p1);
                let surfaceNormal = new Vector(-edgeVec.y, edgeVec.x).normalize();
                if (rayDirection.dot(surfaceNormal) > 1e-9) { surfaceNormal = surfaceNormal.multiply(-1); }
                if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) { return []; }
                return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'plane' }];
            }
            return [];

        } else {
            if (!(this.centerOfCurvature instanceof Vector)) return [];
            const C = this.centerOfCurvature;
            const r = Math.abs(this.radiusOfCurvature);
            const O = rayOrigin; const D = rayDirection;
            const OC = O.subtract(C);

            const a = D.dot(D); const b = 2.0 * OC.dot(D); const c = OC.dot(OC) - r * r;
            const discriminant = b * b - 4.0 * a * c;

            if (discriminant < 1e-9) return []; // No real intersection or tangent

            const sqrtDiscriminant = Math.sqrt(discriminant);
            const t_minus = (-b - sqrtDiscriminant) / (2.0 * a);
            const t_plus = (-b + sqrtDiscriminant) / (2.0 * a);

            let validHits = [];
            for (const t of [t_minus, t_plus]) {
                if (t > 1e-6) {
                    const hitPoint = O.add(D.multiply(t));
                    const hitVec = hitPoint.subtract(C);

                    if (Math.abs(hitVec.magnitudeSquared() - r * r) > 1e-3) continue; // Verify point is on circle (tolerance)

                    // Check if the angle of the hit point lies within the arc's angle range
                    const hitAngle = Math.atan2(hitVec.y, hitVec.x);
                    const startVec = this.arcPoint1.subtract(C);
                    const endVec = this.arcPoint2.subtract(C);
                    const startAngle = Math.atan2(startVec.y, startVec.x);
                    const endAngle = Math.atan2(endVec.y, endVec.x);

                    const twoPi = 2 * Math.PI;
                    const tolerance = 1e-4; // Angle tolerance

                    // Normalize angles to [0, 2*PI) for comparison
                    const normalizeAngle = (angle) => (angle % twoPi + twoPi) % twoPi;
                    const normHit = normalizeAngle(hitAngle);
                    let normStart = normalizeAngle(startAngle);
                    let normEnd = normalizeAngle(endAngle);

                    let isBetween = false;
                    // Handle the case where the arc crosses the 0-radian axis
                    if (normStart > normEnd + tolerance) { // e.g., starts at 350 deg, ends at 10 deg
                        isBetween = (normHit >= normStart - tolerance || normHit <= normEnd + tolerance);
                    } else { // Normal case, e.g., starts at 10 deg, ends at 80 deg
                        isBetween = (normHit >= normStart - tolerance && normHit <= normEnd + tolerance);
                    }
                    // Special case for near 360 degree arc
                    if (Math.abs(this.centralAngleRad - twoPi) < tolerance) isBetween = true;

                    if (isBetween) {
                        let normal = hitPoint.subtract(C).normalize();
                        if (this.radiusOfCurvature > 0) normal = normal.multiply(-1); // Concave R>0, normal points outward
                        if (rayDirection.dot(normal) > 1e-9) { normal = normal.multiply(-1); } // Ensure normal points towards ray

                        if (isNaN(hitPoint.x) || isNaN(normal.x)) continue;
                        validHits.push({ distance: t, point: hitPoint, normal: normal, surfaceId: 'arc' });
                    }
                }
            }

            if (validHits.length === 0) return [];
            validHits.sort((a, b) => a.distance - b.distance);
            return [validHits[0]];
        }
    }

    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal;

        if (!(hitPoint instanceof Vector) || !(normal instanceof Vector) || isNaN(hitPoint.x) || isNaN(normal.x) || normal.magnitudeSquared() < 0.5) {
            console.error(`SphericalMirror (${this.id}): Invalid geometry for interact.`);
            ray.terminate('internal_error'); return [];
        }

        const I = ray.direction;
        if (isNaN(I.x)) { ray.terminate('nan_direction_interact'); return []; }

        const N = normal;
        const dot_I_N = I.dot(N);
        let reflectedDirection = I.subtract(N.multiply(2 * dot_I_N));
        const magSq = reflectedDirection.magnitudeSquared();

        if (magSq < 1e-9) { // Handle reflection exactly back along normal if I is parallel to N
            console.warn(`SphericalMirror (${this.id}): Near-zero reflection vector. Reflecting along normal.`);
            reflectedDirection = N.multiply(-1); // Reflect back opposite to normal
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        } else {
            reflectedDirection = reflectedDirection.divide(Math.sqrt(magSq));
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        }

        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.intensity;
        const reflectedPhase = ray.phase + Math.PI;
        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;

        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                if (isNaN(newOrigin.x)) throw new Error("NaN origin");
                reflectedRay = new RayClass(
                    newOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, reflectedPhase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating reflected Ray in SphericalMirror (${this.id}):`, e); }
        }

        ray.terminate('reflected_spherical');
        return reflectedRay ? [reflectedRay] : [];
    }

    // --- REPLACEMENT for SphericalMirror.getProperties ---
    getProperties() {
        const baseProps = super.getProperties(); // posX, posY, angleDeg
        return {
            ...baseProps,
            radiusOfCurvature: {
                value: Math.abs(this.radiusOfCurvature) === Infinity ? 'Infinity' : this.radiusOfCurvature.toFixed(1),
                label: '曲率半径 (R)', type: 'number', // Use number input
                step: 10, // Sensible step
                title: '球面镜的曲率半径 (R > 0: 凹面镜, R < 0: 凸面镜, Infinity: 平面镜)',
                placeholder: 'R>0凹, R<0凸, Infinity'
            },
            centralAngleDeg: {
                value: (this.centralAngleRad * (180 / Math.PI)).toFixed(1),
                label: '弧度角 (°)', type: 'number', min: 1, max: 360, step: 1, title: '镜面弧线对应的圆心角 (1°-360°)'
            },
            focalLength: { // Display calculated focal length (read-only)
                value: (Math.abs(this.radiusOfCurvature) === Infinity || Math.abs(this.radiusOfCurvature) < 1e-6) ? '∞' : (this.radiusOfCurvature / 2.0).toFixed(1),
                label: '焦距 (f=R/2)', type: 'text', readonly: true, title: '球面镜的焦距 (近似值 f=R/2)'
            }
        };
    }
    // --- END REPLACEMENT ---

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'radiusOfCurvature':
                let r;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { r = Infinity; }
                else { r = parseFloat(value); }
                if (!isNaN(r)) {
                    const newR = (r === 0) ? Infinity : r;
                    if (newR !== this.radiusOfCurvature) {
                        this.radiusOfCurvature = newR; needsGeomUpdate = true;
                    }
                } else { console.warn("Invalid radius of curvature input:", value); }
                break;
            case 'centralAngleDeg':
                const angleDeg = parseFloat(value);
                if (!isNaN(angleDeg)) {
                    const clampedAngleRad = Math.max(1 * Math.PI / 180, Math.min(2 * Math.PI, angleDeg * Math.PI / 180)); // Clamp 1-360 deg
                    if (Math.abs(clampedAngleRad - this.centralAngleRad) > 1e-9) {
                        this.centralAngleRad = clampedAngleRad;
                        needsGeomUpdate = true;
                    }
                } else { console.warn("Invalid central angle input:", value); }
                break;
            default:
                return false; // Not handled
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating SphericalMirror geometry:", e); }
            needsRetrace = true;
        }
        return true; // Handled
    }
}

// --- END OF REVISED SphericalMirror CLASS ---

// --- START OF ParabolicMirror CLASS ---

class ParabolicMirror extends OpticalComponent {
    static functionDescription = "抛物面反射镜将平行光聚焦至焦点或反之。";
    constructor(pos, focalLength = 100, diameter = 100, angleDeg = 0) {
        // Parabola equation relative to vertex: y^2 = 4*f*x (if axis is x-axis)
        // Or x^2 = 4*f*y (if axis is y-axis)
        // We'll use vertex at origin, axis along local x-axis for calculation ease
        // focalLength (f) > 0 means concave (opening towards +x)
        // We need to handle angleDeg correctly to orient it in the world.
        super(pos, angleDeg, focalLength > 0 ? "抛物面凹镜" : "抛物面凸镜?"); // TODO: Convex parabola? Less common.
        if (focalLength <= 0) {
            console.warn("ParabolicMirror currently only supports positive focal lengths (concave).");
            focalLength = 100; // Default to concave
            this.label = "抛物面凹镜";
        }

        this.focalLength = focalLength; // Distance from vertex to focus (f > 0)
        this.diameter = Math.max(10, diameter); // Diameter of the opening (aperture)

        // Geometry Cache
        this.vertex = this.pos.clone(); // Vertex position in world coordinates
        this.focus = null; // Focus position in world coordinates
        this.p1 = null; // Endpoint 1 of the parabola segment
        this.p2 = null; // Endpoint 2 of the parabola segment
        this.axisDirection = null; // Direction of the optical axis (from vertex towards opening)
        this.localXAxis = null; // Local coordinate system axis
        this.localYAxis = null; // Local coordinate system axis

        try { this._updateGeometry(); } catch (e) { console.error("Init ParabolicMirror geom error:", e); }
    }

    // --- Add inside ParabolicMirror class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            focalLength: this.focalLength,
            diameter: this.diameter
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector) || this.focalLength <= 0) return; // Ensure valid state

        this.vertex = this.pos.clone(); // Vertex is the reference point

        // Local x-axis is the optical axis, pointing *away* from the focus into the mirror opening
        this.localXAxis = Vector.fromAngle(this.angleRad);
        // Local y-axis is perpendicular to the optical axis
        this.localYAxis = new Vector(-this.localXAxis.y, this.localXAxis.x);

        // Focus position: vertex - localXAxis * focalLength
        this.focus = this.vertex.subtract(this.localXAxis.multiply(this.focalLength));
        this.axisDirection = this.localXAxis; // Keep track of axis

        // Calculate endpoints based on diameter (y_local = +/- diameter / 2)
        const y_local = this.diameter / 2.0;
        // Find corresponding x_local using y^2 = 4*f*x  =>  x = y^2 / (4*f)
        const x_local = (y_local * y_local) / (4.0 * this.focalLength);

        // Convert local endpoint coordinates to world coordinates
        const localP1 = new Vector(x_local, -y_local);
        const localP2 = new Vector(x_local, y_local);

        this.p1 = this.vertex.add(this.localXAxis.multiply(localP1.x)).add(this.localYAxis.multiply(localP1.y));
        this.p2 = this.vertex.add(this.localXAxis.multiply(localP2.x)).add(this.localYAxis.multiply(localP2.y));

        // Safety check
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector) || isNaN(this.p1.x) || isNaN(this.p2.x)) {
            console.error(`ParabolicMirror (${this.id}): NaN in calculated endpoints.`);
        }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`ParabolicMirror (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`ParabolicMirror (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.vertex || !this.p1 || !this.p2) return;

        ctx.strokeStyle = this.selected ? 'yellow' : '#FFC080'; // Orange-ish silver
        ctx.lineWidth = this.selected ? 3 : 2;

        // Draw the parabolic curve segment
        // We need to draw the curve between p1 and p2 with the vertex at this.pos
        // Use quadraticCurveTo or Bezier curves for approximation, or plot points
        const numSegments = 20; // Number of line segments to approximate the curve
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        for (let i = 1; i <= numSegments; i++) {
            const t = i / numSegments;
            // Interpolate y_local from -diameter/2 to +diameter/2
            const y_local = -this.diameter / 2.0 + t * this.diameter;
            // Calculate corresponding x_local
            const x_local = (y_local * y_local) / (4.0 * this.focalLength);
            // Convert to world coordinates
            const worldPoint = this.vertex.add(this.localXAxis.multiply(x_local)).add(this.localYAxis.multiply(y_local));
            ctx.lineTo(worldPoint.x, worldPoint.y);
        }
        ctx.stroke();

        // Draw hatching on the back side (approximate)
        const backNormal = this.localXAxis.multiply(-1); // Opposite of axis dir
        const backOffset = backNormal.multiply(5);
        ctx.strokeStyle = 'dimgray';
        ctx.lineWidth = 1;
        const numHatches = Math.max(3, Math.floor(this.diameter / 10));
        const chordVec = this.p2.subtract(this.p1);
        for (let i = 0; i <= numHatches; i++) {
            const t = i / numHatches;
            const approxPos = this.p1.add(chordVec.multiply(t)); // Approx pos on chord
            // Ideally find point on parabola corresponding to t, but chord is simpler for hatching
            const start = approxPos;
            const end = start.add(backOffset);
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        }

        // Optionally draw Focus point
        if (this.focus && this.selected) {
            ctx.fillStyle = 'red';
            ctx.beginPath(); ctx.arc(this.focus.x, this.focus.y, 3, 0, 2 * Math.PI); ctx.fill();
        }
    }

    getBoundingBox() {
        // BBox includes vertex and endpoints
        if (!this.vertex || !this.p1 || !this.p2) return super.getBoundingBox();

        let minX = Math.min(this.vertex.x, this.p1.x, this.p2.x);
        let maxX = Math.max(this.vertex.x, this.p1.x, this.p2.x);
        let minY = Math.min(this.vertex.y, this.p1.y, this.p2.y);
        let maxY = Math.max(this.vertex.y, this.p1.y, this.p2.y);

        const buffer = 3;
        return {
            x: minX - buffer, y: minY - buffer,
            width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer
        };
    }

    _containsPointBody(point) {
        // Approximate check: distance to the chord segment between endpoints
        if (!point || !this.p1 || !this.p2) return false;
        const p1 = this.p1; const p2 = this.p2;
        const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.vertex) < 25;

        const p1_to_point = point.subtract(p1); const p1_to_p2 = p2.subtract(p1);
        const t = lenSq < 1e-9 ? 0.5 : p1_to_point.dot(p1_to_p2) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));

        const closestPointOnChord = p1.add(p1_to_p2.multiply(clampedT));
        // Use a larger radius for clicking near the curve
        return point.distanceSquaredTo(closestPointOnChord) < 150; // ~12px tolerance
    }

    // Calculate intersection of a ray with the parabola segment
    intersect(rayOrigin, rayDirection) {
        if (!this.vertex || !this.localXAxis || !this.localYAxis || this.focalLength <= 0) return [];

        const O = rayOrigin;
        const D = rayDirection;
        const V = this.vertex;
        const f = this.focalLength;
        const ax = this.localXAxis; // Parabola's symmetry axis direction
        const ay = this.localYAxis; // Parabola's perpendicular axis direction

        // Transform ray to local coordinate system (vertex at origin, axis along +x)
        const O_local_vec = O.subtract(V);
        const O_local_x = O_local_vec.dot(ax);
        const O_local_y = O_local_vec.dot(ay);
        const D_local_x = D.dot(ax);
        const D_local_y = D.dot(ay);

        // Parabola equation: y^2 = 4*f*x
        // Ray equation: P_local = O_local + t * D_local
        // (O_local_y + t*D_local_y)^2 = 4*f*(O_local_x + t*D_local_x)
        // O_y^2 + 2*O_y*t*D_y + t^2*D_y^2 = 4*f*O_x + 4*f*t*D_x
        // t^2 * (D_y^2) + t * (2*O_y*D_y - 4*f*D_x) + (O_y^2 - 4*f*O_x) = 0
        // This is a quadratic equation At^2 + Bt + C = 0

        const A = D_local_y * D_local_y;
        const B = 2.0 * O_local_y * D_local_y - 4.0 * f * D_local_x;
        const C = O_local_y * O_local_y - 4.0 * f * O_local_x;

        const discriminant = B * B - 4.0 * A * C;

        if (discriminant < 1e-9) { // No real intersection or tangent
            return [];
        }

        const sqrtDiscriminant = Math.sqrt(discriminant);
        // Avoid division by zero if A is very small (ray parallel to y-axis)
        if (Math.abs(A) < 1e-9) {
            // Equation becomes linear: Bt + C = 0 => t = -C / B
            if (Math.abs(B) < 1e-9) return []; // Should not happen if D is valid
            const t = -C / B;
            if (t < 1e-6) return []; // Hit behind origin
            // Need to check if this single hit point is within the diameter limits
            const hit_local_y = O_local_y + t * D_local_y;
            if (Math.abs(hit_local_y) > this.diameter / 2.0 + 1e-6) return []; // Missed segment

            // Calculate hit point and normal for this linear case
            const hitPoint = O.add(D.multiply(t));
            const hit_local_x = O_local_x + t * D_local_x;
            // Normal calculation (see below)
            const tangent_local = new Vector(2 * f, hit_local_y); // Derivative dy/dx = 2f/y -> tangent (dy, dx) -> (y, 2f)? Check this. Let's use gradient.
            // Gradient of F(x,y) = y^2 - 4fx is (-4f, 2y)
            const grad_local = new Vector(-4.0 * f, 2.0 * hit_local_y);
            let normal_local = grad_local.normalize();
            // Transform normal back to world coords
            let normal = ax.multiply(normal_local.x).add(ay.multiply(normal_local.y));
            // Ensure normal points towards ray origin
            if (D.dot(normal) > 1e-9) { normal = normal.multiply(-1); }
            if (isNaN(hitPoint.x) || isNaN(normal.x)) return [];

            return [{ distance: t, point: hitPoint, normal: normal, surfaceId: 'parabola' }];

        } else {
            // Quadratic formula for t
            const t_minus = (-B - sqrtDiscriminant) / (2.0 * A);
            const t_plus = (-B + sqrtDiscriminant) / (2.0 * A);

            let validHits = [];
            for (const t of [t_minus, t_plus]) {
                if (t > 1e-6) { // Hit is in front of ray
                    // Check if the hit point's local y-coordinate is within the diameter
                    const hit_local_y = O_local_y + t * D_local_y;
                    if (Math.abs(hit_local_y) <= this.diameter / 2.0 + 1e-6) { // Allow tolerance
                        const hitPoint = O.add(D.multiply(t));
                        const hit_local_x = O_local_x + t * D_local_x; // Needed for normal calc

                        // Calculate normal in local coordinates using gradient
                        // F(x,y) = y^2 - 4fx = 0. Gradient = dF/dx i + dF/dy j = -4f i + 2y j
                        const grad_local = new Vector(-4.0 * f, 2.0 * hit_local_y);
                        let normal_local = grad_local.normalize();
                        if (normal_local.magnitudeSquared() < 0.5) continue; // Avoid issues if grad is zero

                        // Transform normal back to world coordinates
                        let normal = ax.multiply(normal_local.x).add(ay.multiply(normal_local.y));

                        // Normal calculated from gradient points towards increasing F.
                        // For y^2-4fx=0, this points "inside" the parabola where y^2-4fx > 0.
                        // We want the normal pointing "outward" from the reflective surface.
                        // The reflective surface is where y^2-4fx = 0.
                        // Let's test a point slightly along the normal direction from the hit point.
                        // If F > 0 there, the normal points correctly outward (away from reflective side).
                        // If F < 0 there, flip the normal.
                        // Test point local: (hit_local_x + eps*normal_local.x, hit_local_y + eps*normal_local.y)
                        // const eps = 1e-3;
                        // const test_x = hit_local_x + eps * normal_local.x;
                        // const test_y = hit_local_y + eps * normal_local.y;
                        // if ((test_y * test_y - 4.0 * f * test_x) < 0) { // If test point F < 0
                        //      normal = normal.multiply(-1);
                        // }
                        // Simpler check: normal should generally oppose local x-axis for concave
                        if (normal.dot(this.localXAxis) > 0) { // If normal points along axis
                            normal = normal.multiply(-1); // Flip it back towards focus
                        }


                        // Ensure interaction normal points towards the ray
                        if (D.dot(normal) > 1e-9) { normal = normal.multiply(-1); }

                        if (isNaN(hitPoint.x) || isNaN(normal.x) || normal.magnitudeSquared() < 0.5) {
                            console.error(`ParabolicMirror (${this.id}): NaN normal or hitpoint. t=${t}`);
                            continue; // Skip invalid calculation
                        }
                        validHits.push({ distance: t, point: hitPoint, normal: normal, surfaceId: 'parabola' });
                    }
                }
            }

            // Return the closest valid hit
            if (validHits.length === 0) return [];
            validHits.sort((a, b) => a.distance - b.distance);
            return [validHits[0]];
        }
    }

    interact(ray, intersectionInfo, RayClass) {
        // Interaction is identical to Spherical Mirror - just reflection
        const hitPoint = intersectionInfo.point;
        const normal = intersectionInfo.normal; // Should point towards ray

        if (!(hitPoint instanceof Vector) || !(normal instanceof Vector) || isNaN(hitPoint.x) || isNaN(normal.x) || normal.magnitudeSquared() < 0.5) {
            console.error(`ParabolicMirror (${this.id}): Invalid geometry for interact.`);
            ray.terminate('internal_error'); return [];
        }

        const I = ray.direction;
        const N = normal;
        const dot_I_N = I.dot(N);
        let reflectedDirection = I.subtract(N.multiply(2 * dot_I_N));
        const magSq = reflectedDirection.magnitudeSquared();

        if (magSq < 1e-9) {
            console.warn(`ParabolicMirror (${this.id}): Near-zero reflection vector.`);
            reflectedDirection = N.multiply(-1);
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        } else {
            reflectedDirection = reflectedDirection.divide(Math.sqrt(magSq));
            if (isNaN(reflectedDirection.x)) { ray.terminate('reflection_error'); return []; }
        }


        const newOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
        const reflectedIntensity = ray.intensity;
        const reflectedPhase = ray.phase + Math.PI;
        const nextBounces = ray.bouncesSoFar + 1;
        let reflectedRay = null;

        if (reflectedIntensity >= ray.minIntensityThreshold) {
            try {
                if (isNaN(newOrigin.x)) throw new Error("NaN origin");
                reflectedRay = new RayClass(
                    newOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, reflectedPhase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating reflected Ray in ParabolicMirror (${this.id}):`, e); }
        }

        ray.terminate('reflected_parabolic');
        return reflectedRay ? [reflectedRay] : [];
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            focalLength: { value: this.focalLength.toFixed(1), label: '焦距 (f)', type: 'number', min: 1, step: 1 }, // Min > 0 for now
            diameter: { value: this.diameter.toFixed(1), label: '孔径(直径)', type: 'number', min: 10, step: 1 }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'focalLength':
                const f = parseFloat(value);
                if (!isNaN(f) && f > 0 && Math.abs(f - this.focalLength) > 1e-6) { // Ensure f > 0
                    this.focalLength = f; needsGeomUpdate = true;
                } else if (f <= 0) { console.warn("ParabolicMirror focal length must be positive."); }
                break;
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 10 && Math.abs(d - this.diameter) > 1e-6) {
                    this.diameter = d; needsGeomUpdate = true;
                }
                break;
            default:
                return false; // Not handled
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating ParabolicMirror geometry:", e); }
            needsRetrace = true;
        }
        return true; // Handled
    }
}

// --- END OF ParabolicMirror CLASS ---


// --- Screen ---
class Screen extends OpticalComponent {
    static functionDescription = "接收并显示光线命中位置与强度分布。";
    constructor(pos, length = 150, angleDeg = 0, numBins = 200) {
        super(pos, angleDeg, "屏幕");
        this.length = Math.max(10, length);
        this.numBins = Math.max(1, numBins);
        this.showPattern = true; // Toggle visibility of the pattern

        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.screenDir = Vector.fromAngle(angleDeg); // Direction vector along the screen
        this.binWidth = 0;

        // Data storage
        this.binData = [];
        this.maxIntensity = 0; // Max intensity recorded for normalization

        try { this._updateGeometry(); } catch (e) { console.error("Init Screen Geom Err:", e); }
        this.reset(); // Initialize bins
    }


    // --- Add inside Screen class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
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
        this.screenDir = this.p2.subtract(this.p1).normalize(); // Unit vector from p1 to p2
        this.binWidth = this.numBins > 0 ? this.length / this.numBins : 0;
        this.reset(); // Geometry changed, reset data
    }

    reset() {
        this.binData = Array(this.numBins).fill(null).map(() => ({
            real: 0.0, imag: 0.0, // Sum of complex amplitudes
            intensitySum: 0.0, // Sum of intensities (non-coherent)
            hitCount: 0
        }));
        this.maxIntensity = 0; // Reset max intensity for normalization
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Screen AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Screen PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        // Draw the screen line (dashed)
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#DDDDDD'; // Highlight if selected
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.setLineDash([4, 2]);
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw the intensity pattern if enabled
        if (this.showPattern) {
            this.drawIntensityPattern(ctx);
        }
    }

    // --- REPLACEMENT for Screen.drawIntensityPattern (Using Coherent Intensity) ---
    drawIntensityPattern(ctx) {
        // Check if data is valid and there's something to draw
        if (!this.binData || this.binData.length !== this.numBins || this.maxIntensity <= 1e-9 || this.binWidth <= 0) {
            // console.log("Skipping pattern draw:", this.binData, this.maxIntensity); // DEBUG
            return;
        }

        const patternHeight = 30; // Max height of the pattern bars
        const patternNormal = new Vector(-this.screenDir.y, this.screenDir.x); // Normal to the screen line
        const baseOffset = patternNormal.multiply(3); // Offset pattern slightly from screen line

        // Adjust bar width based on zoom? Maybe later. Keep simple for now.
        const dpr = window.devicePixelRatio || 1;
        let barWidthPixels = this.binWidth * cameraScale; // Bar width in CSS pixels considering zoom
        // Ensure minimum visual width, but allow it to shrink when very zoomed out
        const minVisualWidth = 0.5;
        const maxVisualWidth = this.binWidth * 2; // Limit max visual width relative to bin size
        barWidthPixels = Math.max(minVisualWidth, Math.min(maxVisualWidth, barWidthPixels));

        ctx.lineWidth = barWidthPixels / dpr; // Set lineWidth in physical pixels
        ctx.lineCap = 'butt';

        for (let i = 0; i < this.numBins; i++) {
            const bin = this.binData[i];
            if (!bin || bin.hitCount === 0) continue; // Skip empty bins

            // --- Calculate Coherent Intensity ---
            // Intensity = |Sum(Complex Amplitudes)|^2 = real^2 + imag^2
            const coherentIntensity = bin.real * bin.real + bin.imag * bin.imag;
            if (isNaN(coherentIntensity) || coherentIntensity < 1e-12) continue; // Skip negligible or invalid intensity

            // --- Normalize and Draw ---
            // Normalize using the max COHERENT intensity found
            const normalizedIntensity = Math.min(1.0, coherentIntensity / this.maxIntensity);
            if (normalizedIntensity <= 0) continue;

            // Calculate center position of the bin on the screen line
            const t = (i + 0.5) / this.numBins;
            const binCenterPos = Vector.lerp(this.p1, this.p2, t);
            if (!binCenterPos || isNaN(binCenterPos.x)) continue; // Safety check

            // Calculate start and end points for the intensity bar
            const barStart = binCenterPos.add(baseOffset);
            // Scale height based on square root of intensity for better visual dynamic range? Or linear? Let's try linear first.
            const barVector = patternNormal.multiply(normalizedIntensity * patternHeight);
            const barEnd = barStart.add(barVector);

            if (!barStart || !barEnd || isNaN(barStart.x) || isNaN(barEnd.x)) continue; // Safety check

            // Color based on intensity (simple grayscale)
            // Use sqrt intensity for brightness perception?
            const brightnessFactor = Math.sqrt(normalizedIntensity); // sqrt mapping
            const brightness = Math.min(255, Math.max(0, Math.round(brightnessFactor * 255)));
            ctx.strokeStyle = `rgb(${brightness},${brightness},${brightness})`;

            ctx.beginPath();
            ctx.moveTo(barStart.x, barStart.y);
            ctx.lineTo(barEnd.x, barEnd.y);
            ctx.stroke();
        }
        ctx.lineCap = 'round'; // Reset line cap
    }
    // --- END OF REPLACEMENT ---


    getBoundingBox() { // Same as LineSource/Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x); const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y); const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Same as LineSource/Mirror
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(this.p1); const p1_to_p2 = this.p2.subtract(this.p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq; const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = this.p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25;
    }

    intersect(rayOrigin, rayDirection) { // Same as Mirror
        if (!(this.p1 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1); const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3); if (Math.abs(dot_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;

        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.screenDir.rotate(Math.PI / 2); // Normal perpendicular to screen
            if (rayDirection.dot(surfaceNormal) > 0) surfaceNormal = surfaceNormal.multiply(-1); // Point towards ray
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'front' }];
        }
        return [];
    }

    // --- REPLACEMENT for Screen.interact (Coherent Summation) ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        if (!this.p1 || !this.screenDir || this.length <= 1e-9 || !this.binData) {
            ray.terminate('screen_geom_invalid'); return []; // Basic safety check
        }

        // 1. Calculate position along the screen (parameter t from 0 to 1)
        const hitVector = hitPoint.subtract(this.p1);
        const distAlongScreen = hitVector.dot(this.screenDir);
        const t = distAlongScreen / this.length; // Parameter along screen [0, 1]

        // 2. Calculate the bin index & clamp
        const binIndex = Math.floor(t * this.numBins);
        const validBinIndex = Math.max(0, Math.min(this.numBins - 1, binIndex));

        // 3. Get complex amplitude of the incoming ray (INCLUDING phase accumulated up to hitPoint)
        const complexAmp = ray.getComplexAmplitude(); // { amplitude, phase }

        // 4. Accumulate data in the bin
        if (validBinIndex >= 0 && validBinIndex < this.binData.length) {
            const bin = this.binData[validBinIndex];

            // --- Coherent Summation ---
            // Add the real and imaginary parts of the ray's complex amplitude
            // Real part = Amplitude * cos(Phase)
            // Imaginary part = Amplitude * sin(Phase)
            const rayReal = complexAmp.amplitude * Math.cos(complexAmp.phase);
            const rayImag = complexAmp.amplitude * Math.sin(complexAmp.phase);

            if (!isNaN(rayReal) && !isNaN(rayImag)) {
                bin.real += rayReal;
                bin.imag += rayImag;
            } else {
                console.warn(`Screen (${this.id}): NaN complex amplitude from ray ${ray.sourceId}-${ray.bouncesSoFar}`);
            }
            // --- End Coherent Summation ---

            // Also accumulate non-coherent intensity sum (optional, for comparison or different modes)
            bin.intensitySum += ray.intensity;
            bin.hitCount += 1;

            // --- Update max intensity based on COHERENT intensity ---
            // Coherent intensity in this bin = |Sum(Complex Amplitudes)|^2 = real^2 + imag^2
            const currentBinCoherentIntensity = bin.real * bin.real + bin.imag * bin.imag;
            if (!isNaN(currentBinCoherentIntensity) && currentBinCoherentIntensity > this.maxIntensity) {
                this.maxIntensity = currentBinCoherentIntensity;
                // console.log("New max intensity:", this.maxIntensity); // DEBUG
            }
        } else {
            console.warn("Screen bin index out of bounds or binData invalid.", validBinIndex, this.numBins);
        }

        // 5. Terminate the original ray (handled by traceAllRays ending segment)
        // ray.terminate('hit_screen'); // No need to terminate here explicitly

        // 6. Screen absorbs the ray, no new rays produced
        return [];
    }
    // --- END OF REPLACEMENT ---


    // --- REPLACEMENT for Screen.getProperties ---
    getProperties() {
        const baseProps = super.getProperties(); // posX, posY, angleDeg
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (L)', type: 'number', min: 10, step: 1, title: '屏幕的长度' },
            numBins: { value: this.numBins, label: '像素单元数', type: 'number', min: 1, max: 1000, step: 1, title: '用于计算强度分布的分格数量' },
            showPattern: { value: this.showPattern, label: '显示强度图样', type: 'checkbox', title: '是否在屏幕旁边绘制计算出的光强分布图' }
        };
    }
    // --- END REPLACEMENT ---

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) {
            needsRetrace = true; // Ensure base property changes trigger retrace
            return true;
        }

        let needsGeomUpdate = false;
        let needsDisplayUpdate = false; // For toggling pattern display

        switch (propName) {
            case 'length':
                const l = parseFloat(value);
                if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; }
                break;
            case 'numBins':
                const b = parseInt(value);
                if (!isNaN(b) && b >= 1 && b !== this.numBins) { this.numBins = b; needsGeomUpdate = true; }
                break;
            case 'showPattern':
                const s = !!value;
                if (this.showPattern !== s) {
                    this.showPattern = s;
                    needsDisplayUpdate = true; // Doesn't need retrace, only redraw
                }
                break;
            default:
                // console.warn(`Screen: Unknown property ${propName}`); // Removed warning
                return false; // Indicate not handled
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Screen geometry:", e); }
            needsRetrace = true; // Geometry change affects intersection, needs retrace
        }
        if (needsDisplayUpdate) {
            // Ideally, just trigger a redraw without full retrace if possible
            // For now, full retrace might happen anyway if other flags are set
        }
        return true; // Indicate handled
    }
}

// --- START REPLACEMENT for the ENTIRE ThinLens class (Version 3 - Enhanced Physics) ---
class ThinLens extends OpticalComponent {
    static functionDescription = "基于薄透镜公式使光线汇聚或发散，可模拟色散。";
    constructor(pos, diameter = 80, focalLength = 150, angleDeg = 90) {
        super(pos, angleDeg, "薄透镜"); // Label updated in _updateGeometry
        this.diameter = Math.max(10, diameter);
        this.focalLength = focalLength === 0 ? Infinity : focalLength; // User-set focal length at reference wavelength

        // --- Physics Properties ---
        this.baseRefractiveIndex = 1.5;    // n at reference wavelength (e.g., 550nm)
        this.dispersionCoeffB = 5000;   // Cauchy B coefficient (nm^2) for dispersion
        this.chromaticAberration = 0.005; // Multiplier for chromatic effects
        this.sphericalAberration = 0.01; // Coefficient for spherical aberration effect
        this.quality = 0.98;               // Transmission factor
        this.coated = false;               // Reduces reflection loss (simplified)
        this.isThickLens = false;          // Primarily visual flag
        this.thickLensThickness = 10;      // Visual thickness

        // --- Geometry Cache ---
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.lensDir = Vector.fromAngle(this.angleRad);
        this.axisDirection = Vector.fromAngle(this.angleRad + Math.PI / 2);

        // --- Pre-calculate Cauchy A for efficiency ---
        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550); // Assuming 550nm is reference

        try {
            this._updateGeometry(); // Initial geometry and label update
        } catch (e) {
            console.error("Init Lens Geom Err:", e);
        }
    }

    // Calculate refractive index based on wavelength using Cauchy equation
    getRefractiveIndex(wavelengthNm = 550) {
        // Handle non-numeric wavelengths (like 'white') by returning base index
        if (typeof wavelengthNm !== 'number' || wavelengthNm <= 0) {
            return this.baseRefractiveIndex;
        }
        // Cauchy: n(lambda) = A + B / lambda^2
        // We precalculated A such that n(550) = baseRefractiveIndex
        const n = this._cauchyA + this.dispersionCoeffB / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n); // Ensure index is physically valid (>= 1.0)
    }

    // Recalculate Cauchy A when base index or dispersion changes
    _updateCauchyA() {
        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550);
    }

    // Update geometry AND label based on current properties
    _updateGeometry() {
        // ... (Geometry calculation remains the same as Version 2) ...
        if (!(this.pos instanceof Vector)) { console.error("Lens position invalid."); return; }
        this.lensDir = Vector.fromAngle(this.angleRad);
        const halfLenVec = this.lensDir.multiply(this.diameter / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        this.axisDirection = new Vector(-this.lensDir.y, this.lensDir.x);

        // Update label
        let lensType = "薄透镜";
        if (Math.abs(this.focalLength) === Infinity) { lensType = "平板"; }
        else if (this.focalLength > 0) { lensType = "凸透镜"; }
        else { lensType = "凹透镜"; }
        if (this.isThickLens && Math.abs(this.focalLength) !== Infinity) { lensType = "厚" + lensType; }
        this.label = lensType;
    }

    // Callbacks for property changes affecting geometry
    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Lens AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Lens PosChange Err:", e); } }

    // Draw the lens (Shape logic remains the same as Version 2)
    draw(ctx) {
        // ... (Drawing logic including shape switching, arrows, foci remains the same as Version 2) ...
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector) || !this.pos || typeof this.focalLength !== 'number') return;
        const center = this.pos; const p1 = this.p1; const p2 = this.p2; const diameter = this.diameter; const F = this.focalLength;
        const isFlat = Math.abs(F) === Infinity; const isConvex = F > 0; const selected = this.selected;
        const convexColor = '#90c0ff'; const concaveColor = '#FFB6C1'; const flatColor = '#D3D3D3'; const selectedColor = '#FFFF00';
        let baseStrokeColor = isFlat ? flatColor : (isConvex ? convexColor : concaveColor);
        ctx.strokeStyle = selected ? selectedColor : baseStrokeColor;
        ctx.lineWidth = selected ? 2.5 : 1.8;
        const baseFillAlpha = this.isThickLens ? 0.20 : 0.10; const selectedFillAlpha = this.isThickLens ? 0.30 : 0.20;
        let fillStyle = "rgba(0,0,0,0)";
        if (!isFlat) { let rgb = isConvex ? '144, 192, 255' : '255, 160, 160'; fillStyle = selected ? `rgba(${rgb}, ${selectedFillAlpha})` : `rgba(${rgb}, ${baseFillAlpha})`; }
        else { let rgb = '211, 211, 211'; fillStyle = selected ? `rgba(${rgb}, ${selectedFillAlpha})` : `rgba(${rgb}, ${baseFillAlpha})`; }
        ctx.fillStyle = fillStyle;
        const perpDir = this.axisDirection.clone();
        ctx.beginPath();
        if (isFlat) {
            const thickness = this.isThickLens ? Math.min(this.thickLensThickness, diameter * 0.3) : 4;
            const perpOffset = perpDir.multiply(thickness / 2);
            const p1_corner1 = p1.add(perpOffset); const p1_corner2 = p1.subtract(perpOffset);
            const p2_corner1 = p2.add(perpOffset); const p2_corner2 = p2.subtract(perpOffset);
            ctx.moveTo(p1_corner1.x, p1_corner1.y); ctx.lineTo(p2_corner1.x, p2_corner1.y); ctx.lineTo(p2_corner2.x, p2_corner2.y); ctx.lineTo(p1_corner2.x, p1_corner2.y); ctx.closePath();
        } else {
            const baseCurvature = diameter * 0.12; const focalLengthFactor = Math.min(4, Math.max(0.2, 150 / Math.abs(F)));
            let curveMagnitude = Math.max(2.0, baseCurvature * focalLengthFactor);
            let cp1, cp2;
            if (isConvex) { cp1 = center.add(perpDir.multiply(curveMagnitude)); cp2 = center.add(perpDir.multiply(-curveMagnitude)); }
            else { cp1 = center.add(perpDir.multiply(-curveMagnitude)); cp2 = center.add(perpDir.multiply(curveMagnitude)); }
            ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(cp1.x, cp1.y, p2.x, p2.y); ctx.quadraticCurveTo(cp2.x, cp2.y, p1.x, p1.y); ctx.closePath();
        }
        ctx.fill(); ctx.stroke();
        if (!isFlat) {
            const arrowSize = Math.min(10, diameter * 0.12); const edgeOffsetRatio = 0.9;
            const p1ArrowPos = Vector.lerp(center, p1, edgeOffsetRatio); const p2ArrowPos = Vector.lerp(center, p2, edgeOffsetRatio);
            const arrowDir = perpDir.clone(); ctx.fillStyle = ctx.strokeStyle;
            if (isConvex) { this._drawArrowhead(ctx, p1ArrowPos, arrowDir.multiply(-1), arrowSize); this._drawArrowhead(ctx, p2ArrowPos, arrowDir, arrowSize); }
            else { this._drawArrowhead(ctx, p1ArrowPos, arrowDir, arrowSize); this._drawArrowhead(ctx, p2ArrowPos, arrowDir.multiply(-1), arrowSize); }
        }
        if (selected && !isFlat) {
            try {
                const focalPoint1 = center.add(this.axisDirection.multiply(F)); const focalPoint2 = center.add(this.axisDirection.multiply(-F));
                ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(focalPoint1.x, focalPoint1.y, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(focalPoint2.x, focalPoint2.y, 3, 0, Math.PI * 2); ctx.fill();
                ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(focalPoint1.x, focalPoint1.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(focalPoint2.x, focalPoint2.y); ctx.stroke();
                ctx.setLineDash([]);
            } catch (e) { console.error("Error drawing focal points:", e); }
        }
    }

    // Helper to draw arrowheads (No change)
    _drawArrowhead(ctx, tip, direction, size) {
        // ... (keep the existing implementation) ...
        if (!direction || direction.magnitudeSquared() < 1e-6 || size <= 0) return;
        const normDir = direction.normalize(); const angle = Math.PI / 6;
        const v1 = normDir.rotate(Math.PI + angle).multiply(size); const v2 = normDir.rotate(Math.PI - angle).multiply(size);
        ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + v1.x, tip.y + v1.y); ctx.lineTo(tip.x + v2.x, tip.y + v2.y); ctx.closePath(); ctx.fill();
    }

    // Click Detection (No change needed)
    _containsPointBody(point) {
        // ... (keep the existing implementation) ...
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const p1 = this.p1; const p2 = this.p2; const lenSq = p1.distanceSquaredTo(p2);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(p1); const p1_to_p2 = p2.subtract(p1);
        const t = p1_to_point.dot(p1_to_p2) / lenSq; const clampedT = Math.max(0, Math.min(1, t));
        const closestPointOnSegment = p1.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPointOnSegment) < 25;
    }

    // Intersect: Find where the ray hits the lens plane (No change needed)
    intersect(rayOrigin, rayDirection) {
        // ... (keep the existing implementation) ...
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1); const v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const dot_v2_v3 = v2.dot(v3); if (Math.abs(dot_v2_v3) < 1e-9) { return []; }
        const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
            let surfaceNormal = this.axisDirection.clone();
            if (rayDirection.dot(surfaceNormal) > 0) { surfaceNormal = surfaceNormal.multiply(-1); }
            if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) { console.error(`ThinLens (${this.id}) intersect NaN.`); return []; }
            return [{ distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: 'lens_plane' }];
        }
        return [];
    }

    // --- REVISED interact METHOD for ThinLens (V4 - Wavelength-dependent focal length / Chromatic Aberration) ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const f_user = this.focalLength; // User-set focal length (at base wavelength)
        const n_base = this.baseRefractiveIndex; // Refractive index at base wavelength
        const incidentDirection = ray.direction;
        const incidentWavelength = ray.wavelengthNm;

        // --- Basic validation ---
        if (!(hitPoint instanceof Vector) || !(incidentDirection instanceof Vector) || isNaN(hitPoint.x) || isNaN(incidentDirection.x) ||
            isNaN(f_user) || isNaN(n_base)) { // Added checks for f_user and n_base
            console.error(`ThinLens (${this.id}): Invalid geometry, f, or n_base for interact.`);
            ray.terminate('invalid_geom_interact_lens'); return [];
        }

        // --- Handle flat lens (f = Infinity) - No chromatic aberration needed ---
        if (Math.abs(f_user) === Infinity) {
            // Simple pass-through (assuming negligible reflection/absorption for flat plate)
            const transmittedIntensity = ray.intensity * this.quality; // Apply basic quality factor
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(
                        transmitOrigin, incidentDirection, incidentWavelength,
                        Math.min(ray.intensity, transmittedIntensity), ray.phase,
                        ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId,
                        ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]),
                        ray.beamDiameter // Pass beam diameter
                    );
                } catch (e) { console.error(`Flat Lens (${this.id}) pass-through error:`, e); }
            }
            ray.terminate('pass_flat_lens');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        // --- Calculate Wavelength-Dependent Effective Focal Length (f_actual) ---
        let f_actual = f_user; // Default to user value
        let n_wl = n_base; // Default index
        try {
            n_wl = this.getRefractiveIndex(incidentWavelength); // Get index for current wavelength
            if (isNaN(n_wl) || n_wl < 1.0) n_wl = n_base; // Validate n_wl

            // Calculate f_actual using n_wl, n_base, and f_user
            // Formula: f_actual = f_user * (n_base - 1) / (n_wl - 1)
            // Handle edge cases where denominators are zero or near zero
            const n_base_minus_1 = n_base - 1.0;
            const n_wl_minus_1 = n_wl - 1.0;

            if (Math.abs(n_wl_minus_1) < 1e-9) {
                // If n(wl) is 1, the lens has no power at this wavelength (behaves like flat glass)
                f_actual = Infinity;
            } else if (Math.abs(n_base_minus_1) < 1e-9) {
                // If n_base was 1, C cannot be determined, lens was effectively flat anyway
                f_actual = Infinity;
            } else {
                // Normal calculation
                f_actual = f_user * (n_base_minus_1 / n_wl_minus_1);
            }

            // Safety check for f_actual
            if (!isFinite(f_actual)) {
                f_actual = Infinity; // Treat NaN/Inf as flat
            }

        } catch (e) {
            console.error(`ThinLens (${this.id}): Error calculating refractive index or f_actual for wl=${incidentWavelength}nm. Using f_user.`, e);
            f_actual = f_user; // Fallback to user-set focal length on error
        }
        // If f_actual becomes effectively infinite, handle as flat lens pass-through
        if (Math.abs(f_actual) === Infinity) {
            const transmittedIntensity = ray.intensity * this.quality;
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try {
                    transmittedRay = new RayClass(transmitOrigin, incidentDirection, incidentWavelength, transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]), ray.beamDiameter);
                } catch (e) { /* ignore */ }
            }
            ray.terminate('pass_flat_lens_chromatic');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }
        // --- End Effective Focal Length Calculation ---

        // --- Proceed with Ray Deviation Calculation using f_actual ---
        const lensCenter = this.pos;
        const axisDir = this.axisDirection;   // Optical axis direction (Vector)
        const lensPlaneDir = this.lensDir;    // Direction along the lens plane (Vector)

        // Calculate ray height 'h' from the optical axis
        const vecCenterToHit = hitPoint.subtract(lensCenter);
        const h = vecCenterToHit.dot(lensPlaneDir); // Project onto lens plane direction

        // Calculate incident angle relative to the OPTICAL AXIS
        const axisAngle = axisDir.angle();
        const incidentWorldAngle = incidentDirection.angle();
        const incidentAngleRelAxis = Math.atan2(Math.sin(incidentWorldAngle - axisAngle), Math.cos(incidentWorldAngle - axisAngle));

        // Calculate Deviation Angle using f_actual
        const deviation = (Math.abs(f_actual) < 1e-9) ? 0 : -h / f_actual;

        // Calculate the output angle relative to the optical axis
        const outputAngleRelAxis = incidentAngleRelAxis + deviation;

        // Convert the output angle relative to axis back to a world angle
        const outputWorldAngle = axisAngle + outputAngleRelAxis;
        const normalizedOutputWorldAngle = Math.atan2(Math.sin(outputWorldAngle), Math.cos(outputWorldAngle));
        const newDirection = Vector.fromAngle(normalizedOutputWorldAngle);

        // --- Validate new direction ---
        if (isNaN(newDirection?.x) || newDirection.magnitudeSquared() < 0.5) {
            console.error(`ThinLens (${this.id}): NaN/zero direction calculated (wl=${incidentWavelength}nm). h=${h.toFixed(2)}, f_actual=${f_actual.toFixed(2)}, dev=${deviation.toFixed(4)}. Fallback.`);
            // Fallback: transmit without deviation
            const fallbackDirection = incidentDirection.clone();
            const newOrigin = hitPoint.add(fallbackDirection.multiply(1e-6));
            const transmittedIntensity = ray.intensity * this.quality;
            let transmittedRay = null;
            if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
                try { transmittedRay = new RayClass(newOrigin, fallbackDirection, incidentWavelength, transmittedIntensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()]), ray.beamDiameter); } catch (e) {/*ignore*/ }
            }
            ray.terminate('refract_error_lens_chromatic');
            return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : [];
        }

        // --- Create transmitted ray ---
        let transmittedIntensity = ray.intensity * this.quality; // Apply quality factor
        const nextBounces = ray.bouncesSoFar + 1;
        let transmittedRay = null;

        if (transmittedIntensity >= ray.minIntensityThreshold || ray.ignoreDecay) {
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6)); // Offset slightly
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, incidentWavelength, transmittedIntensity,
                    ray.phase, // Phase change through thin lens often ignored, or can be complex
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId,
                    ray.polarizationAngle, // Assume polarization unchanged by simple lens
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()]),
                    ray.beamDiameter // Pass beam diameter along
                );
            } catch (e) { console.error(`Error creating transmitted Ray in Lens (${this.id}):`, e); }
        }

        ray.terminate('refracted_lens_chromatic'); // Terminate the original ray segment
        return transmittedRay && !transmittedRay.terminated ? [transmittedRay] : []; // Return array with the new ray
    }

    // --- REPLACEMENT for ThinLens.getProperties (V4 - Structure & Clarity) ---
    getProperties() {
        // Base position and angle
        const baseProps = super.getProperties();

        // Geometric Properties
        const geomProps = {
            diameter: { value: this.diameter.toFixed(1), label: '直径 (D)', type: 'number', min: 10, step: 1, title: '透镜的物理直径' },
        };

        // Core Optical Property
        const coreOpticalProps = {
            focalLength: {
                value: Math.abs(this.focalLength) === Infinity ? 'Infinity' : this.focalLength.toFixed(1),
                label: '焦距 (f)', // Standard label
                type: 'number', // Keep as number for input ease
                step: 10, // Sensible step
                title: '透镜焦距 (f > 0: 凸透镜, f < 0: 凹透镜, Infinity: 平板)',
                placeholder: 'f>0凸, f<0凹, Infinity' // Guide user
            },
        };

        // Advanced Physical Properties
        const advancedOpticalProps = {
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '基准折射率 (n₀@550nm)', type: 'number', min: 1.0, step: 0.01, title: '在 550nm 波长下的折射率' },
            dispersionCoeffB: { value: this.dispersionCoeffB.toFixed(0), label: '色散系数 (B)', type: 'number', min: 0, step: 100, title: '柯西色散公式 B 项 (nm²)' },
            // chromaticAberration: { value: this.chromaticAberration.toFixed(3), label: '色差因子', type: 'number', min: 0, max: 0.1, step: 0.001 },
            // sphericalAberration: { value: this.sphericalAberration.toFixed(3), label: '球差因子', type: 'number', min: 0, max: 0.1, step: 0.001 },
            quality: { value: this.quality.toFixed(2), label: '透过率', type: 'number', min: 0.1, max: 1.0, step: 0.01, title: '光线通过透镜后的强度比例 (0.1 - 1.0)' },
            // coated: { value: this.coated, label: '镀增透膜', type: 'checkbox' }, // Keep if implemented
        };

        // Visual Property
        const visualProps = {
            isThickLens: { value: this.isThickLens, label: '厚透镜视觉效果', type: 'checkbox', title: '切换透镜绘制为较厚的视觉样式（不影响计算）' },
        };

        // Combine in desired order
        return {
            ...baseProps, // posX, posY, angleDeg
            ...geomProps,
            ...coreOpticalProps,
            ...advancedOpticalProps,
            ...visualProps
        };
    }
    // --- END REPLACEMENT ---

    // Set properties from the inspector (Ensure updates trigger necessary recalculations)
    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsGeomUpdate = false;
        let needsOpticalRecalc = false; // Flag if optical properties affecting calculations change
        let needsRetraceUpdate = false; // General flag for needing retrace

        switch (propName) {
            case 'diameter': const d = parseFloat(value); if (!isNaN(d) && d >= 10 && Math.abs(d - this.diameter) > 1e-6) { this.diameter = d; needsGeomUpdate = true; } break;
            case 'focalLength':
                let f_val;
                if (typeof value === 'string' && value.trim().toLowerCase() === 'infinity') { f_val = Infinity; }
                else { f_val = parseFloat(value); }
                if (!isNaN(f_val)) {
                    const newF = (f_val === 0) ? Infinity : f_val;
                    if (newF !== this.focalLength) { this.focalLength = newF; needsGeomUpdate = true; /* Label changes */ needsRetraceUpdate = true; /* Optical change */ }
                } else { console.warn("Invalid focal length:", value); }
                break;
            case 'baseRefractiveIndex': const n = parseFloat(value); if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) { this.baseRefractiveIndex = n; needsOpticalRecalc = true; } break;
            case 'dispersionCoeffB': const b = parseFloat(value); if (!isNaN(b) && b >= 0 && Math.abs(b - this.dispersionCoeffB) > 1e-9) { this.dispersionCoeffB = b; needsOpticalRecalc = true; } break;
            case 'chromaticAberration': const ca = parseFloat(value); if (!isNaN(ca) && ca >= 0) { this.chromaticAberration = ca; needsRetraceUpdate = true; } break;
            case 'sphericalAberration': const sa = parseFloat(value); if (!isNaN(sa) && sa >= 0) { this.sphericalAberration = sa; needsRetraceUpdate = true; } break;
            case 'quality': const q = parseFloat(value); if (!isNaN(q) && q >= 0.1 && q <= 1.0) { this.quality = q; needsRetraceUpdate = true; } break;
            case 'coated': const coat = !!value; if (this.coated !== coat) { this.coated = coat; needsRetraceUpdate = true; } break;
            case 'isThickLens': const thick = !!value; if (this.isThickLens !== thick) { this.isThickLens = thick; needsGeomUpdate = true; /* Label changes */ } break; // Visual only
            // case 'thickLensThickness': const tt = parseFloat(value); if (!isNaN(tt) && tt >= 1) this.thickLensThickness = tt; break; // Visual only
            default: return false;
        }

        // Recalculate Cauchy A if relevant properties changed
        if (needsOpticalRecalc) {
            try { this._updateCauchyA(); } catch (e) { console.error(`Lens (${this.id}) Cauchy update error:`, e); }
            needsRetraceUpdate = true; // Optical properties changed, requires retrace
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Lens (${this.id}) geom update error:`, e); }
            needsRetrace = true; // Geometry change always requires retrace
            if (selectedComponent === this) updateInspector(); // Refresh inspector if label changed
        } else if (needsRetraceUpdate) {
            needsRetrace = true;
        }

        return true;
    }
}
// --- END REPLACEMENT for the ENTIRE ThinLens class ---

// --- Aperture / Slit / Grating ---
class Aperture extends OpticalComponent {
    static functionDescription = "限制或分割光束通行，形成衍射与干涉图样。";
    constructor(pos, length = 150, numberOfSlits = 1, slitWidth = 10, slitSeparation = 20, angleDeg = 90) {
        // Determine label based on slit count
        let label = "光阑";
        if (numberOfSlits === 1) label = "单缝";
        else if (numberOfSlits === 2) label = "双缝";
        else if (numberOfSlits > 2) label = `${numberOfSlits}缝光栅`; // More like grating if many

        super(pos, angleDeg, label);

        this.length = Math.max(10, length);             // Total width of the aperture structure
        this.numberOfSlits = Math.max(1, numberOfSlits); // Number of openings
        this.slitWidth = Math.max(0.1, slitWidth);      // Width of each individual slit
        // Slit separation is center-to-center distance
        this.slitSeparation = Math.max(this.slitWidth, slitSeparation);

        // Geometry cache: Array of blocker segments [ {p1: Vector, p2: Vector}, ... ]
        this.blockerSegments = [];

        try { this._updateGeometry(); } catch (e) { console.error("Init Aperture Geom Err:", e); }
    }


    // --- Add inside Aperture class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length,
            numberOfSlits: this.numberOfSlits,
            slitWidth: this.slitWidth,
            slitSeparation: this.slitSeparation
        };
    }

    // Recalculate blocker and *opening* segments
    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.blockerSegments = [];
        this.openingSegments = []; // <<< ADD array for openings
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

            // Add blocker before this slit (if space exists)
            if (slitLeftPos.subtract(lastPos).dot(apertureDir) > 1e-6) {
                this.blockerSegments.push({ p1: lastPos, p2: slitLeftPos });
            }
            // Add this opening segment
            this.openingSegments.push({ p1: slitLeftPos, p2: slitRightPos, id: i }); // Give opening an ID

            lastPos = slitRightPos; // Update position for next blocker check
        }

        // Add final blocker after last slit (if space exists)
        if (globalRightEdge.subtract(lastPos).dot(apertureDir) > 1e-6) {
            this.blockerSegments.push({ p1: lastPos, p2: globalRightEdge });
        }

        // Update label based on actual slits calculated (could differ slightly if width/sep invalid)
        let label = "光阑";
        const numOpenings = this.openingSegments.length;
        if (numOpenings === 1) label = "单缝";
        else if (numOpenings === 2) label = "双缝";
        else if (numOpenings > 2) label = `${numOpenings}缝光栅`;
        this.label = label;
    }

    // Intersect needs to check BOTH blockers and openings to find the first hit
    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;

        const checkSegment = (seg, type, id = null) => {
            if (!(seg.p1 instanceof Vector) || !(seg.p2 instanceof Vector)) return;
            const v1 = rayOrigin.subtract(seg.p1); const v2 = seg.p2.subtract(seg.p1);
            if (v2.magnitudeSquared() < 1e-9) return;
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3); if (Math.abs(dot_v2_v3) < 1e-9) return;
            const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;

            if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) { // Check segment bounds with tolerance
                if (t1 < closestDist) {
                    closestDist = t1;
                    const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                    const segDir = v2.normalize();
                    let surfaceNormal = new Vector(-segDir.y, segDir.x); // Perpendicular
                    if (rayDirection.dot(surfaceNormal) > 1e-9) surfaceNormal = surfaceNormal.multiply(-1);

                    if (isNaN(intersectionPoint.x) || isNaN(surfaceNormal.x)) {
                        console.error(`Aperture (${this.id}): NaN in intersect result for ${type}`);
                        return; // Skip invalid result
                    }
                    closestHit = { distance: t1, point: intersectionPoint, normal: surfaceNormal, surfaceId: type, openingId: id };
                }
            }
        };

        // Check blockers first (as they absorb)
        this.blockerSegments.forEach(seg => checkSegment(seg, 'blocker'));
        // Then check openings (only relevant if no closer blocker is hit)
        this.openingSegments.forEach((seg, index) => checkSegment(seg, 'opening', index));

        return closestHit ? [closestHit] : [];
    }



    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Aperture AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Aperture PosChange Err:", e); } }

    draw(ctx) {
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#888888'; // Dark gray, yellow if selected
        ctx.lineWidth = 4; // Make blockers thick
        ctx.lineCap = 'butt';
        this.blockerSegments.forEach(seg => {
            if (!(seg.p1 instanceof Vector) || !(seg.p2 instanceof Vector)) return;
            // Draw segment only if length is significant
            if (seg.p1.distanceSquaredTo(seg.p2) > 1e-6) {
                ctx.beginPath();
                ctx.moveTo(seg.p1.x, seg.p1.y);
                ctx.lineTo(seg.p2.x, seg.p2.y);
                ctx.stroke();
            }
        });
        ctx.lineCap = 'round'; // Reset
    }

    getBoundingBox() { // Based on total length
        if (!(this.pos instanceof Vector)) return super.getBoundingBox();
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        const p1_total = this.pos.subtract(halfLenVec);
        const p2_total = this.pos.add(halfLenVec);
        const minX = Math.min(p1_total.x, p2_total.x); const maxX = Math.max(p1_total.x, p2_total.x);
        const minY = Math.min(p1_total.y, p2_total.y); const maxY = Math.max(p1_total.y, p2_total.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Check against total length line
        if (!point || !(this.pos instanceof Vector)) return false;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        const p1_total = this.pos.subtract(halfLenVec);
        const p2_total = this.pos.add(halfLenVec);

        const lenSq = p1_total.distanceSquaredTo(p2_total);
        if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1_to_point = point.subtract(p1_total); const p1_to_p2 = p2_total.subtract(p1_total);
        const t = p1_to_point.dot(p1_to_p2) / lenSq; const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = p1_total.add(p1_to_p2.multiply(clampedT));
        return point.distanceSquaredTo(closestPoint) < 25; // Check distance to the main line
    }

    // Interact based on whether a blocker or opening was hit
    interact(ray, intersectionInfo, RayClass) {
        // If it hit a blocker, absorb
        if (intersectionInfo.surfaceId === 'blocker') {
            // No need to add history point, traceAllRays does it
            ray.terminate('hit_aperture_blocker');
            return []; // No new rays
        }

        // If it hit an opening, transmit with potentially modified diameter
        if (intersectionInfo.surfaceId === 'opening') {
            // Calculate the new beam diameter, limited by the slit width
            const newBeamDiameter = Math.min(ray.beamDiameter, this.slitWidth);

            // Create transmitted ray, passing the *new* beam diameter
            const newDirection = ray.direction; // Aperture doesn't change direction (ignoring diffraction)
            const newOrigin = intersectionInfo.point.add(newDirection.multiply(1e-6)); // Offset slightly

            let transmittedRay = null;
            // Intensity might be reduced if beam diameter > slitWidth, but let's ignore that for now
            const transmittedIntensity = ray.intensity;

            if (transmittedIntensity >= ray.minIntensityThreshold) {
                try {
                    transmittedRay = new RayClass(
                        newOrigin, newDirection, ray.wavelengthNm, transmittedIntensity, ray.phase,
                        ray.bouncesSoFar + 1, // Count aperture as interaction
                        ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
                        ray.history.concat([newOrigin.clone()]), // Pass history + new origin
                        newBeamDiameter // <<< PASS MODIFIED DIAMETER
                    );
                } catch (e) { console.error(`Error creating transmitted Ray in Aperture (${this.id}):`, e); }
            }

            ray.terminate('pass_aperture_opening');
            return transmittedRay ? [transmittedRay] : [];
        }

        // Should not happen if intersect logic is correct
        console.warn(`Aperture (${this.id}): Unknown surfaceId in interact: ${intersectionInfo.surfaceId}`);
        ray.terminate('internal_error');
        return [];
    }

    // --- REPLACEMENT for Aperture.getProperties ---
    getProperties() {
        const baseProps = super.getProperties(); // posX, posY, angleDeg
        const isGrating = this.numberOfSlits > 2;
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '总宽度', type: 'number', min: 1, step: 1, title: '整个光阑/光栅结构的总宽度' },
            numberOfSlits: { value: this.numberOfSlits, label: isGrating ? '# 狭缝 (光栅)' : '# 狭缝', type: 'number', min: 1, max: 100, step: 1, title: '开口(狭缝)的数量 (>=1)' }, // Increased max
            slitWidth: { value: this.slitWidth.toFixed(2), label: '缝宽 (a)', type: 'number', min: 0.01, step: 0.1, title: '每个狭缝的宽度' },
            slitSeparation: { value: this.slitSeparation.toFixed(2), label: '缝间距 (d)', type: 'number', min: 0.01, step: 0.1, title: '相邻狭缝中心之间的距离 (d ≥ a)' }
        };
    }
    // --- END REPLACEMENT ---

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'length': const l = parseFloat(value); if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; } break;
            case 'numberOfSlits': const n = parseInt(value); if (!isNaN(n) && n >= 1 && n !== this.numberOfSlits) { this.numberOfSlits = n; needsGeomUpdate = true; } break;
            case 'slitWidth': const w = parseFloat(value); if (!isNaN(w) && w > 0 && Math.abs(w - this.slitWidth) > 1e-6) { this.slitWidth = w; needsGeomUpdate = true; } break;
            case 'slitSeparation': const s = parseFloat(value); if (!isNaN(s) && s > 0 && Math.abs(s - this.slitSeparation) > 1e-6) { this.slitSeparation = Math.max(this.slitWidth, s); needsGeomUpdate = true; } break; // Ensure sep >= width
            default: console.warn(`Aperture: Unknown property ${propName}`); break;
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error("Error updating Aperture geometry:", e); }
            needsRetrace = true;
        }
    }
}

// --- Polarizer (Linear Polarizer) ---
class Polarizer extends OpticalComponent {
    static functionDescription = "选择并透过某一线偏振分量，衰减垂直分量。";
    constructor(pos, length = 100, transmissionAxisAngleDeg = 0, angleDeg = 90) {
        // angleDeg = orientation of the polarizer component itself
        // transmissionAxisAngleDeg = orientation of the transmission axis (global coords)
        super(pos, angleDeg, "偏振片");
        this.length = Math.max(10, length);
        this.transmissionAxisRad = transmissionAxisAngleDeg * (Math.PI / 180); // Store axis angle in radians

        // Geometry cache
        this.p1 = pos.clone(); this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        try { this._updateGeometry(); } catch (e) { console.error("Init Polarizer Geom Err:", e); }
    }

    // --- Add inside Polarizer class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length,
            transmissionAxisAngleDeg: this.transmissionAxisRad * (180 / Math.PI) // Save in degrees
        };
    }


    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2); // Along component angle
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        const edgeVec = this.p2.subtract(this.p1);
        this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize(); // Normal to the component line
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("Polarizer AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("Polarizer PosChange Err:", e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        // Draw main line
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA'; // Gray, yellow if selected
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();

        // Draw transmission axis indicator line at the center
        const axisVec = Vector.fromAngle(this.transmissionAxisRad); // Use the axis angle
        const indicatorLength = Math.min(this.length * 0.4, 20);
        const start = this.pos.subtract(axisVec.multiply(indicatorLength / 2));
        const end = this.pos.add(axisVec.multiply(indicatorLength / 2));

        ctx.strokeStyle = '#FFFFFF'; // White indicator
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
    }

    getBoundingBox() { // Same as LineSource/Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x), maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y), maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Same as LineSource/Mirror
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2); if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1), p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq, cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT)); return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) { // Same as Mirror
        if (!(this.p1 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3); if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone(); if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1);
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'polarizer' }];
        } return [];
    }

    // --- REPLACEMENT for Polarizer.interact with Jones model ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const axis = this.transmissionAxisRad;

        // Ideal polarizer Jones projector along axis: P = R(-axis) * [[1,0],[0,0]] * R(axis)
        let transmittedJones = null;
        if (ray.hasJones && ray.hasJones()) {
            const Rm = Ray._rot2(-axis);
            const Rp = Ray._rot2(axis);
            const J = [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 0, im: 0 }]];
            const vLocal = Ray._apply2x2(Rm, ray.jones);
            const vProj = { Ex: Ray._cMul(J[0][0], vLocal.Ex), Ey: Ray._cMul(J[1][1], vLocal.Ey) };
            transmittedJones = Ray._apply2x2(Rp, vProj);
        }

        // If no Jones available, fall back to Malus or half for unpolarized
        let transmittedIntensity;
        if (transmittedJones) {
            // Intensity scales by |Jones|^2 relative to input amplitude. Our ray intensity carries power; project power accordingly.
            const inAmp2 = ray.jonesIntensity();
            const outAmp2 = Ray._cAbs2(transmittedJones.Ex) + Ray._cAbs2(transmittedJones.Ey);
            const scale = inAmp2 > 1e-12 ? (outAmp2 / inAmp2) : 0;
            transmittedIntensity = ray.intensity * scale;
        } else {
            if (typeof ray.polarizationAngle === 'number') {
                const cos2 = Math.cos(ray.polarizationAngle - axis);
                transmittedIntensity = ray.intensity * (cos2 * cos2);
            } else if (ray.polarizationAngle === 'circular' || ray.polarizationAngle === null) {
                transmittedIntensity = ray.intensity * 0.5;
            } else {
                transmittedIntensity = 0;
            }
        }

        let transmittedRay = null;
        const nextBounces = ray.bouncesSoFar + 1;
        if (transmittedIntensity >= ray.minIntensityThreshold) {
            const newDirection = ray.direction;
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, ray.wavelengthNm,
                    transmittedIntensity, ray.phase,
                    nextBounces, ray.mediumRefractiveIndex,
                    ray.sourceId,
                    axis, // angle fallback for display
                    ray.ignoreDecay,
                    ray.history.concat([newOrigin.clone()])
                );
                if (transmittedJones) transmittedRay.setJones(transmittedJones);
                else transmittedRay.setLinearPolarization(axis);
            } catch (e) { console.error(`Polarizer (${this.id}) create ray error:`, e); }
        }

        ray.terminate('polarized');
        return transmittedRay ? [transmittedRay] : [];
    }
    // --- END OF REPLACEMENT ---

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度', type: 'number', min: 1, step: 1 },
            transmissionAxisAngleDeg: { value: (this.transmissionAxisRad * (180 / Math.PI)).toFixed(1), label: '透振轴 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        const handledByBase = super.setProperty(propName, value);
        if (handledByBase) return;

        let needsGeomUpdate = false; // Only if length changes
        let needsAxisUpdate = false;
        switch (propName) {
            case 'length': const l = parseFloat(value); if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; } break;
            case 'transmissionAxisAngleDeg': const a = parseFloat(value); if (!isNaN(a)) { const r = a * (Math.PI / 180); if (Math.abs(r - this.transmissionAxisRad) > 1e-6) { this.transmissionAxisRad = r; needsAxisUpdate = true; } } break;
            default: console.warn(`Polarizer: Unknown property ${propName}`); break;
        }

        if (needsGeomUpdate) { try { this._updateGeometry(); } catch (e) { console.error("Error updating Polarizer geometry:", e); } needsRetrace = true; }
        if (needsAxisUpdate) { needsRetrace = true; } // Axis change requires retrace
    }
}

// --- BeamSplitter (Enhanced with BS/PBS types & Adjustable PBS Ratio) ---
class BeamSplitter extends OpticalComponent {
    static functionDescription = "分光器将入射光分为两路，可为非偏振或偏振型。";
    // Added pbsUnpolarizedReflectivity to constructor defaults
    constructor(pos, length = 100, angleDeg = 45, type = 'BS', splitRatio = 0.5, pbsUnpolarizedReflectivity = 0.5) {
        const initialLabel = type === 'PBS' ? "偏振分束器" : "分束器";
        super(pos, angleDeg, initialLabel);

        this.length = Math.max(10, length);
        this.type = type === 'PBS' ? 'PBS' : 'BS'; // Ensure type is valid
        // splitRatio: Reflectivity for BS type (0 to 1)
        this.splitRatio = Math.max(0, Math.min(1, splitRatio));
        // pbsUnpolarizedReflectivity: Controls the R/T split for UNPOLARIZED light hitting a PBS.
        // A perfect PBS might be 0.5 here. Real ones might differ slightly.
        // This also implicitly affects how mixed-polarization states are split.
        this.pbsUnpolarizedReflectivity = Math.max(0, Math.min(1, pbsUnpolarizedReflectivity));

        // Geometry cache
        this.p1 = pos.clone(); this.p2 = pos.clone();
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2);

        try { this._updateGeometry(); } catch (e) { console.error("Init BeamSplitter Geom Err:", e); }
    }

    // --- Add inside BeamSplitter class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length,
            splitterType: this.type, // 'BS' or 'PBS' (avoid clashing with base 'type')
            splitRatio: this.splitRatio, // Reflectivity for BS
            pbsUnpolarizedReflectivity: this.pbsUnpolarizedReflectivity // Reflectivity for unpolarized on PBS
        };
    }

    _getP_AxisDirection() {
        return Vector.fromAngle(this.angleRad);
    }
    _getS_AxisDirection() {
        return Vector.fromAngle(this.angleRad + Math.PI / 2);
    }

    _updateGeometry() { // Same as before - updates label
        if (!(this.pos instanceof Vector)) return;
        const halfLenVec = Vector.fromAngle(this.angleRad).multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec); this.p2 = this.pos.add(halfLenVec);
        const edgeVec = this.p2.subtract(this.p1);
        this.normal = new Vector(-edgeVec.y, edgeVec.x).normalize();
        this.label = this.type === 'PBS' ? "偏振分束器" : "分束器";
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error("BS AngleChange Err:", e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error("BS PosChange Err:", e); } }


draw(ctx) {
    if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;

    // --- NEW: Custom drawing logic for PBS ---
    if (this.type === 'PBS') {
        ctx.save();
        const center = this.pos;
        const size = this.length; // Use length property to define the size of the cube
        const halfSize = size / 4;

        // Rotate the context around the component's center
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angleRad); // Use the component's main angle for orientation

        // Define cube vertices relative to the rotated center (0,0)
        const p1_local = new Vector(-halfSize, -halfSize);
        const p2_local = new Vector(halfSize, -halfSize);
        const p3_local = new Vector(halfSize, halfSize);
        const p4_local = new Vector(-halfSize, halfSize);

        // Set styles
        ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.9)' : 'rgba(100, 200, 255, 0.7)';
        ctx.fillStyle = this.selected ? 'rgba(100, 200, 255, 0.3)' : 'rgba(100, 200, 255, 0.15)';
        ctx.lineWidth = this.selected ? 2 : 1.5;

        // Draw the cube outline and fill
        ctx.beginPath();
        ctx.moveTo(p1_local.x, p1_local.y);
        ctx.lineTo(p2_local.x, p2_local.y);
        ctx.lineTo(p3_local.x, p3_local.y);
        ctx.lineTo(p4_local.x, p4_local.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw the diagonal splitting surface
        ctx.beginPath();
        ctx.moveTo(p1_local.x, p1_local.y);
        ctx.lineTo(p3_local.x, p3_local.y);
        ctx.stroke();

        // Restore the context to its original state
        ctx.restore();

    } else { // Original drawing logic for standard Beam Splitter (BS)
        ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.9)' : 'rgba(100, 200, 255, 0.7)';
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p2.x, this.p2.y);
        ctx.stroke();
    }
}

    getBoundingBox() { // Same as before
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x), maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y), maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }
    _containsPointBody(point) { // Same as before
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2); if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1), p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq, cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT)); return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) { // Enhanced: PBS uses square body, BS keeps line
        if (this.type === 'PBS') {
            // Build a small square body around the center similar to draw()
            const size = this.length; const halfSize = size / 4;
            const local = [
                new Vector(-halfSize, -halfSize), new Vector(halfSize, -halfSize),
                new Vector(halfSize, halfSize), new Vector(-halfSize, halfSize)
            ];
            const world = local.map(v => v.rotate(this.angleRad).add(this.pos));
            // Ray-quad intersection: check each edge for crossing, take closest
            let closest = null; let minT = Infinity; let hitNormal = null;
            for (let i = 0; i < 4; i++) {
                const a = world[i]; const b = world[(i + 1) % 4];
                const v1 = rayOrigin.subtract(a); const v2 = b.subtract(a);
                const v3 = new Vector(-rayDirection.y, rayDirection.x);
                const denom = v2.dot(v3); if (Math.abs(denom) < 1e-9) continue;
                const t1 = v2.cross(v1) / denom; const t2 = v1.dot(v3) / denom;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1 + 1e-6) {
                    if (t1 < minT) {
                        minT = t1;
                        closest = rayOrigin.add(rayDirection.multiply(t1));
                        const edge = b.subtract(a);
                        hitNormal = new Vector(-edge.y, edge.x).normalize();
                    }
                }
            }
            if (closest && hitNormal) {
                if (rayDirection.dot(hitNormal) > 0) hitNormal = hitNormal.multiply(-1);
                return [{ distance: minT, point: closest, normal: hitNormal, surfaceId: 'pbs_body' }];
            }
            return [];
        } else {
            if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
            const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const d_v2_v3 = v2.dot(v3); if (Math.abs(d_v2_v3) < 1e-9) return [];
            const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
            if (t1 > 1e-6 && t2 >= 0 && t2 <= 1) {
                const iP = rayOrigin.add(rayDirection.multiply(t1));
                let sN = this.normal.clone();
                if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1);
                if (isNaN(iP.x) || isNaN(sN.x)) { console.error(`BeamSplitter (${this.id}) Intersect produced NaN.`); return []; }
                return [{ distance: t1, point: iP, normal: sN, surfaceId: 'beamsplitter' }];
            } return [];
        }
    }

    // --- Main Interaction Dispatcher ---
    interact(ray, intersectionInfo, RayClass) {
        if (this.type === 'BS') {
            return this._interactBS(ray, intersectionInfo, RayClass);
        } else if (this.type === 'PBS') {
            return this._interactPBS(ray, intersectionInfo, RayClass);
        } else {
            console.warn(`BeamSplitter (${this.id}): Unknown type ${this.type}. Defaulting to BS.`);
            return this._interactBS(ray, intersectionInfo, RayClass);
        }
    }

    // --- Interaction for Standard Beam Splitter (BS) ---
    _interactBS(ray, intersectionInfo, RayClass) {
        // This function remains exactly the same as in the previous version
        const hitPoint = intersectionInfo.point;
        const surfaceNormal = intersectionInfo.normal;
        const incidentDirection = ray.direction;
        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        const incidentIntensity = ray.intensity;

        // Reflected Ray (Intensity based on splitRatio)
        const reflectedIntensity = incidentIntensity * this.splitRatio;
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            const N = surfaceNormal; const I = incidentDirection;
            const dot_I_N = I.dot(N);
            const reflectedDirection = I.subtract(N.multiply(2 * dot_I_N)).normalize();
            const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            try {
                if (isNaN(reflectedDirection.x)) throw new Error("NaN direction");
                const reflectedRay = new RayClass(
                    reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity,
                    ray.phase + Math.PI, nextBounces, ray.mediumRefractiveIndex,
                    ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([reflectOrigin.clone()]) // Pass history + new origin
                );
                newRays.push(reflectedRay);
            } catch (e) { console.error(`BS (${this.id}): Error creating reflected ray:`, e); }
        }

        // Transmitted Ray
        const transmittedRatio = 1.0 - this.splitRatio;
        const transmittedIntensity = incidentIntensity * transmittedRatio;
        if (transmittedIntensity >= ray.minIntensityThreshold) {
            const transmittedDirection = incidentDirection;
            const transmitOrigin = hitPoint.add(transmittedDirection.multiply(1e-6));
            try {
                if (isNaN(transmittedDirection.x)) throw new Error("NaN direction");
                const transmittedRay = new RayClass(
                    transmitOrigin, transmittedDirection, ray.wavelengthNm, transmittedIntensity,
                    ray.phase, nextBounces, ray.mediumRefractiveIndex,
                    ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay,
                    ray.history.concat([transmitOrigin.clone()]) // Pass history + new origin
                );
                newRays.push(transmittedRay);
            } catch (e) { console.error(`BS (${this.id}): Error creating transmitted ray:`, e); }
        }

        ray.terminate('split_bs');
        return newRays;
    }

    // --- Interaction for Polarizing Beam Splitter (PBS) ---
    _interactPBS(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        let diagDir = Vector.fromAngle(this.angleRad + Math.PI / 4);
        let diagNormal = new Vector(-diagDir.y, diagDir.x).normalize();
        // Orient normal to face the ray
        if (incidentDirection.dot(diagNormal) > 0) diagNormal = diagNormal.multiply(-1);
        // Choose p-axis direction closest to incident direction for consistency across faces
        const dot1 = Math.abs(diagDir.normalize().dot(incidentDirection.normalize()));
        const dot2 = Math.abs(diagDir.multiply(-1).normalize().dot(incidentDirection.normalize()));
        if (dot2 > dot1) diagDir = diagDir.multiply(-1);
        const pAxisAngle = diagDir.angle();
        const sAxisAngle = Math.atan2(Math.sin(pAxisAngle + Math.PI / 2), Math.cos(pAxisAngle + Math.PI / 2));

        if (ray.hasJones && ray.hasJones()) {
            const Rp = Ray._rot2(-pAxisAngle);
            const v_ps = Ray._apply2x2(Rp, ray.jones);
            const v_p = { Ex: v_ps.Ex, Ey: { re: 0, im: 0 } };
            const v_s = { Ex: { re: 0, im: 0 }, Ey: v_ps.Ey };
            const Rb = Ray._rot2(pAxisAngle);
            const j_trans = Ray._apply2x2(Rb, v_p);
            const minus1 = { re: -1, im: 0 };
            const j_refl0 = Ray._apply2x2(Rb, v_s);
            const j_refl = { Ex: Ray._cMul(j_refl0.Ex, minus1), Ey: Ray._cMul(j_refl0.Ey, minus1) };

            const inAmp2 = ray.jonesIntensity();
            const tAmp2 = Ray._cAbs2(j_trans.Ex) + Ray._cAbs2(j_trans.Ey);
            const rAmp2 = Ray._cAbs2(j_refl.Ex) + Ray._cAbs2(j_refl.Ey);
            const tI = inAmp2 > 1e-12 ? ray.intensity * (tAmp2 / inAmp2) : 0;
            const rI = inAmp2 > 1e-12 ? ray.intensity * (rAmp2 / inAmp2) : 0;

            if (tI >= ray.minIntensityThreshold) {
                const o = hitPoint.add(incidentDirection.multiply(1e-6));
                const tRay = new RayClass(o, incidentDirection, ray.wavelengthNm, tI, ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, pAxisAngle, ray.ignoreDecay, ray.history.concat([o.clone()]));
                tRay.setJones(j_trans);
                newRays.push(tRay);
            }

            const I = incidentDirection; const N = diagNormal; const dot_I_N = I.dot(N);
            const Rdir = I.subtract(N.multiply(2 * dot_I_N)).normalize();
            if (rI >= ray.minIntensityThreshold && !isNaN(Rdir.x)) {
                const o = hitPoint.add(Rdir.multiply(1e-6));
                const rRay = new RayClass(o, Rdir, ray.wavelengthNm, rI, ray.phase + Math.PI, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, sAxisAngle, ray.ignoreDecay, ray.history.concat([o.clone()]));
                rRay.setJones(j_refl);
                newRays.push(rRay);
            }
        } else {
            // Fallback
            let tI, rI;
            if (typeof ray.polarizationAngle === 'number') {
                const d = ray.polarizationAngle - pAxisAngle;
                const c2 = Math.cos(d) ** 2; const s2 = 1 - c2;
                tI = ray.intensity * c2; rI = ray.intensity * s2;
            } else {
                tI = ray.intensity * (1 - this.pbsUnpolarizedReflectivity);
                rI = ray.intensity * this.pbsUnpolarizedReflectivity;
            }
            if (tI >= ray.minIntensityThreshold) {
                const o = hitPoint.add(incidentDirection.multiply(1e-6));
                newRays.push(new RayClass(o, incidentDirection, ray.wavelengthNm, tI, ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, pAxisAngle, ray.ignoreDecay, ray.history.concat([o.clone()])));
            }
            const I = incidentDirection; const N = diagNormal; const dot_I_N = I.dot(N);
            const Rdir = I.subtract(N.multiply(2 * dot_I_N)).normalize();
            if (rI >= ray.minIntensityThreshold && !isNaN(Rdir.x)) {
                const o = hitPoint.add(Rdir.multiply(1e-6));
                newRays.push(new RayClass(o, Rdir, ray.wavelengthNm, rI, ray.phase + Math.PI, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, sAxisAngle, ray.ignoreDecay, ray.history.concat([o.clone()])));
            }
        }

        ray.terminate('split_pbs');
        return newRays;
    }


    // --- Property Management ---
    getProperties() {
        const baseProps = super.getProperties();
        const props = {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度', type: 'number', min: 1, step: 1 },
            type: {
                value: this.type,
                label: '类型',
                type: 'select',
                options: [
                    { value: 'BS', label: '标准分束器 (BS)' },
                    { value: 'PBS', label: '偏振分束器 (PBS)' }
                ]
            }
        };

        // Add appropriate ratio property based on type
        if (this.type === 'BS') {
            props.splitRatio = { // Reflectivity Ratio for BS
                value: this.splitRatio.toString(),
                label: '反射比(BS %)', // Clarify label
                type: 'select',
                options: [ // Common R/T ratios
                    { value: '0.1', label: '10/90' }, { value: '0.2', label: '20/80' },
                    { value: '0.3', label: '30/70' }, { value: '0.4', label: '40/60' },
                    { value: '0.5', label: '50/50' }, { value: '0.6', label: '60/40' },
                    { value: '0.7', label: '70/30' }, { value: '0.8', label: '80/20' },
                    { value: '0.9', label: '90/10' }, { value: '1.0', label: '100/0 (Mirror)' },
                    { value: '0.0', label: '0/100 (Window)' }
                ]
            };
        } else if (this.type === 'PBS') {
            props.pbsUnpolarizedReflectivity = { // Ratio for unpolarized input for PBS
                value: this.pbsUnpolarizedReflectivity.toString(),
                label: '反射比(PBS Unpol %)', // Clarify label: This ratio applies to unpolarized input
                type: 'select',
                options: [ // Use the same broad range as BS ratio
                    { value: '0.1', label: '10/90' }, { value: '0.2', label: '20/80' },
                    { value: '0.3', label: '30/70' }, { value: '0.4', label: '40/60' },
                    { value: '0.5', label: '50/50' }, { value: '0.6', label: '60/40' },
                    { value: '0.7', label: '70/30' }, { value: '0.8', label: '80/20' },
                    { value: '0.9', label: '90/10' }, { value: '1.0', label: '100/0 (Mirror)' },
                    { value: '0.0', label: '0/100 (Window)' }
                ]
            };
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
                if (!isNaN(l) && l >= 1 && Math.abs(l - this.length) > 1e-6) {
                    this.length = l; needsGeomUpdate = true;
                }
                break;
            case 'type':
                if ((value === 'BS' || value === 'PBS') && this.type !== value) {
                    this.type = value;
                    needsOpticUpdate = true;
                    needsInspectorRefresh = true;
                    this._updateGeometry(); // Update label immediately
                }
                break;
            case 'splitRatio': // Only used by BS
                if (this.type === 'BS') {
                    const r = parseFloat(value);
                    if (!isNaN(r)) {
                        const c = Math.max(0, Math.min(1, r));
                        if (Math.abs(c - this.splitRatio) > 1e-9) {
                            this.splitRatio = c; needsOpticUpdate = true;
                        }
                    } else { console.warn("Invalid value received for splitRatio:", value); }
                }
                break;
            case 'pbsUnpolarizedReflectivity': // Only used by PBS
                if (this.type === 'PBS') {
                    const r = parseFloat(value);
                    if (!isNaN(r)) {
                        const c = Math.max(0, Math.min(1, r));
                        if (Math.abs(c - this.pbsUnpolarizedReflectivity) > 1e-9) {
                            this.pbsUnpolarizedReflectivity = c; needsOpticUpdate = true;
                        }
                    } else { console.warn("Invalid value received for pbsUnpolarizedReflectivity:", value); }
                }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) { try { this._updateGeometry(); } catch (e) { console.error("Error updating BS geometry:", e); } needsRetrace = true; }
        if (needsOpticUpdate) { needsRetrace = true; }
        if (needsInspectorRefresh) {
            if (selectedComponent === this) {
                updateInspector(); // Refresh inspector immediately if selected
            }
        }
        return true;
    }
}

// --- DielectricBlock (Revision 2: Physics Accuracy Focus) ---
class DielectricBlock extends OpticalComponent {
    static functionDescription = "介质块内发生折射与反射，可模拟全反射与色散。";
    constructor(pos, width = 100, height = 60, angleDeg = 0, baseRefractiveIndex = 1.5, dispersionCoeffB_nm2 = 5000, absorptionCoeff = 0.001, showEvanescentWave = false) {
        super(pos, angleDeg, "介质块");
        this.width = Math.max(10, width);
        this.height = Math.max(10, height);
        this.baseRefractiveIndex = Math.max(1.0, baseRefractiveIndex);
        this.dispersionCoeffB_nm2 = dispersionCoeffB_nm2;
        this.absorptionCoeff = Math.max(0.0, absorptionCoeff);
        this.showEvanescentWave = showEvanescentWave; // Visualization placeholder

        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB_nm2 / (550 * 550);

        this.localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = [];
        this.worldNormals = []; // Geometric OUTWARD normals
        try { this._updateGeometry(); } catch (e) { console.error("Init DielectricBlock geom error:", e); }
    }
    // --- Add inside DielectricBlock class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            width: this.width,
            height: this.height,
            baseRefractiveIndex: this.baseRefractiveIndex,
            dispersionCoeffB_nm2: this.dispersionCoeffB_nm2,
            absorptionCoeff: this.absorptionCoeff,
            showEvanescentWave: this.showEvanescentWave
        };
    }


    _updateCauchyA() {
        this._cauchyA = this.baseRefractiveIndex - this.dispersionCoeffB_nm2 / (550 * 550);
    }

    getRefractiveIndex(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        if (this.dispersionCoeffB_nm2 <= 1e-9 || wavelengthNm <= 0) {
            return this.baseRefractiveIndex;
        }
        const n = this._cauchyA + this.dispersionCoeffB_nm2 / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n);
    }

    _updateGeometry() { // --- No changes needed here ---
        if (!(this.pos instanceof Vector)) return;
        this.worldVertices = this.localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
        this.worldNormals = []; // Geometric OUTWARD normals
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector)) { this.worldNormals.push(new Vector(1, 0)); continue; }
            const edgeVec = p2.subtract(p1); const normal = new Vector(edgeVec.y, -edgeVec.x).normalize(); // Outward normal
            this.worldNormals.push(normal);
        }
        if (this.worldNormals.some(n => !n || isNaN(n.x))) { console.error(`DielectricBlock (${this.id}): NaN in normals.`); }
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) PosChange error:`, e); } }

    draw(ctx) { // --- No changes needed here from previous version ---
        if (!this.worldVertices || this.worldVertices.length !== 4) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#aaddaa';
        ctx.lineWidth = this.selected ? 2 : 1;
        const avgDimension = (this.width + this.height) / 2.0;
        const transmissionFactor = Math.exp(-this.absorptionCoeff * avgDimension);
        const baseAlpha = 0.15; const absorbedAlpha = 0.4;
        const alpha = baseAlpha + (absorbedAlpha - baseAlpha) * (1.0 - transmissionFactor);
        ctx.fillStyle = `rgba(170, 221, 170, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        const v0 = this.worldVertices[0];
        if (v0 instanceof Vector) {
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i <= 4; i++) { const v = this.worldVertices[i % 4]; if (v instanceof Vector) ctx.lineTo(v.x, v.y); else break; }
            ctx.fill(); ctx.stroke();
        }
        if (this.selected) {
            ctx.fillStyle = '#FFFFFF'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(`n(${DEFAULT_WAVELENGTH_NM}nm) ≈ ${this.getRefractiveIndex(DEFAULT_WAVELENGTH_NM).toFixed(3)}`, this.pos.x, this.pos.y - 5);
        }
    }

    getBoundingBox() { // --- No changes needed here ---
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => { if (v instanceof Vector) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } });
        const buffer = 2;
        return (minX === Infinity || isNaN(minX)) ? super.getBoundingBox() : { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // --- No changes needed here ---
        if (!point || !this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return false;
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const normal = this.worldNormals[i]; // Use geometric outward normal
            if (!(p1 instanceof Vector) || !(normal instanceof Vector)) return false;
            const vecToPoint = point.subtract(p1); if (vecToPoint.dot(normal) > 1e-9) return false; // Check against outward normal
        } return true;
    }

    intersect(rayOrigin, rayDirection) { // --- No changes needed here ---
        let closestHit = null; let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4]; const edgeNormal = this.worldNormals[i]; // Geometric outward normal
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector) || !(edgeNormal instanceof Vector) || isNaN(p1.x) || isNaN(edgeNormal.x)) continue;
            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1); const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    if (t1 < closestDist) {
                        closestDist = t1; const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        // Interaction normal points TOWARDS the ray
                        let interactionNormal = edgeNormal.clone();
                        if (rayDirection.dot(interactionNormal) > 0) { // If ray hits from "behind" the outward normal...
                            interactionNormal = interactionNormal.multiply(-1); // ...flip it to point towards ray
                        } else {
                            // Ray is hitting the front face, normal already points "inwards" relative to surface,
                            // but needs to point back along the ray path for the formulas.
                            // The intersect function MUST return the normal pointing TOWARDS the ray origin.
                            // If edgeNormal is outward, and ray hits front (ray.dot(edgeNormal) < 0),
                            // then the interaction normal should be -edgeNormal.
                            // Let's re-evaluate this logic simply:
                            interactionNormal = edgeNormal.multiply(-1.0); // Default: point inwards from the surface
                            // Now, ensure it points towards the ray origin:
                            if (rayDirection.dot(interactionNormal) > 1e-9) {
                                // This should not happen if logic is right, but as safety:
                                interactionNormal = interactionNormal.multiply(-1.0);
                            }
                        }

                        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x) || interactionNormal.magnitudeSquared() < 0.5) {
                            console.error(`DielectricBlock (${this.id}) intersect generated invalid normal/point for edge ${i}`);
                            continue;
                        }
                        closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: i };
                    }
                }
            }
        } return closestHit ? [closestHit] : [];
    }

    // --- COMPLETELY REVISED interact METHOD ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        // *** CRITICAL: Use the interaction normal provided by intersect() ***
        // This normal points TOWARDS the incoming ray origin.
        const N = intersectionInfo.normal;
        const I = ray.direction; // Incident direction vector
        const N_OUTSIDE = N_AIR || 1.0;

        // --- Basic validation ---
        if (!(hitPoint instanceof Vector) || !(N instanceof Vector) || !(I instanceof Vector) ||
            isNaN(hitPoint.x) || isNaN(N.x) || isNaN(I.x) || N.magnitudeSquared() < 0.5) {
            console.error(`DielectricBlock (${this.id}): Invalid geometry/normal for interact.`);
            ray.terminate('invalid_geom_interact_block'); return [];
        }

        // --- Get refractive indices ---
        let n_block = this.baseRefractiveIndex; // Fallback
        try { n_block = this.getRefractiveIndex(ray.wavelengthNm); if (isNaN(n_block)) n_block = this.baseRefractiveIndex; }
        catch (e) { console.error(`DielectricBlock (${this.id}) Error getRefractiveIndex:`, e); }

        // --- Determine incident and transmitted indices (n1, n2) ---
        // Use the geometric outward normal associated with the hit surface to determine if entering/exiting
        const geometricOutwardNormal = this.worldNormals[intersectionInfo.surfaceId];
        if (!geometricOutwardNormal || isNaN(geometricOutwardNormal.x)) {
            console.error(`DielectricBlock (${this.id}): Cannot determine entry/exit due to invalid geometric normal.`);
            ray.terminate('internal_error_normal_block'); return [];
        }
        const isEntering = I.dot(geometricOutwardNormal) < -1e-9; // Ray moving against outward normal? Entering.
        const n1 = isEntering ? N_OUTSIDE : n_block;
        const n2 = isEntering ? n_block : N_OUTSIDE;

        // Handle index match
        if (Math.abs(n1 - n2) < 1e-9) {
            const transmitOrigin = hitPoint.add(I.multiply(1e-6));
            try {
                const transmittedRay = new RayClass(transmitOrigin, I, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()]));
                ray.terminate('pass_boundary_block'); return transmittedRay.shouldTerminate() ? [] : [transmittedRay];
            } catch (e) { ray.terminate('error_passthrough_block'); return []; }
        }

        // --- Calculate angles using the INTERACTION normal N (points towards ray) ---
        // cosI = angle between -I and N
        const cosI = Math.max(0.0, Math.min(1.0, I.multiply(-1.0).dot(N)));
        // Clamp cosI to prevent sqrt(negative) if slightly > 1 due to float errors
        if (cosI > 1.0) cosI = 1.0;
        const sinI2 = 1.0 - cosI * cosI;

        // --- Check for TIR ---
        const nRatio = n1 / n2;
        const sinT2 = nRatio * nRatio * sinI2;
        const isTotalInternalReflection = (n1 > n2) && (sinT2 >= 1.0 - 1e-9); // Check TIR condition

        // --- Calculate Reflectivity (Fresnel Equations) ---
        let R = 0.0; // Reflectivity
        let cosT = 0.0;
        if (isTotalInternalReflection) {
            R = 1.0;
        } else if (sinT2 < 0) {
            // Should not happen with real indices and valid sinI2
            console.warn(`DielectricBlock (${this.id}): Negative sinT2 encountered (${sinT2.toFixed(4)}). Forcing TIR.`);
            R = 1.0; // Force TIR as a safeguard
        } else {
            cosT = Math.sqrt(1.0 - sinT2); // cos(theta_transmission)

            // Fresnel equations for amplitude reflection coefficients (r_s, r_p)
            const n1cosI = n1 * cosI;
            const n2cosT = n2 * cosT;
            const n1cosT = n1 * cosT;
            const n2cosI = n2 * cosI;

            const rs_den = n1cosI + n2cosT;
            const rp_den = n1cosT + n2cosI;

            // Handle potential division by zero (grazing angles)
            const rs = (Math.abs(rs_den) < 1e-9) ? 1.0 : (n1cosI - n2cosT) / rs_den;
            const rp = (Math.abs(rp_den) < 1e-9) ? 1.0 : (n1cosT - n2cosI) / rp_den;

            // Intensity Reflectivity for unpolarized light: R = 0.5 * (rs^2 + rp^2)
            R = 0.5 * (rs * rs + rp * rp);
            R = Math.max(0.0, Math.min(1.0, R)); // Clamp to [0, 1]
        }

        // --- Calculate Absorption (only if exiting) ---
        let absorptionFactor = 1.0;
        let pathLengthInMedium = 0; // Store for potential use/debugging
        if (!isEntering && this.absorptionCoeff > 1e-9 && ray.history.length >= 2) {
            const entryPoint = ray.history[ray.history.length - 2];
            if (entryPoint instanceof Vector) {
                pathLengthInMedium = hitPoint.distanceTo(entryPoint);
                if (!isNaN(pathLengthInMedium) && pathLengthInMedium > 0) {
                    absorptionFactor = Math.exp(-this.absorptionCoeff * pathLengthInMedium);
                }
            }
        }
        const intensityBeforeSplit = isEntering ? ray.intensity : ray.intensity * absorptionFactor;


        // --- Generate Result Rays ---
        const resultRays = [];
        const nextBounces = ray.bouncesSoFar + 1;

        // 1. Reflected Ray
        const reflectedIntensity = intensityBeforeSplit * R;
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            // Correct Reflection Law Vector: R = I + 2*cosI*N (since N points towards ray, I.N is negative)
            // Or using the standard R = I - 2*(I.N_geom)*N_geom where N_geom points out.
            // Let's use the interaction normal N: R = I - 2 * (I.N) * N
            const reflectedDir = I.subtract(N.multiply(2.0 * I.dot(N))).normalize();
            const reflectOrigin = hitPoint.add(reflectedDir.multiply(1e-6));
            try {
                if (isNaN(reflectOrigin.x) || isNaN(reflectedDir.x) || reflectedDir.magnitudeSquared() < 0.5) throw new Error("NaN/zero reflected dir");
                const reflectedRay = new RayClass(reflectOrigin, reflectedDir, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, nextBounces, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()]));
                if (!reflectedRay.terminated) resultRays.push(reflectedRay);
            } catch (e) { console.error(`DielectricBlock (${this.id}) Error reflected ray:`, e); }
        }

        // 2. Transmitted (Refracted) Ray
        if (!isTotalInternalReflection) {
            const T = 1.0 - R; // Transmittance (intensity)
            const transmittedIntensity = intensityBeforeSplit * T;
            if (transmittedIntensity >= ray.minIntensityThreshold) {
                // Correct Vector Snell's Law: T = (n1/n2)*I + [ (n1/n2)*cosI - cosT ]*N (using interaction normal N)
                const refractedDir = I.multiply(nRatio).add(N.multiply(nRatio * cosI - cosT)).normalize();
                const refractOrigin = hitPoint.add(refractedDir.multiply(1e-6));
                try {
                    if (isNaN(refractOrigin.x) || isNaN(refractedDir.x) || refractedDir.magnitudeSquared() < 0.5) throw new Error("NaN/zero refracted dir");
                    const refractedRay = new RayClass(refractOrigin, refractedDir, ray.wavelengthNm, transmittedIntensity, ray.phase, nextBounces, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([refractOrigin.clone()]));
                    if (!refractedRay.terminated) resultRays.push(refractedRay);
                } catch (e) { console.error(`DielectricBlock (${this.id}) Error refracted ray:`, e); }
            }
        }

        // --- Evanescent Wave Placeholder ---
        // (No actual ray created, maybe add visual effect in draw() later)
        if (isTotalInternalReflection && this.showEvanescentWave) {
            // console.log(`Evanescent wave visualization point at TIR for ray ${ray.sourceId}`);
        }

        ray.terminate(isTotalInternalReflection ? 'tir_block' : 'split_block');
        return resultRays;
    }
    // --- END OF REVISED interact METHOD ---

    getProperties() { // --- No changes needed here from previous version ---
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 10, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 10, step: 1 },
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '折射率 (n@550nm)', type: 'number', min: 1.0, step: 0.01 },
            dispersionCoeffB_nm2: { value: this.dispersionCoeffB_nm2.toFixed(0), label: '色散 B (nm²)', type: 'number', min: 0, step: 100 },
            absorptionCoeff: { value: this.absorptionCoeff.toFixed(4), label: '吸收系数 (/px)', type: 'number', min: 0.0, step: 0.0001 },
            showEvanescentWave: { value: this.showEvanescentWave, label: '显示倏逝波 (占位)', type: 'checkbox' }
        };
    }

    setProperty(propName, value) { // --- No changes needed here from previous version ---
        if (super.setProperty(propName, value)) { return true; }
        let needsGeomUpdate = false; let needsOpticalUpdate = false;
        switch (propName) {
            case 'width': const w = parseFloat(value); if (!isNaN(w) && w >= 10 && Math.abs(w - this.width) > 1e-6) { this.width = w; needsGeomUpdate = true; } break;
            case 'height': const h = parseFloat(value); if (!isNaN(h) && h >= 10 && Math.abs(h - this.height) > 1e-6) { this.height = h; needsGeomUpdate = true; } break;
            case 'baseRefractiveIndex': const n = parseFloat(value); if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) { this.baseRefractiveIndex = n; this._updateCauchyA(); needsOpticalUpdate = true; } break;
            case 'dispersionCoeffB_nm2': const d = parseFloat(value); if (!isNaN(d) && d >= 0.0 && Math.abs(d - this.dispersionCoeffB_nm2) > 1e-9) { this.dispersionCoeffB_nm2 = d; this._updateCauchyA(); needsOpticalUpdate = true; } break;
            case 'absorptionCoeff': const abs = parseFloat(value); if (!isNaN(abs) && abs >= 0 && Math.abs(abs - this.absorptionCoeff) > 1e-9) { this.absorptionCoeff = abs; needsOpticalUpdate = true; } break;
            case 'showEvanescentWave': const show = !!value; if (this.showEvanescentWave !== show) { this.showEvanescentWave = show; needsOpticalUpdate = true; } break;
            default: return false;
        }
        if (needsGeomUpdate) {
            this.localVertices = [new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2), new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)];
            try { this._updateGeometry(); } catch (e) { console.error(`DielectricBlock (${this.id}) setProperty geom update error:`, e); }
            needsRetrace = true;
        } if (needsOpticalUpdate) { needsRetrace = true; }
        return true;
    }
}

// --- Photodiode (Power Meter) ---
class Photodiode extends OpticalComponent {
    static functionDescription = "将入射光功率转为读数，用于测量光强。";
    constructor(pos, angleDeg = 0, diameter = 20) {
        super(pos, angleDeg, "光度计");
        this.diameter = Math.max(1, diameter); // Diameter of the sensitive area

        // Data storage
        this.incidentPower = 0.0; // Total intensity accumulated
        this.hitCount = 0;
        this._displayValue = "0.000"; // Cached value for drawing

        // Geometry cache (center is this.pos, normal determines orientation)
        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2); // Normal points along detection direction
        this.radius = this.diameter / 2.0;
        this.radiusSq = this.radius * this.radius;
    }


    // --- Add inside Photodiode class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            diameter: this.diameter
            // Don't save incidentPower, hitCount, _displayValue (runtime state)
        };
    }

    // Method to reset accumulated power
    reset() {
        this.incidentPower = 0.0;
        this.hitCount = 0;
        this._displayValue = "0.000";
    }

    // Recalculate geometry/cached values if properties change
    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.normal = Vector.fromAngle(this.angleRad + Math.PI / 2);
        this.radius = this.diameter / 2.0;
        this.radiusSq = this.radius * this.radius;
        this.reset(); // Reset data when geometry changes
    }

    // Update geometry if angle changes
    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Photodiode (${this.id}) AngleChange error:`, e); } }
    // Position change doesn't require geometry update unless we draw relative stuff
    onPositionChanged() { this.reset(); } // Reset data if position changes

    draw(ctx) {
        const radius = this.radius;
        const pos = this.pos;

        // Draw the circular detector area
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA'; // Gray, yellow if selected
        ctx.fillStyle = this.selected ? 'rgba(80,80,80,0.5)' : 'rgba(50,50,50,0.5)'; // Dark fill
        ctx.lineWidth = this.selected ? 2 : 1;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw indicator line for orientation (normal direction)
        const lineEnd = pos.add(this.normal.multiply(radius * 1.2));
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#AAAAAA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(lineEnd.x, lineEnd.y);
        ctx.stroke();

        // Display the measured power
        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        // Position text slightly below the detector
        ctx.fillText(this._displayValue, pos.x, pos.y + radius + 12);
    }

    getBoundingBox() {
        const buffer = 2;
        return {
            x: this.pos.x - this.radius - buffer,
            y: this.pos.y - this.radius - buffer,
            width: (this.radius + buffer) * 2,
            height: (this.radius + buffer) * 2
        };
    }

    // Simple circular collision check
    _containsPointBody(point) {
        if (!point || !(this.pos instanceof Vector)) return false;
        return point.distanceSquaredTo(this.pos) <= this.radiusSq;
    }


    // Find intersection with the detector plane
    intersect(rayOrigin, rayDirection) {
        // Plane equation: (P - P0) . N = 0
        // Ray equation: P = O + t*D
        // Substitute: (O + t*D - P0) . N = 0
        // t * (D . N) + (O - P0) . N = 0
        // t = - (O - P0) . N / (D . N)
        // P0 is detector center (this.pos), N is detector normal (this.normal)

        const N = this.normal; // Normal pointing out from detector face
        const P0 = this.pos;
        const O = rayOrigin;
        const D = rayDirection;

        const D_dot_N = D.dot(N);

        // Check if ray is parallel to the detector plane or hitting from behind
        // We want D_dot_N to be negative (ray hitting the front face)
        if (D_dot_N >= -1e-9) {
            return []; // Parallel or hitting back face
        }

        const O_minus_P0 = O.subtract(P0);
        const O_minus_P0_dot_N = O_minus_P0.dot(N);

        // Avoid division by zero if D_dot_N is extremely small
        if (Math.abs(D_dot_N) < 1e-9) {
            return [];
        }

        const t = -O_minus_P0_dot_N / D_dot_N;

        // Check if intersection is in front of the ray
        if (t < 1e-6) {
            return [];
        }

        const intersectionPoint = O.add(D.multiply(t));

        // Check if the intersection point is within the radius
        const distSqFromCenter = intersectionPoint.distanceSquaredTo(P0);
        if (distSqFromCenter > this.radiusSq + 1e-9) { // Add tolerance for floating point
            return []; // Hit plane, but missed the detector area
        }

        // Valid hit
        // Interaction normal should point back towards the ray
        const interactionNormal = N.multiply(-1.0);
        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) {
            console.error(`Photodiode (${this.id}): NaN in intersection result.`);
            return [];
        }

        return [{
            distance: t,
            point: intersectionPoint,
            normal: interactionNormal,
            surfaceId: 'detector_surface'
        }];
    }

    // Absorb the ray and record its power
    interact(ray, intersectionInfo, RayClass) {
        // NOTE: addHistoryPoint is now called in traceAllRays *before* interact
        // ray.addHistoryPoint(intersectionInfo.point); // <<<--- REMOVED

        // Accumulate intensity (power)
        this.incidentPower += ray.intensity;
        this.hitCount++;

        // Update display value (cache for efficiency)
        try { // Add try-catch for number formatting
            if (this.incidentPower < 0.001 && this.incidentPower > 0) {
                this._displayValue = this.incidentPower.toExponential(2);
            } else if (this.incidentPower < 1000) {
                this._displayValue = this.incidentPower.toFixed(3);
            } else {
                this._displayValue = this.incidentPower.toExponential(3);
            }
        } catch (e) {
            console.error("Error formatting photodiode display value:", e, this.incidentPower);
            this._displayValue = "Error";
        }


        // DO NOT TERMINATE THE RAY HERE
        ray.terminate('absorbed_photodiode'); // <<<--- REMOVED / ENSURE IT'S NOT HERE

        // No new rays produced
        return []; // Return empty array, indicating no successors
    }

    // Define properties for the inspector
    getProperties() {
        const baseProps = super.getProperties();
        // Add read-only display for power, make diameter editable
        return {
            ...baseProps,
            diameter: { value: this.diameter.toFixed(1), label: '孔径 (直径)', type: 'number', min: 1, step: 1 },
            measuredPower: { value: this._displayValue, label: '测量光强', type: 'text', readonly: true }, // Read-only display
            // hitCount: { value: this.hitCount, label: '命中次数', type: 'number', readonly: true } // Optional debug info
        };
    }

    // Handle property changes from the inspector
    setProperty(propName, value) {
        // Handle base properties first
        if (super.setProperty(propName, value)) {
            // Position change handled by onPositionChanged -> reset()
            // Angle change handled by onAngleChanged -> _updateGeometry -> reset()
            needsRetrace = true; // Ensure base property changes trigger retrace
            return true;
        }

        let needsGeomUpdate = false;

        switch (propName) {
            case 'diameter':
                const d = parseFloat(value);
                if (!isNaN(d) && d >= 1 && Math.abs(d - this.diameter) > 1e-6) {
                    this.diameter = d;
                    needsGeomUpdate = true;
                }
                break;
            case 'measuredPower':
            case 'hitCount':
                // Read-only properties, do nothing
                break;
            default:
                return false; // Property not handled
        }

        if (needsGeomUpdate) {
            try { this._updateGeometry(); } catch (e) { console.error(`Photodiode (${this.id}) setProperty geom update error:`, e); }
            needsRetrace = true; // Geometry change requires retrace
        }

        return true; // Property handled
    }
}

class OpticalFiber extends OpticalComponent {
    static functionDescription = "模拟光纤耦合与传输损耗，限制入射角与数值孔径。";
    constructor(pos, initialOutputPos, angleDeg = 0, outputAngleDeg = 0, numericalAperture = 0.22, coreDiameter = 9, fiberIntrinsicEfficiency = 1.0, transmissionLossDbPerKm = 0.0, facetLength = 15) {
        super(pos, angleDeg, "光纤");

        // 确保输出位置是有效的Vector
        this.outputPos = initialOutputPos instanceof Vector ? initialOutputPos.clone() : new Vector(pos.x + 100, pos.y);

        // 输入和输出角度（弧度）
        this.outputAngleRad = outputAngleDeg * Math.PI / 180;

        // 光学特性
        this.coreDiameter = Math.max(1, coreDiameter);
        this.numericalAperture = Math.max(0.01, Math.min(1.0, numericalAperture));
        this.fiberIntrinsicEfficiency = Math.max(0, Math.min(1, fiberIntrinsicEfficiency));
        this.transmissionLossDbPerKm = Math.max(0, transmissionLossDbPerKm);
        this.facetLength = Math.max(5, facetLength);

        // 几何缓存
        this.fiberLength = 0;
        this.acceptanceAngleRad = Math.asin(this.numericalAperture / N_AIR);
        this.inputFacetP1 = null;
        this.inputFacetP2 = null;
        this.inputFacetNormal = null;
        this.outputFacetP1 = null;
        this.outputFacetP2 = null;
        this.outputFacetNormal = null;

        // 光线追踪状态
        this.outputRaysPending = [];
        this.lastCalculatedCouplingFactor = 0.0;
        this.hitCount = 0;

        // 拖动状态
        this.draggingOutput = false;
        this.draggingOutputAngle = false;
        this.outputAngleDragStartAngle = 0;
        this.outputAngleDragStartMouseAngle = 0;

        // 初始化几何形状
        this._updateGeometry();
    }


      // --- Ensure this is inside OpticalFiber class ---
      toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            // Output position and angle
            outputX: this.outputPos.x,
            outputY: this.outputPos.y,
            outputAngleDeg: this.outputAngleRad * (180 / Math.PI),
            // Optical properties
            numericalAperture: this.numericalAperture,
            coreDiameter: this.coreDiameter,
            fiberIntrinsicEfficiency: this.fiberIntrinsicEfficiency,
            transmissionLossDbPerKm: this.transmissionLossDbPerKm,
            facetLength: this.facetLength
            // We don't save fiberLength, acceptanceAngleRad as they are calculated
        };
    }

    // 更新几何形状
    _updateGeometry() {
        if (!(this.pos instanceof Vector) || !(this.outputPos instanceof Vector)) return;

        // 计算光纤长度和方向
        const fiberVec = this.outputPos.subtract(this.pos);
        this.fiberLength = fiberVec.magnitude();

        // 输入端面法线和端点
        this.inputFacetNormal = Vector.fromAngle(this.angleRad);
        const inputFacetDir = this.inputFacetNormal.rotate(Math.PI / 2);
        const inputHalfFacetVec = inputFacetDir.multiply(this.facetLength / 2);
        this.inputFacetP1 = this.pos.subtract(inputHalfFacetVec);
        this.inputFacetP2 = this.pos.add(inputHalfFacetVec);

        // 输出端面法线和端点
        this.outputFacetNormal = Vector.fromAngle(this.outputAngleRad);
        const outputFacetDir = this.outputFacetNormal.rotate(Math.PI / 2);
        const outputHalfFacetVec = outputFacetDir.multiply(this.facetLength / 2);
        this.outputFacetP1 = this.outputPos.subtract(outputHalfFacetVec);
        this.outputFacetP2 = this.outputPos.add(outputHalfFacetVec);

        // 计算接受角
        this.acceptanceAngleRad = Math.asin(this.numericalAperture / N_AIR);

        // 重置光线状态
        this.reset();
    }

    // 基类位置/角度变化回调
    onPositionChanged() { this._updateGeometry(); }
    onAngleChanged() { this._updateGeometry(); }

    // 重置光线状态
    reset() {
        this.outputRaysPending = [];
        this.lastCalculatedCouplingFactor = 0.0;
        this.hitCount = 0;
    }

    // 获取角度控制点位置
    _getOutputAngleHandlePos() {
        if (!this.outputPos || !this.outputFacetNormal) return null;
        const offset = 30;
        return this.outputPos.add(this.outputFacetNormal.multiply(offset));
    }

    // 判断点是否在输出角度控制点上
    _isPointOnOutputAngleHandle(point) {
        const handlePos = this._getOutputAngleHandlePos();
        if (!handlePos || !point) return false;

        const handleRadius = 6;
        const clickRadius = handleRadius + 10;
        return point.distanceSquaredTo(handlePos) <= clickRadius * clickRadius;
    }

    // 绘制组件
    draw(ctx) {
        if (!this.pos || !this.outputPos) return;

        // 绘制光纤主体（虚线）
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#5588AA';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.outputPos.x, this.outputPos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制输入端面
        if (this.inputFacetP1 && this.inputFacetP2) {
            ctx.strokeStyle = this.selected ? '#00FF00' : '#88AAFF';
            ctx.lineWidth = this.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(this.inputFacetP1.x, this.inputFacetP1.y);
            ctx.lineTo(this.inputFacetP2.x, this.inputFacetP2.y);
            ctx.stroke();
        }

        // 绘制输出端面
        if (this.outputFacetP1 && this.outputFacetP2) {
            ctx.strokeStyle = this.selected ? '#00FFFF' : '#88AAFF';
            ctx.lineWidth = this.selected ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(this.outputFacetP1.x, this.outputFacetP1.y);
            ctx.lineTo(this.outputFacetP2.x, this.outputFacetP2.y);
            ctx.stroke();
        }

        // 绘制控制点
        const handleRadius = 6;

        // 输入控制点
        ctx.fillStyle = this.selected && this.dragging ? '#FF0000' : (this.selected ? '#FFFF00' : '#888888');
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, handleRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 输出控制点
        ctx.fillStyle = this.selected && this.draggingOutput ? '#FF0000' : (this.selected ? '#FFFF00' : '#888888');
        ctx.beginPath();
        ctx.arc(this.outputPos.x, this.outputPos.y, handleRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }

    // 绘制选中状态（包括角度控制点）
    drawSelection(ctx) {
        super.drawSelection(ctx);

        if (this.selected) {
            // 绘制输出角度控制点
            const outputHandlePos = this._getOutputAngleHandlePos();
            if (outputHandlePos) {
                const radius = 6;

                // 连接线
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.outputPos.x, this.outputPos.y);
                ctx.lineTo(outputHandlePos.x, outputHandlePos.y);
                ctx.stroke();

                // 控制点
                ctx.fillStyle = this.draggingOutputAngle ? '#FF0000' : '#FFFF00';
                ctx.strokeStyle = '#000000';
                ctx.beginPath();
                ctx.arc(outputHandlePos.x, outputHandlePos.y, radius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();

                // 旋转指示器
                ctx.beginPath();
                ctx.arc(outputHandlePos.x, outputHandlePos.y, radius * 1.5, 0, Math.PI * 1.5);
                ctx.stroke();

                // 箭头
                const arrowSize = radius * 0.8;
                const arrowAngle = Math.PI * 1.5;
                const arrowX = outputHandlePos.x + radius * 1.5 * Math.cos(arrowAngle);
                const arrowY = outputHandlePos.y + radius * 1.5 * Math.sin(arrowAngle);

                ctx.beginPath();
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX + arrowSize * Math.cos(arrowAngle - Math.PI * 0.85),
                    arrowY + arrowSize * Math.sin(arrowAngle - Math.PI * 0.85));
                ctx.moveTo(arrowX, arrowY);
                ctx.lineTo(arrowX + arrowSize * Math.cos(arrowAngle + Math.PI * 0.85),
                    arrowY + arrowSize * Math.sin(arrowAngle + Math.PI * 0.85));
                ctx.stroke();
            }
        }
    }

    // 判断点是否在组件上
    containsPoint(point) {
        if (!point) return false;

        // 检查是否在角度控制点上
        if (this.selected) {
            if (this._isPointOnOutputAngleHandle(point)) return true;
            if (super.isPointOnAngleHandle(point)) return true;
        }

        // 检查是否在输入/输出控制点上
        const handleRadius = 8;
        if (this.pos && point.distanceSquaredTo(this.pos) <= handleRadius * handleRadius) return true;
        if (this.outputPos && point.distanceSquaredTo(this.outputPos) <= handleRadius * handleRadius) return true;

        // 检查是否在光纤主体上
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
                return point.distanceSquaredTo(closest) <= 25; // 5^2
            }
        }

        return false;
    }

    // 开始拖动
    startDrag(mousePos) {
        if (!mousePos) return;

        // 重置拖动状态
        this.draggingOutput = false;
        this.draggingOutputAngle = false;

        // 检查是否在输出角度控制点上
        if (this.selected && this._isPointOnOutputAngleHandle(mousePos)) {
            this.draggingOutputAngle = true;
            const vec = mousePos.subtract(this.outputPos);
            this.outputAngleDragStartMouseAngle = vec.angle();
            this.outputAngleDragStartAngle = this.outputAngleRad;
            return;
        }

        // 检查是否在输入角度控制点上
        if (this.selected && super.isPointOnAngleHandle(mousePos)) {
            super.startDrag(mousePos);
            return;
        }

        // 检查是否在输出位置控制点上
        const handleRadius = 8;
        if (this.outputPos && mousePos.distanceSquaredTo(this.outputPos) <= handleRadius * handleRadius) {
            this.draggingOutput = true;
            this.dragOffset = this.outputPos.subtract(mousePos);
            return;
        }

        // 检查是否在输入位置控制点上
        if (this.pos && mousePos.distanceSquaredTo(this.pos) <= handleRadius * handleRadius) {
            super.startDrag(mousePos);
            return;
        }

        // 检查是否在光纤主体上
        if (this.containsPoint(mousePos)) {
            super.startDrag(mousePos);
        }
    }

    // 拖动
    drag(mousePos) {
        if (!mousePos) return;

        if (this.draggingOutputAngle) {
            // 计算角度变化
            const vec = mousePos.subtract(this.outputPos);
            const currentMouseAngle = vec.angle();
            let angleDelta = currentMouseAngle - this.outputAngleDragStartMouseAngle;

            // 处理角度环绕
            if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
            if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;

            // 更新输出角度
            this.outputAngleRad = this.outputAngleDragStartAngle + angleDelta;
            this._updateGeometry();
            needsRetrace = true;
        } else if (this.draggingOutput) {
            // 更新输出位置
            this.outputPos = mousePos.add(this.dragOffset);
            this._updateGeometry();
            needsRetrace = true;
        } else {
            // 让基类处理输入位置/角度拖动
            super.drag(mousePos);
        }
    }

    // 结束拖动
    endDrag() {
        this.draggingOutput = false;
        this.draggingOutputAngle = false;
        super.endDrag();
    }

    // 检查光线与输入端面的交点
    checkInputCoupling(rayOrigin, rayDirection) {
        if (!this.inputFacetP1 || !this.inputFacetP2 || !this.inputFacetNormal) return null;

        // 计算光线与输入端面的交点
        const p1 = this.inputFacetP1;
        const p2 = this.inputFacetP2;
        const N = this.inputFacetNormal;

        // 检查光线是否朝向端面
        const D_dot_N = rayDirection.dot(N);
        if (D_dot_N >= -1e-9) return null; // 光线不朝向端面

        // 计算交点距离
        const tPlane = p1.subtract(rayOrigin).dot(N) / D_dot_N;
        if (tPlane < 1e-6) return null; // 交点在光线起点后面

        // 计算交点
        const hitPoint = rayOrigin.add(rayDirection.multiply(tPlane));

        // 检查交点是否在端面线段上
        const facetVec = p2.subtract(p1);
        const facetLenSq = facetVec.magnitudeSquared();
        const tSegment = hitPoint.subtract(p1).dot(facetVec) / facetLenSq;
        if (tSegment < -1e-6 || tSegment > 1.0 + 1e-6) return null; // 交点不在线段上

        // 检查交点是否在纤芯直径范围内
        const coreRadiusSq = (this.coreDiameter / 2.0) ** 2;
        const distSqFromCenter = hitPoint.distanceSquaredTo(this.pos);
        if (distSqFromCenter > coreRadiusSq + 1e-6) return null; // 交点不在纤芯内

        // 计算入射角与接受角的关系（耦合效率）
        const cosThetaFacet = rayDirection.multiply(-1).dot(N);
        const minCosFacet = Math.cos(this.acceptanceAngleRad);

        // 如果入射角超出接受角，耦合效率为0
        if (cosThetaFacet < minCosFacet - 1e-6) {
            this.lastCalculatedCouplingFactor = 0.0;
            return null;
        }

        // 计算角度因子（入射角越接近法线，耦合效率越高）
        const angleFactor = (minCosFacet < 1.0 - 1e-9)
            ? Math.max(0, Math.min(1, (cosThetaFacet - minCosFacet) / (1.0 - minCosFacet)))
            : 1.0;

        // 计算位置因子（越靠近纤芯中心，耦合效率越高）
        const coreRadius = this.coreDiameter / 2.0;
        const positionFactor = coreRadius < 1e-6
            ? 1.0
            : Math.max(0, 1.0 - (Math.sqrt(distSqFromCenter) / coreRadius));

        // 总耦合因子
        const couplingFactor = Math.max(0, Math.min(1, angleFactor * positionFactor));
        this.lastCalculatedCouplingFactor = couplingFactor;

        // 返回交点信息
        return {
            distance: tPlane,
            point: hitPoint,
            normal: N.multiply(-1.0), // 法线指向光线
            surfaceId: 'input_facet',
            couplingFactor: couplingFactor
        };
    }

    // 处理光线与输入端面的交互
    handleInputInteraction(ray, hitInfo, RayClass) {
        if (!hitInfo || typeof hitInfo.couplingFactor !== 'number') {
            ray.terminate('invalid_coupling');
            return [];
        }

        // 计算耦合光强
        const dynamicCouplingEfficiency = this.fiberIntrinsicEfficiency * hitInfo.couplingFactor;
        const coupledIntensity = ray.intensity * dynamicCouplingEfficiency;

        // 如果耦合光强太低，直接吸收
        if (coupledIntensity < ray.minIntensityThreshold && !ray.ignoreDecay) {
            ray.terminate('too_dim_fiber');
            return [];
        }

        // 计算传输损耗
        let transmissionFactor = 1.0;
        if (this.transmissionLossDbPerKm > 1e-9 && this.fiberLength > 1e-6) {
            const PIXELS_PER_KM = 1e6; // 像素到千米的转换因子
            const lengthKm = this.fiberLength / PIXELS_PER_KM;
            const lossDb = this.transmissionLossDbPerKm * lengthKm;
            transmissionFactor = Math.pow(10, -lossDb / 10.0);
        }

        // 计算输出光强
        const outputIntensity = coupledIntensity * transmissionFactor;

        // 如果输出光强足够，加入待输出队列
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

        // 终止入射光线
        ray.terminate('coupled_fiber');
        this.hitCount++;

        return []; // 不产生新光线
    }

    // 生成输出光线
    generateOutputRays(RayClass) {
        const outputRays = [];

        // 如果没有待输出光线或输出端面无效，返回空数组
        if (this.outputRaysPending.length === 0 || !this.outputPos || !this.outputFacetNormal) {
            return outputRays;
        }

        // 输出方向就是输出端面法线方向
        const outputDirection = this.outputFacetNormal.clone();

        // 处理每个待输出光线
        this.outputRaysPending.forEach(pendingRay => {
            // 创建新光线
            const origin = this.outputPos.add(outputDirection.multiply(1e-6)); // 略微偏移避免自交

            try {
                const newRay = new RayClass(
                    origin,
                    outputDirection,
                    pendingRay.wavelengthNm,
                    pendingRay.intensity,
                    pendingRay.phase,
                    1, // 重置弹射次数
                    N_AIR, // 输出到空气中
                    pendingRay.sourceId,
                    pendingRay.polarizationAngle,
                    pendingRay.ignoreDecay,
                    [origin.clone()] // 新的历史记录
                );

                outputRays.push(newRay);
            } catch (e) {
                console.error(`光纤 (${this.id}) 创建输出光线错误:`, e);
            }
        });

        // 清空待输出队列
        this.outputRaysPending = [];

        return outputRays;
    }

    // 获取组件属性（用于检查器面板）
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

    // 设置组件属性
    setProperty(propName, value) {
        // 先让基类处理基本属性
        if (super.setProperty(propName, value)) {
            return true;
        }

        let needsGeomUpdate = false;
        let needsRetrace = false;

        // 解析并设置属性
        switch (propName) {
            case 'outputX':
                const ox = parseFloat(value);
                if (!isNaN(ox) && this.outputPos) {
                    this.outputPos.x = ox;
                    needsGeomUpdate = true;
                }
                break;

            case 'outputY':
                const oy = parseFloat(value);
                if (!isNaN(oy) && this.outputPos) {
                    this.outputPos.y = oy;
                    needsGeomUpdate = true;
                }
                break;

            case 'outputAngleDeg':
                const oa = parseFloat(value);
                if (!isNaN(oa)) {
                    this.outputAngleRad = oa * Math.PI / 180;
                    needsGeomUpdate = true;
                }
                break;

            case 'numericalAperture':
                const na = parseFloat(value);
                if (!isNaN(na) && na > 0 && na <= 1.0) {
                    this.numericalAperture = na;
                    needsGeomUpdate = true;
                }
                break;

            case 'fiberIntrinsicEfficiency':
                const fie = parseFloat(value);
                if (!isNaN(fie) && fie >= 0 && fie <= 1.0) {
                    this.fiberIntrinsicEfficiency = fie;
                    needsRetrace = true;
                }
                break;

            case 'transmissionLossDbPerKm':
                const tl = parseFloat(value);
                if (!isNaN(tl) && tl >= 0) {
                    this.transmissionLossDbPerKm = tl;
                    needsRetrace = true;
                }
                break;

            case 'coreDiameter':
                const cd = parseFloat(value);
                if (!isNaN(cd) && cd >= 1) {
                    this.coreDiameter = cd;
                    needsGeomUpdate = true;
                }
                break;

            case 'facetLength':
                const fl = parseFloat(value);
                if (!isNaN(fl) && fl >= 5) {
                    this.facetLength = fl;
                    needsGeomUpdate = true;
                }
                break;

            default:
                return false;
        }

        // 更新几何形状和重新追踪
        if (needsGeomUpdate) {
            this._updateGeometry();
            window.needsRetrace = true;
        } else if (needsRetrace) {
            window.needsRetrace = true;
        }

        // 更新检查器面板
        if (this.selected) updateInspector();

        return true;
    }

    // 获取包围盒
    getBoundingBox() {
        if (!this.pos || !this.outputPos) return { x: 0, y: 0, width: 0, height: 0 };

        const minX = Math.min(this.pos.x, this.outputPos.x);
        const minY = Math.min(this.pos.y, this.outputPos.y);
        const maxX = Math.max(this.pos.x, this.outputPos.x);
        const maxY = Math.max(this.pos.y, this.outputPos.y);

        // 考虑端面宽度
        const buffer = Math.max(this.facetLength / 2, 10);

        return {
            x: minX - buffer,
            y: minY - buffer,
            width: maxX - minX + 2 * buffer,
            height: maxY - minY + 2 * buffer
        };
    }
}





// --- START OF NEW COMPONENT: Prism ---

class Prism extends OpticalComponent {
    static functionDescription = "棱镜使光发生折射与色散，分解白光为彩色光谱。";
    constructor(pos, baseLength = 100, apexAngleDeg = 60, angleDeg = 0, refractiveIndex = 1.5, dispersionCoeffB = 5000) {
        super(pos, angleDeg, "棱镜"); // Base class constructor

        this.baseLength = Math.max(10, baseLength);
        // Apex angle (顶角) in degrees, clamp between 1 and 178
        this.apexAngleRad = Math.max(1 * Math.PI / 180, Math.min(178 * Math.PI / 180, apexAngleDeg * Math.PI / 180));

        // Base refractive index (e.g., at 550nm)
        this.baseRefractiveIndex = Math.max(1.0, refractiveIndex);
        // Dispersion coefficient B for simplified Cauchy: n = n_base + B / lambda^2
        // B > 0 means blue light bends more. Units depend on lambda units (nm^2 here).
        this.dispersionCoeffB = dispersionCoeffB;

        // Geometry Cache
        this.worldVertices = []; // [v0, v1, v2] (v0=apex, v1=base left, v2=base right relative to angle 0)
        this.worldNormals = []; // [n01, n12, n20] (outward normals for edges 0->1, 1->2, 2->0)

        try { this._updateGeometry(); } catch (e) { console.error("Init Prism geom error:", e); }
    }

    // --- Add inside Prism class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            baseLength: this.baseLength,
            apexAngleDeg: this.apexAngleRad * (180 / Math.PI), // Save in degrees
            baseRefractiveIndex: this.baseRefractiveIndex,
            dispersionCoeffB: this.dispersionCoeffB
        };
    }

    // Get refractive index using simplified Cauchy model n = n_base + B / lambda^2
    getRefractiveIndex(wavelengthNm = DEFAULT_WAVELENGTH_NM) {
        if (wavelengthNm <= 0) return this.baseRefractiveIndex;
        // Adjust base index slightly so n(550) is roughly the user input 'baseRefractiveIndex'
        const n0_adjusted = this.baseRefractiveIndex - this.dispersionCoeffB / (550 * 550);
        const n = n0_adjusted + this.dispersionCoeffB / (wavelengthNm * wavelengthNm);
        return Math.max(1.0, n); // Ensure index is at least 1.0
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;

        // Calculate local vertices based on baseLength and apexAngle
        const halfBase = this.baseLength / 2.0;
        const apexAngle = this.apexAngleRad;
        const baseAngle = (Math.PI - apexAngle) / 2.0; // Angle at the base vertices

        // Height of the prism: h = halfBase * tan(baseAngle)
        const height = halfBase * Math.tan(baseAngle);

        // Local vertices (relative to center 'pos', before rotation)
        // v0: Apex (top point)
        // v1: Base left
        // v2: Base right
        const local_v0 = new Vector(0, -height / 2); // Apex position relative to center (assuming center is halfway up height) - Adjust if needed
        const local_v1 = new Vector(-halfBase, height / 2);
        const local_v2 = new Vector(halfBase, height / 2);

        // Rotate and translate to world coordinates
        const rotation = this.angleRad; // Use base class angle
        this.worldVertices = [
            local_v0.rotate(rotation).add(this.pos),
            local_v1.rotate(rotation).add(this.pos),
            local_v2.rotate(rotation).add(this.pos)
        ];

        // Calculate outward-pointing normals for each edge (v0->v1, v1->v2, v2->v0)
        this.worldNormals = [];
        for (let i = 0; i < 3; i++) {
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 3];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector)) {
                console.error(`Prism (${this.id}): Invalid vertices for normal calculation.`);
                this.worldNormals.push(new Vector(1, 0)); continue;
            }
            const edgeVec = p2.subtract(p1);
            // Normal pointing outwards (rotate edge vector -90 degrees)
            const normal = new Vector(edgeVec.y, -edgeVec.x).normalize();
            this.worldNormals.push(normal);
        }
        if (this.worldNormals.some(n => !n || isNaN(n.x))) { console.error(`Prism (${this.id}): NaN in normals.`); }
    }

    // Update geometry on base property changes
    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) PosChange error:`, e); } }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 3) return;
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#B0E0E6'; // Light blue, yellow if selected
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.fillStyle = this.selected ? 'rgba(176, 224, 230, 0.3)' : 'rgba(176, 224, 230, 0.15)'; // Semi-transparent fill

        ctx.beginPath();
        const v0 = this.worldVertices[0];
        if (v0 instanceof Vector) {
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i <= 3; i++) {
                const v = this.worldVertices[i % 3];
                if (v instanceof Vector) ctx.lineTo(v.x, v.y);
                else break; // Stop drawing if vertex is invalid
            }
            ctx.fill();
            ctx.stroke();
        }
    }

    getBoundingBox() {
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => { if (v instanceof Vector) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } });
        const buffer = 2;
        return (minX === Infinity || isNaN(minX)) ? super.getBoundingBox() : { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    // Use point-in-triangle test (e.g., barycentric coordinates or edge cross products)
    _containsPointBody(point) {
        if (!point || !this.worldVertices || this.worldVertices.length !== 3) return false;
        const [p0, p1, p2] = this.worldVertices;
        if (!(p0 instanceof Vector) || !(p1 instanceof Vector) || !(p2 instanceof Vector)) return false;

        // Check if point is on the same side of all edges (using cross product sign)
        const d0 = (point.x - p0.x) * (p1.y - p0.y) - (point.y - p0.y) * (p1.x - p0.x);
        const d1 = (point.x - p1.x) * (p2.y - p1.y) - (point.y - p1.y) * (p2.x - p1.x);
        const d2 = (point.x - p2.x) * (p0.y - p2.y) - (point.y - p2.y) * (p0.x - p2.x);

        const has_neg = (d0 < 0) || (d1 < 0) || (d2 < 0);
        const has_pos = (d0 > 0) || (d1 > 0) || (d2 > 0);

        // Point is inside or on edge if all cross products have the same sign (or are zero)
        return !(has_neg && has_pos);
    }

    // Intersect ray with the three line segments of the triangle
    intersect(rayOrigin, rayDirection) {
        let closestHit = null;
        let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 3 || this.worldNormals.length !== 3) return [];

        for (let i = 0; i < 3; i++) { // Iterate through edges (0->1, 1->2, 2->0)
            const p1 = this.worldVertices[i];
            const p2 = this.worldVertices[(i + 1) % 3];
            const edgeNormal = this.worldNormals[i]; // Outward geometric normal for this edge
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector) || !(edgeNormal instanceof Vector) || isNaN(p1.x) || isNaN(edgeNormal.x)) continue;

            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1); const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);

            if (Math.abs(dot_v2_v3) > 1e-9) { // Not parallel
                const t1 = v2.cross(v1) / dot_v2_v3; // Dist along ray
                const t2 = v1.dot(v3) / dot_v2_v3;   // Param along edge [0, 1]

                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) { // Hit segment in front
                    if (t1 < closestDist) {
                        closestDist = t1;
                        const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        let interactionNormal = edgeNormal.clone();
                        if (rayDirection.dot(interactionNormal) > 0) interactionNormal = interactionNormal.multiply(-1); // Point towards ray
                        if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) continue;

                        closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: i }; // surfaceId is edge index
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    // Interact: Apply Snell's Law with dispersion and Fresnel equations
    interact(ray, intersectionInfo, RayClass) {
        // This logic is very similar to DielectricBlock, but uses getRefractiveIndex(wavelength)
        const hitPoint = intersectionInfo.point;
        const surfaceNormal = intersectionInfo.normal; // Normal pointing towards the ray
        const incidentDirection = ray.direction;
        const N_OUTSIDE = N_AIR || 1.0; // Assume outside is air

        if (!(hitPoint instanceof Vector) || !(surfaceNormal instanceof Vector) || !(incidentDirection instanceof Vector) || isNaN(hitPoint.x) || isNaN(surfaceNormal.x) || isNaN(incidentDirection.x)) { ray.terminate('invalid_geom_interact_prism'); return []; }

        let N_INSIDE = NaN;
        try { N_INSIDE = this.getRefractiveIndex(ray.wavelengthNm); if (isNaN(N_INSIDE)) throw new Error("NaN index"); }
        catch (e) { console.error(`Prism (${this.id}) Error getRefractiveIndex:`, e); N_INSIDE = this.baseRefractiveIndex; }

        // Determine if entering or exiting using the geometric outward normal
        const outwardNormal = this.worldNormals[intersectionInfo.surfaceId];
        if (!outwardNormal || isNaN(outwardNormal.x)) { ray.terminate('internal_error_normal_prism'); return []; }
        const dotDirOutward = incidentDirection.dot(outwardNormal);
        const isEntering = dotDirOutward < -1e-9;
        const isExiting = dotDirOutward > 1e-9;
        if (!isEntering && !isExiting) { /* Handle grazing - simplified: reflect */
            const n1 = ray.mediumRefractiveIndex;
            const reflectedIntensity = ray.intensity;
            if (reflectedIntensity >= ray.minIntensityThreshold) {
                const reflectionNormalForCalc = surfaceNormal; const cosIForCalc = Math.max(0.0, Math.min(1.0, incidentDirection.dot(reflectionNormalForCalc.multiply(-1.0))));
                let reflectedDirection = incidentDirection.add(reflectionNormalForCalc.multiply(2 * cosIForCalc)).normalize();
                const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
                try { if (isNaN(reflectOrigin.x) || isNaN(reflectedDirection.x)) throw new Error("NaN grazing"); const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, ray.bouncesSoFar + 1, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()])); ray.terminate('grazing_reflection_prism'); return reflectedRay.shouldTerminate() ? [] : [reflectedRay]; } catch (e) { /* ignore */ }
            } ray.terminate('grazing_unhandled_prism'); return [];
        }

        const n1 = isEntering ? ray.mediumRefractiveIndex : N_INSIDE;
        const n2 = isEntering ? N_INSIDE : N_OUTSIDE;

        if (Math.abs(n1 - n2) < 1e-9) { /* Index match - pass through */
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            try { if (isNaN(transmitOrigin.x)) throw new Error("NaN passthrough"); const transmittedRay = new RayClass(transmitOrigin, incidentDirection, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()])); ray.terminate('pass_boundary_prism'); return transmittedRay.shouldTerminate() ? [] : [transmittedRay]; } catch (e) { ray.terminate('error_passthrough_prism'); return []; }
        }

        // Fresnel / TIR
        const nRatio = n1 / n2;
        const cosI = Math.max(0.0, Math.min(1.0, incidentDirection.dot(surfaceNormal.multiply(-1.0))));
        const sinI2 = Math.max(0.0, 1.0 - cosI * cosI);
        const sinT2 = nRatio * nRatio * sinI2;

        let reflectivity = 0.0;
        let isTotalInternalReflection = (n1 > n2 + 1e-9) && (sinT2 >= 1.0 - 1e-9);

        if (isTotalInternalReflection) { reflectivity = 1.0; }
        else if (sinT2 >= 1.0 || sinT2 < 0) { isTotalInternalReflection = true; reflectivity = 1.0; console.warn(`Prism (${this.id}): Invalid sinT2, forcing TIR.`); }
        else { const cosT = Math.sqrt(1.0 - sinT2); const n1_cosI = n1 * cosI; const n2_cosT = n2 * cosT; const n1_cosT = n1 * cosT; const n2_cosI = n2 * cosI; const Rs_den = n1_cosI + n2_cosT; const Rp_den = n1_cosT + n2_cosI; const Rs = (Rs_den < 1e-9) ? 1.0 : ((n1_cosI - n2_cosT) / Rs_den) ** 2; const Rp = (Rp_den < 1e-9) ? 1.0 : ((n1_cosT - n2_cosI) / Rp_den) ** 2; reflectivity = Math.max(0.0, Math.min(1.0, (Rs + Rp) / 2.0)); }

        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        const incidentIntensity = ray.intensity;

        // Reflected Ray (Intensity includes reflection loss factor from Dielectric Block example, maybe remove for prism?)
        const reflectedIntensity = incidentIntensity * reflectivity; // Simplified: No extra loss factor for prism
        if (reflectedIntensity >= ray.minIntensityThreshold) {
            const reflectionNormalForCalc = surfaceNormal; const cosIForCalc = Math.max(0.0, Math.min(1.0, incidentDirection.dot(reflectionNormalForCalc.multiply(-1.0))));
            let reflectedDirection = incidentDirection.add(reflectionNormalForCalc.multiply(2 * cosIForCalc)).normalize();
            const reflectOrigin = hitPoint.add(reflectedDirection.multiply(1e-6));
            try { if (isNaN(reflectOrigin.x) || isNaN(reflectedDirection.x)) throw new Error("NaN reflected"); const reflectedRay = new RayClass(reflectOrigin, reflectedDirection, ray.wavelengthNm, reflectedIntensity, ray.phase + Math.PI, nextBounces, n1, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([reflectOrigin.clone()])); if (!reflectedRay.terminated) newRays.push(reflectedRay); } catch (e) { console.error(`Prism (${this.id}) Error reflected ray:`, e); }
        }

        // Transmitted (Refracted) Ray
        if (!isTotalInternalReflection && sinT2 < 1.0 && sinT2 >= 0) {
            const transmittedIntensity = incidentIntensity * (1.0 - reflectivity);
            if (transmittedIntensity >= ray.minIntensityThreshold) {
                const cosT = Math.sqrt(1.0 - sinT2);
                let refractedDirection = incidentDirection.multiply(nRatio).add(surfaceNormal.multiply(nRatio * cosI - cosT)).normalize();
                const refractOrigin = hitPoint.add(refractedDirection.multiply(1e-6));
                try { if (isNaN(refractOrigin.x) || isNaN(refractedDirection.x)) throw new Error("NaN refracted"); const refractedRay = new RayClass(refractOrigin, refractedDirection, ray.wavelengthNm, transmittedIntensity, ray.phase, nextBounces, n2, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([refractOrigin.clone()])); if (!refractedRay.terminated) newRays.push(refractedRay); } catch (e) { console.error(`Prism (${this.id}) Error refracted ray:`, e); }
            }
        }

        ray.terminate(isTotalInternalReflection ? 'tir_prism' : 'split_prism');
        return newRays;
    }

    // --- REPLACEMENT for Prism.getProperties ---
    getProperties() {
        const baseProps = super.getProperties(); // posX, posY, angleDeg
        return {
            ...baseProps,
            baseLength: { value: this.baseLength.toFixed(1), label: '底边长度', type: 'number', min: 10, step: 1, title: '棱镜底边的长度' },
            apexAngleDeg: { value: (this.apexAngleRad * 180 / Math.PI).toFixed(1), label: '顶角 (α)', type: 'number', min: 1, max: 178, step: 1, title: '棱镜顶部的角度 (1°-178°)' },
            baseRefractiveIndex: { value: this.baseRefractiveIndex.toFixed(3), label: '基准折射率 (n₀@550nm)', type: 'number', min: 1.0, step: 0.01, title: '在 550nm 波长下的折射率' },
            dispersionCoeffB: { value: this.dispersionCoeffB.toFixed(0), label: '色散系数 (B)', type: 'number', min: 0, step: 100, title: '柯西色散公式 B 项 (nm²)，控制色散强度' }
        };
    }
    // --- END REPLACEMENT ---

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; } // Base handles pos/angle

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false; // For optical properties

        switch (propName) {
            case 'baseLength': const l = parseFloat(value); if (!isNaN(l) && l >= 10 && Math.abs(l - this.baseLength) > 1e-6) { this.baseLength = l; needsGeomUpdate = true; } break;
            case 'apexAngleDeg': const a = parseFloat(value); if (!isNaN(a)) { const r = Math.max(1 * Math.PI / 180, Math.min(178 * Math.PI / 180, a * Math.PI / 180)); if (Math.abs(r - this.apexAngleRad) > 1e-9) { this.apexAngleRad = r; needsGeomUpdate = true; } } break;
            case 'baseRefractiveIndex': const n = parseFloat(value); if (!isNaN(n) && n >= 1.0 && Math.abs(n - this.baseRefractiveIndex) > 1e-9) { this.baseRefractiveIndex = n; needsRetraceUpdate = true; } break;
            case 'dispersionCoeffB': const b = parseFloat(value); if (!isNaN(b) && b >= 0 && Math.abs(b - this.dispersionCoeffB) > 1e-9) { this.dispersionCoeffB = b; needsRetraceUpdate = true; } break;
            default: return false; // Not handled
        }

        if (needsGeomUpdate) { try { this._updateGeometry(); } catch (e) { console.error(`Prism (${this.id}) setProperty geom update error:`, e); } needsRetrace = true; }
        if (needsRetraceUpdate) { needsRetrace = true; }
        return true; // Handled
    }
}

// --- END OF NEW COMPONENT: Prism ---


// --- START OF NEW COMPONENT: DiffractionGrating ---

class DiffractionGrating extends OpticalComponent {
    static functionDescription = "由多缝干涉形成清晰衍射级次，用于光谱分辨。";
    // gratingPeriodInMicrons: 光栅周期，单位微米 (e.g., 1.0 means 1 um spacing)
    constructor(pos, length = 100, gratingPeriodInMicrons = 1.0, angleDeg = 90, maxOrder = 2) {
        super(pos, angleDeg, "衍射光栅");

        this.length = Math.max(10, length);
        this.gratingPeriodInMicrons = Math.max(0.01, gratingPeriodInMicrons); // d in micrometers
        this.maxOrder = Math.max(0, Math.floor(maxOrder)); // Max diffraction order (m) to calculate (0, 1, ..., maxOrder)

        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.gratingDir = Vector.fromAngle(angleDeg); // Direction vector along the grating line
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2); // Normal to the grating surface

        // Calculate grating period in pixels (d_px) using the global scale factor
        this.gratingPeriodPixels = this.gratingPeriodInMicrons * PIXELS_PER_MICROMETER;

        // Simplified diffraction efficiency (approximate) - adjust these values as needed
        this.diffractionEfficiencies = {
            0: 0.60, // 60% for 0th order (transmission)
            1: 0.15, // 15% for +1 and -1 order each
            2: 0.05, // 5% for +2 and -2 order each
            // Higher orders get negligible intensity in this simple model
        };

        try { this._updateGeometry(); } catch (e) { console.error("Init DiffractionGrating geom error:", e); }
    }

    // --- Add inside DiffractionGrating class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length,
            gratingPeriodInMicrons: this.gratingPeriodInMicrons,
            maxOrder: this.maxOrder
            // Don't save calculated period in pixels or efficiencies
        };
    }


    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.gratingDir = Vector.fromAngle(this.angleRad); // Along component angle
        const halfLenVec = this.gratingDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        // Normal is perpendicular to the grating line
        this.normal = new Vector(-this.gratingDir.y, this.gratingDir.x);

        // Recalculate period in pixels in case scale changes (though scale is currently constant)
        this.gratingPeriodPixels = this.gratingPeriodInMicrons * PIXELS_PER_MICROMETER;
        if (this.gratingPeriodPixels < 1e-6) console.warn(`Grating ${this.id}: Grating period in pixels is very small or zero!`);
    }

    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Grating AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`Grating PosChange error:`, e); } }

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        // Draw the main grating line
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#CCCCCC'; // Light gray, yellow selected
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();

        // Draw small perpendicular lines indicating grating lines (visual cue only)
        const numLines = Math.min(50, Math.floor(this.length / 4)); // Limit number of visual lines
        const lineLength = 6;
        ctx.strokeStyle = this.selected ? 'rgba(255,255,150,0.8)' : 'rgba(204, 204, 204, 0.6)';
        ctx.lineWidth = 1;
        const normalOffset = this.normal.multiply(lineLength / 2);
        for (let i = 0; i <= numLines; i++) {
            const t = i / numLines;
            const center = Vector.lerp(this.p1, this.p2, t);
            const start = center.subtract(normalOffset);
            const end = center.add(normalOffset);
            ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        }
    }

    getBoundingBox() { // Same as Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x); const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y); const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Same as Mirror
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2); if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1), p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq, cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT)); return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) { // Same as Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3); if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) { // Segment check with tolerance
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone(); // Use the grating normal
            if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1); // Point towards ray
            if (isNaN(iP.x) || isNaN(sN.x)) { console.error(`Grating ${this.id} intersect NaN`); return []; }
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'grating_surface' }];
        } return [];
    }

    // Core interaction: Apply grating equation
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const N = this.normal; // Normal TO the grating plane
        const incidentDirection = ray.direction;
        const d_px = this.gratingPeriodPixels; // Grating period in pixels

        if (d_px < 1e-6) { // Avoid division by zero or nonsensical results
            console.warn(`Grating ${this.id}: Grating period in pixels is too small (${d_px.toExponential(2)}). Transmitting 0th order only.`);
            // Just transmit 0th order (like pass-through)
            const transmitOrigin = hitPoint.add(incidentDirection.multiply(1e-6));
            try { if (isNaN(transmitOrigin.x)) throw new Error("NaN transmitOrigin"); const transmittedRay = new RayClass(transmitOrigin, incidentDirection, ray.wavelengthNm, ray.intensity, ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([transmitOrigin.clone()])); ray.terminate('pass_grating_small_d'); return transmittedRay.shouldTerminate() ? [] : [transmittedRay]; } catch (e) { ray.terminate('error_pass_grating'); return []; }
        }

        // Calculate wavelength in pixels
        const lambda_nm = ray.wavelengthNm;
        const lambda_px = lambda_nm * PIXELS_PER_NANOMETER;

        // Calculate incident angle (theta_i) with respect to the normal N
        // Ensure normal points against the incident ray for angle calculation
        const normalForAngleCalc = ray.direction.dot(N) < 0 ? N : N.multiply(-1);
        const cosThetaI = Math.max(0.0, Math.min(1.0, incidentDirection.dot(normalForAngleCalc.multiply(-1.0))));
        const sinThetaI = Math.sqrt(Math.max(0.0, 1.0 - cosThetaI * cosThetaI));
        // Determine sign of sinThetaI based on cross product with grating direction
        const crossSign = incidentDirection.cross(this.gratingDir);
        const signedSinThetaI = Math.sign(crossSign) * sinThetaI;

        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1;
        const incidentIntensity = ray.intensity;

        // Calculate angles for different orders (m = 0, +/-1, +/-2, ...)
        for (let m = -this.maxOrder; m <= this.maxOrder; m++) {
            // Grating equation: d * (sin(theta_m) - sin(theta_i)) = m * lambda
            // sin(theta_m) = m * lambda / d + sin(theta_i)
            const sinThetaM_term = m * lambda_px / d_px;
            const sinThetaM = signedSinThetaI + sinThetaM_term;

            // Check if this order exists (physical limit: |sin(theta_m)| <= 1)
            if (Math.abs(sinThetaM) <= 1.0 + 1e-9) { // Allow small tolerance
                const clampedSinThetaM = Math.max(-1.0, Math.min(1.0, sinThetaM));
                const cosThetaM = Math.sqrt(1.0 - clampedSinThetaM * clampedSinThetaM);

                // Calculate the direction vector for this diffraction order
                // Start with the normal direction (cos part) and add the tangential part (sin part)
                // The tangential direction is the grating direction
                let diffractedDir = normalForAngleCalc.multiply(cosThetaM).add(this.gratingDir.multiply(clampedSinThetaM * Math.sign(crossSign))); // Apply sign based on incidence side
                diffractedDir = diffractedDir.normalize(); // Ensure it's a unit vector

                if (isNaN(diffractedDir.x) || diffractedDir.magnitudeSquared() < 0.5) {
                    console.warn(`Grating ${this.id}, Order ${m}: Calculated NaN or zero direction vector.`);
                    continue; // Skip this order if calculation failed
                }


                // Calculate intensity for this order using simplified efficiency model
                const orderAbs = Math.abs(m);
                const efficiency = this.diffractionEfficiencies[orderAbs] || 0.0; // Default to 0 if order > 2
                const diffractedIntensity = incidentIntensity * efficiency;

                if (diffractedIntensity >= ray.minIntensityThreshold) {
                    const newOrigin = hitPoint.add(diffractedDir.multiply(1e-6)); // Offset slightly
                    try {
                        if (isNaN(newOrigin.x)) throw new Error("NaN origin");
                        const diffractedRay = new RayClass(
                            newOrigin, diffractedDir, ray.wavelengthNm, diffractedIntensity,
                            ray.phase, // Phase change upon diffraction is complex, ignore for now
                            nextBounces, ray.mediumRefractiveIndex, ray.sourceId,
                            ray.polarizationAngle, // Assume simple grating doesn't strongly affect polarization
                            ray.ignoreDecay,
                            ray.history.concat([newOrigin.clone()])
                        );
                        if (!diffractedRay.terminated) {
                            newRays.push(diffractedRay);
                        } else {
                            console.log(`Diffracted ray m=${m} terminated immediately (Reason: ${diffractedRay.endReason})`);
                        }
                    } catch (e) {
                        console.error(`Grating (${this.id}) Error creating diffracted ray (m=${m}):`, e);
                    }
                }
            } // End if |sinThetaM| <= 1
        } // End loop through orders

        ray.terminate('diffracted');
        return newRays;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            length: { value: this.length.toFixed(1), label: '长度 (px)', type: 'number', min: 10, step: 1 },
            gratingPeriodInMicrons: { value: this.gratingPeriodInMicrons.toFixed(3), label: '光栅周期 (μm)', type: 'number', min: 0.01, step: 0.1 },
            gratingPeriodPixels: { value: this.gratingPeriodPixels.toFixed(2), label: '周期 (px)', type: 'text', readonly: true }, // Display calculated pixels
            maxOrder: { value: this.maxOrder, label: '最大衍射级次 (m)', type: 'number', min: 0, max: 10, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; }

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false; // For optical properties

        switch (propName) {
            case 'length': const l = parseFloat(value); if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; } break;
            case 'gratingPeriodInMicrons': const d = parseFloat(value); if (!isNaN(d) && d >= 0.01 && Math.abs(d - this.gratingPeriodInMicrons) > 1e-9) { this.gratingPeriodInMicrons = d; needsGeomUpdate = true; /* Period change needs recalc */ needsRetraceUpdate = true; } break; // Update needs geometry recalc for d_px
            case 'maxOrder': const m = parseInt(value); if (!isNaN(m) && m >= 0 && m !== this.maxOrder) { this.maxOrder = m; needsRetraceUpdate = true; } break;
            case 'gratingPeriodPixels': return true; // Read-only
            default: return false; // Not handled
        }

        if (needsGeomUpdate) { try { this._updateGeometry(); } catch (e) { console.error(`Grating (${this.id}) setProperty geom update error:`, e); } needsRetrace = true; }
        if (needsRetraceUpdate) { needsRetrace = true; }
        return true; // Handled
    }
}

// --- END OF NEW COMPONENT: DiffractionGrating ---

// --- START OF NEW COMPONENT: WavePlate ---

class WavePlate extends OpticalComponent {
    static functionDescription = "改变光的偏振相位差，实现偏振态转换。";
    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90, plateType = "WavePlate") {
        // angleDeg: Orientation of the plate component itself (often perpendicular to beam)
        // fastAxisAngleDeg: Orientation of the fast axis relative to global X
        super(pos, angleDeg, plateType); // Pass type to label
        this.length = Math.max(10, length);
        this.fastAxisRad = fastAxisAngleDeg * (Math.PI / 180); // Store fast axis angle in radians

        // Geometry cache
        this.p1 = pos.clone();
        this.p2 = pos.clone();
        this.plateDir = Vector.fromAngle(angleDeg); // Direction along the plate line
        this.normal = Vector.fromAngle(angleDeg + Math.PI / 2); // Normal to the plate surface

        try { this._updateGeometry(); } catch (e) { console.error(`Init ${plateType} geom error:`, e); }
    }

    // --- Add inside WavePlate class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            length: this.length,
            fastAxisAngleDeg: this.fastAxisRad * (180 / Math.PI) // Save in degrees
        };
    }


    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.plateDir = Vector.fromAngle(this.angleRad); // Along component angle
        const halfLenVec = this.plateDir.multiply(this.length / 2);
        this.p1 = this.pos.subtract(halfLenVec);
        this.p2 = this.pos.add(halfLenVec);
        // Normal is perpendicular to the plate line
        this.normal = new Vector(-this.plateDir.y, this.plateDir.x);
    }

    // Update geometry if component angle changes
    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`WavePlate AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`WavePlate PosChange error:`, e); } } // Geometry depends on pos

    draw(ctx) {
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return;
        // Draw main plate line
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#DDA0DD'; // Plum/light purple, yellow selected
        ctx.lineWidth = this.selected ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(this.p1.x, this.p1.y); ctx.lineTo(this.p2.x, this.p2.y); ctx.stroke();

        // Draw fast axis indicator line at the center
        const axisVec = Vector.fromAngle(this.fastAxisRad); // Use the fast axis angle
        const indicatorLength = Math.min(this.length * 0.4, 20);
        const start = this.pos.subtract(axisVec.multiply(indicatorLength / 2));
        const end = this.pos.add(axisVec.multiply(indicatorLength / 2));

        ctx.strokeStyle = this.selected ? '#FFFFFF' : '#FFC0CB'; // White when selected, Pink indicator otherwise
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        // Add small tick marks at ends
        const tickSize = 3;
        const tickPerp = axisVec.rotate(Math.PI / 2).multiply(tickSize);
        ctx.moveTo(start.x - tickPerp.x, start.y - tickPerp.y); ctx.lineTo(start.x + tickPerp.x, start.y + tickPerp.y);
        ctx.moveTo(end.x - tickPerp.x, end.y - tickPerp.y); ctx.lineTo(end.x + tickPerp.x, end.y + tickPerp.y);
        ctx.stroke();

        // Add text label (HWP or QWP)
        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textOffset = this.normal.multiply(10); // Offset text perpendicular to plate
        ctx.fillText(this.constructor.name === 'HalfWavePlate' ? 'λ/2' : (this.constructor.name === 'QuarterWavePlate' ? 'λ/4' : '?'),
            this.pos.x + textOffset.x, this.pos.y + textOffset.y);
    }

    getBoundingBox() { // Same as Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return super.getBoundingBox();
        const minX = Math.min(this.p1.x, this.p2.x); const maxX = Math.max(this.p1.x, this.p2.x);
        const minY = Math.min(this.p1.y, this.p2.y); const maxY = Math.max(this.p1.y, this.p2.y);
        const buffer = 5;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) { // Same as Mirror
        if (!point || !(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return false;
        const lenSq = this.p1.distanceSquaredTo(this.p2); if (lenSq < 1e-9) return point.distanceSquaredTo(this.pos) < 25;
        const p1pt = point.subtract(this.p1), p1p2 = this.p2.subtract(this.p1);
        const t = p1pt.dot(p1p2) / lenSq, cT = Math.max(0, Math.min(1, t));
        const closest = this.p1.add(p1p2.multiply(cT)); return point.distanceSquaredTo(closest) < 25;
    }

    intersect(rayOrigin, rayDirection) { // Same as Mirror
        if (!(this.p1 instanceof Vector) || !(this.p2 instanceof Vector)) return [];
        const v1 = rayOrigin.subtract(this.p1), v2 = this.p2.subtract(this.p1);
        const v3 = new Vector(-rayDirection.y, rayDirection.x);
        const d_v2_v3 = v2.dot(v3); if (Math.abs(d_v2_v3) < 1e-9) return [];
        const t1 = v2.cross(v1) / d_v2_v3, t2 = v1.dot(v3) / d_v2_v3;
        if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
            const iP = rayOrigin.add(rayDirection.multiply(t1));
            let sN = this.normal.clone(); // Use the plate normal
            if (rayDirection.dot(sN) > 0) sN = sN.multiply(-1); // Point towards ray
            if (isNaN(iP.x) || isNaN(sN.x)) { console.error(`WavePlate ${this.id} intersect NaN`); return []; }
            return [{ distance: t1, point: iP, normal: sN, surfaceId: 'waveplate_surface' }];
        } return [];
    }

    // Base interact method - specific logic in subclasses
    interact(ray, intersectionInfo, RayClass) {
        console.warn(`Base WavePlate interact called for ${this.label}. Subclass should override.`);
        // Default: Pass through without change
        const newDirection = ray.direction;
        const newOrigin = intersectionInfo.point.add(newDirection.multiply(1e-6));
        let transmittedRay = null;
        if (ray.intensity >= ray.minIntensityThreshold) {
            try {
                transmittedRay = new RayClass(
                    newOrigin, newDirection, ray.wavelengthNm, ray.intensity, ray.phase,
                    ray.bouncesSoFar + 1, ray.mediumRefractiveIndex, ray.sourceId,
                    ray.polarizationAngle, // Pass original polarization
                    ray.ignoreDecay, ray.history.concat([newOrigin.clone()])
                );
            } catch (e) { console.error(`Error creating pass-through Ray in WavePlate (${this.id}):`, e); }
        }
        ray.terminate('pass_waveplate_base');
        return transmittedRay ? [transmittedRay] : [];
    }

    // Common properties for all waveplates
    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps, // Includes pos, angleDeg (component orientation)
            length: { value: this.length.toFixed(1), label: '长度 (px)', type: 'number', min: 10, step: 1 },
            fastAxisAngleDeg: { value: (this.fastAxisRad * (180 / Math.PI)).toFixed(1), label: '快轴角度 (°)', type: 'number', step: 1 }
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; } // Handles pos, angleDeg

        let needsGeomUpdate = false;
        let needsRetraceUpdate = false; // Fast axis change affects optics

        switch (propName) {
            case 'length': const l = parseFloat(value); if (!isNaN(l) && l >= 10 && Math.abs(l - this.length) > 1e-6) { this.length = l; needsGeomUpdate = true; } break;
            case 'fastAxisAngleDeg':
                const fa = parseFloat(value);
                if (!isNaN(fa)) {
                    const r = fa * (Math.PI / 180);
                    // Normalize comparison angle difference
                    const currentFastAxis = this.fastAxisRad;
                    const diff = Math.atan2(Math.sin(r - currentFastAxis), Math.cos(r - currentFastAxis));
                    if (Math.abs(diff) > 1e-6) { // Check if angle actually changed
                        this.fastAxisRad = Math.atan2(Math.sin(r), Math.cos(r)); // Store normalized
                        needsRetraceUpdate = true; // Fast axis change affects optics
                        console.log(`[WavePlate setProperty] Fast Axis updated to ${(this.fastAxisRad * 180 / Math.PI).toFixed(1)} deg`); // DEBUG
                    }
                }
                break;
            default: return false; // Not handled
        }

        if (needsGeomUpdate) { try { this._updateGeometry(); } catch (e) { console.error(`WavePlate (${this.id}) setProperty geom update error:`, e); } needsRetrace = true; } // Geometry change needs retrace too
        if (needsRetraceUpdate) { needsRetrace = true; }
        return true; // Handled
    }
}

// --- HalfWavePlate (λ/2) ---
class HalfWavePlate extends WavePlate {
    static functionDescription = "将线偏振方向旋转两倍于快轴与入射夹角。";
    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90) {
        super(pos, length, fastAxisAngleDeg, angleDeg, "半波片 (λ/2)");
    }

    // --- REPLACEMENT for HalfWavePlate.interact with Jones matrix ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const nextBounces = ray.bouncesSoFar + 1;
        const intensityIn = ray.intensity;
        if (intensityIn < ray.minIntensityThreshold) { ray.terminate('low_intensity_hwp'); return []; }

        const phi = this.fastAxisRad;
        let outJones = null;
        if (ray.hasJones && ray.hasJones()) {
            const Rm = Ray._rot2(-phi), Rp = Ray._rot2(phi);
            const Jd = [[{ re: 0, im: -1 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 0, im: 1 }]];
            const v1 = Ray._apply2x2(Rm, ray.jones);
            const v2 = Ray._apply2x2(Jd, v1);
            outJones = Ray._apply2x2(Rp, v2);
        }

            const newDirection = ray.direction;
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
        let outRay = null;
        try {
            outRay = new RayClass(newOrigin, newDirection, ray.wavelengthNm, intensityIn, ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()]));
            if (outJones) {
                outRay.setJones(outJones);
            } else if (typeof ray.polarizationAngle === 'number') {
                const thetaOut = Math.atan2(Math.sin(2 * phi - ray.polarizationAngle), Math.cos(2 * phi - ray.polarizationAngle));
                outRay.setLinearPolarization(thetaOut);
            }
        } catch (e) { console.error(`HWP (${this.id}) create ray error:`, e); return []; }

        ray.terminate('pass_hwp');
        return outRay ? [outRay] : [];
    }
    // --- END OF REPLACEMENT ---
    // --- END OF REPLACEMENT ---
}

// --- QuarterWavePlate (λ/4) ---
class QuarterWavePlate extends WavePlate {
    static functionDescription = "将线偏振转换为圆/椭圆偏振或反之。";
    constructor(pos, length = 80, fastAxisAngleDeg = 0, angleDeg = 90) {
        super(pos, length, fastAxisAngleDeg, angleDeg, "四分之一波片 (λ/4)");
    }

    // --- REPLACEMENT for QuarterWavePlate.interact with Jones matrix ---
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const nextBounces = ray.bouncesSoFar + 1;
        const intensityIn = ray.intensity;
        if (intensityIn < ray.minIntensityThreshold) { ray.terminate('low_intensity_qwp'); return []; }

        const phi = this.fastAxisRad;
        let outJones = null;
        if (ray.hasJones && ray.hasJones()) {
            const Rm = Ray._rot2(-phi), Rp = Ray._rot2(phi);
            const e1 = { re: Math.SQRT1_2, im: -Math.SQRT1_2 }; // e^{-i pi/4}
            const e2 = { re: Math.SQRT1_2, im:  Math.SQRT1_2 }; // e^{ i pi/4}
            const Jd = [[e1, { re: 0, im: 0 }], [{ re: 0, im: 0 }, e2]];
            const v1 = Ray._apply2x2(Rm, ray.jones);
            const v2 = Ray._apply2x2(Jd, v1);
            outJones = Ray._apply2x2(Rp, v2);
        }

            const newDirection = ray.direction;
            const newOrigin = hitPoint.add(newDirection.multiply(1e-6));
        let outRay = null;
        try {
            outRay = new RayClass(newOrigin, newDirection, ray.wavelengthNm, intensityIn, ray.phase, nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle, ray.ignoreDecay, ray.history.concat([newOrigin.clone()]));
            if (outJones) {
                outRay.setJones(outJones);
            }
        } catch (e) { console.error(`QWP (${this.id}) create ray error:`, e); return []; }

        ray.terminate('pass_qwp');
        return outRay ? [outRay] : [];
    }
    // --- END OF REPLACEMENT ---
}

// --- END OF NEW COMPONENT: WavePlate ---


// --- START OF NEW COMPONENT: AcoustoOpticModulator (AOM) ---

class AcoustoOpticModulator extends OpticalComponent {
    static functionDescription = "利用声光效应调制光的频率/方向/强度。";
    constructor(pos, width = 50, height = 20, angleDeg = 0, rfFrequencyMHz = 80, rfPower = 0.5) {
        super(pos, angleDeg, "声光调制器"); // Set label

        this.width = Math.max(10, width);
        this.height = Math.max(5, height);

        // --- AOM Specific Properties ---
        // RF Frequency (MHz): Determines diffraction angle. Higher freq = larger angle.
        this.rfFrequencyMHz = Math.max(1, rfFrequencyMHz);
        // RF Power (Arbitrary units 0-1): Controls diffraction efficiency. Higher power = more light into +1 order.
        this.rfPower = Math.max(0, Math.min(1, rfPower));
        // Acoustic Velocity in medium (m/s) - Assume a typical value for TeO2 or Fused Silica
        this.acousticVelocity_mps = 4200; // Example: Fused Silica (~5960 m/s), TeO2 (~616 m/s slow shear, ~4200 fast long.)
        // Using a faster velocity gives smaller angles, might look better.

        // --- Geometry Cache --- similar to Dielectric Block
        this.localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = [];
        this.worldNormals = []; // Outward normals for edges 0->1, 1->2, 2->3, 3->0

        // --- Calculated Values ---
        this.diffractionAngleRad = 0; // Angle for +1 order relative to 0 order

        try {
            this._updateGeometry(); // Initial geometry calculation
            this._updateOpticalProperties(); // Initial optical calculation
        } catch (e) {
            console.error("Init AOM error:", e);
        }
    }

    // --- Add inside AcoustoOpticModulator class ---
    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            width: this.width,
            height: this.height,
            rfFrequencyMHz: this.rfFrequencyMHz,
            rfPower: this.rfPower
            // Don't save acousticVelocity_mps (assume constant for now)
            // Don't save calculated angle or efficiencies
        };
    }



    // Update geometry (position, angle, size)
    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        this.worldVertices = this.localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
        this.worldNormals = [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector)) { this.worldNormals.push(new Vector(1, 0)); continue; }
            const edgeVec = p2.subtract(p1); const normal = new Vector(edgeVec.y, -edgeVec.x).normalize();
            this.worldNormals.push(normal);
        }
        if (this.worldNormals.some(n => !n || isNaN(n.x))) { console.error(`AOM (${this.id}): NaN in normals.`); }
    }

    // Update optical properties (diffraction angle, efficiency)
    _updateOpticalProperties(wavelengthNm = DEFAULT_WAVELENGTH_NM) { // Takes wavelength for angle calc
        // Simplified Bragg condition: 2 * Lambda * sin(theta_B) = lambda_light
        // Diffraction angle (small angle approx): theta_diff ≈ lambda_light / Lambda_acoustic
        // Lambda_acoustic = Velocity_acoustic / Frequency_acoustic
        // theta_diff ≈ (lambda_light * Frequency_acoustic) / Velocity_acoustic

        const lambda_light_meters = wavelengthNm * 1e-9;
        const freq_acoustic_hz = this.rfFrequencyMHz * 1e6;

        if (this.acousticVelocity_mps > 1e-6) {
            this.diffractionAngleRad = (lambda_light_meters * freq_acoustic_hz) / this.acousticVelocity_mps;
            // Ensure angle is physically reasonable (keep it small-ish for simulation)
            this.diffractionAngleRad = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, this.diffractionAngleRad));
        } else {
            this.diffractionAngleRad = 0; // No diffraction if velocity is zero
        }
        // Note: This is the angle *difference* between 0 and +1 order.

        // Efficiency calculation (simplified model)
        // Efficiency into +1 order might be proportional to sin^2(sqrt(Power)) or similar.
        // Let's use a simpler model: Efficiency_1 = Power (clamped 0-1), Efficiency_0 = 1 - Efficiency_1
        this.efficiencyOrder1 = this.rfPower;
        this.efficiencyOrder0 = 1.0 - this.rfPower;
    }

    // Base class calls these on property change
    onAngleChanged() { try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) AngleChange error:`, e); } }
    onPositionChanged() { try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) PosChange error:`, e); } }

    // Draw the AOM component
    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.fillStyle = this.selected ? 'rgba(100, 149, 237, 0.4)' : 'rgba(100, 149, 237, 0.2)'; // Cornflower blue, semi-transparent
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#87CEFA'; // Light sky blue border, yellow selected
        ctx.lineWidth = this.selected ? 2 : 1;

        // Draw the main rectangle
        ctx.beginPath();
        const v0 = this.worldVertices[0];
        if (v0 instanceof Vector) {
            ctx.moveTo(v0.x, v0.y);
            for (let i = 1; i <= 4; i++) { const v = this.worldVertices[i % 4]; if (v instanceof Vector) ctx.lineTo(v.x, v.y); else break; }
            ctx.fill(); ctx.stroke();

            // Draw indicative "acoustic waves" inside (simple pattern)
            ctx.strokeStyle = this.selected ? 'rgba(255, 255, 0, 0.5)' : 'rgba(135, 206, 250, 0.5)'; // Lighter blue/yellow lines
            ctx.lineWidth = 1;
            const numWaves = 5;
            const waveDir = this.worldVertices[1].subtract(this.worldVertices[0]).normalize(); // Along top edge
            const perpDir = this.worldVertices[3].subtract(this.worldVertices[0]).normalize(); // Along left edge
            for (let i = 1; i <= numWaves; i++) {
                const t = i / (numWaves + 1);
                const start = this.worldVertices[0].add(perpDir.multiply(this.height * t));
                const end = this.worldVertices[1].add(perpDir.multiply(this.height * t));
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
            }
        }
    }

    // Bounding Box calculation
    getBoundingBox() {
        // Same as Dielectric Block / BeamDump
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => { if (v instanceof Vector) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } });
        const buffer = 2;
        return (minX === Infinity || isNaN(minX)) ? super.getBoundingBox() : { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    // Check if point is inside the rectangle body
    _containsPointBody(point) {
        // Same as Dielectric Block / BeamDump
        if (!point || !this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return false;
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const normal = this.worldNormals[i];
            if (!(p1 instanceof Vector) || !(normal instanceof Vector)) return false;
            const vecToPoint = point.subtract(p1); if (vecToPoint.dot(normal) > 1e-9) return false;
        } return true;
    }

    // Calculate intersection with the AOM boundary (only care about entry)
    intersect(rayOrigin, rayDirection) {
        // Same as Dielectric Block / BeamDump - find closest hit point
        let closestHit = null; let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4 || this.worldNormals.length !== 4) return [];
        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4]; const edgeNormal = this.worldNormals[i];
            if (!(p1 instanceof Vector) || !(p2 instanceof Vector) || !(edgeNormal instanceof Vector) || isNaN(p1.x) || isNaN(edgeNormal.x)) continue;
            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1); const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);
            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    // Check if the ray is entering (dot product with OUTWARD normal < 0)
                    if (rayDirection.dot(edgeNormal) < -1e-9) {
                        if (t1 < closestDist) {
                            closestDist = t1;
                            const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                            let interactionNormal = edgeNormal.multiply(-1.0); // Point INTO the crystal for interaction calc
                            if (isNaN(intersectionPoint.x) || isNaN(interactionNormal.x)) continue;
                            closestHit = { distance: t1, point: intersectionPoint, normal: interactionNormal, surfaceId: 'aom_input_surface' };
                        }
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    // Handle the interaction: Split ray into 0th and +1st order
    interact(ray, intersectionInfo, RayClass) {
        const hitPoint = intersectionInfo.point;
        const incidentDirection = ray.direction;
        const incidentIntensity = ray.intensity;
        const newRays = [];
        const nextBounces = ray.bouncesSoFar + 1; // Count interaction

        // Update optical properties based on incident wavelength (important for angle)
        this._updateOpticalProperties(ray.wavelengthNm);

        // 0th Order (Transmission)
        const intensityOrder0 = incidentIntensity * this.efficiencyOrder0;
        if (intensityOrder0 >= ray.minIntensityThreshold) {
            const directionOrder0 = incidentDirection.clone(); // Same direction
            const originOrder0 = hitPoint.add(directionOrder0.multiply(1e-6)); // Offset slightly
            try {
                const ray0 = new RayClass(
                    originOrder0, directionOrder0, ray.wavelengthNm, intensityOrder0, ray.phase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([originOrder0.clone()])
                );
                if (!ray0.terminated) newRays.push(ray0);
            } catch (e) { console.error(`AOM (${this.id}) Error creating 0th order ray:`, e); }
        }

        // +1st Order (Diffraction)
        const intensityOrder1 = incidentIntensity * this.efficiencyOrder1;
        if (intensityOrder1 >= ray.minIntensityThreshold && Math.abs(this.diffractionAngleRad) > 1e-9) {
            // Calculate the +1 order direction vector
            // Rotate the incident direction by diffractionAngleRad around the axis normal to BOTH
            // incident direction and the AOM's main axis (which is complex in 2D).
            // Simplified 2D approach: Rotate incident vector relative to the component's normal.
            // Let N be the normal TO THE COMPONENT INTERFACE pointing OUTWARD from the interaction point.
            // The interaction normal in closestHit points INWARD. So use its negative.
            const surfaceNormalOutward = intersectionInfo.normal.multiply(-1.0);
            // Rotate the incident direction vector *away* from this outward normal by diffractionAngleRad
            // Need to determine the rotation direction (clockwise/counter-clockwise).
            // Assume AOM grating vector is aligned with component angle (this.angleRad).
            // The +1 order should deviate "upwards" relative to this direction if angle > 0.
            // Let's try rotating incident vector by diffractionAngleRad relative to the normal.
            // But which normal? The component's orientation normal? Or the specific edge normal?
            // Let's use a simpler geometric approach:
            // Final_Angle = Incident_Angle + Diffraction_Angle_Relative_To_0_Order
            // The 0 order direction IS incidentDirection.
            // We need to rotate incidentDirection by diffractionAngleRad.
            // The axis of rotation is perpendicular to the simulation plane.
            const directionOrder1 = incidentDirection.rotate(this.diffractionAngleRad); // Rotate CCW for positive angle

            const originOrder1 = hitPoint.add(directionOrder1.multiply(1e-6)); // Offset slightly
            try {
                const ray1 = new RayClass(
                    originOrder1, directionOrder1, ray.wavelengthNm, intensityOrder1, ray.phase,
                    nextBounces, ray.mediumRefractiveIndex, ray.sourceId, ray.polarizationAngle,
                    ray.ignoreDecay, ray.history.concat([originOrder1.clone()])
                );
                if (!ray1.terminated) newRays.push(ray1);
            } catch (e) { console.error(`AOM (${this.id}) Error creating +1st order ray:`, e); }
        }

        ray.terminate('diffracted_aom'); // Terminate the original ray
        return newRays;
    }

    // Properties for the inspector
    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 10, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 5, step: 1 },
            rfFrequencyMHz: { value: this.rfFrequencyMHz.toFixed(1), label: '频率 (MHz)', type: 'number', min: 1, max: 500, step: 1 },
            rfPower: { value: this.rfPower.toFixed(2), label: '功率 (0-1)', type: 'range', min: 0, max: 1, step: 0.01 }, // Use range slider
            diffractionAngle: { value: (this.diffractionAngleRad * 180 / Math.PI).toFixed(3), label: '衍射角 (+1°)', type: 'text', readonly: true }, // Display calculated angle
            efficiency0: { value: this.efficiencyOrder0.toFixed(2), label: '效率 (0级)', type: 'text', readonly: true },
            efficiency1: { value: this.efficiencyOrder1.toFixed(2), label: '效率 (+1级)', type: 'text', readonly: true },
        };
    }

    // Set properties from the inspector
    setProperty(propName, value) {
        if (super.setProperty(propName, value)) { return true; } // Base handles pos, angle

        let needsGeomUpdate = false;
        let needsOpticalUpdate = false;

        switch (propName) {
            case 'width': const w = parseFloat(value); if (!isNaN(w) && w >= 10 && Math.abs(w - this.width) > 1e-6) { this.width = w; needsGeomUpdate = true; } break;
            case 'height': const h = parseFloat(value); if (!isNaN(h) && h >= 5 && Math.abs(h - this.height) > 1e-6) { this.height = h; needsGeomUpdate = true; } break;
            case 'rfFrequencyMHz': const f = parseFloat(value); if (!isNaN(f) && f >= 1 && Math.abs(f - this.rfFrequencyMHz) > 1e-6) { this.rfFrequencyMHz = f; needsOpticalUpdate = true; } break;
            case 'rfPower': const p = parseFloat(value); if (!isNaN(p)) { const c = Math.max(0, Math.min(1, p)); if (Math.abs(c - this.rfPower) > 1e-9) { this.rfPower = c; needsOpticalUpdate = true; } } break;
            // Read-only properties:
            case 'diffractionAngle': case 'efficiency0': case 'efficiency1': return true;
            default: return false; // Not handled
        }

        if (needsGeomUpdate) {
            this.localVertices = [ // Recalculate local vertices
                new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
                new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
            ];
            try { this._updateGeometry(); } catch (e) { console.error(`AOM (${this.id}) setProperty geom update error:`, e); }
            needsRetrace = true; // Geometry change requires retrace
        }
        if (needsOpticalUpdate) {
            try { this._updateOpticalProperties(); } catch (e) { console.error(`AOM (${this.id}) setProperty optical update error:`, e); }
            needsRetrace = true; // Optical change requires retrace
            // Also refresh inspector immediately to show new calculated values
            if (selectedComponent === this) updateInspector();
        }

        return true; // Handled
    }
}



// Add this new FaradayRotator class and replace the old FaradayIsolator class in components.js

// --- START OF NEW COMPONENT: FaradayRotator ---

class FaradayRotator extends OpticalComponent {
    static functionDescription = "利用法拉第效应旋转偏振方向，旋转角与传播方向无关。";
    constructor(pos, width = 40, height = 25, angleDeg = 0, rotationAngleDeg = 45.0) {
        super(pos, angleDeg, "法拉第旋光器");
        this.width = Math.max(20, width);
        this.height = Math.max(10, height);
        this.rotationAngleRad = rotationAngleDeg * (Math.PI / 180);

        this.worldVertices = [];
        try { this._updateGeometry(); } catch (e) { console.error("Init FaradayRotator geom error:", e); }
    }

    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            width: this.width,
            height: this.height,
            rotationAngleDeg: this.rotationAngleRad * (180 / Math.PI)
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.save();
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#FF69B4'; // HotPink
        ctx.fillStyle = this.selected ? 'rgba(255, 105, 180, 0.3)' : 'rgba(255, 105, 180, 0.15)';
        ctx.lineWidth = this.selected ? 2 : 1;

        // Draw the main body
        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) { ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw a curved arrow indicating rotation
        const center = this.pos;
        const radius = Math.min(this.width, this.height) * 0.3;
        ctx.strokeStyle = this.selected ? 'yellow' : 'white';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, Math.PI * 1.2, Math.PI * 0.2);
        ctx.stroke();
        
        // Arrowhead
        const arrowAngle = Math.PI * 0.2;
        const endPoint = center.add(Vector.fromAngle(arrowAngle).multiply(radius));
        const normDir = Vector.fromAngle(arrowAngle + Math.PI/2);
        const arrowSize = 4;
        const v1 = normDir.rotate(Math.PI + Math.PI / 6).multiply(arrowSize);
        const v2 = normDir.rotate(Math.PI - Math.PI / 6).multiply(arrowSize);
        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x + v1.x, endPoint.y + v1.y);
        ctx.lineTo(endPoint.x + v2.x, endPoint.y + v2.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    intersect(rayOrigin, rayDirection) {
        // Find intersection with the bounding box, same as DielectricBlock
        let closestHit = null; let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4) return [];

        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4];
            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);

            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    if (t1 < closestDist) {
                        closestDist = t1;
                        const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        closestHit = { distance: t1, point: intersectionPoint, surfaceId: i };
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }
    
    // Faraday Rotator's core function
    interact(ray, intersectionInfo, RayClass) {
        // Non-reciprocal polarization rotation by +theta (Faraday effect)
        const theta = this.rotationAngleRad;
        const newOrigin = intersectionInfo.point.add(ray.direction.multiply(1e-6));
        const nextBounces = ray.bouncesSoFar + 1;
        let outRay = new RayClass(
            newOrigin, ray.direction, ray.wavelengthNm, ray.intensity,
            ray.phase, nextBounces, ray.mediumRefractiveIndex,
            ray.sourceId, ray.polarizationAngle, ray.ignoreDecay,
            ray.history.concat([newOrigin.clone()])
        );
        try {
            if (ray.hasJones && ray.hasJones()) {
                const R = Ray._rot2(theta);
                const v = Ray._apply2x2(R, ray.jones);
                outRay.setJones(v);
            } else if (typeof ray.polarizationAngle === 'number') {
                outRay.setLinearPolarization(Math.atan2(Math.sin(ray.polarizationAngle + theta), Math.cos(ray.polarizationAngle + theta)));
            }
        } catch (e) { console.error('FaradayRotator set jones error:', e); }
        ray.terminate('pass_rotator');
        return [outRay];
    }
    
    _containsPointBody(point) {
        if (!point) return false;
        const p_local = point.subtract(this.pos).rotate(-this.angleRad);
        return Math.abs(p_local.x) <= this.width / 2 && Math.abs(p_local.y) <= this.height / 2;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            rotationAngleDeg: { value: (this.rotationAngleRad * 180 / Math.PI).toFixed(1), label: '旋转角度 (°)', type: 'number', step: 1 },
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 10, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;
        let needsGeomUpdate = false;
        let needsRetraceUpdate = false;
        switch (propName) {
            case 'rotationAngleDeg':
                const angle = parseFloat(value);
                if (!isNaN(angle)) {
                    this.rotationAngleRad = angle * (Math.PI / 180);
                    needsRetraceUpdate = true;
                }
                break;
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 10) { this.height = h; needsGeomUpdate = true; }
                break;
            default: return false;
        }
        if (needsGeomUpdate) { this._updateGeometry(); needsRetrace = true; }
        if (needsRetraceUpdate) { needsRetrace = true; }
        return true;
    }
}

// --- END OF NEW COMPONENT: FaradayRotator ---


// --- START OF REPLACEMENT COMPONENT: FaradayIsolator ---

class FaradayIsolator extends OpticalComponent {
    static functionDescription = "利用法拉第效应实现光的单向传输，保护光源。";
    constructor(pos, width = 80, height = 30, angleDeg = 0) {
        super(pos, angleDeg, "光隔离器");
        this.width = Math.max(40, width);
        this.height = Math.max(20, height);

        // Internal component dimensions relative to total width
        this.polarizerWidth = this.width * 0.15;
        this.rotatorWidth = this.width * 0.6;
        
        // Geometry cache
        this.worldVertices = [];
        this.internalBoundaries = []; // x-coordinates of internal surfaces in local frame
        this.forwardDirection = Vector.fromAngle(this.angleRad);
        try { this._updateGeometry(); } catch (e) { console.error("Init FaradayIsolator geom error:", e); }
    }

    toJSON() {
        const baseData = super.toJSON();
        return { ...baseData, width: this.width, height: this.height };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        
        // Update dimensions
        this.polarizerWidth = this.width * 0.15;
        this.rotatorWidth = this.width * 0.6;
        
        this.forwardDirection = Vector.fromAngle(this.angleRad);
        const localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
        
        // Define local x-coordinates for internal component boundaries
        const halfW = this.width / 2;
        this.internalBoundaries = [
            -halfW, // 0: Input face
            -halfW + this.polarizerWidth, // 1: Input polarizer -> Rotator
            halfW - this.polarizerWidth, // 2: Rotator -> Output polarizer
            halfW // 3: Output face
        ];
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;
        ctx.save();
        
        // --- Draw main body ---
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#8A2BE2'; // BlueViolet
        ctx.fillStyle = this.selected ? 'rgba(138, 43, 226, 0.2)' : 'rgba(138, 43, 226, 0.1)';
        ctx.lineWidth = this.selected ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) { ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y); }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- Draw internal components (in local rotated frame) ---
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);
        const halfH = this.height / 2;

        // 1. Input Polarizer (0 deg)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.internalBoundaries[1], -halfH);
        ctx.lineTo(this.internalBoundaries[1], halfH);
        ctx.moveTo(this.internalBoundaries[1] - 4, 0); // Polarization indicator
        ctx.lineTo(this.internalBoundaries[1] + 4, 0);
        ctx.stroke();

        // 2. Output Polarizer (45 deg)
        ctx.beginPath();
        ctx.moveTo(this.internalBoundaries[2], -halfH);
        ctx.lineTo(this.internalBoundaries[2], halfH);
        ctx.stroke();
        // 45-degree indicator
        const pol_len = 4;
        ctx.beginPath();
        ctx.moveTo(this.internalBoundaries[2] - pol_len * Math.cos(Math.PI/4), -pol_len * Math.sin(Math.PI/4));
        ctx.lineTo(this.internalBoundaries[2] + pol_len * Math.cos(Math.PI/4), pol_len * Math.sin(Math.PI/4));
        ctx.stroke();

        // 3. Faraday Rotator (visual cue in the middle)
        ctx.fillStyle = 'rgba(255, 105, 180, 0.2)';
        ctx.fillRect(this.internalBoundaries[1], -halfH, this.rotatorWidth, this.height);

        ctx.restore();

        // --- Draw main forward arrow ---
        ctx.save();
        const arrowLength = this.width * 0.8;
        const arrowSize = 10;
        const startPoint = this.pos.subtract(this.forwardDirection.multiply(arrowLength / 2));
        const endPoint = this.pos.add(this.forwardDirection.multiply(arrowLength / 2));
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();

        const normDir = this.forwardDirection;
        const angle = Math.PI / 6;
        const v1 = normDir.rotate(Math.PI + angle).multiply(arrowSize);
        const v2 = normDir.rotate(Math.PI - angle).multiply(arrowSize);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(endPoint.x, endPoint.y);
        ctx.lineTo(endPoint.x + v1.x, endPoint.y + v1.y);
        ctx.lineTo(endPoint.x + v2.x, endPoint.y + v2.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    intersect(rayOrigin, rayDirection) {
        // Find intersection with the bounding box, same as DielectricBlock
        let closestHit = null; let closestDist = Infinity;
        if (!this.worldVertices || this.worldVertices.length !== 4) return [];

        for (let i = 0; i < 4; i++) {
            const p1 = this.worldVertices[i]; const p2 = this.worldVertices[(i + 1) % 4];
            const v1 = rayOrigin.subtract(p1); const v2 = p2.subtract(p1);
            const v3 = new Vector(-rayDirection.y, rayDirection.x);
            const dot_v2_v3 = v2.dot(v3);

            if (Math.abs(dot_v2_v3) > 1e-9) {
                const t1 = v2.cross(v1) / dot_v2_v3; const t2 = v1.dot(v3) / dot_v2_v3;
                if (t1 > 1e-6 && t2 >= -1e-6 && t2 <= 1.0 + 1e-6) {
                    if (t1 < closestDist) {
                        closestDist = t1;
                        const intersectionPoint = rayOrigin.add(rayDirection.multiply(t1));
                        closestHit = { distance: t1, point: intersectionPoint, surfaceId: i };
                    }
                }
            }
        }
        return closestHit ? [closestHit] : [];
    }

    interact(ray, intersectionInfo, RayClass) {
        // Determine if ray is entering from the front (input) or back (output)
        const hitPoint_local = intersectionInfo.point.subtract(this.pos).rotate(-this.angleRad);
        const isForward = ray.direction.dot(this.forwardDirection) > 0;

        let currentPolarization = ray.polarizationAngle;
        let currentIntensity = ray.intensity;

        // --- Simulate the chain of internal components ---
        
        if (isForward) {
            // 1. Input Polarizer (0 degrees)
            if (typeof currentPolarization === 'number') {
                currentIntensity *= Math.cos(currentPolarization) * Math.cos(currentPolarization);
            } else { // Unpolarized or circular
                currentIntensity /= 2.0;
            }
            currentPolarization = 0.0;

            // 2. Faraday Rotator (+45 degrees)
            currentPolarization += Math.PI / 4;

            // 3. Output Polarizer (45 degrees)
            const angleDiff = currentPolarization - (Math.PI / 4);
            currentIntensity *= Math.cos(angleDiff) * Math.cos(angleDiff);
            currentPolarization = Math.PI / 4;

        } else { // Backward propagation
            // 1. Output Polarizer (45 degrees)
            if (typeof currentPolarization === 'number') {
                const angleDiff = currentPolarization - (Math.PI/4);
                currentIntensity *= Math.cos(angleDiff) * Math.cos(angleDiff);
            } else {
                currentIntensity /= 2.0;
            }
            currentPolarization = Math.PI / 4;

            // 2. Faraday Rotator (+45 degrees - NON-RECIPROCAL)
            currentPolarization += Math.PI / 4; // Now at 90 degrees

            // 3. Input Polarizer (0 degrees) - This will block the light
            const angleDiff = currentPolarization - 0.0;
            currentIntensity *= Math.cos(angleDiff) * Math.cos(angleDiff); // cos(90) = 0
        }

        // Check if ray survives
        if (currentIntensity < ray.minIntensityThreshold) {
            ray.terminate('blocked_isolator');
            return [];
        }

        // Create the final transmitted ray
        const newOrigin = intersectionInfo.point.add(ray.direction.multiply(this.width)); // Emerge on the other side
        const transmittedRay = new RayClass(
            newOrigin, ray.direction, ray.wavelengthNm, currentIntensity,
            ray.phase, ray.bouncesSoFar + 1, ray.mediumRefractiveIndex,
            ray.sourceId, currentPolarization, ray.ignoreDecay,
            ray.history.concat([newOrigin.clone()])
        );
        ray.terminate('pass_isolator');
        return [transmittedRay];
    }
    
    _containsPointBody(point) {
        if (!point) return false;
        const p_local = point.subtract(this.pos).rotate(-this.angleRad);
        return Math.abs(p_local.x) <= this.width / 2 && Math.abs(p_local.y) <= this.height / 2;
    }

    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 40, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;
        let needsGeomUpdate = false;
        switch (propName) {
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 40) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsGeomUpdate = true; }
                break;
            default: return false;
        }
        if (needsGeomUpdate) { this._updateGeometry(); needsRetrace = true; }
        return true;
    }
}

// --- END OF REPLACEMENT COMPONENT: FaradayIsolator ---

// --- START OF NEW COMPONENT: CustomComponent (Text Box) ---

class CustomComponent extends GameObject {
    static functionDescription = "无物理交互的辅助元件，用于在画布上添加标签或注释。";
    constructor(pos, width = 100, height = 40, angleDeg = 0, text = "自定义元件") {
        super(pos, angleDeg, "自定义元件");
        this.width = Math.max(20, width);
        this.height = Math.max(20, height);
        this.text = text;

        // Geometry cache
        this.worldVertices = [];
        try { this._updateGeometry(); } catch (e) { console.error("Init CustomComponent geom error:", e); }
    }

    toJSON() {
        const baseData = super.toJSON();
        return {
            ...baseData,
            width: this.width,
            height: this.height,
            text: this.text
        };
    }

    _updateGeometry() {
        if (!(this.pos instanceof Vector)) return;
        const localVertices = [
            new Vector(-this.width / 2, -this.height / 2), new Vector(this.width / 2, -this.height / 2),
            new Vector(this.width / 2, this.height / 2), new Vector(-this.width / 2, this.height / 2)
        ];
        this.worldVertices = localVertices.map(v => v.rotate(this.angleRad).add(this.pos));
    }

    onAngleChanged() { this._updateGeometry(); }
    onPositionChanged() { this._updateGeometry(); }

    draw(ctx) {
        if (!this.worldVertices || this.worldVertices.length !== 4) return;

        ctx.save();
        ctx.strokeStyle = this.selected ? '#FFFF00' : '#CCCCCC'; // White/Gray, yellow selected
        ctx.fillStyle = this.selected ? 'rgba(100, 100, 100, 0.3)' : 'rgba(80, 80, 80, 0.2)';
        ctx.lineWidth = this.selected ? 2 : 1;

        // Draw the bounding box
        ctx.beginPath();
        ctx.moveTo(this.worldVertices[0].x, this.worldVertices[0].y);
        for (let i = 1; i < 4; i++) {
            ctx.lineTo(this.worldVertices[i].x, this.worldVertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw the text, rotated with the component
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.angleRad);

        ctx.fillStyle = this.selected ? 'yellow' : 'white';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);

        ctx.restore();
    }

    getBoundingBox() {
        if (!this.worldVertices || this.worldVertices.length < 3) return super.getBoundingBox();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.worldVertices.forEach(v => {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
        });
        const buffer = 2;
        return { x: minX - buffer, y: minY - buffer, width: (maxX - minX) + 2 * buffer, height: (maxY - minY) + 2 * buffer };
    }

    _containsPointBody(point) {
        if (!point || !this.worldVertices || this.worldVertices.length !== 4) return false;
        // Simple point-in-rotated-rectangle check (using dot products)
        const p_local = point.subtract(this.pos).rotate(-this.angleRad);
        return Math.abs(p_local.x) <= this.width / 2 && Math.abs(p_local.y) <= this.height / 2;
    }

    // This component does not interact with light, so the interact method is empty
    interact(ray, intersectionInfo, RayClass) {
        return []; // Ray passes through unchanged, but we return empty so it doesn't terminate
    }
    
    // It shouldn't intersect, let the ray pass through.
    // We override intersect to return nothing, so traceAllRays won't find a hit.
    intersect(rayOrigin, rayDirection) {
        return [];
    }


    getProperties() {
        const baseProps = super.getProperties();
        return {
            ...baseProps,
            text: { value: this.text, label: '文本内容', type: 'text' },
            width: { value: this.width.toFixed(1), label: '宽度', type: 'number', min: 20, step: 1 },
            height: { value: this.height.toFixed(1), label: '高度', type: 'number', min: 20, step: 1 },
        };
    }

    setProperty(propName, value) {
        if (super.setProperty(propName, value)) return true;

        let needsGeomUpdate = false;
        switch (propName) {
            case 'text':
                this.text = String(value);
                // No retrace needed, just a redraw, which will happen anyway.
                break;
            case 'width':
                const w = parseFloat(value);
                if (!isNaN(w) && w >= 20) { this.width = w; needsGeomUpdate = true; }
                break;
            case 'height':
                const h = parseFloat(value);
                if (!isNaN(h) && h >= 20) { this.height = h; needsGeomUpdate = true; }
                break;
            default:
                return false;
        }

        if (needsGeomUpdate) {
            this._updateGeometry();
            needsRetrace = true;
        }
        return true;
    }
}
// --- END OF NEW COMPONENT: CustomComponent (Text Box) ---


console.log("components.js: Added AcoustoOpticModulator class.");

// --- END OF NEW COMPONENT: AcoustoOpticModulator (AOM) ---

console.log("components.js: Added Photodiode class.");

console.log("components.js: All component classes defined or updated.");