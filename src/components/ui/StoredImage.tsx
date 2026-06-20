'use client';

import React from 'react';
import { ImageOff } from 'lucide-react';
import { resolveAttachmentDataUrl } from '@/lib/attachmentStore';

interface StoredImageProps {
  attachment: {
    dataUrl?: string;
    thumbnailDataUrl?: string;
    storageKey?: string;
    fileName?: string;
  };
  alt?: string;
  className?: string;
  preferOriginal?: boolean;
}

export function StoredImage({ attachment, alt, className, preferOriginal = false }: StoredImageProps) {
  const initialSrc = preferOriginal
    ? attachment.dataUrl || attachment.thumbnailDataUrl || ''
    : attachment.thumbnailDataUrl || attachment.dataUrl || '';
  const [src, setSrc] = React.useState(initialSrc);

  React.useEffect(() => {
    let cancelled = false;
    const nextSrc = preferOriginal
      ? attachment.dataUrl || attachment.thumbnailDataUrl || ''
      : attachment.thumbnailDataUrl || attachment.dataUrl || '';
    setSrc(nextSrc);

    if (preferOriginal && !attachment.dataUrl && attachment.storageKey) {
      resolveAttachmentDataUrl(attachment).then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl || attachment.thumbnailDataUrl || '');
      });
    }

    return () => {
      cancelled = true;
    };
  }, [attachment, preferOriginal]);

  if (!src) {
    return (
      <span className={`stored-image-missing ${className || ''}`} aria-label="写真を読み込めません">
        <ImageOff size={24} />
      </span>
    );
  }

  return <img className={className} src={src} alt={alt || attachment.fileName || '添付写真'} />;
}
