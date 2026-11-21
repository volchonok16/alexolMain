/** Turn internal MinIO URLs into same-origin /api/media paths the browser can load. */
export function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Already same-origin media proxy
  if (trimmed.startsWith('/api/media/')) return trimmed
  if (trimmed.startsWith('/api/public/avatar/')) return trimmed

  const bucketMarker = '/avatars/'
  if (trimmed.includes(bucketMarker)) {
    const objectName = trimmed.split(bucketMarker, 2)[1]?.split('?', 1)[0]
    if (objectName) {
      return `/api/media/avatars/${objectName}`
    }
  }

  // Internal docker hostname - unusable in browser
  if (
    trimmed.includes('minio:9000') ||
    trimmed.includes('://minio/') ||
    trimmed.includes('127.0.0.1:17900') ||
    trimmed.includes('localhost:17900')
  ) {
    const parts = trimmed.split('/').filter(Boolean)
    const file = parts[parts.length - 1]
    if (file) return `/api/media/avatars/${file}`
    return null
  }

  return trimmed
}

export function publicAvatarUrl(email: string): string {
  return `/api/public/avatar/${encodeURIComponent(email.trim().toLowerCase())}`
}
