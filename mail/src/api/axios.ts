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
  return url.includes('/auth/login') || url.includes('/auth/sso/exchange')
}

function isSsoPage(): boolean {
  return window.location.pathname.startsWith('/sso')
}

api.interceptors.request.use((config) => {
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

    // На /sso не выкидываем на /login — страница сама обработает ошибку/ретрай.
    if (status === 401 && !isPublicAuthRequest(url) && !isSsoPage()) {
      useAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
