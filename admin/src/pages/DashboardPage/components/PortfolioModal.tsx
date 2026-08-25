import { useEffect, useState } from 'react';
import { PORTFOLIO_CATEGORIES, PortfolioItem } from '@/api/portfolio';

interface PortfolioModalProps {
  item: PortfolioItem | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    category: string;
    titleRu: string;
    titleEn: string;
    descriptionRu: string;
    descriptionEn: string;
    resultRu: string;
    resultEn: string;
    link?: string;
    sortOrder?: number;
    image?: File;
  }) => void;
}

export const PortfolioModal = ({ item, isSaving, onClose, onSave }: PortfolioModalProps) => {
  const [category, setCategory] = useState(item?.category || 'Crypto');
  const [titleRu, setTitleRu] = useState(item?.titleRu || '');
  const [titleEn, setTitleEn] = useState(item?.titleEn || '');
  const [descriptionRu, setDescriptionRu] = useState(item?.descriptionRu || '');
  const [descriptionEn, setDescriptionEn] = useState(item?.descriptionEn || '');
  const [resultRu, setResultRu] = useState(item?.resultRu || '');
  const [resultEn, setResultEn] = useState(item?.resultEn || '');
  const [link, setLink] = useState(item?.link || '');
  const [sortOrder, setSortOrder] = useState(item?.sortOrder?.toString() ?? '');
  const [image, setImage] = useState<File | undefined>();
  const [imagePreview, setImagePreview] = useState(item?.imageUrl || '');

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item && !image) return;
    onSave({
      category,
      titleRu,
      titleEn,
      descriptionRu,
      descriptionEn,
      resultRu,
      resultEn,
      link: link.trim() || undefined,
      sortOrder: sortOrder === '' ? undefined : Number(sortOrder),
      image,
    });
  };

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">{item ? 'Редактировать' : 'Добавить'} работу</h2>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__row">
            <div className="modal__field">
              <label>Категория</label>
              <input
                list="portfolio-categories"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Crypto"
                required
                disabled={isSaving}
              />
              <datalist id="portfolio-categories">
                {PORTFOLIO_CATEGORIES.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div className="modal__field">
              <label>Порядок</label>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                placeholder="Автоматически"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal__row">
            <div className="modal__field">
              <label>Название (RU)</label>
              <input
                type="text"
                value={titleRu}
                onChange={e => setTitleRu(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
            <div className="modal__field">
              <label>Название (EN)</label>
              <input
                type="text"
                value={titleEn}
                onChange={e => setTitleEn(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal__row">
            <div className="modal__field">
              <label>Описание (RU)</label>
              <textarea
                value={descriptionRu}
                onChange={e => setDescriptionRu(e.target.value)}
                rows={3}
                required
                disabled={isSaving}
              />
            </div>
            <div className="modal__field">
              <label>Описание (EN)</label>
              <textarea
                value={descriptionEn}
                onChange={e => setDescriptionEn(e.target.value)}
                rows={3}
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal__row">
            <div className="modal__field">
              <label>Результат / фичи (RU)</label>
              <input
                type="text"
                value={resultRu}
                onChange={e => setResultRu(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
            <div className="modal__field">
              <label>Результат / фичи (EN)</label>
              <input
                type="text"
                value={resultEn}
                onChange={e => setResultEn(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="modal__field">
            <label>Ссылка на проект</label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://example.com"
              disabled={isSaving}
            />
          </div>

          <div className="modal__field">
            <label>{item ? 'Изображение (оставьте пустым, чтобы не менять)' : 'Изображение'}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="modal__file"
              required={!item}
              disabled={isSaving}
            />
            {imagePreview && <img src={imagePreview} alt="Preview" className="modal__preview" />}
          </div>

          <div className="modal__actions">
            <button type="button" onClick={onClose} className="modal__cancel" disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" className="modal__submit" disabled={isSaving || (!item && !image)}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
