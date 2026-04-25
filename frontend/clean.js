const fs = require('fs');
let code = fs.readFileSync('src/features/messages/pages/MessagesPage.tsx', 'utf8');

// Global Layout Wrappers (bg-black/20)
code = code.replace(/bg-black\/20/g, 'bg-white/80 dark:bg-black/40');

// Headers, footers, bubbles (bg-black/40) -> Clean white or slightly green tinted
// Peer bubbles specifically
code = code.replace(/'bg-black\/40 text-foreground/g, \"'bg-primary/5 dark:bg-black/50 text-foreground\");
code = code.replace(/bg-black\/40/g, 'bg-white/90 dark:bg-black/50');

// Empty states, small containers (bg-black/10)
code = code.replace(/bg-black\/10/g, 'bg-primary/[0.02] dark:bg-black/20');

// Borders should be slightly green-tinted in light mode to match 'shaded with green' concept
code = code.replace(/border-white\/5/g, 'border-primary/5 dark:border-white/5');
code = code.replace(/border-white\/10/g, 'border-primary/10 dark:border-white/10');

// Input background
// bg-white/5 -> bg-primary/5 dark:bg-white/5
code = code.replace(/bg-white\/5/g, 'bg-primary/5 dark:bg-white/5');

// Update shadow to use primary tint
code = code.replace(/hsla\(0,0%,100%,0\.05\)/g, 'var(--primary)/0.05');

fs.writeFileSync('src/features/messages/pages/MessagesPage.tsx', code);
console.log('Successfully updated 6 layers of muddy gray to a minimalistic bright green-shaded surface.');
