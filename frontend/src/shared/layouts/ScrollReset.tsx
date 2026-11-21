import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollReset = () => {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
        else window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pathname, hash]);

  return null;
};
