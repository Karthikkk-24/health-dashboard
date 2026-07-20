import type {
  ApiErrorBody,
  ComparisonResult,
  DashboardData,
  HealthMetric,
  HealthReport,
  UserProfile,
} from '@/types/health';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  code: string;
  requestId: string;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.error.code;
    this.requestId = body.error.requestId;
  }
}

type TokenProvider = () => Promise<string | null>;

async function request<T>(
  path: string,
  getToken: TokenProvider,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError(401, {
      error: {
        code: 'UNAUTHENTICATED',
        message: 'You must be signed in.',
        requestId: 'local',
      },
    });
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = {
        error: {
          code: 'UNKNOWN',
          message: response.statusText || 'Request failed',
          requestId: 'unknown',
        },
      };
    }
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getMe: (getToken: TokenProvider) =>
    request<{
      user: UserProfile;
      health_profile?: {
        age_years?: number | null;
        bmi?: number | null;
        bmi_category?: string | null;
      };
      profile_complete?: boolean;
    }>('/users/me', getToken),

  updateProfile: (
    getToken: TokenProvider,
    body: {
      notification_preferences?: { email?: boolean; report_ready?: boolean };
      date_of_birth?: string | null;
      sex?: UserProfile['sex'];
      height_cm?: number | null;
      weight_kg?: number | null;
      activity_level?: UserProfile['activity_level'];
    },
  ) =>
    request<{
      user: UserProfile;
      health_profile?: {
        age_years?: number | null;
        bmi?: number | null;
        bmi_category?: string | null;
      };
      profile_complete?: boolean;
    }>('/users/me', getToken, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  updatePreferences: (
    getToken: TokenProvider,
    notification_preferences: { email?: boolean; report_ready?: boolean },
  ) =>
    request<{ user: UserProfile }>('/users/me', getToken, {
      method: 'PATCH',
      body: JSON.stringify({ notification_preferences }),
    }),

  deleteAllData: (getToken: TokenProvider) =>
    request<{ ok: boolean }>('/users/me/data', getToken, { method: 'DELETE' }),

  getDashboard: (getToken: TokenProvider) =>
    request<DashboardData>('/dashboard', getToken),

  getReports: (getToken: TokenProvider, page = 1, limit = 50) =>
    request<{
      items: HealthReport[];
      total: number;
      page: number;
      limit: number;
    }>(`/reports?page=${page}&limit=${limit}`, getToken),

  getReport: (getToken: TokenProvider, id: string) =>
    request<{
      report: HealthReport;
      metrics: HealthMetric[];
      analysis: import('@/types/health').HealthAnalysis | null;
      downloadUrl: string | null;
    }>(`/reports/${id}`, getToken),

  getReportStatus: (getToken: TokenProvider, id: string) =>
    request<{
      id: string;
      processing_status: string;
      error_message: string | null;
    }>(`/reports/${id}/status`, getToken),

  uploadReport: async (
    getToken: TokenProvider,
    file: File,
    reportDate: string,
    onProgress?: (percent: number) => void,
  ): Promise<{ report: HealthReport }> => {
    const token = await getToken();
    if (!token) {
      throw new ApiError(401, {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'You must be signed in.',
          requestId: 'local',
        },
      });
    }

    const form = new FormData();
    form.append('file', file);
    form.append('reportDate', reportDate);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/v1/reports/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const body = JSON.parse(xhr.responseText) as
            | { report: HealthReport }
            | ApiErrorBody;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(body as { report: HealthReport });
          } else {
            reject(new ApiError(xhr.status, body as ApiErrorBody));
          }
        } catch {
          reject(
            new ApiError(xhr.status, {
              error: {
                code: 'PARSE_ERROR',
                message: 'Failed to parse upload response.',
                requestId: 'local',
              },
            }),
          );
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiError(0, {
            error: {
              code: 'NETWORK_ERROR',
              message: 'Network error during upload.',
              requestId: 'local',
            },
          }),
        );
      };

      xhr.send(form);
    });
  },

  deleteReport: (getToken: TokenProvider, id: string) =>
    request<{ ok: boolean }>(`/reports/${id}`, getToken, { method: 'DELETE' }),

  retryReport: (getToken: TokenProvider, id: string) =>
    request<{ report: HealthReport }>(`/reports/${id}/retry`, getToken, {
      method: 'POST',
    }),

  getMetrics: (
    getToken: TokenProvider,
    params?: { category?: string; from?: string; to?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.category) search.set('category', params.category);
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const qs = search.toString();
    return request<{ metrics: HealthMetric[] }>(
      `/metrics${qs ? `?${qs}` : ''}`,
      getToken,
    );
  },

  getCategories: (getToken: TokenProvider) =>
    request<{ categories: string[] }>('/metrics/categories', getToken),

  createComparison: (
    getToken: TokenProvider,
    reportAId: string,
    reportBId: string,
  ) =>
    request<{ comparison: ComparisonResult }>('/comparisons', getToken, {
      method: 'POST',
      body: JSON.stringify({ reportAId, reportBId }),
    }),

  getComparison: (getToken: TokenProvider, id: string) =>
    request<{ comparison: ComparisonResult }>(`/comparisons/${id}`, getToken),
};
