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
  const hash: string[] = [
    'config.prejoinPageEnabled=false',
    'config.prejoinConfig.enabled=false',
    'config.requireDisplayName=false',
  ]
  if (name) hash.push(`userInfo.displayName=${JSON.stringify(name)}`)
  if (email) hash.push(`userInfo.email=${JSON.stringify(email)}`)
  const photo = avatarUrl(email)
  if (photo) hash.push(`userInfo.avatarUrl=${JSON.stringify(photo)}`)
  return `${parsed.toString()}#${hash.join('&')}`
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
  const [guestName, setGuestName] = useState('')
  const [autoStart, setAutoStart] = useState(false)
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
        setAutoStart(Boolean(data?.auto_start) || isAutoStartRoom(room))
      } catch {
        if (cancelled) return
        setRoomOpen(true)
        setAutoStart(isAutoStartRoom(room))
      }
      if (token) {
        setEntering(true)
        try {
          if (!useAuthStore.getState().user) {
            const me = await api.get('/auth/me')
            if (!cancelled) setAuth(me.data, token)
          }
          await enterAsMailbox()
        } catch {
          if (!cancelled) {
            setError('Не удалось выдать вход в конференцию.')
            setEntering(false)
            setReady(true)
          }
        }
        return
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
    const display = guestName.trim()
    if (!display) {
      setError('Напишите, как вас представить в конференции')
      return
    }
    setError('')
    setGuestLoading(true)
    try {
      const { data } = await api.get<{ token?: string | null; open?: boolean }>('/jitsi/guest-token', {
        params: { room, name: display },
      })
      if (data?.token) {
        await enterWithJwt(data.token, display)
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
          {roomOpen
            ? 'Укажите имя и фамилию или войдите ящиком почты.'
            : 'Закрытая комната — войдите ящиком @alexol.io.'}
        </p>
        {error ? <div className="error">{error}</div> : null}

        {roomOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void enterAsGuest()
            }}
          >
            <div className="form-group">
              <label htmlFor="jitsi-guest-name">Имя и фамилия</label>
              <input
                id="jitsi-guest-name"
                type="text"
                autoComplete="name"
                autoFocus
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Иван Иванов"
                required
              />
            </div>
            <button type="submit" disabled={guestLoading} className="btn-primary">
              {guestLoading ? 'Вход…' : autoStart ? 'Войти с этим именем' : 'Войти как гость'}
            </button>
          </form>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            Закрытая комната — только ящик @alexol.io.
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: roomOpen ? '2rem' : 0 }}>
          {roomOpen ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Сотрудники @alexol.io
            </p>
          ) : null}
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
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Вход…' : roomOpen ? 'Войти ящиком' : 'Войти в конференцию'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/login">Открыть почту</Link>
        </p>
      </div>
    </div>
  )
}
