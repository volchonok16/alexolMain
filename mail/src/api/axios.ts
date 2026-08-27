import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/sso/exchange')
  )
}

api.interceptors.request.use((config) => {
  // Не перетираем явный Authorization (свежий токен после login/SSO).
  const headers = config.headers
  const hasAuth =
    typeof headers.get === 'function'
      ? Boolean(headers.get('Authorization'))
      : Boolean((headers as Record<string, unknown>).Authorization)

  if (!hasAuth) {
    const token = useAuthStore.getState().token
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url as string | undefined

    // 401 на login/SSO — обычная ошибка формы, не сброс сессии.
    if (status === 401 && !isPublicAuthRequest(url)) {
      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
