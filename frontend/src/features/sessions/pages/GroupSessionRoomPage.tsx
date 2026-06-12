import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Clock,
  CalendarDays,
  Video,
  Radio,
  CheckCircle2,
  Award,
  Loader2,
  X,
  ListChecks,
  FileText,
  ExternalLink,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { groupSessionService, type GroupSession } from '@/services/groupSessionService';
import { cn } from '@/lib/utils';

const STATUS_META: Record<GroupSession['status'], { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-300' },
  IN_PROGRESS: { label: 'Live now', className: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400' },
  COMPLETED: { label: 'Completed', className: 'border-border bg-muted/40 text-muted-foreground' },
  CANCELLED: { label: 'Cancelled', className: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400' },
};

export default function GroupSessionRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [session, setSession] = useState<GroupSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [wrapOpen, setWrapOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useDocumentTitle(session?.title ? `${session.title} · Room` : 'Session Room');

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await groupSessionService.get(sessionId);
      setSession(data);
      setMeetingLink(data.meetingLink ?? '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const isHost = Boolean(session && user?.id === session.mentorId);
  const myAttendance = useMemo(
    () => session?.attendees.find((a) => a.userId === user?.id),
    [session, user?.id],
  );
  const isAttendee = Boolean(myAttendance);
  const isFull = Boolean(session && session.attendees.length >= session.maxAttendees);

  const run = async (fn: () => Promise<unknown>, success?: { title: string; description?: string }) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast(success);
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGoLive = () => {
    const wasLive = session?.status === 'IN_PROGRESS';
    return run(
      () => groupSessionService.start(session!.id, meetingLink.trim() || null),
      {
        title: wasLive ? 'Meeting link updated' : 'You are live',
        description: wasLive ? 'The new link is now available to attendees.' : 'Attendees have been notified to join the room.',
      },
    ).then(() => setGoLiveOpen(false));
  };

  const handleWrapUp = () =>
    run(
      () => groupSessionService.complete(session!.id, notes.trim()),
      { title: 'Session completed', description: 'Attendees can now claim their certificates.' },
    ).then(() => setWrapOpen(false));

  const handleClaim = () =>
    run(async () => {
      const cert = await groupSessionService.claimCertificate(session!.id);
      navigate(`/certificates?certificateId=${cert.id}`);
    });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-6 py-8">
          <Skeleton variant="custom" className="h-56 rounded-2xl" />
          <Skeleton variant="custom" className="h-64 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !session) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl py-16 text-center">
          <p className="text-lg font-semibold text-foreground">This session room is unavailable.</p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate('/group-sessions')}>
            Back to Group Sessions
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const status = STATUS_META[session.status];
  const when = new Date(session.scheduledAt);
  const dateLabel = when.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const timeLabel = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const isLive = session.status === 'IN_PROGRESS';
  const isOpen = session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';
  const agendaLines = (session.description ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 py-6">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/group-sessions')}>
          <ArrowLeft className="h-4 w-4" />
          Group Sessions
        </Button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/50"
        >
          <div className="relative h-48 w-full sm:h-60">
            {session.coverImageUrl ? (
              <img src={session.coverImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/25 via-primary/5 to-secondary/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={cn('border bg-background/80', status.className)}>
                  {isLive && <Radio className="mr-1 h-3 w-3 animate-pulse" />}
                  {status.label}
                </Badge>
                <Badge variant="secondary">{session.skillName}</Badge>
              </div>
              <h1 className="mt-2 font-headline text-2xl font-extrabold text-white sm:text-3xl">
                {session.title}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/85">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={session.mentorAvatar ?? undefined} alt={session.mentorName} />
                  <AvatarFallback className="text-[10px]">{session.mentorName.charAt(0)}</AvatarFallback>
                </Avatar>
                Hosted by {isHost ? 'you' : session.mentorName}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Live / join CTA */}
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              {isLive ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-500">
                      <Video className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground">The room is live</p>
                      {session.meetingLink ? (
                        <p className="text-sm text-muted-foreground">Join the meeting to take part.</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">The host hasn't shared a meeting link yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isHost && (
                      <Button variant="outline" className="rounded-xl" onClick={() => setGoLiveOpen(true)}>
                        <Video className="mr-1.5 h-4 w-4" />
                        {session.meetingLink ? 'Change Link' : 'Set Link'}
                      </Button>
                    )}
                    {session.meetingLink && (
                      <Button asChild variant="gradient" className="rounded-xl">
                        <a href={session.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-2 h-4 w-4" />
                          Join live room
                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : session.status === 'SCHEDULED' ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Starts <span className="font-semibold text-foreground">{dateLabel} at {timeLabel}</span>.
                  {isHost ? ' Go live when you are ready.' : ' You will be notified when the host goes live.'}
                </div>
              ) : session.status === 'COMPLETED' ? (
                <div className="flex items-center gap-3 text-sm font-medium text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  This workshop has wrapped up.
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This session was cancelled.</p>
              )}
            </div>

            {/* Agenda */}
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-foreground">
                <ListChecks className="h-5 w-5 text-primary" />
                What we'll cover
              </h2>
              {agendaLines.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {agendaLines.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  The host hasn't added an agenda for this workshop.
                </p>
              )}
            </div>

            {/* Shared notes (after completion) */}
            {session.status === 'COMPLETED' && session.sharedNotes && (
              <div className="rounded-2xl border border-border/50 bg-card p-5">
                <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Session notes
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{session.sharedNotes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Meta */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> {dateLabel}, {timeLabel}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> {session.durationMinutes} minutes
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> {session.attendees.length}/{session.maxAttendees} seats filled
              </div>
            </div>

            {/* Attendees */}
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Attendees ({session.attendees.length})
              </p>
              {session.attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has joined yet.</p>
              ) : (
                <div className="space-y-2">
                  {session.attendees.map((a) => (
                    <div key={a.userId} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={a.avatar ?? undefined} alt={a.name} />
                        <AvatarFallback className="text-[10px]">{a.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm text-foreground">
                        {a.userId === user?.id ? 'You' : a.name}
                      </span>
                      {a.certificateEarned && <Award className="h-4 w-4 text-primary" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-2">
              {isHost && session.status === 'SCHEDULED' && (
                <Button className="w-full rounded-xl" disabled={busy} onClick={() => setGoLiveOpen(true)}>
                  <Radio className="mr-2 h-4 w-4" /> Go Live
                </Button>
              )}
              {isHost && isLive && (
                <Button className="w-full rounded-xl" disabled={busy} onClick={() => setWrapOpen(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Wrap up & issue certificates
                </Button>
              )}
              {isHost && isOpen && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('Cancel this session? Attendees will be notified.')) {
                      void run(() => groupSessionService.cancel(session.id), { title: 'Session cancelled' });
                    }
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Cancel session
                </Button>
              )}

              {!isHost && isOpen && !isAttendee && (
                <Button
                  className="w-full rounded-xl"
                  disabled={busy || isFull}
                  onClick={() => run(() => groupSessionService.join(session.id), { title: 'Seat reserved' })}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isFull ? 'Session full' : 'Join session'}
                </Button>
              )}
              {!isHost && isOpen && isAttendee && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={busy}
                  onClick={() => run(() => groupSessionService.leave(session.id), { title: 'Seat released' })}
                >
                  Leave session
                </Button>
              )}
              {!isHost && session.status === 'COMPLETED' && isAttendee && !myAttendance?.certificateEarned && (
                <Button className="w-full rounded-xl" disabled={busy} onClick={handleClaim}>
                  <Award className="mr-2 h-4 w-4" /> Claim certificate
                </Button>
              )}
              {!isHost && session.status === 'COMPLETED' && myAttendance?.certificateEarned && (
                <p className="flex items-center justify-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <Award className="h-4 w-4" /> Certificate earned
                </p>
              )}
              {!isHost && !isOpen && !isAttendee && session.status !== 'COMPLETED' && (
                <p className="text-center text-sm text-muted-foreground">This session is closed.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Go Live dialog */}
      <Dialog open={goLiveOpen} onOpenChange={setGoLiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{session?.status === 'IN_PROGRESS' ? 'Update meeting link' : 'Go live'}</DialogTitle>
            <DialogDescription>
              {session?.status === 'IN_PROGRESS'
                ? 'Update the meeting link for this live session.'
                : 'Share the meeting link attendees should join. We\'ll notify everyone who reserved a seat.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Video className="h-3.5 w-3.5 text-primary" /> Meeting link
            </label>
            <Input
              placeholder="https://meet.google.com/... or Zoom link"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">Optional — you can paste it now or share it in the room later.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGoLiveOpen(false)}>Not yet</Button>
            <Button disabled={busy} onClick={handleGoLive}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {session?.status === 'IN_PROGRESS' ? 'Update Link' : 'Go Live'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wrap up dialog */}
      <Dialog open={wrapOpen} onOpenChange={setWrapOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wrap up "{session.title}"</DialogTitle>
            <DialogDescription>
              Share closing notes with everyone who attended. They'll be able to claim their certificates right after.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Key takeaways, links, homework..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 resize-none"
            maxLength={2000}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWrapOpen(false)}>Not yet</Button>
            <Button disabled={busy} onClick={handleWrapUp}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
