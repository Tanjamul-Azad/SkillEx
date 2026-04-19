
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSidebar } from '@/context/SidebarContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, LogOut, User as UserIcon, Settings,
  LayoutDashboard, Bell, ChevronDown, CheckCheck,
  ArrowLeftRight, Star, Calendar, MessageSquare, Menu, UserPlus, Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/services/notificationService';
import { TokenStore } from '@/services/http/ApiClient';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Notification } from '@/types';
import { emitRealtimeNotification, normalizeNotificationPayload } from '@/lib/realtime';
import Logo from '@/components/ui/Logo';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import GlobalSearch from '@/components/search/GlobalSearch';

const LogoWrapper = () => (
  <Link to="/" className="group lg:hidden">
    <Logo size="md" />
  </Link>
);

const getNotifIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('connection')) return UserPlus;
  if (t.includes('match')) return ArrowLeftRight;
  if (t.includes('review')) return Star;
  if (t.includes('session')) return Calendar;
  if (t.includes('message')) return MessageSquare;
  return Bell;
};

const getNotifColor = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('connection')) return 'bg-cyan-500/10 text-cyan-500';
  if (t.includes('match')) return 'bg-primary/10 text-primary';
  if (t.includes('review')) return 'bg-amber-500/10 text-amber-500';
  if (t.includes('session')) return 'bg-secondary/10 text-secondary';
  if (t.includes('message')) return 'bg-purple-500/10 text-purple-500';
  return 'bg-muted text-muted-foreground';
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/match': 'Find a Match',
  '/connections': 'Connections',
  '/community': 'Community',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/onboarding': 'Get Started',
};

const NOTIFICATION_PAGE_SIZE = 25;
const NOTIFICATION_PREVIEW_LIMIT = 8;

