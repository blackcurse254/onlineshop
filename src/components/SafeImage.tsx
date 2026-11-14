import React, { useEffect, useState } from 'react';
import { Footprints } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  loading?: 'lazy' | 'eager';
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

const FALLBACK_IMAGE_URL = '/images/shoe-fallback.svg';

function isSafeImageSrc(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  aspectClass = '',
  loading = 'lazy',
  onClick,
}) => {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const safeSrc = isSafeImageSrc(src) ? src.trim() : '';

  useEffect(() => {
    setFailed(false);
    setFallbackFailed(false);
  }, [src]);

  if (!safeSrc || failed) {
    if (fallbackFailed) {
      return (
        <div
          onClick={onClick}
          className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E2E0DB] to-[#D9D7D2] text-[#6A6670] ${aspectClass} ${className}`}
          role="img"
          aria-label={alt}
        >
          <Footprints className="w-8 h-8 opacity-45 mb-2" strokeWidth={1.25} />
          <span className="text-xs font-medium px-3 text-center opacity-75 line-clamp-1">{alt}</span>
        </div>
      );
    }

    return (
      <img
        src={FALLBACK_IMAGE_URL}
        alt={alt}
        loading={loading}
        onClick={onClick}
        onError={() => setFallbackFailed(true)}
        className={`${aspectClass} ${className}`.trim()}
      />
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={loading}
      onClick={onClick}
      onError={() => setFailed(true)}
      className={`${aspectClass} ${className}`.trim()}
    />
  );
};
