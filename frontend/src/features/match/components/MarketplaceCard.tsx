import React, { FC, useState } from 'react';
import { Briefcase, GraduationCap, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';

export const MarketplaceCard: FC<{ profile: User }> = React.memo(({ profile }) => {
  const [requestOpen, setRequestOpen] = useState(false);

  const offered = profile.skillsOffered ?? [];
  const wanted = profile.skillsWanted ?? [];

  return (
    <>
      <Card className="group h-full overflow-hidden transition-all duration-400 ease-snappy hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25),0_4px_12px_hsl(220_20%_40%/0.1)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/30 transition-all">
                <AvatarImage src={profile.avatar ?? undefined} />
                <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-headline text-base font-bold">{profile.name}</h3>
                <p className="text-sm text-muted-foreground">{profile.university || 'Global Community'}</p>
                {profile.isOnline && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-secondary inline-block" />
                    Available now
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">SkillEX Score</p>
              <p className="text-sm font-bold text-primary">{profile.skillexScore ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              {(profile.rating ?? 0).toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1">
              <Users className="h-3.5 w-3.5" />
              {profile.sessionsCompleted ?? 0} sessions
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1">
              <Briefcase className="h-3.5 w-3.5" />
              {offered.length} teaches
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1">
              <GraduationCap className="h-3.5 w-3.5" />
              {wanted.length} learning
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/80">Teaches</p>
              <div className="flex flex-wrap gap-1.5">
                {offered.slice(0, 4).map((skill) => (
                  <Badge key={`off-${profile.id}-${skill.id}`} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                    {skill.name}
                  </Badge>
                ))}
                {offered.length > 4 && (
                  <Badge variant="outline">+{offered.length - 4} more</Badge>
                )}
                {offered.length === 0 && (
                  <span className="text-xs text-muted-foreground">No offered skills listed yet</span>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Wants to learn</p>
              <div className="flex flex-wrap gap-1.5">
                {wanted.slice(0, 3).map((skill) => (
                  <Badge key={`want-${profile.id}-${skill.id}`} variant="outline" className="border-border/80">
                    {skill.name}
                  </Badge>
                ))}
                {wanted.length > 3 && (
                  <Badge variant="outline">+{wanted.length - 3} more</Badge>
                )}
                {wanted.length === 0 && (
                  <span className="text-xs text-muted-foreground">Open to skill exchange offers</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <div className="flex border-t border-white/10 dark:border-white/5">
          <Button variant="ghost" className="w-1/2 rounded-none rounded-bl-2xl text-sm hover:bg-primary/10" asChild>
            <Link to={`/profile/${profile.id}`}>View Profile</Link>
          </Button>
          <Button
            onClick={() => setRequestOpen(true)}
            variant="gradient"
            className="w-1/2 rounded-none rounded-br-2xl text-sm"
          >
            Connect
          </Button>
        </div>
      </Card>

      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={profile}
      />
    </>
  );
});

MarketplaceCard.displayName = 'MarketplaceCard';
