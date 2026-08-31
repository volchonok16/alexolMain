import { useAuthStore } from './store/authStore'

export const ADMIN_APP_URL =
  (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://admin.alexol.io'

export const CHAT_APP_URL =
  (import.meta.env.VITE_CHAT_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://chat.alexol.io'

export async function openSiteAdmin(api: {
  post: (url: string, data?: unknown) => Promise<{ data: { ticket: string } }>;
}): Promise<void> {
  const { data } = await api.post('/auth/sso/admin-ticket');
  window.location.assign(`${ADMIN_APP_URL}/sso?ticket=${encodeURIComponent(data.ticket)}`);
}

/** Full-page OAuth: form POST sets mail SSO cookie, then 303 → chat/_oauth/alexol → /home */
export async function openChat(): Promise<void> {
  const token = useAuthStore.getState().token
  if (!token) {
    window.location.assign(CHAT_APP_URL)
    return
  }
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/oauth/chat-handoff-redirect'
  form.style.display = 'none'
  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'access_token'
  input.value = token
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}
