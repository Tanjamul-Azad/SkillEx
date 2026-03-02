import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base
      "relative overflow-hidden rounded-2xl bg-card text-card-foreground",
      // Border — solid, clear in both modes
      "border border-border",
      // Shadows — light: cool-toned soft; dark: deep
      "shadow-[0_1px_3px_hsl(220_20%_40%/0.08),0_4px_14px_hsl(220_20%_40%/0.06)]",
      "dark:shadow-[0_1px_4px_hsl(0_0%_0%/0.32),0_4px_16px_hsl(0_0%_0%/0.22)]",
      // GPU compositing
      "transform-gpu will-change-transform",
      // Smooth transition on hover properties
      "transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.30,0.64,1)]",
      // Hover — float up + stronger shadow + border tints primary
      "hover:-translate-y-[5px]",
      "hover:border-primary/35",
      "hover:shadow-[0_8px_28px_hsl(220_20%_40%/0.13),0_2px_8px_hsl(220_20%_40%/0.09)]",
      "dark:hover:shadow-[0_8px_32px_hsl(0_0%_0%/0.45),0_2px_8px_hsl(0_0%_0%/0.32)]",
      // Sweep-line via ::before — slides left→right on hover at the top
      "before:absolute before:top-0 before:left-0",
      "before:h-[3px] before:w-0",
      "before:bg-primary",
      "before:rounded-b-sm",
      "before:transition-[width] before:duration-[360ms] before:ease-[cubic-bezier(0.16,1,0.3,1)]",
      "hover:before:w-full",
      className
    )}
    {...props}
  />
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
