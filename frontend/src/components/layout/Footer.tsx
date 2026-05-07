'use client';

import React, { useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Github, Twitter, Linkedin, Instagram } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const FooterLogo = () => (
  <Logo size="lg" />
);

const SECTION_OFFSET = 88;

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = useCallback(
    (sectionId: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      const doScroll = () => {
        const el = document.getElementById(sectionId);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - SECTION_OFFSET;
        window.scrollTo({ top, behavior: 'smooth' });
      };
      if (location.pathname === '/') {
        doScroll();
      } else {
        navigate('/');
        setTimeout(doScroll, 350);
      }
    },
    [navigate, location.pathname],
  );
  const footerLinks: Record<string, { name: string; href: string; sectionId?: string }[]> = {
    Product: [
      { name: 'How it Works', href: '/#how-it-works', sectionId: 'how-it-works' },
      { name: 'Match Demo', href: '/#match-demo', sectionId: 'match-demo' },
      { name: 'Skill Chains', href: '/#skill-chain', sectionId: 'skill-chain' },
      { name: 'FAQ', href: '/#faq', sectionId: 'faq' },
    ],
    Company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: '/careers' },
      { name: 'Community', href: '/community' },
      { name: 'Contact', href: 'mailto:hello@skiilex.com' },
    ],
    Legal: [
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Trust & Safety', href: '/trust' },
    ],
  };

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com' },
    { name: 'GitHub', icon: Github, href: 'https://github.com/Tanjamul-Azad/SkillEx' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com' },
  ];

  return (
    <footer className="relative border-t border-border/40 bg-card/50">
      {/* Top gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-1 lg:col-span-2">
            <FooterLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The free skill exchange platform for students. Trade what you know for what you want to learn.
            </p>
            <div className="mt-6 flex items-center gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="group flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card/60 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                >
                  <social.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/50">{title}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.sectionId ? (
                      <button
                        onClick={scrollToSection(link.sectionId)}
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground text-left"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
                        </span>
                      </button>
                    ) : link.href.startsWith('http') || link.href.startsWith('mailto') ? (
                      <a
                        href={link.href}
                        target={link.href.startsWith('http') ? "_blank" : undefined}
                        rel={link.href.startsWith('http') ? "noopener noreferrer" : undefined}
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                      >
                        <span className="relative">
                          {link.name}
                          <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SkillEx. Made with{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-semibold">❤</span>
            {' '}for learners everywhere.
          </p>
          <p className="text-xs text-muted-foreground/50">
            Free forever · No credit card · Open to all students
          </p>
        </div>
      </div>
    </footer>
  );
}

