import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import './Login.css'

export default function SsoPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const ticket = params.get('ticket')?.trim()
    if (!ticket) {
      setError('Нет SSO-тикета')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data: tokenData } = await api.post('/auth/sso/exchange', { ticket })
        useAuthStore.setState({ token: tokenData.access_token, user: null })
        const { data: userData } = await api.get('/auth/me')
        if (cancelled) return
        setAuth(userData, tokenData.access_token)
        navigate('/dashboard', { replace: true })
      } catch {
        if (!cancelled) {
          setError('Не удалось войти через SSO. Войдите вручную.')
          setTimeout(() => navigate('/login', { replace: true }), 1800)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, navigate, setAuth])

  return (
    <div className="login-container">
      <div className="login-box" style={{ textAlign: 'center' }}>
        <h1>Alexol</h1>
        <h2>{error || 'Вход из админки…'}</h2>
      </div>
    </div>
  )
}
