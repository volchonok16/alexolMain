export const JITSI_PUBLIC_URL = (import.meta.env.VITE_JITSI_URL || 'https://meet.alexol.io').replace(
  /\/$/,
  ''
)

export function jitsiRoomSlug(value: string): string {
  const raw = (value || '').trim().toLowerCase().split('@')[0]
  const slug = raw.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'alexol'
}

export function personalJitsiUrl(username?: string | null, email?: string | null): string {
  return `${JITSI_PUBLIC_URL}/${jitsiRoomSlug(username || email || 'room')}`
}
