# OpticsLab Physics and Schematic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a rotation-safe optical pose contract and make the first bench-to-schematic projection position preserving.

**Architecture:** Keep the current component classes and OpticsDocument v3 aggregate. Add a small pure pose utility that defines local/world transformation and stable port/surface metadata, then let `ThinLens` own a serializable shape profile independent of pose. The projector projects bench placements only when a schematic placement is missing; existing schematic placements remain authoritative.

**Tech Stack:** Native ES modules, Node built-in test runner, Playwright CLI smoke workflow, Canvas/SVG renderers.

---

### Task 1: Specify and verify rigid local/world transforms

**Files:**
- Create: `src/physics/ComponentInteraction.js`
- Create: `tests/unit/ComponentInteractionGolden.test.js`
- Modify: `src/physics/index.js`

- [x] **Step 1: Write failing transform tests**

Assert that a ray transformed to a 90-degree component-local frame and back preserves origin/direction; assert a local +u port becomes the documented world optical axis; assert surface normal normalization.

- [x] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/unit/ComponentInteractionGolden.test.js`

Expected: FAIL because the pure interaction module does not exist.

- [x] **Step 3: Implement the minimal pose API**

Export `createComponentPose`, `rayToLocalSpace`, `rayToWorldSpace`, `resolveSurfaceNormal`, and `buildInteractionMetadata`. A pose has a world center and axis angle; all direction transformations use rotation only, while point transformations use translate then rotate.

- [x] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/unit/ComponentInteractionGolden.test.js`

Expected: PASS.

### Task 2: Make thin-lens surface identity independent of rotation

**Files:**
- Modify: `src/components/lenses/ThinLens.js`
- Modify: `tests/unit/LensRotationInvariant.test.js`

- [x] **Step 1: Preserve the existing RED test**

Run: `node --test tests/unit/LensRotationInvariant.test.js`

Expected: FAIL because `shapeProfile` is undefined.

- [x] **Step 2: Introduce normalized serializable surface profiles**

Implement profiles for thin, plano-convex, plano-concave, biconvex, biconcave, and custom lenses. Map a profile to immutable local front/back surface kinds and radius values. `setProperty('lensType', ...)` updates the profile, while `setProperty('angleDeg', ...)` changes only pose-derived geometry.

- [x] **Step 3: Run focused lens tests**

Run: `node --test tests/unit/LensRotationInvariant.test.js tests/unit/ThinLens.test.js`

Expected: PASS, including the 180-degree identity invariant.

### Task 3: Preserve placement during initial projection

**Files:**
- Modify: `src/schematic/SchematicProjector.js`
- Modify: `tests/unit/SchematicPositionPreservation.test.js`
- Modify: `tests/unit/SchematicProjector.test.js`

- [x] **Step 1: Preserve the existing RED test**

Run: `node --test tests/unit/SchematicPositionPreservation.test.js`

Expected: FAIL because the projector starts at its automatic `ORIGIN` and assigns `angleDeg: 0`.

- [x] **Step 2: Project a missing placement from bench state**

Add a single `benchPlacementToSchematicPlacement` helper. For first projection it copies finite bench x/y/angleDeg values and adds only schematic presentation defaults (`labelOffset`). Use automatic graph layout solely when the bench record is missing or invalid. Do not overwrite existing schematic placement.

- [x] **Step 3: Run focused projector tests**

Run: `node --test tests/unit/SchematicPositionPreservation.test.js tests/unit/SchematicProjector.test.js`

Expected: PASS, including lock and incremental-addition coverage.

### Task 4: Verify the integration gate

**Files:**
- Modify: `docs/generate_physics_redesign_docx.py`
- Modify: `docs/OPTICSLAB_PHYSICS_AND_SCHEMATIC_REDESIGN_PLAN.docx`

- [x] **Step 1: Run repository tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 2: Run browser smoke and inspect output**

Run: `npm run test:e2e`

Expected: PASS with a nonblank canvas screenshot at `output/playwright/smoke-canvas.png` and no captured console error.

- [x] **Step 3: Update phase evidence and risk record**

Regenerate the DOCX, run structural inspection, attempt DOCX rendering, and record any renderer environment limitation without claiming visual DOCX QA passed.
