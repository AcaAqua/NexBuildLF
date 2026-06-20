'use client';

import type { Project, Settings } from './storage';
import { hydrateProjectAttachments } from './attachmentStore';
import { settingsRepository } from './settingsRepository';

type ShareResult = 'shared' | 'downloaded';

interface ProjectShareData {
  app: 'kouteikanri';
  version: number;
  exportedAt: string;
  shareScope: {
    projects: true;
    partners: false;
    settings: false;
  };
  shareLabel: string;
  checkCode: string;
  projects: Project[];
  partners: [];
  settings: Settings;
}

const fallbackSettings: Settings = {
  companyName: '',
  userName: '',
  qualifications: '',
  uiScale: 'md',
};

function createCheckCode(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

function sanitizeFileName(value: string) {
  const clean = value.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  return clean.slice(0, 40) || 'project';
}

export async function createProjectShareFile(project: Project, settings: Settings = settingsRepository.get()) {
  const hydratedProject = await hydrateProjectAttachments(project);
  const payloadBase = {
    app: 'kouteikanri' as const,
    version: 1,
    exportedAt: new Date().toISOString(),
    shareScope: {
      projects: true as const,
      partners: false as const,
      settings: false as const,
    },
    shareLabel: `案件: ${project.title}`,
    projects: [hydratedProject],
    partners: [] as [],
    settings: settings || fallbackSettings,
  };
  const checkCode = createCheckCode(JSON.stringify(payloadBase));
  const payload: ProjectShareData = { ...payloadBase, checkCode };
  const json = JSON.stringify(payload, null, 2);
  const fileName = `kouteikanri-project-${sanitizeFileName(project.title)}-${new Date().toISOString().slice(0, 10)}.json`;

  return new File([json], fileName, { type: 'application/json' });
}

export function downloadProjectShareFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareProject(project: Project): Promise<ShareResult> {
  const file = await createProjectShareFile(project);
  const text = `${project.title} の工程管理データです。設定画面の共有データ取り込みから読み込めます。`;

  try {
    const shareData = {
      title: `工程管理 Pro - ${project.title}`,
      text,
      files: [file],
    };
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share(shareData);
      return 'shared';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'shared';
    }
  }

  downloadProjectShareFile(file);
  return 'downloaded';
}
