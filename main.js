// main.js - Main simulation logic and event handling

console.log("光学实验室 main.js 正在加载...");

// --- Global DOM Elements ---
let canvas, ctx, toolbar, simulationArea, inspector, inspectorContent, deleteBtn,
    toggleArrowsBtn, toggleSelectedArrowBtn, arrowSpeedSlider;

window.globalMaxBounces = MAX_RAY_BOUNCES;
window.globalMinIntensity = MIN_RAY_INTENSITY;

let currentUser = null; // null if not logged in, or an object like { username: '...' } if logged in
let initialized = false; // Flag to prevent multiple initializations

// --- Global State ---
let components = []; // Array to hold all GameObject instances
let selectedComponent = null; // Currently selected component
let draggingComponent = null; // Component being dragged
let dragStartMousePos = null; // Mouse position when drag started
let isDragging = false; // General dragging flag (position or angle)
let needsRetrace = true; // Flag to recalculate ray paths
let componentToAdd = null; // Type string of component selected from toolbar
let currentRayPaths = []; // Stores the results of the last ray trace (Ray objects)
let mousePos = new Vector(0, 0); // Current mouse position in canvas logical coordinates
let mouseIsDown = false; // Is the primary mouse button currently pressed?
let eventListenersSetup = false; // Ensure listeners are only added once
let lastTimestamp = 0; // For calculating delta time in game loop
let nextFrameActiveRays = []; // Store rays generated this frame to activate next frame (e.g., fiber output)
// window.ignoreMaxBounces = false; // Make it global via window object

let cameraScale = 1.0;       // Current zoom level (1.0 = 100%)
let cameraOffset = new Vector(0, 0); // Current pan offset (canvas origin relative to view origin)
let isPanning = false;       // Flag: Is the user currently panning?
let lastPanMousePos = null;  // Mouse position at the start of panning

// --- Simulation Settings ---
let showGrid = true;
window.maxRaysPerSource = 1001; // Default: Allow up to 1001 rays
window.globalMaxBounces = MAX_RAY_BOUNCES; // Use constant from ray.js initially
window.globalMinIntensity = MIN_RAY_INTENSITY; // Use constant from ray.js initially
let fastWhiteLightMode = false; // <<<--- ADDED: Default to accurate (slower) white light
const LOCALSTORAGE_SETTINGS_KEY = 'opticsLabSettings';

let sceneModified = false;     // Flag: Has the scene been modified since last save/load?
let isImporting = false;       // Lock to prevent double import clicks/triggers
const LOCALSTORAGE_SCENE_KEY = 'opticsLabSceneData'; // Key for saving/loading scene
// let showGrid = true;         // Default: Show grid initially
// const LOCALSTORAGE_SETTINGS_KEY = 'opticsLabSettings'; // Key for saving settings

// --- Animation State ---
let arrowAnimationStartTime = 0; // Time when arrows were last enabled
let globalShowArrows = false; // Global toggle for showing any arrows
let onlyShowSelectedSourceArrow = false; // Mode: show all vs. only selected source's arrow
let arrowAnimationSpeed = 100; // Speed pixels/sec (or units/sec)
const ARROW_SIZE_PIXELS = 12; // <<<--- ADD THIS LINE (Adjust 12 to your preferred size)
let arrowAnimationStates = new Map(); // <<<--- ADD THIS LINE
// --- Simulation State ---
let currentMode = 'ray_trace'; // 'ray_trace' or 'lens_imaging'
let modeHintElement = null; // To display hints on canvas

// --- Constants (ensure N_AIR, DEFAULT_WAVELENGTH_NM are available if needed directly) ---
const MAX_RAY_BOUNCES_FOR_PATH = 300; // Safety limit slightly higher than actual bounce limit, mirroring Ray.js MAX_RAY_BOUNCES
// --- Constants ---
const MIN_ARROW_INTENSITY_THRESHOLD = 0.05; // Minimum relative intensity for an arrow path to be shown (e.g., 5%)
const BS_SPLIT_ARROW_THRESHOLD = 0.20; // If BS split results in intensity > 20% for both, show both arrows



// // --- Helper to get full path from linked ray segments ---
// --- Helper to get full path from linked ray segments ---
// Reinstated version using nextRaySegment link
// function getFullPathPoints(initialRay) {
//     if (!initialRay || !(initialRay instanceof Ray)) return [];
//     // console.log(`[getFullPathPoints] START for Ray (Src=${initialRay.sourceId}, Bnc=${initialRay.bouncesSoFar})`);// DEBUG

//     let fullPath = [];
//     const initialPoints = initialRay.getPathPoints();
//     if (initialPoints && initialPoints.length > 0 && initialPoints[0] instanceof Vector) {
//         fullPath = [...initialPoints]; // Start with the first segment's points
//     } else {
//         // console.warn("Initial ray segment has invalid points:", initialRay?.sourceId);
//         return []; // Cannot build path if first segment is empty/invalid
//     }

//     let currentRay = initialRay;
//     let safetyCounter = 0;

//     // Traverse the linked list of segments
//     while (currentRay && currentRay.nextRaySegment && safetyCounter < MAX_RAY_BOUNCES_FOR_PATH) {
//         // console.log(`  Segment ${safetyCounter}: Following nextRaySegment from Bnc=${currentRay.bouncesSoFar}`); // DEBUG
//         if (!(currentRay.nextRaySegment instanceof Ray)) {
//             console.warn("  Next segment is not a Ray:", currentRay.nextRaySegment); // DEBUG
//             break; // Link broken or invalid
//         }

//         currentRay = currentRay.nextRaySegment;
//         const nextPoints = currentRay.getPathPoints();

//         // console.log(`  -> Got next segment (Src=${currentRay.sourceId}, Bnc=${currentRay.bouncesSoFar}, Term=${currentRay.terminated}), Points: ${nextPoints?.length}`); // DEBUG

//         if (nextPoints && nextPoints.length > 1) {
//             // Add points from the next segment, *skipping the first point*
//             // because it should be the same as the last point of the previous segment.
//             if (fullPath.length > 0) {
//                 const lastAddedPoint = fullPath[fullPath.length - 1];
//                 const firstOfNext = nextPoints[0];
//                 // Optional check: ensure points match before skipping
//                 if (lastAddedPoint && firstOfNext instanceof Vector && !lastAddedPoint.equals(firstOfNext, 1e-4)) {
//                     console.warn(`Path point mismatch between segments (Src: ${initialRay.sourceId}, Bnc: ${currentRay.bouncesSoFar}). Dist: ${lastAddedPoint.distanceTo(firstOfNext).toFixed(4)}`);
//                     // Don't skip if they don't match? Push all.
//                     fullPath.push(...nextPoints);
//                 } else if (firstOfNext instanceof Vector) {
//                     // Skip first point if it matches
//                     fullPath.push(...nextPoints.slice(1));
//                 } else {
//                     console.warn(`Invalid first point in next segment (Src: ${initialRay.sourceId}, Bnc: ${currentRay.bouncesSoFar})`);
//                     // Add remaining valid points?
//                     fullPath.push(...nextPoints.slice(1).filter(p => p instanceof Vector));
//                 }
//             } else {
//                 // Should not happen if initialPoints was valid
//                 fullPath.push(...nextPoints.filter(p => p instanceof Vector));
//             }

//         } else if (nextPoints && nextPoints.length === 1 && fullPath.length > 0) {
//             // If next segment only has one point, check if it's different from last point added
//             const lastAddedPoint = fullPath[fullPath.length - 1];
//             if (nextPoints[0] instanceof Vector && lastAddedPoint && !lastAddedPoint.equals(nextPoints[0], 1e-5)) {
//                 fullPath.push(nextPoints[0]);
//             }
//             break; // Stop if segment only has one point (likely just the endpoint)
//         } else {
//             // console.warn(`Segment ${safetyCounter+1} has invalid points for Source: ${initialRay.sourceId}`);
//             break; // Stop if segment has no points or invalid history
//         }
//         safetyCounter++;
//     }

//     // console.log(`[getFullPathPoints] END for Ray (Src=${initialRay.sourceId}). Total points: ${fullPath.length}, Segments processed: ${safetyCounter}`); // DEBUG
//     return fullPath;
// }

// --- Simulation Core Loop --- // (The rest of the file continues from here)

