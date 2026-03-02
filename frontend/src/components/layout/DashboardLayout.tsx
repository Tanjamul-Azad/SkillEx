
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ProtectedRouteWrapper from '@/components/auth/ProtectedRouteWrapper';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '../ui/button';
import { Plus, Pencil, Zap, Users } from 'lucide-react';
import { useState } from 'react';

const fabActions = [
  { icon: Zap, label: 'List a Skill', color: 'bg-primary text-primary-foreground' },
  { icon: Users, label: 'Find Match', color: 'bg-secondary text-secondary-foreground' },
  { icon: Pencil, label: 'Write Post', color: 'bg-accent text-accent-foreground' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [fabOpen, setFabOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <ProtectedRouteWrapper>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Subtle ambient layer behind all dashboard content */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl animate-blob" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/6 blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-3xl animate-blob" style={{ animationDelay: '8s' }} />
        </div>
        <Header />
        {/* Page transition — fade + micro-lift, no jarring y-shift */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.995 }}
            transition={{
              duration: 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 flex-grow"
            style={{ willChange: 'transform, opacity' }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <Footer />

        {/* FAB speed-dial */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
          <AnimatePresence>
            {fabOpen && fabActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.5, y: 24, x: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 24, x: 8 }}
                transition={{
                  delay: i * 0.04,
                  type: 'spring',
                  stiffness: 380,
                  damping: 26,
                  mass: 0.8,
                }}
                className="flex items-center gap-2"
              >
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 + 0.06 }}
                  className="rounded-lg bg-background/90 border border-border/60 px-3 py-1.5 text-xs font-semibold shadow-card backdrop-blur-sm"
                >
                  {action.label}
                </motion.span>
                <Button
                  size="icon"
                  className={`h-11 w-11 rounded-full shadow-card-hover ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Main FAB */}
          <motion.div
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.91 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            <Button
              aria-label={fabOpen ? 'Close menu' : 'Create new'}
              size="icon"
              onClick={() => setFabOpen((v) => !v)}
              className="h-14 w-14 rounded-full gradient-bg text-primary-foreground shadow-glow hover:shadow-glow-lg"
            >
              <motion.div
                animate={{ rotate: fabOpen ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 22, mass: 0.8 }}
              >
                <Plus className="h-7 w-7" />
              </motion.div>
            </Button>
          </motion.div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
