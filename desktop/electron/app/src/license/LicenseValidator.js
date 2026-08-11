/**
 * LicenseValidator.js - Client-side License Validation (Zero Backend)
 *
 * Implements a hybrid validation approach:
 * - Offline validation for basic license checking
 * - Optional online validation for enhanced security
 *
 * License Key Format: BASE64_DATA.SIGNATURE
 * Data Format: email|plan|expiryDate
 */

export class LicenseValidator {
    constructor() {
        this.licenseKey = localStorage.getItem('opticslab_license');
        this.licenseData = null;

        // Public keys for signature verification (rotate periodically)
        this.publicKeys = [
            'a1b2c3d4e5f6g7h8', // Current key
            'i9j0k1l2m3n4o5p6'  // Previous key (for grace period)
        ];

        // Feature matrix
        this.features = {
            free: [
                'basic_export',
                'local_storage',
                'basic_presets'
            ],
            pro: [
                'basic_export',
                'local_storage',
                'basic_presets',
                'cloud_sync',
                'hd_export',
                'advanced_presets',
                'batch_export',
                'paper_templates',
                'priority_support',
                'no_watermark'
            ],
            education: [
                'basic_export',
                'local_storage',
                'basic_presets',
                'cloud_sync',
                'hd_export',
                'advanced_presets',
                'batch_export',
                'paper_templates',
                'education_presets',
                'course_templates'
            ],
            team: [
                'basic_export',
                'local_storage',
                'basic_presets',
                'cloud_sync',
                'hd_export',
                'advanced_presets',
                'batch_export',
                'paper_templates',
                'priority_support',
                'no_watermark',
                'team_sharing',
                'collaboration',
                'team_management'
            ],
            enterprise: ['*'] // All features
        };

        // Initialize validation
        this._validate();
    }

    /**
     * Validate the current license key
     * @returns {Object} Validation result
     */
    _validate() {
        if (!this.licenseKey) {
            this.licenseData = { valid: false, plan: 'free' };
            return this.licenseData;
        }

        try {
            // Parse license key
            const [dataB64, signature] = this.licenseKey.split('.');
            if (!dataB64 || !signature) {
                throw new Error('Invalid license format');
            }

            // Decode data
            const data = atob(dataB64);
            const [email, plan, expiryDate] = data.split('|');

            // Verify signature (simplified - in production use RSA)
            const isValidSignature = this.publicKeys.includes(signature);
            if (!isValidSignature) {
                this.licenseData = {
                    valid: false,
                    plan: 'free',
                    error: 'Invalid signature'
                };
                return this.licenseData;
            }

            // Verify expiry date
            const expiry = new Date(expiryDate);
            if (expiry < new Date()) {
                this.licenseData = {
                    valid: false,
                    plan: 'free',
                    error: 'License expired',
                    expiredPlan: plan,
                    expiryDate: expiryDate
                };
                return this.licenseData;
            }

            // Valid license
            this.licenseData = {
                valid: true,
                plan: plan,
                email: email,
                expiryDate: expiryDate
            };

            return this.licenseData;

        } catch (e) {
            console.warn('License validation error:', e.message);
            this.licenseData = {
                valid: false,
                plan: 'free',
                error: 'Invalid format'
            };
            return this.licenseData;
        }
    }

    /**
     * Activate a license key
     * @param {string} licenseKey - The license key to activate
     * @returns {Object} Validation result
     */
    activate(licenseKey) {
        this.licenseKey = licenseKey.trim();
        localStorage.setItem('opticslab_license', this.licenseKey);
        return this._validate();
    }

    /**
     * Deactivate the current license
     */
    deactivate() {
        this.licenseKey = null;
        this.licenseData = null;
        localStorage.removeItem('opticslab_license');
    }

    /**
     * Get the current plan
     * @returns {string} Plan name (free, pro, education, team, enterprise)
     */
    getPlan() {
        if (!this.licenseData) {
            this._validate();
        }
        return this.licenseData?.plan || 'free';
    }

    /**
     * Check if a feature is available in the current plan
     * @param {string} feature - Feature identifier
     * @returns {boolean} True if feature is available
     */
    hasFeature(feature) {
        const plan = this.getPlan();
        const planFeatures = this.features[plan] || this.features.free;

        // Enterprise has all features
        if (planFeatures.includes('*')) {
            return true;
        }

        return planFeatures.includes(feature);
    }

    /**
     * Get license information
     * @returns {Object} License data
     */
    getLicenseInfo() {
        if (!this.licenseData) {
            this._validate();
        }
        return this.licenseData;
    }

    /**
     * Check if license is valid
     * @returns {boolean} True if license is valid
     */
    isValid() {
        if (!this.licenseData) {
            this._validate();
        }
        return this.licenseData?.valid || false;
    }

    /**
     * Get days until expiry
     * @returns {number} Days until expiry, or null if no valid license
     */
    getDaysUntilExpiry() {
        if (!this.isValid()) {
            return null;
        }

        const expiry = new Date(this.licenseData.expiryDate);
        const now = new Date();
        const diffTime = expiry - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Check if license is expiring soon (within 30 days)
     * @returns {boolean} True if expiring soon
     */
    isExpiringSoon() {
        const days = this.getDaysUntilExpiry();
        return days !== null && days <= 30 && days > 0;
    }

    /**
     * Get plan display name
     * @param {string} plan - Plan identifier
     * @returns {string} Display name
     */
    getPlanDisplayName(plan = null) {
        const p = plan || this.getPlan();
        const names = {
            free: 'Free',
            pro: 'Professional',
            education: 'Education',
            team: 'Team',
            enterprise: 'Enterprise'
        };
        return names[p] || 'Free';
    }

    /**
     * Get upgrade URL
     * @returns {string} URL to upgrade page
     */
    getUpgradeUrl() {
        return 'https://opticslab.app/pricing';
    }
}
