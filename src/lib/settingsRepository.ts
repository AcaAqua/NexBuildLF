'use client';

import { Settings, storage } from './storage';

export const settingsRepository = {
  get: (): Settings => storage.getSettings(),
  save: (settings: Settings) => storage.saveSettings(settings),
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('kouteikanri_settings');
  },
};
