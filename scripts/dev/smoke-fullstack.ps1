param(
  [string]$ApiBase = "http://localhost:8080/api",
  [string]$FrontendBase = "http://localhost:3000",
  [string]$Password = "SkillEx@2026!"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[SkillEx smoke] $Message"
}

function Get-ErrorBody($ErrorRecord) {
  $response = $ErrorRecord.Exception.Response
  if ($null -eq $response) { return $ErrorRecord.Exception.Message }

  try {
    $stream = $response.GetResponseStream()
    if ($null -eq $stream) { return $ErrorRecord.Exception.Message }
    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return $ErrorRecord.Exception.Message
  }
}

function Unwrap-ApiResponse($Response) {
  if ($null -eq $Response) { return $null }

  $hasSuccess = $null -ne $Response.PSObject.Properties["success"]
  $hasData = $null -ne $Response.PSObject.Properties["data"]

  if ($hasSuccess -and -not [bool]$Response.success) {
    $message = if ($Response.message) { $Response.message } else { "API request returned success=false" }
    throw $message
  }

  if ($hasData) { return $Response.data }
  return $Response
}

function Invoke-SkillExJson(
  [ValidateSet("GET", "POST", "PATCH", "PUT", "DELETE")] [string]$Method,
  [string]$Url,
  [object]$Body = $null,
  [string]$Token = $null
) {
  $headers = @{ "Accept" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }

  $params = @{
    Method = $Method
    Uri = $Url
    Headers = $headers
  }

  if ($null -ne $Body) {
    $params["ContentType"] = "application/json"
    $params["Body"] = ($Body | ConvertTo-Json -Depth 12)
  }

  try {
    return Unwrap-ApiResponse (Invoke-RestMethod @params)
  } catch {
    $bodyText = Get-ErrorBody $_
    throw "$Method $Url failed. $bodyText"
  }
}

function Get-SkillLike([object[]]$Skills, [string]$Pattern, [object]$Fallback) {
  $found = @($Skills) | Where-Object { $_.name -match $Pattern } | Select-Object -First 1
  if ($found) { return $found }
  return $Fallback
}

$BackendBase = $ApiBase -replace "/api/?$", ""
$stamp = Get-Date -Format "yyyyMMddHHmmssfff"
$emailA = "smoke.alice.$stamp@skillex.local"
$emailB = "smoke.bob.$stamp@skillex.local"

Write-Step "checking frontend at $FrontendBase"
$frontend = Invoke-WebRequest -UseBasicParsing -Uri $FrontendBase
if ($frontend.StatusCode -lt 200 -or $frontend.StatusCode -ge 400) {
  throw "Frontend returned HTTP $($frontend.StatusCode)"
}

Write-Step "checking backend websocket info"
$wsInfo = Invoke-RestMethod -Uri "$BackendBase/ws/info"
if ($null -eq $wsInfo) { throw "Backend websocket info endpoint returned no data" }

Write-Step "loading skill catalog"
$skills = Invoke-SkillExJson GET "$ApiBase/skills"
if ($skills.Count -lt 2) { throw "Expected at least two skills in the catalog" }

$skillA = Get-SkillLike -Skills $skills -Pattern "python|web development|data science" -Fallback $skills[0]
$skillB = Get-SkillLike -Skills $skills -Pattern "figma|ui/ux|graphic design|web development|design$" -Fallback $skills[1]
if ($skillA.id -eq $skillB.id) { $skillB = $skills | Where-Object { $_.id -ne $skillA.id } | Select-Object -First 1 }
if ($null -eq $skillB) { throw "Could not select two distinct skills" }

Write-Step "registering two fresh users"
$registerA = Invoke-SkillExJson POST "$ApiBase/auth/register" @{
  name = "Smoke Alice $stamp"
  email = $emailA
  password = $Password
  university = "SkillEx Demo University"
  skillToTeach = $skillA.name
  skillToLearn = $skillB.name
  level = "EXPERT"
}
$registerB = Invoke-SkillExJson POST "$ApiBase/auth/register" @{
  name = "Smoke Bob $stamp"
  email = $emailB
  password = $Password
  university = "SkillEx Demo University"
  skillToTeach = $skillB.name
  skillToLearn = $skillA.name
  level = "MODERATE"
}

$tokenA = $registerA.token
$tokenB = $registerB.token
if (-not $tokenA -or -not $tokenB) { throw "Register did not return JWT tokens" }

$userA = $registerA.user
$userB = $registerB.user

Write-Step "patching profile and dashboard data"
$null = Invoke-SkillExJson PATCH "$ApiBase/users/me" @{
  bio = "Smoke-verified mentor profile for SkillEx demo recording."
  location = "Dhaka"
  teachIntentText = "I can teach $($skillA.name) with project examples."
  learnIntentText = "I want to learn $($skillB.name) through pair practice."
  connectionsPublic = $true
} $tokenA
$stats = Invoke-SkillExJson GET "$ApiBase/dashboard/stats" $null $tokenA

Write-Step "creating and liking a community post"
$post = Invoke-SkillExJson POST "$ApiBase/community/posts" @{
  type = "showcase"
  content = "Smoke test showcase: $($skillA.name) learning exchange is live."
  skillId = $skillA.id
} $tokenA
$likedPost = Invoke-SkillExJson POST "$ApiBase/community/posts/$($post.id)/like" @{} $tokenB

Write-Step "finding matches"
$matches = Invoke-SkillExJson GET "$ApiBase/match/users?limit=10" $null $tokenA
if ($matches.Count -lt 1) { throw "Expected at least one match for the smoke user" }

Write-Step "creating and accepting an exchange"
$exchange = Invoke-SkillExJson POST "$ApiBase/exchanges/request" @{
  receiverId = $userB.id
  offeredSkillId = $skillA.id
  wantedSkillId = $skillB.id
  message = "Smoke test exchange for demo readiness."
  mode = "DIRECT_SWAP"
} $tokenA
$acceptedExchange = Invoke-SkillExJson PATCH "$ApiBase/exchanges/$($exchange.id)/status" @{
  status = "ACCEPTED"
} $tokenB

Write-Step "scheduling and accepting a session"
$scheduledAt = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
$session = Invoke-SkillExJson POST "$ApiBase/sessions" @{
  exchangeId = $exchange.id
  teacherId = $userA.id
  learnerId = $userB.id
  skillId = $skillA.id
  scheduledAt = $scheduledAt
  durationMins = 45
  notes = "Smoke test session for recording."
  sessionType = "VIDEO"
} $tokenA
$acceptedSession = Invoke-SkillExJson PUT "$ApiBase/sessions/$($session.id)/accept" @{} $tokenB

Write-Step "checking live session room join"
$join = Invoke-SkillExJson POST "$ApiBase/sessions/$($session.id)/join" @{} $tokenA
if (-not $join.channelName) { throw "Session join did not return a channel name" }

Write-Host ""
Write-Host "PASS: SkillEx full-stack smoke test completed."
Write-Host "Frontend:        $FrontendBase"
Write-Host "Backend API:     $ApiBase"
Write-Host "Users:           $emailA / $emailB"
Write-Host "Skills:          $($skillA.name) <-> $($skillB.name)"
Write-Host "Matches:         $($matches.Count)"
Write-Host "Exchange:        $($acceptedExchange.id) [$($acceptedExchange.status)]"
Write-Host "Session:         $($acceptedSession.id) [$($acceptedSession.status)]"
Write-Host "Room channel:    $($join.channelName)"
Write-Host "Community likes: $($likedPost.likes)"
Write-Host "Score snapshot:  $($stats.skillexScore)"
