$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot/../.."
$rootPath = $root.Path -replace "\\", "/"

$outputDir = "$rootPath/output/playwright"
$exportDir = "$outputDir/exports"
$logDir = "$outputDir/logs"

New-Item -ItemType Directory -Force -Path "$outputDir", "$exportDir", "$logDir" | Out-Null

function Invoke-PwCli {
    param([string[]]$CliArgs)
    npm exec --yes --package "@playwright/cli" -- playwright-cli @CliArgs
    if ($LASTEXITCODE -ne 0) {
        throw "playwright-cli failed: $($CliArgs -join ' ')"
    }
}

function Invoke-RunCode {
    param([string]$Code)
    $singleLine = ($Code -replace "\r?\n", " ").Trim()
    Invoke-PwCli @("run-code", $singleLine)
}

function Wait-ForPort {
    param(
        [int]$Port,
        [int]$TimeoutSec = 30
    )
    $start = Get-Date
    while ((Get-Date) - $start -lt [TimeSpan]::FromSeconds($TimeoutSec)) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $iar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            $success = $iar.AsyncWaitHandle.WaitOne(500, $false)
            if ($success) {
                $client.EndConnect($iar) | Out-Null
                $client.Close()
                return $true
            }
            $client.Close()
        } catch {
            try { $client.Close() } catch {}
        }
        Start-Sleep -Milliseconds 300
    }
    return $false
}

$env:PW_OUTPUT_DIR = $outputDir
$env:PW_EXPORT_DIR = $exportDir
$env:PW_PRESET_PATH = "$rootPath/presets/diagram_example_mot_paper.json"
$env:PLAYWRIGHT_CLI_SESSION = "opticslab-e2e"

$server = Start-Process -FilePath "npm" -ArgumentList @("exec", "--yes", "--package", "http-server", "--", "http-server", "-p", "8080", "-c-1") -WorkingDirectory $rootPath -PassThru -WindowStyle Hidden
$serverType = "npm"

try {
    $ready = Wait-ForPort -Port 8080 -TimeoutSec 30
    if (-not $ready) {
        if ($server -and -not $server.HasExited) {
            $server | Stop-Process
        }
        $server = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "8080") -WorkingDirectory $rootPath -PassThru -WindowStyle Hidden
        $serverType = "python"
        $ready = Wait-ForPort -Port 8080 -TimeoutSec 30
    }
    if (-not $ready) {
        throw "Server not ready on port 8080 within 30 seconds"
    }

    Invoke-PwCli @("open", "http://localhost:8080/index.html")
$setup = @'
async (page) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector('#opticsCanvas');
  await page.waitForFunction(() => window.unifiedProjectPanel && window.unifiedProjectPanel.getProjectManager);
  await page.waitForFunction(() => window.__LEGACY_GLOBALS_LOADED__ === true);
  await page.evaluate(() => {
    window.__pwConsoleErrors = [];
    const record = (msg) => { try { window.__pwConsoleErrors.push(String(msg)); } catch {} };
    const orig = console.error;
    console.error = (...args) => {
      let msg = '';
      try { msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '); } catch { msg = String(args); }
      record(msg);
      orig(...args);
    };
    window.addEventListener('error', e => record(e.message || 'error'));
    window.addEventListener('unhandledrejection', e => record(e.reason?.message || String(e.reason)));
  });
}
'@
    Invoke-RunCode $setup

    $projectSetup = @'
async (page) => {
  await page.evaluate(async () => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    await pm.createProject({ name: 'E2E Project', storageMode: 'localStorage' });
    const root = await pm.createScene('E2E Scene', { directoryPath: '' });
    const empty = (name) => window.Serializer?.createEmptyScene ? window.Serializer.createEmptyScene(name) : { name, components: [], settings: {} };
    const move = await pm.createSceneFromData('Scene To Move', empty('Scene To Move'), { open: false, directoryPath: '' });
    await pm.createSubProject('FolderA', '');
    await pm.createSubProject('Sub', 'FolderA');
    await pm.renameDirectory('FolderA', 'FolderRenamed');
    await pm.moveScene(move.id, 'FolderRenamed/Sub');
    await pm.createSubProject('Temp', '');
    await pm.createSceneFromData('Temp Scene', empty('Temp Scene'), { open: false, directoryPath: 'Temp' });
    await pm.deleteDirectory('Temp');
    const tree = await pm.getProjectTree();
    window.__e2eTree = tree;
    localStorage.setItem('opticslab_e2e_scene_id', root.id);
  });
}
'@
    Invoke-RunCode $projectSetup

    $assertTree = @'
