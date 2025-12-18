import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar } from 'lucide-react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useNews } from '../HomePage/hooks/useNews';
import { NewsModal } from './components/NewsModal';
import './NewsPage.scss';

export const NewsPage = () => {
  const navigate = useNavigate();
  const { news, isLoading, error } = useNews();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="news-page">
        <div className="news-page__container">
          <h2>Загрузка...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="news-page">
        <div className="news-page__container">
          <div className="news-page__header">
            <button onClick={() => navigate(-1)} className="news-page__back">
              <ArrowLeft size={20} />
              Назад
            </button>
            <h1 className="news-page__title">Все статьи</h1>
          </div>
          <ErrorState
            title="Не удалось загрузить новости"
            description="Попробуйте обновить страницу или вернитесь позже"
          />
        </div>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="news-page">
        <div className="news-page__container">
          <div className="news-page__header">
            <button onClick={() => navigate(-1)} className="news-page__back">
              <ArrowLeft size={20} />
              Назад
            </button>
            <h1 className="news-page__title">Все статьи</h1>
          </div>
          <p>Новостей пока нет</p>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page">
      <div className="news-page__container">
        <div className="news-page__header">
          <button onClick={() => navigate(-1)} className="news-page__back">
            <ArrowLeft size={20} />
            Назад
          </button>
          <h1 className="news-page__title">Все статьи</h1>
        </div>

        <div className="news-page__grid">
          {news.map((article, index) => (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="article-card"
              onClick={() => setSelectedArticleId(article.id)}
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
          ))}
        </div>
      </div>

      <NewsModal articleId={selectedArticleId} onClose={() => setSelectedArticleId(null)} />
    </div>
  );
};
