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
    "duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
        // Solid primary — lifts, shadow deepens slightly, bg darkens a touch via opacity
        default:
          "bg-primary text-primary-foreground " +
          "shadow-[0_1px_3px_hsl(var(--primary)/0.25),0_2px_8px_hsl(var(--primary)/0.18)] " +
          "hover:-translate-y-[3px] " +
          "hover:bg-primary/90 " +
          "hover:shadow-[0_4px_14px_hsl(var(--primary)/0.30),0_1px_4px_hsl(var(--primary)/0.20)]",
        // Destructive — same pattern, red tones
        destructive:
          "bg-destructive text-destructive-foreground " +
          "shadow-[0_1px_3px_hsl(var(--destructive)/0.25)] " +
          "hover:-translate-y-[3px] " +
          "hover:bg-destructive/90 " +
          "hover:shadow-[0_4px_14px_hsl(var(--destructive)/0.28),0_1px_4px_hsl(var(--destructive)/0.18)]",
        // Outline — border sharpens to primary, bg gets a very subtle fill
        outline:
          "border border-border bg-background text-foreground " +
          "hover:-translate-y-[3px] " +
          "hover:border-primary/50 " +
          "hover:bg-primary/[0.04] " +
          "hover:shadow-[0_4px_14px_hsl(0_0%_0%/0.07),0_1px_3px_hsl(0_0%_0%/0.05)]",
        // Secondary — same lift pattern as default
        secondary:
          "bg-secondary text-secondary-foreground " +
          "shadow-[0_1px_3px_hsl(var(--secondary)/0.25)] " +
          "hover:-translate-y-[3px] " +
          "hover:bg-secondary/85 " +
          "hover:shadow-[0_4px_14px_hsl(var(--secondary)/0.28),0_1px_4px_hsl(var(--secondary)/0.18)]",
        // Ghost — understated, just a muted bg fill + slight lift
        ghost:
          "hover:bg-muted hover:text-foreground hover:-translate-y-px",
        // Link — underline animation only, no translate
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100 rounded-none",
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
