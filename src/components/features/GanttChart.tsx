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
              <span>工程名（順序変更可）</span>
              {!isFullscreen && (
                <button className="icon-btn-small" onClick={() => setIsFullscreen(true)} title="全画面で表示">
                  <Maximize size={14} />
                </button>
              )}
            </div>
            <div className="timeline-scroll-area">
              <div className="timeline-days" style={{ width: days.length * cellWidth }}>
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
                      <div className="timeline-grid" style={{ width: days.length * cellWidth, position: 'relative' }}>
                        {/* Grid background lines */}
                        {days.map((day, i) => (
                          <div 
                            key={`g-${task.id}-${day.getTime()}`} 
                            className="grid-line" 
                            style={{ left: `${i * cellWidth}px`, top: 0 }}
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
                              style={{ 
                                position: 'absolute',
                                top: '50%',
                                marginTop: '-16px',
                                left: `${startOffset * cellWidth + 2}px`, 
                                width: `${Math.max(20, duration * cellWidth - 4)}px`,
                                height: '32px',
                                zIndex: 10
                              }}
                            >
                              <motion.div 
                                drag="x"
                                dragMomentum={false}
                                dragElastic={0.05}
                                onDragEnd={(_, info) => handleDragEnd(task, pIdx, info.offset.x)}
                                className={`task-bar ${task.status} draggable`}
                                style={{ 
                                  position: 'relative',
                                  width: '100%',
                                  height: '100%',
                                  backgroundColor: task.color ? task.color : undefined,
                                  color: task.color ? '#ffffff' : undefined,
                                  borderRadius: '16px'
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
          overflow-x: auto;
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          -webkit-overflow-scrolling: touch;
        }
        /* ... styles continue ... */

        .gantt-container {
          min-width: 600px; /* 最小幅を確保 */
        }

        .gantt-header, .gantt-row {
          display: flex;
          border-bottom: 1px solid var(--border-light);
        }

        .task-name-col {
          width: 160px;
          min-width: 160px;
          padding: 12px 16px;
          background: var(--surface);
          position: sticky;
          left: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background-color 0.2s;
          box-shadow: 4px 0 12px rgba(0, 0, 0, 0.05); /* スクロール時の重なりを自然に見せる境界 */
          clip-path: inset(0 -20px 0 0); /* 影が右側にだけ落ちるようにクリップ */
        }

        .ui-size-sm .task-name-col {
          width: 120px;
          min-width: 120px;
          padding: 8px 12px;
        }

        .ui-size-lg .task-name-col {
          width: 200px;
          min-width: 200px;
          padding: 16px 20px;
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

        .drag-handle:active {
          cursor: grabbing;
        }

        .task-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .task-name-col.header {
          font-weight: 800;
          font-size: 13px;
          color: var(--text-sub);
          background: var(--background);
          justify-content: space-between;
        }

        .icon-btn-small {
          background: none;
          border: none;
          color: var(--text-sub);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .icon-btn-small:hover {
          background: var(--surface-hover);
          color: var(--primary);
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
          display: flex;
          flex-direction: column;
        }

        .timeline-days {
          display: flex;
          position: relative;
        }
        
        .timeline-grid {
          position: relative;
          flex: 1;
          width: 100%;
        }

        .day-cell {
          width: 50px;
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

        .day-cell.has-memo {
          background: rgba(0, 113, 227, 0.03);
        }

        .memo-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          background: var(--primary);
          border-radius: 50%;
        }

        .day-cell.sat { color: #007aff; }
        .day-cell.sun { color: #ff3b30; }

        .day-num { font-size: 14px; font-weight: 700; }
        .day-name { font-size: 10px; font-weight: 600; opacity: 0.6; }

        .gantt-row {
          min-height: 64px;
        }

        .timeline-grid {
          height: 100%;
        }

        .grid-line {
          position: absolute;
          width: 50px;
          height: 100%;
          border-right: 1px solid var(--border-light);
          opacity: 0.3;
        }

        .task-bar {
          width: 100%;
          height: 100%;
          border-radius: 6px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          color: white;
          font-size: 11px;
          font-weight: 700;
          box-shadow: var(--shadow-sm);
          z-index: 1;
        }

        .task-bar.pending { background: var(--border, #d2d2d7); color: var(--text-sub, #86868b); }
        .task-bar.doing { background: var(--primary-pastel, #e8f2ff); color: var(--primary, #0071e3); border: 1px solid var(--primary, #0071e3); }
        .task-bar.done { background: var(--success-pastel, #eafaf1); color: var(--success, #34c759); border: 1px solid var(--success, #34c759); }

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

        /* Fullscreen Mode (Meeting Mode) */
        .fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh;
          border-radius: 0;
          border: none;
          background: var(--background);
          display: flex;
          flex-direction: column;
        }

        .fullscreen-mode .gantt-container {
          flex: 1;
          overflow-y: auto;
        }

        .fullscreen-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: var(--surface);
          border-bottom: 1px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .fullscreen-header h2 {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
          color: var(--primary);
        }
      `}</style>
    </>
  );
}
