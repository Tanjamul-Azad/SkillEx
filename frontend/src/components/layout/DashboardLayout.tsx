'use client';

/**
 * DashboardLayout
 * Shell for all authenticated pages.
 *
 * Structure:
 *   +-------------------------------------------------+
 *   �          �  HEADER (fixed, h-16, full top-right) �
 *   � SIDEBAR  +--------------------------------------�
 *   � (fixed,  �  <main>  (scrollable)                 �
 *   �  w-60|68)�                                       �
 *   +-------------------------------------------------+
 *
 * Shneiderman Rules applied:
 *   Rule 1 � Consistency: same chrome on every authenticated page.
 *   Rule 3 � Informative feedback: animated page transitions; active nav item.
 *   Rule 7 � Locus of control: collapsible sidebar, theme toggle, skip-link.
 *   Rule 8 � Reduce memory load: persistent sidebar always shows where you are.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ProtectedRouteWrapper from '@/components/auth/ProtectedRouteWrapper';
import { AppSidebar, MobileSidebar } from '@/components/layout/AppSidebar';
import Header from '@/components/layout/Header';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 68;
const HEADER_H = 64;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isDesktop;
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const { pathname } = useLocation();
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <>
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className={cn(
          'fixed left-1/2 -translate-x-1/2 -top-16 z-[9999]',
          'rounded-b-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg',
          'transition-[top] duration-150 focus:top-0 focus:outline-none'
        )}
      >
        Skip to main content
      </a>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl animate-blob" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/6 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-3xl animate-blob" style={{ animationDelay: '8s' }} />
      </div>

      <AppSidebar />
      <MobileSidebar />

      <motion.div
        className="flex min-h-screen flex-col"
        initial={false}
        animate={{ marginLeft: sidebarW }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <Header sidebarWidth={sidebarW} headerHeight={HEADER_H} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            id="main-content"
            key={pathname}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex-1 min-h-0"
            style={{ willChange: 'transform, opacity' }}
            tabIndex={-1}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteWrapper>
      <SidebarProvider>
        <div className="fixed inset-0 overflow-hidden bg-background">
          {/* Skip link for mobile too */}
          <a
            href="#main-content"
            className={cn(
              'sr-only focus:not-sr-only fixed left-1/2 -translate-x-1/2 top-0 z-[9999]',
              'rounded-b-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg',
              'focus:outline-none'
            )}
          >
            Skip to main content
          </a>

          {/* Ambient background */}
          <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl animate-blob" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/6 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
            <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-3xl animate-blob" style={{ animationDelay: '8s' }} />
          </div>

          {/* Desktop sidebar */}
          <AppSidebar />

          {/* Mobile drawer */}
          <MobileSidebar />

          {/* Main area � shifts on sidebar expand/collapse */}
          <MainArea>{children}</MainArea>
        </div>
      </SidebarProvider>
    </ProtectedRouteWrapper>
  );
}

function MainArea({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const { pathname } = useLocation();
  const isDesktop = useIsDesktop();
  const sidebarW = isDesktop ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) : 0;

  return (
    <motion.div
      className="flex h-full flex-col overflow-hidden"
      initial={false}
      animate={{ marginLeft: sidebarW }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      // On mobile: no margin offset (sidebar is a drawer)
      style={{ ['--sidebar-w' as never]: `${sidebarW}px` }}
    >
      {/* Fixed header */}
      <Header sidebarWidth={sidebarW} headerHeight={HEADER_H} />

      {/* Scrollable page content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main-content"
          key={pathname}
          initial={{ opacity: 0, y: 8, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.995 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex-1 overflow-y-auto"
          style={{ willChange: 'transform, opacity' }}
          tabIndex={-1}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </motion.div>
  );
}
