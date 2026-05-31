
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss,
  Calendar,
  Users,
  MessageSquare,
  Plus,
  ArrowUp,
  MapPin,
  Circle,
  Pin,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import { StoryCircle } from '../components/StoryCircle';
import { CommunityService } from '@/services/communityService';
import { connectionService } from '@/services/connectionService';
import { SkillService } from '@/services/skillService';
import type { Post, Story, TrendingSkill, SuggestedUser, Discussion, Event, SkillCircle, Skill } from '@/types';
import { appVisuals } from '@/lib/appVisuals';

const tabs = [
  { id: 'feed', label: 'Feed', icon: Rss },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'circles', label: 'Skill Circles', icon: Users },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

function SkillPicker({
  skills,
  selected,
  onChange,
  limit = 4,
}: {
  skills: Skill[];
  selected: string[];
  onChange: (ids: string[]) => void;
  limit?: number;
}) {
  const visibleSkills = skills.slice(0, 16);

  const toggleSkill = (skillId: string) => {
    if (selected.includes(skillId)) {
      onChange(selected.filter(id => id !== skillId));
      return;
    }
    if (selected.length < limit) {
      onChange([...selected, skillId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleSkills.map(skill => {
        const active = selected.includes(skill.id);
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => toggleSkill(skill.id)}
            className={cn(
              'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
              active
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-primary'
            )}
          >
            {skill.name}
          </button>
        );
      })}
      {visibleSkills.length === 0 && (
        <span className="text-xs text-muted-foreground">No skills available yet.</span>
      )}
    </div>
  );
}

// --- FEED TAB COMPONENTS ---

