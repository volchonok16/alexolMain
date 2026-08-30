import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import { JITSI_PUBLIC_URL } from '../utils/jitsi'
import './Login.css'

function meetUrl(room: string, jwt?: string | null, name?: string, email?: string) {
  const base = `${JITSI_PUBLIC_URL}/${encodeURIComponent(room || 'alexol')}`
  const parsed = new URL(base)
  if (jwt) parsed.searchParams.set('jwt', jwt)
  const hash: string[] = []
  if (name) hash.push(`userInfo.displayName=${JSON.stringify(name)}`)
  if (email) hash.push(`userInfo.email=${JSON.stringify(email)}`)
  const href = parsed.toString()
  return hash.length ? `${href}#${hash.join('&')}` : href
}

export default function JitsiAuth() {
  const [params] = useSearchParams()
  const room = (params.get('room') || '').trim()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function go() {
      if (!room) {
        setError('Нет имени комнаты')
        return
      }
      try {
        if (token) {
          const { data } = await api.get<{ token?: string | null }>('/jitsi/token', {
            params: { room },
          })
          if (!cancelled && data?.token) {
            window.location.replace(meetUrl(room, data.token, user?.full_name, user?.email))
            return
          }
        }
        const { data } = await api.get<{ token?: string | null; open?: boolean }>('/jitsi/guest-token', {
          params: { room },
        })
        if (cancelled) return
        if (data?.token) {
          window.location.replace(meetUrl(room, data.token))
          return
        }
        if (data?.open === false || !token) {
          const next = `/jitsi-auth?room=${encodeURIComponent(room)}`
          window.location.replace(`/login?next=${encodeURIComponent(next)}`)
          return
        }
        setError('Не удалось выдать вход в конференцию. В MAIL_ENV нужен JITSI_JWT_APP_SECRET, тот же что JWT_APP_SECRET у Jitsi.')
      } catch {
        if (cancelled) return
        if (!token) {
          const next = `/jitsi-auth?room=${encodeURIComponent(room)}`
          window.location.replace(`/login?next=${encodeURIComponent(next)}`)
          return
        }
        setError('Не удалось выдать вход в конференцию.')
      }
    }

    void go()
    return () => {
      cancelled = true
    }
  }, [room, token, user?.email, user?.full_name])

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Вход в конференцию</h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {error || 'Проверяем сессию почты…'}
        </p>
        {error ? (
          <p style={{ textAlign: 'center' }}>
            <Link to="/login">Войти в почту</Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
