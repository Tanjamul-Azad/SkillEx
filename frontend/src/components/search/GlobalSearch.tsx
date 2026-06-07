import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Sparkles, ArrowUpRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { UserService, type UserSearchResult } from '@/services/userService';
import { CommunityService } from '@/services/communityService';
import {
  connectionService,
  type ConnectionRelationship,
} from '@/services/connectionService';
import type { Post } from '@/types';
import { useToast } from '@/hooks/use-toast';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

type SearchMode = 'people' | 'skills';

export default function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const rootRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<SearchMode>('people');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [peopleResults, setPeopleResults] = useState<UserSearchResult[]>([]);
  const [skillPostResults, setSkillPostResults] = useState<Post[]>([]);
  const [connectBusy, setConnectBusy] = useState<Record<string, boolean>>({});
  const [connectTarget, setConnectTarget] = useState<UserSearchResult | null>(null);
  const [connectMessage, setConnectMessage] = useState('');
  const [relationshipByUser, setRelationshipByUser] = useState<Record<string, ConnectionRelationship>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setPeopleResults([]);
      setSkillPostResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const run = async () => {
      try {
        if (mode === 'people') {
          const res = await UserService.searchPeople(debouncedQuery, 1, 6);
          if (!active) return;
          setPeopleResults(res.content ?? []);
          setSkillPostResults([]);
        } else {
          const res = await CommunityService.searchPosts(debouncedQuery, 0, 6);
          if (!active) return;
          setSkillPostResults(res.content ?? []);
          setPeopleResults([]);
        }
      } catch {
        if (!active) return;
        setPeopleResults([]);
        setSkillPostResults([]);
      } finally {
        if (active) {
          setLoading(false);
          setOpen(true);
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [debouncedQuery, mode]);

  useEffect(() => {
    if (mode !== 'people' || peopleResults.length === 0) {
      setRelationshipByUser({});
      return;
    }

    let active = true;

    const run = async () => {
      try {
        const entries = await Promise.all(
          peopleResults.map(async (person) => {
            const relationship = await connectionService.getRelationship(person.id);
            return [person.id, relationship] as const;
          })
        );

        if (!active) return;

        setRelationshipByUser(
          entries.reduce<Record<string, ConnectionRelationship>>((acc, [id, relationship]) => {
            acc[id] = relationship;
            return acc;
          }, {})
        );
      } catch {
        if (!active) return;
        setRelationshipByUser({});
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [mode, peopleResults]);

  const resultCount = useMemo(
    () => (mode === 'people' ? peopleResults.length : skillPostResults.length),
    [mode, peopleResults.length, skillPostResults.length]
  );

  const handleOpenConnectDialog = (person: UserSearchResult) => {
    setConnectTarget(person);
    setConnectMessage(`Hi ${person.displayName.split(' ')[0]}, I found your profile on SkillEX and would love to connect.`);
  };

  const handleSendConnectionRequest = async () => {
    if (!connectTarget) return;

    const target = connectTarget;

    setConnectBusy((prev) => ({ ...prev, [target.id]: true }));
    try {
      await connectionService.create({
        receiverId: target.id,
        message: connectMessage.trim() || undefined,
      });

      setRelationshipByUser((prev) => ({
        ...prev,
        [target.id]: {
          targetUserId: target.id,
          status: 'PENDING_SENT',
          connectionId: null,
          canMessage: false,
        },
      }));

      toast({
        title: 'Connection sent',
        description: `Your request was sent to ${target.displayName}.`,
        variant: 'success',
      });

      setConnectTarget(null);
      setConnectMessage('');
    } catch (error) {
      const latestRelationship = await connectionService.getRelationship(target.id).catch(() => null);

      if (latestRelationship) {
        setRelationshipByUser((prev) => ({
          ...prev,
          [target.id]: latestRelationship,
        }));
      }

      if (latestRelationship?.status === 'CONNECTED') {
        toast({
          title: 'Already connected',
          description: `You are already connected with ${target.displayName}.`,
          variant: 'success',
        });
        setConnectTarget(null);
        return;
      }

      if (latestRelationship?.status === 'PENDING_SENT') {
        toast({
          title: 'Request already sent',
          description: `Your request to ${target.displayName} is still pending.`,
        });
        setConnectTarget(null);
        return;
      }

      if (latestRelationship?.status === 'PENDING_RECEIVED') {
        toast({
          title: 'Incoming request found',
          description: `${target.displayName} already sent you a request. Open Connections to accept it.`,
        });
        setConnectTarget(null);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not send request right now.';
      toast({ title: 'Connect failed', description: message, variant: 'destructive' });
    } finally {
      setConnectBusy((prev) => ({ ...prev, [target.id]: false }));
    }
  };

  const handleAcceptIncoming = async (personId: string) => {
    const relationship = relationshipByUser[personId];
    if (!relationship?.connectionId) return;

    setConnectBusy((prev) => ({ ...prev, [personId]: true }));
    try {
      await connectionService.updateStatus(relationship.connectionId, 'accepted');
      setRelationshipByUser((prev) => ({
        ...prev,
        [personId]: {
          ...relationship,
          status: 'CONNECTED',
          canMessage: true,
        },
      }));
      toast({
        title: 'Connection accepted',
        description: 'You are now connected and can start chatting.',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not accept request right now.';
      toast({ title: 'Accept failed', description: message, variant: 'destructive' });
    } finally {
      setConnectBusy((prev) => ({ ...prev, [personId]: false }));
    }
  };

  const handleViewProfile = (id: string) => {
    setOpen(false);
    navigate(`/profile/${id}`);
  };

  const handleOpenFeed = () => {
    setOpen(false);
    navigate(`/community?tab=feed&intent=${encodeURIComponent(debouncedQuery)}`);
  };

  return (
    <div ref={rootRef} className={cn('relative w-full max-w-[680px]', className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-2 py-1.5 shadow-sm theme-transition focus-within:border-primary/45 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <div className="inline-flex shrink-0 items-center rounded-lg border border-border/70 bg-muted p-0.5 dark:border-white/10 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setMode('people')}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition-colors',
                mode === 'people'
                  ? 'bg-background text-foreground shadow-sm dark:bg-slate-800'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">People</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('skills')}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition-colors',
                mode === 'skills'
                  ? 'bg-background text-foreground shadow-sm dark:bg-slate-800'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Skills</span>
            </button>
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => {
                if (debouncedQuery.length >= MIN_QUERY_LENGTH || query.length >= MIN_QUERY_LENGTH) {
                  setOpen(true);
                }
              }}
              placeholder={mode === 'people' ? 'Search @username or name...' : 'Search skills and intent...'}
              className="h-8 border-0 bg-transparent pl-8 pr-16 text-sm shadow-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] text-muted-foreground">
              {loading && debouncedQuery.length >= MIN_QUERY_LENGTH ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <span className="hidden md:inline">2+ chars</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && debouncedQuery.length >= MIN_QUERY_LENGTH && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,640px)] overflow-y-auto rounded-2xl border border-border/70 bg-popover p-3 shadow-2xl dark:border-white/10 dark:bg-slate-950"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {mode === 'people' ? 'People results' : 'Skill feed results'}
              </p>
              <Badge variant="secondary" className="text-[10px]">
                {loading ? 'Searching...' : `${resultCount} found`}
              </Badge>
            </div>

            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted px-3 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching live results...
              </div>
            )}

            {!loading && mode === 'people' && peopleResults.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
                No people found for "{debouncedQuery}".
              </div>
            )}

            {!loading && mode === 'skills' && skillPostResults.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
                No feed posts found. Try a broader skill phrase.
              </div>
            )}

            {!loading && mode === 'people' && peopleResults.length > 0 && (
              <div className="space-y-2">
                {peopleResults.map((person) => {
                  const relationship = relationshipByUser[person.id];
                  const status = relationship?.status ?? 'NONE';
                  const isConnected = status === 'CONNECTED';
                  const isPendingSent = status === 'PENDING_SENT';
                  const isPendingReceived = status === 'PENDING_RECEIVED';

                  return (
                    <div
                      key={person.id}
                      className="rounded-xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-white/10 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3">
                      <Avatar className="h-11 w-11 ring-2 ring-border/70">
                        <AvatarImage src={person.avatar ?? undefined} alt={person.displayName} />
                        <AvatarFallback>{person.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{person.displayName}</p>
                          <span className="truncate text-xs text-muted-foreground">@{person.username}</span>
                          <Badge className="ml-auto bg-primary/15 text-primary hover:bg-primary/20">
                            {person.matchPercent}% match
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {person.topSkillsOffered.slice(0, 3).map((skill) => (
                            <Badge key={`offer-${person.id}-${skill}`} variant="outline" className="text-[10px]">
                              Teaches: {skill}
                            </Badge>
                          ))}
                          {person.topSkillsWanted.slice(0, 3).map((skill) => (
                            <Badge key={`want-${person.id}-${skill}`} variant="secondary" className="text-[10px]">
                              Wants: {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => handleViewProfile(person.id)}>
                            View Profile
                          </Button>
                          {isConnected ? (
                            <Button size="sm" className="h-8 rounded-lg text-xs" disabled>
                              Connected
                            </Button>
                          ) : isPendingSent ? (
                            <Button size="sm" className="h-8 rounded-lg text-xs" disabled>
                              Pending
                            </Button>
                          ) : isPendingReceived ? (
                            <Button
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => handleAcceptIncoming(person.id)}
                              disabled={connectBusy[person.id]}
                            >
                              {connectBusy[person.id] ? 'Accepting...' : 'Accept'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              onClick={() => handleOpenConnectDialog(person)}
                              disabled={connectBusy[person.id]}
                            >
                              {connectBusy[person.id] ? 'Connecting...' : 'Connect'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}

            {!loading && mode === 'skills' && skillPostResults.length > 0 && (
              <div className="space-y-2">
                {skillPostResults.map((post) => (
                  <button
                    type="button"
                    key={post.id}
                    onClick={handleOpenFeed}
                    className="w-full rounded-xl border border-border/70 bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-white/10 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {post.type}
                      </Badge>
                      {post.skill?.name && (
                        <Badge variant="outline" className="text-[10px]">
                          {post.skill.name}
                        </Badge>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                        Open Feed <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-foreground/90">
                      {post.content}
                    </p>

                    <div className="mt-2 text-xs text-muted-foreground">
                      by {post.author.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog
        open={!!connectTarget}
        onOpenChange={(openState) => {
          if (!openState) {
            setConnectTarget(null);
            setConnectMessage('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Introduce yourself to {connectTarget?.displayName ?? 'this user'} so they know why you want to connect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Textarea
              value={connectMessage}
              onChange={(event) => setConnectMessage(event.target.value.slice(0, 240))}
              placeholder="Write a short message..."
              className="min-h-[112px]"
            />
            <p className="text-xs text-muted-foreground text-right">{connectMessage.length}/240</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendConnectionRequest}
              disabled={!connectTarget || connectBusy[connectTarget.id]}
            >
              {connectTarget && connectBusy[connectTarget.id] ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