// --- Simulation Core Loop ---
function gameLoop(timestamp) {
    const dt = (timestamp - lastTimestamp) / 1000; // Delta time in seconds
    lastTimestamp = timestamp;

    // Avoid large dt spikes if tab was inactive
    const maxDt = 0.1; // Limit delta time to 100ms
    const effectiveDt = Math.min(dt, maxDt);

    // --- Update State ---
    updateArrowAnimations(effectiveDt);

    // --- Activate Rays Generated Last Frame ---
    // (Currently only used for Fiber Output)
    const initialActiveRays = []; // Start with an empty array for the main trace loop
    if (nextFrameActiveRays.length > 0) {
        console.log(`[GameLoop] Activating ${nextFrameActiveRays.length} rays from previous frame (fiber outputs).`);
        initialActiveRays.push(...nextFrameActiveRays); // Add fiber outputs first? Or last? Let's add first.
        nextFrameActiveRays = []; // Clear the queue for the next frame
    }
    // --- End Activation ---

    // --- Ray Tracing ---
    // --- Ray Tracing Block (Modified for Fiber Output Handling) ---
    console.time("RayTrace");
    components.forEach(comp => comp.reset?.()); // Reset components

    try {
        // traceAllRays now potentially returns generated rays separately
        const traceResult = traceAllRays(components,
            canvas.width / (window.devicePixelRatio || 1),
            canvas.height / (window.devicePixelRatio || 1),
            initialActiveRays); // Pass initial rays (might include last frame's fiber outputs)

        // traceResult should be an object: { completedPaths: [], generatedRays: [] }
        if (traceResult && Array.isArray(traceResult.completedPaths)) {
            currentRayPaths = traceResult.completedPaths; // Paths completed THIS frame
            if (Array.isArray(traceResult.generatedRays) && traceResult.generatedRays.length > 0) {
                // Store newly generated rays (fiber outputs) for the *next* frame
                nextFrameActiveRays.push(...traceResult.generatedRays);
                console.log(` -> Stored ${traceResult.generatedRays.length} generated rays for next frame.`);
            }
        } else {
            console.error("traceAllRays returned invalid result:", traceResult);
            currentRayPaths = [];
        }

    } catch (e) {
        console.error("!!! Error during traceAllRays:", e);
        currentRayPaths = []; // Clear paths on error
        nextFrameActiveRays = []; // Also clear pending rays on error
    } finally { // Ensure timing ends even on error
        console.timeEnd("RayTrace");
    }
    // --- End Ray Tracing Block ---

    // --- Rendering ---
    draw();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// --- START OF REPLACEMENT: updateArrowAnimations function ---
function updateArrowAnimations(dt) { // dt is not directly used, uses global time
    const newAnimationStates = new Map(); // Create a new map for this frame

    // If arrows are globally off, clear the states map and exit
    if (!globalShowArrows) {
        if (arrowAnimationStates.size > 0) arrowAnimationStates.clear(); // Clear existing states if hiding
        return; // Stop processing if arrows are off
    }

    // If no paths calculated yet, clear states and exit
    if (!currentRayPaths || currentRayPaths.length === 0) {
        if (arrowAnimationStates.size > 0) arrowAnimationStates.clear();
        return;
    }

    // Use performance.now() for smoother animation timing
    const nowSeconds = performance.now() / 1000.0;
    // Ensure startTime is valid (might be 0 on first load before toggle)
    const startTime = (arrowAnimationStartTime > 0) ? arrowAnimationStartTime : nowSeconds;
    const elapsedSeconds = nowSeconds - startTime; // Time since arrows were last enabled
    const speed = arrowAnimationSpeed; // Use the current speed setting

    currentRayPaths.forEach((ray, index) => {
        // Check if this Ray segment should be animated based on traceAllRays logic
        if (ray instanceof Ray && ray.animateArrow) { // `animateArrow` is set during trace
            const pathPoints = ray.getPathPoints();
            if (!pathPoints || pathPoints.length < 2) return; // Skip invalid paths for this segment

            // Calculate the total length of THIS ray segment's path
            let pathLength = 0;
            let isValidSegmentPath = true;
            for (let i = 1; i < pathPoints.length; i++) {
                const p1 = pathPoints[i - 1];
                const p2 = pathPoints[i];
                if (p1 instanceof Vector && p2 instanceof Vector &&
                    !isNaN(p1.x) && !isNaN(p2.x)) {
                    try {
                        const dist = p1.distanceTo(p2);
                        if (!isNaN(dist)) {
                            pathLength += dist;
                        } else { isValidSegmentPath = false; break; }
                    } catch (e) { isValidSegmentPath = false; break; }
                } else { isValidSegmentPath = false; break; }
            }

            // If path is valid and has length, calculate arrow position for this segment
            const EPSILON_LENGTH = 1e-6;
            if (isValidSegmentPath && pathLength > EPSILON_LENGTH) {
                // Calculate distance based on elapsed time, modulo this segment's path length
                // This makes the arrow loop *along this specific segment*
                let currentDistance = (speed * elapsedSeconds) % pathLength;
                if (currentDistance < 0) currentDistance += pathLength; // Handle potential negative modulo

                // Store state needed for drawing this segment's arrow
                newAnimationStates.set(index, { // Use original index in currentRayPaths as key
                    distance: currentDistance,
                    pathLength: pathLength,
                    pathPoints: pathPoints, // Store points for drawing
                    sourceId: ray.sourceId   // Store sourceId for filtering
                });
            }
        } // End if (ray instanceof Ray && ray.animateArrow)
    }); // End forEach currentRayPaths

    // Replace the old states map with the newly calculated one for this frame
    arrowAnimationStates = newAnimationStates;
}
// --- END OF REPLACEMENT: updateArrowAnimations function ---



// --- ADD THIS NEW FUNCTION ---
// // --- 确认 resetArrowAnimations 函数内容 ---
// function resetArrowAnimations() {
//     console.log("[Resetting Arrow Animations]");
//     if (currentRayPaths) {
//         currentRayPaths.forEach(ray => {
//             if (ray instanceof Ray) {
//                 if (ray.bouncesSoFar === 0) {
//                     ray.arrowAnimationProgress = 0.0; // Reset initial segments
//                 } else {
//                     ray.arrowAnimationProgress = -1; // Deactivate others
//                 }
//             }
//         });
//     } else {
//         console.log(" -> No currentRayPaths to reset.");
//     }
// }
// --- 验证/替换结束 ---

// --- Rendering Functions ---
function draw() {
    if (!ctx) return;
    // --- Apply Camera Transform ---
    ctx.save(); // Save the default state
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear with physical dimensions is okay here

    // Translate and scale based on camera offset and scale
    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(cameraScale, cameraScale);

    // Now, all subsequent drawing commands are in the transformed coordinate system

    // Define the visible area in logical coordinates (useful for culling later)
    const viewPortLogicalWidth = canvas.width / cameraScale;
    const viewPortLogicalHeight = canvas.height / cameraScale;
    const viewPortMinX = -cameraOffset.x / cameraScale;
    const viewPortMinY = -cameraOffset.y / cameraScale;
    const viewPortMaxX = viewPortMinX + viewPortLogicalWidth;
    const viewPortMaxY = viewPortMinY + viewPortLogicalHeight;
    // --- End Apply Camera Transform ---
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    // Hide any mode hints before drawing starts
    hideModeHint();

    // Clear canvas (using the darker canvas background color)
    ctx.fillStyle = '#111111';
    ctx.fillRect(viewPortMinX, viewPortMinY, viewPortLogicalWidth, viewPortLogicalHeight);
    // Draw grid background (optional)
    drawGrid(ctx, 50, 'rgba(255, 255, 255, 0.05)');

    // --- Draw based on Mode ---
    if (currentMode === 'lens_imaging') {
        // Try to draw lens imaging diagram (includes special rays and image)
        const drawnSuccessfully = drawOpticalSystemDiagram(ctx);
        if (!drawnSuccessfully) {
            // If conditions not met, show hint
            showModeHint('透镜成像模式需要：一个光源和一片薄透镜。');
            // Optional Fallback: Could draw normal rays here if desired
            // drawRayPaths(ctx, currentRayPaths);
        }
        // In lens imaging mode, we generally DON'T draw normal moving arrows
    } else { // Default 'ray_trace' mode
        // Draw calculated ray paths and arrows as before
        drawRayPaths(ctx, currentRayPaths);
        drawArrowAnimations(ctx); // Only draw arrows in ray trace mode
    }

    // Draw placement preview if a tool is selected
    // (Drawn before components so components appear on top of preview)
    drawPlacementPreview(ctx);

    // Draw all components
    components.forEach(comp => {
        try {
            comp.draw(ctx); // Draw the component itself
            // Draw selection highlight (which includes angle handle)
            // The base GameObject.drawSelection handles the angle handle part.
            // Subclasses might override drawSelection to add more highlights.
            if (comp === selectedComponent) {
                comp.drawSelection(ctx);
            }
        } catch (e) {
            console.error(`Error drawing component ${comp?.label}:`, e, comp);
        }
    }); // End drawing components loop

    // --- Draw Image AFTER components in Lens Imaging Mode ---
    // Note: drawLensImagingDiagram currently handles drawing the image itself.
    // This section is structurally correct if we needed separate control later,
    // but for now, it doesn't strictly *need* to do anything extra here
    // because drawLensImagingDiagram already drew the image.
    if (currentMode === 'lens_imaging') {
        // Potential future logic if image drawing needs to be separated
        // for layering reasons, but rely on drawLensImagingDiagram for now.
        // Example: findImageAgainAndDraw(...)
    }
    ctx.restore();
} // --- End of draw function ---

function drawGrid(context, gridSize, gridColor) {
    if (!showGrid) {
        return; // Don't draw grid if it's turned off
    }
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = context.canvas.width / dpr;
    const logicalHeight = context.canvas.height / dpr;

    context.strokeStyle = gridColor;
    context.lineWidth = 1 / dpr; // Make grid lines thin (1 physical pixel)
    context.beginPath();
    for (let x = gridSize; x < logicalWidth; x += gridSize) {
        context.moveTo(x + 0.5 / dpr, 0); // Offset for crisp lines
        context.lineTo(x + 0.5 / dpr, logicalHeight);
    }
    for (let y = gridSize; y < logicalHeight; y += gridSize) {
        context.moveTo(0, y + 0.5 / dpr);
        context.lineTo(logicalWidth, y + 0.5 / dpr);
    }
    context.stroke();
}

function drawRayPaths(context, completedPaths) {
    if (!completedPaths || completedPaths.length === 0) return;
    const dpr = window.devicePixelRatio || 1;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    completedPaths.forEach((ray, pathIndex) => { // Add index for logging
        // Ensure ray object itself is valid
        if (!(ray instanceof Ray)) {
            // console.warn(`[Draw] Item at index ${pathIndex} is not a Ray object.`); // Can be noisy
            return; // Skip this entry
        }

        const pathPoints = ray.getPathPoints();

        // Ensure history exists and has at least 2 points for a line
        if (!pathPoints || pathPoints.length < 2) {
            // console.log(`[Draw] Path ${pathIndex} (Src: ${ray.sourceId}) has insufficient points (${pathPoints?.length}).`); // Can be noisy
            return; // Skip drawing if not enough points
        }

        try {
            context.strokeStyle = ray.getColor();
            // Get calculated width from Ray (already clamped) and scale by DPR
            const logicalWidth = ray.getLineWidth();
            context.lineWidth = Math.max(MIN_RAY_WIDTH / dpr, logicalWidth / dpr);
            context.beginPath();
            let firstPoint = pathPoints[0];
            let movedToStart = false;

            // Validate the starting point
            if (firstPoint instanceof Vector && !isNaN(firstPoint.x) && !isNaN(firstPoint.y)) {
                context.moveTo(firstPoint.x, firstPoint.y);
                movedToStart = true;
            } else {
                console.warn(`[Draw] Path ${pathIndex} (Src: ${ray.sourceId}) has invalid starting point.`, firstPoint);
                // Attempt to find the first valid point to start drawing? Might be complex.
                // For now, just skip drawing this path if start is invalid.
                return;
            }

            // Draw subsequent segments, checking each point
            let lastValidPoint = firstPoint;
            for (let i = 1; i < pathPoints.length; i++) {
                const currentPoint = pathPoints[i];

                if (currentPoint instanceof Vector && !isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
                    // Check for significant distance to avoid drawing on top of itself
                    if (currentPoint.distanceSquaredTo(lastValidPoint) > 1e-8) {
                        context.lineTo(currentPoint.x, currentPoint.y);
                        lastValidPoint = currentPoint;
                    }
                    // else: Point is valid but too close, skip lineTo
                } else {
                    console.warn(`[Draw] Path ${pathIndex} (Src: ${ray.sourceId}) encountered invalid point at index ${i}. Stopping draw for this path.`, currentPoint);
                    // Stop drawing this specific path segment
                    break;
                }
            }

            // Only stroke if we actually started and drew something
            if (movedToStart && pathPoints.length > 1) { // Check length again in case loop broke early
                context.stroke();
            }

        } catch (e) {
            console.error(`[Draw] Error drawing path ${pathIndex} (Src: ${ray.sourceId}):`, e, ray);
            // Ensure context state is clean in case of error during path drawing
            context.restore(); // Restore early
            context.save(); // Save again for next iteration
        }
    }); // End forEach loop

    context.restore(); // Final restore
}

// --- START OF REPLACEMENT: drawArrowAnimations function ---
function drawArrowAnimations(ctx) {
    // Draw only if globally enabled AND there are states to draw
    if (!globalShowArrows || arrowAnimationStates.size === 0) {
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const arrowSize = ARROW_SIZE_PIXELS / dpr; // Use the constant defined earlier
    const arrowColor = '#FFFF00'; // Yellow color for visibility
    const EPSILON_DIST = 1e-6;

    ctx.fillStyle = arrowColor;

    // Iterate through the stored animation states (Map: index -> state)
    arrowAnimationStates.forEach((state, key_index) => {

        // Basic state validation from update function
        if (!state || !state.pathPoints || state.pathPoints.length < 2 || state.pathLength <= EPSILON_DIST || isNaN(state.distance)) {
            // console.warn(`[DrawArrows] Skipping invalid state for key ${key_index}`); // DEBUG
            return; // Skip invalid states
        }

        // --- Filter: "Only Show Selected" ---
        let shouldDraw = true;
        if (onlyShowSelectedSourceArrow) {
            // Draw only if a component is selected AND its ID matches the ray's source ID
            if (!selectedComponent || !state.sourceId || selectedComponent.id !== state.sourceId) {
                shouldDraw = false;
            }
        }
        // --- End Filter ---


        if (shouldDraw) {
            const pathPoints = state.pathPoints;
            const currentArrowDist = state.distance; // Use distance from state map
            let distanceTraveled = 0;

            // Find the correct segment and position for the arrow within this path segment
            for (let i = 1; i < pathPoints.length; i++) {
                const p1 = pathPoints[i - 1];
                const p2 = pathPoints[i];

                // Validate points for this segment part
                if (!(p1 instanceof Vector) || !(p2 instanceof Vector) || isNaN(p1.x) || isNaN(p2.x)) {
                    // console.warn(`[DrawArrows] Invalid points in segment ${i} for key ${key_index}`); // DEBUG
                    continue; // Skip invalid segments within the path
                }

                const segmentVector = p2.subtract(p1);
                let segmentLength = 0;
                try { segmentLength = segmentVector.magnitude(); } catch (e) { continue; } // Skip if magnitude fails

                if (segmentLength > EPSILON_DIST) {
                    const segmentStartDistance = distanceTraveled;
                    const segmentEndDistance = distanceTraveled + segmentLength;

                    // Check if the arrow's current distance falls within this segment part
                    // Use tolerance when comparing distances
                    if (currentArrowDist >= segmentStartDistance - EPSILON_DIST && currentArrowDist <= segmentEndDistance + EPSILON_DIST) {
                        // Calculate interpolation factor (t) within this segment part
                        const t = Math.max(0, Math.min(1, (currentArrowDist - segmentStartDistance) / segmentLength));

                        try {
                            const arrowPos = Vector.lerp(p1, p2, t); // Calculate arrow position
                            const arrowDir = segmentVector.normalize(); // Direction of the arrow

                            // Ensure calculations are valid before drawing
                            if (arrowPos && arrowDir && !isNaN(arrowPos.x) && arrowDir.magnitudeSquared() > 0.5) {
                                // Calculate points for the arrowhead shape
                                const angle = Math.PI / 6; // Arrowhead angle
                                // Vectors for the two back points of the arrowhead
                                const v1 = arrowDir.rotate(Math.PI + angle).multiply(arrowSize);
                                const v2 = arrowDir.rotate(Math.PI - angle).multiply(arrowSize);
                                const arrowTail1 = arrowPos.add(v1);
                                const arrowTail2 = arrowPos.add(v2);

                                // Draw the filled triangle arrowhead
                                if (arrowTail1 && arrowTail2 && !isNaN(arrowTail1.x) && !isNaN(arrowTail2.x)) {
                                    ctx.beginPath();
                                    ctx.moveTo(arrowPos.x, arrowPos.y); // Tip
                                    ctx.lineTo(arrowTail1.x, arrowTail1.y); // Back corner 1
                                    ctx.lineTo(arrowTail2.x, arrowTail2.y); // Back corner 2
                                    ctx.closePath();
                                    ctx.fill();
                                }
                            }
                        } catch (e) { console.error(`[DrawArrows] Error drawing arrow geometry for key ${key_index}:`, e); }
                        break; // Arrow drawn for this state, move to the next state
                    } // End if arrow is in this segment part
                } // End if segmentLength > EPSILON_DIST

                distanceTraveled += segmentLength; // Accumulate distance traveled along the path
            } // End loop through segment parts (for let i...)
        } // End if shouldDraw
    }); // End forEach arrowAnimationStates
}
// --- END OF REPLACEMENT: drawArrowAnimations function ---

function drawPlacementPreview(ctx) {
    if (!componentToAdd || !mousePos) return; // No tool selected or no mouse position

    ctx.save();
    ctx.globalAlpha = 0.5; // Make preview semi-transparent
    ctx.setLineDash([3, 3]); // Dashed outline

    // Create a temporary dummy component at mouse position for drawing its preview
    let previewComp = null;
    const previewPos = mousePos.clone();
    try {
        switch (componentToAdd) {
            case 'LaserSource': previewComp = new LaserSource(previewPos); break;
            case 'FanSource': previewComp = new FanSource(previewPos); break;
            case 'LineSource': previewComp = new LineSource(previewPos); break;
            case 'Mirror': previewComp = new Mirror(previewPos); break;
            case 'SphericalMirror': previewComp = new SphericalMirror(previewPos); break;
            case 'ParabolicMirror': previewComp = new ParabolicMirror(previewPos); break;
            case 'Screen': previewComp = new Screen(previewPos); break;
            case 'ThinLens': // Preview for CONVEX
                previewComp = new ThinLens(previewPos); // Uses constructor defaults
                break;
            case 'Aperture': previewComp = new Aperture(previewPos); break;
            case 'Polarizer': previewComp = new Polarizer(previewPos); break;
            case 'BeamSplitter': previewComp = new BeamSplitter(previewPos); break;
            case 'DielectricBlock': previewComp = new DielectricBlock(previewPos); break;
            case 'Photodiode': previewComp = new Photodiode(previewPos); break;
            case 'OpticalFiber':
                previewComp = new OpticalFiber(previewPos); // pos is input, output calculated internally
                break;
            case 'Prism':
                previewComp = new Prism(previewPos); // Create a default Prism for preview
                break;
            case 'WhiteLightSource':
                previewComp = new WhiteLightSource(previewPos);
                break;
            case 'DiffractionGrating':
                previewComp = new DiffractionGrating(previewPos);
                break;
            case 'HalfWavePlate':
                previewComp = new HalfWavePlate(previewPos);
                break;
            case 'QuarterWavePlate':
                previewComp = new QuarterWavePlate(previewPos);
                break;
            case 'AcoustoOpticModulator':
                previewComp = new AcoustoOpticModulator(previewPos);
                break;
            case 'ConcaveMirror':
                previewComp = new SphericalMirror(previewPos, 200, 90, 0); // Match default creation
                break;
            case 'ConvexMirror':
                previewComp = new SphericalMirror(previewPos, -200, 90, 0); // Match default creation
                break;
            case 'ParabolicMirrorToolbar':
                previewComp = new ParabolicMirror(previewPos, 100, 100, 0); // Match default creation
                break;
        }

        if (previewComp) {
            // Use the component's own draw method for the preview
            previewComp.selected = false; // Ensure it's not drawn as selected
            previewComp.draw(ctx);
        }
    } catch (e) { console.error("Error creating preview component:", e); }

    ctx.restore();
}



// --- START REPLACEMENT for the ENTIRE drawOpticalSystemDiagram function (V8 - Ray Path Logic Finalized) ---
function drawOpticalSystemDiagram(ctx) {
    const dpr = window.devicePixelRatio || 1;

    // --- Style Constants ---
    const AXIS_COLOR = 'rgba(180, 180, 180, 0.5)'; const LENS_COLOR = '#AAAAFF'; const OBJ_COLOR = '#FFA500';
    const IMG_REAL_COLOR = '#32CD32'; const IMG_VIRTUAL_COLOR = '#90EE90'; const FOCI_COLOR = 'cyan';
    const RAY_PARALLEL_COLOR = 'rgba(255, 100, 100, 0.85)'; const RAY_CENTER_COLOR = 'rgba(100, 255, 100, 0.85)';
    const RAY_FOCAL_COLOR = 'rgba(100, 100, 255, 0.85)'; const INFO_COLOR = 'rgba(230, 230, 230, 0.9)';

    const LINE_WIDTH = 1.0 / dpr; const THICK_LINE_WIDTH = 1.8 / dpr; const RAY_WIDTH = 1.2 / dpr;
    const POINT_RADIUS = 3 / dpr; const ARROW_SIZE = 8 / dpr; const DASH_PATTERN = [4 / dpr, 3 / dpr];

    // --- Helper Functions ---
    const _isValidVector = (...vectors) => vectors.every(v => v && v instanceof Vector && !isNaN(v.x) && !isNaN(v.y));
    const _isValidNumber = (...numbers) => numbers.every(n => typeof n === 'number' && isFinite(n));
    const _drawLabeledPoint = (point, label, color, offset = new Vector(5, -5), align = 'left', base = 'bottom') => { if (!_isValidVector(point)) return; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(point.x, point.y, POINT_RADIUS, 0, 2 * Math.PI); ctx.fill(); ctx.font = `italic ${12 / dpr}px sans-serif`; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = INFO_COLOR; ctx.fillText(label, point.x + offset.x / dpr, point.y + offset.y / dpr); };
    const _drawLine = (p1, p2, color, width = LINE_WIDTH, dashes = []) => { if (!_isValidVector(p1, p2)) return; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dashes); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke(); ctx.restore(); };
    const _drawArrow = (p1, p2, color, size = ARROW_SIZE, width = THICK_LINE_WIDTH) => { if (!_isValidVector(p1, p2)) return; const vec = p2.subtract(p1); if (vec.magnitudeSquared() < 1e-9) return; _drawLine(p1, p2, color, width); const normDir = vec.normalize(); if (!_isValidVector(normDir)) return; const angle = Math.PI / 6; const v1 = normDir.rotate(Math.PI + angle).multiply(size); const v2 = normDir.rotate(Math.PI - angle).multiply(size); if (!_isValidVector(v1, v2)) return; ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x + v1.x, p2.y + v1.y); ctx.lineTo(p2.x + v2.x, p2.y + v2.y); ctx.closePath(); ctx.fill(); };
    const _drawLensSchematic = (lensComp, color = LENS_COLOR) => { if (!lensComp || !_isValidVector(lensComp.p1, lensComp.p2, lensComp.axisDirection)) return; const p1 = lensComp.p1; const p2 = lensComp.p2; const F = lensComp.focalLength; const isFlat = Math.abs(F) === Infinity; _drawLine(p1, p2, color, THICK_LINE_WIDTH * 1.2); if (!isFlat) { const arrowSize = ARROW_SIZE * 0.8; const midTop = Vector.lerp(lensComp.pos, p1, 0.85); const midBot = Vector.lerp(lensComp.pos, p2, 0.85); const arrowDir = lensComp.axisDirection.clone(); ctx.fillStyle = color; if (F > 0) { _drawArrowheadHelper(ctx, midTop, arrowDir.multiply(-1), arrowSize); _drawArrowheadHelper(ctx, midBot, arrowDir, arrowSize); } else { _drawArrowheadHelper(ctx, midTop, arrowDir, arrowSize); _drawArrowheadHelper(ctx, midBot, arrowDir.multiply(-1), arrowSize); } } };
    const _drawArrowheadHelper = (ctx, tip, direction, size) => { if (!_isValidVector(tip, direction) || direction.magnitudeSquared() < 1e-6 || size <= 0) return; const normDir = direction.normalize(); if (!_isValidVector(normDir)) return; const angle = Math.PI / 6; const v1 = normDir.rotate(Math.PI + angle).multiply(size); const v2 = normDir.rotate(Math.PI - angle).multiply(size); if (!_isValidVector(v1, v2)) return; ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(tip.x + v1.x, tip.y + v1.y); ctx.lineTo(tip.x + v2.x, tip.y + v2.y); ctx.closePath(); ctx.fill(); };
    const intersectLensLine = (rayOrigin, rayDir, lensCenter, lensPlaneDir, lensP1, lensP2) => { if (!_isValidVector(rayOrigin, rayDir, lensCenter, lensPlaneDir, lensP1, lensP2)) return null; const OC = rayOrigin.subtract(lensCenter); const cross_Dir_Plane = rayDir.cross(lensPlaneDir); if (Math.abs(cross_Dir_Plane) < 1e-9) return null; const s = -(OC.cross(lensPlaneDir)) / cross_Dir_Plane; if (s < 1e-6) return null; const hitPoint = rayOrigin.add(rayDir.multiply(s)); const lensDiameterSq = lensP1.distanceSquaredTo(lensP2); const proj = hitPoint.subtract(lensP1).dot(lensP2.subtract(lensP1)) / (lensDiameterSq > 1e-9 ? lensDiameterSq : 1); if (proj < -0.05 || proj > 1.05) return null; return hitPoint; };
    const extendRay = (startPoint, direction, factor = 2.0) => { // Increased factor slightly
        if (!_isValidVector(startPoint, direction) || direction.magnitudeSquared() < 1e-9) return startPoint;
        const length = Math.max(canvasWidth, canvasHeight) * factor; // Use canvas size for extension length
        const normDir = direction.normalize();
        return _isValidVector(normDir) ? startPoint.add(normDir.multiply(length)) : startPoint;
    };

    // --- Find Object and Lens ---
    let objectSource = components.find(comp => comp instanceof LaserSource || comp instanceof FanSource || comp instanceof LineSource || comp instanceof WhiteLightSource);
    let lens = components.find(comp => comp instanceof ThinLens);

    // --- Validation ---
    if (!objectSource || !lens || !(lens instanceof ThinLens) ||
        !_isValidVector(objectSource.pos, lens.pos, lens.axisDirection, lens.p1, lens.p2) ||
        !_isValidNumber(lens.focalLength, lens.diameter) || lens.diameter < 1e-6) {
        showModeHint('透镜成像需要：1个有效光源和1个有效薄透镜。'); return false;
    }
    const canvasWidth = ctx.canvas.width / dpr; const canvasHeight = ctx.canvas.height / dpr;
    const F = lens.focalLength; const isFlat = Math.abs(F) === Infinity; const LENS_CENTER = lens.pos;
    const LENS_AXIS = lens.axisDirection.clone(); const LENS_PLANE_DIR = lens.p1.subtract(lens.p2).normalize();
    const lensP1 = lens.p1; const lensP2 = lens.p2;

    // --- Object Calculation ---
    const OBJ_TIP = objectSource.pos.clone(); const vecCenterToObjTip = OBJ_TIP.subtract(LENS_CENTER);
    const u_dist_signed = vecCenterToObjTip.dot(LENS_AXIS); const OBJ_BASE = LENS_CENTER.add(LENS_AXIS.multiply(u_dist_signed));
    const objHeightVec = OBJ_TIP.subtract(OBJ_BASE); const ho_signed = objHeightVec.dot(LENS_PLANE_DIR);
    const MIN_DIAGRAM_HEIGHT = 5 / dpr; let ho_effective = ho_signed;
    if (Math.abs(ho_effective) < MIN_DIAGRAM_HEIGHT) { ho_effective = Math.sign(ho_effective) * MIN_DIAGRAM_HEIGHT || MIN_DIAGRAM_HEIGHT; }
    const OBJ_TIP_EFFECTIVE = OBJ_BASE.add(LENS_PLANE_DIR.multiply(ho_effective));
    if (!_isValidVector(OBJ_BASE, OBJ_TIP_EFFECTIVE)) { showModeHint('物体位置计算错误。'); return false; }

    // --- Image Calculation ---
    const u = -u_dist_signed; let v = Infinity; let M = 0; let hi_signed = 0;
    let IMG_TIP = null; let IMG_BASE = null; let isRealImage = false; let imageAtInfinity = false;
    // ... (Robust image calculation logic from V6/V7) ...
    if (isFlat) { v = -u; M = 1.0; }
    else if (Math.abs(u) < 1e-9) { v = 0; M = 1.0; } else if (Math.abs(F) < 1e-9) { v = -u; M = 1.0; }
    else if (Math.abs(u - F) < 1e-6) { v = Infinity; M = Infinity; imageAtInfinity = true; }
    else { const one_over_f = 1 / F; const one_over_u = 1 / u; if (!_isValidNumber(one_over_f, one_over_u)) { showModeHint('计算错误 (1/f or 1/u)。'); return false; } const one_over_v = one_over_f - one_over_u; if (!_isValidNumber(one_over_v)) { showModeHint('计算错误 (1/v)。'); return false; } if (Math.abs(one_over_v) < 1e-9) { v = Infinity; M = Infinity; imageAtInfinity = true; } else { v = 1 / one_over_v; if (!_isValidNumber(v)) { showModeHint('计算错误 (v)。'); return false; } M = -v / u; if (!_isValidNumber(M)) M = 0; } }
    if (!imageAtInfinity) { IMG_BASE = LENS_CENTER.add(LENS_AXIS.multiply(v)); hi_signed = M * ho_effective; if (!_isValidNumber(hi_signed)) hi_signed = 0; IMG_TIP = IMG_BASE.add(LENS_PLANE_DIR.multiply(hi_signed)); isRealImage = (u_dist_signed * v < -1e-9); if (!_isValidVector(IMG_BASE, IMG_TIP)) { showModeHint('像位置计算错误。'); IMG_BASE = null; IMG_TIP = null; } }

    // --- Calculate Focal Points ---
    let F_obj_world = null; let F_img_world = null;
    if (!isFlat) { F_obj_world = LENS_CENTER.add(LENS_AXIS.multiply(-F)); F_img_world = LENS_CENTER.add(LENS_AXIS.multiply(F)); if (!_isValidVector(F_obj_world, F_img_world)) { showModeHint('焦点计算错误。'); return false; } }

    // --- Start Drawing ---
    ctx.save();
    try {
        // --- Draw Static Elements ---
        const axisP1 = LENS_CENTER.add(LENS_AXIS.multiply(-canvasWidth * 1.5)); const axisP2 = LENS_CENTER.add(LENS_AXIS.multiply(canvasWidth * 1.5));
        _drawLine(axisP1, axisP2, AXIS_COLOR, LINE_WIDTH, DASH_PATTERN);
        _drawLensSchematic(lens, LENS_COLOR);
        _drawArrow(OBJ_BASE, OBJ_TIP_EFFECTIVE, OBJ_COLOR);
        _drawLabeledPoint(OBJ_TIP_EFFECTIVE, "A", OBJ_COLOR, new Vector(5, -5)); _drawLabeledPoint(OBJ_BASE, "B", OBJ_COLOR, new Vector(5, 5));
        if (F_obj_world && F_img_world) { _drawLabeledPoint(F_obj_world, "F", FOCI_COLOR, new Vector(-15 / dpr, 5 / dpr), 'right'); _drawLabeledPoint(F_img_world, "F'", FOCI_COLOR, new Vector(5 / dpr, 5 / dpr), 'left'); }
        if (IMG_TIP && IMG_BASE) { const imageColor = isRealImage ? IMG_REAL_COLOR : IMG_VIRTUAL_COLOR; const imageLabel = isRealImage ? "A' (实)" : "A' (虚)"; const dashes = isRealImage ? [] : DASH_PATTERN; _drawArrow(IMG_BASE, IMG_TIP, imageColor); _drawLabeledPoint(IMG_TIP, imageLabel, imageColor, new Vector(5, -5)); _drawLabeledPoint(IMG_BASE, "B'", imageColor, new Vector(5, 5)); }

        // --- Trace and Draw Principal Rays ---
        const rayWidth = RAY_WIDTH;

        // Function to draw a single principal ray with correct solid/dashed lines
        const drawPrincipalRay = (startPoint, dirIn, hitPoint, dirOut, endPoint, isVirtualIn, isVirtualOut, color) => {
            if (!hitPoint) return; // Cannot draw if ray misses lens

            // Draw Incoming Segment
            _drawLine(startPoint, hitPoint, color, rayWidth, isVirtualIn ? DASH_PATTERN : []);

            // Draw Outgoing Segment (Actual Path - Always Solid)
            const effectiveEndPoint = imageAtInfinity ? extendRay(hitPoint, dirOut) : endPoint;
            if (effectiveEndPoint) {
                _drawLine(hitPoint, effectiveEndPoint, color, rayWidth); // Actual path is solid
            }

            // Draw Backward Extension (Virtual Path - Always Dashed)
            if (isVirtualOut && effectiveEndPoint) { // Only draw if forms virtual image or diverges from virtual point
                // Extend backwards from hitPoint along the negative dirOut direction
                const virtualOrigin = extendRay(hitPoint, dirOut.multiply(-1));
                _drawLine(hitPoint, virtualOrigin, color, rayWidth, DASH_PATTERN);
            }
        };

        // Ray 1: Parallel -> F'
        const traceRay1 = () => {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = LENS_AXIS.clone();
            const hitPoint = intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lensP1, lensP2);
            if (!hitPoint || isFlat || !F_img_world) return; // Need hit and F' for curved lens

            let dirOut;
            if (F > 0) { dirOut = F_img_world.subtract(hitPoint).normalize(); } // Convex aims through F'
            else { dirOut = hitPoint.subtract(F_img_world).normalize(); }       // Concave seems to come from F'

            if (!_isValidVector(dirOut)) return;
            const endPoint = IMG_TIP; // Ray should pass through image tip
            const isVirtualOut = !isRealImage;

            drawPrincipalRay(startPoint, dirIn, hitPoint, dirOut, endPoint, false, isVirtualOut, RAY_PARALLEL_COLOR);
        };

        // Ray 2: Center -> Undeviated
        const traceRay2 = () => {
            const startPoint = OBJ_TIP_EFFECTIVE;
            const hitPoint = LENS_CENTER; // Approx center
            const dir = hitPoint.subtract(startPoint).normalize();
            if (!_isValidVector(dir)) return;

            const endPoint = IMG_TIP; // Ray should pass through image tip
            const isVirtualOut = !isRealImage;

            drawPrincipalRay(startPoint, dir, hitPoint, dir, endPoint, false, isVirtualOut, RAY_CENTER_COLOR);
        };

        // Ray 3: F -> Parallel
        const traceRay3 = () => {
            if (isFlat || !F_obj_world) return;
            const startPoint = OBJ_TIP_EFFECTIVE;
            const dirIn = F_obj_world.subtract(startPoint).normalize(); // Direction from object tip towards F
            if (!_isValidVector(dirIn) || dirIn.magnitudeSquared() < 1e-9) return; // Object is at F

            let isVirtualIn = (F < 0); // Aiming line is virtual for concave
            const hitPoint = intersectLensLine(startPoint, dirIn, LENS_CENTER, LENS_PLANE_DIR, lensP1, lensP2);

            // Only proceed if the ray (or its virtual aiming line) hits the lens
            if (hitPoint) {
                const dirOut = LENS_AXIS.clone(); // Parallel exit
                const endPoint = IMG_TIP; // Ray should pass through image tip
                const isVirtualOut = !isRealImage;
                drawPrincipalRay(startPoint, dirIn, hitPoint, dirOut, endPoint, isVirtualIn, isVirtualOut, RAY_FOCAL_COLOR);
            } else if (isVirtualIn) {
                // Draw only the virtual aiming line if it misses the lens segment
                const aimPoint = extendRay(startPoint, dirIn);
                _drawLine(startPoint, aimPoint, RAY_FOCAL_COLOR, rayWidth, DASH_PATTERN);
            }
        };

        // Execute ray tracing
        traceRay1();
        traceRay2();
        traceRay3();

        // --- Display Numerical Info ---
        // ... (Info display logic remains the same as V6/V7) ...
        const infoFont = `${13 / dpr}px sans-serif`; const lineHeight = 16 / dpr; const textX = 15 / dpr; let textY = 20 / dpr;
        ctx.fillStyle = INFO_COLOR; ctx.font = infoFont; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        const formatNum = (n, figs = 1) => (Math.abs(n) === Infinity) ? "∞" : (_isValidNumber(n) ? n.toFixed(figs) : "N/A");
        const textLines = [`f = ${formatNum(F)}`, `u = ${formatNum(u)}`, `v = ${formatNum(v)}`, `M = ${formatNum(M, 2)}`, `hₒ = ${formatNum(ho_signed)}`, `hᵢ = ${formatNum(hi_signed)}`];
        textLines.forEach(line => { ctx.fillText(line, textX, textY); textY += lineHeight; });
        let imagePropsText = "像: ";
        if (imageAtInfinity) { imagePropsText += "无穷远"; }
        else if (IMG_TIP && _isValidNumber(M)) { imagePropsText += isRealImage ? "实" : "虚"; imagePropsText += ", "; imagePropsText += (M * ho_signed >= -1e-9) ? "正" : "倒"; imagePropsText += ", "; const absM = Math.abs(M); imagePropsText += (absM > 1.0 + 1e-2) ? "放大" : ((absM < 1.0 - 1e-2) ? "缩小" : "等大"); }
        else { imagePropsText += "---"; }
        ctx.fillText(imagePropsText, textX, textY);

    } catch (error) {
        console.error("[Draw Diagram] Error during drawing:", error); showModeHint('绘制透镜成像图时出错!'); ctx.restore(); return false;
    } finally {
        ctx.restore();
    }
    return true; // Success
}
// --- END REPLACEMENT for the ENTIRE drawOpticalSystemDiagram function ---

