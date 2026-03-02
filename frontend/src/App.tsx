import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastStateProvider } from '@/context/ToastContext';
import { ToastProvider as RadixToastProvider } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';

// Code-split page imports
const LandingPage     = React.lazy(() => import('./features/marketing/pages/LandingPage'));
const AuthPage        = React.lazy(() => import('./features/auth/pages/LoginPage'));
const DashboardPage   = React.lazy(() => import('./features/dashboard/pages/DashboardPage'));
const MatchPage       = React.lazy(() => import('./features/match/pages/MatchPage'));
const CommunityPage   = React.lazy(() => import('./features/community/pages/CommunityPage'));
const ProfilePage     = React.lazy(() => import('./features/profile/pages/ProfilePage'));
const SettingsPage    = React.lazy(() => import('./features/settings/pages/SettingsPage'));
const OnboardingPage  = React.lazy(() => import('./features/onboarding/pages/OnboardingPage'));
const NotFoundPage    = React.lazy(() => import('./features/error/NotFoundPage'));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <ToastStateProvider>
            <RadixToastProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"                    element={<LandingPage />} />
                  <Route path="/login"               element={<AuthPage />} />
                  <Route path="/dashboard"           element={<DashboardPage />} />
                  <Route path="/match"               element={<MatchPage />} />
                  <Route path="/community"           element={<CommunityPage />} />
                  <Route path="/profile/:userId"     element={<ProfilePage />} />
                  <Route path="/settings"            element={<SettingsPage />} />
                  <Route path="/onboarding"          element={<OnboardingPage />} />
                  <Route path="*"                    element={<NotFoundPage />} />
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
