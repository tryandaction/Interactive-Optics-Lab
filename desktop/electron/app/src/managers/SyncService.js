/**
 * SyncService.js - Git 同步服务
 * 处理 GitHub 项目的同步命令模板和执行
 */

export class SyncService {
    static MAX_COMMIT_HISTORY = 10;

    // 预设模板
    static PRESET_TEMPLATES = {
        standard: {
            name: 'Standard Push',
            description: '标准推送：添加所有更改并推送',
            template: `git add .
git commit -m "{{message}}"
git push origin main`
        },
        pullFirst: {
            name: 'Push with Pull',
            description: '先拉取再推送：避免冲突',
            template: `git pull origin main
git add .
git commit -m "{{message}}"
git push origin main`
        },
        forcePush: {
            name: 'Force Push',
            description: '强制推送：覆盖远程更改（谨慎使用）',
            template: `git add .
git commit -m "{{message}}"
git push -f origin main`
        },
        withBranch: {
            name: 'Branch Push',
            description: '推送到指定分支',
            template: `git add .
git commit -m "{{message}}"
git push origin {{branch}}`
        }
    };

    // 可用变量
    static AVAILABLE_VARIABLES = {
        '{{message}}': '提交信息（用户输入）',
        '{{date}}': '当前日期（YYYY-MM-DD）',
        '{{time}}': '当前时间（HH:MM:SS）',
        '{{datetime}}': '日期时间（YYYY-MM-DD HH:MM:SS）',
        '{{project}}': '项目名称',
        '{{scene}}': '当前场景名称',
        '{{branch}}': '分支名称（默认 main）'
    };

    constructor() {
        this.status = 'idle'; // idle, pending, syncing, success, error
        this.lastError = null;
        this.lastSyncTime = null;
        this.listeners = new Map();
    }

