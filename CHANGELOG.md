# Changelog / 更新日志

All notable changes to OpticsLab will be documented in this file.

## [1.2.0] - 2026-02-11

### Fixed / 修复
- Fixed professional diagram mode not showing any visual effects after mode switch
- Fixed SVG icon async loading never triggering canvas redraw (root cause of invisible diagram mode)
- Fixed `needsRetrace` not exposed to window scope, preventing external modules from triggering redraws
- Fixed `window.rays` reference in `_getCurrentScene()` — now correctly uses `window.currentRayPaths`
- Fixed localStorage diagram mode restore timing issue (mode set before listeners registered)
- Added missing `.catch()` handler for SVG icon loading promises
- Added try-catch error handling in `_enterDiagramMode()` and `_exitDiagramMode()`

### Added / 新增
- Icon preloading when entering diagram mode — all SVG icons pre-cached before first render
- Enhanced mode switch redraws with delayed retrace triggers (300ms + 800ms)
- Post-initialization diagram mode detection for localStorage restore
- 4 new professional component icons: FaradayRotator, FaradayIsolator, WavePlate, CustomComponent
- BeamSplitter 'BS' type alias for icon resolution
- POLARIZATION icon category
- GitHub Actions CI/CD workflow for automated deployment
- CHANGELOG.md

### Synced / 同步
- All diagram mode fixes synced to desktop Electron version

## [1.1.1] - 2026-02-07

### Added / 新增
- Commercial landing page copy (COMMERCIAL_LANDING_PAGE.md)
- Commercial plan document (COMMERCIAL_PLAN.md)
- Desktop Electron packaging with Windows NSIS installer
- Desktop guide (DESKTOP_GUIDE.md)
- E2E test infrastructure with Playwright
- Property-based diagram system tests

## [1.1.0] - 2026-02-05

### Added / 新增
- Professional diagram mode with 94+ optical components
- ProfessionalIconManager with SVG and builtin Canvas 2D icons
- ProfessionalIconLibrary with 8 core SVG icons
- ProfessionalIconLibraryExtended with 40+ extended SVG icons
- DiagramModeIntegration orchestrator (~3800 lines)
- ModeManager for simulation/diagram mode switching
- ExportEngine supporting SVG/PNG/JPEG/PDF/EPS export
- TemplateLibrary with 30+ built-in experiment templates
- AdvancedTemplateManager with template search and categorization
- ConnectionPointManager for visual component connections
- Annotation system with text labels, subscripts, and auto-layout
- Grid, snap, and alignment tools
- Professional themes and styling system

## [1.0.0] - 2026-01-28

### Added / 新增
- Initial release of OpticsLab
- Ray tracing simulation engine
- 47 optical component classes
- Canvas 2D rendering with requestAnimationFrame loop
- Scene management with localStorage persistence
- Undo/redo history system
- Clipboard operations (copy/paste/cut)
- Keyboard shortcuts
- Component inspector panel
- File system adapter for scene import/export
