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

export function personalJitsiUrl(
  username?: string | null,
  email?: string | null,
  openRoom = true
): string {
  const prefix = openRoom ? 'o' : 'c'
  return `${JITSI_PUBLIC_URL}/${prefix}-${jitsiRoomSlug(username || email || 'room')}`
}

export function firstHttpUrl(text: string): string | null {
  const parts = text.split(/[·\s]/).map((p) => p.trim()).filter(Boolean)
  return parts.find((p) => /^https?:\/\//i.test(p)) || null
}

export function roomFromUrl(roomUrl: string): string {
  try {
    const path = new URL(roomUrl, JITSI_PUBLIC_URL).pathname.replace(/^\/+/, '')
    return decodeURIComponent(path.split('/')[0] || '') || 'alexol'
  } catch {
    return 'alexol'
  }
}

export async function openJitsiRoom(roomUrl: string, _user?: JitsiIdentity | null): Promise<string> {
  const room = roomFromUrl(roomUrl)
  const bounce = `${window.location.origin}/jitsi-auth?room=${encodeURIComponent(room)}`
  window.open(bounce, '_blank', 'noopener,noreferrer')
  return bounce
}
