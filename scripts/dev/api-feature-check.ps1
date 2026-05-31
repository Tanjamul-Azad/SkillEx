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
    [string]$ContentType = "application/octet-stream",
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
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($ContentType)
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
$unrelatedSkillId = $null
if ($skillsRes.Json -and $skillsRes.Json.data -and $skillsRes.Json.data.Count -gt 0) {
  $firstSkillId = $skillsRes.Json.data[0].id
  $firstSkillName = $skillsRes.Json.data[0].name
  $unrelatedSkill = @($skillsRes.Json.data | Where-Object { $_.id -ne $firstSkillId -and $_.name -ne "Public Speaking" } | Select-Object -First 1)
  if ($unrelatedSkill.Count -gt 0) {
    $unrelatedSkillId = $unrelatedSkill[0].id
  }
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
Invoke-Json -Name "Users search" -Method Get -Path "/api/users/search?q=QA&page=0&size=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Update profile user A" -Method Patch -Path "/api/users/me" -Token $tokenA -Body @{ university = "QA Updated University"; bio = "API feature verification run." } | Out-Null

# Skills add/remove
if ($firstSkillId) {
  Invoke-Json -Name "Add skill offered user A" -Method Post -Path "/api/users/me/skills" -Token $tokenA -Body @{ skillId = $firstSkillId; type = "offered"; level = "MODERATE" } | Out-Null
  Invoke-Json -Name "Remove skill offered user A" -Method Delete -Path "/api/users/me/skills/$firstSkillId?type=offered" -Token $tokenA -Expected @(200, 404) | Out-Null
  Invoke-Json -Name "Re-add skill offered user A" -Method Post -Path "/api/users/me/skills" -Token $tokenA -Body @{ skillId = $firstSkillId; type = "offered"; level = "MODERATE" } | Out-Null
}

# Progress + portfolio proof edge cases
$progressBefore = Invoke-Json -Name "Progress before portfolio proof" -Method Get -Path "/api/progress/me" -Token $tokenA
$progressBeforeXp = 0
if ($progressBefore.Json -and $progressBefore.Json.data) {
  $progressBeforeXp = [int]$progressBefore.Json.data.totalXp
}

if ($firstSkillId) {
  Invoke-Json -Name "Reject unsafe portfolio URL" -Method Post -Path "/api/users/me/portfolio-proofs" -Token $tokenA -Expected @(422) -Body @{
    skillId = $firstSkillId
    title = "Unsafe proof URL"
    proofType = "PROJECT"
    url = "javascript:alert(1)"
    visibility = "PUBLIC"
  } | Out-Null

  if ($unrelatedSkillId) {
    Invoke-Json -Name "Reject unrelated portfolio skill" -Method Post -Path "/api/users/me/portfolio-proofs" -Token $tokenA -Expected @(403) -Body @{
      skillId = $unrelatedSkillId
      title = "Wrong skill proof"
      proofType = "PROJECT"
      url = "https://example.com/wrong-skill"
      visibility = "PUBLIC"
    } | Out-Null
  }

  $privateProof = Invoke-Json -Name "Create private portfolio proof" -Method Post -Path "/api/users/me/portfolio-proofs" -Token $tokenA -Body @{
    skillId = $firstSkillId
    title = "QA private portfolio proof"
    description = "Private proof should only be visible to owner."
    proofType = "PROJECT"
    url = "https://example.com/private-proof"
    visibility = "PRIVATE"
    featured = $true
  }
  $privateProofId = $privateProof.Json.data.id

  $ownerProofs = Invoke-Json -Name "Owner sees private portfolio proof" -Method Get -Path "/api/users/$userAId/portfolio-proofs?page=0&size=10" -Token $tokenA
  $ownerMatchCount = @($ownerProofs.Json.data.content | Where-Object { $_.id -eq $privateProofId }).Count
  Add-Result -Name "Owner private portfolio proof visible" -Passed ($ownerMatchCount -eq 1) -Status $ownerMatchCount -Info "expected 1"

  $publicProofs = Invoke-Json -Name "Public hides private portfolio proof" -Method Get -Path "/api/users/$userAId/portfolio-proofs?page=0&size=10"
  $publicMatchCount = @($publicProofs.Json.data.content | Where-Object { $_.id -eq $privateProofId }).Count
  Add-Result -Name "Public private portfolio proof hidden" -Passed ($publicMatchCount -eq 0) -Status $publicMatchCount -Info "expected 0"

  Invoke-Json -Name "Other user cannot delete portfolio proof" -Method Delete -Path "/api/users/me/portfolio-proofs/$privateProofId" -Token $tokenB -Expected @(403) | Out-Null

  $progressAfter = Invoke-Json -Name "Progress after portfolio proof" -Method Get -Path "/api/progress/me" -Token $tokenA
  $progressAfterXp = 0
  if ($progressAfter.Json -and $progressAfter.Json.data) {
    $progressAfterXp = [int]$progressAfter.Json.data.totalXp
  }
  Add-Result -Name "Portfolio proof awards 20 XP" -Passed (($progressAfterXp - $progressBeforeXp) -eq 20) -Status 200 -Info "before=$progressBeforeXp after=$progressAfterXp"

  $xpEvents = Invoke-Json -Name "XP events after portfolio proof" -Method Get -Path "/api/progress/me/xp-events?page=0&size=10" -Token $tokenA
  $eventMatchCount = @($xpEvents.Json.data.content | Where-Object { $_.sourceId -eq $privateProofId }).Count
  Add-Result -Name "Portfolio proof XP event recorded" -Passed ($eventMatchCount -eq 1) -Status $eventMatchCount -Info "expected 1"
}

# Change password then login with new password
$newPassA = "Passw0rd!A2"
Invoke-Json -Name "Change password user A" -Method Post -Path "/api/users/me/change-password" -Token $tokenA -Body @{ currentPassword = $userAPass; newPassword = $newPassA } | Out-Null
$loginA2 = Invoke-Json -Name "Login user A with new password" -Method Post -Path "/api/auth/login" -Body @{ email = $userAEmail; password = $newPassA }
$tokenA = $loginA2.Json.data.token

$adminLogin = Invoke-Json -Name "Login demo admin" -Method Post -Path "/api/auth/login" -Body @{ email = "admin@skillex.app"; password = "Admin1234!" }
$tokenAdmin = $adminLogin.Json.data.token
if (-not $tokenAdmin) { Add-Result -Name "Token admin present" -Passed $false -Status 0 -Info "Missing token for demo admin" }

$walletBeforeReward = Invoke-Json -Name "Credit wallet before teaching reward" -Method Get -Path "/api/credits/wallet" -Token $tokenA
$walletBalanceBeforeReward = 0
if ($walletBeforeReward.Json -and $walletBeforeReward.Json.data) {
  $walletBalanceBeforeReward = [int]$walletBeforeReward.Json.data.balance
}
Invoke-Json -Name "Credit transactions before reward" -Method Get -Path "/api/credits/transactions?page=0&size=20" -Token $tokenA | Out-Null
Invoke-Json -Name "AI helper match guidance" -Method Post -Path "/api/ai/helper" -Token $tokenA -Body @{
  contextType = "MATCH"
  prompt = "How can I improve this exchange match?"
  pagePath = "/match"
} | Out-Null

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
  Invoke-Json -Name "Unlike post" -Method Post -Path "/api/community/posts/$postId/unlike" -Token $tokenB | Out-Null
  Invoke-Json -Name "Like post after unlike" -Method Post -Path "/api/community/posts/$postId/like" -Token $tokenB | Out-Null
  Invoke-Json -Name "Add post comment" -Method Post -Path "/api/community/posts/$postId/comments" -Token $tokenB -Body @{ content = "QA comment $suffix" } | Out-Null
  Invoke-Json -Name "List post comments" -Method Get -Path "/api/community/posts/$postId/comments?page=0&size=20" | Out-Null
  Invoke-Json -Name "User posts" -Method Get -Path "/api/community/posts/user/$userAId?page=0&size=10" | Out-Null
}

