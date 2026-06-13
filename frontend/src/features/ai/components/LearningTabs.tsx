import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Target, Route } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Segmented switcher shared by the Skill Gap Analyzer and Learning Paths pages,
 * so the two halves of one flow (generate a plan → track the saved plan) read as
 * a single "Learning" section with two tabs instead of two separate nav entries.
 */
const TABS = [
  { label: 'Analyze', hint: 'Skill gap', href: '/ai/skill-gap', icon: Target },
  { label: 'My Paths', hint: 'Saved plans', href: '/ai/learning-paths', icon: Route },
] as const;

export const LearningTabs: FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-card p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => !active && navigate(tab.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            <span className={cn('hidden text-[10px] font-medium sm:inline', active ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
              · {tab.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
};
