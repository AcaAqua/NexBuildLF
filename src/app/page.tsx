'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import Modal from "@/components/ui/Modal";
import { motion } from "framer-motion";
import { LayoutGrid, Plus, Archive, ArchiveRestore, Trash2, Share2 } from "lucide-react";
import { storage, Project } from "@/lib/storage";
import Link from 'next/link';
import { IconButton } from "@/components/ui/IconButton";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { shareProject } from "@/lib/projectShare";

export default function Home() {
// ... existing state and logic ...

  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // フィルタ状態
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shareMessage, setShareMessage] = useState('');
  useEffect(() => {
    storage.seed();
    setProjects(storage.getProjects());
  }, []);

  const handleAddProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: formData.get('title') as string || '新規現場',
      type: formData.get('type') as string || '新築',
      status: 'planning',
      location: formData.get('location') as string || '未設定',
      memo: formData.get('memo') as string || '',
      progress: 0,
      updatedAt: new Date().toLocaleDateString('ja-JP'),
      tasks: [],
      isArchived: false
    };
    storage.saveProject(newProj);
    setProjects(storage.getProjects());
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // カードのリンク遷移を防ぐ
    if (confirm('本当に削除しますか？アーカイブ化ではなく完全に消去されます。')) {
      storage.deleteProject(id);
      setProjects(storage.getProjects());
    }
  };

  const handleArchive = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('この現場をアーカイブ（保管室）へ移動しますか？')) {
      storage.saveProject({ ...project, isArchived: true });
      setProjects(storage.getProjects());
    }
  };

  const handleShare = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await shareProject(project);
    setShareMessage(
      result === 'shared'
        ? '案件の共有を開始しました。'
        : '案件の共有ファイルを保存しました。メール・LINEなどへ添付できます。'
    );
  };

  const filtered = projects.filter(p => !p.isArchived &&
    (typeFilter === 'all' || p.type === typeFilter) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (companyFilter === '' || (p.title + p.location + (p.memo || '')).toLowerCase().includes(companyFilter.toLowerCase()))
  );
  const displayProjects = filtered;

  return (
    <MainLayout>
      <div className="dashboard-container">
        <header className="dashboard-toolbar glass" aria-label="現場一覧操作">
          <FilterBar
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            companyFilter={companyFilter}
            setCompanyFilter={setCompanyFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
          <div className="header-actions">
            <IconButton
              onClick={() => setIsModalOpen(true)}
              icon={<Plus size={20} />}
              className="btn-primary add-btn icon-only-action"
              aria-label="新規現場を追加"
              title="新規現場を追加"
            >
            </IconButton>
            <ExportMenu 
              data={displayProjects} 
              headers={['id', 'title', 'type', 'status', 'location', 'progress', 'updatedAt', 'memo']} 
              compact
            />
          </div>
        </header>

        {isModalOpen && (
          <Modal isOpen={isModalOpen} title="新規現場の作成" onClose={() => setIsModalOpen(false)}>
            <form onSubmit={handleAddProject} className="project-form">
              <div className="form-group">
                <label>工事名・現場名 (必須)</label>
                <input type="text" name="title" required placeholder="例: 鶴岡市〇〇邸 新築工事" />
              </div>
              <div className="form-group">
                <label>工事種別</label>
                <select name="type" aria-label="工事種別を選択">
                  <option value="新築">新築</option>
                  <option value="改修">改修・リフォーム</option>
                  <option value="土木">土木</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="form-group">
                <label>現場住所 (天気予報連動用)</label>
                <input type="text" name="location" placeholder="例: 山形県鶴岡市下名川" />
              </div>
              <div className="form-group">
                <label>メモ・特記事項 (任意)</label>
                <textarea name="memo" rows={3} placeholder="例: 進入路が狭いため小型車指定" style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '15px' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>キャンセル</button>
                <button type="submit" className="btn btn-primary">作成する</button>
              </div>
            </form>
          </Modal>
        )}

        <section className="stats-row">
          <div className="stat-pill">進行中: {projects.filter(p => p.status === 'in_progress').length}</div>
          <div className="stat-pill warning">遅延: {projects.filter(p => p.status === 'delayed').length}</div>
          <div className="stat-pill success">完了: {projects.filter(p => p.status === 'completed').length}</div>
        </section>

        {shareMessage && (
          <div className="dashboard-notice" role="status">
            {shareMessage}
          </div>
        )}

        <section className="projects-grid">
          {displayProjects.length === 0 ? (
            <div className="empty-state glass">
              <p>案件がありません。「新規現場」ボタンから追加してください。</p>
            </div>
          ) : (
            displayProjects.map((project, index) => (
              <div key={project.id} className="project-card-shell">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                <div className="project-card-actions">
                  <button
                    className="project-action-btn share"
                    onClick={(e) => handleShare(project, e)}
                    title="この案件だけ共有"
                    aria-label="この案件だけ共有"
                  >
                    <Share2 size={16} />
                  </button>
                  <Link 
                    href={`/meeting?projectId=${project.id}`}
                    title="打ち合わせモード (全画面)"
                    aria-label="打ち合わせモード (全画面)"
                    className="project-action-btn meeting"
                    style={{ width: 44, minWidth: 44, height: 44, flex: '0 0 44px' }}
                  >
                    <LayoutGrid size={16} />
                  </Link>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => handleArchive(project, e)}
                    title={project.isArchived ? "復元する" : "アーカイブする"}
                  >
                    {project.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => handleDelete(project.id, e)}
                    title="完全に削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <ProjectCard {...project} />
                </motion.div>
              </div>
            ))
          )}
        </section>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dashboard-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex: 0 0 auto;
        }

        .icon-only-action,
        :global(.icon-only) {
          width: 48px;
          min-width: 48px;
          height: 48px;
          padding: 0;
          box-shadow: var(--shadow-md);
        }

        :global(.filter-bar) {
          flex: 1 1 auto;
          min-width: 0;
          margin: 0;
        }

        .stats-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .stats-row::-webkit-scrollbar {
          display: none;
        }

        .stat-pill {
          background: var(--primary-pastel);
          color: var(--primary);
          padding: 9px 16px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
          border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
        }

        .stat-pill.warning {
          background: var(--danger-pastel);
          color: var(--danger);
        }

        .stat-pill.success {
          background: #f6ffed;
          color: #52c41a;
          border-color: #b7eb8f;
        }

        .dashboard-notice {
          padding: 12px 14px;
          border-radius: var(--radius-md);
          border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent);
          background: var(--primary-pastel);
          color: var(--primary);
          font-size: 13px;
          font-weight: 900;
        }

        .project-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-sub);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .project-card-shell {
          position: relative;
          border-radius: var(--radius-lg);
          background: #ffffff;
          border: 1px solid var(--border);
          box-shadow: 0 18px 40px rgba(26, 43, 64, 0.12);
          overflow: hidden;
        }

        .project-card-actions {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 10;
          display: flex;
          gap: 8px;
        }

        .project-action-btn,
        .delete-btn {
          width: 44px;
          min-width: 44px;
          height: 44px;
          flex: 0 0 44px;
          box-sizing: border-box;
          padding: 0;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-main);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(26, 43, 64, 0.12);
          transition: all 0.2s;
        }

        .project-card-actions a {
          min-width: 44px;
          width: 44px;
          flex-basis: 44px;
        }

        .project-action-btn.meeting {
          color: var(--primary);
          border-color: var(--primary);
          background: #f7fbff;
        }

        .project-action-btn.share {
          color: #ffffff;
          border-color: var(--primary);
          background: var(--primary);
        }

        .delete-btn:last-child {
          color: var(--danger);
          border-color: #ffccc7;
          background: #fff7f7;
        }

        .project-action-btn:hover,
        .delete-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .empty-state {
          padding: 64px 32px;
          text-align: center;
          border-radius: var(--radius-xl);
          color: var(--text-sub);
          border: 1px dashed var(--border);
        }

        @media (max-width: 760px) {
          .dashboard-container {
            gap: 12px;
          }

          .dashboard-toolbar {
            align-items: stretch;
            padding: 10px;
          }

          .header-actions {
            flex-direction: column;
          }

          .icon-only-action,
          :global(.icon-only) {
            width: 48px;
            height: 48px;
          }
        }
      `}</style>
    </MainLayout>
  );
}
