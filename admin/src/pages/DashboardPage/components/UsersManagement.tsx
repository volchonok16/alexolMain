import { useState } from 'react';
import { Plus } from 'lucide-react';
import { User, UserPayload } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/shared/ui/Avatar';
import { useUsers } from '../hooks/useUsers';
import { Pagination } from './Pagination';
import { UserModal } from './UserModal';
import { UserDetailModal } from './UserDetailModal';
import { normalizeOrgRoles, orgRoleLabels } from '@/utils/orgRoles';
import './UsersManagement.scss';

const rightsLabel = (role: string) => (role === 'admin' ? 'Админ' : 'Пользователь');

const toPayload = (user: User, extra?: Partial<UserPayload>): UserPayload => ({
  login: user.login,
  name: user.name,
  role: user.role,
  email: user.email || undefined,
  phone: user.phone || undefined,
  jobTitle: user.jobTitle || undefined,
  telegram: user.telegram || undefined,
  birthDate: user.birthDate || undefined,
  orgRoles: normalizeOrgRoles(user.orgRoles),
  direction: user.direction || undefined,
  isTechnical: Boolean(user.isTechnical),
  ...extra,
});

const apiErrorMessage = (err: unknown, fallback: string) => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
  ) {
    return (err as { response: { data: { error: string } } }).response.data.error;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export const UsersManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
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
    setViewingUser(null);
    setEditingUser(null);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setViewingUser(null);
    setEditingUser(user);
    setSaveError(null);
    setPhotoError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пользователя и в админке, и в почте?')) return;
    setSaveError(null);
    try {
      await deleteUser(id);
      setViewingUser(null);
    } catch (err) {
      setSaveError(apiErrorMessage(err, 'Не удалось удалить пользователя'));
    }
  };

  const handleSave = async (payload: UserPayload) => {
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
      setSaveError(apiErrorMessage(err, 'Не удалось сохранить пользователя'));
    }
  };

  const handlePhoto = async (user: User, file: File) => {
    setPhotoError(null);
    setSaveError(null);
    try {
      const updated = await updateUser({ id: user.id, data: toPayload(user, { photo: file }) });
      if (viewingUser?.id === updated.id) {
        setViewingUser(updated);
      }
      if (updated.id === currentUser?.id) {
        await refreshUser();
      }
    } catch (err) {
      setPhotoError(apiErrorMessage(err, 'Не удалось сохранить фото. Нужен JPG, PNG или WebP.'));
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
      {photoError && <div className="dashboard__error">{photoError}</div>}

      <div className="users-management__stats">
        <p>Всего: {pagination?.total || 0}</p>
        <p>На странице: {users.length}</p>
        <p>Нажмите на строку, чтобы открыть карточку. Фото можно поставить сразу в колонке «Фото».</p>
      </div>

      {users.length === 0 ? (
        <div className="dashboard__empty">Пользователей пока нет</div>
      ) : (
        <div className="dashboard__table dashboard__table--compact">
          <table>
            <thead>
              <tr>
                <th>Фото</th>
                <th>ФИО</th>
                <th>Логин</th>
                <th>Почта</th>
                <th>Телефон</th>
                <th>Телеграм</th>
                <th>Роли</th>
                <th>Направление</th>
                <th>Права</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const roleLabels = orgRoleLabels(user.orgRoles);
                return (
                <tr
                  key={user.id}
                  className="users-management__row"
                  onClick={() => setViewingUser(user)}
                >
                  <td
                    data-label="Фото"
                    className="users-management__photo-cell"
                    onClick={event => event.stopPropagation()}
                  >
                    <label className="users-management__photo-picker users-management__photo-picker--table">
                      <Avatar
                        src={user.photo}
                        alt={user.name}
                        className="users-management__photo"
                        emptyClassName="users-management__photo users-management__photo--empty"
                        fallback={user.name.slice(0, 1).toUpperCase()}
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={event => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) void handlePhoto(user, file);
                        }}
                        disabled={isSaving}
                      />
                    </label>
                  </td>
                  <td data-label="ФИО">
                    <div className="users-management__name">{user.name}</div>
                    {user.jobTitle ? (
                      <div className="users-management__sub">{user.jobTitle}</div>
                    ) : null}
                  </td>
                  <td data-label="Логин">{user.login}</td>
                  <td data-label="Почта">{user.email || '—'}</td>
                  <td data-label="Телефон">{user.phone || '—'}</td>
                  <td data-label="Телеграм">{user.telegram || '—'}</td>
                  <td data-label="Роли">
                    <div className="users-management__pills">
                      {roleLabels.map(label => (
                        <span key={label} className="users-management__chip">
                          {label}
                        </span>
                      ))}
                      {!roleLabels.length && !user.isTechnical ? '—' : null}
                      {user.isTechnical ? <span className="users-management__tech">Техн.</span> : null}
                    </div>
                  </td>
                  <td data-label="Направление">{user.direction || '—'}</td>
                  <td data-label="Права">
                    <span className={`users-management__role users-management__role--${user.role}`}>
                      {rightsLabel(user.role)}
                    </span>
                  </td>
                </tr>
                );
              })}
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

      {viewingUser && (
        <UserDetailModal
          user={viewingUser}
          canDelete={viewingUser.id !== currentUser?.id}
          photoBusy={isSaving}
          photoError={photoError}
          onClose={() => {
            setViewingUser(null);
            setPhotoError(null);
          }}
          onEdit={() => handleEdit(viewingUser)}
          onDelete={() => handleDelete(viewingUser.id)}
          onPhoto={file => handlePhoto(viewingUser, file)}
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
