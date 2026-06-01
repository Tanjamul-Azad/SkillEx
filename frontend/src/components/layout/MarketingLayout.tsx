'use client';

import { useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useTheme } from '@/hooks/useTheme';
import AppBackButton from '@/components/navigation/AppBackButton';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar showThemeToggle={false} />
      <main>
        <div className="mx-auto flex w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <AppBackButton fallbackTo="/" />
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}
