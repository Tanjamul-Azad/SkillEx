import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    /* Base layout */
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold",
    /* GPU compositing */
    "transform-gpu will-change-transform",
    /* Smooth transitions — fast enough to feel snappy, slow enough to see */
    "transition-[transform,box-shadow,background-color,border-color,color,opacity]",
    "duration-200 ease-expo-out",
    /* Press feedback */
    "active:scale-[0.97] active:translate-y-0 active:duration-75",
    /* Focus ring */
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ring-offset-background",
    /* Disabled */
    "disabled:pointer-events-none disabled:opacity-40",
    /* SVG children */
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "select-none touch-action-manipulation",
  ].join(" "),
  {
    variants: {
      variant: {
        // Solid primary — standard UI button (high contrast)
        default:
          "bg-foreground text-background font-medium " +
          "shadow-sm border border-foreground/10 " +
          "hover:bg-foreground/90 hover:shadow-md",
        // Destructive — same pattern, red tones
        destructive:
          "bg-destructive text-destructive-foreground " +
          "shadow-sm " +
          "hover:bg-destructive/90",
        // Outline — border sharpens to primary, bg gets a very subtle fill
        outline:
          "border border-border bg-background/50 text-foreground backdrop-blur-sm " +
          "hover:bg-muted hover:border-border hover:text-foreground hover:shadow-sm",
        // Secondary — same lift pattern as default
        secondary:
          "bg-muted text-foreground border border-border/50 " +
          "shadow-sm " +
          "hover:bg-muted/80",
        // Ghost — understated, just a muted bg fill
        ghost:
          "hover:bg-muted/80 hover:text-foreground",
        // Link — underline animation only, no translate
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100 rounded-none",
        // Solid Highlight CTA — primary fill, glow shadow, slight scale
        gradient:
          "bg-primary text-primary-foreground font-semibold " +
          "shadow-[0_4px_12px_hsl(var(--primary)/0.25)] " +
          "hover:bg-primary/90 hover:shadow-[0_6px_20px_hsl(var(--primary)/0.4)] hover:translate-y-[-0.5px]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm:      "h-9 rounded-lg px-3.5 text-xs",
        lg:      "h-11 rounded-xl px-8 text-base",
        icon:    "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
