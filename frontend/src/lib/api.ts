import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface AuthHandlers {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (accessToken: string, refreshToken: string) => void;
  onLogout: () => void;
}

let authHandlers: AuthHandlers | null = null;

export const registerAuthHandlers = (handlers: AuthHandlers) => {
  authHandlers = handlers;
};

const getStoredAuth = () => {
  const raw = localStorage.getItem('auth-storage');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const isPublicAuthRequest = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/refresh',
  ].some((path) => config.url?.includes(path));
  if (isPublicAuthRequest) {
    return config;
  }

  const token = authHandlers 
    ? authHandlers.getAccessToken() 
    : getStoredAuth()?.state?.accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(undefined);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (!original) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      const currentPath = window.location.pathname;
      const isAuthPath = currentPath === '/auth' || currentPath.startsWith('/auth/');
      const isLoginRequest = original.url?.includes('/auth/login');
      const isRegisterRequest = original.url?.includes('/auth/register');
      const isRefreshRequest = original.url?.includes('/auth/refresh');

      if (isAuthPath || isLoginRequest || isRegisterRequest || isRefreshRequest) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = authHandlers 
          ? authHandlers.getRefreshToken() 
          : getStoredAuth()?.state?.refreshToken;

        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        if (authHandlers) {
          authHandlers.onTokensRefreshed(data.access_token, data.refresh_token);
        } else {
          const parsed = getStoredAuth();
          const storageData = {
            state: {
              ...parsed?.state,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            },
            version: parsed?.version ?? 0,
          };
          localStorage.setItem('auth-storage', JSON.stringify(storageData));
        }

        processQueue(null);
        return api(original);
      } catch (refreshError: unknown) {
        const message = axios.isAxiosError(refreshError)
          ? refreshError.response?.data || refreshError.message
          : refreshError instanceof Error
          ? refreshError.message
          : 'Unknown token refresh error';
        if (import.meta.env.DEV) {
          console.error('[API] Token refresh failed:', message);
        }
        processQueue(refreshError);
        
        if (authHandlers) {
          authHandlers.onLogout();
        } else {
          if (import.meta.env.DEV) {
            console.warn('[API] No handlers registered, manual cleanup');
          }
          localStorage.removeItem('auth-storage');
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
