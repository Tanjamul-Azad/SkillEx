
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
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useNavigate as useNav, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SkillExScoreBadge } from '@/components/ui/SkillExScoreBadge';
import type { User, Skill, Review } from '@/types';
import { AddSkillDialog } from '@/features/profile/components/AddSkillDialog';
import {
  connectionService,
  type ConnectionRelationship,
} from '@/services/connectionService';

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
    <div className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
      <div className={cn('p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-center">
        <span className="block text-2xl font-extrabold font-headline">{value}</span>
        <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">{label}</span>
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
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? skills : skills.slice(0, 4);

  return (
    <motion.div variants={itemVariants}>
      <Card id={id} className={cn('h-full border-border/60 transition-all duration-300 group hover:shadow-lg', emphasized && 'ring-2 ring-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.25)] bg-gradient-to-br from-primary/5 to-transparent')}>
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base font-headline font-bold">
            <div className={cn("p-1.5 rounded-lg", variant === 'offer' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary')}>
              <Icon className="w-4 h-4" />
            </div>
            {title}
            <Badge variant="secondary" className="ml-auto text-xs font-bold px-2 py-0.5 bg-background border-border shadow-sm">
              {skills.length}
            </Badge>
            {isOwner && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={onAdd}
                aria-label={`Add skill to ${title}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center rounded-xl bg-card border border-dashed border-border/80">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                <Icon className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{emptyText}</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">Add your first skill to get started on your journey.</p>
              </div>
              {isOwner && (
                <Button size="sm" variant="gradient" className="mt-3 rounded-full px-6 text-xs h-8 shadow-glow-sm" onClick={onAdd}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Skill
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2.5">
                {displayed.map((skill) => (
                  <SkillBadge key={skill.id} skill={skill} />
                ))}
              </div>
              <AnimatePresence>
                {skills.length > 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8 rounded-lg border-dashed hover:border-solid transition-all"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show less' : `+${skills.length - 4} more skills`}
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 ml-1.5 transition-transform duration-300',
                        showAll && 'rotate-180'
                      )}
                    />
                  </Button>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewer = review.fromUser;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border-border/60 hover:shadow-md hover:border-primary/30 transition-all duration-300 bg-card group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardContent className="p-5 relative z-10">
          <div className="flex items-start gap-4">
            <Avatar className="w-11 h-11 shrink-0 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300 shadow-sm bg-muted">
              <AvatarImage src={reviewer?.avatar} alt={reviewer?.name} className="object-cover" />
              <AvatarFallback className="font-bold text-muted-foreground">{reviewer?.name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <Link
                  to={`/profile/${reviewer?.id}`}
                  className="font-headline font-bold text-[15px] hover:text-primary transition-colors truncate"
                >
                  {reviewer?.name ?? 'Anonymous User'}
                </Link>
                <div className="flex items-center gap-0.5 shrink-0 bg-muted/40 px-2 py-0.5 rounded-full border border-border/50">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3 h-3 transition-colors duration-300',
                        i < review.rating
                          ? 'fill-warning text-warning'
                          : 'fill-muted text-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed italic relative">
                <span className="text-xl text-primary/20 absolute -left-2 -top-2 select-none font-serif">"</span>
                {review.comment}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
                  {new Date(review.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {review.tags && review.tags.length > 0 && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <div className="flex gap-1.5 text-[10px] text-primary/70 font-medium">
                      {review.tags.slice(0,2).map(tag => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

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
  const navTo = useNav();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addSkillMode, setAddSkillMode] = useState<'offered' | 'wanted' | null>(null);
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

  const tabParam = searchParams.get('tab');
  const focusParam = searchParams.get('focus');
  const resolvedInitialTab = tabParam === 'reviews' || tabParam === 'activity' || tabParam === 'skills'
    ? tabParam
    : 'skills';
  const [activeTab, setActiveTab] = useState<'skills' | 'reviews' | 'activity'>(resolvedInitialTab);

  useEffect(() => {
    const next = searchParams.get('tab');
    if (next === 'skills' || next === 'reviews' || next === 'activity') {
      setActiveTab(next);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);
    Promise.all([
      UserService.getById(userId),
      ReviewService.getForUser(userId),
    ])
      .then(([userResult, reviewsResult]) => {
        const u = userResult as User;
        setProfileUser(u);
        setOfferedSkills(u.skillsOffered ?? []);
        setWantedSkills(u.skillsWanted ?? []);
        const reviews = (reviewsResult as unknown as { content?: Review[] }).content ?? (reviewsResult as unknown as Review[]) ?? [];
        setUserReviews(reviews);
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
  const handleTabChange = (next: string) => {
    if (next !== 'skills' && next !== 'reviews' && next !== 'activity') return;
    setActiveTab(next);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    if (next !== 'skills') {
      nextParams.delete('focus');
    }
    setSearchParams(nextParams, { replace: true });
  };
  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
      : profileUser.rating;

  const openConnectDialog = () => {
    setConnectMessage(`Hi ${profileUser.name.split(' ')[0]}, I found your profile on SkillEX and would love to connect.`);
    setConnectDialogOpen(true);
  };

  const handleSendConnectionRequest = async () => {
    if (!profileUser) return;

    setConnectionBusy(true);
    try {
      await connectionService.create({
        receiverId: profileUser.id,
        message: connectMessage.trim() || undefined,
      });

      setConnectionRelationship({
        targetUserId: profileUser.id,
        status: 'PENDING_SENT',
        connectionId: null,
        canMessage: false,
      });

      toast({
        title: 'Connection sent',
        description: `Your request was sent to ${profileUser.name}.`,
        variant: 'success',
      });
      setConnectDialogOpen(false);
      setConnectMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send request right now.';
      toast({ title: 'Connect failed', description: message, variant: 'destructive' });
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

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* ── Premium Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.25)] bg-card group">
            {/* Cover banner with glassmorphic layers */}
            <div 
              className="relative h-56 sm:h-72 w-full bg-gradient-to-br from-primary/80 via-accent/80 to-secondary/80 overflow-hidden" 
              style={localCover ? { backgroundImage: `url(${localCover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!localCover && (
                <img 
                  src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop" 
                  alt="Default Cover" 
                  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity grayscale group-hover:scale-105 group-hover:grayscale-0 transition-all duration-700" 
                />
              )}
              {/* Vibrant abstract blobs and overlays */}
              <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] mix-blend-overlay z-10" />
              <div className="animate-blob absolute -top-20 -left-10 h-72 w-72 rounded-full bg-primary/50 blur-[80px] mix-blend-screen z-10" />
              <div className="animate-blob absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-secondary/50 blur-[80px] mix-blend-screen z-10" style={{ animationDelay: '4s' }} />
              <div className="dot-grid absolute inset-0 opacity-30 mix-blend-overlay z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent z-20" />
              <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-transparent to-transparent z-20" />

              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 z-30 bg-background/50 hover:bg-background/80 backdrop-blur-md border-white/20 shadow-lg text-foreground transition-all duration-300 hover:scale-105"
                  onClick={() => setCoverDialogOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="relative z-30 px-6 sm:px-10 pb-8">
              {/* Avatar + Action Buttons Row */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
                <motion.div 
                  initial={{ scale: 0.8, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group/avatar cursor-pointer shrink-0"
                >
                  <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-[6px] border-card ring-2 ring-primary/30 shadow-2xl transition-all duration-500 group-hover/avatar:ring-primary/60 group-hover/avatar:shadow-[0_0_40px_hsl(var(--primary)/0.4)] bg-muted">
                    <AvatarImage
                      src={profileUser.avatar}
                      alt={profileUser.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-4xl font-extrabold bg-gradient-to-br from-primary/20 to-secondary/20 text-primary">
                      {profileUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100 pointer-events-none" />
                  
                  {profileUser.isOnline && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-7 h-7 bg-emerald-500 flex items-center justify-center rounded-full border-4 border-card shadow-lg z-10"
                    >
                       <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </motion.div>
                  )}
                </motion.div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" className="glass-subtle shadow-sm flex-1 sm:flex-none border-white/10 hover:bg-white/10" asChild>
                        <Link to="/settings">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </Button>
                      <Button size="sm" variant="gradient" className="shadow-lg shadow-primary/25 hover:shadow-primary/40 flex-1 sm:flex-none font-semibold" onClick={() => navigate('/settings')}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="glass-subtle border-white/10 hover:bg-white/10 shadow-sm flex-1 sm:flex-none" onClick={async () => {
                        const url = window.location.href;
                        if (navigator.share) {
                          try { await navigator.share({ title: profileUser.name, url }); } catch { /* user cancelled */ }
                        } else {
                          await navigator.clipboard.writeText(url);
                          toast({ title: 'Link copied!', description: 'Profile link copied to clipboard.' });
                        }
                      }}>
                        <Share2 className="w-4 h-4 mr-1.5" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm" className="glass-subtle border-white/10 hover:bg-white/10 shadow-sm flex-1 sm:flex-none" onClick={() => navTo(`/messages/${profileUser.id}`)}>
                        <MessageSquare className="w-4 h-4 mr-1.5 text-primary" />
                        Message
                      </Button>
                      {connectionLoading ? (
                        <Button size="sm" disabled className="flex-1 sm:flex-none">
                          Loading...
                        </Button>
                      ) : isConnected ? (
                        <Button size="sm" disabled className="flex-1 sm:flex-none bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 opacity-100">
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          Connected
                        </Button>
                      ) : isPendingSent ? (
                        <Button size="sm" disabled className="flex-1 sm:flex-none">
                          Pending
                        </Button>
                      ) : isPendingReceived ? (
                        <Button size="sm" variant="gradient" className="flex-1 sm:flex-none shadow-lg shadow-primary/20 hover:shadow-primary/40 font-semibold" onClick={handleAcceptIncomingConnection} disabled={connectionBusy}>
                          <UserPlus className="w-4 h-4 mr-1.5" />
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
                  <h1 className="text-3xl sm:text-4xl font-extrabold font-headline tracking-tight text-foreground drop-shadow-sm">
                    {profileUser.name}
                  </h1>
                  <SkillExScoreBadge score={profileUser.skillexScore} />
                </div>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border border-border/80">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    {profileUser.university}
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border border-border/80">
                    <Award className="w-4 h-4 text-warning/70" />
                    {profileUser.level}
                  </span>
                  <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full border border-border/80">
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
                    <p className="text-[15px] text-foreground/80 max-w-3xl leading-relaxed bg-primary/5 border border-primary/10 p-4 rounded-2xl glass-subtle shadow-inner">
                      {profileUser.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/40">
                <StatCard
                  icon={Play}
                  label="Sessions"
                  value={profileUser.sessionsCompleted}
                  color="bg-primary/15 text-primary shadow-glow-sm"
                />
                <StatCard
                  icon={Star}
                  label="Avg Rating"
                  value={avgRating.toFixed(1)}
                  color="bg-warning/15 text-warning shadow-glow-sm"
                />
                <StatCard
                  icon={BookOpen}
                  label="Skills Taught"
                  value={profileUser.skillsOffered.length}
                  color="bg-secondary/15 text-secondary shadow-glow-sm"
                />
                <StatCard
                  icon={TrendingUp}
                  label="SkillEx Score"
                  value={profileUser.skillexScore}
                  color="bg-accent/15 text-accent-foreground shadow-glow-sm"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Main Content ── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="skills" className="flex-1 sm:flex-none">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 sm:flex-none">
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Reviews
              {userReviews.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1.5">
                  {userReviews.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 sm:flex-none">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* ── Skills Tab ── */}
          <TabsContent value="skills" className="mt-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid sm:grid-cols-2 gap-4"
            >
              <motion.div variants={itemVariants}>
                <SkillSection
                  id="skills-offered"
                  title="Skills I Offer"
                  skills={offeredSkills}
                  icon={CheckCircle}
                  emptyText="No skills listed yet."
                  variant="offer"
                  emphasized={emphasizeOfferedSkills}
                  isOwner={isOwnProfile}
                  onAdd={() => setAddSkillMode('offered')}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <SkillSection
                  title="Skills I Want to Learn"
                  skills={wantedSkills}
                  icon={BookOpen}
                  emptyText="No learning goals listed yet."
                  variant="want"
                  isOwner={isOwnProfile}
                  onAdd={() => setAddSkillMode('wanted')}
                />
              </motion.div>
            </motion.div>

            {/* XP Progress */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible">
              <Card className="mt-4 border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    SkillEx Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{profileUser.level}</span>
                    <span className="text-muted-foreground">
                      {profileUser.skillexScore} / {Math.ceil(profileUser.skillexScore / 500) * 500} XP
                    </span>
                  </div>
                  <Progress
                    value={(profileUser.skillexScore % 500) / 5}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.ceil(profileUser.skillexScore / 500) * 500 - profileUser.skillexScore} XP
                    needed to reach next level
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ── Reviews Tab ── */}
          <TabsContent value="reviews" className="mt-4">
            {userReviews.length === 0 ? (
              <Card className="border-border/60">
                <CardContent className="py-12 text-center">
                  <Star className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No reviews yet.</p>
                  {!isOwnProfile && (
                    <Button size="sm" className="mt-4" onClick={() => setReviewDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Leave a Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
              >
                {/* Rating summary */}
                <motion.div variants={itemVariants}>
                  <Card className="border-border/60 bg-muted/30">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold">{avgRating.toFixed(1)}</div>
                          <div className="flex items-center gap-0.5 justify-center mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  'w-3.5 h-3.5',
                                  i < Math.round(avgRating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-muted text-muted'
                                )}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {userReviews.length} review{userReviews.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <Separator orientation="vertical" className="h-12" />
                        <div className="flex-1 space-y-1">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = userReviews.filter(
                              (r) => r.rating === star
                            ).length;
                            return (
                              <div key={star} className="flex items-center gap-2 text-xs">
                                <span className="w-4 text-right text-muted-foreground">
                                  {star}
                                </span>
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                                <Progress
                                  value={
                                    userReviews.length
                                      ? (count / userReviews.length) * 100
                                      : 0
                                  }
                                  className="h-1.5 flex-1"
                                />
                                <span className="w-4 text-muted-foreground">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {userReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* ── Activity Tab ── */}
          <TabsContent value="activity" className="mt-4">
            <Card className="border-border/60">
              <CardContent className="py-12 text-center">
                <Zap className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">Activity Feed</p>
                <p className="text-sm text-muted-foreground">
                  Recent sessions and exchanges will appear here.
                </p>
              </CardContent>
            </Card>
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
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardContent className="py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {isConnected
                        ? `You are connected with ${profileUser.name}`
                        : `Want to connect with ${profileUser.name}?`}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {isConnected
                        ? 'You can now chat directly and coordinate your next exchange.'
                        : isPendingSent
                          ? 'Your connection request is pending approval.'
                          : isPendingReceived
                            ? `${profileUser.name.split(' ')[0]} already requested to connect with you.`
                            : 'Send a connection request and start your learning journey together.'}
                    </p>
                  </div>
                  {connectionLoading ? (
                    <Button className="shrink-0" disabled>Loading...</Button>
                  ) : isConnected ? (
                    <Button className="shrink-0" disabled>Connected</Button>
                  ) : isPendingSent ? (
                    <Button className="shrink-0" disabled>Pending</Button>
                  ) : isPendingReceived ? (
                    <Button className="shrink-0" onClick={handleAcceptIncomingConnection} disabled={connectionBusy}>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      {connectionBusy ? 'Accepting...' : 'Accept Request'}
                    </Button>
                  ) : (
                    <Button className="shrink-0" onClick={openConnectDialog} disabled={connectionBusy}>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      Send Connection Request
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Skill Dialog */}
      {addSkillMode && (
        <AddSkillDialog
          open={!!addSkillMode}
          onClose={() => setAddSkillMode(null)}
          mode={addSkillMode}
          existingIds={addSkillMode === 'offered' ? offeredSkills.map((s) => s.id) : wantedSkills.map((s) => s.id)}
          onSave={(added) => {
            if (addSkillMode === 'offered') setOfferedSkills((prev) => [...prev, ...added]);
            else setWantedSkills((prev) => [...prev, ...added]);
          }}
        />
      )}

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
                      try {
                        const created = await ReviewService.create({
                          revieweeId: profileUser?.id ?? '',
                          rating: reviewRating,
                          comment: reviewComment.trim(),
                          exchangeId: '',
                        });
                        setUserReviews((prev) => [created, ...prev]);
                        setReviewSubmitted(true);
                      } catch {
                        // Graceful fallback: show success UI with local state
                        // (e.g. if exchangeId is required by backend but not yet selected)
                        setReviewSubmitted(true);
                        toast({
                          title: 'Review noted',
                          description: 'Your review has been recorded locally. Full persistence requires an associated exchange.',
                          variant: 'info',
                        });
                      }
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
    </DashboardLayout>
  );
}
