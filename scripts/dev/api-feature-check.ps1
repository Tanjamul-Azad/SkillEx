param(
  [string]$BaseUrl = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$results = New-Object System.Collections.Generic.List[object]
$failures = New-Object System.Collections.Generic.List[string]

function Add-Result {
  param(
    [string]$Name,
    [bool]$Passed,
    [int]$Status,
    [string]$Info
  )

  $results.Add([pscustomobject]@{
    Name = $Name
    Passed = $Passed
    Status = $Status
    Info = $Info
  })

  if (-not $Passed) {
    $failures.Add("$Name -> HTTP $Status : $Info")
  }
}

function Invoke-Json {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = "",
    [int[]]$Expected = @(200, 201)
  )

  $uri = "$BaseUrl$Path"
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }

  $jsonBody = $null
  if ($null -ne $Body) {
    $jsonBody = ($Body | ConvertTo-Json -Depth 12)
  }

  try {
    $resp = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $jsonBody -UseBasicParsing -TimeoutSec 30
    $status = [int]$resp.StatusCode
    $payload = $null
    if ($resp.Content) {
      try { $payload = $resp.Content | ConvertFrom-Json } catch { }
    }

    $ok = $Expected -contains $status
    Add-Result -Name $Name -Passed $ok -Status $status -Info "ok"
    return [pscustomobject]@{ Status = $status; Json = $payload; Raw = $resp.Content }
  }
  catch {
    $status = 0
    $content = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode.value__
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $content = $sr.ReadToEnd()
    } else {
      $content = $_.Exception.Message
    }

    $ok = $Expected -contains $status
    Add-Result -Name $Name -Passed $ok -Status $status -Info $content
    if ($ok) {
      $payload = $null
      if ($content) {
        try { $payload = $content | ConvertFrom-Json } catch { }
      }
      return [pscustomobject]@{ Status = $status; Json = $payload; Raw = $content }
    }

    return [pscustomobject]@{ Status = $status; Json = $null; Raw = $content }
  }
}

function Invoke-Multipart {
  param(
    [string]$Name,
    [string]$Path,
    [string]$FilePath,
    [string]$Token,
    [int[]]$Expected = @(200, 201)
  )

  $uri = "$BaseUrl$Path"
  $headers = @{}
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }

  Add-Type -AssemblyName System.Net.Http

  try {
    $handler = New-Object System.Net.Http.HttpClientHandler
    $client = New-Object System.Net.Http.HttpClient($handler)
    foreach ($k in $headers.Keys) {
      $client.DefaultRequestHeaders.Add($k, $headers[$k])
    }

    $content = New-Object System.Net.Http.MultipartFormDataContent
    [byte[]]$bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")
    $content.Add($fileContent, "file", [System.IO.Path]::GetFileName($FilePath))

    $httpResp = $client.PostAsync($uri, $content).Result
    $status = [int]$httpResp.StatusCode
    $raw = $httpResp.Content.ReadAsStringAsync().Result
    $payload = $null
    if ($raw) {
      try { $payload = $raw | ConvertFrom-Json } catch { }
    }

    $client.Dispose()
    $content.Dispose()

    $ok = $Expected -contains $status
    Add-Result -Name $Name -Passed $ok -Status $status -Info "ok"
    return [pscustomobject]@{ Status = $status; Json = $payload; Raw = $raw }
  }
  catch {
    $status = 0
    $content = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode.value__
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $content = $sr.ReadToEnd()
    } else {
      $content = $_.Exception.Message
    }

    $ok = $Expected -contains $status
    Add-Result -Name $Name -Passed $ok -Status $status -Info $content
    return [pscustomobject]@{ Status = $status; Json = $null; Raw = $content }
  }
}

Write-Host "== API Feature Validation Start =="

# Public endpoints
$skillsRes = Invoke-Json -Name "Public skills list" -Method Get -Path "/api/skills"
$firstSkillId = $null
$firstSkillName = ""
if ($skillsRes.Json -and $skillsRes.Json.data -and $skillsRes.Json.data.Count -gt 0) {
  $firstSkillId = $skillsRes.Json.data[0].id
  $firstSkillName = $skillsRes.Json.data[0].name
}