$circleCreateRes = Invoke-Json -Name "Create skill circle" -Method Post -Path "/api/community/skill-circles" -Token $tokenA -Body @{
  name = "QA Circle $suffix"
  icon = "Code"
  skillIds = @($firstSkillId)
}
$createdCircleId = $circleCreateRes.Json.data.id
if ($createdCircleId) {
  Invoke-Json -Name "Join created skill circle" -Method Post -Path "/api/community/skill-circles/$createdCircleId/join" -Token $tokenB | Out-Null
  Invoke-Json -Name "Leave created skill circle" -Method Post -Path "/api/community/skill-circles/$createdCircleId/leave" -Token $tokenB | Out-Null
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

Invoke-Json -Name "Community feed for you" -Method Get -Path "/api/community/feed?mode=for-you&page=0&size=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Community feed by skill" -Method Get -Path "/api/community/feed?mode=skill&skillId=$firstSkillId&page=0&size=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Community post intent search" -Method Get -Path "/api/community/posts/search?intent=QA&page=0&size=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Community trending skills" -Method Get -Path "/api/community/trending-skills" | Out-Null
Invoke-Json -Name "Community suggested users" -Method Get -Path "/api/community/suggested-users" -Token $tokenA | Out-Null
Invoke-Json -Name "Community online count" -Method Get -Path "/api/community/online-count" | Out-Null

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
Invoke-Json -Name "Exchange relationship A to B" -Method Get -Path "/api/exchanges/relationship/$userBId" -Token $tokenA | Out-Null
Invoke-Json -Name "Connection relationship A to B" -Method Get -Path "/api/connections/relationship/$userBId" -Token $tokenA | Out-Null
Invoke-Json -Name "List accepted connections A" -Method Get -Path "/api/connections?status=ACCEPTED&direction=all&page=0&size=20" -Token $tokenA | Out-Null
Invoke-Json -Name "Pending connection count B" -Method Get -Path "/api/connections/pending-count" -Token $tokenB | Out-Null

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
  Invoke-Json -Name "Accept session as B" -Method Put -Path "/api/sessions/$sessionId/accept" -Token $tokenB -Body @{} | Out-Null
  Invoke-Json -Name "Complete session as A" -Method Patch -Path "/api/sessions/$sessionId/complete" -Token $tokenA -Body @{} | Out-Null
  $walletAfterReward = Invoke-Json -Name "Credit wallet after teaching reward" -Method Get -Path "/api/credits/wallet" -Token $tokenA
  if ($walletAfterReward.Json -and $walletAfterReward.Json.data) {
    $afterRewardBalance = [int]$walletAfterReward.Json.data.balance
    Add-Result -Name "Teaching reward increases wallet by 15" -Passed ($afterRewardBalance -eq ($walletBalanceBeforeReward + 15)) -Status 200 -Info "before=$walletBalanceBeforeReward after=$afterRewardBalance"
  } else {
    Add-Result -Name "Teaching reward increases wallet by 15" -Passed $false -Status 0 -Info "Missing wallet response after completion"
  }
  Invoke-Json -Name "Credit transactions after teaching reward" -Method Get -Path "/api/credits/transactions?page=0&size=20" -Token $tokenA | Out-Null
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

# Separate cancellation lifecycle check, because reviews are only valid after completed sessions.
$cancelSessionRes = $null
if ($exchangeId) {
  $cancelSessionRes = Invoke-Json -Name "Create cancellable session" -Method Post -Path "/api/sessions" -Token $tokenA -Body @{
    exchangeId = $exchangeId
    teacherId = $userAId
    learnerId = $userBId
    skillId = $firstSkillId
    scheduledAt = (Get-Date).AddDays(2).ToString("yyyy-MM-ddTHH:mm:ss")
    durationMins = 60
    meetLink = "https://meet.example.com/qa-cancel-$suffix"
  }
}
$cancelSessionId = $cancelSessionRes.Json.data.id
if ($cancelSessionId) {
  Invoke-Json -Name "Cancel session as B" -Method Patch -Path "/api/sessions/$cancelSessionId/cancel" -Token $tokenB -Body @{} | Out-Null
}

# Credit payment spend/refund workflow
$walletBeforeCreditPayment = Invoke-Json -Name "Credit wallet before credit exchange" -Method Get -Path "/api/credits/wallet" -Token $tokenA
$balanceBeforeCreditPayment = if ($walletBeforeCreditPayment.Json -and $walletBeforeCreditPayment.Json.data) { [int]$walletBeforeCreditPayment.Json.data.balance } else { 0 }
$creditExchangeRes = Invoke-Json -Name "Create credit payment exchange" -Method Post -Path "/api/exchanges" -Token $tokenA -Body @{
  receiverId = $userBId
  wantedSkillId = $firstSkillId
  mode = "CREDIT_PAYMENT"
  message = "QA credit payment request"
}
$creditExchangeId = $creditExchangeRes.Json.data.id
$creditCost = if ($creditExchangeRes.Json -and $creditExchangeRes.Json.data -and $creditExchangeRes.Json.data.creditCost) { [int]$creditExchangeRes.Json.data.creditCost } else { 10 }
$walletAfterCreditCharge = Invoke-Json -Name "Credit wallet after credit exchange charge" -Method Get -Path "/api/credits/wallet" -Token $tokenA
if ($walletAfterCreditCharge.Json -and $walletAfterCreditCharge.Json.data) {
  $balanceAfterCreditCharge = [int]$walletAfterCreditCharge.Json.data.balance
  Add-Result -Name "Credit exchange charge decreases wallet" -Passed ($balanceAfterCreditCharge -eq ($balanceBeforeCreditPayment - $creditCost)) -Status 200 -Info "before=$balanceBeforeCreditPayment cost=$creditCost after=$balanceAfterCreditCharge"
}
if ($creditExchangeId) {
  Invoke-Json -Name "Reject credit exchange as B" -Method Put -Path "/api/exchanges/$creditExchangeId/reject" -Token $tokenB -Body @{} | Out-Null
}
$walletAfterCreditRefund = Invoke-Json -Name "Credit wallet after credit exchange refund" -Method Get -Path "/api/credits/wallet" -Token $tokenA
if ($walletAfterCreditRefund.Json -and $walletAfterCreditRefund.Json.data) {
  $balanceAfterCreditRefund = [int]$walletAfterCreditRefund.Json.data.balance
  Add-Result -Name "Credit exchange refund restores wallet" -Passed ($balanceAfterCreditRefund -eq $balanceBeforeCreditPayment) -Status 200 -Info "before=$balanceBeforeCreditPayment after=$balanceAfterCreditRefund"
}

# Live room, transcript, generated notes, and room completion reward
$roomSessionId = $null
if ($exchangeId) {
  $roomSessionRes = Invoke-Json -Name "Create live room session" -Method Post -Path "/api/sessions" -Token $tokenA -Body @{
    exchangeId = $exchangeId
    teacherId = $userAId
    learnerId = $userBId
    skillId = $firstSkillId
    scheduledAt = (Get-Date).AddDays(3).ToString("yyyy-MM-ddTHH:mm:ss")
    durationMins = 45
    meetLink = "https://meet.example.com/qa-room-$suffix"
    sessionType = "VIDEO"
  }
  $roomSessionId = $roomSessionRes.Json.data.id
}

if ($roomSessionId) {
  Invoke-Json -Name "Accept live room session as B" -Method Put -Path "/api/sessions/$roomSessionId/accept" -Token $tokenB -Body @{} | Out-Null
  $walletBeforeRoomEnd = Invoke-Json -Name "Credit wallet before room end" -Method Get -Path "/api/credits/wallet" -Token $tokenA
  $balanceBeforeRoomEnd = if ($walletBeforeRoomEnd.Json -and $walletBeforeRoomEnd.Json.data) { [int]$walletBeforeRoomEnd.Json.data.balance } else { 0 }
  Invoke-Json -Name "Join live room as A" -Method Post -Path "/api/sessions/$roomSessionId/join" -Token $tokenA -Body @{} | Out-Null
  Invoke-Json -Name "Get live room presence" -Method Get -Path "/api/sessions/$roomSessionId/presence" -Token $tokenA | Out-Null
  Invoke-Json -Name "Submit transcript as A" -Method Post -Path "/api/sessions/$roomSessionId/transcribe/text" -Token $tokenA -Body @{ text = "Today we covered the practical roadmap and next steps for the skill exchange."; confidenceScore = 0.96; detectedLanguage = "en" } | Out-Null
  Invoke-Json -Name "Submit transcript as B" -Method Post -Path "/api/sessions/$roomSessionId/transcribe/text" -Token $tokenB -Body @{ text = "I understood the plan and will practice the assignment before our next session."; confidenceScore = 0.94; detectedLanguage = "en" } | Out-Null
  Invoke-Json -Name "Get live room transcript" -Method Get -Path "/api/sessions/$roomSessionId/transcript" -Token $tokenA | Out-Null
  Invoke-Json -Name "Trigger generated notes" -Method Post -Path "/api/sessions/$roomSessionId/notes/generate" -Token $tokenA -Body @{} -Expected @(202) | Out-Null

  $notesReady = $false
  $notesStatus = 0
  for ($attempt = 1; $attempt -le 12; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $headers = @{ Authorization = "Bearer $tokenA" }
      $notesResp = Invoke-WebRequest -Uri "$BaseUrl/api/sessions/$roomSessionId/notes" -Method Get -Headers $headers -UseBasicParsing -TimeoutSec 10
      $notesStatus = [int]$notesResp.StatusCode
      if ($notesStatus -eq 200) {
        $notesReady = $true
        break
      }
    } catch {
      if ($_.Exception.Response) {
        $notesStatus = [int]$_.Exception.Response.StatusCode.value__
      }
    }
  }
  Add-Result -Name "Generated notes ready" -Passed $notesReady -Status $notesStatus -Info "roomSessionId=$roomSessionId"
  if ($notesReady) {
    Invoke-Json -Name "Export generated notes markdown" -Method Get -Path "/api/sessions/$roomSessionId/notes/export?format=md" -Token $tokenA -Expected @(200) | Out-Null
  }
  Invoke-Json -Name "End live room as A" -Method Post -Path "/api/sessions/$roomSessionId/end" -Token $tokenA -Body @{} | Out-Null
  Invoke-Json -Name "Leave live room as B" -Method Post -Path "/api/sessions/$roomSessionId/leave" -Token $tokenB -Body @{} | Out-Null
  $walletAfterRoomEnd = Invoke-Json -Name "Credit wallet after room end" -Method Get -Path "/api/credits/wallet" -Token $tokenA
  if ($walletAfterRoomEnd.Json -and $walletAfterRoomEnd.Json.data) {
    $balanceAfterRoomEnd = [int]$walletAfterRoomEnd.Json.data.balance
    Add-Result -Name "Room end teaching reward increases wallet by 15" -Passed ($balanceAfterRoomEnd -eq ($balanceBeforeRoomEnd + 15)) -Status 200 -Info "before=$balanceBeforeRoomEnd after=$balanceAfterRoomEnd"
  }
}

