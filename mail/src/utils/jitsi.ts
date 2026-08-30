import api from '../api/axios'

export const JITSI_PUBLIC_URL = (import.meta.env.VITE_JITSI_URL || 'https://meet.alexol.io').replace(
  /\/$/,
  ''
)

export type JitsiIdentity = {
  full_name?: string | null
  email?: string | null
  username?: string | null
}

export function jitsiRoomSlug(value: string): string {
  const raw = (value || '').trim().toLowerCase().split('@')[0]
  const slug = raw.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'alexol'
}

export function personalJitsiUrl(username?: string | null, email?: string | null): string {
  return `${JITSI_PUBLIC_URL}/${jitsiRoomSlug(username || email || 'room')}`
}

export function firstHttpUrl(text: string): string | null {
  const parts = text.split(/[·\s]/).map((p) => p.trim()).filter(Boolean)
  return parts.find((p) => /^https?:\/\//i.test(p)) || null
}

export function withJitsiUser(roomUrl: string, user?: JitsiIdentity | null): string {
  const name = (user?.full_name || user?.email || '').trim()
  if (!name) return roomUrl
  const [base] = roomUrl.split('#')
  const parts = [`userInfo.displayName=${JSON.stringify(name)}`]
  if (user?.email) parts.push(`userInfo.email=${JSON.stringify(user.email)}`)
  return `${base}#${parts.join('&')}`
}

function roomFromUrl(roomUrl: string): string {
  try {
    const path = new URL(roomUrl, JITSI_PUBLIC_URL).pathname.replace(/^\/+/, '')
    return path.split('/')[0] || '*'
  } catch {
    return '*'
  }
}

export async function openJitsiRoom(roomUrl: string, user?: JitsiIdentity | null): Promise<string> {
  let url = withJitsiUser(roomUrl, user)
  try {
    const { data } = await api.get<{ token?: string | null }>('/jitsi/token', {
      params: { room: roomFromUrl(roomUrl) },
    })
    if (data?.token) {
      const parsed = new URL(url)
      parsed.searchParams.set('jwt', data.token)
      url = parsed.toString()
    }
  } catch {
    /* Jitsi still opens; name comes from the URL hash */
  }
  window.open(url, '_blank', 'noopener,noreferrer')
  return url
}
