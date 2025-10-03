// sceneManager.js - 增强的场景管理功能

console.log("sceneManager.js: Loading Enhanced Scene Management...");

/**
 * 增强的场景管理类
 * 提供场景命名、分类、搜索、批量操作等功能
 */
class SceneManager {
    constructor() {
        this.scenes = new Map(); // 本地场景存储
        this.currentSceneId = null;
        this.sceneCategories = new Map(); // 场景分类
        this.searchIndex = new Map(); // 搜索索引
        
        // 初始化默认分类
        this.initializeDefaultCategories();
        
        // 从localStorage加载场景
        this.loadScenesFromStorage();
        
        // 绑定事件监听器
        this.bindEventListeners();
        
        console.log("SceneManager initialized with", this.scenes.size, "scenes");
    }

    /**
     * 初始化默认分类
     */
    initializeDefaultCategories() {
        const defaultCategories = [
            { id: 'all', name: '全部场景', color: '#6c757d' },
            { id: 'recent', name: '最近使用', color: '#007bff' },
            { id: 'favorites', name: '收藏夹', color: '#ffc107' },
            { id: 'physics', name: '物理实验', color: '#28a745' },
            { id: 'education', name: '教学演示', color: '#17a2b8' },
            { id: 'research', name: '科研项目', color: '#dc3545' },
            { id: 'templates', name: '模板', color: '#6f42c1' }
        ];

        defaultCategories.forEach(category => {
            this.sceneCategories.set(category.id, category);
        });
    }

    /**
     * 从localStorage加载场景
     */
    loadScenesFromStorage() {
        try {
            const scenesData = localStorage.getItem('opticsLab_scenes');
            if (scenesData) {
                const scenes = JSON.parse(scenesData);
                scenes.forEach(scene => {
                    this.scenes.set(scene.id, scene);
                    this.updateSearchIndex(scene);
                });
            }
        } catch (error) {
            console.error("Error loading scenes from storage:", error);
        }
    }

    /**
     * 保存场景到localStorage
     */
    saveScenesToStorage() {
        try {
            const scenesArray = Array.from(this.scenes.values());
            localStorage.setItem('opticsLab_scenes', JSON.stringify(scenesArray));
        } catch (error) {
            console.error("Error saving scenes to storage:", error);
        }
    }

    /**
     * 更新搜索索引
     */
    updateSearchIndex(scene) {
        const searchableText = [
            scene.name,
            scene.description || '',
            ...(scene.tags || []),
            scene.category || ''
        ].join(' ').toLowerCase();

        this.searchIndex.set(scene.id, searchableText);
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 场景搜索
        const searchInput = document.getElementById('scene-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // 场景分类筛选
        const categoryFilter = document.getElementById('scene-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.handleCategoryFilter(e.target.value);
            });
        }