    // ============ 事件系统 ============

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (e) {
                    console.error(`Error in event listener for ${event}:`, e);
                }
            });
        }
    }

    // ============ 模板处理 ============

    /**
     * 解析模板，替换变量
     * @param {string} template - 命令模板
     * @param {Object} variables - 变量值
     * @returns {string} 解析后的命令
     */
    parseTemplate(template, variables = {}) {
        if (!template) return '';

        const now = new Date();
        const defaultVariables = {
            '{{message}}': variables.message || 'Update',
            '{{date}}': this.formatDate(now),
            '{{time}}': this.formatTime(now),
            '{{datetime}}': `${this.formatDate(now)} ${this.formatTime(now)}`,
            '{{project}}': variables.project || 'Project',
            '{{scene}}': variables.scene || 'Scene',
            '{{branch}}': variables.branch || 'main'
        };

        let result = template;
        for (const [key, value] of Object.entries(defaultVariables)) {
            result = result.split(key).join(value);
        }

        return result;
    }

    /**
     * 验证模板语法
     * @param {string} template - 命令模板
     * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
     */
    validateTemplate(template) {
        const errors = [];
        const warnings = [];

        if (!template || !template.trim()) {
            errors.push('模板不能为空');
            return { valid: false, errors, warnings };
        }

        // 检查未闭合的变量
        const unclosedPattern = /\{\{[^}]*$/gm;
        if (unclosedPattern.test(template)) {
            errors.push('存在未闭合的变量标记 {{');
        }

        // 检查未知变量
        const variablePattern = /\{\{(\w+)\}\}/g;
        let match;
        while ((match = variablePattern.exec(template)) !== null) {
            const varName = `{{${match[1]}}}`;
            if (!SyncService.AVAILABLE_VARIABLES[varName]) {
                warnings.push(`未知变量: ${varName}`);
            }
        }

        // 检查危险命令
        const dangerousPatterns = [
            { pattern: /rm\s+-rf/i, message: '包含危险命令: rm -rf' },
            { pattern: /git\s+reset\s+--hard/i, message: '包含危险命令: git reset --hard' },
            { pattern: /git\s+clean\s+-fd/i, message: '包含危险命令: git clean -fd' }
        ];

        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(template)) {
                warnings.push(message);
            }
        }

        // 检查是否包含 git 命令
        if (!/git\s+/i.test(template)) {
            warnings.push('模板中没有 git 命令');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 获取预设模板列表
     */
    getPresetTemplates() {
        return Object.entries(SyncService.PRESET_TEMPLATES).map(([id, preset]) => ({
            id,
            ...preset
        }));
    }

    /**
     * 获取可用变量列表
     */
    getAvailableVariables() {
        return Object.entries(SyncService.AVAILABLE_VARIABLES).map(([variable, description]) => ({
            variable,
            description
        }));
    }

    // ============ 同步执行 ============

    /**
     * 执行同步（实际执行需要后端支持，这里只是模拟）
     * @param {Object} project - 项目对象
     * @param {string} message - 提交信息
     * @returns {Promise<Object>} 执行结果
     */
    async sync(project, message) {
        if (!project) {
            throw new Error('项目不存在');
        }

        if (project.storageMode !== 'github') {
            throw new Error('只有 GitHub 项目支持同步');
        }

        this.setStatus('pending');
        this.emit('syncStarted', { project, message });

        try {
            // 解析命令
            const commands = this.parseTemplate(project.syncCommandTemplate, {
                message,
                project: project.name,
                scene: project.currentScene?.name || ''
            });

            this.setStatus('syncing');

            // 模拟执行（实际需要后端或 Native 支持）
            const result = await this.executeCommands(commands, project);

            // 记录到历史
            this.addToCommitHistory(project, {
                message,
                commands,
                result,
                timestamp: new Date().toISOString()
            });

            this.setStatus('success');
            this.lastSyncTime = new Date();
            this.emit('syncCompleted', { project, result });

            return result;
        } catch (e) {
            this.setStatus('error');
            this.lastError = e;
            this.emit('syncFailed', { project, error: e });
            throw e;
        }
    }

    /**
     * 测试运行（不实际执行）
     * @param {Object} project - 项目对象
     * @param {string} message - 提交信息
     * @returns {Object} 解析后的命令预览
     */
    dryRun(project, message) {
        if (!project) {
            throw new Error('项目不存在');
        }

        const commands = this.parseTemplate(project.syncCommandTemplate, {
            message,
            project: project.name,
            scene: project.currentScene?.name || ''
        });

        const validation = this.validateTemplate(project.syncCommandTemplate);

        return {
            commands,
            commandLines: commands.split('\n').filter(line => line.trim()),
            validation,
            preview: true
        };
    }

    /**
     * 执行命令（模拟）
     * 注意：纯前端无法直接执行 Git 命令
     * 这里提供命令字符串，实际执行需要：
     * 1. 用户手动复制到终端执行
     * 2. 或通过 Electron/Tauri 等桌面框架执行
     */
    async executeCommands(commands, project) {
        // 纯前端无法执行 shell 命令
        // 返回命令供用户手动执行
        return {
            success: true,
            message: '命令已生成，请在终端中执行',
            commands: commands,
            commandLines: commands.split('\n').filter(line => line.trim()),
            note: '纯前端应用无法直接执行 Git 命令，请复制以下命令到终端执行'
        };
    }

    // ============ 提交历史 ============

    /**
     * 添加到提交历史
     */
    addToCommitHistory(project, record) {
        if (!project.commitHistory) {
            project.commitHistory = [];
        }

        project.commitHistory.unshift(record);

        // 限制历史记录数量
        if (project.commitHistory.length > SyncService.MAX_COMMIT_HISTORY) {
            project.commitHistory = project.commitHistory.slice(0, SyncService.MAX_COMMIT_HISTORY);
        }
    }

    /**
     * 获取提交历史
     */
    getCommitHistory(project) {
        return project?.commitHistory || [];
    }

    /**
     * 清空提交历史
     */
    clearCommitHistory(project) {
        if (project) {
            project.commitHistory = [];
        }
    }

    // ============ 状态管理 ============

    /**
     * 设置状态
     */
    setStatus(status) {
        const oldStatus = this.status;
        this.status = status;
        
        if (oldStatus !== status) {
            this.emit('statusChanged', { oldStatus, newStatus: status });
        }
    }

    /**
     * 获取当前状态
     */
    getStatus() {
        return this.status;
    }

    /**
     * 检查是否正在同步
     */
    isSyncing() {
        return this.status === 'syncing' || this.status === 'pending';
    }

    // ============ 工具方法 ============

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SyncService = SyncService;
}
