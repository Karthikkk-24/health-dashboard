'use client';

import { useAuth } from '@clerk/nextjs';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api } from '@/lib/api';

export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  reports: ['reports'] as const,
  report: (id: string) => ['report', id] as const,
  metrics: (filters: {
    category?: string;
    from?: string;
    to?: string;
  }) => ['metrics', filters] as const,
  categories: ['categories'] as const,
};

function useToken() {
  const { getToken, isSignedIn } = useAuth();
  return {
    enabled: Boolean(isSignedIn),
    getToken: () => getToken(),
  };
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
  });
}

export function useDashboard() {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.dashboard,
    enabled,
    queryFn: () => api.getDashboard(getToken),
  });
}

export function useReports(page = 1, limit = 50) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: [...queryKeys.reports, page, limit],
    enabled,
    queryFn: () => api.getReports(getToken, page, limit),
  });
}

export function useReport(id: string | undefined) {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.report(id ?? ''),
    enabled: enabled && Boolean(id),
    queryFn: () => api.getReport(getToken, id as string),
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
  });
}

export function useCategories() {
  const { enabled, getToken } = useToken();
  return useQuery({
    queryKey: queryKeys.categories,
    enabled,
    queryFn: () => api.getCategories(getToken),
  });
}

export function useUpdateProfile() {
  const { getToken } = useToken();
  const invalidate = useInvalidateHealthData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      body: Parameters<typeof api.updateProfile>[1],
    ) => api.updateProfile(getToken, body),
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
