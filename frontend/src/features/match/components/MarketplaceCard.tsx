import React, { FC, useState, useEffect } from 'react';
import { ArrowUpRight, Briefcase, GraduationCap, Sparkles, Star, Store, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';
import { exchangeService, type ExchangeRelationship } from '@/services/exchangeService';

export const MarketplaceCard: FC<{ profile: User }> = React.memo(({ profile }) => {
  const [requestOpen, setRequestOpen] = useState(false);
  const [exchangeRelation, setExchangeRelation] = useState<ExchangeRelationship | null>(null);

  useEffect(() => {
    let active = true;
    const fetchRelation = async () => {
      try {
        const res = await exchangeService.getRelationship(profile.id);
        if (active) {
          setExchangeRelation(res);
        }
      } catch (err) {
        console.error('Error fetching exchange relationship:', err);
      }
    };
    fetchRelation();
    return () => {
      active = false;
    };
  }, [profile.id]);

  const offered = profile.skillsOffered ?? [];
  const wanted = profile.skillsWanted ?? [];
  const avatarSrc = (profile.avatar ?? '').trim();
  const shopHighlights = offered.slice(0, 2);

  return (
    <>
      <Card className="group relative flex h-full flex-col overflow-hidden border-border/70 bg-gradient-to-b from-card to-card/95 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_18px_45px_-30px_hsl(var(--primary)/0.45)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

        {/* Personalized visual header with real avatar when available */}
        <div className="absolute inset-x-0 top-0 h-24 overflow-hidden z-0">
          {avatarSrc ? (
            <>
              <img
                src={avatarSrc}
                alt={`${profile.name} cover`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover opacity-60 blur-[1px] scale-110 transition-all duration-700 group-hover:scale-[1.16] group-hover:opacity-75"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-primary/20 to-emerald-50/60" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(circle_at_80%_0%,hsl(var(--secondary)/0.14),transparent_48%),linear-gradient(120deg,hsl(var(--card)),hsl(var(--background)))]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/92 to-transparent z-10" />
          <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-background/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/90">
            <Store className="h-3 w-3" />
            Skill Shop
          </div>
        </div>

        <CardContent className="relative z-10 flex flex-1 flex-col p-5 pt-14">
          <div className="flex items-start justify-between gap-3 relative z-20">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-4 ring-card group-hover:ring-primary/30 transition-all shadow-lg bg-card">
                <AvatarImage src={avatarSrc || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted text-foreground font-bold">{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="mt-2">
                <h3 className="font-headline text-base font-bold drop-shadow-sm">{profile.name}</h3>
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

          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/85">Featured From Skill Shop</p>
            {shopHighlights.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shopHighlights.map((skill) => (
                  <Badge key={`shop-${profile.id}-${skill.id}`} variant="secondary" className="border border-primary/20 bg-primary/10 text-primary">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {skill.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">This member is ready for custom skill requests.</p>
            )}
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

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/60 p-3 dark:border-white/10">
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold" asChild>
            <Link to={`/profile/${profile.id}`}>View Profile</Link>
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold" asChild>
            <Link to={`/profile/${profile.id}?tab=skills&focus=offered#skills-offered`}>Skill Shop</Link>
          </Button>
          {exchangeRelation?.status === 'ACCEPTED' ? (
            <Button
              asChild
              size="sm"
              variant="gradient"
              className="col-span-2 h-9 rounded-xl text-xs font-bold shadow-none"
            >
              <Link to="/dashboard#active-exchanges">Meeting</Link>
            </Button>
          ) : exchangeRelation?.status === 'DECLINED' ? (
            <Button
              size="sm"
              variant="outline"
              className="col-span-2 h-9 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400"
              disabled
            >
              Rejected
            </Button>
          ) : exchangeRelation?.status === 'PENDING_SENT' ? (
            <Button
              size="sm"
              variant="outline"
              className="col-span-2 h-9 rounded-xl text-xs font-bold text-primary"
              disabled
            >
              Sent
            </Button>
          ) : exchangeRelation?.status === 'PENDING_RECEIVED' ? (
            <Button
              size="sm"
              variant="outline"
              className="col-span-2 h-9 rounded-xl text-xs font-bold text-amber-600"
              disabled
            >
              Incoming
            </Button>
          ) : (
            <Button
              onClick={() => setRequestOpen(true)}
              variant="gradient"
              size="sm"
              className="col-span-2 h-9 rounded-xl text-xs font-bold shadow-none"
              aria-label={`Connect with ${profile.name}`}
            >
              Connect <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </Card>

      <RequestExchangeDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        targetUser={profile}
        onSuccess={() => {
          setExchangeRelation({
            targetUserId: profile.id,
            status: 'PENDING_SENT',
            exchangeId: null,
          });
        }}
      />
    </>
  );
});

MarketplaceCard.displayName = 'MarketplaceCard';
