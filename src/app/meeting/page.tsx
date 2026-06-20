'use client';

import React, { useEffect, useState, Suspense } from 'react';
import MainLayout from "@/components/layout/MainLayout";
import GanttChart from "@/components/features/GanttChart";
import { storage, Project } from "@/lib/storage";
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

function MeetingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('projectId');
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      const found = storage.getProjectById(projectId);
      if (found) {
        setProject(found);
      }
    }
    setLoading(false);
  }, [projectId]);

  if (loading) {
    return (
      <div className="meeting-loading-state">
        <Loader2 className="animate-spin" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="meeting-error-state">
        <h2>プロジェクトが見つかりません</h2>
        <button onClick={() => router.back()} className="btn btn-outline">
          <ArrowLeft size={18} /> 戻る
        </button>
      </div>
    );
  }

  return (
    <div className="meeting-page">
      <header className="meeting-header glass">
        <div className="header-left">
          <button onClick={() => router.back()} className="back-btn" title="戻る">
            <ArrowLeft size={20} />
          </button>
          <div className="title-group">
            <span className="badge">打ち合わせモード</span>
            <h1>{project.title}</h1>
          </div>
        </div>
        <div className="header-right">
          <span className="location">{project.location}</span>
        </div>
      </header>

      <main className="meeting-content">
        <GanttChart 
          tasks={project.tasks} 
          onUpdate={(updatedTask) => {
            const updatedProject = {
              ...project,
              tasks: project.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            };
            setProject(updatedProject);
            storage.saveProject(updatedProject);
          }}
        />
      </main>
    </div>
  );
}

export default function MeetingModePage() {
  return (
    <MainLayout hideNav={true}>
      <Suspense fallback={
        <div className="meeting-loading-state">
          <Loader2 className="animate-spin" />
          <span>読み込み中...</span>
        </div>
      }>
        <MeetingContent />
      </Suspense>

      <style jsx global>{`
        .meeting-page {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--background);
        }

        .meeting-page .meeting-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border-light);
          z-index: 100;
        }

        .meeting-page .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .meeting-page .back-btn {
          width: 44px;
          min-width: 44px;
          height: 44px;
          flex: 0 0 44px;
          box-sizing: border-box;
          padding: 0;
          border-radius: 50%;
          border: 1px solid var(--border-light);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .meeting-page .back-btn:hover {
          background: var(--surface-hover);
          transform: translateX(-2px);
        }

        .meeting-page .title-group h1 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          color: var(--text-main);
        }

        .meeting-page .badge {
          font-size: 10px;
          font-weight: 800;
          background: var(--primary-pastel);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          margin-bottom: 4px;
          display: inline-block;
        }

        .meeting-page .location {
          font-size: 13px;
          color: var(--text-sub);
          font-weight: 600;
        }

        .meeting-page .meeting-content {
          flex: 1;
          overflow: hidden;
          padding: 12px;
        }

        .meeting-loading-state, .meeting-error-state {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-sub);
        }

        .meeting-error-state h2 {
          color: var(--text-main);
        }
      `}</style>
    </MainLayout>
  );
}
