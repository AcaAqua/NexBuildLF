'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Users, Calendar, Settings, Menu, X, Archive, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { storage } from "@/lib/storage";

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: Briefcase, label: '現場一覧', href: '/' },
  { icon: Calendar, label: '予定ボード', href: '/schedule' },
  { icon: Users, label: '協力業者', href: '/partners' },
  { icon: Archive, label: '保管室', href: '/archive' },
  { icon: Settings, label: '設定', href: '/settings' },
  { icon: Info, label: 'このアプリについて', href: '/about' },
];


export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // UIスケールの適用
    const settings = storage.getSettings();
    const scale = settings.uiScale || 'md';
    document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
    document.body.classList.add(`ui-size-${scale}`);
  }, []);

  return (
    <div className="app-shell">
      {/* Sidebar for Desktop/Tablet */}
      <aside className="sidebar glass">
        <div className="sidebar-header">
          <span className="logo-text">工程管理 Pro</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`nav-item ${pathname === item.href ? 'active' : ''}`}>
                <item.icon size={22} />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="mobile-header glass">
          <span className="logo-text">工程管理 Pro</span>
          <button className="icon-btn" aria-label="新規案件を追加">
            <Plus size={24} />
          </button>
        </header>

        <div className="page-wrapper">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          
          <footer className="app-footer">
            &copy; {new Date().getFullYear()} LuckyFields.LLC
          </footer>
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bottom-nav glass">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="bottom-nav-item">
            <div className={`icon-wrapper ${pathname === item.href ? 'active' : ''}`}>
              <item.icon size={24} />
              <span className="label">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .app-shell {
          display: flex;
          height: 100vh;
          width: 100%;
          background-color: var(--background);
        }

        /* Sidebar (Tablet/Desktop) */
        .sidebar {
          width: 260px;
          height: 100%;
          display: none;
          flex-direction: column;
          padding: 24px 16px;
          border-right: 1px solid var(--border-light);
          z-index: 10;
        }

        .sidebar-header {
          padding: 0 16px 32px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--primary);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          color: var(--text-sub);
          font-weight: 600;
          transition: all 0.2s;
        }

        .nav-item:hover {
          background-color: var(--surface-hover);
          color: var(--text-main);
        }

        .nav-item.active {
          background-color: var(--primary-pastel);
          color: var(--primary);
        }

        /* Main Content */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding-bottom: var(--navbar-height); /* For mobile nav */
        }

        .mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: var(--header-height);
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .page-wrapper {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .app-footer {
          margin-top: auto;
          padding-top: 48px;
          text-align: center;
          font-size: 12px;
          color: var(--text-sub);
          opacity: 0.6;
          font-weight: 500;
        }

        /* Bottom Nav (Mobile) */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--navbar-height);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 12px;
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 100;
          border-top: 1px solid var(--border-light);
        }

        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .icon-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--text-sub);
          transition: all 0.2s;
        }

        .icon-wrapper.active {
          color: var(--primary);
        }

        .label {
          font-size: 11px;
          font-weight: 600;
        }

        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-pastel);
          color: var(--primary);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Breakpoints */
        @media (min-width: 768px) {
          .sidebar {
            display: flex;
          }
          .bottom-nav, .mobile-header {
            display: none;
          }
          .main-content {
            padding-bottom: 0;
          }
          .page-wrapper {
            padding: 40px;
          }
        }
      `}</style>
    </div>
  );
}
