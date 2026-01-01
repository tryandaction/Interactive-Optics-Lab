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


// --- NEW Command Class ---
class ClearAllCommand extends Command {
    constructor(componentsArrayRef) {
        super();
        // Store a REFERENCE to the main components array, not a copy
        this.componentsArrayRef = componentsArrayRef;
        // Store a COPY of the components that are about to be cleared for undo
        this.clearedComponents = [...componentsArrayRef];
        // Store the component that was selected before clearing, if any
        this.selectedComponentBeforeClear = selectedComponent; // Use global selectedComponent
        console.log(`ClearAllCommand created. Stored ${this.clearedComponents.length} components for undo.`);
    }

    execute() { // Perform the "clear all" action
        console.log(`Executing ClearAllCommand: Clearing ${this.clearedComponents.length} components.`);
        // Clear the actual components array by setting its length to 0
        this.componentsArrayRef.length = 0;
        // Also clear the global selectedComponent variable
        selectedComponent = null;
        // Optional: Reset camera view? Maybe not, let user do it manually.
        // cameraOffset = new Vector(0, 0); cameraScale = 1.0;
        needsRetrace = true;
        updateInspector(); // Update inspector to show empty state
    }

    undo() { // Restore the cleared components
        console.log(`Undoing ClearAllCommand: Restoring ${this.clearedComponents.length} components.`);
        // Check if the array is already populated (e.g., multiple undos) - avoid duplication
        if (this.componentsArrayRef.length > 0) {
            console.warn("Undo ClearAll: Components array is not empty. Clearing before restoring.");
            this.componentsArrayRef.length = 0; // Clear it first to be safe
        }

        // Restore the components from the stored copy
        // Use push.apply or spread syntax to add all elements back
        this.componentsArrayRef.push(...this.clearedComponents);

        // Restore the previously selected component, if there was one
        if (this.selectedComponentBeforeClear && this.componentsArrayRef.includes(this.selectedComponentBeforeClear)) {
            selectedComponent = this.selectedComponentBeforeClear;
            selectedComponent.selected = true; // Ensure it's marked as selected
        } else {
            selectedComponent = null; // No selection or component not found after restore
        }

        needsRetrace = true;
        updateInspector(); // Update inspector to reflect restored state
    }
}
// --- END NEW Command Class ---


// --- Select Command (Full Implementation) ---
class SelectCommand extends Command {
    constructor(previousSelectionArray, currentSelectionArray) {
        super();
        // Store IDs for resilience against component array changes elsewhere
        this.previousSelectionIds = previousSelectionArray.map(c => c.id);
        this.currentSelectionIds = currentSelectionArray.map(c => c.id);

        // Store the ID of the primary selected component (for inspector focus)
        // If array is empty, store null.
        this.previousPrimaryId = previousSelectionArray.length > 0 ? previousSelectionArray[previousSelectionArray.length - 1].id : null;
        this.currentPrimaryId = currentSelectionArray.length > 0 ? currentSelectionArray[currentSelectionArray.length - 1].id : null;

        console.log(`SelectCommand created: Prev [${this.previousSelectionIds.join(',')}] -> Curr [${this.currentSelectionIds.join(',')}]`);
    }

    _applySelection(idsToSelect, primaryId) {
        // This function performs the actual selection change.
        // It needs access to the global 'components', 'selectedComponents', 'selectedComponent'.
        // This is slightly awkward but common in command patterns interacting with global state.

        if (typeof components === 'undefined' || typeof selectedComponents === 'undefined') {
            console.error("SelectCommand cannot execute: Global 'components' or 'selectedComponents' not found.");
            return;
        }

        // Find the component objects based on stored IDs
        const newlySelectedComponents = components.filter(c => idsToSelect.includes(c.id));

        // --- Update Global State ---
        // 1. Update the global selectedComponents array
        // It's crucial to modify the existing array instance if other parts of the code rely on its identity,
        // OR ensure all parts get the new array reference. Let's modify in place.
        selectedComponents.length = 0; // Clear the existing array
        selectedComponents.push(...newlySelectedComponents); // Add the new selection

        // 2. Update the primary selectedComponent for the inspector
        const primaryComp = primaryId ? components.find(c => c.id === primaryId) : null;
        // Ensure the primary is actually in the selection, otherwise pick the last one
        selectedComponent = (primaryComp && selectedComponents.includes(primaryComp))
            ? primaryComp
            : (selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1] : null);

        // 3. Update the '.selected' property on all components
        components.forEach(comp => {
            comp.selected = selectedComponents.includes(comp);
        });
        // --- End Update Global State ---

