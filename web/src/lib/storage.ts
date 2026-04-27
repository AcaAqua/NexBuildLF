'use client';

import { format, addDays } from 'date-fns';

import { format, addDays } from 'date-fns';
import { Project, Task, Partner, Settings, Period } from '@luckyfields/nexbuildlf-sdk';

export type { Project, Task, Partner, Settings, Period };

const STORAGE_KEY = 'kouteikanri_projects';

export const storage = {
  // 全プロジェクト取得
  getProjects: (): Project[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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
    if (typeof window === 'undefined') return { companyName: '', userName: '', qualifications: '' };
    const data = localStorage.getItem('kouteikanri_settings');
    return data ? JSON.parse(data) : { companyName: '', userName: '', qualifications: '' };
  },

  saveSettings: (settings: Settings) => {
    localStorage.setItem('kouteikanri_settings', JSON.stringify(settings));
  }
};
