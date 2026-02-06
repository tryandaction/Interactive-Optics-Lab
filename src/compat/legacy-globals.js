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
    LaserSource, FanSource, LineSource, WhiteLightSource,
    PointSource, LEDSource, PulsedLaserSource
} from '../components/sources/index.js';

// 反射镜
import { 
    Mirror, SphericalMirror, ParabolicMirror,
    DichroicMirror, MetallicMirror, RingMirror
} from '../components/mirrors/index.js';

// 透镜
import { 
    ThinLens, CylindricalLens, AsphericLens, GRINLens 
} from '../components/lenses/index.js';

// 偏振器件
import { 
    Polarizer, BeamSplitter, WavePlate, HalfWavePlate, 
    QuarterWavePlate, FaradayRotator, FaradayIsolator, WollastonPrism
} from '../components/polarizers/index.js';

// 探测器
import { 
    Screen, Photodiode, CCDCamera, Spectrometer, PowerMeter, PolarizationAnalyzer 
} from '../components/detectors/index.js';

// 特殊元件
import { 
    Prism, DiffractionGrating, DielectricBlock, 
    OpticalFiber, AcoustoOpticModulator, Aperture 
} from '../components/special/index.js';

// 辅助元件
import { CustomComponent } from '../components/misc/index.js';

// 调制器
import { 
    ElectroOpticModulator, VariableAttenuator, OpticalChopper 
} from '../components/modulators/index.js';

// 原子物理
import { AtomicCell, MagneticCoil } from '../components/atomic/index.js';

// 干涉仪
import { FabryPerotCavity } from '../components/interferometers/index.js';

// 渲染器
import { 
    RayRenderer, GridRenderer, ArrowRenderer, 
    PreviewRenderer, GuideRenderer, GUIDE_CONFIG 
} from '../rendering/index.js';

// 模拟模块
import { RayTracer, TRACE_CONFIG, GameLoop, LensImaging } from '../simulation/index.js';

// UI 模块
import { 
    EventHandler, Inspector, PROPERTY_GROUPS, Toolbar, DEFAULT_TOOL_GROUPS,
    ProjectTreeRenderer, UnifiedProjectPanel 
} from '../ui/index.js';

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
    AddLabelCommand, DeleteLabelCommand, MoveLabelCommand,
    ClearAllCommand, CompositeCommand, SelectCommand, MoveComponentsCommand
} from '../managers/HistoryManager.js';
import { SceneManager } from '../managers/SceneManager.js';
import { Serializer } from '../managers/Serializer.js';
import { FileSystemAdapter } from '../managers/FileSystemAdapter.js';
import { LocalStorageAdapter } from '../managers/LocalStorageAdapter.js';
import { ProjectManager } from '../managers/ProjectManager.js';
import { ActiveSceneManager } from '../managers/ActiveSceneManager.js';
import { SyncService } from '../managers/SyncService.js';

// 应用
import { SimulationApp } from '../app/SimulationApp.js';

// 专业绘图模式
import { 
    ModeManager, APP_MODES, getModeManager, resetModeManager,
    ModeSwitcher, createModeSwitcher,
    DiagramModeIntegration, getDiagramModeIntegration, initializeDiagramMode, resetDiagramModeIntegration,
    openExportDialog, getExportDialog
} from '../diagram/index.js';

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
    window.PointSource = PointSource;
    window.LEDSource = LEDSource;
    window.PulsedLaserSource = PulsedLaserSource;

    // 反射镜
    window.Mirror = Mirror;
    window.SphericalMirror = SphericalMirror;
    window.ParabolicMirror = ParabolicMirror;
    window.DichroicMirror = DichroicMirror;
    window.MetallicMirror = MetallicMirror;
    window.RingMirror = RingMirror;

    // 透镜
    window.ThinLens = ThinLens;
    window.CylindricalLens = CylindricalLens;
    window.AsphericLens = AsphericLens;
    window.GRINLens = GRINLens;

    // 偏振器件
    window.Polarizer = Polarizer;
    window.BeamSplitter = BeamSplitter;
    window.WavePlate = WavePlate;
    window.HalfWavePlate = HalfWavePlate;
    window.QuarterWavePlate = QuarterWavePlate;
    window.FaradayRotator = FaradayRotator;
    window.FaradayIsolator = FaradayIsolator;
    window.WollastonPrism = WollastonPrism;

    // 探测器
    window.Screen = Screen;
    window.Photodiode = Photodiode;
    window.CCDCamera = CCDCamera;
    window.Spectrometer = Spectrometer;
    window.PowerMeter = PowerMeter;
    window.PolarizationAnalyzer = PolarizationAnalyzer;

    // 特殊元件
    window.Prism = Prism;
    window.DiffractionGrating = DiffractionGrating;
    window.DielectricBlock = DielectricBlock;
    window.OpticalFiber = OpticalFiber;
    window.AcoustoOpticModulator = AcoustoOpticModulator;
    window.Aperture = Aperture;

    // 辅助元件
    window.CustomComponent = CustomComponent;

    // 调制器
    window.ElectroOpticModulator = ElectroOpticModulator;
    window.VariableAttenuator = VariableAttenuator;
    window.OpticalChopper = OpticalChopper;

    // 原子物理
    window.AtomicCell = AtomicCell;
    window.MagneticCoil = MagneticCoil;

    // 干涉仪
    window.FabryPerotCavity = FabryPerotCavity;

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
    window.ProjectTreeRenderer = ProjectTreeRenderer;
    window.UnifiedProjectPanel = UnifiedProjectPanel;

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
    window.AddLabelCommand = AddLabelCommand;
    window.DeleteLabelCommand = DeleteLabelCommand;
    window.MoveLabelCommand = MoveLabelCommand;
    window.ClearAllCommand = ClearAllCommand;
    window.CompositeCommand = CompositeCommand;
    window.SelectCommand = SelectCommand;
    window.MoveComponentsCommand = MoveComponentsCommand;
    window.SceneManager = SceneManager;
    window.Serializer = Serializer;
    window.FileSystemAdapter = FileSystemAdapter;
    window.LocalStorageAdapter = LocalStorageAdapter;
    window.ProjectManager = ProjectManager;
    window.ActiveSceneManager = ActiveSceneManager;
    window.SyncService = SyncService;

    // 应用
    window.SimulationApp = SimulationApp;

    // 专业绘图模式
    window.ModeManager = ModeManager;
    window.APP_MODES = APP_MODES;
    window.getModeManager = getModeManager;
    window.resetModeManager = resetModeManager;
    window.ModeSwitcher = ModeSwitcher;
    window.createModeSwitcher = createModeSwitcher;
    window.DiagramModeIntegration = DiagramModeIntegration;
    window.getDiagramModeIntegration = getDiagramModeIntegration;
    window.initializeDiagramMode = initializeDiagramMode;
    window.resetDiagramModeIntegration = resetDiagramModeIntegration;
    window.openExportDialog = openExportDialog;
    window.getExportDialog = getExportDialog;

    // 设置加载完成标志
    window.__LEGACY_GLOBALS_LOADED__ = true;

    console.log("Legacy globals loaded for backward compatibility");
}
