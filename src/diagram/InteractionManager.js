/**
 * InteractionManager.js - 交互管理器
 * 提供多选、撤销/重做、复制/粘贴和分组功能
 * 
 * Requirements: 8.2, 8.3, 8.4, 8.6, 8.8
 */

/**
 * 生成唯一ID
 */
function generateId() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 操作类型
 */
export const ActionType = {
    ADD_COMPONENT: 'add_component',
    DELETE_COMPONENT: 'delete_component',
    MOVE_COMPONENT: 'move_component',
    ROTATE_COMPONENT: 'rotate_component',
    ADD_LINK: 'add_link',
    DELETE_LINK: 'delete_link',
    ADD_LABEL: 'add_label',
    DELETE_LABEL: 'delete_label',
    MOVE_LABEL: 'move_label',
    MODIFY_STYLE: 'modify_style',
    GROUP: 'group',
    UNGROUP: 'ungroup',
    BATCH: 'batch'
};

/**
 * 操作记录类
 */
export class Action {
    constructor(type, data, undoData = null) {
        this.id = generateId();
        this.type = type;
        this.data = data;
        this.undoData = undoData;
        this.timestamp = Date.now();
    }
}

/**
 * 历史记录管理器
 */
export class HistoryManager {
    constructor(maxSize = 50) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
        this.listeners = [];
    }

    /**
     * 记录操作
     */
    record(action) {
        this.undoStack.push(action);
        this.redoStack = []; // 清空重做栈
        
        // 限制历史大小
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        
        this._notifyListeners();
    }

    /**
     * 撤销
     */
    undo() {
        if (this.undoStack.length === 0) return null;
        
        const action = this.undoStack.pop();
        this.redoStack.push(action);
        this._notifyListeners();
        
        return action;
    }

    /**
     * 重做
     */
    redo() {
        if (this.redoStack.length === 0) return null;
        
        const action = this.redoStack.pop();
        this.undoStack.push(action);
        this._notifyListeners();
        
        return action;
    }

    /**
     * 检查是否可撤销
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * 检查是否可重做
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * 添加监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            const idx = this.listeners.indexOf(callback);
            if (idx !== -1) this.listeners.splice(idx, 1);
        };
    }

    /**
     * 通知监听器
     * @private
     */
    _notifyListeners() {
        this.listeners.forEach(cb => cb({
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length
        }));
    }

    /**
     * 清空历史
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._notifyListeners();
    }
}

/**
 * 选择管理器
 */
export class SelectionManager {
    constructor() {
        this.selectedItems = new Set();
        this.selectionBox = null;
        this.isSelecting = false;
        this.listeners = [];
    }

    /**
     * 选择单个项目
     */
    select(item, addToSelection = false) {
        if (!addToSelection) {
            this.selectedItems.clear();
        }
        this.selectedItems.add(item);
        this._notifyListeners();
    }

    /**
     * 取消选择
     */
    deselect(item) {
        this.selectedItems.delete(item);
        this._notifyListeners();
    }

    /**
     * 清空选择
     */
    clearSelection() {
        this.selectedItems.clear();
        this._notifyListeners();
    }

    /**
     * 切换选择
     */
    toggleSelection(item) {
        if (this.selectedItems.has(item)) {
            this.selectedItems.delete(item);
        } else {
            this.selectedItems.add(item);
        }
        this._notifyListeners();
    }

    /**
     * 框选开始
     */
    startBoxSelection(position) {
        this.isSelecting = true;
        this.selectionBox = {
            startX: position.x,
            startY: position.y,
            endX: position.x,
            endY: position.y
        };
    }

    /**
     * 框选更新
     */
    updateBoxSelection(position) {
        if (!this.isSelecting || !this.selectionBox) return;
        this.selectionBox.endX = position.x;
        this.selectionBox.endY = position.y;
    }

    /**
     * 框选结束
     */
    endBoxSelection(items, addToSelection = false) {
        if (!this.isSelecting || !this.selectionBox) return [];
        
        const box = this._normalizeBox(this.selectionBox);
        const selected = items.filter(item => this._isInBox(item, box));
        
        if (!addToSelection) {
            this.selectedItems.clear();
        }
        
        selected.forEach(item => this.selectedItems.add(item));
        
        this.isSelecting = false;
        this.selectionBox = null;
        this._notifyListeners();
        
        return selected;
    }

    /**
     * 获取选中项目
     */
    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    /**
     * 检查是否选中
     */
    isSelected(item) {
        return this.selectedItems.has(item);
    }

