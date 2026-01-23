/**
 * PerformanceOptimizer - 性能优化器
 * 
 * 提供渲染和交互性能优化，包括：
 * - 增量渲染
 * - 视口裁剪
 * - 离屏Canvas缓存
 * - 批量渲染延迟
 * 
 * 需求：10.1, 10.2, 10.3, 10.5, 10.6
 */

export class PerformanceOptimizer {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.diagnosticSystem = options.diagnosticSystem;
    
    // 渲染优化配置
    this.config = {
      enableIncrementalRendering: true,
      enableViewportCulling: true,
      enableOffscreenCache: true,
      enableBatchRendering: true,
      batchDelay: 16, // ~60fps
      cacheExpiry: 5000, // 5秒
      viewportPadding: 100 // 视口外扩像素
    };
    
    // 缓存
    this.offscreenCache = new Map();
    this.dirtyComponents = new Set();
    this.lastRenderTime = 0;
    this.renderQueue = [];
    this.batchTimeout = null;
    
    // 性能指标
    this.metrics = {
      frameTime: [],
      renderCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      culledComponents: 0
    };
    
    // 视口信息
    this.viewport = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1
    };
  }

  /**
   * 更新视口信息
   * @param {Object} viewport - 视口数据
   */
  updateViewport(viewport) {
    this.viewport = { ...this.viewport, ...viewport };
  }

  /**
   * 标记组件为脏（需要重绘）
   * @param {string} componentId - 组件ID
   */
  markDirty(componentId) {
    this.dirtyComponents.add(componentId);
    
    // 使缓存失效
    if (this.offscreenCache.has(componentId)) {
      this.offscreenCache.delete(componentId);
    }
  }

  /**
   * 标记所有组件为脏
   */
  markAllDirty() {
    this.dirtyComponents.clear();
    this.offscreenCache.clear();
  }

  /**
   * 优化渲染 (需求 10.2, 10.3, 10.5, 10.6)
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   * @param {Array} components - 组件列表
   * @param {Function} renderFunc - 渲染函数
   */
  optimizedRender(ctx, components, renderFunc) {
    const startTime = performance.now();
    
    // 1. 视口裁剪 (需求 10.3)
    const visibleComponents = this.config.enableViewportCulling
      ? this._cullByViewport(components)
      : components;
    
    this.metrics.culledComponents = components.length - visibleComponents.length;
    
    // 2. 增量渲染 (需求 10.2)
    const componentsToRender = this.config.enableIncrementalRendering
      ? this._getIncrementalRenderList(visibleComponents)
      : visibleComponents;
    
    // 3. 使用缓存渲染 (需求 10.5)
    for (const component of componentsToRender) {
      if (this.config.enableOffscreenCache) {
        this._renderWithCache(ctx, component, renderFunc);
      } else {
        renderFunc(ctx, component);
      }
    }
    
    // 清除脏标记
    this.dirtyComponents.clear();
    
    // 记录性能指标
    const frameTime = performance.now() - startTime;
    this._recordMetrics(frameTime);
    
    this.metrics.renderCount++;
  }

  /**
   * 批量渲染延迟 (需求 10.6)
   * @param {Function} renderFunc - 渲染函数
   */
  batchRender(renderFunc) {
    if (!this.config.enableBatchRendering) {
      renderFunc();
      return;
    }
    
    // 添加到渲染队列
    this.renderQueue.push(renderFunc);
    
    // 清除现有的批处理超时
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // 设置新的批处理超时
    this.batchTimeout = setTimeout(() => {
      this._executeBatchRender();
    }, this.config.batchDelay);
  }

  /**
   * 执行批量渲染
   * @private
   */
  _executeBatchRender() {
    if (this.renderQueue.length === 0) return;
    
    const startTime = performance.now();
    
    // 执行所有排队的渲染
    for (const renderFunc of this.renderQueue) {
      renderFunc();
    }
    
    this.renderQueue = [];
    this.batchTimeout = null;
    
    const batchTime = performance.now() - startTime;
    this.diagnosticSystem?.log('info', `Batch render completed in ${batchTime.toFixed(2)}ms`);
  }

  /**
   * 视口裁剪 (需求 10.3)
   * @private
   */
  _cullByViewport(components) {
    const { x, y, width, height, scale } = this.viewport;
    const padding = this.config.viewportPadding;
    
    // 计算视口边界（考虑缩放和填充）
    const viewportBounds = {
      left: x - padding,
      right: x + width / scale + padding,
      top: y - padding,
      bottom: y + height / scale + padding
    };
    
    return components.filter(component => {
      const pos = component.pos || { x: component.x || 0, y: component.y || 0 };
      const size = this._getComponentSize(component);
      
      // 检查组件是否在视口内
      return !(
        pos.x + size.width < viewportBounds.left ||
        pos.x > viewportBounds.right ||
        pos.y + size.height < viewportBounds.top ||
        pos.y > viewportBounds.bottom
      );
    });
  }

  /**
   * 获取组件尺寸
   * @private
   */
  _getComponentSize(component) {
    // 尝试从组件获取尺寸
    if (component.width && component.height) {
      return { width: component.width, height: component.height };
    }
    
    if (component.size) {
      return component.size;
    }
    
    // 默认尺寸
    return { width: 60, height: 60 };
  }

  /**
   * 获取增量渲染列表 (需求 10.2)
   * @private
   */
  _getIncrementalRenderList(components) {
    // 如果没有脏组件，返回空列表（不需要重绘）
    if (this.dirtyComponents.size === 0 && this.lastRenderTime > 0) {
      return [];
    }
    
    // 如果是首次渲染或所有组件都脏了，渲染全部
    if (this.lastRenderTime === 0 || this.dirtyComponents.size >= components.length * 0.5) {
      return components;
    }
    
    // 只渲染脏组件
    return components.filter(component => {
      const id = component.id || component.uuid;
      return this.dirtyComponents.has(id);
    });
  }

  /**
   * 使用缓存渲染 (需求 10.5)
   * @private
   */
  _renderWithCache(ctx, component, renderFunc) {
    const id = component.id || component.uuid;
    const cacheKey = this._getCacheKey(component);
    
    // 检查缓存
    const cached = this.offscreenCache.get(cacheKey);
    
    if (cached && !this._isCacheExpired(cached)) {
      // 使用缓存
      this._renderFromCache(ctx, component, cached);
      this.metrics.cacheHits++;
      return;
    }
    
    // 缓存未命中，创建新缓存
    this.metrics.cacheMisses++;
    
    // 创建离屏canvas
    const size = this._getComponentSize(component);
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = size.width * 2; // 2x for better quality
    offscreenCanvas.height = size.height * 2;
    
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.scale(2, 2);
    
    // 渲染到离屏canvas
    offscreenCtx.save();
    offscreenCtx.translate(size.width / 2, size.height / 2);
    renderFunc(offscreenCtx, component);
    offscreenCtx.restore();
    
    // 保存到缓存
    this.offscreenCache.set(cacheKey, {
      canvas: offscreenCanvas,
      timestamp: Date.now(),
      size
    });
    
    // 渲染到主canvas
    this._renderFromCache(ctx, component, {
      canvas: offscreenCanvas,
      size
    });
  }

  /**
   * 从缓存渲染
   * @private
   */
  _renderFromCache(ctx, component, cached) {
    const pos = component.pos || { x: component.x || 0, y: component.y || 0 };
    const angle = component.angle || 0;
    
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    
    // 绘制缓存的canvas
    ctx.drawImage(
      cached.canvas,
      -cached.size.width / 2,
      -cached.size.height / 2,
      cached.size.width,
      cached.size.height
    );
    
    ctx.restore();
  }

  /**
   * 获取缓存键
   * @private
   */
  _getCacheKey(component) {
    const id = component.id || component.uuid;
    const type = component.type || component.constructor?.name;
    const angle = Math.round((component.angle || 0) * 100) / 100;
    const scale = component.scale || 1;
    
    return `${type}_${id}_${angle}_${scale}`;
  }

  /**
   * 检查缓存是否过期
   * @private
   */
  _isCacheExpired(cached) {
    return Date.now() - cached.timestamp > this.config.cacheExpiry;
  }

  /**
   * 记录性能指标
   * @private
   */
  _recordMetrics(frameTime) {
    this.metrics.frameTime.push(frameTime);
    
    // 只保留最近100帧
    if (this.metrics.frameTime.length > 100) {
      this.metrics.frameTime.shift();
    }
    
    this.lastRenderTime = Date.now();
  }

  /**
   * 获取性能指标 (需求 10.1)
   * @returns {Object}
   */
  getMetrics() {
    const frameTimes = this.metrics.frameTime;
    const avgFrameTime = frameTimes.length > 0
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      : 0;
    
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    
    return {
      fps: Math.round(fps),
      avgFrameTime: avgFrameTime.toFixed(2),
      renderCount: this.metrics.renderCount,
      cacheHitRate: this._calculateCacheHitRate(),
      culledComponents: this.metrics.culledComponents,
      cacheSize: this.offscreenCache.size,
      dirtyComponents: this.dirtyComponents.size
    };
  }

  /**
   * 计算缓存命中率
   * @private
   */
  _calculateCacheHitRate() {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (total === 0) return 0;
    return Math.round((this.metrics.cacheHits / total) * 100);
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, cached] of this.offscreenCache.entries()) {
      if (this._isCacheExpired(cached)) {
        this.offscreenCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.diagnosticSystem?.log('info', `Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * 设置配置
   * @param {Object} config - 配置选项
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
    
    // 如果禁用了缓存，清空缓存
    if (!config.enableOffscreenCache) {
      this.offscreenCache.clear();
    }
  }

  /**
   * 重置性能指标
   */
  resetMetrics() {
    this.metrics = {
      frameTime: [],
      renderCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      culledComponents: 0
    };
  }

  /**
   * 获取优化建议
   * @returns {Array}
   */
  getOptimizationSuggestions() {
    const suggestions = [];
    const metrics = this.getMetrics();
    
    // FPS过低
    if (metrics.fps < 30) {
      suggestions.push({
        severity: 'high',
        message: 'FPS is below 30. Consider enabling all optimizations.',
        action: 'Enable viewport culling and offscreen caching'
      });
    }
    
    // 缓存命中率低
    if (metrics.cacheHitRate < 50 && this.config.enableOffscreenCache) {
      suggestions.push({
        severity: 'medium',
        message: 'Cache hit rate is low. Components may be changing too frequently.',
        action: 'Increase cache expiry time or reduce component updates'
      });
    }
    
    // 缓存过大
    if (metrics.cacheSize > 100) {
      suggestions.push({
        severity: 'medium',
        message: 'Cache size is large. Memory usage may be high.',
        action: 'Reduce cache expiry time or clean up unused components'
      });
    }
    
    // 裁剪效果不明显
    if (metrics.culledComponents < 10 && this.config.enableViewportCulling) {
      suggestions.push({
        severity: 'low',
        message: 'Viewport culling is not removing many components.',
        action: 'Most components are visible. This is normal for small scenes.'
      });
    }
    
    return suggestions;
  }

  /**
   * 销毁优化器
   */
  destroy() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.offscreenCache.clear();
    this.dirtyComponents.clear();
    this.renderQueue = [];
    this.resetMetrics();
  }
}

// 单例实例
let performanceOptimizerInstance = null;

export function getPerformanceOptimizer(options) {
  if (!performanceOptimizerInstance) {
    performanceOptimizerInstance = new PerformanceOptimizer(options);
  }
  return performanceOptimizerInstance;
}

export function resetPerformanceOptimizer() {
  if (performanceOptimizerInstance) {
    performanceOptimizerInstance.destroy();
    performanceOptimizerInstance = null;
  }
}
