/**
 * HierarchicalLayout.js - 层次布局算法
 * Hierarchical layout respecting optical signal flow
 * 
 * Requirements: 9.2
 */

/**
 * 布局方向
 */
export const LayoutDirection = {
    TOP_DOWN: 'top-down',
    LEFT_RIGHT: 'left-right',
    BOTTOM_UP: 'bottom-up',
    RIGHT_LEFT: 'right-left'
};

/**
 * 层次布局类
 */
export class HierarchicalLayout {
    constructor(options = {}) {
        this.options = {
            direction: options.direction || LayoutDirection.LEFT_RIGHT,
            layerSpacing: options.layerSpacing || 150,
            nodeSpacing: options.nodeSpacing || 100,
            minimizeCrossings: options.minimizeCrossings !== false,
            centerNodes: options.centerNodes !== false,
            ...options
        };
    }

    /**
     * 应用层次布局
     */
    apply(components, connections = []) {
        // 1. 分配层级
        const layers = this._assignLayers(components, connections);
        
        // 2. 最小化交叉
        if (this.options.minimizeCrossings) {
            this._minimizeCrossings(layers, connections);
        }
        
        // 3. 计算位置
        this._calculatePositions(layers);
        
        // 4. 居中节点
        if (this.options.centerNodes) {
            this._centerNodes(layers);
        }
        
        return components;
    }

    /**
     * 分配层级
     */
    _assignLayers(components, connections) {
        const layers = [];
        const visited = new Set();
        const compMap = new Map(components.map(c => [c.id, c]));
        
        // Build adjacency list
        const adjacency = new Map();
        components.forEach(comp => adjacency.set(comp.id, []));
        
        connections.forEach(conn => {
            const sourceId = conn.source || conn.from;
            const targetId = conn.target || conn.to;
            if (adjacency.has(sourceId)) {
                adjacency.get(sourceId).push(targetId);
            }
        });
        
        // Find source nodes (nodes with no incoming edges)
        const inDegree = new Map();
        components.forEach(comp => inDegree.set(comp.id, 0));
        
        connections.forEach(conn => {
            const targetId = conn.target || conn.to;
            inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
        });
        
        const sources = components.filter(c => inDegree.get(c.id) === 0);
        
        // BFS to assign layers
        let currentLayer = sources.map(c => c.id);
        let layerIndex = 0;
        
        while (currentLayer.length > 0) {
            layers[layerIndex] = currentLayer.map(id => compMap.get(id));
            
            const nextLayer = new Set();
            currentLayer.forEach(nodeId => {
                visited.add(nodeId);
                const neighbors = adjacency.get(nodeId) || [];
                neighbors.forEach(neighborId => {
                    if (!visited.has(neighborId)) {
                        nextLayer.add(neighborId);
                    }
                });
            });
            
            currentLayer = Array.from(nextLayer);
            layerIndex++;
        }
        
        // Add unvisited nodes to last layer
        const unvisited = components.filter(c => !visited.has(c.id));
        if (unvisited.length > 0) {
            layers.push(unvisited);
        }
        
        return layers;
    }

    /**
     * 最小化交叉（使用重心法）
     */
    _minimizeCrossings(layers, connections) {
        const maxIterations = 10;
        
        // Build connection map
        const connMap = new Map();
        connections.forEach(conn => {
            const sourceId = conn.source || conn.from;
            const targetId = conn.target || conn.to;
            
            if (!connMap.has(sourceId)) connMap.set(sourceId, []);
            connMap.get(sourceId).push(targetId);
        });
        
        for (let iter = 0; iter < maxIterations; iter++) {
            // Forward pass
            for (let i = 1; i < layers.length; i++) {
                this._sortLayerByBarycenter(layers[i], layers[i - 1], connMap, true);
            }
            
            // Backward pass
            for (let i = layers.length - 2; i >= 0; i--) {
                this._sortLayerByBarycenter(layers[i], layers[i + 1], connMap, false);
            }
        }
    }

    /**
     * 按重心排序层
     */
    _sortLayerByBarycenter(layer, referenceLayer, connMap, forward) {
        const positions = new Map();
        referenceLayer.forEach((node, index) => {
            positions.set(node.id, index);
        });
        
        const barycenters = layer.map(node => {
            const connections = forward
                ? this._getIncomingConnections(node.id, connMap)
                : this._getOutgoingConnections(node.id, connMap);
            
            if (connections.length === 0) return { node, barycenter: 0 };
            
            const sum = connections.reduce((acc, connId) => {
                return acc + (positions.get(connId) || 0);
            }, 0);
            
            return { node, barycenter: sum / connections.length };
        });
        
        barycenters.sort((a, b) => a.barycenter - b.barycenter);
        
        // Update layer
        layer.length = 0;
        barycenters.forEach(item => layer.push(item.node));
    }

