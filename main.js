// main.js - Main simulation logic and event handling

console.log("光学实验室 main.js 正在加载...");

// --- 默认常量（在模块加载前使用） ---
// 这些值会在 legacy-globals.js 加载后被覆盖
const DEFAULT_MAX_RAY_BOUNCES = 500;
const DEFAULT_MIN_RAY_INTENSITY = 0.0001;
const DEFAULT_MIN_RAY_WIDTH = 1.0;
const DEFAULT_MAX_RAY_WIDTH = 3.0;

// 使用函数获取值，确保在运行时获取最新值
function getMaxRayBounces() {
    return window.MAX_RAY_BOUNCES || DEFAULT_MAX_RAY_BOUNCES;
}
function getMinRayIntensity() {
    return window.MIN_RAY_INTENSITY || DEFAULT_MIN_RAY_INTENSITY;
}
function getMinRayWidth() {
    return window.MIN_RAY_WIDTH || DEFAULT_MIN_RAY_WIDTH;
}
function getMaxRayWidth() {
    return window.MAX_RAY_WIDTH || DEFAULT_MAX_RAY_WIDTH;
}

// 保持向后兼容的常量（使用默认值）
const MAX_RAY_BOUNCES = DEFAULT_MAX_RAY_BOUNCES;
const MIN_RAY_INTENSITY = DEFAULT_MIN_RAY_INTENSITY;
const MIN_RAY_WIDTH = DEFAULT_MIN_RAY_WIDTH;
const MAX_RAY_WIDTH = DEFAULT_MAX_RAY_WIDTH;

// --- Global DOM Elements ---
let canvas, ctx, toolbar, simulationArea, inspector, inspectorContent, deleteBtn,
    toggleArrowsBtn, toggleSelectedArrowBtn, arrowSpeedSlider;

window.globalMaxBounces = MAX_RAY_BOUNCES;
window.globalMinIntensity = MIN_RAY_INTENSITY;

let initialized = false; // Flag to prevent multiple initializations

// --- Global State ---
let components = []; // Array to hold all GameObject instances
let selectedComponents = []; // Array to hold multiple selected components
// We can keep selectedComponent temporarily for single-selection property updates
// Or refactor updateInspector later to handle the array. Let's keep it for now.
let selectedComponent = null; // Represents the *last* clicked/added for inspector focus
let draggingComponents = []; // Array for multiple components being dragged
let dragStartOffsets = new Map(); // Store offset for each dragged component { compId -> Vector }
let dragStartMousePos = null; // Mouse position when drag started
let isDragging = false; // General dragging flag (position or angle)
let needsRetrace = true; // Flag to recalculate ray paths
let componentToAdd = null; // Type string of component selected from toolbar
let currentRayPaths = []; // Stores the results of the last ray trace (Ray objects)
let mousePos = null; // Current mouse position in canvas logical coordinates (initialized later)
let mouseIsDown = false; // Is the primary mouse button currently pressed?
let eventListenersSetup = false; // Ensure listeners are only added once
let lastTimestamp = 0; // For calculating delta time in game loop
let nextFrameActiveRays = []; // Store rays generated this frame to activate next frame (e.g., fiber output)
// window.ignoreMaxBounces = false; // Make it global via window object

let cameraScale = 1.0;       // Current zoom level (1.0 = 100%)
let cameraOffset = null; // Current pan offset (canvas origin relative to view origin, initialized later)
let isPanning = false;       // Flag: Is the user currently panning?
let lastPanMousePos = null;  // Mouse position at the start of panning

// 初始化 Vector 相关变量（在 Vector 类可用后调用）
function initVectorVariables() {
    if (typeof Vector !== 'undefined') {
        if (!mousePos) mousePos = new Vector(0, 0);
        if (!cameraOffset) cameraOffset = new Vector(0, 0);
        return true;
    }
    return false;
}

let historyManager = null; // 延迟初始化，等待模块加载
let lastRecordedMoveState = null; // <<<--- 添加: 用于合并拖动操作
let lastRecordedRotateState = null; // <<<--- 添加: 用于合并旋转操作
let lastRecordedPropertyState = null; // <<<--- 添加: 用于合并属性修改
let ongoingActionState = null; // { type: 'multi-move'/'rotate'/'property', component: comp, startValue: val, propName?: string }

// 获取或初始化 HistoryManager
function getHistoryManager() {
    if (!historyManager && typeof HistoryManager !== 'undefined') {
        historyManager = new HistoryManager();
        window.historyManager = historyManager;
    }
    return historyManager;
}
// --- Alignment Guides State ---
let activeGuides = []; // Array to store currently active guide lines to draw
const SNAP_THRESHOLD = 5.0; // Pixel distance threshold for snapping/showing guides (in logical coords)
const GUIDE_COLOR = 'rgba(0, 255, 255, 0.75)'; // 亮青色 (Cyan)
const GUIDE_DASH = [3, 3]; // 可以尝试不同的虚线模式，或设置为空数组 
// --- Grid Settings ---
const GRID_SIZE = 50; // Grid spacing in logical coordinates (should match drawGrid)
const GRID_SNAP_THRESHOLD = 10.0; // Max distance (logical coords) to snap to grid
let enableGridSnap = true; // <<<--- Add a flag to easily toggle snapping

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

// --- 场景修改状态管理 ---
/**
 * 标记场景已修改
 * 触发 sceneModified 事件，更新 UI 显示
 */
function markSceneAsModified() {
    const wasModified = sceneModified;
    sceneModified = true;
    
    // 触发自定义事件，通知 UI 更新
    document.dispatchEvent(new CustomEvent('sceneModified'));
    
    if (!wasModified) {
        console.log('[Scene] Marked as modified');
    }
    
    // 同时通知 ProjectManager（如果存在）
    if (window.unifiedProjectPanel) {
        const pm = window.unifiedProjectPanel.getProjectManager();
        if (pm && pm.markSceneAsModified) {
            pm.markSceneAsModified();
        }
    }
}

/**
 * 标记场景已保存
 * 触发 sceneSaved 事件，更新 UI 显示
 */
function markSceneAsSaved() {
    const wasModified = sceneModified;
    sceneModified = false;
    
    // 触发自定义事件，通知 UI 更新
    document.dispatchEvent(new CustomEvent('sceneSaved'));
    
    if (wasModified) {
        console.log('[Scene] Marked as saved');
    }
}

/**
 * 检查是否有未保存的更改
 * @returns {boolean}
 */
function hasUnsavedChanges() {
    return sceneModified;
}

/**
 * 保存当前场景到项目
 * 通过 Ctrl+S 触发
 * - 如果有打开的项目场景：直接保存
 * - 如果没有打开的项目场景：弹出"另存为"对话框，让用户选择保存位置
 */
async function saveCurrentSceneToProject() {
    console.log('[Save] Ctrl+S triggered - saving current scene...');
    
    // 检查是否有打开的项目和场景
    if (!window.unifiedProjectPanel) {
        console.log('[Save] No project panel available, using export as save');
        await exportSceneAsFile();
        return;
    }
    
    const projectManager = window.unifiedProjectPanel.getProjectManager();
    const currentProject = projectManager.getCurrentProject();
    const currentScene = projectManager.getCurrentScene();
    
    // 如果没有打开的项目或场景，使用"另存为"功能
    if (!currentProject || !currentScene) {
        console.log('[Save] No project/scene open, using export as save');
        await exportSceneAsFile();
        return;
    }
    
    // 如果没有修改，不需要保存
    if (!sceneModified) {
        console.log('[Save] No changes to save');
        showTemporaryMessage('没有需要保存的更改', 'info');
        return;
    }
    
    try {
        // 获取当前画布数据
        const settings = {
            mode: currentMode || 'ray_trace',
            showGrid: showGrid !== false,
            maxRays: window.maxRaysPerSource || 100,
            maxBounces: window.globalMaxBounces || 50,
            minIntensity: window.globalMinIntensity || 0.001,
            showArrows: globalShowArrows || false,
            arrowSpeed: arrowAnimationSpeed || 100,
            fastWhiteLightMode: window.fastWhiteLightMode || false
        };
        
        console.log('[Save] Saving scene with', components.length, 'components');
        
        // 保存场景
        await projectManager.saveScene(components, settings);
        
        // 标记为已保存
        markSceneAsSaved();
        
        showTemporaryMessage(`场景 "${currentScene.name}" 已保存`, 'success');
        console.log('[Save] Scene saved successfully:', currentScene.name);
    } catch (err) {
        console.error('[Save] Failed to save scene:', err);
        showTemporaryMessage(`保存失败: ${err.message}`, 'error');
    }
}

// Helper function to convert hex color to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Animation State ---
let arrowAnimationStartTime = 0; // Time when arrows were last enabled
let globalShowArrows = false; // Global toggle for showing any arrows
let onlyShowSelectedSourceArrow = false; // Mode: show all vs. only selected source's arrow
let arrowAnimationSpeed = 100; // Speed pixels/sec (or units/sec)
let showArrowTrail = false; // 禁用箭头拖影
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
                arrowAnimationStates.set(index, { // Use original index in currentRayPaths as key
                    distance: currentDistance,
                    pathLength: pathLength,
                    pathPoints: pathPoints, // Store points for drawing
                    sourceId: ray.sourceId   // Store sourceId for filtering
                });
            }
        } // End if (ray instanceof Ray && ray.animateArrow)
    }); // End forEach currentRayPaths

    // 清理无效的状态（防止内存泄漏）
    const validIndices = new Set(currentRayPaths.map((_, index) => index));
    for (const [index] of arrowAnimationStates) {
        if (!validIndices.has(index)) {
            arrowAnimationStates.delete(index);
        }
    }
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
    // 确保 cameraOffset 已初始化
    if (!cameraOffset) {
        if (!initVectorVariables()) return;
    }
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

    // Clear canvas area with theme-aware canvas background from CSS variable
    const cssVarsSource = document.body || document.documentElement;
    const computed = getComputedStyle(cssVarsSource);
    const canvasBg = computed.getPropertyValue('--canvas-bg').trim() || '#111111';
    const canvasGridColor = computed.getPropertyValue('--canvas-grid').trim() || 'rgba(255, 255, 255, 0.05)';
    // Bypass theme guard for the background fill so white canvas remains pure white
    ctx.__bypassThemeGuard = true;
    ctx.fillStyle = canvasBg;
    ctx.__bypassThemeGuard = false;
    ctx.fillRect(viewPortMinX, viewPortMinY, viewPortLogicalWidth, viewPortLogicalHeight);
    // Draw grid background using theme-aware grid color
    drawGrid(ctx, 50, canvasGridColor);

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

    // Draw all components with user content filtering
    // 检查是否为绘图模式
    const isDiagramModeActive = diagramModeIntegration?.isDiagramMode?.() || false;
    
    components.forEach(comp => {
        try {
            // 在绘图模式下，尝试使用专业图标渲染
            let drawnWithProfessionalIcon = false;
            if (isDiagramModeActive && diagramModeIntegration) {
                drawnWithProfessionalIcon = diagramModeIntegration.renderComponentWithProfessionalIcon(ctx, comp);
            }
            
            // 如果没有使用专业图标，使用默认渲染
            if (!drawnWithProfessionalIcon) {
                comp.draw(ctx); // Draw the component itself
            }

            // Draw selection highlight (which includes angle handle)
            // The base GameObject.drawSelection handles the angle handle part.
            // Subclasses might override drawSelection to add more highlights.
            if (comp === selectedComponent || selectedComponents.includes(comp)) {
                comp.drawSelection(ctx);
            }

        } catch (e) {
            console.error(`Error drawing component ${comp?.label}:`, e, comp);
        }
    }); // End drawing components loop
    
    // --- 绘图模式专业元素渲染 ---
    if (isDiagramModeActive && diagramModeIntegration) {
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;
        const logicalHeight = canvas.height / dpr;
        diagramModeIntegration.renderProfessionalDiagram(ctx, components, logicalWidth, logicalHeight);
        
        // 更新小地图
        diagramModeIntegration.updateMinimap(components, [], {
            x: -cameraOffset.x / cameraScale,
            y: -cameraOffset.y / cameraScale,
            width: logicalWidth / cameraScale,
            height: logicalHeight / cameraScale,
            scale: cameraScale
        });
    }
    // --- End 绘图模式专业元素渲染 ---



    // --- Draw Alignment Guides ---
    if (isDragging && activeGuides.length > 0) {
        // const dpr = window.devicePixelRatio || 1; // No longer needed directly here if scaling context
        ctx.save();
        ctx.strokeStyle = GUIDE_COLOR; // Defined constant: 'rgba(0, 255, 255, 0.75)'
        ctx.lineWidth = 1 / cameraScale; // Make line thinner when zoomed in
        ctx.setLineDash(GUIDE_DASH.map(d => d / cameraScale)); // Scale dash pattern with zoom

        activeGuides.forEach(guide => {
            ctx.beginPath();
            if (guide.type === 'vertical') {
                ctx.moveTo(guide.x, guide.y1);
                ctx.lineTo(guide.x, guide.y2);
            } else if (guide.type === 'horizontal') {
                ctx.moveTo(guide.x1, guide.y);
                ctx.lineTo(guide.x2, guide.y);
            }
            ctx.stroke();
        });

        ctx.restore(); // Restore line dash and style
    }
    // --- End Draw Alignment Guides ---


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
                                // 绘制箭头拖影（如果启用）
                                if (showArrowTrail) {
                                    // 绘制箭头轨迹线（半透明的线段）
                                    ctx.save();
                                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'; // 半透明黄色
                                    ctx.lineWidth = arrowSize / 2;
                                    ctx.lineCap = 'round';

                                    // 绘制从起点到当前位置的轨迹
                                    ctx.beginPath();
                                    ctx.moveTo(p1.x, p1.y);
                                    ctx.lineTo(arrowPos.x, arrowPos.y);
                                    ctx.stroke();
                                    ctx.restore();
                                }

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

    // Create a temporary dummy component at mouse position for drawing its preview
    let previewComp = null;
    const previewPos = mousePos.clone();
    try {
        // 大多数光学元件默认应该是竖直放置的（90°），与光路垂直
        // 光源默认朝右（0°）
        // 注意：这里的参数必须与 handleMouseDown 中的元件创建代码完全一致！
        switch (componentToAdd) {
            // 光源类 - 默认朝右 (0°)
            case 'LaserSource': previewComp = new LaserSource(previewPos, 0); break;
            case 'FanSource': previewComp = new FanSource(previewPos, 0); break;
            case 'LineSource': previewComp = new LineSource(previewPos, 0); break;
            case 'WhiteLightSource': previewComp = new WhiteLightSource(previewPos, 0); break;
            
            // 镜子类 - 默认竖直 (90°)
            case 'Mirror': previewComp = new Mirror(previewPos, 100, 90); break;
            case 'SphericalMirror': previewComp = new SphericalMirror(previewPos, 200, 90, 90); break;
            case 'ParabolicMirror': previewComp = new ParabolicMirror(previewPos, 100, 100, 90); break;
            case 'ConcaveMirror': previewComp = new SphericalMirror(previewPos, 200, 90, 90); break;
            case 'ConvexMirror': previewComp = new SphericalMirror(previewPos, -200, 90, 90); break;
            case 'ParabolicMirrorToolbar': previewComp = new ParabolicMirror(previewPos, 100, 100, 90); break;
            
            // 屏幕 - 默认竖直 (90°)
            case 'Screen': previewComp = new Screen(previewPos, 150, 90); break;
            
            // 透镜类 - 默认竖直 (90°)
            case 'ThinLens': previewComp = new ThinLens(previewPos, 80, 150, 90); break;
            
            // 光阑/狭缝 - 默认竖直 (90°)
            case 'Aperture': previewComp = new Aperture(previewPos, 150, 1, 10, 20, 90); break;
            
            // 偏振器件 - 默认竖直 (90°)
            case 'Polarizer': previewComp = new Polarizer(previewPos, 100, 0, 90); break;
            case 'HalfWavePlate': previewComp = new HalfWavePlate(previewPos, 80, 0, 90); break;
            case 'QuarterWavePlate': previewComp = new QuarterWavePlate(previewPos, 80, 0, 90); break;
            
            // 分束器 - 默认45°
            case 'BeamSplitter': previewComp = new BeamSplitter(previewPos, 80, 45); break;
            
            // 介质块 - 默认0°（水平放置）
            case 'DielectricBlock': previewComp = new DielectricBlock(previewPos, 100, 60, 0); break;
            
            // 探测器 - 默认竖直 (90°)
            case 'Photodiode': previewComp = new Photodiode(previewPos, 90, 20); break;
            
            // 光纤 - 默认0°
            case 'OpticalFiber': previewComp = new OpticalFiber(previewPos, undefined, 0); break;
            
            // 棱镜 - 默认0°
            case 'Prism': previewComp = new Prism(previewPos, 100, 60, 0); break;
            
            // 衍射光栅 - 默认竖直 (90°)
            case 'DiffractionGrating': previewComp = new DiffractionGrating(previewPos, 100, 1.0, 90); break;
            
            // 声光调制器 - 默认0°
            case 'AcoustoOpticModulator': previewComp = new AcoustoOpticModulator(previewPos, undefined, undefined, 0); break;
            
            // 法拉第器件 - 默认0°
            case 'FaradayRotator': previewComp = new FaradayRotator(previewPos, undefined, undefined, 0); break;
            case 'FaradayIsolator': previewComp = new FaradayIsolator(previewPos, undefined, undefined, 0); break;
            
            // 自定义元件 - 默认0°
            case 'CustomComponent': previewComp = new CustomComponent(previewPos, undefined, undefined, 0); break;
            
            // === 新增元件 ===
            // 新光源
            case 'PointSource': previewComp = new PointSource(previewPos, 0); break;
            case 'LEDSource': previewComp = new LEDSource(previewPos, 0); break;
            case 'PulsedLaserSource': previewComp = new PulsedLaserSource(previewPos, 0); break;
            
            // 新反射镜
            case 'DichroicMirror': previewComp = new DichroicMirror(previewPos, 100, 90); break;
            case 'MetallicMirror': previewComp = new MetallicMirror(previewPos, 100, 90); break;
            case 'RingMirror': previewComp = new RingMirror(previewPos, 60, 30, 90); break;
            
            // 新透镜
            case 'CylindricalLens': previewComp = new CylindricalLens(previewPos, 80, 150, 90); break;
            case 'AsphericLens': previewComp = new AsphericLens(previewPos, 80, 150, 90); break;
            case 'GRINLens': previewComp = new GRINLens(previewPos, 60, 40, 90); break;
            
            // 新偏振器件
            case 'WollastonPrism': previewComp = new WollastonPrism(previewPos, 60, 40, 0); break;
            
            // 新探测器
            case 'CCDCamera': previewComp = new CCDCamera(previewPos, 80, 60, 90); break;
            case 'Spectrometer': previewComp = new Spectrometer(previewPos, 80, 50, 90); break;
            case 'PowerMeter': previewComp = new PowerMeter(previewPos, 40, 90); break;
            case 'PolarizationAnalyzer': previewComp = new PolarizationAnalyzer(previewPos, 60, 50, 90); break;
            
            // 调制器
            case 'ElectroOpticModulator': previewComp = new ElectroOpticModulator(previewPos, 60, 30, 0); break;
            case 'VariableAttenuator': previewComp = new VariableAttenuator(previewPos, 50, 90); break;
            case 'OpticalChopper': previewComp = new OpticalChopper(previewPos, 50, 90); break;
            
            // 原子物理
            case 'AtomicCell': previewComp = new AtomicCell(previewPos, 80, 50, 0); break;
            case 'MagneticCoil': previewComp = new MagneticCoil(previewPos, 60, 0); break;
            
            // 干涉仪
            case 'FabryPerotCavity': previewComp = new FabryPerotCavity(previewPos, 100, 0); break;
        }

        if (previewComp) {
            // Use the component's own draw method for the preview
            previewComp.selected = false; // Ensure it's not drawn as selected
            
            // 在绘图模式下，尝试使用专业图标渲染预览
            const isDiagramModeActive = diagramModeIntegration?.isDiagramMode?.() || false;
            let drawnWithProfessionalIcon = false;
            if (isDiagramModeActive && diagramModeIntegration) {
                drawnWithProfessionalIcon = diagramModeIntegration.renderComponentWithProfessionalIcon(ctx, previewComp);
            }
            
            // 如果没有使用专业图标，使用默认渲染
            if (!drawnWithProfessionalIcon) {
                previewComp.draw(ctx);
            }
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


// --- REPLACEMENT for updateInspector (V2 - With Property Grouping) ---
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

        // --- Create and Add the new Info Header ---
        const infoHeader = document.createElement('div');
        infoHeader.className = 'inspector-info-header';

        const title = document.createElement('h3');
        title.textContent = selectedComponent.label;
        infoHeader.appendChild(title);

        if (selectedComponent.constructor.functionDescription) {
            const funcDesc = document.createElement('p');
            funcDesc.className = 'component-function';
            funcDesc.textContent = selectedComponent.constructor.functionDescription;
            infoHeader.appendChild(funcDesc);
        }

        const notesContainer = document.createElement('div');
        notesContainer.className = 'prop notes-prop';
        const notesLabel = document.createElement('label');
        notesLabel.htmlFor = 'component-notes-textarea';
        notesLabel.textContent = '备注:';
        const notesTextarea = document.createElement('textarea');
        notesTextarea.id = 'component-notes-textarea';
        notesTextarea.value = selectedComponent.notes || '';
        notesTextarea.placeholder = '可在此添加备注信息...';
        notesTextarea.onchange = (e) => handlePropertyChange('notes', e.target.value, true);
        notesContainer.appendChild(notesLabel);
        notesContainer.appendChild(notesTextarea);
        infoHeader.appendChild(notesContainer);

        inspectorContent.appendChild(infoHeader);
        // --- End of Info Header ---

        // --- Divider ---
        const hr = document.createElement('hr');
        hr.className = 'prop-group-divider';
        inspectorContent.appendChild(hr);

        let props;
        try {
            props = selectedComponent.getProperties(); // Get properties from the component
            if (!props || typeof props !== 'object') {
                throw new Error("getProperties did not return a valid object.");
            }
            // console.log("[updateInspector] Properties received:", props); // DEBUG

            // --- Define Property Groups (Customize as needed) ---
            const propGroups = {
                'position': { label: '位置与角度', names: ['posX', 'posY', 'angleDeg', 'outputX', 'outputY', 'outputAngleDeg'] },
                'geometry': { label: '几何参数', names: ['length', 'diameter', 'width', 'height', 'baseLength', 'radiusOfCurvature', 'centralAngleDeg', 'focalLength', 'slitWidth', 'slitSeparation', 'numberOfSlits', 'coreDiameter', 'facetLength'] },
                'source': { label: '光源特性', names: ['enabled', 'wavelength', 'intensity', 'baseIntensity', 'rayCount', 'numRays', 'spreadDeg', 'fanAngleDeg', 'gaussianEnabled', 'initialBeamWaist', 'beamDiameter'] },
                'optical': { label: '光学特性', names: ['baseRefractiveIndex', 'refractiveIndex', 'dispersionCoeffB', 'dispersionCoeffB_nm2', 'splitRatio', 'pbsUnpolarizedReflectivity', 'type', 'quality', 'coated', 'chromaticAberration', 'sphericalAberration', 'numericalAperture', 'fiberIntrinsicEfficiency', 'transmissionLossDbPerKm', 'transmissionAxisAngleDeg', 'fastAxisAngleDeg', 'gratingPeriodInMicrons', 'maxOrder', 'rfFrequencyMHz', 'rfPower'] },
                'display': { label: '显示/状态', names: ['showPattern', 'showEvanescentWave', 'measuredPower', 'hitCount', 'currentCoupling', 'fiberLength', 'acceptanceAngle', 'diffractionAngle', 'efficiency0', 'efficiency1', 'wavelengthInfo', 'isThickLens'] },
                'physics': { label: '物理选项', names: ['ignoreDecay', 'absorptionCoeff'] }
                // 'other': { label: '其它', names: [] } // Catch-all group is handled implicitly later
            };
            const groupedProps = {}; // Object to hold props sorted by group
            const assignedProps = new Set(); // Keep track of properties already assigned

            // Populate groupedProps based on defined groups
            for (const groupKey in propGroups) {
                groupedProps[groupKey] = []; // Initialize group array
                propGroups[groupKey].names.forEach(name => {
                    if (props[name]) { // Check if the property exists for this component
                        groupedProps[groupKey].push({ name: name, data: props[name] });
                        assignedProps.add(name); // Mark as assigned
                    }
                });
            }

            // Add remaining props to an 'other' group implicitly
            groupedProps['other'] = [];
            for (const propName in props) {
                if (!assignedProps.has(propName)) { // If not assigned to a specific group
                    groupedProps['other'].push({ name: propName, data: props[propName] });
                }
            }
            // --- End Grouping Logic ---

            // --- Loop to Render Groups and their Properties ---
            const groupOrder = ['position', 'geometry', 'source', 'optical', 'physics', 'display', 'other']; // Define drawing order
            let groupAdded = false; // Track if any group has been added (for HR placement)

            groupOrder.forEach(groupKey => {
                const propertiesInGroup = groupedProps[groupKey];

                // Only render group if it has properties AND they are not all invalid/empty
                if (propertiesInGroup && propertiesInGroup.length > 0 && propertiesInGroup.some(p => p.data)) {

                    // Add a separator before the group (except the very first one that gets added)
                    if (groupAdded) {
                        const hr = document.createElement('hr');
                        hr.className = 'prop-group-divider';
                        inspectorContent.appendChild(hr);
                    }

                    // Add group title (use defined label or fallback)
                    const groupLabel = (propGroups[groupKey]?.label) || '其它属性';
                    const titleEl = document.createElement('h5');
                    titleEl.className = 'prop-group-title';
                    titleEl.textContent = groupLabel;
                    inspectorContent.appendChild(titleEl);
                    groupAdded = true; // Mark that we've added content

                    // Loop through properties *within this group*
                    propertiesInGroup.forEach(propInfo => {
                        const propName = propInfo.name;
                        const propData = propInfo.data;

                        // --- Create and append the property input element ---
                        if (!propData || typeof propData !== 'object' || !propData.hasOwnProperty('value')) {
                            console.warn(`[updateInspector] Skipping invalid property data for '${propName}' in group '${groupKey}'.`);
                            return; // Skip this property if data is invalid
                        }

                        const { value, label, type = 'text', options, min, max, step, placeholder, readonly = false, title = '' } = propData;

                        const div = document.createElement('div');
                        div.className = 'prop'; // Class for individual property row styling

                        const labelEl = document.createElement('label');
                        labelEl.textContent = label ? label + ':' : propName + ':'; // Use provided label or fallback to name
                        const inputId = `prop-${propName}-${selectedComponent.id}-${Date.now()}`; // Generate a unique ID
                        labelEl.htmlFor = inputId;
                        if (title) { labelEl.title = title; } // Add tooltip if provided
                        div.appendChild(labelEl);

                        let inputEl; // Declare input element variable

                        // Create the appropriate input type
                        if (type === 'select' && Array.isArray(options)) {
                            inputEl = document.createElement('select');
                            options.forEach(opt => {
                                const optionEl = document.createElement('option');
                                optionEl.value = opt.value;
                                optionEl.textContent = opt.label;
                                // Use string comparison for select values
                                if (String(opt.value) == String(value)) {
                                    optionEl.selected = true;
                                }
                                inputEl.appendChild(optionEl);
                            });
                            // Attach final change handler for select
                            inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value, true);
                        } else if (type === 'checkbox') {
                            inputEl = document.createElement('input');
                            inputEl.type = 'checkbox';
                            inputEl.checked = !!value; // Ensure boolean conversion
                            // Attach final change handler for checkbox
                            inputEl.onchange = (e) => handlePropertyChange(propName, e.target.checked, true);
                        } else { // Default to text-based inputs (text, number, range, etc.)
                            inputEl = document.createElement('input');
                            inputEl.type = type;
                            // Handle null/undefined values appropriately for input value
                            inputEl.value = (value === null || value === undefined) ? '' : value;
                            // Set attributes if they exist
                            if (placeholder !== undefined) inputEl.placeholder = placeholder;
                            if (min !== undefined) inputEl.min = min;
                            if (max !== undefined) inputEl.max = max;
                            if (step !== undefined) inputEl.step = step;

                            // Add different listeners based on type for responsiveness vs final commit
                            if (type === 'range' || type === 'number') {
                                // 'input' fires continuously during drag/spin
                                inputEl.oninput = (e) => handlePropertyChange(propName, e.target.value, false);
                                // 'change' fires when value is committed (blur, enter)
                                inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value, true);
                            } else {
                                // For text, etc., only fire final change on blur/enter
                                inputEl.onchange = (e) => handlePropertyChange(propName, e.target.value, true);
                            }
                        }

                        // Apply disabled/readonly states and styles
                        const isDisabled = propData.disabled === true;
                        if (isDisabled) { inputEl.disabled = true; }
                        if (readonly) { inputEl.readOnly = true; }
                        if (isDisabled || readonly) {
                            inputEl.classList.add('readonly-or-disabled'); // Use class for styling
                        }

                        inputEl.id = inputId; // Assign the unique ID
                        div.appendChild(inputEl); // Add input to the property div
                        inspectorContent.appendChild(div); // Add property div to the inspector content
                        // --- End Create and append ---

                    }); // End loop through properties in group
                } // End if group has valid properties
            }); // End loop through groupOrder
            // --- End Loop to Render Groups ---

        } catch (e) {
            // Handle errors during property fetching or rendering
            console.error(` !!! Error calling getProperties or building inspector for ${selectedComponent.label}:`, e);
            inspectorContent.innerHTML = '<p class="placeholder-text error-text">加载属性时出错。</p>'; // Display error message
            if (deleteBtn) deleteBtn.disabled = true; // Disable delete if properties fail
        }

        // Ensure the properties tab is active after updating
        activateTab('properties-tab');

    } else { // No component selected
        if (deleteBtn) deleteBtn.disabled = true; // Disable delete button
        // Clear the properties tab and show placeholder text
        inspectorContent.innerHTML = '<p class="placeholder-text">请先选中一个元件...</p>';
        // Optionally switch to a different default tab when nothing is selected
        // activateTab('settings-tab'); // Example
    }
}
// --- END OF REPLACEMENT for updateInspector ---


