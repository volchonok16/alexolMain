import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export const SsoPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const ticket = params.get('ticket')?.trim();
    if (!ticket) {
      setError('Нет SSO-тикета');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await authApi.exchangeSso(ticket);
        if (cancelled) return;
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.replace('/');
      } catch {
        if (!cancelled) {
          setError('Не удалось войти через SSO. Войдите вручную.');
          setTimeout(() => navigate('/login', { replace: true }), 1800);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="admin-boot" style={{ padding: '2rem', textAlign: 'center' }}>
      {error || 'Вход через почту…'}
    </div>
  );
};
