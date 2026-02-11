# 桌面版打包指南

本指南说明如何将 OpticsLab 打包为桌面应用，并启用本地文件系统持久化能力。

## 1. 方案概览
- 使用 Electron 作为桌面容器（无需改动现有前端架构）。
- `src/managers/FileSystemAdapter.js` 已支持桌面桥接：
  - 桌面环境下使用 `window.opticsDesktop.fs` 进行文件/目录操作。
  - 浏览器环境仍使用 File System Access API。
  - 两者都不可用时，退回到 localStorage。

## 2. 目录结构
- `desktop/electron/main.js`：主进程入口。
- `desktop/electron/preload.js`：安全桥接层，暴露受控文件 API。
- `desktop/electron/package.json`：运行与打包脚本。

## 3. 本地运行
```bash
cd desktop/electron
npm install
npm run start
```

## 4. 打包发布（Windows）
```bash
npm run dist
```

输出位置：`desktop/electron/dist`。

## 4.1 一键打包脚本（Windows）
- PowerShell: `desktop/electron/build.ps1`
- CMD: `desktop/electron/build.cmd`

运行后会自动安装依赖并生成安装包。

## 5. 数据持久化策略
- 优先使用本地目录（File System Access API 或 Electron 桥接）。
- 未授权或不支持时使用 localStorage（容量有限，建议导出备份）。

## 6. 注意事项
- 首次运行建议创建项目并选择本地目录作为项目根。
- Electron 版本与打包工具可按需升级，但需验证兼容性。
- 生产发布前建议配置应用图标、自动更新与日志收集。