// --- REPLACEMENT for handlePropertyChange (V5 - Enhanced Logging & Final Value Check) ---
function handlePropertyChange(propName, rawValue, isFinalChange = false) {
    if (!selectedComponent) return;

    // Log entry point
    // console.log(`handlePropertyChange: START - prop=${propName}, rawValue=${JSON.stringify(rawValue)}, isFinal=${isFinalChange}`);

    let commandOldValue;
    let startValueForOngoingAction; // Value when the continuous action (like slider drag) started

    // --- Get/Set Initial State ---
    if (!isFinalChange && ongoingActionState && ongoingActionState.type === 'property' &&
        ongoingActionState.component === selectedComponent &&
        ongoingActionState.propName === propName) {
        // --- Continue existing 'input' sequence (e.g., slider drag) ---
        startValueForOngoingAction = ongoingActionState.startValue; // Use the value from when the action began
        commandOldValue = startValueForOngoingAction; // Command should revert to the very beginning of the action
        // console.log(`  -> Continuing property action for ${propName}. Start value: ${JSON.stringify(startValueForOngoingAction)}`);
    } else {
        // --- Start new action OR handle a discrete 'change' event ---
        try {
            // Get current value *before* this specific change attempt
            // Use helper function for complex cases or direct access
            commandOldValue = getComponentPropertyValue(selectedComponent, propName);
        } catch (e) {
            console.warn(`  -> Failed to get current value for ${propName}. Error: ${e.message}. Using rawValue as fallback oldValue.`);
            commandOldValue = rawValue; // Less ideal, but fallback
        }
        startValueForOngoingAction = commandOldValue; // For new/discrete, the start value is the current value before this change
        // console.log(`  -> Starting new/discrete change for ${propName}. Old/Start value: ${JSON.stringify(commandOldValue)}`);

        // If starting a continuous 'input' sequence, record its initial state
        if (!isFinalChange) {
            ongoingActionState = { type: 'property', component: selectedComponent, propName: propName, startValue: startValueForOngoingAction };
            // console.log(`  -> Recorded ongoingActionState for continuous change of ${propName}.`);
        } else {
            // If it's a final change event, clear any previous *different* ongoing state
            // e.g., user dragged slider (input events), then typed in box (change event)
            if (ongoingActionState && (ongoingActionState.component !== selectedComponent || ongoingActionState.propName !== propName)) {
                ongoingActionState = null;
            }
            // If it IS a final change for the *same* property that had an ongoing state,
            // we'll use the startValueForOngoingAction captured earlier and clear ongoingActionState *later*.
        }
    }
    // --- End Initial State ---

    // --- Value Conversion & Validation ---
    let newValue = rawValue; // Start with the raw input value
    try {
        // Determine expected type based on component's property definition or old value
        const currentProps = selectedComponent.getProperties();
        const originalType = typeof commandOldValue; // Type before change attempt
        const inputTypeHint = currentProps[propName]?.type; // Type hint from getProperties

        if (inputTypeHint === 'number' || inputTypeHint === 'range' || originalType === 'number') {
            newValue = parseFloat(rawValue);
            if (isNaN(newValue)) {
                console.warn(`Invalid number input for ${propName}: '${rawValue}'. Reverting UI.`);
                if (isFinalChange) updateInspector(); // Revert UI on final invalid input
                return; // Stop processing invalid number
            }
        } else if (inputTypeHint === 'checkbox' || originalType === 'boolean') {
            newValue = !!rawValue; // Ensure boolean conversion
        }
        // Add more specific type conversions if needed (e.g., for Vectors if they come as strings)
    } catch (convError) {
        console.error(`Value conversion error for ${propName} (value: '${rawValue}'):`, convError);
        if (isFinalChange) updateInspector(); // Revert UI
        return;
    }
    // --- End Conversion ---

    // --- Set Property & Handle History ---
    try {
        // Apply the property change using the component's setProperty method
        selectedComponent.setProperty(propName, newValue);
        // Assume setProperty internally handles needsRetrace and sceneModified flags
        // console.log(`  -> Applied setProperty(${propName}, ${JSON.stringify(newValue)})`);

        // --- Add Command to History (Only on Final Change Commit) ---
        if (isFinalChange) {
            // console.log(`  -> Processing FINAL change for ${propName}.`);
            let finalValue;
            try {
                // Get the ACTUAL value *after* setProperty (it might have been clamped/modified)
                finalValue = getComponentPropertyValue(selectedComponent, propName);
                // console.log(`    -> Fetched final value: ${JSON.stringify(finalValue)}`);
            } catch (fetchError) {
                console.warn(`    -> Failed to fetch final value for ${propName} after setProperty. Using intermediate value. Error: ${fetchError.message}`);
                finalValue = newValue; // Use the value we attempted to set as fallback
            }

            // Compare initial value (startValueForOngoingAction) with the actual final value
            let valueChanged = !areValuesEqual(startValueForOngoingAction, finalValue);

            if (valueChanged) {
                console.log(`    -> Property ${propName} changed significantly: ${JSON.stringify(startValueForOngoingAction)} -> ${JSON.stringify(finalValue)}. Adding command.`);
                // Create and add the command using the initial value and the actual final value
                historyManager.addCommand(new SetPropertyCommand(selectedComponent, propName, startValueForOngoingAction, finalValue));
                updateUndoRedoUI(); // Update buttons/menu
                sceneModified = true; // Modification confirmed
                markSceneAsModified();
            } else {
                console.log(`    -> Property ${propName} did not change significantly from start value ${JSON.stringify(startValueForOngoingAction)}. No command added.`);
            }

            // Clear ongoing state ONLY after the final change is processed
            if (ongoingActionState && ongoingActionState.propName === propName && ongoingActionState.component === selectedComponent) {
                ongoingActionState = null;
                // console.log(`    -> Cleared ongoingActionState for ${propName}.`);
            }
            updateInspector(); // Refresh inspector UI to reflect the final state
        } // --- End of isFinalChange block ---

    } catch (e) {
        console.error(`Error during setProperty or history handling for ${propName}:`, e);
        if (isFinalChange) updateInspector(); // Revert UI on error
        ongoingActionState = null; // Clear state on error
    }
    // --- End Property Set & History ---
}

// --- Helper Function to get component property value robustly ---
function getComponentPropertyValue(component, propName) {
    try {
        // Prioritize special cases (like angles stored in radians)
        if (propName === 'angleDeg' && component.hasOwnProperty('angleRad')) return component.angleRad;
        if (propName === 'transmissionAxisAngleDeg' && component.hasOwnProperty('transmissionAxisRad')) return component.transmissionAxisRad;
        if (propName === 'fastAxisAngleDeg' && component.hasOwnProperty('fastAxisRad')) return component.fastAxisRad;
        if (propName === 'outputAngleDeg' && component instanceof OpticalFiber && component.hasOwnProperty('outputAngleRad')) return component.outputAngleRad;
        if (propName === 'outputPos' && component instanceof OpticalFiber && component.outputPos instanceof Vector) return component.outputPos.clone();
        if (propName === 'posX' && component.pos instanceof Vector) return component.pos.x;
        if (propName === 'posY' && component.pos instanceof Vector) return component.pos.y;
        if (propName === 'pos' && component.pos instanceof Vector) return component.pos.clone(); // For move command comparison

        // Fallback to direct property access
        let value = component[propName];

        // Check if value exists on component (or prototype)
        if (value === undefined && !(propName in component)) {
            // If not found directly, try getting it via getProperties as a last resort
            console.warn(`Property '${propName}' not found directly on ${component.label}. Trying getProperties().`);
            const propsData = component.getProperties();
            if (propsData && propsData[propName]) {
                value = propsData[propName].value; // Might be formatted string, less ideal
            } else {
                throw new Error(`Property '${propName}' not found.`);
            }
        }

        // Clone vectors to prevent accidental modification
        if (value instanceof Vector) {
            return value.clone();
        }
        // Add cloning for other object types if needed later

        return value;
    } catch (e) {
        console.error(`Error getting property '${propName}' from component ${component?.label}: ${e.message}`);
        throw e; // Re-throw to be caught by caller
    }
}

// --- Helper Function to compare values with tolerance ---
function areValuesEqual(val1, val2, tolerance = 1e-6) {
    if (val1 instanceof Vector && val2 instanceof Vector) {
        return val1.equals(val2, tolerance);
    }
    if (typeof val1 === 'number' && typeof val2 === 'number') {
        return Math.abs(val1 - val2) < tolerance;
    }
    // Add checks for other types if necessary (e.g., objects, arrays)
    return val1 === val2; // Default strict equality
}
// --- END OF REPLACEMENT ---


