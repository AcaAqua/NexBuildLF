'use client';

import { format, addDays } from 'date-fns';
// import { Project, Task, Partner, Settings, Period } from '@luckyfields/nexbuildlf-sdk';

export interface Period {
  start: string;
  end: string;
  label?: string;
}

export interface Task {
  id: string;
  title: string;
  periods: Period[];
  startDate?: string;
  endDate?: string;
  start_date?: string;
  end_date?: string;
  assignee: string;
  status: 'pending' | 'doing' | 'done' | 'hold';
  color?: string;
  memo?: string;
  photo?: string;
}

export type TaskLogType = 'memo' | 'photo' | 'change' | 'handoff';

export interface TaskLogAttachment {
  id: string;
  fileName: string;
  fileType: string;
  dataUrl: string;
  createdAt: string;
}

export interface TaskLog {
  id: string;
  projectId: string;
  taskId: string;
  logDate: string;
  type: TaskLogType;
  title: string;
  body: string;
  attachments?: TaskLogAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  status: 'planning' | 'in_progress' | 'delayed' | 'completed';
  location: string;
  progress: number;
  updatedAt: string;
  tasks: Task[];
  taskLogs?: TaskLog[];
  dailyMemos?: { [key: string]: string };
  memo?: string;
  isArchived?: boolean;
}

export interface Partner {
  id: string;
  name: string;
  role?: string;
  company?: string;
  type?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Settings {
  companyName: string;
  userName: string;
  qualifications: string;
  uiScale?: 'sm' | 'md' | 'lg'; // 表示サイズ設定
}

const STORAGE_KEY = 'kouteikanri_projects';

export const storage = {
  // 全プロジェクト取得
  getProjects: (): Project[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse projects from localStorage', e);
      return [];
    }
  },

  // プロジェクト保存・更新
  saveProject: (project: Project) => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    if (index >= 0) {
      projects[index] = { ...project, updatedAt: new Date().toLocaleDateString('ja-JP') };
    } else {
      projects.push({ ...project, updatedAt: new Date().toLocaleDateString('ja-JP') });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  },

  // プロジェクト削除
  deleteProject: (id: string) => {
    const projects = storage.getProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // 初期シードデータ
  seed: () => {
    if (storage.getProjects().length === 0) {
      const demoProjects: Project[] = [
        {
          id: 'demo-1',
          title: '【デモ】新築工事サンプル',
          type: '新築',
          status: 'in_progress',
          location: '鶴岡市下名川',
          progress: 45,
          updatedAt: new Date().toLocaleDateString('ja-JP'),
          tasks: [
            {
              id: 'task-1',
              title: '地鎮祭・地盤調査',
              periods: [{ start: format(new Date(), 'yyyy-MM-dd'), end: format(addDays(new Date(), 2), 'yyyy-MM-dd') }],
              assignee: '自社・地盤調査会社',
              status: 'done',
              color: '#d3f9d8'
            },
            {
              id: 'task-2',
              title: '基礎工事',
              periods: [
                { start: format(addDays(new Date(), 3), 'yyyy-MM-dd'), end: format(addDays(new Date(), 6), 'yyyy-MM-dd'), label: '配筋検査' },
                { start: format(addDays(new Date(), 8), 'yyyy-MM-dd'), end: format(addDays(new Date(), 10), 'yyyy-MM-dd'), label: 'コンクリ打設' }
              ],
              assignee: '〇〇基礎',
              status: 'doing',
              color: '#d1e9ff'
            },
            {
              id: 'task-3',
              title: '建方・上棟',
              periods: [{ start: format(addDays(new Date(), 12), 'yyyy-MM-dd'), end: format(addDays(new Date(), 14), 'yyyy-MM-dd') }],
              assignee: '自社・大工',
              status: 'pending',
              color: '#ffd8d8'
            }
          ],
          taskLogs: [
            {
              id: 'log-1',
              projectId: 'demo-1',
              taskId: 'task-2',
              logDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
              type: 'memo',
              title: '雨天対応',
              body: '雨天のため午後の作業を中断。翌朝に再開予定。',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'log-2',
              projectId: 'demo-1',
              taskId: 'task-2',
              logDate: format(addDays(new Date(), 4), 'yyyy-MM-dd'),
              type: 'memo',
              title: '配筋確認',
              body: '配筋位置を現場で確認。追加指示待ち。',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          isArchived: false
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoProjects));
    }
  },

  // 協力業者関連
  getPartners: (): Partner[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('kouteikanri_partners');
    return data ? JSON.parse(data) : [];
  },

  savePartner: (partner: Partner) => {
    const partners = storage.getPartners();
    const index = partners.findIndex(p => p.id === partner.id);
    if (index >= 0) {
      partners[index] = partner;
    } else {
      partners.push(partner);
    }
    localStorage.setItem('kouteikanri_partners', JSON.stringify(partners));
  },

  deletePartner: (id: string) => {
    const partners = storage.getPartners();
    const filtered = partners.filter(p => p.id !== id);
    localStorage.setItem('kouteikanri_partners', JSON.stringify(filtered));
  },

  // 設定関連
  getSettings: (): Settings => {
    if (typeof window === 'undefined') return { companyName: '', userName: '', qualifications: '', uiScale: 'md' };
    try {
      const data = localStorage.getItem('kouteikanri_settings');
      if (data) {
        const parsed = JSON.parse(data);
        return { ...parsed, uiScale: parsed.uiScale || 'md' };
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }
    return { companyName: '', userName: '', qualifications: '', uiScale: 'md' };
  },

  saveSettings: (settings: Settings) => {
    localStorage.setItem('kouteikanri_settings', JSON.stringify(settings));
  }
};
