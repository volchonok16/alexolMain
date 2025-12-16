import axios from 'axios';

const isDev = import.meta.env.DEV;
const baseURL = isDev ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