// --- Ray Tracing Core ---
// --- PASTE this entire function into main.js, replacing the old traceAllRays ---
function traceAllRays(sceneComponents, canvasWidth, canvasHeight, initialActiveRays = []) {
    console.log("[traceAllRays] Starting trace (Debug TIR Version).");
    let completedPaths = []; // Stores Ray objects representing terminated paths
    let activeRays = []; // Queue for tracing

    // 1. Generate initial rays

    console.log("  --- Generating Initial Rays ---");
    sceneComponents.forEach(comp => {
        if (typeof comp.generateRays === 'function' && comp.enabled) {
            if (typeof Ray !== 'undefined') {
                try {
                    const generated = comp.generateRays(Ray);
                    if (Array.isArray(generated)) {
                        generated.forEach(r => {
                            if (r instanceof Ray) {
                                r.animateArrow = true; // Enable animation by default
                                if (r.shouldTerminate()) { // Check initial termination
                                    if (r.endReason === 'low_intensity') r.animateArrow = false;
                                    console.log(` -> Initial Ray ${r.sourceId}-0 terminated immediately: ${r.endReason}`);
                                    completedPaths.push(r);
                                } else {
                                    activeRays.push(r);
                                }
                            }
                        });
                    }
                } catch (e) { console.error(`Source ${comp.id} generateRays error:`, e); }
            } else { console.error("Ray class undefined during generation!"); }
        }
    });
    console.log(`  --- Initial Active Queue Size: ${activeRays.length} ---`);

    // After generating NEW initial rays from sources...
    if (initialActiveRays.length > 0) {
        console.log(`  --- Adding ${initialActiveRays.length} initial rays from previous frame ---`);
        activeRays.push(...initialActiveRays); // Add rays passed in (e.g., fiber outputs)
        console.log(`  --- Active Queue now size: ${activeRays.length} ---`);
    }

    let tracedCount = 0;
    const MAX_TOTAL_RAYS_TO_PROCESS = 100000; // Safety limit

    // 2. Main tracing loop
    while (activeRays.length > 0 && tracedCount < MAX_TOTAL_RAYS_TO_PROCESS) {
        tracedCount++;
        const currentRay = activeRays.shift();

        // --- LOG 1: Before pre-check ---
        if (currentRay.bouncesSoFar > 3) { // Log only for rays with multiple bounces
            console.log(`[TraceLoop PreCheck] Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar}: State: Term=${currentRay.terminated}, Reason=${currentRay.endReason}, I=${currentRay.intensity.toExponential(3)}, O=(${currentRay.origin?.x.toFixed(1)},${currentRay.origin?.y.toFixed(1)}), D=(${currentRay.direction?.x.toFixed(3)},${currentRay.direction?.y.toFixed(3)})`);
        }

        // --- Pre-computation Termination Check ---
        // Check bounce limit explicitly ONLY if window.ignoreMaxBounces is FALSE
        // const limitBounces = (typeof window.ignoreMaxBounces === 'boolean') ? !window.ignoreMaxBounces : true;
        // if (limitBounces && currentRay.bouncesSoFar >= MAX_RAY_BOUNCES) {
        //     console.log(`[TraceLoop PreCheck] Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} TERMINATING (max bounces ${MAX_RAY_BOUNCES})`);
        //     currentRay.terminate('max_bounces');
        // }
        // Explicitly check max bounces here, before calling shouldTerminate
        if (currentRay.bouncesSoFar >= MAX_RAY_BOUNCES) {
            console.log(`[TraceLoop PreCheck] Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} TERMINATING (max bounces ${MAX_RAY_BOUNCES})`);
            currentRay.terminate('max_bounces');
            // NOTE: shouldTerminate will also catch this, but checking here first is slightly cleaner
        }

        // Call shouldTerminate() AFTER the explicit bounce check (shouldTerminate also checks it + NaN etc)
        if (currentRay.shouldTerminate()) {
            const reason = currentRay.endReason || 'unknown_shouldTerminate';
            // Don't log termination again if reason was max_bounces, it was logged above
            if (reason !== 'max_bounces') {
                console.log(`[TraceLoop PreCheck] Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} TERMINATED (Pre-Check). Reason: ${reason}. Adding to completed.`);
            }
            if (!completedPaths.includes(currentRay)) {
                let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                if (historyValid) completedPaths.push(currentRay);
                else console.error(`[TraceLoop PreCheck] SKIPPED adding terminated ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} due to invalid history. Reason: ${reason}`);
            }
            continue; // Skip this ray
        }


        // --- Stuck Ray Check (COMMENTED OUT FOR NOW) ---
        /*
       if (currentRay.stuckCounter >= currentRay.STUCK_THRESHOLD) {
            console.warn(`[TraceLoop] Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} TERMINATING (Stuck Detection).`);
            currentRay.terminate('stuck_loop');
            // ... add to completedPaths ...
           continue;
        }
       */
        // --- START Fiber Input Coupling Check ---
        let fiberHit = null;
        let fiberComp = null;
        let fiberDist = Infinity;

        sceneComponents.forEach(comp => {
            if (comp instanceof OpticalFiber && typeof comp.checkInputCoupling === 'function') {
                try {
                    const couplingHit = comp.checkInputCoupling(currentRay.origin, currentRay.direction);
                    if (couplingHit && couplingHit.distance < fiberDist && couplingHit.distance > 1e-6) {
                        fiberHit = couplingHit;
                        fiberDist = couplingHit.distance;
                        fiberComp = comp;
                    }
                } catch (e) { console.error(`Fiber (${comp.id}) checkInputCoupling error:`, e); }
            }
        });
        // --- END Fiber Input Coupling Check ---

        // 3. Find closest intersection
        let closestHit = null;
        let closestDist = fiberDist; // Initialize with fiber distance (might be Infinity)
        let hitComponent = null;
        sceneComponents.forEach(comp => {
            // Optimization: Basic bounding box check first? Maybe later.
            if (comp.id === currentRay.sourceId && currentRay.bouncesSoFar === 0) return; // Don't hit source immediately
            if (typeof comp.intersect === 'function') {
                try {
                    const intersections = comp.intersect(currentRay.origin, currentRay.direction);
                    if (Array.isArray(intersections)) {
                        intersections.forEach(hit => {
                            if (hit && typeof hit.distance === 'number' && hit.distance > 1e-6 &&
                                hit.point instanceof Vector && hit.normal instanceof Vector &&
                                !isNaN(hit.point.x) && !isNaN(hit.normal.x)) { // Check for NaN
                                if (hit.distance < closestDist && hit.distance > 1e-6) { // Ensure component hit is closer AND valid {
                                    closestDist = hit.distance; closestHit = hit; hitComponent = comp;
                                }
                            } else if (hit && hit.distance <= 1e-6) {
                                // Hit very close, potential self-intersection or issue
                                // console.warn(`Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} near-zero distance hit on ${comp.label}. Dist: ${hit.distance}`);
                            }
                        });
                    }
                } catch (e) { console.error(`Intersect Err on component ${comp?.label} (${comp?.id}):`, e, currentRay); }
            }
        });


        // 4. Process the intersection (or lack thereof)
        // --- Process Fiber Hit OR Component Hit ---
        if (fiberComp && fiberHit && fiberDist <= closestDist) { // Fiber hit is closer or equal
            console.log(` -> Fiber Input Hit: Fiber ${fiberComp.id}, Dist ${fiberDist.toFixed(2)}, Bnc ${currentRay.bouncesSoFar}`); // DEBUG

            // Add history point *up to* the fiber input facet plane
            if (!(fiberHit.point instanceof Vector) || isNaN(fiberHit.point.x)) {
                console.error(`!!! Invalid fiber hit point from checkInputCoupling on ${fiberComp.label}. Terminating ray.`);
                currentRay.terminate('invalid_fiber_hit_point');
                if (!completedPaths.includes(currentRay)) completedPaths.push(currentRay);
                continue; // Skip to next ray
            }
            currentRay.addHistoryPoint(fiberHit.point); // Add the precise point on the input plane

            try {
                // Use the fiber's specific handler
                fiberComp.handleInputInteraction(currentRay, fiberHit, Ray);
                // handleInputInteraction should terminate the original ray
                if (!currentRay.terminated) {
                    console.warn(`!!! Fiber handleInputInteraction for ${fiberComp.id} did not terminate parent ray ${currentRay.sourceId}-${currentRay.bouncesSoFar}. Forcing.`);
                    currentRay.terminate('fiber_interact_no_terminate');
                }
                // Add the (now terminated) segment ending at the fiber input to completed paths
                if (!completedPaths.includes(currentRay)) {
                    let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    if (historyValid) {
                        completedPaths.push(currentRay);
                    } else {
                        console.error(` -----> SKIPPED adding terminated parent ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} hitting fiber due to invalid history.`);
                    }
                }

            } catch (e) {
                console.error(`Fiber (${fiberComp.id}) handleInputInteraction error:`, e, currentRay, fiberHit);
                currentRay.terminate('fiber_interaction_error');
                if (!completedPaths.includes(currentRay)) completedPaths.push(currentRay); // Add errored segment
                continue; // Skip to next ray
            }
            // NOTE: No successor rays are generated *immediately* from the input facet

        } else if (hitComponent && closestHit) {
            // --- LOG 3: After intersection found ---
            if (currentRay.bouncesSoFar > 3) console.log(` -> Hit found: Comp ${hitComponent.label} (${hitComponent.id}), Dist ${closestHit.distance.toFixed(2)}, Bnc ${currentRay.bouncesSoFar}`);

            // Add hit point to history *before* interaction
            // Check validity of the hit point before adding
            if (!(closestHit.point instanceof Vector) || isNaN(closestHit.point.x)) {
                console.error(`!!! Invalid hit point from intersect on ${hitComponent.label}. Terminating ray.`);
                currentRay.terminate('invalid_hit_point');
                if (!completedPaths.includes(currentRay)) completedPaths.push(currentRay);
                continue;
            }
            currentRay.addHistoryPoint(closestHit.point);

            let interactionResult = [];
            try {
                console.log(` ---> Calling interact() on ${hitComponent.label} for Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar}`);
                interactionResult = hitComponent.interact(currentRay, closestHit, Ray);
                if (!currentRay.terminated) {
                    console.warn(`!!! Interact for ${hitComponent.label} did not terminate parent ray ${currentRay.sourceId}-${currentRay.bouncesSoFar}. Forcing.`);
                    currentRay.terminate('segment_end_after_interaction');
                }
                console.log(` ---> Interact() finished for Bnc ${currentRay.bouncesSoFar}. Got ${Array.isArray(interactionResult) ? interactionResult.length : '?'} successors.`);

            } catch (e) {
                console.error(`Interact Err on component ${hitComponent?.label} (${hitComponent?.id}):`, e, currentRay, closestHit);
                currentRay.terminate('interaction_error');
                if (!completedPaths.includes(currentRay)) {
                    let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    if (historyValid) completedPaths.push(currentRay);
                }
                continue; // Skip to next ray on error
            }

            // Process successors
            if (Array.isArray(interactionResult)) {
                let successors = interactionResult.filter(r => r instanceof Ray);
                // Determine which successors should have their arrows animated
                if (successors.length > 0) {
                    const parentWasAnimated = currentRay.animateArrow; // Check parent animation state
                    successors.forEach(s => s.animateArrow = false); // Default successors to not animated

                    if (parentWasAnimated) { // Only pass animation if parent was animated
                        if (hitComponent instanceof DielectricBlock) {
                            let reflected = successors.find(r => r.mediumRefractiveIndex === currentRay.mediumRefractiveIndex);
                            let transmitted = successors.find(r => r.mediumRefractiveIndex !== currentRay.mediumRefractiveIndex);
                            const wasTIR = currentRay.endReason === 'tir';
                            if (wasTIR && reflected) { reflected.animateArrow = true; }
                            else if (transmitted && reflected) {
                                if (transmitted.intensity >= reflected.intensity * 0.8 && transmitted.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { transmitted.animateArrow = true; }
                                else if (reflected.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { reflected.animateArrow = true; }
                            } else if (transmitted && transmitted.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { transmitted.animateArrow = true; }
                            else if (reflected && reflected.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { reflected.animateArrow = true; }
                        } else if (hitComponent instanceof BeamSplitter) {
                            if (successors.length === 2) {
                                const int1 = successors[0].intensity; const int2 = successors[1].intensity;
                                const threshold = BS_SPLIT_ARROW_THRESHOLD * currentRay.intensity;
                                if (int1 >= threshold && int2 >= threshold) { successors[0].animateArrow = true; successors[1].animateArrow = true; }
                                else if (int1 >= int2 && int1 >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { successors[0].animateArrow = true; }
                                else if (int2 > int1 && int2 >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { successors[1].animateArrow = true; }
                            } else if (successors.length === 1 && successors[0].intensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) { successors[0].animateArrow = true; }
                        } else { // Default: Mirror, Lens, Polarizer, etc.
                            let strongestSuccessor = null; let maxIntensity = -1;
                            successors.forEach(s => { if (s.intensity > maxIntensity) { maxIntensity = s.intensity; strongestSuccessor = s; } });
                            if (strongestSuccessor && maxIntensity >= MIN_ARROW_INTENSITY_THRESHOLD * currentRay.intensity) {
                                strongestSuccessor.animateArrow = true;
                            }
                        }
                    } // End if(parentWasAnimated)
                }

                // --- Process and Add Successors ---
                successors.forEach(newRay => {
                    // --- LOG 6: Processing each successor ---
                    if (newRay.bouncesSoFar > 3) console.log(` ----> Processing Successor Bnc ${newRay.bouncesSoFar}: State: Term=${newRay.terminated}, Reason=${newRay.endReason}, I=${newRay.intensity.toExponential(3)}, Anim=${newRay.animateArrow}`);

                    // // Check 1: Max bounce limit (only if limits active)
                    // let hitBounceLimit = !window.ignoreMaxBounces && newRay.bouncesSoFar >= MAX_RAY_BOUNCES;
                    // if (hitBounceLimit) {
                    //     console.log(`[TraceLoop Successor] Ray ${newRay.sourceId}-${newRay.bouncesSoFar} HIT MAX BOUNCE LIMIT (${MAX_RAY_BOUNCES}). Terminating.`);
                    //     newRay.terminate('max_bounces');
                    //     // Add this final segment to completed paths
                    //     if (!completedPaths.includes(newRay)) {
                    //         let historyValid = newRay.history && newRay.history.length > 0 && newRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    //         if (historyValid) completedPaths.push(newRay); else console.error(`[TraceLoop Successor] SKIPPED adding max_bounce ray ${newRay.sourceId}-${newRay.bouncesSoFar} due to invalid history.`);
                    //     }
                    //     // Continue to the next successor, DO NOT add to active queue

                    // } else {
                    //     // Check 2: Other termination reasons (NaN, low intensity etc.)
                    //     if (newRay.shouldTerminate()) {
                    //         const reason = newRay.endReason || 'unknown_successor_terminate';
                    //         console.log(`[TraceLoop Successor] Ray ${newRay.sourceId}-${newRay.bouncesSoFar} terminated immediately (Other: ${reason}). Adding to completed.`);
                    //         if (reason === 'low_intensity') newRay.animateArrow = false;
                    //         // Add this immediately terminated successor to completed paths
                    //         if (!completedPaths.includes(newRay)) {
                    //             let historyValid = newRay.history && newRay.history.length > 0 && newRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    //             if (historyValid) completedPaths.push(newRay); else console.error(`[TraceLoop Successor] SKIPPED adding terminated ray ${newRay.sourceId}-${newRay.bouncesSoFar} due to invalid history. Reason: ${reason}`);
                    //         }
                    //         // Continue to the next successor, DO NOT add to active queue
                    //     } else {
                    //         // Check 3: Ray is valid, below limit, continue tracing
                    //         if (newRay.bouncesSoFar > 3) console.log(` ----> ADDING Successor Bnc ${newRay.bouncesSoFar} to active queue.`);
                    //         activeRays.push(newRay);
                    //     }
                    // Check termination reasons (NaN, low intensity, max bounces, etc.)
                    if (newRay.shouldTerminate()) {
                        const reason = newRay.endReason || 'unknown_successor_terminate';
                        // Log termination (avoid duplicate logging if max_bounces)
                        if (reason !== 'max_bounces') { // max_bounces termination is logged inside shouldTerminate now
                            console.log(`[TraceLoop Successor] Ray ${newRay.sourceId}-${newRay.bouncesSoFar} terminated immediately (${reason}). Adding to completed.`);
                        }
                        if (reason === 'low_intensity') newRay.animateArrow = false;

                        // Add this immediately terminated successor to completed paths
                        if (!completedPaths.includes(newRay)) {
                            let historyValid = newRay.history && newRay.history.length > 0 && newRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                            if (historyValid) completedPaths.push(newRay); else console.error(`[TraceLoop Successor] SKIPPED adding terminated ray ${newRay.sourceId}-${newRay.bouncesSoFar} due to invalid history. Reason: ${reason}`);
                        }
                        // Continue to the next successor, DO NOT add to active queue
                    } else {
                        // Ray is valid, continue tracing
                        if (newRay.bouncesSoFar > 3) console.log(` ----> ADDING Successor Bnc ${newRay.bouncesSoFar} to active queue.`);
                        activeRays.push(newRay);
                    }
                }); // End successors.forEach
                // --- 在这里插入下面的代码块 ---

                // *** 重要修复：将被吸收/终止的父光线段添加到完成列表 ***
                // 无论 interact 是否产生后继光线，都需要添加代表到达此交互点的光线段。
                if (currentRay.terminated && !completedPaths.includes(currentRay)) {
                    let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    if (historyValid) {
                        console.log(` -----> Adding terminated parent Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} (Reason: ${currentRay.endReason}) to completedPaths.`); // 添加日志
                        completedPaths.push(currentRay);
                    } else {
                        console.error(` -----> SKIPPED adding terminated parent ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} due to invalid history after interaction.`);
                    }
                } else if (!currentRay.terminated) {
                    // 这不应该发生，因为 interact 或其后的检查应该已经终止了父光线
                    console.warn(` -----> Parent ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} was NOT terminated after interaction with ${hitComponent.label}! Forcing termination and adding.`);
                    currentRay.terminate('missed_termination_after_interact');
                    if (!completedPaths.includes(currentRay)) { completedPaths.push(currentRay); }
                }
                // --- 插入代码块结束 ---
            } else { // Interaction result wasn't an array
                console.error(`Interaction result from ${hitComponent.label} was not an array! Terminating parent.`);
                if (!currentRay.terminated) currentRay.terminate('interaction_bad_result');
                // Add parent ray that caused error?
                if (!completedPaths.includes(currentRay)) {
                    let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                    if (historyValid) completedPaths.push(currentRay);
                }
            }

        } else { // No hit
            // --- LOG 8: No hit / OOB ---
            if (currentRay.bouncesSoFar > 3) console.log(` -> No Hit for Ray ${currentRay.sourceId}-${currentRay.bouncesSoFar}. Terminating OOB.`);
            // Terminate ray, add final segment to completedPaths
            const exitDistance = Math.max(canvasWidth, canvasHeight) * 2;
            if (currentRay.origin instanceof Vector && currentRay.direction instanceof Vector &&
                !isNaN(currentRay.origin.x) && !isNaN(currentRay.direction.x)) {
                try {
                    const exitPoint = currentRay.origin.add(currentRay.direction.multiply(exitDistance));
                    currentRay.addHistoryPoint(exitPoint);
                } catch (e) { console.error("Error calculating exit point for OOB ray:", e, currentRay); }
            }
            currentRay.terminate('out_of_bounds');
            if (!completedPaths.includes(currentRay)) {
                let historyValid = currentRay.history && currentRay.history.length > 0 && currentRay.history.every(p => p instanceof Vector && !isNaN(p.x));
                if (historyValid) completedPaths.push(currentRay);
                else console.error(`[TraceLoop] SKIPPED adding OOB ray ${currentRay.sourceId}-${currentRay.bouncesSoFar} due to invalid history.`);
            }
        }
    } // End while loop

    if (tracedCount >= MAX_TOTAL_RAYS_TO_PROCESS) {
        console.warn(`Ray tracing limit (${MAX_TOTAL_RAYS_TO_PROCESS}) reached.`);
    }
    console.log(`[traceAllRays] Trace complete. ${activeRays.length} rays left in queue (should be 0). ${completedPaths.length} total paths generated.`);
    // Add any remaining rays in active queue to completed (they might be stuck or error states)
    activeRays.forEach(ray => {
        if (!ray.terminated) ray.terminate('stuck_in_queue');
        if (!completedPaths.includes(ray)) completedPaths.push(ray);
    });
    // --- Generate Fiber Output Rays AFTER main tracing ---
    console.log("[traceAllRays] Generating fiber outputs...");
    let fiberOutputRays = []; // Store rays generated THIS frame
    sceneComponents.forEach(comp => {
        if (comp instanceof OpticalFiber && typeof comp.generateOutputRays === 'function') {
            try {
                const generated = comp.generateOutputRays(Ray); // Generate outputs
                if (Array.isArray(generated)) {
                    fiberOutputRays = fiberOutputRays.concat(generated);
                }
                // DO NOT reset fiber here, reset happens at the START of the next trace
            } catch (e) { console.error(`Fiber (${comp.id}) generateOutputRays error:`, e); }
        }
    });
    console.log(`  -> Generated ${fiberOutputRays.length} rays from fiber outputs this frame.`);
    // --- End Fiber Output Generation ---

    // Return BOTH completed paths from this frame AND newly generated rays
    return {
        completedPaths: completedPaths,
        generatedRays: fiberOutputRays // These will be activated next frame
    };
} // --- END OF traceAllRays function ---


// --- Canvas Resizing ---
function resizeCanvas() {
    if (!canvas || !simulationArea) return;
    const simRect = simulationArea.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas internal resolution based on display size and DPR
    canvas.width = Math.round(simRect.width * dpr);
    canvas.height = Math.round(simRect.height * dpr);

    // Set canvas display size (CSS pixels)
    canvas.style.width = `${simRect.width}px`;
    canvas.style.height = `${simRect.height}px`;

    // Scale the drawing context to match logical pixels
    if (ctx) {
        ctx.resetTransform(); // Reset any previous scaling/transforms
        ctx.scale(dpr, dpr);
    }

    console.log(`Canvas resized (logical): ${simRect.width.toFixed(0)} x ${simRect.height.toFixed(0)}, DPR: ${dpr}`);
    needsRetrace = true; // Resize requires retrace
}

// --- Modify updateInspector to activate properties tab ---
function updateInspector() {
    // Ensure inspector elements exist
    if (!inspectorContent || !deleteBtn) {
        console.error("updateInspector called but inspector elements missing!");
        return;
    }

    inspectorContent.innerHTML = ''; // Clear previous content

    if (selectedComponent) {
        deleteBtn.disabled = false; // Enable delete button
        console.log(`[updateInspector] Updating for: ${selectedComponent.label} (${selectedComponent.id})`);

        let props;
        try {
            props = selectedComponent.getProperties(); // Get properties from the component
            if (!props || typeof props !== 'object') {
                throw new Error("getProperties did not return a valid object.");
            }
            // console.log("[updateInspector] Properties received:", props); // DEBUG

            // --- Populate Properties Tab ---
            for (const propName in props) {
                if (Object.hasOwnProperty.call(props, propName)) {
                    const propData = props[propName];
                    if (!propData || typeof propData !== 'object' || !propData.hasOwnProperty('value')) {
                        console.warn(`[updateInspector] Skipping invalid property data for '${propName}'.`);
                        continue;
                    }

                    const { value, label, type = 'text', options, min, max, step, placeholder, readonly = false, title = '' } = propData; // Include title

                    const div = document.createElement('div');
                    div.className = 'prop';

                    const labelEl = document.createElement('label');
                    labelEl.textContent = label ? label + ':' : propName + ':';
                    const inputId = `prop-${propName}-${selectedComponent.id}-${Date.now()}`;
                    labelEl.htmlFor = inputId;
                    if (title) { labelEl.title = title; } // Set tooltip on label if provided
                    div.appendChild(labelEl);

                    let inputEl;
                    if (type === 'select' && Array.isArray(options)) {
                        inputEl = document.createElement('select');
                        options.forEach(opt => {
                            const optionEl = document.createElement('option');
                            optionEl.value = opt.value;
                            optionEl.textContent = opt.label;
                            if (String(opt.value) == String(value)) { optionEl.selected = true; } // Compare as strings for select
                            inputEl.appendChild(optionEl);
                        });
                        inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value);
                    } else if (type === 'checkbox') {
                        inputEl = document.createElement('input');
                        inputEl.type = 'checkbox';
                        inputEl.checked = !!value;
                        inputEl.onchange = (e) => handlePropertyChange(propName, e.target.checked);
                    } else {
                        inputEl = document.createElement('input');
                        inputEl.type = type;
                        inputEl.value = (value === null || value === undefined) ? '' : value;
                        if (placeholder !== undefined) inputEl.placeholder = placeholder;
                        if (min !== undefined) inputEl.min = min;
                        if (max !== undefined) inputEl.max = max;
                        if (step !== undefined) inputEl.step = step;

                        if (type === 'range' || type === 'number') {
                            inputEl.oninput = (e) => handlePropertyChange(propName, e.target.value);
                            inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value, true);
                        } else {
                            inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value, true);
                        }
                    }

                    const isDisabled = propData.disabled === true;
                    if (isDisabled) { inputEl.disabled = true; }
                    if (readonly) { inputEl.readOnly = true; }
                    // Apply disabled/readonly styles via CSS class or direct style if needed
                    if (isDisabled || readonly) {
                        inputEl.style.backgroundColor = '#e9ecef';
                        inputEl.style.cursor = 'not-allowed';
                    }

                    inputEl.id = inputId;
                    div.appendChild(inputEl);
                    inspectorContent.appendChild(div);
                }
            }
            // --- End Populate ---

        } catch (e) {
            console.error(` !!! Error calling getProperties or building inspector for ${selectedComponent.label}:`, e);
            inspectorContent.innerHTML = '<p class="placeholder-text error-text">加载属性时出错。</p>'; // Use CSS class for error text
            deleteBtn.disabled = true;
        }
        // --- Activate the properties tab ---
        activateTab('properties-tab');

    } else { // No component selected
        deleteBtn.disabled = true;
        // Clear the properties tab and show placeholder
        inspectorContent.innerHTML = '<p class="placeholder-text">请先选中一个元件...</p>';
        // Optionally switch to a different default tab when nothing is selected
        // activateTab('settings-tab'); // Example
    }
}



// Helper function to handle property changes from inspector inputs
function handlePropertyChange(propName, rawValue, forceUpdate = false) {
    if (!selectedComponent) return;
    const currentProps = selectedComponent.getProperties();
    const originalType = typeof currentProps[propName]?.value;

    let newValue = rawValue;
    // Attempt type conversion based on original type or input type hint
    if (originalType === 'number' || currentProps[propName]?.type === 'number' || currentProps[propName]?.type === 'range') {
        newValue = parseFloat(rawValue);
        // If parsing fails, only update on 'change' (forceUpdate=true) or revert
        if (isNaN(newValue)) {
            if (forceUpdate) { // Revert on final change if invalid
                // Find the input element and reset its value
                const inputEl = document.getElementById(`prop-${propName}-${selectedComponent.id}`);
                if (inputEl) inputEl.value = currentProps[propName].value;
                console.warn(`Invalid number input for ${propName}, reverting.`);
                return; // Don't call setProperty with NaN
            } else {
                return; // Don't update during 'input' if it's not a valid number yet
            }
        }
    } else if (originalType === 'boolean') { // Checkboxes already pass boolean
        newValue = !!rawValue;
    }
    // Text ('string') values are used directly

    try {
        selectedComponent.setProperty(propName, newValue);
        sceneModified = true;
        ;
        // Optionally, refresh just the single input value if setProperty modified it (e.g., clamping)
        // This prevents the whole inspector rebuilding on every input event
        if (!forceUpdate && document.activeElement?.id === `prop-${propName}-${selectedComponent.id}`) {
            // Maybe only update if value *actually* changed after setProperty?
            // const finalValue = selectedComponent.getProperties()[propName].value;
            // if (document.activeElement.value != finalValue) { // Loose comparison
            //     document.activeElement.value = finalValue;
            // }
        } else if (forceUpdate) {
            // On final 'change', force inspector update to show clamped/final value
            updateInspector();
        }

        // needsRetrace should be set within setProperty if needed
    } catch (e) {
        console.error(`Error setting property ${propName}:`, e);
        // Optionally revert UI on error
        if (forceUpdate) updateInspector();
    }
}




// --- Update User Interface (Top Right) ---
function updateUserUI() {
    const userStatusEl = document.getElementById('user-status-top');
    const userActionBtn = document.getElementById('user-action-btn-top');
    const logoutBtn = document.getElementById('logout-btn-top');
    const userScenesBtn = document.getElementById('user-scenes-btn-top'); // Get cloud scenes button too

    // Ensure elements exist before proceeding
    if (!userStatusEl || !userActionBtn || !logoutBtn || !userScenesBtn) {
        console.warn("One or more top user UI elements not found, cannot update.");
        return;
    }

    if (currentUser) { // User is logged in
        userStatusEl.textContent = `欢迎, ${currentUser.username}`;
        userActionBtn.textContent = '保存到云端'; // Placeholder for cloud save action
        userActionBtn.style.display = 'inline-block'; // Show cloud save button (or hide if not implemented)
        userScenesBtn.style.display = 'inline-block'; // Show "My Cloud Scenes" button
        logoutBtn.style.display = 'inline-block';     // Show Logout button
    } else { // User is not logged in
        userStatusEl.textContent = '未登录';
        userActionBtn.textContent = '登录 / 注册'; // Show Login/Register button
        userActionBtn.style.display = 'inline-block';
        userScenesBtn.style.display = 'none';     // Hide Cloud Scenes button
        logoutBtn.style.display = 'none';         // Hide Logout button
    }
}


// --- Placeholder Functions for Cloud/User Actions ---
function showUserScenes() { // Placeholder for showing cloud scenes
    alert("云端场景功能开发中...");
}

function saveSceneToCloud() { // Placeholder for saving to cloud
    alert("保存到云端功能开发中...");
    // On success, would likely set sceneModified = false;
}


function logoutUser() { // Handles logout
    console.log("Logging out user...");
    // TODO: Clear user session/token (both client-side and potentially call backend)
    currentUser = null; // Clear user state

    // Decide what to do with the current scene on logout
    if (sceneModified) {
        // Prompt to save locally before clearing?
        if (confirm("您有未保存的更改。登出前是否要将其另存为本地场景？")) {
            handleSaveAsClick(); // Trigger Save As dialog
            // Note: Logout will proceed even if save is cancelled here.
        }
    }
    sceneModified = false; // Discard any remaining unsaved changes

    // Clear the scene or reload page? Clearing is less disruptive.
    components = [];
    selectedComponent = null;
    updateInspector(); // Update inspector (will show placeholder)
    activateTab('properties-tab'); // Switch back to properties tab
    updateUserUI(); // Update top-right UI to logged-out state
    needsRetrace = true;
    alert("已登出。");
}
// --- End Placeholder Functions ---






// --- REPLACEMENT for getMousePos function ---
function getMousePos(canvasElement, event) {
    const rect = canvasElement.getBoundingClientRect();
    // 1. Mouse position relative to canvas top-left (CSS pixels)
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    // 2. Convert CSS pixels to logical coordinates considering pan and zoom
    // Formula: logicalX = (cssX - offsetX) / scale
    // Formula: logicalY = (cssY - offsetY) / scale
    const logicalX = (cssX - cameraOffset.x) / cameraScale;
    const logicalY = (cssY - cameraOffset.y) / cameraScale;

    return new Vector(logicalX, logicalY);
}
// --- END OF REPLACEMENT ---

function handleMouseDown(event) {

    // --- Add this block inside handleMouseDown, BEFORE processing left-click ---
    if (event.button === 1) { // Button 1 is usually the middle mouse button
        event.preventDefault(); // Prevent default middle-click actions (like auto-scroll)
        isPanning = true;
        lastPanMousePos = new Vector(event.clientX, event.clientY); // Use clientX/Y for panning delta
        canvas.style.cursor = 'grabbing'; // Change cursor to indicate panning
        return; // Stop processing other mousedown logic if panning starts
    }
    // --- End of middle-click panning start ---

    // The existing left-click logic (if event.button === 0) follows...


    if (event.button !== 0) return; // Only main button
    mouseIsDown = true;
    mousePos = getMousePos(canvas, event);
    isDragging = false;
    draggingComponent = null;
    dragStartMousePos = mousePos.clone(); // Store start position

    let clickedComponent = null;
    let clickedAngleHandle = false;

    // --- Determine what was clicked ---

    // 1. Check if the angle handle of the CURRENTLY selected component was clicked FIRST
    //    This ensures handles remain clickable even if overlapping other components.
    if (selectedComponent && selectedComponent.isPointOnAngleHandle(mousePos)) {
        clickedComponent = selectedComponent;
        clickedAngleHandle = true;
        console.log("Clicked angle handle of selected component:", selectedComponent.label);
    } else {
        // 2. If handle wasn't clicked, find ALL component bodies under the mouse cursor
        const componentsUnderMouse = [];
        for (let i = components.length - 1; i >= 0; i--) {
            const comp = components[i];
            try {
                // Use the body check directly, ignore angle handle here for finding overlaps
                if (comp._containsPointBody(mousePos)) {
                    componentsUnderMouse.push(comp);
                }
            } catch (e) { console.error(`Error in _containsPointBody for ${comp?.label}:`, e); }
        }
        // Debug log removed for brevity, uncomment if needed:
        // console.log(`Components under mouse: ${componentsUnderMouse.map(c => c.label).join(', ')}`);

        // 3. Prioritize which component was "really" clicked among overlaps
        if (componentsUnderMouse.length > 0) { // Check if any components were found
            if (componentsUnderMouse.length === 1) {
                // Only one component found, this is the one clicked
                clickedComponent = componentsUnderMouse[0];
            } else {
                // Multiple components overlap - Prioritization logic:
                // a) Prioritize non-DielectricBlock/non-Screen components ("smaller" items)
                //    Find the first non-block/screen item in the list (list is visually top->bottom)
                clickedComponent = componentsUnderMouse.find(comp =>
                    !(comp instanceof DielectricBlock) && !(comp instanceof Screen) // Add other large area components if needed
                );

                // b) If only Blocks/Screens overlap (or no "smaller" item found), pick the topmost one visually
                //    (which is the first one in componentsUnderMouse because the loop went backwards)
                if (!clickedComponent) {
                    clickedComponent = componentsUnderMouse[0];
                }
                // Debug log removed for brevity, uncomment if needed:
                // console.log("Clicked overlapping area, prioritized:", clickedComponent.label);
            }
        } // End of the if (componentsUnderMouse.length > 0) block for prioritization

        // 4. After determining the 'clickedComponent', check if its angle handle was clicked
        //    This handles the case where the prioritized component's handle overlaps its own body or another component.
        //    We only check if the component is *already* selected, as handles are usually only interactive then.
        if (clickedComponent && clickedComponent === selectedComponent && clickedComponent.isPointOnAngleHandle(mousePos)) {
            clickedAngleHandle = true;
            // Debug log removed for brevity, uncomment if needed:
            // console.log("Clicked angle handle of prioritized component:", clickedComponent.label);
        }

    } // End of finding clicked component logic (step 1 vs steps 2-4)

    // --- Process Click Result ---

    if (clickedComponent) { // A component body or handle was determined to be clicked
        // Select the clicked component if it's not already selected
        if (selectedComponent !== clickedComponent) {
            if (selectedComponent) selectedComponent.selected = false; // Deselect previous
            selectedComponent = clickedComponent;
            selectedComponent.selected = true;
            updateInspector(); // Update inspector for the newly selected component
            // if (onlyShowSelectedSourceArrow) arrowAnimationStates.clear(); // Clear arrows if filter active and deselecting
            // if (onlyShowSelectedSourceArrow) resetAllArrowDistances();
            // Debug log removed for brevity, uncomment if needed:
            // console.log("Selected component:", selectedComponent.label);
        }

        // Start dragging (either angle or position)
        draggingComponent = selectedComponent; // Drag the one that is now selected
        draggingComponent.startDrag(mousePos); // startDrag method checks internally if it's angle or body drag based on mousePos
        isDragging = true;
        canvas.style.cursor = 'grabbing';

        // Prevent adding new component if dragging existing one
        componentToAdd = null;
        clearToolbarSelection();

    } else { // Clicked empty space (no component body or selected handle was clicked)

        // 1. Deselect current component if one was selected
        // Inside handleMouseDown -> else (Clicked empty space)
        if (selectedComponent) {
            console.log("Clicked empty space, deselecting:", selectedComponent.label);
            // Ensure any specific handle state is cleared on deselect
            if (selectedComponent instanceof OpticalFiber) { // Check if it's a fiber
                selectedComponent.selectedHandle = null;
                selectedComponent.endDrag(); // Call endDrag too for safety
            }
            selectedComponent.selected = false;
            selectedComponent = null;
            updateInspector();
        }

        // 2. If a tool is active from the toolbar, place the new component
        if (componentToAdd) {
            // Debug log removed for brevity, uncomment if needed:
            // console.log(`Adding ${componentToAdd} at`, mousePos.x.toFixed(1), mousePos.y.toFixed(1));
            let newComp = null;
            try {
                const compPos = mousePos.clone();
                // Use switch statement to create the component instance
                switch (componentToAdd) {
                    case 'LaserSource': newComp = new LaserSource(compPos); break;
                    case 'FanSource': newComp = new FanSource(compPos); break;
                    case 'LineSource': newComp = new LineSource(compPos); break;
                    case 'Mirror': newComp = new Mirror(compPos); break;
                    case 'SphericalMirror': newComp = new SphericalMirror(compPos); break;
                    case 'ParabolicMirror': newComp = new ParabolicMirror(compPos); break;
                    case 'Screen': newComp = new Screen(compPos); break;
                    case 'ThinLens':
                        newComp = new ThinLens(compPos); // Uses constructor defaults
                        break;
                    case 'Aperture': newComp = new Aperture(compPos); break;
                    case 'Polarizer': newComp = new Polarizer(compPos); break;
                    case 'BeamSplitter': newComp = new BeamSplitter(compPos); break;
                    case 'DielectricBlock': newComp = new DielectricBlock(compPos); break;
                    case 'Photodiode': newComp = new Photodiode(compPos); break;
                    case 'OpticalFiber':
                        newComp = new OpticalFiber(compPos); // pos is input, output calculated internally
                        break;
                    case 'Prism':
                        newComp = new Prism(compPos); // Create a default Prism
                        break;
                    case 'WhiteLightSource':
                        newComp = new WhiteLightSource(compPos);
                        break;
                    case 'DiffractionGrating':
                        newComp = new DiffractionGrating(compPos);
                        break;
                    case 'HalfWavePlate':
                        newComp = new HalfWavePlate(compPos);
                        break;
                    case 'QuarterWavePlate':
                        newComp = new QuarterWavePlate(compPos);
                        break;
                    case 'AcoustoOpticModulator':
                        newComp = new AcoustoOpticModulator(compPos);
                        break;
                    case 'ConcaveMirror':
                        // Create a SphericalMirror with a default positive radius (concave)
                        newComp = new SphericalMirror(compPos, 200, 90, 0); // Default R=200, 90deg arc, facing right
                        break;
                    case 'ConvexMirror':
                        // Create a SphericalMirror with a default negative radius (convex)
                        newComp = new SphericalMirror(compPos, -200, 90, 0); // Default R=-200, 90deg arc, facing right
                        break;
                    case 'ParabolicMirrorToolbar': // Use the button's data-type here
                        // Create a ParabolicMirror
                        newComp = new ParabolicMirror(compPos, 100, 100, 0); // Default f=100, diameter=100, facing right
                        break;
                    default: console.warn("Unknown component type to add:", componentToAdd);
                }
            } catch (e) { console.error(`Error creating new component ${componentToAdd}:`, e); }

            if (newComp) {
                components.push(newComp);
                selectedComponent = newComp; // Select the newly added component
                selectedComponent.selected = true;
                updateInspector();
                needsRetrace = true; // Need to retrace after adding
                sceneModified = true;
                ;
                // Debug log removed for brevity, uncomment if needed:
                // console.log("Added and selected:", newComp.label);
            }
            // Deactivate tool after placement attempt
            componentToAdd = null;
            clearToolbarSelection();
        }
    } // End processing click result (component clicked vs empty space)



} // End handleMouseDown function

// --- REPLACEMENT for handleMouseMove (with Cursor Update Logic) ---
function handleMouseMove(event) {
    const currentMousePos = getMousePos(canvas, event);
    mousePos = currentMousePos; // Update global mouse position

    // --- Panning Cursor ---
    if (isPanning) {
        // Grabbing cursor is already set in handleMouseDown for panning
        // Process panning movement
        if (lastPanMousePos) {
            const currentPanClientPos = new Vector(event.clientX, event.clientY);
            const delta = currentPanClientPos.subtract(lastPanMousePos);
            cameraOffset = cameraOffset.add(delta);
            lastPanMousePos = currentPanClientPos;
            needsRetrace = true;
        }
        // Make sure other cursor logic doesn't override grabbing during pan
        if (canvas.style.cursor !== 'grabbing') {
            canvas.style.cursor = 'grabbing';
        }
        return; // Stop further processing during pan
    }

    // --- Component Dragging Cursor & Logic ---
    if (isDragging && draggingComponent) {
        canvas.style.cursor = 'grabbing'; // Use grabbing cursor while dragging
        try {
            draggingComponent.drag(currentMousePos);
            sceneModified = true;
            ;
        } catch (e) {
            console.error(`Error during drag for ${draggingComponent?.label}:`, e);
            isDragging = false; draggingComponent.endDrag(); draggingComponent = null;
            canvas.style.cursor = 'default'; // Revert cursor on error
        }
        return; // Stop further cursor checks if dragging
    }

    // --- Hover Cursor Logic (only if not panning or dragging) ---
    let newCursor = 'default'; // Start with default cursor

    if (componentToAdd) {
        // If a tool is selected for placement
        newCursor = 'pointer';
    } else {
        // Check hover state on components
        let hoveredComponent = null;
        let hoveredAngleHandle = false;

        // Check angle handle of the *selected* component first
        if (selectedComponent && selectedComponent.isPointOnAngleHandle(currentMousePos)) {
            hoveredComponent = selectedComponent;
            hoveredAngleHandle = true;
            newCursor = 'pointer'; // Or 'rotate' if you defined a custom one
        } else {
            // Check component bodies (iterate top-down visually)
            for (let i = components.length - 1; i >= 0; i--) {
                const comp = components[i];
                try {
                    // Check body first
                    if (comp._containsPointBody(currentMousePos)) {
                        hoveredComponent = comp;
                        // If it's the selected component, check its angle handle again (safety)
                        if (comp === selectedComponent && comp.isPointOnAngleHandle(currentMousePos)) {
                            hoveredAngleHandle = true;
                        }
                        break; // Found the topmost component under the mouse
                    }
                    // Check other interactive parts (like fiber output handle)
                    if (comp instanceof OpticalFiber && comp.selected) {
                        if (comp._isPointOnOutputAngleHandle(currentMousePos)) {
                            hoveredComponent = comp;
                            hoveredAngleHandle = true; // Treat it like an angle handle
                            break;
                        }
                        const handleRadius = 8; // Match radius used in containsPoint/startDrag
                        if (comp.outputPos && currentMousePos.distanceSquaredTo(comp.outputPos) <= handleRadius * handleRadius) {
                            hoveredComponent = comp; // Hovering over fiber output point
                            hoveredAngleHandle = false; // It's a position handle
                            break;
                        }
                    }

                } catch (e) { console.error(`Error checking hover for ${comp?.label}:`, e); }
            }
        }

        // Determine cursor based on hover state
        if (hoveredComponent) {
            if (hoveredAngleHandle) {
                newCursor = 'pointer'; // Or 'rotate'
            } else {
                newCursor = 'move'; // Or 'grab'
            }
        } else {
            newCursor = 'default'; // Hovering over empty space
        }
    }

    // Apply the new cursor if it changed
    if (canvas.style.cursor !== newCursor) {
        canvas.style.cursor = newCursor;
    }

    // Placement preview update is handled in draw() based on mousePos
}
// --- END OF REPLACEMENT ---

function handleMouseUp(event) {

    // --- Add this block inside handleMouseUp, BEFORE processing left-click release ---
    if (event.button === 1 && isPanning) { // Middle button release while panning
        isPanning = false;
        lastPanMousePos = null;
        canvas.style.cursor = 'default'; // Restore default cursor
        console.log("Panning finished. Final Offset:", cameraOffset); // Debug log
        return; // Stop processing other mouseup logic
    }
    // --- End of middle-click panning stop ---

    // The existing left-click release logic follows...

    if (event.button !== 0) return;
    mouseIsDown = false;

    if (isDragging && draggingComponent) {
        try { draggingComponent.endDrag(); } catch (e) { console.error("Error in endDrag:", e); }
        // Don't reset draggingComponent here, keep it selected
    }
    isDragging = false;
    canvas.style.cursor = 'default';
}

// --- REPLACEMENT for handleMouseLeave function ---
function handleMouseLeave(event) {
    // If mouse leaves canvas WHILE dragging a component
    if (isDragging && draggingComponent) {
        canvas.style.cursor = 'default';
        console.log("Mouse left canvas during component drag, calling endDrag for:", draggingComponent.label);
        try {
            draggingComponent.endDrag();
        } catch (e) { console.error("Error in endDrag on mouse leave (component drag):", e); }
    }
    // If mouse leaves canvas WHILE panning
    if (isPanning) {
        console.log("Mouse left canvas during pan, stopping pan.");
        isPanning = false;
        lastPanMousePos = null;
        canvas.style.cursor = 'default';
    }
    // Reset general flags
    isDragging = false;
    mouseIsDown = false; // Reset mouse down state when leaving
    // componentToAdd = null; // Optionally reset tool selection
    // clearToolbarSelection();
    if (!isDragging && !isPanning) {
        canvas.style.cursor = 'default';
    }
}
// --- END OF REPLACEMENT ---
// --- End Corrected handleMouseLeave ---

// --- New function for Handling Mouse Wheel Zoom ---
function handleWheelZoom(event) {
    event.preventDefault(); // Prevent default page scrolling
    // --- Check if rotating selected component instead of zooming ---
    if (selectedComponent && mouseIsDown === false) { // Only rotate if mouse button is NOT down and a component is selected

        // Optional: Check if mouse is roughly over the selected component's bounding box
        // This prevents accidental rotation when scrolling over empty space while component is selected far away.
        const bounds = selectedComponent.getBoundingBox();
        const currentMousePos = getMousePos(canvas, event); // Get logical mouse pos
        let mouseOverComponent = false;
        if (bounds && currentMousePos) {
            mouseOverComponent = currentMousePos.x >= bounds.x && currentMousePos.x <= bounds.x + bounds.width &&
                currentMousePos.y >= bounds.y && currentMousePos.y <= bounds.y + bounds.height;
        }
        // --- End Optional Check ---

        // --- CONDITION TO ROTATE: selectedComponent exists AND (mouse is over it OR always rotate if selected) ---
        if (selectedComponent && mouseOverComponent) {// Now checks for both selection AND mouse hover

            const scrollDirection = event.deltaY < 0 ? 1 : -1; // +1 for scroll up/forward, -1 for scroll down/backward

            // Determine rotation step size
            const baseRotateStepDeg = 2.0; // Rotate 2 degrees per scroll step normally
            const fineRotateStepDeg = 0.5; // Rotate 0.5 degrees if Shift is pressed
            const angleDeltaDeg = event.shiftKey ? (fineRotateStepDeg * scrollDirection) : (baseRotateStepDeg * scrollDirection);

            // Get current angle and apply delta
            const currentAngleDeg = selectedComponent.angleRad * (180 / Math.PI);
            const newAngleDeg = currentAngleDeg + angleDeltaDeg;

            // Use setProperty to apply the change (handles updates and retrace)
            // Make sure handlePropertyChange exists and works correctly
            try {
                selectedComponent.setProperty('angleDeg', newAngleDeg);
                // Optionally, update inspector immediately if needed, though setProperty might trigger retrace anyway
                // updateInspector();
            } catch (e) {
                console.error("Error setting angle via scroll:", e);
            }

            return; // IMPORTANT: Stop further execution (don't zoom the canvas)
        }
    }

    const zoomIntensity = 0.1; // How much to zoom per scroll step
    const minScale = 0.1;     // Minimum zoom level
    const maxScale = 10.0;    // Maximum zoom level

    const mousePosBeforeZoom = getMousePos(canvas, event); // Logical coords before zoom

    // Determine zoom direction (positive deltaY means scrolling down/out)
    const scroll = event.deltaY < 0 ? 1 : -1; // +1 for zoom in, -1 for zoom out
    const zoomFactor = Math.exp(scroll * zoomIntensity);

    // Calculate new scale, clamped between min/max
    const newScale = Math.max(minScale, Math.min(maxScale, cameraScale * zoomFactor));

    // Calculate the change in scale
    const scaleChange = newScale / cameraScale;

    // Update the camera scale
    cameraScale = newScale;

    // Adjust camera offset to keep the mouse position fixed relative to the logical content
    // Formula: newOffsetX = mouseCssX - (mouseLogicalX * newScale)
    // Formula: newOffsetY = mouseCssY - (mouseLogicalY * newScale)
    const rect = canvas.getBoundingClientRect();
    const mouseCssX = event.clientX - rect.left;
    const mouseCssY = event.clientY - rect.top;

    cameraOffset.x = mouseCssX - mousePosBeforeZoom.x * cameraScale;
    cameraOffset.y = mouseCssY - mousePosBeforeZoom.y * cameraScale;


    needsRetrace = true; // Zooming might affect ray paths if components move relative to view center? Better safe.
    // No need to call draw() here, the game loop will handle it.
}
// --- End of handleWheelZoom function ---


function handleKeyDown(event) {
    // Ignore keydowns if typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return;
    }

    // Delete selected component
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedComponent) {
        event.preventDefault(); // Prevent browser back navigation on Backspace
        deleteComponent(selectedComponent);
        sceneModified = true;
        ;
    }

    // Rotate selected component (R key, Shift+R for reverse)
    if (event.key.toLowerCase() === 'r' && selectedComponent) {
        event.preventDefault();
        const angleDeltaDeg = event.shiftKey ? -5 : 5; // 5 degrees step
        const currentAngleDeg = selectedComponent.angleRad * (180 / Math.PI);
        // Use handlePropertyChange to ensure UI updates correctly if needed
        handlePropertyChange('angleDeg', currentAngleDeg + angleDeltaDeg, true); // Force update
        sceneModified = true;
        ;
    }

    // Toggle enabled state for sources (Space key)
    if (event.code === 'Space' && selectedComponent && selectedComponent.hasOwnProperty('enabled')) {
        event.preventDefault();
        // if (onlyShowSelectedSourceArrow) arrowAnimationStates.clear(); // Clear arrows if filter active before delete
        handlePropertyChange('enabled', !selectedComponent.enabled, true);
        sceneModified = true;
        ;
    }

    // Deselect component (Escape key)
    if (event.key === 'Escape') {
        if (selectedComponent) {
            selectedComponent.selected = false;
            selectedComponent = null;
            updateInspector();
            // if (onlyShowSelectedSourceArrow) arrowAnimationStates.clear(); // Clear arrows if filter active on escape deselect
            // if (onlyShowSelectedSourceArrow) resetAllArrowDistances();
        }
        if (componentToAdd) {
            componentToAdd = null;
            clearToolbarSelection();
            canvas.style.cursor = 'default';
        }
    }
}

function deleteComponent(componentToDelete) {
    if (!componentToDelete) return;
    console.log("Attempting to delete:", componentToDelete.label, componentToDelete.id);
    const index = components.indexOf(componentToDelete);
    if (index > -1) {
        components.splice(index, 1);
        sceneModified = true;
        ;
        if (selectedComponent === componentToDelete) {
            selectedComponent = null;
            updateInspector();
            // if (onlyShowSelectedSourceArrow) arrowAnimationStates.clear(); // Clear arrows if filter active after delete
        }
        needsRetrace = true;
        console.log("Component deleted.");
    } else {
        console.warn("Component to delete not found in array.");
        if (selectedComponent === componentToDelete) { // Still clear selection if it was selected
            selectedComponent = null; updateInspector();
        }
    }
}

function clearToolbarSelection() {
    const buttons = toolbar?.querySelectorAll('button[data-type]');
    buttons?.forEach(btn => btn.classList.remove('selected-tool'));
}





// --- NEW FUNCTION: Load Preset Scene ---
async function loadPresetScene(presetPath) { // Make function async for fetch
    if (!presetPath) return; // Do nothing if default option selected

    console.log(`Attempting to load preset scene: ${presetPath}`);

    // --- Check for unsaved changes ---
    if (sceneModified) {
        if (!confirm("当前场景已被修改。加载预设将【覆盖】当前更改。是否继续？")) {
            console.log("Preset load cancelled by user due to unsaved changes.");
            // Reset the dropdown selection back to default
            const presetSelect = document.getElementById('preset-select');
            if (presetSelect) presetSelect.value = "";
            return; // Stop loading
        }
        console.log("User chose to discard changes and load preset.");
        sceneModified = false; // Discard changes as we are loading over them
    }

    // --- Fetch the preset JSON file ---
    try {
        const response = await fetch(presetPath); // Use fetch API to get the local file
        if (!response.ok) { // Check if fetch was successful (status 200-299)
            throw new Error(`HTTP error! status: ${response.status} loading ${presetPath}`);
        }
        const sceneData = await response.json(); // Parse the JSON response

        console.log("Parsed preset scene data:", sceneData);

        // --- Basic Validation (similar to importScene) ---
        if (!sceneData || !Array.isArray(sceneData.components)) {
            throw new Error("Invalid preset file format: 'components' array not found.");
        }
        // Version check is good practice here too
        if (sceneData.version !== "1.0") {
            console.warn(`Loading preset version ${sceneData.version}, expected 1.0.`);
        }

        // --- Load Scene Logic (Adapted from importScene) ---
        // 1. Clear existing components
        components = [];
        selectedComponent = null;
        draggingComponent = null;
        updateInspector();

        // 2. Recreate components from data
        sceneData.components.forEach((compData, index) => {
            let newComp = null;
            const compType = compData.type;
            const pos = new Vector(compData.posX ?? 100 + index * 10, compData.posY ?? 100 + index * 10);
            const angleDeg = compData.angleDeg ?? 0;

            // --- Component Creation Switch Statement (Keep synced with importScene!) ---
            switch (compType) {
                case 'LaserSource': newComp = new LaserSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.numRays, compData.spreadDeg, compData.enabled, compData.polarizationAngleDeg, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist); if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled); break;
                case 'FanSource': newComp = new FanSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.fanAngleDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter); break;
                case 'LineSource': newComp = new LineSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.length, compData.enabled, compData.ignoreDecay, compData.beamDiameter); break;
                case 'Mirror': newComp = new Mirror(pos, compData.length, angleDeg); break;
                case 'SphericalMirror': newComp = new SphericalMirror(pos, compData.radiusOfCurvature, compData.centralAngleDeg, angleDeg); break;
                case 'ParabolicMirror': newComp = new ParabolicMirror(pos, compData.focalLength, compData.diameter, angleDeg); break;
                case 'Screen': newComp = new Screen(pos, compData.length, angleDeg, compData.numBins); if (compData.hasOwnProperty('showPattern')) newComp.showPattern = compData.showPattern; break;
                case 'ThinLens': newComp = new ThinLens(pos, compData.diameter, compData.focalLength, angleDeg); if (compData.hasOwnProperty('baseRefractiveIndex')) newComp.setProperty('baseRefractiveIndex', compData.baseRefractiveIndex); if (compData.hasOwnProperty('dispersionCoeffB')) newComp.setProperty('dispersionCoeffB', compData.dispersionCoeffB); if (compData.hasOwnProperty('quality')) newComp.setProperty('quality', compData.quality); if (compData.hasOwnProperty('coated')) newComp.setProperty('coated', compData.coated); if (compData.hasOwnProperty('isThickLens')) newComp.setProperty('isThickLens', compData.isThickLens); if (compData.hasOwnProperty('chromaticAberration')) newComp.setProperty('chromaticAberration', compData.chromaticAberration); if (compData.hasOwnProperty('sphericalAberration')) newComp.setProperty('sphericalAberration', compData.sphericalAberration); break;
                case 'Aperture': newComp = new Aperture(pos, compData.length, compData.numberOfSlits, compData.slitWidth, compData.slitSeparation, angleDeg); break;
                case 'Polarizer': newComp = new Polarizer(pos, compData.length, compData.transmissionAxisAngleDeg, angleDeg); break;
                case 'BeamSplitter': newComp = new BeamSplitter(pos, compData.length, angleDeg, compData.type, compData.splitRatio, compData.pbsUnpolarizedReflectivity); break;
                case 'DielectricBlock': newComp = new DielectricBlock(pos, compData.width, compData.height, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB_nm2, compData.absorptionCoeff, compData.showEvanescentWave); break;
                case 'Photodiode': newComp = new Photodiode(pos, angleDeg, compData.diameter); break;
                case 'OpticalFiber': const outputPos = new Vector(compData.outputX ?? pos.x + 100, compData.outputY ?? pos.y); newComp = new OpticalFiber(pos, outputPos, angleDeg, compData.outputAngleDeg, compData.numericalAperture, compData.coreDiameter, compData.fiberIntrinsicEfficiency, compData.transmissionLossDbPerKm, compData.facetLength); break;
                case 'Prism': newComp = new Prism(pos, compData.baseLength, compData.apexAngleDeg, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB); break;
                case 'WhiteLightSource': newComp = new WhiteLightSource(pos, angleDeg, compData.baseIntensity, compData.rayCount, compData.spreadDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter); if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled); break; // Restore Gaussian state
                case 'DiffractionGrating': newComp = new DiffractionGrating(pos, compData.length, compData.gratingPeriodInMicrons, angleDeg, compData.maxOrder); break;
                case 'HalfWavePlate': newComp = new HalfWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg); break;
                case 'QuarterWavePlate': newComp = new QuarterWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg); break;
                case 'AcoustoOpticModulator': newComp = new AcoustoOpticModulator(pos, compData.width, compData.height, angleDeg, compData.rfFrequencyMHz, compData.rfPower); break;
                default: console.warn(`Unknown component type during preset load: ${compType}`);
            }
            // --- End Component Creation Switch ---

            if (newComp) {
                if (compData.label) newComp.label = compData.label;
                if (compData.id) newComp.id = compData.id;
                components.push(newComp);
            }
        });

        // 3. Trigger retrace and save this loaded state
        needsRetrace = true;
        sceneModified = false; // Loaded preset is considered "unmodified" initially
        saveSceneToLocalStorage(); // Auto-save the loaded preset immediately
        console.log("Preset scene loaded and saved to localStorage.");

        // Reset the dropdown back to the default "--选择示例--" option
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) presetSelect.value = "";


    } catch (error) {
        console.error("Error loading or processing preset scene:", error);
        alert(`加载预设场景 '${presetPath}' 失败: ${error.message}`);
        components = []; // Clear components on error
        needsRetrace = true;
        sceneModified = false; // Reset flag on error
        // Reset the dropdown
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) presetSelect.value = "";
    }
}
// --- END OF loadPresetScene function ---