        // 场景排序
        const sortSelect = document.getElementById('scene-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSort(e.target.value);
            });
        }
    }

    /**
     * 创建新场景
     */
    createScene(name, description = '', tags = [], category = 'all', data = null) {
        const sceneId = this.generateSceneId();
        const now = new Date();
        
        const scene = {
            id: sceneId,
            name: name || `未命名场景_${sceneId.substring(0, 8)}`,
            description,
            tags: Array.isArray(tags) ? tags : [],
            category: category || 'all',
            data: data || { components: [], mode: 'ray_trace' },
            createdAt: now,
            updatedAt: now,
            lastAccessed: now,
            isFavorite: false,
            accessCount: 0,
            thumbnail: null // 后续可以添加缩略图生成
        };

        this.scenes.set(sceneId, scene);
        this.updateSearchIndex(scene);
        this.saveScenesToStorage();
        this.refreshSceneList();

        return scene;
    }

    /**
     * 更新场景
     */
    updateScene(sceneId, updates) {
        const scene = this.scenes.get(sceneId);
        if (!scene) {
            throw new Error('场景不存在');
        }

        // 更新场景数据
        Object.assign(scene, updates, { updatedAt: new Date() });
        
        this.updateSearchIndex(scene);
        this.saveScenesToStorage();
        this.refreshSceneList();

        return scene;
    }

    /**
     * 删除场景
     */
    deleteScene(sceneId) {
        if (this.scenes.has(sceneId)) {
            this.scenes.delete(sceneId);
            this.searchIndex.delete(sceneId);
            this.saveScenesToStorage();
            this.refreshSceneList();
            return true;
        }
        return false;
    }

    /**
     * 批量删除场景
     */
    deleteScenes(sceneIds) {
        let deletedCount = 0;
        sceneIds.forEach(sceneId => {
            if (this.deleteScene(sceneId)) {
                deletedCount++;
            }
        });
        return deletedCount;
    }

    /**
     * 获取场景
     */
    getScene(sceneId) {
        return this.scenes.get(sceneId);
    }

    /**
     * 获取所有场景
     */
    getAllScenes() {
        return Array.from(this.scenes.values());
    }

    /**
     * 搜索场景
     */
    searchScenes(query, category = 'all') {
        const results = [];
        const searchQuery = query.toLowerCase();

        this.scenes.forEach((scene, sceneId) => {
            // 分类筛选
            if (category !== 'all' && scene.category !== category) {
                return;
            }

            // 搜索文本匹配
            const searchableText = this.searchIndex.get(sceneId);
            if (searchableText && searchableText.includes(searchQuery)) {
                results.push(scene);
            }
        });

        return results;
    }

    /**
     * 按分类获取场景
     */
    getScenesByCategory(category) {
        if (category === 'all') {
            return this.getAllScenes();
        }

        if (category === 'recent') {
            return this.getRecentScenes();
        }

        if (category === 'favorites') {
            return this.getFavoriteScenes();
        }

        return Array.from(this.scenes.values()).filter(scene => scene.category === category);
    }

    /**
     * 获取最近使用的场景
     */
    getRecentScenes(limit = 10) {
        return Array.from(this.scenes.values())
            .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
            .slice(0, limit);
    }

    /**
     * 获取收藏的场景
     */
    getFavoriteScenes() {
        return Array.from(this.scenes.values()).filter(scene => scene.isFavorite);
    }

    /**
     * 切换收藏状态
     */
    toggleFavorite(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.isFavorite = !scene.isFavorite;
            this.saveScenesToStorage();
            this.refreshSceneList();
            return scene.isFavorite;
        }
        return false;
    }

    /**
     * 记录场景访问
     */
    recordAccess(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.lastAccessed = new Date();
            scene.accessCount = (scene.accessCount || 0) + 1;
            this.saveScenesToStorage();
        }
    }

    /**
     * 生成场景ID
     */
    generateSceneId() {
        return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 处理搜索
     */
    handleSearch(query) {
        const results = this.searchScenes(query);
        this.displaySearchResults(results);
    }

    /**
     * 处理分类筛选
     */
    handleCategoryFilter(category) {
        const scenes = this.getScenesByCategory(category);
        this.displayScenes(scenes);
    }

    /**
     * 处理排序
     */
    handleSort(sortBy) {
        const scenes = Array.from(this.scenes.values());
        
        switch (sortBy) {
            case 'name':
                scenes.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'date_created':
                scenes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'date_modified':
                scenes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'last_accessed':
                scenes.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
                break;
            case 'access_count':
                scenes.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
                break;
        }

        this.displayScenes(scenes);
    }

    /**
     * 显示场景列表
     */
    displayScenes(scenes) {
        const container = document.getElementById('saved-scenes-list');
        if (!container) return;

        if (scenes.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有找到场景</p>';
            return;
        }

        container.innerHTML = scenes.map(scene => this.createSceneItemHTML(scene)).join('');
    }

    /**
     * 显示搜索结果
     */
    displaySearchResults(results) {
        this.displayScenes(results);
    }

    /**
     * 创建场景项HTML
     */
    createSceneItemHTML(scene) {
        const category = this.sceneCategories.get(scene.category);
        const categoryColor = category ? category.color : '#6c757d';
        
        return `
            <div class="saved-scene-item" data-scene-id="${scene.id}">
                <div class="scene-item-content">
                    <div class="scene-name">${this.escapeHtml(scene.name)}</div>
                    <div class="scene-info">
                        <span class="scene-category" style="color: ${categoryColor}">
                            ${category ? category.name : '未分类'}
                        </span>
                        <span class="scene-date">
                            ${this.formatDate(scene.updatedAt)}
                        </span>
                        ${scene.tags && scene.tags.length > 0 ? 
                            `<span class="scene-tags">${scene.tags.map(tag => `#${tag}`).join(' ')}</span>` : 
                            ''
                        }
                    </div>
                </div>
                <div class="scene-actions">
                    <button class="scene-action-btn favorite-btn ${scene.isFavorite ? 'active' : ''}" 
                            onclick="sceneManager.toggleFavorite('${scene.id}')" 
                            title="${scene.isFavorite ? '取消收藏' : '添加收藏'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </button>
                    <button class="scene-action-btn load-btn" 
                            onclick="sceneManager.loadScene('${scene.id}')" 
                            title="加载场景">
                        加载
                    </button>
                    <button class="scene-action-btn edit-btn" 
                            onclick="sceneManager.editScene('${scene.id}')" 
                            title="编辑场景">
                        编辑
                    </button>
                    <button class="scene-action-btn delete-btn" 
                            onclick="sceneManager.confirmDeleteScene('${scene.id}')" 
                            title="删除场景">
                        删除
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 刷新场景列表
     */
    refreshSceneList() {
        const currentCategory = document.getElementById('scene-category-filter')?.value || 'all';
        const scenes = this.getScenesByCategory(currentCategory);
        this.displayScenes(scenes);
    }

    /**
     * 加载场景
     */
    loadScene(sceneId) {
        const scene = this.getScene(sceneId);
        if (!scene) {
            this.showError('场景不存在');
            return;
        }

        // 记录访问
        this.recordAccess(sceneId);
        this.currentSceneId = sceneId;

        // 触发场景加载事件
        const event = new CustomEvent('sceneLoad', {
            detail: { scene, sceneId }
        });
        document.dispatchEvent(event);

        this.showSuccess(`已加载场景: ${scene.name}`);
    }

    /**
     * 编辑场景
     */
    editScene(sceneId) {
        const scene = this.getScene(sceneId);
        if (!scene) {
            this.showError('场景不存在');
            return;
        }

        // 触发场景编辑事件
        const event = new CustomEvent('sceneEdit', {
            detail: { scene, sceneId }
        });
        document.dispatchEvent(event);
    }

    /**
     * 确认删除场景
     */
    confirmDeleteScene(sceneId) {
        const scene = this.getScene(sceneId);
        if (!scene) {
            this.showError('场景不存在');
            return;
        }

        if (confirm(`确定要删除场景"${scene.name}"吗？此操作无法撤销。`)) {
            this.deleteScene(sceneId);
            this.showSuccess('场景已删除');
        }
    }

    /**
     * 工具方法
     */

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 格式化日期
     */
    formatDate(date) {
        const now = new Date();
        const sceneDate = new Date(date);
        const diffTime = Math.abs(now - sceneDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return '今天';
        } else if (diffDays === 2) {
            return '昨天';
        } else if (diffDays <= 7) {
            return `${diffDays - 1}天前`;
        } else {
            return sceneDate.toLocaleDateString('zh-CN');
        }
    }

    /**
     * 显示成功消息
     */
    showSuccess(message) {
        console.log('Success:', message);
        // TODO: 实现更好的通知系统
    }

    /**
     * 显示错误消息
     */
    showError(message) {
        console.error('Error:', message);
        // TODO: 实现更好的通知系统
    }
}

// 初始化场景管理器
document.addEventListener('DOMContentLoaded', () => {
    window.sceneManager = new SceneManager();
});

console.log("sceneManager.js: Enhanced Scene Management loaded successfully!");