if (-not $firstSkillId) {
  Add-Result -Name "Skill seed available" -Passed $false -Status 0 -Info "No skills found in /api/skills"
}

if ($firstSkillId) {
  Invoke-Json -Name "Public skill detail" -Method Get -Path "/api/skills/$firstSkillId" | Out-Null
}

Invoke-Json -Name "Public skill intent interpret" -Method Post -Path "/api/skills/interpret" -Body @{ teachText = "I can teach $firstSkillName"; learnText = "I want to learn communication" } | Out-Null
Invoke-Json -Name "Public community events" -Method Get -Path "/api/community/events" | Out-Null
Invoke-Json -Name "Public community discussions" -Method Get -Path "/api/community/discussions" | Out-Null
Invoke-Json -Name "Public community posts" -Method Get -Path "/api/community/posts" | Out-Null
Invoke-Json -Name "Public community stories" -Method Get -Path "/api/community/stories" | Out-Null
Invoke-Json -Name "Public community circles" -Method Get -Path "/api/community/skill-circles" | Out-Null

# Register + login two users
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$userAEmail = "qa.a.$suffix@skillex.local"
$userBEmail = "qa.b.$suffix@skillex.local"
$userAPass = "Passw0rd!A"
$userBPass = "Passw0rd!B"

Invoke-Json -Name "Register user A" -Method Post -Path "/api/auth/register" -Body @{
  name = "QA User A"
  email = $userAEmail
  password = $userAPass
  university = "QA University"
  skillToTeach = $firstSkillName
  skillToLearn = "Public Speaking"
  level = "MODERATE"
} | Out-Null

Invoke-Json -Name "Register user B" -Method Post -Path "/api/auth/register" -Body @{
  name = "QA User B"
  email = $userBEmail
  password = $userBPass
  university = "QA University"
  skillToTeach = "Public Speaking"
  skillToLearn = $firstSkillName
  level = "BEGINNER"
} | Out-Null

$loginA = Invoke-Json -Name "Login user A" -Method Post -Path "/api/auth/login" -Body @{ email = $userAEmail; password = $userAPass }
$loginB = Invoke-Json -Name "Login user B" -Method Post -Path "/api/auth/login" -Body @{ email = $userBEmail; password = $userBPass }

$tokenA = $loginA.Json.data.token
$tokenB = $loginB.Json.data.token
$userAId = $loginA.Json.data.user.id
$userBId = $loginB.Json.data.user.id

if (-not $tokenA) { Add-Result -Name "Token user A present" -Passed $false -Status 0 -Info "Missing token for user A" }
if (-not $tokenB) { Add-Result -Name "Token user B present" -Passed $false -Status 0 -Info "Missing token for user B" }

# Auth and profile
Invoke-Json -Name "Auth me user A" -Method Get -Path "/api/auth/me" -Token $tokenA | Out-Null
Invoke-Json -Name "Users me user A" -Method Get -Path "/api/users/me" -Token $tokenA | Out-Null
Invoke-Json -Name "Users profile by id user A" -Method Get -Path "/api/users/$userAId" -Token $tokenA | Out-Null
Invoke-Json -Name "Users search" -Method Get -Path "/api/users?query=QA&page=0&size=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Update profile user A" -Method Patch -Path "/api/users/me" -Token $tokenA -Body @{ university = "QA Updated University"; bio = "API feature verification run." } | Out-Null

# Skills add/remove
if ($firstSkillId) {
  Invoke-Json -Name "Add skill offered user A" -Method Post -Path "/api/users/me/skills" -Token $tokenA -Body @{ skillId = $firstSkillId; type = "offered"; level = "MODERATE" } | Out-Null
  Invoke-Json -Name "Remove skill offered user A" -Method Delete -Path "/api/users/me/skills/$firstSkillId?type=offered" -Token $tokenA -Expected @(200, 404) | Out-Null
}

