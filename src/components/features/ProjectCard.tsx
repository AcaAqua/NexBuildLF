'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';

interface ProjectCardProps {
  id: string;
  title: string;
  type: string;
  status: 'planning' | 'in_progress' | 'delayed' | 'completed';
  location: string;
  progress: number;
  updatedAt: string;
  memo?: string;
}

const statusMap = {
  planning: { label: '調整中', color: 'var(--warning)', bg: 'var(--warning-pastel)' },
  in_progress: { label: '進行中', color: 'var(--primary)', bg: 'var(--primary-pastel)' },
  delayed: { label: '遅延', color: 'var(--danger)', bg: 'var(--danger-pastel)' },
  completed: { label: '完了', color: 'var(--success)', bg: 'var(--success-pastel)' },
};

export default function ProjectCard({ id, title, type, status, location, progress, updatedAt, memo }: ProjectCardProps) {
  const statusInfo = statusMap[status] || statusMap.planning;

  return (
    <Link href={`/project?id=${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <motion.div 
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        className="project-card-container"
      >
      <div className="card-content">
        <div className="card-header">
          <div className="title-section">
            <span className="type-tag">{type}</span>
            <h3>{title}</h3>
          </div>
          <span className="status-badge" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        <div className="card-meta">
          <div className="meta-item">
            <MapPin size={14} />
            <span>{location}</span>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span>更新: {updatedAt}</span>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <span>進捗率</span>
            <span className="progress-value">{progress}%</span>
          </div>
          <div className="progress-track">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="progress-fill"
              style={{ backgroundColor: statusInfo.color }}
            />
          </div>
        </div>

        {memo && (
          <div className="card-memo">
            <span className="memo-label">MEMO</span>
            <p className="memo-content">{memo}</p>
          </div>
        )}
      </div>
      <div className="card-action">
        <ChevronRight size={20} />
      </div>

      <style jsx>{`
        .project-card-container {
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: var(--shadow-sm);
        }

        .project-card-container:hover {
          border-color: var(--primary);
          box-shadow: var(--shadow-md);
        }

        .card-content {
          flex: 1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .type-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-sub);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }

        h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          color: var(--text-main);
          letter-spacing: -0.3px;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .card-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-sub);
        }

        .progress-section {
          margin-top: auto;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-sub);
          margin-bottom: 8px;
        }

        .progress-value {
          color: var(--text-main);
        }

        .progress-track {
          height: 6px;
          background-color: var(--primary-pastel);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 3px;
        }

        .card-action {
          color: var(--border);
          transition: color 0.2s;
        }

        .project-card-container:hover .card-action {
          color: var(--primary);
        }
      `}</style>
      </motion.div>
    </Link>
  );
}
