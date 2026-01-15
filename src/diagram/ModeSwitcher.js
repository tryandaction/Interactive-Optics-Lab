/**
 * ModeSwitcher.js - 模式切换UI组件
 * 提供模式切换按钮和视觉反馈
 * 
 * Requirements: 1.2, 1.7
 */

import { APP_MODES, getModeManager } from './ModeManager.js';

/**
 * 模式切换器UI组件
 */
export class ModeSwitcher {
    /**
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        /** @type {HTMLElement} */
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        /** @type {ModeManager} */
        this.modeManager = options.modeManager || getModeManager();

        /** @type {Object} 配置选项 */
        this.options = {
            showLabels: true,
            showIcons: true,
            compact: false,
            ...options
        };

        /** @type {HTMLElement|null} */
        this.element = null;

        /** @type {Function|null} */
        this.unsubscribe = null;

        // 初始化
        if (this.container) {
            this._render();
            this._bindEvents();
        }
    }

    /**
     * 渲染模式切换器
     * @private
     */
    _render() {
        const currentMode = this.modeManager.getMode();
        const isSimulation = currentMode === APP_MODES.SIMULATION;

        this.element = document.createElement('div');
        this.element.className = 'mode-switcher';
        this.element.setAttribute('role', 'tablist');
        this.element.setAttribute('aria-label', '应用模式切换');

        // 模拟模式按钮
        const simBtn = this._createModeButton(
            APP_MODES.SIMULATION,
            '模拟',
            this._getSimulationIcon(),
            isSimulation
        );

        // 绘图模式按钮
        const diagramBtn = this._createModeButton(
            APP_MODES.DIAGRAM,
            '绘图',
            this._getDiagramIcon(),
            !isSimulation
        );

        this.element.appendChild(simBtn);
        this.element.appendChild(diagramBtn);

        // 添加到容器
        this.container.appendChild(this.element);

        // 添加样式
        this._injectStyles();
    }

    /**
     * 创建模式按钮
     * @private
     */
    _createModeButton(mode, label, icon, isActive) {
        const button = document.createElement('button');
        button.className = `mode-btn ${isActive ? 'active' : ''}`;
        button.dataset.mode = mode;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.setAttribute('aria-controls', `${mode}-panel`);
        button.title = `切换到${label}模式`;

        if (this.options.showIcons) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'mode-btn-icon';
            iconSpan.innerHTML = icon;
            button.appendChild(iconSpan);
        }

        if (this.options.showLabels && !this.options.compact) {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'mode-btn-label';
            labelSpan.textContent = label;
            button.appendChild(labelSpan);
        }

        return button;
    }

    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 按钮点击事件
        this.element.addEventListener('click', (e) => {
            const button = e.target.closest('.mode-btn');
            if (button) {
                const mode = button.dataset.mode;
                this.modeManager.switchMode(mode);
            }
        });

        // 监听模式变化
        this.unsubscribe = this.modeManager.onModeChange((oldMode, newMode, phase) => {
            if (phase === 'after') {
                this._updateActiveState(newMode);
            }
        });

        // 键盘导航
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.modeManager.toggleMode();
            }
        });
    }

    /**
     * 更新激活状态
     * @private
     */
    _updateActiveState(activeMode) {
        const buttons = this.element.querySelectorAll('.mode-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.mode === activeMode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    }

    /**
     * 获取模拟模式图标
     * @private
     */
    _getSimulationIcon() {
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M10 4L14 8L10 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="4" cy="8" r="2" fill="currentColor"/>
        </svg>`;
    }

    /**
     * 获取绘图模式图标
     * @private
     */
    _getDiagramIcon() {
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 8H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M8 5V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="5" cy="5" r="1" fill="currentColor"/>
            <circle cx="11" cy="11" r="1" fill="currentColor"/>
        </svg>`;
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'mode-switcher-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .mode-switcher {
                display: inline-flex;
                background: var(--panel-bg, #1e1e1e);
                border-radius: 6px;
                padding: 3px;
                gap: 2px;
                border: 1px solid var(--border-color, #333);
            }

            .mode-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border: none;
                background: transparent;
                color: var(--text-secondary, #888);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-family: inherit;
                transition: all 0.2s ease;
            }

            .mode-btn:hover {
                background: var(--hover-bg, rgba(255, 255, 255, 0.1));
                color: var(--text-primary, #fff);
            }

            .mode-btn.active {
                background: var(--accent-color, #0078d4);
                color: #fff;
            }

            .mode-btn:focus {
                outline: none;
                box-shadow: 0 0 0 2px var(--focus-color, rgba(0, 120, 212, 0.5));
            }

            .mode-btn-icon {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mode-btn-icon svg {
                width: 16px;
                height: 16px;
            }

            .mode-btn-label {
                font-weight: 500;
            }

            /* 紧凑模式 */
            .mode-switcher.compact .mode-btn {
                padding: 4px 8px;
            }

            /* 响应式 */
            @media (max-width: 600px) {
                .mode-btn-label {
                    display: none;
                }
            }

            /* 模式特定的body样式 */
            body[data-app-mode="simulation"] .diagram-only {
                display: none !important;
            }

            body[data-app-mode="diagram"] .simulation-only {
                display: none !important;
            }

            /* 模式切换动画 */
            .mode-transition {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }

            .mode-transition.hidden {
                opacity: 0;
                transform: translateY(-10px);
                pointer-events: none;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * 设置紧凑模式
     * @param {boolean} compact
     */
    setCompact(compact) {
        this.options.compact = compact;
        if (this.element) {
            this.element.classList.toggle('compact', compact);
        }
    }
}

/**
 * 创建模式切换器的便捷函数
 * @param {HTMLElement|string} container
 * @param {Object} options
 * @returns {ModeSwitcher}
 */
export function createModeSwitcher(container, options = {}) {
    return new ModeSwitcher(container, options);
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ModeSwitcher = ModeSwitcher;
    window.createModeSwitcher = createModeSwitcher;
}
