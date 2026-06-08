# SkiilEX — dev launcher
# Stops any running instances, then starts everything via npm run dev.
param(
    [switch]$Stop   # pass -Stop to just kill everything
)

function Stop-Servers {
    Write-Host "Stopping existing servers..." -ForegroundColor Yellow
    Stop-Process -Name "java" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "Stopped." -ForegroundColor Green
}

Stop-Servers

if ($Stop) { exit 0 }

$pathValue = [System.Environment]::GetEnvironmentVariable("Path", "Process")
if (-not [string]::IsNullOrWhiteSpace($pathValue)) {
    [System.Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [System.Environment]::SetEnvironmentVariable("Path", $pathValue, "Process")
}

Write-Host ""
Write-Host "  Starting SkiilEX..." -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Magenta
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $npmCommand) {
    throw "npm was not found. Install Node.js or add npm to PATH."
}

& $npmCommand.Source run dev
