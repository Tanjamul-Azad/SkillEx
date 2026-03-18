
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss,
  Calendar,
  Users,
  MessageSquare,
  Plus,
  Image as ImageIcon,
  Tag,
  HelpCircle,
  Heart,
  Share2,
  Bookmark,
  ArrowUp,
  MapPin,
  MoreHorizontal,
  Circle,
  Pin,
  Play,
  Flag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CommunityService } from '@/services/communityService';
import { SkillService } from '@/services/skillService';
import { UserService } from '@/services/userService';
import type { Story, Post, Event, SkillCircle, Discussion, User } from '@/types';
import DashboardLayout from '@/components/layout/DashboardLayout';

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

const StoryCircle = React.memo(({ story, isSelf, selfUser }: { story?: Story; isSelf?: boolean, selfUser?: User | null }) => {
  if (isSelf && selfUser) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="relative h-16 w-16 rounded-full flex items-center justify-center border-2 border-dashed border-primary cursor-pointer transition-transform hover:scale-105">
          <Avatar className="h-14 w-14">
            <AvatarImage src={selfUser.avatar} />
            <AvatarFallback>{selfUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
        <span className="text-xs font-medium">Add Story</span>
      </div>
    );
  }

  if (!story) return null;

  const userName = story.user.name.split(' ')[0] || story.user.name;

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
      <div className={cn("h-16 w-16 rounded-full p-0.5 flex items-center justify-center transition-all duration-300 group-hover:scale-105", story.isSeen ? 'bg-white/10' : 'bg-gradient-to-tr from-primary to-secondary shadow-glow-sm')}>
        <Avatar className="h-[58px] w-[58px] border-2 border-background">
          <AvatarImage src={story.user.avatar} />
          <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs truncate w-16 text-center">{userName}</span>
    </div>
  );
});
StoryCircle.displayName = 'StoryCircle';


const POST_TYPES = [
  { id: 'regular', label: 'Post', icon: MessageSquare },
  { id: 'question', label: 'Question', icon: HelpCircle },
  { id: 'showcase', label: 'Showcase', icon: Tag },
] as const;
type PostType = typeof POST_TYPES[number]['id'];

