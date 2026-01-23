# 故障排除指南

## 常见错误及解决方案

### 1. "等待模块加载超时" 错误

**症状：**
```
等待模块加载超时！
错误：一个或多个核心类 (Vector, GameObject, Ray, OpticalComponent, HistoryManager) 未定义！
```

**可能原因：**
- 模块文件加载失败
- 网络问题导致文件加载缓慢
- 浏览器缓存问题

**解决方案：**

1. **硬刷新页面**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签页
   - 查找红色错误信息，特别是 404 或模块加载错误

3. **运行诊断脚本**
   - 在浏览器控制台中粘贴并运行 `diagnose-loading.js` 的内容
   - 或者打开 `test-module-loading.html` 查看详细状态

4. **检查文件完整性**
   ```bash
   # 确认关键文件存在
   dir src\compat\legacy-globals.js
   dir src\core\Vector.js
   dir src\core\GameObject.js
   ```

5. **清除浏览器缓存**
   - Chrome: 设置 → 隐私和安全 → 清除浏览数据
   - 选择"缓存的图片和文件"
   - 点击"清除数据"

### 2. "Failed to load resource: 404" 错误

**症状：**
```
IntegrationExample.js:1 Failed to load resource: the server responded with a status of 404
```

**解决方案：**
✅ 已修复！这些文件的导出已从 `src/diagram/index.js` 中移除。

### 3. "Duplicate export of 'SelectionManager'" 错误

**症状：**
```
Uncaught SyntaxError: Duplicate export of 'SelectionManager'
```

**解决方案：**
✅ 已修复！重复的导出已重命名为：
- `DiagramSelectionManagerCore`
- `DiagramSelectionManager`
- `DiagramHistoryManager`
- `DiagramClipboardManager`

### 4. 鼠标拖影问题

**症状：**
鼠标移动时出现拖影效果

**解决方案：**
✅ 已修复！`interactionEnhancer.js` 中的鼠标移动监听已禁用。

### 5. installHook.js 错误

**症状：**
```
installHook.js:1 等待模块加载超时！
installHook.js:1 错误：一个或多个核心类未定义！
```

**解决方案：**
⚠️ 这是**浏览器扩展**引起的错误，不是项目代码问题。可以安全忽略。

如果想彻底解决：
1. 打开浏览器扩展管理页面
2. 逐个禁用扩展，找出导致问题的扩展
3. 或者使用无痕模式测试（扩展默认不会在无痕模式运行）

## 调试工具

### 1. 测试页面
打开 `test-module-loading.html` 查看模块加载状态

### 2. 诊断脚本
在浏览器控制台运行：
```javascript
// 复制 diagnose-loading.js 的内容到控制台
```

### 3. 手动检查
在浏览器控制台运行：
```javascript
// 检查核心类
console.log('Vector:', typeof Vector);
console.log('GameObject:', typeof GameObject);
console.log('Ray:', typeof Ray);
console.log('OpticalComponent:', typeof OpticalComponent);
console.log('HistoryManager:', typeof HistoryManager);

// 检查加载标志
console.log('Legacy globals loaded:', window.__LEGACY_GLOBALS_LOADED__);
```

## 开发服务器要求

确保使用支持 ES6 模块的 HTTP 服务器：

### 推荐方案：

1. **Python 3**
   ```bash
   python -m http.server 8000
   ```

2. **Node.js (http-server)**
   ```bash
   npx http-server -p 8000
   ```

3. **VS Code Live Server 扩展**
   - 安装 "Live Server" 扩展
   - 右键点击 index.html
   - 选择 "Open with Live Server"

⚠️ **不要直接用 file:// 协议打开 index.html**，这会导致 CORS 错误和模块加载失败。

## 联系支持

如果以上方法都无法解决问题：

1. 记录完整的错误信息（截图或复制文本）
2. 记录浏览器版本和操作系统
3. 运行诊断脚本并保存输出
4. 提交 Issue 并附上以上信息
