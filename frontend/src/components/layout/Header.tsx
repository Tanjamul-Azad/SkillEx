
'use client';

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, LogOut, User as UserIcon, Settings,
  LayoutDashboard, Zap, Bell, ChevronDown, CheckCheck,
  ArrowLeftRight, Star, Calendar, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notifications as allNotifications } from '@data/mock/mockData';

const Logo = () => (
  <Link to="/dashboard" className="group flex items-center gap-2.5">
    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.6)] group-hover:scale-105">
      <Zap className="h-4.5 w-4.5 text-white transition-transform group-hover:-rotate-12 duration-300" />
    </div>
    <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-extrabold font-headline text-transparent">
      SkillEx
    </span>
  </Link>
);

const getNotifIcon = (type: string): React.ElementType => {
  if (type.includes('match')) return ArrowLeftRight;
  if (type.includes('review')) return Star;
  if (type.includes('session')) return Calendar;
  if (type.includes('message')) return MessageSquare;
  return Bell;
};

const getNotifColor = (type: string): string => {
  if (type.includes('match')) return 'bg-primary/10 text-primary';
  if (type.includes('review')) return 'bg-amber-500/10 text-amber-500';
  if (type.includes('session')) return 'bg-secondary/10 text-secondary';
  if (type.includes('message')) return 'bg-purple-500/10 text-purple-500';
  return 'bg-muted text-muted-foreground';
};

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const notifs = (allNotifications as { id: string; type: string; message: string; createdAt: string; isRead: boolean }[]).slice(0, 8);
  const unreadCount = notifs.filter((n) => !n.isRead && !readIds.has(n.id)).length;

  const markAllRead = () => setReadIds(new Set(notifs.map((n) => n.id)));

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/match', label: 'Find a Match' },
    { href: '/community', label: 'Community' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Glassmorphism surface */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-2xl" />
      {/* Top shimmer line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Bottom separator */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
      <div className="container mx-auto relative flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="mr-8 hidden md:flex">
          <Logo />
        </div>

        {/* Desktop nav with animated active pill */}
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'relative px-4 py-2 text-sm font-semibold transition-colors duration-200 tracking-wide',
                pathname === link.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {pathname === link.href && (
                <motion.span
                  layoutId="header-nav-line"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
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
            <DropdownMenu>
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
                    <button
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      onClick={markAllRead}
                    >
                      <CheckCheck className="h-3 w-3" /> Mark all read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />
                <ScrollArea className="max-h-72">
                  {notifs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No notifications</p>
                  ) : notifs.map((n) => {
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
                        onClick={() => setReadIds((prev) => new Set([...prev, n.id]))}
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
                  <Button variant="ghost" size="sm" className="w-full text-xs rounded-lg text-primary hover:bg-primary/5">
                    View all notifications
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Open user menu"
                  className="group flex items-center gap-2 rounded-2xl border border-border/40 bg-background/60 pr-3 pl-1 py-1 backdrop-blur-sm hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
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
                <DropdownMenuItem onClick={logout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
