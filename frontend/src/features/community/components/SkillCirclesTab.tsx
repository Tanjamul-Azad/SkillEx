import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Loader2,
  BookOpen,
  HelpCircle,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
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
} from '@/types';

const ACTIVITY_LABELS: Record<string, string> = {
  VERY_ACTIVE: '🔥 Very Active',
  ACTIVE: '⚡ Active',
  QUIET: '😴 Quiet',
};

const RESOURCE_TYPES = ['LINK', 'FILE', 'NOTE'];
const DIFFICULTIES = ['BEGINNER', 'MODERATE', 'ADVANCED'];

const formatEnumLabel = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

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
      <div className="group relative overflow-hidden h-full flex flex-col rounded-xl border border-border/50 bg-card text-card-foreground transition-all duration-300 hover:border-primary/30 hover:shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
        <div className="p-6 flex-grow flex flex-col relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/50 text-4xl group-hover:scale-105 transition-transform duration-300">
              {circle.icon}
            </div>
            <Badge 
              variant="secondary"
              className={cn(
                'px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest border border-border/50',
                circle.activity === 'VERY_ACTIVE' ? 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30' : 
                circle.activity === 'QUIET' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30' : 
                'bg-muted text-muted-foreground'
              )}
            >
              {ACTIVITY_LABELS[circle.activity] ?? circle.activity}
            </Badge>
          </div>
          <h3 className="mt-6 text-2xl font-extrabold font-headline leading-tight text-foreground hover:text-primary transition-colors cursor-pointer drop-shadow-sm" onClick={() => onOpen(circle)}>{circle.name}</h3>
          <div className="flex flex-wrap gap-2 mt-4">
            {circle.skills.map(skill => (
              <Badge key={skill.id} variant="outline" className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-muted/20 border border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all text-foreground/80">
                {skill.name}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-grow">{circle.description}</p>
          <div className="flex-grow" />
          
          <div className="mt-6 bg-muted/20 p-4 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Members</span>
                <div className="flex items-center -space-x-2 mt-1">
                  {circle.members?.slice(0, 4).map((m, index) => (
                    <Avatar
                      key={m.id}
                      className="h-7 w-7 border-2 border-background shadow-sm hover:scale-110 transition-transform relative hover:z-20"
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
                <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground block mb-1">Total</span>
                <p className="text-xl font-headline font-extrabold text-foreground">{circle.memberCount}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Last session: {circle.lastSession ? new Date(circle.lastSession).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
            </span>
          </div>

          <div className="mt-5 flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground h-10"
              onClick={() => onOpen(circle)}
            >
              Workspace
            </Button>
            <Button
              size="sm"
              className={cn(
                'flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all h-10',
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
  const { toast } = useToast();
  const [active, setActive] = useState('dashboard');
  const [dashboard, setDashboard] = useState<SkillCircleDashboard | null>(null);
  const [resources, setResources] = useState<CircleResource[]>([]);
  const [helpRequests, setHelpRequests] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', url: '', notes: '', resourceType: 'LINK', difficulty: 'BEGINNER', skillId: '' });
  const [helpForm, setHelpForm] = useState({ title: '', content: '', skillId: '' });

  const loadWorkspace = useCallback(async () => {
    if (!circle) return;
    setLoading(true);
    try {
      const [dash, resourcePage, helpPage] = await Promise.all([
        CommunityService.getCircleDashboard(circle.id),
        CommunityService.getCircleResources(circle.id, 0, 20),
        CommunityService.getDiscussions(0, 20, { circleId: circle.id, threadType: 'QUESTION', status: 'OPEN' }),
      ]);
      setDashboard(dash);
      setResources(resourcePage.content ?? []);
      setHelpRequests(helpPage.content ?? []);
    } catch (error) {
      toast({ title: 'Could not load circle workspace', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [circle, toast]);

  useEffect(() => {
    if (open) {
      loadWorkspace();
    }
  }, [open, loadWorkspace]);

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
      setHelpRequests(prev => [created, ...prev]);
      setHelpForm({ title: '', content: '', skillId: '' });
      toast({ title: 'Help request posted', description: 'Circle members can now answer it.', variant: 'success' });
      CommunityService.getCircleDashboard(circle.id).then(setDashboard).catch(() => {});
    } catch (error) {
      toast({ title: 'Could not post help request', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!circle) return null;
  const currentCircle = dashboard?.circle ?? circle;
  const workspaceTabs = ['dashboard', 'resources', 'help desk', 'events', 'members'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-muted text-2xl">{currentCircle.icon}</div>
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
            </div>
          </div>
        )}

        {!loading && active === 'resources' && (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Share Resource</h4>
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
            </div>
            <div className="space-y-3">
              {helpRequests.length === 0 && <div className="product-empty">No open help requests.</div>}
              {helpRequests.map(item => (
                <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-primary/10 text-primary">{formatEnumLabel(item.status)}</Badge>
                    {item.skill && <Badge variant="outline" className="rounded-full">{item.skill.name}</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground">{item.replies} replies</span>
                  </div>
                  <p className="mt-3 font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && active === 'events' && (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Circle Events</h4>
            {dashboard?.nextEvent ? (
              <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
                <p className="font-bold text-foreground">{dashboard.nextEvent.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{new Date(dashboard.nextEvent.eventDate).toLocaleString()} · {formatEnumLabel(dashboard.nextEvent.eventType)}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No upcoming circle event yet.</p>
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

  return (
    <div className="space-y-8">
      <div className="product-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-foreground">Skill circles</h2>
            <p className="mt-1 text-sm text-muted-foreground">Focused spaces for repeat learning, practice, and community support.</p>
          </div>
          <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create circle
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl border-2 border-dashed border-border/70 bg-card flex flex-col items-center justify-center text-center p-8 min-h-[300px] cursor-pointer hover:border-primary/45 hover:bg-primary/5 transition-all duration-300 group h-full"
        >
          <div className="h-20 w-20 rounded-full bg-muted/50 border border-border flex items-center justify-center group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300">
            <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <h3 className="mt-6 font-extrabold font-headline text-xl text-foreground group-hover:text-primary transition-colors">Create New Circle</h3>
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
