// 诊断脚本 - 在浏览器控制台中运行此脚本来诊断加载问题

console.log('=== 模块加载诊断 ===');

// 1. 检查核心类
const coreClasses = ['Vector', 'GameObject', 'Ray', 'OpticalComponent', 'HistoryManager'];
console.log('\n1. 核心类检查:');
coreClasses.forEach(className => {
    const exists = typeof window[className] !== 'undefined';
    console.log(`  ${exists ? '✓' : '✗'} ${className}: ${exists ? '已定义' : '未定义'}`);
});

// 2. 检查加载标志
console.log('\n2. 加载标志:');
console.log(`  __LEGACY_GLOBALS_LOADED__: ${window.__LEGACY_GLOBALS_LOADED__ || '未设置'}`);

// 3. 检查所有已加载的全局对象
console.log('\n3. 已加载的光学组件类:');
const componentClasses = [
    'LaserSource', 'Mirror', 'ThinLens', 'Polarizer', 'Screen',
    'Prism', 'BeamSplitter', 'DiffractionGrating'
];
componentClasses.forEach(className => {
    const exists = typeof window[className] !== 'undefined';
    console.log(`  ${exists ? '✓' : '✗'} ${className}`);
});

// 4. 检查管理器
console.log('\n4. 管理器类:');
const managers = ['SceneManager', 'ProjectManager', 'ActiveSceneManager'];
managers.forEach(className => {
    const exists = typeof window[className] !== 'undefined';
    console.log(`  ${exists ? '✓' : '✗'} ${className}`);
});

// 5. 检查模块脚本标签
console.log('\n5. 模块脚本标签:');
const moduleScripts = document.querySelectorAll('script[type="module"]');
console.log(`  找到 ${moduleScripts.length} 个模块脚本`);
moduleScripts.forEach((script, i) => {
    console.log(`  [${i}] ${script.src || '(inline)'}`);
});

// 6. 检查是否有加载错误
console.log('\n6. 建议:');
if (typeof Vector === 'undefined') {
    console.log('  ⚠ Vector 未定义 - legacy-globals.js 可能未正确加载');
    console.log('  → 检查浏览器控制台是否有模块加载错误');
    console.log('  → 确认 src/compat/legacy-globals.js 文件存在');
    console.log('  → 尝试硬刷新页面 (Ctrl+Shift+R)');
} else {
    console.log('  ✓ 核心模块加载正常');
}

console.log('\n=== 诊断完成 ===');
