const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

export const motionConfig = isMobile
  ? {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.4, ease: 'linear' },
      viewport: { once: true },
    }
  : {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.8 },
      viewport: { once: true },
    };

export const motionConfigX = (direction: 'left' | 'right') =>
  isMobile
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.4, ease: 'linear' },
        viewport: { once: true },
      }
    : {
        initial: { opacity: 0, x: direction === 'left' ? -50 : 50 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.8 },
        viewport: { once: true },
      };
