# Contributing to OpticsLab

感谢你对 OpticsLab 的关注！欢迎提交 Issue 和 Pull Request。

## 开发环境

OpticsLab 是纯前端项目（vanilla JS + Canvas API），无需构建步骤。

```bash
# 克隆仓库
git clone https://github.com/<username>/OpticsLab.git
cd OpticsLab

# 启动本地服务器（任选其一）
npx http-server . -p 8080 -o
# 或
python -m http.server 8080
```

在浏览器中打开 `http://localhost:8080` 即可。

## 项目结构

```
OpticsLab/
├── index.html              # 主页面
├── main.js                 # 主逻辑（模拟循环、事件处理、UI）
├── src/
│   ├── core/               # 核心类（Vector, Ray, OpticalComponent）
│   ├── components/         # 光学元件（光源、透镜、反射镜等）
│   ├── simulation/         # 模拟引擎（RayTracer, LensImaging）
│   ├── rendering/          # 渲染器（光线、箭头、网格）
│   ├── diagram/            # 绘图模式（专业图标、模式转换）
│   ├── ui/                 # UI 组件（Inspector, Toolbar）
│   └── compat/             # 兼容层（ES6 模块 → window 全局）
└── desktop/                # Electron 桌面版
```

## 代码风格

- ES6 模块语法（`import`/`export`）
- 中文注释，英文变量名
- 每个光学元件一个文件，继承 `OpticalComponent`
- 新元件必须实现 `intersect()` 和 `interact()` 方法

## 添加新光学元件

1. 在 `src/components/<category>/` 下创建文件
2. 继承 `OpticalComponent`，实现 `intersect()` 和 `interact()`
3. 实现 `draw(ctx)` 绘制方法和 `toJSON()` 序列化
4. 在对应 `index.js` 中导出
5. 在 `src/compat/legacy-globals.js` 中添加全局导出
6. 在 `main.js` 的组件创建 switch 中添加 case

## 提交 Pull Request

1. Fork 仓库并创建功能分支：`git checkout -b feature/my-feature`
2. 确保代码可正常运行（打开浏览器手动测试）
3. 提交时使用清晰的 commit message
4. 创建 PR 并描述改动内容

## 报告 Bug

请在 Issue 中包含：
- 浏览器版本
- 复现步骤
- 预期行为 vs 实际行为
- 截图（如适用）

## 许可

提交代码即表示你同意将代码以 MIT 许可证发布。
