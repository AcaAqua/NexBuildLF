'use client';

import { Partner, storage } from './storage';

export const partnerRepository = {
  list: (): Partner[] => storage.getPartners(),
  save: (partner: Partner) => storage.savePartner(partner),
  remove: (id: string) => storage.deletePartner(id),
  replaceAll: (partners: Partner[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('kouteikanri_partners', JSON.stringify(partners));
  },
  clearAll: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('kouteikanri_partners');
  },
};