async (page) => {
  const tree = await page.evaluate(() => window.__e2eTree);
  if (!tree || tree.type !== 'project') throw new Error('project tree missing');
  const find = (node, pathValue) => {
    if (!node) return false;
    if (node.type === 'directory' && node.path === pathValue) return true;
    return (node.children || []).some(child => find(child, pathValue));
  };
  if (!find(tree, 'FolderRenamed') || !find(tree, 'FolderRenamed/Sub')) throw new Error('directory tree missing');
  const recentCount = await page.evaluate(() => {
    const data = localStorage.getItem('opticslab_recent_projects');
    return data ? JSON.parse(data).length : 0;
  });
  if (recentCount <= 0) throw new Error('recent projects not recorded');
  const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
}
'@
    Invoke-RunCode $assertTree

    $addComponents = @'
async (page) => {
  const rect = await page.locator('#opticsCanvas').boundingBox();
  if (!rect) throw new Error('canvas not found');
  const posLaser = { x: Math.round(rect.width * 0.2), y: Math.round(rect.height * 0.5) };
  const posMirror = { x: Math.round(rect.width * 0.5), y: Math.round(rect.height * 0.5) };
  const posLens = { x: Math.round(rect.width * 0.65), y: Math.round(rect.height * 0.5) };
  const posSplitter = { x: Math.round(rect.width * 0.8), y: Math.round(rect.height * 0.6) };
  const clickTool = async (type, pos) => {
    await page.click(`button[data-type='${type}']`);
    await page.mouse.click(rect.x + pos.x, rect.y + pos.y);
    await page.waitForTimeout(100);
  };
  await clickTool('LaserSource', posLaser);
  await clickTool('Mirror', posMirror);
  await clickTool('ThinLens', posLens);
  await clickTool('BeamSplitter', posSplitter);
  await page.evaluate((pos) => { window.__e2ePos = pos; }, { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, posLaser, posMirror, posLens, posSplitter });
  const count = await page.evaluate(() => (window.components || []).length);
  if (count < 4) throw new Error('components not added');
  await page.waitForFunction(() => window.currentRayPaths && window.currentRayPaths.length > 0, null, { timeout: 15000 });
  const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
}
'@
    Invoke-RunCode $addComponents

    $modeSwitchChecks = @'
async (page) => {
  await page.evaluate(() => {
    if (typeof switchMode === 'function') {
      switchMode('lens_imaging');
      return;
    }
    document.getElementById('menu-mode-lensimaging')?.click();
  });
  await page.waitForFunction(() => (typeof currentMode !== 'undefined' ? currentMode : window.currentMode) === 'lens_imaging', null, { timeout: 5000 });
  await page.evaluate(() => {
    if (typeof switchMode === 'function') {
      switchMode('ray_trace');
      return;
    }
    document.getElementById('menu-mode-raytrace')?.click();
  });
  await page.waitForFunction(() => (typeof currentMode !== 'undefined' ? currentMode : window.currentMode) === 'ray_trace', null, { timeout: 5000 });
  const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
}
'@
    Invoke-RunCode $modeSwitchChecks

    $moveUndo = @'
