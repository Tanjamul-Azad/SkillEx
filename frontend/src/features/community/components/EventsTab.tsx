import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Users, Plus, Loader2, ExternalLink, Sparkles, Clock } from 'lucide-react';
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
import { SkillPicker } from './SkillPicker';
import { CommunityService } from '@/services/communityService';
import { SkillService } from '@/services/skillService';
import type { Event, Skill, SkillCircle } from '@/types';

// ─── Skill recommendation engine ─────────────────────────────────────────────
// Maps lower-case keywords (found in the purpose/description text) to skill category names.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Programming: [
    'java','spring','springboot','kotlin','python','django','flask','c++','c#','nodejs',
    'express','php','laravel','ruby','rails','swift','objective-c','rust','go','golang',
    'code','coding','programming','software','backend','api','rest','microservice',
    'algorithm','data structure','oop','functional',
  ],
  'Web Development': [
    'html','css','javascript','typescript','react','vue','angular','svelte','nextjs',
    'nuxt','gatsby','webpack','vite','frontend','web','ui','ux','tailwind','bootstrap',
    'responsive','dom','browser','fullstack','full-stack','full stack',
  ],
  'Data Science': [
    'data','dataset','pandas','numpy','matplotlib','seaborn','sql','database','postgres',
    'mongodb','mysql','etl','pipeline','analytics','statistics','excel','tableau','powerbi',
    'bi','visualization','dashboards',
  ],
  'AI/ML': [
    'machine learning','ml','deep learning','neural','ai','llm','gpt','bert','transformers',
    'tensorflow','pytorch','keras','scikit','model','training','inference','nlp','cv','computer vision',
  ],
  Design: [
    'design','figma','sketch','photoshop','illustrator','xd','adobe','ui design','ux design',
    'graphic','logo','branding','typography','wireframe','prototype','colour','color','visual',
  ],
  'Blockchain': [
    'blockchain','solidity','ethereum','web3','crypto','nft','smart contract','defi','token','ledger',
  ],
  'Public Speaking': [
    'speak','speech','presentation','debate','communication','storytelling','pitch','rhetoric','toastmaster',
  ],
  'English Writing': [
    'english','write','writing','grammar','ielts','toefl','essay','content','copywriting','blog','journalism',
  ],
  'Video Editing': [
    'video','edit','premiere','after effects','davinci','motion','animation','youtube','shorts','reel','film',
  ],
  Photography: [
    'photo','photography','camera','lens','lightroom','raw','portrait','landscape','shoot',
  ],
  Music: [
    'music','guitar','piano','drum','bass','chord','melody','compose','audio','sound','mixing','producer',
  ],
};

function deriveSuggestedSkills(
  text: string,
  skills: Skill[],
  selectedIds: string[],
  maxResults = 8,
): Skill[] {
  if (!text.trim()) return [];
  const lower = text.toLowerCase();
  const matchedCategories = new Set<string>();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      matchedCategories.add(category);
    }
  }
  if (matchedCategories.size === 0) return [];
  return skills
    .filter(s => matchedCategories.has(s.category) && !selectedIds.includes(s.id))
    .slice(0, maxResults);
}

const EVENT_TYPES = [
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'STUDY_SPRINT', label: 'Study Sprint' },
  { value: 'OFFICE_HOUR', label: 'Office Hour' },
  { value: 'HACKATHON', label: 'Hackathon' },
  { value: 'PORTFOLIO_REVIEW', label: 'Portfolio Review' },
];

const formatEnumLabel = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isPastEvent = (event: Event) => {
  const time = new Date(event.eventDate).getTime();
  return !Number.isNaN(time) && time < Date.now();
};

const formatEventDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date pending';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  });
};

interface EventCardProps {
  event: Event;
  currentUserId?: string;
  busy?: boolean;
  interestBusy?: boolean;
  onAttend: (event: Event) => Promise<void>;
  onInterest: (event: Event) => Promise<void>;
  onOpen: (event: Event) => void;
}

