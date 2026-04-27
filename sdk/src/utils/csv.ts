import { Project } from '../types';

export function exportToCSV(projects: Project[]): string {
  if (projects.length === 0) return '';

  const headers = ['id', 'title', 'type', 'status', 'location', 'updatedAt', 'memo'];
  const csvRows = [headers.join(',')];

  for (const p of projects) {
    const values = headers.map(header => {
      const val = (p as any)[header] || '';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

export function importFromCSV(csvText: string): Partial<Project>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const projects: Partial<Project>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
    const project: any = {};
    headers.forEach((header, index) => {
      project[header] = values[index];
    });
    projects.push(project);
  }

  return projects;
}