async (page) => {
  const pos = await page.evaluate(() => window.__e2ePos);
  const rect = pos.rect;
  await page.keyboard.down('Shift');
  await page.mouse.click(rect.x + pos.posMirror.x, rect.y + pos.posMirror.y);
  await page.mouse.click(rect.x + pos.posLens.x, rect.y + pos.posLens.y);
  await page.keyboard.up('Shift');
  const before = await page.evaluate(() => {
    const get = (t) => {
      const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === t);
      if (!comp) return null;
      const p = comp.pos || comp.position || comp.center || comp.p || comp;
      return { x: p?.x ?? comp.x ?? 0, y: p?.y ?? comp.y ?? 0 };
    };
    return { mirror: get('Mirror'), lens: get('ThinLens') };
  });
  if (!before.mirror || !before.lens) throw new Error('components missing for move');
  await page.mouse.move(rect.x + pos.posMirror.x, rect.y + pos.posMirror.y);
  await page.mouse.down();
  await page.mouse.move(rect.x + pos.posMirror.x + 40, rect.y + pos.posMirror.y + 20);
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const get = (t) => {
      const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === t);
      if (!comp) return null;
      const p = comp.pos || comp.position || comp.center || comp.p || comp;
      return { x: p?.x ?? comp.x ?? 0, y: p?.y ?? comp.y ?? 0 };
    };
    return { mirror: get('Mirror'), lens: get('ThinLens') };
  });
  if (after.mirror.x === before.mirror.x && after.mirror.y === before.mirror.y) throw new Error('mirror did not move');
  if (after.lens.x === before.lens.x && after.lens.y === before.lens.y) throw new Error('lens did not move');
  await page.keyboard.press('Control+Z');
  await page.waitForTimeout(200);
  const undo = await page.evaluate(() => {
    const get = (t) => {
      const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === t);
      if (!comp) return null;
      const p = comp.pos || comp.position || comp.center || comp.p || comp;
      return { x: p?.x ?? comp.x ?? 0, y: p?.y ?? comp.y ?? 0 };
    };
    return { mirror: get('Mirror'), lens: get('ThinLens') };
  });
  if (Math.abs(undo.mirror.x - before.mirror.x) > 0.5) throw new Error('undo move failed');
  await page.keyboard.press('Control+Y');
  await page.waitForTimeout(200);
}
'@
    Invoke-RunCode $moveUndo

    $rotateUndo = @'
async (page) => {
  const before = await page.evaluate(() => {
    const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === 'Mirror');
    if (!comp) return null;
    return comp.angleRad ?? comp.angle ?? 0;
  });
  if (before === null) throw new Error('mirror missing for rotate');
  const after = await page.evaluate(() => {
    const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === 'Mirror');
    if (!comp) return null;
    const prev = comp.angleRad ?? comp.angle ?? 0;
    const next = prev + 0.2;
    comp.angleRad = next;
    if (typeof comp.onAngleChanged === 'function') comp.onAngleChanged();
    if (window.historyManager && window.RotateComponentCommand) {
      window.historyManager.addCommand(new window.RotateComponentCommand(comp, prev, next));
    }
    return comp.angleRad ?? comp.angle ?? 0;
  });
  if (after === null || after === before) throw new Error('rotation failed');
  await page.evaluate(() => { window.historyManager?.undo?.(); });
  await page.waitForTimeout(200);
  const undo = await page.evaluate(() => {
    const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === 'Mirror');
    if (!comp) return null;
    return comp.angleRad ?? comp.angle ?? 0;
  });
  if (undo === null || Math.abs(undo - before) > 0.0001) throw new Error('undo rotate failed');
  await page.evaluate(() => { window.historyManager?.redo?.(); });
  await page.waitForTimeout(200);
}
'@
    Invoke-RunCode $rotateUndo

    $copyAnnotate = @'
async (page) => {
  const pos = await page.evaluate(() => window.__e2ePos);
  const rect = pos.rect;
  const countBefore = await page.evaluate(() => (window.components || []).length);
  await page.mouse.click(rect.x + pos.posLaser.x, rect.y + pos.posLaser.y);
  await page.keyboard.press('Control+C');
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(300);
  let countAfter = await page.evaluate(() => (window.components || []).length);
  if (countAfter <= countBefore) {
    await page.evaluate(() => {
      const integration = window.getDiagramModeIntegration?.();
      const manager = integration?.getModule?.('interactionManager');
      if (manager?.copySelection && manager?.paste) {
        manager.copySelection();
        manager.paste();
      }
    });
    await page.waitForTimeout(300);
    countAfter = await page.evaluate(() => (window.components || []).length);
  }
  if (countAfter <= countBefore) throw new Error('copy/paste failed');
  await page.evaluate(() => {
    const mgr = window.getAnnotationManager?.();
    if (!mgr) throw new Error('annotation manager missing');
    const ann = mgr.addAnnotation({ text: 'E2E Note', position: { x: 100, y: 120 } });
    mgr.updateAnnotation(ann.id, { text: 'E2E Note Updated', position: { x: 140, y: 150 } });
    window.__e2eAnnotationId = ann.id;
  });
  const annText = await page.evaluate(() => {
    const mgr = window.getAnnotationManager?.();
    const ann = mgr?.getAnnotation(window.__e2eAnnotationId);
    return ann?.text || '';
  });
  if (annText !== 'E2E Note Updated') throw new Error('annotation update failed');
  await page.keyboard.press('Control+S');
  await page.waitForFunction(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const scene = pm.getCurrentScene();
    return scene && !scene.isModified;
  }, null, { timeout: 15000 });
}
'@
    Invoke-RunCode $copyAnnotate

    $clearUnsaved = @'
