# SkiilEX dev launcher — backend starts first, frontend waits until it's ready
$root = $PSScriptRoot

Write-Host ""
Write-Host "  Starting SkiilEX..." -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Magenta
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# ── 1. Start backend ──────────────────────────────────────────────────────────
$backendJob = Start-Job -Name "backend" -ScriptBlock {
    param($root)
    Set-Location "$root\backend"
    $env:JAVA_HOME = 'C:\Users\User\.jdk\jdk-21.0.8'
    & ".\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run 2>&1
} -ArgumentList $root

Write-Host "[backend]  Spring Boot starting..." -ForegroundColor Cyan

# ── 2. Wait for backend to be ready on port 8080 ─────────────────────────────
$timeout = 120   # seconds
$waited = 0
$ready = $false

while ($waited -lt $timeout) {
    # flush backend output while we wait so the user sees progress
    foreach ($line in (Receive-Job -Job $backendJob)) {
        Write-Host "[backend]  $line" -ForegroundColor Cyan
    }
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("localhost", 8080)
        $tcp.Close()
        $ready = $true
        break
    }
    catch { }
    Start-Sleep -Seconds 2
    $waited += 2
}

if (-not $ready) {
    Write-Host "`n[error] Backend did not start within $timeout seconds." -ForegroundColor Red
    Stop-Job  -Job $backendJob
    Remove-Job -Job $backendJob -Force
    exit 1
}

Write-Host "[backend]  Ready on http://localhost:8080" -ForegroundColor Green

# ── 3. Start frontend ─────────────────────────────────────────────────────────
$frontendJob = Start-Job -Name "frontend" -ScriptBlock {
    param($root)
    Set-Location "$root\frontend"
    npm run dev -- --host 2>&1
} -ArgumentList $root

Write-Host "[frontend] Vite starting..." -ForegroundColor Magenta

# ── 4. Stream both logs ───────────────────────────────────────────────────────
try {
    while ($true) {
        foreach ($line in (Receive-Job -Job $backendJob)) {
            Write-Host "[backend]  $line" -ForegroundColor Cyan
        }
        foreach ($line in (Receive-Job -Job $frontendJob)) {
            Write-Host "[frontend] $line" -ForegroundColor Magenta
        }
        Start-Sleep -Milliseconds 300
    }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Yellow
    Stop-Job  -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob -Force
    Stop-Process -Name "java" -Force -ErrorAction SilentlyContinue
    Write-Host "Done." -ForegroundColor Green
}