    /**
     * 获取入边
     */
    _getIncomingConnections(nodeId, connMap) {
        const incoming = [];
        connMap.forEach((targets, sourceId) => {
            if (targets.includes(nodeId)) {
                incoming.push(sourceId);
            }
        });
        return incoming;
    }

    /**
     * 获取出边
     */
    _getOutgoingConnections(nodeId, connMap) {
        return connMap.get(nodeId) || [];
    }

    /**
     * 计算位置
     */
    _calculatePositions(layers) {
        const direction = this.options.direction;
        const layerSpacing = this.options.layerSpacing;
        const nodeSpacing = this.options.nodeSpacing;
        
        layers.forEach((layer, layerIndex) => {
            layer.forEach((node, nodeIndex) => {
                if (direction === LayoutDirection.LEFT_RIGHT) {
                    node.pos.x = layerIndex * layerSpacing;
                    node.pos.y = nodeIndex * nodeSpacing;
                } else if (direction === LayoutDirection.TOP_DOWN) {
                    node.pos.x = nodeIndex * nodeSpacing;
                    node.pos.y = layerIndex * layerSpacing;
                } else if (direction === LayoutDirection.RIGHT_LEFT) {
                    node.pos.x = (layers.length - 1 - layerIndex) * layerSpacing;
                    node.pos.y = nodeIndex * nodeSpacing;
                } else if (direction === LayoutDirection.BOTTOM_UP) {
                    node.pos.x = nodeIndex * nodeSpacing;
                    node.pos.y = (layers.length - 1 - layerIndex) * layerSpacing;
                }
            });
        });
    }

    /**
     * 居中节点
     */
    _centerNodes(layers) {
        // Find max layer size
        const maxLayerSize = Math.max(...layers.map(layer => layer.length));
        const nodeSpacing = this.options.nodeSpacing;
        
        layers.forEach(layer => {
            const offset = ((maxLayerSize - layer.length) * nodeSpacing) / 2;
            
            layer.forEach(node => {
                if (this.options.direction === LayoutDirection.LEFT_RIGHT ||
                    this.options.direction === LayoutDirection.RIGHT_LEFT) {
                    node.pos.y += offset;
                } else {
                    node.pos.x += offset;
                }
            });
        });
    }

    /**
     * 计算交叉数
     */
    countCrossings(layers, connections) {
        let crossings = 0;
        
        for (let i = 0; i < layers.length - 1; i++) {
            const layer1 = layers[i];
            const layer2 = layers[i + 1];
            
            const positions1 = new Map();
            const positions2 = new Map();
            
            layer1.forEach((node, index) => positions1.set(node.id, index));
            layer2.forEach((node, index) => positions2.set(node.id, index));
            
            // Check all pairs of connections
            for (let j = 0; j < connections.length; j++) {
                for (let k = j + 1; k < connections.length; k++) {
                    const conn1 = connections[j];
                    const conn2 = connections[k];
                    
                    const s1 = positions1.get(conn1.source || conn1.from);
                    const t1 = positions2.get(conn1.target || conn1.to);
                    const s2 = positions1.get(conn2.source || conn2.from);
                    const t2 = positions2.get(conn2.target || conn2.to);
                    
                    if (s1 !== undefined && t1 !== undefined &&
                        s2 !== undefined && t2 !== undefined) {
                        // Check if connections cross
                        if ((s1 < s2 && t1 > t2) || (s1 > s2 && t1 < t2)) {
                            crossings++;
                        }
                    }
                }
            }
        }
        
        return crossings;
    }

    /**
     * 获取层信息
     */
    getLayerInfo(layers) {
        return layers.map((layer, index) => ({
            index: index,
            nodeCount: layer.length,
            nodes: layer.map(n => n.id)
        }));
    }
}

// ========== 单例模式 ==========
let layoutInstance = null;

export function getHierarchicalLayout(options) {
    if (!layoutInstance) {
        layoutInstance = new HierarchicalLayout(options);
    }
    return layoutInstance;
}

export function resetHierarchicalLayout() {
    layoutInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.HierarchicalLayout = HierarchicalLayout;
    window.getHierarchicalLayout = getHierarchicalLayout;
    window.LayoutDirection = LayoutDirection;
}
