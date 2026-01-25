// @ts-nocheck
import React from 'react';
import { Save, AlertCircle, CheckCircle2, RefreshCw, Download, Trash2 } from 'lucide-react';

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

// Mock data - will be replaced with real API
const MOCK_BACKUPS = [
  { id: 'b1', date: '2024-01-25 14:00', size: '4.2 GB', type: 'Full' as const },
  { id: 'b2', date: '2024-01-20 09:30', size: '4.1 GB', type: 'Full' as const },
  { id: 'b3', date: '2024-01-15 18:45', size: '120 MB', type: 'Metadata' as const },
];

export const BackupManager = () => {
  const handleCreateBackup = () => {
    alert('Backup functionality will be implemented soon');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card title="Quick Backup">
            <div className="text-center py-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Save className="w-8 h-8 text-slate-600" />
                </div>
                <h4 className="font-medium text-slate-800">Create New Snapshot</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">Archives all user data & config</p>
                <button
                  onClick={handleCreateBackup}
                  className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded hover:bg-slate-700"
                >
                  Start Backup
                </button>
            </div>
         </Card>

         <Card title="Restore Strategy" className="md:col-span-2">
            <div className="space-y-4">
                <div className="flex gap-4 items-start">
                     <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                     <div>
                         <h5 className="text-sm font-medium text-slate-800">Warning</h5>
                         <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                             Restoring a backup will overwrite current documents on the device. Ensure Xochitl is stopped before proceeding with a raw file restore.
                         </p>
                     </div>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div className="flex gap-4 items-start">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                     <div>
                         <h5 className="text-sm font-medium text-slate-800">Status</h5>
                         <p className="text-xs text-slate-500 mt-1">
                             Backup functionality is in development
                         </p>
                     </div>
                </div>
            </div>
         </Card>
      </div>

      <Card title="Backup History">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500 border-b border-slate-200">
            <tr>
              <th className="font-medium py-3 px-2">Date Created</th>
              <th className="font-medium py-3 px-2">Type</th>
              <th className="font-medium py-3 px-2">Size</th>
              <th className="font-medium py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_BACKUPS.map((backup) => (
              <tr key={backup.id} className="group hover:bg-slate-50 transition-colors">
                <td className="py-3 px-2 font-mono text-slate-700">{backup.date}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    backup.type === 'Full' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {backup.type}
                  </span>
                </td>
                <td className="py-3 px-2 text-slate-500">{backup.size}</td>
                <td className="py-3 px-2 flex items-center justify-end gap-2">
                  <button className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Restore">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                   <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                  </button>
                   <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-slate-500 text-center">
          Backup API integration coming soon
        </div>
      </Card>
    </div>
  );
};
