/**
 * types.js - 项目和场景管理的类型定义
 * 使用 JSDoc 提供类型注解
 */

// ============ 错误码 ============

/**
 * 项目错误码枚举
 * @readonly
 * @enum {string}
 */
export const ProjectErrorCode = {
    // 权限错误
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    PERMISSION_REVOKED: 'PERMISSION_REVOKED',
    
    // 文件系统错误
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
    FILE_EXISTS: 'FILE_EXISTS',
    INVALID_FILE_NAME: 'INVALID_FILE_NAME',
    
    // 存储错误
    STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
    
    // 数据错误
    INVALID_PROJECT_FORMAT: 'INVALID_PROJECT_FORMAT',
    INVALID_SCENE_FORMAT: 'INVALID_SCENE_FORMAT',
    CORRUPTED_DATA: 'CORRUPTED_DATA',
    VERSION_MISMATCH: 'VERSION_MISMATCH',
    
    // 操作错误
    OPERATION_CANCELLED: 'OPERATION_CANCELLED',
    OPERATION_FAILED: 'OPERATION_FAILED',
    CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION'
};

/**
 * 项目错误类
 */
export class ProjectError extends Error {
    /**
     * @param {string} message - 错误消息
     * @param {string} code - 错误码
     * @param {boolean} [recoverable=true] - 是否可恢复
     */
    constructor(message, code, recoverable = true) {
        super(message);
        this.name = 'ProjectError';
        this.code = code;
        this.recoverable = recoverable;
    }
}

// ============ 事件类型 ============

/**
 * 项目事件类型
 * @typedef {'projectCreated'|'projectOpened'|'projectClosed'|'projectChanged'|'projectRenamed'|'projectDeleted'|'unsavedChangesDetected'} ProjectEvent
 */

/**
 * 场景事件类型
 * @typedef {'sceneCreated'|'sceneLoaded'|'sceneSaved'|'sceneDeleted'|'sceneRenamed'|'sceneModified'|'temporarySceneCreated'|'temporarySceneSaved'} SceneEvent
 */

/**
 * 文件操作事件类型
 * @typedef {'fileMoved'|'fileCopied'|'fileDeleted'|'fileRenamed'|'batchOperationComplete'} FileOperationEvent
 */

// ============ 项目相关类型 ============

/**
 * 存储模式
 * @typedef {'local'|'localStorage'|'github'} StorageMode
 */

/**
 * 项目配置
 * @typedef {Object} ProjectConfig
 * @property {string} name - 项目名称
 * @property {StorageMode} storageMode - 存储模式
 * @property {FileSystemDirectoryHandle} [parentDirectory] - 父目录句柄
 * @property {string} [githubUrl] - GitHub 仓库 URL
 */

/**
 * 项目设置
 * @typedef {Object} ProjectSettings
 * @property {SceneSettings} defaultSceneSettings - 默认场景设置
 * @property {boolean} autoSaveEnabled - 是否启用自动保存
 * @property {number} autoSaveInterval - 自动保存间隔（毫秒）
 */

/**
 * 场景引用
 * @typedef {Object} SceneReference
 * @property {string} id - 场景 ID
 * @property {string} name - 场景名称
 * @property {string} fileName - 文件名
 * @property {boolean} [isModified] - 是否已修改
 */

/**
 * 项目
 * @typedef {Object} Project
 * @property {string} id - 项目 ID
 * @property {string} name - 项目名称
 * @property {StorageMode} storageMode - 存储模式
 * @property {string} [path] - 项目路径
 * @property {string} [githubUrl] - GitHub 仓库 URL
 * @property {string} [syncCommandTemplate] - 同步命令模板
 * @property {SceneReference[]} scenes - 场景列表
 * @property {ProjectSettings} [settings] - 项目设置
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * 最近项目
 * @typedef {Object} RecentProject
 * @property {string} id - 项目 ID
 * @property {string} name - 项目名称
 * @property {string} [path] - 项目路径
 * @property {StorageMode} storageMode - 存储模式
 * @property {string} lastOpened - 最后打开时间
 */

/**
 * 关闭选项
 * @typedef {Object} CloseOptions
 * @property {boolean} [force] - 强制关闭，不提示保存
 * @property {boolean} [saveAll] - 保存所有修改
 * @property {boolean} [discardAll] - 丢弃所有修改
 */

// ============ 场景相关类型 ============

