# Professional Optics Diagram System - Quick Start Guide

## Overview

The Professional Optics Diagram System provides comprehensive tools for creating publication-quality optical diagrams with professional features including:

- 94+ professional optical component icons
- Intelligent measurement and calculation tools
- Advanced navigation with minimap and zoom controls
- Layer management and theme system
- Multiple export formats (SVG, PNG, PDF, EPS)
- Annotation system with LaTeX support
- Auto-routing and smart alignment
- Seamless simulation mode integration

## Quick Start

### 1. Basic Setup

```javascript
import { initializeProfessionalDiagramSystem } from './src/diagram/ComprehensiveIntegrationExample.js';

// Initialize the system
const system = initializeProfessionalDiagramSystem('app-container', 'canvas', {
    theme: 'professional' // or 'academic', 'presentation', 'dark', 'colorful', 'blueprint'
});
```

### 2. HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>Optical Diagram</title>
</head>
<body>
    <div id="app-container" style="position: relative; width: 100%; height: 100vh;">
        <canvas id="canvas" width="1920" height="1080"></canvas>
    </div>
    
    <script type="module" src="main.js"></script>
</body>
</html>
```

## Core Features

### 1. Component Placement

```javascript
// Show icon palette
system.togglePanel('icons');

// Or programmatically add components
system.addComponent({
    id: 'laser1',
    type: 'LaserSource',
    pos: { x: 100, y: 500 },
    angle: 0,
    wavelength: 632.8e-9 // 632.8 nm
});

system.addComponent({
    id: 'mirror1',
    type: 'Mirror',
    pos: { x: 300, y: 500 },
    angle: Math.PI / 4
});
```

### 2. Ray Tracing

```javascript
// Add a ray
system.addRay({
    id: 'ray1',
    source: { x: 100, y: 500 },
    target: { x: 300, y: 500 },
    color: '#ff0000',
    lineWidth: 2,
    wavelength: 632.8e-9
});

// Auto-route rays around obstacles
system.autoRouteRays();
```

### 3. Measurements

```javascript
// Show measurement panel
system.togglePanel('measurement');

// Measurements are interactive - click on canvas to measure
// - Distance: 2 clicks
// - Angle: 3 clicks (point1, vertex, point2)
// - Area: Multiple clicks, close polygon
```

### 4. Optical Calculations

```javascript
// Show calculator panel
system.togglePanel('calculator');

// Or use programmatically
import { getOpticsCalculator } from './src/diagram/calculation/OpticsCalculator.js';

const calculator = getOpticsCalculator();

// Thin lens equation
const result = calculator.thinLensEquation(
    0.1,    // focal length (m)
    0.15,   // object distance (m)
    null    // calculate image distance
);
console.log('Image distance:', result.imageDistance, 'm');
console.log('Magnification:', result.magnification);

// Gaussian beam propagation
const beam = calculator.gaussianBeam(
    632.8e-9,  // wavelength (m)
    50e-6,     // beam waist (m)
    0.1        // distance (m)
);
console.log('Beam radius:', beam.beamRadius, 'm');
console.log('Rayleigh range:', beam.rayleighRange, 'm');
```

### 5. Annotations

```javascript
import { getAnnotationManager, AnnotationType } from './src/diagram/annotations/AnnotationManager.js';

const annotationMgr = getAnnotationManager();

// Add text annotation
annotationMgr.createAnnotation({
    type: AnnotationType.TEXT,
    text: 'λ = 632.8 nm',  // Supports LaTeX: λ_{pump} = 532 nm
    position: { x: 150, y: 450 },
    style: {
        fontSize: 16,
        color: '#000000'
    }
});

// Add dimension annotation
annotationMgr.createAnnotation({
    type: AnnotationType.DIMENSION,
    points: [
        { x: 100, y: 500 },
        { x: 300, y: 500 }
    ],
    unit: 'mm'
});
```

### 6. Layer Management

```javascript
// Show layer panel
system.togglePanel('layers');

// Or use programmatically
import { getLayerManager } from './src/diagram/layers/LayerManager.js';

const layerMgr = getLayerManager();

// Create custom layer
layerMgr.createLayer('Optics', 1);
layerMgr.createLayer('Labels', 2);

