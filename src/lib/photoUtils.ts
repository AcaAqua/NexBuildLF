'use client';

export const MAX_FIELD_PHOTOS = 12;
export const FIELD_PHOTO_LIMIT_MESSAGE = `写真は1つの工程・記録につき最大${MAX_FIELD_PHOTOS}枚までです。`;

export function formatDataSize(bytes: number) {
  if (bytes <= 0) return '0KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  if (!base64) return 0;
  return Math.floor((base64.length * 3) / 4);
}

export function resizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 960;
        const maxHeight = 960;
        let { width, height } = img;

        if (width > height && width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        } else if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('画像の変換に失敗しました'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.68));
      };
      img.onerror = () => reject(new Error('画像を読み込めませんでした'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(reader.error || new Error('ファイルを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}
