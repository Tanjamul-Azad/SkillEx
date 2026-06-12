import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, CheckCircle2, CornerDownRight, Megaphone, HelpCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CommunityService } from '@/services/communityService';
import type { Discussion, DiscussionReply } from '@/types';

const POST_TYPES = [
  { value: 'QUESTION', label: 'Question', icon: HelpCircle },
  { value: 'ANNOUNCEMENT', label: 'Announcement', icon: Megaphone },
] as const;

const formatEnumLabel = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const timeAgo = (value?: string) => {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/**
 * EventActivityWall — real, end-to-end interaction inside an event.
 * Reuses the discussion + reply system (scoped via eventId): attendees post
 * questions/announcements, reply to each other, and the thread author can
 * accept an answer or mark it solved.
 */
export function EventActivityWall({ eventId, isHost }: { eventId: string; isHost: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', threadType: 'QUESTION' });

  // Per-thread expand + reply state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [repliesByThread, setRepliesByThread] = useState<Record<string, DiscussionReply[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [threadBusy, setThreadBusy] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await CommunityService.getDiscussions(0, 50, { eventId });
      setThreads(res.content ?? []);
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const submitThread = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Add a title and a message', variant: 'destructive' });
      return;
    }
    setPosting(true);
    try {
      const created = await CommunityService.createDiscussion({
        title: form.title.trim(),
        content: form.content.trim(),
        category: 'Event',
        threadType: form.threadType,
        eventId,
      });
      setThreads(prev => [created, ...prev]);
      setForm({ title: '', content: '', threadType: 'QUESTION' });
      toast({ title: 'Posted to the event', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not post', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const toggleThread = async (thread: Discussion) => {
    if (expandedId === thread.id) { setExpandedId(null); return; }
    setExpandedId(thread.id);
    setReplyText('');
    if (!repliesByThread[thread.id]) {
      setRepliesLoading(thread.id);
      try {
        const res = await CommunityService.getDiscussionReplies(thread.id);
        setRepliesByThread(prev => ({ ...prev, [thread.id]: res.content ?? [] }));
      } catch {
        setRepliesByThread(prev => ({ ...prev, [thread.id]: [] }));
      } finally {
        setRepliesLoading(null);
      }
    }
  };

  const submitReply = async (thread: Discussion) => {
    if (!replyText.trim()) {
      toast({ title: 'Reply cannot be empty', variant: 'destructive' });
      return;
    }
    setReplyBusy(true);
    try {
      const reply = await CommunityService.addDiscussionReply(thread.id, replyText.trim());
      setRepliesByThread(prev => ({ ...prev, [thread.id]: [...(prev[thread.id] ?? []), reply] }));
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, replies: t.replies + 1 } : t));
      setReplyText('');
    } catch (error) {
      toast({ title: 'Could not reply', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setReplyBusy(false);
    }
  };

  const acceptReply = async (thread: Discussion, reply: DiscussionReply) => {
    setThreadBusy(thread.id);
    try {
      const updated = await CommunityService.acceptDiscussionReply(thread.id, reply.id);
      setThreads(prev => prev.map(t => t.id === thread.id ? updated : t));
      setRepliesByThread(prev => ({ ...prev, [thread.id]: (prev[thread.id] ?? []).map(r => ({ ...r, isAccepted: r.id === reply.id })) }));
      toast({ title: 'Answer accepted', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not accept', description: error instanceof Error ? error.message : 'Only the author can accept.', variant: 'destructive' });
    } finally {
      setThreadBusy(null);
    }
  };

  const resolveThread = async (thread: Discussion) => {
    setThreadBusy(thread.id);
    try {
      const updated = await CommunityService.resolveDiscussion(thread.id);
      setThreads(prev => prev.map(t => t.id === thread.id ? updated : t));
      toast({ title: 'Marked solved', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not resolve', description: error instanceof Error ? error.message : 'Only the author can resolve.', variant: 'destructive' });
    } finally {
      setThreadBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {POST_TYPES.map(({ value, label, icon: Icon }) => {
            // Only the host can broadcast announcements; everyone can ask questions.
            if (value === 'ANNOUNCEMENT' && !isHost) return null;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, threadType: value }))}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                  form.threadType === value ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
        <Input
          placeholder={form.threadType === 'ANNOUNCEMENT' ? 'Announcement title (e.g., Agenda updated)' : 'What do you want to ask the group?'}
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.currentTarget.value }))}
          className="mb-2"
        />
        <Textarea
          rows={3}
          placeholder="Add details, links, or context..."
          value={form.content}
          onChange={e => setForm(prev => ({ ...prev, content: e.currentTarget.value }))}
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={submitThread} disabled={posting}>
            {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Post to event
          </Button>
        </div>
      </div>

      {/* Thread list */}
      {loading ? (
        <div className="product-empty"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading activity</div>
      ) : threads.length === 0 ? (
        <div className="product-empty">
          <MessageSquare className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
          <p className="font-bold text-foreground">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to post an update or question for attendees.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(thread => {
            const replies = repliesByThread[thread.id] ?? [];
            const expanded = expandedId === thread.id;
            const canModerate = user?.id === thread.author.id;
            const isAnnouncement = thread.threadType === 'ANNOUNCEMENT';
            return (
              <div key={thread.id} className={cn('rounded-xl border bg-card p-4', isAnnouncement ? 'border-primary/30 bg-primary/[0.04]' : 'border-border/50')}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={thread.author.avatar} />
                    <AvatarFallback>{thread.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{thread.author.name}</span>
                      <Badge variant="outline" className={cn('rounded-full text-[9px]', isAnnouncement ? 'border-primary/30 text-primary' : '')}>
                        {formatEnumLabel(thread.threadType)}
                      </Badge>
                      {thread.status === 'SOLVED' && (
                        <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 text-[9px]">Solved</Badge>
                      )}
                      <span className="ml-auto text-[11px] text-muted-foreground">{timeAgo(thread.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 font-headline text-base font-bold text-foreground">{thread.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{thread.content}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs font-bold text-muted-foreground hover:text-primary" onClick={() => toggleThread(thread)}>
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        {thread.replies} {thread.replies === 1 ? 'reply' : 'replies'}
                      </Button>
                      {canModerate && thread.status !== 'SOLVED' && (
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs font-bold text-muted-foreground hover:text-emerald-400" disabled={threadBusy === thread.id} onClick={() => resolveThread(thread)}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark solved
                        </Button>
                      )}
                    </div>

                    {expanded && (
                      <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
                        {repliesLoading === thread.id && <div className="product-empty py-3"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>}
                        {repliesLoading !== thread.id && replies.length === 0 && (
                          <p className="text-xs text-muted-foreground">No replies yet.</p>
                        )}
                        {replies.map(reply => (
                          <div key={reply.id} className={cn('flex items-start gap-2 rounded-lg border p-2.5', reply.isAccepted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40 bg-background/40')}>
                            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.author.avatar} />
                              <AvatarFallback className="text-[9px]">{reply.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-foreground">{reply.author.name}</span>
                                {reply.isAccepted && <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 text-[9px]">Accepted</Badge>}
                                <span className="text-[10px] text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{reply.content}</p>
                            </div>
                            {canModerate && !reply.isAccepted && thread.status !== 'SOLVED' && (
                              <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[10px]" disabled={threadBusy === thread.id} onClick={() => acceptReply(thread, reply)}>
                                Accept
                              </Button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-start gap-2 pt-1">
                          <Textarea
                            rows={2}
                            placeholder="Write a reply..."
                            value={replyText}
                            onChange={e => setReplyText(e.currentTarget.value)}
                            className="min-h-0"
                          />
                          <Button size="sm" className="shrink-0" disabled={replyBusy} onClick={() => submitReply(thread)}>
                            {replyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
