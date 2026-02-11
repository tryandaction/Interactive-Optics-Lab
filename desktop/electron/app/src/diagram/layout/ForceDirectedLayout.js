/**
 * ForceDirectedLayout.js - 力导向布局算法
 * Force-directed layout for automatic component arrangement
 * 
 * Requirements: 9.1
 */

/**
 * 力导向布局类
 */
export class ForceDirectedLayout {
    constructor(options = {}) {
        this.options = {
            iterations: options.iterations || 100,
            springLength: options.springLength || 100,
            springStrength: options.springStrength || 0.1,
            repulsionStrength: options.repulsionStrength || 1000,
            damping: options.damping || 0.9,
            centeringStrength: options.centeringStrength || 0.01,
            animate: options.animate !== false,
            animationDuration: options.animationDuration || 1000,
            ...options
        };
        
        this.velocities = new Map();
        this.forces = new Map();
    }

    /**
     * 应用力导向布局
     */
    apply(components, connections = []) {
        // 初始化速度和力
        this.velocities.clear();
        this.forces.clear();
        
        components.forEach(comp => {
            this.velocities.set(comp.id, { x: 0, y: 0 });
            this.forces.set(comp.id, { x: 0, y: 0 });
        });
        
        // 迭代计算
        for (let i = 0; i < this.options.iterations; i++) {
            this._calculateForces(components, connections);
            this._updatePositions(components);
        }
        
        return components;
    }

    /**
     * 计算所有力
     */
    _calculateForces(components, connections) {
        // 重置力
        components.forEach(comp => {
            this.forces.set(comp.id, { x: 0, y: 0 });
        });
        
        // 1. 弹簧力（连接的组件之间）
        this._applySpringForces(components, connections);
        
        // 2. 排斥力（所有组件之间）
        this._applyRepulsionForces(components);
        
        // 3. 居中力
        this._applyCenteringForce(components);
    }

    /**
     * 应用弹簧力
     */
    _applySpringForces(components, connections) {
        const compMap = new Map(components.map(c => [c.id, c]));
        
        connections.forEach(conn => {
            const comp1 = compMap.get(conn.source || conn.from);
            const comp2 = compMap.get(conn.target || conn.to);
            
            if (!comp1 || !comp2) return;
            
            const dx = comp2.pos.x - comp1.pos.x;
            const dy = comp2.pos.y - comp1.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Hooke's law: F = k * (distance - restLength)
            const displacement = distance - this.options.springLength;
            const force = this.options.springStrength * displacement;
            
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            // Apply force to both components
            const force1 = this.forces.get(comp1.id);
            const force2 = this.forces.get(comp2.id);
            
            force1.x += fx;
            force1.y += fy;
            force2.x -= fx;
            force2.y -= fy;
        });
    }

    /**
     * 应用排斥力
     */
    _applyRepulsionForces(components) {
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                const comp1 = components[i];
                const comp2 = components[j];
                
                const dx = comp2.pos.x - comp1.pos.x;
                const dy = comp2.pos.y - comp1.pos.y;
                const distanceSquared = dx * dx + dy * dy || 1;
                const distance = Math.sqrt(distanceSquared);
                
                // Coulomb's law: F = k / distance^2
                const force = this.options.repulsionStrength / distanceSquared;
                
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;
                
                const force1 = this.forces.get(comp1.id);
                const force2 = this.forces.get(comp2.id);
                
                force1.x -= fx;
                force1.y -= fy;
                force2.x += fx;
                force2.y += fy;
            }
        }
    }

    /**
     * 应用居中力
     */
    _applyCenteringForce(components) {
        // Calculate center of mass
        let centerX = 0, centerY = 0;
        components.forEach(comp => {
            centerX += comp.pos.x;
            centerY += comp.pos.y;
        });
        centerX /= components.length;
        centerY /= components.length;
        
        // Apply force toward center
        components.forEach(comp => {
            const force = this.forces.get(comp.id);
            force.x -= (comp.pos.x - centerX) * this.options.centeringStrength;
            force.y -= (comp.pos.y - centerY) * this.options.centeringStrength;
        });
    }

    /**
     * 更新位置
     */
    _updatePositions(components) {
        components.forEach(comp => {
            const force = this.forces.get(comp.id);
            const velocity = this.velocities.get(comp.id);
            
            // Update velocity: v = v + F
            velocity.x = (velocity.x + force.x) * this.options.damping;
            velocity.y = (velocity.y + force.y) * this.options.damping;
            
            // Update position: p = p + v
            comp.pos.x += velocity.x;
            comp.pos.y += velocity.y;
        });
    }

    /**
     * 应用约束
     */
    applyConstraints(components, constraints) {
        constraints.forEach(constraint => {
            if (constraint.type === 'fixed') {
                // Fixed position
                const comp = components.find(c => c.id === constraint.componentId);
                if (comp) {
                    comp.pos.x = constraint.x;
                    comp.pos.y = constraint.y;
                }
            } else if (constraint.type === 'align') {
                // Alignment constraint
                const comps = components.filter(c => constraint.componentIds.includes(c.id));
                if (constraint.axis === 'x') {
                    const avgX = comps.reduce((sum, c) => sum + c.pos.x, 0) / comps.length;
                    comps.forEach(c => c.pos.x = avgX);
                } else if (constraint.axis === 'y') {
                    const avgY = comps.reduce((sum, c) => sum + c.pos.y, 0) / comps.length;
                    comps.forEach(c => c.pos.y = avgY);
                }
            }
        });
    }

    /**
     * 动画布局
     */
    async animateLayout(components, connections, onUpdate) {
        const startPositions = new Map(
            components.map(c => [c.id, { x: c.pos.x, y: c.pos.y }])
        );
        
        // Calculate final positions
        const finalComponents = JSON.parse(JSON.stringify(components));
        this.apply(finalComponents, connections);
        
        const endPositions = new Map(
            finalComponents.map(c => [c.id, { x: c.pos.x, y: c.pos.y }])
        );
        
        // Animate
        const startTime = Date.now();
        const duration = this.options.animationDuration;
        
        return new Promise((resolve) => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-in-out)
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                // Interpolate positions
                components.forEach(comp => {
                    const start = startPositions.get(comp.id);
                    const end = endPositions.get(comp.id);
                    
                    comp.pos.x = start.x + (end.x - start.x) * eased;
                    comp.pos.y = start.y + (end.y - start.y) * eased;
                });
                
                if (onUpdate) onUpdate(progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            animate();
        });
    }

    /**
     * 获取布局能量（用于判断收敛）
     */
    getEnergy(components) {
        let energy = 0;
        
        components.forEach(comp => {
            const velocity = this.velocities.get(comp.id);
            if (velocity) {
                energy += velocity.x * velocity.x + velocity.y * velocity.y;
            }
        });
        
        return energy;
    }
}

// ========== 单例模式 ==========
let layoutInstance = null;

export function getForceDirectedLayout(options) {
    if (!layoutInstance) {
        layoutInstance = new ForceDirectedLayout(options);
    }
    return layoutInstance;
}

export function resetForceDirectedLayout() {
    layoutInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ForceDirectedLayout = ForceDirectedLayout;
    window.getForceDirectedLayout = getForceDirectedLayout;
}
