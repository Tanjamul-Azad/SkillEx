import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Flag, 
  Trash2, 
  Send,
  Play,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ReportDialog } from '@/components/moderation/ReportDialog';
import { cn, timeAgo } from '@/lib/utils';
import { CommunityService } from '@/services/communityService';
import type { Post, Comment } from '@/types';

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
}

export const PostCard = React.memo(({ post, onDelete }: PostCardProps) => {
  const authorName = post.author.name.split(' ')[0] || post.author.name;
  const [liked, setLiked] = useState(post.isLikedByViewer ?? false);
  const [saved, setSaved] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.comments);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load comments from API when thread opens
  useEffect(() => {
    if (!commentsOpen) return;
    setLoadingComments(true);
    CommunityService.getComments(post.id)
      .then(r => setPostComments(r.content ?? []))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [commentsOpen, post.id]);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes(prev => Math.max(0, newLiked ? prev + 1 : prev - 1));
    try {
      const updated = newLiked
        ? await CommunityService.likePost(post.id)
        : await CommunityService.unlikePost(post.id);
      setLiked(updated.isLikedByViewer ?? newLiked);
      setLocalLikes(updated.likes ?? 0);
    } catch {
      // Rollback on error
      setLiked(!newLiked);
      setLocalLikes(prev => Math.max(0, !newLiked ? prev + 1 : prev - 1));
      toast({ title: 'Connection error', description: 'Could not sync like status.', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || submittingComment) return;
    setSubmittingComment(true);
    try {
      const saved = await CommunityService.addComment(post.id, commentText.trim());
      setPostComments(prev => [...prev, saved]);
      setLocalCommentCount(n => n + 1);
      setCommentText('');
    } catch {


      toast({ title: 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await CommunityService.deletePost(post.id);
      onDelete?.(post.id);
      toast({ title: 'Post deleted', description: 'Your post was removed from the feed.' });
    } catch {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
      setDeleting(false);
    }
  };

  const handleVideoToggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (videoPlaying) { v.pause(); } else { v.play(); }
    setVideoPlaying(!videoPlaying);
  };

  if (deleting) return null;

  return (
    <>
      <div className="group py-5 px-3 border-b border-border/40 bg-transparent transition-all duration-300 relative">
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 ring-1 ring-border transition-all duration-300 group-hover:scale-105 cursor-pointer" onClick={() => navigate(`/profile/${post.author.id}`)}>
              <AvatarImage src={post.author.avatar} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{post.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="font-headline font-extrabold text-foreground text-sm sm:text-base leading-tight hover:underline cursor-pointer" onClick={() => navigate(`/profile/${post.author.id}`)}>{post.author.name}</p>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">{timeAgo(post.createdAt)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors" aria-label="More options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl border border-primary/20 bg-popover shadow-lg p-1">
                <DropdownMenuItem
                  onClick={() => setReportOpen(true)}
                  className="gap-2 cursor-pointer text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-primary/10 focus:bg-primary/10 focus:text-primary text-muted-foreground hover:text-primary"
                >
                  <Flag className="h-3.5 w-3.5" /> Report
                </DropdownMenuItem>
                {user?.id === post.author.id && (
                  <>
                    <DropdownMenuSeparator className="bg-primary/10 my-1" />
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

          <div className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap pl-1">
            {post.type === 'achievement' && `🏆 ${authorName} ${post.content}`}
            {post.type === 'exchange' && post.exchangePartners && `✅ ${post.exchangePartners[0].name} and ${post.exchangePartners[1].name} ${post.content}`}
            {post.type === 'question' && `❓ ${post.author.name} ${post.content}`}
            {(post.type === 'showcase' || !['achievement', 'exchange', 'question'].includes(post.type)) && post.content}
          </div>

          {/* Tagged Skill Badge */}
          {post.skill && (
            <div className="mt-3 pl-1">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md">
                <Tag className="h-2.5 w-2.5 mr-1" /> {post.skill.name}
              </Badge>
            </div>
          )}

          {post.feedReason && (
            <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-[11px] font-medium text-muted-foreground">
              {post.feedReason}
            </div>
          )}

          {/* Media content */}
          {post.mediaUrl && (
            post.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <div className="mt-4 relative max-w-xl cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-card" onClick={handleVideoToggle}>
                <div className="relative aspect-video group/video">
                  <video
                    ref={videoRef}
                    src={post.mediaUrl}
                    className="h-full w-full object-cover"
                    playsInline
                    loop
                  />
                  <div className={cn("absolute inset-0 bg-card backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300", videoPlaying && "opacity-0 pointer-events-none")}>
                     <div className="p-4 rounded-full bg-primary/20 border border-primary/40 text-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-transform group-hover/video:scale-110">
                        <Play className="h-8 w-8 fill-current ml-1" />
                     </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                aria-label="View image at full size"
                className="mt-4 block w-full max-w-xl overflow-hidden rounded-xl border border-border/40 bg-card text-left"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={post.mediaUrl}
                  alt="Post attachment"
                  loading="lazy"
                  className="w-full max-h-[28rem] object-cover transition-opacity duration-300 hover:opacity-95"
                />
              </button>
            )
          )}

          <div className="mt-4 flex items-center gap-1.5 border-t border-border/10 pt-3 pl-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all px-3 h-8',
                liked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
              onClick={handleLike}
            >
              <Heart className={cn('mr-1.5 h-3.5 w-3.5 transition-all', liked && 'fill-current scale-110')} />
              {localLikes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all px-3 h-8',
                commentsOpen && 'text-primary bg-primary/10'
              )}
              onClick={() => setCommentsOpen(!commentsOpen)}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {localCommentCount}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all px-3 h-8"
              onClick={() => {
                const url = `${window.location.origin}/post/${post.id}`;
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied', description: 'Post link copied to clipboard.' });
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'ml-auto rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all px-3 h-8',
                saved ? 'text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
              onClick={() => {
                setSaved(!saved);
                toast({ 
                  title: saved ? 'Removed from bookmarks' : 'Saved to bookmarks',
                  variant: 'info'
                });
              }}
            >
              <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} />
            </Button>
          </div>

          <AnimatePresence>
            {commentsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 border-t border-border/10 pt-3 overflow-hidden"
              >
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : postComments.length === 0 ? (
                    <p className="text-center py-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">No comments yet.</p>
                  ) : (
                    postComments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group/comment">
                        <Avatar className="h-7 w-7 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${comment.author.id}`)}>
                          <AvatarImage src={comment.author.avatar ?? undefined} />
                          <AvatarFallback className="text-[10px] font-bold">{comment.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 rounded-xl bg-muted/20 border border-border/30 px-3 py-1.5 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-foreground hover:text-primary cursor-pointer transition-colors" onClick={() => navigate(`/profile/${comment.author.id}`)}>{comment.author.name}</span>
                            <span className="text-[8px] uppercase tracking-tighter text-muted-foreground font-bold">{timeAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-xs text-foreground/80 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {user && (
                  <div className="mt-3 flex gap-3 items-center">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/60"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      />
                      <button 
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || submittingComment}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 disabled:text-muted-foreground transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently remove your post from the community feed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-all">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {post.mediaUrl && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl border-border/40 bg-background/95 p-2 sm:p-3">
            <DialogTitle className="sr-only">Post image</DialogTitle>
            <DialogDescription className="sr-only">Full-size view of the image attached to this post.</DialogDescription>
            <img
              src={post.mediaUrl}
              alt="Post attachment at full size"
              className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="POST"
        targetId={post.id}
        targetUserId={post.author.id}
      />
    </>
  );
});

PostCard.displayName = 'PostCard';

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
