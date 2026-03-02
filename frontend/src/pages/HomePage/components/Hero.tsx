import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { TechModule } from './TechModule';
import { InteractiveGrid } from './InteractiveGrid';
import { ProjectModal } from './modals';
import { useLanguage } from '../../../shared/contexts';
import { useTranslation } from '../../../shared/utils/translations';
import { useTypewriter } from '../../../shared/hooks/useTypewriter';

interface Module {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  connections: string[];
  title: string;
  description: string;
  cta: string;
}

const isMobile = () => window.innerWidth < 1024;

const getModules = (t: (path: string) => string): Module[] => {
  const isFullHD = window.innerWidth >= 1920;

  const moduleData = [
    { id: 'web', name: 'Web', icon: '🌐', x: isFullHD ? 75 : 75, y: 20, connections: ['backend', 'frontend'] },
    { id: 'enterprise', name: 'Enterprise', icon: '🏢', x: 85, y: 45, connections: ['backend', 'frontend'] },
    { id: 'ecommerce', name: 'E-commerce', icon: '🛒', x: 90, y: 70, connections: ['backend', 'frontend'] },
    {
      id: 'mobile',
      name: 'Mobile',
      icon: '📱',
      x: isFullHD ? 15 : 70,
      y: isFullHD ? 70 : 85,
      connections: ['backend', 'frontend'],
    },
    { id: 'ai', name: 'AI/ML', icon: '🤖', x: isFullHD ? 10 : 60, y: isFullHD ? 30 : 15, connections: ['backend'] },
    { id: 'cloud', name: 'Cloud', icon: '☁️', x: 85, y: 15, connections: ['backend'] },
    {
      id: 'frontend',
      name: 'Frontend',
      icon: '⚛️',
      x: isFullHD ? 22 : 65,
      y: isFullHD ? 50 : 55,
      connections: ['web', 'enterprise', 'ecommerce', 'mobile'],
    },
    {
      id: 'backend',
      name: 'Backend',
      icon: '⚙️',
      x: 78,
      y: 60,
      connections: ['web', 'enterprise', 'ecommerce', 'mobile', 'ai', 'cloud'],
    },
  ];

  return moduleData.map(m => ({
    ...m,
    title: t(`hero.modules.${m.id}.title`),
    description: t(`hero.modules.${m.id}.description`),
    cta: t(`hero.modules.${m.id}.cta`),
  }));
};

export const Hero = () => {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const [modules, setModules] = useState<Module[]>(getModules(t));
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastUpdateRef = useRef(0);
  const mobile = isMobile();

  useEffect(() => {
    setModules(getModules(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const handleResize = () => setModules(getModules(t));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (mobile) return;
    const now = Date.now();
    if (now - lastUpdateRef.current < 50) return;

    lastUpdateRef.current = now;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [mobile]);

  const defaultTitle = t('hero.title');
  const defaultDescription = t('hero.description');
  const defaultCta = t('hero.cta');

  const currentTitleText = useMemo(() => {
    if (activeModule) {
      return `${activeModule.name} → ${activeModule.description}`;
    }
    return defaultTitle;
  }, [activeModule, defaultTitle]);

  const displayTitle = mobile ? currentTitleText : useTypewriter(currentTitleText, 30);
  const currentCta = activeModule?.cta || defaultCta;

  const handleModuleClick = (module: Module) => {
    setActiveModule(activeModule?.id === module.id ? null : module);
  };

  const getConnectedModules = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    return module?.connections || [];
  };

  return (
    <section className="hero" onMouseMove={handleMouseMove}>
      <div className="hero__background">
        <InteractiveGrid mousePos={mousePos} />
        <div className="hero__gradient hero__gradient--primary" />
        <div className="hero__gradient hero__gradient--secondary" />

        {!mobile && (
          <svg className="hero__connections">
            {hoveredModule &&
              getConnectedModules(hoveredModule).map(connId => {
                const from = modules.find(m => m.id === hoveredModule);
                const to = modules.find(m => m.id === connId);
                if (!from || !to) return null;

                return (
                  <motion.line
                    key={`${hoveredModule}-${connId}`}
                    x1={`${from.x}%`}
                    y1={`${from.y}%`}
                    x2={`${to.x}%`}
                    y2={`${to.y}%`}
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.6 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })}
          </svg>
        )}

        {!mobile && (
          <div className="hero__modules">
            {modules.map(module => (
              <TechModule
                key={module.id}
                module={module}
                isHovered={hoveredModule === module.id}
                isActive={activeModule?.id === module.id}
                isConnected={hoveredModule ? getConnectedModules(hoveredModule).includes(module.id) : false}
                onHover={setHoveredModule}
                onClick={handleModuleClick}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hero__content">
        <div className="hero__inner">
          <h1 className="hero__title">
            {displayTitle}
            {!mobile && <span className="hero__cursor">|</span>}
          </h1>

          {!activeModule && (
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hero__description"
            >
              {defaultDescription}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="hero__actions"
          >
            <div className="hero__email-wrapper">
              <input
                type="email"
                placeholder={t('hero.emailPlaceholder')}
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="hero__email-input"
              />
            </div>

            <button onClick={() => setIsModalOpen(true)} className="hero__button hero__button--primary">
              {currentCta}
              <ArrowRight />
            </button>
          </motion.div>
        </div>
      </div>

      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialEmail={emailInput} />
    </section>
  );
};