function dedupeNotifications(items: Notification[]): Notification[] {
  const seen = new Set<string>();
  const deduped: Notification[] = [];

  for (const item of items) {
    if (!item?.id || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

export default function Header({
  sidebarWidth: _sidebarWidth = 0,
  headerHeight = 64,
}: {
  sidebarWidth?: number;
  headerHeight?: number;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { setMobileOpen } = useSidebar();

  const [confirmLogout, setConfirmLogout] = useState(false);

  const matchedKey = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k));
  const pageTitle = PAGE_TITLES[pathname] ?? (matchedKey ? PAGE_TITLES[matchedKey] : 'SkillEx');

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const fetchAllNotifications = useCallback(async () => {
    if (!user) return;

    setNotifLoading(true);
    setNotifError(null);

    try {
      const all: Notification[] = [];
      let page = 0;
      let totalPages = 1;

      do {
        const res = await NotificationService.getAll(page, NOTIFICATION_PAGE_SIZE);
        all.push(...(res.content ?? []));
        totalPages = Math.max(res.totalPages ?? 1, 1);
        page += 1;
      } while (page < totalPages);

      setNotifs(dedupeNotifications(all));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load notifications.';
      setNotifError(message);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  // ── Initial notification fetch ────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setReadIds(new Set());
      setNotifError(null);
      setNotifLoading(false);
      return;
    }

    void fetchAllNotifications();
  }, [fetchAllNotifications, user]);

  // ── Real-time WebSocket notifications ────────────────────────────────────
  const token = TokenStore.get();
  const { connected, subscribe } = useWebSocket(user ? token : null);
  const unsubRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!connected || !user) return;
    // Subscribe to user-specific notification queue
    const unsub = subscribe(`/user/queue/notifications`, (msg) => {
      try {
        const incoming = normalizeNotificationPayload(JSON.parse(msg.body));
        if (!incoming) {
          return;
        }
        setNotifError(null);
        emitRealtimeNotification(incoming);
        setNotifs((prev) => {
          const merged = dedupeNotifications([incoming, ...prev]);
          return merged;
        });
      } catch {
        // ignore malformed frames
      }
    });
    unsubRef.current = unsub;
    return () => unsubRef.current?.();
  }, [connected, user, subscribe]);

  // Fallback polling if WebSocket is disconnected.
  useEffect(() => {
    if (!user || connected) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchAllNotifications();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [connected, fetchAllNotifications, user]);

  const unreadCount = notifs.filter((n) => !n.isRead && !readIds.has(n.id)).length;
  const visibleNotifications = showAllNotifications
    ? notifs
    : notifs.slice(0, NOTIFICATION_PREVIEW_LIMIT);
  const hasHiddenNotifications = notifs.length > NOTIFICATION_PREVIEW_LIMIT;

  const markAllRead = () => {
    NotificationService.markAllRead().catch(() => {});
    setReadIds(new Set());
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markOneRead = (notificationId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(notificationId);
      return next;
    });
    setNotifs((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    NotificationService.markRead(notificationId).catch(() => {});
  };

  const getNotificationRoute = useCallback((notification: Notification): string => {
    const type = String(notification.type ?? '').toLowerCase();
    const msg = String(notification.message ?? '').toLowerCase();

    if (type.includes('message')) {
      return notification.fromUser?.id ? `/messages/${notification.fromUser.id}` : '/messages';
    }

    if (type.includes('match')) {
      const sentTabHints = msg.includes('accepted your') || msg.includes('declined your') || msg.includes('your skill exchange request');
      const tab = sentTabHints ? 'sent' : 'received';
      return `/dashboard?panel=requests&requestsTab=${tab}#exchange-requests`;
    }

    if (type.includes('connection')) {
      return '/connections';
    }

    if (type.includes('session')) {
      return '/dashboard?panel=upcoming#upcoming-sessions';
    }

    if (type.includes('review')) {
      return notification.fromUser?.id ? `/profile/${notification.fromUser.id}` : '/dashboard';
    }

    return '/dashboard';
  }, []);

  const handleNotificationClick = (notification: Notification, isRead: boolean) => {
    if (!isRead) {
      markOneRead(notification.id);
    }
    navigate(getNotificationRoute(notification));
  };

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ height: headerHeight }}
      role="banner"
    >
      {/* Glassmorphism surface */}
      <div className="theme-transition absolute inset-0 border-b border-border/40 bg-background/40 shadow-sm backdrop-blur-2xl" />
      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Bottom separator */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
      <div className="relative flex h-full items-center gap-2.5 px-3 sm:px-5 lg:gap-4 lg:px-6">
        <LogoWrapper />

        {/* Mobile hamburger — Rule 2 (shortcut), Rule 8 (reduce load) */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl lg:hidden hover:bg-primary/10 border border-transparent hover:border-primary/20"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Page title — Rule 1 (state visibility) */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:gap-4">
          <h1 className={cn('truncate text-sm font-semibold font-headline sm:text-base', user ? 'hidden lg:block lg:max-w-[140px] xl:max-w-[180px]' : '')}>{pageTitle}</h1>
          {user && (
            <div className="relative min-w-0 flex-1">
              <GlobalSearch className="w-full lg:max-w-[700px]" />
              {/* Cmd+K hint badge — desktop only */}
              <div
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:flex items-center gap-0.5"
                aria-hidden="true"
              >
                <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-muted/60 px-1.5 text-[10px] font-mono text-muted-foreground/60">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-xl hover:bg-primary/10 hover:text-foreground border border-transparent hover:border-primary/20 transition-all duration-200"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ y: -14, opacity: 0, rotate: -20 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 14, opacity: 0, rotate: 20 }}
                transition={{ duration: 0.22 }}
              >
                {theme === 'dark'
                  ? <Sun className="h-[1.1rem] w-[1.1rem]" />
                  : <Moon className="h-[1.1rem] w-[1.1rem]" />}
              </motion.div>
            </AnimatePresence>
          </Button>

          {/* Notifications dropdown */}
          {user && (
            <DropdownMenu onOpenChange={(open) => {
              if (open) {
                void fetchAllNotifications();
              } else {
                setShowAllNotifications(false);
              }
            }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-xl hover:bg-primary/10 hover:text-foreground border border-transparent hover:border-primary/20 transition-all duration-200"
                  aria-label="Notifications"
                >
                  <Bell className="h-[1.1rem] w-[1.1rem]" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground"
                      >
                        {unreadCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-80 rounded-2xl border-border/50 bg-background/80 backdrop-blur-2xl shadow-xl" align="end" forceMount>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <p className="font-headline font-bold text-sm">Notifications</p>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs text-primary hover:bg-primary/5 hover:text-primary flex items-center gap-1 rounded-lg"
                      onClick={markAllRead}
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </Button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-72">
                  {notifLoading && notifs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Loading notifications...</p>
                  ) : notifError && notifs.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-destructive/90">{notifError}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 rounded-md px-2 text-[11px] text-primary hover:bg-primary/5"
                        onClick={() => void fetchAllNotifications()}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : visibleNotifications.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No notifications</p>
                  ) : visibleNotifications.map((n) => {
                    const isRead = n.isRead || readIds.has(n.id);
                    const Icon = getNotifIcon(n.type);
                    const colorClass = getNotifColor(n.type);
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0',
                          !isRead && 'bg-primary/3'
                        )}
                        onClick={() => handleNotificationClick(n, isRead)}
                      >
                        <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', colorClass)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs leading-relaxed', isRead ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        {!isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs rounded-lg text-primary hover:bg-primary/5"
                    onClick={() => {
                      if (hasHiddenNotifications && !showAllNotifications) {
                        setShowAllNotifications(true);
                        return;
                      }

                      if (showAllNotifications) {
                        setShowAllNotifications(false);
                        return;
                      }

                      void fetchAllNotifications();
                    }}
                  >
                    {showAllNotifications
                      ? 'Show fewer notifications'
                      : hasHiddenNotifications
                        ? `View all notifications (${notifs.length})`
                        : 'Refresh notifications'}
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  asChild
                  className="group flex h-auto items-center gap-2 rounded-2xl border border-border/40 bg-background/60 pr-3 pl-1 py-1 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <button aria-label="Open user menu">
                    <div className="relative">
                      <Avatar className="h-8 w-8 ring-2 ring-border group-hover:ring-primary/40 transition-all duration-200">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs font-bold">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-secondary" />
                    </div>
                    <span className="hidden text-sm font-medium md:block max-w-[100px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
                  </button>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-60 rounded-2xl border-border/50 bg-background/80 backdrop-blur-2xl shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-2 cursor-pointer">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)} className="gap-2 cursor-pointer">
                  <UserIcon className="h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmLogout(true)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

    </header>
  );
}

