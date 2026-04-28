'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import { storage, Project } from "@/lib/storage";
import { Calendar } from "lucide-react";

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(storage.getProjects());
  }, []);

  return (
    <MainLayout>
      <div className="schedule-page">
        <header className="page-header">
          <div className="icon-box">
            <Calendar size={24} />
          </div>
          <div>
            <h1>全体工程表</h1>
            <p>全プロジェクトの進行状況を一覧で確認できます</p>
          </div>
        </header>

        <div className="projects-grid">
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
          gap: 32px;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .icon-box {
          width: 48px;
          height: 48px;
          background: var(--primary-pastel);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        h1 {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
        }

        p {
          color: var(--text-sub);
          margin: 4px 0 0 0;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 1024px) {
          .projects-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </MainLayout>
  );
}
