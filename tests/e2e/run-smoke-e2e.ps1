$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot/../.."
$rootPath = $root.Path -replace "\\", "/"

$outputDir = "$rootPath/output/playwright"
$logDir = "$outputDir/logs"
$screenshotPath = "$outputDir/smoke-canvas.png"

New-Item -ItemType Directory -Force -Path "$outputDir", "$logDir" | Out-Null

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

function Get-FreePort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    try {
        return $listener.LocalEndpoint.Port
    } finally {
        $listener.Stop()
    }
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
        Start-Sleep -Milliseconds 250
    }
    return $false
}

$port = Get-FreePort
$env:PLAYWRIGHT_CLI_SESSION = "opticslab-smoke-$PID"

$server = Start-Process `
    -FilePath "node" `
    -ArgumentList @("tests/e2e/static-server.mjs", "$port") `
    -WorkingDirectory $rootPath `
    -PassThru `
    -WindowStyle Hidden

try {
    if (-not (Wait-ForPort -Port $port -TimeoutSec 30)) {
        throw "Server not ready on 127.0.0.1:$port within 30 seconds"
    }

    Invoke-PwCli @("open", "http://127.0.0.1:$port/index.html")
    Invoke-PwCli @("resize", "1365", "900")

    $smoke = @'
async (page) => {
  page.setDefaultTimeout(15000);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#opticsCanvas');
  await page.waitForFunction(() => window.__LEGACY_GLOBALS_LOADED__ === true);
  await page.waitForFunction(() => window.unifiedProjectPanel && window.unifiedProjectPanel.getProjectManager);

  const visibleText = await page.evaluate(() => document.body?.innerText || '');
  const expectedText = [
    '\u6587\u4ef6',
    '\u7f16\u8f91',
    '\u6a21\u62df',
    '\u5149\u6e90',
    '\u900f\u955c',
    '\u5c5e\u6027'
  ];
  for (const text of expectedText) {
    if (!visibleText.includes(text)) {
      throw new Error(`missing readable UI text: ${text}`);
    }
  }
  const badTextTokens = ['\uFFFD', '\u93C2', '\u7F02', '\u95AB', '\u59AF', '\u934F', '\u9241', '\u9242'];
  if (badTextTokens.some(token => visibleText.slice(0, 4000).includes(token))) {
    throw new Error('mojibake detected in visible UI text');
  }

  await page.evaluate(() => {
    window.__pwConsoleErrors = [];
    const record = (msg) => {
      try { window.__pwConsoleErrors.push(String(msg)); } catch {}
    };
    const originalError = console.error;
    console.error = (...args) => {
      let msg = '';
      try {
        msg = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
      } catch {
        msg = String(args);
      }
      record(msg);
      originalError(...args);
    };
    window.addEventListener('error', event => record(event.message || 'error'));
    window.addEventListener('unhandledrejection', event => record(event.reason?.message || String(event.reason)));
  });

  const rect = await page.locator('#opticsCanvas').boundingBox();
  if (!rect || rect.width < 200 || rect.height < 200) {
    throw new Error('canvas missing or too small');
  }

  const addComponent = async (type, xRatio, yRatio) => {
    await page.click(`button[data-type="${type}"]`);
    await page.mouse.click(rect.x + rect.width * xRatio, rect.y + rect.height * yRatio);
    await page.waitForTimeout(150);
  };

  await addComponent('LaserSource', 0.22, 0.50);
  await addComponent('Mirror', 0.52, 0.50);
  await addComponent('ThinLens', 0.68, 0.50);

  await page.waitForFunction(() => Array.isArray(window.components) && window.components.length >= 3);
  await page.evaluate(() => {
    const lens = window.components.find(component => component?.constructor?.name === 'ThinLens');
    if (!lens || !lens.setProperty('lensType', 'biconvex')) {
      throw new Error('unable to switch the smoke-test lens to biconvex mode');
    }
  });
  await page.waitForFunction(() => Array.isArray(window.currentRayPaths) && window.currentRayPaths.length > 0, null, { timeout: 10000 });
  await page.waitForFunction(() => window.components.some(component =>
    component?.constructor?.name === 'ThinLens' && component.isThickLens === true
  ));

  const status = await page.evaluate(() => ({
    components: window.components.length,
    rays: window.currentRayPaths.length,
    errors: window.__pwConsoleErrors || [],
    pixels: (() => {
      const canvas = document.getElementById('opticsCanvas');
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return null;
      const width = Math.min(canvas.width, 900);
      const height = Math.min(canvas.height, 700);
      const data = ctx.getImageData(0, 0, width, height).data;
      let bright = 0;
      let colored = 0;
      let nonBackground = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r + g + b > 90) bright++;
        if (Math.max(r, g, b) - Math.min(r, g, b) > 12) colored++;
        if (!(r < 8 && g < 8 && b < 8) && !(r > 245 && g > 245 && b > 245)) nonBackground++;
      }
      return { bright, colored, nonBackground };
    })()
  }));

  if (status.errors.length) {
    throw new Error('console errors: ' + status.errors.slice(0, 3).join(' | '));
  }
  if (status.components < 3 || status.rays < 1) {
    throw new Error(`unexpected smoke state: components=${status.components}, rays=${status.rays}`);
  }
  if (!status.pixels || status.pixels.bright < 1000 || status.pixels.nonBackground < 1000 || status.pixels.colored < 10) {
    throw new Error(`canvas appears visually blank: ${JSON.stringify(status.pixels)}`);
  }
}
'@
    Invoke-RunCode $smoke
    $advancedLensSmoke = @'
async (page) => {
  const rect = await page.locator('#opticsCanvas').boundingBox();
  if (!rect) throw new Error('canvas missing while validating advanced lens placement');

  const addComponent = async (type, xRatio, yRatio) => {
    await page.click(`button[data-type="${type}"]`);
    await page.mouse.click(rect.x + rect.width * xRatio, rect.y + rect.height * yRatio);
    await page.waitForTimeout(150);
  };

  await addComponent('AsphericLens', 0.38, 0.72);
  await addComponent('GRINLens', 0.58, 0.72);
  await page.waitForFunction(() => Array.isArray(window.components) && window.components.length >= 5);
  await page.evaluate(() => {
    const aspheric = window.components.find(component => component?.constructor?.name === 'AsphericLens');
    if (!aspheric || aspheric.baseRadius !== 150 || aspheric.conicConstant !== 0 || Math.abs(aspheric.angleRad - Math.PI / 2) > 1e-9) {
      throw new Error('AsphericLens placement defaults are invalid');
    }

    const grin = window.components.find(component => component?.constructor?.name === 'GRINLens');
    if (!grin || grin.n0 !== 1.6 || grin.gradientCoeff !== 0.01 || Math.abs(grin.angleRad - Math.PI / 2) > 1e-9) {
      throw new Error('GRINLens placement defaults are invalid');
    }
  });
}
'@
    Invoke-RunCode $advancedLensSmoke
    Invoke-PwCli @("screenshot", "#opticsCanvas", "--filename", $screenshotPath)
} finally {
    try {
        Invoke-PwCli @("close")
    } catch {
    }

    if ($server -and -not $server.HasExited) {
        $server | Stop-Process
    }
}
