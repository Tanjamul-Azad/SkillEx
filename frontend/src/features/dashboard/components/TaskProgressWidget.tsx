import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

export function TaskProgressWidget() {
  const progressValue = 67;
  
  const data = [
    { name: 'Background', value: 100, fill: 'hsl(var(--muted))' }, // Background ring
    { name: 'Progress', value: progressValue, fill: 'hsl(var(--primary))' }, // Foreground ring
  ];

  const tasks = [
    { title: 'Confirm React session schedule', completed: true },
    { title: 'Review UI/UX portfolio', completed: false },
    { title: 'Update availability calendar', completed: false }
  ];

  return (
    <Card className="h-full w-full border-border/60 bg-card bg-gradient-to-br from-card to-card/50 transition-all duration-300 hover:border-border hover:shadow-md dark:border-white/[0.07] dark:hover:border-white/[0.12]">
      <CardHeader className="pb-0 pt-6 px-6">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground/80 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-500" />
          Learning Task Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        <div className="flex items-center gap-6">
          
          {/* Radial Chart */}
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

          {/* Task List */}
          <div className="flex-1 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Next up
            </p>
            {tasks.map((task, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className={cn(
                  "flex items-start gap-2.5 text-xs",
                  task.completed ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-border shrink-0 mt-0.5" />
                )}
                <span className={cn(
                  "leading-tight font-medium",
                  task.completed && "line-through opacity-70"
                )}>
                  {task.title}
                </span>
              </motion.div>
            ))}
          </div>
          
        </div>
      </CardContent>
    </Card>
  );
}
