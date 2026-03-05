
'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Instagram, Zap } from 'lucide-react';
import Logo from '@/components/ui/Logo';

const FooterLogo = () => (
  <Logo size="lg" />
);

export default function Footer() {
  const footerLinks = {
    Product: [
      { name: 'How it Works', href: '#' },
      { name: 'Explore Skills', href: '#' },
      { name: 'Skill Chains', href: '#' },
      { name: 'Pricing', href: '#' },
    ],
    Company: [
      { name: 'About Us', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Community', href: '/community' },
    ],
    Legal: [
      { name: 'Terms of Service', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Cookie Policy', href: '#' },
    ],
  };

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'GitHub', icon: Github, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
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
                <Link
                  key={social.name}
                  to={social.href}
                  aria-label={social.name}
                  className="group flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card/60 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                >
                  <social.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                </Link>
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
                    <Link
                      to={link.href}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      <span className="relative">
                        {link.name}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full" />
                      </span>
                    </Link>
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

