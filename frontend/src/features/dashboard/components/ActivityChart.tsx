import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityChartPoint {
  name: string;
  value: number;
  sessions: number;
  exchanges: number;
  xp: number;
}

interface ActivityChartProps {
  data: ActivityChartPoint[];
  trend: number;
  total: number;
  loading?: boolean;
}

export function ActivityChart({ data, trend, total, loading = false }: ActivityChartProps) {
  const isPositive = trend >= 0;
  const hasData = total > 0;

  return (
    <Card className="h-full min-h-[260px] w-full overflow-hidden rounded-2xl border-border/70 bg-card/65 backdrop-blur-md transition-colors duration-300 hover:border-primary/20 dark:border-white/10 dark:bg-card/55">
      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-4 px-5 pb-2 pt-5">
        <div>
          <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activity Trend
          </CardTitle>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-headline text-3xl font-bold leading-none tracking-tight text-foreground">
              {loading ? '--' : total}
            </span>
            <div className={cn(
              "mb-0.5 flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
              isPositive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            )}>
              {isPositive ? <TrendingUp className="mr-1.5 h-3 w-3" /> : <TrendingDown className="mr-1.5 h-3 w-3" />}
              {loading || !hasData ? '0%' : `${isPositive ? '+' : '-'}${Math.abs(trend)}%`}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sessions, exchanges, and XP events from real account activity.
          </p>
        </div>
      </CardHeader>

      <CardContent className="relative z-0 mt-1 p-0">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
        <div className="h-[165px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as ActivityChartPoint;
                    return (
                      <div className="rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs font-semibold shadow-glow-sm backdrop-blur-md text-white">
                        <p className="mb-1 text-muted-foreground">{point.name}</p>
                        <p className="text-primary">{point.value} total actions</p>
                        <p className="mt-1 text-[11px] text-white/70">
                          {point.sessions} sessions, {point.exchanges} exchanges, {point.xp} XP events
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeOpacity={0.8}
                fillOpacity={1}
                fill="url(#colorActivity)"
                animationDuration={2000}
                animationEasing="ease-out"
                filter="url(#glow)"
              />
              <YAxis hide domain={[0, 'dataMax + 1']} allowDecimals={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                dy={15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
