'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Users, Calendar, Settings, Menu, X, Archive, Info, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { storage } from "@/lib/storage";

interface MainLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const navItems = [
  { icon: Briefcase, label: '現場一覧', href: '/' },
  { icon: Calendar, label: '予定ボード', href: '/schedule' },
  { icon: Users, label: '協力業者', href: '/partners' },
  { icon: Archive, label: '保管室', href: '/archive' },
  { icon: Settings, label: '設定', href: '/settings' },
  { icon: Info, label: 'このアプリについて', href: '/about' },
];


export default function MainLayout({ children, hideNav = false }: MainLayoutProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const isNavActive = (href: string) => pathname === href || (pathname === '/project' && href === '/');

  useEffect(() => {
    // UIスケールの適用
    const settings = storage.getSettings();
    const scale = settings.uiScale || 'md';
    document.body.classList.remove('ui-size-sm', 'ui-size-md', 'ui-size-lg');
    document.body.classList.add(`ui-size-${scale}`);
    setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
      .then((response) => {
        if (!response.ok) return;
        return navigator.serviceWorker.register('/sw.js');
      })
      .catch((error) => {
        console.warn('Service worker registration failed', error);
      });
  }, []);

  if (!mounted) return <div className="app-shell" style={{ background: 'var(--background)' }} />;

  return (
    <div className={`app-shell ${hideNav ? 'nav-hidden' : ''} ${!hideNav ? 'top-nav-shell' : ''}`}>
      {!hideNav && (
        <header className="desktop-top-nav glass">
          <Link href="/" className="top-nav-brand" style={{ textDecoration: 'none' }}>
            工程管理 Pro
          </Link>
          <nav className="top-nav-items" aria-label="メインメニュー">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="top-nav-link" style={{ textDecoration: 'none' }}>
                <div className={`top-nav-item ${isNavActive(item.href) ? 'active' : ''}`}>
                  <item.icon size={21} />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>
        </header>
      )}

      {/* Sidebar for Desktop/Tablet */}
      {!hideNav && (
        <aside className="sidebar glass">
          <div className="sidebar-header">
            <span className="logo-text">工程管理 Pro</span>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`nav-item ${isNavActive(item.href) ? 'active' : ''}`}>
                  <item.icon size={22} />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {!hideNav && (
          <header className="mobile-header glass">
            <span className="logo-text">工程管理 Pro</span>
          </header>
        )}

        <div className="page-wrapper">
          {isOffline && (
            <div className="offline-banner" role="status" aria-live="polite">
              <WifiOff size={16} />
              <span>オフライン中。保存済みの工程表と記録を表示しています。</span>
            </div>
          )}
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
      {!hideNav && (
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
      )}

      <style jsx>{`
        .app-shell {
          display: flex;
          height: 100vh;
          width: 100%;
          background-color: var(--background);
        }

        .desktop-top-nav {
          display: none;
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

        .top-nav-brand,
        .top-nav-link {
          text-decoration: none !important;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding-bottom: var(--navbar-height); /* For mobile nav */
        }

        .nav-hidden .main-content {
          padding-bottom: 0;
        }

        .nav-hidden .page-wrapper {
          padding: 0;
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
          padding: 24px 24px calc(24px + var(--navbar-height) + env(safe-area-inset-bottom));
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .offline-banner {
          position: sticky;
          top: 0;
          z-index: 6;
          min-height: 44px;
          margin: 0 0 16px;
          padding: 10px 14px;
          border: 1px solid var(--warning);
          border-radius: var(--radius-md);
          background: var(--warning-pastel);
          color: var(--warning);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 900;
          box-shadow: var(--shadow-sm);
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
          min-width: 0;
          height: 100%;
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
          max-width: 100%;
          text-align: center;
          line-height: 1.1;
          overflow-wrap: anywhere;
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
          .top-nav-shell {
            flex-direction: column;
          }

          .desktop-top-nav {
            display: flex;
            align-items: stretch;
            gap: 18px;
            height: 72px;
            padding: 0 24px;
            border-bottom: 1px solid var(--border-light);
            z-index: 20;
          }

          .top-nav-brand {
            display: inline-flex;
            align-items: center;
            flex: 0 0 auto;
            min-width: 184px;
            color: var(--primary);
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 0;
            white-space: nowrap;
          }

          .top-nav-items {
            display: flex;
            align-items: flex-end;
            gap: 4px;
            min-width: 0;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .top-nav-items::-webkit-scrollbar {
            display: none;
          }

          .top-nav-link {
            color: inherit;
            flex: 0 0 auto;
          }

          .top-nav-item {
            min-width: 148px;
            min-height: 58px;
            padding: 0 18px;
            border: 1px solid transparent;
            border-bottom: none;
            border-radius: 10px 10px 0 0;
            color: var(--text-sub);
            background: transparent;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 900;
            transition: background 0.2s, color 0.2s, box-shadow 0.2s, border-color 0.2s;
          }

          .top-nav-item:hover {
            background: var(--surface-hover);
            color: var(--text-main);
          }

          .top-nav-item.active {
            position: relative;
            min-height: 66px;
            background: var(--surface);
            border-color: var(--border-light);
            color: var(--primary);
            box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
          }

          .top-nav-item.active::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: -1px;
            height: 2px;
            background: var(--surface);
          }

          .sidebar {
            display: none;
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

          .top-nav-shell .page-wrapper {
            padding: 32px 40px 40px;
          }

          .offline-banner {
            top: 0;
          }
        }
      `}</style>
    </div>
  );
}
