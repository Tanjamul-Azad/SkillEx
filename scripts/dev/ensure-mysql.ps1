param(
    [string]$DbEndpoint = ${env:DB_HOST},
    [int]$Port = 3306,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"

function Test-TcpPort {
    param(
        [Parameter(Mandatory = $true)][string]$NodeName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutMs = 1500
    )

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($NodeName, $Port, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            return $false
        }
        $client.EndConnect($iar)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Get-DbEndpointInfo {
    $url = [System.Environment]::GetEnvironmentVariable("DB_URL", "Process")
    if ([string]::IsNullOrWhiteSpace($url)) {
        return @{ Endpoint = "localhost"; Database = "skillex" }
    }

    $endpoint = "localhost"
    $database = "skillex"

    $endpointMatch = [regex]::Match($url, "jdbc:mysql://([^/:?]+)")
    if ($endpointMatch.Success) {
        $endpoint = $endpointMatch.Groups[1].Value
    }

    $dbMatch = [regex]::Match($url, "jdbc:mysql://[^/]+/([^?]+)")
    if ($dbMatch.Success) {
        $database = $dbMatch.Groups[1].Value
    }

    return @{ Endpoint = $endpoint; Database = $database }
}

function Start-MySqlServiceIfNeeded {
    $serviceNameHints = @("mysql", "mysql80", "mariadb", "xamppmysql")
    $services = Get-Service | Where-Object {
        $_.Name -match "mysql|maria" -or $_.DisplayName -match "mysql|maria"
    }

    foreach ($name in $serviceNameHints) {
        $svc = $services | Where-Object { $_.Name -ieq $name } | Select-Object -First 1
        if ($null -ne $svc -and $svc.Status -ne "Running") {
            try {
                Start-Service -Name $svc.Name -ErrorAction Stop
                Write-Host "Started Windows service: $($svc.Name)" -ForegroundColor Green
                return $true
            } catch {
                Write-Host "Service start failed ($($svc.Name)): $($_.Exception.Message)" -ForegroundColor DarkYellow
            }
        }
    }

    foreach ($svc in $services) {
        if ($svc.Status -eq "Running") {
            return $true
        }
        try {
            Start-Service -Name $svc.Name -ErrorAction Stop
            Write-Host "Started Windows service: $($svc.Name)" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "Service start failed ($($svc.Name)): $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    }

    return $false
}

function Start-XamppMySqlIfNeeded {
    $roots = @()
    if ($env:XAMPP_HOME) { $roots += $env:XAMPP_HOME }
    $roots += @("F:\\Xamp", "C:\\xampp")
    $roots = $roots | Select-Object -Unique

    foreach ($root in $roots) {
        if ([string]::IsNullOrWhiteSpace($root)) { continue }

        $startBat = Join-Path $root "mysql_start.bat"
        if (Test-Path $startBat) {
            try {
                Start-Process -FilePath $startBat -WorkingDirectory $root -WindowStyle Hidden
                Write-Host "Triggered XAMPP MySQL start via $startBat" -ForegroundColor Green
                return $true
            } catch {
                Write-Host ("Failed to run {0}: {1}" -f $startBat, $_.Exception.Message) -ForegroundColor DarkYellow
            }
        }

        $mysqld = Join-Path $root "mysql\\bin\\mysqld.exe"
        $myIni = Join-Path $root "mysql\\bin\\my.ini"
        if ((Test-Path $mysqld) -and (Test-Path $myIni)) {
            try {
                Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=$myIni", "--standalone" -WorkingDirectory (Split-Path $mysqld) -WindowStyle Hidden
                Write-Host "Started mysqld directly from $mysqld" -ForegroundColor Green
                return $true
            } catch {
                Write-Host "Failed direct mysqld start: $($_.Exception.Message)" -ForegroundColor DarkYellow
            }
        }
    }

    return $false
}

function Confirm-DatabaseExists {
    param(
        [string]$NodeName,
        [int]$Port,
        [string]$Database
    )

    $username = [System.Environment]::GetEnvironmentVariable("DB_USERNAME", "Process")
    if ([string]::IsNullOrWhiteSpace($username)) { $username = "root" }

    $password = [System.Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
    if ($null -eq $password) { $password = "" }

    $roots = @()
    if ($env:XAMPP_HOME) { $roots += $env:XAMPP_HOME }
    $roots += @("F:\\Xamp", "C:\\xampp")
    $roots = $roots | Select-Object -Unique

    $mysqlExe = $null
    foreach ($root in $roots) {
        $candidate = Join-Path $root "mysql\\bin\\mysql.exe"
        if (Test-Path $candidate) {
            $mysqlExe = $candidate
            break
        }
    }

    if (-not $mysqlExe) {
        return
    }

    try {
        $mysqlCliArgs = @("-h", $NodeName, "-P", $Port.ToString(), "-u", $username)
        if (-not [string]::IsNullOrWhiteSpace($password)) {
            $mysqlCliArgs += "-p$password"
        }
        $mysqlCliArgs += @("-e", "CREATE DATABASE IF NOT EXISTS $Database;")

        & $mysqlExe @mysqlCliArgs | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Verified database exists: $Database" -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: could not auto-create database '$Database' ($($_.Exception.Message))" -ForegroundColor DarkYellow
    }
}

$resolved = Get-DbEndpointInfo
if ([string]::IsNullOrWhiteSpace($DbEndpoint)) {
    $DbEndpoint = $resolved.Endpoint
}
$dbName = $resolved.Database

if (Test-TcpPort -NodeName $DbEndpoint -Port $Port) {
    Write-Host ("MySQL already reachable on {0} port {1}" -f $DbEndpoint, $Port) -ForegroundColor Green
    Confirm-DatabaseExists -NodeName $DbEndpoint -Port $Port -Database $dbName
    exit 0
}

Write-Host ("MySQL not reachable on {0} port {1}. Attempting to start..." -f $DbEndpoint, $Port) -ForegroundColor Yellow
$started = Start-MySqlServiceIfNeeded
if (-not $started) {
    $started = Start-XamppMySqlIfNeeded
}

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
while ((Get-Date) -lt $deadline) {
    if (Test-TcpPort -NodeName $DbEndpoint -Port $Port) {
        Write-Host ("MySQL is reachable on {0} port {1}" -f $DbEndpoint, $Port) -ForegroundColor Green
        Confirm-DatabaseExists -NodeName $DbEndpoint -Port $Port -Database $dbName
        exit 0
    }
    Start-Sleep -Seconds 1
}

Write-Error ("MySQL is still unreachable on {0} port {1} after {2} seconds. Start MySQL (XAMPP or service) and try again." -f $DbEndpoint, $Port, $TimeoutSeconds)
exit 1
