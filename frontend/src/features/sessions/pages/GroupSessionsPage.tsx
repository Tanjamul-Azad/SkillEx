import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Clock,
  CalendarDays,
  Award,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
  Sparkles,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  groupSessionService,
  type GroupSession,
} from '@/services/groupSessionService';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type Tab = 'discover' | 'mine';

export default function GroupSessionsPage() {
  useDocumentTitle('Group Sessions');
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('discover');
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (which: Tab) => {
    setLoading(true);
    setLoadError(false);
    try {
      const result =
        which === 'discover'
          ? await groupSessionService.listActive()
          : await groupSessionService.listMine();
      setSessions(result.content ?? []);
    } catch {
      setLoadError(true);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const handleJoin = async (session: GroupSession) => {
    setBusyId(session.id);
    try {
      await groupSessionService.join(session.id);
      toast({ title: 'Seat reserved', description: `You're in. See you at "${session.title}".` });
      await load(tab);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not join',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleLeave = async (session: GroupSession) => {
    setBusyId(session.id);
    try {
      await groupSessionService.leave(session.id);
      toast({ title: 'Seat released', description: `You left "${session.title}".` });
      await load(tab);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not leave',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (session: GroupSession) => {
    if (!window.confirm(`Cancel "${session.title}"? Attendees will be notified.`)) return;
    setBusyId(session.id);
    try {
      await groupSessionService.cancel(session.id);
      toast({ title: 'Session cancelled' });
      await load(tab);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not cancel',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (session: GroupSession, notes: string) => {
    setBusyId(session.id);
    try {
      await groupSessionService.complete(session.id, notes);
      toast({
        title: 'Session completed',
        description: 'Attendees can now claim their certificates.',
      });
      await load(tab);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not complete session',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleClaimCertificate = async (session: GroupSession) => {
    setBusyId(session.id);
    try {
      const cert = await groupSessionService.claimCertificate(session.id);
      toast({
        title: 'Certificate earned',
        description: `${cert.skillName}, taught by ${cert.mentorName}.`,
      });
      await load(tab);
      navigate(`/certificates?certificateId=${cert.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not claim certificate',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mx-auto max-w-5xl space-y-8 py-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="font-headline text-3xl font-extrabold text-foreground">
              Group Sessions
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              One mentor, many learners. Attend a workshop, get the shared notes, earn a certificate.
            </p>
          </div>
          <Button className="rounded-xl gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Host a Workshop
          </Button>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex gap-2">
          <Button
            variant={tab === 'discover' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setTab('discover')}
          >
            Discover
          </Button>
          <Button
            variant={tab === 'mine' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setTab('mine')}
          >
            My Sessions
          </Button>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="custom" className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : loadError ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border/40 bg-card p-12 text-center"
          >
            <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              Couldn't load group sessions
            </p>
            <p className="mt-1 text-muted-foreground">Check your connection and try again.</p>
            <Button variant="outline" className="mt-6 rounded-xl" onClick={() => load(tab)}>
              Retry
            </Button>
          </motion.div>
        ) : sessions.length === 0 ? (
          <motion.div
            variants={itemVariants}
            className="rounded-2xl border border-border/40 bg-card p-12 text-center"
          >
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 text-lg font-semibold text-foreground">
              {tab === 'discover' ? 'No upcoming workshops' : 'Nothing here yet'}
            </p>
            <p className="mt-1 text-muted-foreground">
              {tab === 'discover'
                ? 'Be the first to host a workshop on a skill you teach.'
                : 'Join a workshop from the Discover tab, or host your own.'}
            </p>
            <Button className="mt-6 rounded-xl" onClick={() => setCreateOpen(true)}>
              Host a Workshop
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <AnimatePresence>
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  currentUserId={user?.id}
                  busy={busyId === session.id}
                  onJoin={() => handleJoin(session)}
                  onLeave={() => handleLeave(session)}
                  onCancel={() => handleCancel(session)}
                  onComplete={(notes) => handleComplete(session, notes)}
                  onClaimCertificate={() => handleClaimCertificate(session)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <CreateSessionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          setTab('mine');
          load('mine');
        }}
      />
    </DashboardLayout>
  );
}

/* ── Session card ─────────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<GroupSession['status'], string> = {
  SCHEDULED: 'border-blue-500/40 text-blue-600 dark:text-blue-400',
  IN_PROGRESS: 'border-green-500/40 text-green-600 dark:text-green-400',
  COMPLETED: 'border-border text-muted-foreground',
  CANCELLED: 'border-red-500/40 text-red-600 dark:text-red-400',
};

const STATUS_LABELS: Record<GroupSession['status'], string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function SessionCard({
  session,
  currentUserId,
  busy,
  onJoin,
  onLeave,
  onCancel,
  onComplete,
  onClaimCertificate,
}: {
  session: GroupSession;
  currentUserId?: string;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onCancel: () => void;
  onComplete: (notes: string) => void;
  onClaimCertificate: () => void;
}) {
  const [completeOpen, setCompleteOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const isHost = currentUserId === session.mentorId;
  const myAttendance = session.attendees.find((a) => a.userId === currentUserId);
  const isFull = session.attendees.length >= session.maxAttendees;
  const isOpen = session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS';

  const when = new Date(session.scheduledAt);
  const dateLabel = when.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <motion.div
      variants={itemVariants}
      layout
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col rounded-2xl border border-border/40 bg-card overflow-hidden"
    >
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-2">{session.skillName}</Badge>
            <h3 className="font-headline text-lg font-bold text-foreground leading-snug">
              {session.title}
            </h3>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-xs', STATUS_STYLES[session.status])}>
            {STATUS_LABELS[session.status]}
          </Badge>
        </div>

        {session.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{session.description}</p>
        )}

        {/* Host */}
        <div className="mt-4 flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={session.mentorAvatar ?? undefined} alt={session.mentorName} />
            <AvatarFallback className="text-xs">{session.mentorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            Hosted by{' '}
            <span className="font-semibold text-foreground">
              {isHost ? 'you' : session.mentorName}
            </span>
          </span>
        </div>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {dateLabel}, {timeLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {session.durationMinutes} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {session.attendees.length}/{session.maxAttendees} seats
          </span>
        </div>

        {/* Attendee avatars */}
        {session.attendees.length > 0 && (
          <div className="mt-3 flex -space-x-2">
            {session.attendees.slice(0, 6).map((a) => (
              <Avatar key={a.userId} className="h-7 w-7 ring-2 ring-card">
                <AvatarImage src={a.avatar ?? undefined} alt={a.name} />
                <AvatarFallback className="text-[10px]">{a.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
            {session.attendees.length > 6 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-card text-[10px] font-semibold">
                +{session.attendees.length - 6}
              </div>
            )}
          </div>
        )}

        {/* Shared notes after completion */}
        {session.status === 'COMPLETED' && session.sharedNotes && (
          <div className="mt-4 rounded-lg border border-border/40 bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Session notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
              {session.sharedNotes}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-border/40 bg-muted/10 px-5 py-3 flex flex-wrap gap-2">
        {isHost && isOpen && (
          <>
            <Button
              size="sm"
              className="rounded-lg flex-1"
              disabled={busy}
              onClick={() => setCompleteOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Wrap Up
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              disabled={busy}
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-1.5" />
              Cancel
            </Button>
          </>
        )}

        {!isHost && isOpen && !myAttendance && (
          <Button
            size="sm"
            className="rounded-lg flex-1"
            disabled={busy || isFull}
            onClick={onJoin}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isFull ? 'Full' : 'Join Session'}
          </Button>
        )}

        {!isHost && isOpen && myAttendance && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg flex-1"
            disabled={busy}
            onClick={onLeave}
          >
            Leave Session
          </Button>
        )}

        {!isHost && session.status === 'COMPLETED' && myAttendance && !myAttendance.certificateEarned && (
          <Button size="sm" className="rounded-lg flex-1" disabled={busy} onClick={onClaimCertificate}>
            <Award className="h-4 w-4 mr-1.5" />
            Claim Certificate
          </Button>
        )}

        {!isHost && session.status === 'COMPLETED' && myAttendance?.certificateEarned && (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
            <Award className="h-4 w-4" />
            Certificate earned
          </div>
        )}

        {session.status === 'CANCELLED' && (
          <p className="text-sm text-muted-foreground">This session was cancelled.</p>
        )}
      </div>

      {/* Complete dialog (host) */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Wrap up "{session.title}"</DialogTitle>
            <DialogDescription>
              Share closing notes with everyone who attended. They'll be able to claim their
              certificates right after.
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
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Not yet
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                setCompleteOpen(false);
                onComplete(notes);
              }}
            >
              Complete Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ── Create dialog ────────────────────────────────────────────────────────── */

function CreateSessionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [skillId, setSkillId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxAttendees, setMaxAttendees] = useState('10');
  const [audienceLevel, setAudienceLevel] = useState('beginner to intermediate');
  const [goal, setGoal] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftBrief, setDraftBrief] = useState<{
    agenda: string;
    prerequisites: string;
    takeaways: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const teachableSkills = useMemo(() => user?.skillsOffered ?? [], [user]);

  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, [open]);

  const canSubmit =
    skillId && title.trim().length >= 4 && scheduledAt && !submitting;

  const handleGenerateDraft = async () => {
    if (!skillId || drafting) return;

    setDrafting(true);
    try {
      const draft = await groupSessionService.draft({
        skillId,
        audienceLevel,
        goal: goal.trim(),
      });
      setTitle(draft.title);
      setDescription(draft.description);
      setDuration(String(draft.durationMinutes));
      setMaxAttendees(String(draft.maxAttendees <= 5 ? 5 : draft.maxAttendees <= 10 ? 10 : 20));
      setDraftBrief({
        agenda: draft.agenda,
        prerequisites: draft.prerequisites,
        takeaways: draft.takeaways,
      });
      toast({
        title: 'AI draft ready',
        description: 'Review the content, set a time, then publish the workshop.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not generate draft',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      toast({ variant: 'destructive', title: 'Pick a time in the future' });
      return;
    }

    setSubmitting(true);
    try {
      await groupSessionService.create({
        skillId,
        title: title.trim(),
        description: description.trim(),
        scheduledAt,
        durationMinutes: parseInt(duration, 10),
        maxAttendees: parseInt(maxAttendees, 10),
      });
      toast({ title: 'Workshop published', description: 'Learners can now reserve seats.' });
      setSkillId('');
      setTitle('');
      setDescription('');
      setScheduledAt('');
      setGoal('');
      setDraftBrief(null);
      onCreated();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create session',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Host a Workshop</DialogTitle>
          <DialogDescription>
            Pick one of the skills you teach and open seats for the community.
          </DialogDescription>
        </DialogHeader>

        {teachableSkills.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground">
            Add at least one skill you can teach to your profile before hosting a workshop.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill</label>
              <Select
                value={skillId}
                onValueChange={(value) => {
                  setSkillId(value);
                  setDraftBrief(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Which skill are you teaching?" />
                </SelectTrigger>
                <SelectContent>
                  {teachableSkills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.icon ? `${skill.icon} ${skill.name}` : skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI workshop draft
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generate a title, description, agenda, duration, and seats from your real skill profile.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl"
                  disabled={!skillId || drafting}
                  onClick={handleGenerateDraft}
                >
                  {drafting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Audience</label>
                  <Select value={audienceLevel} onValueChange={setAudienceLevel}>
                    <SelectTrigger className="h-9 rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="beginner to intermediate">Beginner to intermediate</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Goal</label>
                  <Input
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="e.g., build a portfolio-ready demo"
                    className="h-9 rounded-xl bg-background"
                    maxLength={180}
                  />
                </div>
              </div>

              <AnimatePresence>
                {draftBrief && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="grid gap-3 text-xs sm:grid-cols-3">
                      <DraftMiniPanel label="Agenda" value={draftBrief.agenda} />
                      <DraftMiniPanel label="Prerequisites" value={draftBrief.prerequisites} />
                      <DraftMiniPanel label="Takeaways" value={draftBrief.takeaways} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Figma Auto-Layout in 60 Minutes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={180}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What will you cover?</label>
              <Textarea
                placeholder="Agenda, prerequisites, what attendees walk away with..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20 resize-none"
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date & time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="75">75 minutes</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seats</label>
              <Select value={maxAttendees} onValueChange={setMaxAttendees}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 seats</SelectItem>
                  <SelectItem value="10">10 seats</SelectItem>
                  <SelectItem value="20">20 seats</SelectItem>
                  <SelectItem value="50">50 seats</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={!canSubmit} onClick={handleSubmit}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publish Workshop
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DraftMiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/70 p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 line-clamp-4 whitespace-pre-line text-foreground">
        {value}
      </p>
    </div>
  );
}
