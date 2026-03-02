
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Code, Music, Camera, Figma, Search, Home } from 'lucide-react';

const floatingIcons = [
  { Icon: Code,   label: 'Coding',       x: '-62%', y: '-55%', delay: 0,    size: 'h-5 w-5', color: 'text-primary'   },
  { Icon: Music,  label: 'Music',        x:  '55%', y: '-48%', delay: 0.15, size: 'h-5 w-5', color: 'text-secondary' },
  { Icon: Camera, label: 'Photography',  x: '-58%', y:  '50%', delay: 0.3,  size: 'h-5 w-5', color: 'text-accent'    },
  { Icon: Figma,  label: 'Design',       x:  '52%', y:  '45%', delay: 0.1,  size: 'h-5 w-5', color: 'text-primary'   },
];

export default function NotFound() {
  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-background text-center p-4">
      {/* Dot grid + blobs */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-2xl" />

      <div className="relative z-10">
        {/* Floating skill chips */}
        {floatingIcons.map(({ Icon, label, x, y, delay, size, color }, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ x, y }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1, y: [y, `calc(${y} - 10px)`, y] }}
            transition={{
              opacity:  { delay: delay + 0.4, duration: 0.4 },
              scale:    { delay: delay + 0.4, type: 'spring', stiffness: 180, damping: 18 },
              y:        { delay: delay + 1, duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-card">
              <Icon className={`${size} ${color}`} />
              <span>{label}</span>
            </div>
          </motion.div>
        ))}

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 16 }}
          className="font-headline text-[10rem] md:text-[14rem] font-black leading-none tracking-tighter text-gradient select-none"
          style={{ filter: 'drop-shadow(0 0 60px hsl(var(--primary)/0.25))' }}
        >
          404
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        >
          <h2 className="mt-2 text-2xl md:text-3xl font-bold font-headline">
            Skill Not Found! 🔍
          </h2>
          <p className="mt-3 max-w-sm mx-auto text-muted-foreground text-sm leading-relaxed">
            This page doesn&apos;t exist, has been moved, or is a skill we haven&apos;t discovered yet.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 100 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="rounded-xl gradient-bg text-primary-foreground font-bold shadow-glow hover:shadow-glow-lg">
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />Go to Dashboard
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl border-primary/30 hover:border-primary/60 hover:bg-primary/5">
            <Link to="/match">
              <Search className="mr-2 h-4 w-4" />Find a Match
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
