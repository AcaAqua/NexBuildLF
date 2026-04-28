'use client';

import React, { useMemo } from 'react';
import { format, addDays, startOfDay, differenceInDays, min, max, eachDayOfInterval, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import { storage, Task, Settings } from '@/lib/storage';

interface GanttChartProps {
  tasks: Task[];
  dailyMemos?: { [key: string]: string };
  onUpdate?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onReorder?: (newTasks: Task[]) => void;
  onDateClick?: (date: string) => void;
}

export default function GanttChart({ tasks, dailyMemos = {}, onUpdate, onEdit, onReorder, onDateClick }: GanttChartProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [uiScale, setUiScale] = React.useState<'sm' | 'md' | 'lg'>('md');

  React.useEffect(() => {
    setUiScale(storage.getSettings().uiScale || 'md');
  }, []);

  const cellWidth = uiScale === 'sm' ? 36 : uiScale === 'lg' ? 64 : 50;

  // 日付の範囲を計算
  const { startDate, days } = useMemo(() => {
    const today = startOfDay(new Date());
    let start = addDays(today, -3); 

    if (tasks && tasks.length > 0) {
      const allStarts = tasks.flatMap(t => t.periods.map(p => parseISO(p.start))).filter(d => !isNaN(d.getTime()));
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

  const handleDragEnd = (task: Task, periodIndex: number, offset: number) => {
    const daysMoved = Math.round(offset / cellWidth);
    if (daysMoved === 0) return;

    const updatedPeriods = [...task.periods];
    const period = updatedPeriods[periodIndex];
    
    const newStart = addDays(parseISO(period.start), daysMoved);
    const newEnd = addDays(parseISO(period.end), daysMoved);

    updatedPeriods[periodIndex] = {
      start: format(newStart, 'yyyy-MM-dd'),
      end: format(newEnd, 'yyyy-MM-dd')
    };

    if (onUpdate) {
      onUpdate({
        ...task,
        periods: updatedPeriods
      });
    }
  };

  return (
    <>
      <div className={`gantt-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {isFullscreen && (
          <div className="fullscreen-header glass">
            <h2>打ち合わせモード（全画面）</h2>
            <button className="btn btn-outline btn-sm" onClick={() => setIsFullscreen(false)}>
              <Minimize size={16} /> 閉じる
            </button>
          </div>
        )}
        <div className="gantt-container">
          {/* Timeline Header */}
          <div className="gantt-header">
            <div className="task-name-col header">
              <span>工程名</span>
              {!isFullscreen && (
                <button className="icon-btn-small" onClick={() => setIsFullscreen(true)} title="全画面で表示">
                  <Maximize size={14} />
                </button>
              )}
            </div>
            <div className="timeline-scroll-area">
              <div className="timeline-days">
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const hasMemo = dailyMemos[dateStr];
                  return (
                    <div 
                      key={`h-${day.getTime()}`} 
                      className={`day-cell ${format(day, 'E') === 'Sat' ? 'sat' : format(day, 'E') === 'Sun' ? 'sun' : ''} ${hasMemo ? 'has-memo' : ''}`}
                      onClick={() => onDateClick && onDateClick(dateStr)}
                    >
                      <span className="day-num">{format(day, 'd')}</span>
                      <span className="day-name">{format(day, 'E', { locale: ja })}</span>
                      {hasMemo && <span className="memo-dot" />}
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
                return (
                  <Reorder.Item key={task.id} value={task} className="gantt-row">
                    <div className="task-name-col clickable" onClick={() => onEdit && onEdit(task)}>
                      <div className="drag-handle">⠿</div>
                      <div className="task-info">
                        <span className="task-title">{task.title}</span>
                        <span className="task-assignee">{task.assignee}</span>
                      </div>
                    </div>
                    <div className="timeline-scroll-area">
                      <div className="timeline-grid">
                        {/* Grid background lines */}
                        {days.map((day, i) => (
                          <div 
                            key={`g-${task.id}-${day.getTime()}`} 
                            className="grid-line" 
                            style={{ left: `calc(var(--gantt-cell-width) * ${i})`, top: 0 }}
                          />
                        ))}
                        
                        {/* Multiple Task Bars (Periods) */}
                        {task.periods.map((period, pIdx) => {
                          const sDate = startOfDay(parseISO(period.start));
                          const eDate = startOfDay(parseISO(period.end));
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
                                className={`task-bar ${task.status} draggable`}
                                style={{ 
                                  backgroundColor: task.color ? task.color : undefined,
                                  color: task.color ? '#ffffff' : undefined,
                                }}
                                whileDrag={{ 
                                  scale: 1.05, 
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                                  zIndex: 100
                                }}
                              >
                                <span className="bar-label">{period.label || task.title}</span>
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
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .gantt-container {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          width: 100%;
        }

        .gantt-header, .gantt-row {
          display: flex;
          border-bottom: 1px solid var(--border-light);
          width: 100%;
        }

        .task-name-col {
          width: var(--gantt-sidebar-width);
          min-width: var(--gantt-sidebar-width);
          padding: 12px 16px;
          background: var(--surface);
          z-index: 30;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          border-right: 1px solid var(--border-light);
          box-shadow: 4px 0 8px rgba(0, 0, 0, 0.02);
        }

        .task-name-col.header {
          font-weight: 800;
          font-size: 12px;
          color: var(--text-sub);
          background: var(--background);
          justify-content: space-between;
          height: 60px;
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
          border-right: 1px solid var(--border-light);
          background: var(--background);
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }

        .day-cell:hover {
          background: var(--surface-hover);
        }

        .day-cell.sat { color: #007aff; }
        .day-cell.sun { color: #ff3b30; }
        .day-num { font-size: 14px; font-weight: 700; }
        .day-name { font-size: 10px; font-weight: 600; opacity: 0.6; }

        .memo-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 5px;
          height: 5px;
          background: var(--primary);
          border-radius: 50%;
        }

        .gantt-row {
          min-height: var(--gantt-row-height);
        }

        .grid-line {
          position: absolute;
          width: var(--gantt-cell-width);
          height: 100%;
          border-right: 1px solid var(--border-light);
          opacity: 0.3;
        }

        .task-bar-container {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          height: 32px;
          z-index: 10;
        }

        .task-bar {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: white;
          font-size: 11px;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
          position: relative;
          cursor: grab;
        }

        .task-bar.pending { background: #d2d2d7; color: #86868b; }
        .task-bar.doing { background: var(--primary-pastel); color: var(--primary); border: 1px solid var(--primary); }
        .task-bar.done { background: var(--success-pastel); color: var(--success); border: 1px solid var(--success); }

        .bar-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          padding: 12px 24px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-light);
        }

        .fullscreen-header h2 {
          font-size: 16px; font-weight: 800; margin: 0; color: var(--primary);
        }

        .icon-btn-small {
          background: none; border: none; color: var(--text-sub); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 4px; border-radius: 4px; transition: all 0.2s;
        }

        .icon-btn-small:hover {
          background: var(--surface-hover); color: var(--primary);
        }
      `}</style>
    </>
  );
}
