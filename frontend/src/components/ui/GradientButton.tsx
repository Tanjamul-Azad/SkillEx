
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const gradientButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform-gpu will-change-transform active:scale-[0.97] active:duration-75',
  {
    variants: {
      variant: {
        filled: 'gradient-bg text-primary-foreground shadow-[0_2px_12px_hsl(var(--primary)/0.35)] hover:-translate-y-[3px] hover:scale-[1.02] hover:shadow-[0_6px_20px_hsl(var(--primary)/0.40)]',
        outlined: 'border-2 border-primary/50 bg-background text-foreground hover:-translate-y-[3px] hover:border-primary hover:bg-primary/[0.04] hover:shadow-[0_4px_14px_hsl(var(--primary)/0.18)]',
        ghost: 'bg-transparent text-foreground hover:bg-muted hover:-translate-y-px',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 rounded-lg px-3.5 text-xs',
        lg: 'h-11 rounded-xl px-8 text-base',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'default',
    },
  }
);

const OutlinedText = ({children}: {children: React.ReactNode}) => (
    <span className="text-gradient-animated bg-gradient-to-r from-primary via-secondary to-accent">
        {children}
    </span>
)


export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = loading || disabled;

    return (
      <motion.div
        whileTap={!isDisabled ? { scale: 0.96 } : {}}
        className="relative"
      >
        <Comp
          className={cn(gradientButtonVariants({ variant, size, className }), { 'relative': variant === 'outlined' })}
          ref={ref}
          disabled={isDisabled}
          {...props}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            variant === 'outlined' || variant === 'ghost' ? <OutlinedText>{children}</OutlinedText> : children
          )}
        </Comp>
      </motion.div>
    );
  }
);
GradientButton.displayName = 'GradientButton';

export { GradientButton, gradientButtonVariants };
