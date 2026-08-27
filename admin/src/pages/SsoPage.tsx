import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

type SsoResult = { token: string; user: unknown };

const inflightByTicket = new Map<string, Promise<SsoResult>>();

async function exchangeTicketOnce(ticket: string): Promise<SsoResult> {
  const existing = inflightByTicket.get(ticket);
  if (existing) return existing;

  const promise = (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await authApi.exchangeSso(ticket);
        return { token: data.token, user: data.user };
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 700));
        }
      }
    }
    throw lastError || new Error('SSO exchange failed');
  })().finally(() => {
    setTimeout(() => inflightByTicket.delete(ticket), 10_000);
  });

  inflightByTicket.set(ticket, promise);
  return promise;
}

export const SsoPage = () => {
  const [params] = useSearchParams();
  const ticket = params.get('ticket')?.trim() || '';
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [status] = useState('Вход через почту…');

  useEffect(() => {
    if (!ticket) {
      setError('Нет SSO-тикета');
      return;
    }

    let alive = true;

    (async () => {
      try {
        const data = await exchangeTicketOnce(ticket);
        if (!alive) return;
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        window.location.replace('/');
      } catch (err) {
        if (!alive) return;
        console.warn('[sso] admin exchange failed', err);
        setError('Не удалось войти через SSO. Войдите вручную.');
        setTimeout(() => {
          if (alive) navigate('/login', { replace: true });
        }, 1800);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ticket, navigate]);

  return (
    <div className="admin-boot" style={{ padding: '2rem', textAlign: 'center' }}>
      {error || status}
    </div>
  );
};
