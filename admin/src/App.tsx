import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { LoginPage } from '@/pages/LoginPage';
import { NewsManagement } from '@/pages/DashboardPage/components/NewsManagement';
import { CoursesManagement } from '@/pages/DashboardPage/components/CoursesManagement';
import { UsersManagement } from '@/pages/DashboardPage/components/UsersManagement';
import '@/styles/globals.scss';

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return <div className="admin-boot">Загрузка...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<NewsManagement />} />
                <Route path="/courses" element={<CoursesManagement />} />
                <Route path="/users" element={<UsersManagement />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
