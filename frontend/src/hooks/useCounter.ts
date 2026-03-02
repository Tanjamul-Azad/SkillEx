"use client";

import { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';

type UseCounterOptions = {
  duration?: number;
  from?: number;
}

export const useCounter = (targetValue: number, options: UseCounterOptions = {}) => {
  const { duration = 2, from = 0 } = options;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 'some' });

  useEffect(() => {
    if (isInView && ref.current) {
      const node = ref.current;
      node.textContent = from.toLocaleString();
      
      const controls = animate(from, targetValue, {
        duration,
        ease: "easeOut",
        onUpdate(value) {
          node.textContent = Math.round(value).toLocaleString();
        },
      });
      return () => controls.stop();
    }
  }, [isInView, from, targetValue, duration]);
  
  return { ref };
};
