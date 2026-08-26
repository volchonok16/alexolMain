import { NavLink } from 'react-router-dom';
import { Newspaper, GraduationCap, Users, Briefcase, Inbox, Mail } from 'lucide-react';
import { useState } from 'react';
import { openMailApp } from '@/api/auth';
import './Sidebar.scss';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const [mailLoading, setMailLoading] = useState(false);

  const handleMail = async () => {
    onClose();
    setMailLoading(true);
    try {
      await openMailApp();
    } catch {
      setMailLoading(false);
      window.open('https://mail.alexol.io', '_blank', 'noopener,noreferrer');
    }
  };

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
        <NavLink to="/portfolio" className="sidebar__link" onClick={onClose}>
          <Briefcase />
          <span>Портфолио</span>
        </NavLink>
        <NavLink to="/leads" className="sidebar__link" onClick={onClose}>
          <Inbox />
          <span>Заявки</span>
        </NavLink>
        <NavLink to="/users" className="sidebar__link" onClick={onClose}>
          <Users />
          <span>Пользователи</span>
        </NavLink>
        <button type="button" className="sidebar__link sidebar__link--btn" onClick={handleMail} disabled={mailLoading}>
          <Mail />
          <span>{mailLoading ? 'Почта…' : 'Почта'}</span>
        </button>
      </nav>
    </aside>
  );
};