# Change password then login with new password
$newPassA = "Passw0rd!A2"
Invoke-Json -Name "Change password user A" -Method Post -Path "/api/users/me/change-password" -Token $tokenA -Body @{ currentPassword = $userAPass; newPassword = $newPassA } | Out-Null
$loginA2 = Invoke-Json -Name "Login user A with new password" -Method Post -Path "/api/auth/login" -Body @{ email = $userAEmail; password = $newPassA }
$tokenA = $loginA2.Json.data.token

# Community create interactions
$eventRes = Invoke-Json -Name "Create community event" -Method Post -Path "/api/community/events" -Token $tokenA -Body @{
  title = "QA Event $suffix"
  description = "Feature smoke event"
  eventDate = (Get-Date).AddDays(2).ToString("yyyy-MM-ddTHH:mm:ss")
  location = "Online"
  isOnline = $true
  coverGradient = "from-cyan-500 to-blue-600"
  skillIds = @()
}
$eventId = $eventRes.Json.data.id
if ($eventId) {
  Invoke-Json -Name "Attend community event" -Method Post -Path "/api/community/events/$eventId/attend" -Token $tokenB | Out-Null
}

$discussionRes = Invoke-Json -Name "Create discussion" -Method Post -Path "/api/community/discussions" -Token $tokenA -Body @{
  title = "QA Discussion $suffix"
  content = "Does this flow work?"
  category = "Testing"
}
$discussionId = $discussionRes.Json.data.id
if ($discussionId) {
  Invoke-Json -Name "Upvote discussion" -Method Post -Path "/api/community/discussions/$discussionId/upvote" -Token $tokenB | Out-Null
}

$postRes = Invoke-Json -Name "Create post" -Method Post -Path "/api/community/posts" -Token $tokenA -Body @{
  type = "QUESTION"
  content = "QA post content $suffix"
  skillId = $firstSkillId
}
$postId = $postRes.Json.data.id
if ($postId) {
  Invoke-Json -Name "Like post" -Method Post -Path "/api/community/posts/$postId/like" -Token $tokenB | Out-Null
}

$circles = Invoke-Json -Name "Get circles for join" -Method Get -Path "/api/community/skill-circles?page=0&size=20"
$circleId = $null
if ($circles.Json -and $circles.Json.data -and $circles.Json.data.content -and $circles.Json.data.content.Count -gt 0) {
  $circleId = $circles.Json.data.content[0].id
}
if ($circleId) {
  Invoke-Json -Name "Join skill circle" -Method Post -Path "/api/community/skill-circles/$circleId/join" -Token $tokenA | Out-Null
} else {
  Add-Result -Name "Join skill circle" -Passed $true -Status 200 -Info "Skipped, no circles available"
}

# Exchange workflow A->B
$exchangeRes = Invoke-Json -Name "Create exchange" -Method Post -Path "/api/exchanges" -Token $tokenA -Body @{
  receiverId = $userBId
  offeredSkillId = $firstSkillId
  wantedSkillId = $firstSkillId
  message = "QA exchange request"
}
$exchangeId = $exchangeRes.Json.data.id
Invoke-Json -Name "List exchanges A" -Method Get -Path "/api/exchanges?page=0&size=20" -Token $tokenA | Out-Null
Invoke-Json -Name "List exchanges B" -Method Get -Path "/api/exchanges?page=0&size=20" -Token $tokenB | Out-Null
if ($exchangeId) {
  Invoke-Json -Name "Get exchange by id B" -Method Get -Path "/api/exchanges/$exchangeId" -Token $tokenB | Out-Null
  Invoke-Json -Name "Accept exchange as B" -Method Patch -Path "/api/exchanges/$exchangeId/status" -Token $tokenB -Body @{ status = "ACCEPTED" } | Out-Null
}

# Session workflow
$sessionId = $null
if ($exchangeId) {
  $sessionRes = Invoke-Json -Name "Create session" -Method Post -Path "/api/sessions" -Token $tokenA -Body @{
    exchangeId = $exchangeId
    teacherId = $userAId
    learnerId = $userBId
    skillId = $firstSkillId
    scheduledAt = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
    durationMins = 60
    meetLink = "https://meet.example.com/qa-$suffix"
  }
  $sessionId = $sessionRes.Json.data.id
}

