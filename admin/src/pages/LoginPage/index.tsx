import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './LoginPage.scss';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, isReady } = useAuth();
  const navigate = useNavigate();

  if (isReady && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result === 'ok') {
      navigate('/');
    } else if (result === 'forbidden') {
      setError('Нет доступа в админ-панель');
    } else {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__container">
        <div className="login-page__card">
          <h1 className="login-page__title">Админ-панель</h1>
          
          {error && <div className="login-page__error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="login-page__form">
            <div className="login-page__field">
              <label className="login-page__label">Логин</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="login-page__input"
                placeholder="admin"
                required
              />
            </div>

            <div className="login-page__field">
              <label className="login-page__label">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="login-page__input"
                placeholder="••••••"
                required
              />
            </div>

            <button type="submit" className="login-page__button">
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};