const PostComposer = React.memo(({ onPost }: { onPost: (post: Post) => void }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [focused, setFocused] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('regular');
  const [submitting, setSubmitting] = useState(false);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedPreview(URL.createObjectURL(file));
    setFocused(true);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    try {
      const typeMap: Record<PostType, string> = { regular: 'EXCHANGE', question: 'QUESTION', showcase: 'SHOWCASE' };
      const newPost = await CommunityService.createPost({
        type: typeMap[postType],
        content: content.trim(),
      });
      onPost(newPost);
      setContent('');
      setPostType('regular');
      setFocused(false);
      setAttachedPreview(null);
    } catch {
      toast({ title: 'Failed to post', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5 shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share a skill tip, a win, or ask a question..."
              className="w-full resize-none rounded-2xl glass-subtle px-5 py-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/30 dark:focus:bg-black/30 transition-all shadow-inner"
              rows={focused ? 3 : 1}
            />
            <AnimatePresence>
              {focused && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                      {POST_TYPES.map(({ id, label, icon: Icon }) => (
                        <Button
                          key={id}
                          variant="ghost"
                          size="sm"
                          onClick={() => setPostType(id)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border h-auto',
                            postType === id
                              ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                              : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-transparent'
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs"
                        onClick={() => { setContent(''); setFocused(false); setAttachedPreview(null); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        disabled={!content.trim() || submitting}
                        className="rounded-xl text-xs px-4"
                        onClick={handleSubmit}
                      >
                        {submitting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>

                  {/* Attached image preview */}
                  {attachedPreview && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-border/50 group/img">
                      <img src={attachedPreview} alt="attachment preview" className="w-full max-h-52 object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachedPreview(null)}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAttach} />
        {!focused && (
          <div className="mt-3 flex justify-around border-t border-border/40 pt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Photo/Video
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPostType('question'); setFocused(true); }}>
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Ask Question
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPostType('showcase'); setFocused(true); }}>
              <Tag className="mr-1.5 h-3.5 w-3.5" /> Showcase Skill
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
PostComposer.displayName = 'PostComposer';

const PostCard = React.memo(({ post }: { post: Post }) => {
  const authorName = post.author.name.split(' ')[0] || post.author.name;
  const [liked, setLiked] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [localLikes, setLocalLikes] = React.useState(post.likes);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [postComments, setPostComments] = React.useState<{ id: string; author: string; avatar?: string; text: string; time: string }[]>([]);
  const [localCommentCount, setLocalCommentCount] = React.useState(post.comments);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddComment = () => {
    if (!commentText.trim() || !user) return;
    const c = { id: `c-${Date.now()}`, author: user.name, avatar: user.avatar, text: commentText.trim(), time: 'just now' };
    setPostComments(prev => [...prev, c]);
    setLocalCommentCount(n => n + 1);
    setCommentText('');
  };

  if (deleted) return null;

  return (
    <>
      <Card className="group overflow-hidden glass transition-all hover:shadow-glow-sm duration-400 ease-snappy hover:-translate-y-1">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Avatar className="ring-2 ring-border group-hover:ring-primary/30 transition-all">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.author.name}</p>
              <p className="text-xs text-muted-foreground">{post.createdAt}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 hover:bg-primary/5" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/50 bg-background/80 backdrop-blur-xl shadow-lg">
                <DropdownMenuItem
                  onClick={() => toast({ title: 'Post reported', description: 'Thanks for helping keep SkillEx safe.' })}
                  className="gap-2 cursor-pointer text-sm"
                >
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" /> Report
                </DropdownMenuItem>
                {user?.id === post.author.id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="gap-2 cursor-pointer text-sm text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        <div className="mt-3 text-sm leading-relaxed">
          {post.type === 'achievement' && `🏆 ${authorName} ${post.content}`}
          {post.type === 'exchange' && post.exchangePartners && `✅ ${post.exchangePartners[0].name} and ${post.exchangePartners[1].name} ${post.content}`}
          {post.type === 'question' && `❓ ${post.author.name} ${post.content}`}
          {post.type === 'showcase' && post.content}
        </div>

        {post.type === 'showcase' && (
          <div className="mt-4 relative aspect-video rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white overflow-hidden group/video">
            <div className="absolute inset-0 bg-black/20" />
            <Button size="icon" variant="ghost" className="relative z-10 bg-black/40 backdrop-blur-sm rounded-full h-14 w-14 transition-all group-hover/video:bg-black/60 group-hover/video:scale-110 border border-white/30">
              <Play className="h-7 w-7 fill-white text-white" />
            </Button>
            <Badge className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-border/60">{post.skill?.name}</Badge>
          </div>
        )}
        {post.type === 'achievement' && post.badge && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl p-6 bg-gradient-to-br from-accent/10 to-secondary/10 border border-accent/20">
            <p className="text-5xl">{post.badge.icon}</p>
            <p className="mt-2 text-lg font-bold">{post.badge.name}</p>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground border-b border-border/50 pb-3">
          <div className="flex items-center gap-1">
            <Heart className={cn('h-3.5 w-3.5', liked ? 'fill-red-500 text-red-500' : 'text-red-500/80')} />
            <span>{localLikes} likes</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{localCommentCount} comments</span>
            <span className="text-border">·</span>
            <span>{post.shares} shares</span>
          </div>
        </div>

        <div className="pt-1 flex justify-around -mx-1">
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-xs hover:bg-red-500/5 transition-colors', liked && 'text-red-500')} onClick={async () => {
            const wasLiked = liked;
            setLiked(!wasLiked);
            setLocalLikes(n => wasLiked ? n - 1 : n + 1);
            try {
              await CommunityService.likePost(post.id);
            } catch {
              setLiked(wasLiked);
              setLocalLikes(n => wasLiked ? n + 1 : n - 1);
            }
          }}>
            <Heart className={cn('mr-1.5 h-3.5 w-3.5', liked && 'fill-red-500')} /> Like
          </Button>
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-xs hover:bg-primary/5 transition-colors', commentsOpen && 'text-primary bg-primary/5')} onClick={() => setCommentsOpen(o => !o)}>
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Comment
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs hover:bg-secondary/5 transition-colors" onClick={async () => {
            const url = window.location.href;
            if (navigator.share) { try { await navigator.share({ title: post.author.name, url }); } catch { /* cancelled */ } }
            else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied!', description: 'Post link copied to clipboard.' }); }
          }}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
          </Button>
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-xs hover:bg-accent/5 transition-colors', saved && 'text-accent')} onClick={() => { setSaved(s => !s); toast({ title: saved ? 'Removed from saved' : 'Post saved!', description: saved ? undefined : 'Find it in your saved posts.' }); }}>
            <Bookmark className={cn('mr-1.5 h-3.5 w-3.5', saved && 'fill-current')} /> Save
          </Button>
        </div>

        {/* ── Comments Thread ── */}
        <AnimatePresence>
          {commentsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                {postComments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
                )}
                {postComments.map(c => (
                  <div key={c.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback className="text-[10px]">{c.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold">{c.author}</span>
                        <span className="text-[10px] text-muted-foreground">{c.time}</span>
                      </div>
                      <p className="text-sm leading-snug">{c.text}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-[10px]">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-xl px-3 py-2">
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="shrink-0 disabled:opacity-40 text-primary hover:text-primary/80 transition-colors"
                    >
                      <svg className="h-4 w-4 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this post?"
        description="This post will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="destructive"
        onConfirm={() => { setDeleted(true); toast({ title: 'Post deleted', variant: 'destructive' }); }}
      />
    </>
  );
});
PostCard.displayName = 'PostCard';


const FeedTab = () => {
  const { user } = useAuth();
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<{ id: string; name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    CommunityService.getPosts().then((r) => setLocalPosts(r.content ?? [])).catch(() => {});
    CommunityService.getStories().then(setStories).catch(() => {});
    SkillService.getAll().then((s) => setTrendingSkills(Array.isArray(s) ? s.slice(0, 5) : [])).catch(() => {});
    UserService.getAll(1, 10).then((r) => {
      const list = (r as { content?: User[]; data?: User[] }).content ?? (r as { data?: User[] }).data ?? [];
      setSuggestions(list.slice(0, 3));
    }).catch(() => {});
  }, []);

  const handleNewPost = (post: Post) => {
    setLocalPosts((prev) => [post, ...prev]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <div className="col-span-1 xl:col-span-3 space-y-6">
        {/* Stories */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              <StoryCircle isSelf selfUser={user} />
              {stories.map(story => <StoryCircle key={story.id} story={story} />)}
            </div>
          </CardContent>
        </Card>

        <PostComposer onPost={handleNewPost} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {localPosts.map(post => <motion.div variants={itemVariants} key={post.id}><PostCard post={post} /></motion.div>)}
        </motion.div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden xl:block space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Trending Skills</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {trendingSkills.slice(0, 5).map((skill, i) => (
                <li key={skill.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{i + 1}. {skill.name}</span>
                  <span className="flex items-center text-green-500"><ArrowUp className="h-4 w-4" /> {(i + 1) * 3}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Suggested Connections</CardTitle></CardHeader>
          <CardContent className="space-y-4">
              {suggestions.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar><AvatarImage src={u.avatar} /><AvatarFallback>{u.name.charAt(0)}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.university}</p>
                  </div>
                  <Button size="sm" variant={followedUsers.has(u.id) ? 'default' : 'outline'} className="ml-auto" onClick={() => setFollowedUsers(prev => { const next = new Set(prev); next.has(u.id) ? next.delete(u.id) : next.add(u.id); return next; })}>{followedUsers.has(u.id) ? 'Following' : 'Follow'}</Button>
                </div>
              ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};

// --- EVENTS TAB COMPONENTS ---
const EventCard = React.memo(({ event }: { event: Event }) => {
  const [interested, setInterested] = React.useState(false);
  const { toast } = useToast();
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2 group">
      <div className={cn("relative h-40 w-full flex flex-col justify-end p-4 text-white overflow-hidden", event.coverGradient)}>
        <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=400&q=80" alt="Event Cover" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent z-10" />
        <Badge className="relative z-20 w-fit bg-black/40 text-white backdrop-blur-sm border-white/20">UPCOMING</Badge>
        <h3 className="relative z-20 mt-2 text-xl font-bold text-shadow-lg drop-shadow-md">{event.title}</h3>
      </div>
      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="text-sm space-y-2">
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.isOnline ? `Online via Zoom` : event.location}</p>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">HOST</p>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-6 w-6"><AvatarImage src={event.host.avatar} /><AvatarFallback>{event.host.name.charAt(0)}</AvatarFallback></Avatar>
            <span className="text-sm font-medium">{event.host.name}</span>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">SKILLS</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {event.skills.map(skill => <Badge key={skill.id} variant="secondary">{skill.name}</Badge>)}
          </div>
        </div>
        <div className="flex-grow" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center -space-x-2">
            {event.attendees.slice(0, 5).map(att => (
              <Avatar key={att.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={att.avatar} />
                <AvatarFallback>{att.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">+{event.attendees.length - 5} going</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className={cn('w-full hover:bg-red-500/10', interested && 'bg-red-500/10 text-red-500 border-red-500/30')} onClick={async () => {
            const wasInterested = interested;
            setInterested(!wasInterested);
            try {
              await CommunityService.attendEvent(event.id);
            } catch {
              setInterested(wasInterested);
            }
          }}>
            <Heart className={cn('mr-2', interested && 'fill-red-500 text-red-500')} /> {interested ? 'Interested ✓' : 'Interested'}
          </Button>
          <Button variant="gradient" className="w-full" onClick={() => toast({ title: 'Registration confirmed!', description: `See you at ${event.title}!`, variant: 'success' })}>Register</Button>
        </div>
      </CardContent>
    </Card>
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
        <div className={cn("relative h-56 rounded-2xl overflow-hidden p-8 flex flex-col justify-end text-white shadow-xl group", featuredEvent.coverGradient)}>
          <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80" alt="Featured Event" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
          <div className="relative z-20">
            <Badge className="mb-3 bg-primary text-primary-foreground border-none shadow-glow-sm">FEATURED EVENT</Badge>
            <h2 className="text-3xl md:text-4xl font-bold font-headline drop-shadow-md">{featuredEvent.title}</h2>
            <p className="mt-2 text-white/90 font-medium flex items-center gap-2 drop-shadow-sm"><Calendar className="h-4 w-4" /> {new Date(featuredEvent.eventDate).toDateString()}</p>
          </div>
        </div>
      ) : (
        <div className="h-48 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">Loading events...</div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterChips.map(chip => (
          <Button key={chip} variant={activeFilter === chip ? 'default' : 'outline'} onClick={() => setActiveFilter(chip)}>{chip}</Button>
        ))}
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => <motion.div variants={itemVariants} key={event.id}><EventCard event={event} /></motion.div>)}
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
      <Card className="h-full flex flex-col transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2 group">
        <CardContent className="p-6 flex-grow flex flex-col">
          <div className="flex justify-between items-start">
            <div className="p-3 glass-strong rounded-xl text-4xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform">{circle.icon}</div>
            <Badge variant={circle.activity === 'VERY_ACTIVE' ? 'secondary' : circle.activity === 'QUIET' ? 'destructive' : 'default'}>{ACTIVITY_LABELS[circle.activity] ?? circle.activity}</Badge>
          </div>
          <h3 className="mt-4 text-xl font-bold font-headline">{circle.name}</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {circle.skills.map(skill => <Badge key={skill.id} variant="outline">{skill.name}</Badge>)}
          </div>
          <div className="flex-grow" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              {circle.members.slice(0, 5).map(m => <Avatar key={m.id} className="h-8 w-8"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name.charAt(0)}</AvatarFallback></Avatar>)}
            </div>
            <p className="text-sm font-medium">{circle.memberCount} members</p>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Last session: {circle.lastSession ? new Date(circle.lastSession).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</div>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" className="w-full" onClick={() => toast({ title: circle.name, description: `${circle.memberCount} members · ${ACTIVITY_LABELS[circle.activity] ?? circle.activity}` })}>Preview</Button>
            <Button
              variant={joined ? 'outline' : 'gradient'}
              className="w-full"
              onClick={async () => {
                if (joined) {
                  setLeaveConfirmOpen(true);
                } else {
                  try {
                    await CommunityService.joinCircle(circle.id);
                    setJoined(true);
                    toast({ title: `Joined ${circle.name}!`, description: 'You can now participate in this skill circle.', variant: 'success' });
                  } catch {
                    toast({ title: 'Failed to join circle', variant: 'destructive' });
                  }
                }
              }}
            >
              {joined ? 'Leave Circle' : 'Join Circle'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Join Skill Circles</h2>
        <p className="text-muted-foreground">Exchange skills and grow together in topic-focused groups.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 bg-transparent flex flex-col items-center justify-center text-center p-6 min-h-[300px] cursor-pointer hover:shadow-glow-sm hover:-translate-y-2 transition-all duration-400 ease-snappy group relative overflow-hidden">
          <div className="absolute inset-0 border-2 border-dashed border-white/20 dark:border-white/10 rounded-2xl" />
          <div className="p-4 glass-strong rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors z-10"><Plus className="h-8 w-8" /></div>
          <h3 className="mt-4 font-bold">Create New Circle</h3>
          <p className="text-sm text-muted-foreground">Start a new community</p>
        </Card>
        {circles.map(circle => <CircleCard key={circle.id} circle={circle} />)}
      </div>
    </div>
  )
}

// --- DISCUSSIONS TAB ---
const DiscussionCard = React.memo(({ discussion: d }: { discussion: Discussion }) => {
  const [localUpvotes, setLocalUpvotes] = React.useState(d.upvotes);
  const [upvoted, setUpvoted] = React.useState(false);

  const handleUpvote = async () => {
    const wasUpvoted = upvoted;
    setUpvoted(!wasUpvoted);
    setLocalUpvotes(n => wasUpvoted ? n - 1 : n + 1);
    try {
      await CommunityService.upvoteDiscussion(d.id);
    } catch {
      setUpvoted(wasUpvoted);
      setLocalUpvotes(n => wasUpvoted ? n + 1 : n - 1);
    }
  };

  return (
    <Card className={cn("glass transition-all duration-400 hover:shadow-glow-sm hover:-translate-y-1 cursor-pointer", d.isPinned && "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10")}>
      <CardContent className="p-4 flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
          <ArrowUp
            className={cn("h-4 w-4 cursor-pointer hover:text-primary transition-colors", upvoted && "text-primary")}
            onClick={handleUpvote}
          />
          <span className="font-bold text-sm">{localUpvotes}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {d.isPinned && <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1"><Pin className="h-3 w-3" /> Pinned</Badge>}
            <Badge variant="secondary">{d.category}</Badge>
          </div>
          <h3 className="font-bold font-headline mt-1 hover:underline cursor-pointer">{d.title}</h3>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Avatar className="h-5 w-5"><AvatarImage src={d.author.avatar} /><AvatarFallback>{d.author.name.charAt(0)}</AvatarFallback></Avatar> {d.author.name}</div>
            <span>{d.replies} replies</span>
            <span>{d.views} views</span>
            <span>{d.createdAt}</span>
          </div>
        </div>
        <Avatar className="ml-auto hidden sm:block"><AvatarImage src={d.author.avatar} /></Avatar>
      </CardContent>
    </Card>
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
        <Card>
          <CardContent className="p-4 space-y-1">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>
      <main className="col-span-1 lg:col-span-3 space-y-4">
        {discussions.map(d => (
          <DiscussionCard key={d.id} discussion={d} />
        ))}
      </main>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="font-headline text-3xl font-bold tracking-tight text-gradient-animated bg-gradient-to-r from-primary via-secondary to-accent">Community Hub</h1>
          <Badge variant="outline" className="mt-2 md:mt-0 w-fit"><Circle className="mr-2 h-2 w-2 fill-green-500 text-green-500" />847 members online</Badge>
        </div>
        <p className="text-muted-foreground">Join discussions, attend events, and connect with other learners.</p>

        <div className="mt-6">
          <div className="border-b">
            <div className="flex space-x-2 overflow-x-auto">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-shrink-0 whitespace-nowrap py-2 px-3 font-medium transition-colors hover:bg-transparent rounded-none",
                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="mr-2 inline h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="community-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              {activeTab === 'feed' && <FeedTab />}
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