/**
 * 场景设置
 * @typedef {Object} SceneSettings
 * @property {string} mode - 模式 ('ray_trace' | 'wave')
 * @property {number} maxRays - 最大光线数
 * @property {number} maxBounces - 最大反射次数
 * @property {number} minIntensity - 最小强度
 * @property {boolean} showGrid - 是否显示网格
 * @property {boolean} showArrows - 是否显示箭头
 * @property {number} arrowSpeed - 箭头速度
 * @property {boolean} fastWhiteLightMode - 快速白光模式
 */

/**
 * 场景元数据
 * @typedef {Object} SceneMetadata
 * @property {string} name - 场景名称
 * @property {string} [description] - 描述
 * @property {string[]} [tags] - 标签
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * 场景数据
 * @typedef {Object} SceneData
 * @property {string} version - 版本号
 * @property {Object[]} components - 组件数据
 * @property {SceneSettings} settings - 场景设置
 * @property {SceneMetadata} metadata - 元数据
 */

/**
 * 场景
 * @typedef {Object} Scene
 * @property {string} id - 场景 ID
 * @property {string} name - 场景名称
 * @property {string} [fileName] - 文件名（临时场景为 undefined）
 * @property {string} [projectId] - 项目 ID（临时场景为 undefined）
 * @property {boolean} isTemporary - 是否为临时场景
 * @property {boolean} isModified - 是否已修改
 * @property {SceneData} data - 场景数据
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */

/**
 * 临时场景
 * @typedef {Object} TemporaryScene
 * @property {string} id - 场景 ID
 * @property {string} name - 场景名称
 * @property {SceneData} data - 场景数据
 * @property {boolean} isModified - 是否已修改
 * @property {Date} createdAt - 创建时间
 * @property {Date} modifiedAt - 修改时间
 */

/**
 * 临时场景创建选项
 * @typedef {Object} TempSceneOptions
 * @property {string} [name] - 场景名称
 * @property {SceneData} [initialData] - 初始数据
 */

/**
 * 保存目标
 * @typedef {Object} SaveTarget
 * @property {string} [projectId] - 目标项目 ID
 * @property {FileSystemDirectoryHandle} [directory] - 目标目录
 * @property {string} fileName - 文件名
 */

/**
 * 关闭结果
 * @typedef {'saved'|'discarded'|'cancelled'} CloseResult
 */

// ============ 文件操作相关类型 ============

/**
 * 文件引用
 * @typedef {Object} FileReference
 * @property {string} name - 文件名
 * @property {string} path - 文件路径
 * @property {string} [id] - 场景 ID
 * @property {FileSystemFileHandle} [handle] - 文件句柄
 * @property {FileSystemDirectoryHandle} [directoryHandle] - 目录句柄
 */

/**
 * 批量操作结果
 * @typedef {Object} BatchResult
 * @property {FileReference[]} successful - 成功的文件
 * @property {Array<{file: FileReference, error: Error}>} failed - 失败的文件
 */

/**
 * 文件冲突类型
 * @typedef {'name_exists'|'permission_denied'|'invalid_name'} ConflictType
 */

/**
 * 文件冲突
 * @typedef {Object} FileConflict
 * @property {ConflictType} type - 冲突类型
 * @property {FileReference} source - 源文件
 * @property {FileReference} target - 目标文件
 */

/**
 * 冲突解决方式
 * @typedef {'rename'|'replace'|'skip'|'cancel'} ConflictResolution
 */

// ============ 剪贴板相关类型 ============

/**
 * 剪贴板操作类型
 * @typedef {'copy'|'cut'} ClipboardOperation
 */

/**
 * 剪贴板内容
 * @typedef {Object} ClipboardContent
 * @property {FileReference[]} items - 文件列表
 * @property {ClipboardOperation} operation - 操作类型
 * @property {Date} timestamp - 时间戳
 */

// ============ 文件树相关类型 ============

/**
 * 树节点类型
 * @typedef {'project'|'directory'|'scene'} TreeNodeType
 */

/**
 * 树节点
 * @typedef {Object} TreeNode
 * @property {string} id - 节点 ID
 * @property {string} name - 节点名称
 * @property {TreeNodeType} type - 节点类型
 * @property {TreeNode[]} [children] - 子节点
 * @property {boolean} [isExpanded] - 是否展开
 * @property {boolean} [isModified] - 是否已修改
 * @property {boolean} [isActive] - 是否激活
 * @property {boolean} [isTemporary] - 是否为临时场景
 */

// ============ 上下文菜单相关类型 ============

/**
 * 菜单上下文类型
 * @typedef {'project'|'directory'|'scene'|'empty'|'multi-selection'} MenuContextType
 */

