import { Download } from 'lucide-react';
import { exportToCSV } from '@/lib/csvUtil';

interface ExportMenuProps {
  data: any[]; // array of objects to export
  headers: string[]; // CSV header order
}

/**
 * ExportMenu コンポーネント
 * - 「全データ」または「選択データ」のエクスポートを選択できる UI（簡易ドロップダウン）
 * - ここでは選択データ機能はプレースホルダーとして実装し、全データエクスポートを実行
 */
export const ExportMenu: React.FC<ExportMenuProps> = ({ data, headers }) => {
  const handleExport = (selectedOnly: boolean) => {
    const csv = exportToCSV(data, headers, selectedOnly);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'data_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="export-menu">
      <button
        className="btn btn-outline icon-btn-responsive"
        onClick={() => handleExport(false)}
        title="全データをCSVでエクスポート"
      >
        <Download size={18} />
        <span className="btn-text">ダウンロード</span>
      </button>
      {/* 将来的に選択データエクスポートを実装 */}
    </div>
  );
};
