import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { registerAuthHandlers } from '../lib/api';
import type { User, TokenPair } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthLoading: boolean;
  isFetchingUser: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (data: { full_name?: string; preferences?: Record<string, unknown> }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setTokens: (tokens: TokenPair) => void;
  clear: () => void;
}

let fetchPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      isAuthLoading: true,
      isFetchingUser: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<TokenPair>('/auth/login', { email, password });
          set({ accessToken: data.access_token, refreshToken: data.refresh_token });
          await get().fetchUser();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, username, password, fullName) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/register', {
            email,
            username,
            password,
            full_name: fullName,
          });
          await get().login(email, password);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        set({ isLoading: true });
        try {
          if (refreshToken) {
            await api.post('/auth/logout', { refresh_token: refreshToken });
          }
        } catch (err) {
          console.error('Failed to logout:', err);
        } finally {
          set({ accessToken: null, refreshToken: null, user: null, isLoading: false });
          delete api.defaults.headers.common['Authorization'];
        }
      },

      fetchUser: async () => {
        if (fetchPromise) return fetchPromise;
        
        fetchPromise = (async () => {
          set({ isFetchingUser: true });
          try {
            const { data } = await api.get<User>('/auth/me');
            set({ user: data });
          } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response?.status === 401) {
              set({ accessToken: null, refreshToken: null, user: null });
            }
          } finally {
            set({ isLoading: false, isAuthLoading: false, isFetchingUser: false });
            fetchPromise = null;
          }
        })();

        return fetchPromise;
      },

      updateProfile: async (profileData) => {
        const { data } = await api.put<User>('/users/profile', profileData);
        set({ user: data });
      },

      updatePassword: async (currentPassword, newPassword) => {
        await api.put('/users/password', {
          current_password: currentPassword,
          new_password: newPassword
        });
      },

      deleteAccount: async () => {
        await api.delete('/users/profile');
        set({ accessToken: null, refreshToken: null, user: null });
      },

      setTokens: (tokens) => {
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      },

      clear: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isLoading: false,
          isAuthLoading: false,
          isFetchingUser: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate auth state:', error);
          return;
        }

        if (state?.accessToken) {
          state.fetchUser?.();
        } else if (state) {
          state.isAuthLoading = false;
        }
      },
    }
  )
);

registerAuthHandlers({
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (access, refresh) => {
    useAuthStore.getState().setTokens({
      access_token: access,
      refresh_token: refresh,
      token_type: 'bearer',
    });
  },
  onLogout: () => {
    useAuthStore.getState().logout();
  },
});
