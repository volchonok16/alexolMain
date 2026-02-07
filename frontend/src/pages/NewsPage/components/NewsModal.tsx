import { Calendar } from 'lucide-react';
import { Modal } from '@/shared/ui';
import { ImageWithFallback } from '@/shared/ui';
import { useNewsById } from '@/pages/HomePage/hooks/useNewsById';
import './NewsModal.scss';

interface NewsModalProps {
  articleId: string | null;
  onClose: () => void;
}

export const NewsModal = ({ articleId, onClose }: NewsModalProps) => {
  const { article, isLoading } = useNewsById(articleId);

  if (!articleId) return null;

  return (
    <Modal isOpen={!!articleId} onClose={onClose} title="">
      <div className="news-modal">
        {isLoading ? (
          <p>Загрузка...</p>
        ) : article ? (
          <>
            <ImageWithFallback src={article.image} alt={article.title} className="news-modal__image" />

            <div className="news-modal__category">{article.category}</div>

            <h2 className="news-modal__title">{article.title}</h2>

            <div className="news-modal__date">
              <Calendar size={16} />
              <span>{article.date}</span>
            </div>

            <div className="news-modal__content">
              <p>{article.excerpt}</p>
            </div>
          </>
        ) : (
          <p>Статья не найдена</p>
        )}
      </div>
    </Modal>
  );
};
