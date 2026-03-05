import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastStateProvider } from '@/context/ToastContext';
import { ToastProvider as RadixToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';
import Logo from '@/components/ui/Logo';

// Code-split page imports
const LandingPage = React.lazy(() => import('./features/marketing/pages/LandingPage'));
const AuthPage = React.lazy(() => import('./features/auth/pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./features/dashboard/pages/DashboardPage'));
const MatchPage = React.lazy(() => import('./features/match/pages/MatchPage'));
const CommunityPage = React.lazy(() => import('./features/community/pages/CommunityPage'));
const ProfilePage = React.lazy(() => import('./features/profile/pages/ProfilePage'));
const SettingsPage = React.lazy(() => import('./features/settings/pages/SettingsPage'));
const OnboardingPage = React.lazy(() => import('./features/onboarding/pages/OnboardingPage'));
const NotFoundPage = React.lazy(() => import('./features/error/NotFoundPage'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

/* ── Splash screen shown once per session ──────────────────────────────── */
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200); // visible for ~1.8 s then exit
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-3 select-none"
      >
        {/* Wordmark */}
        <Logo size="2xl" showIcon={false} />
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-sm font-medium tracking-widest uppercase text-white/40"
        >
          Trade Skills. Not Money.
        </motion.p>
        {/* Thin progress bar */}
        <motion.div
          className="mt-4 h-[2px] w-32 rounded-full bg-white/10 overflow-hidden"
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#00E5C3' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <ToastStateProvider>
            <RadixToastProvider>
              <AnimatePresence mode="wait">
                {!splashDone && (
                  <SplashScreen key="splash" onDone={() => setSplashDone(true)} />
                )}
              </AnimatePresence>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/match" element={<MatchPage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/profile/:userId" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
              <Toaster />
            </RadixToastProvider>
          </ToastStateProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
