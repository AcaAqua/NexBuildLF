'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Settings, Save, Download, Upload, AlertTriangle, Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { storage, Settings as SettingsType } from "@/lib/storage";

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsType>({ companyName: '', userName: '', qualifications: '' });
  const [saveMessage, setSaveMessage] = useState('');
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
    const data = {
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.projects) localStorage.setItem('kouteikanri_projects', JSON.stringify(data.projects));
        if (data.partners) localStorage.setItem('kouteikanri_partners', JSON.stringify(data.partners));
        if (data.settings) storage.saveSettings(data.settings);
        alert('データを復元しました。ページをリロードします。');
        window.location.reload();
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
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

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </MainLayout>
  );
}