// --- REPLACEMENT for getMousePos function ---
function getMousePos(canvasElement, event) {
    // 确保 cameraOffset 已初始化
    if (!cameraOffset) {
        if (!initVectorVariables()) {
            return new Vector(0, 0);
        }
    }
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

// --- REPLACEMENT for handleMouseDown (V5 - Multi-Select Logic) ---
function handleMouseDown(event) {
    if (window.innerWidth <= 768) { closeSidebars(); } // Close sidebars on mobile tap

    // 确保 Vector 变量已初始化
    if (!cameraOffset) {
        if (!initVectorVariables()) return;
    }

    if (event.button === 1) { // Middle-click panning
        event.preventDefault(); isPanning = true; lastPanMousePos = new Vector(event.clientX, event.clientY); canvas.style.cursor = 'grabbing'; ongoingActionState = null; return;
    }
    if (event.button !== 0) return; // Only main button

    mouseIsDown = true;
    mousePos = getMousePos(canvas, event);
    isDragging = false;
    draggingComponents = []; // Use the array
    dragStartOffsets.clear(); // Clear previous offsets
    dragStartMousePos = mousePos.clone();
    ongoingActionState = null;

    // --- 绘图模式下的光线链接创建处理 ---
    const isDiagramModeActive = diagramModeIntegration?.isDiagramMode?.() || false;
    if (isDiagramModeActive && diagramModeIntegration) {
        const rayLinkManager = diagramModeIntegration.getModule('rayLinkManager');
        const connectionPointManager = diagramModeIntegration.getModule('connectionPointManager');
        
        // 检查是否点击了连接点（用于开始创建光线链接）
        if (connectionPointManager && rayLinkManager) {
            const clickedPoint = connectionPointManager.findPointAtPosition(mousePos, 15);
            if (clickedPoint) {
                // 如果正在创建链接，尝试完成
                if (rayLinkManager.editingLink) {
                    const link = rayLinkManager.finishLinkCreation();
                    if (link) {
                        console.log('光线链接创建完成:', link.id);
                        needsRetrace = true;
                        return;
                    }
                } else {
                    // 开始创建新链接
                    rayLinkManager.startLinkCreation(clickedPoint.componentId, clickedPoint.pointId);
                    console.log('开始创建光线链接:', clickedPoint.componentId, clickedPoint.pointId);
                    return;
                }
            } else if (rayLinkManager.editingLink) {
                // 点击空白处取消链接创建
                rayLinkManager.cancelLinkCreation();
                console.log('取消光线链接创建');
            }
        }
    }
    // --- End 绘图模式下的光线链接创建处理 ---

    // --- 优先处理工具放置：如果选择了工具，直接在点击位置创建元件 ---
    if (componentToAdd) {
        let newComp = null;
        const compPos = mousePos.clone();
        try {
            // 大多数光学元件默认应该是竖直放置的（90°），与光路垂直
            // 光源默认朝右（0°）
            switch (componentToAdd) {
                // 光源类 - 默认朝右 (0°)
                case 'LaserSource': newComp = new LaserSource(compPos, 0); break;
                case 'FanSource': newComp = new FanSource(compPos, 0); break;
                case 'LineSource': newComp = new LineSource(compPos, 0); break;
                case 'WhiteLightSource': newComp = new WhiteLightSource(compPos, 0); break;
                
                // 镜子类 - 默认竖直 (90°)
                case 'Mirror': newComp = new Mirror(compPos, 100, 90); break;
                case 'SphericalMirror': newComp = new SphericalMirror(compPos, 200, 90, 90); break;
                case 'ParabolicMirror': newComp = new ParabolicMirror(compPos, 100, 100, 90); break;
                case 'ConcaveMirror': newComp = new SphericalMirror(compPos, 200, 90, 90); break;
                case 'ConvexMirror': newComp = new SphericalMirror(compPos, -200, 90, 90); break;
                case 'ParabolicMirrorToolbar': newComp = new ParabolicMirror(compPos, 100, 100, 90); break;
                
                // 屏幕 - 默认竖直 (90°)
                case 'Screen': newComp = new Screen(compPos, 150, 90); break;
                
                // 透镜类 - 默认竖直 (90°)
                case 'ThinLens': newComp = new ThinLens(compPos, 80, 150, 90); break;
                
                // 光阑/狭缝 - 默认竖直 (90°)
                case 'Aperture': newComp = new Aperture(compPos, 150, 1, 10, 20, 90); break;
                
                // 偏振器件 - 默认竖直 (90°)
                case 'Polarizer': newComp = new Polarizer(compPos, 100, 0, 90); break;
                case 'HalfWavePlate': newComp = new HalfWavePlate(compPos, 80, 0, 90); break;
                case 'QuarterWavePlate': newComp = new QuarterWavePlate(compPos, 80, 0, 90); break;
                
                // 分束器 - 默认45°
                case 'BeamSplitter': newComp = new BeamSplitter(compPos, 80, 45); break;
                
                // 介质块 - 默认0°（水平放置）
                case 'DielectricBlock': newComp = new DielectricBlock(compPos, 100, 60, 0); break;
                
                // 探测器 - 默认竖直 (90°)
                case 'Photodiode': newComp = new Photodiode(compPos, 90, 20); break;
                
                // 光纤 - 默认0°
                case 'OpticalFiber': newComp = new OpticalFiber(compPos, undefined, 0); break;
                
                // 棱镜 - 默认0°
                case 'Prism': newComp = new Prism(compPos, 100, 60, 0); break;
                
                // 衍射光栅 - 默认竖直 (90°)
                case 'DiffractionGrating': newComp = new DiffractionGrating(compPos, 100, 1.0, 90); break;
                
                // 声光调制器 - 默认0°
                case 'AcoustoOpticModulator': newComp = new AcoustoOpticModulator(compPos, undefined, undefined, 0); break;
                
                // 法拉第器件 - 默认0°
                case 'FaradayRotator': newComp = new FaradayRotator(compPos, undefined, undefined, 0); break;
                case 'FaradayIsolator': newComp = new FaradayIsolator(compPos, undefined, undefined, 0); break;
                
                // 自定义元件 - 默认0°
                case 'CustomComponent': newComp = new CustomComponent(compPos, undefined, undefined, 0); break;
                
                // === 新增元件 ===
                // 新光源
                case 'PointSource': newComp = new PointSource(compPos, 0); break;
                case 'LEDSource': newComp = new LEDSource(compPos, 0); break;
                case 'PulsedLaserSource': newComp = new PulsedLaserSource(compPos, 0); break;
                
                // 新反射镜
                case 'DichroicMirror': newComp = new DichroicMirror(compPos, 100, 90); break;
                case 'MetallicMirror': newComp = new MetallicMirror(compPos, 100, 90); break;
                case 'RingMirror': newComp = new RingMirror(compPos, 60, 30, 90); break;
                
                // 新透镜
                case 'CylindricalLens': newComp = new CylindricalLens(compPos, 80, 150, 90); break;
                case 'AsphericLens': newComp = new AsphericLens(compPos, 80, 150, 90); break;
                case 'GRINLens': newComp = new GRINLens(compPos, 60, 40, 90); break;
                
                // 新偏振器件
                case 'WollastonPrism': newComp = new WollastonPrism(compPos, 60, 40, 0); break;
                
                // 新探测器
                case 'CCDCamera': newComp = new CCDCamera(compPos, 80, 60, 90); break;
                case 'Spectrometer': newComp = new Spectrometer(compPos, 80, 50, 90); break;
                case 'PowerMeter': newComp = new PowerMeter(compPos, 40, 90); break;
                case 'PolarizationAnalyzer': newComp = new PolarizationAnalyzer(compPos, 60, 50, 90); break;
                
                // 调制器
                case 'ElectroOpticModulator': newComp = new ElectroOpticModulator(compPos, 60, 30, 0); break;
                case 'VariableAttenuator': newComp = new VariableAttenuator(compPos, 50, 90); break;
                case 'OpticalChopper': newComp = new OpticalChopper(compPos, 50, 90); break;
                
                // 原子物理
                case 'AtomicCell': newComp = new AtomicCell(compPos, 80, 50, 0); break;
                case 'MagneticCoil': newComp = new MagneticCoil(compPos, 60, 0); break;
                
                // 干涉仪
                case 'FabryPerotCavity': newComp = new FabryPerotCavity(compPos, 100, 0); break;
                
                default: console.warn("Unknown component type:", componentToAdd);
            }
        } catch (e) { console.error(`Error creating new component ${componentToAdd}:`, e); }

        if (newComp) {
            const previousSelectionBeforeAdd = [...selectedComponents];
            selectedComponents.forEach(comp => comp.selected = false);
            selectedComponents = [newComp];
            selectedComponent = newComp;
            newComp.selected = true;
            components.push(newComp);
            historyManager.addCommand(new AddComponentCommand(newComp, components));
            historyManager.addCommand(new SelectCommand(previousSelectionBeforeAdd, selectedComponents));
            updateUndoRedoUI();
            updateInspector();
            needsRetrace = true;
            sceneModified = true;
            markSceneAsModified();
            
            // 在绘图模式下，初始化新组件的连接点
            if (diagramModeIntegration?.isDiagramMode?.()) {
                const connectionPointManager = diagramModeIntegration.getModule('connectionPointManager');
                if (connectionPointManager) {
                    connectionPointManager.initializeComponentPoints(newComp);
                }
            }
        }
        componentToAdd = null;
        clearToolbarSelection();
        canvas.style.cursor = 'default';
        return; // 工具放置完成，直接返回
    }
    // --- 工具放置处理结束 ---

    const isShiftPressed = event.shiftKey;
    const isCtrlCmdPressed = event.ctrlKey || event.metaKey; // Ctrl on Win/Linux, Cmd on Mac

    let clickedComponent = null;
    let clickedOnExistingSelection = false;
    let specificHandleClicked = false; // Track if a specific handle was hit

    // --- Determine what was clicked ---
    // 1. Check handles of the *last selected* component first (for single-object rotation etc.)
    // For now, multi-select rotation/handle interaction is deferred. Let's focus on selection/drag.
    // We need to decide if clicking a handle on one selected item should affect only that item or the group.
    // Let's assume handle interaction is only for the primary selected component for now.
    let primarySelected = selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1] : null; // Get last selected
    if (primarySelected) {
        // Check angle handle
        if (primarySelected.isPointOnAngleHandle && primarySelected.isPointOnAngleHandle(mousePos)) {
            clickedComponent = primarySelected; specificHandleClicked = true;
            // Don't modify selection if clicking handle of already selected item
        }
        // Check fiber handles (if applicable)
        else if (primarySelected instanceof OpticalFiber) {
            if (primarySelected._isPointOnOutputAngleHandle && primarySelected._isPointOnOutputAngleHandle(mousePos)) {
                clickedComponent = primarySelected; specificHandleClicked = true;
            } else if (primarySelected.outputPos && mousePos.distanceSquaredTo(primarySelected.outputPos) <= 8 * 8) {
                clickedComponent = primarySelected; specificHandleClicked = true;
            }
        }
    }

    // 2. If no specific handle hit, find component body under mouse
    if (!clickedComponent) {
        for (let i = components.length - 1; i >= 0; i--) {
            const comp = components[i];
            try {
                if (comp._containsPointBody(mousePos)) {
                    clickedComponent = comp;
                    break; // Found the topmost component under cursor
                }
                // Also check fiber output point specifically
                if (comp instanceof OpticalFiber && comp.outputPos && mousePos.distanceSquaredTo(comp.outputPos) <= 8 * 8) {
                    clickedComponent = comp;
                    break;
                }
            } catch (e) { console.error(`Error checking containsPoint for ${comp?.label}:`, e); }
        }
    }

    // --- Update Selection State ---
    const previousSelection = [...selectedComponents]; // Copy previous state for undo command
    let selectionChanged = false;

    if (clickedComponent) {
        const indexInSelection = selectedComponents.indexOf(clickedComponent);
        clickedOnExistingSelection = indexInSelection > -1;

        if (specificHandleClicked) {
            // --- Clicked Handle of Currently Selected Component ---
            // If the clicked component isn't the primary, make it primary
            if (clickedComponent !== primarySelected) {
                selectedComponents = selectedComponents.filter(c => c !== clickedComponent); // Remove if exists
                selectedComponents.push(clickedComponent); // Add to end (makes it primary)
                selectionChanged = true; // Selection order changed
            }
            // We will initiate dragging only for this component's handle later
        } else if (isShiftPressed || isCtrlCmdPressed) {
            // --- Shift/Ctrl Click on a Component ---
            if (clickedOnExistingSelection) {
                // Remove from selection
                selectedComponents.splice(indexInSelection, 1);
                selectionChanged = true;
            } else {
                // Add to selection
                selectedComponents.push(clickedComponent);
                selectionChanged = true;
            }
        } else {
            // --- Normal Click on a Component ---
            if (!clickedOnExistingSelection) {
                // Clicked a new component, deselect others
                selectedComponents.forEach(comp => comp.selected = false);
                selectedComponents = [clickedComponent];
                selectionChanged = true;
            } else {
                // Clicked on an already selected component without Shift/Ctrl.
                // Don't change selection here, prepare for potential drag of the group.
            }
        }

    } else { // Clicked empty space
        // --- Clicked Empty Space, No Tool Selected ---
        // (componentToAdd 已在函数开头处理，这里只处理清除选择)
        if (selectedComponents.length > 0) {
            selectionChanged = true; // Selection changing from N to 0
        }
        selectedComponents.forEach(comp => comp.selected = false);
        selectedComponents = []; // Clear selection
    }

    // --- Update Selection Visuals & Inspector ---
    // Mark all components in the current selection array as selected=true
    components.forEach(comp => comp.selected = selectedComponents.includes(comp));
    // Set the 'primary' selected component for the inspector (last one added/clicked)
    selectedComponent = selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1] : null;
    updateInspector();
    needsRetrace = true; // Redraw needed for selection change

    // --- Add Undo Command for Selection Change ---
    const currentSelectionIds = selectedComponents.map(c => c.id).sort();
    const previousSelectionIds = previousSelection.map(c => c.id).sort();
    if (JSON.stringify(currentSelectionIds) !== JSON.stringify(previousSelectionIds)) {
        // Selection actually changed, add the command
        historyManager.addCommand(new SelectCommand(previousSelection, selectedComponents)); // Use the arrays before they were potentially modified further
        updateUndoRedoUI(); // Update buttons now that a command is added
        console.log("Selection changed, SelectCommand added.");
        sceneModified = true; // Changing selection counts as modification
        markSceneAsModified();
    } else {
        // console.log("Selection state did not change."); // Optional log
    }
    // --- End Add Undo Command ---


    // --- Initiate Dragging ---
    // Start dragging if clicked on a component (handle or body) that is currently selected
    if (clickedComponent && selectedComponents.includes(clickedComponent)) {
        isDragging = true;
        canvas.style.cursor = 'grabbing';

        if (specificHandleClicked) {
            // --- Dragging a specific handle (only the primary component moves/rotates) ---
            draggingComponents = [clickedComponent]; // Only drag the clicked one
            clickedComponent.startDrag(mousePos); // Let component determine handle type
            // Record state for single component move/rotate
            if (clickedComponent.dragging) {
                ongoingActionState = { type: 'move', component: clickedComponent, startValue: clickedComponent.pos.clone() };
            } else if (clickedComponent.isDraggingAngle) {
                ongoingActionState = { type: 'rotate', component: clickedComponent, startValue: clickedComponent.angleRad };
            } else if (clickedComponent instanceof OpticalFiber) {
                if (clickedComponent.draggingOutput) { ongoingActionState = { type: 'move_fiber_output', component: clickedComponent, startValue: clickedComponent.outputPos.clone() }; }
                else if (clickedComponent.draggingOutputAngle) { ongoingActionState = { type: 'rotate_fiber_output', component: clickedComponent, startValue: clickedComponent.outputAngleRad }; }
            }
        } else {
            // --- Dragging the body (move all selected components) ---
            draggingComponents = [...selectedComponents]; // Drag all selected
            const startPositions = new Map(); // Use Map for start values { compId -> Vector }
            draggingComponents.forEach(comp => {
                if (comp.pos instanceof Vector) {
                    dragStartOffsets.set(comp.id, comp.pos.subtract(mousePos));
                    startPositions.set(comp.id, comp.pos.clone());
                } else {
                    console.warn(`Component ${comp.id} in multi-drag has no valid position.`);
                }
            });
            ongoingActionState = { type: 'multi-move', components: draggingComponents.map(c => c.id), startValues: startPositions };
            console.log(`Starting multi-drag for ${draggingComponents.length} components.`);
        }
    } else {
        isDragging = false;
        draggingComponents = [];
    }
}
// --- END REPLACEMENT ---

// --- REPLACEMENT for handleMouseMove (V6 - Fixed Snapping & Guides for Single Drag) ---
function handleMouseMove(event) {
    const currentMousePos = getMousePos(canvas, event);
    mousePos = currentMousePos; // Update global mouse position

    // --- 绘图模式下的光线链接更新 ---
    const isDiagramModeActive = diagramModeIntegration?.isDiagramMode?.() || false;
    if (isDiagramModeActive && diagramModeIntegration) {
        const rayLinkManager = diagramModeIntegration.getModule('rayLinkManager');
        const connectionPointManager = diagramModeIntegration.getModule('connectionPointManager');
        
        // 更新正在创建的链接
        if (rayLinkManager?.editingLink) {
            rayLinkManager.updateLinkCreation(currentMousePos);
            needsRetrace = true;
        }
        
        // 更新连接点悬停状态
        if (connectionPointManager) {
            connectionPointManager.handleMouseMove(currentMousePos);
        }
        
        // 更新光线链接悬停状态
        if (rayLinkManager) {
            rayLinkManager.handleMouseMove(currentMousePos);
        }
    }
    // --- End 绘图模式下的光线链接更新 ---

    // --- Panning Logic ---
    if (isPanning) {
        if (lastPanMousePos) {
            const currentPanClientPos = new Vector(event.clientX, event.clientY);
            const delta = currentPanClientPos.subtract(lastPanMousePos);
            cameraOffset = cameraOffset.add(delta);
            lastPanMousePos = currentPanClientPos;
            needsRetrace = true;
        }
        canvas.style.cursor = 'grabbing';
        return;
    } // --- End Panning ---

    // --- Component Dragging Logic ---
    if (isDragging && draggingComponents.length > 0) {
        canvas.style.cursor = 'grabbing';
        activeGuides = []; // Reset guides at the start of every move event during drag

        // --- Handle Specific Handle Drags (Rotation, Fiber Ends) ---
        // These usually involve only one component, even if others are selected.
        // ongoingActionState helps identify the specific drag type.
        if (ongoingActionState && ongoingActionState.type !== 'multi-move') {
            const componentBeingHandled = ongoingActionState.component; // Component whose handle is dragged
            if (componentBeingHandled && draggingComponents.includes(componentBeingHandled)) { // Ensure it's in the list
                try {
                    componentBeingHandled.drag(currentMousePos); // Let component handle its specific handle logic
                    // No snapping or alignment guides for handle drags currently
                } catch (e) { console.error(`Error during handle drag for ${componentBeingHandled?.label}:`, e); }
                needsRetrace = true;
                sceneModified = true;
                return; // Stop processing, handle drag is exclusive
            }
        }

        // --- Handle Multi-Component Body Drag ---
        // This applies if ongoingActionState.type === 'multi-move', OR if
        // a single selected component's body is clicked (which sets draggingComponents=[comp]
        // and ongoingActionState.type='multi-move' effectively, though we should refine that state naming later).

        // Use the *primary* selected component for snapping reference if dragging multiple.
        // If dragging only one, primaryDraggedComponent will be that one.
        const primaryDraggedComponent = selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1] : draggingComponents[0]; // Fallback just in case
        let primaryOriginalPosBeforeSnap = null; // Store position before snapping is applied this frame
        let finalTargetX = null;
        let finalTargetY = null;
        let snappedX = false;
        let snappedY = false;

        // 1. Calculate Potential Positions based on mouse delta
        const potentialPositions = new Map(); // { compId -> potentialPos }
        draggingComponents.forEach(comp => {
            const offset = dragStartOffsets.get(comp.id);
            if (offset) {
                const potentialPos = currentMousePos.add(offset);
                potentialPositions.set(comp.id, potentialPos);
                if (comp === primaryDraggedComponent) {
                    primaryOriginalPosBeforeSnap = potentialPos.clone(); // Store primary's potential position
                }
            }
        });

        // 2. Determine Snapping Targets based on the primary component's potential position
        if (primaryDraggedComponent && primaryOriginalPosBeforeSnap && enableGridSnap) { // Check grid only if enabled
            const currentPos = primaryOriginalPosBeforeSnap; // Check against the potential position
            targetX = currentPos.x;
            targetY = currentPos.y;

            // --- Grid Snap Check ---
            const nearestGridX = Math.round(currentPos.x / GRID_SIZE) * GRID_SIZE;
            const nearestGridY = Math.round(currentPos.y / GRID_SIZE) * GRID_SIZE;
            const distSqX = (currentPos.x - nearestGridX) ** 2;
            const distSqY = (currentPos.y - nearestGridY) ** 2;
            const snapThresholdSq = (GRID_SNAP_THRESHOLD / cameraScale) ** 2;

            if (distSqX < snapThresholdSq) { targetX = nearestGridX; snappedX = true; }
            if (distSqY < snapThresholdSq) { targetY = nearestGridY; snappedY = true; }
            // --- End Grid Snap Check ---

            // --- Component Snap Check (Overrides grid if closer) ---
            let minSnapDistX = snappedX ? Math.abs(currentPos.x - targetX) : (SNAP_THRESHOLD / cameraScale);
            let minSnapDistY = snappedY ? Math.abs(currentPos.y - targetY) : (SNAP_THRESHOLD / cameraScale);
            let guidesToShow = []; // Temporary store for potential guides

            components.forEach(otherComp => {
                if (!draggingComponents.includes(otherComp) && otherComp.pos instanceof Vector) {
                    const otherCenter = otherComp.pos;
                    const dx = Math.abs(currentPos.x - otherCenter.x); // Compare potential pos with others
                    const dy = Math.abs(currentPos.y - otherCenter.y);
                    const scaledCompSnapThreshold = SNAP_THRESHOLD / cameraScale;

                    if (dx < scaledCompSnapThreshold) {
                        // Store potential guide info
                        guidesToShow.push({ type: 'vertical', x: otherCenter.x, y1: Math.min(currentPos.y, otherCenter.y) - 20 / cameraScale, y2: Math.max(currentPos.y, otherCenter.y) + 20 / cameraScale });
                        if (dx < minSnapDistX) { // Found a closer X snap
                            minSnapDistX = dx; targetX = otherCenter.x; snappedX = true;
                        }
                    }
                    if (dy < scaledCompSnapThreshold) {
                        guidesToShow.push({ type: 'horizontal', y: otherCenter.y, x1: Math.min(currentPos.x, otherCenter.x) - 20 / cameraScale, x2: Math.max(currentPos.x, otherCenter.x) + 20 / cameraScale });
                        if (dy < minSnapDistY) {
                            minSnapDistY = dy; targetY = otherCenter.y; snappedY = true;
                        }
                    }
                }
            });
            // --- End Component Snap Check ---

            finalTargetX = targetX; // Store the final snap target decided
            finalTargetY = targetY;

            // Filter guides based on final snap decision
            if (snappedX || snappedY) {
                activeGuides = guidesToShow.filter(guide =>
                    (snappedX && guide.type === 'vertical' && Math.abs(guide.x - finalTargetX) < 1e-3) ||
                    (snappedY && guide.type === 'horizontal' && Math.abs(guide.y - finalTargetY) < 1e-3)
                );
            }

        } // End if primary component exists and snapping enabled

        // 3. Apply Final Positions to ALL Dragged Components
        draggingComponents.forEach(comp => {
            let newPosX = potentialPositions.get(comp.id)?.x ?? comp.pos.x; // Start with potential pos
            let newPosY = potentialPositions.get(comp.id)?.y ?? comp.pos.y;

            // If snapping occurred, adjust position relative to the primary component's snap
            if (primaryDraggedComponent && primaryOriginalPosBeforeSnap && (snappedX || snappedY)) {
                const primaryDeltaX = snappedX ? finalTargetX - primaryOriginalPosBeforeSnap.x : 0;
                const primaryDeltaY = snappedY ? finalTargetY - primaryOriginalPosBeforeSnap.y : 0;
                newPosX += primaryDeltaX;
                newPosY += primaryDeltaY;
            }

            // Apply the calculated position and update geometry if changed
            if (!comp.pos.equals(new Vector(newPosX, newPosY), 1e-6)) {
                comp.pos.set(newPosX, newPosY);
                if (typeof comp.onPositionChanged === 'function') { try { comp.onPositionChanged(); } catch (e) { } }
                if (typeof comp._updateGeometry === 'function') { try { comp._updateGeometry(); } catch (e) { } }
            }
        }); // End loop applying positions

        needsRetrace = true;
        sceneModified = true;
        return; // Stop further cursor checks if dragging
    } // --- End Component Dragging Logic ---

    // --- Hover Cursor Logic ---
    // (Existing hover logic - NO CHANGES NEEDED HERE, should be the same as previous version)
    let newCursor = 'default';
    if (componentToAdd) {
        newCursor = 'crosshair';
    } else {
        let hoveredComponent = null;
        let hoverType = 'body';
        let primarySelectedHover = selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1] : null;
        if (primarySelectedHover) {
            if (primarySelectedHover.isPointOnAngleHandle && primarySelectedHover.isPointOnAngleHandle(currentMousePos)) { hoveredComponent = primarySelectedHover; hoverType = 'angle'; }
            else if (primarySelectedHover instanceof OpticalFiber && primarySelectedHover._isPointOnOutputAngleHandle && primarySelectedHover._isPointOnOutputAngleHandle(currentMousePos)) { hoveredComponent = primarySelectedHover; hoverType = 'output_angle'; }
            else if (primarySelectedHover instanceof OpticalFiber && primarySelectedHover.outputPos && currentMousePos.distanceSquaredTo(primarySelectedHover.outputPos) <= 8 * 8) { hoveredComponent = primarySelectedHover; hoverType = 'output_pos'; }
        }
        if (!hoveredComponent) {
            for (let i = components.length - 1; i >= 0; i--) {
                const comp = components[i];
                try {
                    if (comp._containsPointBody && comp._containsPointBody(currentMousePos)) { hoveredComponent = comp; hoverType = 'body'; break; }
                    if (comp instanceof OpticalFiber && comp.outputPos && currentMousePos.distanceSquaredTo(comp.outputPos) <= 8 * 8) { hoveredComponent = comp; hoverType = 'output_pos'; break; }
                } catch (e) { /* Ignore */ }
            }
        }
        if (hoveredComponent) {
            if (selectedComponents.includes(hoveredComponent)) {
                if (hoverType === 'angle' || hoverType === 'output_angle') newCursor = 'pointer';
                else if (hoverType === 'output_pos') newCursor = 'grab';
                else newCursor = 'grab';
            } else { newCursor = 'pointer'; }
        } else { newCursor = 'default'; }
    }
    if (canvas.style.cursor !== newCursor) { canvas.style.cursor = newCursor; }
    // --- End Hover Logic ---
}
// --- END REPLACEMENT ---

