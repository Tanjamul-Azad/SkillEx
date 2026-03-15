# SkiilEX — dev launcher
# Runs backend + frontend in the current terminal.
param(
    [switch]$Stop   # pass -Stop to just kill everything
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendEnvFile = Join-Path $root "backend\.env"

function Load-BackendEnv {
    param([string]$filePath)

    if (-not (Test-Path $filePath)) {
        Write-Host "No backend .env found at $filePath (skipping)." -ForegroundColor DarkYellow
        return
    }

    $loaded = 0
    foreach ($line in Get-Content $filePath) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
        if ($trimmed.StartsWith("#")) { continue }

        $m = [regex]::Match($trimmed, '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
        if (-not $m.Success) { continue }

        $key = $m.Groups[1].Value
        $value = $m.Groups[2].Value.Trim()

        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        $loaded++
    }

    Write-Host "Loaded $loaded backend env variables from $filePath" -ForegroundColor Green
}

function Validate-EmbeddingEnv {
    $provider = [System.Environment]::GetEnvironmentVariable("EMBEDDING_PROVIDER", "Process")
    if ([string]::IsNullOrWhiteSpace($provider)) {
        $provider = "local"
    }

    if ($provider.ToLower() -ne "api") {
        return
    }

    $embeddingKey = [System.Environment]::GetEnvironmentVariable("EMBEDDING_API_KEY", "Process")
    $geminiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "Process")
    if ([string]::IsNullOrWhiteSpace($embeddingKey) -and [string]::IsNullOrWhiteSpace($geminiKey)) {
        Write-Host "Warning: EMBEDDING_PROVIDER=api but no EMBEDDING_API_KEY/GEMINI_API_KEY found. Backend will fall back to local embeddings." -ForegroundColor DarkYellow
    } else {
        Write-Host "Embedding API mode detected (Gemini key configured)." -ForegroundColor Green
    }
}

function Kill-Servers {
    Write-Host "Stopping existing servers..." -ForegroundColor Yellow
    Stop-Process -Name "java"  -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "node"  -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Host "Stopped." -ForegroundColor Green
}

if ($Stop) { Kill-Servers; exit 0 }

Kill-Servers

Write-Host ""
Write-Host "  Starting SkiilEX in this terminal" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:3000" -ForegroundColor Magenta
Write-Host "  Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

Load-BackendEnv -filePath $backendEnvFile
Validate-EmbeddingEnv

Push-Location $root
try {
    npm run dev
} finally {
    Pop-Location
}
