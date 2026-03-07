
'use client';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Zap, Sun, Moon, Menu, X as XIcon, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import Logo from '@/components/ui/Logo';

const navLinks = [
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'Explore Skills', href: '#featured-skills' },
  { name: 'Community', href: '/community' },
];

const NavLogo = () => (
  <Link to="/" className="group">
    <Logo size="lg" />
  </Link>
);

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const doScroll = () => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const navbarOffset = scrolled ? 64 : 80;
      const top = el.getBoundingClientRect().top + window.scrollY - navbarOffset - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    };
    if (pathname !== '/') {
      navigate('/');
      // Wait for LandingPage to mount then scroll
      setTimeout(doScroll, 350);
    } else {
      doScroll();
    }
  };

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20);
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
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
        className={cn(
          'fixed top-0 z-50 w-full',
          'transition-all duration-500 ease-in-out',
          scrolled
            ? 'bg-background/60 backdrop-blur-2xl border-b border-border/40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] py-0'
            : 'bg-transparent border-b-transparent shadow-none py-2'
        )}
      >
        <div className={cn(
          "container mx-auto flex items-center justify-between px-4 transition-all duration-500",
          scrolled ? "h-16" : "h-20"
        )}>
          <NavLogo />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isHash = link.href.startsWith('#');
              const isActive = !isHash && pathname === link.href;
              const sharedClass = cn(
                'relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              );
              return isHash ? (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href.slice(1))}
                  className={sharedClass}
                >
                  <span className="relative">{link.name}</span>
                </button>
              ) : (
                <Link key={link.name} to={link.href} className={sharedClass}>
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
              variant="gradient"
              className="group h-10 rounded-xl px-5 text-sm"
            >
              <Link to="/login?tab=register">
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
                {navLinks.map((link, i) => {
                  const isHash = link.href.startsWith('#');
                  const mobileClass = 'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground transition-colors w-full text-left';
                  return (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                    >
                      {isHash ? (
                        <button
                          onClick={() => scrollToSection(link.href.slice(1))}
                          className={mobileClass}
                        >
                          {link.name}
                          <ChevronRight className="h-4 w-4 opacity-40" />
                        </button>
                      ) : (
                        <Link
                          to={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={mobileClass}
                        >
                          {link.name}
                          <ChevronRight className="h-4 w-4 opacity-40" />
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
                <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-4">
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild variant="gradient" className="w-full rounded-xl">
                    <Link to="/login?tab=register">
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
