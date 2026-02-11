/**
 * DebugPanel - 调试面板
 * 
 * 提供系统调试和诊断功能，包括：
 * - 显示当前模式和活动模块
 * - 显示事件监听器列表
 * - 子系统测试按钮
 * - 诊断报告生成
 * - 性能指标显示
 * - 日志导出
 * 
 * 需求：12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

export class DebugPanel {
  constructor(options = {}) {
    this.diagnosticSystem = options.diagnosticSystem;
    this.eventBus = options.eventBus;
    this.initializationManager = options.initializationManager;
    this.modeManager = options.modeManager;
    
    this.visible = false;
    this.panelElement = null;
    this.updateInterval = null;
    this.performanceMetrics = {
      fps: 0,
      memory: 0,
      lastUpdate: Date.now()
    };
  }

  /**
   * 切换面板显示 (需求 12.1)
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 显示面板
   */
  show() {
    if (this.visible) return;
    
    this._createPanel();
    this._startPerformanceMonitoring();
    this.visible = true;
    
    this.eventBus?.emit('debug:panel:shown');
  }

  /**
   * 隐藏面板
   */
  hide() {
    if (!this.visible) return;
    
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
    
    this._stopPerformanceMonitoring();
    this.visible = false;
    
    this.eventBus?.emit('debug:panel:hidden');
  }

  /**
   * 创建面板UI
   * @private
   */
  _createPanel() {
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'debug-panel';
    this.panelElement.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid #444;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      color: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    this.panelElement.innerHTML = `
      <div class="debug-panel-header" style="
        padding: 12px 16px;
        background: #1a1a1a;
        border-bottom: 1px solid #444;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; font-size: 14px; color: #4CAF50;">🔧 Debug Panel</h3>
        <button class="debug-panel-close" style="
          background: none;
          border: none;
          color: #888;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        ">&times;</button>
      </div>
      
      <div class="debug-panel-content" style="
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      ">
        <!-- Mode Info -->
        <div class="debug-section">
          <div class="debug-section-title" style="
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 8px;
            font-size: 13px;
          ">Current Mode</div>
          <div id="debug-mode-info" style="
            padding: 8px;
            background: #1a1a1a;
            border-radius: 4px;
            margin-bottom: 16px;
          ">Loading...</div>
        </div>

        <!-- Performance Metrics -->
        <div class="debug-section">
          <div class="debug-section-title" style="
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 8px;
            font-size: 13px;
          ">Performance</div>
          <div id="debug-performance" style="
            padding: 8px;
            background: #1a1a1a;
            border-radius: 4px;
            margin-bottom: 16px;
          ">
            <div>FPS: <span id="debug-fps">--</span></div>
            <div>Memory: <span id="debug-memory">--</span> MB</div>
          </div>
        </div>

        <!-- Modules -->
        <div class="debug-section">
          <div class="debug-section-title" style="
            font-weight: bold;
            color: #FF9800;
            margin-bottom: 8px;
            font-size: 13px;
          ">Initialized Modules</div>
          <div id="debug-modules" style="
            padding: 8px;
            background: #1a1a1a;
            border-radius: 4px;
            margin-bottom: 16px;
            max-height: 200px;
            overflow-y: auto;
          ">Loading...</div>
        </div>

        <!-- Event Listeners -->
        <div class="debug-section">
          <div class="debug-section-title" style="
            font-weight: bold;
            color: #9C27B0;
            margin-bottom: 8px;
            font-size: 13px;
          ">Event Listeners</div>
          <div id="debug-listeners" style="
            padding: 8px;
            background: #1a1a1a;
            border-radius: 4px;
            margin-bottom: 16px;
            max-height: 150px;
            overflow-y: auto;
          ">Loading...</div>
        </div>

        <!-- Actions -->
        <div class="debug-section">
          <div class="debug-section-title" style="
            font-weight: bold;
            color: #F44336;
            margin-bottom: 8px;
            font-size: 13px;
          ">Actions</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button id="debug-run-diagnostic" style="
              padding: 8px 12px;
              background: #4CAF50;
              border: none;
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">Run Full Diagnostic</button>
            <button id="debug-test-subsystems" style="
              padding: 8px 12px;
              background: #2196F3;
              border: none;
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">Test Subsystems</button>
            <button id="debug-export-logs" style="
              padding: 8px 12px;
              background: #FF9800;
              border: none;
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">Export Logs</button>
            <button id="debug-clear-logs" style="
              padding: 8px 12px;
              background: #F44336;
              border: none;
              border-radius: 4px;
              color: white;
              cursor: pointer;
              font-size: 12px;
            ">Clear Logs</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.panelElement);

    // 绑定事件
    this._bindEvents();
    
    // 初始更新
    this._updatePanel();
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 关闭按钮
    this.panelElement.querySelector('.debug-panel-close').addEventListener('click', () => {
      this.hide();
    });

    // 运行诊断 (需求 12.4)
    this.panelElement.querySelector('#debug-run-diagnostic').addEventListener('click', () => {
      this._runDiagnostic();
    });

    // 测试子系统 (需求 12.3)
    this.panelElement.querySelector('#debug-test-subsystems').addEventListener('click', () => {
      this._testSubsystems();
    });

    // 导出日志 (需求 12.6)
    this.panelElement.querySelector('#debug-export-logs').addEventListener('click', () => {
      this._exportLogs();
    });

    // 清除日志
    this.panelElement.querySelector('#debug-clear-logs').addEventListener('click', () => {
      this._clearLogs();
    });
  }

  /**
   * 更新面板内容
   * @private
   */
  _updatePanel() {
    if (!this.panelElement) return;

    // 更新模式信息 (需求 12.2)
    this._updateModeInfo();
    
    // 更新模块列表 (需求 12.2)
    this._updateModulesList();
    
    // 更新事件监听器 (需求 12.2)
    this._updateListenersList();
  }

  /**
   * 更新模式信息
   * @private
   */
  _updateModeInfo() {
    const modeInfo = this.panelElement.querySelector('#debug-mode-info');
    if (!modeInfo) return;

    const currentMode = this.modeManager?.getCurrentMode?.() || 'Unknown';
    const modeHistory = this.modeManager?.getModeHistory?.() || [];

    modeInfo.innerHTML = `
      <div style="margin-bottom: 4px;">
        <strong>Current:</strong> <span style="color: #4CAF50;">${currentMode}</span>
      </div>
      <div style="font-size: 11px; color: #888;">
        History: ${modeHistory.slice(-3).join(' → ') || 'None'}
      </div>
    `;
  }

  /**
   * 更新模块列表
   * @private
   */
  _updateModulesList() {
    const modulesList = this.panelElement.querySelector('#debug-modules');
    if (!modulesList) return;

    const modules = this.initializationManager?.getAllModules?.() || new Map();
    
    if (modules.size === 0) {
      modulesList.innerHTML = '<div style="color: #888;">No modules initialized</div>';
      return;
    }

    const moduleItems = Array.from(modules.keys()).map(name => {
      const module = modules.get(name);
      const hasActivate = typeof module?.activate === 'function';
      const hasDeactivate = typeof module?.deactivate === 'function';
      
      return `
        <div style="
          padding: 4px 8px;
          margin-bottom: 4px;
          background: #252525;
          border-radius: 3px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <span style="color: #4CAF50;">✓</span>
          <span style="flex: 1; margin-left: 8px;">${name}</span>
          ${hasActivate || hasDeactivate ? '<span style="color: #2196F3; font-size: 10px;">⚡</span>' : ''}
        </div>
      `;
    }).join('');

    modulesList.innerHTML = moduleItems;
  }

  /**
   * 更新事件监听器列表
   * @private
   */
  _updateListenersList() {
    const listenersList = this.panelElement.querySelector('#debug-listeners');
    if (!listenersList) return;

    const listeners = this.eventBus?.getListenerCounts?.() || {};
    const entries = Object.entries(listeners);

    if (entries.length === 0) {
      listenersList.innerHTML = '<div style="color: #888;">No event listeners</div>';
      return;
    }

    const listenerItems = entries.map(([event, count]) => `
      <div style="
        padding: 4px 8px;
        margin-bottom: 4px;
        background: #252525;
        border-radius: 3px;
        display: flex;
        justify-content: space-between;
      ">
        <span style="color: #9C27B0;">${event}</span>
        <span style="color: #888;">${count}</span>
      </div>
    `).join('');

    listenersList.innerHTML = listenerItems;
  }

  /**
   * 启动性能监控 (需求 12.5)
   * @private
   */
  _startPerformanceMonitoring() {
    let lastTime = performance.now();
    let frames = 0;

    const updateFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        this.performanceMetrics.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        // 更新内存使用
        if (performance.memory) {
          this.performanceMetrics.memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
        }
        
        this._updatePerformanceDisplay();
      }
      
      if (this.visible) {
        requestAnimationFrame(updateFPS);
      }
    };

    requestAnimationFrame(updateFPS);
  }

  /**
   * 停止性能监控
   * @private
   */
  _stopPerformanceMonitoring() {
    // Performance monitoring stops automatically when visible = false
  }

  /**
   * 更新性能显示
   * @private
   */
  _updatePerformanceDisplay() {
    const fpsElement = this.panelElement?.querySelector('#debug-fps');
    const memoryElement = this.panelElement?.querySelector('#debug-memory');

    if (fpsElement) {
      const fps = this.performanceMetrics.fps;
      fpsElement.textContent = fps;
      fpsElement.style.color = fps >= 50 ? '#4CAF50' : fps >= 30 ? '#FF9800' : '#F44336';
    }

    if (memoryElement) {
      memoryElement.textContent = this.performanceMetrics.memory;
    }
  }

  /**
   * 运行诊断 (需求 12.4)
   * @private
   */
  _runDiagnostic() {
    if (!this.diagnosticSystem) {
      alert('Diagnostic system not available');
      return;
    }

    const report = this.diagnosticSystem.runFullDiagnostic();
    
    // 显示报告
    this._showDiagnosticReport(report);
  }

  /**
   * 显示诊断报告
   * @private
   */
  _showDiagnosticReport(report) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const reportPanel = document.createElement('div');
    reportPanel.style.cssText = `
      background: #1a1a1a;
      border: 1px solid #444;
      border-radius: 8px;
      width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 20px;
      color: #fff;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
    `;

    reportPanel.innerHTML = `
      <h3 style="margin-top: 0; color: #4CAF50;">Diagnostic Report</h3>
      <pre style="
        background: #0d0d0d;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
      ">${JSON.stringify(report, null, 2)}</pre>
      <button style="
        margin-top: 16px;
        padding: 8px 16px;
        background: #4CAF50;
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
      ">Close</button>
    `;

    overlay.appendChild(reportPanel);
    document.body.appendChild(overlay);

    reportPanel.querySelector('button').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  /**
   * 测试子系统 (需求 12.3)
   * @private
   */
  _testSubsystems() {
    const results = [];

    // 测试事件总线
    try {
      this.eventBus?.emit('test:event', { test: true });
      results.push({ subsystem: 'EventBus', status: 'PASS', message: 'Event emission successful' });
    } catch (error) {
      results.push({ subsystem: 'EventBus', status: 'FAIL', message: error.message });
    }

    // 测试诊断系统
    try {
      this.diagnosticSystem?.log('info', 'Test log');
      results.push({ subsystem: 'DiagnosticSystem', status: 'PASS', message: 'Logging successful' });
    } catch (error) {
      results.push({ subsystem: 'DiagnosticSystem', status: 'FAIL', message: error.message });
    }

    // 显示结果
    this._showTestResults(results);
  }

  /**
   * 显示测试结果
   * @private
   */
  _showTestResults(results) {
    const resultsHTML = results.map(r => `
      <div style="
        padding: 8px;
        margin-bottom: 8px;
        background: ${r.status === 'PASS' ? '#1b5e20' : '#b71c1c'};
        border-radius: 4px;
      ">
        <strong>${r.subsystem}:</strong> ${r.status}<br>
        <span style="font-size: 11px; color: #ccc;">${r.message}</span>
      </div>
    `).join('');

    alert(`Test Results:\n\n${results.map(r => `${r.subsystem}: ${r.status}`).join('\n')}`);
  }

  /**
   * 导出日志 (需求 12.6)
   * @private
   */
  _exportLogs() {
    const logs = this.diagnosticSystem?.getLogs?.() || [];
    
    if (logs.length === 0) {
      alert('No logs to export');
      return;
    }

    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 清除日志
   * @private
   */
  _clearLogs() {
    if (confirm('Clear all logs?')) {
      this.diagnosticSystem?.clearLogs?.();
      alert('Logs cleared');
    }
  }

  /**
   * 销毁面板
   */
  destroy() {
    this.hide();
  }
}

// 单例实例
let debugPanelInstance = null;

export function getDebugPanel(options) {
  if (!debugPanelInstance) {
    debugPanelInstance = new DebugPanel(options);
  }
  return debugPanelInstance;
}

export function resetDebugPanel() {
  if (debugPanelInstance) {
    debugPanelInstance.destroy();
    debugPanelInstance = null;
  }
}
