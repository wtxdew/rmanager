// @ts-nocheck
import React from 'react';
import { FolderOpen, FileText, Upload, Trash2, Edit } from 'lucide-react';
import { useFileList } from '../hooks/useFileList';

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
        <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString();
};

export const FileManager = () => {
  const { files, loading, error, refetch, deleteFile, renameFile } = useFileList();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteFile(id);
      alert('File deleted successfully');
    } catch (err) {
      alert('Failed to delete file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRename = async (id: string, oldName: string) => {
    const newName = prompt('Enter new name:', oldName);
    if (!newName || newName === oldName) return;

    try {
      await renameFile(id, newName);
      alert('File renamed successfully');
    } catch (err) {
      alert('Failed to rename file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <Card title="File System" className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded">
          <span className="font-semibold text-slate-800">/home/root/.local/share/remarkable/xochitl</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          Loading files...
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center text-red-500">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200 sticky top-0 bg-white">
              <tr>
                <th className="font-medium py-3 px-2">Name</th>
                <th className="font-medium py-3 px-2 w-24">Type</th>
                <th className="font-medium py-3 px-2 w-24">Size</th>
                <th className="font-medium py-3 px-2 w-32">Date</th>
                <th className="font-medium py-3 px-2 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No files found
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="group hover:bg-slate-50 transition-colors cursor-default">
                    <td className="py-3 px-2 flex items-center gap-3">
                      {file.type === 'folder' ?
                        <FolderOpen className="w-5 h-5 text-amber-400 fill-amber-100" /> :
                        <FileText className="w-5 h-5 text-slate-400" />
                      }
                      <span className="text-slate-700 font-medium group-hover:text-slate-900">{file.name}</span>
                    </td>
                    <td className="py-3 px-2 text-slate-500 uppercase text-xs font-semibold">{file.type}</td>
                    <td className="py-3 px-2 text-slate-500 font-mono text-xs">{file.size ? formatBytes(file.size) : '-'}</td>
                    <td className="py-3 px-2 text-slate-500 text-xs">{formatDate(file.modifiedTime)}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRename(file.id, file.name)}
                          className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition-colors"
                          title="Rename"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id, file.name)}
                          className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
