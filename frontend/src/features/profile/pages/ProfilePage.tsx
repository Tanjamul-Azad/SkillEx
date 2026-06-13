
import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UserService } from '@/services/userService';
import { ReviewService } from '@/services/reviewService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Zap,
  Star,
  MapPin,
  Camera,
  UserPlus,
  MessageSquare,
  Share2,
  Plus,
  Pencil,
  ChevronDown,
  Play,
  Settings,
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  ExternalLink,
  Flame,
  Facebook,
  Github,
  Globe,
  Linkedin,
  LinkIcon,
  FileText,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useNavigate as useNav, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SkillExScoreBadge } from '@/components/ui/SkillExScoreBadge';
import type { User, Skill, Review, UserProgress, PortfolioProof, PortfolioProofType, Event as CommunityEvent } from '@/types';
import {
  connectionService,
  type ConnectionRelationship,
} from '@/services/connectionService';
import { ApiError } from '@/services/http/ApiClient';
import { SkillShowcaseViewer } from '@/features/profile/components/SkillShowcaseViewer';
import { CommunityService } from '@/services/communityService';
import { PostCard } from '../../community/components/PostCard';
import type { Post } from '@/types';
import { appVisuals } from '@/lib/appVisuals';
import { skillTrustService, type SkillTrust } from '@/services/skillTrustService';
import { skillCheckService } from '@/services/skillCheckService';
import { certificateService, type SkillCertificate, type UserBadge } from '@/services/certificateService';
import { progressService } from '@/services/progressService';
import { VerifiedBadge } from '@/components/trust/VerifiedBadge';
import { AddSkillDialog } from '@/features/profile/components/AddSkillDialog';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="group flex min-w-0 items-center gap-3 py-2">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/50 transition-colors duration-300 group-hover:border-primary/25 dark:border-white/10 dark:bg-white/5', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="block font-headline text-xl font-extrabold leading-none tracking-tight text-foreground">{value}</span>
        <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}


