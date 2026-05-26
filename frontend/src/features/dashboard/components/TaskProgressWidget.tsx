import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import type { SkillCheckMeeting } from '@/services/skillCheckService';

interface TaskProgressWidgetProps {
  meetings: SkillCheckMeeting[];
  loading?: boolean;
  currentUserId: string;
  feedbackBusy?: string | null;
  onFeedback: (meetingId: string, outcome: 'SUITABLE' | 'MAYBE' | 'NOT_SUITABLE') => void;
}

export function TaskProgressWidget({
  meetings,
  loading = false,
  currentUserId,
  feedbackBusy,
  onFeedback,
}: TaskProgressWidgetProps) {
  const visibleMeetings = meetings
    .filter((meeting) => !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(meeting.status))
    .slice(0, 3);
  const checklistTotal = visibleMeetings.reduce((sum, meeting) => (
    sum
    + Number(meeting.checklistIntro)
    + Number(meeting.checklistDemo)
    + Number(meeting.checklistGoalAlignment)
    + Number(meeting.checklistScheduleFit)
  ), 0);
  const progressValue = visibleMeetings.length === 0
    ? 100
    : Math.round((checklistTotal / (visibleMeetings.length * 4)) * 100);
  
  const data = [
    { name: 'Background', value: 100, fill: 'hsl(var(--muted))' }, // Background ring
    { name: 'Progress', value: progressValue, fill: 'hsl(var(--primary))' }, // Foreground ring
  ];

  return (
    <Card className="h-full w-full border-border/60 bg-card bg-gradient-to-br from-card to-card/50 transition-all duration-300 hover:border-border hover:shadow-md dark:border-white/[0.07] dark:hover:border-white/[0.12]">
      <CardHeader className="pb-0 pt-6 px-6">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground/80 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-500" />
          Skill Checks
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          
          <div className="relative h-24 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                cx="50%" cy="50%" 
                innerRadius="75%" outerRadius="100%" 
                barSize={8} data={data} 
                startAngle={90} endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar 
                  background={false} 
                  dataKey="value" 
                  cornerRadius={10} 
                  fillOpacity={1}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline text-xl font-bold tracking-tight text-foreground">
                {progressValue}%
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Pending feedback
            </p>
            {loading ? (
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted/70" />
                <div className="h-8 w-full rounded-lg bg-muted/60" />
              </div>
            ) : visibleMeetings.length === 0 ? (
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="font-medium leading-tight">No pending skill check feedback.</span>
              </div>
            ) : visibleMeetings.map((meeting, i) => {
              const isRequester = meeting.requester.id === currentUserId;
              const partner = isRequester ? meeting.targetUser : meeting.requester;
              const myOutcome = isRequester ? meeting.requesterOutcome : meeting.targetOutcome;
              const isBusy = feedbackBusy === meeting.id;

              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="rounded-xl border border-border/60 bg-background/60 p-3"
                >
                  <div className="mb-2 flex min-w-0 items-start gap-2.5">
                    {myOutcome ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-border" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-xs font-semibold leading-tight", myOutcome ? "text-muted-foreground" : "text-foreground")}>
                        {meeting.skill.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        with {partner.name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 rounded-full text-[9px]">
                      {myOutcome ?? meeting.status}
                    </Badge>
                  </div>

                  {!myOutcome && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md px-1 text-[10px]"
                        disabled={isBusy}
                        onClick={() => onFeedback(meeting.id, 'SUITABLE')}
                      >
                        Suitable
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md px-1 text-[10px]"
                        disabled={isBusy}
                        onClick={() => onFeedback(meeting.id, 'MAYBE')}
                      >
                        Maybe
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md px-1 text-[10px]"
                        disabled={isBusy}
                        onClick={() => onFeedback(meeting.id, 'NOT_SUITABLE')}
                      >
                        No
                      </Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}
