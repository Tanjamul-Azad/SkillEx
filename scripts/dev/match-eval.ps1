param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$DatasetPath = "./scripts/dev/match-eval.sample.json",
  [int]$K = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $DatasetPath)) {
  throw "Dataset file not found: $DatasetPath"
}

$raw = Get-Content -Path $DatasetPath -Raw
$cases = $raw | ConvertFrom-Json
if ($null -eq $cases -or $cases.Count -eq 0) {
  throw "Dataset is empty."
}

$results = @()

foreach ($case in $cases) {
  $name = if ($case.name) { $case.name } else { $case.learnerEmail }

  $loginBody = @{
    email    = $case.learnerEmail
    password = $case.learnerPassword
  } | ConvertTo-Json

  $loginResp = Invoke-WebRequest -Uri ($BaseUrl + "/api/auth/login") -Method Post -ContentType "application/json" -Body $loginBody -UseBasicParsing
  $loginObj = $loginResp.Content | ConvertFrom-Json
  $token = $loginObj.data.token
  if (-not $token) {
    throw "Login failed for case '$name'"
  }

  $headers = @{ Authorization = "Bearer $token" }
  $matchResp = Invoke-WebRequest -Uri ($BaseUrl + "/api/match/users?limit=$K") -Method Get -Headers $headers -UseBasicParsing
  $matchObj = $matchResp.Content | ConvertFrom-Json
  $predicted = @($matchObj.data)

  $expectedIds = @()
  $expectedNames = @()

  if ($case.expectedUserIds) { $expectedIds = @($case.expectedUserIds) }
  if ($case.expectedUserNames) { $expectedNames = @($case.expectedUserNames) }

  $expectedCount = [Math]::Max($expectedIds.Count, $expectedNames.Count)
  if ($expectedCount -eq 0) {
    throw "Case '$name' must provide expectedUserIds or expectedUserNames"
  }

  $relevantRetrieved = 0
  foreach ($candidate in $predicted) {
    $idMatch = $expectedIds.Count -gt 0 -and ($expectedIds -contains $candidate.id)
    $nameMatch = $expectedNames.Count -gt 0 -and ($expectedNames -contains $candidate.name)
    if ($idMatch -or $nameMatch) {
      $relevantRetrieved++
    }
  }

  $precisionAtK = [Math]::Round(($relevantRetrieved / [double]$K), 4)
  $recallAtK = [Math]::Round(($relevantRetrieved / [double]$expectedCount), 4)

  $results += [PSCustomObject]@{
    CaseName = $name
    Retrieved = $predicted.Count
    ExpectedRelevant = $expectedCount
    RelevantRetrieved = $relevantRetrieved
    PrecisionAtK = $precisionAtK
    RecallAtK = $recallAtK
  }
}

$avgPrecision = [Math]::Round((($results | Measure-Object -Property PrecisionAtK -Average).Average), 4)
$avgRecall = [Math]::Round((($results | Measure-Object -Property RecallAtK -Average).Average), 4)

Write-Host "=== Match Quality (Offline Eval) ==="
$results | Format-Table -AutoSize | Out-String | Write-Host
Write-Host ("Macro Precision@{0}: {1}" -f $K, $avgPrecision)
Write-Host ("Macro Recall@{0}: {1}" -f $K, $avgRecall)

$reportPath = Join-Path (Split-Path -Parent $DatasetPath) "match-eval-report.json"
@{
  generatedAt = (Get-Date).ToString("o")
  baseUrl = $BaseUrl
  k = $K
  macroPrecisionAtK = $avgPrecision
  macroRecallAtK = $avgRecall
  cases = $results
} | ConvertTo-Json -Depth 5 | Set-Content -Path $reportPath

Write-Host ("Report written: " + $reportPath)
