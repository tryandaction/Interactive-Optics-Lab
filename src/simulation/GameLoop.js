/**
 * GameLoop.js - 游戏循环管理器
 * 负责管理模拟的主循环
 */

/**
 * 游戏循环管理器类
 * 管理模拟的更新和渲染循环
 */
export class GameLoop {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        /** @type {number} 上一帧时间戳 */
        this.lastTimestamp = 0;
        /** @type {number} 最大增量时间（秒） */
        this.maxDt = options.maxDt || 0.1;
        /** @type {boolean} 是否正在运行 */
        this.isRunning = false;
        /** @type {number} 动画帧 ID */
        this.animationFrameId = null;
        /** @type {Function} 更新回调 */
        this.onUpdate = options.onUpdate || null;
        /** @type {Function} 渲染回调 */
        this.onRender = options.onRender || null;
        /** @type {Function} 光线追踪回调 */
        this.onTrace = options.onTrace || null;
        /** @type {boolean} 是否需要重新追踪 */
        this.needsRetrace = true;
        /** @type {Array} 下一帧活动光线 */
        this.nextFrameActiveRays = [];
        /** @type {Array} 当前光线路径 */
        this.currentRayPaths = [];

        // 绑定方法
        this._loop = this._loop.bind(this);
    }

    /**
     * 启动游戏循环
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        this.animationFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * 停止游戏循环
     */
    stop() {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 请求重新追踪光线
     */
    requestRetrace() {
        this.needsRetrace = true;
    }

    /**
     * 添加下一帧活动光线
     * @param {Array} rays - 光线数组
     */
    addNextFrameRays(rays) {
        if (Array.isArray(rays)) {
            this.nextFrameActiveRays.push(...rays);
        }
    }

    /**
     * 获取当前光线路径
     * @returns {Array} 光线路径数组
     */
    getCurrentRayPaths() {
        return this.currentRayPaths;
    }

    /**
     * 主循环
     * @private
     */
    _loop(timestamp) {
        if (!this.isRunning) return;

        // 计算增量时间
        const dt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;
        const effectiveDt = Math.min(dt, this.maxDt);

        // 更新状态
        if (this.onUpdate) {
            this.onUpdate(effectiveDt);
        }

        // 准备初始光线
        const initialActiveRays = [];
        if (this.nextFrameActiveRays.length > 0) {
            initialActiveRays.push(...this.nextFrameActiveRays);
            this.nextFrameActiveRays = [];
        }

        // 光线追踪
        if (this.onTrace) {
            try {
                const traceResult = this.onTrace(initialActiveRays);
                if (traceResult && Array.isArray(traceResult.completedPaths)) {
                    this.currentRayPaths = traceResult.completedPaths;
                    if (Array.isArray(traceResult.generatedRays) && traceResult.generatedRays.length > 0) {
                        this.nextFrameActiveRays.push(...traceResult.generatedRays);
                    }
                } else {
                    this.currentRayPaths = [];
                }
            } catch (e) {
                console.error("Error during ray tracing:", e);
                this.currentRayPaths = [];
                this.nextFrameActiveRays = [];
            }
        }

        // 渲染
        if (this.onRender) {
            this.onRender(this.currentRayPaths);
        }

        // 请求下一帧
        this.animationFrameId = requestAnimationFrame(this._loop);
    }

    /**
     * 设置更新回调
     * @param {Function} callback - 更新回调函数
     */
    setUpdateCallback(callback) {
        this.onUpdate = callback;
    }

    /**
     * 设置渲染回调
     * @param {Function} callback - 渲染回调函数
     */
    setRenderCallback(callback) {
        this.onRender = callback;
    }

    /**
     * 设置追踪回调
     * @param {Function} callback - 追踪回调函数
     */
    setTraceCallback(callback) {
        this.onTrace = callback;
    }

    /**
     * 获取帧率信息
     * @returns {Object} 帧率信息
     */
    getFrameInfo() {
        return {
            isRunning: this.isRunning,
            lastTimestamp: this.lastTimestamp,
            rayPathCount: this.currentRayPaths.length,
            pendingRays: this.nextFrameActiveRays.length
        };
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.GameLoop = GameLoop;
}
