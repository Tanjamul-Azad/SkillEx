'use client';

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftRight, CheckCircle2, Code, Mic, Palette, Star, Video } from 'lucide-react';

import Logo from '@/components/ui/Logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const exchangeCards = [
  {
    name: 'Aisha',
    role: 'Teaches brand design',
    wants: 'Learns video editing',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
    icon: Palette,
  },
  {
    name: 'Rahim',
    role: 'Teaches editing',
    wants: 'Learns public speaking',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
    icon: Video,
  },
];

const floatingSkills = [
  { label: 'Python', icon: Code, className: 'left-[8%] top-[18%]' },
  { label: 'Design', icon: Palette, className: 'right-[9%] top-[22%]' },
  { label: 'Speaking', icon: Mic, className: 'bottom-[22%] left-[10%]' },
];

export function AuthGraphic() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-[#07101a] lg:flex lg:flex-col">
      <img
        src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=82"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,15,0.55),rgba(4,8,15,0.22)),linear-gradient(180deg,rgba(4,8,15,0.16),rgba(4,8,15,0.88))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_26%,rgba(0,245,212,0.24),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,199,0,0.14),transparent_22%)]" />

      {floatingSkills.map(({ label, icon: Icon, className }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + index * 0.12, duration: 0.45 }}
          className={`absolute ${className} rounded-full border border-white/14 bg-black/30 px-3 py-2 text-xs font-semibold text-white/88 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md`}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </span>
        </motion.div>
      ))}

      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
        <Link to="/" className="w-fit transition-transform hover:scale-[1.03] active:scale-[0.98]">
          <Logo size="lg" className="[&_span]:text-white" />
        </Link>

        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary backdrop-blur"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Live skill exchange
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg font-headline text-5xl font-black leading-[0.96] tracking-tight text-white xl:text-6xl"
          >
            Trade what you know for what you want to learn.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-md text-base leading-7 text-white/76"
          >
            SkillEX works for creators, professionals, mentors, and curious learners who want a fair way to exchange knowledge without turning every lesson into a transaction.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 grid max-w-xl gap-3 xl:grid-cols-[1fr_auto_1fr]"
          >
            <ExchangeProfileCard {...exchangeCards[0]} label="Creator" />
            <div className="hidden items-center justify-center xl:flex">
              <div className="rounded-full border border-white/14 bg-white/10 p-3 text-white shadow-[0_0_36px_rgba(0,245,212,0.25)] backdrop-blur">
                <ArrowLeftRight className="h-5 w-5" />
              </div>
            </div>
            <ExchangeProfileCard {...exchangeCards[1]} label="Coach" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl rounded-2xl border border-white/12 bg-black/34 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-secondary">
              <Star className="h-4 w-4 fill-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-6 text-white">
                “I traded Notion workflow help for camera basics. One hour saved me weeks of guessing.”
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs text-white/56">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Verified exchange story
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

function ExchangeProfileCard({
  name,
  role,
  wants,
  avatar,
  icon: Icon,
  label,
}: (typeof exchangeCards)[number] & { label: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[#06141d]/82 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-primary/35">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-headline text-base font-bold text-white">{name}</p>
          <p className="text-xs text-white/56">{label}</p>
        </div>
        <Icon className="ml-auto h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-white/84">{role}</p>
        <p className="text-secondary">{wants}</p>
      </div>
    </div>
  );
}
