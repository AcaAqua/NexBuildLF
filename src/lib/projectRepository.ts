'use client';

import { Project, storage } from './storage';

export const projectRepository = {
  seedDemoIfEmpty: () => storage.seed(),
  listAll: (): Project[] => storage.getProjects(),
  listActive: (): Project[] => storage.getActiveProjects(),
  listArchived: (): Project[] => storage.getArchivedProjects(),
  findById: (id: string): Project | undefined => storage.getProjectById(id),
  save: (project: Project) => storage.saveProject(project),
  remove: (id: string) => storage.deleteProject(id),
  replaceAll: (projects: Project[]) => storage.replaceProjects(projects),
  stats: () => storage.getProjectStorageStats(),
};
