/**
 * LicenseUI.js - License Activation and Management UI
 *
 * Provides UI components for:
 * - License activation
 * - License status display
 * - Upgrade prompts
 */

export class LicenseUI {
    constructor(licenseValidator) {
        this.validator = licenseValidator;
        this.statusElement = null;
    }

    /**
     * Create and show license activation modal
     */
    showActivationModal() {
        const modal = document.createElement('div');
        modal.className = 'license-activation-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-color, #fff);
            border: 2px solid var(--border-color, #ccc);
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 400px;
            max-width: 500px;
        `;

        const currentInfo = this.validator.getLicenseInfo();
        const isActivated = currentInfo.valid;

        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: var(--text-color, #333);">
                ${isActivated ? '许可证管理' : '激活许可证'}
            </h3>

            ${isActivated ? `
                <div style="margin-bottom: 20px; padding: 12px; background: #e8f5e9; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; color: #2e7d32; font-weight: bold;">
                        ✓ 已激活 ${this.validator.getPlanDisplayName()} 版本
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #555;">
                        邮箱: ${currentInfo.email}<br>
                        到期日期: ${currentInfo.expiryDate}
                        ${this.validator.isExpiringSoon() ?
                            `<br><span style="color: #f57c00;">⚠ 还有 ${this.validator.getDaysUntilExpiry()} 天到期</span>`
                            : ''}
                    </p>
                </div>
            ` : `
                <p style="margin: 0 0 16px 0; color: var(--text-color, #666);">
                    输入您的许可证密钥以激活专业版功能。
                </p>
            `}

            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; color: var(--text-color, #333); font-weight: 500;">
                    许可证密钥:
                </label>
                <input
                    type="text"
                    id="license-key-input"
                    placeholder="粘贴您的许可证密钥"
                    style="
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid var(--border-color, #ccc);
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 13px;
                        box-sizing: border-box;
                    "
                    ${isActivated ? 'disabled' : ''}
                />
            </div>

            <div id="license-error-message" style="
                display: none;
                margin-bottom: 16px;
                padding: 12px;
                background: #ffebee;
                border-radius: 4px;
                color: #c62828;
                font-size: 14px;
            "></div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                ${isActivated ? `
                    <button id="license-deactivate-btn" style="
                        padding: 8px 16px;
                        border: 1px solid #d32f2f;
                        background: transparent;
                        color: #d32f2f;
                        border-radius: 4px;
                        cursor: pointer;
                    ">停用</button>
                ` : ''}
                <button id="license-cancel-btn" style="
                    padding: 8px 16px;
                    border: 1px solid var(--border-color, #ccc);
                    background: transparent;
                    border-radius: 4px;
                    cursor: pointer;
                ">取消</button>
                ${!isActivated ? `
                    <button id="license-activate-btn" style="
                        padding: 8px 16px;
                        border: none;
                        background: #007bff;
                        color: white;
                        border-radius: 4px;
                        cursor: pointer;
                    ">激活</button>
                ` : ''}
                <button id="license-purchase-btn" style="
                    padding: 8px 16px;
                    border: none;
                    background: #28a745;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">购买许可证</button>
            </div>
        `;

        document.body.appendChild(modal);

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'license-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        document.body.appendChild(backdrop);

        // Event handlers
        const closeModal = () => {
            modal.remove();
            backdrop.remove();
        };

        const showError = (message) => {
            const errorDiv = document.getElementById('license-error-message');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        };

        // Cancel button
        const cancelBtn = document.getElementById('license-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        // Backdrop click
        backdrop.addEventListener('click', closeModal);

        // Activate button
        const activateBtn = document.getElementById('license-activate-btn');
        if (activateBtn) {
            activateBtn.addEventListener('click', () => {
                const input = document.getElementById('license-key-input');
                const key = input.value.trim();

                if (!key) {
                    showError('请输入许可证密钥');
                    return;
                }

                const result = this.validator.activate(key);
                if (result.valid) {
                    alert(`许可证激活成功！\n计划: ${this.validator.getPlanDisplayName()}\n到期日期: ${result.expiryDate}`);
                    closeModal();
                    this.updateStatusDisplay();
                    // Reload page to apply license changes
                    if (confirm('许可证已激活，是否刷新页面以应用更改？')) {
                        window.location.reload();
                    }
                } else {
                    showError(result.error || '许可证无效，请检查密钥是否正确');
                }
            });
        }

        // Deactivate button
        const deactivateBtn = document.getElementById('license-deactivate-btn');
        if (deactivateBtn) {
            deactivateBtn.addEventListener('click', () => {
                if (confirm('确定要停用当前许可证吗？')) {
                    this.validator.deactivate();
                    alert('许可证已停用');
                    closeModal();
                    this.updateStatusDisplay();
                    // Reload page to apply changes
                    if (confirm('许可证已停用，是否刷新页面以应用更改？')) {
                        window.location.reload();
                    }
                }
            });
        }

        // Purchase button
        const purchaseBtn = document.getElementById('license-purchase-btn');
        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => {
                window.open(this.validator.getUpgradeUrl(), '_blank');
            });
        }

        // Allow Enter key to activate
        const input = document.getElementById('license-key-input');
        if (input && !isActivated) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    activateBtn.click();
                }
            });
            input.focus();
        }
    }

    /**
     * Create license status indicator in toolbar
     * @param {HTMLElement} container - Container element to append status to
     */
    createStatusIndicator(container) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'license-status-indicator';
        statusDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
        `;

        statusDiv.addEventListener('click', () => {
            this.showActivationModal();
        });

        statusDiv.addEventListener('mouseenter', () => {
            statusDiv.style.background = 'rgba(0,0,0,0.05)';
        });

        statusDiv.addEventListener('mouseleave', () => {
            statusDiv.style.background = 'transparent';
        });

        container.appendChild(statusDiv);
        this.statusElement = statusDiv;
        this.updateStatusDisplay();

        return statusDiv;
    }

    /**
     * Update the status indicator display
     */
    updateStatusDisplay() {
        if (!this.statusElement) return;

        const info = this.validator.getLicenseInfo();
        const plan = this.validator.getPlanDisplayName();

        if (info.valid) {
            const isExpiring = this.validator.isExpiringSoon();
            const color = isExpiring ? '#f57c00' : '#28a745';

            this.statusElement.innerHTML = `
                <span style="color: ${color};">●</span>
                <span style="color: var(--text-color, #333);">${plan}</span>
            `;

            if (isExpiring) {
                this.statusElement.title = `许可证将在 ${this.validator.getDaysUntilExpiry()} 天后到期`;
            } else {
                this.statusElement.title = `许可证有效期至 ${info.expiryDate}`;
            }
        } else {
            this.statusElement.innerHTML = `
                <span style="color: #999;">●</span>
                <span style="color: var(--text-color, #666);">Free</span>
            `;
            this.statusElement.title = '点击激活许可证';
        }
    }

    /**
     * Show expiry warning notification
     */
    showExpiryWarning() {
        if (!this.validator.isExpiringSoon()) return;

        const days = this.validator.getDaysUntilExpiry();
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            max-width: 320px;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: start; gap: 12px;">
                <span style="font-size: 24px;">⚠️</span>
                <div style="flex: 1;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; color: #856404;">
                        许可证即将到期
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #856404;">
                        您的许可证将在 ${days} 天后到期。请及时续费以继续使用专业版功能。
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <button id="expiry-renew-btn" style="
                            padding: 6px 12px;
                            border: none;
                            background: #ffc107;
                            color: #000;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 13px;
                        ">立即续费</button>
                        <button id="expiry-dismiss-btn" style="
                            padding: 6px 12px;
                            border: 1px solid #856404;
                            background: transparent;
                            color: #856404;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 13px;
                        ">关闭</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        document.getElementById('expiry-renew-btn').addEventListener('click', () => {
            window.open(this.validator.getUpgradeUrl(), '_blank');
            notification.remove();
        });

        document.getElementById('expiry-dismiss-btn').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }
}