// --- REPLACEMENT for Modal Control Functions ---

// Helper function to show specific content within the modal
function showModalContent(contentIdToShow) {
    const modal = document.getElementById('settings-modal');
    const authContainer = document.getElementById('auth-form-container');
    const settingsContainer = document.getElementById('settings-content-container');

    if (!modal || !authContainer || !settingsContainer) return;

    // Hide all content containers first
    authContainer.style.display = 'none';
    settingsContainer.style.display = 'none';

    // Show the requested container
    const containerToShow = document.getElementById(contentIdToShow);
    if (containerToShow) {
        containerToShow.style.display = 'block';

        // Make the modal overlay visible
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('visible');
        }, 10);
    } else {
        console.error("Modal content container not found:", contentIdToShow);
    }
}

function openSettingsModal() { // Name kept for potential legacy calls, now activates tab
    console.log("Activating Settings Tab.");
    activateTab('settings-tab'); // activateTab handles loading controls via loadSettingsIntoControls
}

// Function called when clicking the Login/Register button (when logged out)
// --- Auth Modal Control ---
function showLoginRegisterModal() {
    const modal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const authTitle = document.getElementById('auth-title');

    if (!modal || !loginForm || !registerForm || !loginError || !registerError || !authTitle) {
        console.error("Auth modal elements not found! Cannot show."); return;
    }
    loginForm.reset();
    registerForm.reset();
    loginError.style.display = 'none'; loginError.textContent = ''; // Clear text too
    registerError.style.display = 'none'; registerError.textContent = ''; // Clear text too
    loginForm.style.display = 'block';   // Show login form
    registerForm.style.display = 'none'; // Hide register form
    authTitle.textContent = '登录';

    modal.style.display = 'flex';
    setTimeout(() => { modal.classList.add('visible'); }, 10);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => { modal.style.display = 'none'; }, 300); // Match CSS transition
    }
}

