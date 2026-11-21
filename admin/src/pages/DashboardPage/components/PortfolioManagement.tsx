import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PortfolioItem } from '@/api/portfolio';
import { usePortfolio } from '../hooks/usePortfolio';
import { PortfolioModal } from './PortfolioModal';

export const PortfolioManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { items, isLoading, error, isSaving, createItem, updateItem, deleteItem } = usePortfolio();

  const handleDelete = (id: string) => {
    if (confirm('Удалить работу из портфолио?')) {
      deleteItem(id);
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (payload: {
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
  }) => {
    setSaveError(null);
    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, data: payload });
      } else {
        await createItem(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      const apiError =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response: { data: { error: string } } }).response.data.error
          : err instanceof Error
            ? err.message
            : 'Не удалось сохранить работу';
      setSaveError(apiError);
    }
  };

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error) return <div className="dashboard__container">Ошибка загрузки портфолио</div>;

  return (
    <div className="dashboard__container">
      <div className="dashboard__actions">
        <button onClick={handleAdd} className="dashboard__add">
          <Plus />
          Добавить работу
        </button>
      </div>

      {saveError && <div className="dashboard__error">{saveError}</div>}

      {items.length === 0 ? (
        <div className="dashboard__empty">Работ в портфолио пока нет</div>
      ) : (
        <div className="dashboard__table">
          <table>
            <thead>
              <tr>
                <th>Превью</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Порядок</th>
                <th>Ссылка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td data-label="Превью">
                    <img src={item.imageUrl} alt={item.titleRu} className="dashboard__thumb" />
                  </td>
                  <td data-label="Название">
                    <div>{item.titleRu}</div>
                    <div className="dashboard__description">{item.titleEn}</div>
                  </td>
                  <td data-label="Категория">
                    <span className="dashboard__badge">{item.category}</span>
                  </td>
                  <td data-label="Порядок">{item.sortOrder}</td>
                  <td data-label="Ссылка">
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        Открыть
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td data-label="Действия">
                    <div className="dashboard__row-actions">
                      <button onClick={() => handleEdit(item)} className="dashboard__edit">
                        <Edit2 />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="dashboard__delete">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <PortfolioModal
          item={editingItem}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) setIsModalOpen(false);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
