/**
 * legacy-globals.js - 旧代码兼容层
 * 将模块化的类导出到全局作用域，保持向后兼容
 */

// 核心类
import { Vector } from '../core/Vector.js';
import { Ray } from '../core/Ray.js';
import { GameObject } from '../core/GameObject.js';
import { OpticalComponent } from '../core/OpticalComponent.js';

// 常量
import * as constants from '../core/constants.js';

// 光源
import { 
    LaserSource, FanSource, LineSource, WhiteLightSource 
} from '../components/sources/index.js';

// 反射镜
import { 
    Mirror, SphericalMirror, ParabolicMirror 
} from '../components/mirrors/index.js';

// 透镜
import { ThinLens } from '../components/lenses/index.js';

// 偏振器件
import { 
    Polarizer, BeamSplitter, WavePlate, HalfWavePlate, 
    QuarterWavePlate, FaradayRotator, FaradayIsolator 
} from '../components/polarizers/index.js';

// 探测器
import { Screen, Photodiode } from '../components/detectors/index.js';

// 特殊元件
import { 
    Prism, DiffractionGrating, DielectricBlock, 
    OpticalFiber, AcoustoOpticModulator, Aperture 
} from '../components/special/index.js';

// 辅助元件
import { CustomComponent } from '../components/misc/index.js';

// 渲染器
import { 
    RayRenderer, GridRenderer, ArrowRenderer, 
    PreviewRenderer, GuideRenderer, GUIDE_CONFIG 
} from '../rendering/index.js';

// 模拟模块
import { RayTracer, TRACE_CONFIG, GameLoop, LensImaging } from '../simulation/index.js';

// UI 模块
import { EventHandler, Inspector, PROPERTY_GROUPS, Toolbar, DEFAULT_TOOL_GROUPS } from '../ui/index.js';

// 状态管理
import * as GlobalStateModule from '../state/GlobalState.js';
import * as CameraStateModule from '../state/CameraState.js';
import * as SelectionStateModule from '../state/SelectionState.js';

// 工具函数
import { ColorUtils, MathUtils, Serialization } from '../utils/index.js';

// 管理器
import { 
    HistoryManager, Command, AddComponentCommand, DeleteComponentCommand,
    MoveComponentCommand, RotateComponentCommand, SetPropertyCommand,
    ClearAllCommand, CompositeCommand, SelectCommand, MoveComponentsCommand
} from '../managers/HistoryManager.js';
import { SceneManager } from '../managers/SceneManager.js';

// 应用
import { SimulationApp } from '../app/SimulationApp.js';

// 导出到全局
if (typeof window !== 'undefined') {
    // 核心类
    window.Vector = Vector;
    window.Ray = Ray;
    window.GameObject = GameObject;
    window.OpticalComponent = OpticalComponent;

    // 常量
    Object.assign(window, constants);

    // 光源
    window.LaserSource = LaserSource;
    window.FanSource = FanSource;
    window.LineSource = LineSource;
    window.WhiteLightSource = WhiteLightSource;

    // 反射镜
    window.Mirror = Mirror;
    window.SphericalMirror = SphericalMirror;
    window.ParabolicMirror = ParabolicMirror;

    // 透镜
    window.ThinLens = ThinLens;

    // 偏振器件
    window.Polarizer = Polarizer;
    window.BeamSplitter = BeamSplitter;
    window.WavePlate = WavePlate;
    window.HalfWavePlate = HalfWavePlate;
    window.QuarterWavePlate = QuarterWavePlate;
    window.FaradayRotator = FaradayRotator;
    window.FaradayIsolator = FaradayIsolator;

    // 探测器
    window.Screen = Screen;
    window.Photodiode = Photodiode;

    // 特殊元件
    window.Prism = Prism;
    window.DiffractionGrating = DiffractionGrating;
    window.DielectricBlock = DielectricBlock;
    window.OpticalFiber = OpticalFiber;
    window.AcoustoOpticModulator = AcoustoOpticModulator;
    window.Aperture = Aperture;

    // 辅助元件
    window.CustomComponent = CustomComponent;

    // 渲染器
    window.RayRenderer = RayRenderer;
    window.GridRenderer = GridRenderer;
    window.ArrowRenderer = ArrowRenderer;
    window.PreviewRenderer = PreviewRenderer;
    window.GuideRenderer = GuideRenderer;
    window.GUIDE_CONFIG = GUIDE_CONFIG;

    // 模拟模块
    window.RayTracer = RayTracer;
    window.TRACE_CONFIG = TRACE_CONFIG;
    window.GameLoop = GameLoop;
    window.LensImaging = LensImaging;

    // UI 模块
    window.EventHandler = EventHandler;
    window.Inspector = Inspector;
    window.PROPERTY_GROUPS = PROPERTY_GROUPS;
    window.Toolbar = Toolbar;
    window.DEFAULT_TOOL_GROUPS = DEFAULT_TOOL_GROUPS;

    // 状态管理
    window.GlobalState = GlobalStateModule;
    window.CameraState = CameraStateModule;
    window.SelectionState = SelectionStateModule;

    // 工具函数
    window.ColorUtils = ColorUtils;
    window.MathUtils = MathUtils;
    window.Serialization = Serialization;

    // 管理器
    window.HistoryManager = HistoryManager;
    window.Command = Command;
    window.AddComponentCommand = AddComponentCommand;
    window.DeleteComponentCommand = DeleteComponentCommand;
    window.MoveComponentCommand = MoveComponentCommand;
    window.RotateComponentCommand = RotateComponentCommand;
    window.SetPropertyCommand = SetPropertyCommand;
    window.ClearAllCommand = ClearAllCommand;
    window.CompositeCommand = CompositeCommand;
    window.SelectCommand = SelectCommand;
    window.MoveComponentsCommand = MoveComponentsCommand;
    window.SceneManager = SceneManager;

    // 应用
    window.SimulationApp = SimulationApp;

    console.log("Legacy globals loaded for backward compatibility");
}
