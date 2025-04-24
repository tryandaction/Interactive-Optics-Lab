// history.js - Undo/Redo functionality using the Command Pattern

console.log("history.js: Loading Undo/Redo Manager...");

/**
 * Base class for all commands.
 * Defines the interface for execute and undo operations.
 */
class Command {
    constructor() {
        if (this.constructor === Command) {
            throw new Error("Abstract class 'Command' cannot be instantiated directly.");
        }
    }

    /**
     * Executes the command's action.
     */
    execute() {
        throw new Error("Method 'execute()' must be implemented.");
    }

    /**
     * Reverts the command's action.
     */
    undo() {
        throw new Error("Method 'undo()' must be implemented.");
    }
}

/**
 * Manages the undo and redo stacks.
 */
class HistoryManager {
    constructor(maxHistory = 100) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = maxHistory; // Limit history size
        console.log("HistoryManager initialized.");
    }

    /**
     * Adds a new command to the history.
     * This clears the redo stack.
     * @param {Command} command The command to add.
     */
    addCommand(command) {
        if (!(command instanceof Command)) {
            console.error("Attempted to add non-command object to history:", command);
            return;
        }
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack on new action

        // Limit history size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift(); // Remove the oldest command
        }
        console.log(`Command added: ${command.constructor.name}, Undo size: ${this.undoStack.length}`);
    }

    /**
     * Undoes the last command.
     */
    undo() {
        if (this.canUndo()) {
            const command = this.undoStack.pop();
            console.log(`Undoing: ${command.constructor.name}`);
            try {
                command.undo();
                this.redoStack.push(command);
            } catch (e) {
                console.error(`Error during undo for ${command.constructor.name}:`, e);
                // Attempt to push back to undo stack? Or discard? Discarding might be safer.
                // this.undoStack.push(command); // Option: Try to put it back
            }
            // Limit redo stack size? Usually less critical.
            if (this.redoStack.length > this.maxHistory) {
                this.redoStack.shift();
            }
        } else {
            console.log("Undo stack empty.");
        }
    }

    /**
     * Redoes the last undone command.
     */
    redo() {
        if (this.canRedo()) {
            const command = this.redoStack.pop();
            console.log(`Redoing: ${command.constructor.name}`);
            try {
                command.execute();
                this.undoStack.push(command); // Add back to undo stack
            } catch (e) {
                console.error(`Error during redo for ${command.constructor.name}:`, e);
                // this.redoStack.push(command); // Option: Try to put it back
            }
            // Limit undo stack size again if needed
            if (this.undoStack.length > this.maxHistory) {
                this.undoStack.shift();
            }
        } else {
            console.log("Redo stack empty.");
        }
    }

    /**
     * Checks if there are any commands to undo.
     * @returns {boolean} True if undo is possible, false otherwise.
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if there are any commands to redo.
     * @returns {boolean} True if redo is possible, false otherwise.
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Peeks at the top of the undo stack without removing it.
     * Useful for command merging.
     * @returns {Command | null} The top command or null if empty.
     */
    peekUndo() {
        return this.canUndo() ? this.undoStack[this.undoStack.length - 1] : null;
    }

    /**
     * Clears the entire history.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log("History cleared.");
    }
}

// --- Concrete Command Implementations ---

class AddComponentCommand extends Command {
    constructor(component, componentsArray) {
        super();
        this.component = component;
        this.componentsArray = componentsArray; // Reference to the main array
        this.selectedIndex = -1; // To remember where it was (might not be reliable if others deleted)
    }

    execute() {
        // Check if already added (might happen during redo)
        if (!this.componentsArray.includes(this.component)) {
            this.componentsArray.push(this.component);
            // Optionally select the component after adding/redoing add
            // selectedComponent = this.component;
            // this.component.selected = true;
        }
        needsRetrace = true;
    }

    undo() {
        this.selectedIndex = this.componentsArray.indexOf(this.component);
        if (this.selectedIndex > -1) {
            this.componentsArray.splice(this.selectedIndex, 1);
            // Deselect if it was selected
            if (selectedComponent === this.component) {
                selectedComponent = null;
                // updateInspector(); // updateUndoRedoUI calls this
            }
        }
        needsRetrace = true;
    }
}

class DeleteComponentCommand extends Command {
    constructor(component, componentsArray, index) {
        super();
        this.component = component;
        this.componentsArray = componentsArray;
        this.index = index; // Store the original index for potential restore
        this.wasSelected = component.selected; // Remember selection state
    }

    execute() { // Delete
        const currentIndex = this.componentsArray.indexOf(this.component);
        if (currentIndex > -1) {
            this.componentsArray.splice(currentIndex, 1);
            // Deselect if it was selected
            if (selectedComponent === this.component) {
                selectedComponent = null;
            }
        }
        needsRetrace = true;
    }

    undo() { // Undelete
        // Check if already added back (e.g., multiple undos)
        if (!this.componentsArray.includes(this.component)) {
            // Try to insert back at original index, otherwise push
            if (this.index !== undefined && this.index >= 0 && this.index <= this.componentsArray.length) {
                this.componentsArray.splice(this.index, 0, this.component);
            } else {
                this.componentsArray.push(this.component);
            }
            // Restore selection state only if needed
            if (this.wasSelected) {
                if (selectedComponent) selectedComponent.selected = false;
                selectedComponent = this.component;
                this.component.selected = true;
            }
        }
        needsRetrace = true;
    }
}

class MoveComponentCommand extends Command {
    constructor(component, oldPos, newPos) {
        super();
        this.component = component;
        this.oldPos = oldPos.clone(); // Store clones
        this.newPos = newPos.clone();
        this._isDraggingMerge = false; // Flag for merging drag operations
    }

    execute() {
        this.component.pos.set(this.newPos.x, this.newPos.y);
        // Trigger geometry update if component needs it
        if (typeof this.component._updateGeometry === 'function') {
            try { this.component._updateGeometry(); } catch (e) { console.error("Error updating geometry on Move execute:", e); }
        }
        if (typeof this.component.onPositionChanged === 'function') {
            try { this.component.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged on Move execute:", e); }
        }
        needsRetrace = true;
    }

    undo() {
        this.component.pos.set(this.oldPos.x, this.oldPos.y);
        if (typeof this.component._updateGeometry === 'function') {
            try { this.component._updateGeometry(); } catch (e) { console.error("Error updating geometry on Move undo:", e); }
        }
        if (typeof this.component.onPositionChanged === 'function') {
            try { this.component.onPositionChanged(); } catch (e) { console.error("Error in onPositionChanged on Move undo:", e); }
        }
        needsRetrace = true;
    }
}

class RotateComponentCommand extends Command {
    constructor(component, oldAngleRad, newAngleRad) {
        super();
        this.component = component;
        this.oldAngle = oldAngleRad;
        this.newAngle = newAngleRad;
        this._isDraggingMerge = false; // Flag for merging angle drag
        this._isWheelMerge = false; // Flag for merging wheel rotation
    }

    execute() {
        this.component.angleRad = this.newAngle;
        // Trigger geometry update
        if (typeof this.component.onAngleChanged === 'function') {
            try { this.component.onAngleChanged(); } catch (e) { console.error("Error in onAngleChanged on Rotate execute:", e); }
        } else if (typeof this.component._updateGeometry === 'function') { // Fallback if only _updateGeometry exists
            try { this.component._updateGeometry(); } catch (e) { console.error("Error updating geometry on Rotate execute:", e); }
        }
        needsRetrace = true;
    }

    undo() {
        this.component.angleRad = this.oldAngle;
        if (typeof this.component.onAngleChanged === 'function') {
            try { this.component.onAngleChanged(); } catch (e) { console.error("Error in onAngleChanged on Rotate undo:", e); }
        } else if (typeof this.component._updateGeometry === 'function') {
            try { this.component._updateGeometry(); } catch (e) { console.error("Error updating geometry on Rotate undo:", e); }
        }
        needsRetrace = true;
    }
}

class SetPropertyCommand extends Command {
    constructor(component, propName, oldValue, newValue) {
        super();
        this.component = component;
        this.propName = propName;
        // Clone values if they are objects (like Vectors) to prevent modification
        this.oldValue = (oldValue instanceof Vector) ? oldValue.clone() : oldValue;
        this.newValue = (newValue instanceof Vector) ? newValue.clone() : newValue;
    }

    execute() {
        try {
            this.component.setProperty(this.propName, this.newValue);
            // No explicit needsRetrace here, setProperty handles it
        } catch (e) {
            console.error(`Error executing SetProperty (${this.propName}=${this.newValue}):`, e);
            // Optionally try to revert?
        }
    }

    undo() {
        try {
            this.component.setProperty(this.propName, this.oldValue);
            // No explicit needsRetrace here, setProperty handles it
        } catch (e) {
            console.error(`Error undoing SetProperty (${this.propName}=${this.oldValue}):`, e);
            // Optionally try to re-execute?
        }
    }
}


console.log("history.js: HistoryManager and Command classes defined.");