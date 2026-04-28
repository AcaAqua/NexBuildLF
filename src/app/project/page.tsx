'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { ChevronLeft, Calendar, MapPin, MoreHorizontal, Plus, Camera, FileText } from "lucide-react";
import { storage, Project, Task } from "@/lib/storage";
import GanttChart from "@/components/features/GanttChart";
import Modal from "@/components/ui/Modal";
import TaskForm from "@/components/features/TaskForm";
import { IconButton } from "@/components/ui/IconButton";
import { Suspense } from 'react';

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  
  // モーダル・表示管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');

  // フィルター・ソート管理
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'date' | 'assignee'>('manual');

  // プロジェクト自体の編集
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);

  // 日次メモ管理
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [dateMemo, setDateMemo] = useState('');

  const loadData = () => {
    const data = storage.getProjects();
    const found = data.find(p => p.id === id);
    if (found) {
      setProject(found);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleEditProjectSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!project) return;
    const formData = new FormData(e.currentTarget);
    const updated: Project = {
      ...project,
      title: formData.get('title') as string || project.title,
      type: formData.get('type') as string || project.type,
      location: formData.get('location') as string || project.location,
      memo: formData.get('memo') as string || '',
    };
    storage.saveProject(updated);
    setProject(updated);
    setIsEditProjectOpen(false);
  };

  // フィルター・ソート済みのタスクを取得
  const displayTasks = useMemo(() => {
    if (!project) return [];
    
    let filtered = [...project.tasks];

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // 業者フィルター
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(t => t.assignee === assigneeFilter);
    }

    // ソート
    if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const aStart = a.periods[0]?.start || '';
        const bStart = b.periods[0]?.start || '';
        return aStart.localeCompare(bStart);
      });
    } else if (sortBy === 'assignee') {
      filtered.sort((a, b) => (a.assignee || '').localeCompare(b.assignee || ''));
    }

    return filtered;
  }, [project, statusFilter, assigneeFilter, sortBy]);

  // 全業者名のリスト（フィルター用）
  const allAssignees = useMemo(() => {
    if (!project) return [];
    const names = project.tasks.map(t => t.assignee).filter(Boolean);
    return Array.from(new Set(names));
  }, [project]);

  const handleOpenAddModal = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id'> & { id?: string }) => {
    if (!project) return;

    const updatedTasks = [...project.tasks];
    if (taskData.id) {
      // 編集
      const index = updatedTasks.findIndex(t => t.id === taskData.id);
      if (index >= 0) updatedTasks[index] = { ...taskData as Task };
    } else {
      // 新規
      updatedTasks.push({
        ...taskData,
        id: `task-${Date.now()}`,
      } as Task);
    }

    const updatedProject = { ...project, tasks: updatedTasks };
    storage.saveProject(updatedProject);
    loadData();
    setIsModalOpen(false);
  };

  const handleReorderTasks = (newTasks: Task[]) => {
    if (!project) return;
    const updated: Project = { ...project, tasks: newTasks };
    storage.saveProject(updated);
    setProject(updated);
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setDateMemo(project?.dailyMemos?.[date] || '');
    setIsDateModalOpen(true);
  };

  const handleSaveDailyMemo = () => {
    if (!project) return;
    const updatedMemos = { ...(project.dailyMemos || {}) };
    if (dateMemo.trim()) {
      updatedMemos[selectedDate] = dateMemo;
    } else {
      delete updatedMemos[selectedDate];
    }
    const updated: Project = { ...project, dailyMemos: updatedMemos };
    storage.saveProject(updated);
    setProject(updated);
    setIsDateModalOpen(false);
  };

  if (!project) return null;

  return (
    <MainLayout>
      <div className="project-detail">
        <header className="detail-header">
          <div className="header-left">
            <IconButton icon={<ChevronLeft size={24} />} className="btn-outline back-btn" onClick={() => window.history.back()} />
            <div className="title-area">
              <span className="type-tag">{project.type}</span>
              <h1>{project.title}</h1>
            </div>
          </div>
          <div className="header-right">
            <IconButton icon={<MoreHorizontal size={24} />} className="btn-outline" onClick={() => setIsEditProjectOpen(true)} title="案件情報を編集" />
          </div>
        </header>

        <section className="meta-info">
          <div className="info-item" onClick={() => setIsEditProjectOpen(true)} style={{ cursor: 'pointer' }}>
            <MapPin size={18} />
            <span>{project.location}</span>
          </div>
          <div className="info-item">
            <Calendar size={18} />
            <span>更新: {project.updatedAt}</span>
          </div>
          <div className="info-badge">
            <span className={`status-dot ${project.status}`} />
            <span>{project.status === 'in_progress' ? '進行中' : '調整中'}</span>
          </div>
          {project.memo && (
            <div className="project-memo-wide">
              <FileText size={16} />
              <p>{project.memo}</p>
            </div>
          )}
        </section>

        {isEditProjectOpen && (
          <Modal isOpen={isEditProjectOpen} title="案件情報の編集" onClose={() => setIsEditProjectOpen(false)}>
            <form onSubmit={handleEditProjectSave} className="project-form">
              <div className="form-group">
                <label>案件名</label>
                <input type="text" name="title" required defaultValue={project.title} />
              </div>
              <div className="form-group">
                <label>工事種別</label>
                <select name="type" defaultValue={project.type} aria-label="工事種別">
                  <option value="新築">新築</option>
                  <option value="改修">改修・リフォーム</option>
                  <option value="土木">土木</option>
                  <option value="その他">その他</option>
                </select>
              </div>
              <div className="form-group">
                <label>現場住所 (天気予報連動用)</label>
                <input type="text" name="location" defaultValue={project.location} />
              </div>
              <div className="form-group">
                <label>メモ・特記事項 (任意)</label>
                <textarea name="memo" rows={4} defaultValue={project.memo} placeholder="例: 進入路が狭いため小型車指定" style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: '15px' }} />
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsEditProjectOpen(false)}>キャンセル</button>
                <button type="submit" className="btn btn-primary">保存する</button>
              </div>
            </form>
          </Modal>
        )}

        <section className="content-section">
          <div className="section-header">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'gantt' ? 'active' : ''}`}
                onClick={() => setViewMode('gantt')}
              >
                工程表
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                リスト
              </button>
            </div>
            
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }}>
              <Plus size={18} />
              <span>工程追加</span>
            </button>
          </div>

          <div className="filter-bar glass">
            <div className="filter-group">
              <label>状態:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="ステータスでフィルタ">
                <option value="all">すべて</option>
                <option value="pending">未着手</option>
                <option value="doing">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>
            <div className="filter-group">
              <label>業者:</label>
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="業者でフィルタ">
                <option value="all">すべての業者</option>
                {(allAssignees as string[]).map((name: string) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>並び順:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} aria-label="並び順">
                <option value="manual">手動（カスタム）</option>
                <option value="date">日付順</option>
                <option value="assignee">業者順</option>
              </select>
            </div>
            { (statusFilter !== 'all' || assigneeFilter !== 'all') && (
              <button className="btn-clear" onClick={() => { setStatusFilter('all'); setAssigneeFilter('all'); }}>
                解除
              </button>
            ) }
          </div>
          
          {viewMode === 'gantt' ? (
            <div className="chart-wrapper">
              <GanttChart 
                tasks={displayTasks} 
                dailyMemos={project.dailyMemos}
                onUpdate={handleSaveTask}
                onEdit={handleEditTask}
                onReorder={(sortBy === 'manual' && statusFilter === 'all' && assigneeFilter === 'all') ? handleReorderTasks : undefined}
                onDateClick={handleDateClick}
              />
            </div>
          ) : (
            <div className="tasks-container">
              {displayTasks.length === 0 ? (
                <div className="empty-tasks">該当する工程が見つかりません。</div>
              ) : (
                displayTasks.map((task: Task) => (
                  <div key={task.id} className="task-item" onClick={() => handleEditTask(task)}>
                    <div className="task-info">
                      <div className="task-header">
                        <div className="color-dot" style={{ backgroundColor: task.color || '#e5e5ea' }} />
                        <div>
                          <h4>{task.title}</h4>
                          <span className="assignee-sub">{task.assignee}</span>
                        </div>
                      </div>
                      <div className="periods-list-compact">
                        {task.periods.map((p: any, i: number) => (
                          <div key={i} className="period-badge-mini">
                            {p.label || `第${i + 1}期`}: {p.start} 〜 {p.end}
                          </div>
                        ))}
                      </div>
                      {(task.memo || task.photo) && (
                        <div className="task-extras">
                          {task.memo && <div className="task-memo"><FileText size={12} /> {task.memo}</div>}
                          {task.photo && <div className="task-photo-badge"><Camera size={12} /> 写真あり</div>}
                        </div>
                      )}
                    </div>
                    <div className={`task-status ${task.status}`}>
                      {task.status === 'done' ? '完了' : task.status === 'doing' ? '進行中' : '未着手'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={editingTask ? "工程を編集" : "新しい工程を追加"}
        >
          <TaskForm 
            initialData={editingTask} 
            onSubmit={handleSaveTask} 
            onCancel={() => setIsModalOpen(false)} 
          />
        </Modal>

        {/* Daily Memo Modal */}
        <Modal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          title={`${selectedDate} のメモ`}
        >
          <div className="daily-memo-form">
            <textarea
              value={dateMemo}
              onChange={(e) => setDateMemo(e.target.value)}
              placeholder="この日の特記事項を入力..."
              rows={5}
              className="form-textarea"
              autoFocus
            />
            <div className="modal-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsDateModalOpen(false)}>キャンセル</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveDailyMemo}>保存する</button>
            </div>
          </div>
        </Modal>
      </div>

      <style jsx>{`
        .project-detail {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-main);
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: var(--surface-hover);
          transform: translateX(-4px);
        }

        .title-area {
          display: flex;
          flex-direction: column;
        }

        .type-tag {
          font-size: 11px;
          font-weight: 800;
          color: var(--primary);
          background: var(--primary-pastel);
          padding: 2px 8px;
          border-radius: 4px;
          width: fit-content;
          margin-bottom: 4px;
        }

        h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .btn-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-sub);
        }

        .meta-info {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          padding: 16px 24px;
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          align-items: center;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-sub);
          font-weight: 600;
        }

        .info-badge {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 700;
          background: var(--surface-hover);
          padding: 6px 14px;
          border-radius: 20px;
        }

        .project-memo-wide {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: var(--surface-hover);
          border-radius: var(--radius-md);
          font-size: 14px;
          color: var(--text-main);
          line-height: 1.6;
          border-left: 4px solid var(--primary);
        }

        .project-memo-wide p {
          margin: 0;
          white-space: pre-wrap;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .status-dot.in_progress { background: var(--primary); }
        .status-dot.planning { background: var(--border); }

        .content-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .view-toggle {
          display: flex;
          background: var(--surface-hover);
          padding: 4px;
          border-radius: var(--radius-md);
          gap: 4px;
        }

        .toggle-btn {
          padding: 8px 16px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-sub);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: var(--surface);
          color: var(--primary);
          box-shadow: var(--shadow-sm);
        }

        .task-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        h2 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }

        .btn-sm {
          height: 36px;
          padding: 0 12px;
          font-size: 13px;
        }

        .tasks-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .task-item {
          background: var(--surface);
          padding: 16px 20px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .task-item:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .task-info h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 700;
        }

        .task-info span {
          font-size: 12px;
          color: var(--text-sub);
        }

        .task-status {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .task-status.pending { background: var(--border-light); color: var(--text-sub); }
        .task-status.doing { background: var(--primary-pastel); color: var(--primary); }
        .task-status.done { background: var(--success-pastel); color: var(--success); }

        .empty-tasks {
          padding: 48px;
          text-align: center;
          color: var(--text-sub);
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border);
        }

        .periods-list-compact {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .period-badge-mini {
          background: var(--surface-hover);
          padding: 4px 8px;
          border-radius: 4px;
          color: var(--text-sub);
          font-size: 11px;
        }

        .task-extras {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--border-light);
        }

        .task-memo {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          color: var(--text-sub);
          line-height: 1.4;
          white-space: pre-wrap;
        }

        .task-photo-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--primary);
          background: var(--primary-pastel);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 700;
          align-self: flex-start;
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          align-items: center;
          margin-bottom: 8px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-sub);
          margin: 0;
        }

        .filter-group select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
          background: var(--surface);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .btn-clear {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          color: #ff3b30;
          background: #fff1f0;
          border: 1px solid #ffccc7;
          border-radius: 8px;
          cursor: pointer;
          margin-left: auto;
        }

        .assignee-sub {
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          opacity: 0.8;
          display: block;
        }
      `}</style>
    </MainLayout>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
      <ProjectDetailContent />
    </Suspense>
  );
}
