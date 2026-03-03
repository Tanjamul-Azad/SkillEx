import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base - using premium glassmorphism
      "relative overflow-hidden rounded-2xl bg-card/60 backdrop-blur-xl",
      // Subdued border to simulate glass reflection
      "border border-white/20 dark:border-white/10",
      // Clean, cool-toned shadows
      "shadow-[0_4px_24px_-8px_hsl(220_20%_40%/0.12),0_1px_3px_hsl(220_20%_40%/0.08)]",
      "dark:shadow-[0_4px_24px_-8px_hsl(0_0%_0%/0.5),0_1px_3px_hsl(0_0%_0%/0.3)]",
      // GPU compositing and transitions
      "transform-gpu will-change-transform",
      "transition-all duration-400 ease-snappy",
      // Hover properties - levitate slightly + intense glow + sharp border highlight
      "hover:-translate-y-1.5",
      "hover:border-primary/40",
      "hover:bg-card/80",
      "hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.25),0_4px_12px_hsl(220_20%_40%/0.1)]",
      "dark:hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.3),0_4px_12px_hsl(0_0%_0%/0.4)]",
      // The "sheen" inner effect on hover
      "group",
      className
    )}
    {...props}
  >
    {/* Animated internal sheen pseudo-element (controlled via parent group hover) */}
    <div className="absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
    <div className="relative z-10">{props.children}</div>
  </div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
