'use client';

/**
 * AppSidebar
 * Persistent navigation sidebar for authenticated dashboard views.
 *
 * Shneiderman's 8 Golden Rules applied:
 *  Rule 1 – Strive for consistency:
 *    Same icon + label pattern, same hover/active treatment for every nav item.
 *  Rule 2 – Enable frequent users to use shortcuts:
 *    Sidebar can collapse to icon-only; tooltips keep labels discoverable.
 *    Keyboard shortcut [ to toggle collapse.
 *  Rule 3 – Offer informative feedback:
 *    Active route is clearly highlighted with a pill background + primary colour.
 *  Rule 6 – Permit easy reversal:
 *    Collapse state is persisted in localStorage and trivially reversible.
 *  Rule 7 – Support internal locus of control:
 *    User decides whether the sidebar is expanded or collapsed.
 *  Rule 8 – Reduce short-term memory load:
 *    Icons + labels always shown in expanded mode; icon-only mode still
 *    identifies each section via tooltip.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  LayoutDashboard, Zap, Users, User, Settings, LogOut,
  ChevronLeft, ChevronRight, X, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardNav } from '@/config/navigation.config';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { LucideIcon } from 'lucide-react';

/* ── Icon registry (maps string names from navigation.config → components) ── */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Zap,
  Users,
  User,
  Settings,
  MessageSquare,
};

/* ── Constants ─────────────────────────────────────────────────────────────── */
const SIDEBAR_W_EXPANDED = 240; // px
const SIDEBAR_W_COLLAPSED = 68; // px

/* ── NavItem ───────────────────────────────────────────────────────────────── */
function NavItem({
  href,
  label,
  iconName,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  iconName?: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === href;
  const Icon = iconName ? (ICON_MAP[iconName] ?? LayoutDashboard) : LayoutDashboard;

  const inner = (
    <Link
      to={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
        'transition-all duration-150 ease-out select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ring-offset-background',
        isActive
          ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        collapsed && 'justify-center px-0 py-2.5'
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors duration-150',
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        )}
        aria-hidden="true"
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

/* ── SidebarContent (shared between desktop and mobile drawer) ─────────────── */
function SidebarContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const { user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border/40 px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <Link
          to="/"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
          aria-label="SkillEx — go to home"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] group-hover:scale-105">
            <Zap className="h-4 w-4 text-white transition-transform group-hover:-rotate-12 duration-300" aria-hidden="true" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden whitespace-nowrap bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-lg font-extrabold font-headline text-transparent"
              >
                SkillEx
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-6">
        {dashboardNav.map((group) => (
          <div key={group.label ?? 'ungrouped'}>
            {/* Group label */}
            <AnimatePresence initial={false}>
              {!collapsed && group.label && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Items */}
            <ul role="list" className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavItem
                    href={item.label === 'Profile' ? `/profile/${user?.id ?? ''}` : item.href}
                    label={item.label}
                    iconName={item.icon}
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* User profile footer */}
      <div className={cn('shrink-0 border-t border-border/40 p-3', collapsed && 'px-0')}>
        {user ? (
          <div className={cn('flex items-center gap-3 rounded-xl p-2', collapsed && 'justify-center')}>
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8 ring-2 ring-border">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-secondary"
                aria-label="Online"
                title="Online"
              />
            </div>

            {/* Name + email */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="truncate text-sm font-semibold leading-none">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logout */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmLogout(true)}
                        aria-label="Log out"
                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Log out</TooltipContent>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapsed-only logout */}
            {collapsed && (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmLogout(true)}
                    aria-label="Log out"
                    className="h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Log out</TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Log out?"
        description="You'll be signed out of your account on this device."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        variant="destructive"
        onConfirm={logout}
      />
    </div>
  );
}

/* ── Desktop Sidebar ───────────────────────────────────────────────────────── */
export function AppSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();

  // Keyboard shortcut [ to collapse/expand — rule 2
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          toggleCollapsed();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCollapsed]);

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col',
          'border-r border-border/50 bg-background/95 backdrop-blur-xl',
          'lg:flex',
          // Subtle inner shadow to separate from content
          'shadow-[1px_0_0_0_hsl(var(--border)/0.4)]'
        )}
        style={{ width: collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED }}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse toggle tab */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className={cn(
                'absolute -right-3 top-[72px] z-50 flex h-6 w-6 items-center justify-center',
                'rounded-full border border-border/60 bg-background shadow-md',
                'text-muted-foreground transition-all duration-200',
                'hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              )}
            >
              {collapsed
                ? <ChevronRight className="h-3 w-3" aria-hidden="true" />
                : <ChevronLeft className="h-3 w-3" aria-hidden="true" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'} <kbd className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">[</kbd>
          </TooltipContent>
        </Tooltip>
      </motion.aside>
    </TooltipProvider>
  );
}

/* ── Mobile Sidebar Drawer ─────────────────────────────────────────────────── */
export function MobileSidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <TooltipProvider>
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
              aria-label="Primary navigation"
              className={cn(
                'fixed inset-y-0 left-0 z-50 flex flex-col',
                'border-r border-border/50 bg-background shadow-2xl',
                'lg:hidden'
              )}
              style={{ width: SIDEBAR_W_EXPANDED }}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
              <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