// Close modal function remains the same
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}
// --- END OF REPLACEMENT ---



function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('visible');
        // Wait for fade-out transition to finish before setting display to none
        // Match transition duration (0.3s = 300ms)
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}
// --- END Settings Modal Functions ---


// --- NEW FUNCTIONS for Saving/Loading Settings ---
function saveSettings() {
    const settings = {
        showGrid: showGrid,
        maxRaysPerSource: window.maxRaysPerSource,     // <<<--- 确认这里是 window.maxRaysPerSource
        globalMaxBounces: window.globalMaxBounces,
        globalMinIntensity: window.globalMinIntensity,
        fastWhiteLightMode: fastWhiteLightMode
        // Add other settings here later
    };
    try {
        localStorage.setItem(LOCALSTORAGE_SETTINGS_KEY, JSON.stringify(settings));
        console.log("Settings saved to localStorage:", settings);
    } catch (e) {
        console.error("Error saving settings to localStorage:", e);
    }
}

// --- REPLACEMENT for loadSettings function ---
function loadSettings() {
    console.log("Loading settings from localStorage...");
    const savedSettingsJson = localStorage.getItem(LOCALSTORAGE_SETTINGS_KEY);
    // --- Set Defaults First ---
    showGrid = true;
    window.maxRaysPerSource = 1001;
    window.globalMaxBounces = MAX_RAY_BOUNCES;
    window.globalMinIntensity = MIN_RAY_INTENSITY;
    // fastWhiteLightMode = false; // <<<--- Set default here

    if (savedSettingsJson) {
        try {
            const savedSettings = JSON.parse(savedSettingsJson);
            if (savedSettings) {
                showGrid = savedSettings.showGrid !== undefined ? savedSettings.showGrid : showGrid;
                window.maxRaysPerSource = (typeof savedSettings.maxRaysPerSource === 'number' && savedSettings.maxRaysPerSource >= 1)
                    ? savedSettings.maxRaysPerSource : window.maxRaysPerSource;
                window.globalMaxBounces = typeof savedSettings.globalMaxBounces === 'number' ? savedSettings.globalMaxBounces : window.globalMaxBounces;
                window.globalMinIntensity = typeof savedSettings.globalMinIntensity === 'number' ? savedSettings.globalMinIntensity : window.globalMinIntensity;
                // fastWhiteLightMode = savedSettings.fastWhiteLightMode === true; // <<<--- Load saved value (default false if missing)

                console.log("Settings loaded:", { showGrid, maxRaysPerSource: window.maxRaysPerSource, globalMaxBounces: window.globalMaxBounces, globalMinIntensity: window.globalMinIntensity, fastWhiteLightMode });
            }
        } catch (e) { console.error("Error parsing settings from localStorage:", e); }
    } else { console.log("No saved settings found, using defaults."); }

    console.log(`Applying settings: Max Bounces=${window.globalMaxBounces}, Min Intensity=${window.globalMinIntensity.toExponential(2)}, Fast WLS=${fastWhiteLightMode}`);
    needsRetrace = true;
}
// --- END OF REPLACEMENT ---

