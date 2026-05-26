import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Target, CalendarDays, UserRoundCog, Repeat2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { appVisuals } from '@/lib/appVisuals';
import type { SmartAction } from '@/services/dashboardService';

const actionIcons = {
  PROFILE: UserRoundCog,
  EXCHANGE: Repeat2,
  SESSION: CalendarDays,
  MATCH: Target,
} as const;

export function BoostBanner({
  actions,
  loading = false,
}: {
  actions: SmartAction[];
  loading?: boolean;
}) {
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1, 4);
  const Icon = primaryAction
    ? actionIcons[primaryAction.type as keyof typeof actionIcons] ?? Sparkles
    : Sparkles;

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
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>

          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-headline text-xl font-bold tracking-tight text-foreground">
              Smart Actions
            </h3>
            {primaryAction && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {primaryAction.priority}
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-36 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted/70" />
              <div className="h-9 w-32 rounded-lg bg-muted" />
            </div>
          ) : primaryAction ? (
            <>
              <p className="mb-2 max-w-[240px] text-sm font-semibold leading-snug text-foreground">
                {primaryAction.title}
              </p>
              <p className="mb-5 max-w-[240px] text-sm leading-relaxed text-muted-foreground">
                {primaryAction.reason}
              </p>
              {secondaryActions.length > 0 && (
                <div className="mb-5 max-w-[250px] space-y-1.5">
                  {secondaryActions.map((action) => (
                    <Link
                      key={action.id}
                      to={action.route}
                      className="block truncate rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {action.title}
                    </Link>
                  ))}
                </div>
              )}
              <Button asChild className="mt-auto w-fit rounded-lg font-semibold shadow-sm group/btn">
                <Link to={primaryAction.route}>
                  {primaryAction.actionLabel}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </>
          ) : (
            <div className="max-w-[240px]">
              <p className="mb-2 text-sm font-semibold text-foreground">No urgent actions</p>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                Your dashboard is up to date. Find another exchange when you are ready.
              </p>
              <Button asChild className="mt-auto w-fit rounded-lg font-semibold shadow-sm group/btn">
                <Link to="/match">
                  Find match
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
