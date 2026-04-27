'use client';

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="login-card glass"
      >
        <div className="login-header">
          <div className="logo-wrapper">
            <Image 
              src="/icons/icon-192x192.png" 
              alt="Logo" 
              width={80} 
              height={80} 
              className="app-logo"
            />
          </div>
          <h1>工程管理 Pro</h1>
          <p>現場と事務所をつなぐ、次世代の工程管理</p>
        </div>

        <div className="login-actions">
          <button 
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="btn btn-primary google-btn"
          >
            <LogIn size={20} />
            Googleアカウントでログイン
          </button>
          
          <p className="login-footer">
            ログインすることで利用規約に同意したことになります。
          </p>
        </div>
      </motion.div>

      <style jsx>{`
        .login-container {
          height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, #e8f2ff 0%, #fbfbfd 40%);
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 48px 32px;
          border-radius: var(--radius-xl);
          text-align: center;
          box-shadow: var(--shadow-lg);
        }

        .login-header {
          margin-bottom: 40px;
        }

        .logo-wrapper {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }

        .app-logo {
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }

        h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
          color: var(--text-main);
        }

        p {
          font-size: 15px;
          color: var(--text-sub);
          line-height: 1.6;
        }

        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .google-btn {
          width: 100%;
          height: 56px;
          font-size: 16px;
          gap: 12px;
          border-radius: var(--radius-lg);
        }

        .login-footer {
          font-size: 12px;
          margin-top: 16px;
        }

        @media (prefers-color-scheme: dark) {
          .login-container {
            background: radial-gradient(circle at top left, #162a45 0%, #000000 40%);
          }
        }
      `}</style>
    </div>
  );
}
