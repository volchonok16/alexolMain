import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { News } from '@/api/news';
import { useNews } from './hooks/useNews';
import { ArticleModal } from './components/ArticleModal';
import './DashboardPage.scss';

export const DashboardPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<News | null>(null);
  const { articles, isLoading, error, deleteNews, createNews, updateNews } = useNews();

  if (isLoading) return <div className="dashboard"><div className="dashboard__content"><div className="dashboard__container">Загрузка...</div></div></div>;
  if (error) return <div className="dashboard"><div className="dashboard__content"><div className="dashboard__container">Ошибка загрузки</div></div></div>;

  const handleDelete = (id: number) => {
    if (confirm('Удалить статью?')) {
      deleteNews(id);
    }
  };

  const handleEdit = (article: News) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleSave = (article: { title: string; text: string; photo: string | File }) => {
    if (editingArticle) {
      updateNews({ id: editingArticle.id, data: article });
    } else {
      createNews(article);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="dashboard">
      <div className="dashboard__content">
        <header className="dashboard__header">
          <h1 className="dashboard__title">Управление новостями</h1>
        </header>

        <div className="dashboard__container">
          <div className="dashboard__actions">
            <button onClick={handleAdd} className="dashboard__add">
              <Plus />
              Добавить статью
            </button>
          </div>

          <div className="dashboard__table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заголовок</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {articles?.map(article => (
                  <tr key={article.id}>
                    <td>{article.id}</td>
                    <td>{article.title}</td>
                    <td>{article.createdAt ? new Date(article.createdAt).toLocaleDateString('ru-RU') : '-'}</td>
                    <td>
                      <div className="dashboard__row-actions">
                        <button onClick={() => handleEdit(article)} className="dashboard__edit">
                          <Edit2 />
                        </button>
                        <button onClick={() => handleDelete(article.id)} className="dashboard__delete">
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <ArticleModal
            article={editingArticle}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};

