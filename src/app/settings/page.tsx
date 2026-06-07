'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Settings, Save, Download, Upload, AlertTriangle, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { storage, Settings as SettingsType, Project, Partner } from "@/lib/storage";
import { formatDataSize } from "@/lib/photoUtils";

interface BackupData {
  app?: string;
  version?: number;
  exportedAt?: string;
  projects: Project[];
  partners: Partner[];
  settings: SettingsType;
}

interface ImportSummary {
  projects: number;
  partners: number;
  photos: number;
  dataSize: number;
  exportedAt?: string;
  fileName: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({ companyName: '', userName: '', qualifications: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(storage.getSettings());
    setMounted(true);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.saveSettings(settings);
    setSaveMessage('設定を保存しました。');
    // UIスケールの変更を即時反映させる
    document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
    document.body.classList.add(`ui-size-${settings.uiScale || 'md'}`);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleExport = () => {
    const data: BackupData = {
      app: 'kouteikanri',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: storage.getProjects(),
      partners: storage.getPartners(),
      settings: storage.getSettings()
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kouteikanri_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isBackupData = (value: unknown): value is BackupData => {
    if (!value || typeof value !== 'object') return false;
    const data = value as Partial<BackupData>;
    return Array.isArray(data.projects) && Array.isArray(data.partners) && !!data.settings && typeof data.settings === 'object';
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!isBackupData(data)) {
          setImportMessage('バックアップ形式が正しくありません。');
          e.target.value = '';
          return;
        }
        setPendingImport(data);
        setImportSummary({
          projects: data.projects.length,
          partners: data.partners.length,
          photos: countBackupPhotos(data.projects),
          dataSize: file.size,
          exportedAt: data.exportedAt,
          fileName: file.name,
        });
      } catch (err) {
        setImportMessage('ファイルの読み込みに失敗しました。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    try {
      localStorage.setItem('kouteikanri_projects', JSON.stringify(pendingImport.projects));
      localStorage.setItem('kouteikanri_partners', JSON.stringify(pendingImport.partners));
      storage.saveSettings(pendingImport.settings);
      setImportMessage('復元しました。画面を更新します。');
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setImportMessage('復元できませんでした。端末の保存容量を超えた可能性があります。写真枚数やバックアップ容量を確認してください。');
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportSummary(null);
    setImportMessage('');
  };

  const handleReset = () => {
    if (confirm('すべてのプロジェクト・業者データが削除され、デモ状態に戻ります。本当によろしいですか？')) {
      localStorage.removeItem('kouteikanri_projects');
      localStorage.removeItem('kouteikanri_partners');
      localStorage.removeItem('kouteikanri_settings');
      storage.seed(); // デモデータを再生成
      alert('初期化が完了しました。');
      window.location.reload();
    }
  };

  return (
    <MainLayout>
      <div className="settings-page">
        <header className="page-header">
          <Settings size={28} className="header-icon" />
          <h1>設定・プロファイル</h1>
        </header>

        <div className="settings-grid">
          {/* 表示・テーマ設定 */}
          <section className="settings-card glass">
            <h2>表示・テーマ設定</h2>
            <p className="description">アプリの見た目（ライトモード・ダークモード）を変更します。</p>
            {mounted && (
              <div className="theme-toggle-group" style={{ marginBottom: '24px' }}>
                <button 
                  className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={18} />
                  ライト
                </button>
                <button 
                  className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={18} />
                  ダーク
                </button>
                <button 
                  className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                  onClick={() => setTheme('system')}
                >
                  <Monitor size={18} />
                  端末に合わせる
                </button>
              </div>
            )}

            <h3 style={{ fontSize: '15px', marginBottom: '12px', marginTop: '16px' }}>全体の表示サイズ</h3>
            <div className="theme-toggle-group">
              <button 
                className={`theme-btn ${settings.uiScale === 'sm' ? 'active' : ''}`}
                onClick={() => {
                  setSettings({...settings, uiScale: 'sm'});
                  storage.saveSettings({...settings, uiScale: 'sm'});
                  document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
                  document.body.classList.add('ui-size-sm');
                }}
              >
                小 (情報量多め)
              </button>
              <button 
                className={`theme-btn ${(!settings.uiScale || settings.uiScale === 'md') ? 'active' : ''}`}
                onClick={() => {
                  setSettings({...settings, uiScale: 'md'});
                  storage.saveSettings({...settings, uiScale: 'md'});
                  document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
                  document.body.classList.add('ui-size-md');
                }}
              >
                標準
              </button>
              <button 
                className={`theme-btn ${settings.uiScale === 'lg' ? 'active' : ''}`}
                onClick={() => {
                  setSettings({...settings, uiScale: 'lg'});
                  storage.saveSettings({...settings, uiScale: 'lg'});
                  document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
                  document.body.classList.add('ui-size-lg');
                }}
              >
                大 (タップしやすい)
              </button>
            </div>
          </section>

          {/* プロファイル設定 */}
          <section className="settings-card glass">
            <h2>担当者プロファイル</h2>
            <p className="description">帳票の出力や共有時に使用されるあなたの情報です。</p>
            <form onSubmit={handleSave} className="settings-form">
              <div className="form-group">
                <label>自社名 / 組織名</label>
                <input 
                  type="text" 
                  value={settings.companyName} 
                  onChange={e => setSettings({...settings, companyName: e.target.value})}
                  placeholder="例：株式会社〇〇工務店"
                />
              </div>
              <div className="form-group">
                <label>担当者 氏名</label>
                <input 
                  type="text" 
                  value={settings.userName} 
                  onChange={e => setSettings({...settings, userName: e.target.value})}
                  placeholder="例：現場 太郎"
                />
              </div>
              <div className="form-group">
                <label>保有資格（肩書き）</label>
                <input 
                  type="text" 
                  value={settings.qualifications} 
                  onChange={e => setSettings({...settings, qualifications: e.target.value})}
                  placeholder="例：1級建築施工管理技士"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <Save size={18} /> 保存する
                </button>
                {saveMessage && <span className="save-msg">{saveMessage}</span>}
              </div>
            </form>
          </section>

          {/* バックアップ管理 */}
          <section className="settings-card glass">
            <h2>データ管理・バックアップ</h2>
            <p className="description">現在の大切な工程データをPCやスマホに保存、または復元します。</p>
            
            <div className="backup-actions">
              <button className="btn-action" onClick={handleExport}>
                <div className="action-icon export"><Download size={20} /></div>
                <div className="action-text">
                  <h3>バックアップを作成 (エクスポート)</h3>
                  <p>すべてのデータをファイルとして保存します</p>
                </div>
              </button>

              <label className="btn-action">
                <div className="action-icon import"><Upload size={20} /></div>
                <div className="action-text">
                  <h3>バックアップを復元 (インポート)</h3>
                  <p>保存したファイルからデータを読み込みます</p>
                </div>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>
            {importMessage && <p className="import-message">{importMessage}</p>}
            {importSummary && (
              <div className="import-preview" role="status">
                <div>
                  <h3>復元内容の確認</h3>
                  <p>{importSummary.fileName}</p>
                </div>
                <dl>
                  <div>
                    <dt>現場</dt>
                    <dd>{importSummary.projects}件</dd>
                  </div>
                  <div>
                    <dt>協力業者</dt>
                    <dd>{importSummary.partners}件</dd>
                  </div>
                  <div>
                    <dt>作成日時</dt>
                    <dd>{formatBackupDate(importSummary.exportedAt)}</dd>
                  </div>
                  <div>
                    <dt>写真</dt>
                    <dd>{importSummary.photos}枚</dd>
                  </div>
                  <div>
                    <dt>容量</dt>
                    <dd>{formatDataSize(importSummary.dataSize)}</dd>
                  </div>
                </dl>
                <p className="restore-warning">現在の保存データは、このバックアップ内容で上書きされます。</p>
                <div className="restore-actions">
                  <button type="button" className="btn btn-primary" onClick={handleConfirmImport}>
                    復元する
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancelImport}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 危険な操作 */}
          <section className="settings-card danger glass">
            <h2>初期化</h2>
            <p className="description">アプリをインストール直後の状態（デモデータのみ）に戻します。</p>
            <button className="btn-danger" onClick={handleReset}>
              <AlertTriangle size={18} /> 全データをリセットする
            </button>
          </section>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: 24px 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .header-icon {
          color: var(--primary);
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-main);
        }

        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .settings-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .settings-card h2 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 4px;
          color: var(--text-main);
        }

        .description {
          font-size: 13px;
          color: var(--text-sub);
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-sub);
          margin-bottom: 8px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 15px;
          background: var(--surface);
          transition: all 0.2s;
        }

        .form-group input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-pastel);
          outline: none;
        }

