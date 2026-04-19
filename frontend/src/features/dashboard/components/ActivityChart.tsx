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
    <Card className="h-full w-full border-white/5 bg-card/80 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 hover:border-white/10 hover:shadow-glow-sm shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6 relative z-10">
        <div>
          <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance
          </CardTitle>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-headline text-[38px] leading-none font-bold tracking-tighter text-foreground drop-shadow-[0_0_8px_var(--primary)]">
              78%
            </span>
            <div className={cn(
              "flex items-center text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-1",
              isPositive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            )}>
              {isPositive ? <TrendingUp className="mr-1.5 h-3 w-3" /> : <TrendingDown className="mr-1.5 h-3 w-3" />}
              {isPositive ? '+' : '-'}{Math.abs(trend)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 mt-4 relative z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-bold shadow-glow-sm backdrop-blur-md text-white">
                        <div className="flex gap-2 items-center">
                          <span className="text-muted-foreground/80 lowercase">{payload[0].payload.name}</span>
                          <span className="text-primary">{payload[0].value}%</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="hsl(var(--primary))"
                strokeWidth={3.5}
                fillOpacity={1}
                fill="url(#colorHours)"
                animationDuration={2000}
                animationEasing="ease-out"
                filter="url(#glow)"
              />
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