# Skill checks and skill-check credit rewards
$skillCheckRes = Invoke-Json -Name "Create skill check" -Method Post -Path "/api/skill-checks" -Token $tokenB -Body @{
  targetUserId = $userAId
  skillId = $firstSkillId
  message = "QA skill check request"
  scheduledAt = (Get-Date).AddDays(4).ToString("yyyy-MM-ddTHH:mm:ss")
}
$skillCheckId = $skillCheckRes.Json.data.id
Invoke-Json -Name "List skill checks B" -Method Get -Path "/api/skill-checks?page=0&size=20" -Token $tokenB | Out-Null
if ($skillCheckId) {
  $walletBeforeSkillCheckA = Invoke-Json -Name "Credit wallet A before skill check feedback" -Method Get -Path "/api/credits/wallet" -Token $tokenA
  $walletBeforeSkillCheckB = Invoke-Json -Name "Credit wallet B before skill check feedback" -Method Get -Path "/api/credits/wallet" -Token $tokenB
  $balanceBeforeSkillCheckA = if ($walletBeforeSkillCheckA.Json -and $walletBeforeSkillCheckA.Json.data) { [int]$walletBeforeSkillCheckA.Json.data.balance } else { 0 }
  $balanceBeforeSkillCheckB = if ($walletBeforeSkillCheckB.Json -and $walletBeforeSkillCheckB.Json.data) { [int]$walletBeforeSkillCheckB.Json.data.balance } else { 0 }
  Invoke-Json -Name "Skill check feedback from B" -Method Post -Path "/api/skill-checks/$skillCheckId/feedback" -Token $tokenB -Body @{ outcome = "SUITABLE"; comment = "Clear explanation and useful demo." } | Out-Null
  Invoke-Json -Name "Skill check feedback from A" -Method Post -Path "/api/skill-checks/$skillCheckId/feedback" -Token $tokenA -Body @{ outcome = "SUITABLE"; comment = "Learner was prepared and understood the task." } | Out-Null
  $walletAfterSkillCheckA = Invoke-Json -Name "Credit wallet A after skill check feedback" -Method Get -Path "/api/credits/wallet" -Token $tokenA
  $walletAfterSkillCheckB = Invoke-Json -Name "Credit wallet B after skill check feedback" -Method Get -Path "/api/credits/wallet" -Token $tokenB
  if ($walletAfterSkillCheckA.Json -and $walletAfterSkillCheckA.Json.data) {
    $balanceAfterSkillCheckA = [int]$walletAfterSkillCheckA.Json.data.balance
    Add-Result -Name "Skill check rewards target credits" -Passed ($balanceAfterSkillCheckA -eq ($balanceBeforeSkillCheckA + 2)) -Status 200 -Info "before=$balanceBeforeSkillCheckA after=$balanceAfterSkillCheckA"
  }
  if ($walletAfterSkillCheckB.Json -and $walletAfterSkillCheckB.Json.data) {
    $balanceAfterSkillCheckB = [int]$walletAfterSkillCheckB.Json.data.balance
    Add-Result -Name "Skill check rewards requester credits" -Passed ($balanceAfterSkillCheckB -eq ($balanceBeforeSkillCheckB + 2)) -Status 200 -Info "before=$balanceBeforeSkillCheckB after=$balanceAfterSkillCheckB"
  }
}

