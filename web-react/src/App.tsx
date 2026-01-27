// @ts-nocheck
import React, { useState } from 'react';
import { LayoutDashboard, Image as ImageIcon, FolderOpen, Terminal as TerminalIcon, Save, Command } from 'lucide-react';
import { DashboardHome } from './components/DashboardHome';
import { SuspendScreenManager } from './components/SuspendScreenManager';
import { FileManager } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { BackupManager } from './components/BackupManager';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suspend' | 'files' | 'terminal' | 'backup'>('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardHome />;
      case 'suspend': return <SuspendScreenManager />;
      case 'files': return <FileManager />;
      case 'terminal': return <Terminal />;
      case 'backup': return <BackupManager />;
      default: return <DashboardHome />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'suspend', label: 'Suspend Screen', icon: ImageIcon },
    { id: 'files', label: 'File Manager', icon: FolderOpen },
    { id: 'terminal', label: 'Web Terminal', icon: TerminalIcon },
    { id: 'backup', label: 'Backup & Restore', icon: Save },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-slate-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-slate-900">
            <Command className="w-6 h-6" />
            <span>rM Manager</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Web Interface v2.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-slate-800 text-white shadow-md shadow-slate-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">RM</div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">reMarkable PPro</span>
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Connected
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-semibold text-slate-800 tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono text-slate-600">React v2.0</span>
            <button className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Settings</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-8xl mx-auto h-full min-h-0">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
