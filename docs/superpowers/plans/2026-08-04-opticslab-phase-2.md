# OpticsLab Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented scene/diagram state with OpticsDocument v3, a durable BeamGraph, an improved bench workflow, and an independent native-SVG schematic editor.

**Architecture:** A document store owns shared optical identity and graph state while bench and schematic keep independent placements. Existing physics classes remain authoritative and are bridged through codecs. The legacy diagram tree becomes a compatibility adapter.

**Tech Stack:** Browser ES modules, Canvas 2D, native SVG DOM, Node test runner, Playwright, jsPDF.

---

## File Structure

- `src/document/*`: v3 schema, migration, serialization, store, component codecs, file/recovery services.
- `src/beam-graph/*`: stable ports, graph invariants, tracer projection.
- `src/bench/*`: snapping, alignment, insertion, angle locking.
- `src/schematic/*`: projector, editor, symbols, SVG/bitmap/PDF export.
- `src/workspace/*`: bench/schematic shell and runtime bridge.
- `tests/unit/*`: focused model and controller coverage.
- `tests/e2e/*`: dual-workspace and persistence acceptance.

### Task 1: OpticsDocument v3 Model

**Files:**
- Create: `tests/unit/OpticsDocument.test.js`
- Create: `src/document/OpticsDocument.js`
- Create: `src/document/index.js`

- [ ] Write tests for required top-level keys, independent view placements, stable defaults, and clone isolation.
- [ ] Run `node --test tests/unit/OpticsDocument.test.js`; expect missing-module failure.
- [ ] Implement `createOpticsDocument`, `normalizeOpticsDocument`, and `cloneOpticsDocument`.
- [ ] Run the focused test; expect all cases to pass.

### Task 2: Serializer And Ordered Migrations

**Files:**
- Create: `tests/unit/OpticsDocumentSerializer.test.js`
- Create: `src/document/OpticsDocumentMigrator.js`
- Create: `src/document/OpticsDocumentSerializer.js`
- Modify: `src/managers/Serializer.js`

- [ ] Write round-trip, malformed-input, deterministic-output, and legacy 1.0/1.1/2.0.0 migration tests.
- [ ] Run focused tests and confirm the v3 expectations fail.
- [ ] Implement ordered migration and one serializer facade.
- [ ] Remove v1.1 generation behavior from the active serialization path.
- [ ] Run focused tests and `npm test`.

### Task 3: Document Store, Commands, File IO, Recovery

**Files:**
- Create: `tests/unit/DocumentStore.test.js`
- Create: `tests/unit/DocumentPersistence.test.js`
- Create: `src/document/DocumentStore.js`
- Create: `src/document/DocumentFileController.js`
- Create: `src/document/DocumentRecovery.js`
- Modify: `src/managers/AutoRecoveryManager.js`

- [ ] Test revision tracking, undo/redo, scoped view mutations, save/save-as handles, fallback download payloads, and recovery migration.
- [ ] Confirm failures before production implementation.
- [ ] Implement focused store commands and persistence adapters with injected browser APIs.
- [ ] Run focused tests and `npm test`.
- [ ] Run browser save/open/recovery smoke and inspect screenshot before phase A closes.

### Task 4: Bench Interaction Primitives

**Files:**
- Create: `tests/unit/BenchInteractions.test.js`
- Create: `src/bench/BeamSnap.js`
- Create: `src/bench/BenchAlignment.js`
- Create: `src/bench/PlacementPolicy.js`
- Create: `src/bench/InsertIntoBeam.js`
- Create: `src/bench/index.js`
- Modify: `main.js`

- [ ] Test nearest-segment snapping, automatic orientation, angle increments, multi-object alignment, and graph-edge insertion.
- [ ] Confirm failures before implementation.
- [ ] Implement pure geometry helpers first, then connect them to placement/drag/history paths.
- [ ] Verify numeric inspector editing and undo/redo remain compatible.
- [ ] Run focused tests, `npm test`, and bench browser interaction screenshots.

### Task 5: Stable Ports And BeamGraph

**Files:**
- Create: `tests/unit/ComponentPorts.test.js`
- Create: `tests/unit/BeamGraph.test.js`
- Create: `src/beam-graph/ComponentPortRegistry.js`
- Create: `src/beam-graph/BeamGraph.js`
- Create: `src/beam-graph/BeamGraphBuilder.js`
- Create: `src/beam-graph/index.js`
- Modify: `src/core/Ray.js`
- Modify: `src/simulation/RayTracer.js`

