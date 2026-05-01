# Loads backend/.env into the current process, then runs Spring Boot via Gradle.
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

        $match = [regex]::Match($trimmed, '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$')
        if (-not $match.Success) { continue }

        $key = $match.Groups[1].Value
        $value = $match.Groups[2].Value.Trim()

        if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        } elseif ($value.StartsWith("'") -and $value.EndsWith("'") -and $value.Length -ge 2) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }

    Write-Host "[run-backend] Loaded .env from $envFile" -ForegroundColor Green
} else {
    Write-Host "[run-backend] No .env found at $envFile - continuing without it." -ForegroundColor DarkYellow
}

# Log which embedding provider is active.
$provider = [System.Environment]::GetEnvironmentVariable("EMBEDDING_PROVIDER", "Process")
$apiKey = [System.Environment]::GetEnvironmentVariable("EMBEDDING_API_KEY", "Process")
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    $apiKey = [System.Environment]::GetEnvironmentVariable("GEMINI_API_KEY", "Process")
}

if ($provider -eq "api" -and -not [string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "[run-backend] Embedding mode: Gemini API (real semantic embeddings)" -ForegroundColor Cyan
} else {
    Write-Host "[run-backend] Embedding mode: local hash fallback" -ForegroundColor DarkYellow
}

# Ensure MySQL is running.
$ensureMysql = Join-Path $Root "scripts\dev\ensure-mysql.ps1"
if (Test-Path $ensureMysql) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $ensureMysql
}

# Set JAVA_HOME and launch Spring Boot via Gradle.
# Use system JAVA_HOME or PATH
# $env:JAVA_HOME = "C:\Users\User\.jdk\jdk-21.0.8"
Set-Location (Join-Path $Root "backend")

$gradleExecutable = $null

if (Test-Path ".\gradlew.bat") {
    $gradleExecutable = ".\gradlew.bat"
} elseif (Test-Path ".\gradlew") {
    $gradleExecutable = ".\gradlew"
} else {
    $gradleCommand = Get-Command gradle.bat -ErrorAction SilentlyContinue
    if (-not $gradleCommand) {
        $gradleCommand = Get-Command gradle -ErrorAction SilentlyContinue
    }

    if (-not $gradleCommand) {
        throw "[run-backend] Gradle command not found. Use gradlew wrapper or install Gradle on PATH."
    }

    $gradleExecutable = if ($gradleCommand.Source) { $gradleCommand.Source } else { $gradleCommand.Definition }
}

Write-Host "[run-backend] Build tool: Gradle" -ForegroundColor Cyan
& $gradleExecutable "bootRun"
