import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Pin, MessageSquare, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { CommunityService } from '@/services/communityService';
import type { Discussion, DiscussionReply } from '@/types';
import { ImageUploadField } from '@/components/upload/ImageUploadField';

const THREAD_TYPES = [
  { value: 'QUESTION', label: 'Question' },
  { value: 'RESOURCE_REQUEST', label: 'Resource Request' },
  { value: 'PROJECT_REVIEW', label: 'Project Review' },
  { value: 'SUCCESS_STORY', label: 'Success Story' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
];

const formatEnumLabel = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

interface DiscussionCardProps {
  discussion: Discussion;
  onOpen: (discussion: Discussion) => void;
}

const DiscussionCard = React.memo(({ discussion: d, onOpen }: DiscussionCardProps) => {
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
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card text-card-foreground transition-all duration-300 hover:border-primary/30 hover:shadow-sm cursor-pointer flex flex-col justify-center",
        d.isPinned ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/40" : "border-border/50 hover:border-primary/30"
      )}
      onClick={() => onOpen(d)}
    >
      {d.coverImageUrl && (
        <div className="relative aspect-video max-h-40 w-full overflow-hidden border-b border-border/40 bg-muted">
          <img
            src={d.coverImageUrl}
            alt={d.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
      <div className="p-6 flex items-start gap-5 relative z-10">
        <div 
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-border/50 transition-all duration-300 shrink-0 min-w-[64px] min-h-[64px] shadow-sm hover:scale-105 active:scale-95",
            upvoted ? "bg-primary/20 border-primary/45 text-primary" : "bg-card border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5"
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleUpvote();
          }}
        >
          <ArrowUp
            className={cn("h-6 w-6 transition-transform duration-300", upvoted && "text-primary -translate-y-1")}
          />
          <span className="font-extrabold font-headline text-base leading-none">{localUpvotes}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            {d.isPinned && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Pinned
              </Badge>
            )}
            <Badge variant="secondary" className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-primary/20">
              {d.category}
            </Badge>
            <Badge variant="outline" className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border-primary/20 text-primary">
              {formatEnumLabel(d.threadType)}
            </Badge>
            {d.status === 'SOLVED' && (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest">
                Solved
              </Badge>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-auto hidden sm:inline-block">
              {d.createdAt ? (() => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? 'Recently' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : 'Recently'}
            </span>
          </div>
          <h3 className="font-headline font-extrabold text-lg sm:text-xl leading-snug text-foreground group-hover:text-primary transition-colors pr-2 line-clamp-2 drop-shadow-sm">
            {d.title}
          </h3>
          <div className="mt-4 flex items-center flex-wrap gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 cursor-pointer group-hover/author:opacity-80 transition-opacity">
              <Avatar className="h-8 w-8 border border-border/50 hover:border-primary/30 transition-all">
                <AvatarImage src={d.author.avatar} className="object-cover" />
                <AvatarFallback className="font-bold text-[10px] bg-primary/20 text-primary">{d.author.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-bold text-foreground/80 hover:text-primary transition-colors">{d.author.name}</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-l border-primary/20 pl-4">
              <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                <div className="h-6 w-6 rounded-full bg-secondary/5 text-secondary flex items-center justify-center border border-secondary/15"><MessageSquare className="h-3 w-3" /></div>
                {d.replies} <span className="hidden sm:inline">replies</span>
              </div>
              <div className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/15" />
                {d.views} <span className="hidden sm:inline">views</span>
              </div>
              <span className="sm:hidden ml-auto text-[10px]">{d.createdAt ? (() => { const dt = new Date(d.createdAt); return isNaN(dt.getTime()) ? 'Recently' : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : 'Recently'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
DiscussionCard.displayName = 'DiscussionCard';

interface DiscussionDetailDialogProps {
  discussion: Discussion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscussionChange: (discussion: Discussion) => void;
}

function DiscussionDetailDialog({
  discussion,
  open,
  onOpenChange,
  onDiscussionChange,
}: DiscussionDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReplies = useCallback(async () => {
    if (!discussion) return;
    setLoading(true);
    try {
      const response = await CommunityService.getDiscussionReplies(discussion.id);
      setReplies(response.content ?? []);
    } catch (error) {
      toast({ title: 'Could not load replies', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [discussion, toast]);

  useEffect(() => {
    if (open) {
      loadReplies();
    }
  }, [open, loadReplies]);

  const submitReply = async () => {
    if (!discussion || !replyText.trim()) {
      toast({ title: 'Reply cannot be empty', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const reply = await CommunityService.addDiscussionReply(discussion.id, replyText.trim());
      setReplies(prev => [...prev, reply]);
      setReplyText('');
      onDiscussionChange({ ...discussion, replies: discussion.replies + 1 });
      toast({ title: 'Reply posted', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not post reply', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const acceptReply = async (reply: DiscussionReply) => {
    if (!discussion) return;
    try {
      const updated = await CommunityService.acceptDiscussionReply(discussion.id, reply.id);
      onDiscussionChange(updated);
      setReplies(prev => prev.map(item => ({ ...item, isAccepted: item.id === reply.id })));
      toast({ title: 'Answer accepted', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not accept answer', description: error instanceof Error ? error.message : 'Only the thread author can accept an answer.', variant: 'destructive' });
    }
  };

  const resolve = async () => {
    if (!discussion) return;
    try {
      const updated = await CommunityService.resolveDiscussion(discussion.id);
      onDiscussionChange(updated);
      toast({ title: 'Discussion marked solved', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not resolve discussion', description: error instanceof Error ? error.message : 'Only the thread author can resolve it.', variant: 'destructive' });
    }
  };

  if (!discussion) return null;
  const canModerateAnswer = user?.id === discussion.author.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        {discussion.coverImageUrl && (
          <div className="relative aspect-video max-h-48 w-full overflow-hidden rounded-xl border border-border/40 bg-muted mb-4">
            <img
              src={discussion.coverImageUrl}
              alt={discussion.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-primary/10 text-primary">{formatEnumLabel(discussion.threadType)}</Badge>
            <Badge variant="outline" className={cn('rounded-full', discussion.status === 'SOLVED' && 'border-emerald-500/40 text-emerald-400')}>{formatEnumLabel(discussion.status)}</Badge>
            {discussion.circleName && <Badge variant="outline" className="rounded-full">{discussion.circleName}</Badge>}
            {discussion.skill && <Badge variant="outline" className="rounded-full">{discussion.skill.name}</Badge>}
          </div>
          <DialogTitle className="font-headline text-2xl">{discussion.title}</DialogTitle>
          <DialogDescription>{discussion.content}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={discussion.author.avatar} />
              <AvatarFallback>{discussion.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold text-foreground">{discussion.author.name}</p>
              <p className="text-xs text-muted-foreground">{discussion.replies} replies · {discussion.views} views</p>
            </div>
            {canModerateAnswer && discussion.status !== 'SOLVED' && (
              <Button size="sm" variant="outline" className="ml-auto rounded-xl border-border/50" onClick={resolve}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark solved
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Replies</h4>
            {loading && <div className="product-empty"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading replies</div>}
            {!loading && replies.length === 0 && <div className="product-empty">No replies yet.</div>}
            {replies.map(reply => (
              <div key={reply.id} className={cn('rounded-xl border bg-card p-4', reply.isAccepted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50')}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.author.avatar} />
                    <AvatarFallback>{reply.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-foreground">{reply.author.name}</p>
                      {reply.isAccepted && <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Accepted</Badge>}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{reply.content}</p>
                  </div>
                  {canModerateAnswer && !reply.isAccepted && (
                    <Button size="sm" variant="outline" className="rounded-xl border-border/50" onClick={() => acceptReply(reply)}>
                      Accept
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
            <Label htmlFor="discussion-reply">Reply</Label>
            <Textarea id="discussion-reply" rows={4} className="mt-2" value={replyText} onChange={event => setReplyText(event.currentTarget.value)} placeholder="Answer with steps, resources, or next actions..." />
            <div className="mt-3 flex justify-end">
              <Button onClick={submitReply} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Post reply
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const DiscussionsTab = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const categories = ['All', 'General', 'Skill Tips', 'Success Stories', 'Help & Support', 'Announcements'];
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [discussionForm, setDiscussionForm] = useState({ title: '', content: '', category: 'General', threadType: 'QUESTION', coverImageUrl: null as string | null });

  const loadDiscussions = useCallback(() => {
    return CommunityService.getDiscussions(0, 20, {
      category: activeCategory === 'All' ? undefined : activeCategory,
      status: activeStatus === 'All' ? undefined : activeStatus,
    }).then((r) => setDiscussions(r.content ?? []));
  }, [activeCategory, activeStatus]);

  useEffect(() => {
    loadDiscussions().catch(() => {});
  }, [loadDiscussions]);

  useEffect(() => {
    const discussionId = searchParams.get('discussionId');
    if (!discussionId) return;
    CommunityService.getDiscussion(discussionId)
      .then(discussion => {
        setSelectedDiscussion(discussion);
        setDetailOpen(true);
      })
      .catch(() => {});
  }, [searchParams]);

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
        threadType: discussionForm.threadType,
        coverImageUrl: discussionForm.coverImageUrl,
      });
      setDiscussions(prev => [created, ...prev]);
      setDiscussionForm({ title: '', content: '', category: 'General', threadType: 'QUESTION', coverImageUrl: null });
      setCreateOpen(false);
      toast({ title: 'Discussion started', description: 'The community can now respond.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not start discussion', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openDiscussion = (discussion: Discussion) => {
    setSelectedDiscussion(discussion);
    setDetailOpen(true);
  };

  const updateDiscussion = (updated: Discussion) => {
    setSelectedDiscussion(prev => prev?.id === updated.id ? updated : prev);
    setDiscussions(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const discussionStats = useMemo(() => {
    const solved = discussions.filter(discussion => discussion.status === 'SOLVED').length;
    const pinned = discussions.filter(discussion => discussion.isPinned).length;
    const replies = discussions.reduce((sum, discussion) => sum + (discussion.replies ?? 0), 0);
    const views = discussions.reduce((sum, discussion) => sum + (discussion.views ?? 0), 0);
    const hotThread = discussions
      .slice()
      .sort((a, b) => (b.upvotes + b.replies) - (a.upvotes + a.replies))[0];

    return { solved, pinned, replies, views, hotThread };
  }, [discussions]);

  return (
    <div className="space-y-6">
      <div className="product-panel overflow-hidden">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                <MessageSquare className="mr-1 h-3 w-3" />
                Community triage
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {activeCategory} / {formatEnumLabel(activeStatus)}
              </Badge>
            </div>
            <h2 className="mt-3 font-headline text-2xl font-extrabold text-foreground">Discussions</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Questions, resource requests, reviews, and success stories with solved-state tracking.
            </p>
          </div>
          <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            New discussion
          </Button>
        </div>
        <div className="grid border-t border-border/50 bg-muted/10 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Threads', value: discussions.length, icon: MessageSquare },
            { label: 'Solved', value: discussionStats.solved, icon: CheckCircle2 },
            { label: 'Pinned', value: discussionStats.pinned, icon: Pin },
            { label: 'Replies', value: discussionStats.replies, icon: ArrowUp },
            { label: 'Views', value: discussionStats.views, icon: MessageSquare },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 border-b border-border/50 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-headline text-xl font-extrabold text-foreground">{item.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      <aside className="col-span-1">
        <div className="surface-raised rounded-xl p-4 space-y-2 lg:sticky lg:top-4">
            {discussionStats.hotThread && (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Hot thread</p>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{discussionStats.hotThread.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{discussionStats.hotThread.replies} replies</p>
              </div>
            )}
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
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
            <div className="pt-3">
              {['All', 'OPEN', 'SOLVED'].map(status => (
                <Button
                  key={status}
                  variant={activeStatus === status ? 'secondary' : 'ghost'}
                  className={cn(
                    "mt-2 w-full justify-start rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    activeStatus === status ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                  onClick={() => setActiveStatus(status)}
                >
                  {formatEnumLabel(status)}
                </Button>
              ))}
            </div>
        </div>
      </aside>
      <main className="col-span-1 lg:col-span-3 space-y-6">
        {discussions.map(d => (
          <DiscussionCard key={d.id} discussion={d} onOpen={openDiscussion} />
        ))}
        {discussions.length === 0 && (
          <div className="surface-raised rounded-xl p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-headline text-lg font-bold text-foreground mb-2">No discussions found</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Be the first to start a conversation in this category!</p>
          </div>
        )}
      </main>
      </div>
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
              <Label>Thread type</Label>
              <div className="flex flex-wrap gap-2">
                {THREAD_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDiscussionForm(prev => ({ ...prev, threadType: type.value }))}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                      discussionForm.threadType === type.value ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                    )}
                  >
                    {type.label}
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

            <ImageUploadField
              value={discussionForm.coverImageUrl}
              onChange={url => setDiscussionForm(prev => ({ ...prev, coverImageUrl: url }))}
              label="Cover image"
              aspect="video"
            />
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
      <DiscussionDetailDialog
        discussion={selectedDiscussion}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDiscussionChange={updateDiscussion}
      />
    </div>
  );
};