// --- REPLACEMENT for handleMouseUp (V5 - Multi-Drag Command) ---
function handleMouseUp(event) {
    if (event.button === 1 && isPanning) { // Middle button release panning
        isPanning = false; lastPanMousePos = null; canvas.style.cursor = 'default'; ongoingActionState = null; return;
    }
    if (event.button !== 0) return; // Only main button release

    mouseIsDown = false;
    let dragJustEnded = false;

    // Check if a drag operation (single or multi) was in progress
    if (isDragging && draggingComponents.length > 0) {
        dragJustEnded = true;
        console.log(`Drag ended for ${draggingComponents.length} component(s). Current action state:`, ongoingActionState);

        try {
            // --- Finalize Action and Add Command ---
            if (ongoingActionState && ongoingActionState.components?.length > 0 && ongoingActionState.type === 'multi-move') {
                // --- Multi-Component Move ---
                const finalPositions = new Map();
                let changed = false;
                ongoingActionState.components.forEach(compId => {
                    const comp = components.find(c => c.id === compId);
                    const startPos = ongoingActionState.startValues.get(compId);
                    if (comp && comp.pos instanceof Vector && startPos) {
                        finalPositions.set(compId, comp.pos.clone());
                        if (!changed && !comp.pos.equals(startPos, 1e-3)) {
                            changed = true;
                        }
                    }
                });

                if (changed) {
                    // Create and add the multi-move command
                    historyManager.addCommand(new MoveComponentsCommand(ongoingActionState.components, ongoingActionState.startValues, finalPositions));
                    updateUndoRedoUI();
                    sceneModified = true;
                    console.log("Multi-move command added.");
                } else {
                    console.log("Multi-move: No significant change detected.");
                }

            } else if (ongoingActionState && ongoingActionState.component) {
                // --- Single Component Handle Drag ---
                const comp = ongoingActionState.component;
                let commandToAdd = null;
                if (ongoingActionState.type === 'move') { // Should only happen if handle logic failed?
                    const finalPos = getComponentPropertyValue(comp, 'pos');
                    if (finalPos && !areValuesEqual(ongoingActionState.startValue, finalPos)) { commandToAdd = new MoveComponentCommand(comp, ongoingActionState.startValue, finalPos); }
                } else if (ongoingActionState.type === 'rotate') {
                    const finalAngle = getComponentPropertyValue(comp, 'angleDeg'); // Get radians
                    if (typeof finalAngle === 'number' && !areValuesEqual(ongoingActionState.startValue, finalAngle)) { commandToAdd = new RotateComponentCommand(comp, ongoingActionState.startValue, finalAngle); }
                } else if (ongoingActionState.type === 'move_fiber_output' && comp instanceof OpticalFiber) {
                    const finalOutputPos = getComponentPropertyValue(comp, 'outputPos');
                    if (finalOutputPos && !areValuesEqual(ongoingActionState.startValue, finalOutputPos)) { commandToAdd = new SetPropertyCommand(comp, 'outputPos', ongoingActionState.startValue, finalOutputPos); }
                } else if (ongoingActionState.type === 'rotate_fiber_output' && comp instanceof OpticalFiber) {
                    const finalOutputAngle = getComponentPropertyValue(comp, 'outputAngleDeg'); // Get radians
                    if (typeof finalOutputAngle === 'number' && !areValuesEqual(ongoingActionState.startValue, finalOutputAngle)) { commandToAdd = new SetPropertyCommand(comp, 'outputAngleRad', ongoingActionState.startValue, finalOutputAngle); }
                }

                if (commandToAdd) {
                    historyManager.addCommand(commandToAdd);
                    updateUndoRedoUI();
                    sceneModified = true;
                    console.log(`Single handle drag command added: ${commandToAdd.constructor.name}`);
                } else {
                    console.log("Single handle drag: No significant change detected.");
                }
            } else {
                console.warn("Drag ended but no valid ongoing action state found.");
            } // --- End Finalize Action ---

            // Call endDrag for the primary component (if exists) or all?
            // Let's call on all, components should handle it internally.
            draggingComponents.forEach(comp => comp.endDrag?.());

        } catch (e) {
            console.error("Error in endDrag or command adding:", e);
            draggingComponents.forEach(comp => comp.endDrag?.()); // Try to end drag anyway
        }
    } // End if isDragging

    // Clear dragging state AFTER processing
    isDragging = false;
    draggingComponents = [];
    dragStartOffsets.clear();
    ongoingActionState = null;

    // Clear guides when drag ends
    if (dragJustEnded) {
        activeGuides = [];
        needsRetrace = true;
    }

    handleMouseMove(event); // Re-evaluate cursor
}
// --- END REPLACEMENT ---

// --- REPLACEMENT for handleMouseLeave function ---
function handleMouseLeave(event) {
    // If mouse leaves canvas WHILE dragging components
    if (isDragging && draggingComponents.length > 0) {
        canvas.style.cursor = 'default';
        console.log("Mouse left canvas during component drag, calling endDrag for:", draggingComponents.map(c => c.label).join(', '));
        draggingComponents.forEach(comp => {
            try {
                comp.endDrag();
            } catch (e) { console.error("Error in endDrag on mouse leave (component drag):", e); }
        });
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
    draggingComponents = []; // Clear dragging components array
    dragStartOffsets.clear(); // Clear offsets
    mouseIsDown = false; // Reset mouse down state when leaving
    ongoingActionState = null; // Clear ongoing action state
    // componentToAdd = null; // Optionally reset tool selection
    // clearToolbarSelection();
    if (!isDragging && !isPanning) {
        canvas.style.cursor = 'default';
    }
}
// --- END OF REPLACEMENT ---
// --- End Corrected handleMouseLeave ---

// --- REPLACEMENT for handleWheelZoom (V4 - Undo/Redo for Rotation Refined) ---
function handleWheelZoom(event) {
    event.preventDefault(); // Prevent default page scrolling

    // --- Component Rotation Logic ---
    if (selectedComponent && mouseIsDown === false) {
        const bounds = selectedComponent.getBoundingBox();
        const currentMousePos = getMousePos(canvas, event);
        let mouseOverComponent = false;
        if (bounds && currentMousePos) {
            mouseOverComponent = currentMousePos.x >= bounds.x && currentMousePos.x <= bounds.x + bounds.width &&
                currentMousePos.y >= bounds.y && currentMousePos.y <= bounds.y + bounds.height;
        }

        if (mouseOverComponent) { // Rotate only if mouse is over the selected component
            const scrollDirection = event.deltaY < 0 ? 1 : -1;
            const baseRotateStepDeg = 2.0;
            const fineRotateStepDeg = 0.5;
            const angleDeltaDeg = event.shiftKey ? (fineRotateStepDeg * scrollDirection) : (baseRotateStepDeg * scrollDirection);
            const currentAngleRad = selectedComponent.angleRad; // Record angle BEFORE change
            const currentAngleDeg = currentAngleRad * (180 / Math.PI);
            const newAngleDeg = currentAngleDeg + angleDeltaDeg;
            const newAngleRad = newAngleDeg * (Math.PI / 180);

            // Directly set the angleRad property
            selectedComponent.angleRad = newAngleRad;

            try {
                // Manually trigger component updates
                if (typeof selectedComponent.onAngleChanged === 'function') {
                    selectedComponent.onAngleChanged();
                } else if (typeof selectedComponent._updateGeometry === 'function') {
                    selectedComponent._updateGeometry();
                }
                needsRetrace = true;
                sceneModified = true;

                // --- Add Rotate Command ---
                // Add a command for each distinct rotation step
                if (Math.abs(newAngleRad - currentAngleRad) > 1e-4) {
                    ongoingActionState = null; // Clear other ongoing states
                    historyManager.addCommand(new RotateComponentCommand(selectedComponent, currentAngleRad, newAngleRad));
                    updateUndoRedoUI();
                    console.log("添加 Wheel Rotate 命令 (简化)");
                }
                // --- End Add Command ---

                updateInspector(); // Update inspector immediately

            } catch (e) {
                console.error("Error setting angle via scroll or adding command:", e);
                selectedComponent.angleRad = currentAngleRad; // Revert on error
                if (typeof selectedComponent.onAngleChanged === 'function') { try { selectedComponent.onAngleChanged(); } catch { } }
                else if (typeof selectedComponent._updateGeometry === 'function') { try { selectedComponent._updateGeometry(); } catch { } }
            }

            return; // Stop further execution (don't zoom)
        }
    } // --- End Component Rotation ---

    // --- Canvas Zooming Logic ---
    const zoomIntensity = 0.1;
    const minScale = 0.1;
    const maxScale = 10.0;
    const mousePosBeforeZoom = getMousePos(canvas, event);
    const scroll = event.deltaY < 0 ? 1 : -1;
    const zoomFactor = Math.exp(scroll * zoomIntensity);
    const newScale = Math.max(minScale, Math.min(maxScale, cameraScale * zoomFactor));
    cameraScale = newScale;
    const rect = canvas.getBoundingClientRect();
    const mouseCssX = event.clientX - rect.left;
    const mouseCssY = event.clientY - rect.top;
    cameraOffset.x = mouseCssX - mousePosBeforeZoom.x * cameraScale;
    cameraOffset.y = mouseCssY - mousePosBeforeZoom.y * cameraScale;
    needsRetrace = true;
    // --- End Canvas Zooming ---
}
// --- END OF REPLACEMENT for handleWheelZoom ---


// --- REPLACEMENT for handleKeyDown (V4 - Undo/Redo Shortcuts & Corrected 'r' key logic) ---
function handleKeyDown(event) {
    // Ignore keydowns if typing in an input field or modal is open
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA');
    const isModalVisible = Array.from(document.querySelectorAll('.modal-overlay.visible')).length > 0;

    if (isInputFocused || isModalVisible) {
        return; // Don't process shortcuts
    }

    // --- Ctrl+S: Save current scene ---
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveCurrentSceneToProject();
        return;
    }

    // --- Undo/Redo Shortcuts ---
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const undoPressed = (isMac && event.metaKey && !event.shiftKey && event.key === 'z') || (!isMac && event.ctrlKey && event.key === 'z');
    const redoPressed = (isMac && event.metaKey && event.shiftKey && event.key === 'z') || (!isMac && event.ctrlKey && event.key === 'y');

    if (undoPressed) {
        event.preventDefault();
        if (historyManager.canUndo()) {
            historyManager.undo(); updateUndoRedoUI(); needsRetrace = true; updateInspector(); console.log("执行 Undo (快捷键)");
            markSceneAsModified(); // 标记场景已修改
        } return;
    }
    if (redoPressed) {
        event.preventDefault();
        if (historyManager.canRedo()) {
            historyManager.redo(); updateUndoRedoUI(); needsRetrace = true; updateInspector(); console.log("执行 Redo (快捷键)");
            markSceneAsModified(); // 标记场景已修改
        } return;
    }
    // --- End Undo/Redo Shortcuts ---

    // --- Delete selected component ---
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedComponents.length > 0) {
        event.preventDefault();
        deleteSelectedComponents(); // Call the new function
    }

    // --- Rotate selected component (R key, Shift+R for reverse) ---
    else if (event.key.toLowerCase() === 'r' && selectedComponent) {
        event.preventDefault();
        const angleDeltaDeg = event.shiftKey ? -5 : 5;
        const currentAngleRad = selectedComponent.angleRad;
        const currentAngleDeg = currentAngleRad * (180 / Math.PI);
        const newAngleDeg = currentAngleDeg + angleDeltaDeg;
        const newAngleRad = newAngleDeg * (Math.PI / 180);

        selectedComponent.angleRad = newAngleRad; // Directly set radian value

        try {
            // Manually trigger updates
            if (typeof selectedComponent.onAngleChanged === 'function') selectedComponent.onAngleChanged();
            else if (typeof selectedComponent._updateGeometry === 'function') selectedComponent._updateGeometry();
            needsRetrace = true;
            sceneModified = true;
            markSceneAsModified(); // 标记场景已修改

            // Add Command (discrete action)
            if (Math.abs(newAngleRad - currentAngleRad) > 1e-4) {
                ongoingActionState = null; // Clear any other action
                historyManager.addCommand(new RotateComponentCommand(selectedComponent, currentAngleRad, newAngleRad));
                updateUndoRedoUI();
                console.log("添加 Key Rotate 命令");
            }
            updateInspector(); // Refresh UI

        } catch (e) {
            console.error("Error handling 'r' key rotation:", e);
            selectedComponent.angleRad = currentAngleRad; // Revert on error
            if (typeof selectedComponent.onAngleChanged === 'function') { try { selectedComponent.onAngleChanged(); } catch { } }
            else if (typeof selectedComponent._updateGeometry === 'function') { try { selectedComponent._updateGeometry(); } catch { } }
        }
    } // --- End 'r' key rotation ---

    // --- Toggle enabled state for sources (Space key) ---
    else if (event.code === 'Space' && selectedComponent && selectedComponent.hasOwnProperty('enabled')) {
        event.preventDefault();
        handlePropertyChange('enabled', !selectedComponent.enabled, true); // Use property change handler
    }

    // --- Deselect component / Cancel tool (Escape key) ---
    else if (event.key === 'Escape') {
        if (componentToAdd) {
            componentToAdd = null; clearToolbarSelection(); canvas.style.cursor = 'default'; console.log("Tool cancelled (Escape).");
        } else if (selectedComponent) {
            selectedComponent.selected = false; selectedComponent = null; updateInspector(); ongoingActionState = null; console.log("Deselected (Escape).");
        }
    }
}
// --- END OF REPLACEMENT for handleKeyDown ---


// // --- REPLACEMENT for deleteComponent (V3 - Undo/Redo Aware) ---
// function deleteComponent(componentToDelete) {
//     if (!componentToDelete) return;
//     console.log("Attempting to delete:", componentToDelete.label, componentToDelete.id);
//     const index = components.indexOf(componentToDelete);
//     if (index > -1) {
//         const wasSelected = (selectedComponent === componentToDelete);

//         // --- Add Command BEFORE actual deletion ---
//         ongoingActionState = null; // <<-- Clear any potential ongoing action state first
//         historyManager.addCommand(new DeleteComponentCommand(componentToDelete, components, index));
//         updateUndoRedoUI();
//         // --- End Add Command ---

//         components.splice(index, 1); // Actual deletion
//         sceneModified = true; // Mark modified AFTER command is added

//         if (wasSelected) {
//             selectedComponent = null;
//             updateInspector();
//         }
//         needsRetrace = true;
//         console.log("Component deleted and DeleteCommand added.");

//     } else {
//         console.warn("Component to delete not found in array.");
//         if (selectedComponent === componentToDelete) { // Cleanup selection if needed
//             selectedComponent = null;
//             updateInspector();
//             ongoingActionState = null;
//         }
//     }
// }
// // --- END OF REPLACEMENT for deleteComponent ---


