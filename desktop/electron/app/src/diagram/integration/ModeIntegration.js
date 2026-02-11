/**
 * ModeIntegration.js - 模式集成管理器
 * Manages seamless switching between simulation and diagram modes
 * 
 * Requirements: 16.1
 */

import { getDiagramToSimulationConverter } from './DiagramToSimulation.js';
import { getSimulationToDiagramConverter } from './SimulationToDiagram.js';

/**
 * 模式类型
 */
export const Mode = {
    SIMULATION: 'simulation',
    DIAGRAM: 'diagram'
};

/**
 * 模式集成管理器类
 */
export class ModeIntegrationManager {
    constructor() {
        this.currentMode = Mode.SIMULATION;
        this.currentScene = null;
        this.conversionHistory = [];
        this.listeners = [];
        
        // 转换器
        this.diagramToSim = getDiagramToSimulationConverter();
        this.simToDiagram = null;  // 延迟创建，因为需要选项
    }

    /**
     * 切换模式
     */
    switchMode(targetMode, options = {}) {
        if (this.currentMode === targetMode) {
            console.warn('Already in target mode');
            return { success: true, scene: this.currentScene };
        }
        
        const oldMode = this.currentMode;
        let convertedScene;
        let conversionResult;
        
        try {
            // 执行转换
            if (targetMode === Mode.SIMULATION) {
                // 绘图 -> 模拟
                conversionResult = this.diagramToSim.convert(this.currentScene);
                convertedScene = conversionResult.scene;
            } else {
                // 模拟 -> 绘图
                this.simToDiagram = getSimulationToDiagramConverter(options);
                conversionResult = this.simToDiagram.convert(this.currentScene);
                convertedScene = conversionResult.scene;
            }
            
            // 检查转换是否成功
            if (!conversionResult.success) {
                throw new Error(`Conversion failed with ${conversionResult.errors.length} errors`);
            }
            
            // 更新状态
            this.currentMode = targetMode;
            this.currentScene = convertedScene;
            
            // 记录转换历史
            this.conversionHistory.push({
                timestamp: Date.now(),
                from: oldMode,
                to: targetMode,
                errors: conversionResult.errors,
                warnings: conversionResult.warnings
            });
            
            // 触发事件
            this.notifyListeners({
                type: 'mode-changed',
                oldMode: oldMode,
                newMode: targetMode,
                scene: convertedScene,
                conversionResult: conversionResult
            });
            
            return {
                success: true,
                scene: convertedScene,
                mode: targetMode,
                conversionResult: conversionResult
            };
            
        } catch (error) {
            console.error('Mode switch failed:', error);
            
            return {
                success: false,
                error: error.message,
                mode: oldMode,
                scene: this.currentScene
            };
        }
    }

    /**
     * 切换到模拟模式
     */
    switchToSimulation() {
        return this.switchMode(Mode.SIMULATION);
    }

    /**
     * 切换到绘图模式
     */
    switchToDiagram(options = {}) {
        return this.switchMode(Mode.DIAGRAM, options);
    }

    /**
     * 切换模式（自动检测目标）
     */
    toggleMode(options = {}) {
        const targetMode = this.currentMode === Mode.SIMULATION 
            ? Mode.DIAGRAM 
            : Mode.SIMULATION;
        return this.switchMode(targetMode, options);
    }

    /**
     * 设置当前场景
     */
    setScene(scene, mode) {
        this.currentScene = scene;
        if (mode) {
            this.currentMode = mode;
        }
    }

    /**
     * 获取当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 获取当前场景
     */
    getCurrentScene() {
        return this.currentScene;
    }

    /**
     * 检查是否为模拟模式
     */
    isSimulationMode() {
        return this.currentMode === Mode.SIMULATION;
    }

    /**
     * 检查是否为绘图模式
     */
    isDiagramMode() {
        return this.currentMode === Mode.DIAGRAM;
    }

    /**
     * 验证场景是否可以转换
     */
    canConvert(scene, targetMode) {
        try {
            if (targetMode === Mode.SIMULATION) {
                const result = this.diagramToSim.convert(scene);
                return result.success;
            } else {
                const converter = new (require('./SimulationToDiagram.js').SimulationToDiagramConverter)();
                const result = converter.convert(scene);
                return result.success;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取转换预览
     */
    previewConversion(scene, targetMode, options = {}) {
        try {
            if (targetMode === Mode.SIMULATION) {
                return this.diagramToSim.convert(scene);
            } else {
                const converter = new (require('./SimulationToDiagram.js').SimulationToDiagramConverter)(options);
                return converter.convert(scene);
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errors: [{ message: error.message }],
                warnings: []
            };
        }
    }

    /**
     * 获取转换历史
     */
    getConversionHistory() {
        return [...this.conversionHistory];
    }

    /**
     * 清除转换历史
     */
    clearHistory() {
        this.conversionHistory = [];
    }

    /**
     * 添加监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知监听器
     */
    notifyListeners(event) {
        this.listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }

    /**
     * 获取模式信息
     */
    getModeInfo() {
        return {
            currentMode: this.currentMode,
            isSimulation: this.isSimulationMode(),
            isDiagram: this.isDiagramMode(),
            hasScene: this.currentScene !== null,
            conversionCount: this.conversionHistory.length
        };
    }

    /**
     * 导出状态
     */
    exportState() {
        return {
            mode: this.currentMode,
            scene: this.currentScene,
            history: this.conversionHistory
        };
    }

    /**
     * 导入状态
     */
    importState(state) {
        if (state.mode) this.currentMode = state.mode;
        if (state.scene) this.currentScene = state.scene;
        if (state.history) this.conversionHistory = state.history;
    }

    /**
     * 重置
     */
    reset() {
        this.currentMode = Mode.SIMULATION;
        this.currentScene = null;
        this.conversionHistory = [];
        this.listeners = [];
    }
}

// ========== 单例模式 ==========
let managerInstance = null;

export function getModeIntegrationManager() {
    if (!managerInstance) {
        managerInstance = new ModeIntegrationManager();
    }
    return managerInstance;
}

export function resetModeIntegrationManager() {
    if (managerInstance) {
        managerInstance.reset();
    }
    managerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ModeIntegrationManager = ModeIntegrationManager;
    window.getModeIntegrationManager = getModeIntegrationManager;
    window.Mode = Mode;
}
