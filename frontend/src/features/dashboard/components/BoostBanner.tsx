import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function BoostBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className="h-full overflow-hidden relative border-border/50 bg-gradient-to-br from-primary/[0.05] via-primary/[0.02] to-background">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0L53.9458 35.8829C55.0863 46.2625 63.3853 54.269 73.8341 55.4332L100 58.3333L74.832 63.6393C64.6738 65.7811 56.6374 73.8175 54.4956 83.9757L49.1896 109.144L46.2895 82.978C45.1253 72.5292 37.1188 64.2302 26.7392 63.0897L0.856323 60.2229L26.7392 57.3561C37.1188 56.2156 45.1253 47.9166 46.2895 37.4678L49.1896 11.3015L50 0Z" fill="currentColor"/>
          </svg>
        </div>
        
        <CardContent className="p-6 md:p-8 flex flex-col justify-center h-full relative z-10">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary mb-4">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-headline text-xl font-bold text-foreground tracking-tight mb-2">
            Boost Your Matches
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[200px] leading-relaxed">
            Personalize your skills and tags to find more accurate exchange partners.
          </p>
          <Button className="w-fit rounded-lg shadow-sm font-semibold group mt-auto">
            Update Profile
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}