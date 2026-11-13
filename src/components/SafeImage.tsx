import React, { useState } from 'react';
import { Footprints } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  aspectClass = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EFEAE0] to-[#E2D9C8] text-[#6B6459] ${aspectClass} ${className}`}
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
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
