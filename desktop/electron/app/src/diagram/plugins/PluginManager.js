/**
 * PluginManager.js - 绘图工具插件管理器
 * 负责注册、注销并渲染工具栏插件按钮
 */

/**
 * @typedef {Object} DiagramPlugin
 * @property {string} id - 插件唯一ID
 * @property {string} name - 显示名称
 * @property {string} [icon] - SVG字符串（可选）
 * @property {string} [tooltip] - 提示文字
 * @property {number} [order] - 排序权重（越小越靠前）
 * @property {boolean} [enabled] - 是否可用
 * @property {Function} [onClick] - 点击回调
 * @property {Function} [onActivate] - 激活回调
 * @property {Function} [onDeactivate] - 取消激活回调
 */

export class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.toolbarContainer = null;
        this.activePluginId = null;
    }

    /**
     * 注册插件
     * @param {DiagramPlugin} plugin
     */
    registerPlugin(plugin) {
        if (!plugin || !plugin.id) {
            console.warn('PluginManager: invalid plugin');
            return false;
        }
        this.plugins.set(plugin.id, {
            enabled: true,
            order: 100,
            ...plugin
        });
        this.renderToolbar();
        return true;
    }

    /**
     * 注销插件
     * @param {string} pluginId
     */
    unregisterPlugin(pluginId) {
        if (!this.plugins.has(pluginId)) return false;
        this.plugins.delete(pluginId);
        if (this.activePluginId === pluginId) {
            this.activePluginId = null;
        }
        this.renderToolbar();
        return true;
    }

    /**
     * 设置插件工具栏容器
     * @param {HTMLElement} container
     */
    attachToolbar(container) {
        this.toolbarContainer = container;
        this.renderToolbar();
    }

    /**
     * 获取所有插件
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * 激活插件
     */
    activate(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.enabled === false) return false;

        if (this.activePluginId && this.activePluginId !== pluginId) {
            const prev = this.plugins.get(this.activePluginId);
            if (prev?.onDeactivate) {
                try { prev.onDeactivate(); } catch (e) { console.error('Plugin deactivate failed', e); }
            }
        }

        this.activePluginId = pluginId;
        if (plugin.onActivate) {
            try { plugin.onActivate(); } catch (e) { console.error('Plugin activate failed', e); }
        }
        this.renderToolbar();
        return true;
    }

    /**
     * 取消激活
     */
    deactivate(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        if (plugin.onDeactivate) {
            try { plugin.onDeactivate(); } catch (e) { console.error('Plugin deactivate failed', e); }
        }
        if (this.activePluginId === pluginId) {
            this.activePluginId = null;
        }
        this.renderToolbar();
        return true;
    }

    /**
     * 渲染工具栏按钮
     */
    renderToolbar() {
        if (!this.toolbarContainer) return;
        this.toolbarContainer.innerHTML = '';

        const plugins = this.getPlugins()
            .filter(p => p.enabled !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        plugins.forEach(plugin => {
            const button = document.createElement('button');
            button.className = 'toolbar-btn plugin-btn';
            button.title = plugin.tooltip || plugin.name || '';
            button.dataset.pluginId = plugin.id;

            const iconMarkup = plugin.icon
                ? plugin.icon
                : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg>';

            button.innerHTML = `
                ${iconMarkup}
                <span>${plugin.name || plugin.id}</span>
            `;

            if (this.activePluginId === plugin.id) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                if (plugin.onClick) {
                    try { plugin.onClick(); } catch (e) { console.error('Plugin click failed', e); }
                }
                if (this.activePluginId === plugin.id) {
                    this.deactivate(plugin.id);
                } else {
                    this.activate(plugin.id);
                }
            });

            this.toolbarContainer.appendChild(button);
        });
    }
}

// 单例
let pluginManagerInstance = null;

export function getPluginManager() {
    if (!pluginManagerInstance) {
        pluginManagerInstance = new PluginManager();
    }
    return pluginManagerInstance;
}

export function resetPluginManager() {
    pluginManagerInstance = null;
}

if (typeof window !== 'undefined') {
    window.PluginManager = PluginManager;
    window.getPluginManager = getPluginManager;
}
