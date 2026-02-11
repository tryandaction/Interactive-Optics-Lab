# OpticsLab Desktop (Electron)

## 运行
1. 进入目录
   - `cd desktop/electron`
2. 安装依赖
   - `npm install`
3. 启动
   - `npm run start`

## 打包
- 开发目录打包（不生成安装包）
  - `npm run pack`
- 生成安装包（Windows NSIS）
  - `npm run dist`

## 说明
- 前端资源直接加载根目录的 `index.html`。
- 本地文件访问通过 `preload.js` 暴露的 `window.opticsDesktop` 提供。
- 依赖未安装前无法运行，请先执行 `npm install`。