    /**
     * 获取选中数量
     */
    getSelectionCount() {
        return this.selectedItems.size;
    }

    /**
     * 规范化框选区域
     * @private
     */
    _normalizeBox(box) {
        return {
            left: Math.min(box.startX, box.endX),
            right: Math.max(box.startX, box.endX),
            top: Math.min(box.startY, box.endY),
            bottom: Math.max(box.startY, box.endY)
        };
    }

    /**
     * 检查项目是否在框内
     * @private
     */
    _isInBox(item, box) {
        const pos = item.pos || { x: item.x || 0, y: item.y || 0 };
        return pos.x >= box.left && pos.x <= box.right &&
               pos.y >= box.top && pos.y <= box.bottom;
    }

    /**
     * 渲染选择框
     */
    renderSelectionBox(ctx) {
        if (!this.isSelecting || !this.selectionBox) return;
        
        const box = this._normalizeBox(this.selectionBox);
        
        ctx.save();
        ctx.strokeStyle = '#0078d4';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
        
        ctx.fillStyle = 'rgba(0, 120, 212, 0.1)';
        ctx.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
        ctx.restore();
    }

    /**
     * 添加监听器
     */
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            const idx = this.listeners.indexOf(callback);
            if (idx !== -1) this.listeners.splice(idx, 1);
        };
    }

    /**
     * 通知监听器
     * @private
     */
    _notifyListeners() {
        const items = this.getSelectedItems();
        this.listeners.forEach(cb => cb(items));
    }
}

/**
 * 剪贴板管理器
 */
export class ClipboardManager {
    constructor() {
        this.clipboard = null;
        this.pasteOffset = { x: 20, y: 20 };
        this.pasteCount = 0;
    }

    /**
     * 复制
     */
    copy(items, links = []) {
        if (!items || items.length === 0) return;
        
        // 深拷贝项目
        this.clipboard = {
            items: items.map(item => this._cloneItem(item)),
            links: links.filter(link => {
                // 只复制两端都在选中项目中的链接
                const sourceInSelection = items.some(i => (i.id || i.uuid) === link.sourceComponentId);
                const targetInSelection = items.some(i => (i.id || i.uuid) === link.targetComponentId);
                return sourceInSelection && targetInSelection;
            }).map(link => this._cloneLink(link)),
            timestamp: Date.now()
        };
        
        this.pasteCount = 0;
    }

    /**
     * 粘贴
     */
    paste() {
        if (!this.clipboard) return null;
        
        this.pasteCount++;
        const offset = {
            x: this.pasteOffset.x * this.pasteCount,
            y: this.pasteOffset.y * this.pasteCount
        };
        
        // 创建ID映射
        const idMap = new Map();
        
        // 复制项目并应用偏移
        const newItems = this.clipboard.items.map(item => {
            const newItem = this._cloneItem(item);
            const oldId = item.id || item.uuid;
            const newId = generateId();
            
            idMap.set(oldId, newId);
            
            if (newItem.id) newItem.id = newId;
            if (newItem.uuid) newItem.uuid = newId;
            
            if (newItem.pos) {
                newItem.pos.x += offset.x;
                newItem.pos.y += offset.y;
            } else {
                newItem.x = (newItem.x || 0) + offset.x;
                newItem.y = (newItem.y || 0) + offset.y;
            }
            
            return newItem;
        });
        
        // 复制链接并更新ID引用
        const newLinks = this.clipboard.links.map(link => {
            const newLink = this._cloneLink(link);
            newLink.id = generateId();
            newLink.sourceComponentId = idMap.get(link.sourceComponentId) || link.sourceComponentId;
            newLink.targetComponentId = idMap.get(link.targetComponentId) || link.targetComponentId;
            return newLink;
        });
        
        return { items: newItems, links: newLinks };
    }

    /**
     * 检查是否有内容可粘贴
     */
    hasContent() {
        return this.clipboard !== null && this.clipboard.items.length > 0;
    }

    /**
     * 清空剪贴板
     */
    clear() {
        this.clipboard = null;
        this.pasteCount = 0;
    }

    /**
     * 克隆项目
     * @private
     */
    _cloneItem(item) {
        return JSON.parse(JSON.stringify(item));
    }

    /**
     * 克隆链接
     * @private
     */
    _cloneLink(link) {
        return JSON.parse(JSON.stringify(link));
    }
}

/**
 * 分组管理器
 */
export class GroupManager {
    constructor() {
        this.groups = new Map();
    }

