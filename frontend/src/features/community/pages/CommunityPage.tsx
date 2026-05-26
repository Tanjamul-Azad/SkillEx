
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss,
  Calendar,
  Users,
  MessageSquare,
  Plus,
  Heart,
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
import type { Post, Story, TrendingSkill, SuggestedUser, Discussion, Event, SkillCircle } from '@/types';
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
const EventCard = React.memo(({ event }: { event: Event }) => {
  const [interested, setInterested] = React.useState(false);
  const { toast } = useToast();
  return (
    <div className="group relative overflow-hidden h-full flex flex-col rounded-2xl border border-primary/15 bg-card backdrop-blur-xl transition-all duration-300 hover:border-primary/20 shadow-sm">
      <div className={cn("relative h-[220px] w-full flex flex-col justify-end p-5 overflow-hidden shrink-0", event.coverGradient)}>
        <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=400&q=80" alt="Event Cover" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-50 transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
        <div className="relative z-20 flex flex-col gap-2">
          <Badge className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30 backdrop-blur-md border border-red-500/30 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            UPCOMING
          </Badge>
          <h3 className="font-headline text-2xl font-extrabold text-foreground leading-tight drop-shadow-md">{event.title}</h3>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 relative z-20 bg-transparent">
        {/* Compact Details Row */}
        <div className="flex items-start justify-between gap-3 mb-4 border-b border-primary/15 pb-4">
          <div className="space-y-2 mt-1">
            <div className="flex items-center gap-2 text-foreground/90 font-bold text-sm">
              <Calendar className="h-4 w-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-color),0.5)]" />
              {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 text-foreground/90 font-bold text-sm">
              <MapPin className="h-4 w-4 text-secondary drop-shadow-[0_0_8px_rgba(var(--secondary-color),0.5)]" />
              {event.isOnline ? `Online Event` : event.location}
            </div>
          </div>
          <div className="text-right flex flex-col items-end shrink-0">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Hosted By</p>
             <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
               <Avatar className="h-8 w-8 ring-2 ring-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                 <AvatarImage src={event.host.avatar} className="object-cover" />
                 <AvatarFallback className="font-bold text-xs bg-primary/20 text-primary">{event.host.name.charAt(0)}</AvatarFallback>
               </Avatar>
               <p className="font-bold text-sm leading-tight text-foreground hover:text-primary transition-colors">{event.host.name.split(' ')[0]}</p>
             </div>
          </div>
        </div>

        {/* Compact Target Skills */}
        <div className="mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-1">Target Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {event.skills.slice(0, 3).map(skill => (
              <Badge key={skill.id} variant="secondary" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-primary/15 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                {skill.name}
              </Badge>
            ))}
            {event.skills.length > 3 && (
              <Badge variant="secondary" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-foreground/60 border border-primary/15 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                +{event.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-grow" />

        {/* Going & Buttons row */}
        <div className="mt-5 pt-4 border-t border-primary/20 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Going</span>
            <div className="flex items-center -space-x-2">
              {event.attendees.slice(0, 3).map((att, index) => (
                <Avatar
                  key={att.id}
                  className="h-7 w-7 border-[2px] border-black/80 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-110 transition-transform relative hover:z-20"
                  style={{ zIndex: 10 - index }}
                >
                  <AvatarImage src={att.avatar} className="object-cover" />
                  <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{att.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              {event.attendees.length > 3 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-black/80 bg-primary/10 text-[10px] font-bold text-foreground shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 backdrop-blur-sm">
                  +{event.attendees.length - 3}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 flex-1 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className={cn('h-9 rounded-xl border border-primary/20 border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary transition-all font-bold uppercase tracking-widest text-[10px] px-3 text-muted-foreground', interested && 'bg-red-500/10 text-red-500 border-red-500/30 border-solid shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20 hover:text-red-500')} 
              onClick={async () => {
                const wasInterested = interested;
                setInterested(!wasInterested);
                try {
                  await CommunityService.attendEvent(event.id);
                } catch {
                  setInterested(wasInterested);
                }
              }}
            >
              <Heart className={cn('mr-2 h-4 w-4 transition-all', interested && 'fill-red-500 text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]')} /> Interested
            </Button>
            <Button 
              size="sm"
              className="h-9 rounded-xl text-[10px] font-bold uppercase tracking-widest px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)]"
              onClick={async () => {
                try {
                  await CommunityService.attendEvent(event.id);
                  toast({ title: 'Registration confirmed!', description: `See you at ${event.title}!`, variant: 'default' });
                } catch {
                  toast({ title: 'Registration failed', description: 'Please try again.', variant: 'destructive' });
                }
              }}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
});
EventCard.displayName = 'EventCard';

const EventsTab = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const filterChips = ['All', 'Online', 'In-Person', 'Workshop', 'Meetup'];
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    CommunityService.getEvents().then((r) => setEvents(r.content ?? [])).catch(() => {});
  }, []);

  const featuredEvent = events[0];
  const filteredEvents = events.filter(event => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Online') return event.isOnline;
    if (activeFilter === 'In-Person') return !event.isOnline;
    return true;
  });

  return (
    <div className="space-y-6">
      {featuredEvent ? (
        <div className={cn("relative h-64 rounded-[2rem] overflow-hidden p-8 flex flex-col justify-end text-foreground shadow-[0_0_30px_rgba(0,0,0,0.5)] group border border-primary/20", featuredEvent.coverGradient)}>
          <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80" alt="Featured Event" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-50 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
          <div className="relative z-20">
            <Badge className="mb-4 bg-primary text-primary-foreground border-none shadow-[0_0_15px_hsl(var(--primary)/0.5)] text-[10px] font-bold uppercase tracking-widest px-3 py-1">FEATURED EVENT</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-headline drop-shadow-[0_4px_10px_rgba(0,0,0,1)] tracking-tight">{featuredEvent.title}</h2>
            <p className="mt-3 text-foreground font-bold text-sm tracking-wide flex items-center gap-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]"><Calendar className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" /> {new Date(featuredEvent.eventDate).toDateString()}</p>
          </div>
        </div>
      ) : (
        <div className="h-48 rounded-[2rem] border border-primary/15 bg-card backdrop-blur-xl flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">Loading events...</div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
        {filterChips.map(chip => (
          <Button 
            key={chip} 
            variant={activeFilter === chip ? 'default' : 'outline'} 
            className={cn(
              "rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeFilter === chip 
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:bg-primary/90" 
                : "border-primary/20 bg-card text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/25"
            )}
            onClick={() => setActiveFilter(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEvents.map(event => <motion.div variants={itemVariants} key={event.id} className="h-full"><EventCard event={event} /></motion.div>)}
      </motion.div>
    </div>
  )
}

// --- SKILL CIRCLES TAB ---
const ACTIVITY_LABELS: Record<string, string> = {
  VERY_ACTIVE: '🔥 Very Active',
  ACTIVE: '⚡ Active',
  QUIET: '😴 Quiet',
};

const CircleCard = React.memo(({ circle }: { circle: SkillCircle }) => {
  const [joined, setJoined] = React.useState(false);
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
                  try {
                    await CommunityService.joinCircle(circle.id);
                    setJoined(true);
                    toast({ title: `Joined ${circle.name}!`, description: 'You can now participate in this skill circle.', variant: 'default' });
                  } catch {
                    toast({ title: 'Failed to join circle', variant: 'destructive' });
                  }
                }
              }}
            >
              {joined ? 'Leave Circle' : 'Join Circle'}
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
        onConfirm={() => { setJoined(false); toast({ title: `Left ${circle.name}` }); }}
      />
    </>
  );
});
CircleCard.displayName = 'CircleCard';

const SkillCirclesTab = () => {
  const [circles, setCircles] = useState<SkillCircle[]>([]);

  useEffect(() => {
    CommunityService.getSkillCircles().then((r) => setCircles(r.content ?? [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold font-headline text-foreground tracking-tight drop-shadow-md">Join Skill Circles</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Exchange skills and grow together in topic-focused groups.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="rounded-[2rem] border-2 border-dashed border-primary/25 bg-background backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 min-h-[300px] cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] h-full">
          <div className="h-20 w-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]">
            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="mt-6 font-extrabold font-headline text-xl text-foreground group-hover:text-primary transition-colors">Create New Circle</h3>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Start a new community</p>
        </div>
        {circles.map(circle => <CircleCard key={circle.id} circle={circle} />)}
      </div>
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
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const categories = ['All', 'General', 'Skill Tips', 'Success Stories', 'Help & Support', 'Announcements'];
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    CommunityService.getDiscussions().then((r) => setDiscussions(r.content ?? [])).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="col-span-1">
        <div className="rounded-2xl border border-primary/15 bg-card backdrop-blur-xl shadow-sm p-4 space-y-2">
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
      <div className="container mx-auto p-4 md:p-7 space-y-7">
        <div className="app-shell relative overflow-hidden p-5 md:p-7">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] md:block">
            <img src={appVisuals.communityCollaboration} alt="Members collaborating on skill exchange sessions" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/65 to-transparent" />
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Community Hub</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Join discussions, attend sessions, and connect with people trading skills across design, tech, language, business, and creative work.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-primary/20 shadow-[0_8px_22px_-18px_hsl(var(--primary)/0.5)]">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{onlineCount} members online</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="border-b border-primary/15">
            <div className="flex space-x-6 overflow-x-auto custom-scrollbar pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-shrink-0 whitespace-nowrap py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-colors outline-none flex items-center gap-2",
                    activeTab === tab.id ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.35)]' : 'text-muted-foreground hover:text-primary'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="community-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
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
              className="mt-8"
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
