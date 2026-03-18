
import React, { useState, useEffect } from 'react';
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
  Lock,
  Plus,
  Pencil,
  ChevronDown,
  Play,
  Settings,
  Users as UsersIcon,
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Navigate, useNavigate as useNav } from 'react-router-dom';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { SkillExScoreBadge } from '@/components/ui/SkillExScoreBadge';
import type { User, Skill, Review } from '@/types';
import { AddSkillDialog } from '@/features/profile/components/AddSkillDialog';
import { RequestExchangeDialog } from '@/features/match/components/RequestExchangeDialog';

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
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 border border-border/40 hover:border-primary/30 transition-colors">
      <div className={cn('p-2 rounded-full', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
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
}: {
  title: string;
  skills: Skill[];
  icon: React.FC<{ className?: string }>;
  emptyText: string;
  variant: 'offer' | 'want';
  isOwner?: boolean;
  onAdd?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? skills : skills.slice(0, 4);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-4 h-4 text-primary" />
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">
            {skills.length}
          </Badge>
          {isOwner && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
              onClick={onAdd}
              aria-label={`Add skill to ${title}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center rounded-xl bg-muted/20 border border-dashed border-border/60">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{emptyText}</p>
              <p className="text-xs text-muted-foreground">Add your first skill to get started on your journey.</p>
            </div>
            {isOwner && (
              <Button size="sm" variant="default" className="mt-2 rounded-xl text-xs h-8 shadow-glow-sm" onClick={onAdd}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Skill
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {displayed.map((skill) => (
                <SkillBadge key={skill.id} skill={skill} />
              ))}
            </div>
            {skills.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-xs h-7"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show less' : `+${skills.length - 4} more`}
                <ChevronDown
                  className={cn(
                    'w-3 h-3 ml-1 transition-transform',
                    showAll && 'rotate-180'
                  )}
                />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const reviewer = review.fromUser;

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-border/60 hover:border-primary/30 transition-colors">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={reviewer?.avatar} alt={reviewer?.name} />
              <AvatarFallback>{reviewer?.name?.charAt(0) ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link
                  to={`/profile/${reviewer?.id}`}
                  className="font-semibold text-sm hover:text-primary transition-colors"
                >
                  {reviewer?.name ?? 'Anonymous'}
                </Link>
                <div className="flex items-center gap-0.5 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-3 h-3',
                        i < review.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-muted text-muted'
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {review.comment}
              </p>
              <span className="text-xs text-muted-foreground/60 mt-1 block">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
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
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [offeredSkills, setOfferedSkills] = useState<Skill[]>([]);
  const [wantedSkills, setWantedSkills] = useState<Skill[]>([]);
  const navTo = useNav();
  const [addSkillMode, setAddSkillMode] = useState<'offered' | 'wanted' | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [localCover, setLocalCover] = useState<string | null>(null);
  const coverFileRef = React.useRef<HTMLInputElement>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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
  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
      : profileUser.rating;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ── Profile Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden border-border/60">
            {/* Cover banner */}
            <div className="relative h-48 sm:h-56 bg-gradient-to-r from-primary/80 via-accent/80 to-secondary/80 overflow-hidden" style={localCover ? { backgroundImage: `url(${localCover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
              {/* Vibrant Animated blobs in banner */}
              <div className="absolute inset-0 bg-background/20 dark:bg-background/40 backdrop-blur-[2px] mix-blend-overlay" />
              <div className="animate-blob absolute -top-20 -left-10 h-72 w-72 rounded-full bg-primary/40 blur-3xl mix-blend-multiply dark:mix-blend-screen" />
              <div className="animate-blob absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-secondary/40 blur-3xl mix-blend-multiply dark:mix-blend-screen" style={{ animationDelay: '4s' }} />
              <div className="animate-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-accent/40 blur-3xl mix-blend-multiply dark:mix-blend-screen" style={{ animationDelay: '2s' }} />
              <div className="dot-grid absolute inset-0 opacity-40 mix-blend-overlay" />
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 bg-background/60 backdrop-blur-sm h-8 w-8 hover:bg-background/80"
                  onClick={() => setCoverDialogOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <CardContent className="px-6 pb-6">
              {/* Avatar + action buttons */}
              <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 mb-4">
                <motion.div 
                  initial={{ scale: 0.8, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  whileHover={{ scale: 1.05 }}
                  className="relative group cursor-pointer"
                >
                  <Avatar className="w-28 h-28 border-4 border-background ring-4 ring-primary/20 shadow-glow transition-all duration-300 group-hover:ring-primary/40 group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                    <AvatarImage
                      src={profileUser.avatar}
                      alt={profileUser.name}
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary/5 text-primary">
                      {profileUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                  
                  {profileUser.isOnline && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute bottom-1 right-1 w-5 h-5 bg-secondary rounded-full border-[3px] border-background shadow-md z-10" 
                    />
                  )}
                </motion.div>

                <div className="flex items-center gap-2 mt-12 sm:mt-0">
                  {isOwnProfile ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/settings">
                          <Settings className="w-4 h-4 mr-1.5" />
                          Settings
                        </Link>
                      </Button>
                      <Button size="sm" onClick={() => navigate('/settings')}>
                        <Pencil className="w-4 h-4 mr-1.5" />
                        Edit Profile
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={async () => {
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
                      <Button variant="outline" size="sm" onClick={() => navTo(`/messages/${profileUser.id}`)}>
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Message
                      </Button>
                      <Button size="sm" onClick={() => setRequestOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-1.5" />
                        Match
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Name / meta */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold font-headline tracking-tight">
                    {profileUser.name}
                  </h1>
                  <SkillExScoreBadge score={profileUser.skillexScore} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {profileUser.university}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {profileUser.level}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Joined{' '}
                    {new Date(profileUser.joinedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {profileUser.isOnline && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-secondary/10 text-secondary border-secondary/30"
                    >
                      Online
                    </Badge>
                  )}
                </div>

                {profileUser.bio && (
                  <p className="text-sm text-muted-foreground max-w-xl leading-relaxed pt-1">
                    {profileUser.bio}
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={Play}
                  label="Sessions"
                  value={profileUser.sessionsCompleted}
                  color="bg-primary/10 text-primary"
                />
                <StatCard
                  icon={Star}
                  label="Avg Rating"
                  value={avgRating.toFixed(1)}
                  color="bg-amber-500/10 text-amber-500"
                />
                <StatCard
                  icon={BookOpen}
                  label="Skills Teaches"
                  value={profileUser.skillsOffered.length}
                  color="bg-secondary/10 text-secondary"
                />
                <StatCard
                  icon={TrendingUp}
                  label="SkillEx Score"
                  value={profileUser.skillexScore}
                  color="bg-accent/10 text-accent-foreground"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Main Content ── */}
        <Tabs defaultValue="skills" className="w-full">
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
                  title="Skills I Offer"
                  skills={offeredSkills}
                  icon={CheckCircle}
                  emptyText="No skills listed yet."
                  variant="offer"
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

        {/* Match CTA (only for other users) */}
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
                      Interested in exchanging skills with {profileUser.name}?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Send a match request and start your learning journey together.
                    </p>
                  </div>
                  <Button className="shrink-0" onClick={() => setRequestOpen(true)}>
                    <Zap className="w-4 h-4 mr-1.5" />
                    Send Match Request
                  </Button>
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

      {/* Request Exchange Dialog */}
      {!isOwnProfile && (
        <RequestExchangeDialog
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          targetUser={profileUser as User}
        />
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
                    onClick={() => {
                      setUserReviews(prev => [{
                        id: `local-${Date.now()}`,
                        rating: reviewRating,
                        comment: reviewComment.trim(),
                        createdAt: new Date().toISOString(),
                        fromUser: currentUser,
                        toUserId: profileUser?.id ?? '',
                        sessionId: '',
                      } as unknown as Review, ...prev]);
                      setReviewSubmitted(true);
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
