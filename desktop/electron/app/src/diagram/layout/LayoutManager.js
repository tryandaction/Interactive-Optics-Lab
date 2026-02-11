/**
 * LayoutManager.js - 布局管理器
 * Unified manager for all layout algorithms
 * 
 * Requirements: 9.4
 */

import { ForceDirectedLayout } from './ForceDirectedLayout.js';
import { HierarchicalLayout, LayoutDirection } from './HierarchicalLayout.js';

/**
 * 布局类型
 */
export const LayoutType = {
    FORCE_DIRECTED: 'force-directed',
    HIERARCHICAL: 'hierarchical',
    GRID: 'grid',
    CIRCULAR: 'circular',
    MANUAL: 'manual'
};

/**
 * 布局管理器类
 */
export class LayoutManager {
    constructor() {
        this.currentLayout = LayoutType.MANUAL;
        this.layoutHistory = [];
        this.layouts = {
            forceDirected: new ForceDirectedLayout(),
            hierarchical: new HierarchicalLayout()
        };
    }

    /**
     * 应用布局
     */
    applyLayout(components, connections, layoutType, options = {}) {
        // Save current state for undo
        this._saveState(components);
        
        let result;
        
        switch (layoutType) {
            case LayoutType.FORCE_DIRECTED:
                result = this._applyForceDirected(components, connections, options);
                break;
            
            case LayoutType.HIERARCHICAL:
                result = this._applyHierarchical(components, connections, options);
                break;
            
            case LayoutType.GRID:
                result = this._applyGrid(components, options);
                break;
            
            case LayoutType.CIRCULAR:
                result = this._applyCircular(components, options);
                break;
            
            default:
                result = { success: false, error: 'Unknown layout type' };
        }
        
        if (result.success) {
            this.currentLayout = layoutType;
        }
        
        return result;
    }

