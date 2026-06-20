'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Settings, Save, Download, Upload, AlertTriangle, Moon, Sun, Monitor, Smartphone, Tablet, Camera, HardDrive, Wifi, CheckCircle2, AlertCircle, RotateCcw, ListChecks, Fingerprint, ZoomIn, ClipboardCheck, Share2 } from "lucide-react";
import { useTheme } from "next-themes";
import { getStorageWriteErrorMessage, Settings as SettingsType, Project, Partner } from "@/lib/storage";
import { formatDataSize } from "@/lib/photoUtils";
import { analyzeProjectAttachments, hydrateProjectAttachments, persistProjectAttachments, type AttachmentCompactionStats } from "@/lib/attachmentStore";
import { partnerRepository } from "@/lib/partnerRepository";
import { projectRepository } from "@/lib/projectRepository";
import { settingsRepository } from "@/lib/settingsRepository";

type SettingsTab = 'display' | 'profile' | 'data' | 'field';
type ShareMode = 'all' | 'projects' | 'partners';
type ImportMode = 'add' | 'merge' | 'replace';

const SHARE_MODE_META: Record<ShareMode, { label: string; detail: string; scope: BackupScope }> = {
  all: {
    label: '全データ',
    detail: '現場・業者・設定をまとめて共有',
    scope: { projects: true, partners: true, settings: true },
  },
  projects: {
    label: '現場のみ',
    detail: '工程表・記録・写真を共有',
    scope: { projects: true, partners: false, settings: false },
  },
  partners: {
    label: '業者のみ',
    detail: '協力業者マスターだけ共有',
    scope: { projects: false, partners: true, settings: false },
  },
};

const IMPORT_MODE_META: Record<ImportMode, { label: string; detail: string }> = {
  add: {
    label: '追加のみ',
    detail: '既存の現場・業者は変更せず、新しいデータだけ追加',
  },
  merge: {
    label: '追加＋更新',
    detail: '同じIDの現場・業者は共有データで更新',
  },
  replace: {
    label: '全復元',
    detail: '対象範囲を共有データで置き換え',
  },
};

interface BackupScope {
  projects: boolean;
  partners: boolean;
  settings: boolean;
}

interface BackupData {
  app?: string;
  version?: number;
  exportedAt?: string;
  shareScope?: BackupScope;
  shareLabel?: string;
  checkCode?: string;
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
  scope: BackupScope;
  scopeLabel: string;
  checkCode: string;
}

interface DiffCounts {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  addedItems: string[];
  updatedItems: string[];
  removedItems: string[];
}

