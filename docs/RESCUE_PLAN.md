# OpticsLab Rescue Plan

## 1. Product Positioning

OpticsLab should be positioned as a research sketching and interactive optics validation workbench, not as a replacement for commercial optical design suites.

The credible first product is:

- A fast 2D geometric optics playground for education, talks, and early lab-layout thinking.
- A thin-lens and paraxial optics explainer with visible assumptions.
- A diagram drafting tool that can turn simulation scenes into clean optical schematics for further polishing.

It should not currently claim:

- Full physical accuracy for every component.
- Publication-ready export without manual review.
- Commercial-grade optical design, tolerancing, aberration analysis, or CAD integration.

## 2. Quality Boundaries

Every optical element must carry a reliability label:

- `exact_geometric`: deterministic geometric result with a testable law.
- `paraxial_approximation`: valid only under small-angle or idealized assumptions.
- `educational_visualization`: useful for concept demos, not quantitative claims.
- `experimental`: incomplete or not yet validated.
- `visual_only`: diagram symbol only.

The UI should surface these labels before users rely on a result.

## 3. Recovery Phases

### P0: Stabilize The Existing App

Goal: make the app testable and honest.

Done in the current rescue pass:

- Restored ESLint through a minimal flat config.
- Disabled noisy per-frame ray-tracing debug logs by default.
- Added component reliability metadata.
- Added golden unit tests for dielectric refraction, thin-lens focusing, and beam splitting.
- Renamed user-facing "professional drawing" language to "research diagram" language.
- Renamed lens imaging user-facing language to ideal thin-lens imaging.

Exit criteria:

- `npm run lint` passes.
- `npm run test:unit` passes.
- Core modes load without console noise that hides real errors.

### P1: Make The Simulation Core Trustworthy

Goal: separate optical rules from rendering and UI events.

Work items:

- Introduce a small pure `optics-core` layer for ray interaction math.
- Move mirror, dielectric block, prism, thin lens, beam splitter, and grating rules into testable pure functions.
- Add golden tests for reflection, total internal reflection, Snell refraction, power conservation, thin-lens focus, and ray termination.
- Add a visual debug overlay that can show normals, hit points, segment indices, and reliability labels.
- Mark untested components as `experimental` or `visual_only` until validated.

Exit criteria:

- Every `exact_geometric` component has a golden test.
- Ray interaction math can be tested without a browser.
- UI rendering cannot silently change physics behavior.

### P2: Rebuild The Diagram Layer Around A Real Editor Model

Goal: stop hand-rolling a full drawing editor in ad hoc Canvas code.

Recommended route: Fabric.js first.

Why Fabric.js:

- Official docs expose an interactive canvas object model.
- Canvas state can be serialized via `toJSON()` and restored with `loadFromJSON()`.
- Canvas content can be exported to SVG with `toSVG()`.
- It fits the current non-React app better than a wholesale framework migration.

Fabric.js adapter scope:

- `DiagramObject`: optics component symbol, ray path, label, annotation, measurement, group.
- `SceneToDiagramAdapter`: converts simulation components and traced rays into editable diagram objects.
- `DiagramExportAdapter`: exports SVG and high-DPI PNG with predictable page bounds.
- `DiagramStylePreset`: journal-like line widths, fonts, arrows, symbol sizes, and color palettes.

Alternative route: tldraw after stabilization.

Why tldraw remains attractive:

- Strong custom shape and binding model.
- Built-in snapshot persistence.
- Modern interaction quality for infinite canvas workflows.
- Better long-term fit if OpticsLab becomes a collaborative diagram product.

Why not start with tldraw immediately:

- The current app is not React-based.
- A tldraw migration would touch build tooling, component architecture, and persistence at once.
- It is better treated as a separate P3/P4 product rewrite or embedded editor shell.

Exit criteria:

- A simulation scene can be converted to editable diagram objects.
- SVG export keeps stable geometry, text, stroke widths, and page bounds.
- The app no longer promises publication-ready export until visual QA tests prove it.

### P3: Build Product Value

Goal: make OpticsLab useful enough to sell or sustain.

Potential commercial value:

- Template packs for common lab setups: interferometer, microscope, 4f system, cavity, spectroscopy beamline.
- Teaching mode for optics courses: guided scenes, sliders, assumptions, and quizzes.
- Research diagram workflow: convert simulation to schematic, polish labels, export SVG/PDF.
- Team asset library: reusable optics symbols, house styles, and diagram presets.
- Desktop build for offline teaching and lab-note workflows.

Commercial model:

- Free core: educational simulator and basic diagrams.
- Paid Pro: export presets, template packs, advanced diagram editing, batch export, desktop convenience.
- Institutional: classroom packs, shared templates, offline deployment, support.

## 4. Engineering Rules Going Forward

- Do not add a new optical component without a reliability label.
- Do not mark a component `exact_geometric` without a golden test.
- Do not add diagram features that bypass the editor object model.
- Do not add commercial claims before the relevant acceptance tests exist.
- Keep internal compatibility keys such as `lens_imaging` and `diagram` stable unless a migration is added.

## 5. Next Implementation Slice

The next high-leverage slice should be small:

1. Add a visible reliability badge in the inspector for selected components.
2. Add golden tests for mirror reflection and total internal reflection.
3. Create a `SceneToDiagramAdapter` interface without introducing a new rendering dependency.
4. Prototype Fabric.js in an isolated page or module, not in the main render loop.

This keeps the rescue incremental: physics quality improves, user trust improves, and the diagram rewrite gets a controlled entry point.
