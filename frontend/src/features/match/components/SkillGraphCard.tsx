import { FC } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  offeredSkills: string[];
  wantedSkills: string[];
  userName?: string;
  className?: string;
}

const SkillPill: FC<{ label: string; variant: 'teach' | 'learn' }> = ({ label, variant }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border',
      variant === 'teach'
        ? 'bg-primary/10 text-primary border-primary/20'
        : 'bg-secondary/10 text-secondary border-secondary/20'
    )}
  >
    {variant === 'teach' ? <GraduationCap className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
    {label}
  </span>
);

/**
 * SkillGraphCard
 *
 * Visual "skill flow" card showing what a user can teach vs. what they want
 * to learn, with animated entrance per row.
 *
 * Layout:
 *   [You]  →  [Skill A]  →  X learners want this
 *   [You]  ←  [Skill B]  ←  Y teachers offer this
 */
export const SkillGraphCard: FC<Props> = ({
  offeredSkills,
  wantedSkills,
  userName = 'You',
  className,
}) => {
  const teaches = offeredSkills.slice(0, 3);
  const learns  = wantedSkills.slice(0, 3);
  const hasAny  = teaches.length > 0 || learns.length > 0;

  if (!hasAny) return null;

  return (
    <div className={cn('rounded-xl glass-subtle border border-white/10 p-4 space-y-3', className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skill Flow</p>

      {teaches.length > 0 && (
        <div className="space-y-1.5">
          {teaches.map((skill, i) => (
            <motion.div
              key={skill}
              className="flex items-center gap-2 text-xs"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <span className="font-semibold text-foreground/70 shrink-0">{userName}</span>
              <ArrowRight className="h-3 w-3 text-primary shrink-0" />
              <SkillPill label={skill} variant="teach" />
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">learners seeking this</span>
            </motion.div>
          ))}
        </div>
      )}

      {teaches.length > 0 && learns.length > 0 && (
        <div className="border-t border-white/10" />
      )}

      {learns.length > 0 && (
        <div className="space-y-1.5">
          {learns.map((skill, i) => (
            <motion.div
              key={skill}
              className="flex items-center gap-2 text-xs"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: teaches.length * 0.06 + i * 0.06 }}
            >
              <span className="font-semibold text-foreground/70 shrink-0">{userName}</span>
              <ArrowRight className="h-3 w-3 text-secondary shrink-0" />
              <SkillPill label={skill} variant="learn" />
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">teachers who offer this</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
