# OpticsLab Phase 2 Product Architecture

## Product Boundary

OpticsLab has two product workspaces:

1. **Bench** places physical components and evaluates the current optical path with the validated physics engine.
2. **Schematic** presents the same experiment as an editable, white-page optical setup diagram.

Ideal thin-lens imaging is a bench analysis overlay. It is not a third workspace. The legacy diagram subsystem is a compatibility consumer and no longer owns product state.

## Architecture Decision

The schematic editor uses native SVG DOM rather than Fabric.js or a React/tldraw rewrite.

- Native SVG keeps symbols, text, paths, groups, IDs, and layers editable after export.
- It fits the repository's existing ES module and no-build architecture.
- It avoids a second serialization model and an additional runtime dependency.
- Selection, transforms, snapping, grouping, and ordering are implemented against the same schematic records persisted in the document.

## OpticsDocument v3

`OpticsDocument` is the only persisted product aggregate.

```js
{
  schemaVersion: '3.0.0',
  metadata: {
    id, title, createdAt, updatedAt, activeWorkspace,
    sourceVersion, revision
  },
  components: [{
    id, type, name, properties, ports
  }],
  beamGraph: {
    nodes: [{ id, componentId, portId, role }],
    edges: [{
      id, from, to, direction, wavelengthNm, frequencyHz,
      frequencyShiftHz, polarization, intensity, pathKind,
      bidirectional, points, termination
    }]
  },
  views: {
    bench: {
      camera, placements, settings,
      analysis: { lensImaging }
    },
    schematic: {
      page, camera, placements, paths, groups, layers,
      projection: { initialized, lockedComponentIds }
    }
  },
  annotations: [{ id, view, kind, text, anchor, position, style }]
}
```

Shared component records contain identity, display name, optical properties, and stable port definitions. Bench and schematic coordinates exist only in their respective view records.

## Stable Ports And BeamGraph

Each component type resolves deterministic ports from a registry. Port IDs never depend on array order or current coordinates. Examples:

- `LaserSource`: `output`
- `AcoustoOpticModulator`: `input`, `zeroOrder`, `firstOrder`
- `Mirror`: `surface`
- `BeamSplitter`/PBS: `input`, `transmitted`, `reflected`, `return`
- `WavePlate`: `input`, `output`
- `AtomicCell`: `input`, `output`
- terminal devices: `input`

BeamGraph edges connect `{ componentId, portId }` endpoints and retain spectral, polarization, style, double-pass, and termination semantics. Auxiliary/dashed paths are explicit `pathKind` values, never inferred from stroke color.

The graph builder consumes traced ray segments and interaction metadata. The validated ray tracer stays authoritative for physical geometry; BeamGraph is a durable topology and presentation model, not a replacement physics solver.

## Document Services

- `OpticsDocument`: constructors, normalization, cloning, invariant helpers.
- `OpticsDocumentMigrator`: ordered `1.0 -> 1.1 -> 2.0.0 -> 3.0.0` migrations.
- `OpticsDocumentSerializer`: validation and deterministic JSON round trips.
- `ComponentCodecRegistry`: runtime component to document record and document record to constructor data.
- `DocumentStore`: observable state, revision tracking, undo/redo, and focused mutations.
- `DocumentFileController`: open, save, save-as, download fallback, and `.opticslab.json` naming.
- `DocumentRecovery`: debounced local recovery with checksum and schema migration.

The old `Serializer` remains as a facade delegating to the v3 serializer. `generateSceneDataObject()` delegates to one document capture path and stops emitting version 1.1.

## Bench Workspace

The existing physics canvas remains intact. Focused controllers add:

- optical-path and grid snapping;
- placement preview with predicted orientation;
- configurable angle locking;
- numeric position/angle editing through existing inspector contracts;
- multi-selection and alignment commands;
- one shared command history for move, rotate, insert, add, and delete;
- insert-into-beam, which places a component at the closest beam segment, orients its input port, and splits the durable graph edge.

Lens imaging reads bench components and writes analysis overlay state only.

## Schematic Workspace

`src/schematic` owns an independent SVG editor mounted beside the bench canvas.

- True white page with explicit dimensions and boundary.
- Original optics symbols rendered as semantic SVG groups.
- Separate layers for page, paths, components, labels, and annotations.
- Pointer selection, marquee, dragging, snapping, alignment, grouping, ordering, label anchors, dashed/auxiliary paths, and double-pass paths.
- Schematic history uses document commands and never changes bench placements.

## Projection And Synchronization

`SchematicProjector` creates initial placements and paths from components and BeamGraph. Projection follows three rules:

1. Initialize only missing schematic records.
2. Never overwrite a component ID listed in `lockedComponentIds`.
3. Incremental sync may add/delete shared identities, names, and graph connections without changing existing schematic coordinates or label offsets.

Both views subscribe to `DocumentStore`. Shared mutations propagate by component/edge ID; view mutations remain scoped to the originating view.

## Persistence

Save files use `.opticslab.json` and always contain a complete v3 document. When supported, File System Access handles allow Save to rewrite the chosen file and Save As to choose a new target. Other browsers use file input plus Blob download. Recovery stores the complete serialized document separately from the user's chosen file and is cleared after successful save.

## Export

- SVG is generated directly from schematic records with stable layer IDs, semantic object IDs, text elements, page bounds, and non-scaling strokes.
- PNG renders the same SVG at a selected scale.
- PDF embeds the stable SVG/PNG page through the existing jsPDF runtime.
- Export never regenerates schematic positions from bench data.

## Compatibility

The old `src/diagram` tree remains readable during the transition. Its public entry points delegate to the v3 document/projector/exporter where practical. No new feature may import an old diagram interaction manager. Old modules are removed only after repository-wide call searches and E2E coverage show no active consumer.

## Verification Gates

Each phase requires:

1. focused unit tests with a witnessed failing test before implementation;
2. `npm test` regression gate;
3. browser workflow exercise and screenshot inspection;
4. a recorded residual-risk check before the next phase.

Final acceptance covers the Laser -> AOM -> Mirror -> PBS -> WavePlate -> AtomicCell setup, double-view round trip, editable SVG layers, refresh recovery, and 100-component interaction performance.
