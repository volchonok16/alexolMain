import axios from 'axios';

const isDev = import.meta.env.DEV;
const baseURL = isDev 
  ? 'http://localhost:3000/api' 
  : (import.meta.env.VITE_API_URL || 'https://api.alexol.io/api');

export const apiClient = axios.create({
  baseURL,
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
