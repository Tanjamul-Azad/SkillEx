$f = "f:\Xamp\htdocs\SkiilEX\frontend\src\features\community\pages\CommunityPage.tsx"
$lines = [System.IO.File]::ReadAllLines($f)
$newLines = New-Object System.Collections.Generic.List[string]
for ($i = 0; $i -lt $lines.Length; $i++) {
    # Skip lines 757-784 (0-indexed: 756-783) = the duplicate old suggestion section
    if ($i -ge 756 -and $i -le 783) { continue }
    $newLines.Add($lines[$i])
}
[System.IO.File]::WriteAllLines($f, $newLines)
Write-Host "Done. Removed lines 757-784. New line count: $($newLines.Count)"
