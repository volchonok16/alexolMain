import { useRef, useState, useLayoutEffect } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export const Reveal = ({ children, className, delay = 0 }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [skip, setSkip] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setSkip(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: skip || visible ? 1 : 0,
        transform: skip || visible ? 'translateY(0)' : 'translateY(20px)',
        transition: skip ? 'none' : `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};
