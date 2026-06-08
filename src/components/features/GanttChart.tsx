'use client';

import React, { useMemo } from 'react';
import { format, addDays, startOfDay, differenceInDays, min, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { CheckCircle2, CircleDashed, Maximize, MessageSquareText, Minimize, PauseCircle, PlayCircle, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { storage, Task, TaskLog, Period } from '@/lib/storage';

interface GanttChartProps {
  tasks: Task[];
  dailyMemos?: { [key: string]: string };
  taskLogs?: TaskLog[];
  onUpdate?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onAddTask?: () => void;
  onReorder?: (newTasks: Task[]) => void;
  onDateClick?: (date: string) => void;
  onOpenTaskLog?: (task: Task, date: string) => void;
}

const getTaskPeriods = (task: Task): Period[] => {
  if (task.periods && task.periods.length > 0) {
    return task.periods;
  }

  const start = task.startDate || task.start_date;
  if (!start) return [];
  const end = task.endDate || task.end_date || start;
  return [{ start, end }];
};

const MIN_CELL_WIDTH = 32;
const MAX_CELL_WIDTH = 96;
const ZOOM_STEP = 8;

const clampCellWidth = (value: number) => Math.min(MAX_CELL_WIDTH, Math.max(MIN_CELL_WIDTH, value));

const getCellWidthForScale = (scale: 'sm' | 'md' | 'lg') => {
  if (scale === 'sm') return 36;
  if (scale === 'lg') return 64;
  return 50;
};

const getTouchDistance = (touches: React.TouchList) => {
  if (touches.length < 2) return 0;
  const [first, second] = [touches[0], touches[1]];
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
};

const taskStatusMeta = {
  pending: { label: '未', icon: CircleDashed },
  doing: { label: '進', icon: PlayCircle },
  done: { label: '完', icon: CheckCircle2 },
  hold: { label: '停', icon: PauseCircle },
} satisfies Record<Task['status'], { label: string; icon: React.ElementType }>;

interface PendingDragChange {
  task: Task;
  taskTitle: string;
  periodName: string;
  daysMoved: number;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

export default function GanttChart({ tasks, dailyMemos = {}, taskLogs = [], onUpdate, onEdit, onAddTask, onReorder, onDateClick, onOpenTaskLog }: GanttChartProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [cellWidth, setCellWidth] = React.useState(50);
  const [pendingDragChange, setPendingDragChange] = React.useState<PendingDragChange | null>(null);
  const clickTimerRef = React.useRef<number | null>(null);
  const lastTapRef = React.useRef<{ taskId: string; time: number } | null>(null);
  const pinchRef = React.useRef<{ distance: number; cellWidth: number } | null>(null);
  const timelineScrollAreasRef = React.useRef<Set<HTMLDivElement>>(new Set());
  const syncingScrollRef = React.useRef(false);

  React.useEffect(() => {
    setCellWidth(getCellWidthForScale(storage.getSettings().uiScale || 'md'));
  }, []);

  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    };
  }, []);

  const ganttStyle = {
    '--gantt-cell-width': `${cellWidth}px`,
  } as React.CSSProperties & Record<string, string>;

  const logCountByDate = useMemo(() => {
    return taskLogs.reduce<Record<string, number>>((acc, log) => {
      acc[log.logDate] = (acc[log.logDate] || 0) + 1;
      return acc;
    }, {});
  }, [taskLogs]);

  const logCountByTask = useMemo(() => {
    return taskLogs.reduce<Record<string, number>>((acc, log) => {
      acc[log.taskId] = (acc[log.taskId] || 0) + 1;
      return acc;
    }, {});
  }, [taskLogs]);

  // 日付の範囲を計算
  const { startDate, days } = useMemo(() => {
    const today = startOfDay(new Date());
    let start = addDays(today, -3); 

    if (tasks && tasks.length > 0) {
      const allStarts = tasks.flatMap(t => getTaskPeriods(t).map(p => parseISO(p.start))).filter(d => !isNaN(d.getTime()));
      if (allStarts.length > 0) {
        const earliestTask = min(allStarts);
        if (earliestTask < start) start = startOfDay(earliestTask);
      }
    }

    const daysCount = 31;
    const daysArr = [];
    for (let i = 0; i < daysCount; i++) {
      daysArr.push(addDays(start, i));
    }

    return { startDate: start, days: daysArr };
  }, [tasks]);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleDragEnd = (task: Task, periodIndex: number, offset: number) => {
    const daysMoved = Math.round(offset / cellWidth);
    if (daysMoved === 0) return;

    const updatedPeriods = [...getTaskPeriods(task)];
    const period = updatedPeriods[periodIndex];
    
    const newStart = addDays(parseISO(period.start), daysMoved);
    const newEnd = addDays(parseISO(period.end), daysMoved);

    updatedPeriods[periodIndex] = {
      start: format(newStart, 'yyyy-MM-dd'),
      end: format(newEnd, 'yyyy-MM-dd')
    };

    setPendingDragChange({
      task: {
        ...task,
        periods: updatedPeriods
      },
      taskTitle: task.title,
      periodName: period.label || task.title,
      daysMoved,
      oldStart: period.start,
      oldEnd: period.end,
      newStart: format(newStart, 'yyyy-MM-dd'),
      newEnd: format(newEnd, 'yyyy-MM-dd'),
    });
  };

  const handleApplyPendingDragChange = () => {
    if (!pendingDragChange) return;
    onUpdate?.(pendingDragChange.task);
    setPendingDragChange(null);
  };

  const handleCancelPendingDragChange = () => {
    setPendingDragChange(null);
  };

  const clearPendingTaskLogOpen = () => {
    if (!clickTimerRef.current) return;
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
  };

  const openTaskLogAfterSingleTap = (task: Task, date: string) => {
    clearPendingTaskLogOpen();
    clickTimerRef.current = window.setTimeout(() => {
      onOpenTaskLog?.(task, date);
      clickTimerRef.current = null;
    }, 260);
  };

  const openTaskEditorFromBar = (task: Task) => {
    clearPendingTaskLogOpen();
    onEdit?.(task);
  };

  const handleTaskBarClick = (event: React.MouseEvent, task: Task, date: string) => {
    if (event.detail > 1) {
      event.preventDefault();
      openTaskEditorFromBar(task);
      return;
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap?.taskId === task.id && now - lastTap.time <= 320) {
      event.preventDefault();
      lastTapRef.current = null;
      openTaskEditorFromBar(task);
      return;
    }
    lastTapRef.current = { taskId: task.id, time: now };
    openTaskLogAfterSingleTap(task, date);
  };

  const updateZoom = (nextCellWidth: number) => {
    setCellWidth(clampCellWidth(Math.round(nextCellWidth)));
  };

  const handleTimelineTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    pinchRef.current = {
      distance: getTouchDistance(event.touches),
      cellWidth,
    };
    clearPendingTaskLogOpen();
  };

  const handleTimelineTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    const distance = getTouchDistance(event.touches);
    if (distance <= 0 || pinchRef.current.distance <= 0) return;
    updateZoom(pinchRef.current.cellWidth * (distance / pinchRef.current.distance));
  };

  const handleTimelineTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) pinchRef.current = null;
  };

  const registerTimelineScrollArea = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    timelineScrollAreasRef.current.add(node);
  }, []);

  const handleTimelineScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (syncingScrollRef.current) return;
    const scrollLeft = event.currentTarget.scrollLeft;
    syncingScrollRef.current = true;
    timelineScrollAreasRef.current.forEach((area) => {
      if (area !== event.currentTarget) area.scrollLeft = scrollLeft;
    });
    window.requestAnimationFrame(() => {
      syncingScrollRef.current = false;
    });
  };

  return (
    <>
      <div className={`gantt-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {isFullscreen && (
          <div className="fullscreen-header glass">
            <h2>打ち合わせモード（全画面）</h2>
            <div className="fullscreen-actions">
              {onAddTask && (
                <button className="btn btn-primary btn-sm" onClick={onAddTask}>
                  <Plus size={16} /> 工程追加
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setIsFullscreen(false)}>
                <Minimize size={16} /> 閉じる
              </button>
            </div>
          </div>
        )}
        <div
          className="gantt-container"
          style={ganttStyle}
          onTouchStart={handleTimelineTouchStart}
          onTouchMove={handleTimelineTouchMove}
          onTouchEnd={handleTimelineTouchEnd}
          onTouchCancel={() => { pinchRef.current = null; }}
        >
          {pendingDragChange && (
            <div className="drag-confirm-banner" role="status" aria-live="polite">
              <div className="drag-confirm-text">
                <strong>{pendingDragChange.taskTitle}</strong>
                <span>
                  {pendingDragChange.periodName}を{Math.abs(pendingDragChange.daysMoved)}日
                  {pendingDragChange.daysMoved > 0 ? '後ろ' : '前'}へ移動します
                </span>
                <small>{pendingDragChange.oldStart} - {pendingDragChange.oldEnd} → {pendingDragChange.newStart} - {pendingDragChange.newEnd}</small>
              </div>
              <div className="drag-confirm-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={handleApplyPendingDragChange}>
                  <CheckCircle2 size={16} />
                  反映
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleCancelPendingDragChange}>
                  <RotateCcw size={16} />
                  戻す
                </button>
              </div>
            </div>
          )}
          {/* Timeline Header */}
          <div className="gantt-header">
            <div className="task-name-col header">
              <span>工程名</span>
              <div className="gantt-header-actions">
                <button
                  className="icon-btn-small"
                  onClick={() => updateZoom(cellWidth - ZOOM_STEP)}
                  title="縮小"
                  aria-label="工程表を縮小"
                  disabled={cellWidth <= MIN_CELL_WIDTH}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  className="icon-btn-small"
                  onClick={() => updateZoom(cellWidth + ZOOM_STEP)}
                  title="拡大"
                  aria-label="工程表を拡大"
                  disabled={cellWidth >= MAX_CELL_WIDTH}
                >
                  <ZoomIn size={14} />
                </button>
                {!isFullscreen && (
                  <button className="icon-btn-small" onClick={() => setIsFullscreen(true)} title="全画面で表示">
                    <Maximize size={14} />
                  </button>
                )}
              </div>
            </div>
            <div
              ref={registerTimelineScrollArea}
              className="timeline-scroll-area"
              onScroll={handleTimelineScroll}
            >
              <div className="timeline-days">
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayName = format(day, 'E');
                  const isSat = dayName === 'Sat';
                  const isSun = dayName === 'Sun';
                  const isToday = dateStr === todayStr;
                  const hasMemo = dailyMemos[dateStr];
                  const logCount = logCountByDate[dateStr] || 0;
                  return (
                    <div 
                      key={`h-${day.getTime()}`} 
                      className={`day-cell ${isSat ? 'sat' : isSun ? 'sun' : ''} ${isToday ? 'today' : ''} ${(hasMemo || logCount > 0) ? 'has-memo' : ''}`}
                      onClick={() => onDateClick && onDateClick(dateStr)}
                    >
                      {isToday && <span className="today-label">今日</span>}
                      <span className="day-num">{format(day, 'd')}</span>
                      <span className="day-name">{format(day, 'E', { locale: ja })}</span>
                      {hasMemo && <span className="memo-dot" />}
                      {logCount > 0 && <span className="log-date-pin">{logCount}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Body - Reorderable Group */}
          <Reorder.Group 
            axis="y" 
            values={tasks} 
            onReorder={onReorder || (() => {})}
            className="gantt-body"
          >
            {(!tasks || tasks.length === 0) ? (
              <div className="empty-state">工程が登録されていません</div>
            ) : (
              tasks.map((task) => {
                const taskPeriods = getTaskPeriods(task);
                return (
                  <Reorder.Item key={task.id} value={task} className="gantt-row">
                    <div className="task-name-col clickable" onClick={() => onEdit && onEdit(task)}>
                      <div className="drag-handle">⠿</div>
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className="task-assignee">{task.assignee}</span>
                      </div>
                    </div>
                    <div
                      ref={registerTimelineScrollArea}
                      className="timeline-scroll-area"
                      onScroll={handleTimelineScroll}
                    >
                      <div
                        className="timeline-grid"
                        style={{
                          width: `calc(var(--gantt-cell-width) * ${days.length})`,
                          minWidth: `calc(var(--gantt-cell-width) * ${days.length})`,
                          height: 'var(--gantt-row-height)',
                        }}
                      >
                        {/* Grid background lines */}
                        {days.map((day, i) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const dayName = format(day, 'E');
                          const isSat = dayName === 'Sat';
                          const isSun = dayName === 'Sun';
                          const isToday = dateStr === todayStr;
                          return (
                          <div 
                            key={`g-${task.id}-${day.getTime()}`} 
                            className={`grid-line ${isSat ? 'sat' : isSun ? 'sun' : ''} ${isToday ? 'today' : ''}`}
                            style={{ left: `calc(var(--gantt-cell-width) * ${i})`, top: 0 }}
                          />
                          );
                        })}
                        
                        {/* Multiple Task Bars (Periods) */}
                        {taskPeriods.map((period, pIdx) => {
                          const sDate = startOfDay(parseISO(period.start));
                          const eDate = startOfDay(parseISO(period.end));
                          const taskLogCount = logCountByTask[task.id] || 0;
                          const StatusIcon = taskStatusMeta[task.status].icon;
                          const periodName = period.label || task.title;
                          const periodContext = taskPeriods.length > 1 ? `${task.title} / ${periodName}` : task.title;
                          if (isNaN(sDate.getTime())) return null;

                          const startOffset = differenceInDays(sDate, startDate);
                          const duration = isNaN(eDate.getTime()) ? 1 : differenceInDays(eDate, sDate) + 1;

                          return (
                            <div 
                              key={`${task.id}-p-${pIdx}-wrap`}
                              className="task-bar-container"
                              style={{ 
                                left: `calc(var(--gantt-cell-width) * ${startOffset} + 2px)`, 
                                width: `calc(var(--gantt-cell-width) * ${duration} - 4px)`,
                              }}
                            >
                              <motion.div 
                                drag="x"
                                dragMomentum={false}
                                dragElastic={0.05}
                                onDragEnd={(_, info) => handleDragEnd(task, pIdx, info.offset.x)}
                                onClick={(event) => handleTaskBarClick(event, task, period.start)}
                                onDoubleClick={(event) => {
                                  event.preventDefault();
                                  openTaskEditorFromBar(task);
                                }}
                                onContextMenu={(event) => event.preventDefault()}
                                className={`task-bar ${task.status} draggable`}
                                title={`${periodContext} - 1回タップで記録、2回タップで編集`}
                                aria-label={`${periodContext}。1回タップで記録、2回タップで編集`}
                                style={{ 
                                  backgroundColor: task.color ? task.color : undefined,
                                  color: task.color ? '#1d2736' : undefined,
                                  width: '100%',
                                  height: '100%',
                                  borderRadius: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 14px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  boxShadow: 'var(--shadow-sm)',
                                  position: 'relative',
                                  cursor: 'grab',
                                  overflow: 'visible',
                                }}
                                whileDrag={{ 
                                  scale: 1.05, 
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                                  zIndex: 100
                                }}
                              >
                                <span className="task-status-mark" aria-hidden="true">
                                  <StatusIcon size={13} />
                                  <span>{taskStatusMeta[task.status].label}</span>
                                </span>
                                <span className="bar-label">{periodName}</span>
                                {taskLogCount > 0 && (
                                  <span className="task-log-badge" aria-label={`記録 ${taskLogCount}件`}>
                                    <MessageSquareText size={12} />
                                    {taskLogCount}
                                  </span>
                                )}
                                <span className="bar-edit-hint" aria-hidden="true">編集</span>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </Reorder.Item>
                );
              })
            )}
          </Reorder.Group>
        </div>
      </div>

      <style jsx>{`
        .gantt-wrapper {
          width: 100%;
          background: #ffffff;
          border-radius: 0;
          border: none;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .gantt-container {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
          touch-action: pan-x pan-y;
        }

        .drag-confirm-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          background: var(--warning-pastel);
          border-bottom: 1px solid var(--warning);
          color: var(--text-main);
        }

        .drag-confirm-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .drag-confirm-text strong {
          font-size: 13px;
          font-weight: 900;
          color: var(--text-main);
          overflow-wrap: anywhere;
        }

        .drag-confirm-text span {
          font-size: 13px;
          font-weight: 800;
          color: var(--warning);
        }

        .drag-confirm-text small {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-sub);
        }

        .drag-confirm-actions {
          display: flex;
          gap: 8px;
          flex: 0 0 auto;
        }

        .drag-confirm-actions .btn {
          min-height: 44px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .gantt-header {
          display: flex;
          border-bottom: 1px solid var(--border);
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .gantt-row {
          display: flex;
          border-bottom: 1px solid var(--border-light);
          width: 100%;
        }

        .task-name-col {
          width: var(--gantt-sidebar-width);
          min-width: var(--gantt-sidebar-width);
          padding: 12px 16px;
          background: #fbfdff;
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          border-right: 1px solid var(--border);
          box-shadow: 6px 0 12px rgba(26, 43, 64, 0.06);
        }

        .task-name-col.header {
          font-weight: 800;
          font-size: 12px;
          color: var(--text-main);
          background: #f0f5fb;
          justify-content: space-between;
          height: 60px;
          position: sticky;
          left: 0;
          z-index: 60;
        }

        .task-name-col.clickable {
          cursor: pointer;
        }

        .task-name-col.clickable:hover {
          background-color: var(--surface-hover);
        }

        .drag-handle {
          color: var(--border);
          font-size: 14px;
          cursor: grab;
          user-select: none;
        }

        .task-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .task-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-assignee {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary);
          opacity: 0.7;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .timeline-scroll-area {
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
        }

        .timeline-scroll-area::-webkit-scrollbar {
          height: 6px;
        }
        .timeline-scroll-area::-webkit-scrollbar-thumb {
          background: var(--border-light);
          border-radius: 3px;
        }

        .timeline-days {
          display: flex;
          min-width: max-content;
        }
        
        .timeline-grid {
          position: relative;
          min-width: max-content;
          height: 100%;
        }

        .day-cell {
          width: var(--gantt-cell-width);
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-right: 1px solid var(--gantt-grid-line);
          background: #fbfdff;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        .day-cell:hover {
          background: var(--surface-hover);
        }

        .day-cell.sat {
          color: #007aff;
          background: var(--gantt-sat-bg);
        }

        .day-cell.sun {
          color: #ff3b30;
          background: var(--gantt-sun-bg);
        }

        .day-cell.today {
          color: var(--primary);
          background: var(--gantt-today-bg);
          box-shadow: inset 0 -4px 0 var(--primary);
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }

        .day-num { font-size: 14px; font-weight: 700; }
        .day-name { font-size: 10px; font-weight: 800; opacity: 0.75; }

        .today-label {
          position: absolute;
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 30px;
          height: 16px;
          padding: 0 5px;
          border-radius: 999px;
          background: var(--primary);
          color: var(--text-on-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
          line-height: 1;
        }

        .memo-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 5px;
          height: 5px;
          background: var(--primary);
          border-radius: 50%;
        }

        .log-date-pin {
          position: absolute;
          bottom: 6px;
          right: 6px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--text-on-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          line-height: 1;
        }

        .gantt-row {
          min-height: var(--gantt-row-height);
        }

        .grid-line {
          position: absolute;
          width: var(--gantt-cell-width);
          height: 100%;
          border-right: 1px solid var(--gantt-grid-line);
          opacity: 1;
        }

        .grid-line.sat {
          background: var(--gantt-sat-bg);
        }

        .grid-line.sun {
          background: var(--gantt-sun-bg);
        }

        .grid-line.today {
          background: var(--gantt-today-bg);
          border-right-color: var(--primary);
          opacity: 1;
          box-shadow: inset 2px 0 0 var(--primary), inset -2px 0 0 var(--primary);
        }

        .task-bar-container {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 40px;
          z-index: 10;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .task-bar {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          color: white;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 6px 14px rgba(26, 43, 64, 0.16);
          position: relative;
          cursor: grab;
          overflow: visible;
          gap: 8px;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .task-bar.pending { background: #e4e8ee; color: #394554; border: 1px solid #aeb8c6; }
        .task-bar.doing { background: var(--primary-pastel); color: var(--primary); border: 1px solid var(--primary); }
        .task-bar.done { background: var(--success-pastel); color: var(--success); border: 1px solid var(--success); }
        .task-bar.hold { background: var(--warning-pastel); color: var(--warning); border: 1px solid var(--warning); }

        .bar-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 44px;
          line-height: 1.2;
          min-width: 0;
          flex: 1;
        }

        .task-status-mark {
          width: 30px;
          height: 24px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(29, 39, 54, 0.16);
          color: #1d2736;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          flex: 0 0 auto;
          font-size: 10px;
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        }

        .task-log-badge {
          position: absolute;
          top: 50%;
          right: 8px;
          transform: translateY(-50%);
          min-width: 38px;
          height: 24px;
          padding: 0 7px;
          border-radius: 999px;
          background: #1d2736;
          color: var(--text-on-primary);
          border: 2px solid var(--surface);
          box-shadow: var(--shadow-sm);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 900;
        }

        .task-bar.pending .task-status-mark {
          background: #ffffff;
          color: #6e6e73;
        }

        .task-bar.doing .task-status-mark {
          color: var(--primary);
        }

        .task-bar.done .task-status-mark {
          color: var(--success);
        }

        .task-bar.hold .task-status-mark {
          color: var(--warning);
        }

        .bar-edit-hint {
          position: absolute;
          right: 8px;
          bottom: -24px;
          min-width: 40px;
          height: 20px;
          padding: 0 7px;
          border-radius: 999px;
          background: rgba(29, 39, 54, 0.88);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 900;
          opacity: 0;
          transform: translateY(-2px);
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.16s ease;
          z-index: 2;
        }

        .task-bar:hover .bar-edit-hint,
        .task-bar:focus-visible .bar-edit-hint {
          opacity: 1;
          transform: translateY(0);
        }

        @media (hover: none) and (pointer: coarse) {
          .task-bar {
            min-height: 44px;
            padding: 0 10px;
          }

          .task-status-mark {
            width: 32px;
            height: 26px;
          }

          .bar-edit-hint {
            top: 50%;
            bottom: auto;
            right: 8px;
            transform: translateY(-50%);
            opacity: 0.72;
            background: rgba(255, 255, 255, 0.9);
            color: var(--text-main);
            border: 1px solid rgba(255, 255, 255, 0.65);
          }

          .task-log-badge + .bar-edit-hint {
            display: none;
          }
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: var(--text-sub);
          width: 100%;
        }

        .fullscreen-mode {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 9999;
          background: var(--background);
          display: flex;
          flex-direction: column;
        }

        .fullscreen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 24px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-light);
        }

        .fullscreen-header h2 {
          font-size: 16px; font-weight: 800; margin: 0; color: var(--primary);
        }

        .fullscreen-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .icon-btn-small {
          width: 28px;
          height: 28px;
          background: none; border: none; color: var(--text-sub); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 4px; border-radius: 4px; transition: all 0.2s;
        }

        .icon-btn-small:hover {
          background: var(--surface-hover); color: var(--primary);
        }

        .icon-btn-small:disabled {
          cursor: not-allowed;
          opacity: 0.35;
        }

        .icon-btn-small:disabled:hover {
          background: transparent;
          color: var(--text-sub);
        }

        .gantt-header-actions {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        @media (max-width: 760px) {
          .drag-confirm-banner {
            align-items: stretch;
            flex-direction: column;
          }

          .drag-confirm-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .task-name-col.header {
            min-height: 64px;
          }

          .icon-btn-small {
            width: 44px;
            height: 44px;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            background: var(--surface);
          }

          .gantt-header-actions {
            gap: 6px;
          }

          .task-bar-container {
            height: 44px !important;
          }

          .task-bar {
            min-height: 44px !important;
            padding: 0 12px;
          }
        }

        @media (min-width: 761px) and (max-width: 1180px) {
          .gantt-wrapper {
            border-radius: var(--radius-md);
          }

          .task-name-col {
            width: 210px;
            min-width: 210px;
            padding: 12px 14px;
          }

          .task-name-col.header {
            height: 64px;
          }

          .day-cell {
            height: 64px;
          }

          .icon-btn-small {
            width: 44px;
            height: 44px;
            border: 1px solid var(--border-light);
            border-radius: 10px;
            background: var(--surface);
          }

          .gantt-header-actions {
            gap: 6px;
          }

          .task-bar-container {
            height: 44px !important;
          }

          .task-bar {
            min-height: 44px !important;
            padding: 0 12px;
          }

          .timeline-scroll-area {
            scrollbar-width: thin;
          }
        }
      `}</style>
    </>
  );
}
