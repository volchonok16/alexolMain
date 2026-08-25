import { NavLink } from 'react-router-dom';
import { Newspaper, GraduationCap, Users } from 'lucide-react';
import './Sidebar.scss';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-highlight">ADMIN</span>
        <span>PANEL</span>
      </div>

      <nav className="sidebar__nav">
        <NavLink to="/" end className="sidebar__link" onClick={onClose}>
          <Newspaper />
          <span>Новости</span>
        </NavLink>
        <NavLink to="/courses" className="sidebar__link" onClick={onClose}>
          <GraduationCap />
          <span>Курсы</span>
        </NavLink>
        <NavLink to="/users" className="sidebar__link" onClick={onClose}>
          <Users />
          <span>Пользователи</span>
        </NavLink>
      </nav>
    </aside>
  );
};
