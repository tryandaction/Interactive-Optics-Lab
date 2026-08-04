import fs from 'node:fs';
import path from 'node:path';

export async function runWebE2E(page, options = {}) {
  const exportDir = process.env.PW_EXPORT_DIR;
  const presetPath = process.env.PW_PRESET_PATH;
  const baseURL = options.baseURL || process.env.PW_BASE_URL || 'http://localhost:8080';
  const profile = options.profile || process.env.PW_E2E_PROFILE || 'full';
  const presetData = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  const expectedPresetComponentCount = Array.isArray(presetData.components) ? presetData.components.length : 0;

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };

  const urlFor = (pathname) => new URL(pathname, baseURL).toString();
  const mojibakePattern = /[�]|鏂|缂|鍏|閫|浣|瑙|灞|鍙|涓|鍦|鐐|杈|鎾|鍔|搴|妯|绾|钖|掳|馃|鈼|鉁|鉂/;

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

  const assertUserFacingTextQuality = async (stage) => {
    const result = await page.evaluate((patternSource) => {
      const mojibake = new RegExp(patternSource);
      const expectedTexts = ['文件', '编辑', '视图', '模拟', '帮助', '光源', '透镜', '反射镜', '属性', '设置', '项目', '信息'];
      const visibleText = document.body?.innerText || '';
      const missing = expectedTexts.filter(text => !visibleText.includes(text));
      const sample = visibleText
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 80)
        .join('\n');
      return {
        title: document.title,
        missing,
        hasMojibake: mojibake.test(sample) || mojibake.test(document.title),
        sample
      };
    }, mojibakePattern.source);

    assert(result.title.includes('光学实验室'), `${stage}: page title is not readable Chinese: ${result.title}`);
    assert(result.missing.length === 0, `${stage}: missing expected UI text: ${result.missing.join(', ')}`);
    assert(!result.hasMojibake, `${stage}: mojibake detected in visible UI text`);
  };

  const assertCanvasHasContent = async (stage) => {
    const metrics = await page.evaluate(() => {
      const canvas = document.getElementById('opticsCanvas');
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const width = Math.min(canvas.width, 900);
      const height = Math.min(canvas.height, 700);
      const data = ctx.getImageData(0, 0, width, height).data;
      let nonTransparent = 0;
      let bright = 0;
      let colored = 0;
      let nonBackground = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a > 0) nonTransparent++;
        if (r + g + b > 90) bright++;
        if (Math.max(r, g, b) - Math.min(r, g, b) > 12) colored++;
        if (!(r < 8 && g < 8 && b < 8) && !(r > 245 && g > 245 && b > 245)) nonBackground++;
      }
      return { width, height, nonTransparent, bright, colored, nonBackground };
    });

    assert(metrics, `${stage}: canvas pixel metrics unavailable`);
    assert(metrics.nonTransparent > 1000, `${stage}: canvas appears transparent or blank`);
    assert(metrics.bright > 1000, `${stage}: canvas lacks visible drawn content`);
    assert(metrics.nonBackground > 1000, `${stage}: canvas lacks non-background drawing`);
    assert(metrics.colored > 10, `${stage}: colored optical drawing pixels were not detected`);
  };

  const validateExportArtifact = (format, savePath) => {
    const bytes = fs.readFileSync(savePath);
    assert(bytes.length > 0, `export ${format} file is empty`);

    if (format === 'svg') {
      const svg = bytes.toString('utf8');
      assert(svg.includes('<svg'), 'export svg missing root element');
      assert(svg.includes('id="layer-beams"'), 'export svg missing beam layer');
      assert(svg.includes('id="layer-components"'), 'export svg missing components layer');
      assert(svg.includes('vector-effect="non-scaling-stroke"'), 'export svg missing stable line widths');
      assert(!mojibakePattern.test(svg.slice(0, 5000)), 'export svg contains mojibake near header/layers');
      return;
    }

    if (format === 'png') {
      const pngSignature = '89504e470d0a1a0a';
      assert(bytes.subarray(0, 8).toString('hex') === pngSignature, 'export png has invalid signature');
      return;
    }

    if (format === 'pdf') {
      assert(bytes.subarray(0, 5).toString('ascii') === '%PDF-', 'export pdf has invalid header');
    }
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
    await page.evaluate(() => window.schematicWorkspace?.switchWorkspace('schematic'));
    await page.waitForSelector(`#schematic-workspace [data-schematic-export="${format}"]`, { state: 'visible' });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click(`#schematic-workspace [data-schematic-export="${format}"]`)
    ]);

    const savePath = path.join(exportDir, filename);
    await download.saveAs(savePath);
    const stat = fs.statSync(savePath);
    assert(stat.size > 0, `export ${format} file is empty`);
    validateExportArtifact(format, savePath);

    if (dialogMessages.length > 0) {
      throw new Error(`export ${format} dialog: ${dialogMessages.join(' | ')}`);
    }
  };

  const exportProfessionalSVGFromMenu = async () => {
    await page.hover('#top-menubar .menu-left > .dropdown:first-of-type .dropbtn');
    await page.waitForSelector('#menu-export-professional-svg', { state: 'visible', timeout: 5000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#menu-export-professional-svg')
    ]);

    const savePath = path.join(exportDir, 'professional-menu-export.svg');
    await download.saveAs(savePath);
    const svg = fs.readFileSync(savePath, 'utf8');

    assert(svg.includes('<svg'), 'menu professional svg export missing svg root');
    assert(svg.includes('id="layer-beams"'), 'menu professional svg export missing ray layer');
    assert(svg.includes('id="layer-components"'), 'menu professional svg export missing symbol layer');
    assert(svg.includes('viewBox="0 0 1600 900"'), 'menu professional svg export page size changed');
    assert(svg.includes('vector-effect="non-scaling-stroke"'), 'menu professional svg export line widths are not stable');
  };

  await page.goto(urlFor('/index.html'), { waitUntil: 'load' });
  await waitForAppReady();
  await assertUserFacingTextQuality('initial-load');

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'load' });
  await waitForAppReady();
  await assertUserFacingTextQuality('after-reload');
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
  await assertCanvasHasContent('after-add-components');
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

  await page.evaluate(() => {
    const mirror = (window.components || []).find(c => c?.constructor?.name === 'Mirror');
    if (!mirror) throw new Error('mirror missing for rotation');
    for (const comp of window.components || []) {
      comp.selected = false;
    }
    mirror.selected = true;
    window.selectedComponent = mirror;
    window.selectedComponents = [mirror];
    window.updateInspector?.();
  });
  await page.waitForFunction(() => window.selectedComponent?.constructor?.name === 'Mirror', null, { timeout: 5000 });
  const mirrorBeforeRotate = await getComponentStateByType('Mirror');
  const targetAngleDeg = mirrorBeforeRotate.angle * 180 / Math.PI + 15;
  await page.locator('input[id^="prop-angleDeg-"]').first().waitFor({ state: 'visible', timeout: 5000 });
  await page.evaluate((angleDeg) => {
    const input = document.querySelector('input[id^="prop-angleDeg-"]');
    if (!input) throw new Error('angle input missing');
    input.value = String(angleDeg);
    input.onchange?.({ target: input });
  }, targetAngleDeg);
  await page.waitForFunction((angleDeg) => {
    const mirror = (window.components || []).find(c => c?.constructor?.name === 'Mirror');
    return mirror && Math.abs(mirror.angleRad - angleDeg * Math.PI / 180) < 1e-6;
  }, targetAngleDeg, { timeout: 5000 });
  const mirrorAfterRotate = await getComponentStateByType('Mirror');
  assert(mirrorAfterRotate.angle !== mirrorBeforeRotate.angle, 'rotation failed');
  const latestCommandName = await page.evaluate(() => window.historyManager?.peekUndo?.()?.constructor?.name || '');
  assert(latestCommandName === 'SetPropertyCommand', `rotation was not added to history: ${latestCommandName}`);

  await page.evaluate(() => window.historyManager.undo());
  await page.waitForTimeout(200);
  const mirrorUndoRotate = await getComponentStateByType('Mirror');
  assert(Math.abs(mirrorUndoRotate.angle - mirrorBeforeRotate.angle) < 0.0001, 'undo rotate failed');

  await page.evaluate(() => window.historyManager.redo());
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
  const schematicPayload = await page.evaluate(() => {
    const sceneData = window.generateSceneDataObject?.();
    if (!sceneData?.views?.schematic) return null;
    return {
      schemaVersion: sceneData.schemaVersion,
      componentCount: sceneData.components?.length || 0,
      beamEdgeCount: sceneData.beamGraph?.edges?.length || 0,
      placementCount: Object.keys(sceneData.views.schematic.placements || {}).length
    };
  });
  assert(schematicPayload?.schemaVersion === '3.0.0', 'export scene data is not OpticsDocument v3');
  assert(schematicPayload.componentCount >= 3, `v3 document missing components: ${JSON.stringify(schematicPayload)}`);
  assert(schematicPayload.beamEdgeCount >= 1, `v3 document missing BeamGraph edges: ${JSON.stringify(schematicPayload)}`);
  const professionalSVG = await page.evaluate(() => window.generateProfessionalSVGString?.({ rayGlow: false }) || '');
  assert(professionalSVG.includes('<svg'), 'professional svg export missing svg root');
  assert(professionalSVG.includes('id="layer-beams"'), 'professional svg export missing ray layer');
  assert(professionalSVG.includes('id="layer-components"'), 'professional svg export missing symbol layer');
  assert(professionalSVG.includes('data-component-type="LaserSource"'), 'professional svg export missing laser symbol');
  assert(professionalSVG.includes('vector-effect="non-scaling-stroke"'), 'professional svg line widths are not stable');
  assert(professionalSVG.includes('viewBox="0 0 1600 900"'), 'professional svg page boundary changed');
  assert(!mojibakePattern.test(professionalSVG.slice(0, 5000)), 'professional svg export contains mojibake near header/layers');
  await exportProfessionalSVGFromMenu();

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

  if (profile === 'core') {
    await assertNoConsoleErrors('core-profile');
    return;
  }

  await page.setInputFiles('#import-file-input', presetPath);
  await page.waitForFunction((expectedCount) => {
    return Array.isArray(window.components) && window.components.length >= expectedCount;
  }, expectedPresetComponentCount, { timeout: 15000 });

  const importCount = await page.evaluate(() => (window.components || []).length);
  assert(
    importCount >= expectedPresetComponentCount,
    `import did not load enough components: expected ${expectedPresetComponentCount}, got ${importCount}`
  );

  await page.evaluate(() => {
    const pm = window.unifiedProjectPanel.getProjectManager();
    const sceneId = pm.getCurrentScene()?.id;
    if (sceneId) localStorage.setItem('opticslab_e2e_scene_id', sceneId);
  });

  await page.evaluate(() => window.schematicWorkspace?.switchWorkspace('schematic'));
  await page.mouse.move(700, 500);
  await page.waitForTimeout(100);

  const pathHitPoint = await page.locator('#layer-beams .schematic-path').first().evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screenPoint = point.matrixTransform(path.getScreenCTM());
    return { x: screenPoint.x, y: screenPoint.y };
  });
  const pathHitTarget = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return {
      tagName: target?.tagName || '',
      className: target?.getAttribute?.('class') || '',
      pathId: target?.closest?.('[data-path-id]')?.getAttribute('data-path-id') || ''
    };
  }, pathHitPoint);
  assert(pathHitTarget.pathId, `schematic path hit target unavailable: ${JSON.stringify({ pathHitPoint, pathHitTarget })}`);
  await page.mouse.click(pathHitPoint.x, pathHitPoint.y);
  await page.locator('[data-schematic-action="path-dashed"]').waitFor({ state: 'visible' });
  await page.locator('[data-schematic-action="path-dashed"]').click();
  await page.locator('[data-schematic-action="path-round-trip"]').click();
  await page.locator('#layer-components [data-component-id]').first().click({ force: true });
  await page.locator('[data-label-axis="x"]').fill('24');
  await page.locator('[data-label-axis="y"]').fill('-36');
  await page.locator('[data-label-axis="y"]').press('Tab');
  await page.locator('[data-annotation-text]').fill('E2E optical note');
  await page.locator('[data-schematic-action="add-annotation"]').click();

  const schematicEditState = await page.evaluate(() => {
    const editor = window.schematicWorkspace?.editor;
    const document = editor?.getDocument();
    const selectedComponentId = [...(editor?.model?.selectedIds || [])][0];
    return document ? {
      path: document.views.schematic.paths.find(item => item.locked),
      placement: document.views.schematic.placements[selectedComponentId],
      annotation: document.annotations.find(item => item.text === 'E2E optical note')
    } : null;
  });
  assert(schematicEditState?.path?.style === 'dashed', 'schematic path style edit failed');
  assert(schematicEditState?.path?.roundTrip === true, 'schematic round-trip edit failed');
  assert(schematicEditState?.placement?.labelOffset?.x === 24, 'schematic label X edit failed');
  assert(schematicEditState?.placement?.labelOffset?.y === -36, 'schematic label Y edit failed');
  assert(schematicEditState?.annotation?.view === 'schematic', 'schematic annotation edit failed');

  await exportFormat('png', 'diagram-export.png');
  await exportFormat('svg', 'diagram-export.svg');
  await exportFormat('pdf', 'diagram-export.pdf');
  await page.waitForTimeout(3300);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(process.env.PW_OUTPUT_DIR, 'schematic-desktop.png'), fullPage: true });
  const desktopLayout = await page.evaluate(() => {
    const toolbar = document.querySelector('.schematic-toolbar')?.getBoundingClientRect();
    const pageBox = document.querySelector('.schematic-page')?.getBoundingClientRect();
    return toolbar && pageBox ? {
      toolbarBottom: toolbar.bottom,
      pageTop: pageBox.top,
      pageWidth: pageBox.width,
      pageHeight: pageBox.height
    } : null;
  });
  assert(desktopLayout, 'desktop schematic layout unavailable');
  assert(desktopLayout.toolbarBottom <= desktopLayout.pageTop, 'desktop schematic toolbar overlaps page');
  assert(Math.abs(desktopLayout.pageWidth / desktopLayout.pageHeight - 16 / 9) < 0.03, 'desktop page ratio changed');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(process.env.PW_OUTPUT_DIR, 'schematic-mobile.png'), fullPage: true });
  const mobileLayout = await page.evaluate(() => {
    const toolbar = document.querySelector('.schematic-toolbar')?.getBoundingClientRect();
    const pageBox = document.querySelector('.schematic-page')?.getBoundingClientRect();
    const activeTab = document.querySelector('.workspace-tab.active')?.getBoundingClientRect();
    return toolbar && pageBox && activeTab ? {
      toolbarBottom: toolbar.bottom,
      pageTop: pageBox.top,
      pageWidth: pageBox.width,
      pageHeight: pageBox.height,
      activeTabVisible: activeTab.left >= 0 && activeTab.right <= window.innerWidth
    } : null;
  });
  assert(mobileLayout, 'mobile schematic layout unavailable');
  assert(mobileLayout.toolbarBottom <= mobileLayout.pageTop, 'mobile schematic toolbar overlaps page');
  assert(mobileLayout.pageWidth > 250, 'mobile schematic page is too narrow');
  assert(mobileLayout.activeTabVisible, 'mobile workspace switcher is clipped');
  await page.setViewportSize({ width: 1280, height: 720 });

  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -300);
  await page.mouse.wheel(0, 300);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(center.x + 120, center.y + 60);
  await page.mouse.up({ button: 'middle' });

  await assertNoConsoleErrors('after-performance');

  await page.goto(urlFor('/tests/property-based/test-runner.html'), { waitUntil: 'load' });
  await setupConsoleCapture();
  await page.evaluate(() => window.runTests());
  await page.waitForFunction(() => {
    const el = document.getElementById('failedTests');
    return el && el.textContent !== '';
  }, null, { timeout: 10000 });
  const failed1 = await page.evaluate(() => parseInt(document.getElementById('failedTests')?.textContent || '0', 10));
  assert(failed1 === 0, `property-based test-runner failed: ${failed1}`);

  await page.goto(urlFor('/tests/property-based/standalone-tests.html'), { waitUntil: 'load' });
  await setupConsoleCapture();
  await page.evaluate(() => window.runAllTests());
  await page.waitForFunction(() => {
    const el = document.getElementById('failedTests');
    return el && el.textContent !== '';
  }, null, { timeout: 10000 });
  const failed2 = await page.evaluate(() => parseInt(document.getElementById('failedTests')?.textContent || '0', 10));
  assert(failed2 === 0, `standalone tests failed: ${failed2}`);

  await page.goto(urlFor('/index.html'), { waitUntil: 'load' });
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

  await page.waitForFunction((expectedCount) => {
    return Array.isArray(window.components) && window.components.length >= expectedCount;
  }, expectedPresetComponentCount, { timeout: 10000 });
  await assertUserFacingTextQuality('regression');
  await assertCanvasHasContent('regression');
  await assertNoConsoleErrors('regression');
}