function SkillSection({
  title,
  skills,
  icon: Icon,
  emptyText,
  variant,
  isOwner,
  onAdd,
  id,
  emphasized,
  profileUserId,
}: {
  title: string;
  skills: Skill[];
  icon: React.FC<{ className?: string }>;
  emptyText: string;
  variant: 'offer' | 'want';
  isOwner?: boolean;
  onAdd?: () => void;
  id?: string;
  emphasized?: boolean;
  profileUserId?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? skills : skills.slice(0, 4);
  const { toast } = useToast();
  const navigate = useNavigate();

  const requestSkillCheck = async (skill: Skill) => {
    if (!profileUserId) return;
    try {
      await skillCheckService.create({ targetUserId: profileUserId, skillId: skill.id, message: `I'd like a short skill check for ${skill.name}.` });
      toast({ title: 'Skill check requested', description: `${skill.name} capability check sent.` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not request skill check',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <section id={id} className={cn('relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/25', emphasized && 'border-primary/30 ring-1 ring-primary/10 bg-primary/[0.02]')}>
        <div className={cn("absolute inset-x-5 top-0 h-px opacity-40", variant === 'offer' ? 'bg-primary' : 'bg-secondary')} />
        <div className="relative z-10 mb-5 flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", variant === 'offer' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary')}>
              <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{title}</h3>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{skills.length} skill{skills.length === 1 ? '' : 's'}</p>
          </div>
          {isOwner && onAdd && (
            <Button
              size="icon"
              variant="ghost"
              className="ml-auto h-8 w-8 rounded-full border border-border/30 bg-muted/40 hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all"
              onClick={onAdd}
              aria-label={`Add skill to ${title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="relative z-10">
          {skills.length === 0 ? (
          <div className="flex flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-border/40 bg-muted/10 px-4 py-7">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{emptyText}</p>
              </div>
              {isOwner && onAdd && (
                <Button size="sm" variant="outline" className="mt-2 rounded-lg px-4 text-[9px] uppercase tracking-widest font-bold h-8" onClick={onAdd}>
                  <Plus className="h-3 w-3 mr-1.5" /> Add Skill
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {displayed.map((skill) => (
                  <div key={skill.id} className="flex flex-col gap-1 rounded-xl border border-border/40 bg-muted/20 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SkillBadge skill={skill} />
                      {variant === 'offer' && profileUserId && (
                        <VerifiedBadge
                          userId={profileUserId}
                          skillId={skill.id}
                          skillName={skill.name}
                          size="sm"
                          showDetails={true}
                        />
                      )}
                    </div>
                    {variant === 'offer' && !isOwner && profileUserId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 justify-start rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                        onClick={() => requestSkillCheck(skill)}
                      >
                        Skill Check
                      </Button>
                    )}
                    {variant === 'offer' && isOwner && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 justify-start rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/ai/assessment?skillId=${skill.id}&skillName=${encodeURIComponent(skill.name)}`)}
                      >
                        Verify via Quiz
                      </Button>
                    )}
                    {variant === 'want' && isOwner && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 justify-start rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/ai/tutor/${skill.id}`)}
                        >
                          Practice
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 justify-start rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/ai/assessment?skillId=${skill.id}&skillName=${encodeURIComponent(skill.name)}`)}
                        >
                          Take Quiz
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {skills.length > 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[9px] font-bold uppercase tracking-widest h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Collapse' : `Expand (+${skills.length - 4})`}
                    <ChevronDown
                      className={cn(
                        'w-3 h-3 ml-2 transition-transform duration-300',
                        showAll && 'rotate-180'
                      )}
                    />
                  </Button>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewer = review.fromUser;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <div className="surface-raised h-full p-5 group relative overflow-hidden border border-border/50 rounded-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-5">
          <Avatar className="w-12 h-12 shrink-0 ring-1 ring-border group-hover:ring-primary/30 transition-all duration-300 bg-muted">
            <AvatarImage src={reviewer?.avatar} alt={reviewer?.name} className="object-cover" />
            <AvatarFallback className="font-extrabold text-muted-foreground bg-gradient-to-br from-white/5 to-white/10">{reviewer?.name?.charAt(0) ?? '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <Link
                to={`/profile/${reviewer?.id}`}
                className="font-headline font-bold text-sm hover:text-primary transition-colors truncate text-foreground"
              >
                {reviewer?.name ?? 'Anonymous User'}
              </Link>
              <div className="flex items-center gap-1 shrink-0 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-3 h-3',
                      i < review.rating
                        ? 'fill-warning text-warning drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                        : 'fill-foreground/10 text-foreground/10'
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed italic relative font-medium group-hover:text-foreground/90 transition-colors">
              <span className="text-3xl text-primary/20 absolute -left-4 -top-2 select-none font-serif leading-none">"</span>
              {review.comment}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/60 border border-border/40 px-2 py-1 rounded-md bg-muted/20">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {review.tags && review.tags.length > 0 && (
                <div className="flex gap-2 text-[9px] text-primary/60 font-bold uppercase tracking-widest">
                  {review.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="border border-primary/20 bg-primary/5 px-2 py-1 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileEventCard({ event, relation }: { event: CommunityEvent; relation: 'hosted' | 'rsvp' }) {
  const eventDate = new Date(event.eventDate);
  const dateLabel = Number.isNaN(eventDate.getTime())
    ? 'Date pending'
    : eventDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
  const participationLabel = relation === 'hosted'
    ? 'Organizing'
    : event.rsvpState === 'GOING'
      ? 'Going'
      : 'Interested';

  return (
    <Link
      to={`/community?tab=events&eventId=${event.id}`}
      className="group block rounded-xl border border-border/45 bg-muted/15 p-4 transition-all hover:border-primary/30 hover:bg-primary/[0.03]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={cn(
          'rounded-full border-none text-[10px]',
          relation === 'hosted'
            ? 'bg-primary/10 text-primary'
            : event.rsvpState === 'GOING'
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'bg-amber-500/15 text-amber-500'
        )}>
          {participationLabel}
        </Badge>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {event.isOnline ? 'Online' : 'In person'}
        </Badge>
        {event.eventType && (
          <Badge variant="secondary" className="rounded-full border-none text-[10px]">
            {event.eventType.split('_').join(' ')}
          </Badge>
        )}
      </div>

      <h4 className="mt-3 line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary">
        {event.title}
      </h4>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>

      <div className="mt-4 grid gap-2 text-[11px] font-medium text-muted-foreground sm:grid-cols-2">
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{dateLabel}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{event.isOnline ? 'Online event' : event.location}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2 sm:col-span-2">
          <Users className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {event.attendeeCount ?? event.attendees?.length ?? 0} going - {event.interestedCount ?? 0} interested
          </span>
        </span>
      </div>
    </Link>
  );
}

const PROOF_TYPES: Array<{ value: PortfolioProofType; label: string }> = [
  { value: 'PROJECT', label: 'Project' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'BEHANCE', label: 'Behance' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'SESSION_OUTCOME', label: 'Session outcome' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'OTHER', label: 'Other' },
];

const proofIconFor = (type?: string) => {
  if (type === 'GITHUB') return Github;
  if (type === 'CERTIFICATE') return Award;
  if (type === 'SESSION_OUTCOME') return CheckCircle;
  if (type === 'MEDIA') return Play;
  return LinkIcon;
};

const cleanOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

type PortfolioFormState = {
  title: string;
  description: string;
  proofType: PortfolioProofType;
  skillId: string;
  url: string;
  featured: boolean;
};

const emptyPortfolioForm: PortfolioFormState = {
  title: '',
  description: '',
  proofType: 'PROJECT',
  skillId: 'none',
  url: '',
  featured: true,
};

export default function ProfilePage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const userId = params?.userId as string;
  const { toast } = useToast();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  useDocumentTitle(profileUser?.name ?? 'Profile');
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [offeredSkills, setOfferedSkills] = useState<Skill[]>([]);
  const [wantedSkills, setWantedSkills] = useState<Skill[]>([]);
  const [addSkillDialogOpen, setAddSkillDialogOpen] = useState(false);
  const [addSkillDialogMode, setAddSkillDialogMode] = useState<'offered' | 'wanted'>('offered');
  const navTo = useNav();
  const [searchParams, setSearchParams] = useSearchParams();
  const [connectionRelationship, setConnectionRelationship] = useState<ConnectionRelationship | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectMessage, setConnectMessage] = useState('');
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [localCover, setLocalCover] = useState<string | null>(null);
  const coverFileRef = React.useRef<HTMLInputElement>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [hostedEvents, setHostedEvents] = useState<CommunityEvent[]>([]);
  const [participatingEvents, setParticipatingEvents] = useState<CommunityEvent[]>([]);
  const [hostedEventCount, setHostedEventCount] = useState(0);
  const [participatingEventCount, setParticipatingEventCount] = useState(0);
  const [certificates, setCertificates] = useState<SkillCertificate[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [portfolioProofs, setPortfolioProofs] = useState<PortfolioProof[]>([]);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [portfolioSubmitting, setPortfolioSubmitting] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState<PortfolioFormState>(emptyPortfolioForm);
  
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);

  const tabParam = searchParams.get('tab');
  const focusParam = searchParams.get('focus');

  const resolvedInitialTab = tabParam === 'reviews' || tabParam === 'activity' || tabParam === 'skills' || tabParam === 'credentials' || tabParam === 'portfolio'
    ? tabParam
    : 'skills';
  const [activeTab, setActiveTab] = useState<'skills' | 'reviews' | 'activity' | 'credentials' | 'portfolio'>(resolvedInitialTab);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (next === 'skills' || next === 'reviews' || next === 'activity' || next === 'credentials' || next === 'portfolio') {
      setActiveTab(next);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);
    Promise.all([
      UserService.getById(userId),
      ReviewService.getForUser(userId).catch(() => []),
      CommunityService.getUserPosts(userId).catch(() => ({ content: [] })),
      CommunityService.getUserEvents(userId, 'hosted', 0, 4).catch(() => ({ content: [], totalElements: 0 })),
      CommunityService.getUserEvents(userId, 'rsvp', 0, 4).catch(() => ({ content: [], totalElements: 0 })),
      certificateService.userCertificates(userId).catch(() => []),
      certificateService.userBadges(userId).catch(() => []),
      progressService.userProgress(userId).catch(() => null),
      progressService.userPortfolio(userId, 0, 20).catch(() => ({ content: [] })),
    ])
      .then(([userResult, reviewsResult, postsResult, hostedEventResult, participatingEventResult, certificateResult, badgeResult, progressResult, portfolioResult]) => {
        const u = userResult as User;
        setProfileUser(u);
        setOfferedSkills(u.skillsOffered ?? []);
        setWantedSkills(u.skillsWanted ?? []);
        const reviews = (reviewsResult as unknown as { content?: Review[] })?.content ?? (reviewsResult as unknown as Review[]) ?? [];
        setUserReviews(reviews);
        setUserPosts(postsResult?.content ?? []);
        setHostedEvents(hostedEventResult?.content ?? []);
        setParticipatingEvents(participatingEventResult?.content ?? []);
        setHostedEventCount(hostedEventResult?.totalElements ?? 0);
        setParticipatingEventCount(participatingEventResult?.totalElements ?? 0);
        setCertificates(certificateResult ?? []);
        setBadges(badgeResult ?? []);
        setProgress(progressResult);
        setPortfolioProofs(portfolioResult?.content ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!profileUser || !currentUser || profileUser.id === currentUser.id) {
      setConnectionRelationship(null);
      return;
    }

    let active = true;
    setConnectionLoading(true);

    connectionService.getRelationship(profileUser.id)
      .then((relationship) => {
        if (!active) return;
        setConnectionRelationship(relationship);
      })
      .catch(() => {
        if (!active) return;
        setConnectionRelationship(null);
      })
      .finally(() => {
        if (!active) return;
        setConnectionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileUser, currentUser]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (notFound || !profileUser) {
    return <Navigate to="/" replace />;
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const relationshipStatus = connectionRelationship?.status ?? 'NONE';
  const isConnected = relationshipStatus === 'CONNECTED';
  const isPendingSent = relationshipStatus === 'PENDING_SENT';
  const isPendingReceived = relationshipStatus === 'PENDING_RECEIVED';
  const emphasizeOfferedSkills = activeTab === 'skills' && focusParam === 'offered';
  const hasActivity = userPosts.length > 0 || hostedEvents.length > 0 || participatingEvents.length > 0;
  const handleTabChange = (next: string) => {
    if (next !== 'skills' && next !== 'reviews' && next !== 'activity' && next !== 'credentials' && next !== 'portfolio') return;
    setActiveTab(next);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    if (next !== 'skills') {
      nextParams.delete('focus');
    }
    setSearchParams(nextParams, { replace: true });
  };
  const refreshPortfolio = async () => {
    const [nextProgress, nextPortfolio] = await Promise.all([
      progressService.userProgress(profileUser.id),
      progressService.userPortfolio(profileUser.id, 0, 20),
    ]);
    setProgress(nextProgress);
    setPortfolioProofs(nextPortfolio.content ?? []);
  };

  const handleCreatePortfolioProof = async () => {
    if (!portfolioForm.title.trim()) return;
    setPortfolioSubmitting(true);
    try {
      const created = await progressService.createPortfolioProof({
        title: portfolioForm.title.trim(),
        description: cleanOptional(portfolioForm.description),
        proofType: portfolioForm.proofType,
        skillId: portfolioForm.skillId === 'none' ? undefined : portfolioForm.skillId,
        url: cleanOptional(portfolioForm.url),
        visibility: 'PUBLIC',
        featured: portfolioForm.featured,
      });
      setPortfolioProofs((prev) => [created, ...prev]);
      await refreshPortfolio();
      setPortfolioDialogOpen(false);
      setPortfolioForm(emptyPortfolioForm);
      toast({ title: 'Portfolio proof added', description: 'Your profile now shows stronger proof of skill.', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Could not add proof',
        description: error instanceof Error ? error.message : 'Please check the details and try again.',
        variant: 'destructive',
      });
    } finally {
      setPortfolioSubmitting(false);
    }
  };

  const handleDeletePortfolioProof = async (proofId: string) => {
    try {
      await progressService.deletePortfolioProof(proofId);
      setPortfolioProofs((prev) => prev.filter((proof) => proof.id !== proofId));
      toast({ title: 'Portfolio proof removed', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Could not remove proof',
        description: error instanceof Error ? error.message : 'Try again later.',
        variant: 'destructive',
      });
    }
  };
  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
      : profileUser.rating;
  const profileCompletionChecklist = [
    { label: 'username', missing: !profileUser.username?.trim() },
    { label: 'university', missing: !profileUser.university?.trim() },
    { label: 'location', missing: !profileUser.location?.trim() },
    { label: 'bio', missing: !profileUser.bio?.trim() },
    { label: 'one skill to teach', missing: offeredSkills.length === 0 },
    { label: 'one skill to learn', missing: wantedSkills.length === 0 },
  ];
  const missingProfileItems = profileCompletionChecklist.filter((item) => item.missing);
  const profileCompletionTotal = profileCompletionChecklist.length;
  const profileCompletionDone = profileCompletionTotal - missingProfileItems.length;
  const profileCompletionPercent = Math.round((profileCompletionDone / profileCompletionTotal) * 100);
  const shouldShowCompletionWarning = isOwnProfile && missingProfileItems.length > 0;

  const openConnectDialog = () => {
    setConnectMessage(`Hi ${profileUser.name.split(' ')[0]}, I found your profile on SkillEX and would love to connect.`);
    setConnectDialogOpen(true);
  };

  const refreshConnectionRelationship = async (targetUserId: string) => {
    try {
      const relationship = await connectionService.getRelationship(targetUserId);
      setConnectionRelationship(relationship);
      return relationship;
    } catch {
      return null;
    }
  };

  const handleSendConnectionRequest = async () => {
    if (!profileUser) return;

    const targetUserId = profileUser.id;
    const targetName = profileUser.name;

    setConnectionBusy(true);
    try {
      await connectionService.create({
        receiverId: targetUserId,
        message: connectMessage.trim() || undefined,
      });

      setConnectionRelationship({
        targetUserId,
        status: 'PENDING_SENT',
        connectionId: null,
        canMessage: false,
      });

      toast({
        title: 'Connection sent',
        description: `Your request was sent to ${targetName}.`,
        variant: 'success',
      });
      setConnectDialogOpen(false);
      setConnectMessage('');
    } catch (error) {
      const latestRelationship = await refreshConnectionRelationship(targetUserId);

      if (latestRelationship?.status === 'CONNECTED') {
        toast({
          title: 'Already connected',
          description: `You are already connected with ${targetName}.`,
          variant: 'success',
        });
        setConnectDialogOpen(false);
        return;
      }

      if (latestRelationship?.status === 'PENDING_SENT') {
        toast({
          title: 'Request already sent',
          description: `Your connection request to ${targetName} is still pending.`,
        });
        setConnectDialogOpen(false);
        return;
      }

      if (latestRelationship?.status === 'PENDING_RECEIVED') {
        toast({
          title: 'Incoming request found',
          description: `${targetName} already sent you a request. Accept it from this profile or from Connections.`,
        });
        setConnectDialogOpen(false);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not send request right now.';
      const isUnexpectedServerError =
        error instanceof ApiError &&
        error.status >= 500 &&
        message.toLowerCase().includes('unexpected error');

      toast({
        title: 'Connect failed',
        description: isUnexpectedServerError
          ? 'The server could not save this request right now. Please retry in a moment.'
          : message,
        variant: 'destructive',
      });
    } finally {
      setConnectionBusy(false);
    }
  };

  const handleAcceptIncomingConnection = async () => {
    if (!connectionRelationship?.connectionId || !profileUser) return;

    setConnectionBusy(true);
    try {
      await connectionService.updateStatus(connectionRelationship.connectionId, 'accepted');
      setConnectionRelationship({
        ...connectionRelationship,
        status: 'CONNECTED',
        canMessage: true,
      });
      toast({
        title: 'Connection accepted',
        description: `You are now connected with ${profileUser.name}.`,
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not accept request right now.';
      toast({ title: 'Accept failed', description: message, variant: 'destructive' });
    } finally {
      setConnectionBusy(false);
    }
  };

  const showcaseVideos = offeredSkills
    .filter((s): s is Skill & { proofVideoUrl: string } => Boolean(s.proofVideoUrl))
    .map(s => ({
      id: s.id,
      url: s.proofVideoUrl,
      subtitle: s.subtitle,
      skillName: s.name,
      skillCategory: s.category
    }));

  return (
    <DashboardLayout>
      <div className="product-page space-y-5">
        {shouldShowCompletionWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">Complete your profile</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Your profile is {profileCompletionPercent}% complete. Add {missingProfileItems.map((item) => item.label).join(', ')} so matching, credits, and trust signals work properly.
                  </p>
                  <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-amber-500/15">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${profileCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0 rounded-xl">
                <Link to="/settings">Update profile</Link>
              </Button>
            </div>
          </motion.div>
        )}
        {/* ── Premium Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="surface-flat overflow-hidden rounded-2xl border border-border/50 shadow-sm relative group">
            {/* Cover banner with glassmorphic layers */}
            <div
              className="relative h-48 sm:h-60 w-full bg-muted overflow-hidden"
              style={localCover ? { backgroundImage: `url(${localCover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!localCover && (
                <img
                  src={appVisuals.profileShowcase}
                  alt="Portfolio and skill showcase workspace"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent z-20" />
              <div className="absolute inset-0 bg-gradient-to-r from-card/85 via-card/20 to-transparent z-20" />

              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 z-30 bg-background/70 hover:bg-background backdrop-blur-md"
                  onClick={() => setCoverDialogOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="relative z-30 px-5 sm:px-8 pb-7">
              {/* Avatar + Action Buttons Row */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-14 sm:-mt-16 mb-5">
                <motion.div 
                  initial={{ scale: 0.8, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group/avatar cursor-pointer shrink-0"
                >
                  <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-[4px] border-card ring-1 ring-border shadow-xl transition-all duration-300 group-hover/avatar:ring-primary/30 bg-card">
                    <AvatarImage
                      src={profileUser.avatar}
                      alt={profileUser.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl font-extrabold bg-gradient-to-br from-primary/10 to-secondary/10 text-primary">
                      {profileUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100 pointer-events-none" />
                  
                  {profileUser.isOnline && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-7 h-7 bg-emerald-500/80 backdrop-blur-md flex items-center justify-center rounded-full border-2 border-card shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10"
                    >
                       <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_5px_white]" />
                    </motion.div>
                  )}
                </motion.div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold" asChild>
                        <Link to="/settings">
                          <Settings className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-foreground transition-colors" />
                          Settings
                        </Link>
                      </Button>
                      <Button size="sm" className="flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold" onClick={() => navigate('/settings')}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold" onClick={async () => {
                        const url = window.location.href;
                        if (navigator.share) {
                          try { await navigator.share({ title: profileUser.name, url }); } catch { /* user cancelled */ }
                        } else {
                          await navigator.clipboard.writeText(url);
                          toast({ title: 'Link copied!', description: 'Profile link copied to clipboard.' });
                        }
                      }}>
                        <Share2 className="w-4 h-4 mr-2 text-muted-foreground transition-colors" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold" onClick={() => navTo(`/messages/${profileUser.id}`)}>
                        <MessageSquare className="w-4 h-4 mr-2 text-primary transition-colors" />
                        Message
                      </Button>
                      {connectionLoading ? (
                        <Button size="sm" disabled className="bg-muted/40 border border-border/30 text-muted-foreground flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold">
                          Loading...
                        </Button>
                      ) : isConnected ? (
                        <Button size="sm" disabled className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold opacity-100">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Connected
                        </Button>
                      ) : isPendingSent ? (
                        <Button size="sm" disabled className="bg-muted/40 border border-border/30 text-muted-foreground flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold">
                          Pending
                        </Button>
                      ) : isPendingReceived ? (
                        <Button size="sm" className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:border-primary/50 flex-1 sm:flex-none text-[10px] uppercase tracking-widest font-bold transition-all" onClick={handleAcceptIncomingConnection} disabled={connectionBusy}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          {connectionBusy ? 'Accepting...' : 'Accept'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="gradient" className="flex-1 sm:flex-none shadow-lg shadow-primary/20 hover:shadow-primary/40 font-semibold" onClick={openConnectDialog} disabled={connectionBusy}>
                          <UserPlus className="w-4 h-4 mr-1.5" />
                          Connect
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Name and Meta */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-extrabold font-headline tracking-tight text-foreground">
                    {profileUser.name}
                  </h1>
                  <SkillExScoreBadge score={profileUser.skillexScore} />
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    {profileUser.university}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-warning/70" />
                    {profileUser.level}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500/70" />
                    Joined{' '}
                    {new Date(profileUser.joinedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {profileUser.bio && (
                  <div className="pt-2">
                    <p className="max-w-3xl border-l-2 border-l-primary pl-4 text-[15px] leading-relaxed text-foreground/90">
                      {profileUser.bio}
                    </p>
                  </div>
                )}

                {(profileUser.githubUrl || profileUser.linkedinUrl || profileUser.facebookUrl || profileUser.websiteUrl || profileUser.resumeUrl) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {profileUser.githubUrl && (
                      <a
                        href={profileUser.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                    )}
                    {profileUser.linkedinUrl && (
                      <a
                        href={profileUser.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    )}
                    {profileUser.facebookUrl && (
                      <a
                        href={profileUser.facebookUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        <Facebook className="h-3.5 w-3.5" />
                        Facebook
                      </a>
                    )}
                    {profileUser.websiteUrl && (
                      <a
                        href={profileUser.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                    {profileUser.resumeUrl && (
                      <a
                        href={profileUser.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Resume
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Signal rail */}
              <div className="mt-7 border-t border-border/40 pt-5">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <StatCard
                  icon={Play}
                  label="Sessions"
                  value={profileUser.sessionsCompleted}
                  color="text-primary"
                />
                <StatCard
                  icon={Star}
                  label="Avg Rating"
                  value={avgRating.toFixed(1)}
                  color="text-warning"
                />
                <StatCard
                  icon={BookOpen}
                  label="Skills Taught"
                  value={profileUser.skillsOffered.length}
                  color="text-secondary"
                />
                <StatCard
                  icon={Flame}
                  label="Streak"
                  value={`${progress?.currentStreakDays ?? 0}d`}
                  color="text-accent"
                />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Skill XP</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {progress?.totalXp ?? 0} XP | Level {progress?.currentLevel ?? 1}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 sm:max-w-md">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{progress?.xpIntoLevel ?? 0} XP this level</span>
                      <span>{progress?.xpForNextLevel ?? 100} next</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, progress?.levelProgressPercent ?? 0))}%` }}
                      />
                    </div>
                  </div>
                  <Badge className="w-fit rounded-full bg-amber-500/10 text-amber-500 border-none">
                    Longest {progress?.longestStreakDays ?? 0}d
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Showcase Reels ── */}
        {showcaseVideos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 font-headline tracking-wide">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                  <Play className="w-4 h-4" />
                </div>
                Showcase Reels
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide">
              {showcaseVideos.map((video, idx) => (
                <div
                  key={video.id}
                  className="snap-start shrink-0 relative w-40 h-64 sm:w-48 sm:h-72 bg-muted/30 border border-border/50 rounded-2xl overflow-hidden cursor-pointer group hover:border-primary/30 transition-all"
                  onClick={() => { setShowcaseIndex(idx); setShowcaseOpen(true); }}
                >
                  <video src={video.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700" muted playsInline />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <div className="p-2.5 bg-white/10 rounded-full w-max backdrop-blur-md mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 border border-white/10 group-hover:border-primary/50">
                      <Play className="w-4 h-4 text-white group-hover:text-current ml-0.5" />
                    </div>
                    <p className="text-white font-extrabold text-sm leading-tight drop-shadow-md line-clamp-2">
                      {video.subtitle || video.skillName}
                    </p>
                    <div className="mt-1">
                      <Badge variant="outline" className="bg-black/50 text-white/80 border-white/10 text-[9px] uppercase tracking-wider backdrop-blur-md">
                        {video.skillName}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Main Content ── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="product-toolbar mb-5 grid h-auto w-full grid-cols-5 gap-1 p-1 sm:max-w-[680px]">
            <TabsTrigger value="skills" className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="w-3.5 h-3.5 mr-2 opacity-70" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Star className="w-3.5 h-3.5 mr-2 opacity-70" />
              Reviews
              {userReviews.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-[9px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30 rounded-md">
                  {userReviews.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="w-3.5 h-3.5 mr-2 opacity-70" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LinkIcon className="w-3.5 h-3.5 mr-2 opacity-70" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="credentials" className="rounded-xl py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Award className="w-3.5 h-3.5 mr-2 opacity-70" />
              Proof
            </TabsTrigger>
          </TabsList>

          {/* ── Skills Tab ── */}
          <TabsContent value="skills" className="mt-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 gap-6"
            >
              <motion.div variants={itemVariants} className="h-full">
                <SkillSection
                  id="skills-offered"
                  title="Can teach"
                  skills={offeredSkills}
                  icon={CheckCircle}
                  emptyText="Add skills you can teach."
                  variant="offer"
                  emphasized={emphasizeOfferedSkills}
                  isOwner={isOwnProfile}
                  onAdd={isOwnProfile ? () => { setAddSkillDialogMode('offered'); setAddSkillDialogOpen(true); } : undefined}
                  profileUserId={profileUser.id}
                />
              </motion.div>
              <motion.div variants={itemVariants} className="h-full">
                <SkillSection
                  title="Wants to learn"
                  skills={wantedSkills}
                  icon={BookOpen}
                  emptyText="Add skills you want to learn."
                  variant="want"
                  isOwner={isOwnProfile}
                  onAdd={isOwnProfile ? () => { setAddSkillDialogMode('wanted'); setAddSkillDialogOpen(true); } : undefined}
                  profileUserId={profileUser.id}
                />
              </motion.div>
            </motion.div>

            {isOwnProfile && (
              <AddSkillDialog
                open={addSkillDialogOpen}
                onClose={() => setAddSkillDialogOpen(false)}
                mode={addSkillDialogMode}
                existingIds={addSkillDialogMode === 'offered' ? offeredSkills.map((s) => s.id) : wantedSkills.map((s) => s.id)}
                onSave={(added) => {
                  if (addSkillDialogMode === 'offered') setOfferedSkills((prev) => [...prev, ...added]);
                  else setWantedSkills((prev) => [...prev, ...added]);
                }}
              />
            )}

          </TabsContent>

          {/* ── Reviews Tab ── */}
          <TabsContent value="reviews" className="mt-6">
            {userReviews.length === 0 ? (
              <div className="p-12 text-center border border-border/40 border-dashed rounded-2xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 border border-border/30 flex items-center justify-center mb-4">
                  <Star className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-6">No reviews yet.</p>
                {!isOwnProfile && (
                  <Button size="sm" className="rounded-xl px-6 text-[10px] uppercase font-bold tracking-widest bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)]" onClick={() => setReviewDialogOpen(true)}>
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Leave Review
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Rating summary */}
                <motion.div variants={itemVariants}>
                  <div className="p-8 surface-flat border border-border/50 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-8">
                    <div className="text-center sm:min-w-[150px]">
                      <div className="text-6xl font-extrabold font-headline tracking-tighter text-foreground drop-shadow-sm mb-2">{avgRating.toFixed(1)}</div>
                      <div className="flex items-center gap-1 justify-center mb-3">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              'w-4 h-4',
                              i < Math.round(avgRating)
                                ? 'fill-warning text-warning drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                                : 'fill-muted/20 text-muted-foreground/20'
                            )}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {userReviews.length} Record{userReviews.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="hidden sm:block w-px h-24 bg-gradient-to-b from-transparent via-border/50 to-transparent" />
                    
                    <div className="flex-1 w-full max-w-sm space-y-3">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = userReviews.filter(
                          (r) => r.rating === star
                        ).length;
                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="w-4 text-right text-[10px] font-bold text-muted-foreground">
                              {star}
                            </span>
                            <Star className="w-3.5 h-3.5 fill-warning text-warning shrink-0 opacity-80" />
                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden border border-border/20">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${userReviews.length ? (count / userReviews.length) * 100 : 0}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="h-full bg-warning/80 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                              />
                            </div>
                            <span className="w-4 text-[10px] font-bold text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {userReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="mt-6">
            <div className="space-y-6">
              {!hasActivity ? (
                <div className="p-12 text-center border border-border/40 border-dashed rounded-2xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 border border-border/30 flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">No recent activity</p>
                  <p className="text-[9px] font-bold text-muted-foreground/50 mt-2 uppercase tracking-wide">
                    {isOwnProfile ? "Your skill transmissions will appear here." : `${profileUser.name.split(' ')[0]}'s transmissions will appear here.`}
                  </p>
                </div>
              ) : (
                <>
                  {(hostedEvents.length > 0 || participatingEvents.length > 0) && (
                    <div className="rounded-2xl border border-border/50 bg-card p-5">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Community events</h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Hosted, registered, and interested events from live RSVP records.
                          </p>
                        </div>
                        <Link to="/community?tab=events" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                          Open events
                        </Link>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Organized</p>
                            <Badge variant="outline" className="rounded-full text-[10px]">{hostedEventCount}</Badge>
                          </div>
                          {hostedEvents.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/45 bg-muted/10 p-5 text-xs text-muted-foreground">
                              {isOwnProfile ? 'Events you create will appear here.' : 'No hosted events yet.'}
                            </div>
                          ) : (
                            hostedEvents.map((event) => (
                              <ProfileEventCard key={event.id} event={event} relation="hosted" />
                            ))
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Going / Interested</p>
                            <Badge variant="outline" className="rounded-full text-[10px]">{participatingEventCount}</Badge>
                          </div>
                          {participatingEvents.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/45 bg-muted/10 p-5 text-xs text-muted-foreground">
                              {isOwnProfile ? 'Events you register for or follow will appear here.' : 'No RSVP activity yet.'}
                            </div>
                          ) : (
                            participatingEvents.map((event) => (
                              <ProfileEventCard key={event.id} event={event} relation="rsvp" />
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {userPosts.length > 0 && (
                    <div className="grid grid-cols-1 gap-6">
                      {userPosts.map(post => (
                        <PostCard
                          key={post.id}
                          post={post}
                          onDelete={(id) => setUserPosts(prev => prev.filter(p => p.id !== id))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-6">
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-headline text-xl font-extrabold tracking-tight text-foreground">Skill Portfolio</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Projects, certificates, repositories, and session outcomes that prove real ability.
                  </p>
                </div>
                {isOwnProfile && (
                  <Button className="rounded-xl text-[10px] font-bold uppercase tracking-widest" onClick={() => setPortfolioDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Proof
                  </Button>
                )}
              </div>

              {portfolioProofs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/45 bg-muted/10 p-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-muted/30">
                    <LinkIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {isOwnProfile ? 'Add your first proof of skill.' : 'No portfolio proof is public yet.'}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                    A strong profile should show proof beyond a bio: work samples, public links, certificates, and outcomes from completed sessions.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {portfolioProofs.map((proof) => {
                    const ProofIcon = proofIconFor(proof.proofType);
                    return (
                      <div key={proof.id} className="group rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-primary/25">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Badge className="rounded-full bg-primary/10 text-primary border-none">
                                <ProofIcon className="mr-1.5 h-3.5 w-3.5" />
                                {proof.proofType.split('_').join(' ')}
                              </Badge>
                              {proof.featured && (
                                <Badge variant="outline" className="rounded-full border-amber-500/30 text-amber-500">Featured</Badge>
                              )}
                              {proof.skill && (
                                <Badge variant="secondary" className="rounded-full border-none">
                                  {proof.skill.icon} {proof.skill.name}
                                </Badge>
                              )}
                            </div>
                            <h4 className="line-clamp-2 text-base font-bold text-foreground">{proof.title}</h4>
                            {proof.description && (
                              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{proof.description}</p>
                            )}
                          </div>
                          {isOwnProfile && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeletePortfolioProof(proof.id)}
                              aria-label="Remove portfolio proof"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {new Date(proof.createdAt).toLocaleDateString()}
                          </span>
                          {proof.url && (
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => window.open(proof.url ?? '', '_blank', 'noopener,noreferrer')}>
                              Open
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="surface-flat border border-border/50 rounded-2xl overflow-hidden shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                    <Award className="h-4 w-4 text-primary" />
                    Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {certificates.length === 0 ? (
                    <div className="rounded-xl border border-border/40 bg-muted/15 p-6 text-sm text-muted-foreground">
                      Career certificates unlock automatically after real sessions, reviews, trust score, and safety checks.
                    </div>
                  ) : certificates.map((certificate) => (
                    <div key={certificate.id} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">{certificate.title}</p>
                            <Badge className={cn('rounded-full text-[10px] border-none', certificate.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400')}>
                              {certificate.status}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {certificate.levelLabel} · Trust {certificate.trustScoreSnapshot}% · {certificate.sessionCountSnapshot} sessions
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => window.open(certificate.verificationUrl, '_blank')}>
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={async () => {
                              await navigator.clipboard.writeText(certificate.githubBadgeMarkdown);
                              toast({ title: 'GitHub badge copied', variant: 'success' });
                            }}
                          >
                            GitHub
                          </Button>
                        </div>
                      </div>
                      {certificate.status !== 'ACTIVE' && certificate.revokedReason && (
                        <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-200">{certificate.revokedReason}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="surface-flat border border-border/50 rounded-2xl overflow-hidden shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {badges.length === 0 ? (
                    <div className="rounded-xl border border-border/40 bg-muted/15 p-6 text-sm text-muted-foreground">
                      Badges appear after proof upload, reliable sessions, strong reviews, community help, or verified skills.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {badges.map((badge) => (
                        <div key={badge.id} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                          <p className="font-bold text-foreground">{badge.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{badge.skillName ?? badge.category}</p>
                          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{badge.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Connect CTA (only for other users) */}
        <AnimatePresence>
          {!isOwnProfile && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.3 }}
            >
              <div className="p-6 border border-primary/15 bg-gradient-to-r from-primary/[0.03] to-transparent rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative z-10 text-center sm:text-left">
                  <h3 className="text-sm font-bold font-headline text-white tracking-wide">
                    {isConnected
                      ? `You are connected with ${profileUser.name}`
                      : `Connect with ${profileUser.name}?`}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 max-w-lg leading-relaxed">
                    {isConnected
                      ? 'You can message, coordinate, and plan a skill exchange directly.'
                      : isPendingSent
                        ? 'Your connection request is waiting for a response.'
                        : isPendingReceived
                          ? `${profileUser.name.split(' ')[0]} sent you a connection request.`
                          : 'Send a short request to open direct messaging and plan an exchange.'}
                  </p>
                </div>
                <div className="relative z-10 shrink-0 w-full sm:w-auto">
                  {connectionLoading ? (
                    <Button disabled className="w-full sm:w-auto rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-none bg-muted/40 border border-border/30 text-muted-foreground">Syncing...</Button>
                  ) : isConnected ? (
                    <Button disabled className="w-full sm:w-auto rounded-xl text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 opacity-100">Connected</Button>
                  ) : isPendingSent ? (
                    <Button disabled className="w-full sm:w-auto rounded-xl text-[10px] font-bold uppercase tracking-widest bg-muted/40 border border-border/30 text-muted-foreground">Pending</Button>
                  ) : isPendingReceived ? (
                    <Button className="w-full sm:w-auto rounded-xl text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 transition-all" onClick={handleAcceptIncomingConnection} disabled={connectionBusy}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      {connectionBusy ? 'Accepting...' : 'Accept Request'}
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto rounded-xl text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-0" onClick={openConnectDialog} disabled={connectionBusy}>
                      <UserPlus className="w-4 h-4 mr-2 drop-shadow-sm" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Connection Request Dialog */}
      {!isOwnProfile && (
        <Dialog
          open={connectDialogOpen}
          onOpenChange={(openState) => {
            setConnectDialogOpen(openState);
            if (!openState) {
              setConnectMessage('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Connection Request</DialogTitle>
              <DialogDescription>
                Introduce yourself to {profileUser.name} so they know why you want to connect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Textarea
                value={connectMessage}
                onChange={(event) => setConnectMessage(event.target.value.slice(0, 240))}
                placeholder="Write a short message..."
                className="min-h-[112px]"
              />
              <p className="text-xs text-muted-foreground text-right">{connectMessage.length}/240</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendConnectionRequest} disabled={connectionBusy}>
                {connectionBusy ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Leave a Review Dialog */}
      {!isOwnProfile && (
        <Dialog open={reviewDialogOpen} onOpenChange={(o) => { setReviewDialogOpen(o); if (!o) { setReviewRating(0); setReviewComment(''); setReviewSubmitted(false); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
              <DialogDescription>Share your experience with {profileUser?.name}.</DialogDescription>
            </DialogHeader>
            {reviewSubmitted ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="p-4 rounded-full bg-secondary/10 text-secondary"><CheckCircle className="h-10 w-10" /></div>
                <h3 className="text-lg font-bold">Review Submitted!</h3>
                <p className="text-sm text-muted-foreground">Your review has been added. Thank you for your feedback.</p>
                <Button className="mt-2" onClick={() => { setReviewDialogOpen(false); setReviewSubmitted(false); }}>Close</Button>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-2">
                  <div>
                    <p className="text-sm font-medium mb-2">Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setReviewHover(s)}
                          onMouseLeave={() => setReviewHover(0)}
                          onClick={() => setReviewRating(s)}
                          className="p-0.5 transition-transform hover:scale-110"
                        >
                          <Star className={cn('w-8 h-8 transition-colors', (reviewHover || reviewRating) >= s ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted-foreground/30')} />
                        </button>
                      ))}
                      {reviewRating > 0 && (
                        <span className="ml-2 self-center text-sm font-medium text-muted-foreground">
                          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][reviewRating]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Comment</p>
                    <Textarea
                      placeholder={`Describe your experience with ${profileUser?.name?.split(' ')[0]}...`}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                  <Button
                    variant="gradient"
                    disabled={reviewRating === 0 || reviewComment.trim().length < 10}
                    onClick={async () => {
                      setReviewSubmitted(true);
                      toast({
                        title: 'Review noted',
                        description: 'Reviews are saved permanently from the completed session review screen.',
                        variant: 'info',
                      });
                    }}
                  >
                    Submit Review
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Cover Photo Dialog */}
      <Dialog open={coverDialogOpen} onOpenChange={(o) => { setCoverDialogOpen(o); if (!o) setCoverPreview(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Cover Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div
              className="h-36 w-full rounded-xl bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 overflow-hidden border border-border/60 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              onClick={() => coverFileRef.current?.click()}
            >
              {!coverPreview && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-sm">Click to select an image</p>
                </div>
              )}
            </div>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCoverPreview(URL.createObjectURL(file));
              }}
            />
            {/* Gradient presets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Or choose a gradient</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  'from-primary/40 via-secondary/20 to-accent/20',
                  'from-violet-500/40 via-purple-500/20 to-pink-500/20',
                  'from-cyan-500/40 via-blue-500/20 to-indigo-500/20',
                  'from-amber-500/40 via-orange-500/20 to-red-500/20',
                  'from-emerald-500/40 via-teal-500/20 to-cyan-500/20',
                ].map((grad, i) => (
                  <button
                    key={i}
                    className={`h-10 w-16 rounded-lg bg-gradient-to-br ${grad} border-2 ${coverPreview === `preset-${i}` ? 'border-primary' : 'border-transparent'} hover:border-primary/60 transition-colors`}
                    onClick={() => setCoverPreview(`preset-${i}`)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCoverDialogOpen(false); setCoverPreview(null); }}>Cancel</Button>
            <Button
              variant="gradient"
              disabled={!coverPreview}
              onClick={() => {
                if (coverPreview && !coverPreview.startsWith('preset-')) {
                  setLocalCover(coverPreview);
                }
                setCoverDialogOpen(false);
                setCoverPreview(null);
                toast({ title: 'Cover photo updated!' });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={portfolioDialogOpen}
        onOpenChange={(open) => {
          setPortfolioDialogOpen(open);
          if (!open) setPortfolioForm(emptyPortfolioForm);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Portfolio Proof</DialogTitle>
            <DialogDescription>
              Add a public proof item that makes your skill profile believable during matching.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proof-title">Title</Label>
              <Input
                id="proof-title"
                value={portfolioForm.title}
                onChange={(event) => setPortfolioForm((prev) => ({ ...prev, title: event.target.value.slice(0, 140) }))}
                placeholder="React dashboard rebuild, speaking demo, design case study..."
              />
            </div>

            <div className="space-y-2">
              <Label>Proof type</Label>
              <Select
                value={portfolioForm.proofType}
                onValueChange={(value) => setPortfolioForm((prev) => ({ ...prev, proofType: value as PortfolioProofType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROOF_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Related skill</Label>
              <Select
                value={portfolioForm.skillId}
                onValueChange={(value) => setPortfolioForm((prev) => ({ ...prev, skillId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific skill</SelectItem>
                  {offeredSkills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proof-url">Link</Label>
              <Input
                id="proof-url"
                value={portfolioForm.url}
                onChange={(event) => setPortfolioForm((prev) => ({ ...prev, url: event.target.value.slice(0, 600) }))}
                placeholder="https://github.com/you/project or certificate URL"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="proof-description">Description</Label>
              <Textarea
                id="proof-description"
                value={portfolioForm.description}
                onChange={(event) => setPortfolioForm((prev) => ({ ...prev, description: event.target.value.slice(0, 1200) }))}
                placeholder="Explain what this proves, your role, and the outcome."
                className="min-h-[110px] resize-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={portfolioForm.featured}
                onChange={(event) => setPortfolioForm((prev) => ({ ...prev, featured: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              Feature this proof on the portfolio tab
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPortfolioDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePortfolioProof} disabled={portfolioSubmitting || portfolioForm.title.trim().length < 3}>
              {portfolioSubmitting ? 'Saving...' : 'Save Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Showcase Reels Viewer */}
      <SkillShowcaseViewer
        videos={showcaseVideos}
        open={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
        initialIndex={showcaseIndex}
      />
      </div>
    </DashboardLayout>
  );
}
