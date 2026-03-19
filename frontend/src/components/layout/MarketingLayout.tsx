'use client';

import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useTheme } from '@/hooks/useTheme';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar showThemeToggle={false} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
