
'use client';

import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Zap, Sun, Moon, Menu, X as XIcon, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'Explore Skills', href: '#featured-skills' },
  { name: 'Community', href: '/community' },
];

const Logo = () => (
  <Link to="/" className="group flex items-center gap-2">
    <div className="relative">
      <Zap className="h-8 w-8 text-primary transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-300" />
      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-secondary" />
    </div>
    <span className="text-2xl font-extrabold font-headline">
      SkillEx
    </span>
  </Link>
);

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const { pathname } = useLocation();
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = lastScrollY.current;
    setScrolled(latest > 20);
    if (latest > prev && latest > 100) {
      setVisible(false);
      setMobileMenuOpen(false);
    } else {
      setVisible(true);
    }
    lastScrollY.current = latest;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(docH > 0 ? (latest / docH) * 100 : 0);
  });
  
  return (
    <>
      {/* Scroll progress bar — GPU composited via will-change */}
      <div
        className="fixed top-0 left-0 z-[60] h-[2.5px] bg-gradient-to-r from-primary via-secondary to-accent"
        style={{
          transform: `scaleX(${scrollProgress / 100})`,
          transformOrigin: '0 0',
          width: '100%',
          willChange: 'transform',
        }}
      />

      {/* Navbar */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: visible ? 0 : -100 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          'transition-[background,border-color,box-shadow] duration-300 ease-out',
          scrolled
            ? 'border-b border-border/50 bg-background/85 backdrop-blur-xl shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Logo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              <Link to="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="group h-10 rounded-xl px-5 text-sm font-bold gradient-bg text-primary-foreground shadow-glow hover:shadow-glow-lg hover:scale-[1.03] transition-all duration-200"
            >
              <Link to="/login">
                <Sparkles className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
                Start Free
                <ChevronRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="hover:bg-primary/5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -14, opacity: 0, rotate: -20 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 14, opacity: 0, rotate: 20 }}
                  transition={{ duration: 0.22 }}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.div>
              </AnimatePresence>
            </Button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 14, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.div>
              </AnimatePresence>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Toggle menu">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mobileMenuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-background/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed top-[76px] left-4 right-4 z-40 overflow-hidden rounded-2xl border border-border/50 bg-background/95 shadow-card backdrop-blur-xl md:hidden"
            >
              <nav className="flex flex-col p-4 gap-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors"
                    >
                      {link.name}
                      <ChevronRight className="h-4 w-4 opacity-40" />
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-4">
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild className="w-full rounded-xl font-bold gradient-bg text-primary-foreground">
                    <Link to="/login">
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Start Exchanging Free
                    </Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
