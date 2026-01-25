import { useState, useEffect } from 'react';
import { systemAPI } from '../services/api';

export type SystemStats = {
  uptime: string;
  storage: string;
  model: string;
  cpu?: string;
  memory?: string;
};

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
