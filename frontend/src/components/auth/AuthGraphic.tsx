
'use client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Code, Film, Figma, Mic, Music, Camera, Database, GitBranch, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import Logo from '@/components/ui/Logo';


const floatingSkills = [
  { name: 'Guitar', icon: Music, position: 'top-[12%] left-[8%]', delay: '0s' },
  { name: 'Python', icon: Code, position: 'top-[18%] right-[10%]', delay: '1s' },
  { name: 'Video Editing', icon: Film, position: 'top-[62%] left-[18%]', delay: '2s' },
  { name: 'Figma', icon: Figma, position: 'top-[48%] right-[20%]', delay: '0.5s' },
  { name: 'Photography', icon: Camera, position: 'top-[78%] right-[12%]', delay: '1.5s' },
  { name: 'Public Speaking', icon: Mic, position: 'top-[82%] left-[6%]', delay: '2.5s' },
  { name: 'Git & GitHub', icon: GitBranch, position: 'top-[35%] left-[5%]', delay: '3s' },
  { name: 'Data Science', icon: Database, position: 'top-[30%] right-[6%]', delay: '0.2s' },
];

const testimonials = [
  { quote: "I learned Python and taught guitar. Best decision of my uni life!", avatar: "https://picsum.photos/seed/101/40/40", name: "Nadia R.", color: 'border-primary' },
  { quote: "Found a partner to practice public speaking with. It was a game-changer.", avatar: "https://picsum.photos/seed/102/40/40", name: "Karim C.", color: 'border-secondary' },
  { quote: "SkillEx is what higher education should be about — collaborative learning.", avatar: "https://picsum.photos/seed/103/40/40", name: "Fatema A.", color: 'border-accent' },
];

const ConnectionVisual = () => (
  <motion.div
    className="relative flex items-center justify-center gap-6 py-6"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
  >
    {/* Left user */}
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-breathe" />
        <Avatar className="relative h-16 w-16 ring-2 ring-primary/50">
          <AvatarImage src="https://picsum.photos/seed/201/80/80" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      </div>
      <div className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-sm">
        Guitar 🎸
      </div>
    </div>

    {/* Exchange arrow */}
    <motion.div
      className="flex flex-col items-center gap-1"
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="rounded-full bg-white/10 p-2 backdrop-blur-sm">
        <ArrowLeftRight className="h-5 w-5 text-white" />
      </div>
      <span className="text-[10px] font-medium text-white/60">exchange</span>
    </motion.div>

    {/* Right user */}
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-secondary/30 blur-md animate-breathe" style={{ animationDelay: '1s' }} />
        <Avatar className="relative h-16 w-16 ring-2 ring-secondary/50">
          <AvatarImage src="https://picsum.photos/seed/202/80/80" />
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </div>
      <div className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-semibold text-secondary backdrop-blur-sm">
        Python 🐍
      </div>
    </div>
  </motion.div>
);

const TestimonialChip = ({ quote, avatar, name, color }: { quote: string; avatar: string; name: string; color: string }) => (
  <div className={cn(
    'flex items-center gap-3 rounded-xl bg-black/25 p-3 backdrop-blur-md border-l-4 border border-white/10',
    color
  )}>
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={avatar} />
      <AvatarFallback>{name.charAt(0)}</AvatarFallback>
    </Avatar>
    <div>
      <p className="text-xs font-medium text-white leading-snug">{`"${quote}"`}</p>
      <p className="mt-0.5 text-[10px] text-white/50">— {name}</p>
    </div>
  </div>
);

export function AuthGraphic() {
  return (
    <div className="relative hidden min-h-screen select-none bg-background lg:flex lg:flex-col lg:items-center lg:justify-between p-10 lg:p-12">
      {/* Background 3D Starfield */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <Suspense fallback={null}>
            <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
          </Suspense>
        </Canvas>
      </div>

      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),transparent)]" />
      <div className="absolute inset-0 mesh-gradient opacity-40" />
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute top-1/4 left-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-blob opacity-50" />
      <div className="pointer-events-none absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-secondary/20 blur-3xl animate-blob opacity-50" style={{ animationDelay: '3s' }} />

      {/* Floating skill chips */}
      <div className="absolute inset-0 overflow-hidden">
        {floatingSkills.map((skill, i) => (
          <motion.div
            key={i}
            className={cn('absolute glass rounded-full px-3 py-1.5 shadow-lg animate-float', skill.position)}
            style={{ animationDelay: skill.delay }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ delay: i * 0.15 + 0.4, type: 'spring', stiffness: 160, damping: 20 }}
          >
            <div className="flex items-center gap-1.5 text-xs text-white/90">
              <skill.icon className="h-3.5 w-3.5 text-primary" />
              <span>{skill.name}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logo */}
      <div className="relative z-10 self-start">
        <Link to="/" className="block transition-transform hover:scale-105 active:scale-95">
          <Logo size="lg" className="[&_span]:text-white" />
        </Link>
      </div>

      {/* Central visual */}
      <div className="relative z-10 text-center text-white">
        <ConnectionVisual />
        <motion.h2
          className="mt-2 text-4xl font-bold font-headline leading-tight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 100 }}
        >
          Your skills are your currency.
        </motion.h2>
        <motion.p
          className="mt-3 text-base text-white/65 max-w-xs mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, type: 'spring', stiffness: 100 }}
        >
          Join a peer-to-peer community where knowledge is the ultimate capital — not cash.
        </motion.p>
      </div>

      {/* Testimonials */}
      <div className="relative z-10 w-full flex flex-col gap-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 + i * 0.15, type: 'spring', stiffness: 120, damping: 22 }}
          >
            <TestimonialChip {...t} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

