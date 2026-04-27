import { exportToCSV as sdkExport, importFromCSV as sdkImport, Project } from '@luckyfields/nexbuildlf-sdk';

/**
 * プロジェクトデータをCSV形式で出力します
 */
export function exportToCSV(projects: Project[]): string {
  return sdkExport(projects);
}

/**
 * CSVテキストをプロジェクトデータの配列に変換します
 */
export function importFromCSV(csvText: string): Partial<Project>[] {
  return sdkImport(csvText);
}
