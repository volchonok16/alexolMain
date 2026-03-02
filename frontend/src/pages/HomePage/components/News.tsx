import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useNews } from '../hooks/useNews';
import { useTranslation } from '@/shared/utils/translations';
import { motionConfig } from '@/shared/hooks/useMotionConfig';
import type { NewsArticle } from '@/api/news';

export const News = () => {
  const { t } = useTranslation();
  const { news, isLoading, error } = useNews(1);

  if (isLoading) {
    return (
      <section className="news">
        <div className="news__container">
          <div className="news__header">
            <h2 className="news__title">{t('news.loading')}</h2>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="news">
        <div className="news__container">
          <ErrorState title={t('news.error')} description={t('news.errorDescription')} />
        </div>
      </section>
    );
  }

  if (!news || news.length === 0) {
    return (
      <section className="news">
        <div className="news__container">
          <div className="news__header">
            <h2 className="news__title">{t('news.title')}</h2>
            <p className="news__description">{t('news.empty')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="news">
      <div className="news__container">
        <motion.div
          initial={motionConfig.initial}
          whileInView={motionConfig.animate}
          viewport={motionConfig.viewport}
          transition={motionConfig.transition}
          className="news__header"
        >
          <h2 className="news__title">{t('news.title')}</h2>
          <p className="news__description">{t('news.description')}</p>
        </motion.div>

        <div className="news__grid">
          {news.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} />
          ))}
        </div>

        <motion.div
          initial={motionConfig.initial}
          whileInView={motionConfig.animate}
          viewport={motionConfig.viewport}
          transition={motionConfig.transition}
          className="news__cta"
        >
          <Link to="/news" className="news__button">
            <span>{t('news.allArticles')}</span>
            <ArrowRight />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

const ArticleCard = ({ article, index }: { article: NewsArticle; index: number }) => {
  return (
    <motion.article
      initial={motionConfig.initial}
      whileInView={motionConfig.animate}
      viewport={motionConfig.viewport}
      transition={{ ...motionConfig.transition, delay: index * 0.1 }}
      className="article-card"
    >
      <div className="article-card__image">
        <ImageWithFallback src={article.image} alt={article.title} className="article-card__img" />
        <div className="article-card__overlay" />
        <div className="article-card__category">{article.category}</div>
      </div>

      <div className="article-card__content">
        <div className="article-card__date">
          <Calendar />
          <span>{article.date}</span>
        </div>

        <h3 className="article-card__title">{article.title}</h3>

        <p className="article-card__excerpt">{article.excerpt}</p>
      </div>
    </motion.article>
  );
};
