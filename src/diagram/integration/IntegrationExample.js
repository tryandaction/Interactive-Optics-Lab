/**
 * IntegrationExample.js - 模拟与绘图模式集成示例
 * Demonstrates simulation-diagram mode integration
 */

import { getModeIntegrationManager, Mode } from './index.js';

/**
 * 创建示例模拟场景
 */
export function createExampleSimulationScene() {
    return {
        name: 'Michelson Interferometer Simulation',
        components: [
            {
                id: 'laser1',
                type: 'LaserSource',
                pos: { x: 100, y: 300 },
                angle: 0,
                wavelength: 632.8,
                power: 5.0,
                beamWidth: 2.0,
                divergence: 0.001
            },
            {
                id: 'bs1',
                type: 'BeamSplitter',
                pos: { x: 300, y: 300 },
                angle: Math.PI / 4,
                splitRatio: 0.5,
                transmittance: 0.95
            },
            {
                id: 'mirror1',
                type: 'Mirror',
                pos: { x: 300, y: 150 },
                angle: Math.PI / 2,
                reflectivity: 0.99
            },
            {
                id: 'mirror2',
                type: 'Mirror',
                pos: { x: 450, y: 300 },
                angle: Math.PI,
                reflectivity: 0.99
            },
            {
                id: 'screen1',
                type: 'Screen',
                pos: { x: 300, y: 450 },
                angle: Math.PI / 2,
                width: 100,
                height: 100,
                sensitivity: 1.0
            }
        ],
        rays: [
            {
                id: 'ray1',
                pathPoints: [
                    { x: 100, y: 300 },
                    { x: 300, y: 300 },
                    { x: 300, y: 150 },
                    { x: 300, y: 300 },
                    { x: 300, y: 450 }
                ],
                wavelength: 632.8,
                intensity: 0.5,
                polarization: { angle: 0, type: 'linear' }
            },
            {
                id: 'ray2',
                pathPoints: [
                    { x: 300, y: 300 },
                    { x: 450, y: 300 },
                    { x: 300, y: 300 },
                    { x: 300, y: 450 }
                ],
                wavelength: 632.8,
                intensity: 0.5,
                polarization: { angle: 0, type: 'linear' }
            }
        ]
    };
}

/**
 * 创建示例绘图场景
 */
export function createExampleDiagramScene() {
    return {
        name: 'Laser Cooling Setup',
        components: [
            {
                id: 'laser1',
                type: 'LaserSource',
                pos: { x: 100, y: 200 },
                angle: 0,
                wavelength: 780.0,
                power: 100.0
            },
            {
                id: 'aom1',
                type: 'AcoustoOpticModulator',
                pos: { x: 250, y: 200 },
                angle: 0,
                frequency: 80e6,
                efficiency: 0.8
            },
            {
                id: 'lens1',
                type: 'ThinLens',
                pos: { x: 400, y: 200 },
                angle: 0,
                focalLength: 100,
                diameter: 25.4
            },
            {
                id: 'cell1',
                type: 'AtomicCell',
                pos: { x: 550, y: 200 },
                angle: 0,
                element: 'Rb87',
                temperature: 293,
                length: 75
            },
            {
                id: 'pd1',
                type: 'Photodiode',
                pos: { x: 700, y: 200 },
                angle: 0,
                width: 10,
                height: 10,
                sensitivity: 0.5
            }
        ],
        rays: [
            {
                id: 'ray1',
                pathPoints: [
                    { x: 100, y: 200 },
                    { x: 250, y: 200 },
                    { x: 400, y: 200 },
                    { x: 550, y: 200 },
                    { x: 700, y: 200 }
                ],
                wavelength: 780.0,
                intensity: 1.0
            }
        ],
        annotations: [
            {
                componentId: 'laser1',
                text: 'λ = 780 nm',
                type: 'label'
            },
            {
                componentId: 'aom1',
                text: 'f = 80 MHz',
                type: 'label'
            },
            {
                componentId: 'lens1',
                text: 'f = 100 mm',
                type: 'label'
            }
        ]
    };
}

/**
 * 演示模式切换
 */
