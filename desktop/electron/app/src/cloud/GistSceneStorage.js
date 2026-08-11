/**
 * GistSceneStorage.js - Cloud Scene Storage using GitHub Gists (Zero-Cost)
 *
 * Provides cloud storage for OpticsLab scenes using GitHub Gists API.
 * Each user has one private Gist containing all their scenes as separate files.
 *
 * Features:
 * - Save scenes to cloud (private Gist)
 * - Load scenes from cloud
 * - List all cloud scenes
 * - Delete scenes
 * - Share scenes (public links)
 * - Version history (via Gist revisions)
 */

export class GistSceneStorage {
    constructor(auth) {
        this.auth = auth;
        this.gistId = localStorage.getItem('opticslab_gist_id');
        this.gistDescription = 'OpticsLab Scenes';
    }

    /**
     * Save a scene to cloud storage
     * @param {string} sceneName - Name of the scene
     * @param {Object} sceneData - Scene data object
     * @returns {Promise<Object>} Gist response
     */
    async saveScene(sceneName, sceneData) {
        const token = this.auth.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please login with GitHub.');
        }

        // Sanitize scene name for filename
        const filename = this._sanitizeFilename(sceneName) + '.json';

        // Prepare gist data
        const gistData = {
            description: this.gistDescription,
            public: false, // Private gist
            files: {
                [filename]: {
                    content: JSON.stringify(sceneData, null, 2)
                }
            }
        };

