import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// ── Backend URL resolution ────────────────────────────────────
// Local dev  : VITE_API_BASE_URL=/api/v1  → Vite proxy forwards to localhost:5000
// Production : VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Whether the app is deployed (Vercel) vs running locally
export const IS_DEPLOYED =
  typeof window !== 'undefined' &&
  !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  !window.location.hostname.match(/^(192\.168\.|10\.|172\.)/);

// Whether a real backend URL has been configured for this deployment
export const HAS_BACKEND_URL =
  !IS_DEPLOYED ||                                  // always true locally
  (import.meta.env.VITE_API_BASE_URL || '').startsWith('http');

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// ── Request interceptor — attach token ──────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — token refresh & error handling ───
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// Detect a "no backend" 404 — Vercel returns its own HTML 404 when
// no backend is configured. We don't want to show these as toasts.
function isVercelRouteNotFound(error: AxiosError): boolean {
  if (!IS_DEPLOYED) return false;
  if (!HAS_BACKEND_URL) return true;       // no backend URL at all → every call is a 404
  const status = error.response?.status;
  const contentType = (error.response?.headers?.['content-type'] ?? '') as string;
  // HTML 404 from Vercel/CDN — not a real API error
  if (status === 404 && contentType.includes('text/html')) return true;
  return false;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ── 401 → attempt token refresh ─────────────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = data.data;
        localStorage.setItem('accessToken', accessToken);
        processQueue(null, accessToken);
        originalRequest.headers!.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Network error (no response at all) ───────────────────
    if (!error.response) {
      toast.error(
        'Cannot reach server. Make sure the backend is running.',
        { id: 'network-error', duration: 5000 }
      );
      return Promise.reject(error);
    }

    // ── Vercel 404 (no backend configured) ───────────────────
    // Don't show individual "Record not found" toasts — the CustomerLayout
    // shows a single "Backend not connected" banner for this state.
    if (isVercelRouteNotFound(error)) {
      return Promise.reject(error);
    }

    // ── Real API errors ───────────────────────────────────────
    const isAuthRoute = originalRequest.url?.includes('/auth/');
    const message =
      (error.response?.data as any)?.message ||
      error.message ||
      'Something went wrong';

    // 401 on auth routes — the page handles it inline (login/OTP)
    if (error.response.status === 401) {
      return Promise.reject(error);
    }

    // Show toast for all other non-auth errors
    if (!isAuthRoute) {
      toast.error(message, { id: `api-err-${error.response.status}` });
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────────────

export const authApi = {
  sendOtp: (mobile: string) => api.post('/auth/send-otp', { mobile }),
  verifyOtp: (mobile: string, otp: string) => api.post('/auth/verify-otp', { mobile, otp }),
  adminLogin: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ── Tags ─────────────────────────────────────────────────────

export const tagApi = {
  scan:          (tagId: string) => api.get(`/tags/${tagId}/scan`),
  activate:      (tagId: string, formData: FormData) =>
    api.post(`/tags/${tagId}/activate`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  bulkGenerate:  (quantity: number, prefix: string, startNumber: number) =>
    api.post('/tags/bulk-generate', { quantity, prefix, startNumber }),
  generate:      (count: number) => api.post('/tags/generate', { count }),
  nextNumber:    (prefix: string) => api.get('/tags/next-number', { params: { prefix } }),
  list:          (params?: Record<string, unknown>) => api.get('/tags', { params }),
  stats:         () => api.get('/tags/stats'),
  get:           (tagId: string) => api.get(`/tags/${tagId}`),
  history:       (tagId: string) => api.get(`/tags/${tagId}/history`),
  changeStatus:  (tagId: string, status: string, reason?: string) =>
    api.patch(`/tags/${tagId}/status`, { status, reason }),
  downloadQR:    (tagId: string) => api.get(`/tags/${tagId}/qr`, { responseType: 'blob' }),
  bulkQrZip:     (tagIds: string[]) =>
    api.post('/tags/bulk-qr-zip', { tagIds }, { responseType: 'blob' }),
  bulkQrPdf:     (tagIds: string[]) =>
    api.post('/tags/bulk-qr-pdf', { tagIds }, { responseType: 'blob' }),
  bulkQR:        (tagIds: string[]) =>
    api.post('/tags/bulk-qr', { tagIds }, { responseType: 'blob' }),
  qrDataUrl:     (tagId: string) => `${BASE_URL}/tags/${tagId}/qr`,
};

// ── Customers ────────────────────────────────────────────────

export const customerApi = {
  getMe:              ()            => api.get('/customers/me'),
  updateMe:           (data: Record<string, unknown>) => api.patch('/customers/me', data),
  getMyVehicles:      ()            => api.get('/customers/me/vehicles'),
  getMyVehicle:       (id: string)  => api.get(`/customers/me/vehicles/${id}`),
  updateMyVehicle:    (id: string, data: Record<string, unknown>) => api.patch(`/customers/me/vehicles/${id}`, data),
  updateEmergency:    (vehicleId: string, data: Record<string, unknown>) => api.patch(`/customers/me/emergency-contact/${vehicleId}`, data),
  saveInsurance:      (vehicleId: string, data: Record<string, unknown>) => api.post(`/customers/me/vehicles/${vehicleId}/insurance`, data),
  savePuc:            (vehicleId: string, data: Record<string, unknown>) => api.post(`/customers/me/vehicles/${vehicleId}/puc`, data),
  getMyNotifications: (params?: Record<string, unknown>) => api.get('/customers/me/notifications', { params }),
  list:    (params?: Record<string, unknown>) => api.get('/customers', { params }),
  get:     (id: string)  => api.get(`/customers/${id}`),
  disable: (id: string)  => api.patch(`/customers/${id}/disable`),
};

// ── Vehicles ─────────────────────────────────────────────────

export const vehicleApi = {
  mine: () => api.get('/vehicles/mine'),
  get: (id: string) => api.get(`/vehicles/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/vehicles/${id}`, data),
  expiry: (id: string) => api.get(`/vehicles/${id}/expiry`),
  scans: (id: string) => api.get(`/vehicles/${id}/scans`),
  adminAll: (params?: Record<string, unknown>) => api.get('/vehicles/admin/all', { params }),
};

// ── Documents ────────────────────────────────────────────────

export const documentApi = {
  listByTag:  (tagId: string) => api.get(`/documents/public/${tagId}`),
  list:   (vehicleId: string) => api.get(`/documents/vehicle/${vehicleId}`),
  upload: (vehicleId: string, formData: FormData) =>
    api.post(`/documents/vehicle/${vehicleId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  access: (documentId: string, tagId: string, pin: string) =>
    api.post(`/documents/${documentId}/access`, { tagId, pin }),
};

// ── SOS ──────────────────────────────────────────────────────

export const sosApi = {
  trigger: (tagId: string, latitude?: number, longitude?: number) =>
    api.post('/sos', { tagId, latitude, longitude }),
  acknowledge: (id: string) => api.patch(`/sos/${id}/acknowledge`),
  resolve: (id: string) => api.patch(`/sos/${id}/resolve`),
  cancel: (id: string) => api.patch(`/sos/${id}/cancel`),
  mine: (params?: Record<string, unknown>) => api.get('/sos/mine', { params }),
  all: (params?: Record<string, unknown>) => api.get('/sos', { params }),
};

// ── Calls ────────────────────────────────────────────────────

export const callApi = {
  initiate: (tagId: string, callerNumber: string) =>
    api.post('/calls/initiate', { tagId, callerNumber }),
  list: (params?: Record<string, unknown>) => api.get('/calls', { params }),
};

// ── Maintenance ──────────────────────────────────────────────

export const maintenanceApi = {
  list: (vehicleId: string) => api.get(`/maintenance/vehicle/${vehicleId}`),
  add: (vehicleId: string, formData: FormData) =>
    api.post(`/maintenance/vehicle/${vehicleId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/maintenance/${id}`, data),
  delete: (id: string) => api.delete(`/maintenance/${id}`),
};

// ── Insurance ────────────────────────────────────────────────

export const insuranceApi = {
  get: (vehicleId: string) => api.get(`/insurance/vehicle/${vehicleId}`),
  save: (vehicleId: string, data: Record<string, unknown>) => api.post(`/insurance/vehicle/${vehicleId}`, data),
};

// ── PUC ──────────────────────────────────────────────────────

export const pucApi = {
  get: (vehicleId: string) => api.get(`/puc/vehicle/${vehicleId}`),
  save: (vehicleId: string, data: Record<string, unknown>) => api.post(`/puc/vehicle/${vehicleId}`, data),
};

// ── Notifications ────────────────────────────────────────────

export const notificationApi = {
  mine: (params?: Record<string, unknown>) => api.get('/notifications/mine', { params }),
  all: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  retry: (id: string) => api.post(`/notifications/${id}/retry`),
};

// ── Admin ────────────────────────────────────────────────────

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  scanAnalytics: () => api.get('/admin/scan-analytics'),
  auditLogs: (params?: Record<string, unknown>) => api.get('/admin/audit-logs', { params }),
  expiryRadar: () => api.get('/admin/expiry-radar'),
  createUser: (data: { email: string; password: string; role?: string }) => api.post('/admin/users', data),
  sos: (params?: Record<string, unknown>) => api.get('/admin/sos', { params }),
  notifications: (params?: Record<string, unknown>) => api.get('/admin/notifications', { params }),
  scans: (params?: Record<string, unknown>) => api.get('/admin/scans', { params }),
};

// ── Breakdown / Roadside ──────────────────────────────────────

export const breakdownApi = {
  create: (data: Record<string, unknown>) => api.post('/breakdown', data),
  track: (id: string) => api.get(`/breakdown/${id}/track`),
  rate: (id: string, score: number, comment?: string) => api.post(`/breakdown/${id}/rate`, { score, comment }),
  providers: (serviceType: string, city?: string) =>
    api.get('/breakdown/providers', { params: { serviceType, city } }),
  mine: () => api.get('/breakdown/mine'),
  vehicleHistory: (vehicleId: string) => api.get(`/breakdown/vehicle/${vehicleId}`),
  all: (params?: Record<string, unknown>) => api.get('/breakdown', { params }),
  updateStatus: (id: string, status: string, data?: Record<string, unknown>) =>
    api.patch(`/breakdown/${id}/status`, { status, ...data }),
  addProvider: (data: Record<string, unknown>) => api.post('/breakdown/providers', data),
  updateProvider: (id: string, data: Record<string, unknown>) => api.patch(`/breakdown/providers/${id}`, data),
};
