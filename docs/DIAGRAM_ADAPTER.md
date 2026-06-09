# Scene to Diagram Adapter

## Purpose

`SceneToDiagramAdapter` separates the optics simulation model from the professional drawing model.

The simulation layer owns physical components, ray propagation, interactions, and validation status. The diagram layer owns page geometry, normalized symbols, ray paths, annotations, connectors, and export/edit metadata.

This separation is the next recovery step for OpticsLab because it gives the project a stable bridge from "interactive optics simulator" to "paper-ready optics diagram tool" without rewriting the existing canvas.

## Data Flow

```text
simulation scene
  components + rays + annotations + diagram links
        |
        v
SceneToDiagramAdapter.convert()
        |
        v
OpticsLabDiagram
  page + diagram objects + source metadata
        |
        v
DiagramObjectSVGRenderer.render()
        |
        v
Professional layered SVG
        |
        v
SceneToDiagramAdapter.toExportScene()
        |
        v
ExportEngine SVG / PNG / PDF
```

## Diagram Object Model

The adapter emits an `OpticsLabDiagram` payload:

- `page`: width, height, margin, background.
- `objects`: normalized drawing objects.
- `source`: component/ray/annotation/link counts from the original scene.
- `metadata`: adapter identity and creation timestamp.

Supported object types:

- `page_frame`: locked page background and bounds.
- `symbol`: optical component symbol with position, angle, size, label, reliability metadata, and serializable properties.
- `ray_path`: rendered optical ray polyline with style, wavelength, intensity, and source component id.
- `connector`: diagram-mode relationship line.
- `annotation`: text note anchored in diagram coordinates.
- `label`: reserved for professional labels that are distinct from generic annotations.
- `group`: reserved for future grouped diagram objects.

## Design Constraints

- The adapter is one-way by default. It normalizes simulation state into diagram state, but it does not mutate the source scene.
- It produces an ExportEngine-compatible scene through `toExportScene()` so the existing export pipeline can be reused.
- It imports only component reliability metadata, avoiding a wide dependency cycle with the diagram subsystem.
- It accepts legacy and mixed scene shapes where possible: `pos`/`position`/`x,y`, `angleRad`/`angle`/`angleDeg`, and `pathPoints`/`points`/`history`.

## Roadmap Value

This module creates a practical migration path:

1. Use the current simulation canvas for physics interaction.
2. Convert simulation output into normalized diagram objects.
3. Render diagram objects directly through `DiagramObjectSVGRenderer` when a clean, object-model-native SVG is needed.
4. Add a professional editor on top of diagram objects: alignment, snapping, typography, labels, figure panels, symbol library, and publication export presets.
5. Keep physics correctness validation independent from visual polish.

That direction supports OpticsLab's strongest product position: a research/education optics workbench that can both simulate optical layouts and produce clean publication-quality figures.

## Professional SVG Rendering Layer

`DiagramObjectSVGRenderer` is the first renderer built specifically for `OpticsLabDiagram`.

It emits a layered SVG structure:

- `diagram-object-rays`: optical ray paths.
- `diagram-object-connectors`: diagram-mode links.
- `diagram-object-symbols`: component symbols.
- `diagram-object-annotations`: labels and annotations.
- page/background layers for stable export framing.

The current product export defaults are tuned for figure output:

- `autoFit: true`: the SVG `viewBox` is cropped to content bounds instead of the full simulation canvas.
- `contentPadding: 72`: content keeps a stable margin around the cropped figure.
- `showRayArrows: true`: ray paths include direction arrows.
- `stylePreset: paper`: professional SVG defaults to a restrained paper-oriented palette.
- `showOpticalAxis: true`: lens symbols include a dashed optical axis.
- `showFocalMarkers: true`: lens symbols include focal tick marks and `F` / `F'` labels when focal length metadata exists.
- `rayGlow`: disabled by paper style unless explicitly overridden.

The renderer is intentionally separate from `ExportEngine`. `ExportEngine` remains the broad PNG/SVG/PDF pipeline for current app exports, while `DiagramObjectSVGRenderer` is the object-model-native path for future paper-ready editing and figure export.

Near-term integration options:

1. Use the File menu item "Export Professional SVG" to serialize the current scene through `sceneData.diagram` and `DiagramObjectSVGRenderer`.
2. Call `window.generateProfessionalSVGString(options)` in browser automation or future UI code when a raw SVG string is needed.
3. Use the renderer as the preview surface for a future diagram-object editor.
4. Feed renderer output into PDF generation after typography and layout controls are mature.

## Current Product Entry Points

The browser and Electron entry points now expose:

- `window.generateProfessionalSVGString(options)`: returns a complete SVG document from the current simulation scene.
- `window.exportProfessionalSVG()`: downloads the generated SVG.
- File menu: `Export Professional SVG`.

The existing scene JSON export remains backward-compatible and continues to include legacy `components`, plus the new `diagram` payload for professional drawing workflows.
