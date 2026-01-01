// user.js - 本地用户状态管理（纯前端版本，无需后端）

console.log("user.js: Loading Local User Management System...");

/**
 * 本地用户状态管理类
 * 所有数据存储在浏览器 localStorage 中，无需后端服务器
 */
class UserManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        
        // 从localStorage恢复用户状态
        this.loadUserFromStorage();
        
        // 绑定事件监听器
        this.bindEventListeners();
        
        console.log("UserManager initialized (local mode). User:", this.currentUser?.username || 'Guest');
    }

    /**
     * 从localStorage加载用户状态
     */
    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('opticsLab_localUser');
            
            if (userData) {
                this.currentUser = JSON.parse(userData);
                this.isLoggedIn = true;
                this.updateUI();
            } else {
                // 自动创建一个本地用户
                this.createLocalUser();
            }
        } catch (error) {
            console.error("Error loading user from storage:", error);
            this.createLocalUser();
        }
    }

    /**
     * 创建本地用户（自动生成）
     */
    createLocalUser() {
        const userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const defaultUsername = '本地用户_' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        this.currentUser = {
            id: userId,
            username: defaultUsername,
            createdAt: new Date().toISOString(),
            preferences: {
                theme: 'light-ui-dark-canvas',
                language: 'zh-CN'
            }
        };
        
        this.isLoggedIn = true;
        this.saveUserToStorage();
        this.updateUI();
        
        console.log("Created local user:", this.currentUser.username);
    }

    /**
     * 保存用户数据到localStorage
     */
    saveUserToStorage() {
        if (this.currentUser) {
            localStorage.setItem('opticsLab_localUser', JSON.stringify(this.currentUser));
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEventListeners() {
        // 用户名编辑按钮
        const userActionBtn = document.getElementById('user-action-btn-top');
        if (userActionBtn) {
            userActionBtn.addEventListener('click', () => {
                this.showEditUsernameModal();
            });
        }
    }

    /**
     * 显示编辑用户名模态框
     */
    showEditUsernameModal() {
        const newUsername = prompt('请输入您的用户名：', this.currentUser?.username || '');
        if (newUsername && newUsername.trim()) {
            this.currentUser.username = newUsername.trim();
            this.saveUserToStorage();
            this.updateUI();
            this.showSuccess('用户名已更新！');
        }
    }

    /**
     * 更新UI状态
     */
    updateUI() {
        const userStatus = document.getElementById('user-status-top');
        const userActionBtn = document.getElementById('user-action-btn-top');
        const logoutBtn = document.getElementById('logout-btn-top');
        const userScenesBtn = document.getElementById('user-scenes-btn-top');

        // 显示用户名
        if (userStatus) {
            userStatus.textContent = this.currentUser?.username || '本地用户';
        }
        
        // 修改按钮为"修改用户名"
        if (userActionBtn) {
            userActionBtn.textContent = '修改用户名';
            userActionBtn.style.display = 'inline-block';
        }
        
        // 隐藏不需要的按钮
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userScenesBtn) userScenesBtn.style.display = 'none';
    }

    /**
     * 显示成功信息
     */
    showSuccess(message) {
        // 使用全局临时消息系统（如果存在）
        if (window.showTemporaryMessage) {
            window.showTemporaryMessage(message, 'success');
            return;
        }
        
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
     * 获取当前用户信息
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * 检查是否已登录（本地模式始终返回true）
     */
    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    /**
     * 获取认证token（本地模式返回null）
     */
    getAuthToken() {
        return null;
    }

    /**
     * 更新用户偏好设置（本地存储）
     */
    updatePreferences(preferences) {
        if (this.currentUser) {
            this.currentUser.preferences = {
                ...this.currentUser.preferences,
                ...preferences
            };
            this.saveUserToStorage();
        }
        return { success: true };
    }

    /**
     * 同步主题设置（本地存储）
     * 注意：不要在这里调用 applyCombinedTheme，避免无限递归
     */
    syncThemeToCloud(theme) {
        if (this.currentUser) {
            this.currentUser.preferences = {
                ...this.currentUser.preferences,
                theme: theme
            };
            this.saveUserToStorage();
        }
        console.log('主题设置已保存到本地');
    }
}

// 初始化用户管理器
document.addEventListener('DOMContentLoaded', () => {
    window.userManager = new UserManager();
});

console.log("user.js: Local User Management System loaded successfully!");