// --- END Saving/Loading Settings Functions ---






// --- NEW FUNCTION: Save Scene to Local Storage ---
let saveTimeout = null; // Timer variable for debouncing saves




// --- START: Provided Functions for Scene Management & Import Fix ---

// --- NEW/REVISED Local Storage Scene Management Helpers ---

const SCENE_KEY_PREFIX = 'opticsLabScene_'; // Prefix for all scene keys

// Gets a list of saved scene names from localStorage
function getSavedSceneNames() {
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(SCENE_KEY_PREFIX)) {
            names.push(key.substring(SCENE_KEY_PREFIX.length)); // Extract name after prefix
        }
    }
    return names.sort(); // Return sorted names
}

// Loads scene data from localStorage by name
function loadSceneDataFromStorage(sceneName) {
    if (!sceneName) return null;
    const key = SCENE_KEY_PREFIX + sceneName;
    const savedSceneJson = localStorage.getItem(key);
    if (savedSceneJson) {
        try {
            const sceneData = JSON.parse(savedSceneJson);
            // Basic validation
            if (sceneData && Array.isArray(sceneData.components) && sceneData.version === "1.0") {
                return sceneData;
            } else {
                console.error(`Invalid data structure found for scene '${sceneName}'. Removing.`);
                localStorage.removeItem(key); // Remove invalid data
                return null;
            }
        } catch (e) {
            console.error(`Error parsing scene data for '${sceneName}':`, e);
            localStorage.removeItem(key); // Remove corrupted data
            return null;
        }
    }
    return null; // Not found
}

// Saves scene data to localStorage with a specific name
function saveSceneDataToStorage(sceneName, sceneData) {
    if (!sceneName || !sceneData) return false;
    const key = SCENE_KEY_PREFIX + sceneName;
    try {
        const jsonString = JSON.stringify(sceneData); // Use compact JSON for storage
        localStorage.setItem(key, jsonString);
        console.log(`Scene '${sceneName}' saved to localStorage.`);
        return true;
    } catch (e) {
        console.error(`Error saving scene '${sceneName}' to localStorage:`, e);
        alert(`保存场景 '${sceneName}' 时出错！可能是存储空间已满。`);
        return false;
    }
}

// Deletes a scene from localStorage by name
function deleteSceneFromStorage(sceneName) {
    if (!sceneName) return;
    const key = SCENE_KEY_PREFIX + sceneName;
    if (localStorage.getItem(key)) {
        if (confirm(`确定要删除本地保存的场景 "${sceneName}" 吗？此操作无法撤销。`)) {
            localStorage.removeItem(key);
            console.log(`Scene '${sceneName}' deleted from localStorage.`);
            // Refresh the scene list (assuming it's currently visible in a modal/tab)
            updateSavedScenesList(); // Refresh the list in the UI
        }
    } else {
        console.warn(`Scene '${sceneName}' not found for deletion.`);
    }
}


