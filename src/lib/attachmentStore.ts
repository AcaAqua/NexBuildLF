'use client';

import type { Project, TaskLogAttachment, TaskPhotoAttachment } from './storage';
import { createThumbnailDataUrl, estimateDataUrlBytes } from './photoUtils';

type StoredAttachment = TaskLogAttachment | TaskPhotoAttachment;

const DB_NAME = 'kouteikanri-field-attachments';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

interface StoredAttachmentRecord {
  key: string;
  dataUrl: string;
  createdAt: string;
}

export interface AttachmentCompactionStats {
  taskPhotoCount: number;
  logAttachmentCount: number;
  inlineAttachmentCount: number;
  inlineAttachmentBytes: number;
  jsonBytes: number;
}

function estimateJsonBytes(value: unknown) {
  return new Blob([JSON.stringify(value)]).size;
}

export function analyzeProjectAttachments(projects: Project[]): AttachmentCompactionStats {
  return projects.reduce<AttachmentCompactionStats>((stats, project) => {
    project.tasks.forEach((task) => {
      if (task.photo) {
        stats.taskPhotoCount += 1;
        stats.inlineAttachmentCount += 1;
        stats.inlineAttachmentBytes += estimateDataUrlBytes(task.photo);
      }

      task.photos?.forEach((photo) => {
        stats.taskPhotoCount += 1;
        if (photo.dataUrl) {
          stats.inlineAttachmentCount += 1;
          stats.inlineAttachmentBytes += estimateDataUrlBytes(photo.dataUrl);
        }
      });
    });

    project.taskLogs?.forEach((log) => {
      log.attachments?.forEach((attachment) => {
        stats.logAttachmentCount += 1;
        if (attachment.dataUrl) {
          stats.inlineAttachmentCount += 1;
          stats.inlineAttachmentBytes += estimateDataUrlBytes(attachment.dataUrl);
        }
      });
    });

    return stats;
  }, {
    taskPhotoCount: 0,
    logAttachmentCount: 0,
    inlineAttachmentCount: 0,
    inlineAttachmentBytes: 0,
    jsonBytes: estimateJsonBytes(projects),
  });
}

function isBrowserIndexedDbAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openAttachmentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowserIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
  });
}

async function runStoreTransaction<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openAttachmentDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = runner(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction failed'));
    };
  });
}

export function getAttachmentByteSize(attachment: Pick<StoredAttachment, 'byteSize' | 'dataUrl'>) {
  return attachment.byteSize || estimateDataUrlBytes(attachment.dataUrl);
}

export function stripAttachmentDataUrl<T extends StoredAttachment>(attachment: T): T {
  if (!attachment.storageKey) return attachment;
  const { dataUrl, ...rest } = attachment;
  return rest as T;
}

export async function persistAttachmentDataUrl<T extends StoredAttachment>(attachment: T): Promise<T> {
  if (!attachment.dataUrl) return attachment;

  const dataUrl = attachment.dataUrl;
  const byteSize = estimateDataUrlBytes(dataUrl);
  const thumbnailDataUrl = attachment.thumbnailDataUrl || await createThumbnailDataUrl(dataUrl).catch(() => undefined);
  if (!isBrowserIndexedDbAvailable()) {
    return { ...attachment, thumbnailDataUrl, byteSize };
  }

  const storageKey = attachment.storageKey || `field-photo-${Date.now()}-${attachment.id}`;
  try {
    await runStoreTransaction('readwrite', (store) => store.put({
      key: storageKey,
      dataUrl,
      createdAt: new Date().toISOString(),
    } satisfies StoredAttachmentRecord));

    return {
      ...attachment,
      storageKey,
      thumbnailDataUrl,
      byteSize,
    };
  } catch (error) {
    console.warn('Failed to persist attachment to IndexedDB', error);
    return { ...attachment, thumbnailDataUrl, byteSize };
  }
}

export async function resolveAttachmentDataUrl(attachment: Pick<StoredAttachment, 'dataUrl' | 'storageKey'>) {
  if (attachment.dataUrl) return attachment.dataUrl;
  if (!attachment.storageKey || !isBrowserIndexedDbAvailable()) return '';

  try {
    const record = await runStoreTransaction<StoredAttachmentRecord | undefined>(
      'readonly',
      (store) => store.get(attachment.storageKey as string),
    );
    return record?.dataUrl || '';
  } catch (error) {
    console.warn('Failed to resolve attachment from IndexedDB', error);
    return '';
  }
}

export async function hydrateProjectAttachments(project: Project): Promise<Project> {
  const tasks = await Promise.all(project.tasks.map(async (task) => {
    const photos = task.photos
      ? await Promise.all(task.photos.map(async (photo) => ({
          ...photo,
          dataUrl: await resolveAttachmentDataUrl(photo),
        })))
      : undefined;

    return {
      ...task,
      photo: task.photo || photos?.[0]?.dataUrl || '',
      photos,
    };
  }));

  const taskLogs = project.taskLogs
    ? await Promise.all(project.taskLogs.map(async (log) => ({
        ...log,
        attachments: log.attachments
          ? await Promise.all(log.attachments.map(async (attachment) => ({
              ...attachment,
              dataUrl: await resolveAttachmentDataUrl(attachment),
            })))
          : undefined,
      })))
    : undefined;

  return {
    ...project,
    tasks,
    taskLogs,
  };
}

export async function persistProjectAttachments(project: Project): Promise<Project> {
  const tasks = await Promise.all(project.tasks.map(async (task) => {
    const sourcePhotos = task.photos && task.photos.length > 0
      ? task.photos
      : task.photo
        ? [{
            id: `${task.id || Date.now()}-photo`,
            fileName: '添付写真',
            fileType: 'image/jpeg',
            dataUrl: task.photo,
            createdAt: new Date().toISOString(),
          }]
        : undefined;

    const photos = sourcePhotos
      ? await Promise.all(sourcePhotos.map(async (photo) => stripAttachmentDataUrl(await persistAttachmentDataUrl(photo))))
      : undefined;

    return {
      ...task,
      photo: photos && photos.length > 0 ? '' : task.photo,
      photos,
    };
  }));

  const taskLogs = project.taskLogs
    ? await Promise.all(project.taskLogs.map(async (log) => ({
        ...log,
        attachments: log.attachments
          ? await Promise.all(log.attachments.map(async (attachment) => stripAttachmentDataUrl(await persistAttachmentDataUrl(attachment))))
          : undefined,
      })))
    : undefined;

  return {
    ...project,
    tasks,
    taskLogs,
  };
}
