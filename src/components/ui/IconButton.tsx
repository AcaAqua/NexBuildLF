import React from 'react';
import type { MouseEventHandler } from 'react';

interface IconButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon: React.ReactNode;
  children?: React.ReactNode; // text label (optional)
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * UIコンポーネント: アイコン＋テキストのボタン。
 * モバイル幅 (600px 以下) では .btn-text が非表示になるよう CSS が別途定義されます。
 * 文字列が不要な場合は children を省略できます。
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon,
  children,
  className = '',
  title,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn ${className} icon-btn-responsive`}
      title={title}
    >
      {icon}
      {children && <span className="btn-text">{children}</span>}
    </button>
  );
};