Invoke-Json -Name "My certificates" -Method Get -Path "/api/certificates/me" -Token $tokenA | Out-Null
Invoke-Json -Name "User certificates" -Method Get -Path "/api/users/$userAId/certificates" | Out-Null
Invoke-Json -Name "My badges" -Method Get -Path "/api/badges/me" -Token $tokenA | Out-Null
Invoke-Json -Name "User badges" -Method Get -Path "/api/users/$userAId/badges" | Out-Null
Invoke-Json -Name "Public GitHub badge SVG" -Method Get -Path "/api/public/badges/github/$userAId/$firstSkillId" -Expected @(200) | Out-Null

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
Invoke-Json -Name "Dashboard smart actions" -Method Get -Path "/api/dashboard/smart-actions" -Token $tokenA | Out-Null

# Messages + match
Invoke-Json -Name "Send direct message" -Method Post -Path "/api/messages/$userBId" -Token $tokenA -Body @{ content = "QA message $suffix"; type = "TEXT" } | Out-Null
Invoke-Json -Name "List conversations" -Method Get -Path "/api/messages/conversations" -Token $tokenA | Out-Null
Invoke-Json -Name "Get message history" -Method Get -Path "/api/messages/$userBId?page=0&size=20" -Token $tokenA | Out-Null
Invoke-Json -Name "Mark messages read" -Method Patch -Path "/api/messages/$userBId/read" -Token $tokenA -Body @{} | Out-Null

