'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { ChevronLeft, Calendar, MapPin, MoreHorizontal, Plus, Camera, FileText, Pencil, Copy, Trash2, PauseCircle } from "lucide-react";
import { storage, Project, Task, TaskLog, TaskLogAttachment, Period } from "@/lib/storage";
import GanttChart from "@/components/features/GanttChart";
import Modal from "@/components/ui/Modal";
import TaskForm from "@/components/features/TaskForm";
import { IconButton } from "@/components/ui/IconButton";
import { Suspense } from 'react';

const taskStatusLabels: Record<Task['status'], string> = {
  pending: '未着手',
  doing: '進行中',
  done: '完了',
  hold: '保留',
};

const taskLogTypeLabels: Record<TaskLog['type'], string> = {
  memo: 'メモ',
  photo: '写真',
  change: '変更',
  handoff: '申し送り',
};

const getTaskPeriods = (task: Task): Period[] => {
  if (task.periods && task.periods.length > 0) return task.periods;
  const start = task.startDate || task.start_date;
  if (!start) return [];
  const end = task.endDate || task.end_date || start;
  return [{ start, end }];
};

const getTaskDateRange = (task: Task) => {
  const periods = getTaskPeriods(task);
  const first = periods[0];
  const last = periods[periods.length - 1];
  return {
    start: first?.start || '',
    end: last?.end || first?.end || '',
  };
};

function ProjectDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  
  // モーダル・表示管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

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

  // 工程記録管理
  const [logPanelTask, setLogPanelTask] = useState<Task | null>(null);
  const [logPanelDate, setLogPanelDate] = useState<string>('');
  const [logTitle, setLogTitle] = useState('');
  const [logBody, setLogBody] = useState('');
  const [logAttachments, setLogAttachments] = useState<TaskLogAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<TaskLogAttachment | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'selected'>('all');
  const [timelineTaskId, setTimelineTaskId] = useState<string>('');

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
        const aStart = getTaskDateRange(a).start;
        const bStart = getTaskDateRange(b).start;
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

  const taskById = useMemo(() => {
    if (!project) return new Map<string, Task>();
    return new Map(project.tasks.map(task => [task.id, task]));
  }, [project]);

  const timelineLogs = useMemo(() => {
    if (!project) return [];
    return [...(project.taskLogs || [])]
      .filter(log => timelineFilter === 'all' || !timelineTaskId || log.taskId === timelineTaskId)
      .sort((a, b) => {
        const bTime = b.createdAt || b.logDate;
        const aTime = a.createdAt || a.logDate;
        return bTime.localeCompare(aTime);
      });
  }, [project, timelineFilter, timelineTaskId]);

  const selectedTimelineTask = timelineTaskId ? taskById.get(timelineTaskId) : undefined;

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

  const getTaskLogs = (taskId?: string, logDate?: string) => {
    if (!project) return [];
    return (project.taskLogs || [])
      .filter(log => (!taskId || log.taskId === taskId) && (!logDate || log.logDate === logDate))
      .sort((a, b) => a.logDate.localeCompare(b.logDate) || a.createdAt.localeCompare(b.createdAt));
  };

  const handleOpenTaskLog = (task: Task, date: string) => {
    setLogPanelTask(task);
    setLogPanelDate(date);
    setLogTitle('');
    setLogBody('');
    setLogAttachments([]);
  };

  const handleViewTaskHistory = (task: Task) => {
    setTimelineTaskId(task.id);
    setTimelineFilter('selected');
    setLogPanelTask(null);
  };

  const handleLogImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const now = new Date().toISOString();
    const images = await Promise.all(files.map(async (file, index) => ({
      id: `att-${Date.now()}-${index}`,
      fileName: file.name,
      fileType: file.type,
      dataUrl: await readFileAsDataUrl(file),
      createdAt: now,
    })));

    setLogAttachments(prev => [...prev, ...images]);
    event.target.value = '';
  };

  const handleRemoveLogAttachment = (attachmentId: string) => {
    setLogAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId));
  };

  const handleSaveTaskLog = () => {
    if (!project || !logPanelTask || (!logBody.trim() && logAttachments.length === 0)) return;

    const now = new Date().toISOString();
    const newLog: TaskLog = {
      id: `log-${Date.now()}`,
      projectId: project.id,
      taskId: logPanelTask.id,
      logDate: logPanelDate,
      type: logAttachments.length > 0 ? 'photo' : 'memo',
      title: logTitle.trim() || (logAttachments.length > 0 ? '写真記録' : 'メモ'),
      body: logBody.trim(),
      attachments: logAttachments.length > 0 ? logAttachments : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const updated: Project = {
      ...project,
      taskLogs: [...(project.taskLogs || []), newLog],
    };
    storage.saveProject(updated);
    setProject(updated);
    setLogTitle('');
    setLogBody('');
    setLogAttachments([]);
  };

  const saveTasks = (tasks: Task[]) => {
    if (!project) return;
    const updated: Project = { ...project, tasks };
    storage.saveProject(updated);
    setProject(updated);
  };

  const handleUpdateTaskStatus = (task: Task, status: Task['status']) => {
    if (!project) return;
    saveTasks(project.tasks.map(t => t.id === task.id ? { ...t, status } : t));
  };

  const handleDuplicateTask = (task: Task) => {
    if (!project) return;
    const duplicated: Task = {
      ...task,
      id: `task-${Date.now()}`,
      title: `${task.title} コピー`,
      periods: getTaskPeriods(task).map(period => ({ ...period })),
    };
    saveTasks([...project.tasks, duplicated]);
  };

  const handleDeleteTask = (task: Task) => {
    if (!project) return;
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
    saveTasks(project.tasks.filter(t => t.id !== task.id));
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
            <div className="section-title">
              <h2>工程表</h2>
              <span>工程バーを中心に日程と担当を確認</span>
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
                <option value="hold">保留</option>
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
          
          <div className="chart-wrapper gantt-primary">
            <GanttChart
              tasks={displayTasks}
              dailyMemos={project.dailyMemos}
              taskLogs={project.taskLogs}
              onUpdate={handleSaveTask}
              onEdit={handleEditTask}
              onReorder={(sortBy === 'manual' && statusFilter === 'all' && assigneeFilter === 'all') ? handleReorderTasks : undefined}
              onDateClick={handleDateClick}
              onOpenTaskLog={handleOpenTaskLog}
            />
          </div>

          <div className="task-list-panel">
            <div className="task-list-header">
              <span>工程名</span>
              <span>担当者</span>
              <span>開始日</span>
              <span>終了日</span>
              <span>状態</span>
              <span>記録</span>
              <span>操作</span>
            </div>
            {displayTasks.length === 0 ? (
              <div className="empty-tasks">該当する工程が見つかりません。</div>
            ) : (
              displayTasks.map((task: Task) => {
                const range = getTaskDateRange(task);
                const taskLogCount = getTaskLogs(task.id).length;
                return (
                  <div key={task.id} className="task-list-row" onClick={() => handleEditTask(task)}>
                    <div className="task-name-cell">
                      <div className="color-dot" style={{ backgroundColor: task.color || '#e5e5ea' }} />
                      <div>
                        <h4>{task.title}</h4>
                        {(task.memo || task.photo) && (
                          <div className="task-extras-inline">
                            {task.memo && <span><FileText size={12} />メモ</span>}
                            {task.photo && <span><Camera size={12} />写真</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="task-text-cell">{task.assignee || '未設定'}</div>
                    <div className="task-text-cell">{range.start || '-'}</div>
                    <div className="task-text-cell">{range.end || '-'}</div>
                    <div>
                      <select
                        className={`status-select ${task.status}`}
                        value={task.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateTaskStatus(task, e.target.value as Task['status'])}
                        aria-label={`${task.title} の状態`}
                      >
                        {Object.entries(taskStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="task-log-action-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="task-log-action"
                        onClick={() => handleOpenTaskLog(task, range.start || new Date().toISOString().slice(0, 10))}
                      >
                        <FileText size={14} />
                        {taskLogCount > 0 ? `記録 ${taskLogCount}` : '記録'}
                      </button>
                    </div>
                    <div className="task-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-action" onClick={() => handleEditTask(task)} title="編集">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-action" onClick={() => handleDuplicateTask(task)} title="複製">
                        <Copy size={16} />
                      </button>
                      <button type="button" className="icon-action hold-action" onClick={() => handleUpdateTaskStatus(task, 'hold')} title="保留">
                        <PauseCircle size={16} />
                      </button>
                      <button type="button" className="icon-action danger-action" onClick={() => handleDeleteTask(task)} title="削除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="task-log-timeline-panel">
            <div className="timeline-panel-header">
              <div>
                <h3>工程記録タイムライン</h3>
                <p>
                  {timelineFilter === 'selected' && selectedTimelineTask
                    ? `${selectedTimelineTask.title} の記録`
                    : '全工程の記録'}
                </p>
              </div>
              <div className="timeline-panel-actions">
                <span className="timeline-count">記録 {timelineLogs.length}件</span>
                <div className="timeline-filter">
                  <button
                    type="button"
                    className={timelineFilter === 'all' ? 'active' : ''}
                    onClick={() => setTimelineFilter('all')}
                  >
                    全体
                  </button>
                  <button
                    type="button"
                    className={timelineFilter === 'selected' ? 'active' : ''}
                    disabled={!timelineTaskId}
                    onClick={() => setTimelineFilter('selected')}
                  >
                    選択工程のみ
                  </button>
                </div>
              </div>
            </div>

            {timelineLogs.length === 0 ? (
              <div className="timeline-empty">
                {timelineFilter === 'selected' ? '選択中の工程記録はまだありません。' : '工程記録はまだありません。'}
              </div>
            ) : (
              <div className="task-log-timeline-list">
                {timelineLogs.map((log) => {
                  const task = taskById.get(log.taskId);
                  const taskLogCount = getTaskLogs(log.taskId).length;
                  return (
                    <article key={log.id} className="timeline-log-item">
                      <div className="timeline-date">
                        <strong>{formatLogDateFull(log.logDate)}</strong>
                        <span>{formatLogCreatedAt(log.createdAt)}</span>
                      </div>
                      <div className="timeline-card">
                        <div className="timeline-card-head">
                          <span className="timeline-task-name">{task?.title || '工程未設定'}</span>
                          <span className="timeline-task-count">記録 {taskLogCount}件</span>
                        </div>
                        <h4>{log.title}</h4>
                        <p>{log.body}</p>
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="log-attachment-thumbs">
                            {log.attachments.map((attachment) => (
                              <button
                                type="button"
                                key={attachment.id}
                                className="log-attachment-thumb"
                                onClick={() => setPreviewAttachment(attachment)}
                                aria-label={`${attachment.fileName} を拡大表示`}
                              >
                                <img src={attachment.dataUrl} alt={attachment.fileName} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
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

        <Modal
          isOpen={!!logPanelTask}
          onClose={() => setLogPanelTask(null)}
          title="工程記録"
        >
          {logPanelTask && (
            <div className="task-log-panel">
              <div className="task-log-summary">
                <div>
                  <h3>{logPanelTask.title}</h3>
                  <p>{logPanelDate}</p>
                </div>
                <div className="task-log-summary-actions">
                  <strong>記録 {getTaskLogs(logPanelTask.id).length}件</strong>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleViewTaskHistory(logPanelTask)}>
                    履歴を見る
                  </button>
                </div>
              </div>

              <div className="task-log-form">
                <div className="form-group">
                  <label>記録タイトル</label>
                  <input
                    type="text"
                    value={logTitle}
                    onChange={(e) => setLogTitle(e.target.value)}
                    placeholder="例: 雨天対応"
                  />
                </div>
                <div className="form-group">
                  <label>メモ</label>
                  <textarea
                    value={logBody}
                    onChange={(e) => setLogBody(e.target.value)}
                    placeholder="現場の状況、変更理由、申し送りを記録"
                    rows={4}
                    className="form-textarea"
                  />
                </div>
                <div className="form-group">
                  <label>写真</label>
                  <label className="image-picker">
                    <Camera size={18} />
                    <span>画像を選択</span>
                    <input type="file" accept="image/*" multiple onChange={handleLogImageSelect} />
                  </label>
                  {logAttachments.length > 0 && (
                    <div className="selected-attachments">
                      {logAttachments.map((attachment) => (
                        <div key={attachment.id} className="selected-attachment">
                          <button
                            type="button"
                            className="selected-attachment-preview"
                            onClick={() => setPreviewAttachment(attachment)}
                            aria-label={`${attachment.fileName} を拡大表示`}
                          >
                            <img src={attachment.dataUrl} alt={attachment.fileName} />
                          </button>
                          <button
                            type="button"
                            className="selected-attachment-remove"
                            onClick={() => handleRemoveLogAttachment(attachment.id)}
                          >
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-primary" onClick={handleSaveTaskLog}>
                  <Plus size={16} /> 記録追加
                </button>
              </div>

              <div className="task-log-list">
                {getTaskLogs(logPanelTask.id).length === 0 ? (
                  <div className="empty-log">この工程の記録はまだありません。</div>
                ) : (
                  getTaskLogs(logPanelTask.id).map((log) => (
                    <article key={log.id} className="task-log-item">
                      <div className="task-log-date">{formatLogDate(log.logDate)}</div>
                      <div className="task-log-card">
                        <span className={`task-log-type ${log.type}`}>{taskLogTypeLabels[log.type]}</span>
                        <h4>{log.title}</h4>
                        <p>{log.body}</p>
                        {log.attachments && log.attachments.length > 0 && (
                          <div className="log-attachment-thumbs">
                            {log.attachments.map((attachment) => (
                              <button
                                type="button"
                                key={attachment.id}
                                className="log-attachment-thumb"
                                onClick={() => setPreviewAttachment(attachment)}
                                aria-label={`${attachment.fileName} を拡大表示`}
                              >
                                <img src={attachment.dataUrl} alt={attachment.fileName} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
          title={previewAttachment?.fileName || '写真'}
        >
          {previewAttachment && (
            <div className="attachment-preview-modal">
              <img src={previewAttachment.dataUrl} alt={previewAttachment.fileName} />
            </div>
          )}
        </Modal>

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
          gap: 16px;
        }

        .section-title {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .section-title span {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-sub);
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

        .chart-wrapper {
          min-height: 360px;
        }

        .chart-wrapper :global(.gantt-wrapper) {
          min-height: 360px;
          border-radius: var(--radius-md);
        }

        .chart-wrapper :global(.gantt-container) {
          min-height: 360px;
        }

        .chart-wrapper :global(.task-bar-container) {
          height: 40px;
        }

        .task-list-panel {
          background: var(--surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .task-list-header,
        .task-list-row {
          display: grid;
          grid-template-columns: minmax(220px, 2fr) minmax(140px, 1fr) 120px 120px 120px 104px 168px;
          align-items: center;
          gap: 12px;
        }

        .task-list-header {
          min-height: 40px;
          padding: 0 16px;
          background: var(--background);
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 800;
          border-bottom: 1px solid var(--border-light);
        }

        .task-list-row {
          min-height: 50px;
          padding: 6px 16px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: background 0.2s;
        }

        .task-list-row:last-child {
          border-bottom: none;
        }

        .task-list-row:hover {
          background: var(--surface-hover);
        }

        .task-name-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .task-name-cell h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-text-cell {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-extras-inline {
          display: flex;
          gap: 8px;
          margin-top: 3px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-sub);
        }

        .task-extras-inline span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .status-select {
          width: 100%;
          height: 34px;
          border-radius: 9px;
          border: 1px solid var(--border-light);
          background: var(--surface);
          font-size: 12px;
          font-weight: 800;
          padding: 0 10px;
          outline: none;
        }

        .status-select.pending {
          color: var(--text-sub);
          background: var(--surface-hover);
        }

        .status-select.doing {
          color: var(--primary);
          background: var(--primary-pastel);
          border-color: var(--primary);
        }

        .status-select.done {
          color: var(--success);
          background: var(--success-pastel);
          border-color: var(--success);
        }

        .status-select.hold {
          color: var(--warning);
          background: var(--warning-pastel);
          border-color: var(--warning);
        }

        .task-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }

        .task-log-action-cell {
          display: flex;
          justify-content: flex-start;
        }

        .task-log-action {
          height: 34px;
          padding: 0 10px;
          border: 1px solid var(--primary);
          border-radius: 9px;
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .task-log-action:hover {
          background: var(--primary);
          color: var(--text-on-primary);
        }

        .icon-action {
          width: 34px;
          height: 34px;
          border: 1px solid var(--border-light);
          border-radius: 9px;
          background: var(--surface);
          color: var(--text-sub);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-action:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: var(--primary-pastel);
        }

        .hold-action:hover {
          color: var(--warning);
          border-color: var(--warning);
          background: var(--warning-pastel);
        }

        .danger-action:hover {
          color: var(--danger);
          border-color: var(--danger);
          background: var(--danger-pastel);
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
        .task-status.hold { background: var(--warning-pastel); color: var(--warning); }

        .empty-tasks {
          padding: 48px;
          text-align: center;
          color: var(--text-sub);
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border);
        }

        .task-log-timeline-panel {
          background: var(--surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .timeline-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 18px;
          background: var(--background);
          border-bottom: 1px solid var(--border-light);
        }

        .timeline-panel-header h3 {
          margin: 0;
          font-size: 17px;
          font-weight: 900;
        }

        .timeline-panel-header p {
          margin: 4px 0 0;
          font-size: 12px;
          font-weight: 800;
          color: var(--text-sub);
        }

        .timeline-panel-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .timeline-count {
          height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 900;
        }

        .timeline-filter {
          display: inline-flex;
          padding: 3px;
          border: 1px solid var(--border-light);
          border-radius: 10px;
          background: var(--surface);
        }

        .timeline-filter button {
          height: 32px;
          padding: 0 12px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .timeline-filter button.active {
          background: var(--primary);
          color: var(--text-on-primary);
        }

        .timeline-filter button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .task-log-timeline-list {
          display: flex;
          flex-direction: column;
        }

        .timeline-log-item {
          display: grid;
          grid-template-columns: 132px 1fr;
          gap: 16px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-light);
        }

        .timeline-log-item:last-child {
          border-bottom: none;
        }

        .timeline-date {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          color: var(--text-sub);
          font-weight: 800;
          padding-top: 4px;
        }

        .timeline-date strong {
          color: var(--text-main);
          font-size: 13px;
        }

        .timeline-date span {
          font-size: 11px;
        }

        .timeline-card {
          position: relative;
          padding: 14px 16px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--surface);
        }

        .timeline-card::before {
          content: "";
          position: absolute;
          top: 20px;
          left: -22px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 0 4px var(--primary-pastel);
        }

        .timeline-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .timeline-task-name {
          color: var(--primary);
          font-size: 12px;
          font-weight: 900;
        }

        .timeline-task-count {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .timeline-card h4 {
          margin: 0 0 6px;
          color: var(--text-main);
          font-size: 15px;
          font-weight: 900;
        }

        .timeline-card p {
          margin: 0;
          color: var(--text-main);
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .log-attachment-thumbs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .log-attachment-thumb {
          width: 72px;
          height: 72px;
          padding: 0;
          border: 1px solid var(--border-light);
          border-radius: 10px;
          background: var(--surface-hover);
          overflow: hidden;
          cursor: pointer;
        }

        .log-attachment-thumb img,
        .selected-attachment-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .timeline-empty {
          padding: 28px;
          text-align: center;
          color: var(--text-sub);
          font-weight: 700;
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
          padding: 14px 20px;
          background: var(--surface);
          backdrop-filter: blur(10px);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
          align-items: center;
          margin-bottom: 8px;
        }

        :global(.dark) .filter-bar {
          background: rgba(32, 34, 38, 0.92);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), var(--shadow-sm);
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

        .task-log-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .task-log-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-radius: var(--radius-md);
          background: var(--surface-hover);
          border: 1px solid var(--border-light);
        }

        .task-log-summary h3 {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 800;
        }

        .task-log-summary p {
          margin: 0;
          color: var(--text-sub);
          font-weight: 700;
          font-size: 13px;
        }

        .task-log-summary strong {
          color: var(--primary);
          white-space: nowrap;
          font-size: 13px;
        }

        .task-log-summary-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .task-log-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-log-form .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .task-log-form label {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-sub);
        }

        .task-log-form input,
        .task-log-form textarea {
          width: 100%;
          min-height: 44px;
          font-size: 15px;
        }

        .task-log-form .btn {
          min-height: 48px;
          font-size: 15px;
        }

        .image-picker {
          min-height: 48px;
          padding: 0 14px;
          border: 1px dashed var(--primary);
          border-radius: var(--radius-md);
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .image-picker input {
          display: none;
        }

        .selected-attachments {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
          gap: 10px;
        }

        .selected-attachment {
          position: relative;
          border: 1px solid var(--border-light);
          border-radius: 12px;
          background: var(--surface);
          overflow: hidden;
        }

        .selected-attachment-preview {
          width: 100%;
          aspect-ratio: 1;
          padding: 0;
          border: none;
          background: var(--surface-hover);
          cursor: pointer;
          display: block;
        }

        .selected-attachment-remove {
          width: 100%;
          min-height: 32px;
          border: none;
          border-top: 1px solid var(--border-light);
          background: var(--surface);
          color: var(--danger);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .task-log-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .task-log-item {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 12px;
          align-items: flex-start;
        }

        .task-log-date {
          color: var(--text-sub);
          font-size: 13px;
          font-weight: 800;
          padding-top: 10px;
          text-align: right;
        }

        .task-log-card {
          padding: 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--surface);
        }

        .task-log-type {
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--primary-pastel);
          color: var(--primary);
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 8px;
        }

        .task-log-card h4 {
          margin: 0 0 6px;
          font-size: 15px;
          font-weight: 800;
        }

        .task-log-card p {
          margin: 0;
          color: var(--text-main);
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .attachment-preview-modal {
          display: flex;
          justify-content: center;
          align-items: center;
          max-height: 72vh;
          overflow: auto;
          background: var(--surface-hover);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .attachment-preview-modal img {
          max-width: 100%;
          max-height: 68vh;
          object-fit: contain;
          border-radius: var(--radius-sm);
        }

        .empty-log {
          padding: 24px;
          text-align: center;
          color: var(--text-sub);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
        }

        @media (max-width: 760px) {
          .timeline-panel-header,
          .timeline-panel-actions,
          .task-log-summary,
          .task-log-summary-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .timeline-log-item {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .timeline-date {
            align-items: flex-start;
            flex-direction: row;
            justify-content: space-between;
          }

          .timeline-card::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function formatLogDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatLogDateFull(date: string) {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${year}-${month}-${day}`;
}

function formatLogCreatedAt(createdAt?: string) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ProjectDetailPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>}>
        <ProjectDetailContent />
      </Suspense>
    </MainLayout>
  );
}
