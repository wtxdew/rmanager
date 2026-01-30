// @ts-nocheck
import React from 'react';
import { Battery, HardDrive, Cpu, Wifi, RefreshCw, Upload, Save, Terminal as TerminalIcon, MemoryStick, Tablet, Activity } from 'lucide-react';
import { useSystemStats, useMonitor } from '../hooks/useSystemStats';
import { documentAPI } from '../services/api';

const ProgressBar = ({ value, max, colorClass = "bg-slate-800" }: { value: number, max: number, colorClass?: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const Card = ({ title, children, className = "", action }: { title: string, children: React.ReactNode, className?: string, action?: React.ReactNode }) => (
  <div className={`bg-white border border-slate-200 rounded-lg p-5 shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

export const DashboardHome = () => {
  const { stats, loading, error } = useSystemStats();
  const monitor = useMonitor();

  const handleRestartXochitl = async () => {
    if (confirm('Are you sure you want to restart Xochitl?')) {
      try {
        await documentAPI.restartXochitl();
        alert('Xochitl restart command sent successfully');
      } catch (err) {
        alert('Failed to restart Xochitl: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">Loading system information...</div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  // Parse storage info
  const parseStorage = (used: number, total: number) => {
    const GB = 1024 * 1024 * 1024;
    return {
      used: used / GB,
      total: total / GB,
    };
  };

  const storageInfo = stats ? parseStorage(stats.diskUsedBytes, stats.diskTotalBytes) : { used: 0, total: 8 };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="System Status" className='space-y-4'>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-bold text-slate-800">Active</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
            <span className="text-xs text-slate-500">Running</span>
          </div>
          <div className="rounded-full">{stats?.uptime}</div>
        </Card>

        <Card title="Internal Storage" className='flex flex-col'>
          <div className="flex flex-col h-full justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-slate-700" />
                <span className="text-2xl font-bold text-slate-800">
                  {((storageInfo.used / storageInfo.total) * 100).toFixed(0)}%
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {storageInfo.used.toFixed(1)}GB / {storageInfo.total.toFixed(1)}GB
              </span>
            </div>
            <div className="mt-3">
              <ProgressBar value={storageInfo.used} max={storageInfo.total} />
            </div>
          </div>
        </Card>

        {/* <div className="mt-3"> */}
        {/* <ProgressBar value={storageInfo.used} max={storageInfo.total} /> */}
        {/* </div> */}
        <Card title="Connection" className='flex flex-col'>
          <div className="flex items-center justify-between h-full pb-2">
            <div className="flex items-center gap-3">
              <Wifi className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="text-sm font-bold text-slate-800">Connected</div>
                <div className="text-xs text-slate-500">USB / Wi-Fi</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
        </Card>

        <Card title="Device Model" className='flex flex-col'>
          <div className='flex items-center justify-between h-full pb-2'>
            <div className="flex items-center gap-3">
              <Tablet className="w-8 h-8 text-slate-700" />
              <span className="text-sm font-medium text-slate-800">{stats?.model || 'Loading...'}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* <Card title="Device Information" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-sm text-slate-500">Uptime</span>
              <span className="text-sm font-medium text-slate-800">{stats?.uptime || 'N/A'}</span>
            </div>
            {stats?.cpu && (
              <div className="flex justify-between pt-1">
                <span className="text-sm text-slate-500">CPU</span>
                <span className="text-sm font-medium text-slate-800">{stats.cpu}</span>
              </div>
            )}
          </div>
        </Card> */}


        <Card title="Monitor" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-bold text-slate-800">
                {((monitor?.cpu || 0)).toFixed(0)}%
              </span>
              <span className="text-xs text-slate-500"> {stats?.cpu} </span>
            </div>
            <span className="text-xs text-slate-500"> {monitor?.cpu}% </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={monitor?.cpu || 0} max={100} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MemoryStick className="w-8 h-8 text-slate-700" />
              <span className="text-2xl font-bold text-slate-800">
                {((monitor?.memory || 0)).toFixed(0)}%
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {monitor?.memUsed} / {monitor?.memTotal} MiB
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={monitor?.memory || 0} max={100} />
          </div>

        </Card>


        <Card title="Quick Actions" className="lg:col-span-2 flex flex-col">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <button
              onClick={handleRestartXochitl}
              className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group"
            >
              <RefreshCw className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
              <span className="text-sm font-medium text-slate-700">Restart Xochitl</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <Upload className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
              <span className="text-sm font-medium text-slate-700">Quick Upload</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <Save className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
              <span className="text-sm font-medium text-slate-700">Backup Metadata</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all group">
              <TerminalIcon className="w-6 h-6 text-slate-600 mb-2 group-hover:text-slate-900" />
              <span className="text-sm font-medium text-slate-700">SSH Connect</span>
            </button>
          </div>
        </Card>
      </div>
    </div >
  );
};