        .form-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .save-msg {
          color: var(--success);
          font-size: 13px;
          font-weight: 700;
          animation: fadeIn 0.3s ease;
        }

        .backup-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .btn-action:hover {
          background: var(--surface-hover);
          border-color: var(--border);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-icon.export { background: #e6f7ff; color: #1890ff; }
        .action-icon.import { background: #f6ffed; color: #52c41a; }

        .action-text h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 4px;
        }

        .action-text p {
          font-size: 12px;
          color: var(--text-sub);
          margin: 0;
        }

        .import-message {
          margin: 12px 0 0;
          color: var(--warning);
          font-size: 13px;
          font-weight: 800;
        }

        .import-preview {
          margin-top: 16px;
          padding: 16px;
          border: 1px solid var(--warning);
          border-radius: var(--radius-md);
          background: var(--warning-pastel);
        }

        .import-preview h3 {
          margin: 0 0 4px;
          color: var(--text-main);
          font-size: 15px;
          font-weight: 900;
        }

        .import-preview p {
          margin: 0;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .import-preview dl {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 14px 0;
        }

        .import-preview dl div {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: var(--surface);
          border: 1px solid var(--border-light);
        }

        .import-preview dt {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 800;
        }

        .import-preview dd {
          margin: 4px 0 0;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 900;
        }

        .restore-warning {
          color: var(--warning) !important;
          font-size: 13px !important;
          font-weight: 900 !important;
        }

        .restore-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .restore-actions button {
          min-height: 44px;
          flex: 1;
        }

        .settings-card.danger {
          border-color: #ffccc7;
          background: #fff1f0;
        }

        .btn-danger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #ff4d4f;
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-danger:hover {
          background: #ff7875;
        }

        .theme-toggle-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .theme-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--surface);
          color: var(--text-main);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
          min-width: 140px;
        }

        .theme-btn:hover {
          background: var(--surface-hover);
          border-color: var(--border);
        }

        .theme-btn.active {
          background: var(--primary-pastel);
          border-color: var(--primary);
          color: var(--primary);
        }

        @media (max-width: 640px) {
          .settings-page {
            padding: 16px 12px;
          }

          .settings-card {
            padding: 18px;
          }

          .import-preview dl {
            grid-template-columns: 1fr;
          }

          .restore-actions {
            flex-direction: column;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </MainLayout>
  );
}

function countBackupPhotos(projects: Project[]) {
  return projects.reduce((total, project) => {
    const taskPhotos = project.tasks.reduce((taskTotal, task) => {
      return taskTotal + (task.photos?.length || (task.photo ? 1 : 0));
    }, 0);
    const logPhotos = (project.taskLogs || []).reduce((logTotal, log) => {
      return logTotal + (log.attachments?.length || 0);
    }, 0);
    return total + taskPhotos + logPhotos;
  }, 0);
}

function formatBackupDate(value?: string) {
  if (!value) return '不明';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不明';
  return date.toLocaleString('ja-JP');
}