Invoke-Json -Name "List sessions A" -Method Get -Path "/api/sessions?page=0&size=20" -Token $tokenA | Out-Null
if ($sessionId) {
  Invoke-Json -Name "Get session by id B" -Method Get -Path "/api/sessions/$sessionId" -Token $tokenB | Out-Null
  Invoke-Json -Name "Cancel session as B" -Method Patch -Path "/api/sessions/$sessionId/cancel" -Token $tokenB | Out-Null
}

# Reviews
if ($sessionId) {
  Invoke-Json -Name "Create review" -Method Post -Path "/api/reviews" -Token $tokenB -Body @{
    sessionId = $sessionId
    toUserId = $userAId
    skillId = $firstSkillId
    rating = 5
    comment = "Great session from API test"
  } | Out-Null
}
Invoke-Json -Name "List reviews for user A" -Method Get -Path "/api/reviews?userId=$userAId&page=0&size=10" -Token $tokenA | Out-Null

# Notifications + dashboard
$notifRes = Invoke-Json -Name "List notifications" -Method Get -Path "/api/notifications?page=0&size=20" -Token $tokenA
Invoke-Json -Name "Mark all notifications read" -Method Post -Path "/api/notifications/read-all" -Token $tokenA -Body @{} | Out-Null
if ($notifRes.Json -and $notifRes.Json.data -and $notifRes.Json.data.content -and $notifRes.Json.data.content.Count -gt 0) {
  $nId = $notifRes.Json.data.content[0].id
  Invoke-Json -Name "Mark one notification read" -Method Patch -Path "/api/notifications/$nId/read" -Token $tokenA -Body @{} | Out-Null
} else {
  Add-Result -Name "Mark one notification read" -Passed $true -Status 200 -Info "Skipped, no notifications available"
}

Invoke-Json -Name "Dashboard stats" -Method Get -Path "/api/dashboard/stats" -Token $tokenA | Out-Null

# Messages + match
Invoke-Json -Name "List conversations" -Method Get -Path "/api/messages/conversations" -Token $tokenA | Out-Null
Invoke-Json -Name "Get message history" -Method Get -Path "/api/messages/$userBId?page=0&size=20" -Token $tokenA | Out-Null
Invoke-Json -Name "Mark messages read" -Method Patch -Path "/api/messages/$userBId/read" -Token $tokenA -Body @{} | Out-Null

Invoke-Json -Name "Match users" -Method Get -Path "/api/match/users?limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match chains" -Method Get -Path "/api/match/chains?maxDepth=4&limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match cycles" -Method Get -Path "/api/match/cycles?maxLength=4&limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match top cycles" -Method Get -Path "/api/match/top-cycles?maxLength=4&limit=10" -Token $tokenA | Out-Null

# Upload authenticated + static serve
$tempFile = Join-Path $env:TEMP "skillex-api-check-$suffix.txt"
"SkillEX upload test $suffix" | Set-Content -Path $tempFile -Encoding UTF8
$uploadRes = Invoke-Multipart -Name "Upload file authenticated" -Path "/api/upload" -FilePath $tempFile -Token $tokenA

if ($uploadRes.Json -and $uploadRes.Json.data -and $uploadRes.Json.data.url) {
  $uploadedPath = $uploadRes.Json.data.url
  Invoke-Json -Name "Fetch uploaded static file" -Method Get -Path $uploadedPath -Expected @(200) | Out-Null
}

# Unauthorized check
Invoke-Json -Name "Protected endpoint unauthorized check" -Method Get -Path "/api/users/me" -Expected @(401) | Out-Null

Write-Host ""
Write-Host "== API Feature Validation Summary =="
$results | Sort-Object Name | Format-Table -AutoSize

$passCount = ($results | Where-Object { $_.Passed }).Count
$totalCount = $results.Count
Write-Host ""
Write-Host "Passed: $passCount / $totalCount"

if ($failures.Count -gt 0) {
  Write-Host "Failures:"
  $failures | ForEach-Object { Write-Host " - $_" }
  exit 1
}

Write-Host "All API feature checks passed."
exit 0
