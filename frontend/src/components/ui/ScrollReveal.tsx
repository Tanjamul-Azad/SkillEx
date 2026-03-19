import React from 'react';
import { motion, useInView, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ScrollRevealAnimation = 
  | 'fade-up' 
  | 'fade-down' 
  | 'fade-left' 
  | 'fade-right' 
  | 'zoom-in' 
  | 'blur-in'
  | 'jitter-scale';

export interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: ScrollRevealAnimation;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  amount?: 'some' | 'all' | number;
  staggerChildren?: number;
}

const VARIANTS: Record<ScrollRevealAnimation, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-down': {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-left': {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  'fade-right': {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  'zoom-in': {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  'blur-in': {
    hidden: { opacity: 0, filter: 'blur(10px)', y: 10 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
  'jitter-scale': {
    hidden: { opacity: 0, scale: 0.85, y: 40 },
    visible: { opacity: 1, scale: 1, y: 0 },
  }
};

/**
 * A wrapper to add smooth, elegant scroll-into-view animations (Jitter style).
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 0.6,
  className,
  once = true,
  amount = 0.2, // trigger when 20% in view
  staggerChildren,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  const customVariants: Variants = {
    hidden: VARIANTS[animation].hidden,
    visible: {
      ...VARIANTS[animation].visible,
      transition: {
        type: 'spring',
        damping: 24,
        stiffness: 100, // Provides that smooth 'Jitter' elegant snap
        delay,
        duration,
        ...(staggerChildren ? { staggerChildren } : {})
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={customVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

export const ScrollRevealGroup: React.FC<ScrollRevealProps> = ({
  children,
  animation = 'fade-up',
  delay = 0,
  className,
  once = true,
  amount = 0.1,
  staggerChildren = 0.1, // Default stagger
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount });

  // Parent controls stagger
  const groupVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren,
        delayChildren: delay,
      }
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={groupVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={cn(className)}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        // If the child is already a motion component, we just render it. 
        // Framer Motion automatically propagates 'initial' and 'animate' props.
        return child;
      })}
    </motion.div>
  );
};
