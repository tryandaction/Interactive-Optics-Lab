/**
 * managers/index.js - 管理器模块导出
 */

export { 
    HistoryManager, 
    Command,
    AddComponentCommand,
    DeleteComponentCommand,
    MoveComponentCommand,
    RotateComponentCommand,
    SetPropertyCommand,
    ClearAllCommand,
    CompositeCommand,
    SelectCommand,
    MoveComponentsCommand
} from './HistoryManager.js';

export { SceneManager } from './SceneManager.js';

export { Serializer } from './Serializer.js';

export { FileSystemAdapter } from './FileSystemAdapter.js';

export { LocalStorageAdapter } from './LocalStorageAdapter.js';

export { ProjectManager } from './ProjectManager.js';

export { ActiveSceneManager } from './ActiveSceneManager.js';

export { SyncService } from './SyncService.js';

// 新增管理器
export { EventEmitter } from './EventEmitter.js';

export { TemporarySceneManager } from './TemporarySceneManager.js';

export { FileOperationManager } from './FileOperationManager.js';

export { SelectionManager } from './SelectionManager.js';

export { ClipboardManager } from './ClipboardManager.js';

export { DialogManager } from './DialogManager.js';

export { ContextMenuManager } from './ContextMenuManager.js';

export { AutoRecoveryManager } from './AutoRecoveryManager.js';

export { ProjectSystemIntegration } from './ProjectSystemIntegration.js';

// 类型和工具函数
export {
    ProjectErrorCode,
    ProjectError,
    generateId,
    validateFileName,
    generateUniqueFileName,
    getCurrentTimestamp
} from './types.js';
