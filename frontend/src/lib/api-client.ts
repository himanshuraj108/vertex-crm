import axios, { AxiosResponse } from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Strip the Axios wrapper AND the backend's {success, data} envelope
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    // Backend always returns { success: true, data: ... }
    if (body && typeof body === 'object' && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    const message =
      error.response?.data?.error?.message ??
      error.message ??
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiPromise<T> = Promise<T> & any;

export default apiClient;

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  getAll: (params?: Record<string, unknown>): ApiPromise<unknown> =>
    apiClient.get('/customers', { params }),
  getById: (id: string): ApiPromise<unknown> => apiClient.get(`/customers/${id}`),
  getOrders: (id: string, params?: Record<string, unknown>): ApiPromise<unknown> =>
    apiClient.get(`/customers/${id}/orders`, { params }),
  getCampaigns: (id: string): ApiPromise<unknown> => apiClient.get(`/customers/${id}/campaigns`),
  create: (data: unknown): ApiPromise<unknown> => apiClient.post('/customers', data),
  import: (customers: unknown[]): ApiPromise<unknown> =>
    apiClient.post('/customers/import', { customers }),
};

// ─── Segments ─────────────────────────────────────────────────────────────────
export const segmentsApi = {
  getAll: (): ApiPromise<unknown> => apiClient.get('/segments'),
  getById: (id: string): ApiPromise<unknown> => apiClient.get(`/segments/${id}`),
  create: (data: unknown): ApiPromise<unknown> => apiClient.post('/segments', data),
  update: (id: string, data: unknown): ApiPromise<unknown> => apiClient.patch(`/segments/${id}`, data),
  delete: (id: string): ApiPromise<unknown> => apiClient.delete(`/segments/${id}`),
  preview: (rules: unknown): ApiPromise<unknown> => apiClient.post('/segments/preview', { rules }),
  getCustomers: (id: string, params?: Record<string, unknown>): ApiPromise<unknown> =>
    apiClient.get(`/segments/${id}/customers`, { params }),
};

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaignsApi = {
  getAll: (status?: string): ApiPromise<unknown> =>
    apiClient.get('/campaigns', { params: status ? { status } : {} }),
  getById: (id: string): ApiPromise<unknown> => apiClient.get(`/campaigns/${id}`),
  create: (data: unknown): ApiPromise<unknown> => apiClient.post('/campaigns', data),
  launch: (id: string): ApiPromise<unknown> => apiClient.post(`/campaigns/${id}/launch`),
  getStats: (id: string): ApiPromise<unknown> => apiClient.get(`/campaigns/${id}/stats`),
  getCommunications: (id: string, params?: Record<string, unknown>): ApiPromise<unknown> =>
    apiClient.get(`/campaigns/${id}/communications`, { params }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getDashboard: (): ApiPromise<unknown> => apiClient.get('/analytics/dashboard'),
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  chat: (messages: unknown[], conversationId?: string): ApiPromise<unknown> =>
    apiClient.post('/ai/chat', { messages, conversationId }),
  parseSegment: (description: string): ApiPromise<unknown> =>
    apiClient.post('/ai/parse-segment', { description }),
  draftMessage: (segmentDescription: string, channel: string): ApiPromise<unknown> =>
    apiClient.post('/ai/draft-message', { segmentDescription, channel }),
  analyzeCampaign: (campaignId: string): ApiPromise<unknown> =>
    apiClient.post('/ai/analyze-campaign', { campaignId }),
  suggestSegments: (): ApiPromise<unknown> => apiClient.get('/ai/suggest-segments'),
  getSessions: (): ApiPromise<unknown> => apiClient.get('/ai/sessions'),
  getSession: (id: string): ApiPromise<unknown> => apiClient.get(`/ai/sessions/${id}`),
  createSession: (title?: string): ApiPromise<unknown> => apiClient.post('/ai/sessions', { title }),
  updateSession: (id: string, title: string): ApiPromise<unknown> => apiClient.patch(`/ai/sessions/${id}`, { title }),
  deleteSession: (id: string): ApiPromise<unknown> => apiClient.delete(`/ai/sessions/${id}`),
};
