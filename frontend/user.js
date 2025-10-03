// user.js - 用户状态管理和认证功能

console.log("user.js: Loading User Management System...");

/**
 * 用户状态管理类
 * 处理用户登录、注册、状态管理等功能
 */
class UserManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.authToken = null;
        this.apiBaseUrl = 'http://localhost:3000/api'; // 后端API地址，指向backend目录下的服务器
        this.preferencesLoaded = false; // 防止重复加载偏好设置

        // 从localStorage恢复用户状态
        this.loadUserFromStorage();

        // 绑定事件监听器
        this.bindEventListeners();

        console.log("UserManager initialized. Logged in:", this.isLoggedIn);
    }

    /**
     * 从localStorage加载用户状态
     */
    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('opticsLab_user');
            const token = localStorage.getItem('opticsLab_token');
            
            if (userData && token) {
                this.currentUser = JSON.parse(userData);
                this.authToken = token;
                this.isLoggedIn = true;
                this.updateUI();
            }
        } catch (error) {
            console.error("Error loading user from storage:", error);
            this.clearUserData();
        }
    }

    /**
     * 保存用户数据到localStorage
     */
    saveUserToStorage() {
        if (this.currentUser && this.authToken) {
            localStorage.setItem('opticsLab_user', JSON.stringify(this.currentUser));
            localStorage.setItem('opticsLab_token', this.authToken);
        }
    }

    /**
     * 清除用户数据
     */
    clearUserData() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.authToken = null;
        this.preferencesLoaded = false; // 重置偏好设置加载标志
        localStorage.removeItem('opticsLab_user');
        localStorage.removeItem('opticsLab_token');
        this.updateUI();
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 登录/注册按钮
        const userActionBtn = document.getElementById('user-action-btn-top');
        if (userActionBtn) {
            userActionBtn.addEventListener('click', () => {
                if (this.isLoggedIn) {
                    this.showUserMenu();
                } else {
                    this.showAuthModal();
                }
            });
        }

        // 登出按钮
        const logoutBtn = document.getElementById('logout-btn-top');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // 认证模态框相关
        this.bindAuthModalEvents();

        // 密码重置相关
        this.bindPasswordResetEvents();
    }

    /**
     * 绑定认证模态框事件
     */
    bindAuthModalEvents() {
        const authModal = document.getElementById('auth-modal');
        const closeBtn = document.getElementById('auth-modal-close-btn');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // 关闭模态框
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }

        // 点击模态框背景关闭
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }

        // 登录表单提交
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // 注册表单提交
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    /**
     * 绑定密码重置事件
     */
    bindPasswordResetEvents() {
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        const resetPasswordForm = document.getElementById('reset-password-form');

        // 忘记密码表单提交
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        // 重置密码表单提交
        if (resetPasswordForm) {
            resetPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleResetPassword();
            });
        }

        // 检查URL中的重置令牌
        this.checkUrlForResetToken();
    }

    /**
     * 显示忘记密码表单
     */
    showForgotPassword() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        const resetPasswordForm = document.getElementById('reset-password-form');
        const authTitle = document.getElementById('auth-title');

        if (loginForm && registerForm && forgotPasswordForm && resetPasswordForm && authTitle) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
            resetPasswordForm.style.display = 'none';
            authTitle.textContent = '忘记密码';
        }
    }

    /**
     * 切换到重置密码表单
     */
    switchToResetPassword(token, userId) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        const resetPasswordForm = document.getElementById('reset-password-form');
        const authTitle = document.getElementById('auth-title');

        if (loginForm && registerForm && forgotPasswordForm && resetPasswordForm && authTitle) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            forgotPasswordForm.style.display = 'none';
            resetPasswordForm.style.display = 'block';
            authTitle.textContent = '重置密码';

            // 保存令牌信息
            this.resetToken = token;
            this.resetUserId = userId;
        }
    }

    /**
     * 检查URL中的重置令牌
     */
    checkUrlForResetToken() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userId = urlParams.get('userId');

        if (token && userId) {
            // 显示认证模态框并切换到重置密码表单
            this.showAuthModal();
            this.switchToResetPassword(token, userId);

            // 清理URL参数
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    /**
     * 处理忘记密码请求
     */
    async handleForgotPassword() {
        const email = document.getElementById('forgot-email').value;
        const errorElement = document.getElementById('forgot-error');

        if (!email) {
            this.showError(errorElement, '请输入邮箱地址');
            return;
        }

        try {
            this.showLoading(true);
            const response = await this.apiRequest('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.success) {
                this.showSuccess('如果邮箱存在，重置密码邮件已发送，请检查您的邮箱');
                this.switchToLogin();

                // 清空忘记密码表单
                document.getElementById('forgot-email').value = '';
            } else {
                this.showError(errorElement, response.message || '请求失败');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError(errorElement, '网络错误，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 处理密码重置
     */
    async handleResetPassword() {
        const newPassword = document.getElementById('reset-password').value;
        const confirmPassword = document.getElementById('reset-password-confirm').value;
        const errorElement = document.getElementById('reset-error');

        if (!newPassword || !confirmPassword) {
            this.showError(errorElement, '请填写所有字段');
            return;
        }

        if (newPassword.length < 6) {
            this.showError(errorElement, '密码长度至少6位');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError(errorElement, '两次输入的密码不一致');
            return;
        }

        if (!this.resetToken || !this.resetUserId) {
            this.showError(errorElement, '重置令牌无效，请重新请求密码重置');
            return;
        }

        try {
            this.showLoading(true);
            const response = await this.apiRequest('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.resetUserId,
                    token: this.resetToken,
                    newPassword: newPassword
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.success) {
                this.showSuccess('密码重置成功，请使用新密码登录');
                this.switchToLogin();

                // 清空重置密码表单
                document.getElementById('reset-password').value = '';
                document.getElementById('reset-password-confirm').value = '';

                // 清空令牌信息
                this.resetToken = null;
                this.resetUserId = null;
            } else {
                this.showError(errorElement, response.message || '密码重置失败');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showError(errorElement, '网络错误，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 显示认证模态框
     */
    showAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'flex';
            // 显示登录表单，隐藏注册表单
            this.switchToLogin();
        }
    }

    /**
     * 隐藏认证模态框
     */
    hideAuthModal() {
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            authModal.style.display = 'none';
        }
    }

    /**
     * 切换到登录表单
     */
    switchToLogin() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authTitle = document.getElementById('auth-title');
        
        if (loginForm && registerForm && authTitle) {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            authTitle.textContent = '登录';
        }
    }

    /**
     * 切换到注册表单
     */
    switchToRegister() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const authTitle = document.getElementById('auth-title');
        
        if (loginForm && registerForm && authTitle) {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            authTitle.textContent = '注册';
        }
    }

    /**
     * 处理登录
     */
    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');

        if (!username || !password) {
            this.showError(errorElement, '请输入用户名和密码');
            return;
        }

        try {
            this.showLoading(true);
            const response = await this.apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.success) {
                this.currentUser = response.user;
                this.authToken = response.token;
                this.isLoggedIn = true;
                this.saveUserToStorage();
                this.updateUI();
                this.hideAuthModal();

                // 从云端加载用户偏好设置
                this.loadPreferencesFromCloud();

                // 使用新的临时消息系统
                if (window.showTemporaryMessage) {
                    window.showTemporaryMessage('登录成功！', 'success');
                } else {
                    this.showSuccess('登录成功！');
                }

                // 检查是否有待处理的分享场景
                setTimeout(() => {
                    if (window.checkPendingSharedScene) {
                        window.checkPendingSharedScene();
                    }
                }, 500);
            } else {
                this.showError(errorElement, response.message || '登录失败');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(errorElement, '网络错误，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 处理注册
     */
    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorElement = document.getElementById('register-error');

        if (!username || !email || !password) {
            this.showError(errorElement, '请填写所有字段');
            return;
        }

        if (password.length < 6) {
            this.showError(errorElement, '密码长度至少6位');
            return;
        }

        try {
            this.showLoading(true);
            const response = await this.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.success) {
                this.showSuccess('注册成功！请登录');
                this.switchToLogin();
                // 清空注册表单
                document.getElementById('register-username').value = '';
                document.getElementById('register-email').value = '';
                document.getElementById('register-password').value = '';
            } else {
                this.showError(errorElement, response.message || '注册失败');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showError(errorElement, '网络错误，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 登出
     */
    logout() {
        this.clearUserData();
        // 使用新的临时消息系统
        if (window.showTemporaryMessage) {
            window.showTemporaryMessage('已登出', 'info');
        } else {
            this.showSuccess('已登出');
        }
    }

    /**
     * 显示用户菜单（暂未实现）
     */
    showUserMenu() {
        // TODO: 实现用户菜单
        console.log('Show user menu for:', this.currentUser);
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        const userStatus = document.getElementById('user-status-top');
        const userActionBtn = document.getElementById('user-action-btn-top');
        const logoutBtn = document.getElementById('logout-btn-top');
        const userScenesBtn = document.getElementById('user-scenes-btn-top');

        if (this.isLoggedIn) {
            // 已登录状态
            if (userStatus) userStatus.textContent = this.currentUser?.username || '已登录';
            if (userActionBtn) {
                userActionBtn.textContent = '用户中心';
                userActionBtn.style.display = 'none'; // 暂时隐藏
            }
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (userScenesBtn) userScenesBtn.style.display = 'inline-block';
        } else {
            // 未登录状态
            if (userStatus) userStatus.textContent = '未登录';
            if (userActionBtn) {
                userActionBtn.textContent = '登录/注册';
                userActionBtn.style.display = 'inline-block';
            }
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userScenesBtn) userScenesBtn.style.display = 'none';
        }
    }

    /**
     * 显示错误信息
     */
    showError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        // 创建临时通知元素
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <span class="notification-icon">✓</span>
            <span class="notification-message">${message}</span>
        `;

        // 添加到页面
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => notification.classList.add('show'), 10);

        // 自动移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 显示加载状态
     */
    showLoading(show) {
        let loadingOverlay = document.getElementById('loading-overlay');

        if (show) {
            if (!loadingOverlay) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.id = 'loading-overlay';
                loadingOverlay.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <div class="loading-text">处理中...</div>
                    </div>
                `;
                document.body.appendChild(loadingOverlay);
            }
            loadingOverlay.style.display = 'flex';
        } else {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }
    }

    /**
     * API请求封装
     */
    async apiRequest(endpoint, options = {}) {
        const url = this.apiBaseUrl + endpoint;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });

            const responseData = await response.json().catch(() => ({}));

            // 对于API错误响应（4xx/5xx），如果包含success字段，返回数据让调用者处理
            if (!response.ok) {
                if (responseData.success !== undefined) {
                    return responseData; // 返回错误数据，让调用者检查success字段
                }
                // 其他错误（如网络错误）抛出异常
                throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
            }

            return responseData;
        } catch (error) {
            // 如果是网络错误，提供更友好的错误信息
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('无法连接到服务器，请检查网络连接');
            }
            throw error;
        }
    }

    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 检查是否已登录
     */
    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    /**
     * 获取认证token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * 场景管理方法
     */

    /**
     * 获取用户场景列表
     */
    async getScenes(page = 1, limit = 20, search = '', tags = '') {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            
            if (search) params.append('search', search);
            if (tags) params.append('tags', tags);

            const response = await this.apiRequest(`/scenes?${params}`);
            return response;
        } catch (error) {
            console.error('获取场景列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取单个场景
     */
    async getScene(sceneId) {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const response = await this.apiRequest(`/scenes/${sceneId}`);
            return response;
        } catch (error) {
            console.error('获取场景失败:', error);
            throw error;
        }
    }

    /**
     * 保存场景到云端
     */
    async saveScene(sceneData) {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const response = await this.apiRequest('/scenes', {
                method: 'POST',
                body: JSON.stringify(sceneData)
            });
            return response;
        } catch (error) {
            console.error('保存场景失败:', error);
            throw error;
        }
    }

    /**
     * 更新场景
     */
    async updateScene(sceneId, sceneData) {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const response = await this.apiRequest(`/scenes/${sceneId}`, {
                method: 'PUT',
                body: JSON.stringify(sceneData)
            });
            return response;
        } catch (error) {
            console.error('更新场景失败:', error);
            throw error;
        }
    }

    /**
     * 删除场景
     */
    async deleteScene(sceneId) {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const response = await this.apiRequest(`/scenes/${sceneId}`, {
                method: 'DELETE'
            });
            return response;
        } catch (error) {
            console.error('删除场景失败:', error);
            throw error;
        }
    }

    /**
     * 更新用户偏好设置
     */
    async updatePreferences(preferences) {
        if (!this.isLoggedIn) {
            throw new Error('请先登录');
        }

        try {
            const response = await this.apiRequest('/user/preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });

            if (response.success) {
                this.currentUser.preferences = response.user.preferences;
                this.saveUserToStorage();

                // 如果主题发生变化，立即应用
                if (preferences.theme && window.applyCombinedTheme) {
                    window.applyCombinedTheme(preferences.theme);
                }
            }

            return response;
        } catch (error) {
            console.error('更新偏好设置失败:', error);
            throw error;
        }
    }

    /**
     * 同步本地主题设置到云端
     */
    async syncThemeToCloud(theme) {
        if (!this.isLoggedIn) {
            return; // 未登录时不进行同步
        }

        try {
            await this.updatePreferences({ theme });
            console.log('主题设置已同步到云端');
        } catch (error) {
            console.warn('主题同步到云端失败:', error);
            // 不抛出错误，因为这不是关键功能
        }
    }

    /**
     * 从云端加载用户偏好设置
     */
    async loadPreferencesFromCloud() {
        if (!this.isLoggedIn || this.preferencesLoaded) {
            return;
        }

        try {
            this.preferencesLoaded = true; // 标记为已加载
            const response = await this.apiRequest('/user/profile');
            if (response.success && response.user.preferences) {
                const cloudPreferences = response.user.preferences;

                // 应用云端主题设置
                if (cloudPreferences.theme && window.applyCombinedTheme) {
                    window.applyCombinedTheme(cloudPreferences.theme);
                }

                // 应用其他偏好设置
                if (cloudPreferences.language) {
                    // 这里可以添加语言切换逻辑
                    console.log('应用云端语言设置:', cloudPreferences.language);
                }

                // 更新本地存储的用户数据
                this.currentUser.preferences = cloudPreferences;
                this.saveUserToStorage();
            }
        } catch (error) {
            console.warn('从云端加载偏好设置失败:', error);
            this.preferencesLoaded = false; // 加载失败时重置标志
        }
    }
}

// 全局函数，供HTML调用
function switchToLogin() {
    if (window.userManager) {
        window.userManager.switchToLogin();
    }
}

function switchToRegister() {
    if (window.userManager) {
        window.userManager.switchToRegister();
    }
}

function showForgotPassword() {
    if (window.userManager) {
        window.userManager.showForgotPassword();
    }
}

// 初始化用户管理器
document.addEventListener('DOMContentLoaded', () => {
    window.userManager = new UserManager();
});

console.log("user.js: User Management System loaded successfully!");