// --- NEW Function for Deleting Multiple Selected Components ---
function deleteSelectedComponents() {
    if (selectedComponents.length === 0) {
        console.log("Delete action ignored: No components selected.");
        return; // Nothing to delete
    }

    console.log(`Attempting to delete ${selectedComponents.length} selected component(s).`);

    // --- Create a Composite Command ---
    const deleteCommands = [];
    // It's safer to iterate over a copy and find indices in the main array,
    // as splicing modifies the array during iteration if not careful.
    const componentsToDelete = [...selectedComponents]; // Copy the selection

    // Sort components by their index in the main 'components' array in descending order.
    // This ensures that splicing higher indices first doesn't affect the indices of subsequent items.
    componentsToDelete.sort((a, b) => components.indexOf(b) - components.indexOf(a));

    componentsToDelete.forEach(comp => {
        const index = components.indexOf(comp);
        if (index > -1) {
            // Create a command for deleting this specific component
            deleteCommands.push(new DeleteComponentCommand(comp, components, index));
        } else {
            console.warn(`Component ${comp.id} was selected but not found in main components array during delete.`);
        }
    });

    if (deleteCommands.length > 0) {
        const compositeCommand = new CompositeCommand(deleteCommands);

        // Execute the composite command (which executes individual deletes)
        try {
            compositeCommand.execute(); // This will perform the actual splices
            historyManager.addCommand(compositeCommand); // Add the single composite command to history
            updateUndoRedoUI();
            sceneModified = true;
            markSceneAsModified(); // 标记场景已修改
            console.log(`${deleteCommands.length} component(s) deleted via CompositeCommand.`);
        } catch (e) {
            console.error("Error executing composite delete command:", e);
            // Attempt to undo the partial execution? (Complex)
            // For now, just log the error. State might be inconsistent.
            alert("删除元件时发生错误！部分元件可能已被删除。");
            // Force a redraw and update UI
            needsRetrace = true;
            updateInspector(); // Inspector should be empty now
            updateUndoRedoUI(); // Reflect potential history change
        }

        // Clear selection state AFTER successful deletion
        selectedComponents = [];
        selectedComponent = null;
        updateInspector(); // Update inspector for cleared selection
        needsRetrace = true; // Ensure redraw after deletion

    } else {
        console.log("No valid components found to delete among selection.");
    }
}
// --- END deleteSelectedComponents ---


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
        selectedComponents = [];
        draggingComponents = [];
        updateInspector();

        // 2. Recreate components from data
        sceneData.components.forEach((compData, index) => {
            let newComp = null;
            const compType = compData.type;
            const pos = new Vector(compData.posX ?? 100 + index * 10, compData.posY ?? 100 + index * 10);
            const angleDeg = compData.angleDeg ?? 0;

            // --- Component Creation Switch Statement (Keep synced with importScene!) ---
            switch (compType) {
                case 'LaserSource': newComp = new LaserSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.numRays, compData.spreadDeg, compData.enabled, compData.polarizationType, compData.polarizationAngleDeg, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist); if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled); break;
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
                
                // === 新增元件 ===
                // 新光源
                case 'PointSource': newComp = new PointSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.enabled); break;
                case 'LEDSource': newComp = new LEDSource(pos, angleDeg, compData.centerWavelength, compData.fwhm, compData.intensity, compData.rayCount, compData.spreadDeg, compData.enabled); break;
                case 'PulsedLaserSource': newComp = new PulsedLaserSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.numRays, compData.spreadDeg, compData.enabled); break;
                
                // 新反射镜
                case 'DichroicMirror': newComp = new DichroicMirror(pos, compData.length, angleDeg, compData.cutoffWavelength, compData.transitionWidth); break;
                case 'MetallicMirror': newComp = new MetallicMirror(pos, compData.length, angleDeg, compData.metalType); break;
                case 'RingMirror': newComp = new RingMirror(pos, compData.outerRadius, compData.innerRadius, angleDeg); break;
                
                // 新透镜
                case 'CylindricalLens': newComp = new CylindricalLens(pos, compData.diameter, compData.focalLength, angleDeg, compData.cylinderAxis); break;
                case 'AsphericLens': newComp = new AsphericLens(pos, compData.diameter, compData.focalLength, angleDeg); break;
                case 'GRINLens': newComp = new GRINLens(pos, compData.diameter, compData.length, angleDeg); break;
                
                // 新偏振器件
                case 'WollastonPrism': newComp = new WollastonPrism(pos, compData.width, compData.height, angleDeg, compData.separationAngleDeg); break;
                case 'FaradayRotator': newComp = new FaradayRotator(pos, compData.width, compData.height, angleDeg, compData.rotationAngleDeg); break;
                case 'FaradayIsolator': newComp = new FaradayIsolator(pos, compData.width, compData.height, angleDeg); break;
                
                // 新探测器
                case 'CCDCamera': newComp = new CCDCamera(pos, compData.width, compData.height, angleDeg, compData.pixelCountX, compData.pixelCountY, compData.quantumEfficiency); break;
                case 'Spectrometer': newComp = new Spectrometer(pos, compData.width, compData.height, angleDeg, compData.wavelengthMin, compData.wavelengthMax, compData.resolution); break;
                case 'PowerMeter': newComp = new PowerMeter(pos, compData.diameter, angleDeg); break;
                case 'PolarizationAnalyzer': newComp = new PolarizationAnalyzer(pos, compData.width, compData.height, angleDeg); break;
                
                // 调制器
                case 'ElectroOpticModulator': newComp = new ElectroOpticModulator(pos, compData.width, compData.height, angleDeg, compData.vPi, compData.appliedVoltage, compData.modulationMode); break;
                case 'VariableAttenuator': newComp = new VariableAttenuator(pos, compData.diameter, angleDeg, compData.attenuation); break;
                case 'OpticalChopper': newComp = new OpticalChopper(pos, compData.diameter, angleDeg, compData.frequency, compData.dutyCycle, compData.bladeCount); break;
                
                // 原子物理
                case 'AtomicCell': newComp = new AtomicCell(pos, compData.width, compData.height, angleDeg, compData.atomType, compData.temperature, compData.numberDensity); break;
                case 'MagneticCoil': newComp = new MagneticCoil(pos, compData.diameter, angleDeg, compData.coilType, compData.fieldStrength); break;
                
                // 干涉仪
                case 'FabryPerotCavity': newComp = new FabryPerotCavity(pos, compData.cavityLength, angleDeg, compData.mirrorReflectivity, compData.finesse); break;
                
                default: console.warn(`Unknown component type during preset load: ${compType}`);
            }
            // --- End Component Creation Switch ---

            if (newComp) {
                if (compData.label) newComp.label = compData.label;
                if (compData.id) newComp.id = compData.id;
                components.push(newComp);
            }
        });


        // --- ADD MODE RESTORATION ---
        if (sceneData.currentMode === 'lens_imaging' || sceneData.currentMode === 'ray_trace') {
            switchMode(sceneData.currentMode);
            console.log(`Restored simulation mode from preset to: ${sceneData.currentMode}`);
        } else {
            switchMode('ray_trace');
            console.warn("Preset scene data missing or has invalid mode, defaulting to ray_trace.");
        }
        // --- END MODE RESTORATION ---


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
    const settingsContainer = document.getElementById('settings-content-container');

    if (!modal || !settingsContainer) return;

    // Hide all content containers first
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

/**
 * 性能监控和优化
 */
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTime = 0;
        this.isMonitoring = false;
    }

    startMonitoring() {
        this.isMonitoring = true;
        this.frameCount = 0;
        this.lastTime = performance.now();
    }

    updateFrame() {
        if (!this.isMonitoring) return;

        this.frameCount++;
        const currentTime = performance.now();

        if (currentTime - this.lastTime >= 1000) { // 每秒更新一次
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;

            // 如果FPS过低，自动降低渲染质量
            if (this.fps < 30 && window.maxRaysPerSource > 200) {
                window.maxRaysPerSource = Math.max(100, window.maxRaysPerSource - 100);
                console.log(`检测到低FPS，自动降低光线数至: ${window.maxRaysPerSource}`);
                showTemporaryMessage(`性能优化：光线数已调整为 ${window.maxRaysPerSource}`, 'info');
            }
        }
    }

    getStats() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            rayCount: window.maxRaysPerSource,
            componentCount: components.length
        };
    }
}

const performanceMonitor = new PerformanceMonitor();

/**
 * 优化的游戏循环，包含性能监控
 */
function gameLoop(timestamp) {
    const startTime = performance.now();

    // 原始游戏循环逻辑
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

    // 性能监控
    performanceMonitor.updateFrame();

    // 记录帧时间
    const endTime = performance.now();
    performanceMonitor.frameTime = endTime - startTime;

    // Request next frame
    requestAnimationFrame(gameLoop);
}

/**
 * 显示性能统计信息
 */
function showPerformanceStats() {
    const stats = performanceMonitor.getStats();
    const content = `
        <div style="font-family: monospace; line-height: 1.6;">
            <div><strong>FPS:</strong> ${stats.fps}</div>
            <div><strong>帧时间:</strong> ${stats.frameTime.toFixed(2)}ms</div>
            <div><strong>元件数:</strong> ${stats.componentCount}</div>
            <div><strong>最大光线数:</strong> ${stats.rayCount}</div>
            <div><strong>内存使用:</strong> ${Math.round(performance.memory?.usedJSHeapSize / 1048576 || 0)}MB</div>
        </div>
    `;

    showModal('性能统计', content, 'info-modal');
}

/**
 * 显示临时消息提示
 */
function showTemporaryMessage(message, type = 'info', duration = 3000) {
    // 移除现有的消息
    const existingMessage = document.querySelector('.temporary-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 创建新消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `temporary-message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        font-size: 14px;
        z-index: 2000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

    // 根据类型设置背景色
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    messageDiv.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(messageDiv);

    // 显示动画
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 10);

    // 自动隐藏
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, duration);
}

// 导出到全局
window.showTemporaryMessage = showTemporaryMessage;

/**
 * 处理新建场景
 */
function handleNewScene() {
    if (sceneModified && !confirm("当前场景有未保存的更改。确定要新建场景并放弃更改吗？")) {
        return;
    }
    console.log("Action: New Scene");
    components = [];
    selectedComponent = null;
    selectedComponents = [];
    updateInspector();
    activateTab('properties-tab');
    cameraOffset = new Vector(0, 0);
    cameraScale = 1.0;
    sceneModified = false;
    needsRetrace = true;
    showTemporaryMessage('已创建新场景', 'success');
}

/**
 * 处理新建项目
 */
function handleNewProject() {
    console.log("handleNewProject called");
    // 直接显示创建项目对话框，不依赖 UnifiedProjectPanel
    showSimpleCreateProjectDialog();
}

/**
 * 简单的创建项目对话框（当 UnifiedProjectPanel 不可用时的回退方案）
 */
function showSimpleCreateProjectDialog() {
    // 检查是否支持 File System Access API
    const isFileSystemSupported = 'showDirectoryPicker' in window;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'simple-create-project-modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="modal-close-btn" id="simple-project-modal-close">×</span>
            <h2>创建新项目</h2>
            <form id="simple-create-project-form">
                <div class="form-group">
                    <label for="simple-project-name">项目名称:</label>
                    <input type="text" id="simple-project-name" required placeholder="输入项目名称" style="width: 100%; padding: 8px; margin-top: 5px;">
                </div>
                <div class="form-group" style="margin-top: 15px;">
                    <label for="simple-storage-mode">存储方式:</label>
                    <select id="simple-storage-mode" style="width: 100%; padding: 8px; margin-top: 5px;">
                        ${isFileSystemSupported ? '<option value="local">本地文件夹（选择保存位置）</option>' : ''}
                        <option value="localStorage">浏览器存储（无需选择位置）</option>
                    </select>
                </div>
                <p style="font-size: 12px; color: var(--text-color-light); margin-top: 10px;">
                    ${isFileSystemSupported ? 
                        '选择"本地文件夹"将让您选择一个文件夹来保存项目文件。' : 
                        '您的浏览器不支持文件系统API，项目将保存在浏览器存储中。'}
                </p>
                <div class="form-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="secondary-btn" id="simple-project-cancel">取消</button>
                    <button type="submit" class="primary-btn">创建项目</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭按钮
    modal.querySelector('#simple-project-modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('#simple-project-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // 表单提交
    modal.querySelector('#simple-create-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = modal.querySelector('#simple-project-name').value.trim();
        const storageMode = modal.querySelector('#simple-storage-mode').value;
        
        if (!name) {
            showTemporaryMessage('请输入项目名称', 'warning');
            return;
        }
        
        try {
            if (storageMode === 'local' && isFileSystemSupported) {
                // 使用 File System Access API
                await createLocalFolderProject(name);
            } else {
                // 使用 localStorage
                createLocalStorageProject(name);
            }
            
            modal.remove();
            showTemporaryMessage(`项目 "${name}" 创建成功！`, 'success');
            
            // 切换到项目标签页
            activateTab('unified-project-tab');
        } catch (err) {
            if (!err.message.includes('取消')) {
                showTemporaryMessage(`创建项目失败: ${err.message}`, 'error');
            }
        }
    });
    
    // 聚焦到输入框
    setTimeout(() => {
        modal.querySelector('#simple-project-name').focus();
    }, 100);
}

/**
 * 使用 File System Access API 创建本地文件夹项目
 */
async function createLocalFolderProject(name) {
    // 让用户选择父目录
    const parentHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
    });
    
    // 创建项目目录
    const projectHandle = await parentHandle.getDirectoryHandle(name, { create: true });
    
    // 创建项目配置文件
    const configFile = await projectHandle.getFileHandle('.opticslab.json', { create: true });
    const config = {
        id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11),
        name: name,
        storageMode: 'local',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenes: []
    };
    
    const writable = await configFile.createWritable();
    await writable.write(JSON.stringify(config, null, 2));
    await writable.close();
    
    // 保存到最近项目列表
    saveToRecentProjects({
        id: config.id,
        name: name,
        storageMode: 'local',
        path: name,
        updatedAt: config.updatedAt
    });
    
    // 如果 UnifiedProjectPanel 可用，通知它刷新
    if (window.unifiedProjectPanel) {
        window.unifiedProjectPanel.renderRecentProjects?.();
    }
    
    return config;
}

/**
 * 使用 localStorage 创建项目
 */
function createLocalStorageProject(name) {
    const project = {
        id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11),
        name: name,
        storageMode: 'localStorage',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenes: []
    };
    
    // 保存到 localStorage
    const projectsKey = 'opticslab_projects';
    let projects = [];
    try {
        const data = localStorage.getItem(projectsKey);
        projects = data ? JSON.parse(data) : [];
    } catch (e) {
        projects = [];
    }
    
    projects.push(project);
    localStorage.setItem(projectsKey, JSON.stringify(projects));
    
    // 保存到最近项目列表
    saveToRecentProjects({
        id: project.id,
        name: name,
        storageMode: 'localStorage',
        updatedAt: project.updatedAt
    });
    
    // 如果 UnifiedProjectPanel 可用，通知它刷新
    if (window.unifiedProjectPanel) {
        window.unifiedProjectPanel.renderRecentProjects?.();
    }
    
    return project;
}

/**
 * 保存到最近项目列表
 */
function saveToRecentProjects(projectInfo) {
    const recentKey = 'opticslab_recent_projects';
    const maxRecent = 5;
    
    let recent = [];
    try {
        const data = localStorage.getItem(recentKey);
        recent = data ? JSON.parse(data) : [];
    } catch (e) {
        recent = [];
    }
    
    // 移除已存在的同一项目
    recent = recent.filter(p => p.id !== projectInfo.id);
    
    // 添加到开头
    recent.unshift(projectInfo);
    
    // 限制数量
    if (recent.length > maxRecent) {
        recent = recent.slice(0, maxRecent);
    }
    
    localStorage.setItem(recentKey, JSON.stringify(recent));
}

/**
 * 改进的键盘快捷键提示
 */
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Ctrl+N', desc: '新建场景' },
        { key: 'Ctrl+S', desc: '保存场景' },
        { key: 'Ctrl+E', desc: '导出场景' },
        { key: 'Ctrl+Z', desc: '撤销' },
        { key: 'Ctrl+Y', desc: '重做' },
        { key: 'Delete', desc: '删除选中元件' },
        { key: 'R', desc: '旋转元件' },
        { key: 'Shift+R', desc: '微调旋转' },
        { key: 'Space', desc: '切换光源启用状态' },
        { key: 'Esc', desc: '取消选择/工具' }
    ];

    const content = shortcuts.map(s =>
        `<div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${s.key}</kbd>
            <span>${s.desc}</span>
        </div>`
    ).join('');

    showModal('键盘快捷键', content, 'info-modal');
}

/**
 * 改进的模态框显示函数
 */
