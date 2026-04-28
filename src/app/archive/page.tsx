'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import { motion } from "framer-motion";
import { FilterBar } from "@/components/ui/FilterBar";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { IconButton } from "@/components/ui/IconButton";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { storage, Project } from "@/lib/storage";

export default function ArchivePage() {
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = () => {
    const allProjects = storage.getProjects();
    setArchivedProjects(allProjects.filter(p => p.isArchived));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestore = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('この現場をダッシュボードに復元しますか？')) {
      storage.saveProject({ ...project, isArchived: false });
      loadData();
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm('本当に削除しますか？この操作は取り消せません。')) {
      storage.deleteProject(id);
      loadData();
    }
  };

  const filteredProjects = archivedProjects.filter(p => 
    (typeFilter === 'all' || p.type === typeFilter) &&
    (statusFilter === 'all' || p.status === statusFilter) &&
    (companyFilter === '' || (p.title + p.location + (p.memo || '')).toLowerCase().includes(companyFilter.toLowerCase()))
  );

  return (
    <MainLayout>
      <div className="archive-container">
        <header className="archive-header">
          <div className="header-text">
            <div className="title-row">
              <Archive size={28} className="header-icon" />
              <h1>アーカイブ保管室</h1>
            </div>
            <p>過去に完了した現場や、非表示にした現場の記録を検索・閲覧できます</p>
          </div>
          <div className="header-actions">
            <ExportMenu 
              data={filteredProjects} 
              headers={['id', 'title', 'type', 'status', 'location', 'progress', 'updatedAt', 'memo']} 
            />
          </div>
        </header>

        <FilterBar
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          companyFilter={companyFilter}
          setCompanyFilter={setCompanyFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        <section className="projects-grid">
          {filteredProjects.length === 0 ? (
            <div className="empty-state glass">
              アーカイブされた現場はありません。
            </div>
          ) : (
            filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{ position: 'relative' }}
              >
                <div className="card-actions">
                  <IconButton 
                    className="restore" 
                    onClick={(e) => handleRestore(project, e)}
                    icon={<ArchiveRestore size={16} />}
                  >
                    復元
                  </IconButton>
                  <IconButton 
                    className="delete" 
                    onClick={(e) => handleDelete(project.id, e)}
                    icon={<Trash2 size={16} />}
                  />
                </div>
                <ProjectCard {...project} />
              </motion.div>
            ))
          )}
        </section>
      </div>

      <style jsx>{`
        .archive-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .archive-header {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        @media (min-width: 640px) {
          .archive-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .header-icon {
          color: var(--primary);
        }

        .header-text h1 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-main);
        }

        .header-text p {
          color: var(--text-sub);
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 768px) {
          .projects-grid {
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          }
        }

        .card-actions {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          display: flex;
          gap: 8px;
        }

        .empty-state {
          padding: 64px 32px;
          text-align: center;
          color: var(--text-sub);
          font-weight: 500;
          border-radius: var(--radius-lg);
          border: 1px dashed var(--border);
        }
      `}</style>
    </MainLayout>
  );
}
