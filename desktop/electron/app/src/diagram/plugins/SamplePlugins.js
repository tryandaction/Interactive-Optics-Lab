/**
 * SamplePlugins.js - 绘图工具栏插件示例
 * 提供最小可用示例，方便开发者快速上手插件系统
 */

/**
 * 注册示例插件（需在绘图模式初始化后调用）
 */
export function registerSampleDiagramPlugins() {
    if (typeof window === 'undefined' || typeof window.registerDiagramPlugin !== 'function') {
        console.warn('SamplePlugins: registerDiagramPlugin not available');
        return false;
    }

    // 示例1：快速导出
    window.registerDiagramPlugin({
        id: 'sample-quick-export',
        name: '快速导出',
        tooltip: '一键打开导出面板',
        order: 10,
        onClick: () => {
            const integration = window.getDiagramModeIntegration?.();
            integration?.openExportDialog?.();
        }
    });

    // 示例2：标注自动避让
    window.registerDiagramPlugin({
        id: 'sample-label-auto',
        name: '标注避让',
        tooltip: '对全部标注进行自动避让',
        order: 20,
        onClick: () => {
            const integration = window.getDiagramModeIntegration?.();
            const labelManager = integration?.getModule?.('professionalLabelManager');
            if (!labelManager) return;
            const labels = labelManager.getAllLabels?.() || [];
            const components = window.components || [];
            labels.forEach(label => {
                labelManager.autoPositionLabel?.(label, components, labels);
            });
            integration?._triggerRedraw?.();
        }
    });

    return true;
}

// 方便控制台直接调用
if (typeof window !== 'undefined') {
    window.registerSampleDiagramPlugins = registerSampleDiagramPlugins;
}
