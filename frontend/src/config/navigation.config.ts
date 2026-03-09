/**
 * navigation.config.ts
 * Defines all navigation links and route structure for the app.
 * Import with: import { dashboardNav, marketingNav } from '@config/navigation.config'
 */

export interface NavItem {
  label: string;
  href: string;
  icon?: string;          // Lucide icon name
  badge?: string;         // Optional badge text (e.g. "New", "Beta")
  requiresAuth?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/** Top-level marketing/public navigation */
export const marketingNav: NavItem[] = [
  { label: 'Home',      href: '/' },
  { label: 'Features',  href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Community', href: '/#community' },
];

/** Authenticated dashboard sidebar navigation */
export const dashboardNav: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',  href: '/dashboard',  icon: 'LayoutDashboard', requiresAuth: true },
      { label: 'Match',      href: '/match',       icon: 'Zap',             requiresAuth: true },
      { label: 'Community',  href: '/community',   icon: 'Users',           requiresAuth: true },
      { label: 'Messages',   href: '/messages',    icon: 'MessageSquare',   requiresAuth: true },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile',   href: '/profile',   icon: 'User',     requiresAuth: true },
      { label: 'Settings',  href: '/settings',  icon: 'Settings', requiresAuth: true },
    ],
  },
];

/** Public routes that don't require authentication */
export const publicRoutes: string[] = ['/', '/login', '/not-found'];

/** Routes that require authentication (redirect to /login if not authenticated) */
export const protectedRoutes: string[] = [
  '/dashboard',
  '/match',
  '/community',
  '/profile',
  '/settings',
];
