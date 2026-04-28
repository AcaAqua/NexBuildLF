import React from 'react';

interface FilterBarProps {
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  companyFilter: string;
  setCompanyFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
}

/**
 * フィルタバーコンポーネント
 * - 種別、会社、ステータスで絞り込み
 * - UI はシンプルなセレクトボックス
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  typeFilter,
  setTypeFilter,
  companyFilter,
  setCompanyFilter,
  statusFilter,
  setStatusFilter,
}) => {
  return (
    <div className="filter-bar">
      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="工事種別でフィルタ">
        <option value="all">全種別</option>
        <option value="new">新築</option>
        <option value="renovation">改修</option>
        <option value="civil">土木</option>
      </select>
      <input
        type="text"
        placeholder="会社名で検索"
        value={companyFilter}
        onChange={e => setCompanyFilter(e.target.value)}
        aria-label="会社名で検索"
      />
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="ステータスでフィルタ">
        <option value="all">全ステータス</option>
        <option value="planning">計画中</option>
        <option value="in_progress">進行中</option>
        <option value="delayed">遅延</option>
        <option value="completed">完了</option>
      </select>
    </div>
  );
};
