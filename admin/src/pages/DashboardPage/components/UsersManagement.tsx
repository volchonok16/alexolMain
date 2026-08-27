import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { User } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';
import { useUsers } from '../hooks/useUsers';
import { Pagination } from './Pagination';
import { UserModal } from './UserModal';
import './UsersManagement.scss';

const roleLabel = (role: string) => (role === 'admin' ? 'Админ' : 'Пользователь');

export const UsersManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    users,
    pagination,
    isLoading,
    error,
    page,
    setPage,
    isSaving,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers();
  const { user: currentUser, refreshUser } = useAuth();

  const handleAdd = () => {
    setEditingUser(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя и в админке, и в почте?')) return;
    setSaveError(null);
    try {
      await deleteUser(id);
    } catch (err) {
      const apiError =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response: { data: { error: string } } }).response.data.error
          : 'Не удалось удалить пользователя';
      setSaveError(apiError);
    }
  };

  const handleSave = async (payload: {
    login: string;
    password?: string;
    name: string;
    role: 'admin' | 'user';
    email?: string;
    phone?: string;
    birthDate?: string;
    photo?: File;
  }) => {
    setSaveError(null);
    try {
      if (editingUser) {
        await updateUser({ id: editingUser.id, data: payload });
        if (editingUser.id === currentUser?.id) {
          await refreshUser();
        }
      } else {
        await createUser(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      const apiError =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (err as { response: { data: { error: string } } }).response.data.error
          : 'Не удалось сохранить пользователя';
      setSaveError(apiError);
    }
  };

  if (isLoading) return <div className="dashboard__container">Загрузка...</div>;
  if (error) return <div className="dashboard__container">Ошибка загрузки пользователей</div>;

  return (
    <div className="dashboard__container">
      <div className="dashboard__actions">
        <button onClick={handleAdd} className="dashboard__add">
          <Plus />
          Добавить пользователя
        </button>
      </div>

      {saveError && <div className="dashboard__error">{saveError}</div>}

      <div className="users-management__stats">
        <p>Всего: {pagination?.total || 0}</p>
        <p>На странице: {users.length}</p>
      </div>

      {users.length === 0 ? (
        <div className="dashboard__empty">Пользователей пока нет</div>
      ) : (
        <div className="dashboard__table">
          <table>
            <thead>
              <tr>
                <th>Фото</th>
                <th>ФИО</th>
                <th>Логин</th>
                <th>Почта</th>
                <th>Роль</th>
                <th>Дата рождения</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <Avatar
                      src={user.photo}
                      alt={user.name}
                      className="users-management__photo"
                      emptyClassName="users-management__photo users-management__photo--empty"
                      fallback={user.name.slice(0, 1).toUpperCase()}
                    />
                  </td>
                  <td>{user.name}</td>
                  <td>{user.login}</td>
                  <td>{user.email || '—'}</td>
                  <td>
                    <span className={`users-management__role users-management__role--${user.role}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td>
                    {user.birthDate
                      ? new Date(user.birthDate).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  <td>
                    <div className="dashboard__row-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(user)}
                        className="dashboard__edit"
                        title="Редактировать"
                      >
                        <Edit2 />
                        <span>Изменить</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="dashboard__delete"
                        title="Удалить в админке и в почте"
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {isModalOpen && (
        <UserModal
          user={editingUser}
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
