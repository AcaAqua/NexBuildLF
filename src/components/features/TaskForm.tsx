'use client';

import React, { useState, useEffect } from 'react';
import { Task, Period, storage, Partner, TaskPhotoAttachment } from '@/lib/storage';
import { addDays, parseISO, format } from 'date-fns';
import { Camera, CheckCircle2, CircleDashed, Image as ImageIcon, PauseCircle, PlayCircle, PlusCircle, Trash2, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { FIELD_PHOTO_LIMIT_MESSAGE, formatDataSize, MAX_FIELD_PHOTOS, resizeImageFile } from '@/lib/photoUtils';
import { getAttachmentByteSize, persistAttachmentDataUrl, stripAttachmentDataUrl } from '@/lib/attachmentStore';
import { StoredImage } from '@/components/ui/StoredImage';

interface TaskFormProps {
  initialData?: Partial<Task>;
  onSubmit: (data: Omit<Task, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: 'pending', label: '未着手', icon: CircleDashed },
  { value: 'doing', label: '進行中', icon: PlayCircle },
  { value: 'done', label: '完了', icon: CheckCircle2 },
  { value: 'hold', label: '保留', icon: PauseCircle },
] satisfies Array<{ value: Task['status']; label: string; icon: React.ElementType }>;

export default function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [assignee, setAssignee] = useState(initialData?.assignee || '');
  const [status, setStatus] = useState<Task['status']>(initialData?.status || 'pending');
  const [color, setColor] = useState(initialData?.color || '#e5e5ea');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [photos, setPhotos] = useState<TaskPhotoAttachment[]>(() => {
    if (initialData?.photos && initialData.photos.length > 0) return initialData.photos;
    if (!initialData?.photo) return [];
    return [{
      id: `${initialData.id || 'legacy'}-photo`,
      fileName: '添付写真',
      fileType: 'image/jpeg',
      dataUrl: initialData.photo,
      createdAt: new Date().toISOString(),
    }];
  });
  const [photoMessage, setPhotoMessage] = useState('');
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const photoBytes = photos.reduce((total, item) => total + getAttachmentByteSize(item), 0);
  
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const selected = Array.from(input.files || []);
    const files = selected.filter(file => file.type.startsWith('image/'));
    if (selected.length > 0 && files.length === 0) {
      setPhotoMessage('画像ファイルを選択してください。');
      input.value = '';
      return;
    }
    if (files.length === 0) return;
    setPhotoMessage('');

    const availableSlots = MAX_FIELD_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setPhotoMessage(FIELD_PHOTO_LIMIT_MESSAGE);
      input.value = '';
      return;
    }
    const selectedFiles = files.slice(0, availableSlots);
    if (selectedFiles.length < files.length) {
      setPhotoMessage(FIELD_PHOTO_LIMIT_MESSAGE);
    }

    try {
      setIsPhotoProcessing(true);
      const now = new Date().toISOString();
      const resizedPhotos = await Promise.all(selectedFiles.map(async (file, index) => {
        const attachment = {
          id: `task-photo-${Date.now()}-${index}`,
          fileName: file.name || `現場写真-${index + 1}.jpg`,
          fileType: 'image/jpeg',
          dataUrl: await resizeImageFile(file),
          createdAt: now,
        };
        return persistAttachmentDataUrl(attachment);
      }));

      setPhotos(prev => [...prev, ...resizedPhotos]);
    } catch (error) {
      setPhotoMessage('写真を読み込めませんでした。別の写真を選択してください。');
    } finally {
      setIsPhotoProcessing(false);
      input.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (isPhotoProcessing) {
      setPhotoMessage('写真の処理が終わるまで保存できません。');
      return;
    }
    const storedPhotos = photos.map(stripAttachmentDataUrl);
    const primaryPhoto = photos.find(photo => !photo.storageKey)?.dataUrl || '';
    onSubmit({ 
      title, 
      periods, 
      assignee, 
      status, 
      color, 
      memo,
      photo: primaryPhoto,
      photos: storedPhotos.length > 0 ? storedPhotos : undefined,
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
                  aria-label={`期間 ${index + 1} の名称`}
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
                    aria-label={`期間 ${index + 1} の開始日`}
                    required
                  />
                </div>
                <div className="form-group compact">
                  <span className="period-field-label">終了</span>
                  <input 
                    type="date" 
                    value={period.end} 
                    onChange={(e) => updatePeriod(index, 'end', e.target.value)} 
                    aria-label={`期間 ${index + 1} の終了日`}
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
          aria-label="担当者または業者を入力"
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
        <div className="photo-panel">
          <div className="photo-summary" aria-live="polite">
            <span>{photos.length}/{MAX_FIELD_PHOTOS}枚</span>
            <span>{formatDataSize(photoBytes)}</span>
          </div>
          {photos.length > 0 ? (
            <div className="photo-grid" aria-label="添付済み写真">
              {photos.map((item, index) => (
                <div className="photo-preview" key={item.id}>
                  <StoredImage attachment={item} alt={`添付写真 ${index + 1}`} />
                  <div className="photo-meta">
                    <ImageIcon size={14} />
                    <span>{index === 0 ? '代表写真' : `写真 ${index + 1}`}</span>
                    <strong>{formatDataSize(getAttachmentByteSize(item))}</strong>
                  </div>
                  <button type="button" className="btn-remove-photo" onClick={() => handleRemovePhoto(item.id)} aria-label={`添付写真 ${index + 1} を削除`}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="photo-empty">
              <Camera size={28} />
              <span>未添付</span>
            </div>
          )}
          <div className="photo-action-row" aria-busy={isPhotoProcessing}>
            <label className={`photo-upload-btn ${isPhotoProcessing ? 'processing' : ''}`}>
              <Camera size={22} />
              <span>{isPhotoProcessing ? '処理中' : '撮影'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
                aria-label="カメラで現場写真を撮影"
                disabled={isPhotoProcessing}
              />
            </label>
            <label className={`photo-upload-btn secondary ${isPhotoProcessing ? 'processing' : ''}`}>
              <ImageIcon size={22} />
              <span>{photos.length > 0 ? '写真を追加' : '写真選択'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
                aria-label="端末から現場写真を選択"
                disabled={isPhotoProcessing}
              />
            </label>
          </div>
          {isPhotoProcessing && <p className="photo-processing-note">写真を端末保存向けに処理しています。完了後に保存してください。</p>}
          {photoMessage && <p className="photo-message">{photoMessage}</p>}
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

      <div className="form-group status-field">
        <label>ステータス</label>
        <div className="status-toggle">
          {statusOptions.map(({ value, label, icon: StatusIcon }) => (
            <button
              key={value}
              type="button"
              className={`status-btn ${status === value ? 'active' : ''} ${value}`}
              onClick={() => setStatus(value)}
            >
              <StatusIcon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary" disabled={isPhotoProcessing}>
          {isPhotoProcessing ? '写真処理中' : '保存する'}
        </button>
      </div>

      <style jsx>{`
        .task-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-bottom: 82px;
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
          grid-template-columns: repeat(4, 1fr);
          background: var(--surface-hover);
          padding: 4px;
          border-radius: var(--radius-md);
          gap: 4px;
        }

        .status-btn {
          min-height: 48px;
          padding: 8px 6px;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 900;
          color: var(--text-sub);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .status-btn.active {
          background: var(--surface);
          color: var(--text-main);
          box-shadow: var(--shadow-sm);
        }

        .status-btn.done.active { color: var(--success); }
        .status-btn.doing.active { color: var(--primary); }
        .status-btn.hold.active { color: var(--warning); }

        .status-field {
          order: -1;
        }

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
          position: sticky;
          bottom: 0;
          z-index: 20;
          display: flex;
          gap: 12px;
          margin: 4px -24px 0;
          padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
          background: var(--surface);
          border-top: 1px solid var(--border-light);
          box-shadow: 0 -8px 18px rgba(0, 0, 0, 0.08);
        }

        .form-actions .btn {
          flex: 1;
          min-height: 56px;
          font-size: 16px;
          font-weight: 900;
        }

        .photo-panel {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .photo-summary {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid var(--border-light);
          border-radius: 999px;
          background: var(--surface-hover);
          color: var(--text-sub);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          font-weight: 900;
        }

        .photo-upload-btn {
          width: 100%;
          min-height: 56px;
          padding: 0 16px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: var(--text-sub);
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface);
          font-size: 15px;
          font-weight: 900;
        }

        .photo-action-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .photo-upload-btn.secondary {
          border-style: solid;
          border-color: var(--border-light);
          background: var(--surface-hover);
        }

        .photo-upload-btn.processing {
          opacity: 0.68;
          pointer-events: none;
        }

        .photo-upload-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: var(--primary-pastel);
        }

        .photo-preview {
          position: relative;
          width: 100%;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-light);
          background: var(--surface-hover);
        }

        .photo-preview img {
          width: 100%;
          aspect-ratio: 4 / 3;
          display: block;
          object-fit: cover;
          background: #000;
        }

        .photo-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
          gap: 10px;
        }

        .photo-meta {
          min-height: 32px;
          padding: 0 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-main);
          font-size: 12px;
          font-weight: 900;
        }

        .photo-meta strong {
          margin-left: auto;
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
        }

        .photo-empty {
          min-height: 96px;
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          background: var(--surface-hover);
          color: var(--text-sub);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 900;
        }

        .photo-message {
          margin: 0;
          color: var(--warning);
          font-size: 12px;
          font-weight: 800;
        }

        .photo-processing-note {
          margin: 0;
          padding: 10px 12px;
          border: 1px solid var(--warning);
          border-radius: var(--radius-sm);
          background: var(--warning-pastel);
          color: var(--warning);
          font-size: 12px;
          font-weight: 900;
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

        @media (max-width: 560px) {
          .task-form {
            gap: 16px;
          }

          .period-row {
            padding: 14px;
            align-items: stretch;
          }

          .period-dates {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .status-toggle {
            grid-template-columns: repeat(2, 1fr);
          }

          .status-btn {
            min-height: 52px;
            font-size: 13px;
          }

          input,
          select,
          .form-textarea {
            font-size: 16px;
          }

          .photo-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .photo-action-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}
