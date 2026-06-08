# Ensures a local Ollama server is running with the gemma2:2b model so the
# AI session-note generation uses the real local LLM (free, offline, no API key)
# instead of the extractive fallback. Safe to run repeatedly; never fails the build.

$ErrorActionPreference = "SilentlyContinue"

$model = "gemma2:2b"
$baseUrl = "http://localhost:11434"

function Test-OllamaUp {
    try {
        $r = Invoke-RestMethod -Uri "$baseUrl/api/tags" -Method Get -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

# 1. Is the Ollama binary installed?
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
    Write-Host "[ensure-ollama] Ollama not installed - AI notes will use the built-in extractive fallback." -ForegroundColor DarkYellow
    Write-Host "[ensure-ollama] (Optional) install from https://ollama.com for higher-quality LLM notes." -ForegroundColor DarkYellow
    return
}

# 2. Start the server if it is not already up.
if (Test-OllamaUp) {
    Write-Host "[ensure-ollama] Ollama already running on $baseUrl" -ForegroundColor Green
} else {
    Write-Host "[ensure-ollama] Starting Ollama server..." -ForegroundColor Cyan
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    $waited = 0
    while (-not (Test-OllamaUp) -and $waited -lt 20) {
        Start-Sleep -Seconds 1
        $waited++
    }
    if (Test-OllamaUp) {
        Write-Host "[ensure-ollama] Ollama is up." -ForegroundColor Green
    } else {
        Write-Host "[ensure-ollama] Ollama did not start in time - notes will use the extractive fallback." -ForegroundColor DarkYellow
        return
    }
}

# 3. Make sure the model is present (pull only if missing).
$tags = Invoke-RestMethod -Uri "$baseUrl/api/tags" -Method Get -TimeoutSec 5
$hasModel = $false
if ($tags -and $tags.models) {
    foreach ($m in $tags.models) {
        if ($m.name -like "$model*") { $hasModel = $true; break }
    }
}

if ($hasModel) {
    Write-Host "[ensure-ollama] Model '$model' is ready." -ForegroundColor Green
} else {
    Write-Host "[ensure-ollama] Pulling model '$model' (one-time, ~1.6 GB)..." -ForegroundColor Cyan
    & ollama pull $model
}
