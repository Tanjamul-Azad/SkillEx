
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const gradientButtonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        filled: 'gradient-bg text-primary-foreground shadow-lg hover:shadow-primary/40 hover:scale-[1.03]',
        outlined: 'border-2 border-transparent bg-background bg-clip-padding before:content-[\'\'] before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-br before:from-primary before:to-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-muted hover:text-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
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