async (page) => {
  await page.evaluate(() => {
    try { sceneModified = false; } catch {}
    document.dispatchEvent(new CustomEvent('sceneSaved'));
    const pm = window.unifiedProjectPanel?.getProjectManager?.();
    const scene = pm?.getCurrentScene?.();
    if (scene) scene.isModified = false;
  });
}
'@
    Invoke-RunCode $clearUnsaved

    $presetPath = "$env:PW_PRESET_PATH"
    $importScene = @"
async (page) => {
  await page.setInputFiles('#import-file-input', '$presetPath');
  await page.waitForFunction(() => {
    const pm = window.unifiedProjectPanel?.getProjectManager?.();
    const name = (pm?.getCurrentScene?.()?.name || '').toLowerCase();
    return name.includes('mot');
  }, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  const count = await page.evaluate(() => (window.components || []).length);
  if (count < 1) throw new Error('import did not load components');
  await page.evaluate(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const sceneId = pm.getCurrentScene()?.id;
    if (sceneId) localStorage.setItem('opticslab_e2e_scene_id', sceneId);
  });
  await page.keyboard.press('Control+S');
  await page.waitForFunction(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const scene = pm.getCurrentScene();
    return scene && !scene.isModified;
  }, null, { timeout: 10000 });
}
"@
    Invoke-RunCode $importScene

    $diagramChecks = @'
async (page) => {
  await page.evaluate(() => {
    const modeMgr = window.getModeManager?.();
    if (modeMgr?.switchMode) {
      modeMgr.switchMode('diagram');
    }
    const diagram = window.getDiagramModeIntegration?.();
    diagram?.switchToDiagramMode?.();
  });
  await page.waitForFunction(() => window.getDiagramModeIntegration?.().isDiagramMode?.() === true, null, { timeout: 10000 });
  await page.evaluate(() => {
    const diagram = window.getDiagramModeIntegration?.();
    if (!diagram) throw new Error('diagram integration missing');
    const cpManager = diagram.getModule?.('connectionPointManager');
    const layoutEngine = diagram.getModule?.('layoutEngine');
    const interactionMgr = diagram.getModule?.('interactionManager');
    if (!cpManager || !layoutEngine || !interactionMgr) {
      throw new Error('diagram modules missing');
    }
    const comps = window.components || [];
    const comp = comps.find(c => c && (c.id || c.uuid));
    if (!comp) throw new Error('no component for diagram checks');
    const compId = comp.id || comp.uuid;
    if (cpManager.getComponentPoints(compId).length === 0) {
      cpManager.initializeComponentPoints(comp);
    }
    cpManager.updateComponentPoints(comp);
    const points = cpManager.getComponentPoints(compId);
    if (!points || points.length === 0) throw new Error('connection points missing');
    const p = points[0].worldPosition;
    const near = { x: p.x + 1, y: p.y + 1 };
    const nearest = cpManager.findNearestPoint(near, null, cpManager.snapDistance);
    if (!nearest) throw new Error('connection point snap failed');
    const hit = cpManager.findPointAtPosition(near, cpManager.hitTestTolerance);
    if (!hit) throw new Error('connection point hit test failed');

    const snapped = layoutEngine.snapToGrid({ x: 23, y: 37 });
    if (!snapped || typeof snapped.x !== 'number') throw new Error('grid snap failed');

    interactionMgr.selection.clearSelection();
    interactionMgr.selection.select(comp);
    const selected = interactionMgr.selection.getSelectedItems?.() || [];
    if (selected.length !== 1) throw new Error('diagram selection failed');

    const errors = window.__pwConsoleErrors || [];
    if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
  });
  await page.evaluate(() => {
    const modeMgr = window.getModeManager?.();
    modeMgr?.switchMode?.('simulation');
  });
}
'@
    Invoke-RunCode $diagramChecks

    $exportPng = "$exportDir/diagram-export.png"
    $exportSvg = "$exportDir/diagram-export.svg"
    $exportPdf = "$exportDir/diagram-export.pdf"
    $exportCode = @"
