/**
 * RayTracer.js - 光线追踪器
 * 负责执行光线追踪算法
 */

import { Vector } from '../core/Vector.js';
import { Ray } from '../core/Ray.js';
import { MAX_RAY_BOUNCES, MIN_RAY_INTENSITY } from '../core/constants.js';

/**
 * 光线追踪配置
 */
export const TRACE_CONFIG = {
    /** 最大处理光线数量 */
    MAX_TOTAL_RAYS: 100000,
    /** 最小箭头强度阈值 */
    MIN_ARROW_INTENSITY_THRESHOLD: 0.1,
    /** 分束器分裂箭头阈值 */
    BS_SPLIT_ARROW_THRESHOLD: 0.3
};

/**
 * 光线追踪器类
 * 执行场景中的光线追踪计算
 */
export class RayTracer {
    constructor() {
        /** @type {Array} 完成的光线路径 */
        this.completedPaths = [];
        /** @type {Array} 活动光线队列 */
        this.activeRays = [];
        /** @type {number} 已追踪光线计数 */
        this.tracedCount = 0;
    }

    /**
     * 追踪所有光线
     * @param {Array} sceneComponents - 场景组件数组
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     * @param {Array} initialActiveRays - 初始活动光线数组
     * @returns {Object} 追踪结果 { completedPaths, generatedRays }
     */
    traceAllRays(sceneComponents, canvasWidth, canvasHeight, initialActiveRays = []) {
        this.completedPaths = [];
        this.activeRays = [];
        this.tracedCount = 0;

        // 1. 生成初始光线
        this._generateInitialRays(sceneComponents);

        // 添加传入的初始光线（如光纤输出）
        if (initialActiveRays.length > 0) {
            this.activeRays.push(...initialActiveRays);
        }

        // 2. 主追踪循环
        this._traceLoop(sceneComponents, canvasWidth, canvasHeight);

        // 3. 生成光纤输出光线
        const fiberOutputRays = this._generateFiberOutputs(sceneComponents);

        return {
            completedPaths: this.completedPaths,
            generatedRays: fiberOutputRays
        };
    }

