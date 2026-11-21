import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../contexts';

type ScrollExperienceProps = {
  children: ReactNode;
  className?: string;
};

export const ScrollExperience = ({ children, className }: ScrollExperienceProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const [sections, setSections] = useState<Array<{ id: string; label: string }>>([]);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealSections = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
    const progress = root.querySelector<HTMLElement>('[data-scroll-progress]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const railSections = revealSections.map((section, index) => {
      if (!section.id) section.id = `scroll-section-${index + 1}`;
      return { id: section.id, label: section.dataset.railLabel ?? `Section ${String(index + 1).padStart(2, '0')}` };
    });
    setSections(railSections);
    setActiveSection(railSections[0]?.id ?? '');

    if (!reducedMotion && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        entries =>
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              if (entry.intersectionRatio > 0.3) setActiveSection((entry.target as HTMLElement).id);
            }
          }),
        { threshold: [0.12, 0.3], rootMargin: '0px 0px -5% 0px' }
      );
      revealSections.forEach(section => observer.observe(section));
      root.classList.add('scroll-experience--ready');

      let frame = 0;
      const updateProgress = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const range = document.documentElement.scrollHeight - window.innerHeight;
          if (progress) progress.style.transform = `scaleX(${range > 0 ? window.scrollY / range : 0})`;
        });
      };
      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();

      return () => {
        observer.disconnect();
        window.removeEventListener('scroll', updateProgress);
        cancelAnimationFrame(frame);
      };
    }

    revealSections.forEach(section => section.classList.add('is-revealed'));
    if (progress) progress.style.transform = 'scaleX(0)';
  }, [language]);

  return (
    <div className={`scroll-experience ${className ?? ''}`} ref={rootRef}>
      <a className="skip-link" href="#main-content">
        {language === 'ru' ? 'К основному содержимому' : 'Skip to content'}
      </a>
      <div className="scroll-progress" aria-hidden="true">
        <span data-scroll-progress />
      </div>
      <nav className="scroll-rail" aria-label={language === 'ru' ? 'Разделы страницы' : 'Page sections'}>
        {sections.map((section, index) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={activeSection === section.id ? 'is-active' : ''}
            aria-label={section.label}
            aria-current={activeSection === section.id ? 'location' : undefined}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
};
