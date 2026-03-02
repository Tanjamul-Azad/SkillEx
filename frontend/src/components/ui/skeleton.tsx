
import { cn } from "@/lib/utils";
import React from 'react';

type SkeletonProps = {
  variant?: 'card' | 'list-item' | 'profile' | 'text' | 'custom';
  count?: number;
  className?: string;
}

const Shimmer = () => (
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-gray-300/20 to-transparent" />
)

function Skeleton({
  variant = 'text',
  count = 1,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & SkeletonProps) {
  const elements = Array(count).fill(0).map((_, i) => {
    switch (variant) {
      case 'card':
        return (
          <div key={i} className={cn("relative overflow-hidden rounded-lg bg-muted p-4 space-y-4", className)} {...props}>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted-foreground/20" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-3/4 rounded bg-muted-foreground/20" />
                <div className="h-4 w-1/2 rounded bg-muted-foreground/20" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-10 w-full rounded bg-muted-foreground/20" />
              <div className="h-10 w-full rounded bg-muted-foreground/20" />
            </div>
            <div className="h-10 w-1/2 rounded bg-muted-foreground/20" />
             <Shimmer />
          </div>
        );
      case 'list-item':
        return (
          <div key={i} className={cn("relative overflow-hidden flex items-center gap-4 p-4 bg-muted rounded-lg", className)} {...props}>
            <div className="h-12 w-12 rounded-full bg-muted-foreground/20" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted-foreground/20" />
              <div className="h-4 w-1/2 rounded bg-muted-foreground/20" />
            </div>
             <Shimmer />
          </div>
        );
      case 'profile':
        return (
            <div key={i} className={cn("relative overflow-hidden w-full bg-muted rounded-lg", className)} {...props}>
                <div className="h-48 bg-muted-foreground/20" />
                <div className="p-4 -mt-14">
                    <div className="h-28 w-28 rounded-full bg-muted-foreground/30 border-4 border-muted" />
                    <div className="mt-4 space-y-2">
                        <div className="h-8 w-1/2 rounded bg-muted-foreground/20" />
                        <div className="h-4 w-3/4 rounded bg-muted-foreground/20" />
                    </div>
                </div>
                <Shimmer />
            </div>
        )
      case 'text':
         return (
             <div key={i} className={cn("relative overflow-hidden w-full space-y-2", className)} {...props}>
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-5/6 rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                 <Shimmer />
            </div>
         )
      default:
        return (
            <div
              key={i}
              className={cn("relative overflow-hidden rounded-md bg-muted", className)}
              {...props}
            >
                <Shimmer />
            </div>
        )
    }
  });

  return <>{elements}</>;
}

export { Skeleton };