    /**
     * 应用力导向布局
     */
    _applyForceDirected(components, connections, options) {
        try {
            const layout = new ForceDirectedLayout(options);
            layout.apply(components, connections);
            
            return {
                success: true,
                layoutType: LayoutType.FORCE_DIRECTED,
                components: components
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 应用层次布局
     */
    _applyHierarchical(components, connections, options) {
        try {
            const layout = new HierarchicalLayout(options);
            layout.apply(components, connections);
            
            return {
                success: true,
                layoutType: LayoutType.HIERARCHICAL,
                components: components
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 应用网格布局
     */
    _applyGrid(components, options = {}) {
        const cols = options.columns || Math.ceil(Math.sqrt(components.length));
        const spacing = options.spacing || 100;
        const startX = options.startX || 0;
        const startY = options.startY || 0;
        
        components.forEach((comp, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            comp.pos.x = startX + col * spacing;
            comp.pos.y = startY + row * spacing;
        });
        
        return {
            success: true,
            layoutType: LayoutType.GRID,
            components: components
        };
    }

    /**
     * 应用圆形布局
     */
    _applyCircular(components, options = {}) {
        const radius = options.radius || 200;
        const centerX = options.centerX || 0;
        const centerY = options.centerY || 0;
        const startAngle = options.startAngle || 0;
        
        const angleStep = (2 * Math.PI) / components.length;
        
        components.forEach((comp, index) => {
            const angle = startAngle + index * angleStep;
            comp.pos.x = centerX + radius * Math.cos(angle);
            comp.pos.y = centerY + radius * Math.sin(angle);
        });
        
        return {
            success: true,
            layoutType: LayoutType.CIRCULAR,
            components: components
        };
    }

    /**
     * 应用部分布局（仅选中的组件）
     */
    applyPartialLayout(allComponents, selectedIds, connections, layoutType, options = {}) {
        const selectedComponents = allComponents.filter(c => selectedIds.includes(c.id));
        const selectedConnections = connections.filter(conn => 
            selectedIds.includes(conn.source || conn.from) &&
            selectedIds.includes(conn.target || conn.to)
        );
        
        return this.applyLayout(selectedComponents, selectedConnections, layoutType, options);
    }

    /**
     * 优化布局（微调）
     */
    optimizeLayout(components, connections, iterations = 10) {
        const layout = new ForceDirectedLayout({
            iterations: iterations,
            springStrength: 0.05,
            repulsionStrength: 500,
            damping: 0.95
        });
        
        layout.apply(components, connections);
        
        return {
            success: true,
            components: components
        };
    }

    /**
     * 自动选择最佳布局
     */
    autoLayout(components, connections) {
        // Analyze structure
        const hasConnections = connections && connections.length > 0;
        const componentCount = components.length;
        
        // Decision logic
        if (!hasConnections) {
            // No connections: use grid layout
            return this.applyLayout(components, [], LayoutType.GRID);
        } else if (this._isHierarchical(components, connections)) {
            // Hierarchical structure: use hierarchical layout
            return this.applyLayout(components, connections, LayoutType.HIERARCHICAL, {
                direction: LayoutDirection.LEFT_RIGHT
            });
        } else {
            // General case: use force-directed layout
            return this.applyLayout(components, connections, LayoutType.FORCE_DIRECTED);
        }
    }

    /**
     * 检查是否为层次结构
     */
    _isHierarchical(components, connections) {
        // Check if graph is acyclic (DAG)
        const visited = new Set();
        const recursionStack = new Set();
        
        const adjacency = new Map();
        components.forEach(comp => adjacency.set(comp.id, []));
        
        connections.forEach(conn => {
            const sourceId = conn.source || conn.from;
            const targetId = conn.target || conn.to;
            if (adjacency.has(sourceId)) {
                adjacency.get(sourceId).push(targetId);
            }
        });
        
        const hasCycle = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            
            const neighbors = adjacency.get(nodeId) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor)) return true;
                } else if (recursionStack.has(neighbor)) {
                    return true;
                }
            }
            
            recursionStack.delete(nodeId);
            return false;
        };
        
        for (const comp of components) {
            if (!visited.has(comp.id)) {
                if (hasCycle(comp.id)) {
                    return false;  // Has cycle, not hierarchical
                }
            }
        }
        
        return true;  // No cycles, is hierarchical
    }

    /**
     * 保存状态（用于撤销）
     */
    _saveState(components) {
        const state = components.map(comp => ({
            id: comp.id,
            pos: { ...comp.pos }
        }));
        
        this.layoutHistory.push(state);
        
        // Limit history size
        if (this.layoutHistory.length > 20) {
            this.layoutHistory.shift();
        }
    }

    /**
     * 撤销布局
     */
    undo(components) {
        if (this.layoutHistory.length === 0) {
            return { success: false, error: 'No history to undo' };
        }
        
        const previousState = this.layoutHistory.pop();
        
        previousState.forEach(savedComp => {
            const comp = components.find(c => c.id === savedComp.id);
            if (comp) {
                comp.pos.x = savedComp.pos.x;
                comp.pos.y = savedComp.pos.y;
            }
        });
        
        return { success: true, components: components };
    }

    /**
     * 清除历史
     */
    clearHistory() {
        this.layoutHistory = [];
    }

    /**
     * 获取布局预设
     */
    getPresets() {
        return {
            optical: {
                name: 'Optical Flow',
                type: LayoutType.HIERARCHICAL,
                options: {
                    direction: LayoutDirection.LEFT_RIGHT,
                    layerSpacing: 150,
                    nodeSpacing: 100
                }
            },
            compact: {
                name: 'Compact',
                type: LayoutType.FORCE_DIRECTED,
                options: {
                    iterations: 50,
                    springLength: 80,
                    repulsionStrength: 800
                }
            },
            spread: {
                name: 'Spread Out',
                type: LayoutType.FORCE_DIRECTED,
                options: {
                    iterations: 100,
                    springLength: 150,
                    repulsionStrength: 1500
                }
            },
            grid: {
                name: 'Grid',
                type: LayoutType.GRID,
                options: {
                    spacing: 100
                }
            },
            circular: {
                name: 'Circular',
                type: LayoutType.CIRCULAR,
                options: {
                    radius: 200
                }
            }
        };
    }

    /**
     * 应用预设
     */
    applyPreset(components, connections, presetName) {
        const presets = this.getPresets();
        const preset = presets[presetName];
        
        if (!preset) {
            return { success: false, error: 'Unknown preset' };
        }
        
        return this.applyLayout(components, connections, preset.type, preset.options);
    }

    /**
     * 获取当前布局类型
     */
    getCurrentLayout() {
        return this.currentLayout;
    }

    /**
     * 获取布局信息
     */
    getLayoutInfo(components, connections) {
        return {
            componentCount: components.length,
            connectionCount: connections.length,
            currentLayout: this.currentLayout,
            isHierarchical: this._isHierarchical(components, connections),
            historySize: this.layoutHistory.length
        };
    }
}

// ========== 单例模式 ==========
let managerInstance = null;

export function getLayoutManager() {
    if (!managerInstance) {
        managerInstance = new LayoutManager();
    }
    return managerInstance;
}

export function resetLayoutManager() {
    managerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.LayoutManager = LayoutManager;
    window.getLayoutManager = getLayoutManager;
    window.LayoutType = LayoutType;
}
