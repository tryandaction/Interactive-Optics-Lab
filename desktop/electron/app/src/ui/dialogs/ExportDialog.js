/**
 * ExportDialog.js - 导出对话框
 * 提供完整的导出配置和预览界面
 * 
 * Requirements: 6.5
 */

import { getExportEngine, ExportFormat } from '../../diagram/ExportEngine.js';
import { getHighDPIExporter } from '../../diagram/export/HighDPIExporter.js';
import { getEPSExporter } from '../../diagram/export/EPSExporter.js';

/**
 * 导出对话框类
 */
export class ExportDialog {
    constructor() {
        this.dialog = null;
        this.visible = false;
        this.currentScene = null;
        this.previewCanvas = null;
        
        this.exportEngine = getExportEngine();
        this.highDPIExporter = getHighDPIExporter();
        this.epsExporter = getEPSExporter();
        
        this._createDialog();
    }

    /**
     * 创建对话框
     * @private
     */
    _createDialog() {
        // 创建遮罩层
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 9998;
        `;
        
        // 创建对话框容器
        this.dialog = document.createElement('div');
        this.dialog.className = 'export-dialog';
        this.dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            max-height: 90vh;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: none;
            flex-direction: column;
            z-index: 9999;
            overflow: hidden;
        `;
        
        this._createHeader();
        this._createContent();
        this._createFooter();
        
        // 点击遮罩关闭
        this.overlay.onclick = () => this.hide();
    }

