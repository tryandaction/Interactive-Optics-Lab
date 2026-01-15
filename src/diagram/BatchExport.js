/**
 * BatchExport.js - 批量导出功能
 * 提供多场景批量导出、进度显示和错误处理
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

import { getExportEngine } from './ExportEngine.js';

/**
 * 批量导出状态枚举
 */
export const BatchExportStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * 文件命名模式
 */
export const NamingPattern = {
    SCENE_NAME: '{name}',
    INDEX: '{index}',
    DATE: '{date}',
    TIME: '{time}',
    FORMAT: '{format}'
};

/**
 * 批量导出任务类
 */
export class BatchExportTask {
    /**
     * @param {Object} scene - 场景数据
     * @param {number} index - 任务索引
     */
    constructor(scene, index) {
        /** @type {Object} 场景数据 */
        this.scene = scene;
        
        /** @type {number} 任务索引 */
        this.index = index;
        
        /** @type {string} 状态 */
        this.status = BatchExportStatus.PENDING;
        
        /** @type {any} 导出结果 */
        this.result = null;
        
        /** @type {string|null} 错误信息 */
        this.error = null;
        
        /** @type {number} 开始时间 */
        this.startTime = 0;
        
        /** @type {number} 结束时间 */
        this.endTime = 0;
        
        /** @type {string} 生成的文件名 */
        this.filename = '';
    }

    /**
     * 获取任务耗时（毫秒）
     * @returns {number}
     */
    getDuration() {
        if (this.startTime && this.endTime) {
            return this.endTime - this.startTime;
        }
        return 0;
    }
}

/**
 * 批量导出管理器类
 */
export class BatchExportManager {
    constructor(options = {}) {
        /** @type {ExportEngine} */
        this.exportEngine = options.exportEngine || getExportEngine();
        
        /** @type {BatchExportTask[]} 任务列表 */
        this.tasks = [];
        
        /** @type {boolean} 是否正在运行 */
        this.isRunning = false;
        
        /** @type {boolean} 是否已取消 */
        this.isCancelled = false;
        
        /** @type {number} 当前任务索引 */
        this.currentIndex = 0;
        
        /** @type {Object} 导出配置 */
        this.config = {};
        
        /** @type {string} 文件命名模式 */
        this.namingPattern = options.namingPattern || '{name}_{index}';
        
        /** @type {Array<Function>} 进度监听器 */
        this.progressListeners = [];
        
        /** @type {Array<Function>} 完成监听器 */
        this.completeListeners = [];
    }

    /**
     * 添加场景到导出队列
     * @param {Object|Object[]} scenes - 场景或场景数组
     */
    addScenes(scenes) {
        const sceneArray = Array.isArray(scenes) ? scenes : [scenes];
        
        sceneArray.forEach(scene => {
            const task = new BatchExportTask(scene, this.tasks.length);
            this.tasks.push(task);
        });
    }

    /**
     * 清空任务队列
     */
    clearTasks() {
        if (this.isRunning) {
            console.warn('BatchExportManager: Cannot clear tasks while running');
            return;
        }
        this.tasks = [];
        this.currentIndex = 0;
    }

    /**
     * 设置导出配置
     * @param {Object} config - 导出配置
     */
    setConfig(config) {
        this.config = { ...config };
    }

    /**
     * 设置文件命名模式
     * @param {string} pattern - 命名模式
     */
    setNamingPattern(pattern) {
        this.namingPattern = pattern;
    }

    /**
     * 生成文件名
     * @param {BatchExportTask} task - 任务
     * @param {Object} config - 配置
     * @returns {string}
     */
    generateFilename(task, config) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        
        let filename = this.namingPattern
            .replace('{name}', task.scene.name || 'scene')
            .replace('{index}', String(task.index + 1).padStart(3, '0'))
            .replace('{date}', dateStr)
            .replace('{time}', timeStr)
            .replace('{format}', config.format);
        
