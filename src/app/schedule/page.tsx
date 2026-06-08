'use client';

import React, { useEffect, useState } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import ProjectCard from "@/components/features/ProjectCard";
import { storage, Project } from "@/lib/storage";

export default function SchedulePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(storage.getProjects());
  }, []);

  return (
    <MainLayout>
      <div className="schedule-page">
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
          gap: 16px;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

      `}</style>
    </MainLayout>
  );
}