interface ImportDiff {
  projects: DiffCounts;
  partners: DiffCounts;
  currentPhotos: number;
  incomingPhotos: number;
  photoDelta: number;
  isFullRestore: boolean;
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
  const [compactMessage, setCompactMessage] = useState('');
  const [isCompacting, setIsCompacting] = useState(false);
  const [compactionStats, setCompactionStats] = useState<AttachmentCompactionStats | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>('all');
  const [importMode, setImportMode] = useState<ImportMode>('add');
  const [fieldChecks, setFieldChecks] = useState<FieldDeviceCheck[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('display');

  useEffect(() => {
    setSettings(settingsRepository.get());
    setMounted(true);
    refreshFieldChecks();
    refreshCompactionStats();
  }, []);

  const refreshCompactionStats = () => {
    if (typeof window === 'undefined') return;
    setCompactionStats(analyzeProjectAttachments(projectRepository.listAll()));
  };

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
      settingsRepository.save(settings);
      setSaveMessage('設定を保存しました。');
      // UIスケールの変更を即時反映させる
      document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
      document.body.classList.add(`ui-size-${settings.uiScale || 'md'}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(getStorageWriteErrorMessage(error, '設定を保存'));
    }
  };

  const createBackupData = async (): Promise<BackupData> => {
    const mode = SHARE_MODE_META[shareMode];
    const projects = mode.scope.projects
      ? await Promise.all(projectRepository.listAll().map(hydrateProjectAttachments))
      : [];
    const data: BackupData = {
      app: 'kouteikanri',
      version: 1,
      exportedAt: new Date().toISOString(),
      shareScope: mode.scope,
      shareLabel: mode.label,
      projects,
      partners: mode.scope.partners ? partnerRepository.list() : [],
      settings: mode.scope.settings ? settingsRepository.get() : { companyName: '', userName: '', qualifications: '', uiScale: 'md' },
    };
    data.checkCode = createCheckCode(JSON.stringify({ ...data, checkCode: '' }));
    return data;
  };

  const createBackupFile = async () => {
    const data = await createBackupData();
    const jsonStr = JSON.stringify(data, null, 2);
    const suffix = shareMode === 'all' ? 'all' : shareMode;
    const fileName = `kouteikanri_share_${suffix}_${new Date().toISOString().split('T')[0]}.json`;
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

  const handleExport = async () => {
    downloadBackupFile(await createBackupFile());
  };

  const handleShare = async () => {
    setShareMessage('');
    const file = await createBackupFile();

    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: '工程管理データ',
          text: `${SHARE_MODE_META[shareMode].label}の共有データです。同じアプリの設定画面から差分確認できます。`,
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
        const scope = getBackupScope(data);
        setPendingImport(data);
        setImportMode('add');
        setImportSummary({
          projects: data.projects.length,
          partners: data.partners.length,
          photos: countBackupPhotos(data.projects),
          dataSize: file.size,
          exportedAt: data.exportedAt,
          fileName: file.name,
          diff: buildImportDiff(data),
          scope,
          scopeLabel: data.shareLabel || getScopeLabel(scope),
          checkCode: data.checkCode || createCheckCode(JSON.stringify(data)),
        });
      } catch (err) {
        setImportMessage('ファイルの読み込みに失敗しました。');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    try {
      const scope = getBackupScope(pendingImport);
      const isFullRestore = importMode === 'replace';
      if (scope.projects) {
        const projects = await Promise.all(pendingImport.projects.map(persistProjectAttachments));
        projectRepository.replaceAll(applyImportedItems(projectRepository.listAll(), projects, importMode));
      }
      if (scope.partners) {
        partnerRepository.replaceAll(applyImportedItems(partnerRepository.list(), pendingImport.partners, importMode));
      }
      if (scope.settings && isFullRestore) {
        settingsRepository.save(pendingImport.settings);
      }
      refreshCompactionStats();
      setImportMessage(
        isFullRestore
          ? `${getScopeLabel(scope)}を復元しました。画面を更新します。`
          : importMode === 'merge'
            ? `${getScopeLabel(scope)}を追加/更新しました。他の端末内データは保持しています。画面を更新します。`
            : `${getScopeLabel(scope)}の新規データだけを追加しました。既存データは変更していません。画面を更新します。`,
      );
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      setImportMessage(getStorageWriteErrorMessage(error, 'バックアップを復元'));
    }
  };

  const handleCancelImport = () => {
    setPendingImport(null);
    setImportSummary(null);
    setImportMessage('');
    setImportMode('add');
  };

  const handleCompactStorage = async () => {
    if (isCompacting) return;
    setCompactMessage('');

    try {
      setIsCompacting(true);
      const currentProjects = projectRepository.listAll();
      const before = analyzeProjectAttachments(currentProjects);

      if (before.inlineAttachmentCount === 0) {
        setCompactMessage('軽量化が必要な写真はありません。');
        setCompactionStats(before);
        return;
      }

      const compactedProjects = await Promise.all(currentProjects.map(persistProjectAttachments));
      const after = analyzeProjectAttachments(compactedProjects);
      projectRepository.replaceAll(compactedProjects);
      setCompactionStats(after);

      const savedBytes = Math.max(before.jsonBytes - after.jsonBytes, 0);
      setCompactMessage(
        `${before.inlineAttachmentCount}枚の写真を端末内ストアへ移しました。保存JSONを約${formatDataSize(savedBytes)}軽量化しました。`,
      );
    } catch (error) {
      setCompactMessage(getStorageWriteErrorMessage(error, '保存データを軽量化'));
    } finally {
      setIsCompacting(false);
    }
  };

  const handleReset = () => {
    if (confirm('すべてのプロジェクト・業者データが削除され、デモ状態に戻ります。本当によろしいですか？')) {
      projectRepository.clearAll();
      partnerRepository.clearAll();
      settingsRepository.clear();
      projectRepository.seedDemoIfEmpty(); // デモデータを再生成
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
                  settingsRepository.save({...settings, uiScale: 'sm'});
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
                  settingsRepository.save({...settings, uiScale: 'md'});
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
                  settingsRepository.save({...settings, uiScale: 'lg'});
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

            <div className="share-scope-panel" aria-label="共有範囲">
              {Object.entries(SHARE_MODE_META).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={`share-scope-btn ${shareMode === key ? 'active' : ''}`}
                  onClick={() => setShareMode(key as ShareMode)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>

            <div className="share-flow">
              <div><span>1</span>共有範囲を選ぶ</div>
              <div><span>2</span>LINE・メール等で送る</div>
              <div><span>3</span>受信側で差分確認</div>
            </div>
            
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
            <div className="compact-storage-panel">
              <div className="compact-storage-main">
                <div className="action-icon compact"><HardDrive size={20} /></div>
                <div>
                  <h3>保存データを軽量化</h3>
                  <p>既存のbase64写真を端末内ストアへ移し、工程データ本体を軽くします。</p>
                </div>
              </div>
              <dl className="compact-storage-stats">
                <div>
                  <dt>JSON容量</dt>
                  <dd>{formatDataSize(compactionStats?.jsonBytes || 0)}</dd>
                </div>
                <div>
                  <dt>未分離写真</dt>
                  <dd>{compactionStats?.inlineAttachmentCount || 0}枚</dd>
                </div>
                <div>
                  <dt>写真容量</dt>
                  <dd>{formatDataSize(compactionStats?.inlineAttachmentBytes || 0)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="btn btn-outline compact-storage-btn"
                onClick={handleCompactStorage}
                disabled={isCompacting || (compactionStats?.inlineAttachmentCount || 0) === 0}
              >
                <HardDrive size={18} />
                {isCompacting ? '軽量化中' : '保存データを軽量化'}
              </button>
              {compactMessage && <p className="compact-message" role="status">{compactMessage}</p>}
            </div>
            {importSummary && (
              <div className="import-preview" role="status">
                <div>
                  <h3>取り込み前の差分確認</h3>
                  <p>{importSummary.fileName}</p>
                </div>
                <dl>
                  <div>
                    <dt>共有範囲</dt>
                    <dd>{importSummary.scopeLabel}</dd>
                  </div>
                  <div>
                    <dt>確認コード</dt>
                    <dd>{importSummary.checkCode}</dd>
                  </div>
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
                  {importSummary.scope.projects && (
                  <div className="diff-block">
                    <div className="diff-row">
                      <strong>現場</strong>
                      <span className="diff-add">追加 {importSummary.diff.projects.added}</span>
                      <span className="diff-update">更新 {importSummary.diff.projects.updated}</span>
                      <span className={importSummary.diff.isFullRestore ? 'diff-remove' : 'diff-keep'}>
                        {importSummary.diff.isFullRestore ? `消える ${importSummary.diff.projects.removed}` : '他は保持'}
                      </span>
                    </div>
                    <DiffItemList counts={importSummary.diff.projects} />
                  </div>
                  )}
                  {importSummary.scope.partners && (
                  <div className="diff-block">
                    <div className="diff-row">
                      <strong>協力業者</strong>
                      <span className="diff-add">追加 {importSummary.diff.partners.added}</span>
                      <span className="diff-update">更新 {importSummary.diff.partners.updated}</span>
                      <span className={importSummary.diff.isFullRestore ? 'diff-remove' : 'diff-keep'}>
                        {importSummary.diff.isFullRestore ? `消える ${importSummary.diff.partners.removed}` : '他は保持'}
                      </span>
                    </div>
                    <DiffItemList counts={importSummary.diff.partners} />
                  </div>
                  )}
                  {importSummary.scope.projects && (
                  <div className="diff-row">
                    <strong>写真</strong>
                    <span>{importSummary.diff.currentPhotos}枚 → {importSummary.diff.incomingPhotos}枚</span>
                    <span className={importSummary.diff.photoDelta >= 0 ? 'diff-add' : 'diff-remove'}>
                      {importSummary.diff.photoDelta >= 0 ? '+' : ''}{importSummary.diff.photoDelta}
                    </span>
                  </div>
                  )}
                </div>
                <p className="restore-warning">
                  {getImportModeWarning(importMode)}
                </p>
                <div className="import-mode-panel" aria-label="取り込み方式">
                  {(importSummary.diff.isFullRestore
                    ? (['add', 'merge', 'replace'] as ImportMode[])
                    : (['add', 'merge'] as ImportMode[])
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`import-mode-btn ${importMode === mode ? 'active' : ''}`}
                      onClick={() => setImportMode(mode)}
                    >
                      <strong>{IMPORT_MODE_META[mode].label}</strong>
                      <span>{IMPORT_MODE_META[mode].detail}</span>
                    </button>
                  ))}
                </div>
                <div className="restore-actions">
                  <button type="button" className="btn btn-primary" onClick={handleConfirmImport}>
                    {IMPORT_MODE_META[importMode].label}で取り込む
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

        .share-scope-panel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          margin-bottom: 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface-hover);
        }

        .share-scope-btn {
          min-height: 72px;
          padding: 10px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-sub);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
        }

        .share-scope-btn strong {
          color: var(--text-main);
          font-size: 13px;
          font-weight: 900;
        }

        .share-scope-btn span {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.35;
        }

        .share-scope-btn.active {
          background: #ffffff;
          border-color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .share-scope-btn.active strong,
        .share-scope-btn.active span {
          color: var(--primary);
        }

        .share-flow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .share-flow div {
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: #ffffff;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 900;
        }

        .share-flow span {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--primary);
          color: var(--text-on-primary);
          font-size: 12px;
          font-weight: 900;
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
        .action-icon.compact { background: var(--warning-pastel); color: var(--warning); }

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

        .compact-storage-panel {
          margin-top: 14px;
          padding: 14px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--surface);
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .compact-storage-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .compact-storage-main h3 {
          margin: 0 0 4px;
          color: var(--text-main);
          font-size: 15px;
          font-weight: 900;
        }

        .compact-storage-main p {
          margin: 0;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        .compact-storage-stats {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }

        .compact-storage-stats div {
          padding: 10px;
          border-radius: var(--radius-sm);
          background: var(--surface-hover);
          border: 1px solid var(--border-light);
        }

        .compact-storage-stats dt {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
        }

        .compact-storage-stats dd {
          margin: 2px 0 0;
          color: var(--text-main);
          font-size: 15px;
          font-weight: 900;
        }

        .compact-storage-btn {
          min-width: 190px;
          font-weight: 900;
        }

        .compact-storage-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .compact-message {
          grid-column: 1 / -1;
          margin: 0;
          color: var(--primary);
          font-size: 13px;
          font-weight: 900;
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
          gap: 10px;
          margin: 14px 0;
        }

        .diff-block {
          display: grid;
          gap: 8px;
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

        .diff-row .diff-keep {
          background: var(--surface-hover);
          color: var(--text-sub);
        }

        :global(.diff-item-list) {
          list-style: none;
          display: grid;
          gap: 6px;
          margin: 0;
          padding: 0;
        }

        :global(.diff-item-list li),
        :global(.diff-item-empty) {
          min-height: 34px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.64);
          border: 1px solid var(--border-light);
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 800;
        }

        :global(.diff-item-list li span) {
          flex: 0 0 auto;
          min-width: 38px;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--primary-pastel);
          color: var(--primary);
          text-align: center;
          font-size: 11px;
          font-weight: 900;
        }

        :global(.diff-item-list li strong) {
          color: var(--text-main);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.diff-item-more) {
          justify-content: center;
          color: var(--text-sub) !important;
        }

        .restore-warning {
          color: var(--warning) !important;
          font-size: 13px !important;
          font-weight: 900 !important;
        }

        .import-mode-panel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 14px 0 0;
        }

        .import-mode-btn {
          min-height: 74px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-main);
          text-align: left;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .import-mode-btn.active {
          border-color: var(--primary);
          background: var(--primary-pastel);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 18%, transparent);
        }

        .import-mode-btn strong {
          font-size: 13px;
          font-weight: 900;
        }

        .import-mode-btn span {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.45;
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

          .share-scope-panel,
          .share-flow {
            grid-template-columns: 1fr;
          }

          .diff-row {
            grid-template-columns: 1fr;
            align-items: stretch;
          }

          .diff-row span {
            justify-content: flex-start;
          }

          .import-mode-panel {
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

function DiffItemList({ counts }: { counts: DiffCounts }) {
  const items = [
    ...counts.addedItems.map((label) => ({ label, type: '追加' })),
    ...counts.updatedItems.map((label) => ({ label, type: '更新' })),
    ...counts.removedItems.map((label) => ({ label, type: '削除' })),
  ].slice(0, 6);

  if (items.length === 0) {
    return <p className="diff-item-empty">変更明細はありません。</p>;
  }

  return (
    <ul className="diff-item-list" aria-label="差分明細">
      {items.map((item, index) => (
        <li key={`${item.type}-${item.label}-${index}`} className={`diff-item-${item.type}`}>
          <span>{item.type}</span>
          <strong>{item.label}</strong>
        </li>
      ))}
      {counts.added + counts.updated + counts.removed > items.length && (
        <li className="diff-item-more">
          ほか {counts.added + counts.updated + counts.removed - items.length} 件
        </li>
      )}
    </ul>
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

function applyImportedItems<T extends { id: string }>(currentItems: T[], incomingItems: T[], mode: ImportMode) {
  if (mode === 'replace') return incomingItems;
  if (mode === 'add') {
    const currentIds = new Set(currentItems.map((item) => item.id));
    return [...currentItems, ...incomingItems.filter((item) => !currentIds.has(item.id))];
  }
  return mergeById(currentItems, incomingItems);
}

function mergeById<T extends { id: string }>(currentItems: T[], incomingItems: T[]) {
  const merged = new Map(currentItems.map((item) => [item.id, item]));
  incomingItems.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function getImportModeWarning(mode: ImportMode) {
  if (mode === 'replace') {
    return '全復元を選ぶと、対象範囲は共有データで置き換わります。既存データが消える可能性があります。';
  }
  if (mode === 'merge') {
    return '追加＋更新では、同じIDの現場・業者だけ共有データで更新し、それ以外の端末内データは保持します。';
  }
  return '追加のみでは、同じIDの既存データは変更せず、新しい現場・業者だけ追加します。';
}

function countDiff<T extends { id: string }>(
  currentItems: T[],
  incomingItems: T[],
  getLabel: (item: T) => string,
  includeRemoved: boolean,
): DiffCounts {
  const currentMap = new Map(currentItems.map((item) => [item.id, item]));
  const incomingMap = new Map(incomingItems.map((item) => [item.id, item]));

  let added = 0;
  let updated = 0;
  let removed = 0;
  let unchanged = 0;
  const addedItems: string[] = [];
  const updatedItems: string[] = [];
  const removedItems: string[] = [];

  incomingMap.forEach((incoming, id) => {
    const current = currentMap.get(id);
    if (!current) {
      added += 1;
      addedItems.push(getLabel(incoming));
      return;
    }
    if (JSON.stringify(current) === JSON.stringify(incoming)) {
      unchanged += 1;
      return;
    }
    updated += 1;
    updatedItems.push(getLabel(incoming));
  });

  if (includeRemoved) {
    currentMap.forEach((current, id) => {
      if (!incomingMap.has(id)) {
        removed += 1;
        removedItems.push(getLabel(current));
      }
    });
  }

  return { added, updated, removed, unchanged, addedItems, updatedItems, removedItems };
}

function buildImportDiff(incoming: BackupData): ImportDiff {
  const scope = getBackupScope(incoming);
  const isFullRestore = isFullBackupScope(scope);
  const currentProjects = projectRepository.listAll();
  const currentPartners = partnerRepository.list();
  const incomingProjectIds = new Set(incoming.projects.map((project) => project.id));
  const relevantCurrentProjects = isFullRestore
    ? currentProjects
    : currentProjects.filter((project) => incomingProjectIds.has(project.id));
  const currentPhotos = countBackupPhotos(relevantCurrentProjects);
  const incomingPhotos = countBackupPhotos(incoming.projects);

  return {
    projects: countDiff(currentProjects, incoming.projects, getProjectDiffLabel, isFullRestore),
    partners: countDiff(currentPartners, incoming.partners, getPartnerDiffLabel, isFullRestore),
    currentPhotos,
    incomingPhotos,
    photoDelta: incomingPhotos - currentPhotos,
    isFullRestore,
  };
}

function isFullBackupScope(scope: BackupScope) {
  return scope.projects && scope.partners && scope.settings;
}

function getProjectDiffLabel(project: Project) {
  const updated = project.updatedAt ? ` / 更新 ${project.updatedAt}` : '';
  return `${project.title || '無題の現場'}${updated}`;
}

function getPartnerDiffLabel(partner: Partner) {
  return `${partner.name || '名称未設定'}${partner.company ? ` / ${partner.company}` : ''}`;
}

function getBackupScope(data: BackupData): BackupScope {
  return data.shareScope || { projects: true, partners: true, settings: true };
}

function getScopeLabel(scope: BackupScope) {
  if (scope.projects && scope.partners && scope.settings) return '全データ';
  if (scope.projects && !scope.partners) return '現場のみ';
  if (!scope.projects && scope.partners) return '業者のみ';
  return '共有データ';
}

function createCheckCode(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().slice(0, 6).padStart(6, '0');
}

function formatBackupDate(value?: string) {
  if (!value) return '不明';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不明';
  return date.toLocaleString('ja-JP');
}
