import { create } from 'zustand';
import type { User } from '../types';
import { apiClient } from '../services/api';
import { authService } from '../services/auth.service';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; username: string; password: string; display_name?: string }) => Promise<User>;
  handleOAuthCallback: (accessToken: string, refreshToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    apiClient.loadTokens();
    const token = apiClient.getAccessToken();

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      apiClient.clearTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.login({ email, password });
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authService.register(data);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  handleOAuthCallback: async (accessToken, refreshToken) => {
    apiClient.setTokens(accessToken, refreshToken);
    try {
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err: any) {
      apiClient.clearTokens();
      set({ error: 'OAuth authentication failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Logout should work even if API call fails
    } finally {
      apiClient.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  refreshUser: async () => {
    try {
      const user = await authService.getMe();
      set({ user });
    } catch { /* ignore */ }
  },

  updateUser: (partial) =>
    set((state) => ({ user: state.user ? { ...state.user, ...partial } : state.user })),
}));
