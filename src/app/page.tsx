'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import Modal from "@/components/ui/Modal";
import { motion } from "framer-motion";
import { LayoutGrid, ListFilter, Plus, Archive, ArchiveRestore, Trash2, MapPin, Calendar } from "lucide-react";
import { storage, Project } from "@/lib/storage";
import Link from 'next/link';
import { IconButton } from "@/components/ui/IconButton";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportMenu } from "@/components/ui/ExportMenu";

export default function Home() {
// ... existing state and logic ...

  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // フィルタ状態
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const filtered = projects.filter(p => !p.isArchived &&
    (typeFilter === 'all' || p.type === typeFilter) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (companyFilter === '' || (p.title + p.location + (p.memo || '')).toLowerCase().includes(companyFilter.toLowerCase()))
  );
  const displayProjects = filtered;

  return (
    <MainLayout>
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-text">
            <h1>ダッシュボード</h1>
            <p>現在の進行状況と主要な現場を確認できます</p>
          </div>
          <div className="header-actions">
            <IconButton
              onClick={() => setIsModalOpen(true)}
              icon={<Plus size={20} />}
              className="btn-primary add-btn"
              aria-label="新規現場を追加"
            >
              新規現場
            </IconButton>
            <ExportMenu 
              data={displayProjects} 
              headers={['id', 'title', 'type', 'status', 'location', 'progress', 'updatedAt', 'memo']} 
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

        <FilterBar
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          companyFilter={companyFilter}
          setCompanyFilter={setCompanyFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        <section className="stats-row">
          <div className="stat-pill">進行中: {projects.filter(p => p.status === 'in_progress').length}</div>
          <div className="stat-pill warning">遅延: {projects.filter(p => p.status === 'delayed').length}</div>
          <div className="stat-pill success">完了: {projects.filter(p => p.status === 'completed').length}</div>
        </section>
        <ExportMenu data={projects} headers={['id','title','type','status','location','progress','updatedAt','memo']} />

        <section className="projects-grid">
          {displayProjects.length === 0 ? (
            <div className="empty-state glass">
              <p>案件がありません。「新規現場」ボタンから追加してください。</p>
            </div>
          ) : (
            displayProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, display: 'flex', gap: '8px' }}>
                  <Link 
                    href={`/meeting?projectId=${project.id}`}
                    title="打ち合わせモード (全画面)"
                    style={{ background: 'var(--primary-pastel)', color: 'var(--primary)', padding: '6px', borderRadius: '6px', border: '1px solid var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <LayoutGrid size={16} />
                  </Link>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => handleArchive(project, e)}
                    title={project.isArchived ? "復元する" : "アーカイブする"}
                    style={{ background: 'var(--surface)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    {project.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={(e) => handleDelete(project.id, e)}
                    title="完全に削除"
                    style={{ background: '#fff1f0', color: '#ff4d4f', padding: '6px', borderRadius: '6px', border: '1px solid #ffccc7', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <ProjectCard {...project} />
              </motion.div>
            ))
          )}
        </section>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .dashboard-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .dashboard-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }

        h1 {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.8px;
          margin-bottom: 8px;
          color: var(--text-main);
        }

        .header-text p {
          color: var(--text-sub);
          font-size: 15px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .add-btn {
          height: 48px;
          box-shadow: var(--shadow-md);
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
          padding: 8px 16px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
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
          gap: 20px;
        }

        .empty-state {
          padding: 64px 32px;
          text-align: center;
          border-radius: var(--radius-xl);
          color: var(--text-sub);
          border: 1px dashed var(--border);
        }

        @media (min-width: 1024px) {
          .projects-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </MainLayout>
  );
}
