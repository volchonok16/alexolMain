import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { ImageWithFallback } from '@/shared/ui';
import { useState } from 'react';
import { useTranslation } from '@/shared/utils/translations';
import project1 from './assets/project1.png';
import project2 from './assets/project2.png';
import project3 from './assets/project3.png';
import project4 from './assets/project4.png';
import project5 from './assets/project5.png';
import project6 from './assets/project6.png';
import project7 from './assets/voenasledie.png';
import project8 from './assets/onewish.png';
import project9 from './assets/gameClub.png';
import project10 from './assets/autoParse.png';

interface Project {
  id: number;
  category: string;
  title: string;
  titleKey?: string;
  descriptionKey: string;
  resultKey: string;
  image: string;
  link?: string;
}

export const Portfolio = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const categories = ['All', 'Crypto', 'eCommerce', 'Enterprise', 'Automation'];

  const projects: Project[] = [
    {
      id: 1,
      category: 'Crypto',
      title: 'Portal to Bitcoin',
      descriptionKey: 'portfolio.projects.portalToBitcoin.description',
      resultKey: 'portfolio.projects.portalToBitcoin.result',
      image: project1,
      link: 'https://quests.portaltobitcoin.com/',
    },
    {
      id: 2,
      category: 'Crypto',
      title: 'Elys Network',
      descriptionKey: 'portfolio.projects.elysNetwork.description',
      resultKey: 'portfolio.projects.elysNetwork.result',
      image: project2,
      link: 'https://elys.bonusblock.io/',
    },
    {
      id: 3,
      category: 'Crypto',
      title: 'Xion',
      descriptionKey: 'portfolio.projects.xion.description',
      resultKey: 'portfolio.projects.xion.result',
      image: project3,
      link: 'https://xion.bonusblock.io/',
    },
    {
      id: 4,
      category: 'Crypto',
      title: 'BonusBlock',
      descriptionKey: 'portfolio.projects.bonusBlock.description',
      resultKey: 'portfolio.projects.bonusBlock.result',
      image: project4,
      link: 'https://app.bonusblock.io/',
    },
    {
      id: 5,
      category: 'Crypto',
      title: 'KiteAi',
      descriptionKey: 'portfolio.projects.kiteAi.description',
      resultKey: 'portfolio.projects.kiteAi.result',
      image: project5,
      link: 'https://testnet.gokite.ai/',
    },
    {
      id: 6,
      category: 'Crypto',
      title: 'Agoric',
      descriptionKey: 'portfolio.projects.agoric.description',
      resultKey: 'portfolio.projects.agoric.result',
      image: project6,
      link: 'https://agoric.bonusblock.io/',
    },
    {
      id: 7,
      category: 'eCommerce',
      title: 'Workwear Store',
      titleKey: 'portfolio.projects.workwear.title',
      descriptionKey: 'portfolio.projects.workwear.description',
      resultKey: 'portfolio.projects.workwear.result',
      image: project7,
    },
    {
      id: 8,
      category: 'eCommerce',
      title: 'OneWish',
      titleKey: 'portfolio.projects.oneWish.title',
      descriptionKey: 'portfolio.projects.oneWish.description',
      resultKey: 'portfolio.projects.oneWish.result',
      image: project8,
    },
    {
      id: 9,
      category: 'Enterprise',
      title: 'Computer Club',
      titleKey: 'portfolio.projects.computerClub.title',
      descriptionKey: 'portfolio.projects.computerClub.description',
      resultKey: 'portfolio.projects.computerClub.result',
      image: project9,
    },
    {
      id: 10,
      category: 'Automation',
      title: 'Telegram Bot',
      titleKey: 'portfolio.projects.telegramBot.title',
      descriptionKey: 'portfolio.projects.telegramBot.description',
      resultKey: 'portfolio.projects.telegramBot.result',
      image: project10,
    },
  ];

  const filteredProjects = activeCategory === 'All' ? projects : projects.filter(p => p.category === activeCategory);

  const displayedProjects = showAll ? filteredProjects : filteredProjects.slice(0, 6);

  return (
    <section className="portfolio">
      <div className="portfolio__container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="portfolio__header"
        >
          <h2 className="portfolio__title">{t('portfolio.title')}</h2>
          <p className="portfolio__description">{t('portfolio.description')}</p>
        </motion.div>

        <div className="portfolio__filters">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="portfolio__cta"
          >
            <button onClick={() => setShowAll(!showAll)} className="portfolio__button">
              {showAll ? t('portfolio.showLess') : t('portfolio.showMore')}
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const { t } = useTranslation();
  const handleClick = () => {
    if (project.link) {
      window.open(project.link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="project-card"
      onClick={handleClick}
      style={{ cursor: project.link ? 'pointer' : 'default' }}
    >
      <div className="project-card__image">
        <ImageWithFallback src={project.image} alt={project.title} className="project-card__img" />
        <div className="project-card__overlay" />
        <div className="project-card__icon">
          <ArrowUpRight />
        </div>
      </div>

      <div className="project-card__content">
        <div className="project-card__category">{project.category}</div>
        <h3 className="project-card__title">{project.titleKey ? t(project.titleKey) : project.title}</h3>
        <p className="project-card__description">{t(project.descriptionKey)}</p>
        <div className="project-card__result">
          <p>{t(project.resultKey)}</p>
        </div>
      </div>
    </motion.div>
  );
};
