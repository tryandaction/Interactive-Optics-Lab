/**
 * ExportUI.js - 导出UI组件
 * 提供导出配置对话框、预览和裁剪功能
 * 
 * Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.6
 */

import { ExportEngine, ExportFormat, getExportEngine } from './ExportEngine.js';

/**
 * 导出配置对话框类
 */
export class ExportDialog {
    /**
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        /** @type {ExportEngine} */
        this.exportEngine = options.exportEngine || getExportEngine();

        /** @type {Object|null} 初始配置覆盖 */
        this.initialConfig = options.initialConfig || null;
        
        /** @type {HTMLElement|null} */
        this.dialogElement = null;
        
        /** @type {HTMLElement|null} */
        this.previewElement = null;
        
        /** @type {Object|null} */
        this.currentScene = null;
        
        /** @type {Object} 当前配置 */
        this.config = { ...this.exportEngine.getConfig() };
        
        /** @type {Function|null} */
        this.onExport = options.onExport || null;
        
        /** @type {Function|null} */
        this.onCancel = options.onCancel || null;
        
        /** @type {boolean} */
        this.isOpen = false;
        
        /** @type {number|null} */
        this.previewDebounceTimer = null;
    }

    /**
     * 打开导出对话框
     * @param {Object} scene - 要导出的场景
     */
    open(scene) {
        this.currentScene = scene;
        this.config = {
            ...this.exportEngine.getConfig(),
            ...(this.initialConfig || {})
        };
        
        if (!this.dialogElement) {
            this._createDialog();
        }

        if (this.config.exportPurpose) {
            this._applyPurposePreset(this.config.exportPurpose, { skipPreview: true, skipTemplateReset: true });
        } else {
            this._syncUIWithConfig();
        }
        
        this.dialogElement.style.display = 'flex';
        this.isOpen = true;

        this._updateScopeVisibility();
        
        // 生成初始预览
        this._updatePreview();
        
        // 添加键盘事件
        document.addEventListener('keydown', this._handleKeyDown);
    }

    /**
     * 关闭对话框
     */
    close() {
        if (this.dialogElement) {
            this.dialogElement.style.display = 'none';
        }
        this.isOpen = false;
        document.removeEventListener('keydown', this._handleKeyDown);
        
        if (this.onCancel) {
            this.onCancel();
        }
    }

    /**
     * 创建对话框DOM
     * @private
     */
    _createDialog() {
        // 创建遮罩层
        this.dialogElement = document.createElement('div');
        this.dialogElement.className = 'export-dialog-overlay';
        this.dialogElement.innerHTML = this._getDialogHTML();
        
        document.body.appendChild(this.dialogElement);
        
        // 注入样式
        this._injectStyles();
        
        // 绑定事件
        this._bindEvents();
    }

    /**
     * 获取对话框HTML
     * @private
     */
    _getDialogHTML() {
        const templates = this.exportEngine.getTemplates();
        const templateOptions = Object.entries(templates)
            .map(([key, t]) => `<option value="${key}">${t.name || key}</option>`)
            .join('');

        return `
<div class="export-dialog">
    <div class="export-dialog-header">
        <h2>导出光路图</h2>
        <button class="export-dialog-close" aria-label="关闭">&times;</button>
    </div>
    
    <div class="export-dialog-body">
        <div class="export-dialog-preview">
            <div class="preview-container">
                <div class="preview-loading">生成预览中...</div>
                <img class="preview-image" alt="导出预览" />
            </div>
            <div class="preview-info">
                <span class="preview-size">--</span>
                <span class="preview-scope">--</span>
                <span class="preview-format">--</span>
            </div>
        </div>
        
        <div class="export-dialog-options">
            <div class="option-group">
                <label>导出用途</label>
                <select id="export-purpose">
                    <option value="">自定义</option>
                    <option value="research">日常科研</option>
                    <option value="paper">论文/出版</option>
                </select>
                <span class="option-hint" id="export-purpose-hint">选择用途可快速套用推荐参数</span>
            </div>
            <div class="option-group">
                <label>预设模板</label>
                <select id="export-template">
                    <option value="">自定义</option>
                    ${templateOptions}
                </select>
            </div>
            
            <div class="option-group">
                <label>导出格式</label>
                <select id="export-format">
                    <option value="svg">SVG (矢量图)</option>
                    <option value="png">PNG (位图)</option>
                    <option value="pdf">PDF (文档)</option>
                </select>
            </div>

            <div class="option-group">
                <label>导出范围</label>
                <select id="export-scope">
                    <option value="canvas">全画布</option>
                    <option value="content">内容自适应</option>
                    <option value="crop">自定义裁剪</option>
                </select>
                <span class="option-hint" id="export-scope-hint">内容自适应会根据图形自动计算尺寸</span>
            </div>

            <div class="option-group" id="export-content-padding-group">
                <label>内容边距 (px)</label>
                <input type="number" id="export-content-padding" min="0" max="500" value="${this.config.contentPadding ?? 30}" />
            </div>

            <div class="option-group" id="export-crop-group">
                <label>裁剪区域 (px)</label>
                <div class="option-row">
                    <div class="option-group">
                        <label>X</label>
                        <input type="number" id="export-crop-x" value="${this.config.cropArea?.x ?? 0}" />
                    </div>
                    <div class="option-group">
                        <label>Y</label>
                        <input type="number" id="export-crop-y" value="${this.config.cropArea?.y ?? 0}" />
                    </div>
                </div>
                <div class="option-row">
                    <div class="option-group">
                        <label>宽度</label>
                        <input type="number" id="export-crop-width" min="1" value="${this.config.cropArea?.width ?? 500}" />
                    </div>
                    <div class="option-group">
                        <label>高度</label>
                        <input type="number" id="export-crop-height" min="1" value="${this.config.cropArea?.height ?? 300}" />
                    </div>
                </div>
            </div>
            
            <div class="option-row">
                <div class="option-group">
                    <label>宽度 (px)</label>
                    <input type="number" id="export-width" min="100" max="10000" value="${this.config.width}" />
                </div>
                <div class="option-group">
                    <label>高度 (px)</label>
                    <input type="number" id="export-height" min="100" max="10000" value="${this.config.height}" />
                </div>
            </div>
            
            <div class="option-group">
                <label>DPI (分辨率)</label>
                <input type="number" id="export-dpi" min="72" max="1200" value="${this.config.dpi}" />
                <span class="option-hint">仅对PNG/PDF有效</span>
            </div>

            <div class="option-row">
                <div class="option-group">
                    <label>线宽系数</label>
                    <input type="number" id="export-stroke-scale" min="0.1" max="5" step="0.1" value="${this.config.strokeScale ?? 1}" />
                </div>
                <div class="option-group">
                    <label>字体系数</label>
                    <input type="number" id="export-font-scale" min="0.5" max="3" step="0.1" value="${this.config.fontScale ?? 1}" />
                </div>
            </div>

            <div class="option-group">
                <label>图标缩放</label>
                <input type="number" id="export-icon-scale" min="0.2" max="5" step="0.1" value="${this.config.iconScale ?? 1}" />
            </div>
            
            <div class="option-group">
                <label>背景颜色</label>
                <div class="color-input-wrapper">
                    <input type="color" id="export-bgcolor" value="${this.config.backgroundColor}" />
                    <input type="text" id="export-bgcolor-text" value="${this.config.backgroundColor}" />
                    <label class="checkbox-label">
                        <input type="checkbox" id="export-transparent" />
                        透明背景
                    </label>
                </div>
            </div>
            
            <div class="option-group checkboxes">
                <label class="checkbox-label">
                    <input type="checkbox" id="export-annotations" ${this.config.includeAnnotations ? 'checked' : ''} />
                    包含标注
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="export-notes" ${this.config.includeNotes ? 'checked' : ''} />
                    包含技术说明
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="export-grid" ${this.config.includeGrid ? 'checked' : ''} />
                    包含网格
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="export-diagram-links" ${this.config.includeDiagramLinks ? 'checked' : ''} />
                    包含连接光线
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="export-professional-labels" ${this.config.includeProfessionalLabels ? 'checked' : ''} />
                    包含专业标注
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" id="export-professional-icons" ${this.config.useProfessionalIcons ? 'checked' : ''} />
                    使用专业图标
                </label>
            </div>
        </div>
    </div>
    
    <div class="export-dialog-footer">
        <button class="btn btn-secondary" id="export-cancel">取消</button>
        <button class="btn btn-primary" id="export-confirm">导出</button>
    </div>
</div>`;
    }


    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        const dialog = this.dialogElement;
        
        // 关闭按钮
        dialog.querySelector('.export-dialog-close').addEventListener('click', () => this.close());
        dialog.querySelector('#export-cancel').addEventListener('click', () => this.close());
        
        // 点击遮罩关闭
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                this.close();
            }
        });
        
        // 导出按钮
        dialog.querySelector('#export-confirm').addEventListener('click', () => this._handleExport());

        // 用途选择
        const purposeSelect = dialog.querySelector('#export-purpose');
        if (purposeSelect) {
            purposeSelect.addEventListener('change', (e) => {
                this._applyPurposePreset(e.target.value || '');
            });
        }

        // 模板选择
        dialog.querySelector('#export-template').addEventListener('change', (e) => {
            if (e.target.value) {
                this._applyTemplate(e.target.value);
            }
        });
        
        // 格式选择
        dialog.querySelector('#export-format').addEventListener('change', (e) => {
            this.config.format = e.target.value;
            this._updatePreviewDebounced();
        });

        // 导出范围
        const scopeSelect = dialog.querySelector('#export-scope');
        if (scopeSelect) {
            scopeSelect.addEventListener('change', (e) => {
                this.config.exportScope = e.target.value;
                this._updateScopeVisibility();
                if (this.config.exportScope === 'crop') {
                    this._updateCropAreaFromInputs();
                }
                this._updatePreviewDebounced();
            });
        }

        // 内容边距
        const paddingInput = dialog.querySelector('#export-content-padding');
        if (paddingInput) {
            paddingInput.addEventListener('input', (e) => {
                this.config.contentPadding = parseInt(e.target.value) || 0;
                this._updatePreviewDebounced();
            });
        }

        // 裁剪区域
        const cropInputs = [
            dialog.querySelector('#export-crop-x'),
            dialog.querySelector('#export-crop-y'),
            dialog.querySelector('#export-crop-width'),
            dialog.querySelector('#export-crop-height')
        ].filter(Boolean);
        if (cropInputs.length) {
            cropInputs.forEach(input => {
                input.addEventListener('input', () => {
                    this._updateCropAreaFromInputs();
                    this._updatePreviewDebounced();
                });
            });
        }

        // 尺寸输入
        dialog.querySelector('#export-width').addEventListener('input', (e) => {
            this.config.width = parseInt(e.target.value) || 1920;
            this._updatePreviewDebounced();
        });
        
        dialog.querySelector('#export-height').addEventListener('input', (e) => {
            this.config.height = parseInt(e.target.value) || 1080;
            this._updatePreviewDebounced();
        });
        
        // DPI输入
        dialog.querySelector('#export-dpi').addEventListener('input', (e) => {
            this.config.dpi = parseInt(e.target.value) || 300;
            this._updatePreviewDebounced();
        });

        // 线宽/字体/图标缩放
        const strokeScaleInput = dialog.querySelector('#export-stroke-scale');
        if (strokeScaleInput) {
            strokeScaleInput.addEventListener('input', (e) => {
                this.config.strokeScale = parseFloat(e.target.value) || 1;
                this._updatePreviewDebounced();
            });
        }
        const fontScaleInput = dialog.querySelector('#export-font-scale');
        if (fontScaleInput) {
            fontScaleInput.addEventListener('input', (e) => {
                this.config.fontScale = parseFloat(e.target.value) || 1;
                this._updatePreviewDebounced();
            });
        }
        const iconScaleInput = dialog.querySelector('#export-icon-scale');
        if (iconScaleInput) {
            iconScaleInput.addEventListener('input', (e) => {
                this.config.iconScale = parseFloat(e.target.value) || 1;
                this._updatePreviewDebounced();
            });
        }
        
        // 背景颜色
        dialog.querySelector('#export-bgcolor').addEventListener('input', (e) => {
            this.config.backgroundColor = e.target.value;
            dialog.querySelector('#export-bgcolor-text').value = e.target.value;
            dialog.querySelector('#export-transparent').checked = false;
            this._updatePreviewDebounced();
        });
        
        dialog.querySelector('#export-bgcolor-text').addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                this.config.backgroundColor = color;
                dialog.querySelector('#export-bgcolor').value = color;
                dialog.querySelector('#export-transparent').checked = false;
                this._updatePreviewDebounced();
            }
        });
        
        dialog.querySelector('#export-transparent').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.config.backgroundColor = 'transparent';
            } else {
                this.config.backgroundColor = dialog.querySelector('#export-bgcolor').value;
            }
            this._updatePreviewDebounced();
        });
        
        // 复选框
        dialog.querySelector('#export-annotations').addEventListener('change', (e) => {
            this.config.includeAnnotations = e.target.checked;
            this._updatePreviewDebounced();
        });
        
        dialog.querySelector('#export-notes').addEventListener('change', (e) => {
            this.config.includeNotes = e.target.checked;
            this._updatePreviewDebounced();
        });
        
        dialog.querySelector('#export-grid').addEventListener('change', (e) => {
            this.config.includeGrid = e.target.checked;
            this._updatePreviewDebounced();
        });

        dialog.querySelector('#export-diagram-links').addEventListener('change', (e) => {
            this.config.includeDiagramLinks = e.target.checked;
            this._updatePreviewDebounced();
        });

        dialog.querySelector('#export-professional-labels').addEventListener('change', (e) => {
            this.config.includeProfessionalLabels = e.target.checked;
            this._updatePreviewDebounced();
        });

        const professionalIconsToggle = dialog.querySelector('#export-professional-icons');
        if (professionalIconsToggle) {
            professionalIconsToggle.addEventListener('change', (e) => {
                this.config.useProfessionalIcons = e.target.checked;
                this._updatePreviewDebounced();
            });
        }
    }

    /**
     * 键盘事件处理
     * @private
     */
    _handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            this._handleExport();
        }
    };

    /**
     * 应用模板
     * @private
     */
    _applyTemplate(templateName) {
        const template = this.exportEngine.getTemplate(templateName);
        if (!template) return;
        
        this.config = { ...this.config, ...template, exportPurpose: template.exportPurpose ?? '' };

        this._syncUIWithConfig();
        this._updatePreview();
    }

    /**
     * 应用用途预设
     * @private
     */
    _applyPurposePreset(purpose, options = {}) {
        this.config.exportPurpose = purpose || '';
        if (!purpose) {
            this._syncUIWithConfig();
            if (!options.skipPreview) {
                this._updatePreview();
            }
            return;
        }

        const presets = this._getPurposePresets();
        const preset = presets[purpose];
        if (!preset) {
            this._syncUIWithConfig();
            if (!options.skipPreview) {
                this._updatePreview();
            }
            return;
        }

        this.config = { ...this.config, ...preset, exportPurpose: purpose };
        if (!options.skipTemplateReset) {
            const templateSelect = this.dialogElement?.querySelector('#export-template');
            if (templateSelect) {
                templateSelect.value = '';
            }
        }

        this._syncUIWithConfig();
        if (!options.skipPreview) {
            this._updatePreview();
        }
    }

    /**
     * 用途预设配置
     * @private
     */
    _getPurposePresets() {
        return {
            research: {
                format: 'png',
                width: 1920,
                height: 1080,
                dpi: 150,
                backgroundColor: '#ffffff',
                includeNotes: true,
                includeGrid: true,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: false,
                exportScope: 'canvas',
                contentPadding: 20,
                fontScale: 1,
                strokeScale: 1,
                iconScale: 1
            },
            paper: {
                format: 'pdf',
                width: 3000,
                height: 2000,
                dpi: 300,
                backgroundColor: '#ffffff',
                includeNotes: false,
                includeGrid: false,
                includeAnnotations: true,
                includeDiagramLinks: true,
                includeProfessionalLabels: true,
                useProfessionalIcons: true,
                exportScope: 'content',
                contentPadding: 20,
                fontScale: 1,
                strokeScale: 1,
                iconScale: 1
            }
        };
    }

    /**
     * 更新用途提示
     * @private
     */
    _updatePurposeHint(purpose) {
        const hint = this.dialogElement?.querySelector('#export-purpose-hint');
        if (!hint) return;
        if (purpose === 'research') {
            hint.textContent = '适合日常科研记录，含网格与技术说明';
        } else if (purpose === 'paper') {
            hint.textContent = '适合论文/出版，默认内容自适应与专业图标';
        } else {
            hint.textContent = '选择用途可快速套用推荐参数';
        }
    }

    /**
     * 同步UI与当前配置
     * @private
     */
    _syncUIWithConfig() {
        if (!this.dialogElement) return;
        const dialog = this.dialogElement;

        const purposeSelect = dialog.querySelector('#export-purpose');
        if (purposeSelect) purposeSelect.value = this.config.exportPurpose || '';
        this._updatePurposeHint(this.config.exportPurpose || '');

        const formatSelect = dialog.querySelector('#export-format');
        if (formatSelect) formatSelect.value = this.config.format;

        const scopeSelect = dialog.querySelector('#export-scope');
        if (scopeSelect) scopeSelect.value = this.config.exportScope || 'canvas';

        const paddingInput = dialog.querySelector('#export-content-padding');
        if (paddingInput) paddingInput.value = this.config.contentPadding ?? 30;

        const cropArea = this.config.cropArea || {};
        const cropX = dialog.querySelector('#export-crop-x');
        const cropY = dialog.querySelector('#export-crop-y');
        const cropW = dialog.querySelector('#export-crop-width');
        const cropH = dialog.querySelector('#export-crop-height');
        if (cropX) cropX.value = cropArea.x ?? 0;
        if (cropY) cropY.value = cropArea.y ?? 0;
        if (cropW) cropW.value = cropArea.width ?? 500;
        if (cropH) cropH.value = cropArea.height ?? 300;

        const widthInput = dialog.querySelector('#export-width');
        const heightInput = dialog.querySelector('#export-height');
        if (widthInput) widthInput.value = this.config.width;
        if (heightInput) heightInput.value = this.config.height;

        const dpiInput = dialog.querySelector('#export-dpi');
        if (dpiInput) dpiInput.value = this.config.dpi;

        const strokeScaleInput = dialog.querySelector('#export-stroke-scale');
        if (strokeScaleInput) strokeScaleInput.value = this.config.strokeScale ?? 1;
        const fontScaleInput = dialog.querySelector('#export-font-scale');
        if (fontScaleInput) fontScaleInput.value = this.config.fontScale ?? 1;
        const iconScaleInput = dialog.querySelector('#export-icon-scale');
        if (iconScaleInput) iconScaleInput.value = this.config.iconScale ?? 1;

        if (this.config.backgroundColor === 'transparent') {
            const transparent = dialog.querySelector('#export-transparent');
            if (transparent) transparent.checked = true;
        } else {
            const bgColor = dialog.querySelector('#export-bgcolor');
            const bgText = dialog.querySelector('#export-bgcolor-text');
            const transparent = dialog.querySelector('#export-transparent');
            if (bgColor) bgColor.value = this.config.backgroundColor;
            if (bgText) bgText.value = this.config.backgroundColor;
            if (transparent) transparent.checked = false;
        }

        const annotationsToggle = dialog.querySelector('#export-annotations');
        if (annotationsToggle) annotationsToggle.checked = this.config.includeAnnotations !== false;
        const notesToggle = dialog.querySelector('#export-notes');
        if (notesToggle) notesToggle.checked = this.config.includeNotes !== false;
        const gridToggle = dialog.querySelector('#export-grid');
        if (gridToggle) gridToggle.checked = this.config.includeGrid === true;
        const linksToggle = dialog.querySelector('#export-diagram-links');
        if (linksToggle) linksToggle.checked = this.config.includeDiagramLinks !== false;
        const labelsToggle = dialog.querySelector('#export-professional-labels');
        if (labelsToggle) labelsToggle.checked = this.config.includeProfessionalLabels !== false;
        const iconsToggle = dialog.querySelector('#export-professional-icons');
        if (iconsToggle) iconsToggle.checked = this.config.useProfessionalIcons === true;

        this._updateScopeVisibility();
    }

    /**
     * 更新范围相关控件显示
     * @private
     */
    _updateScopeVisibility() {
        if (!this.dialogElement) return;
        const scope = this.config.exportScope || 'canvas';
        const dialog = this.dialogElement;

        const paddingGroup = dialog.querySelector('#export-content-padding-group');
        const cropGroup = dialog.querySelector('#export-crop-group');
        if (paddingGroup) {
            paddingGroup.style.display = scope === 'content' || scope === 'crop' ? 'block' : 'none';
        }
        if (cropGroup) {
            cropGroup.style.display = scope === 'crop' ? 'block' : 'none';
        }

        const widthInput = dialog.querySelector('#export-width');
        const heightInput = dialog.querySelector('#export-height');
        const disableSize = scope === 'content' || scope === 'crop';
        if (widthInput) widthInput.disabled = disableSize;
        if (heightInput) heightInput.disabled = disableSize;

        const scopeHint = dialog.querySelector('#export-scope-hint');
        if (scopeHint) {
            if (scope === 'content') {
                scopeHint.textContent = '根据图形内容自动计算尺寸';
            } else if (scope === 'crop') {
                scopeHint.textContent = '使用指定裁剪区域导出';
            } else {
                scopeHint.textContent = '使用当前画布尺寸导出';
            }
        }

        if (scope === 'crop' && !this.config.cropArea) {
            this._updateCropAreaFromInputs();
        }
    }

    /**
     * 从裁剪输入更新配置
     * @private
     */
    _updateCropAreaFromInputs() {
        if (!this.dialogElement) return;
        const dialog = this.dialogElement;
        const x = parseFloat(dialog.querySelector('#export-crop-x')?.value) || 0;
        const y = parseFloat(dialog.querySelector('#export-crop-y')?.value) || 0;
        const width = parseFloat(dialog.querySelector('#export-crop-width')?.value) || 0;
        const height = parseFloat(dialog.querySelector('#export-crop-height')?.value) || 0;
        if (width > 0 && height > 0) {
            this.config.cropArea = { x, y, width, height };
        } else {
            this.config.cropArea = null;
        }
    }

    /**
     * 设置初始配置覆盖
     */
    setInitialConfig(config) {
        this.initialConfig = config || null;
    }

    /**
     * 防抖更新预览
     * @private
     */
    _updatePreviewDebounced() {
        if (this.previewDebounceTimer) {
            clearTimeout(this.previewDebounceTimer);
        }
        this.previewDebounceTimer = setTimeout(() => {
            this._updatePreview();
        }, 300);
    }

    /**
     * 更新预览
     * @private
     */
    async _updatePreview() {
        if (!this.currentScene || !this.dialogElement) return;
        
        const previewContainer = this.dialogElement.querySelector('.preview-container');
        const previewImage = this.dialogElement.querySelector('.preview-image');
        const previewLoading = this.dialogElement.querySelector('.preview-loading');
        const previewSize = this.dialogElement.querySelector('.preview-size');
        const previewScope = this.dialogElement.querySelector('.preview-scope');
        const previewFormat = this.dialogElement.querySelector('.preview-format');
        
        // 显示加载状态
        previewLoading.style.display = 'block';
        previewImage.style.display = 'none';
        
        try {
            const previewUrl = await this.exportEngine.generatePreview(this.currentScene, this.config);
            
            previewImage.src = previewUrl;
            previewImage.style.display = 'block';
            previewLoading.style.display = 'none';
            
            const layout = this.exportEngine.getExportLayout(this.currentScene, this.config);

            // 更新信息
            previewSize.textContent = `${layout.width} × ${layout.height} px`;
            if (previewScope) {
                const scopeLabel = layout.scope === 'content'
                    ? '内容自适应'
                    : layout.scope === 'crop'
                        ? '裁剪'
                        : '全画布';
                const purposeLabel = this.config.exportPurpose === 'paper'
                    ? '论文'
                    : this.config.exportPurpose === 'research'
                        ? '科研'
                        : '自定义';
                previewScope.textContent = `${scopeLabel} / ${purposeLabel}`;
            }
            previewFormat.textContent = this.config.format.toUpperCase();
            
            // 估算文件大小
            this._estimateFileSize(layout.width, layout.height);

            if (this.config.exportScope === 'content' || this.config.exportScope === 'crop') {
                const widthInput = this.dialogElement.querySelector('#export-width');
                const heightInput = this.dialogElement.querySelector('#export-height');
                if (widthInput) widthInput.value = layout.width;
                if (heightInput) heightInput.value = layout.height;
            }
            
        } catch (error) {
            console.error('ExportDialog: Preview generation failed:', error);
            previewLoading.textContent = '预览生成失败';
        }
    }

    /**
     * 估算文件大小
     * @private
     */
    _estimateFileSize(width, height) {
        const { dpi, format } = this.config;
        let estimatedSize = 0;
        
        switch (format) {
            case 'svg':
                // SVG大小取决于内容复杂度，粗略估算
                estimatedSize = 10 * 1024; // 10KB基础
                break;
            case 'png':
                // PNG大小 ≈ 宽 × 高 × 4字节 × 压缩率(约0.3)
                const scale = dpi / 96;
                estimatedSize = width * scale * height * scale * 4 * 0.3;
                break;
            case 'pdf':
                // PDF大小取决于内容，粗略估算
                estimatedSize = 50 * 1024; // 50KB基础
                break;
        }
        
        const sizeText = estimatedSize > 1024 * 1024 
            ? `~${(estimatedSize / 1024 / 1024).toFixed(1)} MB`
            : `~${(estimatedSize / 1024).toFixed(0)} KB`;
        
        const previewFormat = this.dialogElement.querySelector('.preview-format');
        previewFormat.textContent = `${this.config.format.toUpperCase()} (${sizeText})`;
    }


    /**
     * 处理导出
     * @private
     */
    async _handleExport() {
        if (!this.currentScene) return;
        
        const confirmBtn = this.dialogElement.querySelector('#export-confirm');
        const originalText = confirmBtn.textContent;
        
        try {
            confirmBtn.textContent = '导出中...';
            confirmBtn.disabled = true;
            
            const result = await this.exportEngine.export(this.currentScene, this.config);
            
            // 触发下载
            this._downloadResult(result, this.config.format);
            
            if (this.onExport) {
                this.onExport(result, this.config);
            }
            
            this.close();
            
        } catch (error) {
            console.error('ExportDialog: Export failed:', error);
            alert(`导出失败: ${error.message}`);
        } finally {
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    }

    /**
     * 下载导出结果
     * @private
     */
    _downloadResult(result, format) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `optical-diagram-${timestamp}`;
        
        let blob;
        let extension;
        
        switch (format) {
            case 'svg':
                blob = new Blob([result], { type: 'image/svg+xml' });
                extension = 'svg';
                break;
            case 'png':
                blob = result; // 已经是Blob
                extension = 'png';
                break;
            case 'pdf':
                blob = result; // 已经是Blob
                extension = 'pdf';
                break;
            default:
                return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 注入样式
     * @private
     */
    _injectStyles() {
        const styleId = 'export-dialog-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .export-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9500;
            }

            .export-dialog {
                background: var(--dialog-bg, #2d2d2d);
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                width: 700px;
                max-width: 90vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                color: var(--text-primary, #fff);
            }

            .export-dialog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color, #444);
            }

            .export-dialog-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 500;
            }

            .export-dialog-close {
                background: none;
                border: none;
                color: var(--text-secondary, #888);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }

            .export-dialog-close:hover {
                color: var(--text-primary, #fff);
            }

            .export-dialog-body {
                display: flex;
                padding: 20px;
                gap: 20px;
                overflow-y: auto;
            }

            .export-dialog-preview {
                flex: 1;
                min-width: 250px;
            }

            .preview-container {
                background: var(--preview-bg, #1a1a1a);
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                aspect-ratio: 16/9;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .preview-loading {
                color: var(--text-secondary, #888);
                font-size: 14px;
            }

            .preview-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }

            .preview-info {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-secondary, #888);
            }

            .preview-info span {
                white-space: nowrap;
            }

            .export-dialog-options {
                flex: 1;
                min-width: 250px;
            }

            .option-group {
                margin-bottom: 16px;
            }

            .option-group label {
                display: block;
                margin-bottom: 6px;
                font-size: 13px;
                color: var(--text-secondary, #aaa);
            }

            .option-group select,
            .option-group input[type="number"],
            .option-group input[type="text"] {
                width: 100%;
                padding: 8px 10px;
                background: var(--input-bg, #1e1e1e);
                border: 1px solid var(--border-color, #444);
                border-radius: 4px;
                color: var(--text-primary, #fff);
                font-size: 14px;
            }

            .option-group select:focus,
            .option-group input:focus {
                outline: none;
                border-color: var(--accent-color, #0078d4);
            }

            .option-hint {
                display: block;
                margin-top: 4px;
                font-size: 11px;
                color: var(--text-secondary, #666);
            }

            .option-row {
                display: flex;
                gap: 12px;
            }

            .option-row .option-group {
                flex: 1;
            }

            .color-input-wrapper {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .color-input-wrapper input[type="color"] {
                width: 40px;
                height: 32px;
                padding: 2px;
                cursor: pointer;
            }

            .color-input-wrapper input[type="text"] {
                flex: 1;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: var(--text-primary, #fff);
                cursor: pointer;
            }

            .checkbox-label input[type="checkbox"] {
                width: 16px;
                height: 16px;
            }

            .option-group.checkboxes {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .export-dialog-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 20px;
                border-top: 1px solid var(--border-color, #444);
            }

            .btn {
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .btn-primary {
                background: var(--accent-color, #0078d4);
                color: #fff;
            }

            .btn-primary:hover {
                background: var(--accent-hover, #006cbd);
            }

            .btn-primary:disabled {
                background: var(--disabled-bg, #555);
                cursor: not-allowed;
            }

            .btn-secondary {
                background: var(--secondary-bg, #444);
                color: var(--text-primary, #fff);
            }

            .btn-secondary:hover {
                background: var(--secondary-hover, #555);
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 销毁对话框
     */
    destroy() {
        if (this.dialogElement) {
            this.dialogElement.remove();
            this.dialogElement = null;
        }
        document.removeEventListener('keydown', this._handleKeyDown);
    }
}


/**
 * 裁剪选择工具类
 */
export class CropSelector {
    /**
     * @param {HTMLCanvasElement} canvas - 目标Canvas
     * @param {Object} options - 配置选项
     */
    constructor(canvas, options = {}) {
        /** @type {HTMLCanvasElement} */
        this.canvas = canvas;
        
        /** @type {CanvasRenderingContext2D} */
        this.ctx = canvas.getContext('2d');
        
        /** @type {Object} 裁剪区域 */
        this.cropArea = null;
        
        /** @type {boolean} 是否正在选择 */
        this.isSelecting = false;
        
        /** @type {{x: number, y: number}|null} 起始点 */
        this.startPoint = null;
        
        /** @type {Function|null} */
        this.onCropChange = options.onCropChange || null;
        
        /** @type {boolean} */
        this.enabled = false;
        
        /** @type {string} 裁剪框颜色 */
        this.cropColor = options.cropColor || '#0078d4';
        
        /** @type {number} 最小裁剪尺寸 */
        this.minSize = options.minSize || 50;
        
        // 绑定事件处理器
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
    }

    /**
     * 启用裁剪选择
     */
    enable() {
        if (this.enabled) return;
        
        this.enabled = true;
        this.canvas.addEventListener('mousedown', this._handleMouseDown);
        this.canvas.addEventListener('mousemove', this._handleMouseMove);
        this.canvas.addEventListener('mouseup', this._handleMouseUp);
        this.canvas.style.cursor = 'crosshair';
    }

    /**
     * 禁用裁剪选择
     */
    disable() {
        if (!this.enabled) return;
        
        this.enabled = false;
        this.canvas.removeEventListener('mousedown', this._handleMouseDown);
        this.canvas.removeEventListener('mousemove', this._handleMouseMove);
        this.canvas.removeEventListener('mouseup', this._handleMouseUp);
        this.canvas.style.cursor = 'default';
        this.cropArea = null;
    }

    /**
     * 获取裁剪区域
     * @returns {Object|null}
     */
    getCropArea() {
        return this.cropArea ? { ...this.cropArea } : null;
    }

    /**
     * 设置裁剪区域
     * @param {Object} area - {x, y, width, height}
     */
    setCropArea(area) {
        this.cropArea = area ? { ...area } : null;
        if (this.onCropChange) {
            this.onCropChange(this.cropArea);
        }
    }

    /**
     * 清除裁剪区域
     */
    clearCropArea() {
        this.cropArea = null;
        if (this.onCropChange) {
            this.onCropChange(null);
        }
    }

    /**
     * 鼠标按下事件
     * @private
     */
    _handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.startPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.isSelecting = true;
    }

    /**
     * 鼠标移动事件
     * @private
     */
    _handleMouseMove(e) {
        if (!this.isSelecting || !this.startPoint) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // 计算裁剪区域
        const x = Math.min(this.startPoint.x, currentPoint.x);
        const y = Math.min(this.startPoint.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - this.startPoint.x);
        const height = Math.abs(currentPoint.y - this.startPoint.y);
        
        this.cropArea = { x, y, width, height };
        
        if (this.onCropChange) {
            this.onCropChange(this.cropArea);
        }
    }

    /**
     * 鼠标释放事件
     * @private
     */
    _handleMouseUp(e) {
        this.isSelecting = false;
        this.startPoint = null;
        
        // 检查最小尺寸
        if (this.cropArea && (this.cropArea.width < this.minSize || this.cropArea.height < this.minSize)) {
            this.cropArea = null;
            if (this.onCropChange) {
                this.onCropChange(null);
            }
        }
    }

    /**
     * 渲染裁剪框
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     */
    render(ctx) {
        if (!this.cropArea) return;
        
        const { x, y, width, height } = this.cropArea;
        
        ctx.save();
        
        // 绘制半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, y); // 上
        ctx.fillRect(0, y + height, this.canvas.width, this.canvas.height - y - height); // 下
        ctx.fillRect(0, y, x, height); // 左
        ctx.fillRect(x + width, y, this.canvas.width - x - width, height); // 右
        
        // 绘制裁剪框边框
        ctx.strokeStyle = this.cropColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x, y, width, height);
        
        // 绘制角点手柄
        ctx.setLineDash([]);
        ctx.fillStyle = this.cropColor;
        const handleSize = 8;
        
        // 四个角
        ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        
        // 显示尺寸信息
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x + width/2, y - 10);
        
        ctx.restore();
    }

    /**
     * 销毁
     */
    destroy() {
        this.disable();
    }
}

// 创建导出对话框的便捷函数
let exportDialogInstance = null;

/**
 * 获取导出对话框单例
 * @param {Object} options - 配置选项
 * @returns {ExportDialog}
 */
export function getExportDialog(options = {}) {
    if (!exportDialogInstance) {
        exportDialogInstance = new ExportDialog(options);
    } else if (options.initialConfig) {
        exportDialogInstance.setInitialConfig(options.initialConfig);
    }
    return exportDialogInstance;
}

/**
 * 打开导出对话框
 * @param {Object} scene - 场景数据
 * @param {Object} options - 配置选项
 */
export function openExportDialog(scene, options = {}) {
    const dialog = getExportDialog(options);
    dialog.open(scene);
    return dialog;
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.ExportDialog = ExportDialog;
    window.CropSelector = CropSelector;
    window.openExportDialog = openExportDialog;
}
