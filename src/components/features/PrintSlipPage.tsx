'use client';

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Project, Settings } from '@/lib/storage';
import { projectRepository } from '@/lib/projectRepository';
import { settingsRepository } from '@/lib/settingsRepository';
import { ArrowLeft, ClipboardCheck, Printer, Truck } from 'lucide-react';
import Link from 'next/link';

type SlipType = 'delivery' | 'receipt';

interface PrintSlipPageProps {
  type: SlipType;
  initialProjectId?: string;
}

interface SlipItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  note: string;
}

const slipMeta = {
  delivery: {
    title: '配送票',
    subtitle: '現場へ持ち出す荷物・資材の確認用',
    icon: Truck,
    printButton: '配送票を印刷',
    signatureLabel: '配送担当',
    confirmLabel: '積込確認',
  },
  receipt: {
    title: '受領票',
    subtitle: '現場で受け取った荷物・資材の確認用',
    icon: ClipboardCheck,
    printButton: '受領票を印刷',
    signatureLabel: '受領者',
    confirmLabel: '受領確認',
  },
} satisfies Record<SlipType, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  printButton: string;
  signatureLabel: string;
  confirmLabel: string;
}>;

const emptySettings: Settings = {
  companyName: '',
  userName: '',
  qualifications: '',
  uiScale: 'md',
};

