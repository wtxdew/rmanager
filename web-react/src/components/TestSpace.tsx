// @ts-nocheck
import React from 'react';
import { FlaskConical } from 'lucide-react';

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

export const TestSpace = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full h-full px-4 min-h-0">
      <div className="flex flex-col h-full min-h-0 space-y-3">
        <Card title="Card 1" className="flex flex-col min-h-0 max-h-full" >
          <div className="flex-1 overflow-y-auto">
            <p>Card 1 content</p>
          </div>
        </Card>
        <Card title="Card 2" className="flex flex-col min-h-0 max-h-full" >
          <div className="flex-1 overflow-y-auto">
            <p>Card 2 content</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
