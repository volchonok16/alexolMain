import { useState } from 'react';
import { resolveApiAssetUrl } from '@/api/client';
import { News } from '@/api/news';

interface ArticleModalProps {
  article: News | null;
  onClose: () => void;
  onSave: (article: { title: string; text: string; photo: string | File }) => void;
}

// Helper to remove hashtags and HTML tags from text (for cleaner editing)
const cleanText = (text: string): string => {
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags like <b>, <i>, etc.
    .replace(/#[а-яёa-z0-9_]+/gi, '') // Remove hashtags
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

export const ArticleModal = ({ article, onClose, onSave }: ArticleModalProps) => {
  const [formData, setFormData] = useState<{ title: string; text: string; photo: string | File }>({
    title: article?.title || '',
    text: article ? cleanText(article.text) : '',
    photo: article?.photo || '',
  });
  const [imagePreview, setImagePreview] = useState<string>(
    article?.photo ? resolveApiAssetUrl(article.photo) : ''
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">{article ? 'Редактировать' : 'Добавить'} статью</h2>
        
        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__field">
            <label>Заголовок</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="modal__field">
            <label>Изображение</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="modal__file"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="modal__preview" />
            )}
          </div>

          <div className="modal__field">
            <label>Текст</label>
            <textarea
              value={formData.text}
              onChange={e => setFormData({ ...formData, text: e.target.value })}
              rows={8}
              required
            />
          </div>

          <div className="modal__actions">
            <button type="button" onClick={onClose} className="modal__cancel">
              Отмена
            </button>
            <button type="submit" className="modal__submit">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};