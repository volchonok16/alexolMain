import axios from 'axios';

const isDev = import.meta.env.DEV;
export const apiBaseURL = isDev
  ? 'http://localhost:3000/api' 
  : (import.meta.env.VITE_API_URL || 'https://api.alexol.io/api');

// Used to build absolute URLs for assets like `/uploads/...`
export const apiOrigin = apiBaseURL.replace(/\/api\/?$/, '');

export function resolveApiAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${apiOrigin}${pathOrUrl}`;
  return `${apiOrigin}/${pathOrUrl}`;
}

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
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
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const onLoginPage = window.location.pathname.includes('/login');
    if (status === 401 && !onLoginPage) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
