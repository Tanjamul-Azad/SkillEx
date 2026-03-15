import { FC } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeftRight, Award, Users, Zap, Star, CheckCircle2, RotateCcw } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Mirrors backend ExchangeCycleHop */
export interface CycleHop {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  primarySkillName: string;
}

/** Mirrors backend ExchangeCycle */
export interface ExchangeCycleData {
  userIds: string[];
  userNames: string[];
  hops: CycleHop[];
  length: number;
}

/** Mirrors backend ScoredCycle */
export interface ScoredCycleDto {
  cycle: ExchangeCycleData;
  averageRating: number;
  skillMatchQuality: number;
  sessionAvailability: number;
  score: number;
}

interface Props {
  data: ScoredCycleDto;
  currentUserId?: string;
  className?: string;
  onRequestJoin?: (cycle: ExchangeCycleData) => void;
  onStartChain?: (cycle: ExchangeCycleData) => void;
  starting?: boolean;
}

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-300 ring-blue-500/40',
  'bg-purple-500/20 text-purple-300 ring-purple-500/40',
  'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40',
  'bg-amber-500/20 text-amber-300 ring-amber-500/40',
];

const SKILL_PILL_COLORS = [
  'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
];

function scoreBadgeColor(score: number) {
  if (score >= 75) return 'border-green-500/40 bg-green-500/10 text-green-400';
  if (score >= 50) return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
  return 'border-red-500/40 bg-red-500/10 text-red-400';
}

function QualityBar({ value, color, label, display }: { value: number; color: string; label: string; display: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <span className="w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(value * 100)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="w-10 text-right tabular-nums font-medium">{display}</span>
    </div>
  );
}

/** User "box" as shown in the flowchart — name + what they offer/want in this hop */
function ParticipantBox({
  name,
  offersSkill,
  wantsSkill,
  colorIdx,
  isCurrentUser,
}: {
  name: string;
  offersSkill?: string;
  wantsSkill?: string;
  colorIdx: number;
  isCurrentUser: boolean;
}) {
  const avColor = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  const pillColor = SKILL_PILL_COLORS[colorIdx % SKILL_PILL_COLORS.length];
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border px-3 py-2.5 min-w-[100px] max-w-[130px]',
        isCurrentUser
          ? 'border-primary/50 bg-primary/10'
          : 'border-white/10 bg-white/[0.03]',
      )}
    >
      {isCurrentUser && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
          YOU
        </span>
      )}
      <Avatar className={cn('h-9 w-9 ring-2 text-sm font-bold shrink-0', avColor)}>
        <AvatarFallback className={avColor}>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2">
        {name}
      </span>
      <div className="flex flex-col gap-1 w-full">
        {offersSkill && (
          <div className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full border text-center truncate', pillColor)}>
            Offers: {offersSkill}
          </div>
        )}
        {wantsSkill && (
          <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground text-center truncate">
            Wants: {wantsSkill}
          </div>
        )}
      </div>
    </div>
  );
}

/** Arrow between participants with the skill label */
function HopArrow({ skill, colorIdx }: { skill: string; colorIdx: number }) {
  const pillColor = SKILL_PILL_COLORS[colorIdx % SKILL_PILL_COLORS.length];
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 mx-1">
      <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border max-w-[56px] text-center truncate', pillColor)}>
        {skill}
      </span>
    </div>
  );
}

/** Return arrow (last hop closing the cycle back to first user) */
function ReturnArrow({ skill, colorIdx }: { skill: string; colorIdx: number }) {
  const pillColor = SKILL_PILL_COLORS[colorIdx % SKILL_PILL_COLORS.length];
  return (
    <div className="flex flex-col items-center gap-1 mt-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <RotateCcw className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-[10px]">closes the ring</span>
      </div>
      <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', pillColor)}>
        {skill} →
      </span>
    </div>
  );
}

/**
 * ExchangeChainCard
 *
 * Visual flowchart card for one scored exchange cycle.
 * 2-way swaps get a symmetric ↔ layout.
 * 3-way and longer cycles get a linear A→B→C→…→A flow.
 */