        // 清理非法字符
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        return `${filename}.${config.format}`;
    }

    /**
     * 开始批量导出
     * @param {Object} [config] - 导出配置
     * @returns {Promise<BatchExportResult>}
     */
    async start(config = {}) {
        if (this.isRunning) {
            throw new Error('Batch export is already running');
        }
        
        if (this.tasks.length === 0) {
            throw new Error('No tasks to export');
        }
        
        this.isRunning = true;
        this.isCancelled = false;
        this.currentIndex = 0;
        this.config = { ...this.config, ...config };
        
        const startTime = Date.now();
        const results = [];
        
        try {
            for (let i = 0; i < this.tasks.length; i++) {
                if (this.isCancelled) {
                    // 标记剩余任务为取消
                    for (let j = i; j < this.tasks.length; j++) {
                        this.tasks[j].status = BatchExportStatus.CANCELLED;
                    }
                    break;
                }
                
                const task = this.tasks[i];
                this.currentIndex = i;
                
                // 更新任务状态
                task.status = BatchExportStatus.PROCESSING;
                task.startTime = Date.now();
                task.filename = this.generateFilename(task, this.config);
                
                // 通知进度
                this._notifyProgress(i, this.tasks.length, task);
                
                try {
                    // 执行导出
                    const result = await this.exportEngine.export(task.scene, this.config);
                    
                    task.result = result;
                    task.status = BatchExportStatus.COMPLETED;
                    task.endTime = Date.now();
                    
                    results.push({
                        task,
                        success: true,
                        filename: task.filename,
                        data: result
                    });
                    
                } catch (error) {
                    task.error = error.message;
                    task.status = BatchExportStatus.FAILED;
                    task.endTime = Date.now();
                    
                    results.push({
                        task,
                        success: false,
                        filename: task.filename,
                        error: error.message
                    });
                }
            }
        } finally {
            this.isRunning = false;
        }
        
        const endTime = Date.now();
        const summary = this._generateSummary(results, startTime, endTime);
        
        // 通知完成
        this._notifyComplete(summary);
        
        return summary;
    }

    /**
     * 取消批量导出
     */
    cancel() {
        if (this.isRunning) {
            this.isCancelled = true;
        }
    }

    /**
     * 获取进度
     * @returns {{current: number, total: number, percentage: number}}
     */
    getProgress() {
        const total = this.tasks.length;
        const current = this.currentIndex;
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        
        return { current, total, percentage };
    }

    /**
     * 获取任务统计
     * @returns {Object}
     */
    getStatistics() {
        const stats = {
            total: this.tasks.length,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
        };
        
        this.tasks.forEach(task => {
            switch (task.status) {
                case BatchExportStatus.PENDING:
                    stats.pending++;
                    break;
                case BatchExportStatus.PROCESSING:
                    stats.processing++;
                    break;
                case BatchExportStatus.COMPLETED:
                    stats.completed++;
                    break;
                case BatchExportStatus.FAILED:
                    stats.failed++;
                    break;
                case BatchExportStatus.CANCELLED:
                    stats.cancelled++;
                    break;
            }
        });
        
        return stats;
    }

    /**
     * 生成摘要
     * @private
     */
    _generateSummary(results, startTime, endTime) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        return {
            totalTasks: this.tasks.length,
            successCount: successful.length,
            failCount: failed.length,
            cancelledCount: this.tasks.filter(t => t.status === BatchExportStatus.CANCELLED).length,
            totalDuration: endTime - startTime,
            averageDuration: successful.length > 0 
                ? successful.reduce((sum, r) => sum + r.task.getDuration(), 0) / successful.length 
                : 0,
            results,
            successful,
            failed,
            wasCancelled: this.isCancelled
        };
    }

    /**
     * 下载所有成功的导出结果
     * @param {Object} summary - 导出摘要
     */
    async downloadAll(summary) {
        if (summary.successful.length === 0) {
            console.warn('BatchExportManager: No successful exports to download');
            return;
        }
        
        // 如果只有一个文件，直接下载
        if (summary.successful.length === 1) {
            const result = summary.successful[0];
            this._downloadFile(result.data, result.filename, this.config.format);
            return;
        }
        
        // 多个文件，尝试打包为ZIP（需要JSZip库）
        if (typeof JSZip !== 'undefined') {
            await this._downloadAsZip(summary.successful);
        } else {
            // 逐个下载
            for (const result of summary.successful) {
                this._downloadFile(result.data, result.filename, this.config.format);
                // 添加延迟避免浏览器阻止
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    /**
     * 下载单个文件
     * @private
     */
    _downloadFile(data, filename, format) {
        let blob;
        
        if (format === 'svg') {
            blob = new Blob([data], { type: 'image/svg+xml' });
        } else if (data instanceof Blob) {
            blob = data;
        } else {
            blob = new Blob([data]);
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 打包为ZIP下载
     * @private
     */
    async _downloadAsZip(results) {
        const zip = new JSZip();
        
        for (const result of results) {
            if (result.data instanceof Blob) {
                zip.file(result.filename, result.data);
            } else {
                zip.file(result.filename, result.data);
            }
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        this._downloadFile(content, `optical-diagrams-${timestamp}.zip`, 'zip');
    }

    /**
     * 注册进度监听器
     * @param {Function} callback - (current, total, task) => void
     * @returns {Function}
     */
    onProgress(callback) {
        this.progressListeners.push(callback);
        return () => {
            const index = this.progressListeners.indexOf(callback);
            if (index > -1) {
                this.progressListeners.splice(index, 1);
            }
        };
    }

    /**
     * 注册完成监听器
     * @param {Function} callback - (summary) => void
     * @returns {Function}
     */
    onComplete(callback) {
        this.completeListeners.push(callback);
        return () => {
            const index = this.completeListeners.indexOf(callback);
            if (index > -1) {
                this.completeListeners.splice(index, 1);
            }
        };
    }

    /**
     * 通知进度
     * @private
     */
    _notifyProgress(current, total, task) {
        this.progressListeners.forEach(listener => {
            try {
                listener(current, total, task);
            } catch (error) {
                console.error('BatchExportManager: Error in progress listener:', error);
            }
        });
    }

    /**
     * 通知完成
     * @private
     */
    _notifyComplete(summary) {
        this.completeListeners.forEach(listener => {
            try {
                listener(summary);
            } catch (error) {
                console.error('BatchExportManager: Error in complete listener:', error);
            }
        });
    }
}

// 创建单例实例
let batchExportManagerInstance = null;

/**
 * 获取BatchExportManager单例实例
 * @param {Object} options
 * @returns {BatchExportManager}
 */
export function getBatchExportManager(options = {}) {
    if (!batchExportManagerInstance) {
        batchExportManagerInstance = new BatchExportManager(options);
    }
    return batchExportManagerInstance;
}

/**
 * 重置BatchExportManager单例
 */
export function resetBatchExportManager() {
    batchExportManagerInstance = null;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.BatchExportManager = BatchExportManager;
    window.BatchExportTask = BatchExportTask;
    window.BatchExportStatus = BatchExportStatus;
    window.NamingPattern = NamingPattern;
    window.getBatchExportManager = getBatchExportManager;
}
