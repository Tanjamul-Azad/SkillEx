
import { useRef } from 'react';
import { useInView, type UseInViewOptions } from 'framer-motion';

export const useScrollAnimation = (options?: UseInViewOptions) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2, ...options });

  return { ref, isInView };
};
