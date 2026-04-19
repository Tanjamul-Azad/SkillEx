
import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
import { useNavigate, useSearchParams } from 'react-router-dom';

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
    <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="mt-0.5 shrink-0 ring-2 ring-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="font-bold bg-primary/20 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share a skill tip, a win, or ask a question..."
              className="w-full resize-none appearance-none rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm placeholder:text-white/30 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all custom-scrollbar"
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
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {POST_TYPES.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPostType(id)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all border outline-none',
                            postType === id
                              ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.2)] scale-[1.02]'
                              : 'border-white/5 bg-black/40 text-muted-foreground hover:border-white/20 hover:text-white hover:bg-white/5'
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
                        onClick={() => { setContent(''); setFocused(false); setAttachedPreview(null); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!content.trim() || submitting}
                        className="rounded-xl text-[10px] uppercase font-bold tracking-widest px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] transition-all"
                        onClick={handleSubmit}
                      >
                        {submitting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>

                  {/* Attached image preview */}
                  {attachedPreview && (
                    <div className="relative mt-4 rounded-xl overflow-hidden border border-white/10 group/img shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                      <img src={attachedPreview} alt="attachment preview" className="w-full max-h-52 object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                      <button
                        type="button"
                        onClick={() => setAttachedPreview(null)}
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-destructive/80 text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/20 hover:border-destructive"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
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
          <div className="mt-4 flex justify-between border-t border-white/5 pt-4">
            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" /> Photo / Video
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all" onClick={() => { setPostType('question'); setFocused(true); }}>
              <HelpCircle className="mr-2 h-4 w-4" /> Ask Question
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all hidden sm:flex" onClick={() => { setPostType('showcase'); setFocused(true); }}>
              <Tag className="mr-2 h-4 w-4" /> Showcase
            </Button>
          </div>
        )}
      </div>
    </div>
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
      <div className="group overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:border-primary/30 relative shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="p-5 sm:p-6 relative z-10">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40 group-hover:scale-105 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
              <AvatarImage src={post.author.avatar} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold">{post.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-headline font-extrabold text-white text-base leading-tight hover:text-primary transition-colors cursor-pointer">{post.author.name}</p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">{post.createdAt}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-lg p-1">
                <DropdownMenuItem
                  onClick={() => toast({ title: 'Post reported', description: 'Thanks for helping keep SkillEx safe.' })}
                  className="gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 focus:bg-white/10 focus:text-white text-muted-foreground hover:text-white"
                >
                  <Flag className="h-3.5 w-3.5" /> Report
                </DropdownMenuItem>
                {user?.id === post.author.id && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10 my-1" />
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Post
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        <div className="mt-4 text-sm leading-relaxed text-white/90">
          {post.type === 'achievement' && `🏆 ${authorName} ${post.content}`}
          {post.type === 'exchange' && post.exchangePartners && `✅ ${post.exchangePartners[0].name} and ${post.exchangePartners[1].name} ${post.content}`}
          {post.type === 'question' && `❓ ${post.author.name} ${post.content}`}
          {post.type === 'showcase' && post.content}
        </div>

        {post.type === 'showcase' && (
          <div className="mt-5 relative aspect-video rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white overflow-hidden group/video border border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.05)]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <Button size="icon" variant="ghost" className="relative z-10 bg-black/60 shadow-[0_0_20px_hsl(var(--primary)/0.3)] backdrop-blur-md rounded-full h-16 w-16 transition-all group-hover/video:bg-primary/80 group-hover/video:scale-110 border border-white/20">
              <Play className="h-8 w-8 fill-white text-white" />
            </Button>
            <Badge className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white border border-white/10">{post.skill?.name}</Badge>
          </div>
        )}
        {post.type === 'achievement' && post.badge && (
          <div className="mt-5 flex flex-col items-center justify-center rounded-2xl p-8 bg-gradient-to-br from-accent/10 to-secondary/10 border border-accent/20 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
            <span className="text-6xl drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">{post.badge.icon}</span>
            <span className="mt-4 text-base font-headline font-extrabold text-white">{post.badge.name}</span>
          </div>
        )}

        <div className="mt-5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/10 pb-4">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Heart className={cn('h-4 w-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]', liked ? 'fill-red-500 text-red-500' : 'text-red-500/80')} />
            <span>{localLikes} likes</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hover:text-white transition-colors cursor-pointer">{localCommentCount} comments</span>
            <span className="text-white/20">·</span>
            <span className="hover:text-white transition-colors cursor-pointer">{post.shares} shares</span>
          </div>
        </div>

        <div className="pt-2 flex justify-between -mx-2">
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 transition-colors', liked && 'text-red-500')} onClick={async () => {
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
            <Heart className={cn('mr-2 h-4 w-4', liked && 'fill-red-500')} /> Like
          </Button>
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors', commentsOpen && 'text-primary bg-primary/10')} onClick={() => setCommentsOpen(o => !o)}>
            <MessageSquare className="mr-2 h-4 w-4" /> Comment
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:flex flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/10 transition-colors text-muted-foreground" onClick={async () => {
            const url = window.location.href;
            if (navigator.share) { try { await navigator.share({ title: post.author.name, url }); } catch { /* cancelled */ } }
            else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied!', description: 'Post link copied to clipboard.' }); }
          }}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button variant="ghost" size="sm" className={cn('flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors', saved ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:bg-accent/10')} onClick={() => { setSaved(s => !s); toast({ title: saved ? 'Removed from saved' : 'Post saved!', description: saved ? undefined : 'Find it in your saved posts.' }); }}>
            <Bookmark className={cn('mr-2 h-4 w-4', saved && 'fill-current')} /> Save
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
              <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                {postComments.length === 0 && (
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
                )}
                {postComments.map(c => (
                  <div key={c.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-white/10 shadow-sm">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback className="font-bold bg-primary/20 text-primary">{c.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-black/20 border border-white/5 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-white">{c.author}</span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{c.time}</span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10 shadow-sm">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="font-bold bg-primary/20 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex items-center gap-2 bg-black/20 border border-white/5 rounded-2xl px-4 py-2 hover:border-primary/50 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                    <input
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground min-w-0"
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="shrink-0 disabled:opacity-30 disabled:scale-100 scale-100 hover:scale-110 active:scale-95 text-primary transition-all drop-shadow-[0_0_8px_rgba(var(--primary-color),0.4)]"
                    >
                      <svg className="h-5 w-5 rotate-90" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

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


const FeedTab = ({ intentFilter }: { intentFilter?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<{ id: string; name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const normalizedIntentFilter = intentFilter?.trim() ?? '';
    const hasIntent = normalizedIntentFilter.length >= 2;
    const postsPromise = hasIntent
      ? CommunityService.searchPosts(normalizedIntentFilter, 0, 30)
      : CommunityService.getPosts();

    postsPromise.then((r) => setLocalPosts(r.content ?? [])).catch(() => {});
    CommunityService.getStories().then(setStories).catch(() => {});
    SkillService.getAll().then((s) => setTrendingSkills(Array.isArray(s) ? s.slice(0, 5) : [])).catch(() => {});
    UserService.getAll(1, 10).then((r) => {
      const list = (r as { content?: User[]; data?: User[] }).content ?? (r as { data?: User[] }).data ?? [];
      setSuggestions(list.slice(0, 3));
    }).catch(() => {});
  }, [intentFilter]);

  const handleNewPost = (post: Post) => {
    setLocalPosts((prev) => [post, ...prev]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <div className="col-span-1 xl:col-span-3 space-y-6">
        {intentFilter && intentFilter.trim().length >= 2 && (
          <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white mb-1">Filtered by skill intent</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Showing feed posts related to: "{intentFilter}"</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 hover:text-white"
              onClick={() => navigate('/community?tab=feed', { replace: true })}
            >
              Clear Filter
            </Button>
          </div>
        )}

        {/* Stories */}
        <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] p-5">
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            <StoryCircle isSelf selfUser={user} />
            {stories.map(story => <StoryCircle key={story.id} story={story} />)}
          </div>
        </div>

        <PostComposer onPost={handleNewPost} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {localPosts.map(post => <motion.div variants={itemVariants} key={post.id}><PostCard post={post} /></motion.div>)}
        </motion.div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden xl:block space-y-6">
        <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
          <div className="p-6 border-b border-white/5">
             <h3 className="font-headline text-lg font-bold text-white tracking-wide">Trending Skills</h3>
          </div>
          <div className="p-6">
            <ul className="space-y-4">
              {trendingSkills.slice(0, 5).map((skill, i) => (
                <li key={skill.id} className="flex items-center justify-between text-sm group">
                  <span className="font-bold text-white/80 group-hover:text-primary transition-colors"><span className="text-muted-foreground mr-1.5">{i + 1}.</span> {skill.name}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded-md"><ArrowUp className="h-3 w-3" /> {(i + 1) * 3}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
          <div className="p-6 border-b border-white/5">
             <h3 className="font-headline text-lg font-bold text-white tracking-wide">Suggested To Follow</h3>
          </div>
          <div className="p-6 space-y-5">
              {suggestions.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-white/5 shadow-sm">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback className="font-bold bg-primary/20 text-primary">{u.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate hover:text-primary transition-colors cursor-pointer">{u.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{u.university}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={followedUsers.has(u.id) ? 'default' : 'outline'}
                    className={cn(
                      'rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all px-4',
                      followedUsers.has(u.id) 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.2)]'
                        : 'border-white/10 hover:bg-white/10 hover:text-white text-muted-foreground'
                    )}
                    onClick={() =>
                      setFollowedUsers(prev => {
                        const next = new Set(prev);
                        if (next.has(u.id)) {
                          next.delete(u.id);
                        } else {
                          next.add(u.id);
                        }
                        return next;
                      })
                    }
                  >
                    {followedUsers.has(u.id) ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))}
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
    <div className="group relative overflow-hidden h-full flex flex-col rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:border-primary/30 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
      <div className={cn("relative h-[220px] w-full flex flex-col justify-end p-5 overflow-hidden shrink-0", event.coverGradient)}>
        <img src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=400&q=80" alt="Event Cover" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-50 transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />
        <div className="relative z-20 flex flex-col gap-2">
          <Badge className="w-fit bg-red-500/20 text-red-500 hover:bg-red-500/30 backdrop-blur-md border border-red-500/30 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            UPCOMING
          </Badge>
          <h3 className="font-headline text-2xl font-extrabold text-white leading-tight drop-shadow-md">{event.title}</h3>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 relative z-20 bg-transparent">
        {/* Compact Details Row */}
        <div className="flex items-start justify-between gap-3 mb-4 border-b border-white/5 pb-4">
          <div className="space-y-2 mt-1">
            <div className="flex items-center gap-2 text-white/90 font-bold text-sm">
              <Calendar className="h-4 w-4 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-color),0.5)]" />
              {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 text-white/90 font-bold text-sm">
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
               <p className="font-bold text-sm leading-tight text-white hover:text-primary transition-colors">{event.host.name.split(' ')[0]}</p>
             </div>
          </div>
        </div>

        {/* Compact Target Skills */}
        <div className="mb-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-1">Target Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {event.skills.slice(0, 3).map(skill => (
              <Badge key={skill.id} variant="secondary" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white hover:bg-primary/20 hover:text-primary transition-colors border border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                {skill.name}
              </Badge>
            ))}
            {event.skills.length > 3 && (
              <Badge variant="secondary" className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 text-white/60 border border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
                +{event.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex-grow" />

        {/* Going & Buttons row */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Going</span>
            <div className="flex items-center -space-x-2">
              {event.attendees.slice(0, 3).map(att => (
                <Avatar key={att.id} className="h-7 w-7 border-[2px] border-black/80 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-110 transition-transform relative z-10 z-[1] z-[2] z-[3] z-[4] hover:z-20">
                  <AvatarImage src={att.avatar} className="object-cover" />
                  <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{att.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
              {event.attendees.length > 3 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-black/80 bg-white/10 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 backdrop-blur-sm">
                  +{event.attendees.length - 3}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 flex-1 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className={cn('h-9 rounded-xl border border-white/10 border-dashed hover:border-solid hover:bg-white/5 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px] px-3 text-muted-foreground', interested && 'bg-red-500/10 text-red-500 border-red-500/30 border-solid shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/20 hover:text-red-500')} 
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
              onClick={() => toast({ title: 'Registration confirmed!', description: `See you at ${event.title}!`, variant: 'default' })}
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
        <div className={cn("relative h-64 rounded-[2rem] overflow-hidden p-8 flex flex-col justify-end text-white shadow-[0_0_30px_rgba(0,0,0,0.5)] group border border-white/10", featuredEvent.coverGradient)}>
          <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80" alt="Featured Event" className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-50 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />
          <div className="relative z-20">
            <Badge className="mb-4 bg-primary text-primary-foreground border-none shadow-[0_0_15px_hsl(var(--primary)/0.5)] text-[10px] font-bold uppercase tracking-widest px-3 py-1">FEATURED EVENT</Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold font-headline drop-shadow-[0_4px_10px_rgba(0,0,0,1)] tracking-tight">{featuredEvent.title}</h2>
            <p className="mt-3 text-white font-bold text-sm tracking-wide flex items-center gap-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]"><Calendar className="h-5 w-5 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" /> {new Date(featuredEvent.eventDate).toDateString()}</p>
          </div>
        </div>
      ) : (
        <div className="h-48 rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">Loading events...</div>
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
                : "border-white/10 bg-black/40 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20"
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
      <div className="group relative overflow-hidden h-full flex flex-col rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:border-primary/30 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="p-6 flex-grow flex flex-col relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 text-4xl shadow-[0_0_15px_hsl(var(--primary)/0.2)] group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 backdrop-blur-md">
              {circle.icon}
            </div>
            <Badge 
              variant="secondary"
              className={cn(
                'px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-white/10 backdrop-blur-md',
                circle.activity === 'VERY_ACTIVE' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]' : 
                circle.activity === 'QUIET' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 
                'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              {ACTIVITY_LABELS[circle.activity] ?? circle.activity}
            </Badge>
          </div>
          <h3 className="mt-6 text-2xl font-extrabold font-headline leading-tight text-white hover:text-primary transition-colors cursor-pointer drop-shadow-sm">{circle.name}</h3>
          <div className="flex flex-wrap gap-2 mt-4">
            {circle.skills.map(skill => (
              <Badge key={skill.id} variant="outline" className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-all text-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                {skill.name}
              </Badge>
            ))}
          </div>
          <div className="flex-grow" />
          
          <div className="mt-6 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Members</span>
                <div className="flex items-center -space-x-2 mt-1">
                  {circle.members.slice(0, 4).map(m => (
                    <Avatar key={m.id} className="h-7 w-7 border-[2px] border-black/80 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-110 transition-transform relative z-10 z-[1] z-[2] z-[3] z-[4] hover:z-20">
                      <AvatarImage src={m.avatar} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {circle.members.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-black/80 bg-white/10 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(255,255,255,0.1)] relative z-10 backdrop-blur-sm">
                      +{circle.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground block mb-1">Total</span>
                <p className="text-xl font-headline font-extrabold text-white">{circle.memberCount}</p>
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
              className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 border-dashed hover:border-solid hover:bg-white/10 hover:text-white transition-all text-muted-foreground h-10"
              onClick={() => toast({ title: circle.name, description: `${circle.memberCount} members · ${ACTIVITY_LABELS[circle.activity] ?? circle.activity}` })}
            >
              Preview
            </Button>
            <Button
              size="sm"
              className={cn(
                'flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all h-10',
                joined 
                  ? 'border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.2)]' 
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
        <h2 className="text-3xl font-extrabold font-headline text-white tracking-tight drop-shadow-md">Join Skill Circles</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Exchange skills and grow together in topic-focused groups.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="rounded-[2rem] border-2 border-dashed border-white/20 bg-black/20 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 min-h-[300px] cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] h-full">
          <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]">
            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="mt-6 font-extrabold font-headline text-xl text-white group-hover:text-primary transition-colors">Create New Circle</h3>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-white/70 transition-colors">Start a new community</p>
        </div>
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
    <div 
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] hover:border-primary/30 cursor-pointer flex flex-col justify-center shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]",
        d.isPinned ? "border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-white/5 hover:border-primary/40"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
      <div className="p-6 flex items-start gap-5 relative z-10">
        <div 
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all duration-300 shrink-0 min-w-[64px] min-h-[64px] shadow-sm hover:scale-105 active:scale-95 backdrop-blur-md",
            upvoted ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]" : "bg-black/40 border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/10"
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
            <Badge variant="secondary" className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest bg-white/10 text-white hover:bg-primary/20 hover:text-primary transition-colors border border-white/10">
              {d.category}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-auto hidden sm:inline-block">
              {d.createdAt}
            </span>
          </div>
          <h3 className="font-headline font-extrabold text-lg sm:text-xl leading-snug text-white group-hover:text-primary transition-colors pr-2 line-clamp-2 drop-shadow-sm">
            {d.title}
          </h3>
          <div className="mt-4 flex items-center flex-wrap gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 cursor-pointer group-hover/author:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8 ring-2 ring-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:ring-primary/30 transition-all">
                <AvatarImage src={d.author.avatar} className="object-cover" />
                <AvatarFallback className="font-bold text-[10px] bg-primary/20 text-primary">{d.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-white/80 hover:text-primary transition-colors">{d.author.name}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-l border-white/10 pl-4">
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                <div className="h-6 w-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20 shadow-[0_0_8px_rgba(var(--secondary-color),0.2)]"><MessageSquare className="h-3 w-3" /></div>
                {d.replies} <span className="hidden sm:inline">replies</span>
              </div>
              <div className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-white/20 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
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
        <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] p-4 space-y-2">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeCategory === cat 
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:bg-primary/90" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
        </div>
      </aside>
      <main className="col-span-1 lg:col-span-3 space-y-6">
        {discussions.map(d => (
          <DiscussionCard key={d.id} discussion={d} />
        ))}
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
  const intentFilter = searchParams.get('intent') ?? undefined;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div>
              <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Community Hub</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Join discussions, attend events, and connect with other learners.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">847 members online</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="border-b border-white/10">
            <div className="flex space-x-6 overflow-x-auto custom-scrollbar pb-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-shrink-0 whitespace-nowrap py-3 px-1 text-[10px] font-bold uppercase tracking-widest transition-colors outline-none flex items-center gap-2",
                    activeTab === tab.id ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]' : 'text-muted-foreground hover:text-white'
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
              {activeTab === 'feed' && <FeedTab intentFilter={intentFilter} />}
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
