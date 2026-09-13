import { ReactNode } from 'react';

interface ActionCardProps {
  label: string;
  onClick?: () => void;
  href?: string;
  children?: ReactNode;
}

// Shared shell for the two home-canvas actions (DISTRIBUTE / ANALYSIS) and
// for the nested option rows inside each flow.
export function ActionCard({ label, onClick, href, children }: ActionCardProps) {
  const content = (
    <button className="active-primary-btn" onClick={onClick} type="button">
      {label}
    </button>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return (
    <>
      {content}
      {children}
    </>
  );
}
