import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  BookOpen,
<<<<<<< HEAD
  CheckCircle2,
  ExternalLink,
  Globe2,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Mic2,
  Music,
  Palette,
  Plus,
  Sparkles,
  Terminal,
  UsersRound,
=======
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
>>>>>>> a6c29646776fa92890ef4043f7456856daaa0353
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
import { SkillPicker } from './SkillPicker';
import { CommunityService } from '@/services/communityService';
import { SkillService } from '@/services/skillService';
import type {
  SkillCircle,
  Skill,
  SkillCircleDashboard,
  CircleResource,
  Discussion,
  DiscussionReply,
  Event,
} from '@/types';

const RESOURCE_TYPES = ['LINK', 'FILE', 'NOTE'];
const DIFFICULTIES = ['BEGINNER', 'MODERATE', 'ADVANCED'];
const ACTIVITY_LABELS: Record<string, string> = {
  VERY_ACTIVE: 'Very Active',
  ACTIVE: 'Active',
  QUIET: 'Quiet',
};
const CIRCLE_ICON_COMPONENTS = {
  terminal: Terminal,
  globe: Globe2,
  'bar-chart': BarChart3,
  bar_chart: BarChart3,
  palette: Palette,
  users: UsersRound,
  debate: Mic2,
  mic: Mic2,
  music: Music,
} as const;

const formatEnumLabel = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getCircleInitials = (circle: Pick<SkillCircle, 'name' | 'icon'>) => {
  const rawIcon = String(circle.icon ?? '').trim();
  if (rawIcon && rawIcon.length <= 3) return rawIcon.toUpperCase();
  return circle.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase() || 'SC';
};

const CircleMark = ({ circle, size = 'md' }: { circle: SkillCircle; size?: 'sm' | 'md' }) => {
  const key = String(circle.icon ?? '').trim().toLowerCase();
  const Icon = CIRCLE_ICON_COMPONENTS[key as keyof typeof CIRCLE_ICON_COMPONENTS];
  const sizeClass = size === 'sm' ? 'h-11 w-11 rounded-xl' : 'h-12 w-12 rounded-2xl';
  const iconClass = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <div className={cn(
      'flex shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary shadow-sm',
      sizeClass
    )}>
      {Icon ? (
        <Icon className={iconClass} />
      ) : (
        <span className="max-w-full truncate px-1 text-sm font-extrabold leading-none tracking-tight">
          {getCircleInitials(circle)}
        </span>
      )}
    </div>
  );
};

interface CircleCardProps {
  circle: SkillCircle;
  currentUserId?: string;
  busy?: boolean;
  onJoin: (circle: SkillCircle) => Promise<void>;
  onLeave: (circle: SkillCircle) => Promise<void>;
  onOpen: (circle: SkillCircle) => void;
}

