import { NavLink } from 'react-router-dom';
import { Newspaper, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Sidebar.scss';

export const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__logo-highlight">ADMIN</span>
        <span>PANEL</span>
      </div>

      <nav className="sidebar__nav">
        <NavLink to="/" className="sidebar__link">
          <Newspaper />
          <span>Новости</span>
        </NavLink>
      </nav>

      <button onClick={handleLogout} className="sidebar__logout">
        <LogOut />
        <span>Выйти</span>
      </button>
    </aside>
  );
};