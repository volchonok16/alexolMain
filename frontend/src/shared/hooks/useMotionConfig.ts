import type { Transition } from 'framer-motion';

const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

const mobileTransition: Transition = { duration: 0.5, ease: 'easeOut' };
const desktopTransition: Transition = { duration: 0.8 };

export const motionConfig = isMobile
  ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: mobileTransition,
      viewport: { once: true },
    }
  : {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: desktopTransition,
      viewport: { once: true },
    };

export const motionConfigX = (direction: 'left' | 'right') =>
  isMobile
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: mobileTransition,
        viewport: { once: true },
      }
    : {
        initial: { opacity: 0, x: direction === 'left' ? -50 : 50 },
        animate: { opacity: 1, x: 0 },
        transition: desktopTransition,
        viewport: { once: true },
      };

export const motionDelay = (delay: number): Transition =>
  isMobile ? mobileTransition : { ...desktopTransition, delay };
