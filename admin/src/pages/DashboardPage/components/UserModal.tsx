import { useState } from 'react';
import { User } from '@/api/users';
import { resolveApiAssetUrl } from '@/api/client';

interface UserModalProps {
  user: User | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: {
    login: string;
    password?: string;
    name: string;
    role: 'admin' | 'user';
    birthDate: string;
    photo?: File;
  }) => void;
}

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return value.slice(0, 10);
};

export const UserModal = ({ user, isSaving, onClose, onSave }: UserModalProps) => {
  const [name, setName] = useState(user?.name || '');
  const [login, setLogin] = useState(user?.login || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(user?.role === 'admin' ? 'admin' : 'user');
  const [birthDate, setBirthDate] = useState(toDateInput(user?.birthDate));
  const [photo, setPhoto] = useState<File | undefined>();
  const [preview, setPreview] = useState(user?.photo ? resolveApiAssetUrl(user.photo) : '');

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
      role,
      birthDate,
      photo,
      ...(password ? { password } : {}),
    });
  };

  return (
    <div className="modal-overlay" onClick={isSaving ? undefined : onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal__title">{user ? 'Редактировать' : 'Добавить'} пользователя</h2>

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
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!user}
              minLength={user ? undefined : 6}
              disabled={isSaving}
            />
          </div>

          <div className="modal__field">
            <label>Роль</label>
            <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} disabled={isSaving}>
              <option value="user">Пользователь</option>
              <option value="admin">Админ</option>
            </select>
          </div>

          <div className="modal__field">
            <label>Дата рождения</label>
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} required disabled={isSaving} />
          </div>

          <div className="modal__field">
            <label>Фотография</label>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="modal__file" disabled={isSaving} />
            {preview && <img src={preview} alt="Preview" className="modal__preview modal__preview--avatar" />}
          </div>

          <div className="modal__actions">
            <button type="button" onClick={onClose} className="modal__cancel" disabled={isSaving}>
              Отмена
            </button>
            <button type="submit" className="modal__submit" disabled={isSaving}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
