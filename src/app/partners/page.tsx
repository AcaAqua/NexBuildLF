'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import Modal from "@/components/ui/Modal";
import { Users, Plus, Phone, Mail, Edit3, Trash2, Building2, Download, Upload } from "lucide-react";
import { storage, Partner } from "@/lib/storage";

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  useEffect(() => {
    setPartners(storage.getPartners());
  }, []);

  const handleOpenAdd = () => {
    setEditingPartner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('本当にこの業者情報を削除しますか？')) {
      storage.deletePartner(id);
      setPartners(storage.getPartners());
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPartner: Partner = {
      id: editingPartner ? editingPartner.id : `partner-${Date.now()}`,
      name: formData.get('name') as string,
      company: formData.get('company') as string,
      type: formData.get('type') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      notes: formData.get('notes') as string,
    };
    storage.savePartner(newPartner);
    setPartners(storage.getPartners());
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const header = '業者名,所属会社,業種,電話番号,メールアドレス,特記事項\n';
    const csvContent = partners.map(p => 
      `"${p.name}","${p.company || ''}","${p.type}","${p.phone || ''}","${p.email || ''}","${(p.notes || '').replace(/"/g, '""')}"`
    ).join('\n');
    
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM付きでExcel文字化け防止
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `協力業者マスター_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // 簡易CSVパーサー（ダブルクォート内のカンマ等には完全対応していませんが標準的な形式には対応）
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length < 2) return alert('データが見つかりません');
        
        const newPartners = [...partners];
        let addedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].replace(/^"|"$/g, '').split('","');
          if (row.length >= 3) {
            newPartners.push({
              id: `partner-${Date.now()}-${i}`,
              name: row[0]?.replace(/^"|"$/g, '') || '',
              company: row[1]?.replace(/^"|"$/g, '') || '',
              type: row[2]?.replace(/^"|"$/g, '') || '分類なし',
              phone: row[3]?.replace(/^"|"$/g, '') || '',
              email: row[4]?.replace(/^"|"$/g, '') || '',
              notes: row[5]?.replace(/^"|"$/g, '') || '',
            });
            addedCount++;
          }
        }
        
        localStorage.setItem('kouteikanri_partners', JSON.stringify(newPartners));
        setPartners(newPartners);
        alert(`${addedCount}件の業者データをインポートしました！`);
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const uniqueTypes = Array.from(new Set(partners.map(p => p.type).filter(Boolean)));
  const uniqueCompanies = Array.from(new Set(partners.map(p => p.company).filter(Boolean)));

  const filteredPartners = partners.filter(p => {
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;
    if (companyFilter !== 'all' && p.company !== companyFilter) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="partners-page app-page">
        <header className="page-header compact-page-header">
          <div className="header-text">
            <div className="title-row">
              <Users size={20} className="header-icon" />
              <h1>協力業者</h1>
            </div>
            <p>{filteredPartners.length}件を表示中</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-outline icon-btn-responsive" onClick={handleExportCSV} title="CSV出力">
              <Download size={18} />
              <span className="btn-text">出力</span>
            </button>
            <label className="btn btn-outline icon-btn-responsive" title="CSV取込">
              <Upload size={18} />
              <span className="btn-text">取込</span>
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
            </label>
            <button className="btn btn-primary add-btn icon-btn-responsive" onClick={handleOpenAdd} title="新規登録">
              <Plus size={20} />
              <span className="btn-text">ADD</span>
            </button>
          </div>
        </header>

        <div className="partner-filter page-toolbar">
          <div className="filter-group">
            <label>業種</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">すべて</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>会社</label>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="all">すべて</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {(typeFilter !== 'all' || companyFilter !== 'all') && (
            <button className="btn btn-outline btn-clear" onClick={() => { setTypeFilter('all'); setCompanyFilter('all'); }}>
              解除
            </button>
          )}
        </div>

        <section className="partners-grid entity-grid auto">
          {filteredPartners.length === 0 ? (
            <div className="empty-state glass">
              <p>条件に一致する業者がありません。</p>
            </div>
          ) : (
            filteredPartners.map(partner => (
              <div key={partner.id} className="partner-card glass">
                <div className="card-header">
                  <span className="type-badge">{partner.type}</span>
                  <div className="card-actions">
                    <button className="icon-btn edit" onClick={() => handleOpenEdit(partner)}><Edit3 size={16} /></button>
                    <button className="icon-btn delete" onClick={() => handleDelete(partner.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="card-body">
                  <h2 className="partner-name"><Users size={18} /> {partner.name}</h2>
                  {partner.company && (
                    <div className="partner-company"><Building2 size={14} /> {partner.company}</div>
                  )}
                  
                  <div className="contact-info">
                    {partner.phone && (
                      <a href={`tel:${partner.phone}`} className="contact-link">
                        <Phone size={16} /> {partner.phone}
                      </a>
                    )}
                    {partner.email && (
                      <a href={`mailto:${partner.email}`} className="contact-link">
                        <Mail size={16} /> {partner.email}
                      </a>
                    )}
                  </div>
                  
                  {partner.notes && (
                    <div className="partner-notes">
                      {partner.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        <Modal isOpen={isModalOpen} title={editingPartner ? "業者情報の編集" : "新規業者の登録"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSave} className="partner-form">
            <div className="form-group">
              <label>氏名 / 担当者名 (必須)</label>
              <input type="text" name="name" required defaultValue={editingPartner?.name} placeholder="例: 山田 太郎" />
            </div>
            <div className="form-group">
              <label>所属会社・屋号</label>
              <input type="text" name="company" defaultValue={editingPartner?.company} placeholder="例: 株式会社〇〇基礎" />
            </div>
            <div className="form-group">
              <label>業種 (必須)</label>
              <input type="text" name="type" required defaultValue={editingPartner?.type} placeholder="例: 基礎工事、大工、電気など" />
            </div>
            <div className="form-group">
              <label>電話番号</label>
              <input type="tel" name="phone" defaultValue={editingPartner?.phone} placeholder="例: 090-XXXX-XXXX" />
            </div>
            <div className="form-group">
              <label>メールアドレス</label>
              <input type="email" name="email" defaultValue={editingPartner?.email} placeholder="例: info@example.com" />
            </div>
            <div className="form-group">
              <label>メモ・特記事項</label>
              <textarea name="notes" defaultValue={editingPartner?.notes} rows={3} placeholder="例: 第2・第4土曜日は休み" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>キャンセル</button>
              <button type="submit" className="btn btn-primary">{editingPartner ? "保存する" : "登録する"}</button>
            </div>
          </form>
        </Modal>
      </div>

      <style jsx>{`
        .partners-page {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .page-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (min-width: 640px) {
          .page-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 2px;
        }

        .header-icon {
          color: var(--primary);
        }

        .header-text h1 {
          font-size: 16px;
          font-weight: 900;
          color: var(--text-main);
        }

        .header-text p {
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 800;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .partners-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        @media (min-width: 768px) {
          .partners-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          }
        }

        .partner-card {
          padding: 20px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .partner-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .type-badge {
          background: var(--surface-hover);
          color: var(--primary);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          border: 1px solid var(--border);
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-sub);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .icon-btn:hover { background: var(--surface-hover); color: var(--text-main); }
        .icon-btn.delete:hover { background: #fff1f0; color: #ff4d4f; }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .partner-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-link {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--primary);
          text-decoration: none;
          padding: 8px;
          background: var(--primary-pastel);
          border-radius: var(--radius-sm);
          font-weight: 900;
          border: 1px solid color-mix(in srgb, var(--primary) 16%, transparent);
          transition: opacity 0.2s;
        }

        .contact-link:hover {
          opacity: 0.8;
        }

        .partner-notes {
          font-size: 13px;
          color: var(--text-sub);
          padding: 12px;
          background: var(--surface);
          border-radius: 6px;
          border-left: 3px solid var(--primary);
          white-space: pre-wrap;
        }

        .partner-filter {
          justify-content: flex-start;
          flex-wrap: wrap;
        }

        .partner-filter .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .partner-filter label {
          color: var(--text-sub);
          font-size: 12px;
          font-weight: 900;
        }

        .partner-filter select {
          min-height: 44px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: #ffffff;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 800;
        }

        .partner-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
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

        .form-group input, .form-group textarea {
          padding: 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--surface);
          font-size: 15px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-pastel);
          outline: none;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .empty-state {
          padding: 64px 32px;
          text-align: center;
          color: var(--text-sub);
          font-weight: 500;
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border);
        }

        .icon-btn-responsive {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 600px) {
          .btn-text {
            display: none;
          }
          .icon-btn-responsive {
            padding: 8px 12px;
          }
          .header-actions {
            gap: 8px;
          }
        }
      `}</style>
    </MainLayout>
  );
}
