import axios from 'axios';

const isDev = import.meta.env.DEV;
export const apiBaseURL = isDev
  ? 'http://localhost:3000/api' 
  : (import.meta.env.VITE_API_URL || 'https://api.alexol.io/api');

// Used to build absolute URLs for assets like `/uploads/...`
export const apiOrigin = apiBaseURL.replace(/\/api\/?$/, '');

export function resolveApiAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  const rewritten = pathOrUrl
    .replace(/^https?:\/\/minio\.alexol\.io(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/127\.0\.0\.1:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/localhost:9000(?=\/|$)/i, 'https://api.alexol.io')
    .replace(/^https?:\/\/minio:9000(?=\/|$)/i, 'https://api.alexol.io');
  if (/^https?:\/\//i.test(rewritten)) return rewritten;
  if (rewritten.startsWith('/')) return `${apiOrigin}${rewritten}`;
  return `${apiOrigin}/${rewritten}`;
}

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Admin uses Bearer token (localStorage) -> no cross-site cookies needed.
  // Keeping this false also avoids CORS "wildcard origin + credentials" issues.
  withCredentials: false,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set multipart boundary. A hardcoded Content-Type drops the file.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const path = window.location.pathname;
    const onLoginPage = path.includes('/login');
    const onSsoPage = path.includes('/sso');
    const url = String(error?.config?.url || '');
    const isSsoExchange = url.includes('/auth/sso/exchange');

    if (status === 401 && !onLoginPage && !onSsoPage && !isSsoExchange) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