    /**
     * 创建头部
     * @private
     */
    _createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
        `;
        
        const title = document.createElement('h2');
        title.textContent = '导出光路图';
        title.style.cssText = 'margin: 0; font-size: 20px; font-weight: 600;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
        `;
        closeBtn.onclick = () => this.hide();
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        this.dialog.appendChild(header);
    }

    /**
     * 创建内容区域
     * @private
     */
    _createContent() {
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        `;
        
        // 左右分栏
        const columns = document.createElement('div');
        columns.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        `;
        
        // 左侧：设置
        const settingsColumn = document.createElement('div');
        this._createSettings(settingsColumn);
        
        // 右侧：预览
        const previewColumn = document.createElement('div');
        this._createPreview(previewColumn);
        
        columns.appendChild(settingsColumn);
        columns.appendChild(previewColumn);
        content.appendChild(columns);
        
        this.dialog.appendChild(content);
    }

    /**
     * 创建设置区域
     * @private
     */
    _createSettings(container) {
        const title = document.createElement('h3');
        title.textContent = '导出设置';
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 16px;';
        container.appendChild(title);
        
        // 格式选择
        const formatGroup = this._createFormGroup('导出格式', [
            { type: 'radio', name: 'format', value: 'svg', label: 'SVG (矢量图)', checked: true },
            { type: 'radio', name: 'format', value: 'png', label: 'PNG (位图)' },
            { type: 'radio', name: 'format', value: 'pdf', label: 'PDF (文档)' },
            { type: 'radio', name: 'format', value: 'eps', label: 'EPS (PostScript)' }
        ]);
        container.appendChild(formatGroup);
        
        // 尺寸设置
        const sizeGroup = this._createFormGroup('图像尺寸', [
            { type: 'number', name: 'width', label: '宽度 (px)', value: 1920, min: 100, max: 10000 },
            { type: 'number', name: 'height', label: '高度 (px)', value: 1080, min: 100, max: 10000 }
        ]);
        container.appendChild(sizeGroup);
        
        // DPI设置（仅PNG/PDF）
        this.dpiGroup = this._createFormGroup('分辨率', [
            { type: 'select', name: 'dpi', label: 'DPI', options: [
                { value: 96, label: '96 DPI (屏幕)' },
                { value: 150, label: '150 DPI (演示)' },
                { value: 300, label: '300 DPI (打印)', selected: true },
                { value: 600, label: '600 DPI (高质量)' }
            ]}
        ]);
        container.appendChild(this.dpiGroup);
        
        // 背景颜色
        const bgGroup = this._createFormGroup('背景', [
            { type: 'color', name: 'backgroundColor', label: '背景颜色', value: '#ffffff' },
            { type: 'checkbox', name: 'transparent', label: '透明背景' }
        ]);
        container.appendChild(bgGroup);
        
        // 包含内容
        const includeGroup = this._createFormGroup('包含内容', [
            { type: 'checkbox', name: 'includeAnnotations', label: '包含标注', checked: true },
            { type: 'checkbox', name: 'includeNotes', label: '包含技术说明', checked: true },
            { type: 'checkbox', name: 'includeGrid', label: '包含网格' }
        ]);
        container.appendChild(includeGroup);
        
        // 预设模板
        const templateGroup = this._createFormGroup('快速预设', [
            { type: 'button', label: '期刊论文', action: () => this._applyPreset('journal') },
            { type: 'button', label: '演示文稿', action: () => this._applyPreset('presentation') },
            { type: 'button', label: '网页', action: () => this._applyPreset('web') }
        ]);
        container.appendChild(templateGroup);
        
        // 监听格式变化
        const formatRadios = container.querySelectorAll('input[name="format"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.dpiGroup.style.display = 
                    (radio.value === 'png' || radio.value === 'pdf') ? 'block' : 'none';
                this._updatePreview();
            });
        });
        
        // 监听其他变化
        container.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', () => this._updatePreview());
        });
    }

    /**
     * 创建表单组
     * @private
     */
    _createFormGroup(label, fields) {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom: 20px;';
        
        const groupLabel = document.createElement('div');
        groupLabel.textContent = label;
        groupLabel.style.cssText = `
            font-size: 13px;
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
        `;
        group.appendChild(groupLabel);
        
        fields.forEach(field => {
            const fieldEl = this._createField(field);
            group.appendChild(fieldEl);
        });
        
        return group;
    }

    /**
     * 创建表单字段
     * @private
     */
    _createField(field) {
        const container = document.createElement('div');
        container.style.cssText = 'margin-bottom: 8px;';
        
        if (field.type === 'radio' || field.type === 'checkbox') {
            const label = document.createElement('label');
            label.style.cssText = `
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 13px;
            `;
            
            const input = document.createElement('input');
            input.type = field.type;
            input.name = field.name;
            input.value = field.value || '';
            input.checked = field.checked || false;
            input.style.marginRight = '8px';
            
            const text = document.createTextNode(field.label);
            
            label.appendChild(input);
            label.appendChild(text);
            container.appendChild(label);
        } else if (field.type === 'button') {
            const button = document.createElement('button');
            button.textContent = field.label;
            button.style.cssText = `
                width: 100%;
                padding: 8px;
                background: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                margin-bottom: 4px;
            `;
            button.onclick = field.action;
            container.appendChild(button);
        } else {
            const label = document.createElement('label');
            label.textContent = field.label;
            label.style.cssText = `
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            `;
            
            let input;
            if (field.type === 'select') {
                input = document.createElement('select');
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (opt.selected) option.selected = true;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = field.type;
                input.value = field.value || '';
                if (field.min !== undefined) input.min = field.min;
                if (field.max !== undefined) input.max = field.max;
            }
            
            input.name = field.name;
            input.style.cssText = `
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 13px;
            `;
            
            container.appendChild(label);
            container.appendChild(input);
        }
        
        return container;
    }

    /**
     * 创建预览区域
     * @private
     */
    _createPreview(container) {
        const title = document.createElement('h3');
        title.textContent = '预览';
        title.style.cssText = 'margin: 0 0 15px 0; font-size: 16px;';
        container.appendChild(title);
        
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            width: 100%;
            height: 300px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;
        
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.style.cssText = 'max-width: 100%; max-height: 100%;';
        previewContainer.appendChild(this.previewCanvas);
        
        container.appendChild(previewContainer);
        
        // 预览信息
        this.previewInfo = document.createElement('div');
        this.previewInfo.style.cssText = `
            margin-top: 10px;
            font-size: 12px;
            color: #666;
        `;
        container.appendChild(this.previewInfo);
    }

    /**
     * 创建底部按钮
     * @private
     */
    _createFooter() {
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            background: #f8f9fa;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.style.cssText = `
            padding: 8px 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        cancelBtn.onclick = () => this.hide();
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '导出';
        exportBtn.style.cssText = `
            padding: 8px 20px;
            background: #4488ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        `;
        exportBtn.onclick = () => this._handleExport();
        
        footer.appendChild(cancelBtn);
        footer.appendChild(exportBtn);
        this.dialog.appendChild(footer);
    }

    /**
     * 应用预设
     * @private
     */
    _applyPreset(presetName) {
        const template = this.exportEngine.getTemplate(presetName);
        if (!template) return;
        
        // 更新表单值
        const form = this.dialog;
        
        if (template.format) {
            const formatRadio = form.querySelector(`input[name="format"][value="${template.format}"]`);
            if (formatRadio) formatRadio.checked = true;
        }
        
        if (template.width) {
            const widthInput = form.querySelector('input[name="width"]');
            if (widthInput) widthInput.value = template.width;
        }
        
        if (template.height) {
            const heightInput = form.querySelector('input[name="height"]');
            if (heightInput) heightInput.value = template.height;
        }
        
        if (template.dpi) {
            const dpiSelect = form.querySelector('select[name="dpi"]');
            if (dpiSelect) dpiSelect.value = template.dpi;
        }
        
        if (template.backgroundColor) {
            const bgInput = form.querySelector('input[name="backgroundColor"]');
            if (bgInput) bgInput.value = template.backgroundColor;
        }
        
        this._updatePreview();
    }

    /**
     * 更新预览
     * @private
     */
    async _updatePreview() {
        if (!this.currentScene) return;
        
        const config = this._getConfig();
        
        try {
            // 生成小尺寸预览
            const previewConfig = {
                ...config,
                width: 400,
                height: 300
            };
            
            const previewUrl = await this.exportEngine.generatePreview(
                this.currentScene,
                previewConfig
            );
            
            // 显示预览
            const img = new Image();
            img.onload = () => {
                const ctx = this.previewCanvas.getContext('2d');
                this.previewCanvas.width = img.width;
                this.previewCanvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = previewUrl;
            
            // 更新信息
            const fileSize = this._estimateFileSize(config);
            this.previewInfo.textContent = `尺寸: ${config.width} × ${config.height} px | 预估大小: ${fileSize}`;
        } catch (error) {
            console.error('Preview error:', error);
            this.previewInfo.textContent = '预览生成失败';
        }
    }

    /**
     * 估算文件大小
     * @private
     */
    _estimateFileSize(config) {
        const pixels = config.width * config.height;
        let bytes;
        
        switch (config.format) {
            case 'svg':
                bytes = pixels * 0.1; // SVG通常较小
                break;
            case 'png':
                bytes = pixels * 3; // PNG约3字节/像素
                break;
            case 'pdf':
            case 'eps':
                bytes = pixels * 0.5; // PDF/EPS介于中间
                break;
            default:
                bytes = pixels;
        }
        
        if (bytes < 1024) return `${Math.round(bytes)} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * 获取当前配置
     * @private
     */
    _getConfig() {
        const form = this.dialog;
        
        const format = form.querySelector('input[name="format"]:checked')?.value || 'svg';
        const width = parseInt(form.querySelector('input[name="width"]')?.value || 1920);
        const height = parseInt(form.querySelector('input[name="height"]')?.value || 1080);
        const dpi = parseInt(form.querySelector('select[name="dpi"]')?.value || 300);
        const backgroundColor = form.querySelector('input[name="backgroundColor"]')?.value || '#ffffff';
        const transparent = form.querySelector('input[name="transparent"]')?.checked || false;
        const includeAnnotations = form.querySelector('input[name="includeAnnotations"]')?.checked || false;
        const includeNotes = form.querySelector('input[name="includeNotes"]')?.checked || false;
        const includeGrid = form.querySelector('input[name="includeGrid"]')?.checked || false;
        
        return {
            format,
            width,
            height,
            dpi,
            backgroundColor: transparent ? 'transparent' : backgroundColor,
            includeAnnotations,
            includeNotes,
            includeGrid
        };
    }

    /**
     * 处理导出
     * @private
     */
    async _handleExport() {
        if (!this.currentScene) return;
        
        const config = this._getConfig();
        
        try {
            let blob;
            let filename = `optical-diagram.${config.format}`;
            
            // 根据格式选择导出器
            switch (config.format) {
                case 'svg':
                    const svgData = await this.exportEngine.exportSVG(this.currentScene, config);
                    blob = new Blob([svgData], { type: 'image/svg+xml' });
                    break;
                    
                case 'png':
                    blob = await this.highDPIExporter.exportHighDPI(this.currentScene, {
                        ...config,
                        format: 'png'
                    });
                    break;
                    
                case 'pdf':
                    blob = await this.exportEngine.exportPDF(this.currentScene, config);
                    break;
                    
                case 'eps':
                    const epsData = await this.epsExporter.exportEPS(this.currentScene, config);
                    blob = new Blob([epsData], { type: 'application/postscript' });
                    break;
            }
            
            // 下载文件
            this._downloadBlob(blob, filename);
            
            this.hide();
        } catch (error) {
            console.error('Export error:', error);
            alert(`导出失败: ${error.message}`);
        }
    }

    /**
     * 下载Blob
     * @private
     */
    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 显示对话框
     */
    show(scene) {
        this.currentScene = scene;
        this.visible = true;
        this.overlay.style.display = 'block';
        this.dialog.style.display = 'flex';
        
        // 挂载到body
        if (!this.overlay.parentNode) {
            document.body.appendChild(this.overlay);
            document.body.appendChild(this.dialog);
        }
        
        // 更新预览
        this._updatePreview();
    }

    /**
     * 隐藏对话框
     */
    hide() {
        this.visible = false;
        this.overlay.style.display = 'none';
        this.dialog.style.display = 'none';
    }

    /**
     * 销毁对话框
     */
    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        if (this.dialog && this.dialog.parentNode) {
            this.dialog.parentNode.removeChild(this.dialog);
        }
    }
}

// ========== 单例模式 ==========
let exportDialogInstance = null;

export function getExportDialog() {
    if (!exportDialogInstance) {
        exportDialogInstance = new ExportDialog();
    }
    return exportDialogInstance;
}

export function openExportDialog(scene) {
    const dialog = getExportDialog();
    dialog.show(scene);
}

export function resetExportDialog() {
    if (exportDialogInstance) {
        exportDialogInstance.destroy();
    }
    exportDialogInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.ExportDialog = ExportDialog;
    window.getExportDialog = getExportDialog;
    window.openExportDialog = openExportDialog;
}
