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

export async function openChat(api: {
  post: (url: string, data?: unknown) => Promise<{ data: { url?: string } }>;
}): Promise<void> {
  const { data } = await api.post('/oauth/chat-handoff')
  window.location.assign(data.url || `${CHAT_APP_URL}/_oauth/alexol`)
}
