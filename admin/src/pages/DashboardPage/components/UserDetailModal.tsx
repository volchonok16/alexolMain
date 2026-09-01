import { User } from '@/api/users';
import { Avatar } from '@/shared/ui/Avatar';
import { orgRoleLabels } from '@/utils/orgRoles';

const rightsLabel = (role: string) => (role === 'admin' ? 'Админ' : 'Пользователь');

const formatBirthDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
};

type UserDetailModalProps = {
  user: User;
  canDelete: boolean;
  photoBusy?: boolean;
  photoError?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPhoto: (file: File) => void;
};

export const UserDetailModal = ({
  user,
  canDelete,
  photoBusy = false,
  photoError,
  onClose,
  onEdit,
  onDelete,
  onPhoto,
}: UserDetailModalProps) => {
  const roles = orgRoleLabels(user.orgRoles);

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPhoto(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal users-management__detail" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Карточка пользователя</h2>

        <div className="users-management__detail-head">
          <label className="users-management__photo-picker">
            <Avatar
              src={user.photo}
              alt={user.name}
              className="users-management__detail-photo"
              emptyClassName="users-management__detail-photo users-management__photo--empty"
              fallback={user.name.slice(0, 1).toUpperCase()}
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhoto}
              disabled={photoBusy}
            />
            <span>{photoBusy ? 'Сохранение…' : 'Поставить фото'}</span>
          </label>
          <div>
            <p className="users-management__detail-name">{user.name}</p>
            <div className="users-management__pills">
              <span className={`users-management__role users-management__role--${user.role}`}>
                {rightsLabel(user.role)}
              </span>
              {user.isTechnical ? <span className="users-management__tech">Техн.</span> : null}
            </div>
            {photoError ? <p className="users-management__photo-error">{photoError}</p> : null}
          </div>
        </div>

        <dl className="users-management__detail-fields">
          <div>
            <dt>Должность</dt>
            <dd>{user.jobTitle || '—'}</dd>
          </div>
          <div>
            <dt>Роли</dt>
            <dd>{roles.length ? roles.join(', ') : '—'}</dd>
          </div>
          <div>
            <dt>Направление</dt>
            <dd>{user.direction || '—'}</dd>
          </div>
          <div>
            <dt>Права</dt>
            <dd>{rightsLabel(user.role)}</dd>
          </div>
          <div>
            <dt>Технический аккаунт</dt>
            <dd>{user.isTechnical ? 'Да, скрыт в контактах почты' : 'Нет'}</dd>
          </div>
          <div>
            <dt>Логин</dt>
            <dd>{user.login}</dd>
          </div>
          <div>
            <dt>Почта</dt>
            <dd>{user.email || '—'}</dd>
          </div>
          <div>
            <dt>Телефон</dt>
            <dd>{user.phone || '—'}</dd>
          </div>
          <div>
            <dt>Телеграм</dt>
            <dd>{user.telegram || '—'}</dd>
          </div>
          <div>
            <dt>Дата рождения</dt>
            <dd>{formatBirthDate(user.birthDate)}</dd>
          </div>
        </dl>

        <div className="modal__actions">
          <button type="button" className="modal__cancel" onClick={onClose}>
            Закрыть
          </button>
          <button type="button" className="dashboard__delete" onClick={onDelete} disabled={!canDelete}>
            Удалить
          </button>
          <button type="button" className="modal__submit" onClick={onEdit}>
            Изменить
          </button>
        </div>
      </div>
    </div>
  );
};