    /**
     * 创建分组
     */
    createGroup(items) {
        if (!items || items.length < 2) return null;
        
        const groupId = generateId();
        const itemIds = items.map(item => item.id || item.uuid);
        
        // 计算分组中心
        let sumX = 0, sumY = 0;
        items.forEach(item => {
            const pos = item.pos || { x: item.x || 0, y: item.y || 0 };
            sumX += pos.x;
            sumY += pos.y;
        });
        
        const group = {
            id: groupId,
            itemIds,
            center: { x: sumX / items.length, y: sumY / items.length },
            created: Date.now()
        };
        
        this.groups.set(groupId, group);
        return group;
    }

    /**
     * 解散分组
     */
    dissolveGroup(groupId) {
        return this.groups.delete(groupId);
    }

    /**
     * 获取项目所属分组
     */
    getGroupForItem(itemId) {
        for (const [groupId, group] of this.groups) {
            if (group.itemIds.includes(itemId)) {
                return group;
            }
        }
        return null;
    }

    /**
     * 获取分组中的所有项目ID
     */
    getGroupItems(groupId) {
        const group = this.groups.get(groupId);
        return group ? [...group.itemIds] : [];
    }

    /**
     * 移动分组
     */
    moveGroup(groupId, delta, items) {
        const group = this.groups.get(groupId);
        if (!group) return;
        
        // 更新分组中心
        group.center.x += delta.x;
        group.center.y += delta.y;
        
        // 移动所有项目
        items.forEach(item => {
            const itemId = item.id || item.uuid;
            if (group.itemIds.includes(itemId)) {
                if (item.pos) {
                    item.pos.x += delta.x;
                    item.pos.y += delta.y;
                } else {
                    item.x = (item.x || 0) + delta.x;
                    item.y = (item.y || 0) + delta.y;
                }
            }
        });
    }

    /**
     * 获取所有分组
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }

    /**
     * 清空所有分组
     */
    clear() {
        this.groups.clear();
    }

    /**
     * 恢复分组
     */
    restoreGroup(group) {
        if (!group || !group.id) return null;
        this.groups.set(group.id, {
            ...group,
            itemIds: Array.isArray(group.itemIds) ? [...group.itemIds] : []
        });
        return group;
    }

    /**
     * 序列化
     */
    serialize() {
        return Array.from(this.groups.entries());
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        this.groups = new Map(data);
    }
}

/**
 * 交互管理器主类
 */
export class InteractionManager {
    constructor() {
        this.history = new HistoryManager();
        this.selection = new SelectionManager();
        this.clipboard = new ClipboardManager();
        this.groups = new GroupManager();
        
        // 键盘快捷键绑定
        this._keyboardHandler = null;
        this._setupKeyboardShortcuts();
    }

    /**
     * 设置键盘快捷键
     * @private
     */
    _setupKeyboardShortcuts() {
        if (typeof document === 'undefined') return;
        
        this._keyboardHandler = (e) => {
            // 忽略输入框中的快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const isCtrl = e.ctrlKey || e.metaKey;
            
            // Ctrl+Z - 撤销
            if (isCtrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            
            // Ctrl+Y 或 Ctrl+Shift+Z - 重做
            if ((isCtrl && e.key === 'y') || (isCtrl && e.key === 'z' && e.shiftKey)) {
                e.preventDefault();
                this.redo();
            }
            
            // Ctrl+C - 复制
            if (isCtrl && e.key === 'c') {
                e.preventDefault();
                this.copySelection();
            }
            
            // Ctrl+V - 粘贴
            if (isCtrl && e.key === 'v') {
                e.preventDefault();
                this.paste();
            }
            
            // Ctrl+A - 全选
            if (isCtrl && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }
            
            // Delete - 删除选中
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!e.target.closest('input, textarea')) {
                    e.preventDefault();
                    this.deleteSelection();
                }
            }
            
            // Ctrl+G - 分组
            if (isCtrl && e.key === 'g' && !e.shiftKey) {
                e.preventDefault();
                this.groupSelection();
            }
            
            // Ctrl+Shift+G - 解散分组
            if (isCtrl && e.key === 'g' && e.shiftKey) {
                e.preventDefault();
                this.ungroupSelection();
            }
            
            // Escape - 取消选择
            if (e.key === 'Escape') {
                this.selection.clearSelection();
            }
        };
        
