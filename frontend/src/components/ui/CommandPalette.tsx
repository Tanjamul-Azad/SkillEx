/**
 * CommandPalette
 *
 * Global Cmd+K / Ctrl+K command palette.
 * Provides keyboard-driven navigation and action dispatch.
 * This is a signature premium-app pattern (Raycast, Linear, Vercel).
 *
 * Usage:
 *   - Open:  Cmd+K (Mac) / Ctrl+K (Win/Linux)
 *   - Nav:   ↑↓ arrow keys
 *   - Select: Enter
 *   - Close:  Esc or click backdrop
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Zap, UserPlus, MessageSquare, Settings,
  User as UserIcon, Search, ChevronRight, LogOut, BookOpen,
  Globe, Command, Hash, Users, Star, ArrowLeftRight,
} from 'lucide-react';

/* ── Types ───────────────────────────────────────────────────────── */

type CommandCategory = 'navigate' | 'actions' | 'profile';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.FC<{ className?: string }>;
  action: () => void;
  kbd?: string[];
  category: CommandCategory;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/* ── Category metadata ───────────────────────────────────────────── */
const CATEGORY_LABEL: Record<CommandCategory, string> = {
  navigate: 'Navigate',
  actions: 'Actions',
  profile: 'Profile',
};

const CATEGORY_ORDER: CommandCategory[] = ['navigate', 'profile', 'actions'];

/* ── CommandPalette component ───────────────────────────────────── */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onClose();
    },
    [navigate, onClose]
  );

  /* All available commands */
  const allItems: CommandItem[] = useMemo(
    () => [
      /* ── Navigate ─────────────────────────────────────────────── */
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        description: 'Your skill exchange overview',
        icon: LayoutDashboard,
        action: () => go('/dashboard'),
        category: 'navigate',
      },
      {
        id: 'nav-match',
        label: 'Find a Match',
        description: 'Discover people to exchange skills with',
        icon: Zap,
        action: () => go('/match'),
        category: 'navigate',
      },
      {
        id: 'nav-connections',
        label: 'Connections',
        description: 'Manage your network',
        icon: UserPlus,
        action: () => go('/connections'),
        category: 'navigate',
      },
      {
        id: 'nav-community',
        label: 'Community',
        description: 'Feed, events and skill circles',
        icon: Globe,
        action: () => go('/community'),
        category: 'navigate',
      },
      {
        id: 'nav-messages',
        label: 'Messages',
        description: 'Chat with your matches',
        icon: MessageSquare,
        action: () => go('/messages'),
        category: 'navigate',
      },
      /* ── Profile ───────────────────────────────────────────────── */
      {
        id: 'prof-view',
        label: 'View My Profile',
        description: 'See how others see you',
        icon: UserIcon,
        action: () => go(user?.id ? `/profile/${user.id}` : '/settings'),
        category: 'profile',
      },
      {
        id: 'prof-settings',
        label: 'Settings',
        description: 'Account, skills, and preferences',
        icon: Settings,
        action: () => go('/settings'),
        kbd: ['⌘', ','],
        category: 'profile',
      },
      {
        id: 'prof-skills',
        label: 'Edit Skills',
        description: 'Update what you offer and want to learn',
        icon: BookOpen,
        action: () => go('/settings?tab=skills'),
        category: 'profile',
      },
      {
        id: 'prof-score',
        label: 'SkillEx Score',
        description: `Your current score: ${user?.skillexScore ?? 0}`,
        icon: Star,
        action: () => go(user?.id ? `/profile/${user.id}` : '/dashboard'),
        category: 'profile',
      },
      /* ── Actions ───────────────────────────────────────────────── */
      {
        id: 'act-exchange',
        label: 'Request an Exchange',
        description: 'Start a new skill exchange with someone',
        icon: ArrowLeftRight,
        action: () => go('/match'),
        category: 'actions',
      },
      {
        id: 'act-invite',
        label: 'Connect with Someone',
        description: 'Send a connection request',
        icon: Users,
        action: () => go('/connections'),
        category: 'actions',
      },
      {
        id: 'act-logout',
        label: 'Log Out',
        description: 'Sign out of your account',
        icon: LogOut,
        action: () => {
          logout();
          onClose();
        },
        category: 'actions',
      },
    ],
    [go, logout, onClose, user?.id, user?.skillexScore]
  );

  /* Filtered results */
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q)
    );
  }, [query, allItems]);

  /* Reset selection on query change */
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Scroll selected item into view */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  /* Keyboard navigation */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        filtered[selectedIdx].action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIdx, onClose]);

  /* Group by category in defined order */
  const grouped = useMemo(() => {
    const map = new Map<CommandCategory, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      const list = map.get(item.category);
      if (list) list.push(item);
    }
    // Return only categories that have items, in preferred order
    return CATEGORY_ORDER.filter((cat) => map.has(cat)).map(
      (cat) => [cat, map.get(cat) ?? []] as const
    );
  }, [filtered]);

  /* Build flat index for keyboard tracking */
  let _flatIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="palette-panel"
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed left-1/2 top-[16vh] z-[9001] w-full max-w-[580px] -translate-x-1/2',
              'rounded-2xl border border-border/60 overflow-hidden',
              'bg-popover/95 backdrop-blur-2xl shadow-2xl shadow-black/40',
              'dark:border-white/10 dark:bg-[hsl(228_24%_10%/0.97)]'
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            {/* Top gradient accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3.5">
              <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands, pages, or actions…"
                className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 outline-none"
                autoComplete="off"
                spellCheck={false}
                aria-label="Command search"
              />
              <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground/50">
                <kbd className="inline-flex h-5 items-center rounded border border-border/60 bg-muted/50 px-1.5 font-mono text-[10px]">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results list */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2 px-2">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Hash className="mb-3 h-7 w-7 text-muted-foreground/30" aria-hidden="true" />
                  <p className="text-sm font-medium text-muted-foreground">No results for</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">"{query}"</p>
                </div>
              )}

              {grouped.map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {CATEGORY_LABEL[category]}
                  </p>
                  {items.map((item) => {
                    const currentIdx = _flatIndex++;
                    const isSelected = currentIdx === selectedIdx;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-selected={isSelected}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
                          'transition-colors duration-100',
                          isSelected
                            ? 'bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20'
                            : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
                        )}
                        onMouseEnter={() => setSelectedIdx(currentIdx)}
                        onClick={item.action}
                      >
                        {/* Icon box */}
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                            isSelected
                              ? 'border-primary/30 bg-primary/15'
                              : 'border-border/50 bg-muted/40 group-hover:border-primary/20 group-hover:bg-primary/8'
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-[15px] w-[15px]',
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            )}
                          />
                        </div>

                        {/* Label + description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight truncate">{item.label}</p>
                          {item.description && (
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground/70 truncate">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Keyboard shortcut hints */}
                        <div className="ml-auto flex shrink-0 items-center gap-1">
                          {item.kbd?.map((k) => (
                            <kbd
                              key={k}
                              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border/50 bg-muted/50 px-1 font-mono text-[10px] text-muted-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 transition-opacity',
                              isSelected ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer — keyboard hints */}
            <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded bg-muted/60 px-1 font-mono text-[10px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded bg-muted/60 px-1 font-mono text-[10px]">↵</kbd>
                  Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded bg-muted/60 px-1 font-mono text-[10px]">Esc</kbd>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                <Command className="h-3 w-3" />
                <span>SkillEx Command</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Global Cmd+K hook ──────────────────────────────────────────── */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen, close: () => setOpen(false) };
}
