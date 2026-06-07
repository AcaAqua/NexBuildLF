'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // スクロールロック
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <div className="modal-container">
            <motion.div
              key="modal-body-content"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="modal-content glass"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="modal-header">
                <h3>{title}</h3>
                <button 
                  type="button"
                  onClick={onClose} 
                  className="close-btn"
                  aria-label="閉じる"
                >
                  <X size={20} />
                </button>
              </header>
              <div className="modal-body">
                {children}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      <style jsx global>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .modal-container {
          width: 100%;
          display: flex;
          justify-content: center;
          pointer-events: auto;
        }

        .modal-content {
          width: 100%;
          max-width: 600px;
          background: var(--surface);
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          pointer-events: auto;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.1);
        }

        .modal-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-light);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: var(--surface-hover);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-sub);
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (min-width: 768px) {
          .modal-overlay {
            align-items: center;
            padding: 20px;
          }
          .modal-content {
            border-radius: var(--radius-xl);
          }
        }
      `}</style>
    </AnimatePresence>
  );
}
