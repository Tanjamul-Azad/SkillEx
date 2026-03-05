
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { users, reviews } from '@data/mock/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Link, Navigate } from 'react-router-dom';
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
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
            {isOwner && (
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={onAdd}>
                <Plus className="h-3 w-3 mr-1" /> Add Skill
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

  const profileUser = users.find((u) => u.id === userId);

  if (!profileUser) {
    return <Navigate to="/" replace />;
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const userReviews: Review[] = reviews.filter((r) => r.toUser.id === userId);
  const avgRating =
    userReviews.length > 0
      ? userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length
      : profileUser.rating;

  // Local skill state so we can add skills client-side
  const [offeredSkills, setOfferedSkills] = useState<Skill[]>(profileUser.skillsOffered);
  const [wantedSkills, setWantedSkills] = useState<Skill[]>(profileUser.skillsWanted);

  // Dialog state
  const [addSkillMode, setAddSkillMode] = useState<'offered' | 'wanted' | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

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
            <div className="relative h-40 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 overflow-hidden">
              {/* Animated blobs in banner */}
              <div className="animate-blob absolute -top-10 -left-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="animate-blob absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" style={{ animationDelay: '4s' }} />
              <div className="dot-grid absolute inset-0 opacity-20" />
              {isOwnProfile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 bg-background/60 backdrop-blur-sm h-8 w-8 hover:bg-background/80"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <CardContent className="px-6 pb-6">
              {/* Avatar + action buttons */}
              <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 mb-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-background ring-4 ring-primary/20 shadow-glow">
                    <AvatarImage
                      src={profileUser.avatar}
                      alt={profileUser.name}
                    />
                    <AvatarFallback className="text-2xl font-bold">
                      {profileUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {profileUser.isOnline && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-secondary rounded-full border-2 border-background shadow-sm" />
                  )}
                </div>

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
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4 mr-1.5" />
                        Share
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/messages/${profileUser.id}`}>
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Message
                        </Link>
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
                    <Button size="sm" className="mt-4">
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
    </DashboardLayout>
  );
}
