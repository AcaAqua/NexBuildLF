'use client';

import React from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Info, Rocket, Clock, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="about-page">
        <header className="page-header">
          <Info size={28} className="header-icon" />
          <h1>このアプリについて</h1>
        </header>

        <div className="content-container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card glass status-card"
          >
            <div className="badge">TEST VERSION</div>
            <h2>現在はテスト版（ベータ版）です</h2>
            <p>
              本アプリは現在、一部のユーザー様・協力業者様向けのテスト運用期間中です。
              予告なくデータの構造変更や機能の追加・削除が行われる場合があります。
              重要なデータは適宜「設定」からバックアップを作成するようにお願いいたします。
            </p>
          </motion.div>

          <div className="vision-grid">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card glass feature-card"
            >
              <div className="icon-wrapper primary"><Rocket size={24} /></div>
              <h3>現場での打ち合わせをスムーズに</h3>
              <p>
                紙の工程表を広げられない現場でも、スマホひとつでサッと予定を確認し、その場で日程の調整ができることを目指しています。
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card glass feature-card"
            >
              <div className="icon-wrapper success"><Clock size={24} /></div>
              <h3>チャート作成の時間をゼロに</h3>
              <p>
                Excelで線を引いたり色を塗ったりする「作業のための作業」をなくします。予定を入力するだけで、直感的なガントチャートが自動で出来上がります。
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card glass feature-card"
            >
              <div className="icon-wrapper warning"><Wallet size={24} /></div>
              <h3>安価で便利に</h3>
              <p>
                高機能すぎる・高価すぎる業務システムではなく、現場の職人さんや監督が本当に必要な機能だけを絞り込み、手軽に導入できるアプリを追求しています。
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="footer-info"
          >
            <p>Version 0.1.0 (Beta)</p>
            <p>&copy; {new Date().getFullYear()} LuckyFields.LLC</p>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .about-page {
          padding: 24px 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .header-icon {
          color: var(--primary);
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-main);
        }

        .content-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .card {
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
        }

        .status-card {
          background: var(--surface);
          border-color: var(--warning);
          position: relative;
          overflow: hidden;
        }

        .status-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--warning);
        }

        .badge {
          display: inline-block;
          background: var(--warning-pastel);
          color: var(--warning);
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: 0.5px;
        }

        .status-card h2 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 12px;
          color: var(--text-main);
        }

        .status-card p {
          color: var(--text-sub);
          line-height: 1.6;
          font-size: 14px;
        }

        .vision-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 768px) {
          .vision-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .feature-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .icon-wrapper.primary { background: var(--primary-pastel); color: var(--primary); }
        .icon-wrapper.success { background: var(--success-pastel); color: var(--success); }
        .icon-wrapper.warning { background: var(--warning-pastel); color: var(--warning); }

        .feature-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          line-height: 1.4;
        }

        .feature-card p {
          font-size: 13px;
          color: var(--text-sub);
          line-height: 1.6;
          margin: 0;
        }

        .footer-info {
          text-align: center;
          padding: 40px 0 20px;
          color: var(--text-sub);
          font-size: 13px;
          font-weight: 500;
        }

        .footer-info p {
          margin-bottom: 4px;
        }
      `}</style>
    </MainLayout>
  );
}
