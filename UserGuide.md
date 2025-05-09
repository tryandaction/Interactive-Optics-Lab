            ## 交互式光学实验室 - 用户指南 (v1.1)

            ### 1. 概述
            欢迎使用交互式光学实验室！这是一个基于 Web 的强大而直观的仿真工具，旨在帮助您探索奇妙的光学世界。通过直接交互，您可以搭建虚拟光学系统、可视化光线传播，并理解基本的光学原理。本模拟器适合学生、教育工作者、光学爱好者以及任何对光学感兴趣的人士。

            ### 2. 界面布局
            模拟器界面主要分为三个区域和一个顶部菜单栏：

            * **顶部菜单栏:** 包含文件操作（新建、导入、导出、场景管理）、编辑（撤销/重做、删除）、视图（重置、网格）、模拟（模式切换、设置、动画控制）、帮助以及用户登录/状态。
            * **左侧工具栏:** 陈列所有可用的光学元件，按类别分组，点击即可选择用于添加到画布。
            * **中间模拟区域 (画布):** 主要的工作区域，您可以在此放置、移动、旋转光学元件，并观察光线的实时传播。
            * **右侧检查器面板:** 包含多个标签页：
                * **属性:** 当选中一个元件时，显示并允许编辑该元件的特定参数。
                * **设置:** 提供全局模拟参数和显示选项的调整（如网格、光线数量、反射次数等）。
                * **场景:** 管理保存在浏览器本地存储中的场景（加载、另存为、删除）。
                * **信息:** 显示关于模拟器的基本信息。

            ### 3. 主要特性

            * **直观交互:**
                * 添加元件: 点击左侧工具栏按钮，然后在画布上单击放置。
                * 选择元件: 直接在画布上单击元件 (Shift/Ctrl+单击可多选)。
                * 移动元件: 拖动选中元件的主体 (可多选拖动)。
                * 旋转元件: 拖动选中元件的角度控制柄，或选中元件并将鼠标悬停其上滚动滚轮 (Shift+滚轮微调)。
                * 撤销/重做: 使用顶部按钮或 Ctrl+Z/Ctrl+Y 撤销/重做大部分操作。

            * **丰富元件库:** 包含光源、透镜、反射镜、棱镜、光栅、偏振元件、分束器、探测器等多种元件 (详见第 5 节)。
            * **实时光线追踪:** 基于物理定律精确可视化光线路径。
            * **元件属性调整:** 选中元件后，在右侧"属性"标签页中实时修改参数。

            * **灵活视图控制:**
                * 缩放: 在画布空白区域滚动鼠标滚轮或双指捏合。
                * 平移: 按住鼠标中键拖动画布或双指拖动。
                * 重置视图: 通过顶部"视图"菜单操作。

            * **多模拟模式:**
                * 光线追踪: 默认模式，模拟光线传播与物理效应。
                * 透镜成像: 辅助模式，绘制理想薄透镜成像主光路图 (详见第 6 节)。

            * **物理效应模拟:** 波长相关颜色、偏振、色散、衍射基础、干涉基础、高斯光束初步模拟。

            * **场景管理:**
                * 本地保存/加载: 通过右侧"场景"标签页或顶部"文件"菜单管理保存在浏览器中的多个场景。
                * 文件导入/导出: 通过顶部"文件"菜单或图标按钮导入/导出 `.json` 场景文件。

            * **全局设置:** 通过右侧"设置"标签页或顶部"模拟"菜单调整显示和性能参数。
            * **动画控制:** 通过顶部"模拟"菜单切换光路箭头的显示和速度。

            ### 4. 快速入门

            * **开始:** 页面加载后画布为空。
            * **添加元件:** 点击左侧工具栏图标按钮 (如"点光源")，鼠标移到画布上会看到预览，单击放置。
            * **观察:** 光线会自动从光源发出并与元件交互。
            * **选中与调整:** 单击画布上的元件，右侧面板自动切换到"属性"标签页。在此修改参数（如光源波长、透镜焦距），观察模拟结果变化。
            * **移动与旋转:** 拖动元件移动，使用角度控制柄或鼠标滚轮（悬停在选中的元件上）旋转。
            * **视图操作:** 滚动滚轮/双指捏合缩放，按住中键/双指拖动平移。通过"视图"菜单重置。
            * **保存场景(浏览器):** 打开右侧"场景"标签页，点击"另存到浏览器存储..."按钮，输入名称保存。
            * **加载场景(浏览器):** 在"场景"标签页点击已保存的场景名称。
            * **导出/导入文件:** 使用顶部文件菜单或快捷图标进行 `.json` 文件操作。
            * **删除元件:** 选中元件后按 `Delete` 或 `Backspace` 键，或通过"编辑"菜单操作。
            * **撤销/重做:** 使用顶部撤销/重做图标按钮或 Ctrl+Z / Ctrl+Y。

            ### 5. 可用元件一览 (部分)

            * **光源:** 点光源(激光), 扇形光源, 线光源, 白光光源(模拟光谱, 可选高斯)
            * **透镜:** 薄透镜 (f>0 凸, f<0 凹)
            * **反射镜:** 平面镜, 球面镜 (凹/凸), 抛物面镜 (凹)
            * **折射/色散:** 棱镜, 介质块
            * **衍射:** 衍射光栅, 光阑/多缝 (Aperture), 声光调制器 (AOM)
            * **偏振:** 偏振片 (线偏振), 半波片 (λ/2), 四分之一波片 (λ/4)
            * **光束控制:** 分束器 (标准/偏振), 光纤
            * **探测:** 屏幕 (显示相干光强分布), 光度计 (测量总光强)

            ### 6. 模拟模式详解

            * **光线追踪 (Ray Tracing):** (菜单: 模拟 -> 模式: 光线追踪) 默认模式。模拟大量独立光线的行为，考虑相位进行相干叠加（在屏幕上）。适合观察反射、折射、TIR、色散、衍射级次、偏振效果和干涉图样。
            * **透镜成像 (Lens Imaging):** (菜单: 模拟 -> 模式: 透镜成像) 仅当场景中**恰好包含一个受支持的光源和一个薄透镜**时可用。绘制理想薄透镜成像的三条主光线、物和像，并在画布左上角显示 u, v, M, hₒ, hᵢ 及像的性质。不进行复杂的光线追踪。

            ### 7. 全局设置与选项 (右侧"设置"标签页)

            * **显示网格:** 控制画布背景网格的可见性。
            * **显示箭头:** 控制光路动画箭头的全局开关。
            * **仅选中箭头:** 仅显示当前选中光源的动画箭头。
            * **箭头速度:** 调整动画箭头的速度。
            * **每源最大光线数:** 限制 Fan/Line/WhiteLight 光源生成的光线数量上限（影响性能和视觉密度）。
            * **最大反/折射次数:** 光线追踪的最大弹射次数上限（影响性能和复杂光路显示）。
            * **最低强度阈值:** 光线强度低于此值时停止追踪（影响性能和暗光线显示）。
            * **快速白光模拟:** 切换白光光源的光线生成方式（精确混合 vs. 随机采样，后者性能更好）。
            * **启用网格吸附:** 拖动元件时是否自动吸附到网格点。

            ### 8. 场景管理 (右侧"场景"标签页 / 顶部"文件"菜单)

            * **本地场景列表:** 显示、加载、删除保存在当前浏览器中的场景。
            * **另存到浏览器存储:** 将当前画布布局命名并保存到本地浏览器存储。
            * **导入文件:** 从本地选择 `.json` 文件加载场景（会覆盖当前场景，加载前会提示）。
            * **导出文件:** 将当前画布布局下载为 `.json` 文件。

            ### 9. 使用建议

            * **由简入繁:** 从简单设置开始，理解元件行为，再组合。
            * **善用视图:** 缩放和平移对于观察细节和管理复杂布局至关重要。
            * **关注属性:** 通过右侧"属性"标签精确控制元件参数。
            * **利用设置:** 根据需要调整"设置"标签页中的参数以平衡效果和性能。
            * **保存场景:** 经常使用"场景"标签页或文件菜单保存你的工作。
            * **利用撤销/重做:** 不怕操作失误，随时可以通过撤销返回上一步。
            * **查看信息:** "信息"标签页和"帮助"菜单提供版本和基本指南。

            ### 10. 未来展望
            交互式光学实验室将持续开发，未来可能加入：更精确的物理模型（高斯光束传输、衍射细节、像差）、更多元件、多选与成组、单位系统、用户系统与云同步、协作、更丰富的可视化选项等。
