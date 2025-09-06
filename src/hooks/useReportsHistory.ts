import { useState, useEffect } from 'react';
import { reportService, type Report } from '@/src/services/report.service';

interface UseReportsHistoryReturn {
  reports: Report[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  totalReports: number;
  pendingReports: number;
  reviewedReports: number;
  dismissedReports: number;
}

export function useReportsHistory(): UseReportsHistoryReturn {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setError(null);
      const response = await reportService.getUserReports();
      
      if (response.success) {
        setReports(response.reports || []);
      } else {
        setError(response.error || 'Failed to load reports');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    await loadReports();
  };

  // Calculate report statistics
  const totalReports = reports.length;
  const pendingReports = reports.filter(report => report.status === 'pending' || report.status === null).length;
  const reviewedReports = reports.filter(report => report.status === 'reviewed').length;
  const dismissedReports = reports.filter(report => report.status === 'dismissed').length;

  useEffect(() => {
    loadReports();
  }, []);

  return {
    reports,
    loading,
    error,
    refresh,
    totalReports,
    pendingReports,
    reviewedReports,
    dismissedReports
  };
}