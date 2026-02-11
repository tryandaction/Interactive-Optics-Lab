/**
 * SceneManager.js - 场景管理器
 * 提供场景命名、分类、搜索、批量操作等功能
 */

export class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentSceneId = null;
        this.sceneCategories = new Map();
        this.searchIndex = new Map();
        
        this.initializeDefaultCategories();
        this.loadScenesFromStorage();
        this.bindEventListeners();
    }

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

    saveScenesToStorage() {
        try {
            const scenesArray = Array.from(this.scenes.values());
            localStorage.setItem('opticsLab_scenes', JSON.stringify(scenesArray));
        } catch (error) {
            console.error("Error saving scenes to storage:", error);
        }
    }

    updateSearchIndex(scene) {
        const searchableText = [
            scene.name,
            scene.description || '',
            ...(scene.tags || []),
            scene.category || ''
        ].join(' ').toLowerCase();

        this.searchIndex.set(scene.id, searchableText);
    }

    bindEventListeners() {
        const searchInput = document.getElementById('scene-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        const categoryFilter = document.getElementById('scene-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.handleCategoryFilter(e.target.value));
        }

        const sortSelect = document.getElementById('scene-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSort(e.target.value));
        }
    }

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
            thumbnail: null
        };

        this.scenes.set(sceneId, scene);
        this.updateSearchIndex(scene);
        this.saveScenesToStorage();
        this.refreshSceneList();

        return scene;
    }

    updateScene(sceneId, updates) {
        const scene = this.scenes.get(sceneId);
        if (!scene) throw new Error('场景不存在');

        Object.assign(scene, updates, { updatedAt: new Date() });
        
        this.updateSearchIndex(scene);
        this.saveScenesToStorage();
        this.refreshSceneList();

        return scene;
    }

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

    getScene(sceneId) { return this.scenes.get(sceneId); }
    getAllScenes() { return Array.from(this.scenes.values()); }

    searchScenes(query, category = 'all') {
        const results = [];
        const searchQuery = query.toLowerCase();

        this.scenes.forEach((scene, sceneId) => {
            if (category !== 'all' && scene.category !== category) return;

            const searchableText = this.searchIndex.get(sceneId);
            if (searchableText && searchableText.includes(searchQuery)) {
                results.push(scene);
            }
        });

        return results;
    }

    getScenesByCategory(category) {
        if (category === 'all') return this.getAllScenes();
        if (category === 'recent') return this.getRecentScenes();
        if (category === 'favorites') return this.getFavoriteScenes();
        return Array.from(this.scenes.values()).filter(scene => scene.category === category);
    }

    getRecentScenes(limit = 10) {
        return Array.from(this.scenes.values())
            .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))
            .slice(0, limit);
    }

    getFavoriteScenes() {
        return Array.from(this.scenes.values()).filter(scene => scene.isFavorite);
    }

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

    recordAccess(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (scene) {
            scene.lastAccessed = new Date();
            scene.accessCount = (scene.accessCount || 0) + 1;
            this.saveScenesToStorage();
        }
    }

    generateSceneId() {
        return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    handleSearch(query) {
        const results = this.searchScenes(query);
        this.displaySearchResults(results);
    }

    handleCategoryFilter(category) {
        const scenes = this.getScenesByCategory(category);
        this.displayScenes(scenes);
    }

    handleSort(sortBy) {
        const scenes = Array.from(this.scenes.values());
        
        switch (sortBy) {
            case 'name': scenes.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'date_created': scenes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
            case 'date_modified': scenes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)); break;
            case 'last_accessed': scenes.sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed)); break;
            case 'access_count': scenes.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0)); break;
        }

        this.displayScenes(scenes);
    }

    displayScenes(scenes) {
        const container = document.getElementById('saved-scenes-list');
        if (!container) return;

        if (scenes.length === 0) {
            container.innerHTML = '<p class="placeholder-text">没有找到场景</p>';
            return;
        }

        container.innerHTML = scenes.map(scene => this.createSceneItemHTML(scene)).join('');
    }

    displaySearchResults(results) {
        this.displayScenes(results);
    }

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
                        <span class="scene-date">${this.formatDate(scene.updatedAt)}</span>
                        ${scene.tags?.length > 0 ? 
                            `<span class="scene-tags">${scene.tags.map(tag => `#${tag}`).join(' ')}</span>` : ''}
                    </div>
                </div>
                <div class="scene-actions">
                    <button class="scene-action-btn favorite-btn ${scene.isFavorite ? 'active' : ''}" 
                            onclick="sceneManager.toggleFavorite('${scene.id}')" 
                            title="${scene.isFavorite ? '取消收藏' : '添加收藏'}">★</button>
                    <button class="scene-action-btn load-btn" 
                            onclick="sceneManager.loadScene('${scene.id}')" title="加载场景">加载</button>
                    <button class="scene-action-btn delete-btn" 
                            onclick="sceneManager.confirmDeleteScene('${scene.id}')" title="删除场景">删除</button>
                </div>
            </div>
        `;
    }

    refreshSceneList() {
        const currentCategory = document.getElementById('scene-category-filter')?.value || 'all';
        const scenes = this.getScenesByCategory(currentCategory);
        this.displayScenes(scenes);
    }

    loadScene(sceneId) {
        const scene = this.getScene(sceneId);
        if (!scene) {
            this.showError('场景不存在');
            return;
        }

        this.recordAccess(sceneId);
        this.currentSceneId = sceneId;

        const event = new CustomEvent('sceneLoad', { detail: { scene, sceneId } });
        document.dispatchEvent(event);

        this.showSuccess(`已加载场景: ${scene.name}`);
    }

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(date) {
        const now = new Date();
        const sceneDate = new Date(date);
        const diffDays = Math.ceil(Math.abs(now - sceneDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '今天';
        if (diffDays === 2) return '昨天';
        if (diffDays <= 7) return `${diffDays - 1}天前`;
        return sceneDate.toLocaleDateString('zh-CN');
    }

    showSuccess(message) { console.log('Success:', message); }
    showError(message) { console.error('Error:', message); }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.SceneManager = SceneManager;
}