function createBlankItem(index: number): SlipItem {
  return {
    id: `item-${Date.now()}-${index}`,
    name: '',
    quantity: '',
    unit: '',
    note: '',
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PrintSlipPage({ type, initialProjectId }: PrintSlipPageProps) {
  const meta = slipMeta[type];
  const Icon = meta.icon;
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [settings, setSettings] = React.useState(emptySettings);
  const [projectId, setProjectId] = React.useState(initialProjectId || '');
  const [issuedAt, setIssuedAt] = React.useState(today());
  const [destination, setDestination] = React.useState('');
  const [carrier, setCarrier] = React.useState('');
  const [vehicle, setVehicle] = React.useState('');
  const [staffName, setStaffName] = React.useState('');
  const [note, setNote] = React.useState('');
  const [items, setItems] = React.useState<SlipItem[]>(() => [0, 1, 2, 3, 4].map(createBlankItem));

  React.useEffect(() => {
    const loadedProjects = projectRepository.listAll();
    const loadedSettings = settingsRepository.get();
    setProjects(loadedProjects);
    setSettings(loadedSettings);

    const selected = loadedProjects.find(project => project.id === (initialProjectId || loadedProjects[0]?.id));
    if (selected) {
      setProjectId(selected.id);
      setDestination(selected.location || '');
    }
    setStaffName(loadedSettings.userName || '');
  }, [initialProjectId]);

  const selectedProject = projects.find(project => project.id === projectId);

  const handleProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    const project = projects.find(item => item.id === nextProjectId);
    if (project) setDestination(project.location || '');
  };

  const updateItem = (id: string, field: keyof Omit<SlipItem, 'id'>, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, createBlankItem(prev.length)]);
  };

  return (
    <MainLayout hideNav>
      <div className="slip-screen">
        <header className="slip-toolbar glass">
          <div className="slip-title-group">
            <Link href={selectedProject ? `/project?id=${selectedProject.id}` : '/'} className="back-link" aria-label="戻る">
              <ArrowLeft size={20} />
            </Link>
            <div className="slip-title-icon">
              <Icon size={20} />
            </div>
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary print-button" onClick={() => window.print()}>
            <Printer size={18} />
            {meta.printButton}
          </button>
        </header>

        <section className="slip-editor">
          <div className="editor-grid">
            <label>
              <span>案件</span>
              <select value={projectId} onChange={(event) => handleProjectChange(event.target.value)}>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{type === 'delivery' ? '配送日' : '受領日'}</span>
              <input type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} />
            </label>
            <label>
              <span>現場・納入先</span>
              <input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="現場住所・納入先" />
            </label>
            <label>
              <span>{type === 'delivery' ? '配送会社・担当' : '納入元・担当'}</span>
              <input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="会社名・担当者" />
            </label>
            <label>
              <span>車両・便名</span>
              <input value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="車両番号・便名など" />
            </label>
            <label>
              <span>{meta.signatureLabel}</span>
              <input value={staffName} onChange={(event) => setStaffName(event.target.value)} placeholder={meta.signatureLabel} />
            </label>
          </div>

          <div className="item-editor-head">
            <h2>品目</h2>
            <button type="button" className="btn btn-outline" onClick={addItem}>行を追加</button>
          </div>

          <div className="item-editor-list">
            {items.map((item, index) => (
              <div key={item.id} className="item-editor-row">
                <span>{index + 1}</span>
                <input value={item.name} onChange={(event) => updateItem(item.id, 'name', event.target.value)} placeholder="品名・資材名" />
                <input value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} placeholder="数量" />
                <input value={item.unit} onChange={(event) => updateItem(item.id, 'unit', event.target.value)} placeholder="単位" />
                <input value={item.note} onChange={(event) => updateItem(item.id, 'note', event.target.value)} placeholder="備考" />
              </div>
            ))}
          </div>

          <label className="note-editor">
            <span>備考</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="注意事項、受け渡し条件、連絡事項など" />
          </label>
        </section>

        <section className="print-sheet" aria-label={`${meta.title}印刷プレビュー`}>
          <div className="sheet-header">
            <div>
              <p className="sheet-kicker">工程管理 Pro</p>
              <h2>{meta.title}</h2>
            </div>
            <div className="sheet-date">
              <span>{type === 'delivery' ? '配送日' : '受領日'}</span>
              <strong>{issuedAt || '　　年　月　日'}</strong>
            </div>
          </div>

          <div className="sheet-info-grid">
            <div>
              <span>案件名</span>
              <strong>{selectedProject?.title || '未選択'}</strong>
            </div>
            <div>
              <span>現場・納入先</span>
              <strong>{destination || '　'}</strong>
            </div>
            <div>
              <span>{type === 'delivery' ? '配送会社・担当' : '納入元・担当'}</span>
              <strong>{carrier || '　'}</strong>
            </div>
            <div>
              <span>車両・便名</span>
              <strong>{vehicle || '　'}</strong>
            </div>
            <div>
              <span>発行元</span>
              <strong>{settings.companyName || '　'}</strong>
            </div>
            <div>
              <span>発行者</span>
              <strong>{settings.userName || '　'}</strong>
            </div>
          </div>

          <table className="sheet-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>品名・資材名</th>
                <th>数量</th>
                <th>単位</th>
                <th>備考</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sheet-note">
            <span>備考</span>
            <p>{note || '　'}</p>
          </div>

          <div className="signature-grid">
            <div>
              <span>{meta.confirmLabel}</span>
              <strong>{staffName || '　'}</strong>
            </div>
            <div>
              <span>確認印・署名</span>
              <strong>　</strong>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .slip-screen {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .slip-toolbar {
          min-height: 76px;
          padding: 12px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .slip-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .back-link,
        .slip-title-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--surface);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
        }

        .slip-title-group h1 {
          margin: 0;
          color: var(--text-main);
          font-size: 20px;
          font-weight: 900;
        }

        .slip-title-group p {
          margin: 0;
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 800;
        }

        .print-button {
          flex: 0 0 auto;
          font-weight: 900;
        }

        .slip-editor {
          padding: 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          box-shadow: var(--shadow-sm);
        }

        .editor-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        label span,
        .sheet-info-grid span,
        .sheet-note span,
        .signature-grid span {
          color: var(--text-sub);
          font-size: 11px;
          font-weight: 900;
        }

        input,
        select,
        textarea {
          width: 100%;
          min-height: 44px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface);
          color: var(--text-main);
          font: inherit;
          font-weight: 800;
        }

        textarea {
          resize: vertical;
          line-height: 1.5;
        }

        .item-editor-head {
          margin-top: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .item-editor-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }

        .item-editor-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .item-editor-row {
          display: grid;
          grid-template-columns: 38px minmax(180px, 1.4fr) minmax(72px, 0.4fr) minmax(72px, 0.4fr) minmax(150px, 1fr);
          gap: 8px;
          align-items: center;
        }

        .item-editor-row > span {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 900;
        }

        .note-editor {
          margin-top: 14px;
        }

        .print-sheet {
          width: min(100%, 210mm);
          min-height: 297mm;
          margin: 0 auto;
          padding: 16mm;
          background: #ffffff;
          color: #111827;
          border: 1px solid #d1d5db;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          border-bottom: 3px solid #111827;
          padding-bottom: 10px;
        }

        .sheet-kicker {
          margin: 0 0 4px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 900;
        }

        .sheet-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .sheet-date {
          min-width: 46mm;
          border: 1px solid #111827;
          padding: 7px 9px;
        }

        .sheet-date span {
          display: block;
          color: #4b5563;
          font-size: 10px;
          font-weight: 900;
        }

        .sheet-date strong {
          display: block;
          margin-top: 2px;
          font-size: 14px;
          font-weight: 900;
        }

        .sheet-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .sheet-info-grid div,
        .sheet-note,
        .signature-grid div {
          min-height: 16mm;
          border: 1px solid #9ca3af;
          padding: 6px 8px;
        }

        .sheet-info-grid strong,
        .signature-grid strong {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          font-weight: 900;
          min-height: 16px;
        }

        .sheet-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 12px;
        }

        .sheet-table th,
        .sheet-table td {
          border: 1px solid #6b7280;
          padding: 6px 7px;
          height: 10mm;
          vertical-align: top;
          word-break: break-word;
        }

        .sheet-table th {
          background: #f3f4f6;
          font-size: 11px;
          font-weight: 900;
        }

        .sheet-table th:nth-child(1),
        .sheet-table td:nth-child(1) {
          width: 10mm;
          text-align: center;
        }

        .sheet-table th:nth-child(3),
        .sheet-table td:nth-child(3),
        .sheet-table th:nth-child(4),
        .sheet-table td:nth-child(4) {
          width: 18mm;
          text-align: center;
        }

        .sheet-note p {
          margin: 4px 0 0;
          min-height: 18mm;
          white-space: pre-wrap;
          font-size: 12px;
          font-weight: 800;
        }

        .signature-grid {
          margin-top: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .signature-grid div {
          min-height: 24mm;
        }

        @media (max-width: 860px) {
          .slip-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .print-button {
            width: 100%;
          }

          .editor-grid,
          .sheet-info-grid,
          .signature-grid {
            grid-template-columns: 1fr;
          }

          .item-editor-row {
            grid-template-columns: 34px 1fr 72px 72px;
          }

          .item-editor-row input:nth-of-type(4) {
            grid-column: 2 / -1;
          }

          .print-sheet {
            min-height: auto;
            padding: 12mm;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          :global(body) {
            background: #ffffff !important;
          }

          .slip-toolbar,
          .slip-editor,
          :global(.desktop-top-nav),
          :global(.sidebar),
          :global(.mobile-header),
          :global(.bottom-nav),
          :global(.app-footer),
          :global(.offline-banner) {
            display: none !important;
          }

          .slip-screen {
            display: block;
          }

          .print-sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 14mm;
            border: none;
            box-shadow: none;
            page-break-after: avoid;
          }
        }
      `}</style>
    </MainLayout>
  );
}