        // 4. Update UI
        updateInspector(); // Refresh the inspector panel
        needsRetrace = true; // Redraw needed to show selection changes
        console.log(`Selection applied: [${selectedComponents.map(c => c.id).join(',')}] Primary: ${selectedComponent?.id}`);
    }

    execute() { // Apply the "current" selection state (Redo)
        console.log("Executing SelectCommand (Redo)");
        this._applySelection(this.currentSelectionIds, this.currentPrimaryId);
    }

    undo() { // Apply the "previous" selection state (Undo)
        console.log("Undoing SelectCommand");
        this._applySelection(this.previousSelectionIds, this.previousPrimaryId);
    }
}
// --- End Select Command ---

// Remove the helper function 'findComponentsByIds' if it's only used here,
// as the logic is now inside _applySelection.
// function findComponentsByIds(ids) { ... } // DELETE this if present



// --- Move Multiple Components Command (Placeholder - Needs implementation) ---
class MoveComponentsCommand extends Command {
    constructor(componentIds, startPositionsMap, finalPositionsMap) {
        super();
        this.componentIds = [...componentIds]; // Store array of IDs
        this.startPositions = new Map(startPositionsMap); // Copy the start Map {id -> Vector}
        this.finalPositions = new Map(finalPositionsMap); // Copy the final Map {id -> Vector}
        // Needs reference to main components array
        console.warn("MoveComponentsCommand created (placeholder - not fully functional yet).");
    }

    execute() { // Redo the move
        console.log(`Executing MoveComponentsCommand for ${this.componentIds.length} components.`);
        this.componentIds.forEach(id => {
            const comp = components.find(c => c.id === id); // Find component by ID
            const finalPos = this.finalPositions.get(id);
            if (comp && finalPos) {
                comp.pos.set(finalPos.x, finalPos.y);
                // Manually trigger updates (essential!)
                if (typeof comp.onPositionChanged === 'function') comp.onPositionChanged();
                if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
            } else { console.warn(`MoveComponents execute: Comp ${id} or finalPos not found.`); }
        });
        needsRetrace = true;
    }

    undo() {
        console.log(`Undoing MoveComponentsCommand for ${this.componentIds.length} components.`);
        this.componentIds.forEach(id => {
            const comp = components.find(c => c.id === id); // Find component by ID
            const startPos = this.startPositions.get(id);
            if (comp && startPos) {
                comp.pos.set(startPos.x, startPos.y);
                // Manually trigger updates (essential!)
                if (typeof comp.onPositionChanged === 'function') comp.onPositionChanged();
                if (typeof comp._updateGeometry === 'function') comp._updateGeometry();
            } else { console.warn(`MoveComponents undo: Comp ${id} or startPos not found.`); }
        });
        needsRetrace = true;
    }
}

// Helper function (might need to be global or passed differently)
function findComponentsByIds(ids) {
    return components.filter(c => ids.includes(c.id));
}

// --- NEW: Composite Command Class ---
// Allows grouping multiple commands into a single undo/redo step.
class CompositeCommand extends Command {
    constructor(commands = []) { // Accepts an array of Command objects
        super();
        // Store commands in the order they should be executed
        this.commands = [...commands];
        console.log(`CompositeCommand created with ${this.commands.length} sub-commands.`);
    }

    add(command) {
        if (command instanceof Command) {
            this.commands.push(command);
        } else {
            console.error("Attempted to add non-command to CompositeCommand:", command);
        }
    }

    execute() {
        console.log(`Executing CompositeCommand with ${this.commands.length} sub-commands.`);
        // Execute sub-commands in forward order
        for (let i = 0; i < this.commands.length; i++) {
            try {
                this.commands[i].execute();
            } catch (e) {
                console.error(`Error executing sub-command #${i} (${this.commands[i].constructor.name}) in CompositeCommand:`, e);
                // Option: Should we try to undo preceding commands in this composite on error?
                // For simplicity now, we log the error and continue. A more robust implementation might undo.
                // Example rollback:
                // for (let j = i - 1; j >= 0; j--) {
                //     try { this.commands[j].undo(); } catch (undoErr) { console.error("Error during rollback undo:", undoErr); }
                // }
                // throw e; // Re-throw the error after attempting rollback?
            }
        }
    }

    undo() {
        console.log(`Undoing CompositeCommand with ${this.commands.length} sub-commands.`);
        // Undo sub-commands in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            try {
                this.commands[i].undo();
            } catch (e) {
                console.error(`Error undoing sub-command #${i} (${this.commands[i].constructor.name}) in CompositeCommand:`, e);
                // Roll forward? Complex. Log and continue for now.
            }
        }
    }

    // Optional: Check if composite command is empty
    isEmpty() {
        return this.commands.length === 0;
    }
}
// --- END Composite Command Class ---