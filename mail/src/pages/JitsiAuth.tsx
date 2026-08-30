import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { PasswordInput } from '../components/PasswordInput'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { JITSI_PUBLIC_URL, isAutoStartRoom } from '../utils/jitsi'
import './Login.css'

function avatarUrl(email?: string) {
  if (!email) return ''
  return `${window.location.origin}/api/public/avatar/${encodeURIComponent(email.trim().toLowerCase())}`
}

function meetUrl(room: string, jwt?: string | null, name?: string, email?: string) {
  const base = `${JITSI_PUBLIC_URL}/${encodeURIComponent(room || 'alexol')}`
  const parsed = new URL(base)
  if (jwt) parsed.searchParams.set('jwt', jwt)
  const hash: string[] = []
  if (name) hash.push(`userInfo.displayName=${JSON.stringify(name)}`)
  if (email) hash.push(`userInfo.email=${JSON.stringify(email)}`)
  const photo = avatarUrl(email)
  if (photo) hash.push(`userInfo.avatarUrl=${JSON.stringify(photo)}`)
  const href = parsed.toString()
  return hash.length ? `${href}#${hash.join('&')}` : href
}

function loginError(err: unknown) {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  if (detail === 'Incorrect email or password') return 'Неверный email или пароль'
  if (detail === 'Could not validate credentials') return 'Сессия не подтвердилась. Попробуйте ещё раз.'
  if (typeof detail === 'string' && detail) return detail
  return 'Не удалось войти'
}

export default function JitsiAuth() {
  const [params] = useSearchParams()
  const room = (params.get('room') || '').trim()
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [roomOpen, setRoomOpen] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [entering, setEntering] = useState(Boolean(token))

  async function enterWithJwt(jwt: string, name?: string, mail?: string) {
    window.location.replace(meetUrl(room, jwt, name, mail))
  }

  async function enterAsMailbox() {
    const { data } = await api.get<{ token?: string | null }>('/jitsi/token', { params: { room } })
    if (!data?.token) {
      setError('Не удалось выдать вход в конференцию. В MAIL_ENV нужен JITSI_JWT_APP_SECRET, тот же что JWT_APP_SECRET у Jitsi.')
      setEntering(false)
      return
    }
    const me = useAuthStore.getState().user
    await enterWithJwt(data.token, me?.full_name, me?.email)
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      if (!room) {
        setError('Нет имени комнаты')
        setEntering(false)
        return
      }
      try {
        const { data } = await api.get<{ token?: string | null; open?: boolean; auto_start?: boolean }>(
          '/jitsi/guest-token',
          { params: { room } }
        )
        if (cancelled) return
        setRoomOpen(data?.open !== false)
        if (token) {
          setEntering(true)
          try {
            await enterAsMailbox()
          } catch {
            if (!cancelled) {
              setError('Не удалось выдать вход в конференцию.')
              setEntering(false)
            }
          }
          return
        }
        const autoStart = Boolean(data?.auto_start) || isAutoStartRoom(room)
        if (autoStart && data?.token) {
          setEntering(true)
          await enterWithJwt(data.token, 'Гость')
          return
        }
      } catch {
        if (cancelled) return
        setRoomOpen(true)
        if (token) {
          setEntering(true)
          try {
            await enterAsMailbox()
          } catch {
            if (!cancelled) {
              setError('Не удалось выдать вход в конференцию.')
              setEntering(false)
            }
          }
          return
        }
      }
      if (!cancelled) {
        setEntering(false)
        setReady(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
    // enterAsMailbox uses current token from the store interceptor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data: tokenData } = await api.post('/auth/login', {
        email: email.trim(),
        password,
      })
      const accessToken = tokenData.access_token as string
      useAuthStore.setState({ token: accessToken, user: null })
      let userData = tokenData.user
      if (!userData) {
        const me = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        userData = me.data
      }
      setAuth(userData, accessToken)
      setEntering(true)
      await enterAsMailbox()
    } catch (err) {
      setError(loginError(err))
      setEntering(false)
    } finally {
      setLoading(false)
    }
  }

  const enterAsGuest = async () => {
    setError('')
    setGuestLoading(true)
    try {
      const { data } = await api.get<{ token?: string | null; open?: boolean }>('/jitsi/guest-token', {
        params: { room },
      })
      if (data?.token) {
        await enterWithJwt(data.token, 'Гость')
        return
      }
      setRoomOpen(false)
      setError('Эта комната закрытая — нужен ящик @alexol.io')
    } catch {
      setError('Не удалось войти как гость')
    } finally {
      setGuestLoading(false)
    }
  }

  if (!room) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Вход в конференцию</h2>
          <p className="error">Нет имени комнаты</p>
        </div>
      </div>
    )
  }

  if (entering && !error) {
    return (
      <div className="login-container">
        <div className="login-box">
          <div className="login-header-row">
            <div />
            <ThemeSwitch />
          </div>
          <h2>Вход в конференцию</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Открываем Meet…</p>
        </div>
      </div>
    )
  }

  if (!ready && !error) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>Вход в конференцию</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Проверяем сессию почты…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header-row">
          <div />
          <ThemeSwitch />
        </div>
        <h1>Meet</h1>
        <h2>meet.alexol.io</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '-1rem', marginBottom: '1.5rem' }}>
          Тот же ящик и пароль, что у почты. Имя и фото возьмутся из профиля.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="jitsi-email">Email или логин</label>
            <input
              id="jitsi-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@alexol.io"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="jitsi-password">Пароль почты</label>
            <PasswordInput
              id="jitsi-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Вход…' : 'Войти в конференцию'}
          </button>
        </form>

        {roomOpen ? (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn-primary"
              style={{ background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-border)' }}
              disabled={guestLoading}
              onClick={() => void enterAsGuest()}
            >
              {guestLoading ? '…' : 'Продолжить как гость'}
            </button>
          </p>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
            Закрытая комната — только сотрудники с ящиком.
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login">Открыть почту</Link>
        </p>
      </div>
    </div>
  )
}
