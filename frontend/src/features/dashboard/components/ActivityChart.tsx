import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityChartProps {
  data: { name: string; hours: number; amt: number }[];
  trend: number;
}

export function ActivityChart({ data, trend }: ActivityChartProps) {
  const isPositive = trend >= 0;

  return (
    <Card className="h-full w-full border-border/60 bg-card overflow-hidden transition-all duration-300 hover:border-border hover:shadow-md dark:border-white/[0.07] dark:hover:border-white/[0.12]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight text-foreground/80 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Overall Performance
          </CardTitle>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-headline text-4xl font-bold tracking-tighter text-foreground">
              78%
            </span>
            <div className={cn(
              "flex items-center text-xs font-semibold px-2.5 py-1 rounded-full mb-1",
              isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}>
              {isPositive ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              Trending {isPositive ? 'up' : 'down'} by {Math.abs(trend)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 mt-4">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">{payload[0].payload.name}:</span>
                          <span className="text-foreground font-bold">{payload[0].value}% Quality</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorHours)"
                animationDuration={2000}
                animationEasing="ease-out"
              />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                dy={10}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
