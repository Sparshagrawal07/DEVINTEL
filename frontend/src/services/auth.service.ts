import { apiClient } from './api';
import type { User, TokenPair } from '../types';

export const authService = {
  async register(data: { email: string; username: string; password: string; display_name?: string }) {
    const res = await apiClient.post<{ user: User; tokens: TokenPair }>('/auth/register', data);
    if (res.data) {
      apiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    }
    return res.data!;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiClient.post<{ user: User; tokens: TokenPair }>('/auth/login', data);
    if (res.data) {
      apiClient.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
    }
    return res.data!;
  },

  async logout(refreshToken: string) {
    await apiClient.post('/auth/logout', { refreshToken });
    apiClient.clearTokens();
  },

  async getMe() {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    return res.data!.user;
  },

  getGitHubAuthUrl(): string {
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}/api/auth/github`;
  },
};
