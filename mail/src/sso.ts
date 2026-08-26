export const ADMIN_APP_URL =
  (import.meta.env.VITE_ADMIN_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://admin.alexol.io';

export async function openSiteAdmin(api: {
  post: (url: string, data?: unknown) => Promise<{ data: { ticket: string } }>;
}): Promise<void> {
  const { data } = await api.post('/auth/sso/admin-ticket');
  window.location.href = `${ADMIN_APP_URL}/sso?ticket=${encodeURIComponent(data.ticket)}`;
}
