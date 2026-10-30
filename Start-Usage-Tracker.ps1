$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$port = if ($env:USAGE_TRACKER_PORT) { [int]$env:USAGE_TRACKER_PORT } else { 8792 }
$url = "http://127.0.0.1:$port/"
$ready = $false
try {
    $response = Invoke-RestMethod -Uri ($url + 'api/state') -TimeoutSec 2
    $ready = $null -ne $response.sources.codex
} catch {}
if (-not $ready) {
    $nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $nodeExe -ArgumentList 'server.js','--no-open' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root 'server-output.log') -RedirectStandardError (Join-Path $root 'server-error.log')
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        try {
            $response = Invoke-RestMethod -Uri ($url + 'api/state') -TimeoutSec 1
            if ($null -ne $response.sources.codex) { $ready = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 250
    }
}
if (-not $ready) { throw "Dashboard belum berjalan. Periksa server-error.log di $root" }
$neoExe = Join-Path $env:LOCALAPPDATA 'BrowserClaw\Application\chrome.exe'
if (Test-Path -LiteralPath $neoExe) {
    Start-Process -FilePath $neoExe -ArgumentList $url -WindowStyle Hidden
} else {
    Write-Host "Dashboard siap: $url"
    Write-Host 'Buka alamat tersebut di browser. Sinkronisasi API berjalan langsung dari server lokal.'
}
