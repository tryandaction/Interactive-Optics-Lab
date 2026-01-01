/**
 * SimulationApp.js - 模拟应用主类
 * 整合所有模块，管理应用状态和主循环
 */

import { Vector } from '../core/Vector.js';
import { Ray } from '../core/Ray.js';
import { GRID_SIZE, SNAP_THRESHOLD, GUIDE_COLOR, GUIDE_DASH } from '../core/constants.js';
import { RayRenderer } from '../rendering/RayRenderer.js';
import { GridRenderer } from '../rendering/GridRenderer.js';
import { HistoryManager } from '../managers/HistoryManager.js';

export class SimulationApp {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 渲染器
        this.rayRenderer = new RayRenderer(this.ctx);
        this.gridRenderer = new GridRenderer(this.ctx);
        
        // 管理器
        this.historyManager = new HistoryManager();
        
        // 状态
        this.components = [];
        this.selectedComponent = null;
        this.selectedComponents = [];
        this.currentRayPaths = [];
        this.needsRetrace = true;
        
        // 相机
        this.cameraScale = 1.0;
        this.cameraOffset = new Vector(0, 0);
        this.isPanning = false;
        this.lastPanMousePos = null;
        
        // 拖拽
        this.isDragging = false;
        this.draggingComponents = [];
        this.dragStartOffsets = new Map();
        this.dragStartMousePos = null;
        
        // 鼠标
        this.mousePos = new Vector(0, 0);
        this.mouseIsDown = false;
        
        // 工具
        this.componentToAdd = null;
        
        // 对齐辅助线
        this.activeGuides = [];
        
        // 设置
        this.showGrid = true;
        this.currentMode = 'ray_trace';
        
        // 箭头动画
        this.globalShowArrows = false;
        this.onlyShowSelectedSourceArrow = false;
        this.arrowAnimationSpeed = 100;
        this.showArrowTrail = true;
        this.arrowAnimationStates = new Map();
        this.arrowAnimationStartTime = 0;
        
        // 时间
        this.lastTimestamp = 0;
        
        // 初始化
        this._setupCanvas();
        this._bindEvents();
        