// --- NEW FUNCTION: Update Saved Scenes List in UI (e.g., Scenes Tab) ---
function updateSavedScenesList() {
    // Target the list container in the 'Scenes' tab
    const listContainer = document.getElementById('saved-scenes-list'); // Ensure this ID matches your HTML in the scenes tab
    if (!listContainer) {
        console.warn("Scene list container #saved-scenes-list not found.");
        return;
    }

    const sceneNames = getSavedSceneNames();
    listContainer.innerHTML = ''; // Clear previous list

    if (sceneNames.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">没有已保存的本地场景。</p>'; // Use class for styling
    } else {
        sceneNames.forEach(name => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'saved-scene-item'; // Use class for styling

            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            nameSpan.title = `加载场景: ${name}`;
            nameSpan.onclick = () => { // Add click listener to load
                console.log(`Load requested for scene: ${name}`);
                if (sceneModified) { // Check for unsaved changes
                    if (!confirm("当前场景已被修改。加载场景将【覆盖】当前更改。是否继续？")) {
                        console.log("Load cancelled by user.");
                        return; // Stop loading
                    }
                    // sceneModified = false; // Will be set inside loadSceneFromData
                }
                const sceneData = loadSceneDataFromStorage(name);
                if (sceneData) {
                    if (loadSceneFromData(sceneData)) { // Call helper to load
                        console.log(`Scene '${name}' loaded via list.`);
                        // No need to close modal if it's a tab
                    } else {
                        alert(`加载场景 "${name}" 时发生内部错误。`);
                        updateSavedScenesList(); // Refresh list if load failed internally
                    }
                } else {
                    alert(`无法加载场景 "${name}"！数据可能已损坏或丢失。`);
                    updateSavedScenesList(); // Refresh list if data was invalid
                }
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.title = `删除场景: ${name}`;
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // Prevent triggering load when clicking delete
                deleteSceneFromStorage(name); // Call delete helper
            };

            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(deleteBtn);
            listContainer.appendChild(itemDiv);
        });
    }
}
// --- END Update Saved Scenes List ---


// --- NEW Helper to Generate Scene Data Object ---
// (Extracts logic used by both export and save as)
function generateSceneDataObject() {
    const sceneData = { version: "1.0", components: [] };
    components.forEach(comp => {
        let compProps = {};
        try {
            compProps.type = comp.constructor.name; compProps.id = comp.id;
            compProps.posX = comp.pos.x; compProps.posY = comp.pos.y;
            compProps.angleDeg = comp.angleRad * (180 / Math.PI); compProps.label = comp.label;
            const specificPropsData = comp.getProperties();
            for (const propName in specificPropsData) {
                if (!['posX', 'posY', 'angleDeg', 'label'].includes(propName) && !specificPropsData[propName].readonly) {
                    // Check if property exists directly on the instance or its prototype chain
                    if (comp[propName] !== undefined || typeof comp[propName] === 'boolean' || typeof comp[propName] === 'number' || comp[propName] === null) { // Check more reliably
                        // Special handling for angles stored in radians but exposed in degrees
                        if (propName === 'transmissionAxisAngleDeg' && comp.hasOwnProperty('transmissionAxisRad')) compProps[propName] = comp.transmissionAxisRad * (180 / Math.PI);
                        else if (propName === 'fastAxisAngleDeg' && comp.hasOwnProperty('fastAxisRad')) compProps[propName] = comp.fastAxisRad * (180 / Math.PI);
                        else if (propName === 'outputAngleDeg' && comp.hasOwnProperty('outputAngleRad')) compProps[propName] = comp.outputAngleRad * (180 / Math.PI);
                        else if (propName === 'fanAngleDeg' && comp.hasOwnProperty('fanAngleRad')) compProps[propName] = comp.fanAngleRad * (180 / Math.PI);
                        else if (propName === 'spreadDeg' && comp.hasOwnProperty('spreadRad')) compProps[propName] = comp.spreadRad * (180 / Math.PI);
                        else if (propName === 'apexAngleDeg' && comp.hasOwnProperty('apexAngleRad')) compProps[propName] = comp.apexAngleRad * (180 / Math.PI);
                        else if (propName === 'centralAngleDeg' && comp.hasOwnProperty('centralAngleRad')) compProps[propName] = comp.centralAngleRad * (180 / Math.PI);
                        // Add other angle conversions here...
                        else compProps[propName] = comp[propName]; // Direct access
                    } else {
                        // Fallback for properties like outputX/Y in OpticalFiber
                        if (propName === 'outputX' && comp.outputPos) compProps.outputX = comp.outputPos.x;
                        else if (propName === 'outputY' && comp.outputPos) compProps.outputY = comp.outputPos.y;
                        else console.warn(`Property '${propName}' not found directly on component ${comp.label} during save.`);
                    }
                }
            }
            // Ensure specific necessary properties are included even if not exposed by getProperties
            if (comp instanceof OpticalFiber && comp.outputPos) { if (!compProps.hasOwnProperty('outputX')) compProps.outputX = comp.outputPos.x; if (!compProps.hasOwnProperty('outputY')) compProps.outputY = comp.outputPos.y; }
            if (comp instanceof LaserSource || comp instanceof WhiteLightSource) { if (!compProps.hasOwnProperty('initialBeamWaist')) compProps.initialBeamWaist = comp.initialBeamWaist; if (!compProps.hasOwnProperty('gaussianEnabled')) compProps.gaussianEnabled = comp.gaussianEnabled; }
            if (comp instanceof WhiteLightSource) { if (!compProps.hasOwnProperty('baseIntensity')) compProps.baseIntensity = comp.baseIntensity; } // Save baseIntensity for WLS
            sceneData.components.push(compProps);
        } catch (e) { console.error(`Error extracting data for component ${comp?.label} (${comp?.id}):`, e); }
    });
    return sceneData;
}


// --- NEW HELPER FUNCTION: Load Scene from Data Object ---
// (Extracts the component loading logic from importScene/loadPresetScene)
function loadSceneFromData(sceneData) {
    try {
        components = [];
        selectedComponent = null;
        draggingComponent = null;
        updateInspector();

        sceneData.components.forEach((compData, index) => {
            let newComp = null;
            const compType = compData.type;
            const pos = new Vector(compData.posX ?? 100 + index * 10, compData.posY ?? 100 + index * 10);
            const angleDeg = compData.angleDeg ?? 0;

            // --- Component Creation Switch Statement (Keep this complete!) ---
            switch (compType) {
                case 'LaserSource': newComp = new LaserSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.numRays, compData.spreadDeg, compData.enabled, compData.polarizationAngleDeg, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist); if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled); break;
                case 'FanSource': newComp = new FanSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.fanAngleDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter); break;
                case 'LineSource': newComp = new LineSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.length, compData.enabled, compData.ignoreDecay, compData.beamDiameter); break;
                case 'Mirror': newComp = new Mirror(pos, compData.length, angleDeg); break;
                case 'SphericalMirror': newComp = new SphericalMirror(pos, compData.radiusOfCurvature, compData.centralAngleDeg, angleDeg); break;
                case 'ParabolicMirror': newComp = new ParabolicMirror(pos, compData.focalLength, compData.diameter, angleDeg); break;
                case 'Screen': newComp = new Screen(pos, compData.length, angleDeg, compData.numBins); if (compData.hasOwnProperty('showPattern')) newComp.showPattern = compData.showPattern; break;
                case 'ThinLens': newComp = new ThinLens(pos, compData.diameter, compData.focalLength, angleDeg); if (compData.hasOwnProperty('baseRefractiveIndex')) newComp.setProperty('baseRefractiveIndex', compData.baseRefractiveIndex); if (compData.hasOwnProperty('dispersionCoeffB')) newComp.setProperty('dispersionCoeffB', compData.dispersionCoeffB); if (compData.hasOwnProperty('quality')) newComp.setProperty('quality', compData.quality); if (compData.hasOwnProperty('coated')) newComp.setProperty('coated', compData.coated); if (compData.hasOwnProperty('isThickLens')) newComp.setProperty('isThickLens', compData.isThickLens); if (compData.hasOwnProperty('chromaticAberration')) newComp.setProperty('chromaticAberration', compData.chromaticAberration); if (compData.hasOwnProperty('sphericalAberration')) newComp.setProperty('sphericalAberration', compData.sphericalAberration); break;
                case 'Aperture': newComp = new Aperture(pos, compData.length, compData.numberOfSlits, compData.slitWidth, compData.slitSeparation, angleDeg); break;
                case 'Polarizer': newComp = new Polarizer(pos, compData.length, compData.transmissionAxisAngleDeg, angleDeg); break;
                case 'BeamSplitter': newComp = new BeamSplitter(pos, compData.length, angleDeg, compData.type, compData.splitRatio, compData.pbsUnpolarizedReflectivity); break;
                case 'DielectricBlock': newComp = new DielectricBlock(pos, compData.width, compData.height, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB_nm2, compData.absorptionCoeff, compData.showEvanescentWave); break;
                case 'Photodiode': newComp = new Photodiode(pos, angleDeg, compData.diameter); break;
                case 'OpticalFiber': const outputPos = new Vector(compData.outputX ?? pos.x + 100, compData.outputY ?? pos.y); newComp = new OpticalFiber(pos, outputPos, angleDeg, compData.outputAngleDeg, compData.numericalAperture, compData.coreDiameter, compData.fiberIntrinsicEfficiency, compData.transmissionLossDbPerKm, compData.facetLength); break;
                case 'Prism': newComp = new Prism(pos, compData.baseLength, compData.apexAngleDeg, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB); break;
                case 'WhiteLightSource': newComp = new WhiteLightSource(pos, angleDeg, compData.baseIntensity ?? 75.0, compData.rayCount ?? 41, compData.spreadDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist ?? 5.0); if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled); else newComp.gaussianEnabled = true; break; // Ensure defaults and gaussian state loaded
                case 'DiffractionGrating': newComp = new DiffractionGrating(pos, compData.length, compData.gratingPeriodInMicrons, angleDeg, compData.maxOrder); break;
                case 'HalfWavePlate': newComp = new HalfWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg); break;
                case 'QuarterWavePlate': newComp = new QuarterWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg); break;
                case 'AcoustoOpticModulator': newComp = new AcoustoOpticModulator(pos, compData.width, compData.height, angleDeg, compData.rfFrequencyMHz, compData.rfPower); break;
                default: console.warn(`Unknown component type during scene load: ${compType}`);
            }
            // --- End Component Creation Switch ---

            if (newComp) {
                if (compData.label) newComp.label = compData.label;
                if (compData.id) newComp.id = compData.id; // Restore ID
                components.push(newComp);
            }
        });

        needsRetrace = true;
        sceneModified = false; // Mark as unmodified after load
        console.log(`Scene loaded successfully from data object. Components: ${components.length}`);
        return true; // Indicate success

    } catch (loadError) {
        console.error("Error loading scene components from data:", loadError);
        alert(`加载场景组件时出错: ${loadError.message}`);
        components = []; // Clear on error
        needsRetrace = true;
        sceneModified = false;
        return false; // Indicate failure
    }
}
// --- END Load Scene Helper ---


// --- NEW Helper to handle "Save As" click (e.g., from Scene Manager Tab) ---
function handleSaveAsClick() {
    const defaultName = `场景 ${new Date().toLocaleDateString()}`;
    const sceneName = prompt("请输入要保存的场景名称:", defaultName);

    if (sceneName !== null && sceneName.trim() !== "") {
        const trimmedName = sceneName.trim();
        const existingNames = getSavedSceneNames();

        if (existingNames.includes(trimmedName)) {
            if (!confirm(`场景 "${trimmedName}" 已存在。是否覆盖？`)) {
                console.log("Save As cancelled, name exists.");
                return; // Don't save if user cancels overwrite
            }
        }

        const sceneData = generateSceneDataObject(); // Use helper to get data
        if (sceneData && saveSceneDataToStorage(trimmedName, sceneData)) {
            sceneModified = false; // Mark as saved AFTER successful save
            updateSavedScenesList(); // Refresh the list in the modal/tab
            // Removed alert for smoother experience, confirmation is implicit
            // alert(`场景 "${trimmedName}" 已成功保存到本地浏览器！`);
        }
    } else {
        console.log("Save As cancelled by user.");
    }
}

// --- NEW Helper for Triggering File Import ---
function triggerFileInputForImport() {
    // Logic moved from the old import button listener
    if (isImporting) {
        console.warn("Import already in progress."); return;
    }
    if (sceneModified) {
        if (!confirm("当前场景已被修改。导入新场景将【覆盖】当前更改。是否继续？")) {
            console.log("Import cancelled by user."); return;
        }
        // Do not reset sceneModified = false here; let importScene handle it on success
    }

    const fileInput = document.getElementById('import-file-input'); // Get the permanent hidden input
    if (fileInput) {
        console.log("Setting import lock and triggering permanent file input.");
        isImporting = true;
        fileInput.value = null; // Reset before click

        setTimeout(() => {
            fileInput.click();
            const releaseLockOnFocus = () => {
                setTimeout(() => {
                    console.log("Window focus regained, releasing import lock (from permanent input trigger).");
                    isImporting = false;
                    window.removeEventListener('focus', releaseLockOnFocus);
                }, 100);
            };
            // Add focus listener *after* triggering the click
            window.addEventListener('focus', releaseLockOnFocus);
        }, 50);
    } else {
        console.error("Permanent file input #import-file-input not found!");
        alert("导入功能所需的文件输入元素丢失！");
    }
}

// --- REPLACEMENT for exportScene (Download Only, uses helper) ---
function exportScene() {
    console.log("Exporting current scene to file...");

    if (!confirm("确定要将【当前画布】上的场景导出为 JSON 文件吗？")) {
        console.log("Scene export cancelled by user.");
        return;
    }

    const sceneData = generateSceneDataObject(); // Use helper to get data
    if (!sceneData) {
        alert("无法生成场景数据以供导出！"); return;
    }

    const jsonString = JSON.stringify(sceneData, null, 2); // Pretty print

    // Trigger Download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const suggestedName = `optics_scene_${new Date().toISOString().slice(0, 10)}.json`;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("Scene download triggered.");
    // Note: Exporting does not change sceneModified state
}
// --- END OF REPLACEMENT ---


// --- REPLACEMENT for importScene (Uses loadSceneFromData) ---
function importScene(file) {
    if (!file) {
        console.error("No file selected for import.");
        return;
    }
    console.log("Importing scene from file:", file.name);

    const reader = new FileReader();
    reader.onload = function (event) {
        let sceneData;
        try {
            sceneData = JSON.parse(event.target.result);
            console.log("Parsed scene data from file:", sceneData);
            if (!sceneData || !Array.isArray(sceneData.components)) throw new Error("Invalid file format.");
            if (sceneData.version !== "1.0") console.warn(`Importing scene version ${sceneData.version}`);

            // Load the scene using the helper function
            if (loadSceneFromData(sceneData)) {
                console.log("Scene successfully imported from file.");
                // sceneModified is set to false inside loadSceneFromData
            } else {
                console.error("Failed to load components from imported file data.");
                alert("从文件加载场景组件时出错。");
            }

        } catch (e) {
            console.error("Error parsing or loading scene file:", e);
            alert("导入失败：文件格式无效或已损坏。");
            // Ensure state is clean even on error
            components = []; selectedComponent = null; updateInspector(); needsRetrace = true; sceneModified = false;
        }
    };
    reader.onerror = function () {
        console.error("Error reading the import file.");
        alert("读取导入文件时出错。");
        isImporting = false; // Ensure lock is released on read error
    };
    reader.readAsText(file);
}
// --- END OF REPLACEMENT ---