const EventCard = React.memo(({
  event,
  currentUserId,
  busy,
  interestBusy,
  onAttend,
  onInterest,
  onOpen,
}: EventCardProps) => {
  const attending = event.rsvpState === 'GOING' || Boolean(currentUserId && event.attendees?.some(attendee => attendee.id === currentUserId));
  const interested = event.rsvpState === 'INTERESTED';
  const past = isPastEvent(event);
  const attendeeCount = Number(event.attendeeCount ?? event.attendees?.length ?? 0);
  const interestedCount = Number(event.interestedCount ?? 0);

  return (
    <div className={cn('product-row group grid gap-4 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.8fr)_auto] sm:items-center', past && 'opacity-75')}>
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className={cn(
            'rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest',
            past
              ? 'border-border/60 bg-muted/40 text-muted-foreground'
              : attending
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-primary/25 bg-primary/10 text-primary'
          )}>
            {past ? 'Past' : attending ? 'Registered' : 'Upcoming'}
          </Badge>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {event.isOnline ? 'Online' : 'In person'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
            {formatEnumLabel(event.eventType)}
          </span>
          {event.circleName && (
            <Badge variant="outline" className="rounded-full border-secondary/20 bg-secondary/5 px-2 py-0.5 text-[10px] font-semibold text-secondary">
              {event.circleName}
            </Badge>
          )}
        </div>
        <h3 className="truncate font-headline text-lg font-extrabold text-foreground group-hover:text-primary cursor-pointer" onClick={() => onOpen(event)}>
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {event.description || 'Skill-focused community session.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(event.skills ?? []).slice(0, 4).map(skill => (
            <Badge key={skill.id} variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {skill.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-2 text-sm text-foreground/90">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{formatEventDate(event.eventDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-secondary" />
          <span className="truncate">{event.isOnline ? 'Online event' : event.location || 'Location pending'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{attendeeCount} going · {interestedCount} interested</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:min-w-[150px]">
        <Button
          size="sm"
          disabled={busy || past}
          className={cn(
            'rounded-xl px-5 text-[10px] font-bold uppercase tracking-widest',
            attending ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          onClick={() => onAttend(event)}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : past ? 'Ended' : attending ? 'Cancel RSVP' : 'Register'}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={interestBusy || attending || past}
            className={cn("rounded-xl text-[10px] font-bold uppercase tracking-widest", interested && "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20")}
            onClick={() => onInterest(event)}
          >
            {interestBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : interested ? 'Interested' : '+ Interested'}
          </Button>
          <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => onOpen(event)}>
            Details
          </Button>
        </div>
      </div>
    </div>
  );
});
EventCard.displayName = 'EventCard';

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttend: (event: Event) => Promise<void>;
  onInterest: (event: Event) => Promise<void>;
  busy?: boolean;
  interestBusy?: boolean;
}

function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onAttend,
  onInterest,
  busy,
  interestBusy,
}: EventDetailDialogProps) {
  if (!event) return null;
  const attendeeCount = Number(event.attendeeCount ?? event.attendees?.length ?? 0);
  const interestedCount = Number(event.interestedCount ?? 0);
  const going = event.rsvpState === 'GOING';
  const interested = event.rsvpState === 'INTERESTED';
  const past = isPastEvent(event);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-primary/15 text-primary">{formatEnumLabel(event.eventType)}</Badge>
            <Badge variant="outline" className="rounded-full">{past ? 'Past' : formatEnumLabel(event.status)}</Badge>
            {event.circleName && <Badge variant="outline" className="rounded-full">{event.circleName}</Badge>}
          </div>
          <DialogTitle className="font-headline text-2xl">{event.title}</DialogTitle>
          <DialogDescription>{event.description || 'Skill-focused community event.'}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Event Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{formatEventDate(event.eventDate)}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" />{event.isOnline ? 'Online event' : event.location || 'Location pending'}</div>
                {event.meetingUrl && (
                  <a className="flex items-center gap-2 text-primary hover:underline" href={event.meetingUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Open meeting link
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Skills</h4>
              <div className="flex flex-wrap gap-2">
                {(event.skills ?? []).length > 0 ? event.skills.map(skill => (
                  <Badge key={skill.id} variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">{skill.name}</Badge>
                )) : <span className="text-sm text-muted-foreground">No skill tags yet.</span>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Community Reach</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-center">
                  <p className="font-headline text-2xl font-extrabold text-primary">{attendeeCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Going</p>
                </div>
                <div className="rounded-xl bg-secondary/5 border border-secondary/10 p-3 text-center">
                  <p className="font-headline text-2xl font-extrabold text-secondary">{interestedCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interested</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Host</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={event.host.avatar} />
                  <AvatarFallback>{event.host.name?.charAt(0) ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground">{event.host.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{event.host.university}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" disabled={interestBusy || going || past} className={cn(interested && "border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20")} onClick={() => onInterest(event)}>
            {interestBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {interested ? 'Interested' : '+ Interested'}
          </Button>
          <Button disabled={busy || past} onClick={() => onAttend(event)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
            {past ? 'Ended' : going ? 'Cancel RSVP' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const EventsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [circles, setCircles] = useState<SkillCircle[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendBusy, setAttendBusy] = useState<Record<string, boolean>>({});
  const [interestBusy, setInterestBusy] = useState<Record<string, boolean>>({});
  // Split date/time state for the custom picker
  const [eventDatePart, setEventDatePart] = useState('');
  const [eventTimePart, setEventTimePart] = useState('');

  // Derive combined ISO string from split parts (local time)
  const combinedEventDate = eventDatePart && eventTimePart ? `${eventDatePart}T${eventTimePart}` : '';

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    location: '',
    isOnline: true,
    eventType: 'WORKSHOP',
    circleId: '',
    skillIds: [] as string[],
  });

  const suggestedSkills = useMemo(
    () => deriveSuggestedSkills(`${eventForm.title} ${eventForm.description}`, skills, eventForm.skillIds),
    [eventForm.title, eventForm.description, skills, eventForm.skillIds],
  );

  const filterChips = ['All', 'Joined', 'Explore', 'Online', 'In-Person'];
  const memberCircles = circles.filter(circle =>
    circle.memberRole === 'OWNER'
    || circle.memberRole === 'MEMBER'
    || circle.members?.some(member => member.id === user?.id)
  );

  const loadEvents = useCallback(async () => {
    const response = await CommunityService.getEvents(0, 60);
    setEvents(response.content ?? []);
  }, []);

  useEffect(() => {
    loadEvents().catch(() => {});
    SkillService.getAll().then(setSkills).catch(() => {});
    CommunityService.getSkillCircles(0, 50).then((r) => setCircles(r.content ?? [])).catch(() => {});
  }, [loadEvents]);

  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (!eventId) return;
    CommunityService.getEvent(eventId)
      .then(event => {
        setSelectedEvent(event);
        setDetailOpen(true);
      })
      .catch(() => {});
  }, [searchParams]);

  const filteredEvents = events.filter(event => {
    const isJoined = event.rsvpState === 'GOING' 
      || event.rsvpState === 'INTERESTED' 
      || Boolean(user?.id && event.attendees?.some(a => a.id === user.id));

    if (activeFilter === 'Joined') return isJoined;
    if (activeFilter === 'Explore') return !isJoined;
    if (activeFilter === 'Online') return event.isOnline;
    if (activeFilter === 'In-Person') return !event.isOnline;
    return true;
  });
  const upcomingEvents = filteredEvents
    .filter(event => !isPastEvent(event))
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const pastEvents = filteredEvents
    .filter(isPastEvent)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const handleAttend = async (event: Event) => {
    setAttendBusy(prev => ({ ...prev, [event.id]: true }));
    try {
      const updated = await CommunityService.attendEvent(event.id);
      setEvents(prev => prev.map(item => item.id === updated.id ? updated : item));
      setSelectedEvent(prev => prev?.id === updated.id ? updated : prev);
      if (updated.rsvpState === 'GOING') {
        toast({ title: 'Registration confirmed', description: `You are going to ${event.title}.`, variant: 'success' });
      } else {
        toast({ title: 'Registration cancelled', description: `You are no longer registered for ${event.title}.` });
      }
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAttendBusy(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    }
  };

  const handleInterest = async (event: Event) => {
    setInterestBusy(prev => ({ ...prev, [event.id]: true }));
    try {
      const updated = await CommunityService.interestEvent(event.id);
      setEvents(prev => prev.map(item => item.id === updated.id ? updated : item));
      setSelectedEvent(prev => prev?.id === updated.id ? updated : prev);
      if (updated.rsvpState === 'INTERESTED') {
        toast({ title: 'Marked interested', description: `You will get updates for ${event.title}.`, variant: 'success' });
      } else if (updated.rsvpState === 'GOING') {
        toast({ title: 'Already registered', description: `You are going to ${event.title}.` });
      } else {
        toast({ title: 'Interest removed', description: `You will no longer get updates for ${event.title}.` });
      }
    } catch (error) {
      toast({
        title: 'Could not update interest',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInterestBusy(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
    }
  };

  const openEvent = (event: Event) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim() || !combinedEventDate) {
      toast({ title: 'Event title and time are required', variant: 'destructive' });
      return;
    }
    // Parse as local time: datetime-local string is treated as local by the browser
    const eventMs = new Date(combinedEventDate).getTime();
    if (Number.isNaN(eventMs) || eventMs <= Date.now()) {
      toast({ title: 'Choose a future event time', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await CommunityService.createEvent({
        title: eventForm.title.trim(),
        description: eventForm.description?.trim() ?? '',
        eventDate: combinedEventDate,
        location: eventForm.isOnline ? 'Online' : eventForm.location.trim(),
        isOnline: eventForm.isOnline,
        eventType: eventForm.eventType,
        circleId: eventForm.circleId || undefined,
        coverGradient: 'from-slate-950 via-slate-900 to-primary/30',
        skillIds: eventForm.skillIds,
      });
      setEvents(prev => [created, ...prev]);
      setCreateOpen(false);
      setEventDatePart('');
      setEventTimePart('');
      setEventForm({ title: '', description: '', location: '', isOnline: true, eventType: 'WORKSHOP', circleId: '', skillIds: [] });
      toast({ title: 'Event created', description: 'Your event is live in the community.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Could not create event',
        description: error instanceof Error ? error.message : 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="product-panel overflow-hidden">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live learning calendar</span>
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-foreground">Events that turn community into sessions</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Create workshops, register attendance, and keep events tied to real skills and members.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            {filterChips.map(chip => (
              <Button
                key={chip}
                variant={activeFilter === chip ? 'default' : 'outline'}
                className={cn(
                  'rounded-xl text-[10px] font-bold uppercase tracking-widest',
                  activeFilter === chip ? 'bg-primary text-primary-foreground' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                )}
                onClick={() => setActiveFilter(chip)}
              >
                {chip}
              </Button>
            ))}
            <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create event
            </Button>
          </div>
        </div>
      </div>

      <div className="product-panel overflow-hidden">
        <div className="product-table">
          {upcomingEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              currentUserId={user?.id}
              busy={attendBusy[event.id]}
              interestBusy={interestBusy[event.id]}
              onAttend={handleAttend}
              onInterest={handleInterest}
              onOpen={openEvent}
            />
          ))}
          {upcomingEvents.length === 0 && (
            <div className="product-empty">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="font-bold text-foreground">No upcoming events</p>
              <p className="mt-1 text-sm text-muted-foreground">Create one for this community lane.</p>
            </div>
          )}
        </div>
      </div>

      {pastEvents.length > 0 && (
        <div className="product-panel overflow-hidden">
          <div className="border-b border-border/40 px-5 py-4">
            <h3 className="font-headline text-lg font-extrabold text-foreground">Past events</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sessions that already wrapped up. Open one to review the details and attendance.</p>
          </div>
          <div className="product-table">
            {pastEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={user?.id}
                busy={attendBusy[event.id]}
                interestBusy={interestBusy[event.id]}
                onAttend={handleAttend}
                onInterest={handleInterest}
                onOpen={openEvent}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create event</DialogTitle>
            <DialogDescription>Publish a skill-focused event with a real date, location, and target skills.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input id="event-title" value={eventForm.title} onChange={event => {
                const value = event.currentTarget.value;
                setEventForm(prev => ({ ...prev, title: value }));
              }} placeholder="Portfolio review night" />
            </div>
            {/* Date & Time picker row */}
            <div className="space-y-2">
              <Label>Date and time</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Calendar date picker */}
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    id="event-date"
                    type="date"
                    value={eventDatePart}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setEventDatePart(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                {/* Clock time picker */}
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    id="event-time"
                    type="time"
                    value={eventTimePart}
                    onChange={e => setEventTimePart(e.target.value)}
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>
              {combinedEventDate && (
                <p className="text-xs text-muted-foreground">
                  Scheduled for{' '}
                  <span className="font-semibold text-primary">
                    {new Date(combinedEventDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                </p>
              )}
            </div>

            {/* Format toggle */}
            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'Online' },
                  { value: false, label: 'In person' },
                ].map(option => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setEventForm(prev => ({ ...prev, isOnline: option.value }))}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-sm font-semibold transition-all',
                      eventForm.isOnline === option.value ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Event type</Label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEventForm(prev => ({ ...prev, eventType: option.value }))}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
                        eventForm.eventType === option.value ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/70 bg-background/70 text-muted-foreground hover:text-primary'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-circle">Skill circle</Label>
                <select
                  id="event-circle"
                  value={eventForm.circleId}
                  onChange={event => setEventForm(prev => ({ ...prev, circleId: event.currentTarget.value }))}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">No circle</option>
                  {memberCircles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">Only circles you have joined can host circle events.</p>
              </div>
            </div>
            {!eventForm.isOnline && (
              <div className="space-y-2">
                <Label htmlFor="event-location">Location</Label>
                <Input id="event-location" value={eventForm.location} onChange={event => {
                  const value = event.currentTarget.value;
                  setEventForm(prev => ({ ...prev, location: value }));
                }} placeholder="Campus lab, room 204" />
              </div>
            )}
            {eventForm.isOnline && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  This is an in-app event — attendees will join via the built-in SkillEx meeting room when the session starts.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" rows={3} value={eventForm.description} onChange={event => {
                const value = event.currentTarget.value;
                setEventForm(prev => ({ ...prev, description: value }));
              }} placeholder="What people will practice, build, or review..." />
            </div>

            {/* ── AI-style skill recommendation strip ── */}
            {suggestedSkills.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Recommended skills
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.map(skill => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => {
                        if (!eventForm.skillIds.includes(skill.id) && eventForm.skillIds.length < 4) {
                          setEventForm(prev => ({ ...prev, skillIds: [...prev.skillIds, skill.id] }));
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary/20 hover:scale-105 active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Target skills</Label>
              <SkillPicker skills={skills} selected={eventForm.skillIds} onChange={ids => setEventForm(prev => ({ ...prev, skillIds: ids }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Publish event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EventDetailDialog
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAttend={handleAttend}
        onInterest={handleInterest}
        busy={selectedEvent ? attendBusy[selectedEvent.id] : false}
        interestBusy={selectedEvent ? interestBusy[selectedEvent.id] : false}
      />
    </div>
  );
};
