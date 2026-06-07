import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Rss, ArrowUp, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';
import { StoryCircle } from './StoryCircle';
import { CommunityService } from '@/services/communityService';
import { connectionService } from '@/services/connectionService';
import type { Post, Story, TrendingSkill, SuggestedUser } from '@/types';

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

interface FeedTabProps {
  intentFilter?: string;
  onlineCount: number;
}

export const FeedTab = ({ intentFilter, onlineCount }: FeedTabProps) => {
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
          <div className="surface-raised rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Filtered feed</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">"{intentFilter}"</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-border/50 text-[10px] font-bold uppercase tracking-widest h-8"
              onClick={() => navigate('/community?tab=feed', { replace: true })}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Stories */}
        <div className="surface-raised p-4 rounded-xl">
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
          <div className="surface-flat rounded-xl p-12 text-center">
            <Rss className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-headline text-lg font-bold text-foreground mb-2">No transmissions</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">The node is silent. Share your data first.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Hidden on smaller screens */}
      <aside className="hidden lg:block w-[320px] space-y-6">
        <div className="surface-raised rounded-xl">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
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

        <div className="surface-raised rounded-xl">
          <div className="p-6 border-b border-border/50">
             <h3 className="font-headline text-lg font-bold text-foreground tracking-wide">Suggested To Follow</h3>
          </div>
          <div className="p-6 space-y-5">
              {suggestions.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/50 cursor-pointer" onClick={() => navigate(`/profile/${u.id}`)}>
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
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 border-border/50 text-muted-foreground bg-muted/10 opacity-75"
                    >
                      Sent
                    </Button>
                  ) : relationshipStatuses[u.id] === 'PENDING_RECEIVED' ? (
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 bg-[#22c55e] text-white hover:bg-[#1ebd53] shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                      onClick={() => handleConnect(u.id)}
                    >
                      Accept
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4 border-border/50 hover:bg-primary/5 hover:text-primary text-muted-foreground"
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
