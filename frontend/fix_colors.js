const fs = require('fs');
let c = fs.readFileSync('src/features/messages/pages/MessagesPage.tsx', 'utf8');
c = c.replace(/className=\"h-10 w-10 rounded-full border border-border\/60 dark:border-white\/5 border-border dark:border-white\/5 bg-primary\/\[0\.04\] dark:bg-white\/5 hover:bg-primary text-primary-foreground hover:border-primary\/50 text-foreground hover:text-primary transition-all shadow-\[inset_0_1px_0_0_var\(--primary\)\/0\.03\]\"/g, 
  'className=\"h-10 w-10 rounded-full border border-primary/20 dark:border-white/10 bg-primary/5 dark:bg-white/5 hover:bg-primary text-primary-foreground hover:text-primary-foreground transition-all shadow-sm\"');
// And clean up any weird double borders
c = c.replace(/border-border dark:border-white\/5/g, 'border-primary/10 dark:border-white/5');
c = c.replace(/border-border\/60/g, 'border-primary/10');
c = c.replace(/bg-surface-1 dark:bg-black\/50/g, 'bg-white dark:bg-black/50');
c = c.replace(/bg-surface-2 dark:bg-black\/50/g, 'bg-white dark:bg-black/50');
fs.writeFileSync('src/features/messages/pages/MessagesPage.tsx', c);