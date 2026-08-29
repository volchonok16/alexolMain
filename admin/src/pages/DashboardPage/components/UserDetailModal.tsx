import { User } from '@/api/users';
import { Avatar } from '@/shared/ui/Avatar';

const roleLabel = (role: string) => (role === 'admin' ? 'Админ' : 'Пользователь');

const formatBirthDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('ru-RU');
};

type UserDetailModalProps = {
  user: User;
  canDelete: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export const UserDetailModal = ({
  user,
  canDelete,
  onClose,
  onEdit,
  onDelete,
}: UserDetailModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal users-management__detail" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">Карточка пользователя</h2>

        <div className="users-management__detail-head">
          <Avatar
            src={user.photo}
            alt={user.name}
            className="users-management__detail-photo"
            emptyClassName="users-management__detail-photo users-management__photo--empty"
            fallback={user.name.slice(0, 1).toUpperCase()}
          />
          <div>
            <p className="users-management__detail-name">{user.name}</p>
            <span className={`users-management__role users-management__role--${user.role}`}>
              {roleLabel(user.role)}
            </span>
          </div>
        </div>

        <dl className="users-management__detail-fields">
          <div>
            <dt>Должность</dt>
            <dd>{user.jobTitle || '—'}</dd>
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
