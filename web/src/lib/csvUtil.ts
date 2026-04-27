// import { exportToCSV as sdkExport, importFromCSV as sdkImport, Project } from '@luckyfields/nexbuildlf-sdk';
import { Project } from './storage';

/**
 * プロジェクトデータをCSV形式で出力します
 */
export function exportToCSV(projects: Project[]): string {
  // return sdkExport(projects);
  console.log('Exporting projects to CSV...', projects);
  return "id,title,type,status,location\n" + projects.map(p => `${p.id},${p.title},${p.type},${p.status},${p.location}`).join("\n");
}

/**
 * CSVテキストをプロジェクトデータの配列に変換します
 */
export function importFromCSV(csvText: string): Partial<Project>[] {
  // return sdkImport(csvText);
  console.log('Importing projects from CSV...', csvText);
  return [];
}
