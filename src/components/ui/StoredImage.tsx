'use client';

import React from 'react';
import { ImageOff } from 'lucide-react';
import { resolveAttachmentDataUrl } from '@/lib/attachmentStore';

interface StoredImageProps {
  attachment: {
    dataUrl?: string;
    storageKey?: string;
    fileName?: string;
  };
  alt?: string;
  className?: string;
}

export function StoredImage({ attachment, alt, className }: StoredImageProps) {
  const [src, setSrc] = React.useState(attachment.dataUrl || '');

  React.useEffect(() => {
    let cancelled = false;
    setSrc(attachment.dataUrl || '');

    if (!attachment.dataUrl && attachment.storageKey) {
      resolveAttachmentDataUrl(attachment).then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [attachment]);

  if (!src) {
    return (
      <span className={`stored-image-missing ${className || ''}`} aria-label="写真を読み込めません">
        <ImageOff size={24} />
      </span>
    );
  }

  return <img className={className} src={src} alt={alt || attachment.fileName || '添付写真'} />;
}