Invoke-Json -Name "Match users" -Method Get -Path "/api/match/users?limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match compatibility target B" -Method Get -Path "/api/match/$userBId" -Token $tokenA | Out-Null
Invoke-Json -Name "Match explanation target B" -Method Get -Path "/api/match/explain/$userBId" -Token $tokenA | Out-Null
Invoke-Json -Name "Match chains" -Method Get -Path "/api/match/chains?maxDepth=4&limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match cycles" -Method Get -Path "/api/match/cycles?maxLength=4&limit=10" -Token $tokenA | Out-Null
Invoke-Json -Name "Match top cycles" -Method Get -Path "/api/match/top-cycles?maxLength=4&limit=10" -Token $tokenA | Out-Null

# Upload authenticated + static serve
$badTempFile = Join-Path $env:TEMP "skillex-api-check-$suffix.txt"
"SkillEX upload test $suffix" | Set-Content -Path $badTempFile -Encoding UTF8
Invoke-Multipart -Name "Reject non-image upload" -Path "/api/upload" -FilePath $badTempFile -Token $tokenA -Expected @(400) | Out-Null

$tempFile = Join-Path $env:TEMP "skillex-api-check-$suffix.png"
[byte[]]$pngBytes = [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=")
[System.IO.File]::WriteAllBytes($tempFile, $pngBytes)
$uploadRes = Invoke-Multipart -Name "Upload image authenticated" -Path "/api/upload" -FilePath $tempFile -Token $tokenA -ContentType "image/png"

if ($uploadRes.Json -and $uploadRes.Json.data -and $uploadRes.Json.data.url) {
  $uploadedPath = $uploadRes.Json.data.url
  Invoke-Json -Name "Fetch uploaded static file" -Method Get -Path $uploadedPath -Expected @(200) | Out-Null
}

Invoke-Json -Name "Platform analytics" -Method Get -Path "/api/analytics/platform?limit=5" -Token $tokenA | Out-Null
Invoke-Json -Name "Create platform feedback" -Method Post -Path "/api/feedbacks" -Token $tokenA -Body @{ rating = 5; comment = "QA feedback $suffix" } | Out-Null
Invoke-Json -Name "List platform feedback" -Method Get -Path "/api/feedbacks" | Out-Null

# Moderation and admin workflow
$reportId = $null
if ($postId) {
  $reportRes = Invoke-Json -Name "Create moderation report" -Method Post -Path "/api/moderation/reports" -Token $tokenB -Body @{
    targetType = "POST"
    targetId = $postId
    targetUserId = $userAId
    category = "QA_TEST"
    reason = "QA report to verify moderation case creation."
    evidence = "Automated showcase readiness check."
  }
  $reportId = $reportRes.Json.data.id
}

Invoke-Json -Name "Admin overview" -Method Get -Path "/api/admin/overview" -Token $tokenAdmin | Out-Null
Invoke-Json -Name "Admin audit logs" -Method Get -Path "/api/admin/audit-logs?page=0&size=20" -Token $tokenAdmin | Out-Null
Invoke-Json -Name "Admin list moderation reports" -Method Get -Path "/api/moderation/reports?page=0&size=20" -Token $tokenAdmin | Out-Null
$casesRes = Invoke-Json -Name "Admin list moderation cases" -Method Get -Path "/api/moderation/cases?page=0&size=20" -Token $tokenAdmin
$caseId = $null
if ($casesRes.Json -and $casesRes.Json.data -and $casesRes.Json.data.content -and $casesRes.Json.data.content.Count -gt 0) {
  $caseId = $casesRes.Json.data.content[0].id
}
if ($caseId) {
  Invoke-Json -Name "Admin get moderation case" -Method Get -Path "/api/moderation/cases/$caseId" -Token $tokenAdmin | Out-Null
  Invoke-Json -Name "Admin apply moderation warning" -Method Post -Path "/api/moderation/actions" -Token $tokenAdmin -Body @{
    caseId = $caseId
    targetUserId = $userAId
    targetType = "POST"
    targetId = $postId
    actionType = "WARN"
    severity = "LOW"
    reason = "QA moderation warning"
    evidence = "Automated readiness flow"
    durationHours = 24
  } | Out-Null
}
Invoke-Json -Name "User A restrictions after moderation" -Method Get -Path "/api/users/me/restrictions" -Token $tokenA | Out-Null
Invoke-Json -Name "Admin list user moderation actions" -Method Get -Path "/api/moderation/users/$userAId/actions?page=0&size=20" -Token $tokenAdmin | Out-Null
Invoke-Json -Name "Admin list rules" -Method Get -Path "/api/admin/rules" -Token $tokenAdmin | Out-Null
$ruleRes = Invoke-Json -Name "Admin create rule" -Method Post -Path "/api/admin/rules" -Token $tokenAdmin -Body @{
  code = "QA_RULE_$suffix"
  title = "QA Rule $suffix"
  description = "Temporary rule generated by readiness check."
  category = "QA"
  severity = "LOW"
  defaultAction = "NO_ACTION"
  active = $true
}
$ruleId = $ruleRes.Json.data.id
if ($ruleId) {
  Invoke-Json -Name "Admin update rule" -Method Put -Path "/api/admin/rules/$ruleId" -Token $tokenAdmin -Body @{
    code = "QA_RULE_$suffix"
    title = "QA Rule Updated $suffix"
    description = "Updated by readiness check."
    category = "QA"
    severity = "LOW"
    defaultAction = "NO_ACTION"
    active = $false
  } | Out-Null
}
Invoke-Json -Name "Admin pending skills list" -Method Get -Path "/api/skills/pending?limit=20" -Token $tokenAdmin | Out-Null

$walletBeforeAdminAdjust = Invoke-Json -Name "Credit wallet before admin adjustment" -Method Get -Path "/api/credits/wallet" -Token $tokenA
$balanceBeforeAdminAdjust = if ($walletBeforeAdminAdjust.Json -and $walletBeforeAdminAdjust.Json.data) { [int]$walletBeforeAdminAdjust.Json.data.balance } else { 0 }
$adminAdjustRes = Invoke-Json -Name "Admin adjust credits" -Method Post -Path "/api/credits/admin/adjust" -Token $tokenAdmin -Body @{
  userId = $userAId
  amount = 3
  reason = "QA admin adjustment"
}
if ($adminAdjustRes.Json -and $adminAdjustRes.Json.data) {
  $balanceAfterAdminAdjust = [int]$adminAdjustRes.Json.data.balance
  Add-Result -Name "Admin adjustment increases wallet" -Passed ($balanceAfterAdminAdjust -eq ($balanceBeforeAdminAdjust + 3)) -Status 200 -Info "before=$balanceBeforeAdminAdjust after=$balanceAfterAdminAdjust"
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
