'use client';

import type { Project, TaskLog } from './storage';
import { projectRepository } from './projectRepository';

export const PROJECT_ACTIVITY_TASK_ID = '__project_activity__';

type ShareActivityAction = 'sent' | 'downloaded' | 'imported';

interface ShareActivityOptions {
  action: ShareActivityAction;
  modeLabel?: string;
  scopeLabel?: string;
  checkCode?: string;
  fileName?: string;
  sourceExportedAt?: string;
}

export function createShareActivityLog(project: Project, options: ShareActivityOptions): TaskLog {
  const now = new Date();
  const actionLabel = getActionLabel(options.action);
  const detailParts = [
    options.scopeLabel ? `範囲: ${options.scopeLabel}` : '',
    options.modeLabel ? `方式: ${options.modeLabel}` : '',
    options.checkCode ? `確認コード: ${options.checkCode}` : '',
    options.fileName ? `ファイル: ${options.fileName}` : '',
    options.sourceExportedAt ? `作成日時: ${formatActivityDateTime(options.sourceExportedAt)}` : '',
  ].filter(Boolean);

  return {
    id: `log-share-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId: project.id,
    taskId: PROJECT_ACTIVITY_TASK_ID,
    logDate: now.toISOString().slice(0, 10),
    type: 'share',
    title: `共有${actionLabel}`,
    body: detailParts.length > 0
      ? detailParts.join('\n')
      : '案件データの共有操作を記録しました。',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function appendShareActivityLog(project: Project, options: ShareActivityOptions): Project {
  return {
    ...project,
    taskLogs: [...(project.taskLogs || []), createShareActivityLog(project, options)],
  };
}

export function saveShareActivityLog(project: Project, options: ShareActivityOptions) {
  const latestProject = projectRepository.findById(project.id) || project;
  const updated = appendShareActivityLog(latestProject, options);
  projectRepository.save(updated);
  return updated;
}

export function addImportActivityLogs(projects: Project[], options: Omit<ShareActivityOptions, 'action'>) {
  return projects.map(project => appendShareActivityLog(project, { ...options, action: 'imported' }));
}

export function addShareActivityLogs(projects: Project[], options: Omit<ShareActivityOptions, 'action'> & { action: 'sent' | 'downloaded' }) {
  return projects.map(project => appendShareActivityLog(project, options));
}

function getActionLabel(action: ShareActivityAction) {
  if (action === 'sent') return '送信';
  if (action === 'downloaded') return 'ファイル保存';
  return '取り込み';
}

function formatActivityDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
