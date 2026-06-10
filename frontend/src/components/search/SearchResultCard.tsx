import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageCircle, Users, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/services/searchService';
import LucideIcon from '@/components/icons/LucideIcon';

interface SearchResultCardProps {
  result: SearchResult;
  onClick?: () => void;
}

/**
 * Reusable card for displaying any search result type.
 * Automatically renders the appropriate layout based on result.type.
 */
export function SearchResultCard({ result, onClick }: SearchResultCardProps) {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    onClick?.();
    navigate(path);
  };

  const relevancePercent = Math.round(result.relevanceScore * 100);

  if (result.type === 'mentor') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-primary/10 cursor-pointer"
        onClick={() => handleNavigate(`/profile/${result.id}`)}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-border/70">
            <AvatarImage src={result.avatar ?? undefined} alt={result.name} />
            <AvatarFallback>{result.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-sm group-hover:text-primary transition-colors">
                {result.name}
              </h3>
              <Badge
                variant="secondary"
                className="ml-auto shrink-0 text-[10px] bg-primary/10 text-primary"
              >
                {relevancePercent}% match
              </Badge>
            </div>

            {result.bio && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {result.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-1 mb-3">
              {result.topSkills.slice(0, 3).map((skill) => (
                <Badge
                  key={skill.id}
                  variant="outline"
                  className="text-[10px] flex items-center gap-1"
                >
                  <LucideIcon name={skill.icon} className="h-3 w-3" />
                  {skill.name}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {result.trustScore.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {result.sessionsCompleted} sessions
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate(`/profile/${result.id}`);
              }}
            >
              View Profile
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (result.type === 'skill') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-primary/10 cursor-pointer"
        onClick={() => navigate(`/community?tab=circles&skill=${result.id}`)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <LucideIcon name={result.icon} className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-sm group-hover:text-primary transition-colors">
                {result.name}
              </h3>
              <Badge
                variant="secondary"
                className="ml-auto shrink-0 text-[10px] bg-primary/10 text-primary"
              >
                {relevancePercent}% match
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {result.category}
            </p>

            {result.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {result.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3 mb-3">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {result.mentorCount} mentors
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Demand: {result.demandLevel}/10
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/community?tab=circles&skill=${result.id}`);
              }}
            >
              Find Mentors
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (result.type === 'discussion') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-primary/10 cursor-pointer"
        onClick={() => navigate(`/community?tab=discussions`)}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-border/70 flex-shrink-0">
            <AvatarImage src={result.authorAvatar ?? undefined} alt={result.authorName} />
            <AvatarFallback>{result.authorName.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                {result.title}
              </h3>
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] bg-primary/10 text-primary"
              >
                {relevancePercent}% match
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-1">
              by {result.authorName}
            </p>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {result.snippet}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {result.upvotes} upvotes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {result.replies} replies
              </span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {result.category}
              </Badge>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/community?tab=discussions`);
              }}
            >
              Read Discussion
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (result.type === 'circle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="group rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all dark:border-white/10 dark:bg-slate-900 dark:hover:shadow-primary/10 cursor-pointer"
        onClick={() => navigate(`/community?tab=circles`)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
            {result.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate font-semibold text-sm group-hover:text-primary transition-colors">
                {result.name}
              </h3>
              <Badge
                variant="secondary"
                className="ml-auto shrink-0 text-[10px] bg-primary/10 text-primary"
              >
                {relevancePercent}% match
              </Badge>
            </div>

            {result.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {result.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {result.memberCount} members
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  result.activityLevel === 'VERY_ACTIVE' && 'border-green-500/50 text-green-600 dark:text-green-400',
                  result.activityLevel === 'ACTIVE' && 'border-blue-500/50 text-blue-600 dark:text-blue-400',
                  result.activityLevel === 'QUIET' && 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400'
                )}
              >
                {result.activityLevel.toLowerCase()}
              </Badge>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/community?tab=circles`);
              }}
            >
              Join Circle
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
