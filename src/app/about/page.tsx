'use client';

import React from 'react';
import MainLayout from "@/components/layout/MainLayout";
import { Info, ShieldCheck, Zap, Heart, Mail, Smartphone, Tablet, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="about-page">
        <header className="about-header">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="logo-icon"
          >
            <Zap size={48} fill="currentColor" />
          </motion.div>
          <h1>工程管理 Pro <span className="version">v1.1.0</span></h1>
          <p className="subtitle">次世代の現場監督のための、直感的スケジュール管理ツール</p>
        </header>

        <div className="about-content">
          <section className="about-section glass">
            <h2><ShieldCheck className="section-icon" /> コンセプト</h2>
            <p>
              「工程管理 Pro」は、建設現場やプロジェクト管理における「工程表の作成・共有」を
              もっともシンプルに、そして美しく行うために開発されました。
              複雑な機能を削ぎ落とし、現場で即座に状況を把握できるインターフェースを目指しています。
            </p>
          </section>

          <div className="features-grid">
            <div className="feature-card glass">
              <div className="feature-icon"><Zap size={24} /></div>
              <h3>高速な操作性</h3>
              <p>ドラッグ＆ドロップで直感的に期間を変更。忙しい現場でもストレスなく操作可能です。</p>
            </div>
            <div className="feature-card glass">
              <div className="feature-icon"><Heart size={24} /></div>
              <h3>洗練されたUI</h3>
              <p>Apple製品のような美学を取り入れ、使うたびに心地よいデザインを追求しています。</p>
            </div>
          </div>

          <section className="about-section glass field-ready">
            <h2><CheckCircle2 className="section-icon" /> 現場端末の確認項目</h2>
            <div className="device-grid">
              <div>
                <div className="device-heading"><Smartphone size={20} /> スマートフォン</div>
                <ul>
                  <li>工程のダブルタップ編集</li>
                  <li>工程表のピンチ拡大縮小</li>
                  <li>写真添付と日報入力</li>
                </ul>
              </div>
              <div>
                <div className="device-heading"><Tablet size={20} /> タブレット</div>
                <ul>
                  <li>横向き工程表の視認性</li>
                  <li>日付・期間・状態の一覧性</li>
                  <li>バックアップと復元確認</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="about-section glass warning">
            <h2><Info className="section-icon" /> テスト版（TestFlight）について</h2>
            <p>
              本アプリは現在、先行テスト版として公開されています。
              データはブラウザのローカルストレージ（SQLite非依存）に保存されるため、
              ブラウザのキャッシュ消去等でデータが失われる可能性があります。
              重要なデータは、設定画面から定期的にバックアップ（エクスポート）を推奨します。
            </p>
          </section>

          <footer className="about-footer">
            <p>&copy; {new Date().getFullYear()} LuckyFields.LLC</p>
            <div className="contact-links">
              <a href="mailto:support@example.com"><Mail size={16} /> お問い合わせ</a>
            </div>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .about-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .about-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .logo-icon {
          width: 80px;
          height: 80px;
          background: var(--primary-pastel);
          color: var(--primary);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .about-header h1 {
          font-size: 32px;
          font-weight: 900;
          color: var(--text-main);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .version {
          font-size: 14px;
          background: var(--border-light);
          padding: 4px 10px;
          border-radius: 20px;
          color: var(--text-sub);
          font-weight: 600;
        }

        .subtitle {
          color: var(--text-sub);
          font-size: 16px;
          font-weight: 500;
        }

        .about-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .about-section {
          padding: 32px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
        }

        .about-section h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 16px;
          color: var(--text-main);
        }

        .section-icon {
          color: var(--primary);
        }

        .about-section p {
          line-height: 1.8;
          color: var(--text-sub);
          font-size: 15px;
        }

        .about-section.warning {
          background: var(--warning-pastel);
          border-color: #ffe58f;
        }

        .about-section.warning h2, .about-section.warning .section-icon {
          color: var(--warning);
        }

        .field-ready {
          background: var(--surface);
        }

        .device-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .device-grid > div {
          padding: 16px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--surface-hover);
        }

        .device-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: var(--text-main);
          font-size: 14px;
          font-weight: 900;
        }

        .device-heading svg {
          color: var(--primary);
          flex-shrink: 0;
        }

        .device-grid ul {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 0;
          padding-left: 18px;
          color: var(--text-sub);
          font-size: 13px;
          line-height: 1.6;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 600px) {
          .features-grid,
          .device-grid {
            grid-template-columns: 1fr;
          }

          .about-page {
            padding: 24px 14px;
          }

          .about-header h1 {
            flex-direction: column;
            gap: 8px;
            font-size: 28px;
          }
        }

        .feature-card {
          padding: 24px;
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-light);
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          background: var(--surface-hover);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .feature-card h3 {
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .feature-card p {
          font-size: 13px;
          color: var(--text-sub);
          line-height: 1.6;
        }

        .about-footer {
          margin-top: 48px;
          text-align: center;
          color: var(--text-sub);
          font-size: 14px;
        }

        .contact-links {
          margin-top: 12px;
          display: flex;
          justify-content: center;
          gap: 20px;
        }

        .contact-links a {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>
    </MainLayout>
  );
}
