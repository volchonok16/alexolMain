import { useState } from 'react';
import { User } from '@/api/users';
import { resolveApiAssetUrl } from '@/api/client';
import { PasswordInput } from '@/shared/ui/PasswordInput';

interface UserModalProps {
  user: User | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    login: string;
    password?: string;
    name: string;
    role: 'admin' | 'user';
    email?: string;
    phone?: string;
    jobTitle?: string;
    telegram?: string;
    birthDate?: string;
    photo?: File;
  }) => void;
  /** Render as page card instead of overlay dialog */
  embedded?: boolean;
  title?: string;
  /** Hide role field (e.g. own settings) */
  lockRole?: boolean;
  cancelLabel?: string;
}

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

export const UserModal = ({
  user,
  isSaving,
  onClose,
  onSave,
  embedded = false,
  title,
  lockRole = false,
  cancelLabel = 'Отмена',
}: UserModalProps) => {
  const [name, setName] = useState(user?.name || '');
  const [login, setLogin] = useState(user?.login || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(user?.role === 'admin' ? 'admin' : 'user');
  const [birthDate, setBirthDate] = useState(toDateInput(user?.birthDate));
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [telegram, setTelegram] = useState(user?.telegram || '');
  const [photo, setPhoto] = useState<File | undefined>();
  const [preview, setPreview] = useState(user?.photo ? resolveApiAssetUrl(user.photo) : '');

  const mailboxEmail = login ? `${login.toLowerCase()}@alexol.io` : '';
  const heading =
    title || (user ? 'Редактировать пользователя' : 'Добавить пользователя');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      login,
      role: lockRole ? (user?.role === 'admin' ? 'admin' : 'user') : role,
      email: mailboxEmail || undefined,
      phone,
      jobTitle,
      telegram,
      birthDate,
      photo,
      ...(password ? { password } : {}),
    });
  };

  const panel = (
    <div className={`modal ${embedded ? 'modal--embedded' : ''}`} onClick={e => e.stopPropagation()}>
      <h2 className="modal__title">{heading}</h2>

      <form onSubmit={handleSubmit} className="modal__form">
        <div className="modal__field">
          <label>ФИО</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving} />
        </div>

        <div className="modal__field">
          <label>Логин</label>
          <input type="text" value={login} onChange={e => setLogin(e.target.value)} required disabled={isSaving} />
        </div>

        <div className="modal__field">
          <label>{user ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}</label>
          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            required={!user}
            minLength={user ? undefined : 6}
            disabled={isSaving}
            autoComplete="new-password"
          />
        </div>

        {!lockRole && (
          <div className="modal__field">
            <label>Роль</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} disabled={isSaving}>
              <option value="user">Пользователь</option>
              <option value="admin">Админ</option>
            </select>
          </div>
        )}

        <div className="modal__field">
          <label>Почта (ящик)</label>
          <input type="email" value={mailboxEmail} readOnly disabled={isSaving} />
          <p className="modal__hint">
            Вход на{' '}
            <a href="https://mail.alexol.io" target="_blank" rel="noreferrer">
              mail.alexol.io
            </a>
            : логин <strong>{(login || 'login').toLowerCase()}</strong> или{' '}
            <strong>{(login || 'login').toLowerCase()}@alexol.io</strong> и тот же пароль.
            {user
              ? ' Если вход в почту не работает - задайте новый пароль и сохраните (ящик пересоздастся/обновится).'
              : ' Пароль сразу синхронизируется с почтой.'}
          </p>
        </div>

        <div className="modal__field">
          <label>Должность</label>
          <input
            type="text"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            placeholder="Например, frontend-разработчик"
            disabled={isSaving}
          />
        </div>

        <div className="modal__field">
          <label>Телефон</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+7 900 123-45-67"
            disabled={isSaving}
          />
        </div>

        <div className="modal__field">
          <label>Телеграм</label>
          <input
            type="text"
            value={telegram}
            onChange={e => setTelegram(e.target.value)}
            placeholder="@username"
            disabled={isSaving}
          />
        </div>

        <div className="modal__field">
          <label>Дата рождения</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={isSaving} />
        </div>

        <div className="modal__field">
          <label>Фотография</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="modal__file" disabled={isSaving} />
          {preview && <img src={preview} alt="Preview" className="modal__preview modal__preview--avatar" />}
          <p className="modal__hint">Фото синхронизируется с mail.alexol.io</p>
        </div>

        <div className="modal__actions">
          <button type="button" onClick={onClose} className="modal__cancel" disabled={isSaving}>
            {cancelLabel}
          </button>
          <button type="submit" className="modal__submit" disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );

  if (embedded) return panel;

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      {panel}
    </div>
  );
};
