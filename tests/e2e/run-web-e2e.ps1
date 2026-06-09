param(
    [ValidateSet("core", "full")]
    [string]$Profile = "full"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot/../.."
$rootPath = $root.Path -replace "\\", "/"

$outputDir = "$rootPath/output/playwright"
$exportDir = "$outputDir/exports"
$logDir = "$outputDir/logs"

New-Item -ItemType Directory -Force -Path "$outputDir", "$exportDir", "$logDir" | Out-Null

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
$env:PW_OUTPUT_DIR = $outputDir
$env:PW_EXPORT_DIR = $exportDir
$env:PW_PRESET_PATH = "$rootPath/presets/diagram_example_mot_paper.json"
$env:PW_BASE_URL = "http://127.0.0.1:$port"
$env:PW_E2E_PROFILE = $Profile

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

    npm exec --yes --package "@playwright/test" -- playwright test "tests/e2e/web-e2e.spec.js" --project=chromium --reporter=line
    if ($LASTEXITCODE -ne 0) {
        throw "Playwright web e2e failed for profile '$Profile'"
    }
} finally {
    if ($server -and -not $server.HasExited) {
        $server | Stop-Process
    }
}
