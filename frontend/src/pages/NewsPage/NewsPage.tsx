import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback, ErrorState } from '@/shared/ui';
import { useNews } from '../HomePage/hooks/useNews';
import { NewsModal } from './components/NewsModal';
import './NewsPage.scss';

const getPaginationPages = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export const NewsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { news, totalPages, isLoading, error } = useNews(page);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const changePage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className="news-page__grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            {news.map((article, index) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
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
          </motion.div>
        </AnimatePresence>

        {totalPages > 1 && (
          <div className="news-page__pagination">
            <button
              className="pagination__btn"
              onClick={() => changePage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft size={18} />
            </button>

            {getPaginationPages(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="pagination__dots">…</span>
              ) : (
                <button
                  key={p}
                  className={`pagination__btn${p === page ? ' pagination__btn--active' : ''}`}
                  onClick={() => changePage(p as number)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className="pagination__btn"
              onClick={() => changePage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <NewsModal articleId={selectedArticleId} onClose={() => setSelectedArticleId(null)} />
    </div>
  );
};
