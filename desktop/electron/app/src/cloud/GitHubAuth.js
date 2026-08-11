/**
 * GitHubAuth.js - GitHub OAuth Authentication (Zero-Cost Solution)
 *
 * Provides GitHub OAuth authentication for cloud scene storage.
 * Uses GitHub Gists API for zero-cost cloud storage.
 *
 * Features:
 * - OAuth 2.0 authentication flow
 * - Token management (localStorage)
 * - User profile fetching
 * - Automatic token refresh
 */

export class GitHubAuth {
    constructor(config = {}) {
        // Configuration
        this.clientId = config.clientId || this._getClientId();
        this.redirectUri = config.redirectUri || window.location.origin + window.location.pathname;
        this.scope = config.scope || 'gist'; // Only need gist permission
        this.proxyUrl = config.proxyUrl || 'https://optics-lab-gray.vercel.app/api/token';

        // State
        this.accessToken = localStorage.getItem('github_token');
        this.user = null;

        // Load cached user data
        const cachedUser = localStorage.getItem('github_user');
        if (cachedUser) {
            try {
                this.user = JSON.parse(cachedUser);
            } catch (e) {
                console.warn('Failed to parse cached user data');
            }
        }

        // Auto-fetch user if token exists
        if (this.accessToken && !this.user) {
            this.fetchUser().catch(err => {
                console.warn('Failed to fetch user on init:', err);
            });
        }
    }

    /**
     * Get client ID from environment or config
     * @private
     */
    _getClientId() {
        // Try to get from meta tag first
        const meta = document.querySelector('meta[name="github-client-id"]');
        if (meta) {
            return meta.content;
        }

        // Fallback to environment variable (if using build system)
        if (typeof process !== 'undefined' && process.env?.GITHUB_CLIENT_ID) {
            return process.env.GITHUB_CLIENT_ID;
        }

        // Development fallback
        console.warn('GitHub Client ID not configured. Set via meta tag or environment variable.');
        return 'YOUR_GITHUB_CLIENT_ID';
    }

    /**
     * Initiate OAuth login flow
     * Redirects user to GitHub authorization page
     */
    login() {
        // Generate random state for CSRF protection
        const state = this._generateState();
        localStorage.setItem('github_oauth_state', state);

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: state
        });

        const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

        // Redirect to GitHub
        window.location.href = authUrl;
    }

    /**
     * Handle OAuth callback
     * Call this on the redirect page
     * @param {string} code - Authorization code from URL
     * @param {string} state - State parameter from URL
     * @returns {Promise<Object>} User data
     */
    async handleCallback(code, state) {
        // Verify state to prevent CSRF
        const savedState = localStorage.getItem('github_oauth_state');
        if (state !== savedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
        }
        localStorage.removeItem('github_oauth_state');

        // Exchange code for access token via proxy
        try {
            const response = await fetch(this.proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    client_id: this.clientId,
                    redirect_uri: this.redirectUri
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Token exchange failed: ${error}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
            }

            // Save access token
            this.accessToken = data.access_token;
            localStorage.setItem('github_token', this.accessToken);

            // Fetch user data
            await this.fetchUser();

            return this.user;

        } catch (error) {
            console.error('OAuth callback error:', error);
            throw error;
        }
    }

    /**
     * Fetch user profile from GitHub API
     * @returns {Promise<Object>} User data
     */
    async fetchUser() {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.logout();
                    throw new Error('Authentication expired. Please login again.');
                }
                throw new Error(`Failed to fetch user: ${response.statusText}`);
            }

            this.user = await response.json();

            // Cache user data
            localStorage.setItem('github_user', JSON.stringify(this.user));

            return this.user;

        } catch (error) {
            console.error('Failed to fetch user:', error);
            throw error;
        }
    }

    /**
     * Logout and clear stored data
     */
    logout() {
        this.accessToken = null;
        this.user = null;
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        localStorage.removeItem('github_oauth_state');
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if logged in
     */
    isLoggedIn() {
        return !!this.accessToken;
    }

    /**
     * Get current user
     * @returns {Object|null} User data or null
     */
    getUser() {
        return this.user;
    }

    /**
     * Get access token
     * @returns {string|null} Access token or null
     */
    getAccessToken() {
        return this.accessToken;
    }

    /**
     * Generate random state for CSRF protection
     * @private
     * @returns {string} Random state string
     */
    _generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Check if current page is OAuth callback
     * @returns {boolean} True if callback page
     */
    static isCallbackPage() {
        const params = new URLSearchParams(window.location.search);
        return params.has('code') && params.has('state');
    }

    /**
     * Get OAuth parameters from URL
     * @returns {Object|null} {code, state} or null
     */
    static getCallbackParams() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (code && state) {
            return { code, state };
        }

        return null;
    }

    /**
     * Test GitHub API connection
     * @returns {Promise<boolean>} True if API is accessible
     */
    async testConnection() {
        if (!this.accessToken) {
            return false;
        }

        try {
            const response = await fetch('https://api.github.com/rate_limit', {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get API rate limit info
     * @returns {Promise<Object>} Rate limit data
     */
    async getRateLimit() {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        const response = await fetch('https://api.github.com/rate_limit', {
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch rate limit');
        }

        return response.json();
    }
}