export function demonstrateModeSwitch() {
    console.log('=== Simulation-Diagram Mode Integration Demo ===\n');
    
    const modeManager = getModeIntegrationManager();
    
    // 1. 从模拟模式开始
    console.log('1. Starting in SIMULATION mode');
    const simScene = createExampleSimulationScene();
    modeManager.setScene(simScene, Mode.SIMULATION);
    console.log(`   Scene: ${simScene.name}`);
    console.log(`   Components: ${simScene.components.length}`);
    console.log(`   Rays: ${simScene.rays.length}\n`);
    
    // 2. 切换到绘图模式
    console.log('2. Switching to DIAGRAM mode...');
    const toDiagramResult = modeManager.switchToDiagram({
        simplify: true,
        beautify: true,
        snapToGrid: true,
        gridSize: 20,
        preserveRays: true
    });
    
    if (toDiagramResult.success) {
        console.log('   ✓ Conversion successful!');
        const diagramScene = toDiagramResult.scene;
        console.log(`   Components: ${diagramScene.components.length}`);
        console.log(`   Rays: ${diagramScene.rays.length}`);
        console.log(`   Annotations: ${diagramScene.annotations.length} (auto-generated)`);
        console.log(`   Warnings: ${toDiagramResult.conversionResult.warnings.length}\n`);
    } else {
        console.log('   ✗ Conversion failed!');
        console.log(`   Error: ${toDiagramResult.error}\n`);
        return;
    }
    
    // 3. 切换回模拟模式
    console.log('3. Switching back to SIMULATION mode...');
    const toSimResult = modeManager.switchToSimulation();
    
    if (toSimResult.success) {
        console.log('   ✓ Conversion successful!');
        const simScene2 = toSimResult.scene;
        console.log(`   Components: ${simScene2.components.length}`);
        console.log(`   Rays: ${simScene2.rays.length}`);
        console.log(`   Warnings: ${toSimResult.conversionResult.warnings.length}\n`);
    } else {
        console.log('   ✗ Conversion failed!');
        console.log(`   Error: ${toSimResult.error}\n`);
    }
    
    // 4. 查看转换历史
    console.log('4. Conversion History:');
    const history = modeManager.getConversionHistory();
    history.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.from} → ${entry.to}`);
        console.log(`      Errors: ${entry.errors.length}, Warnings: ${entry.warnings.length}`);
    });
    console.log();
    
    // 5. 预览转换
    console.log('5. Preview conversion (without switching):');
    const diagramScene2 = createExampleDiagramScene();
    const preview = modeManager.previewConversion(diagramScene2, Mode.SIMULATION);
    
    if (preview.success) {
        console.log('   ✓ Preview successful!');
        console.log(`   Would create ${preview.scene.components.length} simulation components`);
        console.log(`   Warnings: ${preview.warnings.length}\n`);
    } else {
        console.log('   ✗ Preview failed!');
        console.log(`   Errors: ${preview.errors.length}\n`);
    }
    
    console.log('=== Demo Complete ===');
}

/**
 * 演示带监听器的模式切换
 */
export function demonstrateWithListeners() {
    console.log('=== Mode Switch with Event Listeners ===\n');
    
    const modeManager = getModeIntegrationManager();
    
    // 添加监听器
    const unsubscribe = modeManager.addListener((event) => {
        if (event.type === 'mode-changed') {
            console.log(`📢 Event: Mode changed from ${event.oldMode} to ${event.newMode}`);
            console.log(`   Scene has ${event.scene.components.length} components`);
            
            if (event.conversionResult.warnings.length > 0) {
                console.log(`   ⚠️  ${event.conversionResult.warnings.length} warnings`);
            }
            console.log();
        }
    });
    
    // 执行切换
    const simScene = createExampleSimulationScene();
    modeManager.setScene(simScene, Mode.SIMULATION);
    
    console.log('Switching modes...\n');
    modeManager.switchToDiagram();
    modeManager.switchToSimulation();
    modeManager.toggleMode();  // Back to diagram
    
    // 清理
    unsubscribe();
    
    console.log('=== Demo Complete ===');
}

/**
 * 演示错误处理
 */
export function demonstrateErrorHandling() {
    console.log('=== Error Handling Demo ===\n');
    
    const modeManager = getModeIntegrationManager();
    
    // 创建一个有问题的场景
    const badScene = {
        name: 'Invalid Scene',
        components: [
            {
                id: 'comp1',
                type: 'UnknownType',  // 未知类型
                pos: { x: 100, y: 200 }
            },
            {
                // 缺少ID
                type: 'LaserSource',
                pos: { x: 200, y: 200 }
            }
        ]
    };
    
    modeManager.setScene(badScene, Mode.DIAGRAM);
    
    console.log('Attempting to convert invalid scene...');
    const result = modeManager.switchToSimulation();
    
    if (!result.success) {
        console.log('✓ Errors caught correctly!');
        console.log(`  Error: ${result.error}`);
        console.log(`  Mode remains: ${modeManager.getCurrentMode()}\n`);
    }
    
    // 预览也应该显示错误
    console.log('Preview conversion of invalid scene...');
    const preview = modeManager.previewConversion(badScene, Mode.SIMULATION);
    
    if (!preview.success) {
        console.log('✓ Preview shows errors:');
        preview.errors.forEach((err, i) => {
            console.log(`  ${i + 1}. ${err.message}`);
        });
    }
    
    console.log('\n=== Demo Complete ===');
}

// 运行演示
if (typeof window !== 'undefined') {
    window.demonstrateModeSwitch = demonstrateModeSwitch;
    window.demonstrateWithListeners = demonstrateWithListeners;
    window.demonstrateErrorHandling = demonstrateErrorHandling;
    window.createExampleSimulationScene = createExampleSimulationScene;
    window.createExampleDiagramScene = createExampleDiagramScene;
}

// 如果直接运行
if (typeof require !== 'undefined' && require.main === module) {
    demonstrateModeSwitch();
    console.log('\n');
    demonstrateWithListeners();
    console.log('\n');
    demonstrateErrorHandling();
}
