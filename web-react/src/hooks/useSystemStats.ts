import { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';

export type SystemStats = {
  uptime: string;
  diskUsedBytes: number;
  diskTotalBytes: number;
  model: string;
  cpu?: string;
  memory?: string;
};

export type MonitorData = {
  cpu: number;
  memory: number;
  memUsed: number;
  memTotal: number;
  timestamp: string;
};

// 后端 API 包装格式
interface ApiResponse<T> {
  data: T;
  code: number;
}

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await systemAPI.getStatus();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Failed to fetch system stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refetch: fetchStats };
}

export function useMonitor() {
  const [monitor, setMonitor] = useState<MonitorData | null>(null);

  const fetchMonitor = async () => {
    try {
      const data = await systemAPI.getMonitor();
      setMonitor(data);
    } catch (err) {
      console.error('Failed to fetch monitor:', err);
    }
  };

  useEffect(() => {
    fetchMonitor();
    const interval = setInterval(fetchMonitor, 2000);
    return () => clearInterval(interval);
  }, []);

  return monitor;
}