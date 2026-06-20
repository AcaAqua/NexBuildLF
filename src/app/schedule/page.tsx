'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import { storage, Project } from "@/lib/storage";

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(storage.getActiveProjects());
  }, []);

  return (
    <MainLayout>
      <div className="schedule-page app-page">
        <section className="compact-page-header">
          <div>
            <div className="compact-title">予定ボード</div>
            <div className="compact-subtitle">全現場の進行状況を横断確認</div>
          </div>
          <strong className="project-count">{projects.length}件</strong>
        </section>

        <div className="projects-grid entity-grid">
          {projects.length === 0 ? (
            <div className="empty-state">
              案件が登録されていません。
            </div>
          ) : (
            projects.map(project => (
              <ProjectCard key={project.id} {...project} />
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .schedule-page {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .project-count {
          min-height: 34px;
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--primary-pastel);
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          font-size: 13px;
        }

      `}</style>
    </MainLayout>
  );
}
