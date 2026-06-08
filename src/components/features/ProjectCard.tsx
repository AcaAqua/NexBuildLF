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
          background: #ffffff;
          border-radius: var(--radius-lg);
          border: 1px solid transparent;
          padding: 24px 28px;
          padding-right: 150px;
          min-height: 152px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: none;
        }

        .project-card-container:hover {
          border-color: var(--primary);
          background: #fbfdff;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 14px;
        }

        .type-tag {
          font-size: 11px;
          font-weight: 900;
          color: var(--primary);
          background: var(--primary-pastel);
          border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
          border-radius: 999px;
          padding: 3px 9px;
          text-transform: uppercase;
          letter-spacing: 0;
          display: block;
          margin-bottom: 6px;
          width: fit-content;
        }

        h3 {
          font-size: 19px;
          font-weight: 900;
          margin: 0;
          color: var(--text-main);
          letter-spacing: -0.3px;
          line-height: 1.35;
        }

        .status-badge {
          font-size: 12px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 20px;
          white-space: nowrap;
          order: -1;
          align-self: flex-start;
        }

        .card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 18px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-sub);
          font-weight: 800;
        }

        .progress-section {
          margin-top: auto;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 900;
          color: var(--text-sub);
          margin-bottom: 8px;
        }

        .progress-value {
          color: var(--text-main);
        }

        .progress-track {
          height: 8px;
          background-color: #e6edf6;
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border-light);
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
        }

        .card-action {
          color: var(--border);
          transition: color 0.2s;
        }

        @media (max-width: 640px) {
          .project-card-container {
            padding-right: 24px;
            padding-top: 72px;
          }
        }

        .project-card-container:hover .card-action {
          color: var(--primary);
        }
      `}</style>
      </motion.div>
    </Link>
  );
}
