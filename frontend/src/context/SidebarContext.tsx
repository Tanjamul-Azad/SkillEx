'use client';

/**
 * SidebarContext
 * Central state for dashboard sidebar collapse / mobile-open.
 * Shneiderman Rule 7 — Support internal locus of control:
 *   users can explicitly collapse / expand the sidebar at any time.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SidebarCtx {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => {},
  setMobileOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Close mobile panel on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggleCollapsed, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
