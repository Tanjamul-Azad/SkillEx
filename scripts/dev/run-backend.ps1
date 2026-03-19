# Loads backend/.env into the current process, then runs Spring Boot via Maven.
# Called by the root package.json dev:backend script so env vars survive the
# subprocess boundary that concurrently creates.

param(
    [string]$Root = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$envFile = Join-Path $Root "backend\.env"

if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) { continue }
        $m = [regex]::Match($trimmed, '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
        if (-not $m.Success) { continue }
        $key   = $m.Groups[1].Value
        $value = $m.Groups[2].Value.Trim().Trim('"').Trim("'")
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
    Write-Host "[run-backend] Loaded .env from $envFile" -ForegroundColor Green
} else {
    Write-Host "[run-backend] No .env found at $envFile — continuing without it." -ForegroundColor DarkYellow
}

# Log which embedding provider is active
$provider = [System.Environment]::GetEnvironmentVariable("EMBEDDING_PROVIDER", "Process")
$apiKey   = [System.Environment]::GetEnvironmentVariable("EMBEDDING_API_KEY", "Process")
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    $apiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "Process")
}
if ($provider -eq "api" -and -not [string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "[run-backend] Embedding mode: Gemini API (real semantic embeddings)" -ForegroundColor Cyan
} else {
    Write-Host "[run-backend] Embedding mode: local hash fallback" -ForegroundColor DarkYellow
}

# Ensure MySQL is running
$ensureMysql = Join-Path $Root "scripts\dev\ensure-mysql.ps1"
if (Test-Path $ensureMysql) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $ensureMysql
}

# Set JAVA_HOME and launch Maven
$env:JAVA_HOME = "C:\Users\User\.jdk\jdk-21.0.8"
Set-Location (Join-Path $Root "backend")
& "apache-maven-3.9.6\bin\mvn.cmd" "spring-boot:run"
