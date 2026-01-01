/**
 * HistoryManager.js - 撤销/重做管理器
 * 使用命令模式实现撤销/重做功能
 */

import { Vector } from '../core/Vector.js';

/**
 * 命令基类
 */
export class Command {
    constructor() {
        if (this.constructor === Command) {
            throw new Error("Abstract class 'Command' cannot be instantiated directly.");
        }
    }

    execute() {
        throw new Error("Method 'execute()' must be implemented.");
    }

    undo() {
        throw new Error("Method 'undo()' must be implemented.");
    }
}

/**
 * 历史管理器
 */
export class HistoryManager {
    constructor(maxHistory = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory;
    }

    addCommand(command) {
        if (!(command instanceof Command)) {
            console.error("Attempted to add non-command object to history:", command);
            return;
        }
        this.undoStack.push(command);
        this.redoStack = [];

        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.canUndo()) {
            const command = this.undoStack.pop();
            try {
                command.undo();
                this.redoStack.push(command);
            } catch (e) {
                console.error(`Error during undo:`, e);
            }
            if (this.redoStack.length > this.maxHistory) {
                this.redoStack.shift();
            }
        }
    }

    redo() {
        if (this.canRedo()) {
            const command = this.redoStack.pop();
            try {
                command.execute();
                this.undoStack.push(command);
            } catch (e) {
                console.error(`Error during redo:`, e);
            }
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift();
            }
        }
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    peekUndo() { return this.canUndo() ? this.undoStack[this.undoStack.length - 1] : null; }
    clear() { this.undoStack = []; this.redoStack = []; }
}

// --- 具体命令实现 ---

export class AddComponentCommand extends Command {
    constructor(component, componentsArray) {
        super();
        this.component = component;
        this.componentsArray = componentsArray;
        this.selectedIndex = -1;
    }

