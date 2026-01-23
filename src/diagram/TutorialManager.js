/**
 * TutorialManager - 操作引导系统
 * 
 * 提供交互式教程和工具提示，包括：
 * - 交互式教程覆盖层
 * - 步骤高亮和提示
 * - 跳过和重新查看功能
 * - 工具提示管理
 * 
 * 需求：9.1, 9.3, 9.4, 9.5, 9.6
 */

export class TutorialManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.tutorials = new Map();
    this.currentTutorial = null;
    this.currentStep = 0;
    this.tooltips = new Map();
    this.overlayElement = null;
    this.highlightElement = null;
    this.tooltipElement = null;
    this.completed = new Set(); // 已完成的教程
    
    this._loadCompletedTutorials();
  }

  /**
   * 注册教程
   * @param {string} id - 教程ID
   * @param {Object} tutorial - 教程配置
   */
  registerTutorial(id, tutorial) {
    this.tutorials.set(id, {
      id,
      title: tutorial.title,
      description: tutorial.description,
      steps: tutorial.steps || [],
      autoStart: tutorial.autoStart || false,
      showOnce: tutorial.showOnce || false
    });

    if (tutorial.autoStart && !this.completed.has(id)) {
      // 延迟自动启动
      setTimeout(() => this.startTutorial(id), 1000);
    }
  }

  /**
   * 启动教程 (需求 9.1)
   * @param {string} tutorialId - 教程ID
   */
  startTutorial(tutorialId) {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      console.warn('[TutorialManager] Tutorial not found:', tutorialId);
      return;
    }

    // 检查是否只显示一次
    if (tutorial.showOnce && this.completed.has(tutorialId)) {
      return;
    }

    this.currentTutorial = tutorial;
    this.currentStep = 0;

    this._createOverlay();
    this._showStep(0);

    this.eventBus?.emit('tutorial:started', {
      tutorialId,
      title: tutorial.title
    });
  }

  /**
   * 显示步骤 (需求 9.3)
   * @private
   */
  _showStep(stepIndex) {
    if (!this.currentTutorial || stepIndex >= this.currentTutorial.steps.length) {
      return;
    }

    const step = this.currentTutorial.steps[stepIndex];
    this.currentStep = stepIndex;

    // 高亮目标元素
    if (step.target) {
      this._highlightElement(step.target);
    } else {
      this._clearHighlight();
    }

    // 显示提示内容
    this._showStepContent(step);

    this.eventBus?.emit('tutorial:step:shown', {
      tutorialId: this.currentTutorial.id,
      stepIndex,
      step
    });
  }

  /**
   * 创建覆盖层
   * @private
   */
  _createOverlay() {
    if (this.overlayElement) {
      return;
    }

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'tutorial-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      pointer-events: none;
    `;

    document.body.appendChild(this.overlayElement);
  }

  /**
   * 高亮元素 (需求 9.3)
   * @private
   */
  _highlightElement(selector) {
    this._clearHighlight();

    const targetElement = document.querySelector(selector);
    if (!targetElement) {
      console.warn('[TutorialManager] Target element not found:', selector);
      return;
    }

    const rect = targetElement.getBoundingClientRect();

    this.highlightElement = document.createElement('div');
    this.highlightElement.className = 'tutorial-highlight';
    this.highlightElement.style.cssText = `
      position: fixed;
      top: ${rect.top - 5}px;
      left: ${rect.left - 5}px;
      width: ${rect.width + 10}px;
      height: ${rect.height + 10}px;
      border: 3px solid #4CAF50;
      border-radius: 4px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      pointer-events: none;
      animation: tutorial-pulse 2s infinite;
    `;

    document.body.appendChild(this.highlightElement);

    // 添加脉冲动画
    if (!document.getElementById('tutorial-animation-style')) {
      const style = document.createElement('style');
      style.id = 'tutorial-animation-style';
      style.textContent = `
        @keyframes tutorial-pulse {
          0%, 100% { border-color: #4CAF50; }
          50% { border-color: #81C784; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * 显示步骤内容
   * @private
   */
  _showStepContent(step) {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'tutorial-tooltip';
    this.tooltipElement.style.cssText = `
      position: fixed;
      max-width: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    // 内容
    const content = `
      <div style="margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #333;">
          ${step.title}
        </h3>
        <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">
          ${step.content}
        </p>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 12px; color: #999;">
          步骤 ${this.currentStep + 1} / ${this.currentTutorial.steps.length}
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="tutorial-skip-btn" style="
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">跳过</button>
          ${this.currentStep > 0 ? `
            <button class="tutorial-prev-btn" style="
              padding: 8px 16px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">上一步</button>
          ` : ''}
          <button class="tutorial-next-btn" style="
            padding: 8px 16px;
            border: none;
            background: #4CAF50;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">${this.currentStep < this.currentTutorial.steps.length - 1 ? '下一步' : '完成'}</button>
        </div>
      </div>
    `;

    this.tooltipElement.innerHTML = content;

    // 定位
    this._positionTooltip(step.target, step.position || 'bottom');

    // 绑定事件
    this.tooltipElement.querySelector('.tutorial-skip-btn').addEventListener('click', () => {
      this.skipTutorial();
    });

    const nextBtn = this.tooltipElement.querySelector('.tutorial-next-btn');
    nextBtn.addEventListener('click', () => {
      if (this.currentStep < this.currentTutorial.steps.length - 1) {
        this.nextStep();
      } else {
        this.completeTutorial();
      }
    });

    const prevBtn = this.tooltipElement.querySelector('.tutorial-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.previousStep();
      });
    }

    document.body.appendChild(this.tooltipElement);
  }

  /**
   * 定位提示框
   * @private
   */
  _positionTooltip(targetSelector, position) {
    if (!targetSelector) {
      // 居中显示
      this.tooltipElement.style.top = '50%';
      this.tooltipElement.style.left = '50%';
      this.tooltipElement.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    let top, left;

    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - 10;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + 10;
        break;
      default:
        top = rect.bottom + 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
    }

    // 确保在视口内
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    this.tooltipElement.style.top = `${top}px`;
    this.tooltipElement.style.left = `${left}px`;
  }

  /**
   * 下一步
   */
  nextStep() {
    if (this.currentStep < this.currentTutorial.steps.length - 1) {
      this._showStep(this.currentStep + 1);
    }
  }

  /**
   * 上一步
   */
  previousStep() {
    if (this.currentStep > 0) {
      this._showStep(this.currentStep - 1);
    }
  }

  /**
   * 跳过教程 (需求 9.5)
   */
  skipTutorial() {
    if (!this.currentTutorial) return;

    this.eventBus?.emit('tutorial:skipped', {
      tutorialId: this.currentTutorial.id,
      stepIndex: this.currentStep
    });

    this._cleanup();
  }

  /**
   * 完成教程
   */
  completeTutorial() {
    if (!this.currentTutorial) return;

    this.completed.add(this.currentTutorial.id);
    this._saveCompletedTutorials();

    this.eventBus?.emit('tutorial:completed', {
      tutorialId: this.currentTutorial.id
    });

    this._cleanup();
  }

  /**
   * 重新查看教程 (需求 9.6)
   * @param {string} tutorialId - 教程ID
   */
  replayTutorial(tutorialId) {
    this.completed.delete(tutorialId);
    this.startTutorial(tutorialId);
  }

  /**
   * 清理
   * @private
   */
  _cleanup() {
    this._clearHighlight();
    
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }

    if (this.tooltipElement) {
      this.tooltipElement.remove();
      this.tooltipElement = null;
    }

    this.currentTutorial = null;
    this.currentStep = 0;
  }

  /**
   * 清除高亮
   * @private
   */
  _clearHighlight() {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }

  /**
   * 注册工具提示 (需求 9.4)
   * @param {string} selector - 元素选择器
   * @param {string} content - 提示内容
   * @param {Object} options - 选项
   */
  registerTooltip(selector, content, options = {}) {
    this.tooltips.set(selector, {
      content,
      position: options.position || 'top',
      delay: options.delay || 500
    });

    // 绑定事件
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      let timeoutId;

      element.addEventListener('mouseenter', (e) => {
        timeoutId = setTimeout(() => {
          this._showTooltip(e.target, content, options.position);
        }, options.delay || 500);
      });

      element.addEventListener('mouseleave', () => {
        clearTimeout(timeoutId);
        this._hideTooltip();
      });
    });
  }

  /**
   * 显示工具提示
   * @private
   */
  _showTooltip(targetElement, content, position = 'top') {
    this._hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'simple-tooltip';
    tooltip.textContent = content;
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10001;
      pointer-events: none;
      white-space: nowrap;
    `;

    document.body.appendChild(tooltip);

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top, left;

    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - 5;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 5;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - 5;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + 5;
        break;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    this._currentTooltip = tooltip;
  }

  /**
   * 隐藏工具提示
   * @private
   */
  _hideTooltip() {
    if (this._currentTooltip) {
      this._currentTooltip.remove();
      this._currentTooltip = null;
    }
  }

  /**
   * 加载已完成的教程
   * @private
   */
  _loadCompletedTutorials() {
    try {
      const data = localStorage.getItem('tutorial_completed');
      if (data) {
        this.completed = new Set(JSON.parse(data));
      }
    } catch (error) {
      console.warn('[TutorialManager] Failed to load completed tutorials:', error);
    }
  }

  /**
   * 保存已完成的教程
   * @private
   */
  _saveCompletedTutorials() {
    try {
      localStorage.setItem('tutorial_completed', JSON.stringify([...this.completed]));
    } catch (error) {
      console.warn('[TutorialManager] Failed to save completed tutorials:', error);
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this._cleanup();
    this.tutorials.clear();
    this.tooltips.clear();
    this.completed.clear();
    this.eventBus = null;
  }
}

// 单例实例
let tutorialManagerInstance = null;

export function getTutorialManager() {
  return tutorialManagerInstance;
}

export function createTutorialManager(eventBus) {
  if (!tutorialManagerInstance) {
    tutorialManagerInstance = new TutorialManager(eventBus);
  }
  return tutorialManagerInstance;
}

export function resetTutorialManager() {
  if (tutorialManagerInstance) {
    tutorialManagerInstance.destroy();
    tutorialManagerInstance = null;
  }
}