const FeedTab = ({ intentFilter, onlineCount }: { intentFilter?: string; onlineCount: number }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<TrendingSkill[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [relationshipStatuses, setRelationshipStatuses] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (suggestions.length > 0) {
      suggestions.forEach(u => {
        connectionService.getRelationship(u.id)
          .then(rel => {
            setRelationshipStatuses(prev => ({
              ...prev,
              [u.id]: rel.status // 'NONE', 'PENDING_SENT', 'PENDING_RECEIVED', 'CONNECTED'
            }));
          })
          .catch(() => {});
      });
    }
  }, [suggestions]);

  const handleConnect = async (uId: string) => {
    try {
      const relStatus = relationshipStatuses[uId];
      if (relStatus === 'NONE' || !relStatus) {
        const connection = await connectionService.create({ receiverId: uId, message: "Hi! I saw your profile on the SkillEX Community Hub and would love to exchange skills!" });
        setRelationshipStatuses(prev => ({
          ...prev,
          [uId]: connection.status?.toUpperCase() === 'ACCEPTED' ? 'CONNECTED' : 'PENDING_SENT'
        }));
        toast({
          title: connection.status?.toUpperCase() === 'ACCEPTED' ? 'Already connected' : 'Connection Request Sent',
          description: connection.status?.toUpperCase() === 'ACCEPTED'
            ? 'You can message this person now.'
            : "We've sent a professional connection invitation.",
        });
      } else if (relStatus === 'PENDING_RECEIVED') {
        const rel = await connectionService.getRelationship(uId);
        if (rel.connectionId) {
          await connectionService.updateStatus(rel.connectionId, 'accepted');
          setRelationshipStatuses(prev => ({
            ...prev,
            [uId]: 'CONNECTED'
          }));
          toast({
            title: "Connected!",
            description: "You are now connected for skill exchange.",
          });
        } else {
          throw new Error('Could not find the pending request.');
        }
      }
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to update connection.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const normalizedIntentFilter = intentFilter?.trim() ?? '';
    const hasIntent = normalizedIntentFilter.length >= 2;
    const postsPromise = hasIntent
      ? CommunityService.searchPosts(normalizedIntentFilter, 0, 20)
      : CommunityService.getPosts(0, 20);

    postsPromise.then((r) => {
      setLocalPosts(r.content ?? []);
      setHasMore(!(r.last ?? true));
      setCurrentPage(0);
    }).catch(() => {});
    CommunityService.getStories().then(setStories).catch(() => {});

    // Real trending skills from API
    CommunityService.getTrendingSkills()
      .then(setTrendingSkills)
      .catch(() => {});

    // Real suggested users from API
    CommunityService.getSuggestedUsers()
      .then(setSuggestions)
      .catch(() => {});
  }, [intentFilter]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const normalizedIntentFilter = intentFilter?.trim() ?? '';
      const hasIntent = normalizedIntentFilter.length >= 2;
      const r = hasIntent
        ? await CommunityService.searchPosts(normalizedIntentFilter, nextPage, 20)
        : await CommunityService.getPosts(nextPage, 20);
      
      if (r.content && r.content.length > 0) {
        setLocalPosts(prev => [...prev, ...r.content]);
        setHasMore(!(r.last ?? true));
        setCurrentPage(nextPage);
      } else {
        setHasMore(false);
      }
    } catch { /* ignore */ }
    setLoadingMore(false);
  }, [currentPage, hasMore, intentFilter, loadingMore]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 0.5 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleNewPost = (post: Post) => {
    setLocalPosts((prev) => [post, ...prev]);
  };

  const handleDeletePost = (postId: string) => {
    setLocalPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="flex justify-center gap-6 max-w-7xl mx-auto">
      {/* Main Feed Column */}
      <div className="flex-1 max-w-[680px] space-y-6">
        {intentFilter && intentFilter.trim().length >= 2 && (
          <div className="rounded-2xl border border-primary/15 bg-card backdrop-blur-xl shadow-sm p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Filtered feed</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">"{intentFilter}"</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-primary/20 text-[10px] font-bold uppercase tracking-widest h-8"
              onClick={() => navigate('/community?tab=feed', { replace: true })}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Stories */}
        <div className="app-card p-4">
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            <StoryCircle isSelf selfUser={user} />
            {stories.map(story => <StoryCircle key={story.id} story={story} />)}
          </div>
        </div>

        <PostComposer onPost={handleNewPost} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          {localPosts.map(post => <motion.div variants={itemVariants} key={post.id}><PostCard post={post} onDelete={handleDeletePost} /></motion.div>)}
        </motion.div>

        {/* Sentinel for Infinite Scroll */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {loadingMore && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {!hasMore && localPosts.length > 0 && (
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">End of transmissions</div>
          )}
        </div>

        {localPosts.length === 0 && !loadingMore && (
          <div className="rounded-2xl border border-primary/15 bg-card p-12 text-center shadow-sm">
            <Rss className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-headline text-lg font-bold text-foreground mb-2">No transmissions</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The node is silent. Share your data first.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Hidden on smaller screens */}
      <aside className="hidden lg:block w-[320px] space-y-6">
        <div className="app-card">
          <div className="p-6 border-b border-primary/10 flex items-center justify-between">
             <h3 className="font-headline text-lg font-bold text-foreground tracking-wide">Trending Skills</h3>
             <div className="flex items-center gap-1.5">
               <Circle className="h-2 w-2 fill-[#22c55e] text-[#22c55e] animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{onlineCount} online</span>
             </div>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {trendingSkills.slice(0, 6).map((skill, i) => (
                <li key={skill.id} className="flex items-center justify-between text-sm group">
                  <span className="font-bold text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{i + 1}.</span>
                    {skill.icon && <span>{skill.icon}</span>}
                    {skill.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded-md">
                    <ArrowUp className="h-3 w-3" /> {skill.growthPercent}%
                  </span>
                </li>
              ))}
              {trendingSkills.length === 0 && (
                <li className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center py-2">No trending data yet</li>
              )}
            </ul>
          </div>
        </div>

        <div className="app-card">
          <div className="p-6 border-b border-primary/10">
             <h3 className="font-headline text-lg font-bold text-foreground tracking-wide">Suggested To Follow</h3>
          </div>
          <div className="p-6 space-y-5">
              {suggestions.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/15 shadow-sm cursor-pointer" onClick={() => navigate(`/profile/${u.id}`)}>
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="font-bold bg-primary/20 text-primary">{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/profile/${u.id}`)}>{u.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{u.reason}</p>
                  </div>
                  {relationshipStatuses[u.id] === 'CONNECTED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 bg-green-500/10 hover:bg-green-500/20 text-green-500 hover:text-green-600 border border-green-500/20"
                      onClick={() => navigate(`/profile/${u.id}`)}
                    >
                      Connected
                    </Button>
                  ) : relationshipStatuses[u.id] === 'PENDING_SENT' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 border-primary/20 text-muted-foreground bg-primary/5 opacity-75"
                    >
                      Sent
                    </Button>
                  ) : relationshipStatuses[u.id] === 'PENDING_RECEIVED' ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 bg-[#22c55e] text-white hover:bg-[#1ebd53] shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                      onClick={() => handleConnect(u.id)}
                    >
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 border-primary/20 hover:bg-primary/5 hover:text-primary text-muted-foreground"
                      onClick={() => handleConnect(u.id)}
                    >
                      + Connect
                    </Button>
                  )}
                </div>
              ))}
              {suggestions.length === 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center py-2">Add skills to get suggestions</p>
              )}
          </div>
        </div>
      </aside>
    </div>
  );
};

// --- EVENTS TAB COMPONENTS ---
const EventCard = React.memo(({
  event,
  currentUserId,
  busy,
  onAttend,
}: {
  event: Event;
  currentUserId?: string;
  busy?: boolean;
  onAttend: (event: Event) => Promise<void>;
}) => {
  const attending = Boolean(currentUserId && event.attendees?.some(attendee => attendee.id === currentUserId));
  const attendeeCount = event.attendees?.length ?? 0;

  return (
    <div className="product-row group grid gap-4 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className={cn('rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest', attending ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-primary/25 bg-primary/10 text-primary')}>
            {attending ? 'Registered' : 'Upcoming'}
          </Badge>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {event.isOnline ? 'Online' : 'In person'}
          </span>
        </div>
        <h3 className="truncate font-headline text-lg font-extrabold text-foreground group-hover:text-primary">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {event.description || 'Skill-focused community session.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(event.skills ?? []).slice(0, 4).map(skill => (
            <Badge key={skill.id} variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-2 text-sm text-foreground/90">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{new Date(event.eventDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-secondary" />
          <span className="truncate">{event.isOnline ? 'Online event' : event.location || 'Location pending'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{attendeeCount} attending</span>
        </div>
      </div>

      <Button
        size="sm"
        disabled={busy || attending}
        className={cn(
          'rounded-xl px-5 text-[10px] font-bold uppercase tracking-widest',
          attending ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15' : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        onClick={() => onAttend(event)}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : attending ? 'Going' : 'Register'}
      </Button>
    </div>
  )
});
EventCard.displayName = 'EventCard';

const EventsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendBusy, setAttendBusy] = useState<Record<string, boolean>>({});
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    isOnline: true,
    skillIds: [] as string[],
  });
  const filterChips = ['All', 'Online', 'In-Person'];

  const loadEvents = useCallback(async () => {
    const response = await CommunityService.getEvents();
    setEvents(response.content ?? []);
  }, []);

  useEffect(() => {
    loadEvents().catch(() => {});
    SkillService.getAll().then(setSkills).catch(() => {});
  }, [loadEvents]);

  const filteredEvents = events.filter(event => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Online') return event.isOnline;
    if (activeFilter === 'In-Person') return !event.isOnline;
    return true;
  });

  const handleAttend = async (event: Event) => {
    setAttendBusy(prev => ({ ...prev, [event.id]: true }));
    try {
      await CommunityService.attendEvent(event.id);
      await loadEvents();
      toast({ title: 'Registration confirmed', description: `You are going to ${event.title}.`, variant: 'success' });
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAttendBusy(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.eventDate) {
      toast({ title: 'Event title and time are required', variant: 'destructive' });
      return;
    }
    if (new Date(eventForm.eventDate).getTime() <= Date.now()) {
      toast({ title: 'Choose a future event time', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await CommunityService.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        eventDate: eventForm.eventDate,
        location: eventForm.isOnline ? 'Online' : eventForm.location.trim(),
        isOnline: eventForm.isOnline,
        coverGradient: 'from-slate-950 via-slate-900 to-primary/30',
        skillIds: eventForm.skillIds,
      });
      setEvents(prev => [created, ...prev]);
      setCreateOpen(false);
      setEventForm({ title: '', description: '', eventDate: '', location: '', isOnline: true, skillIds: [] });
      toast({ title: 'Event created', description: 'Your event is live in the community.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Could not create event',
        description: error instanceof Error ? error.message : 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="product-panel overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live learning calendar</span>
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-foreground">Events that turn community into sessions</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Create workshops, register attendance, and keep events tied to real skills and members.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {filterChips.map(chip => (
              <Button
                key={chip}
                variant={activeFilter === chip ? 'default' : 'outline'}
                className={cn(
                  'rounded-xl text-[10px] font-bold uppercase tracking-widest',
                  activeFilter === chip ? 'bg-primary text-primary-foreground' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                )}
                onClick={() => setActiveFilter(chip)}
              >
                {chip}
              </Button>
            ))}
            <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create event
            </Button>
          </div>
        </div>
      </div>

      <div className="product-panel overflow-hidden">
        <div className="product-table">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              currentUserId={user?.id}
              busy={attendBusy[event.id]}
              onAttend={handleAttend}
            />
          ))}
          {filteredEvents.length === 0 && (
            <div className="product-empty">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-bold text-foreground">No events found</p>
              <p className="mt-1 text-sm text-muted-foreground">Create one for this community lane.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create event</DialogTitle>
            <DialogDescription>Publish a skill-focused event with a real date, location, and target skills.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input id="event-title" value={eventForm.title} onChange={event => {
                const value = event.currentTarget.value;
                setEventForm(prev => ({ ...prev, title: value }));
              }} placeholder="Portfolio review night" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date and time</Label>
                <Input
                  id="event-date"
                  type="datetime-local"
                  value={eventForm.eventDate}
                  onInput={event => {
                    const value = event.currentTarget.value;
                    setEventForm(prev => ({ ...prev, eventDate: value }));
                  }}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setEventForm(prev => ({ ...prev, eventDate: value }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: true, label: 'Online' },
                    { value: false, label: 'In person' },
                  ].map(option => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, isOnline: option.value }))}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm font-semibold transition-all',
                        eventForm.isOnline === option.value ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {!eventForm.isOnline && (
              <div className="space-y-2">
                <Label htmlFor="event-location">Location</Label>
                <Input id="event-location" value={eventForm.location} onChange={event => {
                  const value = event.currentTarget.value;
                  setEventForm(prev => ({ ...prev, location: value }));
                }} placeholder="Campus lab, room 204" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" rows={3} value={eventForm.description} onChange={event => {
                const value = event.currentTarget.value;
                setEventForm(prev => ({ ...prev, description: value }));
              }} placeholder="What people will practice, build, or review..." />
            </div>
            <div className="space-y-2">
              <Label>Target skills</Label>
              <SkillPicker skills={skills} selected={eventForm.skillIds} onChange={ids => setEventForm(prev => ({ ...prev, skillIds: ids }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Publish event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- SKILL CIRCLES TAB ---
const ACTIVITY_LABELS: Record<string, string> = {
  VERY_ACTIVE: '🔥 Very Active',
  ACTIVE: '⚡ Active',
  QUIET: '😴 Quiet',
};

const CircleCard = React.memo(({
  circle,
  currentUserId,
  busy,
  onJoin,
  onLeave,
}: {
  circle: SkillCircle;
  currentUserId?: string;
  busy?: boolean;
  onJoin: (circle: SkillCircle) => Promise<void>;
  onLeave: (circle: SkillCircle) => Promise<void>;
}) => {
  const joined = Boolean(currentUserId && circle.members?.some(member => member.id === currentUserId));
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);
  const { toast } = useToast();
  return (
    <>
      <div className="group relative overflow-hidden h-full flex flex-col rounded-2xl border border-primary/15 bg-card backdrop-blur-xl transition-all duration-300 hover:border-primary/20 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="p-6 flex-grow flex flex-col relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 text-4xl shadow-[0_0_15px_hsl(var(--primary)/0.2)] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 backdrop-blur-md">
              {circle.icon}
            </div>
            <Badge 
              variant="secondary"
              className={cn(
                'px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-primary/20 backdrop-blur-md',
                circle.activity === 'VERY_ACTIVE' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]' : 
                circle.activity === 'QUIET' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 
                'bg-primary/10 text-foreground hover:bg-primary/15'
              )}
            >
              {ACTIVITY_LABELS[circle.activity] ?? circle.activity}
            </Badge>
          </div>
          <h3 className="mt-6 text-2xl font-extrabold font-headline leading-tight text-foreground hover:text-primary transition-colors cursor-pointer drop-shadow-sm">{circle.name}</h3>
          <div className="flex flex-wrap gap-2 mt-4">
            {circle.skills.map(skill => (
              <Badge key={skill.id} variant="outline" className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all text-foreground/80 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                {skill.name}
              </Badge>
            ))}
          </div>
          <div className="flex-grow" />
          
          <div className="mt-6 bg-background p-4 rounded-2xl border border-primary/15 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Members</span>
                <div className="flex items-center -space-x-2 mt-1">
                  {circle.members.slice(0, 4).map((m, index) => (
                    <Avatar
                      key={m.id}
                      className="h-7 w-7 border-[2px] border-black/80 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-110 transition-transform relative hover:z-20"
                      style={{ zIndex: 10 - index }}
                    >
                      <AvatarImage src={m.avatar} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {circle.members.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-black/80 bg-primary/10 text-[10px] font-bold text-foreground shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 backdrop-blur-sm">
                      +{circle.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground block mb-1">Total</span>
                <p className="text-xl font-headline font-extrabold text-foreground">{circle.memberCount}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary/70" />
              Last session: {circle.lastSession ? new Date(circle.lastSession).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </span>
          </div>

          <div className="mt-5 flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-primary/20 border-dashed hover:border-solid hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground h-10"
              onClick={() => toast({ title: circle.name, description: `${circle.memberCount} members · ${ACTIVITY_LABELS[circle.activity] ?? circle.activity}` })}
            >
              Preview
            </Button>
            <Button
              size="sm"
              className={cn(
                'flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all h-10',
                joined 
                  ? 'border border-primary/30 text-primary bg-primary/10 hover:bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.2)]' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)]'
              )}
              onClick={async () => {
                if (joined) {
                  setLeaveConfirmOpen(true);
                } else {
                  await onJoin(circle);
                }
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : joined ? 'Leave Circle' : 'Join Circle'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title={`Leave ${circle.name}?`}
        description="You can rejoin this circle any time, but you'll lose your spot in active sessions."
        confirmLabel="Leave circle"
        cancelLabel="Stay"
        variant="destructive"
        onConfirm={() => onLeave(circle)}
      />
    </>
  );
});
CircleCard.displayName = 'CircleCard';

const SkillCirclesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circles, setCircles] = useState<SkillCircle[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [circleForm, setCircleForm] = useState({ name: '', icon: 'SE', skillIds: [] as string[] });

  useEffect(() => {
    CommunityService.getSkillCircles().then((r) => setCircles(r.content ?? [])).catch(() => {});
    SkillService.getAll().then(setSkills).catch(() => {});
  }, []);

  const updateCircle = (updated: SkillCircle) => {
    setCircles(prev => prev.map(circle => circle.id === updated.id ? updated : circle));
  };

  const handleJoin = async (circle: SkillCircle) => {
    setBusy(prev => ({ ...prev, [circle.id]: true }));
    try {
      const updated = await CommunityService.joinCircle(circle.id);
      updateCircle(updated);
      toast({ title: `Joined ${circle.name}`, description: 'You can now participate in this skill circle.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Failed to join circle', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(prev => {
        const next = { ...prev };
        delete next[circle.id];
        return next;
      });
    }
  };

  const handleLeave = async (circle: SkillCircle) => {
    setBusy(prev => ({ ...prev, [circle.id]: true }));
    try {
      const updated = await CommunityService.leaveCircle(circle.id);
      updateCircle(updated);
      toast({ title: `Left ${circle.name}` });
    } catch (error) {
      toast({ title: 'Could not leave circle', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(prev => {
        const next = { ...prev };
        delete next[circle.id];
        return next;
      });
    }
  };

  const handleCreateCircle = async () => {
    if (!circleForm.name.trim()) {
      toast({ title: 'Circle name is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await CommunityService.createSkillCircle({
        name: circleForm.name.trim(),
        icon: circleForm.icon.trim() || 'SE',
        skillIds: circleForm.skillIds,
      });
      setCircles(prev => [created, ...prev]);
      setCreateOpen(false);
      setCircleForm({ name: '', icon: 'SE', skillIds: [] });
      toast({ title: 'Skill circle created', description: 'The circle is ready for members.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not create circle', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="product-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-foreground">Skill circles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Focused spaces for repeat learning, practice, and community support.</p>
          </div>
          <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create circle
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-[2rem] border-2 border-dashed border-primary/25 bg-background backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 min-h-[300px] cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] h-full"
        >
          <div className="h-20 w-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]">
            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="mt-6 font-extrabold font-headline text-xl text-foreground group-hover:text-primary transition-colors">Create New Circle</h3>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Start a new community</p>
        </button>
        {circles.map(circle => (
          <CircleCard
            key={circle.id}
            circle={circle}
            currentUserId={user?.id}
            busy={busy[circle.id]}
            onJoin={handleJoin}
            onLeave={handleLeave}
          />
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create skill circle</DialogTitle>
            <DialogDescription>Build a focused group around a few skills so people know why they should join.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="circle-name">Circle name</Label>
                <Input id="circle-name" value={circleForm.name} onChange={event => {
                  const value = event.currentTarget.value;
                  setCircleForm(prev => ({ ...prev, name: value }));
                }} placeholder="Frontend Practice Lab" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-icon">Mark</Label>
                <Input id="circle-icon" maxLength={8} value={circleForm.icon} onChange={event => {
                  const value = event.currentTarget.value;
                  setCircleForm(prev => ({ ...prev, icon: value }));
                }} placeholder="UI" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <SkillPicker skills={skills} selected={circleForm.skillIds} onChange={ids => setCircleForm(prev => ({ ...prev, skillIds: ids }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCircle} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Create circle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- DISCUSSIONS TAB ---
const DiscussionCard = React.memo(({ discussion: d }: { discussion: Discussion }) => {
  const [localUpvotes, setLocalUpvotes] = React.useState(d.upvotes);
  const [upvoted, setUpvoted] = React.useState(Boolean(d.isUpvotedByViewer));

  const handleUpvote = async () => {
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setLocalUpvotes(n => Math.max(0, wasUpvoted ? n - 1 : n + 1));
    try {
      const updated = await CommunityService.upvoteDiscussion(d.id);
      setUpvoted(Boolean(updated.isUpvotedByViewer));
      setLocalUpvotes(updated.upvotes ?? 0);
    } catch {
      setUpvoted(wasUpvoted);
      setLocalUpvotes(n => Math.max(0, wasUpvoted ? n + 1 : n - 1));
    }
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-primary/15 bg-card backdrop-blur-xl transition-all duration-300 hover:border-primary/20 cursor-pointer flex flex-col justify-center shadow-sm",
        d.isPinned ? "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-primary/15 hover:border-primary/40"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
      <div className="p-6 flex items-start gap-5 relative z-10">
        <div 
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 shrink-0 min-w-[64px] min-h-[64px] shadow-sm hover:scale-105 active:scale-95 backdrop-blur-md",
            upvoted ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]" : "bg-card border-primary/20 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/10"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleUpvote();
          }}
        >
          <ArrowUp
            className={cn("h-6 w-6 transition-transform duration-300", upvoted && "text-primary -translate-y-1 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]")}
          />
          <span className="font-extrabold font-headline text-base leading-none">{localUpvotes}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            {d.isPinned && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)] flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            )}
            <Badge variant="secondary" className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-primary/20">
              {d.category}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-auto hidden sm:inline-block">
              {d.createdAt}
            </span>
          </div>
          <h3 className="font-headline font-extrabold text-lg sm:text-xl leading-snug text-foreground group-hover:text-primary transition-colors pr-2 line-clamp-2 drop-shadow-sm">
            {d.title}
          </h3>
          <div className="mt-4 flex items-center flex-wrap gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 cursor-pointer group-hover/author:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8 ring-2 ring-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:ring-primary/30 transition-all">
                <AvatarImage src={d.author.avatar} className="object-cover" />
                <AvatarFallback className="font-bold text-[10px] bg-primary/20 text-primary">{d.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-foreground/80 hover:text-primary transition-colors">{d.author.name}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-l border-primary/20 pl-4">
              <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                <div className="h-6 w-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20 shadow-[0_0_8px_rgba(var(--secondary-color),0.2)]"><MessageSquare className="h-3 w-3" /></div>
                {d.replies} <span className="hidden sm:inline">replies</span>
              </div>
              <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/15 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
                {d.views} <span className="hidden sm:inline">views</span>
              </div>
              <span className="sm:hidden ml-auto text-[10px]">{d.createdAt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
DiscussionCard.displayName = 'DiscussionCard';

const DiscussionsTab = () => {
  const { toast } = useToast();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const categories = ['All', 'General', 'Skill Tips', 'Success Stories', 'Help & Support', 'Announcements'];
  const [activeCategory, setActiveCategory] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '', category: 'General' });

  useEffect(() => {
    CommunityService.getDiscussions().then((r) => setDiscussions(r.content ?? [])).catch(() => {});
  }, []);

  const handleCreateDiscussion = async () => {
    if (!discussionForm.title.trim() || !discussionForm.content.trim()) {
      toast({ title: 'Title and details are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await CommunityService.createDiscussion({
        title: discussionForm.title.trim(),
        content: discussionForm.content.trim(),
        category: discussionForm.category,
      });
      setDiscussions(prev => [created, ...prev]);
      setDiscussionForm({ title: '', content: '', category: 'General' });
      setCreateOpen(false);
      toast({ title: 'Discussion started', description: 'The community can now respond.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not start discussion', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="col-span-1">
        <div className="rounded-2xl border border-primary/15 bg-card backdrop-blur-xl shadow-sm p-4 space-y-2">
            <Button className="mb-3 w-full rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              New discussion
            </Button>
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:bg-primary/90" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
        </div>
      </aside>
      <main className="col-span-1 lg:col-span-3 space-y-6">
        {discussions
          .filter(d => activeCategory === 'All' || d.category === activeCategory)
          .map(d => (
            <DiscussionCard key={d.id} discussion={d} />
          ))}
        {discussions.filter(d => activeCategory === 'All' || d.category === activeCategory).length === 0 && (
          <div className="rounded-2xl border border-primary/15 bg-card backdrop-blur-xl p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-headline text-lg font-bold text-foreground mb-2">No discussions found</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Be the first to start a conversation in this category!</p>
          </div>
        )}
      </main>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start discussion</DialogTitle>
            <DialogDescription>Ask a specific question or share a useful topic for the community.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="discussion-title">Title</Label>
              <Input id="discussion-title" value={discussionForm.title} onChange={event => {
                const value = event.currentTarget.value;
                setDiscussionForm(prev => ({ ...prev, title: value }));
              }} placeholder="How do I practice UI critique faster?" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.filter(cat => cat !== 'All').map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setDiscussionForm(prev => ({ ...prev, category }))}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                      discussionForm.category === category ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discussion-content">Details</Label>
              <Textarea id="discussion-content" rows={5} value={discussionForm.content} onChange={event => {
                const value = event.currentTarget.value;
                setDiscussionForm(prev => ({ ...prev, content: value }));
              }} placeholder="Add context, what you tried, and what kind of answer you need..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDiscussion} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---

export default function CommunityPage() {
  useDocumentTitle('Community');
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(defaultTab && tabs.some((tab) => tab.id === defaultTab) ? defaultTab : tabs[0].id);
  const [onlineCount, setOnlineCount] = useState(0);
  const intentFilter = searchParams.get('intent') ?? undefined;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    CommunityService.getOnlineCount()
      .then(r => setOnlineCount(r.count ?? 0))
      .catch(() => {});
    
    // Refresh online count every 2 minutes
    const timer = setInterval(() => {
      CommunityService.getOnlineCount()
        .then(r => setOnlineCount(r.count ?? 0))
        .catch(() => {});
    }, 120000);
    return () => clearInterval(timer);
  }, []);

  return (
    <DashboardLayout>
      <div className="product-page space-y-5">
        <div className="product-header relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] md:block">
            <img src={appVisuals.communityCollaboration} alt="Members collaborating on skill exchange sessions" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/65 to-transparent" />
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <h1 className="product-title">Community Hub</h1>
              <p className="product-subtitle">Join discussions, attend sessions, and connect with people trading skills across design, tech, language, business, and creative work.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/80 border border-primary/20 shadow-[0_8px_22px_-18px_hsl(var(--primary)/0.5)]">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{onlineCount} members online</span>
            </div>
          </div>
        </div>

        <div>
          <div className="product-toolbar">
            <div className="flex gap-4 overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "product-tab flex flex-shrink-0 items-center gap-2 whitespace-nowrap outline-none",
                    activeTab === tab.id ? 'product-tab-active' : ''
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="community-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 20, opacity: 0, filter: 'blur(5px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -20, opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-5"
            >
              {activeTab === 'feed' && <FeedTab intentFilter={intentFilter} onlineCount={onlineCount} />}
              {activeTab === 'events' && <EventsTab />}
              {activeTab === 'circles' && <SkillCirclesTab />}
              {activeTab === 'discussions' && <DiscussionsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