/**
 * 菜单上下文
 * @typedef {Object} MenuContext
 * @property {MenuContextType} type - 上下文类型
 * @property {TreeNode} [target] - 目标节点
 * @property {string[]} [selectedItems] - 选中的项目 ID 列表
 */

/**
 * 菜单项
 * @typedef {Object} MenuItem
 * @property {string} id - 菜单项 ID
 * @property {string} label - 显示文本
 * @property {string} [icon] - 图标
 * @property {string} [shortcut] - 快捷键
 * @property {boolean} [disabled] - 是否禁用
 * @property {boolean} [separator] - 是否为分隔符
 * @property {MenuItem[]} [submenu] - 子菜单
 * @property {Function} [action] - 点击动作
 */

// ============ 用户设置相关类型 ============

/**
 * 用户设置
 * @typedef {Object} UserSettings
 * @property {string} [defaultProjectDirectory] - 默认项目目录
 * @property {RecentProject[]} recentProjects - 最近项目列表
 * @property {{enabled: boolean, interval: number}} autoSave - 自动保存设置
 * @property {{showHiddenFiles: boolean, sortBy: string, sortOrder: string}} ui - UI 设置
 */

// ============ 恢复相关类型 ============

/**
 * 恢复数据
 * @typedef {Object} RecoveryData
 * @property {string} sceneId - 场景 ID
 * @property {string} sceneName - 场景名称
 * @property {SceneData} data - 场景数据
 * @property {string} savedAt - 保存时间
 * @property {string} [projectId] - 项目 ID
 */

// ============ 工具函数 ============

/**
 * 生成唯一 ID
 * @param {string} [prefix='id'] - ID 前缀
 * @returns {string} 唯一 ID
 */
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 验证文件名是否有效
 * @param {string} name - 文件名
 * @returns {{valid: boolean, invalidChars: string[]}} 验证结果
 */
export function validateFileName(name) {
    if (!name || !name.trim()) {
        return { valid: false, invalidChars: [], error: '文件名不能为空' };
    }
    
    // Windows 和大多数文件系统不允许的字符
    const invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    const foundInvalid = invalidChars.filter(char => name.includes(char));
    
    // 检查保留名称（Windows）
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    
    const upperName = name.toUpperCase().split('.')[0];
    if (reservedNames.includes(upperName)) {
        return { valid: false, invalidChars: [], error: `"${name}" 是系统保留名称` };
    }
    
    // 检查是否以点或空格结尾
    if (name.endsWith('.') || name.endsWith(' ')) {
        return { valid: false, invalidChars: [], error: '文件名不能以点或空格结尾' };
    }
    
    return {
        valid: foundInvalid.length === 0,
        invalidChars: foundInvalid,
        error: foundInvalid.length > 0 ? `文件名包含无效字符: ${foundInvalid.join(' ')}` : null
    };
}

/**
 * 生成唯一文件名（处理冲突）
 * @param {string} baseName - 基础文件名
 * @param {string[]} existingNames - 已存在的文件名列表
 * @returns {string} 唯一文件名
 */
export function generateUniqueFileName(baseName, existingNames) {
    if (!existingNames.includes(baseName)) {
        return baseName;
    }
    
    // 分离文件名和扩展名
    const lastDotIndex = baseName.lastIndexOf('.');
    let name, ext;
    if (lastDotIndex > 0) {
        name = baseName.substring(0, lastDotIndex);
        ext = baseName.substring(lastDotIndex);
    } else {
        name = baseName;
        ext = '';
    }
    
    // 检查是否已有数字后缀
    const suffixMatch = name.match(/^(.+)_(\d+)$/);
    let baseNameWithoutSuffix = suffixMatch ? suffixMatch[1] : name;
    
    // 找到最大的数字后缀
    let maxSuffix = 0;
    const pattern = new RegExp(`^${escapeRegExp(baseNameWithoutSuffix)}_(\\d+)${escapeRegExp(ext)}$`);
    
    for (const existing of existingNames) {
        const match = existing.match(pattern);
        if (match) {
            maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
        }
    }
    
    return `${baseNameWithoutSuffix}_${maxSuffix + 1}${ext}`;
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string - 输入字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 获取当前时间的 ISO 字符串
 * @returns {string} ISO 时间字符串
 */
export function getCurrentTimestamp() {
    return new Date().toISOString();
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ProjectErrorCode = ProjectErrorCode;
    window.ProjectError = ProjectError;
    window.generateId = generateId;
    window.validateFileName = validateFileName;
    window.generateUniqueFileName = generateUniqueFileName;
}