// --- REPLACEMENT for setupEventListeners function (V3 - Complete & Corrected) ---
function setupEventListeners() {
    // Prevent multiple initializations
    if (eventListenersSetup) {
        console.warn("setupEventListeners called again. Skipping.");
        return;
    }
    eventListenersSetup = true; // Set the flag
    console.log("Setting up event listeners (New Layout)...");

    // --- Window Resize ---
    window.addEventListener('resize', resizeCanvas);

    // --- Top Menubar ---
    console.log("Setting up top menubar listeners...");
    // File Menu
    document.getElementById('menu-new-scene')?.addEventListener('click', (e) => { e.preventDefault(); if (sceneModified && !confirm("当前场景有未保存的更改。确定要新建场景并放弃更改吗？")) return; console.log("Action: New Scene"); components = []; selectedComponent = null; updateInspector(); activateTab('properties-tab'); cameraOffset = new Vector(0, 0); cameraScale = 1.0; sceneModified = false; needsRetrace = true; });
    document.getElementById('menu-import-scene')?.addEventListener('click', (e) => { e.preventDefault(); triggerFileInputForImport(); });
    document.getElementById('menu-export-scene')?.addEventListener('click', (e) => { e.preventDefault(); exportScene(); });
    document.getElementById('menu-manage-scenes')?.addEventListener('click', (e) => { e.preventDefault(); activateTab('scenes-tab'); });

    // Edit Menu
    document.getElementById('menu-delete-selected')?.addEventListener('click', (e) => { e.preventDefault(); if (selectedComponent) deleteComponent(selectedComponent); });
    document.getElementById('menu-clear-all')?.addEventListener('click', (e) => { e.preventDefault(); if (components.length > 0 && confirm("确定要清空画布上的所有元件吗？此操作无法撤销。")) { components = []; selectedComponent = null; updateInspector(); activateTab('properties-tab'); sceneModified = false; needsRetrace = true; localStorage.removeItem(LOCALSTORAGE_SCENE_KEY); /* Clear last auto-save? Or just don't save the empty state? Let's not save empty.*/ console.log("Scene cleared."); } });
    document.getElementById('menu-undo')?.addEventListener('click', (e) => { e.preventDefault(); alert('撤销功能开发中...'); });
    document.getElementById('menu-redo')?.addEventListener('click', (e) => { e.preventDefault(); alert('重做功能开发中...'); });

    // View Menu
    document.getElementById('menu-reset-view')?.addEventListener('click', (e) => { e.preventDefault(); cameraScale = 1.0; cameraOffset = new Vector(0, 0); needsRetrace = true; });
    document.getElementById('menu-toggle-grid')?.addEventListener('click', (e) => { e.preventDefault(); showGrid = !showGrid; const cb = document.getElementById('setting-show-grid'); if (cb) cb.checked = showGrid; saveSettings(); needsRetrace = true; });

    // Simulation Menu
    document.getElementById('menu-mode-raytrace')?.addEventListener('click', (e) => { e.preventDefault(); if (currentMode !== 'ray_trace') switchMode('ray_trace'); });
    document.getElementById('menu-mode-lensimaging')?.addEventListener('click', (e) => { e.preventDefault(); if (currentMode !== 'lens_imaging') switchMode('lens_imaging'); });
    document.getElementById('menu-open-settings')?.addEventListener('click', (e) => { e.preventDefault(); activateTab('settings-tab'); });
    document.getElementById('menu-toggle-arrows')?.addEventListener('click', (e) => { e.preventDefault(); globalShowArrows = !globalShowArrows; if (globalShowArrows) arrowAnimationStartTime = performance.now() / 1000.0; else arrowAnimationStates.clear(); const cb = document.getElementById('setting-show-arrows'); if (cb) cb.checked = globalShowArrows; saveSettings(); /* Update button text? */ document.getElementById('toggle-arrows-btn')?.(globalShowArrows ? "隐藏所有箭头" : "显示所有箭头"); });
    document.getElementById('menu-toggle-selected-arrow')?.addEventListener('click', (e) => { e.preventDefault(); onlyShowSelectedSourceArrow = !onlyShowSelectedSourceArrow; const cb = document.getElementById('setting-selected-arrow'); if (cb) cb.checked = onlyShowSelectedSourceArrow; saveSettings(); /* Update button text? */ document.getElementById('toggle-selected-arrow-btn')?.(onlyShowSelectedSourceArrow ? "取消仅选中" : "仅显示选中"); });

    // Help Menu
    document.getElementById('menu-user-guide')?.addEventListener('click', (e) => { e.preventDefault(); const modal = document.getElementById('guide-modal'); if (modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('visible'), 10); } });
    document.getElementById('menu-about')?.addEventListener('click', (e) => { e.preventDefault(); const modal = document.getElementById('about-modal'); if (modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('visible'), 10); } });

    // --- Top Right User Buttons ---
    const userActionBtnTop = document.getElementById('user-action-btn-top');
    const logoutBtnTop = document.getElementById('logout-btn-top');
    if (userActionBtnTop) userActionBtnTop.addEventListener('click', () => { if (currentUser) saveSceneToCloud(); else showLoginRegisterModal(); }); // Placeholder functions
    if (logoutBtnTop) logoutBtnTop.addEventListener('click', logoutUser);

    // --- Toolbar (Tool selection only) ---
    if (toolbar) {
        toolbar.addEventListener('click', (e) => {
            const targetButton = e.target.closest('button[data-type]');
            if (targetButton) {
                componentToAdd = targetButton.dataset.type;
                console.log("Tool selected:", componentToAdd);
                clearToolbarSelection();
                targetButton.classList.add('selected-tool');
                if (selectedComponent) { selectedComponent.selected = false; selectedComponent = null; updateInspector(); activateTab('properties-tab'); }
                canvas.style.cursor = 'crosshair'; // Use crosshair when tool selected
            }
        });
    } else { console.error("Toolbar element not found!"); }

    // --- Inspector Tabs ---
    setupTabs(); // Initialize tab switching behavior

    // --- Inspector Controls (within Tabs) ---
    // Delete Button (Properties Tab)
    if (deleteBtn) deleteBtn.addEventListener('click', () => { if (selectedComponent) deleteComponent(selectedComponent); });

    // Settings Tab Controls
    const gridCheckbox = document.getElementById('setting-show-grid');
    if (gridCheckbox) gridCheckbox.addEventListener('change', () => { showGrid = gridCheckbox.checked; saveSettings(); needsRetrace = true; });
    const showArrowsCheckbox = document.getElementById('setting-show-arrows');
    if (showArrowsCheckbox) showArrowsCheckbox.addEventListener('change', () => { globalShowArrows = showArrowsCheckbox.checked; if (globalShowArrows) arrowAnimationStartTime = performance.now() / 1000.0; else arrowAnimationStates.clear(); saveSettings(); });
    const selectedArrowCheckbox = document.getElementById('setting-selected-arrow');
    if (selectedArrowCheckbox) selectedArrowCheckbox.addEventListener('change', () => { onlyShowSelectedSourceArrow = selectedArrowCheckbox.checked; saveSettings(); });
    // Arrow Speed Slider (ensure arrowSpeedSlider is assigned in initialize)
    arrowSpeedSlider = document.getElementById('arrow-speed'); // Assign it here if not already global
    if (arrowSpeedSlider) { arrowSpeedSlider.addEventListener('input', (e) => { arrowAnimationSpeed = parseFloat(e.target.value); saveSettings(); }); } else { console.warn("Arrow speed slider not found in Settings tab.") }
    // Performance Controls
    const maxRaysInput = document.getElementById('setting-max-rays'); const maxRaysValueSpan = document.getElementById('setting-max-rays-value');
    const maxBouncesInput = document.getElementById('setting-max-bounces'); const maxBouncesValueSpan = document.getElementById('setting-max-bounces-value');
    const minIntensityInput = document.getElementById('setting-min-intensity'); const minIntensityValueSpan = document.getElementById('setting-min-intensity-value');
    const fastWlsCheckbox = document.getElementById('setting-fast-wls');
    const updateSpan = (span, value, formatFn) => { if (span) span.textContent = `(${formatFn(value)})`; };
    if (maxRaysInput) { maxRaysInput.addEventListener('input', () => { const val = parseInt(maxRaysInput.value); if (!isNaN(val) && val >= 1) { window.maxRaysPerSource = val; updateSpan(maxRaysValueSpan, val, v => v); saveSettings(); } }); maxRaysInput.addEventListener('change', () => { saveSettings(); needsRetrace = true; }); }
    if (maxBouncesInput) { maxBouncesInput.addEventListener('input', () => { const val = parseInt(maxBouncesInput.value); if (!isNaN(val) && val >= 1) { window.globalMaxBounces = val; updateSpan(maxBouncesValueSpan, val, v => v); saveSettings(); } }); maxBouncesInput.addEventListener('change', () => { saveSettings(); needsRetrace = true; }); }
    if (minIntensityInput) { minIntensityInput.addEventListener('input', () => { const val = parseFloat(minIntensityInput.value); if (!isNaN(val) && val > 0) { window.globalMinIntensity = val; updateSpan(minIntensityValueSpan, val, v => v.toExponential(1)); saveSettings(); } }); minIntensityInput.addEventListener('change', () => { saveSettings(); needsRetrace = true; }); }
    if (fastWlsCheckbox) { fastWlsCheckbox.addEventListener('change', () => { window.fastWhiteLightMode = fastWlsCheckbox.checked; saveSettings(); needsRetrace = true; }); }

    // Scenes Tab Controls
    const sceneSaveAsBtn = document.getElementById('scene-save-as-btn');
    if (sceneSaveAsBtn) sceneSaveAsBtn.addEventListener('click', handleSaveAsClick);
    const sceneImportBtn = document.getElementById('scene-import-btn');
    if (sceneImportBtn) sceneImportBtn.addEventListener('click', triggerFileInputForImport);
    // Scene list item listeners are added dynamically in updateSavedScenesList

    // --- Modal Close Buttons & Overlay Clicks ---
    document.getElementById('auth-modal-close-btn')?.addEventListener('click', closeAuthModal);
    document.getElementById('guide-modal-close-btn')?.addEventListener('click', () => { const m = document.getElementById('guide-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } });
    document.getElementById('about-modal-close-btn')?.addEventListener('click', () => { const m = document.getElementById('about-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } });
    // Add closing by clicking overlay for modals
    document.getElementById('auth-modal')?.addEventListener('click', (e) => { if (e.target.id === 'auth-modal') closeAuthModal(); });
    document.getElementById('guide-modal')?.addEventListener('click', (e) => { if (e.target.id === 'guide-modal') { const m = document.getElementById('guide-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } } });
    document.getElementById('about-modal')?.addEventListener('click', (e) => { if (e.target.id === 'about-modal') { const m = document.getElementById('about-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } } });


    // --- Canvas Events ---
    if (canvas) {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
    } else { console.error("Canvas element not found!"); }

    // --- File Input Listener (Permanent Hidden) ---
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            console.log("Permanent file input 'change' event fired.");
            if (event.target.files && event.target.files.length > 0) {
                const file = event.target.files[0];
                console.log("File selected via permanent input:", file.name);
                isImporting = false; // Release lock before processing
                importScene(file);
            } else {
                console.log("Permanent file input 'change' - no file selected (cancel). Lock should release on focus.");
                if (isImporting) { // Fallback lock release
                    console.log("Releasing import lock from permanent input 'change' event (cancel likely).");
                    isImporting = false;
                }
            }
            // Reset value AFTER processing (whether successful or not)
            // This helps ensure it can be triggered again reliably
            event.target.value = null;
        });
    } else { console.warn("Permanent file input #import-file-input not found for change listener!"); }


    // --- Global Keydown ---
    window.addEventListener('keydown', handleKeyDown);

    // --- Warn on Leave ---
    // --- Warn on Leave ---
    window.addEventListener('beforeunload', (event) => {
        if (sceneModified) { // Only prompt if changes were made
            console.log("beforeunload triggered: Scene modified, prompting user.");
            event.preventDefault(); // Standard way to ask browser to show prompt
            event.returnValue = '您有未保存的更改。确定要离开吗？'; // Generic message (often ignored)
            return event.returnValue;
        } else {
            console.log("beforeunload triggered: No modifications detected.");
            // No prompt needed if no changes
        }
    });

    console.log("Event listeners setup complete.");
}
// --- END OF REPLACEMENT ---



// --- NEW FUNCTION: Initialize and Handle Tab Switching ---
let inspectorTabs = {}; // To store references to tab buttons and content panes
function setupTabs() {
    const tabContainer = document.querySelector('#inspector .tab-container');
    const contentPanes = document.querySelectorAll('#inspector .tab-content');

    if (!tabContainer || contentPanes.length === 0) {
        console.error("Inspector tab elements not found!");
        return;
    }

    // Store references
    inspectorTabs.buttons = tabContainer.querySelectorAll('.tab-button');
    inspectorTabs.contents = {};
    contentPanes.forEach(pane => {
        inspectorTabs.contents[pane.id] = pane;
    });

    tabContainer.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.tab-button');
        if (!targetButton) return;

        const tabId = targetButton.dataset.tab;
        if (tabId) {
            activateTab(tabId);
        }
    });

    // Activate the first tab ('properties-tab') initially by default
    // activateTab('properties-tab'); // Let's activate based on selection instead
}

// --- NEW FUNCTION: Activate a specific tab ---
function activateTab(tabId) {
    if (!inspectorTabs.buttons || !inspectorTabs.contents) return;

    // Deactivate all buttons and hide all content panes
    inspectorTabs.buttons.forEach(button => button.classList.remove('active'));
    for (const id in inspectorTabs.contents) {
        inspectorTabs.contents[id].style.display = 'none'; // Use display none/block
        inspectorTabs.contents[id].classList.remove('active'); // Also manage active class
    }

    // Activate the selected button and show the corresponding content pane
    const buttonToActivate = document.querySelector(`#inspector .tab-button[data-tab="${tabId}"]`);
    const contentToShow = inspectorTabs.contents[tabId];

    if (buttonToActivate) buttonToActivate.classList.add('active');
    if (contentToShow) {
        contentToShow.style.display = 'block';
        contentToShow.classList.add('active');
        console.log(`Activated tab: ${tabId}`);

        // Special actions when activating certain tabs
        if (tabId === 'scenes-tab') {
            updateSavedScenesList(); // Refresh scene list when tab is shown
        } else if (tabId === 'settings-tab') {
            // Load settings into controls when tab is shown
            loadSettingsIntoControls(); // Need this new helper
        }

    } else {
        console.warn(`Tab content not found for id: ${tabId}`);
        // Activate properties tab as fallback?
        activateTab('properties-tab');
    }
}

// --- NEW Helper: Load settings into controls (when settings tab is opened) ---
function loadSettingsIntoControls() {
    const gridCheckbox = document.getElementById('setting-show-grid');
    const maxRaysInput = document.getElementById('setting-max-rays');
    const maxRaysValueSpan = document.getElementById('setting-max-rays-value');
    const maxBouncesInput = document.getElementById('setting-max-bounces');
    const maxBouncesValueSpan = document.getElementById('setting-max-bounces-value');
    const minIntensityInput = document.getElementById('setting-min-intensity');
    const minIntensityValueSpan = document.getElementById('setting-min-intensity-value');
    const fastWlsCheckbox = document.getElementById('setting-fast-wls');
    const showArrowsCheckbox = document.getElementById('setting-show-arrows'); // Get new checkboxes/inputs
    const selectedArrowCheckbox = document.getElementById('setting-selected-arrow');
    const speedSlider = document.getElementById('arrow-speed'); // Get speed slider

    const updateSpan = (span, value, formatFn) => { if (span) span.textContent = `(${formatFn(value)})`; };

    if (gridCheckbox) gridCheckbox.checked = showGrid;
    if (maxRaysInput) maxRaysInput.value = window.maxRaysPerSource;
    if (maxBouncesInput) maxBouncesInput.value = window.globalMaxBounces;
    if (minIntensityInput) minIntensityInput.value = window.globalMinIntensity;
    if (fastWlsCheckbox) fastWlsCheckbox.checked = window.fastWhiteLightMode; // Assuming fastWhiteLightMode is global
    if (showArrowsCheckbox) showArrowsCheckbox.checked = globalShowArrows;
    if (selectedArrowCheckbox) selectedArrowCheckbox.checked = onlyShowSelectedSourceArrow;
    if (speedSlider) speedSlider.value = arrowAnimationSpeed; // Load speed value

    updateSpan(maxRaysValueSpan, window.maxRaysPerSource, v => v);
    updateSpan(maxBouncesValueSpan, window.globalMaxBounces, v => v);
    updateSpan(minIntensityValueSpan, window.globalMinIntensity, v => v.toExponential(1));

    console.log("Loaded current settings into Settings tab controls.");
}




// --- NEW Functions for Scene Manager Modal ---
function openSceneManagerModal() { // Name kept for potential legacy calls, now activates tab
    console.log("Activating Scenes Tab.");
    activateTab('scenes-tab'); // activateTab handles list update via updateSavedScenesList
}

function closeSceneManagerModal() {
    const modal = document.getElementById('scene-manager-modal');
    if (modal) {
        modal.classList.remove('visible');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
        // Remove listeners specific to this modal if added dynamically? Or keep them.
        // document.getElementById('scene-manager-save-as-btn')?.removeEventListener('click', handleSaveAsClick); // Example cleanup
    }
}

// --- NEW Helper to handle "Save As" click (extracted logic) ---
function handleSaveAsClick() {
    const defaultName = `场景 ${new Date().toLocaleDateString()}`;
    const sceneName = prompt("请输入要保存的场景名称:", defaultName);
    if (sceneName !== null && sceneName.trim() !== "") {
        const trimmedName = sceneName.trim();
        const existingNames = getSavedSceneNames();
        if (existingNames.includes(trimmedName)) {
            if (!confirm(`场景 "${trimmedName}" 已存在。是否覆盖？`)) {
                console.log("Save As cancelled, name exists."); return;
            }
        }
        const sceneData = generateSceneDataObject(); // Use helper to get data
        if (sceneData && saveSceneDataToStorage(trimmedName, sceneData)) {
            sceneModified = false;
            updateSavedScenesList(); // Refresh list
            alert(`场景 "${trimmedName}" 已成功保存到本地浏览器！`);
            // Optionally close modal after save?
            // closeSceneManagerModal();
        }
    } else { console.log("Save As cancelled by user."); }
}







// --- Mode Switching Function ---
function switchMode(newMode) {
    console.log(`Switching mode from ${currentMode} to ${newMode}`);
    currentMode = newMode;
    hideModeHint(); // Hide any previous hint

    // Actions needed when switching modes:
    needsRetrace = true; // Always retrace/redraw when mode changes

    // Reset things specific to certain modes if necessary
    // (e.g., clear special drawing layers)
    if (newMode === 'ray_trace') {
        // Actions for switching TO ray trace mode (if any)
    } else if (newMode === 'lens_imaging') {
        // Actions for switching TO lens imaging mode (if any)
    }
}

// --- Mode Hint Functions ---
function showModeHint(message) {
    if (modeHintElement) {
        modeHintElement.textContent = message;
        modeHintElement.style.display = 'block';
    }
}

function hideModeHint() {
    if (modeHintElement) {
        modeHintElement.style.display = 'none';
    }
}

// --- REPLACEMENT for initialize function (V3 - New UI) ---
function initialize() {
    // --- Prevent multiple initializations ---
    if (initialized) {
        console.warn("Initialization function called again, skipping.");
        return;
    }
    // Flag is set inside setupEventListeners now to avoid race conditions
    // initialized = true;
    // --- End prevention ---

    console.log("开始初始化光学实验室...");
    loadSettings(); // Load saved settings first

    // // --- Load First Available Scene from Local Storage at Startup ---
    // console.log("Checking for saved scenes in localStorage...");
    // const savedNames = getSavedSceneNames(); // Get list of all saved scenes
    // let loadedFromStorage = false;
    // if (savedNames.length > 0) {
    //     const firstSceneName = savedNames[0]; // Load the first one found (alphabetically)
    //     console.log(`Attempting to load first saved scene: '${firstSceneName}'`);
    //     const sceneData = loadSceneDataFromStorage(firstSceneName);
    //     if (sceneData) {
    //         if (loadSceneFromData(sceneData)) { // Use the helper to load
    //             loadedFromStorage = true;
    //             // sceneModified is set to false inside loadSceneFromData
    //         } else {
    //             console.error(`Failed to load components for scene '${firstSceneName}'.`);
    //         }
    //     } else {
    //         console.error(`Failed to load data for scene '${firstSceneName}' despite key existing.`);
    //     }
    // } else {
    //     console.log("No saved scenes found in localStorage.");
    // }
    // if (!loadedFromStorage) {
    //     components = []; // Start empty if nothing loaded
    // }
    // // --- End Loading Scene ---

    // --- Start with an Empty Scene ---
    console.log("Initializing with an empty scene.");
    components = []; // Always start with no components loaded
    sceneModified = false; // Initial state is unmodified
    loadedFromStorage = false; // Explicitly set flag
    // --- End Start Empty ---

    // --- Assign global DOM elements ---
    // Critical elements needed early
    canvas = document.getElementById('opticsCanvas');
    simulationArea = document.getElementById('simulation-area');
    toolbar = document.getElementById('toolbar');
    inspector = document.getElementById('inspector');

    if (!canvas || !simulationArea || !toolbar || !inspector) {
        console.error("初始化错误：一个或多个核心布局元素未找到！(canvas, simulationArea, toolbar, inspector)");
        alert("初始化错误：无法找到核心布局元素，请检查控制台！");
        return;
    }

    // Elements needed by specific functions (can be assigned later, but safer here)
    inspectorContent = document.getElementById('inspector-content');
    deleteBtn = document.getElementById('delete-btn');
    modeHintElement = document.getElementById('mode-hint') || document.createElement('div'); // Get or create hint element
    if (!modeHintElement.id && simulationArea) { // If newly created, set id and append
        modeHintElement.id = 'mode-hint';
        simulationArea.appendChild(modeHintElement);
    }

    // Get canvas context
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("无法获取 Canvas 2D 上下文！");
        alert("无法获取 Canvas 绘图上下文，浏览器可能不支持。");
        return;
    }

    // --- Initial Setup ---
    resizeCanvas();          // Set initial canvas size and scaling
    setupEventListeners();   // Setup ALL event listeners, including tabs and modals
    updateUserUI();        // Set initial user UI state based on currentUser
    activateTab('properties-tab'); // Activate properties tab by default
    updateInspector();       // Update inspector content (shows placeholder if nothing selected)
    needsRetrace = true;       // Mark for initial ray trace
    lastTimestamp = performance.now(); // Get starting time
    requestAnimationFrame(gameLoop); // Start the main loop

    console.log("初始化完成，主循环已启动。");
}
// --- END OF REPLACEMENT for initialize ---

// --- DOMContentLoaded ---
// Ensures the DOM is fully loaded before running initialization code.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded 事件触发。");
    // Basic check for essential classes
    if (typeof Vector !== 'undefined' && typeof GameObject !== 'undefined' && typeof Ray !== 'undefined' && typeof OpticalComponent !== 'undefined') {
        console.log("核心类已定义，准备调用 initialize...");
        initialize();
    } else {
        console.error("错误：一个或多个核心类 (Vector, GameObject, Ray, OpticalComponent) 未定义！脚本加载顺序可能错误。");
        alert("无法加载核心脚本，请检查控制台获取详细信息！");
    }
});

console.log("main.js 加载完毕。");