async (page) => {
  const pngPath = '$exportPng';
  const svgPath = '$exportSvg';
  const pdfPath = '$exportPdf';
  const exportOne = async (format, outPath) => {
    await page.evaluate(() => {
      const integration = window.getDiagramModeIntegration?.();
      if (integration?.openExportDialog) { integration.openExportDialog(); return; }
      if (typeof window.openExportDialog === 'function') { window.openExportDialog(); return; }
      throw new Error('export dialog not available');
    });
    await page.waitForSelector('.export-dialog-overlay', { state: 'visible', timeout: 5000 });
    await page.selectOption('#export-format', format);
    const download = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#export-confirm')
    ]);
    await download[0].saveAs(outPath);
  };
  await exportOne('png', pngPath);
  await exportOne('svg', svgPath);
  await exportOne('pdf', pdfPath);
}
"@
    Invoke-RunCode $exportCode

    $perfCode = @'
async (page) => {
  const rect = await page.locator('#opticsCanvas').boundingBox();
  if (!rect) throw new Error('canvas not found');
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.wheel(0, -300);
  await page.mouse.wheel(0, 300);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(centerX + 120, centerY + 60);
  await page.mouse.up({ button: 'middle' });
  const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
}
'@
    Invoke-RunCode $perfCode

    $prop1 = @'
async (page) => {
  await page.goto('http://localhost:8080/tests/property-based/test-runner.html', { waitUntil: 'load' });
  await page.evaluate(() => window.runTests());
  await page.waitForFunction(() => document.querySelectorAll('.test-item').length > 0, null, { timeout: 60000 });
  const failedItems = await page.evaluate(() => Array.from(document.querySelectorAll('.test-item.failed')).map(item => ({
    name: item.querySelector('.test-name')?.textContent?.trim(),
    errors: item.querySelector('.error-details')?.textContent?.trim()
  })));
  if (failedItems.length) {
    const names = failedItems.map(i => i.name).filter(Boolean).slice(0, 30).join(', ');
    throw new Error('property-based test-runner failed: ' + failedItems.length + '. ' + names);
  }
}
'@
    Invoke-RunCode $prop1

    $prop2 = @'
async (page) => {
  await page.goto('http://localhost:8080/tests/property-based/standalone-tests.html', { waitUntil: 'load' });
  await page.evaluate(() => window.runAllTests());
  await page.waitForFunction(() => document.querySelectorAll('.test-result').length > 0, null, { timeout: 20000 });
  const failed = await page.evaluate(() => parseInt(document.getElementById('failedTests')?.textContent || '0', 10));
  if (failed !== 0) {
    const failedNames = await page.evaluate(() => Array.from(document.querySelectorAll('.test-result.fail strong')).map(n => n.textContent?.replace(/\u2717/g, '').trim()));
    throw new Error('standalone tests failed: ' + failed + ' :: ' + failedNames.slice(0, 10).join(', '));
  }
}
'@
    Invoke-RunCode $prop2

    $regress = @'
async (page) => {
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await page.waitForSelector('#opticsCanvas');
  await page.waitForFunction(() => window.unifiedProjectPanel && window.unifiedProjectPanel.getProjectManager);
  await page.evaluate(async () => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const recent = pm.getRecentProjects();
    if (!recent || recent.length === 0) throw new Error('no recent project');
    await pm.openProject(recent[0]);
    const sceneId = localStorage.getItem('opticslab_e2e_scene_id');
    if (sceneId) {
      await pm.loadScene(sceneId, { skipUnsavedCheck: true, forceDiscard: true });
    }
  });
  await page.waitForFunction(() => window.components && window.components.length >= 10, null, { timeout: 10000 });
  const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
  if (errors.length) throw new Error('console errors: ' + errors.slice(0, 3).join(' | '));
}
'@
    Invoke-RunCode $regress
} finally {
    try {
        Invoke-PwCli @("close")
    } catch {
    }

    if ($server -and -not $server.HasExited) {
        $server | Stop-Process
    }
}
