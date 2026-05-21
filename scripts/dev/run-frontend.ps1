param(
    [string]$Root = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$BackendUrl = "http://localhost:8080/ws/info",
    [int]$TimeoutSeconds = 90
)

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$ready = $false

Write-Host "[run-frontend] Waiting for backend at $BackendUrl" -ForegroundColor Cyan

while ((Get-Date) -lt $deadline) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $BackendUrl -TimeoutSec 2
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    throw "[run-frontend] Backend did not become ready within $TimeoutSeconds seconds."
}

Write-Host "[run-frontend] Backend ready. Starting Vite." -ForegroundColor Green
Set-Location (Join-Path $Root "frontend")
npm run dev