        // 导出到全局（兼容旧代码）
        this._exportGlobals();
    }

    _setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    _bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this._handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this._handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this._handleWheel(e));
        
        window.addEventListener('resize', () => this._setupCanvas());
    }

    _exportGlobals() {
        if (typeof window !== 'undefined') {
            window.components = this.components;
            window.selectedComponent = this.selectedComponent;
            window.selectedComponents = this.selectedComponents;
            window.currentRayPaths = this.currentRayPaths;
            window.needsRetrace = this.needsRetrace;
            window.historyManager = this.historyManager;
            window.cameraScale = this.cameraScale;
            window.cameraOffset = this.cameraOffset;
            window.mousePos = this.mousePos;
            window.showGrid = this.showGrid;
            window.globalShowArrows = this.globalShowArrows;
        }
    }

    // --- 主循环 ---
    start() {
        requestAnimationFrame((timestamp) => this._gameLoop(timestamp));
    }

    _gameLoop(timestamp) {
        const dt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        const effectiveDt = Math.min(dt, 0.1);

        // 更新箭头动画
        this._updateArrowAnimations(effectiveDt);

        // 光线追踪
        if (this.needsRetrace) {
            this._traceRays();
            this.needsRetrace = false;
        }

        // 渲染
        this._draw();

        requestAnimationFrame((ts) => this._gameLoop(ts));
    }

    _updateArrowAnimations(dt) {
        if (!this.globalShowArrows || this.currentRayPaths.length === 0) {
            if (this.arrowAnimationStates.size > 0) this.arrowAnimationStates.clear();
            return;
        }

        const nowSeconds = performance.now() / 1000.0;
        const startTime = this.arrowAnimationStartTime > 0 ? this.arrowAnimationStartTime : nowSeconds;
        const elapsedSeconds = nowSeconds - startTime;
        const speed = this.arrowAnimationSpeed;

        this.currentRayPaths.forEach((ray, index) => {
            if (ray instanceof Ray && ray.animateArrow) {
                const pathPoints = ray.getPathPoints();
                if (!pathPoints || pathPoints.length < 2) return;

                let pathLength = 0;
                let isValidPath = true;
                
                for (let i = 1; i < pathPoints.length; i++) {
                    const p1 = pathPoints[i - 1];
                    const p2 = pathPoints[i];
                    if (p1 instanceof Vector && p2 instanceof Vector && !isNaN(p1.x) && !isNaN(p2.x)) {
                        const dist = p1.distanceTo(p2);
                        if (!isNaN(dist)) pathLength += dist;
                        else { isValidPath = false; break; }
                    } else { isValidPath = false; break; }
                }

                if (isValidPath && pathLength > 1e-6) {
                    let currentDistance = (speed * elapsedSeconds) % pathLength;
                    if (currentDistance < 0) currentDistance += pathLength;

                    this.arrowAnimationStates.set(index, {
                        distance: currentDistance,
                        pathLength,
                        pathPoints,
                        sourceId: ray.sourceId
                    });
                }
            }
        });
    }

    _traceRays() {
        // 重置组件
        this.components.forEach(comp => comp.reset?.());

        // 收集光源生成的光线
        const initialRays = [];
        this.components.forEach(comp => {
            if (typeof comp.generateRays === 'function') {
                const rays = comp.generateRays(Ray);
                initialRays.push(...rays);
            }
        });

        // 追踪光线
        this.currentRayPaths = this._traceAllRays(initialRays);
    }

    _traceAllRays(initialRays) {
        const completedPaths = [];
        const activeRays = [...initialRays];
        const maxIterations = 10000;
        let iterations = 0;

        while (activeRays.length > 0 && iterations < maxIterations) {
            iterations++;
            const ray = activeRays.shift();

            if (ray.shouldTerminate()) {
                completedPaths.push(ray);
                continue;
            }

            // 找最近交点
            let closestHit = null;
            let closestComp = null;
            let closestDist = Infinity;

            for (const comp of this.components) {
                if (typeof comp.intersect !== 'function') continue;
                
                const hits = comp.intersect(ray.origin, ray.direction);
                for (const hit of hits) {
                    if (hit.distance > 1e-6 && hit.distance < closestDist) {
                        closestDist = hit.distance;
                        closestHit = hit;
                        closestComp = comp;
                    }
                }
            }

            if (closestHit && closestComp) {
                // 处理交互
                const newRays = closestComp.interact(ray, closestHit, Ray);
                activeRays.push(...newRays);
            } else {
                // 无交点，延伸到画布边缘
                const dpr = window.devicePixelRatio || 1;
                const canvasWidth = this.canvas.width / dpr;
                const canvasHeight = this.canvas.height / dpr;
                const maxDist = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) * 2;
                const endPoint = ray.origin.add(ray.direction.multiply(maxDist));
                ray.addHistoryPoint(endPoint);
                ray.terminate('no_intersection');
            }

            completedPaths.push(ray);
        }

        return completedPaths;
    }

    // --- 渲染 ---
    _draw() {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 应用相机变换
        ctx.translate(this.cameraOffset.x, this.cameraOffset.y);
        ctx.scale(this.cameraScale, this.cameraScale);

        // 计算视口
        const viewPortLogicalWidth = this.canvas.width / this.cameraScale;
        const viewPortLogicalHeight = this.canvas.height / this.cameraScale;
        const viewPortMinX = -this.cameraOffset.x / this.cameraScale;
        const viewPortMinY = -this.cameraOffset.y / this.cameraScale;

        // 背景
        const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim() || '#111111';
        const canvasGridColor = getComputedStyle(document.body).getPropertyValue('--canvas-grid').trim() || 'rgba(255, 255, 255, 0.05)';
        
        ctx.fillStyle = canvasBg;
        ctx.fillRect(viewPortMinX, viewPortMinY, viewPortLogicalWidth, viewPortLogicalHeight);

        // 网格
        if (this.showGrid) {
            this.gridRenderer.draw(GRID_SIZE, canvasGridColor, this.showGrid);
        }

        // 光线
        this.rayRenderer.drawRayPaths(this.currentRayPaths);
        this.rayRenderer.drawArrowAnimations(this.arrowAnimationStates, {
            globalShowArrows: this.globalShowArrows,
            onlyShowSelectedSourceArrow: this.onlyShowSelectedSourceArrow,
            selectedComponent: this.selectedComponent,
            showArrowTrail: this.showArrowTrail
        });

        // 组件
        this.components.forEach(comp => {
            try {
                comp.draw(ctx);
                if (comp === this.selectedComponent) {
                    comp.drawSelection(ctx);
                }
            } catch (e) {
                console.error(`Error drawing component ${comp?.label}:`, e);
            }
        });

        // 对齐辅助线
        if (this.isDragging && this.activeGuides.length > 0) {
            this._drawAlignmentGuides();
        }

        ctx.restore();
    }

    _drawAlignmentGuides() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = GUIDE_COLOR;
        ctx.lineWidth = 1 / this.cameraScale;
        ctx.setLineDash(GUIDE_DASH.map(d => d / this.cameraScale));

        this.activeGuides.forEach(guide => {
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

        ctx.restore();
    }

    // --- 事件处理 ---
    _handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const cssX = event.clientX - rect.left;
        const cssY = event.clientY - rect.top;
        this.mousePos.x = (cssX - this.cameraOffset.x) / this.cameraScale;
        this.mousePos.y = (cssY - this.cameraOffset.y) / this.cameraScale;
        this.mouseIsDown = true;

        // 添加组件
        if (this.componentToAdd) {
            this._addComponent();
            return;
        }

        // 选择组件
        let hitComponent = null;
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (comp.containsPoint && comp.containsPoint(this.mousePos)) {
                hitComponent = comp;
                break;
            }
        }

        if (hitComponent) {
            this.selectedComponent = hitComponent;
            this.isDragging = true;
            this.draggingComponents = [hitComponent];
            this.dragStartOffsets = new Map();
            this.dragStartOffsets.set(hitComponent.id, hitComponent.pos.subtract(this.mousePos));
            this.dragStartMousePos = this.mousePos.clone();
            this.activeGuides = [];
            this.canvas.style.cursor = 'move';
            
            if (typeof window !== 'undefined' && window.updateInspector) {
                window.updateInspector();
            }
        } else {
            this.selectedComponent = null;
            this.isPanning = true;
            this.lastPanMousePos = { x: event.clientX, y: event.clientY };
            this.canvas.style.cursor = 'move';
            
            if (typeof window !== 'undefined' && window.updateInspector) {
                window.updateInspector();
            }
        }
    }

    _handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const cssX = event.clientX - rect.left;
        const cssY = event.clientY - rect.top;
        this.mousePos.x = (cssX - this.cameraOffset.x) / this.cameraScale;
        this.mousePos.y = (cssY - this.cameraOffset.y) / this.cameraScale;

        if (this.isPanning && this.lastPanMousePos) {
            const dx = event.clientX - this.lastPanMousePos.x;
            const dy = event.clientY - this.lastPanMousePos.y;
            this.cameraOffset.x += dx;
            this.cameraOffset.y += dy;
            this.lastPanMousePos = { x: event.clientX, y: event.clientY };
        }

        if (this.isDragging && this.draggingComponents.length > 0) {
            this.draggingComponents.forEach(comp => {
                const offset = this.dragStartOffsets.get(comp.id);
                if (offset) {
                    comp.pos = this.mousePos.add(offset);
                    if (typeof comp._updateGeometry === 'function') {
                        comp._updateGeometry();
                    }
                }
            });
            this.needsRetrace = true;
        }
    }

    _handleMouseUp(event) {
        this.mouseIsDown = false;
        this.isPanning = false;
        this.lastPanMousePos = null;
        this.isDragging = false;
        this.draggingComponents = [];
        this.dragStartOffsets.clear();
        this.activeGuides = [];
        this.canvas.style.cursor = 'default';
    }

    _handleWheel(event) {
        event.preventDefault();
        const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, this.cameraScale * zoomFactor));
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        this.cameraOffset.x = mouseX - (mouseX - this.cameraOffset.x) * (newScale / this.cameraScale);
        this.cameraOffset.y = mouseY - (mouseY - this.cameraOffset.y) * (newScale / this.cameraScale);
        this.cameraScale = newScale;
    }

    _addComponent() {
        // 由子类或外部实现
        this.componentToAdd = null;
        this.canvas.style.cursor = 'default';
    }

    // --- 公共API ---
    addComponent(component) {
        this.components.push(component);
        this.needsRetrace = true;
    }

    removeComponent(component) {
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            if (this.selectedComponent === component) {
                this.selectedComponent = null;
            }
            this.needsRetrace = true;
        }
    }

    clearAll() {
        this.components.length = 0;
        this.selectedComponent = null;
        this.currentRayPaths = [];
        this.needsRetrace = true;
    }

    setTool(toolName) {
        this.componentToAdd = toolName;
        this.canvas.style.cursor = 'crosshair';
    }

    resetView() {
        this.cameraScale = 1.0;
        this.cameraOffset = new Vector(0, 0);
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SimulationApp = SimulationApp;
}