    /**
     * 生成初始光线
     * @private
     */
    _generateInitialRays(sceneComponents) {
        sceneComponents.forEach(comp => {
            if (typeof comp.generateRays === 'function' && comp.enabled) {
                try {
                    const generated = comp.generateRays(Ray);
                    if (Array.isArray(generated)) {
                        generated.forEach(r => {
                            if (r instanceof Ray) {
                                r.animateArrow = true;
                                if (r.shouldTerminate()) {
                                    if (r.endReason === 'low_intensity') r.animateArrow = false;
                                    this.completedPaths.push(r);
                                } else {
                                    this.activeRays.push(r);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Source ${comp.id} generateRays error:`, e);
                }
            }
        });
    }

    /**
     * 主追踪循环
     * @private
     */
    _traceLoop(sceneComponents, canvasWidth, canvasHeight) {
        while (this.activeRays.length > 0 && this.tracedCount < TRACE_CONFIG.MAX_TOTAL_RAYS) {
            this.tracedCount++;
            const currentRay = this.activeRays.shift();

            // 预检查终止条件
            if (currentRay.bouncesSoFar >= MAX_RAY_BOUNCES) {
                currentRay.terminate('max_bounces');
            }

            if (currentRay.shouldTerminate()) {
                this._addToCompleted(currentRay);
                continue;
            }

            // 查找最近交点
            const { closestHit, hitComponent, fiberHit, fiberComp } = 
                this._findClosestIntersection(currentRay, sceneComponents);

            // 处理交互
            if (fiberComp && fiberHit && fiberHit.distance <= (closestHit?.distance || Infinity)) {
                this._handleFiberInteraction(currentRay, fiberHit, fiberComp);
            } else if (hitComponent && closestHit) {
                this._handleComponentInteraction(currentRay, closestHit, hitComponent);
            } else {
                this._handleNoHit(currentRay, canvasWidth, canvasHeight);
            }
        }

        // 处理队列中剩余的光线
        this.activeRays.forEach(ray => {
            if (!ray.terminated) ray.terminate('stuck_in_queue');
            if (!this.completedPaths.includes(ray)) this.completedPaths.push(ray);
        });
    }

    /**
     * 查找最近交点
     * @private
     */
    _findClosestIntersection(currentRay, sceneComponents) {
        let closestHit = null;
        let closestDist = Infinity;
        let hitComponent = null;
        let fiberHit = null;
        let fiberComp = null;
        let fiberDist = Infinity;

        // 检查光纤输入耦合
        sceneComponents.forEach(comp => {
            if (comp.constructor.name === 'OpticalFiber' && typeof comp.checkInputCoupling === 'function') {
                try {
                    const couplingHit = comp.checkInputCoupling(currentRay.origin, currentRay.direction);
                    if (couplingHit && couplingHit.distance < fiberDist && couplingHit.distance > 1e-6) {
                        fiberHit = couplingHit;
                        fiberDist = couplingHit.distance;
                        fiberComp = comp;
                    }
                } catch (e) {
                    console.error(`Fiber checkInputCoupling error:`, e);
                }
            }
        });

        closestDist = fiberDist;

        // 检查组件交点
        sceneComponents.forEach(comp => {
            if (comp.id === currentRay.sourceId && currentRay.bouncesSoFar === 0) return;
            if (typeof comp.intersect === 'function') {
                try {
                    const intersections = comp.intersect(currentRay.origin, currentRay.direction);
                    if (Array.isArray(intersections)) {
                        intersections.forEach(hit => {
                            if (hit && typeof hit.distance === 'number' && hit.distance > 1e-6 &&
                                hit.point instanceof Vector && hit.normal instanceof Vector &&
                                !isNaN(hit.point.x) && !isNaN(hit.normal.x)) {
                                if (hit.distance < closestDist) {
                                    closestDist = hit.distance;
                                    closestHit = hit;
                                    hitComponent = comp;
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error(`Intersect error on ${comp?.label}:`, e);
                }
            }
        });

        return { closestHit, hitComponent, fiberHit, fiberComp };
    }

    /**
     * 处理光纤交互
     * @private
     */
    _handleFiberInteraction(currentRay, fiberHit, fiberComp) {
        if (!(fiberHit.point instanceof Vector) || isNaN(fiberHit.point.x)) {
            currentRay.terminate('invalid_fiber_hit_point');
            this._addToCompleted(currentRay);
            return;
        }

        currentRay.addHistoryPoint(fiberHit.point);

        try {
            fiberComp.handleInputInteraction(currentRay, fiberHit, Ray);
            if (!currentRay.terminated) {
                currentRay.terminate('fiber_interact_no_terminate');
            }
            this._addToCompleted(currentRay);
        } catch (e) {
            console.error(`Fiber handleInputInteraction error:`, e);
            currentRay.terminate('fiber_interaction_error');
            this._addToCompleted(currentRay);
        }
    }

    /**
     * 处理组件交互
     * @private
     */
    _handleComponentInteraction(currentRay, closestHit, hitComponent) {
        if (!(closestHit.point instanceof Vector) || isNaN(closestHit.point.x)) {
            currentRay.terminate('invalid_hit_point');
            this._addToCompleted(currentRay);
            return;
        }

        currentRay.addHistoryPoint(closestHit.point);

        try {
            const interactionResult = hitComponent.interact(currentRay, closestHit, Ray);
            
            if (!currentRay.terminated) {
                currentRay.terminate('segment_end_after_interaction');
            }

            if (Array.isArray(interactionResult)) {
                this._processSuccessors(interactionResult, currentRay, hitComponent);
            }

            this._addToCompleted(currentRay);
        } catch (e) {
            console.error(`Interact error on ${hitComponent?.label}:`, e);
            currentRay.terminate('interaction_error');
            this._addToCompleted(currentRay);
        }
    }

    /**
     * 处理无交点情况
     * @private
     */
    _handleNoHit(currentRay, canvasWidth, canvasHeight) {
        const exitDistance = Math.max(canvasWidth, canvasHeight) * 2;
        if (currentRay.origin instanceof Vector && currentRay.direction instanceof Vector &&
            !isNaN(currentRay.origin.x) && !isNaN(currentRay.direction.x)) {
            try {
                const exitPoint = currentRay.origin.add(currentRay.direction.multiply(exitDistance));
                currentRay.addHistoryPoint(exitPoint);
            } catch (e) {
                console.error("Error calculating exit point:", e);
            }
        }
        currentRay.terminate('out_of_bounds');
        this._addToCompleted(currentRay);
    }

    /**
     * 处理后继光线
     * @private
     */
    _processSuccessors(interactionResult, parentRay, hitComponent) {
        const successors = interactionResult.filter(r => r instanceof Ray);
        
        if (successors.length > 0) {
            const parentWasAnimated = parentRay.animateArrow;
            successors.forEach(s => s.animateArrow = false);

            if (parentWasAnimated) {
                this._assignArrowAnimation(successors, parentRay, hitComponent);
            }
        }

        successors.forEach(newRay => {
            if (newRay.shouldTerminate()) {
                if (newRay.endReason === 'low_intensity') newRay.animateArrow = false;
                this._addToCompleted(newRay);
            } else {
                this.activeRays.push(newRay);
            }
        });
    }

    /**
     * 分配箭头动画
     * @private
     */
    _assignArrowAnimation(successors, parentRay, hitComponent) {
        const componentName = hitComponent.constructor.name;
        const { MIN_ARROW_INTENSITY_THRESHOLD, BS_SPLIT_ARROW_THRESHOLD } = TRACE_CONFIG;

        if (componentName === 'DielectricBlock') {
            const reflected = successors.find(r => r.mediumRefractiveIndex === parentRay.mediumRefractiveIndex);
            const transmitted = successors.find(r => r.mediumRefractiveIndex !== parentRay.mediumRefractiveIndex);
            const wasTIR = parentRay.endReason === 'tir';

            if (wasTIR && reflected) {
                reflected.animateArrow = true;
            } else if (transmitted && reflected) {
                if (transmitted.intensity >= reflected.intensity * 0.8 && 
                    transmitted.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                    transmitted.animateArrow = true;
                } else if (reflected.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                    reflected.animateArrow = true;
                }
            } else if (transmitted && transmitted.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                transmitted.animateArrow = true;
            } else if (reflected && reflected.intensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                reflected.animateArrow = true;
            }
        } else if (componentName === 'BeamSplitter') {
            if (successors.length === 2) {
                const int1 = successors[0].intensity;
                const int2 = successors[1].intensity;
                const threshold = BS_SPLIT_ARROW_THRESHOLD * parentRay.intensity;
                
                if (int1 >= threshold && int2 >= threshold) {
                    successors[0].animateArrow = true;
                    successors[1].animateArrow = true;
                } else if (int1 >= int2 && int1 >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                    successors[0].animateArrow = true;
                } else if (int2 > int1 && int2 >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                    successors[1].animateArrow = true;
                }
            } else if (successors.length === 1 && 
                       successors[0].intensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                successors[0].animateArrow = true;
            }
        } else {
            // 默认：选择最强的后继光线
            let strongestSuccessor = null;
            let maxIntensity = -1;
            successors.forEach(s => {
                if (s.intensity > maxIntensity) {
                    maxIntensity = s.intensity;
                    strongestSuccessor = s;
                }
            });
            if (strongestSuccessor && maxIntensity >= MIN_ARROW_INTENSITY_THRESHOLD * parentRay.intensity) {
                strongestSuccessor.animateArrow = true;
            }
        }
    }

    /**
     * 生成光纤输出光线
     * @private
     */
    _generateFiberOutputs(sceneComponents) {
        let fiberOutputRays = [];
        sceneComponents.forEach(comp => {
            if (comp.constructor.name === 'OpticalFiber' && typeof comp.generateOutputRays === 'function') {
                try {
                    const generated = comp.generateOutputRays(Ray);
                    if (Array.isArray(generated)) {
                        fiberOutputRays = fiberOutputRays.concat(generated);
                    }
                } catch (e) {
                    console.error(`Fiber generateOutputRays error:`, e);
                }
            }
        });
        return fiberOutputRays;
    }

    /**
     * 添加到完成列表
     * @private
     */
    _addToCompleted(ray) {
        if (this.completedPaths.includes(ray)) return;
        
        const historyValid = ray.history && ray.history.length > 0 && 
            ray.history.every(p => p instanceof Vector && !isNaN(p.x));
        
        if (historyValid) {
            this.completedPaths.push(ray);
        }
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.RayTracer = RayTracer;
    window.TRACE_CONFIG = TRACE_CONFIG;
}
