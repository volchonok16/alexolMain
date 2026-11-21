import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { ThemeSwitch } from '../components/ThemeSwitch'
import './Login.css'

function apiDetail(err: any): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  const error = err?.response?.data?.error
  if (typeof error === 'string') return error
  return 'Не удалось сбросить пароль'
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim() })
      setSuccess(data?.message || 'Новый пароль отправлен в Telegram.')
    } catch (err: any) {
      setError(apiDetail(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header-row">
          <div />
          <ThemeSwitch />
        </div>
        <h1>Сброс пароля</h1>
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

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Отправка...' : 'Сбросить пароль'}
          </button>
        </form>

        <p className="login-hint">
          Пароль придёт от бота новостей. Если бот вам ещё не писал — сначала отправьте ему /start.
        </p>

        <p className="login-footer-link">
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  )
}
