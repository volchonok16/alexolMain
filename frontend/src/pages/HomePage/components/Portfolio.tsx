import { ArrowUpRight } from 'lucide-react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/shared/contexts';
import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';
import { usePortfolio } from '../hooks/usePortfolio';
import type { PortfolioItem } from '@/api/portfolio';

const CATEGORY_ORDER = ['Crypto', 'eCommerce', 'Enterprise', 'Automation'];

interface Project {
  id: string;
  category: string;
  title: string;
  description: string;
  result: string;
  image: string;
  link: string | null;
}

const localizeProject = (item: PortfolioItem, language: 'ru' | 'en'): Project => {
  const isEn = language === 'en';
  return {
    id: item.id,
    category: item.category,
    title: isEn ? item.titleEn : item.titleRu,
    description: isEn ? item.descriptionEn : item.descriptionRu,
    result: isEn ? item.resultEn : item.resultRu,
    image: item.imageUrl,
    link: item.link,
  };
};

export const Portfolio = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { items, isLoading, error } = usePortfolio();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const projects = useMemo(
    () => items.map(item => localizeProject(item, language)),
    [items, language]
  );

  const categories = useMemo(() => {
    const unique = [...new Set(items.map(item => item.category))];
    const known = CATEGORY_ORDER.filter(category => unique.includes(category));
    const extra = unique.filter(category => !CATEGORY_ORDER.includes(category)).sort();
    return ['All', ...known, ...extra];
  }, [items]);

  useEffect(() => {
    if (activeCategory !== 'All' && !categories.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeCategory, categories]);

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
          <div className="portfolio__header">
            <h2 className="portfolio__title">{t('portfolio.title')}</h2>
            <p className="portfolio__description">{t('portfolio.empty')}</p>
          </div>
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
            <ProjectCard key={project.id} project={project} index={index} />
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

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const handleClick = () => {
    if (project.link) window.open(project.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Reveal delay={index * 0.1} className="project-card">
      <div onClick={handleClick} style={{ cursor: project.link ? 'pointer' : 'default', height: '100%' }}>
        <div className="project-card__image">
          <ImageWithFallback src={project.image} alt={project.title} className="project-card__img" />
          <div className="project-card__overlay" />
          <div className="project-card__icon">
            <ArrowUpRight />
          </div>
        </div>
        <div className="project-card__content">
          <div className="project-card__category">{project.category}</div>
          <h3 className="project-card__title">{project.title}</h3>
          <p className="project-card__description">{project.description}</p>
          <div className="project-card__result">
            <p>{project.result}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
};
