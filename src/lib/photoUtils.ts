'use client';

export const MAX_FIELD_PHOTOS = 12;
export const FIELD_PHOTO_LIMIT_MESSAGE = `写真は1つの工程・記録につき最大${MAX_FIELD_PHOTOS}枚までです。`;

export function formatDataSize(bytes: number) {
  if (bytes <= 0) return '0KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function estimateDataUrlBytes(dataUrl?: string) {
  const base64 = dataUrl?.split(',')[1] || '';
  if (!base64) return 0;
  return Math.floor((base64.length * 3) / 4);
}

export function resizeImageFile(file: File): Promise<string> {
  return resizeImageFileWithOptions(file);
}

interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface OptimizedFieldImage {
  dataUrl: string;
  thumbnailDataUrl: string;
}

export function createOptimizedFieldImage(file: File): Promise<OptimizedFieldImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve({
            dataUrl: resizeLoadedImage(img, { maxWidth: 960, maxHeight: 960, quality: 0.68 }),
            thumbnailDataUrl: resizeLoadedImage(img, { maxWidth: 360, maxHeight: 360, quality: 0.56 }),
          });
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('画像を読み込めませんでした'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(reader.error || new Error('ファイルを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}

function resizeLoadedImage(img: HTMLImageElement, options: ResizeImageOptions = {}) {
  const canvas = document.createElement('canvas');
  const maxWidth = options.maxWidth || 960;
  const maxHeight = options.maxHeight || 960;
  const quality = options.quality ?? 0.68;
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
  if (!ctx) throw new Error('画像の変換に失敗しました');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function resizeImageFileWithOptions(file: File, options: ResizeImageOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(resizeLoadedImage(img, options));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('画像を読み込めませんでした'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(reader.error || new Error('ファイルを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}
