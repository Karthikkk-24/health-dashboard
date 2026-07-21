'use client';

import { useAuth } from '@clerk/nextjs';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  reports: ['reports'] as const,
  report: (id: string) => ['report', id] as const,
  reportChat: (id: string) => ['report-chat', id] as const,
  alerts: ['alerts'] as const,
  metrics: (filters: {
    category?: string;
    from?: string;
    to?: string;
  }) => ['metrics', filters] as const,
  categories: ['categories'] as const,
};

function useToken() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  return {
    // Wait until Clerk has finished loading — otherwise getToken() can race.
    enabled: isLoaded && Boolean(isSignedIn),
    getToken: async () => {
      const token = await getToken({ skipCache: true });
      return token;
    },
  };
}

function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return false;
  }
  return failureCount < 1;
}

export function useInvalidateHealthData() {
  const queryClient = useQueryClient();
  return async (extraKeys: QueryKey[] = []) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
      queryClient.invalidateQueries({ queryKey: ['report'] }),
      queryClient.invalidateQueries({ queryKey: ['metrics'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      queryClient.invalidateQueries({ queryKey: queryKeys.me }),
      ...extraKeys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    ]);
  };
}

export function useMe() {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.me,
    enabled,
    queryFn: () => api.getMe(getToken),
    retry: shouldRetry,
  });
}

export function useDashboard() {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.dashboard,
    enabled,
    queryFn: () => api.getDashboard(getToken),
    retry: shouldRetry,
  });
}

export function useReports(page = 1, limit = 50) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: [...queryKeys.reports, page, limit],
    enabled,
    queryFn: () => api.getReports(getToken, page, limit),
    retry: shouldRetry,
  });
}

export function useReport(id: string | undefined) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.report(id ?? ''),
    enabled: enabled && Boolean(id),
    queryFn: () => api.getReport(getToken, id as string),
    retry: shouldRetry,
  });
}

export function useMetrics(filters: {
  category?: string;
  from?: string;
  to?: string;
}) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.metrics(filters),
    enabled,
    queryFn: () => api.getMetrics(getToken, filters),
    retry: shouldRetry,
  });
}

export function useCategories() {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.categories,
    enabled,
    queryFn: () => api.getCategories(getToken),
    retry: shouldRetry,
  });
}

export function useUpdateProfile() {
  const { getToken } = useToken();
  const invalidate = useInvalidateHealthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Parameters<typeof api.updateProfile>[1]) =>
      api.updateProfile(getToken, body),
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.me, result);
      await invalidate();
    },
  });
}

export function useDeleteAllData() {
  const { getToken } = useToken();
  const invalidate = useInvalidateHealthData();

  return useMutation({
    mutationFn: () => api.deleteAllData(getToken),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteReport() {
  const { getToken } = useToken();
  const invalidate = useInvalidateHealthData();

  return useMutation({
    mutationFn: (id: string) => api.deleteReport(getToken, id),
    onSuccess: () => invalidate(),
  });
}

export function useRetryReport() {
  const { getToken } = useToken();
  const invalidate = useInvalidateHealthData();

  return useMutation({
    mutationFn: (id: string) => api.retryReport(getToken, id),
    onSuccess: () => invalidate(),
  });
}

export function useReportChat(id: string | undefined) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.reportChat(id ?? ''),
    enabled: enabled && Boolean(id),
    queryFn: () => api.getReportChat(getToken, id as string),
    retry: shouldRetry,
  });
}

export function useSendReportChat(id: string) {
  const { getToken } = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => api.postReportChat(getToken, id, message),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.reportChat(id), data);
    },
  });
}

export function useAlerts(unreadOnly = false) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: [...queryKeys.alerts, unreadOnly],
    enabled,
    queryFn: () => api.getAlerts(getToken, unreadOnly),
    retry: shouldRetry,
    refetchInterval: 60_000,
  });
}

export function useMarkAlertRead() {
  const { getToken } = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.markAlertRead(getToken, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

export function useMarkAllAlertsRead() {
  const { getToken } = useToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.markAllAlertsRead(getToken),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}
