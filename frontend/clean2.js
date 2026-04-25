const fs = require('fs');
let c = fs.readFileSync('src/features/messages/pages/MessagesPage.tsx', 'utf8');

c = c.replace(/'bg-black\/40 text-foreground/g, "'bg-primary/[0.04] dark:bg-surface-3 text-foreground");
c = c.replace(/\bbg-black\/40\b/g, 'bg-surface-1 dark:bg-black/50');
c = c.replace(/\bbg-black\/20\b/g, 'bg-white dark:bg-black/40');
c = c.replace(/\bbg-black\/10\b/g, 'bg-primary/[0.02] dark:bg-black/20');
c = c.replace(/\bbg-black\/90\b/g, 'bg-popover dark:bg-black/90');
c = c.replace(/\bborder-white\/5\b/g, 'border-primary/10 dark:border-white/5');
c = c.replace(/\bborder-white\/10\b/g, 'border-primary/15 dark:border-white/10');
c = c.replace(/\bbg-white\/5\b/g, 'bg-primary/[0.04] dark:bg-white/5');
c = c.replace(/hsla\(0,0%,100%,0\.05\)/g, 'var(--primary)/0.03');
c = c.replace(/rgba\(0,0,0,0\.[41]\)/g, 'var(--primary)/0.05');
c = c.replace(/\bbg-primary\/20\b/g, 'bg-primary');

fs.writeFileSync('src/features/messages/pages/MessagesPage.tsx', c);
console.log('Messages updated cleanly!');