import { ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';
import { usePortfolio } from '../hooks/usePortfolio';
import type { PortfolioItem } from '@/api/portfolio';

const CATEGORY_ORDER = ['Crypto', 'eCommerce', 'Enterprise', 'Automation'];

const localized = (
  item: PortfolioItem,
  language: 'ru' | 'en',
  field: 'title' | 'description' | 'result'
) => {
  const values = {
    title: { ru: item.titleRu, en: item.titleEn },
    description: { ru: item.descriptionRu, en: item.descriptionEn },
    result: { ru: item.resultRu, en: item.resultEn },
  }[field];
  return language === 'en' ? values.en || values.ru : values.ru || values.en;
};

export const Portfolio = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { projects, isLoading, error } = usePortfolio();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(() => {
    const present = new Set(projects.map(project => project.category));
    const ordered = CATEGORY_ORDER.filter(category => present.has(category));
    const extra = [...present].filter(category => !CATEGORY_ORDER.includes(category)).sort();
    return ['All', ...ordered, ...extra];
  }, [projects]);

  const filteredProjects =
    activeCategory === 'All' ? projects : projects.filter(project => project.category === activeCategory);
  const displayedProjects = showAll ? filteredProjects : filteredProjects.slice(0, 6);

  if (isLoading) {
    return (
      <section className="portfolio">
        <div className="portfolio__container">
          <div className="portfolio__header">
            <h2 className="portfolio__title">{t('portfolio.loading')}</h2>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="portfolio">
        <div className="portfolio__container">
          <ErrorState title={t('portfolio.error')} description={t('portfolio.errorDescription')} />
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="portfolio">
        <div className="portfolio__container">
          <Reveal className="portfolio__header">
            <h2 className="portfolio__title">{t('portfolio.title')}</h2>
            <p className="portfolio__description">{t('portfolio.empty')}</p>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="portfolio">
      <div className="portfolio__container">
        <Reveal className="portfolio__header">
          <h2 className="portfolio__title">{t('portfolio.title')}</h2>
          <p className="portfolio__description">{t('portfolio.description')}</p>
        </Reveal>

        <div className="portfolio__filters">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => {
                setActiveCategory(category);
                setShowAll(false);
              }}
              className={`portfolio__filter ${activeCategory === category ? 'portfolio__filter--active' : ''}`}
            >
              {category === 'All' ? t('portfolio.filters.all') : category}
            </button>
          ))}
        </div>

        <div className="portfolio__grid">
          {displayedProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} language={language} />
          ))}
        </div>

        {filteredProjects.length > 6 && (
          <Reveal className="portfolio__cta">
            <button onClick={() => setShowAll(!showAll)} className="portfolio__button">
              {showAll ? t('portfolio.showLess') : t('portfolio.showMore')}
            </button>
          </Reveal>
        )}
      </div>
    </section>
  );
};

const ProjectCard = ({
  project,
  index,
  language,
}: {
  project: PortfolioItem;
  index: number;
  language: 'ru' | 'en';
}) => {
  const title = localized(project, language, 'title');
  const handleClick = () => {
    if (project.link) window.open(project.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Reveal delay={index * 0.1} className="project-card">
      <div onClick={handleClick} style={{ cursor: project.link ? 'pointer' : 'default', height: '100%' }}>
        <div className="project-card__image">
          <ImageWithFallback src={project.imageUrl} alt={title} className="project-card__img" />
          <div className="project-card__overlay" />
          <div className="project-card__icon">
            <ArrowUpRight />
          </div>
        </div>
        <div className="project-card__content">
          <div className="project-card__category">{project.category}</div>
          <h3 className="project-card__title">{title}</h3>
          <p className="project-card__description">{localized(project, language, 'description')}</p>
          <div className="project-card__result">
            <p>{localized(project, language, 'result')}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
};