// Set layer properties
layerMgr.setLayerOpacity('Optics', 0.8);
layerMgr.setLayerVisible('Labels', true);
```

### 7. Themes and Styling

```javascript
// Show theme panel
system.togglePanel('themes');

// Or apply theme programmatically
import { getThemeManager } from './src/diagram/styling/ThemeManager.js';

const themeMgr = getThemeManager();

// Apply built-in theme
themeMgr.applyTheme('professional');  // Black on white
themeMgr.applyTheme('academic');      // Traditional scientific
themeMgr.applyTheme('presentation');  // High contrast
themeMgr.applyTheme('dark');          // Dark mode
themeMgr.applyTheme('colorful');      // Color-coded
themeMgr.applyTheme('blueprint');     // Engineering style

// Create custom theme
themeMgr.createTheme('my-theme', {
    backgroundColor: '#ffffff',
    componentColor: '#000000',
    rayColor: '#ff0000',
    textColor: '#333333',
    gridColor: '#e0e0e0'
});
```

### 8. Alignment and Distribution

```javascript
// Align selected components
system.alignComponents('left');      // left, right, top, bottom, center, middle
system.distributeComponents('horizontal');  // horizontal, vertical

// Or use alignment manager directly
import { getAlignmentManager, AlignDirection } from './src/diagram/alignment/AlignmentManager.js';

const alignMgr = getAlignmentManager();

const components = [/* selected components */];
alignMgr.align(components, AlignDirection.CENTER_HORIZONTAL);
alignMgr.distribute(components, 'horizontal', 50); // 50px spacing
```

### 9. Grid and Snapping

```javascript
import { getGridManager, GridType } from './src/diagram/grid/GridManager.js';

const gridMgr = getGridManager();

// Configure grid
gridMgr.setGridType(GridType.RECTANGULAR);
gridMgr.setSpacing(20, 20);
gridMgr.setSnapEnabled(true);
gridMgr.setVisible(true);

// Snap point to grid
const snapped = gridMgr.snapToGrid({ x: 123, y: 456 });
```

### 10. Navigation

```javascript
// Show navigation panel
system.togglePanel('navigation');

// Programmatic navigation
system.navigationPanel.setZoom(1.5);
system.navigationPanel.pan('up');
system.fitView();

// Add bookmark
system.navigationPanel.addBookmark('Setup View', {
    zoom: 1.0,
    x: 0,
    y: 0
});
```

### 11. Export

```javascript
// Show export dialog
system.exportScene();

// Or export programmatically
import { getExportEngine, ExportFormat } from './src/diagram/ExportEngine.js';

const exportEngine = getExportEngine();

const scene = {
    components: system.components,
    rays: system.rays,
    annotations: system.annotationManager.getAllAnnotations()
};

// Export as SVG
const svgData = await exportEngine.exportSVG(scene, {
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff'
});

// Export as high-DPI PNG
import { getHighDPIExporter } from './src/diagram/export/HighDPIExporter.js';

const highDPIExporter = getHighDPIExporter();
const pngBlob = await highDPIExporter.exportHighDPI(scene, {
    width: 1920,
    height: 1080,
    dpi: 300,
    format: 'png'
});

// Export as EPS
import { getEPSExporter } from './src/diagram/export/EPSExporter.js';

const epsExporter = getEPSExporter();
const epsData = await epsExporter.exportEPS(scene, {
    width: 1920,
    height: 1080
});
```

### 12. Simulation Mode Integration

```javascript
// Switch to simulation mode
const simulationScene = system.switchToSimulation();

// Run simulation...
// (simulation code here)

