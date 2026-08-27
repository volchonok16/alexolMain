import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import './Login.css'

type SsoResult = { userData: any; accessToken: string }

const inflightByTicket = new Map<string, Promise<SsoResult>>()

async function waitForAuthHydration(timeoutMs = 2500): Promise<void> {
  const persistApi = (
    useAuthStore as unknown as {
      persist?: {
        hasHydrated?: () => boolean
        onFinishHydration?: (cb: () => void) => () => void
      }
    }
  ).persist

  if (!persistApi?.hasHydrated) return
  if (persistApi.hasHydrated()) return

  await new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsub?.()
      resolve()
    }
    const unsub = persistApi.onFinishHydration?.(done)
    const timer = setTimeout(done, timeoutMs)
  })
}

async function exchangeTicketOnce(ticket: string): Promise<SsoResult> {
  const existing = inflightByTicket.get(ticket)
  if (existing) return existing

  const promise = (async () => {
    await waitForAuthHydration()

    // Сбрасываем старую сессию, чтобы persist/interceptor не подмешали чужой JWT.
    useAuthStore.setState({ token: null, user: null })

    let lastError: unknown
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data: tokenData } = await api.post('/auth/sso/exchange', { ticket })
        useAuthStore.setState({ token: tokenData.access_token, user: null })

        const { data: userData } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })

        return { userData, accessToken: tokenData.access_token as string }
      } catch (err) {
        lastError = err
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 700))
        }
      }
    }

    throw lastError || new Error('SSO exchange failed')
  })().finally(() => {
    // Держим промис чуть дольше, чтобы Strict Mode remount переиспользовал его.
    setTimeout(() => inflightByTicket.delete(ticket), 10_000)
  })

  inflightByTicket.set(ticket, promise)
  return promise
}

export default function SsoPage() {
  const [params] = useSearchParams()
  const ticket = params.get('ticket')?.trim() || ''
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState('')
  const [status] = useState('Вход из админки…')

  useEffect(() => {
    if (!ticket) {
      setError('Нет SSO-тикета')
      return
    }

    let alive = true

    ;(async () => {
      try {
        const { userData, accessToken } = await exchangeTicketOnce(ticket)
        if (!alive) return
        setAuth(userData, accessToken)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        if (!alive) return
        console.warn('[sso] exchange failed', err)
        setError('Не удалось войти через SSO. Войдите вручную.')
        setTimeout(() => {
          if (alive) navigate('/login', { replace: true })
        }, 1800)
      }
    })()

    return () => {
      alive = false
    }
  }, [ticket, navigate, setAuth])

  return (
    <div className="login-container">
      <div className="login-box" style={{ textAlign: 'center' }}>
        <h1>Alexol</h1>
        <h2>{error || status}</h2>
      </div>
    </div>
  )
}
