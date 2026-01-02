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