const CircleCard = React.memo(({
  circle,
  currentUserId,
  busy,
  onJoin,
  onLeave,
  onOpen,
}: CircleCardProps) => {
  const joined = Boolean(currentUserId && circle.members?.some(member => member.id === currentUserId));
  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false);
  return (
    <>
      <div className="group relative flex h-full min-h-[286px] flex-col overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="relative z-10 flex h-full flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <CircleMark circle={circle} size="md" />
            <Badge 
              variant="secondary"
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border border-border/50',
                circle.activity === 'VERY_ACTIVE' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30' : 
                circle.activity === 'QUIET' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30' : 
                'bg-muted text-muted-foreground'
              )}
            >
              {ACTIVITY_LABELS[circle.activity] ?? circle.activity}
            </Badge>
          </div>
          <button type="button" className="mt-5 text-left" onClick={() => onOpen(circle)}>
            <h3 className="line-clamp-2 text-xl font-extrabold font-headline leading-tight text-foreground transition-colors group-hover:text-primary">
              {circle.name}
            </h3>
          </button>
          <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-muted-foreground">
            {circle.description || 'A focused workspace for practice, resources, events, and member help.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {circle.skills.slice(0, 3).map(skill => (
              <Badge key={skill.id} variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-muted/20 border border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all text-foreground/80">
                {skill.name}
              </Badge>
            ))}
            {circle.skills.length > 3 && (
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                +{circle.skills.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="mt-auto pt-5">
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/50 bg-muted/20 p-3">
              <div>
                <p className="text-base font-headline font-extrabold text-foreground">{circle.memberCount}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Members</p>
              </div>
              <div>
                <p className="text-base font-headline font-extrabold text-foreground">{circle.resourceCount ?? 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Resources</p>
              </div>
              <div>
                <p className="text-base font-headline font-extrabold text-foreground">{circle.openHelpCount ?? 0}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Open Help</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/50 bg-muted/10 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Active members</span>
                <div className="mt-1.5 flex items-center -space-x-2">
                  {circle.members?.slice(0, 4).map((m, index) => (
                    <Avatar
                      key={m.id}
                      className="relative h-7 w-7 border-2 border-background shadow-sm transition-transform hover:z-20 hover:scale-110"
                      style={{ zIndex: 10 - index }}
                    >
                      <AvatarImage src={m.avatar} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{m.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {circle.members && circle.members.length > 4 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground shadow-sm relative z-10">
                      +{circle.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="mb-1 block text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Next</span>
                <p className="max-w-[7rem] truncate text-xs font-bold text-foreground">
                  {circle.lastSession ? new Date(circle.lastSession).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No session'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="h-10 flex-1 rounded-xl border border-border/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              onClick={() => onOpen(circle)}
            >
              Workspace
            </Button>
            <Button
              size="sm"
              className={cn(
                'h-10 flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all',
                joined 
                  ? 'border border-border/50 text-muted-foreground bg-muted hover:bg-muted/80' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
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

interface CircleWorkspaceDialogProps {
  circle: SkillCircle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: Skill[];
}

const CircleWorkspaceDialog = ({
  circle,
  open,
  onOpenChange,
  skills,
}: CircleWorkspaceDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState('dashboard');
  const [dashboard, setDashboard] = useState<SkillCircleDashboard | null>(null);
  const [resources, setResources] = useState<CircleResource[]>([]);
  const [helpRequests, setHelpRequests] = useState<Discussion[]>([]);
  const [circleEvents, setCircleEvents] = useState<Event[]>([]);
  const [helpFilter, setHelpFilter] = useState<'OPEN' | 'SOLVED' | 'MINE' | 'ALL'>('OPEN');
  const [selectedHelp, setSelectedHelp] = useState<Discussion | null>(null);
  const [helpDetailOpen, setHelpDetailOpen] = useState(false);
  const [helpReplies, setHelpReplies] = useState<DiscussionReply[]>([]);
  const [helpRepliesLoading, setHelpRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [helpActionBusy, setHelpActionBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', url: '', notes: '', resourceType: 'LINK', difficulty: 'BEGINNER', skillId: '' });
  const [helpForm, setHelpForm] = useState({ title: '', content: '', skillId: '' });

  const isCircleMember = useCallback((target: SkillCircle | null) => {
    if (!target || !user?.id) return false;
    return target.memberRole === 'OWNER'
      || target.memberRole === 'MEMBER'
      || target.members?.some(member => member.id === user.id);
  }, [user?.id]);

  const loadWorkspace = useCallback(async () => {
    if (!circle) return;
    setLoading(true);
    try {
      const [dash, resourcePage, eventPage] = await Promise.all([
        CommunityService.getCircleDashboard(circle.id),
        CommunityService.getCircleResources(circle.id, 0, 20),
        CommunityService.getEvents(0, 50),
      ]);
      setDashboard(dash);
      setResources(resourcePage.content ?? []);
      setCircleEvents((eventPage.content ?? []).filter(event => event.circleId === circle.id));
      if (isCircleMember(dash.circle ?? circle)) {
        const helpPage = await CommunityService.getDiscussions(0, 50, { circleId: circle.id, threadType: 'QUESTION' });
        setHelpRequests(helpPage.content ?? []);
      } else {
        setHelpRequests([]);
      }
    } catch (error) {
      toast({ title: 'Could not load circle workspace', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [circle, isCircleMember, toast]);

  useEffect(() => {
    if (open) {
      loadWorkspace();
    }
  }, [open, loadWorkspace]);

  const upsertHelpRequest = useCallback((discussion: Discussion) => {
    setHelpRequests(prev => {
      const exists = prev.some(item => item.id === discussion.id);
      return exists
        ? prev.map(item => item.id === discussion.id ? discussion : item)
        : [discussion, ...prev];
    });
  }, []);

  const loadHelpReplies = useCallback(async (discussion = selectedHelp) => {
    if (!discussion) return;
    setHelpRepliesLoading(true);
    try {
      const response = await CommunityService.getDiscussionReplies(discussion.id);
      setHelpReplies(response.content ?? []);
    } catch (error) {
      toast({ title: 'Could not load replies', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setHelpRepliesLoading(false);
    }
  }, [selectedHelp, toast]);

  const openHelpRequest = useCallback((discussion: Discussion) => {
    setSelectedHelp(discussion);
    setHelpDetailOpen(true);
  }, []);

  useEffect(() => {
    if (helpDetailOpen) {
      loadHelpReplies();
    }
  }, [helpDetailOpen, loadHelpReplies]);

  useEffect(() => {
    if (!open || !circle) return;
    const helpId = searchParams.get('helpId');
    if (!helpId || selectedHelp?.id === helpId) return;
    setActive('help desk');
    CommunityService.getDiscussion(helpId)
      .then(discussion => {
        if (discussion.circleId !== circle.id) return;
        upsertHelpRequest(discussion);
        setSelectedHelp(discussion);
        setHelpDetailOpen(true);
      })
      .catch(() => {});
  }, [open, circle, searchParams, selectedHelp?.id, upsertHelpRequest]);

  const createResource = async () => {
    if (!circle || !resourceForm.title.trim()) {
      toast({ title: 'Resource title is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await CommunityService.createCircleResource(circle.id, {
        title: resourceForm.title.trim(),
        url: resourceForm.url.trim() || undefined,
        notes: resourceForm.notes.trim() || undefined,
        resourceType: resourceForm.resourceType,
        difficulty: resourceForm.difficulty,
        skillId: resourceForm.skillId || undefined,
      });
      setResources(prev => [created, ...prev]);
      setResourceForm({ title: '', url: '', notes: '', resourceType: 'LINK', difficulty: 'BEGINNER', skillId: '' });
      toast({ title: 'Resource shared', description: 'Circle members were notified.', variant: 'success' });
      CommunityService.getCircleDashboard(circle.id).then(setDashboard).catch(() => {});
    } catch (error) {
      toast({ title: 'Could not share resource', description: error instanceof Error ? error.message : 'Please join the circle first.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const createHelpRequest = async () => {
    if (!circle || !helpForm.title.trim() || !helpForm.content.trim()) {
      toast({ title: 'Help request title and details are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const created = await CommunityService.createDiscussion({
        title: helpForm.title.trim(),
        content: helpForm.content.trim(),
        category: 'Help & Support',
        threadType: 'QUESTION',
        circleId: circle.id,
        skillId: helpForm.skillId || undefined,
      });
      upsertHelpRequest(created);
      setHelpForm({ title: '', content: '', skillId: '' });
      setSelectedHelp(created);
      setHelpDetailOpen(true);
      toast({ title: 'Help request posted', description: 'Joined circle members were notified.', variant: 'success' });
      CommunityService.getCircleDashboard(circle.id).then(setDashboard).catch(() => {});
    } catch (error) {
      toast({ title: 'Could not post help request', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitHelpReply = async () => {
    if (!selectedHelp || !replyText.trim()) {
      toast({ title: 'Reply cannot be empty', variant: 'destructive' });
      return;
    }
    setReplySubmitting(true);
    try {
      const reply = await CommunityService.addDiscussionReply(selectedHelp.id, replyText.trim());
      setHelpReplies(prev => [...prev, reply]);
      setReplyText('');
      const updated = { ...selectedHelp, replies: selectedHelp.replies + 1 };
      setSelectedHelp(updated);
      upsertHelpRequest(updated);
      toast({ title: 'Reply posted', description: 'The requester and thread participants were notified.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not post reply', description: error instanceof Error ? error.message : 'Please join the circle first.', variant: 'destructive' });
    } finally {
      setReplySubmitting(false);
    }
  };

  const acceptHelpReply = async (reply: DiscussionReply) => {
    if (!selectedHelp) return;
    setHelpActionBusy(true);
    try {
      const updated = await CommunityService.acceptDiscussionReply(selectedHelp.id, reply.id);
      setSelectedHelp(updated);
      upsertHelpRequest(updated);
      setHelpReplies(prev => prev.map(item => ({ ...item, isAccepted: item.id === reply.id })));
      if (circle?.id) {
        CommunityService.getCircleDashboard(circle.id).then(setDashboard).catch(() => {});
      }
      toast({ title: 'Answer accepted', description: 'This help request is now solved.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not accept answer', description: error instanceof Error ? error.message : 'Only the requester can accept an answer.', variant: 'destructive' });
    } finally {
      setHelpActionBusy(false);
    }
  };

  const resolveHelpRequest = async () => {
    if (!selectedHelp) return;
    setHelpActionBusy(true);
    try {
      const updated = await CommunityService.resolveDiscussion(selectedHelp.id);
      setSelectedHelp(updated);
      upsertHelpRequest(updated);
      if (circle?.id) {
        CommunityService.getCircleDashboard(circle.id).then(setDashboard).catch(() => {});
      }
      toast({ title: 'Help request marked solved', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not mark solved', description: error instanceof Error ? error.message : 'Only the requester can resolve it.', variant: 'destructive' });
    } finally {
      setHelpActionBusy(false);
    }
  };

  if (!circle) return null;
  const currentCircle = dashboard?.circle ?? circle;
  const viewerIsMember = isCircleMember(currentCircle);
  const visibleHelpRequests = helpRequests.filter(item => {
    if (helpFilter === 'ALL') return true;
    if (helpFilter === 'MINE') return item.author.id === user?.id;
    return item.status === helpFilter;
  });
  const canModerateSelectedHelp = Boolean(selectedHelp && user?.id === selectedHelp.author.id);
  const workspaceTabs = ['dashboard', 'resources', 'help desk', 'events', 'members'];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CircleMark circle={currentCircle} />
            <div>
              <DialogTitle>{currentCircle.name}</DialogTitle>
              <DialogDescription>{currentCircle.description || 'Skill workspace for resources, help, events, and active members.'}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {workspaceTabs.map(tab => (
            <Button
              key={tab}
              size="sm"
              variant={active === tab ? 'default' : 'outline'}
              className="rounded-xl text-[10px] font-bold uppercase tracking-widest"
              onClick={() => setActive(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-border/50 p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading workspace
          </div>
        )}

        {!loading && active === 'dashboard' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Resources', value: currentCircle.resourceCount ?? resources.length, icon: BookOpen },
                { label: 'Open Help', value: currentCircle.openHelpCount ?? helpRequests.length, icon: HelpCircle },
                { label: 'Upcoming Events', value: currentCircle.upcomingEventCount ?? 0, icon: Calendar },
                { label: 'Activity Score', value: dashboard?.activityScore ?? 0, icon: Sparkles },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <p className="font-headline text-2xl font-extrabold text-foreground">{value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Weekly Goal</h4>
              <p className="text-sm leading-relaxed text-foreground">{dashboard?.weeklyGoal ?? 'Share resources and help one member this week.'}</p>
              {dashboard?.nextEvent && (
                <div className="mt-4 rounded-xl bg-muted/30 border border-border/50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Next Event</p>
                  <p className="mt-1 font-bold text-foreground">{dashboard.nextEvent.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(dashboard.nextEvent.eventDate).toLocaleString()}</p>
                </div>
              )}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Skill Circle</p>
                  <p className="mt-1 text-sm text-muted-foreground">Long-running workspace for resources, help desk, members, and circle events.</p>
                </div>
                <a href="/match?tab=chain" className="rounded-xl border border-border/50 bg-background/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Skill Chain</p>
                  <p className="mt-1 text-sm text-muted-foreground">Live exchange path where multiple people teach and learn in a matched loop.</p>
                </a>
              </div>
            </div>
          </div>
        )}

        {!loading && active === 'resources' && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Share Resource</h4>
              {viewerIsMember ? (
                <>
                  <Input placeholder="Resource title" value={resourceForm.title} onChange={event => setResourceForm(prev => ({ ...prev, title: event.currentTarget.value }))} />
                  <Input placeholder="Link or file URL" value={resourceForm.url} onChange={event => setResourceForm(prev => ({ ...prev, url: event.currentTarget.value }))} />
                  <Textarea rows={3} placeholder="Notes, usage tips, or why this helps" value={resourceForm.notes} onChange={event => setResourceForm(prev => ({ ...prev, notes: event.currentTarget.value }))} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={resourceForm.resourceType} onChange={event => setResourceForm(prev => ({ ...prev, resourceType: event.currentTarget.value }))} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {RESOURCE_TYPES.map(type => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                    </select>
                    <select value={resourceForm.difficulty} onChange={event => setResourceForm(prev => ({ ...prev, difficulty: event.currentTarget.value }))} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                      {DIFFICULTIES.map(level => <option key={level} value={level}>{formatEnumLabel(level)}</option>)}
                    </select>
                  </div>
                  <select value={resourceForm.skillId} onChange={event => setResourceForm(prev => ({ ...prev, skillId: event.currentTarget.value }))} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">No skill tag</option>
                    {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                  </select>
                  <Button onClick={createResource} disabled={submitting} className="w-full rounded-xl">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                    Share resource
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Join this circle to share links, files, notes, or verified learning resources.
                </div>
              )}
            </div>
            <div className="space-y-3">
              {resources.length === 0 && <div className="product-empty">No resources shared yet.</div>}
              {resources.map(resource => (
                <div key={resource.id} className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{resource.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{resource.notes || 'No notes added.'}</p>
                    </div>
                    <Badge variant="outline" className="rounded-full">{formatEnumLabel(resource.difficulty)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {resource.skill && <Badge className="rounded-full bg-primary/10 text-primary">{resource.skill.name}</Badge>}
                    {resource.isPinned && <Badge variant="outline">Pinned</Badge>}
                    {resource.isVerified && <Badge variant="outline">Verified</Badge>}
                    {resource.url && <a className="ml-auto flex items-center gap-1 text-primary hover:underline" href={resource.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /> Open</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && active === 'help desk' && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ask Circle</h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Help requests notify joined members and stay searchable here with replies, accepted answers, and solved state.
              </p>
              {viewerIsMember ? (
                <>
                  <Input placeholder="What do you need help with?" value={helpForm.title} onChange={event => setHelpForm(prev => ({ ...prev, title: event.currentTarget.value }))} />
                  <Textarea rows={4} placeholder="Add context, what you tried, and the answer you need" value={helpForm.content} onChange={event => setHelpForm(prev => ({ ...prev, content: event.currentTarget.value }))} />
                  <select value={helpForm.skillId} onChange={event => setHelpForm(prev => ({ ...prev, skillId: event.currentTarget.value }))} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                    <option value="">No skill tag</option>
                    {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                  </select>
                  <Button onClick={createHelpRequest} disabled={submitting} className="w-full rounded-xl">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
                    Post help request
                  </Button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Join this circle to ask for help, reply, or view member-only help threads.
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'OPEN', label: 'Open' },
                  { id: 'SOLVED', label: 'Solved' },
                  { id: 'MINE', label: 'My requests' },
                  { id: 'ALL', label: 'All' },
                ].map(filter => (
                  <Button
                    key={filter.id}
                    type="button"
                    size="sm"
                    variant={helpFilter === filter.id ? 'default' : 'outline'}
                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => setHelpFilter(filter.id as typeof helpFilter)}
                    disabled={!viewerIsMember}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              {!viewerIsMember && <div className="product-empty">Member-only help desk. Join the circle to view requests and replies.</div>}
              {viewerIsMember && visibleHelpRequests.length === 0 && <div className="product-empty">No {helpFilter.toLowerCase()} help requests.</div>}
              {viewerIsMember && visibleHelpRequests.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className="w-full rounded-xl border border-border/50 bg-card p-4 text-left transition-all hover:border-primary/35 hover:bg-primary/5"
                  onClick={() => openHelpRequest(item)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('rounded-full', item.status === 'SOLVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary')}>
                      {formatEnumLabel(item.status)}
                    </Badge>
                    {item.skill && <Badge variant="outline" className="rounded-full">{item.skill.name}</Badge>}
                    {item.author.id === user?.id && <Badge variant="outline" className="rounded-full">Mine</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{item.replies} replies</span>
                  </div>
                  <p className="mt-3 font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                </button>
              ))}
            </div>
          </div>
        )}        {!loading && active === 'events' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Circle Events</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Global Events are public community sessions. Circle Events are the same event records, but scoped to this workspace for study sprints, office hours, review nights, and follow-up sessions with circle members.
              </p>
            </div>
            {circleEvents.length === 0 ? (
              <div className="product-empty">No events are linked to this circle yet. Create one from the Events tab and select this circle.</div>
            ) : (
              <div className="space-y-3">
                {circleEvents.map(event => (
                  <div key={event.id} className="rounded-xl border border-border/50 bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-primary/10 text-primary">{formatEnumLabel(event.eventType)}</Badge>
                      <Badge variant="outline" className="rounded-full">{event.isOnline ? 'Online' : 'In person'}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">{event.attendeeCount ?? event.attendees?.length ?? 0} going</span>
                    </div>
                    <p className="mt-3 font-bold text-foreground">{event.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{new Date(event.eventDate).toLocaleString()}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && active === 'members' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(currentCircle.members ?? []).map(member => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.name?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.university}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
    <Dialog open={helpDetailOpen} onOpenChange={setHelpDetailOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        {selectedHelp && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('rounded-full', selectedHelp.status === 'SOLVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary')}>
                  {formatEnumLabel(selectedHelp.status)}
                </Badge>
                {selectedHelp.skill && <Badge variant="outline" className="rounded-full">{selectedHelp.skill.name}</Badge>}
                <Badge variant="outline" className="rounded-full">{selectedHelp.replies} replies</Badge>
              </div>
              <DialogTitle className="font-headline text-2xl">{selectedHelp.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap">{selectedHelp.content}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedHelp.author.avatar} />
                  <AvatarFallback>{selectedHelp.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{selectedHelp.author.name}</p>
                  <p className="text-xs text-muted-foreground">Requester / {new Date(selectedHelp.createdAt).toLocaleString()}</p>
                </div>
                {canModerateSelectedHelp && selectedHelp.status !== 'SOLVED' && (
                  <Button size="sm" variant="outline" className="ml-auto rounded-xl border-border/50" onClick={resolveHelpRequest} disabled={helpActionBusy}>
                    {helpActionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Mark solved
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Replies</h4>
                {helpRepliesLoading && <div className="product-empty"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading replies</div>}
                {!helpRepliesLoading && helpReplies.length === 0 && <div className="product-empty">No replies yet. Be the first to help.</div>}
                {helpReplies.map(reply => (
                  <div key={reply.id} className={cn('rounded-xl border bg-card p-4', reply.isAccepted ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50')}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={reply.author.avatar} />
                        <AvatarFallback>{reply.author.name?.charAt(0) ?? 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-foreground">{reply.author.name}</p>
                          <span className="text-xs text-muted-foreground">{new Date(reply.createdAt).toLocaleString()}</span>
                          {reply.isAccepted && <Badge className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Accepted answer</Badge>}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{reply.content}</p>
                      </div>
                      {canModerateSelectedHelp && !reply.isAccepted && selectedHelp.status !== 'SOLVED' && (
                        <Button size="sm" variant="outline" className="rounded-xl border-border/50" onClick={() => acceptHelpReply(reply)} disabled={helpActionBusy}>
                          Accept
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedHelp.status === 'SOLVED' ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                  This help request is solved. Start a new request if the problem changes.
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <Label htmlFor="circle-help-reply">Reply</Label>
                  <Textarea
                    id="circle-help-reply"
                    rows={4}
                    className="mt-2"
                    value={replyText}
                    onChange={event => setReplyText(event.currentTarget.value)}
                    placeholder="Answer with steps, links, screenshots, or next actions..."
                  />
                  <div className="mt-3 flex justify-end">
                    <Button onClick={submitHelpReply} disabled={replySubmitting || !viewerIsMember}>
                      {replySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                      Post reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export const SkillCirclesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [circles, setCircles] = useState<SkillCircle[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<SkillCircle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [circleForm, setCircleForm] = useState({ name: '', description: '', icon: 'SE', skillIds: [] as string[] });

  useEffect(() => {
    CommunityService.getSkillCircles().then((r) => setCircles(r.content ?? [])).catch(() => {});
    SkillService.getAll().then(setSkills).catch(() => {});
  }, []);

  useEffect(() => {
    const circleId = searchParams.get('circleId');
    if (!circleId) return;
    CommunityService.getSkillCircle(circleId)
      .then(circle => {
        setSelectedCircle(circle);
        setWorkspaceOpen(true);
      })
      .catch(() => {});
  }, [searchParams]);

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
        description: circleForm.description.trim() || undefined,
        icon: circleForm.icon.trim() || 'SE',
        skillIds: circleForm.skillIds,
      });
      setCircles(prev => [created, ...prev]);
      setCreateOpen(false);
      setCircleForm({ name: '', description: '', icon: 'SE', skillIds: [] });
      toast({ title: 'Skill circle created', description: 'The circle is ready for members.', variant: 'success' });
    } catch (error) {
      toast({ title: 'Could not create circle', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openWorkspace = (circle: SkillCircle) => {
    setSelectedCircle(circle);
    setWorkspaceOpen(true);
  };

  const circleStats = useMemo(() => {
    const active = circles.filter(circle => circle.activity === 'ACTIVE' || circle.activity === 'VERY_ACTIVE').length;
    const members = circles.reduce((sum, circle) => sum + (circle.memberCount ?? 0), 0);
    const resources = circles.reduce((sum, circle) => sum + (circle.resourceCount ?? 0), 0);
    const openHelp = circles.reduce((sum, circle) => sum + (circle.openHelpCount ?? 0), 0);
    const upcoming = circles.reduce((sum, circle) => sum + (circle.upcomingEventCount ?? 0), 0);
    const topSkillNames = Array.from(
      new Set(circles.flatMap(circle => circle.skills.map(skill => skill.name)).filter(Boolean)),
    ).slice(0, 4);

    return { active, members, resources, openHelp, upcoming, topSkillNames };
  }, [circles]);

  return (
    <div className="space-y-8">
      <div className="product-panel overflow-hidden">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border border-primary/20 bg-primary/10 text-primary">
                <UsersRound className="mr-1 h-3 w-3" />
                Community workspaces
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {circleStats.active} active circles
              </Badge>
            </div>
            <h2 className="mt-3 font-headline text-2xl font-extrabold text-foreground">Skill circles</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Focused spaces for repeat learning, resource libraries, office hours, and member help desks.
            </p>
            {circleStats.topSkillNames.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {circleStats.topSkillNames.map(skill => (
                  <Badge key={skill} variant="outline" className="rounded-full bg-background/60">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create circle
          </Button>
        </div>
        <div className="grid border-t border-border/50 bg-muted/10 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Members', value: circleStats.members, icon: UsersRound },
            { label: 'Resources', value: circleStats.resources, icon: BookOpen },
            { label: 'Open help', value: circleStats.openHelp, icon: HelpCircle },
            { label: 'Events', value: circleStats.upcoming, icon: Calendar },
            { label: 'Circles', value: circles.length, icon: Sparkles },
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="group flex min-h-[286px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/70 bg-card p-6 text-center transition-all duration-300 hover:border-primary/45 hover:bg-primary/5"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/50 transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30">
            <Plus className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <h3 className="mt-5 font-headline text-lg font-extrabold text-foreground transition-colors group-hover:text-primary">Create New Circle</h3>
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
            onOpen={openWorkspace}
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
              <Label htmlFor="circle-description">Purpose</Label>
              <Textarea id="circle-description" rows={3} value={circleForm.description} onChange={event => {
                const value = event.currentTarget.value;
                setCircleForm(prev => ({ ...prev, description: value }));
              }} placeholder="What members practice, share, and help each other with..." />
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
      <CircleWorkspaceDialog
        circle={selectedCircle}
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        skills={skills}
      />
    </div>
  );
};
