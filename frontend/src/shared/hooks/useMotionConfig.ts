import { useMemo } from 'react';
import type { Transition } from 'framer-motion';
import { useIsMobile } from './useIsMobile';

const mobileTransition: Transition = { duration: 0.5, ease: 'easeOut' };
const desktopTransition: Transition = { duration: 0.8 };
const viewport = { once: true, amount: 0.1, margin: '0px 0px -50px 0px' };

export const useMotionConfig = () => {
  const isMobile = useIsMobile();

  return useMemo(() => ({
    motionConfig: isMobile
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: mobileTransition, viewport }
      : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: desktopTransition, viewport },

    motionConfigX: (direction: 'left' | 'right') =>
      isMobile
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: mobileTransition, viewport }
        : {
            initial: { opacity: 0, x: direction === 'left' ? -30 : 30 },
            animate: { opacity: 1, x: 0 },
            transition: desktopTransition,
            viewport,
          },

    motionDelay: (delay: number): Transition =>
      isMobile ? mobileTransition : { ...desktopTransition, delay },
  }), [isMobile]);
};
