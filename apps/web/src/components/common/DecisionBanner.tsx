import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function DecisionBanner({ children }: Props) {
  return (
    <div className="decision-banner">
      <AlertTriangle size={16} aria-hidden="true" /> {children}
    </div>
  );
}