    execute() {
        if (!this.componentsArray.includes(this.component)) {
            this.componentsArray.push(this.component);
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }

    undo() {
        this.selectedIndex = this.componentsArray.indexOf(this.component);
        if (this.selectedIndex > -1) {
            this.componentsArray.splice(this.selectedIndex, 1);
            if (typeof window !== 'undefined' && window.selectedComponent === this.component) {
                window.selectedComponent = null;
            }
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }
}

export class DeleteComponentCommand extends Command {
    constructor(component, componentsArray, index) {
        super();
        this.component = component;
        this.componentsArray = componentsArray;
        this.index = index;
        this.wasSelected = component.selected;
    }

    execute() {
        const currentIndex = this.componentsArray.indexOf(this.component);
        if (currentIndex > -1) {
            this.componentsArray.splice(currentIndex, 1);
            if (typeof window !== 'undefined' && window.selectedComponent === this.component) {
                window.selectedComponent = null;
            }
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }

    undo() {
        if (!this.componentsArray.includes(this.component)) {
            if (this.index !== undefined && this.index >= 0 && this.index <= this.componentsArray.length) {
                this.componentsArray.splice(this.index, 0, this.component);
            } else {
                this.componentsArray.push(this.component);
            }
            if (this.wasSelected && typeof window !== 'undefined') {
                if (window.selectedComponent) window.selectedComponent.selected = false;
                window.selectedComponent = this.component;
                this.component.selected = true;
            }
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }
}

export class MoveComponentCommand extends Command {
    constructor(component, oldPos, newPos) {
        super();
        this.component = component;
        this.oldPos = oldPos.clone();
        this.newPos = newPos.clone();
        this._isDraggingMerge = false;
    }

    execute() {
        this.component.pos.set(this.newPos.x, this.newPos.y);
        this._triggerUpdate();
    }

    undo() {
        this.component.pos.set(this.oldPos.x, this.oldPos.y);
        this._triggerUpdate();
    }

    _triggerUpdate() {
        if (typeof this.component._updateGeometry === 'function') {
            try { this.component._updateGeometry(); } catch (e) { console.error(e); }
        }
        if (typeof this.component.onPositionChanged === 'function') {
            try { this.component.onPositionChanged(); } catch (e) { console.error(e); }
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }
}

export class RotateComponentCommand extends Command {
    constructor(component, oldAngleRad, newAngleRad) {
        super();
        this.component = component;
        this.oldAngle = oldAngleRad;
        this.newAngle = newAngleRad;
        this._isDraggingMerge = false;
        this._isWheelMerge = false;
    }

    execute() {
        this.component.angleRad = this.newAngle;
        this._triggerUpdate();
    }

    undo() {
        this.component.angleRad = this.oldAngle;
        this._triggerUpdate();
    }

    _triggerUpdate() {
        if (typeof this.component.onAngleChanged === 'function') {
            try { this.component.onAngleChanged(); } catch (e) { console.error(e); }
        } else if (typeof this.component._updateGeometry === 'function') {
            try { this.component._updateGeometry(); } catch (e) { console.error(e); }
        }
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }
}

export class SetPropertyCommand extends Command {
    constructor(component, propName, oldValue, newValue) {
        super();
        this.component = component;
        this.propName = propName;
        this.oldValue = (oldValue instanceof Vector) ? oldValue.clone() : oldValue;
        this.newValue = (newValue instanceof Vector) ? newValue.clone() : newValue;
    }

    execute() {
        try {
            this.component.setProperty(this.propName, this.newValue);
        } catch (e) {
            console.error(`Error executing SetProperty:`, e);
        }
    }

    undo() {
        try {
            this.component.setProperty(this.propName, this.oldValue);
        } catch (e) {
            console.error(`Error undoing SetProperty:`, e);
        }
    }
}

export class ClearAllCommand extends Command {
    constructor(componentsArrayRef) {
        super();
        this.componentsArrayRef = componentsArrayRef;
        this.clearedComponents = [...componentsArrayRef];
        this.selectedComponentBeforeClear = typeof window !== 'undefined' ? window.selectedComponent : null;
    }

    execute() {
        this.componentsArrayRef.length = 0;
        if (typeof window !== 'undefined') {
            window.selectedComponent = null;
            window.needsRetrace = true;
            if (window.updateInspector) window.updateInspector();
        }
    }

    undo() {
        if (this.componentsArrayRef.length > 0) {
            this.componentsArrayRef.length = 0;
        }
        this.componentsArrayRef.push(...this.clearedComponents);
        
        if (typeof window !== 'undefined') {
            if (this.selectedComponentBeforeClear && 
                this.componentsArrayRef.includes(this.selectedComponentBeforeClear)) {
                window.selectedComponent = this.selectedComponentBeforeClear;
                window.selectedComponent.selected = true;
            } else {
                window.selectedComponent = null;
            }
            window.needsRetrace = true;
            if (window.updateInspector) window.updateInspector();
        }
    }
}

export class CompositeCommand extends Command {
    constructor(commands = []) {
        super();
        this.commands = [...commands];
    }

    add(command) {
        if (command instanceof Command) {
            this.commands.push(command);
        }
    }

    execute() {
        for (let i = 0; i < this.commands.length; i++) {
            try {
                this.commands[i].execute();
            } catch (e) {
                console.error(`Error executing sub-command #${i}:`, e);
            }
        }
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            try {
                this.commands[i].undo();
            } catch (e) {
                console.error(`Error undoing sub-command #${i}:`, e);
            }
        }
    }

    isEmpty() { return this.commands.length === 0; }
}

/**
 * 选择命令 - 用于撤销/重做选择操作
 */
export class SelectCommand extends Command {
    constructor(previousSelectionArray, currentSelectionArray, componentsRef) {
        super();
        this.previousSelectionIds = previousSelectionArray.map(c => c.id);
        this.currentSelectionIds = currentSelectionArray.map(c => c.id);
        this.previousPrimaryId = previousSelectionArray.length > 0 ? 
            previousSelectionArray[previousSelectionArray.length - 1].id : null;
        this.currentPrimaryId = currentSelectionArray.length > 0 ? 
            currentSelectionArray[currentSelectionArray.length - 1].id : null;
        this.componentsRef = componentsRef;
    }

    _applySelection(idsToSelect, primaryId) {
        if (!this.componentsRef) return;

        const newlySelectedComponents = this.componentsRef.filter(c => idsToSelect.includes(c.id));

        // 更新全局状态
        if (typeof window !== 'undefined') {
            if (window.selectedComponents) {
                window.selectedComponents.length = 0;
                window.selectedComponents.push(...newlySelectedComponents);
            }

            const primaryComp = primaryId ? this.componentsRef.find(c => c.id === primaryId) : null;
            window.selectedComponent = (primaryComp && newlySelectedComponents.includes(primaryComp))
                ? primaryComp
                : (newlySelectedComponents.length > 0 ? newlySelectedComponents[newlySelectedComponents.length - 1] : null);

            this.componentsRef.forEach(comp => {
                comp.selected = newlySelectedComponents.includes(comp);
            });

            if (window.updateInspector) window.updateInspector();
            window.needsRetrace = true;
        }
    }

    execute() {
        this._applySelection(this.currentSelectionIds, this.currentPrimaryId);
    }

    undo() {
        this._applySelection(this.previousSelectionIds, this.previousPrimaryId);
    }
}

/**
 * 批量移动命令 - 用于同时移动多个组件
 */
export class MoveComponentsCommand extends Command {
    constructor(componentIds, startPositionsMap, finalPositionsMap, componentsRef) {
        super();
        this.componentIds = [...componentIds];
        this.startPositions = new Map(startPositionsMap);
        this.finalPositions = new Map(finalPositionsMap);
        this.componentsRef = componentsRef;
    }

    execute() {
        this.componentIds.forEach(id => {
            const comp = this.componentsRef.find(c => c.id === id);
            const finalPos = this.finalPositions.get(id);
            if (comp && finalPos) {
                comp.pos.set(finalPos.x, finalPos.y);
                if (typeof comp.onPositionChanged === 'function') comp.onPositionChanged();
                if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
            }
        });
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }

    undo() {
        this.componentIds.forEach(id => {
            const comp = this.componentsRef.find(c => c.id === id);
            const startPos = this.startPositions.get(id);
            if (comp && startPos) {
                comp.pos.set(startPos.x, startPos.y);
                if (typeof comp.onPositionChanged === 'function') comp.onPositionChanged();
                if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
            }
        });
        if (typeof window !== 'undefined') window.needsRetrace = true;
    }
}

// 兼容旧代码的全局导出
if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
    window.Command = Command;
    window.AddComponentCommand = AddComponentCommand;
    window.DeleteComponentCommand = DeleteComponentCommand;
    window.MoveComponentCommand = MoveComponentCommand;
    window.RotateComponentCommand = RotateComponentCommand;
    window.SetPropertyCommand = SetPropertyCommand;
    window.ClearAllCommand = ClearAllCommand;
    window.CompositeCommand = CompositeCommand;
    window.SelectCommand = SelectCommand;
    window.MoveComponentsCommand = MoveComponentsCommand;
}
