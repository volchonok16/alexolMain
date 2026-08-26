import { useState } from 'react';
import { resolveApiAssetUrl } from '@/api/client';

type AvatarProps = {
  src?: string | null;
  alt: string;
  className?: string;
  emptyClassName?: string;
  fallback: string;
};

/** Falls back to initials when /uploads photo is missing or Cloudflare returns a broken body. */
export const Avatar = ({ src, alt, className, emptyClassName, fallback }: AvatarProps) => {
  const [broken, setBroken] = useState(false);
  const url = src ? resolveApiAssetUrl(src) : '';

  if (!url || broken) {
    return <span className={emptyClassName || className}>{fallback}</span>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
};
