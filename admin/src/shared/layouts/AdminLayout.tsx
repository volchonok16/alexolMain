import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './AdminLayout.scss';
import '@/pages/DashboardPage/DashboardPage.scss';

const titles: Record<string, string> = {
  '/': 'Новости',
  '/courses': 'Курсы',
  '/users': 'Пользователи',
};

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = titles[pathname] || 'Админ-панель';

  return (
    <div className="admin-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          className="admin-layout__overlay"
          aria-label="Закрыть меню"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="admin-layout__main">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
