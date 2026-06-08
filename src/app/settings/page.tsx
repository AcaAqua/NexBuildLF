'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Settings, Save, Download, Upload, AlertTriangle, Moon, Sun, Monitor, Smartphone, Tablet, Camera, HardDrive, Wifi, CheckCircle2, AlertCircle, RotateCcw, ListChecks, Fingerprint, ZoomIn, ClipboardCheck, Share2 } from "lucide-react";
import { useTheme } from "next-themes";
import { getStorageWriteErrorMessage, storage, Settings as SettingsType, Project, Partner } from "@/lib/storage";
import { formatDataSize } from "@/lib/photoUtils";

type SettingsTab = 'display' | 'profile' | 'data' | 'field';

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
  diff: ImportDiff;
}

interface DiffCounts {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

interface ImportDiff {
  projects: DiffCounts;
  partners: DiffCounts;
  currentPhotos: number;
  incomingPhotos: number;
  photoDelta: number;
}

interface FieldDeviceCheck {
  label: string;
  detail: string;
  status: 'ok' | 'warn';
  icon: React.ElementType;
}

interface FieldOperationCheck {
  label: string;
  detail: string;
  href: string;
  icon: React.ElementType;
}

interface ReleaseGateItem {
  label: string;
  detail: string;
}

const FIELD_OPERATION_CHECKS: FieldOperationCheck[] = [
  {
    label: '工程を2回タップ',
    detail: '工程表のバーを2回タップして編集画面が開く',
    href: '/project',
    icon: Fingerprint,
  },
  {
    label: '工程表をピンチ',
    detail: '指で広げる/つまむ操作で日付幅が変わる',
    href: '/project',
    icon: ZoomIn,
  },
  {
    label: '写真を添付',
    detail: '工程編集または工程記録で撮影/選択して保存する',
    href: '/project',
    icon: Camera,
  },
  {
    label: '日報を入力',
    detail: 'スマホ幅で入力欄と保存ボタンが見切れない',
    href: '/meeting',
    icon: ClipboardCheck,
  },
  {
    label: 'バックアップ確認',
    detail: '作成と復元プレビューの件数・上書き警告を見る',
    href: '/settings',
    icon: HardDrive,
  },
];

const RELEASE_GATE_ITEMS: ReleaseGateItem[] = [
  {
    label: 'スマホ縦向き',
    detail: '工程追加、2回タップ編集、ピンチ拡大縮小、写真保存を実機で確認',
  },
  {
    label: 'タブレット横向き',
    detail: '工程名、期間、状態、日付、記録タイムラインの見切れを確認',
  },
  {
    label: 'オフライン/PWA',
    detail: 'ホーム画面起動、通信遮断時の表示、端末内保存の維持を確認',
  },
  {
    label: 'データ保全',
    detail: 'バックアップ作成、復元プレビュー、上書き警告、写真枚数を確認',
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({ companyName: '', userName: '', qualifications: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [pendingImport, setPendingImport] = useState<BackupData | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [fieldChecks, setFieldChecks] = useState<FieldDeviceCheck[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');

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

  const createBackupData = (): BackupData => ({
      app: 'kouteikanri',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: storage.getProjects(),
      partners: storage.getPartners(),
      settings: storage.getSettings()
  });

  const createBackupFile = () => {
    const data = createBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const fileName = `kouteikanri_share_${new Date().toISOString().split('T')[0]}.json`;
    return new File([jsonStr], fileName, { type: 'application/json' });
  };

  const downloadBackupFile = (file: File) => {
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('share', 'backup');
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    downloadBackupFile(createBackupFile());
  };

  const handleShare = async () => {
    setShareMessage('');
    const file = createBackupFile();

    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: '工程管理データ',
          text: '工程管理 Proの共有データです。同じアプリの設定画面から取り込み前に差分確認できます。',
          files: [file],
        });
        setShareMessage('共有データを送信しました。');
        return;
      }

      downloadBackupFile(file);
      setShareMessage('この端末では直接共有に未対応のため、共有用ファイルを保存しました。LINE・メールへ添付してください。');
    } catch (error) {
      downloadBackupFile(file);
      setShareMessage('共有を完了できなかったため、共有用ファイルを保存しました。');
    }
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
          diff: buildImportDiff(data),
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
        <nav className="settings-tabs glass" role="tablist" aria-label="設定カテゴリ">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'display'}
            className={`settings-tab ${activeTab === 'display' ? 'active' : ''}`}
            onClick={() => setActiveTab('display')}
          >
            <Monitor size={18} />
            <span>表示</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Settings size={18} />
            <span>プロファイル</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'data'}
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <HardDrive size={18} />
            <span>データ</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'field'}
            className={`settings-tab ${activeTab === 'field' ? 'active' : ''}`}
            onClick={() => setActiveTab('field')}
          >
            <Smartphone size={18} />
            <span>現場確認</span>
          </button>
        </nav>

        <div className="settings-grid">
          {/* 表示・テーマ設定 */}
          {activeTab === 'display' && (
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
          )}

          {/* プロファイル設定 */}
          {activeTab === 'profile' && (
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
          )}

          {/* バックアップ管理 */}
          {activeTab === 'data' && (
          <>
          <section className="settings-card glass">
            <h2>データ管理・バックアップ</h2>
            <p className="description">同じアプリ同士で共有用データを送り、受信側で差分を確認してから取り込みます。</p>
            
            <div className="backup-actions">
              <button className="btn-action share" onClick={handleShare}>
                <div className="action-icon share"><Share2 size={20} /></div>
                <div className="action-text">
                  <h3>LINE・メール・端末共有で送る</h3>
                  <p>スマホの共有シートから相手へJSONデータを渡します</p>
                </div>
              </button>

              <button className="btn-action" onClick={handleExport}>
                <div className="action-icon export"><Download size={20} /></div>
                <div className="action-text">
                  <h3>共有用ファイルを保存</h3>
                  <p>Wi-Fi転送やメール添付用に端末へ保存します</p>
                </div>
              </button>

              <label className="btn-action">
                <div className="action-icon import"><Upload size={20} /></div>
                <div className="action-text">
                  <h3>受け取ったデータを差分チェック</h3>
                  <p>取り込み前に現場・業者・写真の増減を確認します</p>
                </div>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>
            {shareMessage && <p className="share-message" role="status">{shareMessage}</p>}
            {importMessage && <p className="import-message">{importMessage}</p>}
            {importSummary && (
              <div className="import-preview" role="status">
                <div>
                  <h3>取り込み前の差分確認</h3>
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
                <div className="diff-panel" aria-label="現在の端末との差分">
                  <div className="diff-row">
                    <strong>現場</strong>
                    <span className="diff-add">追加 {importSummary.diff.projects.added}</span>
                    <span className="diff-update">更新 {importSummary.diff.projects.updated}</span>
                    <span className="diff-remove">消える {importSummary.diff.projects.removed}</span>
                  </div>
                  <div className="diff-row">
                    <strong>協力業者</strong>
                    <span className="diff-add">追加 {importSummary.diff.partners.added}</span>
                    <span className="diff-update">更新 {importSummary.diff.partners.updated}</span>
                    <span className="diff-remove">消える {importSummary.diff.partners.removed}</span>
                  </div>
                  <div className="diff-row">
                    <strong>写真</strong>
                    <span>{importSummary.diff.currentPhotos}枚 → {importSummary.diff.incomingPhotos}枚</span>
                    <span className={importSummary.diff.photoDelta >= 0 ? 'diff-add' : 'diff-remove'}>
                      {importSummary.diff.photoDelta >= 0 ? '+' : ''}{importSummary.diff.photoDelta}
                    </span>
                  </div>
                </div>
                <p className="restore-warning">取り込むと現在の端末データは、この共有データで上書きされます。</p>
                <div className="restore-actions">
                  <button type="button" className="btn btn-primary" onClick={handleConfirmImport}>
                    この内容で取り込む
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancelImport}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="settings-card danger glass">
            <h2>初期化</h2>
            <p className="description">アプリをインストール直後の状態（デモデータのみ）に戻します。</p>
            <button className="btn-danger" onClick={handleReset}>
              <AlertTriangle size={18} /> 全データをリセットする
            </button>
          </section>
          </>
          )}

          {activeTab === 'field' && (
          <>
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
            <div className="operation-check-panel">
              <div className="operation-check-heading">
                <ListChecks size={18} />
                <h3>実機で触って確認する操作</h3>
              </div>
              <div className="operation-check-list">
                {FIELD_OPERATION_CHECKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.label} className="operation-check-item" href={item.href}>
                      <span className="operation-check-icon">
                        <Icon size={18} />
                      </span>
                      <span className="operation-check-text">
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="settings-card glass release-gate-card">
            <div className="release-gate-heading">
              <AlertCircle size={20} />
              <div>
                <h2>配布前ゲート</h2>
                <p className="description">配布作業の前に、現場端末で必ず確認する残項目です。</p>
              </div>
            </div>
            <div className="release-gate-list" aria-label="配布前に残る実機確認項目">
              {RELEASE_GATE_ITEMS.map((item) => (
                <div key={item.label} className="release-gate-item">
                  <span className="release-gate-status">未確認</span>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </>
          )}
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: 0;
          max-width: 920px;
          margin: 0 auto;
        }

        .settings-tabs {
          position: sticky;
          top: 0;
          z-index: 8;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          padding: 8px;
          border-radius: var(--radius-lg);
          margin-bottom: 14px;
        }

        .settings-tab {
          min-height: 54px;
          border: none;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-sub);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }

        .settings-tab.active {
          background: var(--primary);
          color: var(--text-on-primary);
          box-shadow: var(--shadow-sm);
        }

        .settings-tab svg {
          flex-shrink: 0;
        }

        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
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

        .btn-action.share {
          border-color: var(--primary);
          background: var(--primary-pastel);
        }

        .action-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-icon.share { background: var(--primary); color: var(--text-on-primary); }
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

        .share-message,
        .import-message {
          margin: 12px 0 0;
          font-size: 13px;
          font-weight: 800;
        }

        .share-message {
          color: var(--primary);
        }

        .import-message {
          color: var(--warning);
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

        .diff-panel {
          display: grid;
          gap: 8px;
          margin: 14px 0;
        }

        .diff-row {
          display: grid;
          grid-template-columns: 92px repeat(3, minmax(0, 1fr));
          gap: 8px;
          align-items: center;
          padding: 10px;
          border-radius: var(--radius-sm);
          background: var(--surface);
          border: 1px solid var(--border-light);
        }

        .diff-row strong {
          color: var(--text-main);
          font-size: 12px;
          font-weight: 900;
        }

        .diff-row span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--surface-hover);
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .diff-row .diff-add {
          background: var(--success-pastel);
          color: var(--success);
        }

        .diff-row .diff-update {
          background: var(--primary-pastel);
          color: var(--primary);
        }

        .diff-row .diff-remove {
          background: #fff1f0;
          color: var(--danger);
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

        .operation-check-panel {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid var(--border-light);
        }

        .operation-check-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: var(--text-main);
        }

        .operation-check-heading svg {
          color: var(--primary);
        }

        .operation-check-heading h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
        }

        .operation-check-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .operation-check-item {
          min-height: 62px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--surface);
          color: inherit;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .operation-check-item:hover {
          border-color: var(--primary);
          background: var(--surface-hover);
        }

        .operation-check-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .operation-check-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .operation-check-text strong {
          color: var(--text-main);
          font-size: 13px;
          font-weight: 900;
        }

        .operation-check-text span {
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .release-gate-card {
          border-color: var(--warning);
          background: var(--warning-pastel);
        }

        .release-gate-heading {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .release-gate-heading svg {
          color: var(--warning);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .release-gate-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .release-gate-item {
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 12px;
          border: 1px solid rgba(255, 149, 0, 0.42);
          border-radius: var(--radius-md);
          background: var(--surface);
        }

        .release-gate-status {
          min-height: 28px;
          border-radius: 999px;
          background: var(--warning-pastel);
          color: var(--warning);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
        }

        .release-gate-item strong {
          display: block;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .release-gate-item p {
          margin: 0;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.5;
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
            padding: 0;
          }

          .settings-tabs {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 4px;
            padding: 6px;
            margin-left: -4px;
            margin-right: -4px;
          }

          .settings-tab {
            min-height: 52px;
            flex-direction: column;
            gap: 3px;
            font-size: 10px;
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

          .release-gate-item {
            grid-template-columns: 1fr;
          }

          .import-preview dl {
            grid-template-columns: 1fr;
          }

          .diff-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .diff-row span {
            justify-content: flex-start;
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

function countDiff<T extends { id: string }>(currentItems: T[], incomingItems: T[]): DiffCounts {
  const currentMap = new Map(currentItems.map((item) => [item.id, item]));
  const incomingMap = new Map(incomingItems.map((item) => [item.id, item]));

  let added = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;

  incomingMap.forEach((incoming, id) => {
    const current = currentMap.get(id);
    if (!current) {
      added += 1;
      return;
    }
    if (JSON.stringify(current) === JSON.stringify(incoming)) {
      unchanged += 1;
      return;
    }
    updated += 1;
  });

  currentMap.forEach((_, id) => {
    if (!incomingMap.has(id)) removed += 1;
  });

  return { added, updated, removed, unchanged };
}

function buildImportDiff(incoming: BackupData): ImportDiff {
  const currentProjects = storage.getProjects();
  const currentPartners = storage.getPartners();
  const currentPhotos = countBackupPhotos(currentProjects);
  const incomingPhotos = countBackupPhotos(incoming.projects);

  return {
    projects: countDiff(currentProjects, incoming.projects),
    partners: countDiff(currentPartners, incoming.partners),
    currentPhotos,
    incomingPhotos,
    photoDelta: incomingPhotos - currentPhotos,
  };
}

function formatBackupDate(value?: string) {
  if (!value) return '不明';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不明';
  return date.toLocaleString('ja-JP');
}