function showModal(title, content, className = '') {
    // 移除现有的模态框
    const existingModal = document.querySelector('.temporary-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalDiv = document.createElement('div');
    modalDiv.className = `temporary-modal ${className}`;
    modalDiv.innerHTML = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 3000;">
            <div class="modal-content" style="background: var(--panel-bg); color: var(--text-color); padding: 20px; border-radius: 8px; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: var(--text-color);">${title}</h3>
                    <button class="modal-close" style="background: none; border: none; font-size: 20px; color: var(--text-color); cursor: pointer; padding: 5px;">×</button>
                </div>
                <div>${content}</div>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // 点击背景或关闭按钮关闭
    const overlay = modalDiv.querySelector('.modal-overlay');
    const closeBtn = modalDiv.querySelector('.modal-close');

    const closeModal = () => {
        modalDiv.remove();
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    closeBtn.addEventListener('click', closeModal);
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
        maxRaysPerSource: window.maxRaysPerSource,
        globalMaxBounces: window.globalMaxBounces,
        globalMinIntensity: window.globalMinIntensity,
        fastWhiteLightMode: fastWhiteLightMode,
        globalShowArrows: globalShowArrows,
        onlyShowSelectedSourceArrow: onlyShowSelectedSourceArrow,
        arrowAnimationSpeed: arrowAnimationSpeed,
        showArrowTrail: showArrowTrail
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
    globalShowArrows = false;
    onlyShowSelectedSourceArrow = false;
    arrowAnimationSpeed = 100;
    showArrowTrail = false; // 默认禁用拖影

    if (savedSettingsJson) {
        try {
            const savedSettings = JSON.parse(savedSettingsJson);
            if (savedSettings) {
                showGrid = savedSettings.showGrid !== undefined ? savedSettings.showGrid : showGrid;
                window.maxRaysPerSource = (typeof savedSettings.maxRaysPerSource === 'number' && savedSettings.maxRaysPerSource >= 1)
                    ? savedSettings.maxRaysPerSource : window.maxRaysPerSource;
                window.globalMaxBounces = typeof savedSettings.globalMaxBounces === 'number' ? savedSettings.globalMaxBounces : window.globalMaxBounces;
                window.globalMinIntensity = typeof savedSettings.globalMinIntensity === 'number' ? savedSettings.globalMinIntensity : window.globalMinIntensity;
                globalShowArrows = savedSettings.globalShowArrows !== undefined ? savedSettings.globalShowArrows : globalShowArrows;
                onlyShowSelectedSourceArrow = savedSettings.onlyShowSelectedSourceArrow !== undefined ? savedSettings.onlyShowSelectedSourceArrow : onlyShowSelectedSourceArrow;
                arrowAnimationSpeed = typeof savedSettings.arrowAnimationSpeed === 'number' ? savedSettings.arrowAnimationSpeed : arrowAnimationSpeed;
                showArrowTrail = savedSettings.showArrowTrail !== undefined ? savedSettings.showArrowTrail : showArrowTrail;

                console.log("Settings loaded:", { showGrid, maxRaysPerSource: window.maxRaysPerSource, globalMaxBounces: window.globalMaxBounces, globalMinIntensity: window.globalMinIntensity, globalShowArrows, onlyShowSelectedSourceArrow, arrowAnimationSpeed, showArrowTrail });
            }
        } catch (e) { console.error("Error parsing settings from localStorage:", e); }
    } else { console.log("No saved settings found, using defaults."); }

    console.log(`Applying settings: Max Bounces=${window.globalMaxBounces}, Min Intensity=${window.globalMinIntensity.toExponential(2)}, Arrows=${globalShowArrows}, Trail=${showArrowTrail}`);
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

function deleteSceneFromStorage(sceneName) {
    if (!sceneName) return;
    const key = SCENE_KEY_PREFIX + sceneName;
    if (localStorage.getItem(key)) {
        // Updated confirmation message
        if (confirm(`确定要删除浏览器暂存的场景 "${sceneName}" 吗？此操作无法撤销。`)) {
            localStorage.removeItem(key);
            console.log(`暂存场景 '${sceneName}' deleted from localStorage.`);
            updateSavedScenesList(); // Refresh the list in the UI
        }
    } else {
        console.warn(`暂存场景 '${sceneName}' not found for deletion.`);
    }
}


function updateSavedScenesList() {
    const listContainer = document.getElementById('saved-scenes-list');
    if (!listContainer) {
        console.warn("Scene list container #saved-scenes-list not found.");
        return;
    }

    const sceneNames = getSavedSceneNames();
    listContainer.innerHTML = ''; // Clear previous list

    if (sceneNames.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">没有已暂存的场景。</p>'; // Updated placeholder text
    } else {
        sceneNames.forEach(name => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'saved-scene-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            // Update tooltip
            nameSpan.title = `加载暂存场景: ${name}`;
            nameSpan.onclick = () => {
                console.log(`Load requested for暂存 scene: ${name}`);
                if (sceneModified) {
                    if (!confirm("当前场景已被修改。加载暂存场景将【覆盖】当前更改。是否继续？")) { // Updated confirm text
                        console.log("Load cancelled by user.");
                        return;
                    }
                }
                const sceneData = loadSceneDataFromStorage(name);
                if (sceneData) {
                    if (loadSceneFromData(sceneData)) {
                        console.log(`暂存场景 '${name}' loaded via list.`);
                    } else {
                        // Update alert text
                        alert(`加载暂存场景 "${name}" 时发生内部错误。`);
                        updateSavedScenesList();
                    }
                } else {
                    // Update alert text
                    alert(`无法加载暂存场景 "${name}"！数据可能已损坏或丢失。`);
                    updateSavedScenesList();
                }
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            // Update tooltip
            deleteBtn.title = `删除暂存场景: ${name}`;
            deleteBtn.className = 'scene-action-btn delete-btn'; // Added class for styling
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteSceneFromStorage(name); // Calls the function with updated confirm message
            };

            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(deleteBtn);
            listContainer.appendChild(itemDiv);
        });
    }
}

// --- REPLACEMENT for updateUndoRedoUI (V2 - Handles Buttons & Menu Items) ---
function updateUndoRedoUI() {
    const undoBtn = document.getElementById('undo-button');
    const redoBtn = document.getElementById('redo-button');
    const undoMenuItem = document.getElementById('menu-undo');
    const redoMenuItem = document.getElementById('menu-redo');

    // 确保 historyManager 已初始化
    if (!historyManager) {
        if (undoBtn) { undoBtn.classList.add('disabled'); undoBtn.title = "无法撤销"; }
        if (undoMenuItem) { undoMenuItem.classList.add('disabled-link'); }
        if (redoBtn) { redoBtn.classList.add('disabled'); redoBtn.title = "无法重做"; }
        if (redoMenuItem) { redoMenuItem.classList.add('disabled-link'); }
        return;
    }

    // Update Undo Button and Menu Item
    if (historyManager.canUndo()) {
        if (undoBtn) { undoBtn.classList.remove('disabled'); undoBtn.title = "撤销 (Ctrl+Z)"; }
        if (undoMenuItem) { undoMenuItem.classList.remove('disabled-link'); }
    } else {
        if (undoBtn) { undoBtn.classList.add('disabled'); undoBtn.title = "无法撤销"; }
        if (undoMenuItem) { undoMenuItem.classList.add('disabled-link'); }
    }

    // Update Redo Button and Menu Item
    if (historyManager.canRedo()) {
        if (redoBtn) { redoBtn.classList.remove('disabled'); redoBtn.title = "重做 (Ctrl+Y)"; }
        if (redoMenuItem) { redoMenuItem.classList.remove('disabled-link'); }
    } else {
        if (redoBtn) { redoBtn.classList.add('disabled'); redoBtn.title = "无法重做"; }
        if (redoMenuItem) { redoMenuItem.classList.add('disabled-link'); }
    }
}
// --- End of REPLACEMENT for updateUndoRedoUI ---



// --- REPLACEMENT for generateSceneDataObject (Uses toJSON) ---
function generateSceneDataObject() {
    const sceneData = {
        version: "1.1",
        currentMode: currentMode,
        view: {
            cameraScale: cameraScale,
            cameraOffsetX: cameraOffset?.x ?? 0,
            cameraOffsetY: cameraOffset?.y ?? 0
        },
        settings: {
            showGrid: !!showGrid,
            maxRaysPerSource: window.maxRaysPerSource,
            globalMaxBounces: window.globalMaxBounces,
            globalMinIntensity: window.globalMinIntensity,
            fastWhiteLightMode: !!window.fastWhiteLightMode,
            globalShowArrows: !!globalShowArrows,
            onlyShowSelectedSourceArrow: !!onlyShowSelectedSourceArrow,
            arrowAnimationSpeed: arrowAnimationSpeed
        },
        components: []
    };
    components.forEach(comp => {
        try {
            if (typeof comp.toJSON === 'function') {
                sceneData.components.push(comp.toJSON()); // Call component's toJSON method
            } else {
                console.warn(`Component ${comp?.label} (${comp?.constructor?.name}) is missing toJSON method. Skipping.`);
            }
        } catch (e) {
            console.error(`Error calling toJSON for component ${comp?.label} (${comp?.id}):`, e);
        }
    });
    console.log("Generated scene data using toJSON. Mode:", currentMode);
    return sceneData;
}
// --- END REPLACEMENT ---

// --- REPLACEMENT for loadSceneFromData (V2 - Uses constructor & setProperty correctly) ---
/**
 * 从数据对象加载场景
 * @param {Object} sceneData - 场景数据
 * @param {Object} options - 选项
 * @param {boolean} options.switchToPropertiesTab - 是否切换到属性面板，默认 true
 */
function loadSceneFromData(sceneData, options = {}) {
    const { switchToPropertiesTab = true } = options;
    console.log("--- Loading Scene from Data Object ---"); // Log start
    try {
        components = [];
        selectedComponent = null;
        selectedComponents = [];
        draggingComponents = [];
        historyManager.clear(); // Clear history when loading a new scene
        updateUndoRedoUI(); // Update UI after clearing history

        if (!sceneData || !Array.isArray(sceneData.components)) {
            throw new Error("Invalid scene data format: 'components' array not found.");
        }

        console.log(`  Loading ${sceneData.components.length} components...`);

        sceneData.components.forEach((compData, index) => {
            let newComp = null;
            const compType = compData.type;
            const pos = new Vector(compData.posX ?? 100 + index * 10, compData.posY ?? 100 + index * 10);
            const angleDeg = compData.angleDeg ?? 0;
            const id = compData.id; // Get the original ID
            const label = compData.label; // Get the label

            console.log(`  -> Loading ${compType} (${id}) at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);

            // --- Component Creation and Property Restoration ---
            try {
                switch (compType) {
                    case 'LaserSource':
                        newComp = new LaserSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.numRays, compData.spreadDeg, compData.enabled, compData.polarizationType, compData.polarizationAngleDeg, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist);
                        // Set properties not in constructor (or needing setProperty logic)
                        if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled);
                        break;
                    case 'FanSource':
                        newComp = new FanSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.fanAngleDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter);
                        break;
                    case 'LineSource':
                        newComp = new LineSource(pos, angleDeg, compData.wavelength, compData.intensity, compData.rayCount, compData.length, compData.enabled, compData.ignoreDecay, compData.beamDiameter);
                        break;
                    case 'Mirror':
                        newComp = new Mirror(pos, compData.length, angleDeg);
                        break;
                    case 'SphericalMirror':
                        let roc = compData.radiusOfCurvature;
                        if (roc === null) roc = Infinity; // Handle Infinity saved as null
                        newComp = new SphericalMirror(pos, roc, compData.centralAngleDeg, angleDeg);
                        break;
                    case 'ParabolicMirror':
                        newComp = new ParabolicMirror(pos, compData.focalLength, compData.diameter, angleDeg);
                        break;
                    case 'Screen':
                        newComp = new Screen(pos, compData.length, angleDeg, compData.numBins);
                        if (compData.hasOwnProperty('showPattern')) newComp.setProperty('showPattern', compData.showPattern);
                        break;
                    case 'ThinLens':
                        let fLen = compData.focalLength;
                        if (fLen === null) fLen = Infinity; // Handle Infinity
                        newComp = new ThinLens(pos, compData.diameter, fLen, angleDeg);
                        // Set properties not in constructor
                        if (compData.hasOwnProperty('baseRefractiveIndex')) newComp.setProperty('baseRefractiveIndex', compData.baseRefractiveIndex);
                        if (compData.hasOwnProperty('dispersionCoeffB')) newComp.setProperty('dispersionCoeffB', compData.dispersionCoeffB);
                        if (compData.hasOwnProperty('quality')) newComp.setProperty('quality', compData.quality);
                        if (compData.hasOwnProperty('coated')) newComp.setProperty('coated', compData.coated);
                        if (compData.hasOwnProperty('isThickLens')) newComp.setProperty('isThickLens', compData.isThickLens);
                        // if (compData.hasOwnProperty('thickLensThickness')) newComp.setProperty('thickLensThickness', compData.thickLensThickness); // If visual thickness is saved
                        if (compData.hasOwnProperty('chromaticAberration')) newComp.setProperty('chromaticAberration', compData.chromaticAberration);
                        if (compData.hasOwnProperty('sphericalAberration')) newComp.setProperty('sphericalAberration', compData.sphericalAberration);
                        break;
                    case 'Aperture':
                        newComp = new Aperture(pos, compData.length, compData.numberOfSlits, compData.slitWidth, compData.slitSeparation, angleDeg);
                        break;
                    case 'Polarizer':
                        newComp = new Polarizer(pos, compData.length, compData.transmissionAxisAngleDeg, angleDeg);
                        break;
                    case 'BeamSplitter':
                        // Be tolerant to both legacy 'type' and new 'splitterType' field
                        const bsType = (compData.splitterType || compData.type) === 'PBS' ? 'PBS' : 'BS';
                        newComp = new BeamSplitter(pos, compData.length, angleDeg, bsType, compData.splitRatio, compData.pbsUnpolarizedReflectivity);
                        break;
                    case 'DielectricBlock':
                        newComp = new DielectricBlock(pos, compData.width, compData.height, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB_nm2, compData.absorptionCoeff, compData.showEvanescentWave);
                        break;
                    case 'Photodiode':
                        newComp = new Photodiode(pos, angleDeg, compData.diameter);
                        break;
                    case 'OpticalFiber':
                        const outputPos = new Vector(compData.outputX ?? pos.x + 100, compData.outputY ?? pos.y);
                        // Ensure all relevant properties are passed to constructor or set after
                        newComp = new OpticalFiber(pos, outputPos, angleDeg, compData.outputAngleDeg, compData.numericalAperture, compData.coreDiameter, compData.fiberIntrinsicEfficiency, compData.transmissionLossDbPerKm, compData.facetLength);
                        break;
                    case 'Prism':
                        newComp = new Prism(pos, compData.baseLength, compData.apexAngleDeg, angleDeg, compData.baseRefractiveIndex, compData.dispersionCoeffB);
                        break;
                    case 'WhiteLightSource':
                        newComp = new WhiteLightSource(pos, angleDeg, compData.baseIntensity ?? 75.0, compData.rayCount ?? 41, compData.spreadDeg, compData.enabled, compData.ignoreDecay, compData.beamDiameter, compData.initialBeamWaist ?? 5.0);
                        if (compData.hasOwnProperty('gaussianEnabled')) newComp.setProperty('gaussianEnabled', compData.gaussianEnabled);
                        break;
                    case 'DiffractionGrating':
                        newComp = new DiffractionGrating(pos, compData.length, compData.gratingPeriodInMicrons, angleDeg, compData.maxOrder);
                        break;
                    case 'HalfWavePlate':
                        newComp = new HalfWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg);
                        break;
                    case 'QuarterWavePlate':
                        newComp = new QuarterWavePlate(pos, compData.length, compData.fastAxisAngleDeg, angleDeg);
                        break;
                    case 'AcoustoOpticModulator':
                        newComp = new AcoustoOpticModulator(pos, compData.width, compData.height, angleDeg, compData.rfFrequencyMHz, compData.rfPower);
                        break;
                    case 'FaradayRotator':
                        newComp = new FaradayRotator(pos, compData.width, compData.height, angleDeg, compData.rotationAngleDeg);
                        break;
                    case 'FaradayIsolator':
                        newComp = new FaradayIsolator(pos, compData.width, compData.height, angleDeg);
                        break;
                    case 'CustomComponent':
                        newComp = new CustomComponent(pos, compData.width, compData.height, angleDeg, compData.text);
                        break;
                    default:
                        console.warn(`Unknown component type during scene load: ${compType}`);
                }
            } catch (creationError) {
                console.error(`Error creating component ${compType} (ID: ${id}) during load:`, creationError, compData);
                // Optionally skip this component and continue loading others?
                // Or throw error to stop loading? Let's skip for robustness.
                newComp = null;
            }
            // --- End Component Creation ---

            if (newComp) {
                if (label) newComp.label = label; // Restore label
                if (id) newComp.id = id; // Restore original ID
                if (compData.notes) newComp.notes = compData.notes; // <-- 在这里添加这一行
                components.push(newComp);
            }
        }); // End forEach component

        // --- Restore Mode ---
        // 支持两种格式：currentMode（旧格式）和 settings.mode（新格式）
        const mode = sceneData.currentMode || sceneData.settings?.mode;
        if (mode === 'lens_imaging' || mode === 'ray_trace') {
            switchMode(mode);
            console.log(`  Restored simulation mode to: ${mode}`);
        } else {
            switchMode('ray_trace');
            console.warn("  Saved scene data missing or has invalid mode, defaulting to ray_trace.");
        }
        // --- End Restore Mode ---

        // --- Restore View (camera) if present ---
        if (sceneData.view) {
            try {
                const v = sceneData.view;
                if (typeof v.cameraScale === 'number') cameraScale = v.cameraScale;
                if (typeof v.cameraOffsetX === 'number' && typeof v.cameraOffsetY === 'number') {
                    cameraOffset = new Vector(v.cameraOffsetX, v.cameraOffsetY);
                }
            } catch (e) { console.warn('Failed to restore view data:', e); }
        }

        // --- Restore Settings if present ---
        if (sceneData.settings) {
            try {
                const s = sceneData.settings;
                if (typeof s.showGrid === 'boolean') showGrid = s.showGrid;
                // 支持新旧两种字段名
                if (typeof s.maxRays === 'number') window.maxRaysPerSource = s.maxRays;
                else if (typeof s.maxRaysPerSource === 'number') window.maxRaysPerSource = s.maxRaysPerSource;
                
                if (typeof s.maxBounces === 'number') window.globalMaxBounces = s.maxBounces;
                else if (typeof s.globalMaxBounces === 'number') window.globalMaxBounces = s.globalMaxBounces;
                
                if (typeof s.minIntensity === 'number') window.globalMinIntensity = s.minIntensity;
                else if (typeof s.globalMinIntensity === 'number') window.globalMinIntensity = s.globalMinIntensity;
                
                if (typeof s.fastWhiteLightMode === 'boolean') window.fastWhiteLightMode = s.fastWhiteLightMode;
                
                if (typeof s.showArrows === 'boolean') globalShowArrows = s.showArrows;
                else if (typeof s.globalShowArrows === 'boolean') globalShowArrows = s.globalShowArrows;
                
                if (typeof s.onlyShowSelectedSourceArrow === 'boolean') onlyShowSelectedSourceArrow = s.onlyShowSelectedSourceArrow;
                
                if (typeof s.arrowSpeed === 'number') arrowAnimationSpeed = s.arrowSpeed;
                else if (typeof s.arrowAnimationSpeed === 'number') arrowAnimationSpeed = s.arrowAnimationSpeed;
            } catch (e) { console.warn('Failed to restore settings:', e); }
        }

        needsRetrace = true;
        sceneModified = false; // Mark as unmodified after successful load
        
        // 触发场景已保存事件（因为刚加载的场景是未修改状态）
        document.dispatchEvent(new CustomEvent('sceneSaved'));
        
        updateInspector(); // Clear inspector as nothing is selected initially
        // 只有在需要时才切换到属性面板
        if (switchToPropertiesTab) {
            activateTab('properties-tab');
        }
        console.log(`--- Scene loaded successfully. Components: ${components.length}, Mode: ${currentMode} ---`);
        return true; // Indicate success

    } catch (loadError) {
        console.error("--- Error loading scene components from data: ---", loadError);
        alert(`加载场景组件时出错: ${loadError.message}`);
        // Reset state on error
        components = [];
        selectedComponent = null;
        historyManager.clear();
        updateUndoRedoUI();
        updateInspector();
        if (switchToPropertiesTab) {
            activateTab('properties-tab');
        }
        needsRetrace = true;
        sceneModified = false;
        return false; // Indicate failure
    }
}
// --- END REPLACEMENT ---

function handleSaveAsClick() {
    const defaultName = `场景 ${new Date().toLocaleDateString()}`;
    // Use the updated term "暂存场景" in the prompt
    const sceneName = prompt("请输入要暂存场景的名称:", defaultName);

    if (sceneName !== null && sceneName.trim() !== "") {
        const trimmedName = sceneName.trim();
        const existingNames = getSavedSceneNames();

        if (existingNames.includes(trimmedName)) {
            // Update the confirmation message
            if (!confirm(`暂存场景 "${trimmedName}" 已存在。是否覆盖？`)) {
                console.log("Save As (LocalStorage) cancelled, name exists.");
                return; // Don't save if user cancels overwrite
            }
        }

        const sceneData = generateSceneDataObject(); // Use helper to get data
        if (sceneData && saveSceneDataToStorage(trimmedName, sceneData)) {
            sceneModified = false; // Mark as saved AFTER successful save
            updateSavedScenesList(); // Refresh the list in the modal/tab
            // Provide feedback without alert for smoother UX
            console.log(`场景 "${trimmedName}" 已成功暂存到浏览器！`);
            // Optionally show a temporary success message on the screen instead of alert
            // showTemporaryMessage(`场景 "${trimmedName}" 已暂存`, 'success'); 
        }
        // Error alerts are handled inside saveSceneDataToStorage
    } else {
        console.log("Save As (LocalStorage) cancelled by user.");
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

/**
 * 导出场景为文件（另存为功能）
 * 使用 File System Access API 让用户选择保存位置和文件名
 * 如果浏览器不支持，则回退到传统下载方式
 */
async function exportSceneAsFile() {
    console.log('[ExportAs] Exporting scene as file...');
    
    const sceneData = generateSceneDataObject();
    if (!sceneData) {
        showTemporaryMessage('无法生成场景数据', 'error');
        return;
    }
    
    const jsonString = JSON.stringify(sceneData, null, 2);
    const suggestedName = `场景_${new Date().toISOString().slice(0, 10)}.scene.json`;
    
    // 检查是否支持 File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: '光学场景文件',
                    accept: {
                        'application/json': ['.scene.json', '.json']
                    }
                }]
            });
            
            // 写入文件
            const writable = await fileHandle.createWritable();
            await writable.write(jsonString);
            await writable.close();
            
            // 标记为已保存
            markSceneAsSaved();
            
            showTemporaryMessage(`场景已保存为 "${fileHandle.name}"`, 'success');
            console.log('[ExportAs] Scene saved to:', fileHandle.name);
            
        } catch (err) {
            // 用户取消选择
            if (err.name === 'AbortError') {
                console.log('[ExportAs] User cancelled file save');
                return;
            }
            console.error('[ExportAs] Failed to save file:', err);
            showTemporaryMessage(`保存失败: ${err.message}`, 'error');
        }
    } else {
        // 回退到传统下载方式
        console.log('[ExportAs] File System Access API not supported, using download');
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 标记为已保存
        markSceneAsSaved();
        
        showTemporaryMessage('场景已下载', 'success');
        console.log('[ExportAs] Scene download triggered');
    }
}


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
            if (sceneData.version !== "1.0" && sceneData.version !== "1.1") console.warn(`Importing scene version ${sceneData.version}`);

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
    
    // 调试：检查元素是否存在
    const menuNewProject = document.getElementById('menu-new-project');
    const menuNewScene = document.getElementById('menu-new-scene');
    console.log("menu-new-project element:", menuNewProject);
    console.log("menu-new-scene element:", menuNewScene);
    
    // File Menu
    if (menuNewScene) {
        menuNewScene.addEventListener('click', (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            console.log("menu-new-scene clicked!");
            handleNewScene();
        });
    } else {
        console.error("menu-new-scene element not found!");
    }
    
    // 新建项目
    if (menuNewProject) {
        menuNewProject.addEventListener('click', (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            console.log("menu-new-project clicked!");
            handleNewProject();
        });
    } else {
        console.error("menu-new-project element not found!");
    }
    
    // 管理项目 - 切换到项目标签页
    const menuManageProjects = document.getElementById('menu-manage-projects');
    if (menuManageProjects) {
        menuManageProjects.addEventListener('click', (e) => { 
            e.preventDefault(); 
            e.stopPropagation();
            console.log("Action: Manage Projects");
            activateTab('unified-project-tab');
        });
    }
    
    document.getElementById('menu-import-scene')?.addEventListener('click', (e) => { e.preventDefault(); triggerFileInputForImport(); });
    document.getElementById('menu-export-scene')?.addEventListener('click', (e) => { e.preventDefault(); exportScene(); });
    document.getElementById('menu-manage-scenes')?.addEventListener('click', (e) => { e.preventDefault(); activateTab('unified-project-tab'); });

    // Edit Menu
    document.getElementById('menu-delete-selected')?.addEventListener('click', (e) => {
        e.preventDefault();
        deleteSelectedComponents(); // Call the new function
    });
    // --- Inside setupEventListeners, listener for #menu-clear-all ---
    document.getElementById('menu-clear-all')?.addEventListener('click', (e) => {
        e.preventDefault();
        // Only proceed if there are components to clear
        if (components.length > 0) {
            // Ask for confirmation (Update message to indicate it IS undoable)
            if (confirm("确定要清空画布上的所有元件吗？此操作可以撤销。")) {
                console.log("User confirmed clear all.");

                // --- Use the ClearAllCommand ---
                const command = new ClearAllCommand(components); // Pass the components array by reference
                command.execute(); // Execute the command immediately
                historyManager.addCommand(command); // Add it to the history
                updateUndoRedoUI(); // Update buttons
                sceneModified = true; // Clearing modifies the scene
                markSceneAsModified(); // 标记场景已修改

                // Optional: Should clearing also clear the auto-save? Maybe not.
                // localStorage.removeItem(LOCALSTORAGE_SCENE_KEY); 

                console.log("ClearAllCommand executed and added to history.");
                // activateTab('properties-tab'); // updateInspector called in execute handles this if needed
            } else {
                console.log("Clear all cancelled by user.");
            }
        } else {
            console.log("Clear all ignored, no components on canvas.");
            // Optionally show a small message to the user?
            // alert("画布上没有元件可供清除。"); 
        }
    });
    // --- End listener for #menu-clear-all ---
    document.getElementById('menu-undo')?.addEventListener('click', (e) => { e.preventDefault(); alert('撤销功能开发中...'); });
    document.getElementById('menu-redo')?.addEventListener('click', (e) => { e.preventDefault(); alert('重做功能开发中...'); });

    // View Menu
    document.getElementById('menu-reset-view')?.addEventListener('click', (e) => { e.preventDefault(); cameraScale = 1.0; cameraOffset = new Vector(0, 0); needsRetrace = true; });
    document.getElementById('menu-toggle-grid')?.addEventListener('click', (e) => { e.preventDefault(); showGrid = !showGrid; const cb = document.getElementById('setting-show-grid'); if (cb) cb.checked = showGrid; saveSettings(); needsRetrace = true; });

    // Simulation Menu
    document.getElementById('menu-mode-raytrace')?.addEventListener('click', (e) => { e.preventDefault(); if (currentMode !== 'ray_trace') switchMode('ray_trace'); });
    document.getElementById('menu-mode-lensimaging')?.addEventListener('click', (e) => { e.preventDefault(); if (currentMode !== 'lens_imaging') switchMode('lens_imaging'); });
    document.getElementById('menu-mode-diagram')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        // 切换到专业绘图模式
        const trySwitch = () => {
            if (typeof window.getModeManager === 'function') {
                const modeManager = window.getModeManager();
                modeManager.switchMode('diagram');
                return true;
            } else if (typeof window.getDiagramModeIntegration === 'function') {
                const integration = window.getDiagramModeIntegration();
                integration.switchToDiagramMode();
                return true;
            }
            return false;
        };
        
        if (!trySwitch()) {
            // 模块可能还在加载中，显示提示并重试
            showTemporaryMessage('专业绘图模式正在加载中...', 'info');
            let retryCount = 0;
            const maxRetries = 20; // 最多重试20次，每次100ms
            const retryInterval = setInterval(() => {
                retryCount++;
                if (trySwitch()) {
                    clearInterval(retryInterval);
                    showTemporaryMessage('已切换到专业绘图模式', 'success');
                } else if (retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                    console.error('专业绘图模式模块加载失败');
                    showTemporaryMessage('专业绘图模式加载失败，请刷新页面重试', 'error');
                }
            }, 100);
        }
    });
    document.getElementById('menu-open-settings')?.addEventListener('click', (e) => { e.preventDefault(); activateTab('settings-tab'); });
    document.getElementById('menu-toggle-arrows')?.addEventListener('click', (e) => { e.preventDefault(); globalShowArrows = !globalShowArrows; if (globalShowArrows) arrowAnimationStartTime = performance.now() / 1000.0; else arrowAnimationStates.clear(); const cb = document.getElementById('setting-show-arrows'); if (cb) cb.checked = globalShowArrows; saveSettings(); /* Update button text? */ document.getElementById('toggle-arrows-btn')?.(globalShowArrows ? "隐藏所有箭头" : "显示所有箭头"); });
    document.getElementById('menu-toggle-selected-arrow')?.addEventListener('click', (e) => { e.preventDefault(); onlyShowSelectedSourceArrow = !onlyShowSelectedSourceArrow; const cb = document.getElementById('setting-selected-arrow'); if (cb) cb.checked = onlyShowSelectedSourceArrow; saveSettings(); /* Update button text? */ document.getElementById('toggle-selected-arrow-btn')?.(onlyShowSelectedSourceArrow ? "取消仅选中" : "仅显示选中"); });

    // Help Menu
    document.getElementById('menu-user-guide')?.addEventListener('click', (e) => { e.preventDefault(); const modal = document.getElementById('guide-modal'); if (modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('visible'), 10); } });
    document.getElementById('menu-about')?.addEventListener('click', (e) => { e.preventDefault(); const modal = document.getElementById('about-modal'); if (modal) { modal.style.display = 'flex'; setTimeout(() => modal.classList.add('visible'), 10); } });
    document.getElementById('menu-keyboard-shortcuts')?.addEventListener('click', (e) => { e.preventDefault(); showKeyboardShortcuts(); });
    document.getElementById('menu-performance-stats')?.addEventListener('click', (e) => { e.preventDefault(); showPerformanceStats(); });

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
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            // Delete button should delete ALL selected items
            deleteSelectedComponents();
        });
    }

    // Settings Tab Controls
    const gridCheckbox = document.getElementById('setting-show-grid');
    if (gridCheckbox) gridCheckbox.addEventListener('change', () => { showGrid = gridCheckbox.checked; saveSettings(); needsRetrace = true; });
    const showArrowsCheckbox = document.getElementById('setting-show-arrows');
    if (showArrowsCheckbox) showArrowsCheckbox.addEventListener('change', () => { globalShowArrows = showArrowsCheckbox.checked; if (globalShowArrows) arrowAnimationStartTime = performance.now() / 1000.0; else arrowAnimationStates.clear(); saveSettings(); });
    const selectedArrowCheckbox = document.getElementById('setting-selected-arrow');
    if (selectedArrowCheckbox) selectedArrowCheckbox.addEventListener('change', () => { onlyShowSelectedSourceArrow = selectedArrowCheckbox.checked; saveSettings(); });
    const arrowTrailCheckbox = document.getElementById('setting-arrow-trail');
    if (arrowTrailCheckbox) arrowTrailCheckbox.addEventListener('change', () => { showArrowTrail = arrowTrailCheckbox.checked; saveSettings(); });
    // --- ADD Listener for Grid Snap ---
    const gridSnapCheckbox = document.getElementById('setting-enable-snap');
    if (gridSnapCheckbox) {
        gridSnapCheckbox.addEventListener('change', () => {
            enableGridSnap = gridSnapCheckbox.checked;
            console.log("Grid Snap Toggled:", enableGridSnap);
            // No need to save this setting currently, it's a session preference
        });
    }
    // --- END Listener for Grid Snap ---


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
    document.getElementById('guide-modal-close-btn')?.addEventListener('click', () => { const m = document.getElementById('guide-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } });
    document.getElementById('about-modal-close-btn')?.addEventListener('click', () => { const m = document.getElementById('about-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } });
    // Add closing by clicking overlay for modals
    document.getElementById('guide-modal')?.addEventListener('click', (e) => { if (e.target.id === 'guide-modal') { const m = document.getElementById('guide-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } } });
    document.getElementById('about-modal')?.addEventListener('click', (e) => { if (e.target.id === 'about-modal') { const m = document.getElementById('about-modal'); if (m) { m.classList.remove('visible'); setTimeout(() => m.style.display = 'none', 300); } } });


    // --- Canvas Events ---
    if (canvas) {
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
        // --- Touch Event Listeners for Canvas ---
        console.log("Adding touch event listeners for canvas...");
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); // Use passive: false to allow preventDefault
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchcancel', handleTouchEnd); // Treat cancel like end
        // --- End Touch Listeners ---
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



    // 在 Edit Menu 部分
    document.getElementById('menu-undo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (historyManager.canUndo()) {
            historyManager.undo();
            updateUndoRedoUI();
            needsRetrace = true; // 撤销/重做通常需要重新计算
            updateInspector(); // 更新检查器以反映状态变化
            console.log("执行 Undo 操作");
        }
    });
    document.getElementById('menu-redo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (historyManager.canRedo()) {
            historyManager.redo();
            updateUndoRedoUI();
            needsRetrace = true;
            updateInspector();
            console.log("执行 Redo 操作");
        }
    });
    // 同时启用菜单项（移除 disabled-link class）
    document.getElementById('menu-undo')?.classList.remove('disabled-link');
    document.getElementById('menu-redo')?.classList.remove('disabled-link');


    // 在 setupEventListeners 函数中:

    // --- Undo/Redo Buttons (Top Bar) ---
    document.getElementById('undo-button')?.addEventListener('click', () => {
        if (historyManager.canUndo()) {
            historyManager.undo();
            updateUndoRedoUI();
            needsRetrace = true;
            updateInspector(); // Update inspector after undo/redo
            console.log("执行 Undo (按钮)");
        }
    });

    document.getElementById('redo-button')?.addEventListener('click', () => {
        if (historyManager.canRedo()) {
            historyManager.redo();
            updateUndoRedoUI();
            needsRetrace = true;
            updateInspector(); // Update inspector after undo/redo
            console.log("执行 Redo (按钮)");
        }
    });
    // --- End Undo/Redo Buttons ---

    // 保持原来的菜单项监听器，但它们现在是次要的
    document.getElementById('menu-undo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (historyManager.canUndo()) { // 调用与按钮相同的逻辑
            historyManager.undo(); updateUndoRedoUI(); needsRetrace = true; updateInspector(); console.log("执行 Undo (菜单)");
        }
    });
    document.getElementById('menu-redo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (historyManager.canRedo()) { // 调用与按钮相同的逻辑
            historyManager.redo(); updateUndoRedoUI(); needsRetrace = true; updateInspector(); console.log("执行 Redo (菜单)");
        }
    });
    // 移除菜单项的 disabled-link 类（如果之前添加了）
    document.getElementById('menu-undo')?.classList.remove('disabled-link');
    document.getElementById('menu-redo')?.classList.remove('disabled-link');



    // --- Direct Icon Button Listeners ---
    console.log("Setting up direct icon button listeners...");
    document.getElementById('menu-icon-new')?.addEventListener('click', () => {
        // Reuse logic from menu-new-scene
        if (sceneModified && !confirm("当前场景有未保存的更改。确定要新建场景并放弃更改吗？")) return;
        console.log("Action: New Scene (Icon)");
        components = []; selectedComponent = null; historyManager.clear(); updateUndoRedoUI(); updateInspector(); activateTab('properties-tab'); cameraOffset = new Vector(0, 0); cameraScale = 1.0; sceneModified = false; needsRetrace = true;
    });
    document.getElementById('menu-icon-save-local')?.addEventListener('click', () => {
        console.log("Action: Save Local (Icon)");
        handleSaveAsClick(); // Use the existing save function
    });
    document.getElementById('menu-icon-export')?.addEventListener('click', () => {
        console.log("Action: Export File (Icon)");
        exportScene(); // Use the existing export function
    });
    // --- End Direct Icon Button Listeners ---

    // --- Sidebar Toggle Button Listener ---
    const sidebarToggleBtn = document.getElementById('menu-toggle-sidebars');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', () => {
            // Simple toggle logic: Show toolbar first, then inspector if toolbar already visible
            const isToolbarVisible = document.body.classList.contains('toolbar-visible');
            const isInspectorVisible = document.body.classList.contains('inspector-visible');

            if (!isToolbarVisible && !isInspectorVisible) {
                // Show toolbar
                document.body.classList.add('toolbar-visible');
                document.body.classList.remove('inspector-visible'); // Ensure inspector is hidden
            } else if (isToolbarVisible && !isInspectorVisible) {
                // Toolbar is visible, hide it and show inspector
                document.body.classList.remove('toolbar-visible');
                document.body.classList.add('inspector-visible');
            } else {
                // Inspector is visible (or both somehow?), hide both
                document.body.classList.remove('toolbar-visible');
                document.body.classList.remove('inspector-visible');
            }
            // Optional: Close sidebars if clicking outside them
            setupSidebarOverlayClick(); // Add overlay listener when a sidebar might be open
        });
    } else {
        console.warn("Sidebar toggle button #menu-toggle-sidebars not found.");
    }
    // --- End Sidebar Toggle Listener ---


    // --- 关键修复：添加这段代码来监听新的主题下拉菜单 ---
    const themeSwitcher = document.getElementById('combined-theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('change', (e) => {
            // 当下拉菜单变化时，调用 applyCombinedTheme 函数
            applyCombinedTheme(e.target.value);
            needsRetrace = true; 
        });
        console.log("成功为主题切换器添加了监听器。"); // 添加成功日志
    } else {
        // 如果没找到菜单，在控制台明确报错
        console.error("错误：未能找到ID为 'combined-theme-switcher' 的主题下拉菜单！请检查 index.html 文件。");
    }
    // --- 修复代码结束 ---

    console.log("Event listeners setup complete.");

}
// --- END OF REPLACEMENT ---

// --- NEW: Helper to add overlay click listener ---
function setupSidebarOverlayClick() {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) { // Create overlay if it doesn't exist
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay); // Append it once
    }
    // Remove previous listener to avoid duplicates
    overlay.removeEventListener('click', closeSidebars);
    // Add listener
    overlay.addEventListener('click', closeSidebars);
}

// --- NEW: Function to close sidebars ---
function closeSidebars() {
    document.body.classList.remove('toolbar-visible');
    document.body.classList.remove('inspector-visible');
    // No need to remove overlay listener here, setupSidebarOverlayClick handles it
}

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

// --- THEME HELPERS: Ensure visibility on light canvas by adjusting too-light draw colors ---
function isLightCanvasTheme() {
    const theme = (document.body && document.body.getAttribute('data-canvas-theme')) || 'dark';
    // Default canvas is dark when no attribute; only explicit 'light' should be treated as light
    return theme === 'light';
}

function parseColorToRgba(colorString) {
    if (!colorString || typeof colorString !== 'string') return null;
    const s = colorString.trim().toLowerCase();
    const named = {
        white: [255, 255, 255, 1],
        silver: [192, 192, 192, 1],
        gainsboro: [220, 220, 220, 1],
        lightgray: [211, 211, 211, 1],
        whitesmoke: [245, 245, 245, 1],
        yellow: [255, 255, 0, 1]
    };
    if (s in named) return named[s];
    if (s.startsWith('#')) {
        const hex = s.slice(1);
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return [r, g, b, 1];
        }
        if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r, g, b, 1];
        }
    }
    const rgbMatch = s.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
        const parts = rgbMatch[1].split(',').map(p => p.trim());
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
        if ([r, g, b, a].every(v => !isNaN(v))) return [r, g, b, a];
    }
    return null;
}

function isVeryLightColor(colorString) {
    const rgba = parseColorToRgba(colorString);
    if (!rgba) return false;
    const [r, g, b, a] = rgba;
    // Perceived brightness (simple): normalize to 0..1
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return brightness > 0.9 && a > 0.3; // Slightly stricter brightness threshold
}

function remapForLightCanvas(colorString, forFill = false) {
    if (!isLightCanvasTheme()) return colorString;
    if (!colorString || typeof colorString !== 'string') return colorString;
    const key = colorString.trim().toLowerCase();
    // Curated artistic palette mapping for common colors used by components on white canvas
    // Professional optical engineering color scheme for white canvas
    const strokeMap = {
        // Base neutrals - sophisticated charcoal tones
        '#ffffff': '#1a202c',  // Pure white -> deep charcoal
        'white': '#1a202c',
        '#cccccc': '#4a5568',  // Light gray -> slate
        '#aaaaaa': '#4a5568',  // Medium gray -> slate
        'silver': '#718096',   // Silver -> blue-gray
        'dimgray': '#2d3748',  // Dim gray -> charcoal
        '#888888': '#2d3748',  // Medium gray -> charcoal
        '#dddddd': '#4a5568',  // Light gray -> slate
        
        // Optical component colors - professional engineering palette
        '#ffff00': '#d69e2e',  // Yellow -> warm amber (selection highlight)
        'yellow': '#d69e2e',
        'cyan': '#2b6cb0',     // Cyan -> professional blue
        '#aaaaff': '#2c5282',  // Lens blue -> deep professional blue
        '#87cefa': '#2b6cb0',  // Light sky blue -> professional blue
        '#b0e0e6': '#2c7a7b',  // Powder blue -> deep teal
        '#ffc080': '#c05621',  // Orange -> warm brown
        '#ff69b4': '#97266d',  // Hot pink -> deep magenta
        '#8a2be2': '#553c9a',  // Blue violet -> deep violet
        
        // Additional professional mappings
        '#90c0ff': '#2c5282',  // Light blue -> deep blue
        '#ffb6c1': '#c53030',  // Light pink -> deep red
        '#d3d3d3': '#4a5568',  // Light gray -> slate
        '#f0f0f0': '#4a5568',  // Very light gray -> slate
        'lightgray': '#4a5568',
        'lightgrey': '#4a5568',
        'gainsboro': '#4a5568',
        'whitesmoke': '#4a5568'
    };
    const fillMap = {
        // Base neutrals - subtle transparency
        '#ffffff': 'rgba(26, 32, 44, 0.15)',
        'white': 'rgba(26, 32, 44, 0.15)',
        '#cccccc': 'rgba(74, 85, 104, 0.12)',
        '#aaaaaa': 'rgba(74, 85, 104, 0.12)',
        'silver': 'rgba(113, 128, 150, 0.15)',
        'dimgray': 'rgba(45, 55, 72, 0.18)',
        '#888888': 'rgba(45, 55, 72, 0.18)',
        '#dddddd': 'rgba(74, 85, 104, 0.10)',
        
        // Optical components - professional fills
        '#ffff00': 'rgba(214, 158, 46, 0.25)',
        'yellow': 'rgba(214, 158, 46, 0.25)',
        'cyan': 'rgba(43, 108, 176, 0.15)',
        '#aaaaff': 'rgba(44, 82, 130, 0.12)',
        '#87cefa': 'rgba(43, 108, 176, 0.12)',
        '#b0e0e6': 'rgba(44, 122, 123, 0.12)',
        '#ffc080': 'rgba(192, 86, 33, 0.15)',
        '#ff69b4': 'rgba(151, 38, 109, 0.15)',
        '#8a2be2': 'rgba(85, 60, 154, 0.12)',
        
        // Additional professional fills
        '#90c0ff': 'rgba(44, 82, 130, 0.10)',
        '#ffb6c1': 'rgba(197, 48, 48, 0.12)',
        '#d3d3d3': 'rgba(74, 85, 104, 0.08)',
        '#f0f0f0': 'rgba(74, 85, 104, 0.08)',
        'lightgray': 'rgba(74, 85, 104, 0.08)',
        'lightgrey': 'rgba(74, 85, 104, 0.08)',
        'gainsboro': 'rgba(74, 85, 104, 0.08)',
        'whitesmoke': 'rgba(74, 85, 104, 0.08)'
    };

    // If the color is in curated map, use it; otherwise soften overly bright colors
    if (forFill && key in fillMap) return fillMap[key];
    if (!forFill && key in strokeMap) return strokeMap[key];
    if (isVeryLightColor(key)) {
        return forFill ? 'rgba(74, 85, 104, 0.28)' : '#4a5568';
    }
    return colorString;
}

function installContextThemeGuards(context2d) {
    if (!context2d || context2d.__themeGuardsInstalled) return;
    const strokeDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context2d), 'strokeStyle');
    const fillDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context2d), 'fillStyle');
    if (strokeDesc && typeof strokeDesc.set === 'function') {
        Object.defineProperty(context2d, 'strokeStyle', {
            configurable: true,
            enumerable: true,
            get() { return strokeDesc.get.call(this); },
            set(v) {
                if (this.__bypassThemeGuard) { strokeDesc.set.call(this, v); return; }
                strokeDesc.set.call(this, remapForLightCanvas(v, false));
            }
        });
    }
    if (fillDesc && typeof fillDesc.set === 'function') {
        Object.defineProperty(context2d, 'fillStyle', {
            configurable: true,
            enumerable: true,
            get() { return fillDesc.get.call(this); },
            set(v) {
                if (this.__bypassThemeGuard) { fillDesc.set.call(this, v); return; }
                fillDesc.set.call(this, remapForLightCanvas(v, true));
            }
        });
    }
    context2d.__themeGuardsInstalled = true;
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
    const gridSnapCheckbox = document.getElementById('setting-enable-snap'); // Get snap checkbox
    const maxRaysInput = document.getElementById('setting-max-rays');
    const maxRaysValueSpan = document.getElementById('setting-max-rays-value');
    const maxBouncesInput = document.getElementById('setting-max-bounces');
    const maxBouncesValueSpan = document.getElementById('setting-max-bounces-value');
    const minIntensityInput = document.getElementById('setting-min-intensity');
    const minIntensityValueSpan = document.getElementById('setting-min-intensity-value');
    const fastWlsCheckbox = document.getElementById('setting-fast-wls');
    const showArrowsCheckbox = document.getElementById('setting-show-arrows'); // Get new checkboxes/inputs
    const selectedArrowCheckbox = document.getElementById('setting-selected-arrow');
    const arrowTrailCheckbox = document.getElementById('setting-arrow-trail');
    const speedSlider = document.getElementById('arrow-speed'); // Get speed slider

    const updateSpan = (span, value, formatFn) => { if (span) span.textContent = `(${formatFn(value)})`; };

    if (gridCheckbox) gridCheckbox.checked = showGrid;
    if (gridSnapCheckbox) gridSnapCheckbox.checked = enableGridSnap; // Set snap checkbox state
    if (maxRaysInput) maxRaysInput.value = window.maxRaysPerSource;
    if (maxBouncesInput) maxBouncesInput.value = window.globalMaxBounces;
    if (minIntensityInput) minIntensityInput.value = window.globalMinIntensity;
    if (fastWlsCheckbox) fastWlsCheckbox.checked = window.fastWhiteLightMode; // Assuming fastWhiteLightMode is global
    if (showArrowsCheckbox) showArrowsCheckbox.checked = globalShowArrows;
    if (selectedArrowCheckbox) selectedArrowCheckbox.checked = onlyShowSelectedSourceArrow;
    if (arrowTrailCheckbox) arrowTrailCheckbox.checked = showArrowTrail;
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


// --- Touch Event Handler Functions ---

let touchState = {
    isDown: false,
    isMultiTouch: false,
    lastSingleTouchId: null,
    lastTouches: [], // Store active touches for multi-touch
    pinchStartDistance: 0,
    pinchStartMidpoint: null,
    panStartMidpoint: null,
    // --- ADD THESE ---
    touchStartTime: 0,
    touchStartPos: null, // Store logical position at touch start
    isDraggingConfirmed: false, // Flag to confirm drag intent
    dragThreshold: 5 // Pixels (logical) movement needed to confirm drag
    // --- END ADD ---
};

// Helper to get logical coordinates from a Touch object
function getTouchPos(canvasElement, touch) {
    // 确保 cameraOffset 已初始化
    if (!cameraOffset) {
        if (!initVectorVariables()) {
            return new Vector(0, 0);
        }
    }
    const rect = canvasElement.getBoundingClientRect();
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;
    const logicalX = (cssX - cameraOffset.x) / cameraScale;
    const logicalY = (cssY - cameraOffset.y) / cameraScale;
    return new Vector(logicalX, logicalY);
}

// Helper to calculate distance between two touches
function getTouchDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Helper to calculate midpoint between two touches (in CSS pixels)
function getTouchMidpoint(touch1, touch2) {
    return new Vector(
        (touch1.clientX + touch2.clientX) / 2,
        (touch1.clientY + touch2.clientY) / 2
    );
}

function handleTouchStart(event) {
    event.preventDefault();
    console.log("Touch Start:", event.touches.length);

    touchState.lastTouches = Array.from(event.touches);

    if (event.touches.length === 1 && !touchState.isDown) {
        // --- Single Touch Start ---
        touchState.isDown = true;
        touchState.isMultiTouch = false;
        touchState.isDraggingConfirmed = false; // Reset drag confirmation
        const touch = event.touches[0];
        touchState.lastSingleTouchId = touch.identifier;
        touchState.touchStartTime = performance.now(); // Record time
        touchState.touchStartPos = getTouchPos(canvas, touch); // Record logical position

        // -- DON'T call handleMouseDown here anymore --

        // Tentatively set cursor to indicate potential interaction
        // canvas.style.cursor = 'pointer'; // Or based on potential hit

    } else if (event.touches.length === 2) {
        // --- Multi Touch Start ---
        // If a single drag was ongoing, end it cleanly before starting multi-touch
        if (isDragging && draggingComponents.length > 0) {
            console.log("Switching from single drag to multi-touch, ending drag.");
            handleMouseUp({ button: 0 }); // Simulate mouse up to finalize single drag command
        }

        touchState.isDown = true; // Still consider touch active
        touchState.isMultiTouch = true;
        isDragging = false; // Ensure component dragging stops
        draggingComponents = []; // Clear component drag array
        dragStartOffsets.clear(); // Clear offsets
        ongoingActionState = null; // Clear action state
        activeGuides = []; // Clear guides

        // Clear any pending single-touch drag confirmation
        touchState.isDraggingConfirmed = false;
        touchState.touchStartTime = 0;
        touchState.touchStartPos = null;

        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        touchState.pinchStartDistance = getTouchDistance(touch1, touch2);
        touchState.panStartMidpoint = getTouchMidpoint(touch1, touch2); // Use CSS pixels for panning delta
        canvas.style.cursor = 'move';
    }
}

function handleTouchMove(event) {
    event.preventDefault(); // Prevent scrolling during canvas interaction
    // console.log("Touch Move:", event.touches.length); // Debug (can be noisy)

    if (!touchState.isDown) return; // Ignore if touch didn't start here

    touchState.lastTouches = Array.from(event.touches); // Update stored touches

    if (touchState.isMultiTouch && event.touches.length === 2) {
        // --- Multi Touch Move (Pan/Zoom) ---
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];

        // Calculate Zoom
        const currentDistance = getTouchDistance(touch1, touch2);
        if (touchState.pinchStartDistance > 0) {
            const scaleChange = currentDistance / touchState.pinchStartDistance;
            const newScale = cameraScale * scaleChange;

            // Apply Zoom centering on the midpoint
            const midpointCss = getTouchMidpoint(touch1, touch2);
            const logicalMidpointBeforeZoom = new Vector(
                (midpointCss.x - cameraOffset.x) / cameraScale,
                (midpointCss.y - cameraOffset.y) / cameraScale
            );

            cameraScale = Math.max(0.1, Math.min(10.0, newScale)); // Apply clamped scale

            // Adjust offset to keep logical midpoint stationary
            cameraOffset.x = midpointCss.x - logicalMidpointBeforeZoom.x * cameraScale;
            cameraOffset.y = midpointCss.y - logicalMidpointBeforeZoom.y * cameraScale;

            touchState.pinchStartDistance = currentDistance; // Update for next move delta
            needsRetrace = true;
        }


        // Calculate Pan (based on midpoint movement in CSS pixels)
        const currentMidpointCss = getTouchMidpoint(touch1, touch2);
        if (touchState.panStartMidpoint) {
            const panDelta = currentMidpointCss.subtract(touchState.panStartMidpoint);
            cameraOffset = cameraOffset.add(panDelta); // Apply pan delta directly
            touchState.panStartMidpoint = currentMidpointCss; // Update for next move delta
            needsRetrace = true;
        }
        needsRetrace = true; // Ensure redraw during pan/zoom


    } else if (!touchState.isMultiTouch && event.touches.length === 1) {
        // --- Single Touch Move ---
        const touch = event.touches[0];
        if (touch.identifier === touchState.lastSingleTouchId) {

            if (!touchState.isDraggingConfirmed) {
                // --- Check if drag threshold is met ---
                const currentPos = getTouchPos(canvas, touch);
                if (touchState.touchStartPos && currentPos.distanceTo(touchState.touchStartPos) > touchState.dragThreshold) {
                    console.log("Drag threshold met."); // Debug
                    touchState.isDraggingConfirmed = true;

                    // --- Initiate the Drag (like original mousedown) ---
                    const simulatedMouseDownEvent = {
                        clientX: touchState.lastTouches.find(t => t.identifier === touchState.lastSingleTouchId)?.clientX || event.touches[0].clientX, // Use stored start touch if available
                        clientY: touchState.lastTouches.find(t => t.identifier === touchState.lastSingleTouchId)?.clientY || event.touches[0].clientY,
                        button: 0,
                        preventDefault: () => { }, // Doesn't need to prevent default here
                    };
                    // **Call handleMouseDown here to select/start dragging**
                    handleMouseDown(simulatedMouseDownEvent);
                    // Ensure the component drag actually started
                    if (!isDragging || draggingComponents.length === 0) {
                        // If handleMouseDown didn't initiate a drag (e.g., clicked empty space), stop tracking
                        touchState.isDraggingConfirmed = false;
                        console.log("Drag not initiated by handleMouseDown, resetting."); // Debug
                    } else {
                        console.log("Drag confirmed and initiated."); // Debug
                    }
                }
            }

            // --- If drag IS confirmed, simulate MouseMove ---
            if (touchState.isDraggingConfirmed && isDragging) {
                const simulatedMouseMoveEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => event.preventDefault(),
                };
                handleMouseMove(simulatedMouseMoveEvent); // Call existing mouse move logic
            }
        }
    }
}

function handleTouchEnd(event) {
    // Don't prevent default on touchend usually
    console.log("Touch End/Cancel:", event.touches.length, "Changed:", event.changedTouches.length);

    if (!touchState.isDown) return; // Ignore if we weren't tracking

    const endedTouchIds = Array.from(event.changedTouches).map(t => t.identifier);

    if (touchState.isMultiTouch) {
        // --- Multi Touch End ---
        if (event.touches.length < 2) {
            // Transitioning out of multi-touch
            console.log("Ending multi-touch gesture.");
            touchState.isMultiTouch = false;
            touchState.pinchStartDistance = 0;
            touchState.panStartMidpoint = null;
            touchState.lastSingleTouchId = null; // Reset single touch tracking too
            // If one finger remains, treat it as a new touch start? Or just end? Let's just end.
            if (event.touches.length === 0) {
                touchState.isDown = false; // No fingers left
                // No need to simulate mouseup here as multitouch doesn't directly use it
                handleMouseMove(event); // Update cursor based on potential remaining touches or lack thereof
            }
            canvas.style.cursor = 'default';
        }
        // Keep tracking if 2+ touches still remain (unlikely for pinch/pan end)

    } else if (!touchState.isMultiTouch && endedTouchIds.includes(touchState.lastSingleTouchId)) {
        // --- Single Touch End ---
        const endedTouch = Array.from(event.changedTouches).find(t => t.identifier === touchState.lastSingleTouchId);

        if (!touchState.isDraggingConfirmed) {
            // --- This is a TAP (ended before drag threshold met) ---
            console.log("Tap detected.");
            // Simulate a MouseDown *and* MouseUp at the start position to trigger selection/placement
            if (touchState.touchStartPos && endedTouch) { // Ensure we have start pos
                const simulatedMouseDownEvent = {
                    clientX: touchState.lastTouches.find(t => t.identifier === touchState.lastSingleTouchId)?.clientX || endedTouch.clientX,
                    clientY: touchState.lastTouches.find(t => t.identifier === touchState.lastSingleTouchId)?.clientY || endedTouch.clientY,
                    button: 0,
                    preventDefault: () => { },
                };
                handleMouseDown(simulatedMouseDownEvent); // Trigger selection/placement

                // Immediately simulate MouseUp (no drag happened)
                handleMouseUp({ button: 0 });
            }
        } else {
            // --- This is the END of a DRAG ---
            console.log("Ending single touch drag gesture.");
            if (endedTouch) {
                const simulatedMouseUpEvent = {
                    clientX: endedTouch.clientX,
                    clientY: endedTouch.clientY,
                    button: 0,
                    preventDefault: () => { },
                };
                handleMouseUp(simulatedMouseUpEvent); // Call existing mouse up logic for drag end
            } else {
                handleMouseUp({ button: 0 }); // Fallback
            }
        }

        // Reset single touch tracking state AFTER processing
        touchState.isDown = false;
        touchState.lastSingleTouchId = null;
        touchState.isDraggingConfirmed = false;
        touchState.touchStartTime = 0;
        touchState.touchStartPos = null;

    }

    // General cleanup
    touchState.lastTouches = Array.from(event.touches);
    if (event.touches.length === 0) {
        touchState.isDown = false;
        touchState.isMultiTouch = false;
        touchState.lastSingleTouchId = null;
        if (!isDragging) { // Reset cursor if not already handled by mouseup->mousemove
            canvas.style.cursor = 'default';
        }
    }
}

// --- END Touch Event Handler Functions ---

// main.js - 全新且最终的主题管理函数

/**
 * 应用组合主题，并将其保存到 localStorage。
 * @param {string} combinedThemeName - e.g., "light-ui-dark-canvas"
 */
function applyCombinedTheme(combinedThemeName) {
    // 健壮性检查：如果名称无效，则使用默认值以避免页面错乱
    if (typeof combinedThemeName !== 'string' || !combinedThemeName.includes('-ui-')) {
        console.error("应用主题失败：无效的主题名称。", combinedThemeName);
        combinedThemeName = 'light-ui-dark-canvas'; // 恢复为安全的默认值
    }

    // 解析组合名称以分别获取 UI 主题和画布主题
    const parts = combinedThemeName.split('-ui-'); // 使用 "-ui-" 作为明确的分隔符
    const uiTheme = parts[0];      // "light" or "dark"
    const canvasTheme = parts[1].replace('-canvas', ''); // "light" or "dark"

    // 检查解析结果是否有效
    if (!uiTheme || !canvasTheme) {
        console.error("解析主题名称失败。", combinedThemeName);
        return; // 停止执行以避免设置错误的属性
    }

    // 应用规则：默认主题为 "light-ui-dark-canvas"，此时不设置任何 data 属性（使用 CSS 默认变量）
    // 仅当需要非默认效果时，才设置相应的 data 属性。

    // UI 主题：light -> 删除属性; dark -> 设置 data-ui-theme="dark"
    if (uiTheme === 'dark') {
        document.body.setAttribute('data-ui-theme', 'dark');
    } else {
        document.body.removeAttribute('data-ui-theme');
    }

    // 画布主题：dark -> 删除属性; light -> 设置 data-canvas-theme="light"
    if (canvasTheme === 'light') {
        document.body.setAttribute('data-canvas-theme', 'light');
    } else {
        document.body.removeAttribute('data-canvas-theme');
    }

    // 保存用户的选择到本地存储
    localStorage.setItem('opticsLabCombinedTheme', combinedThemeName);

    // 更新下拉菜单的显示值以保持同步
    const switcher = document.getElementById('combined-theme-switcher');
    if (switcher) {
        switcher.value = combinedThemeName;
    }

    console.log(`主题已应用: UI=${uiTheme}, 画布=${canvasTheme}`);
}

/**
 * 在应用启动时，从 localStorage 加载主题，如果不存在则使用默认值。
 */
function loadInitialTheme() {
    // 您的要求：默认是白天UI，深色画布
    const savedTheme = localStorage.getItem('opticsLabCombinedTheme') || 'light-ui-dark-canvas';
    applyCombinedTheme(savedTheme);
}

// --- 模式切换器初始化 ---
let modeSwitcherInstance = null;
let diagramModeIntegration = null;

/**
 * 初始化专业绘图模式集成
 * 创建DiagramModeIntegration实例并设置相关功能
 */
function initializeDiagramModeIntegration() {
    const doInit = () => {
        if (typeof window.initializeDiagramMode === 'function') {
            try {
                diagramModeIntegration = window.initializeDiagramMode({
                    components: components,
                    cameraState: {
                        scale: cameraScale,
                        offset: cameraOffset
                    }
                });
                console.log('专业绘图模式集成已初始化');
                return true;
            } catch (error) {
                console.error('初始化专业绘图模式失败:', error);
                return false;
            }
        } else if (typeof window.getDiagramModeIntegration === 'function') {
            try {
                diagramModeIntegration = window.getDiagramModeIntegration();
                diagramModeIntegration.initialize({
                    components: components,
                    cameraState: {
                        scale: cameraScale,
                        offset: cameraOffset
                    }
                });
                console.log('专业绘图模式集成已初始化');
                return true;
            } catch (error) {
                console.error('初始化专业绘图模式失败:', error);
                return false;
            }
        }
        return false;
    };

    // 尝试立即初始化
    if (!doInit()) {
        // 延迟初始化，等待模块加载
        let retryCount = 0;
        const maxRetries = 30; // 最多重试30次，每次100ms
        const retryInterval = setInterval(() => {
            retryCount++;
            if (doInit()) {
                clearInterval(retryInterval);
                console.log('专业绘图模式集成已延迟初始化');
            } else if (retryCount >= maxRetries) {
                clearInterval(retryInterval);
                console.warn('DiagramModeIntegration模块加载超时，专业绘图功能可能不可用');
            }
        }, 100);
    }
}

/**
 * 初始化模式切换器
 * 创建ModeSwitcher实例并设置模式切换事件处理
 */
function initializeModeSwitcher() {
    const container = document.getElementById('mode-switcher-container');
    if (!container) {
        console.warn('模式切换器容器未找到，跳过初始化');
        return;
    }

    // 检查ModeSwitcher是否可用
    if (typeof window.createModeSwitcher === 'function') {
        modeSwitcherInstance = window.createModeSwitcher(container, {
            showLabels: true,
            showIcons: true,
            compact: false
        });
        console.log('模式切换器已初始化');
    } else if (typeof createModeSwitcher === 'function') {
        modeSwitcherInstance = createModeSwitcher(container, {
            showLabels: true,
            showIcons: true,
            compact: false
        });
        console.log('模式切换器已初始化');
    } else {
        // 延迟初始化，等待模块加载
        setTimeout(() => {
            if (typeof window.createModeSwitcher === 'function') {
                modeSwitcherInstance = window.createModeSwitcher(container, {
                    showLabels: true,
                    showIcons: true,
                    compact: false
                });
                console.log('模式切换器已延迟初始化');
            } else {
                console.warn('ModeSwitcher模块未加载，模式切换功能不可用');
            }
        }, 500);
    }

    // 监听模式切换事件
    document.addEventListener('app-mode-change', (event) => {
        const { mode, config } = event.detail;
        handleModeChange(mode, config);
    });
}

/**
 * 处理模式切换
 * @param {string} mode - 新模式 ('simulation' | 'diagram')
 * @param {Object} config - 模式UI配置
 */
function handleModeChange(mode, config) {
    console.log(`模式已切换到: ${mode}`);
    
    // 更新UI显示
    updateModeSpecificUI(mode);
    
    // 触发重绘
    needsRetrace = true;
}

/**
 * 更新模式特定的UI元素
 * @param {string} mode - 当前模式
 */
function updateModeSpecificUI(mode) {
    // 显示/隐藏模式特定的工具栏和面板
    const simulationOnlyElements = document.querySelectorAll('.simulation-only');
    const diagramOnlyElements = document.querySelectorAll('.diagram-only');
    
    if (mode === 'simulation') {
        simulationOnlyElements.forEach(el => el.style.display = '');
        diagramOnlyElements.forEach(el => el.style.display = 'none');
    } else if (mode === 'diagram') {
        simulationOnlyElements.forEach(el => el.style.display = 'none');
        diagramOnlyElements.forEach(el => el.style.display = '');
    }
    
    // 更新模式提示
    if (modeHintElement) {
        const modeText = mode === 'simulation' ? '模拟模式' : '绘图模式';
        // 可以在这里显示模式提示，但不覆盖现有的操作提示
    }
}

// --- REPLACEMENT for initialize function (V4 - Includes History Init & UI Update) ---
function initialize() {
    // --- Prevent multiple initializations ---
    if (initialized) {
        console.warn("Initialization function called again, skipping.");
        return;
    }
    // Flag is set inside setupEventListeners now to avoid race conditions
    // initialized = true;
    // --- End prevention ---

    // --- 初始化 HistoryManager ---
    if (!historyManager && typeof HistoryManager !== 'undefined') {
        historyManager = new HistoryManager();
        window.historyManager = historyManager;
    }

     // --- 加载主题和设置 ---
    loadInitialTheme();

    console.log("开始初始化光学实验室...");
    loadSettings(); // Load saved settings first

    // --- Start with an Empty Scene ---
    console.log("Initializing with an empty scene.");
    components = []; // Always start with no components loaded
    selectedComponent = null;
    draggingComponents = [];
    ongoingActionState = null; // Initialize action state tracker
    if (historyManager) historyManager.clear();   // Clear history on new initialization
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
    // Assign arrow speed slider (needed by setupEventListeners)
    arrowSpeedSlider = document.getElementById('arrow-speed');

    // Get canvas context
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("无法获取 Canvas 2D 上下文！");
        alert("无法获取 Canvas 绘图上下文，浏览器可能不支持。");
        return;
    }
    // Install theme guards so very light colors are darkened on light canvas
    installContextThemeGuards(ctx);

    // --- Initial Setup ---
    resizeCanvas();          // Set initial canvas size and scaling
    setupEventListeners();   // Setup ALL event listeners, including tabs and modals
    activateTab('properties-tab'); // Activate properties tab by default
    updateInspector();       // Update inspector content (shows placeholder if nothing selected)

    // --- 初始化模式切换器 ---
    initializeModeSwitcher();
    
    // --- 初始化专业绘图模式集成 ---
    initializeDiagramModeIntegration();

    updateUndoRedoUI();      // <<<--- Update undo/redo button initial state
    needsRetrace = true;       // Mark for initial ray trace
    lastTimestamp = performance.now(); // Get starting time
    requestAnimationFrame(gameLoop); // Start the main loop

    console.log("初始化完成，主循环已启动。");
}
// --- END OF REPLACEMENT for initialize ---
// --- DOMContentLoaded ---
// Ensures the DOM is fully loaded before running initialization code.

/**
 * 等待模块加载完成
 * @param {number} maxWait - 最大等待时间（毫秒）
 * @param {number} interval - 检查间隔（毫秒）
 * @returns {Promise<boolean>} - 是否成功加载
 */
function waitForModules(maxWait = 5000, interval = 50) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        function check() {
            // 检查核心类是否已加载
            if (typeof Vector !== 'undefined' && 
                typeof GameObject !== 'undefined' && 
                typeof Ray !== 'undefined' && 
                typeof OpticalComponent !== 'undefined' &&
                typeof HistoryManager !== 'undefined') {
                console.log("所有核心模块已加载完成。");
                resolve(true);
                return;
            }
            
            // 检查是否超时
            if (Date.now() - startTime > maxWait) {
                console.error("等待模块加载超时！");
                resolve(false);
                return;
            }
            
            // 继续等待
            setTimeout(check, interval);
        }
        
        check();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded 事件触发。");
    
    // 等待 ES6 模块加载完成
    const modulesLoaded = await waitForModules();
    
    if (modulesLoaded) {
        console.log("核心类已定义，准备调用 initialize...");
        
        // 初始化 Vector 相关变量
        initVectorVariables();
        
        initialize();
    } else {
        console.error("错误：一个或多个核心类 (Vector, GameObject, Ray, OpticalComponent, HistoryManager) 未定义！脚本加载顺序可能错误。");
        alert("无法加载核心脚本，请检查控制台获取详细信息！");
    }
});

console.log("main.js 加载完毕。");