export const ExchangeChainCard: FC<Props> = ({ data, currentUserId, className, onRequestJoin, onStartChain, starting = false }) => {
  const { cycle, score, averageRating, skillMatchQuality, sessionAvailability } = data;
  const is2Way = cycle.hops.length === 2;
  const chainLabel = is2Way ? 'Perfect 2-Way Swap' : `${cycle.hops.length}-Person Chain`;

  // Build per-participant (offeredSkill, wantedSkill) from hops
  // hop[i]: fromUser teaches primarySkill → toUser
  // So: fromUser offers that skill; toUser wants it
  const participantInfo = cycle.userIds.map((uid, idx) => {
    const offersHop = cycle.hops.find(h => h.fromUserId === uid);
    const wantsHop  = cycle.hops.find(h => h.toUserId   === uid);
    return {
      id:         uid,
      name:       cycle.userNames[idx] ?? uid,
      offers:     offersHop?.primarySkillName,
      wants:      wantsHop?.primarySkillName,
      colorIdx:   idx,
    };
  });

  const myIdx = currentUserId ? cycle.userIds.indexOf(currentUserId) : -1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border p-4 space-y-4',
        'bg-gradient-to-br from-white/[0.04] to-white/[0.01]',
        'border-white/10 hover:border-primary/30 transition-colors duration-300',
        'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]',
        myIdx !== -1 && 'border-primary/25',
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-full',
            is2Way ? 'bg-emerald-500/15' : 'bg-primary/10',
          )}>
            {is2Way
              ? <ArrowLeftRight className="h-3.5 w-3.5 text-emerald-400" />
              : <Zap className="h-3.5 w-3.5 text-primary" />
            }
          </div>
          <span className="text-sm font-semibold">{chainLabel}</span>
          {myIdx !== -1 && (
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px] px-1.5 py-0 gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> You're in this
            </Badge>
          )}
        </div>
        <Badge className={cn('gap-1 border font-bold text-sm px-2.5 py-0.5', scoreBadgeColor(score))}>
          <Award className="h-3.5 w-3.5" />
          {score}
        </Badge>
      </div>

      {/* ── Flowchart ──────────────────────────────────────── */}
      <div className="overflow-x-auto pb-1">
        {is2Way ? (
          /* 2-WAY: symmetric side-by-side */
          <div className="flex items-center justify-center gap-3 flex-wrap sm:flex-nowrap">
            <ParticipantBox
              {...participantInfo[0]}
              isCurrentUser={myIdx === 0}
            />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex items-center gap-1">
                <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', SKILL_PILL_COLORS[0])}>
                {cycle.hops[0]?.primarySkillName}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/60 rotate-180" />
              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border', SKILL_PILL_COLORS[1])}>
                {cycle.hops[1]?.primarySkillName}
              </span>
            </div>
            <ParticipantBox
              {...participantInfo[1]}
              isCurrentUser={myIdx === 1}
            />
          </div>
        ) : (
          /* N-WAY: linear flow with closing arrow */
          <div className="space-y-2">
            <div className="flex items-start flex-wrap gap-1">
              {participantInfo.map((p, idx) => (
                <div key={p.id} className="flex items-center">
                  <ParticipantBox
                    {...p}
                    isCurrentUser={myIdx === idx}
                  />
                  {idx < cycle.hops.length - 1 && (
                    <HopArrow
                      skill={cycle.hops[idx].primarySkillName}
                      colorIdx={idx}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Closing hop (last participant → first) */}
            {cycle.hops.length > 0 && (
              <ReturnArrow
                skill={cycle.hops[cycle.hops.length - 1].primarySkillName}
                colorIdx={cycle.hops.length - 1}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Quality scores ─────────────────────────────────── */}
      <div className="space-y-1.5 border-t border-white/10 pt-3">
        <QualityBar
          label="Avg Rating"
          value={averageRating / 5}
          color="bg-primary"
          display={averageRating.toFixed(1)}
        />
        <QualityBar
          label="Skill Quality"
          value={skillMatchQuality}
          color={is2Way ? 'bg-emerald-400' : 'bg-secondary'}
          display={`${Math.round(skillMatchQuality * 100)}%`}
        />
        <QualityBar
          label="Availability"
          value={sessionAvailability}
          color="bg-accent"
          display={`${Math.round(sessionAvailability * 100)}%`}
        />
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{cycle.userNames.length} participants</span>
          <span className="text-muted-foreground/40">·</span>
          <Star className="h-3 w-3 fill-amber-400/60 text-amber-400/60" />
          <span>{averageRating.toFixed(1)} avg</span>
        </div>
        {onRequestJoin && myIdx === -1 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-[11px] border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => onRequestJoin(cycle)}
          >
            Request to Join
          </Button>
        )}
        {myIdx !== -1 && (
          <div className="flex items-center gap-2">
            {onStartChain && (
              <Button
                size="sm"
                variant="outline"
                disabled={starting}
                className="h-7 px-3 text-[11px] border-green-500/40 text-green-400 hover:bg-green-500/10"
                onClick={() => onStartChain(cycle)}
              >
                {starting ? 'Starting...' : 'Start Chain'}
              </Button>
            )}
            <span className="text-[11px] text-green-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Participating
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
