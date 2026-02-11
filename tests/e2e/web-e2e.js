const fs = require('fs');
const path = require('path');

module.exports = async function runWebE2E(page) {
  const exportDir = process.env.PW_EXPORT_DIR;
  const presetPath = process.env.PW_PRESET_PATH;

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const dialogMessages = [];
  page.on('dialog', async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });

  const setupConsoleCapture = async () => {
    await page.evaluate(() => {
      window.__pwConsoleErrors = [];
      const record = (msg) => {
        try {
          window.__pwConsoleErrors.push(String(msg));
        } catch {
        }
      };
      const orig = console.error;
      console.error = (...args) => {
        const msg = args.map((a) => {
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
        record(msg);
        orig(...args);
      };
      window.addEventListener('error', (e) => record(e.message || 'error'));
      window.addEventListener('unhandledrejection', (e) => record(e.reason?.message || String(e.reason)));
    });
  };

  const assertNoConsoleErrors = async (stage) => {
    const errors = await page.evaluate(() => window.__pwConsoleErrors || []);
    if (errors.length) {
      throw new Error(`console error at ${stage}: ${errors.slice(0, 3).join(' | ')}`);
    }
  };

  const waitForAppReady = async () => {
    await page.waitForSelector('#opticsCanvas');
    await page.waitForFunction(() => window.unifiedProjectPanel && window.unifiedProjectPanel.getProjectManager);
  };

  const getCanvasRect = async () => {
    const rect = await page.locator('#opticsCanvas').boundingBox();
    assert(rect, 'canvas not found');
    return rect;
  };

  const clickToolAndCanvas = async (type, offsetX, offsetY) => {
    await page.click(`button[data-type="${type}"]`);
    const rect = await getCanvasRect();
    await page.mouse.click(rect.x + offsetX, rect.y + offsetY);
    await page.waitForTimeout(100);
  };

  const getComponentStateByType = async (type) => {
    return await page.evaluate((t) => {
      const comp = (window.components || []).find(c => c && c.constructor && c.constructor.name === t);
      if (!comp) return null;
      const pos = comp.pos || comp.position || comp.center || comp.p || comp;
      const x = pos?.x ?? comp.x ?? 0;
      const y = pos?.y ?? comp.y ?? 0;
      const angle = comp.angleRad ?? comp.angle ?? (comp.angleDeg != null ? (comp.angleDeg * Math.PI / 180) : 0);
      return { x, y, angle };
    }, type);
  };

  const exportFormat = async (format, filename) => {
    dialogMessages.length = 0;
    await page.evaluate(() => {
      const integration = window.getDiagramModeIntegration?.();
      if (integration?.openExportDialog) {
        integration.openExportDialog();
        return;
      }
      if (typeof window.openExportDialog === 'function') {
        window.openExportDialog();
        return;
      }
      throw new Error('export dialog not available');
    });

    await page.waitForSelector('.export-dialog-overlay', { state: 'visible', timeout: 5000 });
    await page.selectOption('#export-format', format);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#export-confirm')
    ]);

    const savePath = path.join(exportDir, filename);
    await download.saveAs(savePath);
    const stat = fs.statSync(savePath);
    assert(stat.size > 0, `export ${format} file is empty`);

    if (dialogMessages.length > 0) {
      throw new Error(`export ${format} dialog: ${dialogMessages.join(' | ')}`);
    }
  };

  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await waitForAppReady();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'load' });
  await waitForAppReady();
  await setupConsoleCapture();

  await page.evaluate(async () => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    await pm.createProject({ name: 'E2E Project', storageMode: 'localStorage' });

    const rootScene = await pm.createScene('E2E Scene', { directoryPath: '' });
    const emptyFactory = (name) => window.Serializer?.createEmptyScene
      ? window.Serializer.createEmptyScene(name)
      : { name, components: [], settings: {} };

    const sceneToMove = await pm.createSceneFromData('Scene To Move', emptyFactory('Scene To Move'), {
      open: false,
      directoryPath: ''
    });

    await pm.createSubProject('FolderA', '');
    await pm.createSubProject('Sub', 'FolderA');
    await pm.renameDirectory('FolderA', 'FolderRenamed');
    await pm.moveScene(sceneToMove.id, 'FolderRenamed/Sub');

    await pm.createSubProject('Temp', '');
    await pm.createSceneFromData('Temp Scene', emptyFactory('Temp Scene'), {
      open: false,
      directoryPath: 'Temp'
    });
    await pm.deleteDirectory('Temp');

    const tree = await pm.getProjectTree();
    window.__e2eTree = tree;
    window.__e2eSceneIds = { rootSceneId: rootScene.id, movedSceneId: sceneToMove.id };
    localStorage.setItem('opticslab_e2e_scene_id', rootScene.id);
  });

  const tree = await page.evaluate(() => window.__e2eTree);
  assert(tree && tree.type === 'project', 'project tree missing');

  const findPath = (node, pathValue) => {
    if (!node) return false;
    if (node.type === 'directory' && node.path === pathValue) return true;
    return (node.children || []).some(child => findPath(child, pathValue));
  };

  assert(findPath(tree, 'FolderRenamed'), 'renamed directory missing');
  assert(findPath(tree, 'FolderRenamed/Sub'), 'sub directory missing');

  const recentCount = await page.evaluate(() => {
    const data = localStorage.getItem('opticslab_recent_projects');
    return data ? JSON.parse(data).length : 0;
  });
  assert(recentCount > 0, 'recent projects not recorded');

  await assertNoConsoleErrors('project-tree');

  const rect = await getCanvasRect();
  const posLaser = { x: Math.round(rect.width * 0.2), y: Math.round(rect.height * 0.5) };
  const posMirror = { x: Math.round(rect.width * 0.5), y: Math.round(rect.height * 0.5) };
  const posLens = { x: Math.round(rect.width * 0.65), y: Math.round(rect.height * 0.5) };
  const posSplitter = { x: Math.round(rect.width * 0.8), y: Math.round(rect.height * 0.6) };

  await clickToolAndCanvas('LaserSource', posLaser.x, posLaser.y);
  await clickToolAndCanvas('Mirror', posMirror.x, posMirror.y);
  await clickToolAndCanvas('ThinLens', posLens.x, posLens.y);
  await clickToolAndCanvas('BeamSplitter', posSplitter.x, posSplitter.y);

  const countAfterAdd = await page.evaluate(() => (window.components || []).length);
  assert(countAfterAdd >= 4, 'components not added');

  await page.waitForFunction(() => window.currentRayPaths && window.currentRayPaths.length > 0, null, { timeout: 5000 });
  await assertNoConsoleErrors('after-add-components');

  await page.keyboard.down('Shift');
  await page.mouse.click(rect.x + posMirror.x, rect.y + posMirror.y);
  await page.mouse.click(rect.x + posLens.x, rect.y + posLens.y);
  await page.keyboard.up('Shift');

  const mirrorBeforeMove = await getComponentStateByType('Mirror');
  const lensBeforeMove = await getComponentStateByType('ThinLens');
  assert(mirrorBeforeMove && lensBeforeMove, 'components missing for move');

  await page.mouse.move(rect.x + posMirror.x, rect.y + posMirror.y);
  await page.mouse.down();
  await page.mouse.move(rect.x + posMirror.x + 40, rect.y + posMirror.y + 20);
  await page.mouse.up();

  const mirrorAfterMove = await getComponentStateByType('Mirror');
  const lensAfterMove = await getComponentStateByType('ThinLens');
  assert(mirrorAfterMove.x !== mirrorBeforeMove.x || mirrorAfterMove.y !== mirrorBeforeMove.y, 'mirror did not move');
  assert(lensAfterMove.x !== lensBeforeMove.x || lensAfterMove.y !== lensBeforeMove.y, 'lens did not move');

  await page.keyboard.press('Control+Z');
  await page.waitForTimeout(200);
  const mirrorUndoMove = await getComponentStateByType('Mirror');
  const lensUndoMove = await getComponentStateByType('ThinLens');
  assert(Math.abs(mirrorUndoMove.x - mirrorBeforeMove.x) < 0.5, 'undo move failed');
  assert(Math.abs(lensUndoMove.x - lensBeforeMove.x) < 0.5, 'undo move failed');

  await page.keyboard.press('Control+Y');
  await page.waitForTimeout(200);
  const mirrorRedoMove = await getComponentStateByType('Mirror');
  assert(Math.abs(mirrorRedoMove.x - mirrorAfterMove.x) < 0.5, 'redo move failed');

  await page.mouse.click(rect.x + posMirror.x, rect.y + posMirror.y);
  const mirrorBeforeRotate = await getComponentStateByType('Mirror');
  await page.mouse.move(rect.x + posMirror.x, rect.y + posMirror.y);
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(200);
  const mirrorAfterRotate = await getComponentStateByType('Mirror');
  assert(mirrorAfterRotate.angle !== mirrorBeforeRotate.angle, 'rotation failed');

  await page.keyboard.press('Control+Z');
  await page.waitForTimeout(200);
  const mirrorUndoRotate = await getComponentStateByType('Mirror');
  assert(Math.abs(mirrorUndoRotate.angle - mirrorBeforeRotate.angle) < 0.0001, 'undo rotate failed');

  await page.keyboard.press('Control+Y');
  await page.waitForTimeout(200);
  const mirrorRedoRotate = await getComponentStateByType('Mirror');
  assert(Math.abs(mirrorRedoRotate.angle - mirrorAfterRotate.angle) < 0.0001, 'redo rotate failed');

  const countBeforeCopy = await page.evaluate(() => (window.components || []).length);
  await page.mouse.click(rect.x + posLaser.x, rect.y + posLaser.y);
  await page.keyboard.press('Control+C');
  await page.keyboard.press('Control+V');
  await page.waitForTimeout(300);
  const countAfterCopy = await page.evaluate(() => (window.components || []).length);
  assert(countAfterCopy > countBeforeCopy, 'copy/paste failed');

  await page.waitForFunction(() => window.currentRayPaths && window.currentRayPaths.length > 0, null, { timeout: 5000 });

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
  assert(annText === 'E2E Note Updated', 'annotation update failed');

  await page.keyboard.press('Control+S');
  await page.waitForFunction(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const scene = pm.getCurrentScene();
    return scene && !scene.isModified;
  }, null, { timeout: 5000 });

  await page.setInputFiles('#import-file-input', presetPath);
  await page.waitForFunction(() => window.components && window.components.length >= 100, null, { timeout: 15000 });

  const importCount = await page.evaluate(() => (window.components || []).length);
  assert(importCount >= 100, 'import did not load enough components');

  await page.evaluate(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const sceneId = pm.getCurrentScene()?.id;
    if (sceneId) localStorage.setItem('opticslab_e2e_scene_id', sceneId);
  });

  await page.evaluate(() => {
    const modeManager = window.getModeManager?.();
    if (modeManager?.switchMode) {
      modeManager.switchMode('diagram');
      return;
    }
    const integration = window.getDiagramModeIntegration?.();
    if (integration?.switchToDiagramMode) {
      integration.switchToDiagramMode();
    }
  });

  await exportFormat('png', 'diagram-export.png');
  await exportFormat('svg', 'diagram-export.svg');
  await exportFormat('pdf', 'diagram-export.pdf');

  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -300);
  await page.mouse.wheel(0, 300);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(center.x + 120, center.y + 60);
  await page.mouse.up({ button: 'middle' });

  await assertNoConsoleErrors('after-performance');

  await page.goto('http://localhost:8080/tests/property-based/test-runner.html', { waitUntil: 'load' });
  await setupConsoleCapture();
  await page.evaluate(() => window.runTests());
  await page.waitForFunction(() => {
    const el = document.getElementById('failedTests');
    return el && el.textContent !== '';
  }, null, { timeout: 10000 });
  const failed1 = await page.evaluate(() => parseInt(document.getElementById('failedTests')?.textContent || '0', 10));
  assert(failed1 === 0, `property-based test-runner failed: ${failed1}`);

  await page.goto('http://localhost:8080/tests/property-based/standalone-tests.html', { waitUntil: 'load' });
  await setupConsoleCapture();
  await page.evaluate(() => window.runAllTests());
  await page.waitForFunction(() => {
    const el = document.getElementById('failedTests');
    return el && el.textContent !== '';
  }, null, { timeout: 10000 });
  const failed2 = await page.evaluate(() => parseInt(document.getElementById('failedTests')?.textContent || '0', 10));
  assert(failed2 === 0, `standalone tests failed: ${failed2}`);

  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load' });
  await waitForAppReady();
  await setupConsoleCapture();

  await page.evaluate(async () => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const recent = pm.getRecentProjects();
    if (!recent || recent.length === 0) {
      throw new Error('no recent project');
    }
    await pm.openProject(recent[0]);
    const sceneId = localStorage.getItem('opticslab_e2e_scene_id');
    if (sceneId) {
      await pm.loadScene(sceneId, { skipUnsavedCheck: true, forceDiscard: true });
    }
  });

  await page.waitForFunction(() => window.components && window.components.length >= 100, null, { timeout: 10000 });
  await assertNoConsoleErrors('regression');
};
