'use client';

import React, { useState, useEffect } from 'react';
import { Task, Period, storage, Partner } from '@/lib/storage';
import { addDays, parseISO, format } from 'date-fns';
import { Camera, X, PlusCircle, Trash2 } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: Omit<Task, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

export default function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [assignee, setAssignee] = useState(initialData?.assignee || '');
  const [status, setStatus] = useState<Task['status']>(initialData?.status || 'pending');
  const [color, setColor] = useState(initialData?.color || '#e5e5ea');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [photo, setPhoto] = useState(initialData?.photo || '');
  
  const [partners, setPartners] = useState<Partner[]>([]);

  // 期間リストの状態管理
  const [periods, setPeriods] = useState<Period[]>(
    initialData?.periods || [{ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }]
  );

  useEffect(() => {
    setPartners(storage.getPartners());
  }, []);

  const colors = [
    { value: '#e5e5ea', label: 'グレー' },
    { value: '#d1e9ff', label: 'ブルー' },
    { value: '#d3f9d8', label: 'グリーン' },
    { value: '#fff3bf', label: 'イエロー' },
    { value: '#ffd8d8', label: 'レッド' },
    { value: '#eebefa', label: 'パープル' },
  ];

  const handleAddPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const nextStart = addDays(parseISO(lastPeriod.end), 1);
    setPeriods([...periods, { 
      start: format(nextStart, 'yyyy-MM-dd'), 
      end: format(addDays(nextStart, 1), 'yyyy-MM-dd') 
    }]);
  };

  const handleRemovePeriod = (index: number) => {
    if (periods.length <= 1) return;
    setPeriods(periods.filter((_, i) => i !== index));
  };

  const updatePeriod = (index: number, field: keyof Period, value: string) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setPeriods(newPeriods);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60%品質の軽量JPEG
        setPhoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onSubmit({ 
      title, 
      periods, 
      assignee, 
      status, 
      color, 
      memo,
      photo,
      id: initialData?.id 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label>工程名</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="例: 基礎工事"
          required
          autoFocus
        />
      </div>

      <div className="periods-section">
        <label>工事期間設定</label>
        {periods.map((period, index) => (
          <div key={index} className="period-row glass">
            <div className="period-inputs-full">
              <div className="form-group compact">
                <input 
                  type="text" 
                  value={period.label || ''} 
                  onChange={(e) => updatePeriod(index, 'label', e.target.value)} 
                  placeholder={`期間 ${index + 1} の名前（例: 配筋、打設など）`}
                  className="period-label-input"
                />
              </div>
              <div className="period-dates">
                <div className="form-group compact">
                  <span className="period-field-label">開始</span>
                  <input 
                    type="date" 
                    value={period.start} 
                    onChange={(e) => updatePeriod(index, 'start', e.target.value)} 
                    required
                  />
                </div>
                <div className="form-group compact">
                  <span className="period-field-label">終了</span>
                  <input 
                    type="date" 
                    value={period.end} 
                    onChange={(e) => updatePeriod(index, 'end', e.target.value)} 
                    required
                  />
                </div>
              </div>
            </div>
            {periods.length > 1 && (
              <IconButton 
                className="btn-outline" 
                onClick={() => handleRemovePeriod(index)}
                icon={<Trash2 size={16} />}
                title="期間を削除"
              />
            )}
          </div>
        ))}
        <IconButton 
          icon={<PlusCircle size={18} />} 
          className="btn-outline btn-add-period" 
          onClick={handleAddPeriod}
        >
          期間を追加（2期・3期工事など）
        </IconButton>
      </div>

      <div className="form-group">
        <label>担当・業者</label>
        <input 
          type="text" 
          value={assignee} 
          onChange={(e) => setAssignee(e.target.value)} 
          placeholder="例: 自社・○○基礎"
          list="partners-list"
        />
        <datalist id="partners-list">
          {partners.map(p => (
            <option key={p.id} value={p.name}>
              {p.type} | {p.company}
            </option>
          ))}
        </datalist>
      </div>

      <div className="form-group">
        <label>メモ・特記事項</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: 部材の搬入あり、10時以降作業"
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label>現場写真・図面</label>
        <div className="photo-upload-area">
          {photo ? (
            <div className="photo-preview">
              <img src={photo} alt="添付写真" />
              <button type="button" className="btn-remove-photo" onClick={() => setPhoto('')}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="photo-upload-btn">
              <Camera size={24} />
              <span>写真を撮影・添付</span>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>カラー設定</label>
        <div className="color-grid">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`color-option ${color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => setColor(c.value)}
              title={c.label}
            />
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>ステータス</label>
        <div className="status-toggle">
          {(['pending', 'doing', 'done'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`status-btn ${status === s ? 'active' : ''} ${s}`}
              onClick={() => setStatus(s)}
            >
              {s === 'done' ? '完了' : s === 'doing' ? '進行中' : '未着手'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary">
          保存する
        </button>
      </div>

      <style jsx>{`
        .task-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-textarea {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          font-family: inherit;
          font-size: 15px;
          resize: vertical;
          background: var(--surface);
          color: var(--text-main);
          outline: none;
          transition: border-color 0.2s;
        }

        .form-textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-pastel);
        }

        .color-grid {
          display: flex;
          gap: 10px;
          padding: 8px 0;
        }

        .color-option {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .color-option.active {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary);
        }

        .status-toggle {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: var(--surface-hover);
          padding: 4px;
          border-radius: var(--radius-md);
          gap: 4px;
        }

        .status-btn {
          padding: 8px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-sub);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-btn.active {
          background: var(--surface);
          color: var(--text-main);
          box-shadow: var(--shadow-sm);
        }

        .status-btn.done.active { color: var(--success); }
        .status-btn.doing.active { color: var(--primary); }

        .periods-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        .period-row {
          padding: 16px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--border-light);
        }

        .period-inputs-full {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .period-label-input {
          width: 100%;
          border: none;
          border-bottom: 2px solid var(--border-light);
          background: transparent;
          font-size: 16px;
          font-weight: 700;
          padding: 8px 0;
          outline: none;
          transition: border-color 0.2s;
        }

        .period-label-input:focus {
          border-color: var(--primary);
        }

        .period-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .period-field-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-sub);
          margin-bottom: 4px;
          display: block;
        }

        .btn-add-period {
          width: 100%;
          justify-content: center;
          border-style: dashed;
          height: 48px;
        }

        .form-group.compact {
          margin: 0;
        }

        label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-sub);
        }

        input, select {
          height: 48px;
          padding: 0 16px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--surface);
          font-size: 16px;
          color: var(--text-main);
          width: 100%;
        }

        input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-pastel);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .form-actions .btn {
          flex: 1;
          height: 52px;
          font-size: 16px;
        }

        .photo-upload-area {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .photo-upload-btn {
          width: 100%;
          padding: 24px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--text-sub);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface);
        }

        .photo-upload-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-pastel);
        }

        .photo-preview {
          position: relative;
          width: 100%;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--border-light);
        }

        .photo-preview img {
          width: 100%;
          height: auto;
          display: block;
          max-height: 300px;
          object-fit: contain;
          background: #000;
        }

        .btn-remove-photo {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-remove-photo:hover {
          background: rgba(0,0,0,0.8);
        }
      `}</style>
    </form>
  );
}
