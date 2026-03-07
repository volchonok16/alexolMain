import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useNews } from '../hooks/useNews';
import { useTranslation } from '@/shared/utils/translations';
import { Reveal } from '@/shared/ui/Reveal';
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
        <Reveal className="news__header">
          <h2 className="news__title">{t('news.title')}</h2>
          <p className="news__description">{t('news.description')}</p>
        </Reveal>

        <div className="news__grid">
          {news.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} />
          ))}
        </div>

        <Reveal className="news__cta">
          <Link to="/news" className="news__button">
            <span>{t('news.allArticles')}</span>
            <ArrowRight />
          </Link>
        </Reveal>
      </div>
    </section>
  );
};

const ArticleCard = ({ article, index }: { article: NewsArticle; index: number }) => (
  <Reveal delay={index * 0.1} className="article-card">
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
  </Reveal>
);
