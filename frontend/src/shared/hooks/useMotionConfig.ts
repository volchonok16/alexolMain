import { useMemo } from 'react';
import type { Transition } from 'framer-motion';
import { useIsMobile } from './useIsMobile';

const mobileTransition: Transition = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] };
const desktopTransition: Transition = { duration: 0.8 };
const viewport = { once: true, amount: 0.2 };

export const useMotionConfig = () => {
  const isMobile = useIsMobile();

  return useMemo(() => ({
    motionConfig: {
      initial: { opacity: 0, y: isMobile ? 0 : 20 },
      animate: { opacity: 1, y: 0 },
      transition: isMobile ? mobileTransition : desktopTransition,
      viewport,
    },

    motionConfigX: (direction: 'left' | 'right') => ({
      initial: { opacity: 0, x: isMobile ? 0 : (direction === 'left' ? -30 : 30) },
      animate: { opacity: 1, x: 0 },
      transition: isMobile ? mobileTransition : desktopTransition,
      viewport,
    }),

    motionDelay: (delay: number): Transition =>
      isMobile ? mobileTransition : { ...desktopTransition, delay },
  }), [isMobile]);
};
