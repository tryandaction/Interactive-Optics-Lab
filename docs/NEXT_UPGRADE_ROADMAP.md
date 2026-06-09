# OpticsLab Next Upgrade Roadmap

## Current State

OpticsLab has reached a stable rescue baseline, not a final professional product baseline.

Verified baseline:

- `npm test` passes: lint plus unit tests.
- `npm run test:e2e` passes: fast browser smoke test.
- 119 unit tests pass.
- Browser smoke creates a real canvas screenshot with components and ray paths.
- Diagram diagnostics report `failed: 0` with `optional: 1`.
- Core geometric optics, selected polarization behavior, thin-lens imaging, ray rendering style, grid rendering style, and export ray styling now have regression tests.

This is enough to call the project revived. It is not enough to claim replacement for Zemax, COMSOL, CODE V, Illustrator, Inkscape, or journal-production diagram workflows.

## Product Positioning

The credible near-term product is:

- Interactive 2D optics workbench for teaching, talks, and early lab-layout sketches.
- Transparent geometric/paraxial simulation tool with reliability labels and assumptions.
- Research-diagram prototype tool that can export clean SVG/PNG/PDF drafts for human review and polish.

The product must not claim:

- Full quantitative optical design accuracy.
- Aberration, tolerance, coating, or CAD-grade modeling.
- Publication-ready final figures without review.
- Commercial reliability for every advanced component.

## Upgrade Layers

### Layer 1: Physics Trust

Goal: every simulated result has an explicit reliability boundary.

Work:

- Build a component validation matrix covering every optical component.
- Keep `exact_geometric` only for components with golden tests.
- Mark advanced or unvalidated components as `experimental`, `educational_visualization`, or `visual_only`.
- Add tests for remaining exact laws: prism exit surfaces, PBS edge cases, grating invalid orders, fiber coupling limits, wave plate special cases, detector accumulation.
- Add debug overlays for normals, hit points, local axes, segment IDs, and reliability labels.

Exit criteria:

- No component is unlabeled.
- No component is labeled exact without tests.
- A user can see what the simulation is allowed to mean before trusting it.

### Layer 2: Professional Diagram Editor Model

Goal: stop treating professional diagrams as raw canvas strokes.

Recommended route: prototype Fabric.js as an isolated editor adapter.

Rationale:

- Fabric.js provides a canvas object model.
- Fabric.js supports JSON serialization through `toJSON()`.
- Fabric.js objects support SVG export through `toSVG()`.
- It can be embedded into the current non-React app with less migration risk than a full tldraw/React rewrite.

Work:

- Create `SceneToDiagramAdapter`.
- Define diagram object types: symbol, ray path, connector, label, annotation, measurement, group, page frame.
- Create an isolated prototype page, not a main-loop rewrite.
- Convert a current scene into editable diagram objects.
- Add object-level style presets for journal-like figures.

Exit criteria:

- A simple simulation scene can be converted to editable diagram objects.
- Diagram objects can be selected, moved, grouped, serialized, restored, and exported.
- Simulation logic and diagram editing remain separate.

### Layer 3: Export And Visual QA

Goal: exported diagrams should be predictable, inspectable, and good enough as draft figures.

Work:

- Create export presets: teaching slide, lab notebook, paper draft, poster.
- Lock page sizes, margins, stroke scales, grid visibility, font stacks, and color palettes.
- Add SVG snapshot tests for export structure.
- Add Playwright visual smoke tests for export dialog and generated files.
- Create a small gallery of golden exported diagrams for manual review.

Exit criteria:

- Exported SVG contains stable layers and readable IDs.
- Exported PNG/PDF match the chosen preset dimensions.
- No export format silently loses rays, labels, or core components.

### Layer 4: UI And Workflow Polish

Goal: make common workflows feel deliberate rather than accumulated.

Work:

- Simplify toolbar grouping and mode switching.
- Reduce noisy console logs and fix text encoding/garbled Chinese output.
- Add a reliability/assumptions panel that is useful, not decorative.
- Improve inspector copy and property grouping.
- Improve import/export flow around presets and diagrams.
- Keep keyboard shortcuts discoverable and tested.

Exit criteria:

- A new user can create a simple optical sketch in under one minute.
- A returning user can export a clean draft diagram without reading code or docs.
- Console logs do not hide real errors.

### Layer 5: Full E2E And Release Gate

Goal: make releases boring.

Work:

- Keep `npm test` as the fast unit/lint gate.
- Keep `npm run test:e2e` as fast browser smoke.
- Use `npm run test:e2e:core` as the focused deep workflow gate.
- Stabilize `npm run test:e2e:full` as release-level deep flow validation.
- Add CI-friendly artifacts: screenshots, console logs, exported files, and failure traces.
- Split the full e2e into smaller scenarios if release-level validation continues to time out.

Exit criteria:

- Fast gate runs reliably on every change.
- Full gate can run before releases without manual cleanup.
- Failure output identifies a user-visible workflow, not just a timeout.

### Layer 6: Commercial Readiness

Goal: only sell what is reliable and clearly scoped.

Possible value:

- Teaching scenes and guided optics lessons.
- AMO/laser lab layout template packs.
- Research diagram style presets.
- Offline desktop package for classrooms/labs.
- Team/institution template library.

Do not commercialize until:

- Reliability labels are complete.
- Export presets are stable.
- Fast and full validation gates are reliable.
- Public docs clearly state what is and is not physically accurate.
- Example diagrams look good enough to represent the product honestly.

## Immediate Next Coding Slices

Recommended order:

1. Create a component validation matrix document and test checklist.
2. Add remaining golden tests for high-confidence exact components.
3. Split the full e2e script into smaller scenario scripts.
4. Build an isolated Fabric.js diagram adapter prototype.
5. Add visual export QA fixtures.
6. Clean garbled Chinese/encoding in user-facing docs and console output.

## Decision

Do not keep piling professional drawing features into the current canvas render loop. The project is now stable enough to support the next architecture step: a separate diagram object model and validation matrix.
