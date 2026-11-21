import { useState } from 'react'
import { publicAvatarUrl, resolveAvatarUrl } from '../utils/avatarUrl'

function mailboxFrom(raw?: string | null): string {
  const value = (raw || '').trim()
  const angled = value.match(/<([^>]+)>/)
  return (angled?.[1] || value).replace(/^mailto:/i, '').trim().toLowerCase()
}

function isDummyAvatar(url: string): boolean {
  return /unavatar\.io|gravatar\.com\/avatar/i.test(url)
}

/** Avatar for from/to with initials fallback if image fails. */
export function PeerAvatar({
  src,
  email,
  name,
  size = 40,
  className = '',
}: {
  src?: string | null
  email: string
  name?: string | null
  size?: number
  className?: string
}) {
  const [attempt, setAttempt] = useState(0)
  const mailbox = mailboxFrom(email)
  const resolved = resolveAvatarUrl(src)
  const candidates = [
    mailbox ? publicAvatarUrl(mailbox) : null,
    resolved && !isDummyAvatar(resolved) ? resolved : null,
  ].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index)

  const current = candidates[attempt]
  const initial = (name || email || '?').trim().charAt(0).toUpperCase() || '?'

  if (!current || attempt >= candidates.length) {
    return (
      <div
        className={`peer-avatar peer-avatar--fallback ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={current}
      alt=""
      className={`peer-avatar ${className}`}
      style={{ width: size, height: size }}
      onError={() => setAttempt((n) => n + 1)}
    />
  )
}