// Switch back to diagram mode
system.switchFromSimulation(simulationScene);
```

## Available Components

### Light Sources (10)
- LaserSource (HeNe, Ti:Sapphire, Fiber, etc.)
- LEDSource
- WhiteLightSource
- PulsedLaserSource
- PointSource
- LineSource
- FanSource

### Optical Elements (50+)
- Mirrors (Flat, Concave, Convex, Parabolic, etc.)
- Lenses (Convex, Concave, Cylindrical, Achromatic, etc.)
- Beam Splitters (Cube, Plate, Polarizing)
- Polarizers (Linear, Circular, Wire Grid, etc.)
- Filters (Bandpass, Longpass, Shortpass, ND, etc.)
- Modulators (EOM, AOM, Phase, Amplitude)
- Crystals (Nonlinear, BBO, KTP, LiNbO3)

### Detectors (9)
- Photodiode
- APD (Avalanche Photodiode)
- PMT (Photomultiplier Tube)
- CCD Camera
- CMOS Camera
- SPAD (Single Photon Detector)
- Power Meter
- Spectrometer
- Beam Profiler

### Fiber Optics (9)
- Single Mode Fiber
- Multi Mode Fiber
- Polarization Maintaining Fiber
- Fiber Coupler
- Fiber Splitter
- Circulator
- Isolator
- Connector
- Attenuator

### Miscellaneous (10)
- Iris Aperture
- Pinhole
- Shutter
- Chopper
- Optical Table
- Kinematic Mount
- Translation Stage
- Rotation Stage
- Beam Dump
- Optical Isolator

## Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Ctrl/Cmd + C`: Copy
- `Ctrl/Cmd + V`: Paste
- `Ctrl/Cmd + A`: Select All
- `Delete`: Delete selected
- `Ctrl/Cmd + +`: Zoom in
- `Ctrl/Cmd + -`: Zoom out
- `Ctrl/Cmd + 0`: Reset zoom
- `Arrow Keys`: Pan view
- `Shift + Drag`: Constrain movement
- `Alt + Drag`: Duplicate

## Best Practices

### 1. Layer Organization
```javascript
// Organize by function
layerMgr.createLayer('Light Sources', 0);
layerMgr.createLayer('Optics', 1);
layerMgr.createLayer('Detectors', 2);
layerMgr.createLayer('Rays', 3);
layerMgr.createLayer('Labels', 4);
```

### 2. Consistent Styling
```javascript
// Use themes for consistency
themeMgr.applyTheme('professional');

// Or create custom style classes
const styleMgr = getStyleManager();
styleMgr.createStyleClass('laser-ray', {
    color: '#ff0000',
    lineWidth: 2,
    lineStyle: 'solid'
});
```

### 3. Annotations
```javascript
// Use LaTeX for scientific notation
annotationMgr.createAnnotation({
    text: 'P_{out} = 10 mW',  // Subscripts
    // or: 'λ^{2} = 400 nm'   // Superscripts
});
```

### 4. Export Settings
```javascript
// For publications
exportEngine.applyTemplate('journal');  // 300 DPI, PDF

// For presentations
exportEngine.applyTemplate('presentation');  // 150 DPI, PNG

// For web
exportEngine.applyTemplate('web');  // 96 DPI, SVG
```

## Troubleshooting

### Components not visible
- Check layer visibility
- Verify camera position and zoom
- Ensure components are within canvas bounds

### Export quality issues
- Increase DPI for raster formats (PNG)
- Use SVG for scalable graphics
- Check background color settings

### Performance issues
- Reduce number of visible components
- Disable grid when not needed
- Use layer visibility to hide unused elements
- Consider viewport culling for large diagrams

## Advanced Topics

### Custom Components
```javascript
// Define custom component type
const customComponent = {
    type: 'CustomOptic',
    render: (ctx, x, y, angle, size) => {
        // Custom rendering code
    },
    connectionPoints: [
        { x: -30, y: 0, type: 'input' },
        { x: 30, y: 0, type: 'output' }
    ]
};
```

### Batch Operations
```javascript
// Batch export multiple scenes
const scenes = [scene1, scene2, scene3];
const results = await exportEngine.batchExport(scenes, {
    format: 'png',
    dpi: 300
}, (current, total) => {
    console.log(`Exporting ${current}/${total}`);
});
```

### Custom Themes
```javascript
// Save current settings as theme
const currentTheme = themeMgr.getCurrentTheme();
themeMgr.saveTheme('my-custom-theme', currentTheme);
```

## Support

For issues, questions, or contributions:
- Check the full documentation in `/docs`
- Review example diagrams in `/examples`
- See API reference in `/docs/api`

## Next Steps

1. Explore the example diagrams in `/presets`
2. Try different themes and export formats
3. Create your first optical setup
4. Experiment with measurements and calculations
5. Export publication-quality figures

Happy diagramming! 🔬✨
