/**
 * NavigationIntegrationExample.js - 导航、测量和计算工具集成示例
 * 展示如何将Minimap、MeasurementPanel、CalculatorPanel和NavigationPanel集成到应用中
 */

import { getMinimap } from './navigation/Minimap.js';
import { getMeasurementPanel } from '../ui/panels/MeasurementPanel.js';
import { getCalculatorPanel } from '../ui/panels/CalculatorPanel.js';
import { getNavigationPanel } from '../ui/panels/NavigationPanel.js';
import { getMeasurementTools } from './measurement/MeasurementTools.js';

/**
 * 初始化导航和测量工具
 * @param {Object} config - 配置选项
 * @param {HTMLElement} config.container - 主容器元素
 * @param {HTMLCanvasElement} config.canvas - 画布元素
 * @param {Array} config.components - 组件列表
 * @param {Array} config.rays - 光线列表
 * @returns {Object} 工具实例集合
 */
export function initializeNavigationTools(config) {
    const { container, canvas, components = [], rays = [] } = config;
    
    // 1. 创建缩略图导航器
    const minimap = getMinimap({
        width: 200,
        height: 150,
        position: 'bottom-right',
        visible: true
    });
    
    // 挂载到容器
    minimap.mount(container);
    
    // 设置视口变化回调
    minimap.setOnViewportChange((viewport) => {
        // 更新主画布视口
        if (canvas && canvas.camera) {
            canvas.camera.x = viewport.x;
            canvas.camera.y = viewport.y;
        }
    });
    
    // 2. 创建测量工具面板
    const measurementPanel = getMeasurementPanel({
        position: 'right',
        width: 300
    });
    
    measurementPanel.mount(container);
    
    // 设置工具选择回调
    measurementPanel.onToolSelect = (toolType) => {
        console.log('Selected measurement tool:', toolType);
        // 激活测量模式
        if (canvas) {
            canvas.measurementMode = true;
            canvas.currentMeasurementTool = toolType;
        }
    };
    
    // 3. 创建光学计算器面板
    const calculatorPanel = getCalculatorPanel({
        position: 'right',
        width: 350
    });
    
    calculatorPanel.mount(container);
    
    // 4. 创建导航控制面板
    const navigationPanel = getNavigationPanel({
        position: 'top-right',
        visible: true
    });
    
    navigationPanel.mount(container);
    
    // 设置缩放回调
    navigationPanel.onZoomChange = (zoom) => {
        if (canvas && canvas.camera) {
            canvas.camera.zoom = zoom;
        }
        // 更新缩略图
        minimap.render(components, rays);
    };
    
    // 设置平移回调
    navigationPanel.onPan = (dx, dy) => {
        if (canvas && canvas.camera) {
            canvas.camera.x += dx;
            canvas.camera.y += dy;
        }
        // 更新缩略图视口
        if (canvas && canvas.camera) {
            minimap.updateViewport({
                x: canvas.camera.x,
                y: canvas.camera.y,
                width: canvas.width / canvas.camera.zoom,
                height: canvas.height / canvas.camera.zoom
            });
        }
        minimap.render(components, rays);
    };
    
    // 设置适应视图回调
    navigationPanel.onFitView = () => {
        // 计算所有组件的边界
        minimap.updateSceneBounds(components);
        const bounds = minimap.sceneBounds;
        
        if (canvas && canvas.camera) {
            // 计算适应视图的缩放和位置
            const scaleX = canvas.width / (bounds.maxX - bounds.minX);
            const scaleY = canvas.height / (bounds.maxY - bounds.minY);
            const zoom = Math.min(scaleX, scaleY) * 0.9; // 留10%边距
            
            canvas.camera.zoom = zoom;
            canvas.camera.x = (bounds.minX + bounds.maxX) / 2 - canvas.width / (2 * zoom);
            canvas.camera.y = (bounds.minY + bounds.maxY) / 2 - canvas.height / (2 * zoom);
            
            navigationPanel.setZoom(zoom);
        }
        
        minimap.render(components, rays);
    };
    
    // 设置历史导航回调
    navigationPanel.onHistoryNavigate = (state) => {
        if (canvas && canvas.camera && state.zoom) {
            canvas.camera.zoom = state.zoom;
            navigationPanel.setZoom(state.zoom);
        }
        minimap.render(components, rays);
    };
    
    // 设置书签回调
    navigationPanel.onBookmarkSelect = (state) => {
        if (canvas && canvas.camera && state.zoom) {
            canvas.camera.zoom = state.zoom;
            navigationPanel.setZoom(state.zoom);
        }
        minimap.render(components, rays);
    };
    
    // 5. 设置画布事件监听
    if (canvas) {
        // 监听画布点击用于测量
        canvas.addEventListener('click', (e) => {
            const measurementTools = getMeasurementTools();
            if (measurementTools.currentTool) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // 转换为世界坐标
                const worldX = (x / canvas.camera.zoom) + canvas.camera.x;
                const worldY = (y / canvas.camera.zoom) + canvas.camera.y;
                
                measurementTools.addPoint({ x: worldX, y: worldY });
                measurementPanel.refresh();
            }
        });
        
        // 监听视口变化
        canvas.addEventListener('viewportchange', () => {
            if (canvas.camera) {
                minimap.updateViewport({
                    x: canvas.camera.x,
                    y: canvas.camera.y,
                    width: canvas.width / canvas.camera.zoom,
                    height: canvas.height / canvas.camera.zoom
                });
                minimap.render(components, rays);
                
                // 保存视图状态到历史
                navigationPanel.saveViewState({
                    zoom: canvas.camera.zoom,
                    x: canvas.camera.x,
                    y: canvas.camera.y
                });
            }
        });
    }
    
    // 6. 初始渲染
    minimap.updateSceneBounds(components);
    if (canvas && canvas.camera) {
        minimap.updateViewport({
            x: canvas.camera.x,
            y: canvas.camera.y,
            width: canvas.width / canvas.camera.zoom,
            height: canvas.height / canvas.camera.zoom
        });
    }
    minimap.render(components, rays);
    
    return {
        minimap,
        measurementPanel,
        calculatorPanel,
        navigationPanel,
        
        // 便捷方法
        update: () => {
            minimap.updateSceneBounds(components);
            minimap.render(components, rays);
        },
        
        showMeasurement: () => {
            measurementPanel.show();
            calculatorPanel.hide();
        },
        
        showCalculator: () => {
            calculatorPanel.show();
            measurementPanel.hide();
        },
        
        toggleNavigation: () => {
            navigationPanel.toggle();
        },
        
        destroy: () => {
            minimap.destroy();
            measurementPanel.destroy();
            calculatorPanel.destroy();
            navigationPanel.destroy();
        }
    };
}

/**
 * 使用示例
 */
export function exampleUsage() {
    // 获取容器和画布
    const container = document.getElementById('app');
    const canvas = document.getElementById('canvas');
    
    // 假设已有组件和光线数据
    const components = [
        // ... 组件列表
    ];
    const rays = [
        // ... 光线列表
    ];
    
    // 初始化工具
    const tools = initializeNavigationTools({
        container,
        canvas,
        components,
        rays
    });
    
    // 显示测量面板
    tools.showMeasurement();
    
    // 或显示计算器
    // tools.showCalculator();
    
    // 切换导航面板
    // tools.toggleNavigation();
    
    // 当组件或光线更新时，刷新缩略图
    // tools.update();
}

// 全局导出
if (typeof window !== 'undefined') {
    window.initializeNavigationTools = initializeNavigationTools;
}