        try {
            let response;

            if (this.gistId) {
                // Update existing gist
                response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(gistData)
                });
            } else {
                // Create new gist
                response = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(gistData)
                });
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save scene to cloud');
            }

            const result = await response.json();

            // Save gist ID for future updates
            if (!this.gistId) {
                this.gistId = result.id;
                localStorage.setItem('opticslab_gist_id', this.gistId);
            }

            return result;

        } catch (error) {
            console.error('Failed to save scene:', error);
            throw error;
        }
    }

    /**
     * Load a scene from cloud storage
     * @param {string} sceneName - Name of the scene
     * @returns {Promise<Object>} Scene data
     */
    async loadScene(sceneName) {
        const scenes = await this.listScenes();
        const scene = scenes.find(s => s.name === sceneName);

        if (!scene) {
            throw new Error(`Scene "${sceneName}" not found in cloud storage`);
        }

        try {
            const response = await fetch(scene.rawUrl);

            if (!response.ok) {
                throw new Error('Failed to load scene content');
            }

            return await response.json();

        } catch (error) {
            console.error('Failed to load scene:', error);
            throw error;
        }
    }

    /**
     * List all scenes in cloud storage
     * @returns {Promise<Array>} Array of scene metadata
     */
    async listScenes() {
        const token = this.auth.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Please login with GitHub.');
        }

        try {
            // Find or create OpticsLab gist
            if (!this.gistId) {
                await this._findOrCreateGist();
            }

            if (!this.gistId) {
                return []; // No gist yet, return empty list
            }

            // Fetch gist details
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // Gist was deleted, clear cached ID
                    this.gistId = null;
                    localStorage.removeItem('opticslab_gist_id');
                    return [];
                }
                throw new Error('Failed to fetch scenes list');
            }

            const gist = await response.json();

            // Parse files into scene list
            const scenes = Object.entries(gist.files).map(([filename, file]) => ({
                name: filename.replace('.json', ''),
                filename: filename,
                size: file.size,
                rawUrl: file.raw_url,
                updated: gist.updated_at,
                language: file.language
            }));

            return scenes;

        } catch (error) {
            console.error('Failed to list scenes:', error);
            throw error;
        }
    }

    /**
     * Delete a scene from cloud storage
     * @param {string} sceneName - Name of the scene to delete
     * @returns {Promise<Object>} Gist response
     */
    async deleteScene(sceneName) {
        const token = this.auth.getAccessToken();
        if (!token || !this.gistId) {
            throw new Error('Not authenticated or no cloud storage found');
        }

        const filename = this._sanitizeFilename(sceneName) + '.json';

        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    files: {
                        [filename]: null // null deletes the file
                    }
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete scene');
            }

            return await response.json();

        } catch (error) {
            console.error('Failed to delete scene:', error);
            throw error;
        }
    }

    /**
     * Rename a scene in cloud storage
     * @param {string} oldName - Current scene name
     * @param {string} newName - New scene name
     * @returns {Promise<Object>} Gist response
     */
    async renameScene(oldName, newName) {
        // Load scene data
        const sceneData = await this.loadScene(oldName);

        // Delete old scene
        await this.deleteScene(oldName);

        // Save with new name
        return await this.saveScene(newName, sceneData);
    }

    /**
     * Get shareable link for a scene
     * @param {string} sceneName - Name of the scene
     * @returns {Promise<string>} Shareable URL
     */
    async getShareLink(sceneName) {
        const scenes = await this.listScenes();
        const scene = scenes.find(s => s.name === sceneName);

        if (!scene) {
            throw new Error(`Scene "${sceneName}" not found`);
        }

        // Return URL that can be used to import the scene
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?import=${encodeURIComponent(scene.rawUrl)}`;
    }

    /**
     * Import scene from URL
     * @param {string} url - Raw gist URL
     * @returns {Promise<Object>} Scene data
     */
    async importFromUrl(url) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch scene from URL');
            }

            return await response.json();

        } catch (error) {
            console.error('Failed to import scene:', error);
            throw error;
        }
    }

    /**
     * Get version history for a scene
     * @param {string} sceneName - Name of the scene
     * @returns {Promise<Array>} Array of revisions
     */
    async getVersionHistory(sceneName) {
        const token = this.auth.getAccessToken();
        if (!token || !this.gistId) {
            throw new Error('Not authenticated or no cloud storage found');
        }

        try {
            // Fetch gist commits (revisions)
            const response = await fetch(`https://api.github.com/gists/${this.gistId}/commits`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch version history');
            }

            const commits = await response.json();

            // Filter commits that affected this scene
            const filename = this._sanitizeFilename(sceneName) + '.json';
            const relevantCommits = commits.filter(commit => {
                return commit.change_status &&
                       commit.change_status.additions > 0 ||
                       commit.change_status.deletions > 0;
            });

            return relevantCommits.map(commit => ({
                version: commit.version,
                committedAt: commit.committed_at,
                url: commit.url,
                user: commit.user
            }));

        } catch (error) {
            console.error('Failed to get version history:', error);
            throw error;
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStorageStats() {
        const scenes = await this.listScenes();

        const totalSize = scenes.reduce((sum, scene) => sum + scene.size, 0);
        const sceneCount = scenes.length;

        return {
            sceneCount,
            totalSize,
            totalSizeFormatted: this._formatBytes(totalSize),
            scenes: scenes.map(s => ({
                name: s.name,
                size: s.size,
                sizeFormatted: this._formatBytes(s.size)
            }))
        };
    }

    /**
     * Find existing OpticsLab gist or create new one
     * @private
     */
    async _findOrCreateGist() {
        const token = this.auth.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            // List user's gists
            const response = await fetch('https://api.github.com/gists', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch gists');
            }

            const gists = await response.json();

            // Find OpticsLab gist
            const opticsLabGist = gists.find(g => g.description === this.gistDescription);

            if (opticsLabGist) {
                this.gistId = opticsLabGist.id;
                localStorage.setItem('opticslab_gist_id', this.gistId);
            }

        } catch (error) {
            console.error('Failed to find gist:', error);
            throw error;
        }
    }

    /**
     * Sanitize filename for gist
     * @private
     */
    _sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_') // Replace invalid chars
            .replace(/_{2,}/g, '_') // Replace multiple underscores
            .substring(0, 100); // Limit length
    }

    /**
     * Format bytes to human-readable string
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Clear cached gist ID (for testing)
     */
    clearCache() {
        this.gistId = null;
        localStorage.removeItem('opticslab_gist_id');
    }
}
