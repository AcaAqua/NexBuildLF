'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Settings, Save, Download, Upload, AlertTriangle, Moon, Sun, Monitor, Smartphone, Tablet, Camera, HardDrive, Wifi, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import { getStorageWriteErrorMessage, storage, Settings as SettingsType, Project, Partner } from "@/lib/storage";
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

interface FieldDeviceCheck {
  label: string;
  detail: string;
  status: 'ok' | 'warn';
  icon: React.ElementType;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({ companyName: '', userName: '', qualifications: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [fieldChecks, setFieldChecks] = useState<FieldDeviceCheck[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(storage.getSettings());
    setMounted(true);
    refreshFieldChecks();
  }, []);

  const refreshFieldChecks = async () => {
    if (typeof window === 'undefined') return;

    const viewportWidth = window.innerWidth;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    const touchPoints = navigator.maxTouchPoints || 0;
    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    const hasCameraFileInput = 'capture' in cameraInput && 'accept' in cameraInput;
    const storageEstimate = await navigator.storage?.estimate?.();
    const quota = storageEstimate?.quota || 0;
    const usage = storageEstimate?.usage || 0;
    const freeBytes = Math.max(quota - usage, 0);
    const freeRatio = quota > 0 ? freeBytes / quota : 1;

    setFieldChecks([
      {
        label: '画面幅',
        detail: viewportWidth >= 768
          ? `タブレット幅 ${viewportWidth}px`
          : `スマホ幅 ${viewportWidth}px`,
        status: viewportWidth >= 360 ? 'ok' : 'warn',
        icon: viewportWidth >= 768 ? Tablet : Smartphone,
      },
      {
        label: 'タッチ操作',
        detail: touchPoints > 0 ? `${touchPoints}点タッチを検出` : 'タッチ点数を検出できません',
        status: touchPoints > 0 ? 'ok' : 'warn',
        icon: Smartphone,
      },
      {
        label: 'PWA起動',
        detail: isStandalone ? 'ホーム画面起動中' : 'ブラウザ表示中',
        status: isStandalone ? 'ok' : 'warn',
        icon: Wifi,
      },
      {
        label: '写真入力',
        detail: hasCameraFileInput ? 'カメラ/写真選択に対応' : '端末側で要確認',
        status: hasCameraFileInput ? 'ok' : 'warn',
        icon: Camera,
      },
      {
        label: '端末保存',
        detail: quota > 0 ? `空き目安 ${formatDataSize(freeBytes)}` : '容量推定は未対応',
        status: quota === 0 || freeRatio > 0.15 ? 'ok' : 'warn',
        icon: HardDrive,
      },
    ]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      storage.saveSettings(settings);
      setSaveMessage('設定を保存しました。');
      // UIスケールの変更を即時反映させる
      document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
      document.body.classList.add(`ui-size-${settings.uiScale || 'md'}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(getStorageWriteErrorMessage(error, '設定を保存'));
    }
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
      setImportMessage(getStorageWriteErrorMessage(error, 'バックアップを復元'));
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
                {saveMessage && (
                  <span className={`save-msg ${saveMessage.includes('できません') ? 'error' : ''}`} role="status">
                    {saveMessage}
                  </span>
                )}
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

          <section className="settings-card glass field-check-card">
            <div className="field-check-header">
              <div>
                <h2>現場端末セルフチェック</h2>
                <p className="description">スマホ・タブレットで開いた端末状態を確認します。</p>
              </div>
              <button type="button" className="btn btn-outline btn-refresh" onClick={refreshFieldChecks}>
                <RotateCcw size={16} />
                再確認
              </button>
            </div>
            <div className="field-check-grid" aria-label="現場端末セルフチェック結果">
              {fieldChecks.map((item) => {
                const Icon = item.icon;
                const StatusIcon = item.status === 'ok' ? CheckCircle2 : AlertCircle;
                return (
                  <div key={item.label} className={`field-check-item ${item.status}`}>
                    <div className="field-check-icon">
                      <Icon size={20} />
                    </div>
                    <div className="field-check-text">
                      <span>{item.label}</span>
                      <strong>{item.detail}</strong>
                    </div>
                    <StatusIcon className="field-check-status" size={18} />
                  </div>
                );
              })}
            </div>
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

        .save-msg.error {
          color: var(--warning);
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

        .field-check-card {
          border-color: var(--primary-pastel);
        }

        .field-check-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .btn-refresh {
          min-width: 112px;
          min-height: 44px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .field-check-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .field-check-item {
          min-height: 76px;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 24px;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--surface);
        }

        .field-check-item.ok {
          border-color: var(--success);
          background: var(--success-pastel);
        }

        .field-check-item.warn {
          border-color: var(--warning);
          background: var(--warning-pastel);
        }

        .field-check-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          background: var(--surface);
          border: 1px solid var(--border-light);
        }

        .field-check-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .field-check-text span {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
        }

        .field-check-text strong {
          color: var(--text-main);
          font-size: 13px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .field-check-status {
          color: var(--success);
        }

        .field-check-item.warn .field-check-status {
          color: var(--warning);
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

          .field-check-header {
            flex-direction: column;
          }

          .btn-refresh {
            width: 100%;
          }

          .field-check-grid {
            grid-template-columns: 1fr;
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
