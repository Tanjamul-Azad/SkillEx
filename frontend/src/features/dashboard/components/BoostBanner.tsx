import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ArrowRight, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { appVisuals } from '@/lib/appVisuals';

export function BoostBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="group relative h-full overflow-hidden border-border/50 bg-card transition-all duration-300 hover:border-primary/25 hover:shadow-glow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-[46%] overflow-hidden md:block">
          <img
            src={appVisuals.dashboardBoostMatch}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-55 saturate-90 transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-card/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        </div>
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border border-primary/20 bg-primary/10 blur-2xl" />
        
        <CardContent className="relative z-10 flex h-full flex-col justify-center p-6 md:p-8">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-headline text-xl font-bold text-foreground tracking-tight mb-2">
            Boost Your Matches
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[200px] leading-relaxed">
            Personalize your skills and tags to find more accurate exchange partners.
          </p>
          <div className="mb-5 max-w-[230px] rounded-xl border border-border/60 bg-background/70 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-primary" />
                Match accuracy
              </span>
              <span className="text-xs font-bold text-primary">72%</span>
            </div>
            <Progress value={72} className="h-1.5 bg-muted" indicatorClassName="bg-primary" />
          </div>
          <Button asChild className="mt-auto w-fit rounded-lg shadow-sm font-semibold group/btn">
            <Link to="/settings">
              Update Profile
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
