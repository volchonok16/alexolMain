import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { Users, Mail, X, Eye, EyeOff, LayoutDashboard } from 'lucide-react'
import { ThemeSwitch } from '../components/ThemeSwitch'
import { openSiteAdmin } from '../sso'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdminChoice, setShowAdminChoice] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

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

      if (userData.is_admin) {
        setShowAdminChoice(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail === 'Incorrect email or password'
            ? 'Неверный email или пароль'
            : detail === 'Could not validate credentials'
              ? 'Сессия не подтвердилась. Попробуйте ещё раз.'
              : detail
          : 'Ошибка входа'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChoice = (path: string) => {
    setShowAdminChoice(false)
    navigate(path)
  }

  const handleSiteAdmin = async () => {
    setSsoLoading(true)
    try {
      await openSiteAdmin(api)
    } catch (err: any) {
      setSsoLoading(false)
      setError(err.response?.data?.detail || 'Не удалось открыть admin.alexol.io')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header-row">
          <div />
          <ThemeSwitch />
        </div>
        <h1>Почтовый сервер</h1>
        <h2>alexol.io</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email или логин</label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@alexol.io"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>

      {showAdminChoice && (
        <div className="modal-overlay">
          <div className="admin-choice-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => handleChoice('/dashboard')}>
              <X size={24} />
            </button>

            <h2>Куда вы хотите перейти?</h2>

            <div className="choice-buttons">
              <button
                className="choice-btn admin-btn"
                onClick={handleSiteAdmin}
                disabled={ssoLoading}
              >
                <div className="choice-icon">
                  <LayoutDashboard size={40} />
                </div>
                <h3>Admin панель сайта</h3>
                <p>{ssoLoading ? 'Вход…' : 'admin.alexol.io - без повторного пароля'}</p>
              </button>

              <button
                className="choice-btn admin-btn"
                onClick={() => handleChoice('/admin')}
              >
                <div className="choice-icon">
                  <Users size={40} />
                </div>
                <h3>Пользователи почты</h3>
                <p>Ящики и шаблоны на mail.alexol.io</p>
              </button>

              <button
                className="choice-btn mail-btn"
                onClick={() => handleChoice('/dashboard')}
              >
                <div className="choice-icon">
                  <Mail size={40} />
                </div>
                <h3>Моя почта</h3>
                <p>Отправка и получение писем</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