        document.addEventListener('keydown', this._keyboardHandler);
    }

    /**
     * 记录操作
     */
    recordAction(type, data, undoData = null) {
        const action = new Action(type, data, undoData);
        this.history.record(action);
        return action;
    }

    /**
     * 撤销
     */
    undo() {
        const action = this.history.undo();
        if (action) {
            document.dispatchEvent(new CustomEvent('diagram-undo', { detail: action }));
        }
        return action;
    }

    /**
     * 重做
     */
    redo() {
        const action = this.history.redo();
        if (action) {
            document.dispatchEvent(new CustomEvent('diagram-redo', { detail: action }));
        }
        return action;
    }

    /**
     * 复制选中项目
     */
    copySelection(links = []) {
        const items = this.selection.getSelectedItems();
        if (items.length > 0) {
            this.clipboard.copy(items, links);
            console.log(`InteractionManager: Copied ${items.length} items`);
        }
    }

    /**
     * 粘贴
     */
    paste() {
        const result = this.clipboard.paste();
        if (result) {
            document.dispatchEvent(new CustomEvent('diagram-paste', { detail: result }));
            console.log(`InteractionManager: Pasted ${result.items.length} items`);
        }
        return result;
    }

    /**
     * 全选
     */
    selectAll() {
        document.dispatchEvent(new CustomEvent('diagram-select-all'));
    }

    /**
     * 删除选中
     */
    deleteSelection() {
        const items = this.selection.getSelectedItems();
        if (items.length > 0) {
            document.dispatchEvent(new CustomEvent('diagram-delete-selection', { 
                detail: { items } 
            }));
            this.selection.clearSelection();
        }
    }

    /**
     * 分组选中项目
     */
    groupSelection() {
        const items = this.selection.getSelectedItems();
        if (items.length >= 2) {
            const group = this.groups.createGroup(items);
            if (group) {
                this.recordAction(ActionType.GROUP, { groupId: group.id, itemIds: group.itemIds }, { group: { ...group } });
                console.log(`InteractionManager: Created group with ${items.length} items`);
            }
        }
    }

    /**
     * 解散选中项目的分组
     */
    ungroupSelection() {
        const items = this.selection.getSelectedItems();
        if (items.length > 0) {
            const itemId = items[0].id || items[0].uuid;
            const group = this.groups.getGroupForItem(itemId);
            if (group) {
                this.groups.dissolveGroup(group.id);
                this.recordAction(ActionType.UNGROUP, { groupId: group.id }, { group: { ...group } });
                console.log(`InteractionManager: Dissolved group ${group.id}`);
            }
        }
    }

    /**
     * 渲染交互元素
     */
    render(ctx) {
        // 渲染选择框
        this.selection.renderSelectionBox(ctx);
        
        // 渲染选中项目高亮
        this.selection.getSelectedItems().forEach(item => {
            this._renderSelectionHighlight(ctx, item);
        });
    }

    /**
     * 渲染选中高亮
     * @private
     */
    _renderSelectionHighlight(ctx, item) {
        const pos = item.pos || { x: item.x || 0, y: item.y || 0 };
        const size = 40;
        
        ctx.save();
        ctx.strokeStyle = '#0078d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(pos.x - size/2 - 5, pos.y - size/2 - 5, size + 10, size + 10);
        
        // 绘制调整手柄
        const handleSize = 6;
        ctx.fillStyle = '#0078d4';
        const corners = [
            { x: pos.x - size/2 - 5, y: pos.y - size/2 - 5 },
            { x: pos.x + size/2 + 5, y: pos.y - size/2 - 5 },
            { x: pos.x - size/2 - 5, y: pos.y + size/2 + 5 },
            { x: pos.x + size/2 + 5, y: pos.y + size/2 + 5 }
        ];
        corners.forEach(corner => {
            ctx.fillRect(corner.x - handleSize/2, corner.y - handleSize/2, handleSize, handleSize);
        });
        
        ctx.restore();
    }

    /**
     * 销毁
     */
    destroy() {
        if (this._keyboardHandler && typeof document !== 'undefined') {
            document.removeEventListener('keydown', this._keyboardHandler);
        }
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            groups: this.groups.serialize()
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.groups) {
            this.groups.deserialize(data.groups);
        }
    }
}

// 单例
let interactionManagerInstance = null;

export function getInteractionManager() {
    if (!interactionManagerInstance) {
        interactionManagerInstance = new InteractionManager();
    }
    return interactionManagerInstance;
}

export function resetInteractionManager() {
    if (interactionManagerInstance) {
        interactionManagerInstance.destroy();
    }
    interactionManagerInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.InteractionManager = InteractionManager;
    window.getInteractionManager = getInteractionManager;
    window.ActionType = ActionType;
}
