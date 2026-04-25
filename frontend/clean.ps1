$content = Get-Content "src/features/messages/pages/MessagesPage.tsx" -Raw
$content = $content -replace 'bg-black/20', 'bg-white/80 dark:bg-black/40'
$content = $content -replace "'bg-black/40 text-foreground", "'bg-primary/5 dark:bg-black/50 text-foreground"
$content = $content -replace 'bg-black/40', 'bg-white/90 dark:bg-black/50'
$content = $content -replace 'bg-black/10', 'bg-primary/[0.02] dark:bg-black/20'
$content = $content -replace 'border-white/5', 'border-primary/10 dark:border-white/5'
$content = $content -replace 'border-white/10', 'border-primary/20 dark:border-white/10'
$content = $content -replace 'bg-white/5', 'bg-primary/5 dark:bg-white/5'
$content = $content -replace 'hsla\(0,0%,100%,0\.05\)', 'var(--primary)/0.05'
Set-Content "src/features/messages/pages/MessagesPage.tsx" $content -Encoding utf8
