import { useState } from 'react'

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
  const [failed, setFailed] = useState(false)
  const initial = (name || email || '?').trim().charAt(0).toUpperCase() || '?'

  if (!src || failed) {
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
      src={src}
      alt=""
      className={`peer-avatar ${className}`}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}