- [ ] Test deterministic ports for acceptance components.
- [ ] Test split branches, return edges, AOM frequency shift, wavelength/polarization propagation, auxiliary paths, and termination nodes.
- [ ] Confirm focused failures.
- [ ] Add non-breaking trace lineage/interaction metadata and build graph records from completed traces.
- [ ] Run physics golden tests, new graph tests, and full `npm test`.
- [ ] Exercise the acceptance chain in the browser and inspect the rendered bench path.

### Task 6: Schematic Projection

**Files:**
- Create: `tests/unit/SchematicProjector.test.js`
- Create: `src/schematic/SchematicProjector.js`
- Create: `src/schematic/index.js`

- [ ] Test initial layout, incremental additions/deletions, name/connection sync, and locked-layout preservation.
- [ ] Confirm failures.
- [ ] Implement deterministic graph-column projection that fills only missing records.
- [ ] Run focused and full tests.

### Task 7: Native SVG Symbols And Editor

**Files:**
- Create: `tests/unit/SchematicSymbols.test.js`
- Create: `tests/unit/SchematicEditor.test.js`
- Create: `src/schematic/SchematicSymbols.js`
- Create: `src/schematic/SchematicEditor.js`
- Create: `src/schematic/schematic.css`
- Modify: `index.html`
- Modify: `src/compat/legacy-globals.js`

- [ ] Test semantic SVG symbol output, stable IDs, layer order, selection transforms, label anchors, grouping, alignment, snapping, and double/auxiliary paths.
- [ ] Confirm focused failures.
- [ ] Implement the white-page editor with focused controllers and accessible toolbar commands.
- [ ] Run focused/full tests and desktop/mobile browser screenshots.

### Task 8: Workspace Shell And Dual-View Synchronization

**Files:**
- Create: `tests/unit/WorkspaceBridge.test.js`
- Create: `src/workspace/WorkspaceController.js`
- Create: `src/workspace/WorkspaceBridge.js`
- Create: `src/workspace/index.js`
- Modify: `main.js`
- Modify: `index.html`
- Modify: `style.css`
- Modify: `src/compat/legacy-globals.js`

- [ ] Test bench/schematic switching, scoped coordinates, shared names/add/delete/connections, and lens analysis nesting.
- [ ] Confirm failures.
- [ ] Implement the two-workspace shell and route legacy mode commands through it.
- [ ] Ensure switching does not project over manually arranged schematic objects.
- [ ] Run focused/full tests and dual-workspace browser screenshots.

### Task 9: SVG, PNG, And PDF Export

**Files:**
- Create: `tests/unit/SchematicExporter.test.js`
- Create: `src/schematic/SchematicExporter.js`
- Modify: `main.js`
- Modify: `index.html`

- [ ] Test editable SVG text/groups/layers, stable page bounds and stroke widths, and PNG/PDF adapter dimensions.
- [ ] Confirm failures.
- [ ] Implement export from persisted schematic records only.
- [ ] Inspect generated SVG structure and rendered PNG/PDF screenshots.
- [ ] Run focused and full tests.

### Task 10: Compatibility, Performance, And E2E Acceptance

**Files:**
- Create: `tests/e2e/phase-2.spec.js`
- Modify: `tests/e2e/run-web-e2e.ps1`
- Modify: `src/diagram/SceneToDiagramAdapter.js`
- Modify: `docs/DIAGRAM_ADAPTER.md`

- [ ] Add E2E coverage for the acceptance chain, schematic rearrangement, save/reload/import, and SVG export.
- [ ] Add a 100-component drag/switch timing assertion with a documented budget.
- [ ] Route active legacy exports through the v3 projector while retaining import compatibility.
- [ ] Search all old diagram call sites and document remaining compatibility consumers.
- [ ] Run `npm test`, focused E2E, full E2E, lint, screenshots, and export inspection.
- [ ] Record remaining risks without removing old files that still have consumers.

## Execution Notes

- Implementation runs inline in the current user-authorized worktree.
- Do not create branches, commits, or pushes.
- Do not delete legacy diagram files during this pass unless a separate explicit confirmation is provided.
- Every production behavior follows a witnessed RED -> GREEN cycle.
