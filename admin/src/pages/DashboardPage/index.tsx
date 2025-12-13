import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { ArticleModal } from './components/ArticleModal';
import './DashboardPage.scss';

interface Article {
  id: number;
  title: string;
  content: string;
  image: string;
  date: string;
}

export const DashboardPage = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('articles');
    if (saved) {
      setArticles(JSON.parse(saved));
    }
  }, []);

  const saveArticles = (newArticles: Article[]) => {
    setArticles(newArticles);
    localStorage.setItem('articles', JSON.stringify(newArticles));
  };



  const handleDelete = (id: number) => {
    if (confirm('Удалить статью?')) {
      saveArticles(articles.filter(a => a.id !== id));
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleSave = (article: Article) => {
    if (editingArticle) {
      saveArticles(articles.map(a => a.id === article.id ? article : a));
    } else {
      const newArticle = { ...article, id: Math.max(0, ...articles.map(a => a.id)) + 1 };
      saveArticles([...articles, newArticle]);
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
              {articles.map(article => (
                <tr key={article.id}>
                  <td>{article.id}</td>
                  <td>{article.title}</td>
                  <td>{new Date(article.date).toLocaleDateString('ru-RU')}</td>
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

