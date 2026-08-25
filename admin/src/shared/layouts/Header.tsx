import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveApiAssetUrl } from '@/api/client';
import './Header.scss';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

const initials = (name?: string) => {
  if (!name) return 'A';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

export const Header = ({ title, onMenuClick }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const photo = user?.photo ? resolveApiAssetUrl(user.photo) : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button type="button" className="admin-header__menu" onClick={onMenuClick} aria-label="Открыть меню">
          <Menu size={22} />
        </button>
        <h1 className="admin-header__title">{title}</h1>
      </div>

      <div className="admin-header__user">
        {photo ? (
          <img src={photo} alt={user?.name || ''} className="admin-header__avatar" />
        ) : (
          <span className="admin-header__avatar admin-header__avatar--fallback">{initials(user?.name)}</span>
        )}
        <div className="admin-header__meta">
          <span className="admin-header__name">{user?.name || 'Администратор'}</span>
          <span className="admin-header__login">{user?.login}</span>
        </div>
        <button type="button" className="admin-header__logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Выход</span>
        </button>
      </div>
    </header>
  );
};
